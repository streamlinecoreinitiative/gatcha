# app.py (V5.4 - Hardened Stat Calculation)
from flask import Flask, jsonify, render_template, request, session
from flask_socketio import SocketIO, emit
import os
import json
import random
from datetime import datetime
import database as db


def load_all_definitions(file_path):
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        print(f"FATAL ERROR: {os.path.basename(file_path)} is missing or corrupted!")
        return None


app = Flask(__name__)
app.config['SECRET_KEY'] = os.urandom(24)
socketio = SocketIO(app)
db.init_db()

# --- DATA LOADING & CONFIG ---
BASE_DIR = os.path.dirname(__file__)
character_definitions = load_all_definitions(os.path.join(BASE_DIR, "characters.json"))
enemy_definitions = load_all_definitions(os.path.join(BASE_DIR, "enemies.json"))
equipment_definitions = load_all_definitions(os.path.join(BASE_DIR, "static", "equipment.json"))  # Corrected path
LORE_FILE = os.path.join(BASE_DIR, "lore.txt")
if not character_definitions or not enemy_definitions or not equipment_definitions: exit("Could not load game data.")

equipment_stats_map = {item['name']: item['stat_bonuses'] for item in equipment_definitions}
gacha_pool = {rarity: [c for c in character_definitions if c['rarity'] == rarity] for rarity in
              ["Common", "Rare", "SSR"]}
SUMMON_COST = 50
online_users = {}
RARITY_ORDER = ["Common", "Rare", "SSR", "UR", "LR"]
MERGE_COST = {"Common": 3, "Rare": 3, "SSR": 4, "UR": 5}
STAT_MULTIPLIER = {"Common": 1.0, "Rare": 1.3, "SSR": 1.8, "UR": 2.5, "LR": 3.5}


# --- HELPER FUNCTIONS ---
def get_enemy_for_stage(stage_num):
    random.seed(stage_num)
    possible_enemies = []
    max_rarity_index = stage_num // 10
    for e in enemy_definitions:
        if e.get('rarity') in RARITY_ORDER:
            rarity_index = RARITY_ORDER.index(e.get('rarity'))
            if rarity_index <= max_rarity_index:
                possible_enemies.append(e)
    if not possible_enemies:
        print(f"Warning: No valid enemies found for stage {stage_num}, falling back.")
        enemy_def = random.choice(enemy_definitions)
    else:
        enemy_def = random.choice(possible_enemies)
    random.seed()
    return enemy_def


# --- THIS IS THE CORRECTED HELPER FUNCTION ---
# in app.py

def calculate_fight_stats(team, enemy_def, level_scaling):
    total_team_hp, total_team_atk, team_crit_chance, team_crit_damage = 0, 0, 0, 1.5
    for character in team:
        if not character: continue

        try:
            # Start with base stats
            char_hp = character['base_hp'] * STAT_MULTIPLIER.get(character['rarity'], 1.0)
            char_atk = character['base_atk'] * STAT_MULTIPLIER.get(character['rarity'], 1.0)
            char_crit_chance = character.get('crit_chance', 0)
            char_crit_damage = character.get('crit_damage', 1.5)

            # --- BULLETPROOF EQUIPMENT STAT CALCULATION ---
            # Use .get() on the character dict itself in case 'equipped' key is missing
            for item in character.get('equipped', []):
                # Check if item is a dictionary before proceeding
                if isinstance(item, dict):
                    item_name = item.get('equipment_name')
                    if item_name and item_name in equipment_stats_map:
                        item_stats = equipment_stats_map[item_name]
                        char_hp += item_stats.get('hp', 0)
                        char_atk += item_stats.get('atk', 0)
                        char_crit_chance += item_stats.get('crit_chance', 0)
                        char_crit_damage += item_stats.get('crit_damage', 0)
                    elif item_name:
                        # Log if an item exists in the DB but not in the JSON map
                        print(f"Warning: Item '{item_name}' found on character but not in equipment_stats_map.")
                else:
                    # Log if the item data is not in the expected format
                    print(f"Warning: Malformed item data found on character: {item}")
            # --- END OF BULLETPROOFING ---

            total_team_hp += char_hp
            total_team_atk += char_atk
            team_crit_chance = max(team_crit_chance, char_crit_chance)
            team_crit_damage = max(team_crit_damage, char_crit_damage)

        except (KeyError, TypeError) as e:
            # This is a master safety net. If a character's data is corrupted,
            # log the error and skip them instead of crashing the server.
            print(f"FATAL: Could not calculate stats for a character. Error: {e}. Data: {character}")
            continue

    # --- The rest of the function remains the same ---
    team_elements = [c.get('element') for c in team if c]
    enemy_element = enemy_def.get('element')
    advantage = {'Fire': 'Grass', 'Grass': 'Water', 'Water': 'Fire'}
    advantageous_heroes = sum(1 for el in team_elements if advantage.get(el) == enemy_element)
    disadvantageous_heroes = sum(1 for el in team_elements if advantage.get(enemy_element) == el)
    team_elemental_multiplier = 1.0 + (0.25 * advantageous_heroes) - (0.25 * disadvantageous_heroes)

    enemy_hp = enemy_def['base_hp'] * (1 + (level_scaling - 1) * 0.25) * random.uniform(0.9, 1.1)
    enemy_atk = enemy_def['base_atk'] * (1 + (level_scaling - 1) * 0.15) * random.uniform(0.9, 1.1)
    enemy_crit_chance = enemy_def.get('crit_chance', 0)
    enemy_crit_damage = enemy_def.get('crit_damage', 1.5)

    return {
        "team_hp": total_team_hp, "team_atk": total_team_atk, "team_crit_chance": team_crit_chance,
        "team_crit_damage": team_crit_damage, "team_elemental_multiplier": team_elemental_multiplier,
        "enemy_hp": enemy_hp, "enemy_atk": enemy_atk, "enemy_crit_chance": enemy_crit_chance,
        "enemy_crit_damage": enemy_crit_damage, "enemy_element": enemy_element
    }


# --- CORE ROUTES ---
@app.route('/')
def index(): return render_template('index.html')


@app.route('/api/game_data')
def get_game_data(): return jsonify({'characters': character_definitions})


@app.route('/api/lore')
def get_lore():
    try:
        with open(LORE_FILE, "r", encoding="utf-8") as f:
            return jsonify({'success': True, 'data': f.read()})
    except FileNotFoundError:
        return jsonify({'success': False, 'message': 'Lore file not found.'})


@app.route('/api/register', methods=['POST'])
def register():
    data = request.json
    result = db.register_user(data.get('username'), data.get('password'))
    return jsonify({'success': result == "Success", 'message': result})


@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    user_id = db.login_user(data.get('username'), data.get('password'))
    if user_id:
        session['logged_in'] = True
        session['username'] = data.get('username')
        session['user_id'] = user_id
        return jsonify({'success': True})
    else:
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
    if player_data is None:
        session.clear()
        return jsonify({'success': False, 'message': 'Player data not found. Please log in again.'}), 401
    if player_data['gems'] < SUMMON_COST: return jsonify({'success': False, 'message': 'Not enough gems!'})
    chosen_rarity = random.choices(list(gacha_pool.keys()), weights=[60, 30, 10], k=1)[0]
    summoned_char_def = random.choice(gacha_pool[chosen_rarity])
    db.add_character_to_player(user_id, summoned_char_def)
    new_gems = player_data['gems'] - SUMMON_COST
    db.save_player_data(user_id, new_gems, player_data['current_stage'])
    return jsonify({'success': True, 'character': summoned_char_def})


@app.route('/api/stage_info/<int:stage_num>', methods=['GET'])
def get_stage_info(stage_num):
    if not session.get('logged_in'): return jsonify({'success': False, 'message': 'Not logged in'}), 401
    enemy_def = get_enemy_for_stage(stage_num)
    enemy_hp = enemy_def['base_hp'] * (1 + (stage_num - 1) * 0.25)
    enemy_atk = enemy_def['base_atk'] * (1 + (stage_num - 1) * 0.15)
    enemy_info = {
        'name': enemy_def['name'], 'element': enemy_def.get('element', 'None'),
        'image_file': f"enemies/{enemy_def.get('image_file', 'placeholder_enemy.png')}",
        'hp': int(enemy_hp), 'atk': int(enemy_atk)
    }
    return jsonify({'success': True, 'enemy': enemy_info})


# --- PILLAR 1: CAMPAIGN ---
@app.route('/api/fight', methods=['POST'])
def fight():
    if not session.get('logged_in'): return jsonify({'success': False, 'message': 'Not logged in'}), 401
    user_id, stage_num = session['user_id'], request.json.get('stage')
    team = db.get_player_team(user_id, character_definitions)
    if not any(team): return jsonify({'success': False, 'message': 'Your team is empty!'})
    enemy_def = get_enemy_for_stage(stage_num)

    stats = calculate_fight_stats(team, enemy_def, stage_num)
    team_hp, enemy_hp = stats['team_hp'], stats['enemy_hp']

    enemy_image = f"enemies/{enemy_def.get('image_file', 'placeholder_enemy.png')}"
    combat_log = [{'type': 'start',
                   'message': f"Floor {stage_num}: Your team faces a {stats['enemy_element']} {enemy_def['name']}!",
                   'enemy_image': enemy_image}]

    while team_hp > 0 and enemy_hp > 0:
        player_damage = stats['team_atk'] * random.uniform(0.8, 1.2) * stats['team_elemental_multiplier']
        is_player_crit = random.random() * 100 < stats['team_crit_chance']
        if is_player_crit: player_damage *= stats['team_crit_damage']
        enemy_hp -= player_damage
        combat_log.append({'type': 'player_attack', 'crit': is_player_crit, 'damage': int(player_damage),
                           'enemy_hp': int(max(0, enemy_hp))})
        if enemy_hp <= 0: break

        enemy_damage = stats['enemy_atk'] * random.uniform(0.8, 1.2)
        is_enemy_crit = random.random() * 100 < stats['enemy_crit_chance']
        if is_enemy_crit: enemy_damage *= stats['enemy_crit_damage']
        team_hp -= enemy_damage
        combat_log.append({'type': 'enemy_attack', 'crit': is_enemy_crit, 'damage': int(enemy_damage),
                           'team_hp': int(max(0, team_hp))})

    victory = team_hp > 0
    gems_won = 0
    if victory:
        combat_log.append({'type': 'end', 'message': "--- VICTORY! ---"})
        player_data = db.get_player_data(user_id)
        if stage_num == player_data['current_stage']:
            gems_won = 25 + (stage_num // 5) * 5
            db.save_player_data(user_id, player_data['gems'] + gems_won, player_data['current_stage'] + 1)
        else:
            gems_won = 5
            db.save_player_data(user_id, player_data['gems'] + gems_won, player_data['current_stage'])
    else:
        combat_log.append({'type': 'end', 'message': "--- DEFEAT! ---"})
    return jsonify({'success': True, 'victory': victory, 'log': combat_log, 'gems_won': gems_won, 'looted_item': None})


# --- PILLAR 2: DUNGEONS ---
@app.route('/api/fight_dungeon', methods=['POST'])
def fight_dungeon():
    if not session.get('logged_in'): return jsonify({'success': False, 'message': 'Not logged in'}), 401
    user_id = session['user_id']
    team = db.get_player_team(user_id, character_definitions)
    if not any(team): return jsonify({'success': False, 'message': 'Your team is empty!'})
    enemy_def = random.choice(enemy_definitions)
    stage_level_scaling = db.get_player_data(user_id)['current_stage']

    stats = calculate_fight_stats(team, enemy_def, stage_level_scaling)
    team_hp, enemy_hp = stats['team_hp'], stats['enemy_hp']

    enemy_image = f"enemies/{enemy_def.get('image_file', 'placeholder_enemy.png')}"
    combat_log = [
        {'type': 'start', 'message': f"Dungeon: Your team faces a {stats['enemy_element']} {enemy_def['name']}!",
         'enemy_image': enemy_image}]

    while team_hp > 0 and enemy_hp > 0:
        player_damage = stats['team_atk'] * random.uniform(0.8, 1.2) * stats['team_elemental_multiplier']
        is_player_crit = random.random() * 100 < stats['team_crit_chance']
        if is_player_crit: player_damage *= stats['team_crit_damage']
        enemy_hp -= player_damage
        combat_log.append({'type': 'player_attack', 'crit': is_player_crit, 'damage': int(player_damage),
                           'enemy_hp': int(max(0, enemy_hp))})
        if enemy_hp <= 0: break

        enemy_damage = stats['enemy_atk'] * random.uniform(0.8, 1.2)
        is_enemy_crit = random.random() * 100 < stats['enemy_crit_chance']
        if is_enemy_crit: enemy_damage *= stats['enemy_crit_damage']
        team_hp -= enemy_damage
        combat_log.append({'type': 'enemy_attack', 'crit': is_enemy_crit, 'damage': int(enemy_damage),
                           'team_hp': int(max(0, team_hp))})

    victory = team_hp > 0
    looted_item = None
    if victory:
        combat_log.append({'type': 'end', 'message': "--- VICTORY! ---"})
        if random.random() < 0.50:
            looted_item_def = random.choice(equipment_definitions)
            looted_item = {'name': looted_item_def['name'], 'rarity': looted_item_def['rarity']}
            conn = db.get_db_connection()
            conn.execute("INSERT INTO player_equipment (user_id, equipment_name, rarity) VALUES (?, ?, ?)",
                         (user_id, looted_item['name'], looted_item['rarity']))
            conn.commit()
            conn.close()
    else:
        combat_log.append({'type': 'end', 'message': "--- DEFEAT! ---"})
    return jsonify({'success': True, 'victory': victory, 'log': combat_log, 'gems_won': 0, 'looted_item': looted_item})


# --- EQUIPMENT MANAGEMENT ---
@app.route('/api/player_equipment', methods=['GET'])
def get_player_equipment():
    if not session.get('logged_in'): return jsonify({'success': False}), 401
    user_id = session['user_id']
    conn = db.get_db_connection()
    items = conn.execute('SELECT * FROM player_equipment WHERE user_id = ?', (user_id,)).fetchall()
    conn.close()
    return jsonify({'success': True, 'equipment': [dict(item) for item in items]})


@app.route('/api/equip_item', methods=['POST'])
def equip_item():
    if not session.get('logged_in'): return jsonify({'success': False}), 401
    user_id, data = session['user_id'], request.json
    equipment_id, character_id = data.get('equipment_id'), data.get('character_id')
    conn = db.get_db_connection()
    conn.execute('UPDATE player_equipment SET is_equipped_on = NULL WHERE is_equipped_on = ? AND user_id = ?',
                 (character_id, user_id))
    conn.execute('UPDATE player_equipment SET is_equipped_on = ? WHERE id = ? AND user_id = ?',
                 (character_id, equipment_id, user_id))
    conn.commit()
    conn.close()
    return jsonify({'success': True})


@app.route('/api/unequip_item', methods=['POST'])
def unequip_item():
    if not session.get('logged_in'): return jsonify({'success': False}), 401
    user_id, equipment_id = session['user_id'], request.json.get('equipment_id')
    conn = db.get_db_connection()
    conn.execute('UPDATE player_equipment SET is_equipped_on = NULL WHERE id = ? AND user_id = ?',
                 (equipment_id, user_id))
    conn.commit()
    conn.close()
    return jsonify({'success': True})


# --- OTHER MANAGEMENT & CHAT ---
@app.route('/api/manage_team', methods=['POST'])
def manage_team():
    if not session.get('logged_in'): return jsonify({'success': False}), 401
    user_id, data = session['user_id'], request.json
    char_db_id, action = data.get('char_id'), data.get('action')
    team_ids = [c['db_id'] if c else None for c in db.get_player_team(user_id, character_definitions)]
    if action == 'add':
        if char_db_id in team_ids: return jsonify({'success': False, 'message': 'Already in team.'})
        try:
            team_ids[team_ids.index(None)] = char_db_id
        except ValueError:
            return jsonify({'success': False, 'message': 'Team is full!'})
    elif action == 'remove':
        try:
            team_ids[team_ids.index(char_db_id)] = None
        except ValueError:
            return jsonify({'success': False, 'message': 'Not in team.'})
    else:
        return jsonify({'success': False, 'message': 'Invalid action.'})
    db.set_player_team(user_id, team_ids)
    return jsonify({'success': True})


@app.route('/api/merge_heroes', methods=['POST'])
def merge_heroes():
    if not session.get('logged_in'): return jsonify({'success': False}), 401
    user_id = session['user_id']
    char_name = request.json.get('name')
    collection = db.get_player_data(user_id)['collection']
    heroes_of_type = [h for h in collection if h['character_name'] == char_name]
    if not heroes_of_type: return jsonify({'success': False, 'message': 'You do not own this hero.'})
    current_rarity = heroes_of_type[0]['rarity']
    if current_rarity not in MERGE_COST: return jsonify({'success': False, 'message': 'This hero is at max rarity!'})
    cost = MERGE_COST[current_rarity]
    if len(heroes_of_type) < cost: return jsonify(
        {'success': False, 'message': f'Not enough copies. Need {cost}, have {len(heroes_of_type)}.'})
    next_rarity_index = RARITY_ORDER.index(current_rarity) + 1
    new_rarity = RARITY_ORDER[next_rarity_index]
    heroes_to_consume = heroes_of_type[1:cost]
    hero_to_upgrade = heroes_of_type[0]
    conn = db.get_db_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE player_characters SET rarity = ? WHERE id = ?", (new_rarity, hero_to_upgrade['id']))
    ids_to_delete = tuple(h['id'] for h in heroes_to_consume)
    if ids_to_delete:
        cursor.execute(f"DELETE FROM player_characters WHERE id IN ({','.join('?' * len(ids_to_delete))})",
                       ids_to_delete)
        cursor.execute(
            f"UPDATE player_team SET character_db_id = NULL WHERE character_db_id IN ({','.join('?' * len(ids_to_delete))})",
            ids_to_delete)
    conn.commit()
    conn.close()
    return jsonify({'success': True, 'message': f'{char_name} upgraded to {new_rarity}!'})


@socketio.on('connect')
def handle_connect():
    if session.get('logged_in'):
        username = session.get('username')
        online_users[request.sid] = username
        emit('receive_message', {'username': 'System', 'message': f'{username} has joined the chat.'}, broadcast=True)
        emit('update_online_list', list(online_users.values()), broadcast=True)


@socketio.on('send_message')
def handle_send_message(data):
    if session.get('logged_in'):
        message = data.get('message', '').strip()
        if 0 < len(message) <= 200:
            emit('receive_message', {'username': session.get('username'), 'message': message}, broadcast=True)


@socketio.on('disconnect')
def handle_disconnect():
    username = online_users.pop(request.sid, 'A user')
    emit('receive_message', {'username': 'System', 'message': f'{username} has left the chat.'}, broadcast=True)
    emit('update_online_list', list(online_users.values()), broadcast=True)


if __name__ == '__main__':
    socketio.run(app, debug=True, port=5000)