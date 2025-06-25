# database.py (V5.2 - Schema and Logic Fixes)
import sqlite3

DATABASE_NAME = "database.db"

def get_db_connection():
    conn = sqlite3.connect(DATABASE_NAME)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL
        )
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS player_data (
            user_id INTEGER PRIMARY KEY,
            gems INTEGER NOT NULL DEFAULT 100,
            current_stage INTEGER NOT NULL DEFAULT 1,
            dungeon_runs INTEGER NOT NULL DEFAULT 0,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS player_characters (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            character_name TEXT NOT NULL,
            rarity TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS player_team (
            user_id INTEGER NOT NULL,
            slot_num INTEGER NOT NULL,
            character_db_id INTEGER,
            PRIMARY KEY (user_id, slot_num),
            FOREIGN KEY (user_id) REFERENCES users (id),
            FOREIGN KEY (character_db_id) REFERENCES player_characters (id)
        )
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS player_equipment (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            equipment_name TEXT NOT NULL,
            rarity TEXT NOT NULL,
            is_equipped_on INTEGER,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    ''')
    conn.commit()
    conn.close()

def register_user(username, password):
    if not username or not password: return "Username and password are required."
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("INSERT INTO users (username, password) VALUES (?, ?)", (username, password))
        user_id = cursor.lastrowid
        cursor.execute("INSERT INTO player_data (user_id) VALUES (?)", (user_id,))
        # Initialize empty team slots
        for i in range(1, 4):
            cursor.execute("INSERT INTO player_team (user_id, slot_num, character_db_id) VALUES (?, ?, NULL)", (user_id, i))
        conn.commit()
        return "Success"
    except sqlite3.IntegrityError:
        return "Username already exists."
    finally:
        conn.close()

def login_user(username, password):
    conn = get_db_connection()
    user = conn.execute("SELECT id, password FROM users WHERE username = ?", (username,)).fetchone()
    conn.close()
    if user and user['password'] == password:
        return user['id']
    return None

def get_player_data(user_id):
    conn = get_db_connection()
    player = conn.execute("SELECT * FROM player_data WHERE user_id = ?", (user_id,)).fetchone()
    collection_rows = conn.execute("SELECT id, character_name, rarity FROM player_characters WHERE user_id = ?", (user_id,)).fetchall()
    conn.close()
    if player:
        player_dict = dict(player)
        player_dict['collection'] = [dict(row) for row in collection_rows]
        return player_dict
    return None

def save_player_data(user_id, gems, current_stage):
    conn = get_db_connection()
    conn.execute("UPDATE player_data SET gems = ?, current_stage = ? WHERE user_id = ?", (gems, current_stage, user_id))
    conn.commit()
    conn.close()

def increment_dungeon_runs(user_id):
    conn = get_db_connection()
    conn.execute("UPDATE player_data SET dungeon_runs = dungeon_runs + 1 WHERE user_id = ?", (user_id,))
    conn.commit()
    conn.close()

def add_character_to_player(user_id, char_def):
    conn = get_db_connection()
    conn.execute("INSERT INTO player_characters (user_id, character_name, rarity) VALUES (?, ?, ?)",
                 (user_id, char_def['name'], char_def['rarity']))
    conn.commit()
    conn.close()

def get_player_team(user_id, character_definitions):
    conn = get_db_connection()
    # CORRECTED QUERY
    team_ids = conn.execute('SELECT character_db_id FROM player_team WHERE user_id = ? ORDER BY slot_num', (user_id,)).fetchall()
    team_characters = []
    for row in team_ids:
        char_db_id = row['character_db_id']
        if char_db_id is None:
            team_characters.append(None)
            continue
        char_data = conn.execute('SELECT * FROM player_characters WHERE id = ?', (char_db_id,)).fetchone()
        if not char_data:
            team_characters.append(None)
            continue
        char_def = next((c for c in character_definitions if c['name'] == char_data['character_name']), None)
        if not char_def: continue
        full_char_data = {**char_def, **dict(char_data), 'db_id': char_data['id']}
        equipped_items = conn.execute('SELECT id, equipment_name, rarity FROM player_equipment WHERE is_equipped_on = ?', (char_db_id,)).fetchall()
        full_char_data['equipped'] = [dict(item) for item in equipped_items]
        team_characters.append(full_char_data)
    conn.close()
    while len(team_characters) < 3: team_characters.append(None)
    return team_characters

def set_player_team(user_id, team_ids):
    conn = get_db_connection()
    # CORRECTED LOGIC
    for i, char_id in enumerate(team_ids):
        slot_num = i + 1
        conn.execute("UPDATE player_team SET character_db_id = ? WHERE user_id = ? AND slot_num = ?",
                     (char_id, user_id, slot_num))
    conn.commit()
    conn.close()

def get_all_users_with_runs():
    conn = get_db_connection()
    rows = conn.execute('SELECT users.username, player_data.dungeon_runs FROM users JOIN player_data ON users.id = player_data.user_id').fetchall()
    conn.close()
    return [dict(row) for row in rows]
