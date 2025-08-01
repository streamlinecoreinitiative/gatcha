import os
import sys
import types
from unittest.mock import patch

# Stub missing modules as in other tests
sys.modules['eventlet'] = types.SimpleNamespace(monkey_patch=lambda: None)
class DummySocketIO:
    def __init__(self, app):
        pass
    def emit(self, *a, **k):
        pass
    def on(self, *a, **k):
        def decorator(f):
            return f
        return decorator
sys.modules['flask_socketio'] = types.SimpleNamespace(SocketIO=DummySocketIO, emit=lambda *a, **k: None)
sys.modules['paypalrestsdk'] = types.SimpleNamespace(configure=lambda *a, **k: None)

class DummyFlask:
    def __init__(self, *a, **k):
        self.config = {}
    def route(self, *a, **k):
        def decorator(f):
            return f
        return decorator

def jsonify(obj):
    return obj

request = types.SimpleNamespace(get_json=lambda silent=True: {'stage': 1}, form={}, args={})
session = {}

def render_template(*a, **k):
    return ''

sys.modules['flask'] = types.SimpleNamespace(
    Flask=DummyFlask,
    jsonify=jsonify,
    render_template=render_template,
    request=request,
    session=session,
)
sys.modules['werkzeug.security'] = types.SimpleNamespace(
    generate_password_hash=lambda p: p,
    check_password_hash=lambda s, p: s == p,
)
sys.modules['werkzeug.utils'] = types.SimpleNamespace(secure_filename=lambda x: x)

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import app as app_module
import database as db

# Ensure a simple enemy that defeats the team immediately
@patch.object(app_module, 'get_enemy_for_stage', return_value={'name':'Goblin','image':'foo','stats':{'hp':1,'atk':1000}})
@patch.object(app_module, 'get_scaled_character_stats', return_value={'name':'Hero','element':'None','atk':1,'crit_chance':0,'crit_damage':1})
@patch.object(app_module, 'calculate_fight_stats', return_value={
    'team_hp': 10,
    'team_atk': 1,
    'team_crit_chance': 0,
    'team_crit_damage': 1,
    'team_elemental_multiplier': 1,
    'enemy_hp': 10,
    'enemy_atk': 1000,
    'enemy_crit_chance': 0,
    'enemy_crit_damage': 1,
    'enemy_element': 'None'
})
@patch.object(db, 'get_player_team', return_value=[{'base_hp':1,'base_atk':1,'rarity':'Common'}])
@patch.object(db, 'get_player_data', return_value={'energy':1,'gems':0,'gold':0,'current_stage':1})
@patch.object(db, 'consume_energy')
@patch.object(app_module, 'refresh_online_progress')
@patch('random.random', return_value=0.5)
def test_energy_spent_on_defeat(mock_rand, mock_refresh, mock_consume, mock_player, mock_team, mock_calc, mock_scaled, mock_enemy):
    app_module.session.clear()
    app_module.session['logged_in'] = True
    app_module.session['user_id'] = 1
    resp = app_module.fight()
    data = resp if isinstance(resp, dict) else resp[0]
    assert data['success'] is True
    assert data['victory'] is False
    assert mock_consume.called
