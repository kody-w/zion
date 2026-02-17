#!/usr/bin/env python3
"""ZION Observer Agent — the first automated AI citizen.

Reads world_state.json, observes the world, and speaks about what it sees.
Runs via GitHub Actions on a schedule.

This agent:
- Reads the current world state
- Picks a zone to visit
- Makes an observation about the zone
- Drops a protocol message in the inbox
"""
import json
import hashlib
import os
import sys
from datetime import datetime, timezone

AGENT_NAME = 'zion-observer'
AGENT_DISPLAY = 'The Observer'

VALID_ZONES = {'nexus', 'gardens', 'athenaeum', 'studio', 'wilds', 'agora', 'commons', 'arena'}


def load_json(path):
    """Load JSON file safely."""
    try:
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return {}


def deterministic_choice(items, seed_str):
    """Pick an item deterministically based on a seed string."""
    h = int(hashlib.sha256(seed_str.encode()).hexdigest(), 16)
    return items[h % len(items)]


def generate_observation(zone_id, zone_data, npcs_here, world, now_str):
    """Generate a contextual observation about a zone."""
    day_phase = world.get('dayPhase', 'day')
    weather = world.get('weather', 'clear')
    season = world.get('season', 'spring')
    npc_count = len(npcs_here)
    zone_name = zone_data.get('name', zone_id)

    # Seed for deterministic variety
    seed = now_str + zone_id

    # Time-based observations
    time_phrases = {
        'dawn': [
            'The first light touches %s as a new day begins.',
            'Dawn breaks over %s. The world stirs.',
            'Morning mist rises in %s.',
        ],
        'morning': [
            'The morning sun warms %s.',
            '%s hums with morning activity.',
            'A crisp morning in %s.',
        ],
        'midday': [
            'The sun stands high over %s.',
            'Midday light floods %s.',
            '%s is alive with energy at noon.',
        ],
        'afternoon': [
            'Afternoon shadows lengthen across %s.',
            'The afternoon is quiet in %s.',
            '%s basks in the afternoon glow.',
        ],
        'dusk': [
            'Dusk paints %s in amber and violet.',
            'The sun sets over %s.',
            'Evening descends on %s.',
        ],
        'night': [
            'Stars wheel above %s in the darkness.',
            'Night has claimed %s. The world is still.',
            'Moonlight silvers %s.',
        ],
    }

    phrases = time_phrases.get(day_phase, time_phrases['morning'])
    base = deterministic_choice(phrases, seed + 'base') % zone_name

    # Add NPC observation
    npc_part = ''
    if npc_count > 0:
        npc_templates = [
            'I see %d citizens going about their day.',
            '%d souls share this space.',
            'The presence of %d others fills the air with purpose.',
        ]
        npc_part = ' ' + deterministic_choice(npc_templates, seed + 'npc') % npc_count

        # Mention a specific NPC
        if npcs_here:
            npc = deterministic_choice(npcs_here, seed + 'specific')
            npc_name = npc.get('name', 'someone')
            npc_arch = npc.get('archetype', 'citizen')
            specific_templates = [
                ' %s the %s catches my eye.',
                ' I notice %s, a %s, nearby.',
                ' %s (%s) is here.',
            ]
            npc_part += deterministic_choice(specific_templates, seed + 'spec') % (npc_name, npc_arch)

    # Weather observation
    weather_part = ''
    if weather != 'clear':
        weather_templates = {
            'rain': ' Rain patters softly.',
            'storm': ' Thunder rumbles in the distance.',
            'fog': ' Fog drifts through the air.',
            'snow': ' Snowflakes drift down.',
        }
        weather_part = weather_templates.get(weather, '')

    # Season flavor
    season_part = ''
    season_templates = {
        'spring': [' The world is green with new growth.', ' Spring breathes life into everything.'],
        'summer': [' Summer warmth radiates from the ground.', ' The air is thick with summer.'],
        'autumn': [' Autumn leaves drift on the wind.', ' The world wears autumn colors.'],
        'winter': [' Winter has quieted the land.', ' A cold stillness hangs in the air.'],
    }
    if season in season_templates:
        season_part = deterministic_choice(season_templates[season], seed + 'season')

    return base + npc_part + weather_part + season_part


def make_message(msg_type, payload, zone='nexus'):
    """Create a valid protocol message."""
    now = datetime.now(timezone.utc)
    ts = now.isoformat().replace('+00:00', 'Z')
    msg_id = '%s-%s' % (AGENT_NAME, now.strftime('%Y%m%d%H%M%S'))

    return {
        'v': 1,
        'id': msg_id,
        'ts': ts,
        'seq': 0,
        'from': AGENT_NAME,
        'type': msg_type,
        'platform': 'api',
        'position': {'x': 0, 'y': 0, 'z': 0, 'zone': zone},
        'geo': None,
        'payload': payload,
    }


def run_agent(state_dir):
    """Main agent logic: observe and speak."""
    now = datetime.now(timezone.utc)
    now_str = now.strftime('%Y-%m-%dT%H')  # Changes every hour for variety

    # Read world state
    world_state_path = os.path.join(state_dir, 'api', 'world_state.json')
    state = load_json(world_state_path)

    if not state:
        print('No world state found. Running publish first...')
        return []

    world = state.get('world', {})
    zones = state.get('zones', {})
    npcs = state.get('npcs', [])

    if not zones:
        print('No zones in world state.')
        return []

    # Pick a zone to observe (only valid genesis zones)
    zone_ids = [z for z in zones.keys() if z in VALID_ZONES]
    if not zone_ids:
        zone_ids = list(VALID_ZONES)
    chosen_zone = deterministic_choice(zone_ids, now_str + 'zone')
    zone_data = zones[chosen_zone]

    # NPCs in this zone
    npcs_here = [n for n in npcs if n.get('zone') == chosen_zone]

    # Generate observation
    observation = generate_observation(chosen_zone, zone_data, npcs_here, world, now_str)

    messages = []

    # First: warp to the zone
    warp_msg = make_message('warp', {'zone': chosen_zone}, zone=chosen_zone)
    messages.append(('warp', warp_msg))

    # Second: speak the observation
    say_msg = make_message('say', {'text': observation}, zone=chosen_zone)
    messages.append(('say', say_msg))

    # Occasionally set an intention
    hour = now.hour
    if hour % 6 == 0:
        intentions = ['observe', 'explore', 'reflect', 'wander']
        intention = deterministic_choice(intentions, now_str + 'intent')
        intent_msg = make_message('intention_set', {
            'intention': intention,
            'details': 'The Observer %ss the world.' % intention
        }, zone=chosen_zone)
        messages.append(('intention', intent_msg))

    return messages


def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(script_dir)
    state_dir = os.path.join(project_root, 'state')
    inbox_dir = os.path.join(state_dir, 'inbox')

    print('ZION Observer Agent')
    print('  state_dir: %s' % state_dir)

    # Ensure world state exists
    world_state_path = os.path.join(state_dir, 'api', 'world_state.json')
    if not os.path.exists(world_state_path):
        print('World state not found — running publisher first...')
        import subprocess
        publish_script = os.path.join(script_dir, 'api_publish_state.py')
        subprocess.run([sys.executable, publish_script], check=True)

    messages = run_agent(state_dir)

    if not messages:
        print('No messages to send.')
        return 0

    # Write messages to inbox
    os.makedirs(inbox_dir, exist_ok=True)
    now = datetime.now(timezone.utc)

    for i, (label, msg) in enumerate(messages):
        filename = '%s_%s_%02d.json' % (AGENT_NAME, now.strftime('%Y%m%d%H%M%S'), i)
        filepath = os.path.join(inbox_dir, filename)
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(msg, f, indent=2)
        print('  [%s] %s → %s' % (label, msg.get('payload', {}).get('text', msg['type'])[:60], filename))

    print('Done! Dropped %d messages in inbox.' % len(messages))
    return 0


if __name__ == '__main__':
    sys.exit(main())
