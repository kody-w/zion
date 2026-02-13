#!/usr/bin/env python3
"""Agent activation: generate autonomous agent actions."""
import json
import sys
import random
import time
from datetime import datetime


def generate_agent_intentions(agent, count=2):
    """
    Generate intention messages for an agent based on their archetype.

    Args:
        agent: agent dict with archetype, intentions, position
        count: number of intentions to generate (1-3)

    Returns:
        List of protocol messages
    """
    messages = []
    intention_types = agent.get('intentions', ['say', 'move', 'inspect'])

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
            phrases = get_archetype_phrases(archetype)
            message['payload']['text'] = random.choice(phrases)

        elif intention_type == 'move':
            # Random movement within zone
            current_pos = agent.get('position', {'x': 0, 'y': 0, 'z': 0})
            message['payload']['destination'] = {
                'x': current_pos.get('x', 0) + random.uniform(-5, 5),
                'y': current_pos.get('y', 0),
                'z': current_pos.get('z', 0) + random.uniform(-5, 5),
                'zone': current_pos.get('zone', 'nexus')
            }

        elif intention_type == 'plant':
            message['payload']['species'] = random.choice(['tomato', 'wheat', 'flower', 'tree'])
            message['payload']['plot'] = f"plot_{random.randint(1, 20):03d}"

        elif intention_type == 'harvest':
            message['payload']['plot'] = f"plot_{random.randint(1, 20):03d}"

        elif intention_type == 'build':
            message['payload']['structure'] = random.choice(['bench', 'statue', 'path', 'shrine'])

        elif intention_type == 'craft':
            message['payload']['recipe'] = random.choice(['tool', 'ornament', 'instrument'])

        elif intention_type == 'compose':
            message['payload']['title'] = f"Creation {random.randint(1, 999)}"
            message['payload']['type'] = random.choice(['song', 'poem', 'story'])

        elif intention_type == 'inspect':
            message['payload']['target'] = random.choice([
                'fountain_001', 'ancient_tree_001', 'telescope_001'
            ])

        elif intention_type == 'emote':
            message['payload']['action'] = random.choice([
                'waves', 'bows', 'dances', 'smiles', 'nods'
            ])

        elif intention_type == 'discover':
            message['payload']['exploration'] = random.choice([
                'constellation', 'artifact', 'pathway', 'secret'
            ])

        elif intention_type == 'intention_set':
            message['payload']['intention'] = random.choice([
                'Create beauty', 'Share knowledge', 'Build community', 'Explore the unknown'
            ])

        messages.append(message)

    return messages


def get_archetype_phrases(archetype):
    """Get appropriate phrases for an archetype."""
    phrases = {
        'gardener': [
            'The soil feels rich today.',
            'These plants are thriving.',
            'Patience yields the best harvest.',
            'Let us tend to growth together.'
        ],
        'builder': [
            'This structure will stand for ages.',
            'Every creation begins with intention.',
            'Let us build something meaningful.',
            'The foundation must be strong.'
        ],
        'storyteller': [
            'Gather round, I have a tale to share.',
            'Words carry power and memory.',
            'Every being has a story worth telling.',
            'Let imagination guide us.'
        ],
        'merchant': [
            'Fair trade enriches all parties.',
            'What treasures do you seek today?',
            'The market thrives on exchange.',
            'Value flows where intention directs.'
        ],
        'explorer': [
            'What lies beyond that horizon?',
            'Discovery awaits the curious.',
            'Every path leads somewhere new.',
            'The unknown calls to me.'
        ],
        'teacher': [
            'Knowledge grows when shared.',
            'Let me show you what I have learned.',
            'Questions are the seeds of wisdom.',
            'We learn best together.'
        ],
        'musician': [
            'Music speaks what words cannot.',
            'Listen to the rhythm of the world.',
            'Every sound is part of the symphony.',
            'Let harmony guide us.'
        ],
        'healer': [
            'Balance brings wellness.',
            'How may I ease your burden?',
            'Compassion is the greatest medicine.',
            'We all need care sometimes.'
        ],
        'philosopher': [
            'What is the nature of this place?',
            'Contemplation reveals truth.',
            'Why do we choose what we choose?',
            'Understanding comes through reflection.'
        ],
        'artist': [
            'Beauty emerges from intention.',
            'This medium speaks to me.',
            'Art transforms the ordinary.',
            'Let creativity flow freely.'
        ]
    }

    return phrases.get(archetype, [
        'Greetings, fellow traveler.',
        'What brings you here today?',
        'The world is full of wonder.',
        'Together we create meaning.'
    ])


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

    # Select random agents to activate
    num_to_activate = min(num_activate, len(agents))
    activated_agents = random.sample(agents, num_to_activate)

    # Generate intentions for each
    all_messages = []
    for agent in activated_agents:
        num_intentions = random.randint(1, 3)
        messages = generate_agent_intentions(agent, num_intentions)
        all_messages.extend(messages)

    return all_messages


def main():
    """Main entry point: read agents, activate N, output intentions."""
    # Parse arguments
    agents_file = '/Users/kodyw/Projects/Zion/state/founding/agents.json'
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
