# database.py (V5.2 - Schema and Logic Fixes)
import sqlite3

DATABASE_NAME = "database.db"

def get_db_connection():
    conn = sqlite3.connect(DATABASE_NAME)
    conn.row_factory = sqlite3.Row
    return conn

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
    conn.commit()
    # Ensure new columns exist for existing databases
    add_column_if_missing(conn, 'users', 'email', 'TEXT')
    add_column_if_missing(conn, 'users', 'is_admin', 'INTEGER NOT NULL DEFAULT 0')
    add_column_if_missing(conn, 'users', 'banned', 'INTEGER NOT NULL DEFAULT 0')
    add_column_if_missing(conn, 'users', 'profile_image', 'TEXT')
    add_column_if_missing(conn, 'player_data', 'gold', 'INTEGER NOT NULL DEFAULT 10000')
    add_column_if_missing(conn, 'player_data', 'pity_counter', 'INTEGER NOT NULL DEFAULT 0')
    add_column_if_missing(conn, 'player_data', 'premium_gems', 'INTEGER NOT NULL DEFAULT 0')
    add_column_if_missing(conn, 'player_data', 'energy', 'INTEGER NOT NULL DEFAULT 10')
    add_column_if_missing(conn, 'player_data', 'energy_last', 'INTEGER NOT NULL DEFAULT 0')
    add_column_if_missing(conn, 'player_data', 'dungeon_energy', 'INTEGER NOT NULL DEFAULT 5')
    add_column_if_missing(conn, 'player_data', 'dungeon_last', 'INTEGER NOT NULL DEFAULT 0')
    add_column_if_missing(conn, 'player_characters', 'level', 'INTEGER NOT NULL DEFAULT 1')
    add_column_if_missing(conn, 'player_characters', 'dupe_level', 'INTEGER NOT NULL DEFAULT 0')
    create_admin_if_missing()
    conn.close()

def register_user(username, email, password):
    if not username or not password:
        return "Username and password are required."
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO users (username, email, password) VALUES (?, ?, ?)",
            (username, email, password)
        )
        user_id = cursor.lastrowid
        import time
        now = int(time.time())
        cursor.execute(
            "INSERT INTO player_data (user_id, gems, premium_gems, gold, current_stage, dungeon_runs, energy, energy_last, dungeon_energy, dungeon_last, pity_counter) "
            "VALUES (?, ?, 0, ?, 1, 0, 10, ?, 5, ?, 0)",
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
    user = conn.execute("SELECT id, password, banned FROM users WHERE username = ?", (username,)).fetchone()
    conn.close()
    if user and user['password'] == password and user['banned'] == 0:
        return user['id']
    return None

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

    # --- Energy regeneration (1 per hour, cap 10 unless above from purchases) ---
    energy = player_dict.get("energy", 10)
    last = player_dict.get("energy_last", now)
    if energy < 10:
        hours = (now - last) // 3600
        if hours > 0:
            energy = min(10, energy + hours)
            last += hours * 3600
            conn.execute(
                "UPDATE player_data SET energy = ?, energy_last = ? WHERE user_id = ?",
                (energy, last, user_id),
            )

    # --- Dungeon energy reset daily to at least 5 ---
    dungeon_energy = player_dict.get("dungeon_energy", 5)
    dungeon_last = player_dict.get("dungeon_last", now)
    last_day = datetime.utcfromtimestamp(dungeon_last).date()
    today = datetime.utcnow().date()
    if today > last_day and dungeon_energy < 5:
        dungeon_energy = 5
        dungeon_last = now
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
        'FROM users JOIN player_data ON users.id = player_data.user_id'
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
    row = conn.execute('SELECT users.username, player_data.current_stage FROM users JOIN player_data ON users.id = player_data.user_id ORDER BY player_data.current_stage DESC LIMIT 1').fetchone()
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

def update_user_profile(user_id, email=None, password=None, profile_image=None):
    conn = get_db_connection()
    if email is not None:
        conn.execute("UPDATE users SET email = ? WHERE id = ?", (email, user_id))
    if password is not None:
        conn.execute("UPDATE users SET password = ? WHERE id = ?", (password, user_id))
    if profile_image is not None:
        conn.execute("UPDATE users SET profile_image = ? WHERE id = ?", (profile_image, user_id))
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
        cursor.execute("INSERT INTO users (username, email, password, is_admin) VALUES ('admin', 'admin@example.com', 'adminpass', 1)")
        admin_id = cursor.lastrowid
        import time
        now = int(time.time())
        cursor.execute("INSERT INTO player_data (user_id, gems, premium_gems, gold, current_stage, dungeon_runs, energy, energy_last, dungeon_energy, dungeon_last, pity_counter) VALUES (?, 1000, 0, 10000, 1, 0, 10, ?, 5, ?, 0)", (admin_id, now, now))
        for i in range(1, 4):
            cursor.execute("INSERT INTO player_team (user_id, slot_num, character_db_id) VALUES (?, ?, NULL)", (admin_id, i))
        conn.commit()
    conn.close()

def get_user_profile(user_id):
    conn = get_db_connection()
    row = conn.execute("SELECT email, profile_image, is_admin FROM users WHERE id = ?", (user_id,)).fetchone()
    conn.close()
    return dict(row) if row else {'email': '', 'profile_image': None, 'is_admin': 0}
 
