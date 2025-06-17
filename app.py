# app.py (V3.7 - FINAL, VERIFIED, AND CORRECTED)
from flask import Flask, jsonify, render_template, request, session
from flask_socketio import SocketIO, emit
import os
import json
import random
from datetime import datetime
import database as db


def load_all_definitions(file_path):
    try:
        with open(file_path, "r") as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        print(f"FATAL ERROR: {os.path.basename(file_path)} is missing or corrupted!");
        return None


app = Flask(__name__)
app.config['SECRET_KEY'] = os.urandom(24)
socketio = SocketIO(app)
db.init_db()

BASE_DIR = os.path.dirname(__file__)
character_definitions = load_all_definitions(os.path.join(BASE_DIR, "characters.json"))
enemy_definitions = load_all_definitions(os.path.join(BASE_DIR, "enemies.json"))
LORE_FILE = os.path.join(BASE_DIR, "lore.txt")
if not character_definitions or not enemy_definitions: exit("Could not load game data.")
gacha_pool = {rarity: [c for c in character_definitions if c['rarity'] == rarity] for rarity in
              ["Common", "Rare", "SSR"]}
SUMMON_COST = 50
online_users = {}
RARITY_ORDER = ["Common", "Rare", "SSR", "UR", "LR"]
MERGE_COST = {"Common": 3, "Rare": 3, "SSR": 4, "UR": 5}
STAT_MULTIPLIER = {"Common": 1.0, "Rare": 1.3, "SSR": 1.8, "UR": 2.5, "LR": 3.5}


# --- ROUTES ---
@app.route('/')
def index(): return render_template('index.html')


@app.route('/api/game_data')
def get_game_data(): return jsonify({'characters': character_definitions})


@app.route('/api/lore')
def get_lore():
    try:
        with open(LORE_FILE, "r") as f:
            return jsonify({'success': True, 'data': f.read()})
    except FileNotFoundError:
        return jsonify({'success': False, 'message': 'Lore file not found.'})


@app.route('/api/register', methods=['POST'])
def register():
    data = request.json
    result = db.register_user(data.get('username'), data.get('password'))
    return jsonify({'success': result == "Success", 'message': result})


# --- THIS IS THE CORRECTED LOGIN FUNCTION ---
@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    username = data.get('username')
    password = data.get('password')
    user_id = db.login_user(username, password)

    if user_id:
        # Only set the session variables if login is successful
        session['logged_in'] = True
        session['username'] = username
        session['user_id'] = user_id
        return jsonify({'success': True})
    else:
        # If login fails, explicitly return the failure message
        return jsonify({'success': False, 'message': 'Invalid username or password.'})


@app.route('/api/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({'success': True})


@app.route('/api/player_data', methods=['GET'])
def get_player_data():
    if not session.get('logged_in'): return jsonify({'success': False}), 401
    user_id = session['user_id']
    player_data = db.get_player_data(user_id)
    player_team = db.get_player_team(user_id, character_definitions)
    full_data = {
        'username': session.get('username'), 'gems': player_data['gems'], 'current_stage': player_data['current_stage'],
        'team': player_team, 'collection': player_data['collection']
    }
    return jsonify({'success': True, 'data': full_data})


@app.route('/api/summon', methods=['POST'])
def summon():
    if not session.get('logged_in'): return jsonify({'success': False, 'message': 'Not logged in'}), 401
    user_id = session['user_id']
    player_data = db.get_player_data(user_id)

    # --- ADD THIS SAFETY CHECK ---
    if player_data is None:
        # This could happen if a user record is corrupted. Log out the user.
        session.clear()
        return jsonify({'success': False, 'message': 'Player data not found. Please log in again.'}), 401
    # --- END OF CHECK ---

    player_data = db.get_player_data(user_id)
    if player_data['gems'] < SUMMON_COST:
        return jsonify({'success': False, 'message': 'Not enough gems!'})

    chosen_rarity = random.choices(list(gacha_pool.keys()), weights=[60, 30, 10], k=1)[0]
    summoned_char_def = random.choice(gacha_pool[chosen_rarity])

    db.add_character_to_player(user_id, summoned_char_def)
    new_gems = player_data['gems'] - SUMMON_COST
    db.save_player_data(user_id, new_gems, player_data['current_stage'])
    return jsonify({'success': True, 'character': summoned_char_def})


@app.route('/api/fight', methods=['POST'])
def fight():
    if not session.get('logged_in'): return jsonify({'success': False, 'message': 'Not logged in'}), 401
    user_id = session['user_id'];
    stage_num = request.json.get('stage')
    team = db.get_player_team(user_id, character_definitions);
    team = [c for c in team if c]
    if not team: return jsonify({'success': False, 'message': 'Your team is empty!'})

    gems_per_win = 25 + (stage_num // 5) * 5
    # --- NEW, ROBUST CODE ---
    possible_enemies = []
    max_rarity_index = stage_num // 10
    for e in enemy_definitions:
        try:
            rarity_index = RARITY_ORDER.index(e.get('rarity', 'Common'))
            if rarity_index <= max_rarity_index:
                possible_enemies.append(e)
        except ValueError:
            # This will catch any enemy with a rarity not in RARITY_ORDER and simply ignore it,
            # preventing the server from crashing. You could add a print statement here for debugging.
            # print(f"Warning: Enemy '{e.get('name')}' has unknown rarity '{e.get('rarity')}' and was skipped.")
            pass

    enemy_def = random.choice(possible_enemies if possible_enemies else enemy_definitions)

    team_hp = sum(c['base_hp'] * STAT_MULTIPLIER.get(c['rarity'], 1.0) for c in team)
    team_atk = sum(c['base_atk'] * STAT_MULTIPLIER.get(c['rarity'], 1.0) for c in team)
    team_crit_chance = max((c.get('crit_chance', 0) for c in team), default=0)
    team_crit_damage = max((c.get('crit_damage', 1.5) for c in team), default=1.5)

    enemy_hp = enemy_def['base_hp'] * (1 + (stage_num - 1) * 0.25) * random.uniform(0.9, 1.1)
    enemy_atk = enemy_def['base_atk'] * (1 + (stage_num - 1) * 0.15) * random.uniform(0.9, 1.1)
    enemy_crit_chance = enemy_def.get('crit_chance', 0);
    enemy_crit_damage = enemy_def.get('crit_damage', 1.5)
    enemy_image = f"enemies/{enemy_def.get('image_file', 'placeholder_enemy.png')}"

    combat_log = [{'type': 'start', 'message': f"Floor {stage_num}: Your team faces {enemy_def['name']}!",
                   'enemy_image': enemy_image}]

    while team_hp > 0 and enemy_hp > 0:
        damage = team_atk * random.uniform(0.8, 1.2);
        is_crit = random.random() * 100 < team_crit_chance
        if is_crit: damage *= team_crit_damage
        enemy_hp -= damage;
        combat_log.append(
            {'type': 'player_attack', 'crit': is_crit, 'damage': int(damage), 'enemy_hp': int(max(0, enemy_hp))})
        if enemy_hp <= 0: break
        damage = enemy_atk * random.uniform(0.8, 1.2);
        is_crit = random.random() * 100 < enemy_crit_chance
        if is_crit: damage *= enemy_crit_damage
        team_hp -= damage;
        combat_log.append(
            {'type': 'enemy_attack', 'crit': is_crit, 'damage': int(damage), 'team_hp': int(max(0, team_hp))})

    victory = team_hp > 0
    if victory:
        combat_log.append({'type': 'end', 'message': "--- VICTORY! ---"})
        player_data = db.get_player_data(user_id);
        new_gems = player_data['gems'] + gems_per_win
        new_stage = player_data['current_stage']
        if stage_num == new_stage: new_stage += 1
        db.save_player_data(user_id, new_gems, new_stage)
    else:
        combat_log.append({'type': 'end', 'message': "--- DEFEAT! ---"})

    return jsonify({'success': True, 'victory': victory, 'log': combat_log, 'gems_won': gems_per_win if victory else 0})


# ... The other API endpoints (manage_team, merge_heroes) are correct and can remain ...
@app.route('/api/manage_team', methods=['POST'])
def manage_team():
    if not session.get('logged_in'): return jsonify({'success': False}), 401
    user_id = session['user_id'];
    data = request.json;
    char_db_id = data.get('char_id');
    action = data.get('action')
    team_ids = [c['db_id'] if c else None for c in db.get_player_team(user_id, character_definitions)]
    if action == 'add':
        if char_db_id in team_ids: return jsonify({'success': False, 'message': 'Already in team.'})
        try:
            empty_slot_index = team_ids.index(None); team_ids[empty_slot_index] = char_db_id
        except ValueError:
            return jsonify({'success': False, 'message': 'Team is full!'})
    elif action == 'remove':
        try:
            slot_to_clear = team_ids.index(char_db_id); team_ids[slot_to_clear] = None
        except ValueError:
            return jsonify({'success': False, 'message': 'Not in team.'})
    else:
        return jsonify({'success': False, 'message': 'Invalid action.'})
    db.set_player_team(user_id, team_ids);
    return jsonify({'success': True})


@app.route('/api/merge_heroes', methods=['POST'])
def merge_heroes():
    if not session.get('logged_in'): return jsonify({'success': False}), 401
    user_id = session['user_id'];
    char_name = request.json.get('name');
    collection = db.get_player_data(user_id)['collection']
    heroes_of_type = [h for h in collection if h['character_name'] == char_name]
    if not heroes_of_type: return jsonify({'success': False, 'message': 'You do not own this hero.'})
    current_rarity = heroes_of_type[0]['rarity']
    if current_rarity not in MERGE_COST: return jsonify({'success': False, 'message': 'This hero is at max rarity!'})
    cost = MERGE_COST[current_rarity]
    if len(heroes_of_type) < cost: return jsonify(
        {'success': False, 'message': f'Not enough copies. Need {cost}, have {len(heroes_of_type)}.'})
    next_rarity_index = RARITY_ORDER.index(current_rarity) + 1;
    new_rarity = RARITY_ORDER[next_rarity_index]
    heroes_to_consume = heroes_of_type[1:cost];
    hero_to_upgrade = heroes_of_type[0]
    conn = db.get_db_connection();
    cursor = conn.cursor()
    cursor.execute("UPDATE player_characters SET rarity = ? WHERE id = ?", (new_rarity, hero_to_upgrade['id']))
    ids_to_delete = tuple(h['id'] for h in heroes_to_consume)
    if ids_to_delete:
        cursor.execute(f"DELETE FROM player_characters WHERE id IN ({','.join('?' * len(ids_to_delete))})",
                       ids_to_delete)
        cursor.execute(
            f"UPDATE player_team SET character_db_id = NULL WHERE character_db_id IN ({','.join('?' * len(ids_to_delete))})",
            ids_to_delete)
    conn.commit();
    conn.close()
    return jsonify({'success': True, 'message': f'{char_name} upgraded to {new_rarity}!'})


# --- CHAT & SERVER RUN ---
@socketio.on('connect')
def handle_connect():
    if session.get('logged_in'):
        username = session.get('username');
        online_users[request.sid] = username;
        print(f"Client connected: {username} ({request.sid})")
        emit('receive_message', {'username': 'System', 'message': f'{username} has joined the chat.'}, broadcast=True)
        emit('update_online_list', list(online_users.values()), broadcast=True)


@socketio.on('send_message')
def handle_send_message(data):
    if session.get('logged_in'):
        message = data.get('message', '').strip()
        if 0 < len(message) <= 200:
            username = session.get('username');
            timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            with open("chat_log.txt", "a", encoding="utf-8") as log_file: log_file.write(
                f"[{timestamp}] {username}: {message}\n")
            emit('receive_message', {'username': username, 'message': message}, broadcast=True)


@socketio.on('disconnect')
def handle_disconnect():
    username = online_users.pop(request.sid, 'A user');
    print(f"Client disconnected: {username} ({request.sid})")
    emit('receive_message', {'username': 'System', 'message': f'{username} has left the chat.'}, broadcast=True)
    emit('update_online_list', list(online_users.values()), broadcast=True)


if __name__ == '__main__':
    socketio.run(app)