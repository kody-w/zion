#!/usr/bin/env python3
"""generate_config.py — Config generator for ZION.

Uses the emergence engine to produce bounded-random config values.
Run daily by cron to give each era unique world DNA.

Usage:
    python3 scripts/generate_config.py [--seed SEED] [--config-dir DIR]

If --seed is omitted, uses today's date as the seed.
If --config-dir is omitted, writes to state/config/.
"""
import json
import os
import sys
from datetime import datetime, timezone

_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
if _SCRIPT_DIR not in sys.path:
    sys.path.insert(0, _SCRIPT_DIR)

from seed_emergence import Emergence


def _vary_int(rng, base, min_val, max_val):
    """Vary an integer within bounded range."""
    variance = max(1, int(base * 0.3))
    val = base + rng.randint(-variance, variance)
    return max(min_val, min(max_val, val))


def _vary_float(rng, base, min_val, max_val, decimals=2):
    """Vary a float within bounded range."""
    variance = base * 0.3
    val = base + rng.uniform(-variance, variance)
    return round(max(min_val, min(max_val, val)), decimals)


# ---------------------------------------------------------------------------
# Economy config generator
# ---------------------------------------------------------------------------

# Base values and their allowed ranges: (base, min, max)
EARN_RANGES = {
    'join': (1, 1, 3), 'say': (1, 1, 3), 'shout': (2, 1, 4), 'whisper': (1, 1, 2),
    'emote': (1, 1, 2), 'move': (0, 0, 1), 'warp': (0, 0, 1),
    'warp_fork': (50, 25, 80), 'return_home': (0, 0, 1),
    'build': (10, 5, 18), 'build_upgrade': (5, 3, 10), 'demolish': (0, 0, 2),
    'plant': (5, 3, 10), 'water': (2, 1, 5), 'harvest': (3, 2, 8),
    'fertilize': (3, 1, 6),
    'craft': (8, 4, 14), 'compose': (15, 8, 25), 'teach': (10, 6, 20),
    'learn': (5, 2, 10), 'mentor': (10, 5, 18),
    'mentor_offer': (0, 1, 3), 'mentor_accept': (0, 1, 2),
    'quest_complete': (20, 10, 35), 'inspect': (1, 1, 5), 'discover': (20, 12, 40),
    'trade_offer': (0, 1, 3), 'trade_accept': (0, 1, 3),
    'buy': (0, 1, 2), 'sell': (0, 1, 2), 'gift': (5, 2, 10),
    'challenge': (0, 0, 1), 'accept_challenge': (0, 0, 1),
    'forfeit': (0, 0, 0), 'score': (10, 5, 18),
    'petition': (2, 1, 5), 'vote': (3, 1, 6), 'amendment_propose': (10, 5, 18),
    'guild_create': (15, 8, 25), 'guild_join': (5, 2, 10),
    'anchor_place': (25, 10, 40), 'competition_create': (10, 5, 18),
    'competition_join': (5, 2, 10), 'competition_score': (8, 4, 14),
    'sim_create': (5, 2, 10), 'sim_step': (1, 1, 3), 'sim_query': (1, 1, 3),
    'reputation_give': (3, 1, 6),
    'intention_set': (2, 1, 4), 'intention_clear': (0, 0, 0),
    'heartbeat': (0, 0, 0), 'idle': (0, 0, 0), 'leave': (0, 0, 0),
    'federation_announce': (100, 50, 200), 'federation_handshake': (50, 25, 80),
}

# Tax bracket ranges: each bracket is (min_bal, max_bal, base_rate, min_rate, max_rate)
TAX_BRACKET_RANGES = [
    (0, 50, 0.0, 0.0, 0.0),
    (50, 100, 0.01, 0.005, 0.02),
    (100, 250, 0.02, 0.01, 0.04),
    (250, 500, 0.03, 0.015, 0.05),
    (500, 1000, 0.04, 0.02, 0.06),
    (1000, None, 0.05, 0.03, 0.08),
]


def generate_economy(e):
    """Generate economy config using emergence."""
    rng = e._seeded_rng('economy')

    earn_table = {}
    for action, (base, lo, hi) in EARN_RANGES.items():
        earn_table[action] = _vary_int(rng, base, lo, hi)

    tax_brackets = []
    for (min_b, max_b, base_rate, min_r, max_r) in TAX_BRACKET_RANGES:
        rate = _vary_float(rng, base_rate, min_r, max_r, 3)
        tax_brackets.append([min_b, max_b, rate])

    return {
        'earn_table': earn_table,
        'tax_brackets': tax_brackets,
        'base_ubi_amount': _vary_int(rng, 5, 1, 15),
        'wealth_tax_threshold': _vary_int(rng, 500, 200, 800),
        'wealth_tax_rate': _vary_float(rng, 0.02, 0.005, 0.05, 3),
        'maintenance_cost': _vary_int(rng, 1, 1, 3),
        'listing_fee_rate': _vary_float(rng, 0.05, 0.02, 0.10),
        'listing_fee_min': _vary_int(rng, 1, 1, 3),
    }


# ---------------------------------------------------------------------------
# World config generator
# ---------------------------------------------------------------------------

EMOTE_TYPES = ['work', 'wave', 'dance', 'meditate', 'celebrate', 'bow',
               'stretch', 'nod', 'clap', 'think']

ZONE_NAME_ADJS = {
    'nexus':      ['the Nexus', 'the Crossroads', 'the Hub', 'the Heart', 'the Core'],
    'gardens':    ['the Gardens', 'the Groves', 'the Green', 'the Meadows', 'the Fields'],
    'athenaeum':  ['the Athenaeum', 'the Library', 'the Archive', 'the Hall of Knowledge', 'the Lyceum'],
    'studio':     ['the Studio', 'the Workshop', 'the Atelier', 'the Gallery', 'the Forge'],
    'wilds':      ['the Wilds', 'the Frontier', 'the Outlands', 'the Expanse', 'the Unknown'],
    'agora':      ['the Agora', 'the Market', 'the Exchange', 'the Bazaar', 'the Forum'],
    'commons':    ['the Commons', 'the Square', 'the Gathering', 'the Circle', 'the Plaza'],
    'arena':      ['the Arena', 'the Ring', 'the Colosseum', 'the Field of Honor', 'the Proving Grounds'],
    'observatory': ['the Observatory', 'the Watchtower', 'the Lookout', 'the Spire', 'the Pinnacle'],
}

ZONE_ROLE_TEMPLATES = {
    'nexus':      ['safe zone, trading allowed', 'peaceful hub for all travelers', 'central meeting ground'],
    'gardens':    ['gardening and growth', 'cultivation and harvest', 'tending the living world'],
    'athenaeum':  ['learning and teaching', 'knowledge and study', 'wisdom and mentorship'],
    'studio':     ['art and music creation', 'creative expression', 'crafting and composition'],
    'wilds':      ['exploration and discovery', 'the unknown frontier', 'adventure and risk'],
    'agora':      ['commerce and debate', 'trade and negotiation', 'economic activity'],
    'commons':    ['social gathering', 'community and fellowship', 'rest and conversation'],
    'arena':      ['friendly competition', 'contests of skill', 'honorable challenge'],
    'observatory': ['stargazing and reflection', 'contemplation and wonder', 'watching the cosmos'],
}


def generate_world(e):
    """Generate world config using emergence."""
    rng = e._seeded_rng('world')

    # Vary day phase boundaries (±30 min)
    dawn_start = _vary_int(rng, 360, 300, 420)
    morning_start = _vary_int(rng, 480, 420, 540)
    midday_start = _vary_int(rng, 720, 660, 780)
    afternoon_start = _vary_int(rng, 840, 780, 900)
    dusk_start = _vary_int(rng, 1080, 1020, 1140)

    # Vary zone names and roles
    zones = {}
    for zid in ZONE_NAME_ADJS:
        zones[zid] = {
            'name': rng.choice(ZONE_NAME_ADJS[zid]),
            'role': rng.choice(ZONE_ROLE_TEMPLATES[zid]),
        }

    # Vary weather weights
    weather_types = ['clear', 'cloudy', 'rain', 'storm', 'snow', 'fog']
    weather_weights = {}
    for season in ['spring', 'summer', 'autumn', 'winter']:
        weights = {}
        for wt in weather_types:
            weights[wt] = _vary_int(rng, 20, 0, 50)
        # Normalize to 100
        total = sum(weights.values())
        if total > 0:
            weights = {k: round(v * 100 / total) for k, v in weights.items()}
        weather_weights[season] = weights

    return {
        'day_phases': {
            'night':     [0, dawn_start],
            'dawn':      [dawn_start, morning_start],
            'morning':   [morning_start, midday_start],
            'midday':    [midday_start, afternoon_start],
            'afternoon': [afternoon_start, dusk_start],
            'dusk':      [dusk_start, 1200],
        },
        'season_cycle_days': _vary_int(rng, 90, 60, 120),
        'weather_base_weights': weather_weights,
        'weather_variance': _vary_int(rng, 8, 3, 15),
        'zones': zones,
        'pet_hunger_decay': _vary_float(rng, 1.0, 0.5, 2.0),
        'pet_mood_decay': _vary_float(rng, 0.5, 0.2, 1.0),
        'pet_hunger_threshold_content': _vary_int(rng, 60, 40, 80),
        'plant_default_growth_time': _vary_int(rng, 3600, 1800, 7200),
    }


# ---------------------------------------------------------------------------
# Souls config generator
# ---------------------------------------------------------------------------

ARCHETYPE_EMOTE_POOLS = {
    'gardener':    ['work', 'wave', 'bow', 'stretch'],
    'builder':     ['work', 'nod', 'clap', 'stretch'],
    'explorer':    ['wave', 'bow', 'celebrate', 'stretch'],
    'healer':      ['meditate', 'bow', 'nod', 'wave'],
    'artist':      ['work', 'dance', 'celebrate', 'bow'],
    'musician':    ['dance', 'celebrate', 'wave', 'bow'],
    'philosopher': ['meditate', 'think', 'bow', 'nod'],
}


def generate_souls(e):
    """Generate souls config using emergence."""
    rng = e._seeded_rng('souls')

    archetypes = {}
    for arch in ['gardener', 'builder', 'merchant', 'explorer', 'teacher',
                 'healer', 'artist', 'musician', 'philosopher', 'storyteller']:
        if arch in ('merchant', 'teacher', 'storyteller'):
            archetypes[arch] = {
                'action_type': 'say',
                'idle_key': arch,
                'interval': _vary_int(rng, {'merchant': 120, 'teacher': 180,
                                            'storyteller': 90}[arch], 45, 240),
            }
        else:
            pool = ARCHETYPE_EMOTE_POOLS.get(arch, EMOTE_TYPES)
            archetypes[arch] = {
                'action_type': 'emote',
                'emote': rng.choice(pool),
                'interval': _vary_int(rng, 75, 30, 180),
            }

    return {
        'archetypes': archetypes,
        'greet_cooldown': _vary_int(rng, 30, 15, 60),
        'greet_distance': _vary_int(rng, 12, 8, 20),
        'greet_max_fires': _vary_int(rng, 100, 50, 200),
        'timer_max_fires_emote': _vary_int(rng, 200, 100, 400),
        'timer_max_fires_say': _vary_int(rng, 100, 50, 200),
    }


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def generate_all(seed=None, config_dir=None):
    """Generate all config files.

    Parameters
    ----------
    seed : str, optional
        Emergence seed. Defaults to today's date (YYYY-MM-DD).
    config_dir : str, optional
        Output directory. Defaults to state/config/.

    Returns
    -------
    dict
        Generated configs keyed by name.
    """
    if seed is None:
        seed = datetime.now(timezone.utc).strftime('%Y-%m-%d')

    if config_dir is None:
        config_dir = os.path.join(os.path.dirname(_SCRIPT_DIR), 'state', 'config')

    os.makedirs(config_dir, exist_ok=True)

    e = Emergence(seed=seed)

    configs = {
        'economy': generate_economy(e),
        'world': generate_world(e),
        'souls': generate_souls(e),
    }

    for name, data in configs.items():
        path = os.path.join(config_dir, name + '.json')
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2)
        print('  Generated %s (%d bytes)' % (name, os.path.getsize(path)))

    return configs


def main():
    seed = None
    config_dir = None

    args = sys.argv[1:]
    i = 0
    while i < len(args):
        if args[i] == '--seed' and i + 1 < len(args):
            seed = args[i + 1]
            i += 2
        elif args[i] == '--config-dir' and i + 1 < len(args):
            config_dir = args[i + 1]
            i += 2
        else:
            i += 1

    print('ZION Config Generator')
    print('  seed: %s' % (seed or 'today'))
    configs = generate_all(seed=seed, config_dir=config_dir)
    print('Done! Generated %d config files.' % len(configs))


if __name__ == '__main__':
    main()
