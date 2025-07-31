import os
import sys
import types

# Stub werkzeug security for environments without the library
sys.modules['werkzeug.security'] = types.SimpleNamespace(
    generate_password_hash=lambda p: p,
    check_password_hash=lambda s, p: s == p,
)

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import database as db


def test_default_expeditions_created(tmp_path, monkeypatch):
    monkeypatch.setattr(db, 'DATABASE_NAME', str(tmp_path / 'expeditions.db'), raising=False)
    monkeypatch.setattr(db, 'USING_POSTGRES', False, raising=False)
    db.init_db()
    exps = db.get_all_expeditions()
    names = [e['name'] for e in exps]
    assert len(exps) == 15
    assert names[0] == 'Goblin Raid'
    assert names[-1] == 'Astral Chaos'
