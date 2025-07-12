try:
    from flask import Blueprint, jsonify, request, session, current_app
except Exception:  # pragma: no cover - fallback for test stubs
    class Blueprint:
        def __init__(self, *a, **k):
            pass
        def route(self, *a, **k):
            def decorator(f):
                return f
            return decorator
    jsonify = lambda x: x
    request = type('r', (), {'json': {}, 'form': {}, 'args': {}})()
    session = {}
    class Current:
        config = {}
    current_app = Current()
import os
import json
import database as db


def _cfg():
    try:
        from flask import current_app as flask_current_app
        return flask_current_app.config
    except Exception:
        from app import app as main_app
        return main_app.config

admin_bp = Blueprint('admin', __name__)

@admin_bp.route('/api/admin/user_action', methods=['POST'])
def admin_user_action():
    if not session.get('logged_in'):
        return jsonify({'success': False}), 401
    if not db.is_user_admin(session['user_id']):
        return jsonify({'success': False, 'message': 'Not authorized'}), 403
    data = request.json or {}
    username = data.get('username')
    action = data.get('action')
    target_id = db.get_user_id(username) if username else None
    cfg = _cfg()
    equipment_definitions = cfg['EQUIPMENT_DEFINITIONS']
    character_definitions = cfg['CHARACTER_DEFINITIONS']
    if action == 'ban' or action == 'unban':
        if not username:
            return jsonify({'success': False, 'message': 'Username is required for ban/unban'}), 400
        db.ban_user(target_id, True if action == 'ban' else False)
    elif action == 'grant':
        if not username:
            return jsonify({'success': False, 'message': 'Username is required for grant'}), 400
        gems = data.get('gems')
        energy = data.get('energy')
        premium_gems = data.get('platinum')
        gold = data.get('gold')
        if not any([gems, energy, premium_gems, gold]):
            return jsonify({'success': False, 'message': 'At least one resource (gems, energy, platinum, gold) must be provided for grant'}), 400
        db.adjust_resources(target_id, gems=gems, energy=energy, premium_gems=premium_gems, gold=gold)
    elif action == 'grant_all':
        gems = data.get('gems')
        energy = data.get('energy')
        premium_gems = data.get('platinum')
        gold = data.get('gold')
        if not any([gems, energy, premium_gems, gold]):
            return jsonify({'success': False, 'message': 'At least one resource (gems, energy, platinum, gold) must be provided for grant_all'}), 400
        for uid in db.get_all_user_ids():
            db.adjust_resources(uid, gems=gems, energy=energy, premium_gems=premium_gems, gold=gold)
    elif action == 'give_item':
        if not username:
            return jsonify({'success': False, 'message': 'Username is required for give_item'}), 400
        item_code = data.get('item_code')
        if not item_code:
            return jsonify({'success': False, 'message': 'Item code is required for give_item'}), 400
        item_def = next((i for i in equipment_definitions if i.get('code') == item_code or i['name'] == item_code), None)
        if not item_def:
            return jsonify({'success': False, 'message': 'Item not found'}), 404
        db.give_equipment_to_player(target_id, item_def)
    elif action == 'give_item_all':
        item_code = data.get('item_code')
        if not item_code:
            return jsonify({'success': False, 'message': 'Item code is required for give_item_all'}), 400
        item_def = next((i for i in equipment_definitions if i.get('code') == item_code or i['name'] == item_code), None)
        if not item_def:
            return jsonify({'success': False, 'message': 'Item not found'}), 404
        for uid in db.get_all_user_ids():
            db.give_equipment_to_player(uid, item_def)
    elif action == 'add_hero':
        if not username:
            return jsonify({'success': False, 'message': 'Username is required for add_hero'}), 400
        char_name = data.get('character_name')
        if not char_name:
            return jsonify({'success': False, 'message': 'Character name is required for add_hero'}), 400
        char_def = next((c for c in character_definitions if c['name'] == char_name), None)
        if not char_def:
            return jsonify({'success': False, 'message': 'Character not found'}), 404
        db.add_character_to_player(target_id, char_def)
    elif action == 'remove_hero':
        if not username:
            return jsonify({'success': False, 'message': 'Username is required for remove_hero'}), 400
        char_id = data.get('character_id')
        if not char_id:
            return jsonify({'success': False, 'message': 'Character ID is required for remove_hero'}), 400
        db.remove_character(target_id, char_id)
    else:
        return jsonify({'success': False, 'message': 'Invalid action'}), 400
    return jsonify({'success': True})
