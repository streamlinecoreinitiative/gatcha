import math
import random

balance_config = {
    'base_stats': {
        'hp': 40,
        'atk': 10,
        'def': 5,
    },
    # Scaling parameters combine a polynomial exponent with a mild exponential
    # growth factor. This keeps early floors approachable while allowing the
    # tower to scale indefinitely without becoming absurdly difficult.
    'level_curve': {
        'hp_exp': 0.8,
        'atk_exp': 0.75,
        'def_exp': 0.7,
        'hp_growth': 1.028,
        'atk_growth': 1.027,
        'def_growth': 1.025,
    },
    'archetypes': {
        'standard': { 'name': 'Standard', 'hp_mult': 1.0, 'atk_mult': 1.0, 'def_mult': 1.0 },
        'tank': { 'name': 'Tank', 'hp_mult': 1.8, 'atk_mult': 0.7, 'def_mult': 1.5 },
        'glass_cannon': { 'name': 'Glass Cannon', 'hp_mult': 0.6, 'atk_mult': 1.6, 'def_mult': 0.7 },
        'swift': { 'name': 'Swift', 'hp_mult': 0.8, 'atk_mult': 1.3, 'def_mult': 0.9 },
        'healer': { 'name': 'Healer', 'hp_mult': 1.0, 'atk_mult': 0.8, 'def_mult': 1.2 },
        'support': { 'name': 'Support', 'hp_mult': 1.2, 'atk_mult': 0.8, 'def_mult': 1.0 },
        'boss': { 'name': 'Boss', 'hp_mult': 3.0, 'atk_mult': 1.5, 'def_mult': 1.8 },
    },
    'item_base_power': 10,
    'item_growth_factor': 1.20,
}


def calculate_stats_for_level(level: int):
    """Return base enemy stats scaled by level."""
    base = balance_config['base_stats']
    curve = balance_config['level_curve']
    hp = round(base['hp'] * math.pow(level, curve['hp_exp']) * math.pow(curve['hp_growth'], level))
    atk = round(base['atk'] * math.pow(level, curve['atk_exp']) * math.pow(curve['atk_growth'], level))
    defense = round(base['def'] * math.pow(level, curve['def_exp']) * math.pow(curve['def_growth'], level))
    return {'hp': hp, 'atk': atk, 'def': defense}


def generate_enemy(level: int, archetype_key: str, concept: dict):
    base_stats = calculate_stats_for_level(level)
    archetype = balance_config['archetypes'].get(archetype_key)
    if not archetype:
        raise ValueError(f"Invalid archetype key: {archetype_key}")
    stats = {
        'hp': round(base_stats['hp'] * archetype['hp_mult']),
        'atk': round(base_stats['atk'] * archetype['atk_mult']),
        'def': round(base_stats['def'] * archetype['def_mult']),
    }
    stats['hp'] = round(stats['hp'] * (1 + (random.random() - 0.5) * 0.1))
    return {
        'name': f"{concept['name']} ({archetype['name']})",
        'image': f"enemies/{concept.get('image_file', 'placeholder_enemy.png')}",
        'level': level,
        'element': concept.get('element', 'None'),
        'stats': stats,
        'crit_chance': concept.get('crit_chance', 0),
        'crit_damage': concept.get('crit_damage', 1.5),
    }


def calculate_item_power(item_level: int):
    base = balance_config['item_base_power']
    growth = balance_config['item_growth_factor']
    return round(base * math.pow(growth, item_level - 1))
