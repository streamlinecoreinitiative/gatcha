
import os

# It's recommended to load sensitive values from environment variables.
# For development, we can use default values.
SECRET_KEY = os.environ.get('SECRET_KEY', os.urandom(24))

# Gacha settings
PULL_COST = 150
SSR_PITY_THRESHOLD = 90
RARITY_ORDER = ["Common", "Rare", "SSR", "UR", "LR"]
ENEMY_RARITY_ORDER = ["Common", "Uncommon", "Rare", "Epic", "SSR", "UR", "LR"]
MERGE_COST = {"Common": 3, "Rare": 3, "SSR": 4, "UR": 5}
STAT_MULTIPLIER = {"Common": 1.0, "Rare": 1.3, "SSR": 1.8, "UR": 2.5, "LR": 3.5}

# Online presence
ONLINE_TIMEOUT = 300  # seconds

# Chat settings
CHAT_HISTORY_LIMIT = 50

# Store Packages
STORE_PACKAGES = [
    {"id": "pack_small", "amount": 100, "price": 0.99},
    {"id": "pack_medium", "amount": 550, "price": 4.99, "label": "Best Value"},
    {"id": "energy_tower", "energy": 5, "platinum_cost": 50},
    {"id": "energy_dungeon", "dungeon_energy": 5, "platinum_cost": 50}
]
