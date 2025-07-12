# app.py (V5.4 - Hardened Stat Calculation)
import eventlet
eventlet.monkey_patch()

from flask import Flask, jsonify, render_template, request, session
from flask_socketio import SocketIO, emit
import os
import json
import random
import re
from datetime import datetime
import time
import paypalrestsdk
import database as db
import string
import secrets
from balance import generate_enemy, calculate_item_power
from helpers import load_all_definitions, send_email
from werkzeug.utils import secure_filename
import config

app = Flask(__name__)
if hasattr(app.config, "from_object"):
    app.config.from_object(config)
else:
    # When running in a minimal test environment the config object may be
    # a simple dict without `from_object`. In that case update the dict
    # directly with uppercase attributes from the config module.
    for key in dir(config):
        if key.isupper():
            app.config[key] = getattr(config, key)
socketio = SocketIO(app)
db.init_db()
paypal_conf = db.get_paypal_config()
paypalrestsdk.configure({
    'mode': paypal_conf.get('mode', 'sandbox'),
    'client_id': paypal_conf.get('client_id'),
    'client_secret': paypal_conf.get('client_secret')
})
from blueprints.auth import auth_bp
from blueprints.admin import admin_bp
from blueprints.game import game_bp, fight_dungeon as dungeon_fight
if hasattr(app, 'register_blueprint'):
    app.register_blueprint(auth_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(game_bp)
fight_dungeon = dungeon_fight

import threading

def cleanup_online_users():
    while True:
        now = time.time()
        removed = False
        for sid, info in list(online_users.items()):
            last = info.get('last_active', now)
            if now - last > app.config['ONLINE_TIMEOUT']:
                online_users.pop(sid, None)
                removed = True
        if removed:
            emit_online_list()
        time.sleep(60)


if hasattr(app, 'before_request'):
    @app.before_request
    def before_request_update_activity():
        if session.get('logged_in'):
            update_last_active(session.get('user_id'))

# Base URL for links in emails
BASE_URL = os.getenv('BASE_URL', 'https://towerchronicles.xyz')
app.config['BASE_URL'] = BASE_URL
EMAIL_CONFIRMATIONS = {}

# --- DATA LOADING & CONFIG ---
BASE_DIR = os.path.dirname(__file__)
character_definitions = load_all_definitions(os.path.join(BASE_DIR, "characters.json"))
enemy_definitions = load_all_definitions(os.path.join(BASE_DIR, "enemies.json"))
equipment_definitions = load_all_definitions(os.path.join(BASE_DIR, "static", "equipment.json"))  # Corrected path
LORE_FILE = os.path.join(BASE_DIR, "lore.txt")
if not character_definitions or not enemy_definitions or not equipment_definitions: raise FileNotFoundError("Could not load game data.")

# Order of rarities for heroes. Defined before it is referenced below.
app.config['RARITY_ORDER'] = ["Common", "Rare", "SSR", "UR", "LR"]
equipment_stats_map = {item['name']: item['stat_bonuses'] for item in equipment_definitions}
available_rarities = sorted({c['rarity'] for c in character_definitions}, key=lambda r: app.config['RARITY_ORDER'].index(r))
gacha_pool = {rarity: [c for c in character_definitions if c['rarity'] == rarity] for rarity in available_rarities}
app.config['PULL_COST'] = 150
app.config['SSR_PITY_THRESHOLD'] = 90
app.config['CHARACTER_DEFINITIONS'] = character_definitions
app.config['ENEMY_DEFINITIONS'] = enemy_definitions
app.config['EQUIPMENT_DEFINITIONS'] = equipment_definitions
app.config['GACHA_POOL'] = gacha_pool
online_users = {}
app.config['ONLINE_TIMEOUT'] = 300  # seconds

CHAT_LOG_FILE = os.path.join(BASE_DIR, 'chat_history.json')
app.config['CHAT_HISTORY_LIMIT'] = 50
chat_history = []

BAD_WORDS_FILE = os.path.join(BASE_DIR, 'bad_words.txt')
BAD_WORDS = set()

def load_bad_words():
    global BAD_WORDS
    if os.path.exists(BAD_WORDS_FILE):
        try:
            with open(BAD_WORDS_FILE, 'r', encoding='utf-8') as f:
                BAD_WORDS = {w.strip().lower() for w in f if w.strip()}
        except Exception as e:
            print(f'Failed to load bad words: {e}')
    if not BAD_WORDS:
        BAD_WORDS = {'badword', 'curse'}

def filter_bad_words(message: str) -> str:
    words = re.split(r'(\W+)', message)
    filtered = [('*' * len(w)) if w.lower() in BAD_WORDS else w for w in words]
    return ''.join(filtered)

def load_chat_history():
    global chat_history
    if os.path.exists(CHAT_LOG_FILE):
        try:
            with open(CHAT_LOG_FILE, 'r', encoding='utf-8') as f:
                chat_history = json.load(f)
        except Exception:
            chat_history = []

def save_chat_history():
    try:
        with open(CHAT_LOG_FILE, 'w', encoding='utf-8') as f:
            json.dump(chat_history[-app.config['CHAT_HISTORY_LIMIT']:], f)
    except Exception as e:
        print(f'Failed to save chat history: {e}')

def add_chat_message(username: str, message: str):
    chat_history.append({'username': username, 'message': message})
    if len(chat_history) > app.config['CHAT_HISTORY_LIMIT']:
        chat_history.pop(0)
    save_chat_history()

load_bad_words()
load_chat_history()

def update_last_active(user_id):
    sid = next((sid for sid, info in online_users.items() if info.get('user_id') == user_id), None)
    if sid:
        online_users[sid]['last_active'] = time.time()

threading.Thread(target=cleanup_online_users, daemon=True).start()


def refresh_gacha_pool():
    global available_rarities, gacha_pool
    available_rarities = sorted({c['rarity'] for c in character_definitions}, key=lambda r: app.config['RARITY_ORDER'].index(r))
    gacha_pool = {rarity: [c for c in character_definitions if c['rarity'] == rarity] for rarity in available_rarities}

def emit_online_list():
    visible = [u for u in online_users.values() if not db.is_user_admin(u.get('user_id'))]
    socketio.emit('update_online_list', visible)
# Enemy rarities include lower tiers not used for heroes
app.config['ENEMY_RARITY_ORDER'] = ["Common", "Uncommon", "Rare", "Epic", "SSR", "UR", "LR"]
app.config['MERGE_COST'] = {"Common": 3, "Rare": 3, "SSR": 4, "UR": 5}
app.config['STAT_MULTIPLIER'] = {"Common": 1.0, "Rare": 1.3, "SSR": 1.8, "UR": 2.5, "LR": 3.5}

# --- Premium Currency Store Packages ---


def refresh_store_prices():
    prices = db.get_store_prices()
    for pkg in app.config['STORE_PACKAGES']:
        if 'amount' in pkg and pkg['id'] in prices:
            pkg['price'] = prices[pkg['id']]

refresh_store_prices()

# Password reset tokens stored in DB
# In-memory store for pending email confirmations {token: user_id}


def refresh_online_progress(user_id):
    sid = next((sid for sid, info in online_users.items() if info.get('user_id') == user_id), None)
    if sid:
        progress = db.get_player_data(user_id)
        if not progress:
            return
        online_users[sid]['current_stage'] = progress.get('current_stage', 1)
        online_users[sid]['dungeon_runs'] = progress.get('dungeon_runs', 0)
        emit_online_list()


# Placeholder receipt verification
def verify_purchase_receipt(platform: str, receipt: str) -> bool:
    """Stub verification logic used when the PayPal SDK fails to load."""
    return receipt == "TEST_RECEIPT"


def verify_paypal_order(order_id: str, expected_amount: float) -> bool:
    """Validate a PayPal order via the REST API."""
    conf = db.get_paypal_config()
    client_id = conf.get("client_id")
    secret = conf.get("client_secret")
    mode = conf.get("mode", "sandbox")
    if not client_id or not secret:
        return False
    try:
        import base64
        from urllib import request, parse

        base = "https://api-m.paypal.com" if mode == "live" else "https://api-m.sandbox.paypal.com"
        auth = base64.b64encode(f"{client_id}:{secret}".encode()).decode()
        data = parse.urlencode({"grant_type": "client_credentials"}).encode()
        token_req = request.Request(
            f"{base}/v1/oauth2/token",
            data=data,
            headers={
                "Authorization": f"Basic {auth}",
                "Content-Type": "application/x-www-form-urlencoded",
            },
        )
        with request.urlopen(token_req, timeout=10) as resp:
            token_data = json.load(resp)
        access_token = token_data.get("access_token")
        if not access_token:
            return False

        order_req = request.Request(
            f"{base}/v2/checkout/orders/{order_id}",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        with request.urlopen(order_req, timeout=10) as resp:
            order_info = json.load(resp)

        status = order_info.get("status")
        if status == "APPROVED":
            capture_req = request.Request(
                f"{base}/v2/checkout/orders/{order_id}/capture",
                data=b"{}",
                method="POST",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json",
                },
            )
            with request.urlopen(capture_req, timeout=10) as resp:
                order_info = json.load(resp)
            status = order_info.get("status")

        if status != "COMPLETED":
            return False

        amt = (
            order_info.get("purchase_units", [{}])[0]
            .get("payments", {})
            .get("captures", [{}])[0]
            .get("amount", {})
            .get("value")
        )
        if amt is None:
            amt = order_info.get("purchase_units", [{}])[0].get("amount", {}).get(
                "value"
            )
        if amt is None:
            return False
        return abs(float(amt) - float(expected_amount)) < 0.01
    except Exception as e:
        print("PayPal verification failed", e)
        return False


def grant_currency(user_id: int, amount: int) -> int:
    """Add premium currency to the given user and return the new balance."""
    player_data = db.get_player_data(user_id)
    new_balance = player_data.get("premium_gems", 0) + amount
    db.save_player_data(user_id, premium_gems=new_balance)
    return new_balance


# --- HELPER FUNCTIONS ---
def get_enemy_for_stage(stage_num):
    custom_code = db.get_tower_level(stage_num)
    if custom_code:
        concept = next((e for e in enemy_definitions if e.get('code') == custom_code), None)
        if concept:
            archetype = "boss" if stage_num % 10 == 0 else "standard"
            return generate_enemy(stage_num, archetype, concept)
    random.seed(stage_num)
    tier_index = min(stage_num // 10, len(app.config['ENEMY_RARITY_ORDER']) - 1)
    target_rarity = app.config['ENEMY_RARITY_ORDER'][tier_index]
    possible = [e for e in enemy_definitions if e.get("rarity") == target_rarity]
    concept = random.choice(possible) if possible else random.choice(enemy_definitions)
    if stage_num % 10 == 0:
        archetype = "boss"
    else:
        archetype = random.choice([
            "standard",
            "tank",
            "glass_cannon",
            "swift",
            "healer",
            "support",
        ])
    enemy = generate_enemy(stage_num, archetype, concept)
    random.seed()
    return enemy


def get_tower_rewards(stage_num: int, first_clear: bool) -> tuple[int, int]:
    """Return (gems, gold) for a tower floor."""
    if first_clear:
        gems = 25 + (stage_num // 5) * 5
        gold = 100 * stage_num
        if stage_num % 10 == 0:
            gems += 25
            gold *= 2
    else:
        gems = 15 + (10 if stage_num % 10 == 0 else 0)
        gold = 50 * stage_num
    return gems, gold

def calculate_fight_stats(team, enemy):
    total_team_hp, total_team_atk, team_crit_chance, team_crit_damage = 0, 0, 0, 1.5
    for character in team:
        if not character: continue

        try:
            # Start with base stats
            level = character.get('level', 1)
            level_mult = 1 + 0.10 * (level - 1)
            char_hp = character['base_hp'] * app.config['STAT_MULTIPLIER'].get(character['rarity'], 1.0) * level_mult
            char_atk = character['base_atk'] * app.config['STAT_MULTIPLIER'].get(character['rarity'], 1.0) * level_mult
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
    enemy_element = enemy.get('element')
    advantage = {'Fire': 'Grass', 'Grass': 'Water', 'Water': 'Fire'}
    advantageous_heroes = sum(1 for el in team_elements if advantage.get(el) == enemy_element)
    disadvantageous_heroes = sum(1 for el in team_elements if advantage.get(enemy_element) == el)
    team_elemental_multiplier = 1.0 + (0.25 * advantageous_heroes) - (0.25 * disadvantageous_heroes)

    enemy_hp = enemy["stats"]["hp"]
    enemy_atk = enemy["stats"]["atk"]
    enemy_crit_chance = enemy.get('crit_chance', 0)
    enemy_crit_damage = enemy.get('crit_damage', 1.5)

    return {
        "team_hp": total_team_hp, "team_atk": total_team_atk, "team_crit_chance": team_crit_chance,
        "team_crit_damage": team_crit_damage, "team_elemental_multiplier": team_elemental_multiplier,
        "enemy_hp": enemy_hp, "enemy_atk": enemy_atk, "enemy_crit_chance": enemy_crit_chance,
        "enemy_crit_damage": enemy_crit_damage, "enemy_element": enemy_element
    }


def get_scaled_character_stats(character):
    """Return a character's scaled stats including equipment bonuses."""
    if not character:
        return None
    try:
        level = character.get('level', 1)
        level_mult = 1 + 0.10 * (level - 1)
        hp = character['base_hp'] * app.config['STAT_MULTIPLIER'].get(character['rarity'], 1.0) * level_mult
        atk = character['base_atk'] * app.config['STAT_MULTIPLIER'].get(character['rarity'], 1.0) * level_mult
        crit_chance = character.get('crit_chance', 0)
        crit_damage = character.get('crit_damage', 1.5)
        for item in character.get('equipped', []):
            if isinstance(item, dict):
                item_name = item.get('equipment_name')
                if item_name and item_name in equipment_stats_map:
                    item_stats = equipment_stats_map[item_name]
                    hp += item_stats.get('hp', 0)
                    atk += item_stats.get('atk', 0)
                    crit_chance += item_stats.get('crit_chance', 0)
                    crit_damage += item_stats.get('crit_damage', 0)
        return {
            'name': character.get('name', 'Hero'),
            'element': character.get('element', 'None'),
            'hp': hp,
            'atk': atk,
            'crit_chance': crit_chance,
            'crit_damage': crit_damage,
        }
    except (KeyError, TypeError) as e:
        print(f"FATAL: Could not calculate stats for a character. Error: {e}. Data: {character}")
        return None


# --- CORE ROUTES ---
if hasattr(app, "errorhandler"):
    @app.errorhandler(404)
    def not_found_error(error):
        return jsonify({'success': False, 'message': 'Resource not found'}), 404

    @app.errorhandler(500)
    def internal_error(error):
        return jsonify({'success': False, 'message': 'Internal server error'}), 500
else:
    # In the stripped down test environment DummyFlask won't implement error handlers.
    # Define no-op versions so imports succeed.
    def not_found_error(error):
        return {'success': False, 'message': 'Resource not found'}, 404

    def internal_error(error):
        return {'success': False, 'message': 'Internal server error'}, 500

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


@app.route('/api/motd')
def get_motd():
    return jsonify({'success': True, 'motd': db.get_motd()})


@app.route('/api/bug_link')
def get_bug_link():
    return jsonify({'success': True, 'url': db.get_bug_link()})







@app.route('/api/store_items')
def store_items():
    """Return available premium currency packages."""
    refresh_store_prices()
    return jsonify({'success': True, 'items': app.config['STORE_PACKAGES']})


@app.route('/api/purchase_item', methods=['POST'])
def purchase_item():
    if not session.get('logged_in'):
        return jsonify({'success': False, 'message': 'Not logged in'}), 401
    data = request.json or {}
    package_id = data.get('package_id')
    receipt = data.get('receipt')
    platform = data.get('platform')
    package = next((p for p in app.config['STORE_PACKAGES'] if p['id'] == package_id), None)
    if not package:
        return jsonify({'success': False, 'message': 'Invalid package'}), 400
    user_id = session['user_id']
    player_data = db.get_player_data(user_id)
    if 'amount' in package:
        if not verify_purchase_receipt(platform, receipt):
            return jsonify({'success': False, 'message': 'Receipt verification failed'}), 400
        new_balance = player_data.get('premium_gems', 0) + package['amount']
        db.save_player_data(user_id, premium_gems=new_balance)
        return jsonify({'success': True, 'new_balance': new_balance})
    elif 'energy' in package:
        cost = package.get('platinum_cost', 0)
        if player_data['premium_gems'] < cost:
            return jsonify({'success': False, 'message': 'Not enough Platinum'}), 400
        new_energy = player_data.get('energy', 0) + package['energy']
        db.save_player_data(user_id, premium_gems=player_data['premium_gems'] - cost, energy=new_energy)
        return jsonify({'success': True, 'new_energy': new_energy})
    elif 'dungeon_energy' in package:
        cost = package.get('platinum_cost', 0)
        if player_data['premium_gems'] < cost:
            return jsonify({'success': False, 'message': 'Not enough Platinum'}), 400
        new_energy = player_data.get('dungeon_energy', 0) + package['dungeon_energy']
        db.save_player_data(user_id, premium_gems=player_data['premium_gems'] - cost, dungeon_energy=new_energy)
        return jsonify({'success': True, 'new_dungeon_energy': new_energy})
    else:
        return jsonify({'success': False, 'message': 'Unknown package type'}), 400


@app.route('/api/paypal_client_id')
def paypal_client_id():
    conf = db.get_paypal_config()
    return jsonify({'client_id': conf.get('client_id')})


@app.route('/api/paypal_complete', methods=['POST'])
def paypal_complete():
    if not session.get('logged_in'):
        return jsonify({'success': False, 'message': 'Not logged in'}), 401
    data = request.json or {}
    package_id = data.get('package_id')
    order_id = data.get('order_id')
    package = next((p for p in app.config['STORE_PACKAGES'] if p['id'] == package_id), None)
    if not package:
        return jsonify({'success': False, 'message': 'Invalid package'}), 400
    if not order_id:
        return jsonify({'success': False, 'message': 'Missing order id'}), 400
    if not verify_paypal_order(order_id, package['price']):
        return jsonify({'success': False, 'message': 'PayPal verification failed'}), 400
    user_id = session['user_id']
    new_balance = grant_currency(user_id, package['amount'])
    return jsonify({'success': True, 'new_balance': new_balance})


@app.route('/api/paypal_webhook', methods=['POST'])
def paypal_webhook():
    """Handle PayPal webhooks for completed orders."""
    event = request.json or {}
    event_type = event.get('event_type')
    if event_type not in ('CHECKOUT.ORDER.COMPLETED', 'PAYMENT.CAPTURE.COMPLETED'):
        return jsonify({'success': True})

    resource = event.get('resource', {})
    custom_id = resource.get('custom_id')
    if not custom_id:
        pu = resource.get('purchase_units', [])
        if pu:
            custom_id = pu[0].get('custom_id')
    if not custom_id:
        return jsonify({'success': False}), 400

    try:
        user_part, pkg_id = custom_id.split(':', 1)
        user_id = int(user_part)
    except Exception:
        return jsonify({'success': False}), 400

    package = next((p for p in app.config['STORE_PACKAGES'] if p['id'] == pkg_id and p.get('amount')), None)
    if not package:
        return jsonify({'success': False}), 400

    order_id = resource.get('id')
    if not order_id or not verify_paypal_order(order_id, package['price']):
        return jsonify({'success': False}), 400

    new_balance = grant_currency(user_id, package['amount'])
    return jsonify({'success': True, 'new_balance': new_balance})


@app.route('/api/admin/paypal_config', methods=['GET', 'POST'])
def admin_paypal_config():
    if not session.get('logged_in') or not db.is_user_admin(session['user_id']):
        return jsonify({'success': False}), 403
    if request.method == 'GET':
        return jsonify({'success': True, 'config': db.get_paypal_config()})
    data = request.json or {}
    db.update_paypal_config(client_id=data.get('client_id'), client_secret=data.get('client_secret'), mode=data.get('mode'))
    conf = db.get_paypal_config()
    paypalrestsdk.configure({
        'mode': conf.get('mode', 'sandbox'),
        'client_id': conf.get('client_id'),
        'client_secret': conf.get('client_secret')
    })
    return jsonify({'success': True})


@app.route('/api/admin/store_prices', methods=['GET', 'POST'])
def admin_store_prices():
    if not session.get('logged_in') or not db.is_user_admin(session['user_id']):
        return jsonify({'success': False}), 403
    if request.method == 'GET':
        return jsonify({'success': True, 'prices': db.get_store_prices()})
    data = request.json or {}
    for pkg_id, price in data.items():
        try:
            price_val = float(price)
        except (TypeError, ValueError):
            continue
        db.update_store_price(pkg_id, price_val)
    refresh_store_prices()
    return jsonify({'success': True})


@app.route('/api/admin/email_config', methods=['GET', 'POST'])
def admin_email_config():
    if not session.get('logged_in') or not db.is_user_admin(session['user_id']):
        return jsonify({'success': False}), 403
    if request.method == 'GET':
        return jsonify({'success': True, 'config': db.get_email_config()})
    data = request.json or {}
    db.update_email_config(
        host=data.get('host'),
        port=data.get('port'),
        username=data.get('username'),
        password=data.get('password')
    )
    return jsonify({'success': True})


@app.route('/api/admin/game_settings', methods=['GET', 'POST'])
def admin_game_settings():
    if not session.get('logged_in') or not db.is_user_admin(session['user_id']):
        return jsonify({'success': False}), 403
    if request.method == 'GET':
        return jsonify({'success': True, 'settings': db.get_game_settings()})
    data = request.json or {}
    db.update_game_settings(
        energy_cap=data.get('energy_cap'),
        dungeon_cap=data.get('dungeon_cap'),
        energy_regen=data.get('energy_regen'),
        dungeon_regen=data.get('dungeon_regen')
    )
    return jsonify({'success': True})


@app.route('/api/backgrounds')
def list_backgrounds():
    return jsonify({'success': True, 'backgrounds': db.get_all_backgrounds()})


@app.route('/api/admin/background', methods=['POST'])
def admin_set_background():
    if not session.get('logged_in') or not db.is_user_admin(session['user_id']):
        return jsonify({'success': False}), 403
    section = request.form.get('section')
    file = request.files.get('image')
    if not section or not file:
        return jsonify({'success': False, 'message': 'Section and image required'}), 400
    filename = secure_filename(file.filename)
    image_dir = os.path.join(BASE_DIR, 'static', 'images', 'backgrounds')
    os.makedirs(image_dir, exist_ok=True)
    file.save(os.path.join(image_dir, filename))
    db.set_background(section, filename)
    return jsonify({'success': True})


@app.route('/api/admin/motd', methods=['POST'])
def admin_update_motd():
    if not session.get('logged_in') or not db.is_user_admin(session['user_id']):
        return jsonify({'success': False}), 403
    data = request.json or {}
    db.set_motd(data.get('motd', ''))
    return jsonify({'success': True})


@app.route('/api/admin/bug_link', methods=['POST'])
def admin_update_bug_link():
    if not session.get('logged_in') or not db.is_user_admin(session['user_id']):
        return jsonify({'success': False}), 403
    data = request.json or {}
    db.set_bug_link(data.get('url', ''))
    return jsonify({'success': True})


@app.route('/api/admin/lore', methods=['POST'])
def admin_update_lore():
    if not session.get('logged_in') or not db.is_user_admin(session['user_id']):
        return jsonify({'success': False}), 403
    data = request.json or {}
    try:
        with open(LORE_FILE, 'w', encoding='utf-8') as f:
            f.write(data.get('text', ''))
        return jsonify({'success': True})
    except OSError:
        return jsonify({'success': False, 'message': 'Failed to write lore'})


@app.route('/api/admin/expedition', methods=['POST', 'PUT', 'DELETE'])
def admin_manage_expedition():
    if not session.get('logged_in') or not db.is_user_admin(session['user_id']):
        return jsonify({'success': False}), 403
    if request.method == 'DELETE':
        data = request.json or {}
        exp_id = int(data.get('id', 0))
        db.delete_expedition(exp_id)
        return jsonify({'success': True})

    data = request.form
    # Expedition creation does not currently use a code field; remove any
    # leftover values to avoid confusion
    name = data.get('name', '').strip()
    enemies = data.get('enemies', '')
    enemies = [e.strip() for e in enemies.split(',') if e.strip()]
    description = data.get('description', '').strip()
    drops = data.get('drops', '').strip()
    image_res = data.get('image_res', '').strip()
    file = request.files.get('image')
    filename = secure_filename(file.filename) if file else None
    image_dir = os.path.join(BASE_DIR, 'static', 'images', 'ui')
    os.makedirs(image_dir, exist_ok=True)
    if file:
        file.save(os.path.join(image_dir, filename))

    sort_order = data.get('sort_order')
    sort_order = int(sort_order) if sort_order is not None and str(sort_order).isdigit() else None

    if request.method == 'POST':
        if not name or not enemies:
            return jsonify({'success': False, 'message': 'Name and enemies required'}), 400
        db.create_expedition(name, enemies, filename, description or None, drops or None, image_res or None, sort_order)
    else:
        exp_id = int(data.get('id', 0))
        db.update_expedition(exp_id, name=name or None, enemies=enemies or None, image_file=filename,
                             description=description or None, drops=drops or None, image_res=image_res or None,
                             sort_order=sort_order)
    return jsonify({'success': True})


@app.route('/api/admin/expedition/reorder', methods=['POST'])
def admin_reorder_expedition():
    if not session.get('logged_in') or not db.is_user_admin(session['user_id']):
        return jsonify({'success': False}), 403
    data = request.json or {}
    exp_id = int(data.get('id', 0))
    direction = data.get('direction')
    if direction not in ('up', 'down'):
        return jsonify({'success': False, 'message': 'Invalid direction'}), 400
    db.move_expedition(exp_id, direction)
    return jsonify({'success': True})


@app.route('/api/admin/entity', methods=['POST', 'PUT', 'DELETE'])
def admin_add_entity():
    if not session.get('logged_in') or not db.is_user_admin(session['user_id']):
        return jsonify({'success': False}), 403
    if request.method == 'DELETE':
        data = request.json or {}
        ent_type = data.get('type')
        code = data.get('code')
        if ent_type not in ('character', 'enemy') or not code:
            return jsonify({'success': False, 'message': 'Invalid data'}), 400
        arr = character_definitions if ent_type == 'character' else enemy_definitions
        idx = next((i for i, e in enumerate(arr) if e.get('code') == code), None)
        if idx is None:
            return jsonify({'success': False, 'message': 'Not found'}), 404
        del arr[idx]
        json_path = os.path.join(BASE_DIR, 'characters.json' if ent_type == 'character' else 'enemies.json')
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(arr, f, indent=2)
        if ent_type == 'character':
            refresh_gacha_pool()
        return jsonify({'success': True})

    data = request.form
    ent_type = data.get('type')
    if ent_type not in ('character', 'enemy'):
        return jsonify({'success': False, 'message': 'Invalid type'}), 400
    name = data.get('name', '').strip()
    rarity = data.get('rarity')
    element = data.get('element')
    base_hp = int(data.get('base_hp', 0))
    base_atk = int(data.get('base_atk', 0))
    tier = int(data.get('tier', 1))
    crit_chance = int(data.get('crit_chance', 0))
    crit_damage = float(data.get('crit_damage', 0))
    file = request.files.get('image')
    if request.method == 'POST' and (not code or not name or not rarity or not element or not file):
        return jsonify({'success': False, 'message': 'Missing fields'}), 400
    filename = secure_filename(file.filename) if file else None
    folder = 'characters' if ent_type == 'character' else 'enemies'
    image_dir = os.path.join(BASE_DIR, 'static', 'images', folder)
    os.makedirs(image_dir, exist_ok=True)
    if file:
        image_path = os.path.join(image_dir, filename)
        file.save(image_path)

    entry = {
        'code': code,
        'code': code,
        'name': name,
        'rarity': rarity,
        'element': element,
        'base_hp': base_hp,
        'base_atk': base_atk,
        'tier': tier,
        'crit_chance': crit_chance,
        'crit_damage': crit_damage,
        'image_file': filename if file else None
    }
    json_path = os.path.join(BASE_DIR, 'characters.json' if ent_type == 'character' else 'enemies.json')
    try:
        with open(json_path, 'r', encoding='utf-8') as f:
            arr = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        arr = []
    orig_name = name
    orig_code = code
    if request.method == 'PUT':
        orig_code = data.get('orig_code', code)
        orig_entry = next((e for e in arr if e.get('code') == orig_code), {})
        arr = [e for e in arr if e.get('code') != orig_code]
        if not file:
            entry['image_file'] = orig_entry.get('image_file')
    arr.append(entry)
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(arr, f, indent=2)
    if ent_type == 'character':
        if request.method == 'PUT':
            character_definitions[:] = [e for e in character_definitions if e.get('code') != orig_code]
        character_definitions.append(entry)
        refresh_gacha_pool()
    else:
        if request.method == 'PUT':
            enemy_definitions[:] = [e for e in enemy_definitions if e.get('code') != orig_code]
        enemy_definitions.append(entry)
    return jsonify({'success': True})


@app.route('/api/admin/entities')
def admin_list_entities():
    if not session.get('logged_in') or not db.is_user_admin(session['user_id']):
        return jsonify({'success': False}), 403
    ent_type = request.args.get('type')
    if ent_type == 'character':
        return jsonify({'success': True, 'entities': character_definitions})
    elif ent_type == 'enemy':
        return jsonify({'success': True, 'entities': enemy_definitions})
    return jsonify({'success': False, 'message': 'Invalid type'}), 400


@app.route('/api/admin/expeditions')
def admin_list_expeditions():
    if not session.get('logged_in') or not db.is_user_admin(session['user_id']):
        return jsonify({'success': False}), 403
    return jsonify({'success': True, 'expeditions': db.get_all_expeditions()})


@app.route('/api/admin/items')
def admin_list_items():
    if not session.get('logged_in') or not db.is_user_admin(session['user_id']):
        return jsonify({'success': False}), 403
    return jsonify({'success': True, 'items': equipment_definitions})


@app.route('/api/admin/item', methods=['POST', 'PUT', 'DELETE'])
def admin_manage_item():
    if not session.get('logged_in') or not db.is_user_admin(session['user_id']):
        return jsonify({'success': False}), 403
    json_path = os.path.join(BASE_DIR, 'static', 'equipment.json')
    if request.method == 'DELETE':
        data = request.json or {}
        code = data.get('code')
        db.delete_item(json_path, code)
        equipment_definitions[:] = db.load_items(json_path)
        equipment_stats_map.clear()
        equipment_stats_map.update({i['name']: i['stat_bonuses'] for i in equipment_definitions})
        return jsonify({'success': True})

    data = request.form
    name = data.get('name', '').strip()
    item_type = data.get('type')
    rarity = data.get('rarity')
    stats = data.get('stats', '{}')
    try:
        stats_dict = json.loads(stats)
    except json.JSONDecodeError:
        return jsonify({'success': False, 'message': 'Invalid stats'}), 400
    file = request.files.get('image')
    filename = secure_filename(file.filename) if file else None
    image_dir = os.path.join(BASE_DIR, 'static', 'images', 'items')
    os.makedirs(image_dir, exist_ok=True)
    if file:
        file.save(os.path.join(image_dir, filename))
    entry = {
        'name': name,
        'type': item_type,
        'rarity': rarity,
        'stat_bonuses': stats_dict,
        'image_file': filename if file else None
    }
    if request.method == 'POST':
        db.add_item(json_path, entry)
    else:
        orig = data.get('orig_code', code)
        db.update_item(json_path, orig, entry)
    equipment_definitions[:] = db.load_items(json_path)
    equipment_stats_map.clear()
    equipment_stats_map.update({i['name']: i['stat_bonuses'] for i in equipment_definitions})
    return jsonify({'success': True})


@app.route('/api/admin/tower_level', methods=['POST', 'PUT', 'DELETE'])
def admin_manage_tower_level():
    if not session.get('logged_in') or not db.is_user_admin(session['user_id']):
        return jsonify({'success': False}), 403
    if request.method == 'DELETE':
        data = request.json or {}
        stage = int(data.get('stage', 0))
        db.delete_tower_level(stage)
        return jsonify({'success': True})

    data = request.json or {}
    stage = int(data.get('stage', 0))
    enemy_code = data.get('enemy_code')
    if not stage or not enemy_code:
        return jsonify({'success': False, 'message': 'Stage and enemy code required'}), 400
    db.set_tower_level(stage, enemy_code)
    return jsonify({'success': True})


@app.route('/api/admin/tower_levels')
def admin_list_tower_levels():
    if not session.get('logged_in') or not db.is_user_admin(session['user_id']):
        return jsonify({'success': False}), 403
    return jsonify({'success': True, 'levels': db.get_all_tower_levels()})


@app.route('/api/expeditions')
def list_expeditions():
    return jsonify({'success': True, 'expeditions': db.get_all_expeditions()})


@app.route('/api/summon', methods=['POST'])
def summon():
    if not session.get('logged_in'): return jsonify({'success': False, 'message': 'Not logged in'}), 401
    user_id = session['user_id']
    player_data = db.get_player_data(user_id)
    if player_data is None:
        session.clear()
        return jsonify({'success': False, 'message': 'Player data not found. Please log in again.'}), 401
    data = request.json or {}
    count = int(data.get('count', 1))
    free = data.get('free', False)

    now = int(time.time())
    free_last = player_data.get('free_last', 0)
    if free:
        if now - free_last < 86400:
            return jsonify({'success': False, 'message': 'Free summon not ready'})
        total_cost = 0
    else:
        total_cost = app.config['PULL_COST'] * count
        if player_data['gems'] < total_cost:
            return jsonify({'success': False, 'message': 'Not enough gems!'})

    pity = player_data.get('pity_counter', 0)
    characters = []
    for _ in range(count):
        pity += 1
        if pity >= app.config['SSR_PITY_THRESHOLD']:
            chosen_rarity = 'SSR'
            pity = 0
        else:
            rand = random.random()
            if rand < 0.5:
                chosen_rarity = 'Common'
            elif rand < 0.8:
                chosen_rarity = 'Rare'
            elif rand < 0.95:
                chosen_rarity = 'SSR'
            elif rand < 0.985:
                chosen_rarity = 'UR'
            else:
                chosen_rarity = 'LR'
            if chosen_rarity in ['SSR', 'UR', 'LR']:
                pity = 0
        summoned_char_def = random.choice(gacha_pool[chosen_rarity])
        db.add_character_to_player(user_id, summoned_char_def)
        characters.append(summoned_char_def)

    new_gems = player_data['gems'] - total_cost
    save_args = {'gems': new_gems, 'pity_counter': pity}
    if free:
        save_args['free_last'] = now
    db.save_player_data(user_id, **save_args)
    return jsonify({'success': True, 'characters': characters})


@app.route('/api/claim_gem_gift', methods=['POST'])
def claim_gem_gift():
    if not session.get('logged_in'):
        return jsonify({'success': False, 'message': 'Not logged in'}), 401
    user_id = session['user_id']
    player_data = db.get_player_data(user_id)
    now = int(time.time())
    last = player_data.get('gem_gift_last', 0)
    if now - last < 1800:
        return jsonify({'success': False, 'message': 'Gift not ready'})
    new_gems = player_data['gems'] + 50
    db.save_player_data(user_id, gems=new_gems, gem_gift_last=now)
    return jsonify({'success': True, 'gems': new_gems})


@app.route('/api/claim_platinum_gift', methods=['POST'])
def claim_platinum_gift():
    if not session.get('logged_in'):
        return jsonify({'success': False, 'message': 'Not logged in'}), 401
    user_id = session['user_id']
    player_data = db.get_player_data(user_id)
    now = int(time.time())
    last = player_data.get('platinum_last', 0)
    if now - last < 86400:
        return jsonify({'success': False, 'message': 'Gift not ready'})
    new_amt = player_data.get('premium_gems', 0) + 10
    db.save_player_data(user_id, premium_gems=new_amt, platinum_last=now)
    return jsonify({'success': True, 'platinum': new_amt})


@app.route('/api/stage_info/<int:stage_num>', methods=['GET'])
def get_stage_info(stage_num):
    if not session.get('logged_in'): return jsonify({'success': False, 'message': 'Not logged in'}), 401
    enemy = get_enemy_for_stage(stage_num)
    enemy_info = {
        'name': enemy['name'],
        'element': enemy.get('element', 'None'),
        'image_file': enemy['image'],
        'hp': enemy['stats']['hp'],
        'atk': enemy['stats']['atk']
    }
    energy_cost = 1
    player_data = db.get_player_data(session['user_id'])
    first_clear = stage_num == player_data.get('current_stage', 1)
    _, gold_reward = get_tower_rewards(stage_num, first_clear)
    return jsonify({'success': True, 'enemy': enemy_info, 'energy_cost': energy_cost, 'gold_reward': gold_reward})


# --- PILLAR 1: CAMPAIGN ---
@app.route('/api/fight', methods=['POST'])
def fight():
    if not session.get('logged_in'): return jsonify({'success': False, 'message': 'Not logged in'}), 401
    user_id = session['user_id']
    data = request.get_json(silent=True) or {}
    try:
        player_data = db.get_player_data(user_id)
        if player_data['energy'] <= 0:
            return jsonify({'success': False, 'message': 'Not enough energy.'})
        db.consume_energy(user_id)
        stage_num = int(data.get('stage', 1))
    except (TypeError, ValueError):
        return jsonify({'success': False, 'message': 'Invalid stage value.'}), 400
    try:
        team = db.get_player_team(user_id, character_definitions)
        if not any(team):
            return jsonify({'success': False, 'message': 'Your team is empty!'})
        enemy = get_enemy_for_stage(stage_num)

        if player_data is None:
            session.clear()
            return jsonify({'success': False, 'message': 'Player data not found. Please log in again.'}), 500

        stats = calculate_fight_stats(team, enemy)
        team_hp, enemy_hp = stats['team_hp'], stats['enemy_hp']

        enemy_image = enemy['image']
        combat_log = [{'type': 'start',
                       'message': f"Floor {stage_num}: Your team faces a {stats['enemy_element']} {enemy['name']}!",
                       'enemy_image': enemy_image,
                       'element': stats['enemy_element']}]

        available_attackers = [get_scaled_character_stats(c) for c in team if c]
        available_attackers = [a for a in available_attackers if a]
        available_attackers.sort(key=lambda h: h['atk'], reverse=True)
        attacker_index = 0
        while team_hp > 0 and enemy_hp > 0:
            attacker = available_attackers[attacker_index % len(available_attackers)]
            attacker_index += 1
            player_damage = attacker['atk'] * random.uniform(0.8, 1.2) * stats['team_elemental_multiplier']
            is_player_crit = random.random() * 100 < attacker['crit_chance']
            if is_player_crit:
                player_damage *= attacker['crit_damage']
            enemy_hp -= player_damage
            enemy_hp = round(enemy_hp, 2)
            combat_log.append({
                'type': 'player_attack',
                'crit': is_player_crit,
                'damage': int(player_damage),
                'enemy_hp': int(max(0, enemy_hp)),
                'element': attacker.get('element', 'None'),
                'attacker': attacker.get('name', 'Hero')
            })
            if enemy_hp <= 0:
                break

            enemy_damage = stats['enemy_atk'] * random.uniform(0.8, 1.2)
            is_enemy_crit = random.random() * 100 < stats['enemy_crit_chance']
            if is_enemy_crit:
                enemy_damage *= stats['enemy_crit_damage']
            team_hp -= enemy_damage
            team_hp = round(team_hp, 2)
            combat_log.append({'type': 'enemy_attack',
                               'crit': is_enemy_crit,
                               'damage': int(enemy_damage),
                               'team_hp': int(max(0, team_hp)),
                               'element': stats['enemy_element']})

        victory = team_hp > 0
        gems_won = 0
        gold_won = 0
        if victory:
            combat_log.append({'type': 'end', 'message': "--- VICTORY! ---"})
            player_data = db.get_player_data(user_id)
            first_clear = stage_num == player_data['current_stage']
            gems_won, gold_won = get_tower_rewards(stage_num, first_clear)
            next_stage = player_data['current_stage'] + 1 if first_clear else player_data['current_stage']
            db.save_player_data(
                user_id,
                gems=player_data['gems'] + gems_won,
                gold=player_data['gold'] + gold_won,
                current_stage=next_stage,
            )
        else:
            combat_log.append({'type': 'end', 'message': "--- DEFEAT! ---"})
        refresh_online_progress(user_id)
        return jsonify({'success': True, 'victory': victory, 'log': combat_log, 'gems_won': gems_won, 'gold_won': gold_won, 'looted_item': None})
    except Exception as e:
        print('Error during fight:', e)
        return jsonify({'success': False, 'message': 'Server error during fight.'}), 500


# --- PILLAR 2: DUNGEONS ---


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


@app.route('/api/level_up', methods=['POST'])
def level_up():
    if not session.get('logged_in'):
        return jsonify({'success': False}), 401
    user_id = session['user_id']
    char_id = request.json.get('char_id')
    success, result = db.level_up_character(user_id, char_id)
    if success:
        return jsonify({'success': True, 'new_level': result['new_level'], 'new_gold': result['new_gold']})
    else:
        return jsonify({'success': False, 'message': result})


@app.route('/api/sell_hero', methods=['POST'])
def sell_hero():
    if not session.get('logged_in'):
        return jsonify({'success': False}), 401
    user_id = session['user_id']
    char_id = request.json.get('char_id')
    success, result = db.sell_character(user_id, char_id)
    if success:
        return jsonify({'success': True, 'gold_received': result['gold_received'], 'new_gold': result['new_gold']})
    else:
        return jsonify({'success': False, 'message': result})


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
    if current_rarity not in app.config['MERGE_COST']: return jsonify({'success': False, 'message': 'This hero is at max rarity!'})
    cost = app.config['MERGE_COST'][current_rarity]
    if len(heroes_of_type) < cost: return jsonify(
        {'success': False, 'message': f'Not enough copies. Need {cost}, have {len(heroes_of_type)}.'})
    next_rarity_index = app.config['RARITY_ORDER'].index(current_rarity) + 1
    new_rarity = app.config['RARITY_ORDER'][next_rarity_index]
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
        progress = db.get_user_progress(username)
        online_users[request.sid] = {
            'username': username,
            'user_id': session.get('user_id'),
            'current_stage': progress.get('current_stage', 1),
            'dungeon_runs': progress.get('dungeon_runs', 0),
            'last_active': time.time()
        }
        emit_online_list()
        socketio.emit('chat_history', chat_history, room=request.sid)


@socketio.on('send_message')
def handle_send_message(data):
    if session.get('logged_in'):
        message = data.get('message', '').strip()
        update_last_active(session.get('user_id'))
        if message.lower() == '!profile':
            user_id = session.get('user_id')
            player_data = db.get_player_data(user_id)
            if player_data:
                profile_msg = (f"\U0001f4ac Profile for {session.get('username')}: "
                               f"\U0001f48e {player_data['gems']} Gems | "
                               f"\U0001f4b0 {player_data.get('gold', 0)} Gold")
                socketio.emit('receive_message',
                              {'username': 'System', 'message': profile_msg},
                              room=request.sid)
            return
        if 0 < len(message) <= 200:
            clean = filter_bad_words(message)
            add_chat_message(session.get('username'), clean)
            socketio.emit('receive_message',
                          {'username': session.get('username'), 'message': clean})


@socketio.on('disconnect')
def handle_disconnect():
    user_info = online_users.pop(request.sid, None)
    emit_online_list()


if __name__ == '__main__':
    socketio.run(app, debug=True, port=5000)