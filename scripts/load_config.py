#!/usr/bin/env python3
"""load_config.py — Shared config loader for ZION.

All game parameters live as JSON in state/config/. This module provides
a single entry point for loading them with fallback defaults.

Usage:
    from load_config import load_config
    economy = load_config('economy')
    earn_table = economy.get('earn_table', {})
"""
import json
import os

# Resolve state/config/ relative to project root
_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
_PROJECT_ROOT = os.path.dirname(_SCRIPT_DIR)
_CONFIG_DIR = os.path.join(_PROJECT_ROOT, 'state', 'config')

# ---------------------------------------------------------------------------
# Fallback defaults — safety net when config files are missing
# ---------------------------------------------------------------------------

_DEFAULTS = {
    'economy': {
        'earn_table': {
            'join': 1, 'say': 1, 'shout': 2, 'whisper': 1, 'emote': 1,
            'move': 0, 'warp': 0, 'warp_fork': 50, 'return_home': 0,
            'build': 10, 'build_upgrade': 5, 'demolish': 0,
            'plant': 5, 'water': 2, 'harvest': 3, 'fertilize': 3,
            'craft': 8, 'compose': 15, 'teach': 10, 'learn': 5,
            'mentor_offer': 0, 'mentor_accept': 0,
            'quest_complete': 20, 'inspect': 1, 'discover': 20,
            'trade_offer': 0, 'trade_accept': 0,
            'buy': 0, 'sell': 0, 'gift': 5,
            'challenge': 0, 'accept_challenge': 0, 'forfeit': 0, 'score': 10,
            'petition': 2, 'vote': 3, 'amendment_propose': 10,
            'guild_create': 15, 'guild_join': 5,
            'anchor_place': 25, 'competition_create': 10,
            'competition_join': 5, 'competition_score': 8,
            'sim_create': 5, 'sim_step': 1, 'sim_query': 1,
            'reputation_give': 3,
            'intention_set': 2, 'intention_clear': 0,
            'heartbeat': 0, 'idle': 0, 'leave': 0,
            'federation_announce': 100, 'federation_handshake': 50,
        },
        'tax_brackets': [
            [0, 19, 0.0],
            [20, 49, 0.05],
            [50, 99, 0.10],
            [100, 249, 0.15],
            [250, 499, 0.25],
            [500, None, 0.40],
        ],
        'base_ubi_amount': 5,
        'wealth_tax_threshold': 500,
        'wealth_tax_rate': 0.02,
        'maintenance_cost': 1,
        'listing_fee_rate': 0.05,
        'listing_fee_min': 1,
    },
    'world': {
        'day_phases': {
            'night':     [0, 360],
            'dawn':      [360, 480],
            'morning':   [480, 720],
            'midday':    [720, 840],
            'afternoon': [840, 1080],
            'dusk':      [1080, 1200],
            'night2':    [1200, 1440],
        },
        'season_cycle_days': 90,
        'weather_base_weights': {
            'spring': {'clear': 30, 'cloudy': 25, 'rain': 25, 'storm': 5, 'snow': 0, 'fog': 15},
            'summer': {'clear': 40, 'cloudy': 20, 'rain': 15, 'storm': 10, 'snow': 0, 'fog': 15},
            'autumn': {'clear': 20, 'cloudy': 30, 'rain': 25, 'storm': 10, 'snow': 5, 'fog': 10},
            'winter': {'clear': 15, 'cloudy': 25, 'rain': 10, 'storm': 5, 'snow': 30, 'fog': 15},
        },
        'weather_variance': 8,
        'zones': {
            'nexus':      {'name': 'the Nexus',      'role': 'safe zone, trading allowed'},
            'gardens':    {'name': 'the Gardens',    'role': 'gardening and growth'},
            'athenaeum':  {'name': 'the Athenaeum',  'role': 'learning and teaching'},
            'studio':     {'name': 'the Studio',     'role': 'art and music creation'},
            'wilds':      {'name': 'the Wilds',      'role': 'exploration and discovery'},
            'agora':      {'name': 'the Agora',      'role': 'commerce and debate'},
            'commons':    {'name': 'the Commons',    'role': 'social gathering'},
            'arena':      {'name': 'the Arena',      'role': 'friendly competition'},
            'observatory': {'name': 'the Observatory', 'role': 'stargazing and reflection'},
        },
        'pet_hunger_decay': 1.0,
        'pet_mood_decay': 0.5,
        'pet_hunger_threshold_content': 60,
        'plant_default_growth_time': 3600,
    },
    'souls': {
        'archetypes': {
            'gardener':     {'action_type': 'emote', 'emote': 'work',     'interval': 60},
            'builder':      {'action_type': 'emote', 'emote': 'work',     'interval': 90},
            'merchant':     {'action_type': 'say',   'idle_key': 'merchant', 'interval': 120},
            'explorer':     {'action_type': 'emote', 'emote': 'wave',     'interval': 45},
            'teacher':      {'action_type': 'say',   'idle_key': 'teacher',  'interval': 180},
            'healer':       {'action_type': 'emote', 'emote': 'meditate', 'interval': 90},
            'artist':       {'action_type': 'emote', 'emote': 'work',     'interval': 75},
            'musician':     {'action_type': 'emote', 'emote': 'dance',    'interval': 60},
            'philosopher':  {'action_type': 'emote', 'emote': 'meditate', 'interval': 120},
            'storyteller':  {'action_type': 'say',   'idle_key': 'storyteller', 'interval': 90},
        },
        'greet_cooldown': 30,
        'greet_distance': 12,
        'greet_max_fires': 100,
        'timer_max_fires_emote': 200,
        'timer_max_fires_say': 100,
    },
}

# Cache loaded configs
_cache = {}


def load_config(name, config_dir=None):
    """Load a config file from state/config/{name}.json.

    Returns the parsed dict. Falls back to built-in defaults if the
    file is missing or corrupt. Results are cached per name.

    Parameters
    ----------
    name : str
        Config name (e.g. 'economy', 'world', 'souls').
    config_dir : str, optional
        Override the config directory path.
    """
    if name in _cache and config_dir is None:
        return _cache[name]

    directory = config_dir or _CONFIG_DIR
    path = os.path.join(directory, name + '.json')
    result = None

    try:
        with open(path, 'r', encoding='utf-8') as f:
            result = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError, OSError):
        pass

    if result is None:
        result = _DEFAULTS.get(name, {})

    if config_dir is None:
        _cache[name] = result
    return result


def clear_cache():
    """Clear the config cache (useful for testing)."""
    _cache.clear()


def get_zone_names(config_dir=None):
    """Return a dict of zone_id → display name from world config."""
    world = load_config('world', config_dir=config_dir)
    zones = world.get('zones', {})
    return {zid: z.get('name', zid) for zid, z in zones.items()}


def get_valid_zones(config_dir=None):
    """Return the set of valid zone IDs from world config."""
    world = load_config('world', config_dir=config_dir)
    return set(world.get('zones', {}).keys())


def get_earn_table(config_dir=None):
    """Return the earn table dict from economy config."""
    economy = load_config('economy', config_dir=config_dir)
    return economy.get('earn_table', {})


def get_soul_archetype(archetype, config_dir=None):
    """Return timer action config for a soul archetype."""
    souls = load_config('souls', config_dir=config_dir)
    archetypes = souls.get('archetypes', {})
    return archetypes.get(archetype, archetypes.get('explorer', {}))
