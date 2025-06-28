# database.py (V5.2 - Schema and Logic Fixes)
import sqlite3
import os
import json
from werkzeug.security import generate_password_hash, check_password_hash

DATABASE_NAME = "database.db"

def get_db_connection():
    conn = sqlite3.connect(DATABASE_NAME)
    conn.row_factory = sqlite3.Row
    return conn

def hash_password(password: str) -> str:
    """Hash a password for safe storage."""
    return generate_password_hash(password)

def verify_password_hash(stored: str, provided: str) -> bool:
    """Verify a stored password hash against a provided password."""
    if not stored:
        return False
    return check_password_hash(stored, provided)

def add_column_if_missing(conn, table, column, definition):
    cur = conn.cursor()
    cur.execute(f"PRAGMA table_info({table})")
    cols = [row[1] for row in cur.fetchall()]
    if column not in cols:
        cur.execute(f"ALTER TABLE {table} ADD COLUMN {column} {definition}")
        conn.commit()

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT,
            password TEXT NOT NULL,
            is_admin INTEGER NOT NULL DEFAULT 0,
            banned INTEGER NOT NULL DEFAULT 0,
            profile_image TEXT
        )
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS player_data (
            user_id INTEGER PRIMARY KEY,
            gems INTEGER NOT NULL DEFAULT 150,
            premium_gems INTEGER NOT NULL DEFAULT 0,
            gold INTEGER NOT NULL DEFAULT 10000,
            current_stage INTEGER NOT NULL DEFAULT 1,
            dungeon_runs INTEGER NOT NULL DEFAULT 0,
            pity_counter INTEGER NOT NULL DEFAULT 0,
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
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS paypal_config (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            client_id TEXT,
            client_secret TEXT,
            mode TEXT NOT NULL DEFAULT 'sandbox'
        )
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS email_config (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            host TEXT,
            port INTEGER NOT NULL DEFAULT 587,
            username TEXT,
            password TEXT
        )
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            motd TEXT
        )
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS expeditions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            image_file TEXT
        )
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS expedition_levels (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            expedition_id INTEGER NOT NULL,
            level_num INTEGER NOT NULL,
            enemy_name TEXT NOT NULL,
            FOREIGN KEY (expedition_id) REFERENCES expeditions(id)
        )
    ''')
    conn.commit()
    # Ensure new columns exist for existing databases
    add_column_if_missing(conn, 'users', 'email', 'TEXT')
    add_column_if_missing(conn, 'users', 'is_admin', 'INTEGER NOT NULL DEFAULT 0')
    add_column_if_missing(conn, 'users', 'banned', 'INTEGER NOT NULL DEFAULT 0')
    add_column_if_missing(conn, 'users', 'profile_image', 'TEXT')
    add_column_if_missing(conn, 'users', 'email_confirmed', 'INTEGER NOT NULL DEFAULT 0')
    add_column_if_missing(conn, 'player_data', 'gold', 'INTEGER NOT NULL DEFAULT 10000')
    add_column_if_missing(conn, 'player_data', 'pity_counter', 'INTEGER NOT NULL DEFAULT 0')
    add_column_if_missing(conn, 'player_data', 'premium_gems', 'INTEGER NOT NULL DEFAULT 0')
    add_column_if_missing(conn, 'player_data', 'energy', 'INTEGER NOT NULL DEFAULT 10')
    add_column_if_missing(conn, 'player_data', 'energy_last', 'INTEGER NOT NULL DEFAULT 0')
    add_column_if_missing(conn, 'player_data', 'dungeon_energy', 'INTEGER NOT NULL DEFAULT 5')
    add_column_if_missing(conn, 'player_data', 'dungeon_last', 'INTEGER NOT NULL DEFAULT 0')
    add_column_if_missing(conn, 'player_data', 'free_last', 'INTEGER NOT NULL DEFAULT 0')
    add_column_if_missing(conn, 'player_characters', 'level', 'INTEGER NOT NULL DEFAULT 1')
    add_column_if_missing(conn, 'player_characters', 'dupe_level', 'INTEGER NOT NULL DEFAULT 0')
    add_column_if_missing(conn, 'paypal_config', 'mode', 'TEXT NOT NULL DEFAULT "sandbox"')
    add_column_if_missing(conn, 'expeditions', 'image_file', 'TEXT')
    add_column_if_missing(conn, 'expeditions', 'description', 'TEXT')
    add_column_if_missing(conn, 'expeditions', 'drops', 'TEXT')
    add_column_if_missing(conn, 'expeditions', 'image_res', 'TEXT')
    cursor.execute('INSERT OR IGNORE INTO paypal_config (id, client_id, client_secret, mode) VALUES (1, "", "", "sandbox")')
    cursor.execute('INSERT OR IGNORE INTO email_config (id, host, port, username, password) VALUES (1, "", 587, "", "")')
    cursor.execute('INSERT OR IGNORE INTO messages (id, motd) VALUES (1, "Welcome, Rift-Mender! The Spire is particularly volatile today. Good luck on your ascent.")')
    # Commit before opening a new connection in create_admin_if_missing
    conn.commit()
    create_admin_if_missing()
    conn.close()

def register_user(username, email, password):
    if not username or not password:
        return "Username and password are required."
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        hashed_pw = hash_password(password)
        cursor.execute(
            "INSERT INTO users (username, email, password) VALUES (?, ?, ?)",
            (username, email, hashed_pw)
        )
        user_id = cursor.lastrowid
        import time
        now = int(time.time())
        cursor.execute(
            "INSERT INTO player_data (user_id, gems, premium_gems, gold, current_stage, dungeon_runs, energy, energy_last, dungeon_energy, dungeon_last, pity_counter, free_last) "
            "VALUES (?, ?, 0, ?, 1, 0, 10, ?, 5, ?, 0, 0)",
            (user_id, 150, 10000, now, now)
        )
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
    row = conn.execute(
        "SELECT id, password, banned, email_confirmed FROM users WHERE username = ?",
        (username,)
    ).fetchone()
    conn.close()

    if row and verify_password_hash(row["password"], password) and row["banned"] == 0:
        # Return the user id along with whether their email is confirmed
        return row["id"], row["email_confirmed"]

    return None, None

def get_player_data(user_id):
    import time
    from datetime import datetime
    conn = get_db_connection()
    player = conn.execute("SELECT * FROM player_data WHERE user_id = ?", (user_id,)).fetchone()
    collection_rows = conn.execute(
        "SELECT id, character_name, rarity, level, dupe_level FROM player_characters WHERE user_id = ?",
        (user_id,)
    ).fetchall()
    if not player:
        conn.close()
        return None

    player_dict = dict(player)

    now = int(time.time())

    # --- Energy regeneration (1 per 5 minutes, cap 10 unless above from purchases) ---
    energy = player_dict.get("energy", 10)
    last = player_dict.get("energy_last", now)
    if energy < 10:
        gained = (now - last) // 300  # 5 minutes per energy
        if gained > 0:
            energy = min(10, energy + gained)
            last += gained * 300
            conn.execute(
                "UPDATE player_data SET energy = ?, energy_last = ? WHERE user_id = ?",
                (energy, last, user_id),
            )

    # --- Dungeon energy regeneration (1 per 15 minutes, cap 5) ---
    dungeon_energy = player_dict.get("dungeon_energy", 5)
    dungeon_last = player_dict.get("dungeon_last", now)
    if dungeon_energy < 5:
        gained = (now - dungeon_last) // 900  # 15 minutes per energy
        if gained > 0:
            dungeon_energy = min(5, dungeon_energy + gained)
            dungeon_last += gained * 900
            conn.execute(
                "UPDATE player_data SET dungeon_energy = ?, dungeon_last = ? WHERE user_id = ?",
                (dungeon_energy, dungeon_last, user_id),
            )

    conn.commit()
    conn.close()

    player_dict["energy"] = energy
    player_dict["energy_last"] = last
    player_dict["dungeon_energy"] = dungeon_energy
    player_dict["dungeon_last"] = dungeon_last
    player_dict["free_last"] = player_dict.get("free_last", 0)
    player_dict["collection"] = [dict(row) for row in collection_rows]

    return player_dict

def save_player_data(
    user_id,
    gems=None,
    premium_gems=None,
    current_stage=None,
    gold=None,
    pity_counter=None,
    energy=None,
    energy_last=None,
    dungeon_energy=None,
    dungeon_last=None,
    free_last=None,
):
    conn = get_db_connection()
    cursor = conn.cursor()
    if gems is not None:
        cursor.execute("UPDATE player_data SET gems = ? WHERE user_id = ?", (gems, user_id))
    if premium_gems is not None:
        cursor.execute("UPDATE player_data SET premium_gems = ? WHERE user_id = ?", (premium_gems, user_id))
    if gold is not None:
        cursor.execute("UPDATE player_data SET gold = ? WHERE user_id = ?", (gold, user_id))
    if current_stage is not None:
        cursor.execute(
            "UPDATE player_data SET current_stage = ? WHERE user_id = ?",
            (current_stage, user_id),
        )
    if pity_counter is not None:
        cursor.execute("UPDATE player_data SET pity_counter = ? WHERE user_id = ?", (pity_counter, user_id))
    if energy is not None:
        cursor.execute(
            "UPDATE player_data SET energy = ? WHERE user_id = ?",
            (energy, user_id),
        )
    if energy_last is not None:
        cursor.execute(
            "UPDATE player_data SET energy_last = ? WHERE user_id = ?",
            (energy_last, user_id),
        )
    if dungeon_energy is not None:
        cursor.execute(
            "UPDATE player_data SET dungeon_energy = ? WHERE user_id = ?",
            (dungeon_energy, user_id),
        )
    if dungeon_last is not None:
        cursor.execute(
            "UPDATE player_data SET dungeon_last = ? WHERE user_id = ?",
            (dungeon_last, user_id),
        )
    if free_last is not None:
        cursor.execute(
            "UPDATE player_data SET free_last = ? WHERE user_id = ?",
            (free_last, user_id),
        )
    conn.commit()
    conn.close()

def increment_dungeon_runs(user_id):
    conn = get_db_connection()
    conn.execute("UPDATE player_data SET dungeon_runs = dungeon_runs + 1 WHERE user_id = ?", (user_id,))
    conn.commit()
    conn.close()

def consume_energy(user_id, amount=1):
    conn = get_db_connection()
    row = conn.execute("SELECT energy FROM player_data WHERE user_id = ?", (user_id,)).fetchone()
    if row and row['energy'] >= amount:
        conn.execute("UPDATE player_data SET energy = energy - ? WHERE user_id = ?", (amount, user_id))
        conn.commit()
        conn.close()
        return True
    conn.close()
    return False

def consume_dungeon_energy(user_id, amount=1):
    conn = get_db_connection()
    row = conn.execute("SELECT dungeon_energy FROM player_data WHERE user_id = ?", (user_id,)).fetchone()
    if row and row['dungeon_energy'] >= amount:
        conn.execute("UPDATE player_data SET dungeon_energy = dungeon_energy - ? WHERE user_id = ?", (amount, user_id))
        conn.commit()
        conn.close()
        return True
    conn.close()
    return False

def add_character_to_player(user_id, char_def):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO player_characters (user_id, character_name, rarity, level, dupe_level) VALUES (?, ?, ?, 1, 0)",
        (user_id, char_def['name'], char_def['rarity'])
    )
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
    rows = conn.execute(
        'SELECT users.username, player_data.current_stage, player_data.dungeon_runs '
        'FROM users JOIN player_data ON users.id = player_data.user_id '
        'WHERE users.is_admin = 0'
    ).fetchall()
    conn.close()
    return [dict(row) for row in rows]

def get_user_progress(username):
    conn = get_db_connection()
    row = conn.execute(
        'SELECT current_stage, dungeon_runs FROM player_data '
        'JOIN users ON users.id = player_data.user_id WHERE users.username = ?',
        (username,)
    ).fetchone()
    conn.close()
    return dict(row) if row else {'current_stage': 1, 'dungeon_runs': 0}

def get_top_player():
    conn = get_db_connection()
    row = conn.execute('SELECT users.username, player_data.current_stage FROM users JOIN player_data ON users.id = player_data.user_id WHERE users.is_admin = 0 ORDER BY player_data.current_stage DESC LIMIT 1').fetchone()
    conn.close()
    return dict(row) if row else None

def level_up_character(user_id, char_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    char = cursor.execute(
        "SELECT level FROM player_characters WHERE id = ? AND user_id = ?",
        (char_id, user_id)
    ).fetchone()
    if not char:
        conn.close()
        return False, "Character not found."
    gold_row = cursor.execute("SELECT gold FROM player_data WHERE user_id = ?", (user_id,)).fetchone()
    current_level = char['level']
    cost = 100 * current_level
    if gold_row['gold'] < cost:
        conn.close()
        return False, "Not enough Gold."
    cursor.execute("UPDATE player_characters SET level = level + 1 WHERE id = ?", (char_id,))
    cursor.execute("UPDATE player_data SET gold = gold - ? WHERE user_id = ?", (cost, user_id))
    conn.commit()
    new_gold = cursor.execute("SELECT gold FROM player_data WHERE user_id = ?", (user_id,)).fetchone()['gold']
    conn.close()
    return True, {'new_level': current_level + 1, 'new_gold': new_gold}

def sell_character(user_id, char_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    char = cursor.execute(
        "SELECT rarity, level FROM player_characters WHERE id = ? AND user_id = ?",
        (char_id, user_id)
    ).fetchone()
    if not char:
        conn.close()
        return False, "Character not found."

    base_values = {
        'Common': 50,
        'Rare': 150,
        'SSR': 400,
        'UR': 800,
        'LR': 1500
    }
    base = base_values.get(char['rarity'], 50)
    gold_amount = base * char['level']

    cursor.execute("UPDATE player_data SET gold = gold + ? WHERE user_id = ?", (gold_amount, user_id))
    cursor.execute("UPDATE player_team SET character_db_id = NULL WHERE character_db_id = ? AND user_id = ?", (char_id, user_id))
    cursor.execute("DELETE FROM player_characters WHERE id = ? AND user_id = ?", (char_id, user_id))
    conn.commit()
    new_gold = cursor.execute("SELECT gold FROM player_data WHERE user_id = ?", (user_id,)).fetchone()['gold']
    conn.close()
    return True, {'gold_received': gold_amount, 'new_gold': new_gold}

def update_user_profile(user_id, email=None, password=None, profile_image=None, email_confirmed=None):
    conn = get_db_connection()
    if email is not None:
        conn.execute("UPDATE users SET email = ? WHERE id = ?", (email, user_id))
    if password is not None:
        conn.execute("UPDATE users SET password = ? WHERE id = ?", (hash_password(password), user_id))
    if profile_image is not None:
        conn.execute("UPDATE users SET profile_image = ? WHERE id = ?", (profile_image, user_id))
    if email_confirmed is not None:
        conn.execute("UPDATE users SET email_confirmed = ? WHERE id = ?", (1 if email_confirmed else 0, user_id))
    conn.commit()
    conn.close()

def is_user_admin(user_id):
    conn = get_db_connection()
    row = conn.execute("SELECT is_admin FROM users WHERE id = ?", (user_id,)).fetchone()
    conn.close()
    return bool(row and row['is_admin'])

def ban_user(user_id, banned=True):
    conn = get_db_connection()
    conn.execute("UPDATE users SET banned = ? WHERE id = ?", (1 if banned else 0, user_id))
    conn.commit()
    conn.close()

def get_user_id(username):
    conn = get_db_connection()
    row = conn.execute("SELECT id FROM users WHERE username = ?", (username,)).fetchone()
    conn.close()
    return row['id'] if row else None

def get_all_user_ids(include_admin=False):
    """Return a list of all user IDs. Admin accounts are excluded by default."""
    conn = get_db_connection()
    if include_admin:
        rows = conn.execute("SELECT id FROM users").fetchall()
    else:
        rows = conn.execute("SELECT id FROM users WHERE is_admin = 0").fetchall()
    conn.close()
    return [row['id'] for row in rows]

def email_exists(email):
    conn = get_db_connection()
    row = conn.execute("SELECT 1 FROM users WHERE email = ?", (email,)).fetchone()
    conn.close()
    return row is not None

def verify_user_password(user_id, password):
    conn = get_db_connection()
    row = conn.execute("SELECT password FROM users WHERE id = ?", (user_id,)).fetchone()
    conn.close()
    return row and verify_password_hash(row['password'], password)

def reset_password(email, new_password):
    conn = get_db_connection()
    cursor = conn.cursor()
    row = cursor.execute("SELECT id FROM users WHERE email = ?", (email,)).fetchone()
    if not row:
        conn.close()
        return False
    hashed = hash_password(new_password)
    cursor.execute("UPDATE users SET password = ? WHERE email = ?", (hashed, email))
    conn.commit()
    conn.close()
    return True

def adjust_resources(user_id, gems=None, premium_gems=None, energy=None, gold=None):
    save_player_data(user_id, gems=gems, premium_gems=premium_gems, energy=energy, gold=gold)

def remove_character(user_id, char_id):
    conn = get_db_connection()
    conn.execute("DELETE FROM player_characters WHERE id = ? AND user_id = ?", (char_id, user_id))
    conn.execute("UPDATE player_team SET character_db_id = NULL WHERE character_db_id = ? AND user_id = ?", (char_id, user_id))
    conn.commit()
    conn.close()

def create_admin_if_missing():
    conn = get_db_connection()
    row = conn.execute("SELECT id FROM users WHERE username = 'admin'").fetchone()
    if not row:
        cursor = conn.cursor()
        cursor.execute("INSERT INTO users (username, email, password, is_admin) VALUES ('admin', 'admin@example.com', ?, 1)",
                       (hash_password('adminpass'),))
        admin_id = cursor.lastrowid
        import time
        now = int(time.time())
        cursor.execute("INSERT INTO player_data (user_id, gems, premium_gems, gold, current_stage, dungeon_runs, energy, energy_last, dungeon_energy, dungeon_last, pity_counter, free_last) VALUES (?, 1000, 0, 10000, 1, 0, 10, ?, 5, ?, 0, 0)", (admin_id, now, now))
        for i in range(1, 4):
            cursor.execute("INSERT INTO player_team (user_id, slot_num, character_db_id) VALUES (?, ?, NULL)", (admin_id, i))
        conn.commit()
    conn.close()

def get_user_profile(user_id):
    conn = get_db_connection()
    row = conn.execute(
        "SELECT email, profile_image, is_admin, email_confirmed FROM users WHERE id = ?",
        (user_id,),
    ).fetchone()
    conn.close()
    return (
        dict(row)
        if row
        else {
            'email': '',
            'profile_image': None,
            'is_admin': 0,
            'email_confirmed': 0,
        }
    )

def get_paypal_config():
    conn = get_db_connection()
    row = conn.execute('SELECT client_id, client_secret, mode FROM paypal_config WHERE id = 1').fetchone()
    conn.close()
    if row:
        return {'client_id': row['client_id'], 'client_secret': row['client_secret'], 'mode': row['mode']}
    return {'client_id': '', 'client_secret': '', 'mode': 'sandbox'}

def update_paypal_config(client_id=None, client_secret=None, mode=None):
    conn = get_db_connection()
    if client_id is not None:
        conn.execute('UPDATE paypal_config SET client_id = ? WHERE id = 1', (client_id,))
    if client_secret is not None:
        conn.execute('UPDATE paypal_config SET client_secret = ? WHERE id = 1', (client_secret,))
    if mode is not None:
        conn.execute('UPDATE paypal_config SET mode = ? WHERE id = 1', (mode,))
    conn.commit()
    conn.close()

def get_email_config():
    conn = get_db_connection()
    row = conn.execute('SELECT host, port, username, password FROM email_config WHERE id = 1').fetchone()
    conn.close()
    if row:
        return {
            'host': row['host'],
            'port': row['port'],
            'username': row['username'],
            'password': row['password']
        }
    return {'host': '', 'port': 587, 'username': '', 'password': ''}

def update_email_config(host=None, port=None, username=None, password=None):
    conn = get_db_connection()
    if host is not None:
        conn.execute('UPDATE email_config SET host = ? WHERE id = 1', (host,))
    if port is not None:
        conn.execute('UPDATE email_config SET port = ? WHERE id = 1', (port,))
    if username is not None:
        conn.execute('UPDATE email_config SET username = ? WHERE id = 1', (username,))
    if password is not None:
        conn.execute('UPDATE email_config SET password = ? WHERE id = 1', (password,))
    conn.commit()
    conn.close()

def get_motd():
    conn = get_db_connection()
    row = conn.execute('SELECT motd FROM messages WHERE id = 1').fetchone()
    conn.close()
    return row['motd'] if row else ''

def set_motd(text):
    conn = get_db_connection()
    conn.execute('UPDATE messages SET motd = ? WHERE id = 1', (text,))
    conn.commit()
    conn.close()


def create_expedition(name, enemies, image_file=None, description=None, drops=None, image_res=None):
    """Create a new expedition with a list of enemy names."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('INSERT INTO expeditions (name, image_file, description, drops, image_res) VALUES (?, ?, ?, ?, ?)',
                   (name, image_file, description, drops, image_res))
    expedition_id = cursor.lastrowid
    for idx, enemy in enumerate(enemies, start=1):
        cursor.execute(
            'INSERT INTO expedition_levels (expedition_id, level_num, enemy_name) VALUES (?, ?, ?)',
            (expedition_id, idx, enemy)
        )
    conn.commit()
    conn.close()
    return expedition_id

def update_expedition(expedition_id, name=None, enemies=None, image_file=None, description=None, drops=None, image_res=None):
    """Update an existing expedition."""
    conn = get_db_connection()
    cur = conn.cursor()
    if name is not None:
        cur.execute('UPDATE expeditions SET name = ? WHERE id = ?', (name, expedition_id))
    if image_file is not None:
        cur.execute('UPDATE expeditions SET image_file = ? WHERE id = ?', (image_file, expedition_id))
    if description is not None:
        cur.execute('UPDATE expeditions SET description = ? WHERE id = ?', (description, expedition_id))
    if drops is not None:
        cur.execute('UPDATE expeditions SET drops = ? WHERE id = ?', (drops, expedition_id))
    if image_res is not None:
        cur.execute('UPDATE expeditions SET image_res = ? WHERE id = ?', (image_res, expedition_id))
    if enemies is not None:
        cur.execute('DELETE FROM expedition_levels WHERE expedition_id = ?', (expedition_id,))
        for idx, enemy in enumerate(enemies, start=1):
            cur.execute('INSERT INTO expedition_levels (expedition_id, level_num, enemy_name) VALUES (?, ?, ?)',
                        (expedition_id, idx, enemy))
    conn.commit()
    conn.close()

def delete_expedition(expedition_id):
    """Delete an expedition and its levels."""
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute('DELETE FROM expedition_levels WHERE expedition_id = ?', (expedition_id,))
    cur.execute('DELETE FROM expeditions WHERE id = ?', (expedition_id,))
    conn.commit()
    conn.close()


def get_all_expeditions():
    """Return all expeditions with their level data."""
    conn = get_db_connection()
    cur = conn.cursor()
    exps = cur.execute('SELECT id, name, image_file, description, drops, image_res FROM expeditions').fetchall()
    result = []
    for exp in exps:
        levels = cur.execute(
            'SELECT level_num, enemy_name FROM expedition_levels WHERE expedition_id = ? ORDER BY level_num',
            (exp['id'],)
        ).fetchall()
        result.append({
            'id': exp['id'],
            'name': exp['name'],
            'image_file': exp['image_file'],
            'description': exp['description'],
            'drops': exp['drops'],
            'image_res': exp['image_res'],
            'levels': [{'level': row['level_num'], 'enemy': row['enemy_name']} for row in levels]
        })
    conn.close()
    return result

def load_items(json_path):
    try:
        with open(json_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return []

def save_items(json_path, items):
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(items, f, indent=2)

def add_item(json_path, item):
    items = load_items(json_path)
    items.append(item)
    save_items(json_path, items)

def update_item(json_path, orig_code, item):
    items = load_items(json_path)
    items = [i for i in items if i.get('code') != orig_code]
    items.append(item)
    save_items(json_path, items)

def delete_item(json_path, code):
    items = load_items(json_path)
    items = [i for i in items if i.get('code') != code]
    save_items(json_path, items)

 
