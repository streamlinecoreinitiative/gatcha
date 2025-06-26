import math
import random

balance_config = {
    'base_stats': {
        'hp': 40,
        'atk': 10,
        'def': 5,
    },
    'growth_factors': {
        'hp': 1.15,
        'atk': 1.12,
        'def': 1.10,
    },
    'archetypes': {
        'standard': { 'name': 'Standard', 'hp_mult': 1.0, 'atk_mult': 1.0, 'def_mult': 1.0 },
        'tank': { 'name': 'Tank', 'hp_mult': 1.8, 'atk_mult': 0.7, 'def_mult': 1.5 },
        'glass_cannon': { 'name': 'Glass Cannon', 'hp_mult': 0.6, 'atk_mult': 1.6, 'def_mult': 0.7 },
        'swift': { 'name': 'Swift', 'hp_mult': 0.8, 'atk_mult': 1.3, 'def_mult': 0.9 },
        'boss': { 'name': 'Boss', 'hp_mult': 3.0, 'atk_mult': 1.5, 'def_mult': 1.8 },
    },
    'item_base_power': 10,
    'item_growth_factor': 1.20,
}


def calculate_stats_for_level(level: int):
    base = balance_config['base_stats']
    growth = balance_config['growth_factors']
    hp = round(base['hp'] * math.pow(growth['hp'], level - 1))
    atk = round(base['atk'] * math.pow(growth['atk'], level - 1))
    defense = round(base['def'] * math.pow(growth['def'], level - 1))
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
