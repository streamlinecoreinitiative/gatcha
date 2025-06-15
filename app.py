# app.py
from flask import Flask, jsonify, render_template, request, session
from flask_socketio import SocketIO, emit
import os
import json
import random
import database as db


# --- HELPER FUNCTION TO LOAD GAME DATA ---
def load_all_definitions(file_path):
    try:
        with open(file_path, "r") as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        print(f"FATAL ERROR: {os.path.basename(file_path)} is missing or corrupted!")
        return None


# --- APP SETUP ---
app = Flask(__name__)
app.config['SECRET_KEY'] = os.urandom(24)
socketio = SocketIO(app)

# --- INITIALIZE THE DATABASE ---
db.init_db()

# --- LOAD GAME DATA ON STARTUP ---
BASE_DIR = os.path.dirname(__file__)
CHARACTERS_FILE = os.path.join(BASE_DIR, "characters.json")
ENEMIES_FILE = os.path.join(BASE_DIR, "enemies.json")
LORE_FILE = os.path.join(BASE_DIR, "lore.txt")
character_definitions = load_all_definitions(CHARACTERS_FILE)
enemy_definitions = load_all_definitions(ENEMIES_FILE)

if not character_definitions or not enemy_definitions:
    exit("Could not load essential game data. Exiting.")

gacha_pool = {rarity: [c for c in character_definitions if c['rarity'] == rarity] for rarity in
              ["Common", "Rare", "SSR"]}
SUMMON_COST = 50
GEMS_PER_WIN = 25


# --- HTML SERVING ROUTE ---
@app.route('/')
def index():
    return render_template('index.html')


@app.route('/api/game_data', methods=['GET'])
def get_game_data():
    """Provides static game data like character definitions to the client."""
    return jsonify({
        'characters': character_definitions
    })

# --- API ENDPOINT LOGIC ---
@app.route('/api/register', methods=['POST'])
def register():
    data = request.json
    username = data.get('username')
    password = data.get('password')
    result = db.register_user(username, password)
    if result == "Success":
        return jsonify({'success': True, 'message': 'Registration successful! Please log in.'})
    else:
        return jsonify({'success': False, 'message': result})


@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    username = data.get('username')
    password = data.get('password')
    user_id = db.login_user(username, password)
    if user_id:
        session['logged_in'] = True
        session['username'] = username
        session['user_id'] = user_id
        return jsonify({'success': True})
    return jsonify({'success': False, 'message': 'Invalid username or password.'})


@app.route('/api/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({'success': True})


@app.route('/api/player_data', methods=['GET'])
def get_player_data():
    if not session.get('logged_in'):
        return jsonify({'success': False, 'message': 'Not logged in'}), 401
    user_id = session['user_id']
    player_data = db.get_player_data(user_id)
    player_team = db.get_player_team(user_id, character_definitions)
    full_data = {
        'username': session.get('username'),
        'gems': player_data['gems'],
        'current_stage': player_data['current_stage'],
        'team': player_team,
        'collection': player_data['characters']
    }
    return jsonify({'success': True, 'data': full_data})


@app.route('/api/summon', methods=['POST'])
def summon():
    if not session.get('logged_in'): return jsonify({'success': False, 'message': 'Not logged in'}), 401
    user_id = session['user_id']
    player_data = db.get_player_data(user_id)
    if player_data['gems'] < SUMMON_COST:
        return jsonify({'success': False, 'message': 'Not enough gems!'})

    weights = [60, 30, 10]
    rarities = ["Common", "Rare", "SSR"]
    chosen_rarity = random.choices(rarities, weights=weights, k=1)[0]

    summoned_char_def = random.choice(gacha_pool[chosen_rarity])

    db.add_character_to_player(user_id, summoned_char_def['name'])
    new_gems = player_data['gems'] - SUMMON_COST
    db.save_player_data(user_id, new_gems, player_data['current_stage'])

    # Send back the full character definition, which includes the image_file
    return jsonify({'success': True, 'character': summoned_char_def})


@app.route('/api/fight', methods=['POST'])
def fight():
    if not session.get('logged_in'): return jsonify({'success': False, 'message': 'Not logged in'}), 401
    user_id = session['user_id']
    stage_num = request.json.get('stage')
    team = db.get_player_team(user_id, character_definitions)
    team = [c for c in team if c]
    if not team: return jsonify({'success': False, 'message': 'Your team is empty!'})

    team_power = sum(c['base_hp'] + c['base_atk'] for c in team)
    enemy_def = enemy_definitions[(stage_num - 1) % len(enemy_definitions)]
    enemy_power = (enemy_def['base_hp'] + (stage_num * 10)) + ((enemy_def['base_atk'] + (stage_num * 2)) * 5)

    victory = team_power > enemy_power
    player_data = db.get_player_data(user_id)
    if victory:
        new_gems = player_data['gems'] + GEMS_PER_WIN
        new_stage = player_data['current_stage']
        if stage_num == new_stage: new_stage += 1
        db.save_player_data(user_id, new_gems, new_stage)
    return jsonify({'success': True, 'victory': victory, 'team_power': team_power, 'enemy_power': enemy_power,
                    'gems_won': GEMS_PER_WIN if victory else 0})


@app.route('/api/set_team', methods=['POST'])
def set_team():
    if not session.get('logged_in'): return jsonify({'success': False, 'message': 'Not logged in'}), 401
    user_id = session['user_id']
    char_id_to_add = request.json.get('char_id')
    team_ids = [c['db_id'] if c else None for c in db.get_player_team(user_id, character_definitions)]
    if char_id_to_add in team_ids: return jsonify({'success': False, 'message': 'Character is already in the team.'})
    try:
        empty_slot = team_ids.index(None)
        team_ids[empty_slot] = char_id_to_add
    except ValueError:
        team_ids[0] = char_id_to_add
    db.set_player_team(user_id, team_ids)
    return jsonify({'success': True})


@app.route('/api/lore', methods=['GET'])
def get_lore():
    try:
        with open(LORE_FILE, "r") as f:
            lore_text = f.read()
        return jsonify({'success': True, 'data': lore_text})
    except FileNotFoundError:
        return jsonify({'success': False, 'message': 'Lore file not found.'})


# --- REAL-TIME CHAT (SOCKET.IO) ---
@socketio.on('connect')
def handle_connect():
    print(f"Client connected: {request.sid}")
    if session.get('logged_in'):
        username = session.get('username')
        emit('receive_message', {'username': 'System', 'message': f'{username} has joined the chat.'}, broadcast=True)


@socketio.on('send_message')
def handle_send_message(data):
    if session.get('logged_in'):
        message = data.get('message', '').strip()
        if 0 < len(message) <= 200:
            response_data = {'username': session.get('username'), 'message': message}
            emit('receive_message', response_data, broadcast=True)


@socketio.on('disconnect')
def handle_disconnect():
    print(f"Client disconnected: {request.sid}")
    if session.get('logged_in'):
        username = session.get('username')
        emit('receive_message', {'username': 'System', 'message': f'{username} has left the chat.'}, broadcast=True)


# --- RUN THE SERVER ---
if __name__ == '__main__':
    socketio.run(app, host="0.0.0.0", port=5001, debug=True, allow_unsafe_werkzeug=True)