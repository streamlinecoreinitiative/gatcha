# database.py
import sqlite3
import hashlib

DATABASE_FILE = "gacha_game.db"
PLAYER_STARTING_GEMS = 500
PLAYER_STARTING_STAGE = 1
MAX_TEAM_SIZE = 3

def get_db_connection():
    conn = sqlite3.connect(DATABASE_FILE)
    conn.row_factory = sqlite3.Row
    return conn

def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL, has_seen_lore INTEGER DEFAULT 0
        )
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS player_data (
            user_id INTEGER PRIMARY KEY, gems INTEGER NOT NULL, current_stage INTEGER NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS player_characters (
            id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL,
            character_name TEXT NOT NULL, rarity TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS player_team (
            user_id INTEGER NOT NULL, slot_index INTEGER NOT NULL, character_db_id INTEGER,
            PRIMARY KEY (user_id, slot_index),
            FOREIGN KEY (user_id) REFERENCES users (id),
            FOREIGN KEY (character_db_id) REFERENCES player_characters (id)
        )
    ''')
    conn.commit()
    conn.close()

def register_user(username, password):
    if len(username) < 3 or len(password) < 4: return "Username must be > 2 chars, password > 3 chars."
    conn = get_db_connection(); cursor = conn.cursor()
    try:
        cursor.execute("INSERT INTO users (username, password_hash) VALUES (?, ?)", (username, hash_password(password)))
        user_id = cursor.lastrowid
        cursor.execute("INSERT INTO player_data (user_id, gems, current_stage) VALUES (?, ?, ?)", (user_id, PLAYER_STARTING_GEMS, PLAYER_STARTING_STAGE))
        for i in range(MAX_TEAM_SIZE):
            cursor.execute("INSERT INTO player_team (user_id, slot_index, character_db_id) VALUES (?, ?, NULL)", (user_id, i))
        conn.commit(); return "Success"
    except sqlite3.IntegrityError: return "Username already exists."
    finally: conn.close()

def login_user(username, password):
    conn = get_db_connection(); user = conn.cursor().execute("SELECT id, password_hash FROM users WHERE username = ?", (username,)).fetchone(); conn.close()
    return user['id'] if user and user['password_hash'] == hash_password(password) else None


def get_player_data(user_id):
    conn = get_db_connection()
    cursor = conn.cursor()

    # Fetch the row first
    player_row = cursor.execute("SELECT * FROM player_data WHERE user_id = ?", (user_id,)).fetchone()

    # --- THIS IS THE FIX ---
    # If no data exists for the user, return None safely instead of crashing
    if player_row is None:
        conn.close()
        return None
    # --- END OF FIX ---

    data = dict(player_row)  # Now this is safe

    char_rows = cursor.execute("SELECT id, character_name, rarity FROM player_characters WHERE user_id = ?",
                               (user_id,)).fetchall()
    data['collection'] = [dict(row) for row in char_rows]
    conn.close()
    return data

def get_player_team(user_id, all_character_definitions):
    conn = get_db_connection()
    rows = conn.cursor().execute('''
        SELECT pt.slot_index, pc.id, pc.character_name, pc.rarity
        FROM player_team pt LEFT JOIN player_characters pc ON pt.character_db_id = pc.id
        WHERE pt.user_id = ? ORDER BY pt.slot_index
    ''', (user_id,)).fetchall()
    conn.close()
    team = [None] * MAX_TEAM_SIZE
    for row in rows:
        if row and row['character_name']:
            char_def = next((c for c in all_character_definitions if c['name'] == row['character_name']), None)
            if char_def:
                team_member_data = char_def.copy()
                team_member_data['db_id'] = row['id']; team_member_data['rarity'] = row['rarity']
                team_member_data['image_file'] = f"characters/{char_def['image_file']}"
                team[row['slot_index']] = team_member_data
    return team

def add_character_to_player(user_id, character_def):
    conn = get_db_connection()
    conn.cursor().execute("INSERT INTO player_characters (user_id, character_name, rarity) VALUES (?, ?, ?)", (user_id, character_def['name'], character_def['rarity']))
    conn.commit(); conn.close()

def set_player_team(user_id, team_character_db_ids):
    conn = get_db_connection(); cursor = conn.cursor()
    for i in range(MAX_TEAM_SIZE):
        char_id = team_character_db_ids[i] if i < len(team_character_db_ids) else None
        cursor.execute("UPDATE player_team SET character_db_id = ? WHERE user_id = ? AND slot_index = ?", (char_id, user_id, i))
    conn.commit(); conn.close()

# --- ADD THIS NEW FUNCTION ---
def save_player_data(user_id, gems, current_stage):
    """Updates a player's gems and current stage."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE player_data SET gems = ?, current_stage = ? WHERE user_id = ?",
        (gems, current_stage, user_id)
    )
    conn.commit()
    conn.close()