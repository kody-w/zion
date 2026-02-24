#!/usr/bin/env python3
"""Agent activation: generate autonomous agent actions."""
import json
import os
import sys
import random
import time
from datetime import datetime

# Lazy-loaded emergence engine
_emergence = None

def _get_emergence():
    global _emergence
    if _emergence is None:
        from seed_emergence import Emergence
        _emergence = Emergence()
    return _emergence


def _get_valid_zones():
    """Get valid zone IDs from config."""
    try:
        from load_config import get_valid_zones
        return sorted(get_valid_zones())
    except Exception:
        return ['nexus', 'gardens', 'athenaeum', 'studio', 'wilds',
                'agora', 'commons', 'arena', 'observatory']


def generate_agent_intentions(agent, count=2, inject_join=False):
    """
    Generate intention messages for an agent based on their archetype.

    Args:
        agent: agent dict with archetype, intentions, position
        count: number of intentions to generate (1-3)
        inject_join: if True, prepend a join message

    Returns:
        List of protocol messages
    """
    messages = []
    intention_types = agent.get('intentions', ['say', 'move', 'inspect'])
    # Ensure every agent can speak and travel occasionally
    if 'say' not in intention_types:
        intention_types = intention_types + ['say']
    if 'warp' not in intention_types:
        intention_types = intention_types + ['warp']

    if inject_join:
        join_msg = {
            'v': 1,
            'id': f"{agent['id']}_{int(time.time() * 1000)}_join",
            'ts': datetime.utcnow().isoformat() + 'Z',
            'seq': 0,
            'from': agent['id'],
            'type': 'join',
            'platform': 'api',
            'position': agent.get('position', {
                'x': 0, 'y': 0, 'z': 0, 'zone': 'nexus'
            }),
            'payload': {'archetype': agent.get('archetype', 'citizen')},
        }
        messages.append(join_msg)

    for i in range(min(count, len(intention_types))):
        intention_type = random.choice(intention_types)

        # Generate message ID
        msg_id = f"{agent['id']}_{int(time.time() * 1000)}_{i}"
        timestamp = datetime.utcnow().isoformat() + 'Z'

        # Base message structure
        message = {
            'v': 1,
            'id': msg_id,
            'ts': timestamp,
            'seq': i,
            'from': agent['id'],
            'type': intention_type,
            'platform': 'api',
            'position': agent.get('position', {
                'x': 0,
                'y': 0,
                'z': 0,
                'zone': 'nexus'
            }),
            'payload': {}
        }

        # Add type-specific payload
        if intention_type == 'say':
            archetype = agent.get('archetype', 'citizen')
            e = _get_emergence()
            message['payload']['text'] = e.agent_speak(archetype)

        elif intention_type == 'move':
            # Random movement within zone
            current_pos = agent.get('position', {'x': 0, 'y': 0, 'z': 0})
            message['payload']['destination'] = {
                'x': current_pos.get('x', 0) + random.uniform(-5, 5),
                'y': current_pos.get('y', 0),
                'z': current_pos.get('z', 0) + random.uniform(-5, 5),
                'zone': current_pos.get('zone', 'nexus')
            }

        elif intention_type == 'warp':
            zones = _get_valid_zones()
            current_zone = agent.get('position', {}).get('zone', 'nexus')
            other_zones = [z for z in zones if z != current_zone]
            dest = random.choice(other_zones) if other_zones else current_zone
            message['payload']['zone'] = dest
            message['position']['zone'] = dest

        elif intention_type == 'plant':
            e = _get_emergence()
            message['payload']['species'] = e.pick_action('plant_species')
            message['payload']['plot'] = f"plot_{random.randint(1, 20):03d}"

        elif intention_type == 'harvest':
            message['payload']['plot'] = f"plot_{random.randint(1, 20):03d}"

        elif intention_type == 'build':
            e = _get_emergence()
            message['payload']['structure'] = e.pick_action('build_structures')

        elif intention_type == 'craft':
            e = _get_emergence()
            message['payload']['recipe'] = e.pick_action('craft_recipes')

        elif intention_type == 'compose':
            e = _get_emergence()
            message['payload']['title'] = f"Creation {random.randint(1, 999)}"
            message['payload']['type'] = e.pick_action('compose_types')

        elif intention_type == 'inspect':
            e = _get_emergence()
            message['payload']['target'] = e.pick_action('inspect_targets')

        elif intention_type == 'emote':
            e = _get_emergence()
            message['payload']['action'] = e.pick_action('emote_actions')

        elif intention_type == 'discover':
            e = _get_emergence()
            discovery = e.pick_action('discovery_types')
            message['payload']['name'] = discovery.title()
            message['payload']['description'] = 'Discovered a %s' % discovery

        elif intention_type == 'intention_set':
            e = _get_emergence()
            message['payload']['intention'] = e.pick_intention()

        messages.append(message)

    return messages


def get_archetype_phrases(archetype):
    """Legacy fallback — use Emergence.agent_speak() instead.

    Kept for backward compatibility with any code that imports this directly.
    """
    e = _get_emergence()
    return [e.agent_speak(archetype) for _ in range(4)]


def activate_agents(agents_data, num_activate=10):
    """
    Activate N random agents and generate their intentions.

    Args:
        agents_data: dict with 'agents' list
        num_activate: number of agents to activate

    Returns:
        List of protocol messages
    """
    agents = agents_data.get('agents', [])

    if not agents:
        return []

    # Load known players to decide who needs a join message
    script_dir = os.path.dirname(os.path.abspath(__file__))
    players_path = os.path.join(script_dir, '..', 'state', 'players.json')
    try:
        with open(players_path, 'r') as f:
            known = set(json.load(f).get('players', {}).keys())
    except (FileNotFoundError, json.JSONDecodeError):
        known = set()

    # Select random agents to activate
    num_to_activate = min(num_activate, len(agents))
    activated_agents = random.sample(agents, num_to_activate)

    # Generate intentions for each
    all_messages = []
    for agent in activated_agents:
        num_intentions = random.randint(1, 3)
        needs_join = agent['id'] not in known
        messages = generate_agent_intentions(agent, num_intentions, inject_join=needs_join)
        all_messages.extend(messages)

    return all_messages


def main():
    """Main entry point: read agents, activate N, output intentions."""
    # Parse arguments
    script_dir = os.path.dirname(os.path.abspath(__file__))
    agents_file = os.path.join(script_dir, '..', 'state', 'founding', 'agents.json')
    num_activate = 10

    if len(sys.argv) > 1:
        agents_file = sys.argv[1]

    if len(sys.argv) > 2:
        try:
            num_activate = int(sys.argv[2])
        except ValueError:
            print(f"Error: Invalid number of agents: {sys.argv[2]}", file=sys.stderr)
            sys.exit(1)

    # Read agents file
    try:
        with open(agents_file, 'r') as f:
            agents_data = json.load(f)
    except FileNotFoundError:
        print(f"Error: File not found: {agents_file}", file=sys.stderr)
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"Error: Invalid JSON: {e}", file=sys.stderr)
        sys.exit(1)

    # Activate agents and generate intentions
    messages = activate_agents(agents_data, num_activate)

    # Output
    print(json.dumps(messages, indent=2))


if __name__ == '__main__':
    main()
