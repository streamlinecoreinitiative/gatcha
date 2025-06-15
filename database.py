import sqlite3
import hashlib
import json

DATABASE_FILE = "gacha_game.db"
PLAYER_STARTING_GEMS = 100
PLAYER_STARTING_STAGE = 1


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
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            has_seen_lore INTEGER DEFAULT 0
        )
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS player_data (
            user_id INTEGER PRIMARY KEY,
            gems INTEGER NOT NULL,
            current_stage INTEGER NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS player_characters (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            character_name TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    ''')
    # --- NEW: Table to store the active team ---
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS player_team (
            user_id INTEGER NOT NULL,
            slot_index INTEGER NOT NULL,
            character_id INTEGER,
            PRIMARY KEY (user_id, slot_index),
            FOREIGN KEY (user_id) REFERENCES users (id),
            FOREIGN KEY (character_id) REFERENCES player_characters (id)
        )
    ''')
    conn.commit()
    conn.close()


def register_user(username, password):
    if len(username) < 3 or len(password) < 4:
        return "Username must be > 2 chars, password > 3 chars."
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("INSERT INTO users (username, password_hash) VALUES (?, ?)",
                       (username, hash_password(password)))
        user_id = cursor.lastrowid
        cursor.execute("INSERT INTO player_data (user_id, gems, current_stage) VALUES (?, ?, ?)",
                       (user_id, PLAYER_STARTING_GEMS, PLAYER_STARTING_STAGE))
        # Initialize empty team slots
        for i in range(3):
            cursor.execute("INSERT INTO player_team (user_id, slot_index, character_id) VALUES (?, ?, NULL)",
                           (user_id, i))
        conn.commit()
        return "Success"
    except sqlite3.IntegrityError:
        return "Username already exists."
    finally:
        conn.close()


def login_user(username, password):
    conn = get_db_connection()
    user = conn.cursor().execute("SELECT id, password_hash FROM users WHERE username = ?", (username,)).fetchone()
    conn.close()
    if user and user['password_hash'] == hash_password(password):
        return user['id']
    return None


def get_player_data(user_id):
    """Retrieves all player data, including characters."""
    conn = get_db_connection()

    # Get gems and stage
    data = dict(conn.cursor().execute("SELECT * FROM player_data WHERE user_id = ?", (user_id,)).fetchone())

    # Get characters
    char_rows = conn.cursor().execute("SELECT id, character_name FROM player_characters WHERE user_id = ?",
                                      (user_id,)).fetchall()

    # --- FIX: Convert list of Row objects into a list of standard dicts ---
    data['characters'] = [dict(row) for row in char_rows]

    conn.close()
    return data


# In database.py

def get_player_team(user_id, all_character_definitions):
    """Gets the player's active team, returning JSON-serializable dictionaries."""
    conn = get_db_connection()
    rows = conn.cursor().execute('''
        SELECT pt.slot_index, pc.id, pc.character_name
        FROM player_team pt
        LEFT JOIN player_characters pc ON pt.character_id = pc.id
        WHERE pt.user_id = ?
        ORDER BY pt.slot_index
    ''', (user_id,)).fetchall()
    conn.close()

    team = [None] * 3
    for row in rows:
        if row['character_name']:
            # Find the full character definition from the master list
            char_def = next((c for c in all_character_definitions if c['name'] == row['character_name']), None)
            if char_def:
                # --- FIX: Create a fresh dictionary instead of modifying a copy ---
                # This ensures no non-serializable objects are included.
                team_member_data = {
                    'db_id': row['id'],
                    'name': char_def['name'],
                    'rarity': char_def['rarity'],
                    'base_hp': char_def['base_hp'],
                    'base_atk': char_def['base_atk'],
                    'image_file': f"characters/{char_def['image_file']}"
                }
                team[row['slot_index']] = team_member_data
    return team


def save_player_data(user_id, gems, current_stage):
    conn = get_db_connection()
    conn.cursor().execute("UPDATE player_data SET gems = ?, current_stage = ? WHERE user_id = ?",
                          (gems, current_stage, user_id))
    conn.commit()
    conn.close()


def add_character_to_player(user_id, character_name):
    conn = get_db_connection()
    conn.cursor().execute("INSERT INTO player_characters (user_id, character_name) VALUES (?, ?)",
                          (user_id, character_name))
    conn.commit()
    conn.close()


def set_player_team(user_id, team_character_ids):
    """Saves the player's active team composition."""
    conn = get_db_connection()
    cursor = conn.cursor()
    for i in range(3):
        char_id = team_character_ids[i] if i < len(team_character_ids) else None
        cursor.execute("UPDATE player_team SET character_id = ? WHERE user_id = ? AND slot_index = ?",
                       (char_id, user_id, i))
    conn.commit()
    conn.close()


# Functions for lore status are unchanged...
def check_lore_status(user_id):
    conn = get_db_connection()
    status = conn.cursor().execute("SELECT has_seen_lore FROM users WHERE id = ?", (user_id,)).fetchone()[
        'has_seen_lore']
    conn.close()
    return status == 1


def mark_lore_as_seen(user_id):
    conn = get_db_connection()
    conn.cursor().execute("UPDATE users SET has_seen_lore = 1 WHERE id = ?", (user_id,))
    conn.commit()
    conn.close()

