try:
    from flask import Blueprint, jsonify, request, session, render_template, current_app
except Exception:  # pragma: no cover - fallback for test stubs
    class Blueprint:
        def __init__(self, *a, **k):
            pass
        def route(self, *a, **k):
            def decorator(f):
                return f
            return decorator
    jsonify = lambda x: x
    class Req:
        def __init__(self):
            self.json = {}
            self.form = {}
            self.args = {}
        def get_json(self, silent=True):
            return self.json
    request = Req()
    session = {}
    render_template = lambda *a, **k: ''
    class Current:
        config = {}
    current_app = Current()
import random
import re
import secrets
import string
import database as db
from helpers import send_email


def _cfg():
    try:
        from flask import current_app as flask_current_app
        return flask_current_app.config
    except Exception:
        from app import app as main_app
        return main_app.config


def _session():
    try:
        from flask import session as flask_session
        return flask_session
    except Exception:
        from app import session as app_session
        return app_session


def _cfg():
    try:
        from flask import current_app as flask_current_app
        return flask_current_app.config
    except Exception:
        from app import app as main_app
        return main_app.config

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/tos')
def terms_of_service():
    """Display the Terms of Service page."""
    return render_template('tos.html')

@auth_bp.route('/api/register', methods=['POST'])
def register():
    data = request.json
    email = data.get('email', '')
    password = data.get('password', '')
    if not data.get('accepted_tos'):
        return jsonify({'success': False, 'message': 'Terms must be accepted'})
    if not re.match(r'^[^@\s]+@[^@\s]+\.[^@\s]+$', email):
        return jsonify({'success': False, 'message': 'Invalid email format'})
    if db.email_exists(email):
        return jsonify({'success': False, 'message': 'Email already registered'})
    if not re.match(r'^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{10,}$', password):
        return jsonify({'success': False, 'message': 'Password must be at least 10 characters with letters and numbers'})
    cfg = _cfg()
    available_images = [c.get('image_file') for c in cfg['CHARACTER_DEFINITIONS'] if c.get('image_file')]
    default_image = random.choice(available_images) if available_images else None
    result = db.register_user(data.get('username'), email, password, profile_image=default_image)
    if result == "Success":
        user_id = db.get_user_id(data.get('username'))
        token = secrets.token_urlsafe(16)
        cfg.setdefault('EMAIL_CONFIRMATIONS', {})[token] = user_id
        confirm_link = cfg['BASE_URL'].rstrip('/') + '/confirm_email/' + token
        username = data.get('username')
        send_email(
            email,
            "Confirm Your Registration",
            f"Hello {username},\n\nPlease confirm your account by visiting: {confirm_link}",
        )
        return jsonify({'success': True, 'message': 'Registration successful. A confirmation email was sent, but you can log in now.'})
    return jsonify({'success': False, 'message': result})

@auth_bp.route('/api/login', methods=['POST'])
def login():
    data = request.json
    username = data.get('username')
    password = data.get('password')
    user_id, confirmed = db.login_user(username, password)
    if user_id:
        sess = _session()
        sess['logged_in'] = True
        sess['username'] = username
        sess['user_id'] = user_id
        message = ''
        if not confirmed:
            message = 'Please confirm your email to unlock all features.'
        return jsonify({'success': True, 'message': message})
    else:
        return jsonify({'success': False, 'message': 'Invalid username or password.'})

@auth_bp.route('/api/logout', methods=['POST'])
def logout():
    _session().clear()
    return jsonify({'success': True})

@auth_bp.route('/api/forgot_password', methods=['POST'])
def forgot_password():
    data = request.json or {}
    email = data.get('email', '')
    if not re.match(r'^[^@\s]+@[^@\s]+\.[^@\s]+$', email):
        return jsonify({'success': False, 'message': 'Invalid email format'})
    if not db.email_exists(email):
        return jsonify({'success': False, 'message': 'Email not found'})
    new_password = ''.join(random.choices(string.ascii_letters + string.digits, k=10))
    token = db.create_password_reset(email, new_password)
    username = db.get_username_by_email(email) or ''
    cfg = _cfg()
    confirm_link = cfg['BASE_URL'].rstrip('/') + '/confirm_reset/' + token
    send_email(email, 'Confirm Password Reset', f'Hello {username},\n\nPlease confirm your reset by visiting: {confirm_link}')
    return jsonify({'success': True, 'message': 'Confirmation email sent'})

@auth_bp.route('/confirm_reset/<token>')
def confirm_reset(token):
    info = db.pop_password_reset(token)
    if not info:
        return 'Invalid or expired token.', 400
    email, new_password = info
    db.reset_password(email, new_password)
    username = db.get_username_by_email(email) or ''
    send_email(email, 'Your New Password', f'Hello {username},\n\nYour new password is: {new_password}')
    return 'Password reset. Check your email for the new password.'

@auth_bp.route('/confirm_email/<token>')
def confirm_email(token):
    info = db.pop_email_confirmation(token)
    if not info:
        return 'Invalid or expired token.', 400
    user_id = info['user_id']
    if not user_id:
        return 'Invalid or expired token.', 400
    db.update_user_profile(user_id, email_confirmed=True)
    return 'Email confirmed. You can now log in.'

@auth_bp.route('/api/update_profile', methods=['POST'])
def update_profile():
    if not _session().get('logged_in'):
        return jsonify({'success': False}), 401
    data = request.json or {}
    email = data.get('email')
    profile_image = data.get('profile_image')
    db.update_user_profile(_session()['user_id'], email=email, profile_image=profile_image)
    return jsonify({'success': True})

@auth_bp.route('/api/change_password', methods=['POST'])
def change_password():
    if not _session().get('logged_in'):
        return jsonify({'success': False}), 401
    data = request.json or {}
    current_password = data.get('current_password', '')
    new_password = data.get('new_password', '')
    confirm_password = data.get('confirm_password', '')
    if not current_password or not new_password or not confirm_password:
        return jsonify({'success': False, 'message': 'All password fields required'})
    if not db.verify_user_password(_session()['user_id'], current_password):
        return jsonify({'success': False, 'message': 'Current password incorrect'})
    if new_password != confirm_password:
        return jsonify({'success': False, 'message': 'Passwords do not match'})
    if not re.match(r'^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{10,}$', new_password):
        return jsonify({'success': False, 'message': 'Password must be at least 10 characters with letters and numbers'})
    db.update_user_profile(_session()['user_id'], password=new_password)
    return jsonify({'success': True})

@auth_bp.route('/api/delete_account', methods=['POST'])
def delete_account():
    if not _session().get('logged_in'):
        return jsonify({'success': False}), 401
    sess = _session()
    user_id = sess['user_id']
    db.delete_user(user_id)
    sess.clear()
    return jsonify({'success': True})

@auth_bp.route('/api/player_data', methods=['GET'])
def get_player_data():
    if not _session().get('logged_in'):
        return jsonify({'success': False}), 401
    sess = _session()
    user_id = sess['user_id']
    player_data = db.get_player_data(user_id)
    profile = db.get_user_profile(user_id)
    cfg = _cfg()
    player_team = db.get_player_team(user_id, cfg['CHARACTER_DEFINITIONS'])
    full_data = {
        'username': sess.get('username'),
        'gems': player_data['gems'],
        'premium_gems': player_data.get('premium_gems', 0),
        'energy': player_data.get('energy', 0),
        'dungeon_energy': player_data.get('dungeon_energy', 0),
        'gold': player_data.get('gold', 0),
        'pity_counter': player_data.get('pity_counter', 0),
        'current_stage': player_data['current_stage'],
        'dungeon_runs': player_data.get('dungeon_runs', 0),
        'team': player_team,
        'collection': player_data['collection'],
        'is_admin': profile.get('is_admin', 0),
        'profile_image': profile.get('profile_image'),
        'email': profile.get('email'),
        'user_id': user_id,
        'energy_last': player_data.get('energy_last'),
        'dungeon_last': player_data.get('dungeon_last'),
        'free_last': player_data.get('free_last'),
        'gem_gift_last': player_data.get('gem_gift_last'),
        'platinum_last': player_data.get('platinum_last'),
        'energy_cap': player_data.get('energy_cap', 10),
        'dungeon_cap': player_data.get('dungeon_cap', 5),
        'energy_regen': player_data.get('energy_regen', 300),
        'dungeon_regen': player_data.get('dungeon_regen', 900)
    }
    return jsonify({'success': True, 'data': full_data})

@auth_bp.route('/api/all_users')
def all_users():
    users = db.get_all_users_with_runs()
    return jsonify({'success': True, 'users': users})

@auth_bp.route('/api/top_player')
def top_player():
    player = db.get_top_player()
    return jsonify({'success': True, 'player': player})
