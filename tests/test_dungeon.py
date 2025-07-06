import json
import sys
import os
from unittest.mock import patch
import types

# Stub modules not installed in the test environment
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

request = types.SimpleNamespace(get_json=lambda silent=True: {}, form={}, args={})
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

import pytest

from app import fight_dungeon, character_definitions, enemy_definitions
import app as app_module
import database as db

def sample_team():
    return [character_definitions[0], character_definitions[1], None, None]

def sample_expedition():
    return {
        'id': 1,
        'levels': [
            {'level': 1, 'enemy': enemy_definitions[0]['code']},
            {'level': 2, 'enemy': enemy_definitions[1]['code']},
        ],
        'drops': None,
    }

@patch.object(db, 'get_player_team', side_effect=lambda uid, defs: sample_team())
@patch.object(db, 'get_player_data', return_value={'dungeon_energy':1,'gold':0,'gems':0,'current_stage':1,'dungeon_runs':0})
@patch.object(db, 'consume_dungeon_energy')
@patch.object(db, 'get_expedition', side_effect=lambda eid: sample_expedition())
@patch.object(db, 'increment_dungeon_runs')
@patch.object(db, 'save_player_data')
@patch.object(app_module, 'refresh_online_progress')
@patch('random.random', return_value=0.5)
def test_multi_level_expedition(mock_rand, mock_refresh, mock_save, mock_inc, mock_get_exp, mock_consume, mock_player_data, mock_team):
    app_module.request.get_json = lambda silent=True: {'expedition_id': 1}
    app_module.request.form = {}
    app_module.request.args = {}
    app_module.session.clear()
    app_module.session['logged_in'] = True
    app_module.session['user_id'] = 1
    resp = fight_dungeon()
    data = resp if isinstance(resp, dict) else resp[0]
    assert data['success'] is True
    assert data['victory'] is True
    starts = [e for e in data['log'] if e['type']=='start']
    assert len(starts) == 2
    summary = [e for e in data['log'] if e['type']=='summary']
    assert summary and 'Cleared 2/2 levels.' in summary[0]['message']
    assert data['gold_won'] == 200
