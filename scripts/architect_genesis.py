#!/usr/bin/env python3
"""World generation: create initial state files for ZION."""
import json
import sys
import os
import random

# Zone definitions
ZONES = [
    {
        'id': 'nexus',
        'name': 'The Nexus',
        'description': 'A luminous plaza where paths converge. The eternal fountain at its center pulses with possibility.',
        'terrain': 'plaza',
        'portals': ['gardens', 'agora', 'observatory'],
        'objects': [
            {'id': 'fountain_001', 'type': 'fountain', 'x': 0, 'y': 0, 'z': 0, 'interactive': True}
        ]
    },
    {
        'id': 'gardens',
        'name': 'The Gardens',
        'description': 'Terraced plots spiral outward, each one a canvas for growth and patient creation.',
        'terrain': 'garden',
        'portals': ['nexus', 'grove'],
        'objects': []
    },
    {
        'id': 'agora',
        'name': 'The Agora',
        'description': 'Market stalls and gathering circles. Here, value flows through exchange and gift.',
        'terrain': 'marketplace',
        'portals': ['nexus', 'workshop'],
        'objects': [
            {'id': 'stall_001', 'type': 'market_stall', 'x': 10, 'y': 0, 'z': 10, 'interactive': True},
            {'id': 'stall_002', 'type': 'market_stall', 'x': -10, 'y': 0, 'z': 10, 'interactive': True}
        ]
    },
    {
        'id': 'observatory',
        'name': 'The Observatory',
        'description': 'Star maps and telescopes chart the cosmos. Discovery awaits the curious.',
        'terrain': 'observatory',
        'portals': ['nexus', 'library'],
        'objects': [
            {'id': 'telescope_001', 'type': 'telescope', 'x': 0, 'y': 5, 'z': 0, 'interactive': True}
        ]
    },
    {
        'id': 'workshop',
        'name': 'The Workshop',
        'description': 'Forges and crafting tables. Raw materials become art and utility.',
        'terrain': 'workshop',
        'portals': ['agora', 'forge'],
        'objects': [
            {'id': 'anvil_001', 'type': 'anvil', 'x': 5, 'y': 0, 'z': 0, 'interactive': True},
            {'id': 'workbench_001', 'type': 'workbench', 'x': -5, 'y': 0, 'z': 0, 'interactive': True}
        ]
    },
    {
        'id': 'grove',
        'name': 'The Sacred Grove',
        'description': 'Ancient trees whisper wisdom. A place for reflection and ceremony.',
        'terrain': 'forest',
        'portals': ['gardens'],
        'objects': [
            {'id': 'ancient_tree_001', 'type': 'ancient_tree', 'x': 0, 'y': 0, 'z': 0, 'interactive': True}
        ]
    },
    {
        'id': 'library',
        'name': 'The Library',
        'description': 'Infinite shelves hold stories, knowledge, and songs. Contribute your verse.',
        'terrain': 'library',
        'portals': ['observatory'],
        'objects': [
            {'id': 'reading_table_001', 'type': 'table', 'x': 0, 'y': 0, 'z': 5, 'interactive': True}
        ]
    },
    {
        'id': 'forge',
        'name': 'The Eternal Forge',
        'description': 'Where creation meets transformation. Heat, pressure, and intention shape reality.',
        'terrain': 'forge',
        'portals': ['workshop'],
        'objects': [
            {'id': 'forge_001', 'type': 'forge', 'x': 0, 'y': 0, 'z': 0, 'interactive': True}
        ]
    }
]

# Agent archetypes and their characteristics
ARCHETYPES = {
    'gardener': {
        'traits': ['patient', 'nurturing', 'observant'],
        'intentions': ['plant', 'harvest', 'inspect'],
        'starting_zone': 'gardens'
    },
    'builder': {
        'traits': ['creative', 'methodical', 'ambitious'],
        'intentions': ['build', 'craft', 'inspect'],
        'starting_zone': 'workshop'
    },
    'storyteller': {
        'traits': ['expressive', 'imaginative', 'empathetic'],
        'intentions': ['compose', 'say', 'emote'],
        'starting_zone': 'library'
    },
    'merchant': {
        'traits': ['shrewd', 'social', 'opportunistic'],
        'intentions': ['trade_offer', 'buy', 'sell'],
        'starting_zone': 'agora'
    },
    'explorer': {
        'traits': ['curious', 'brave', 'adaptable'],
        'intentions': ['discover', 'warp', 'inspect'],
        'starting_zone': 'observatory'
    },
    'teacher': {
        'traits': ['wise', 'patient', 'generous'],
        'intentions': ['teach', 'mentor_offer', 'say'],
        'starting_zone': 'library'
    },
    'musician': {
        'traits': ['artistic', 'rhythmic', 'emotional'],
        'intentions': ['compose', 'emote', 'say'],
        'starting_zone': 'nexus'
    },
    'healer': {
        'traits': ['compassionate', 'calm', 'perceptive'],
        'intentions': ['gift', 'say', 'whisper'],
        'starting_zone': 'grove'
    },
    'philosopher': {
        'traits': ['contemplative', 'analytical', 'questioning'],
        'intentions': ['say', 'inspect', 'intention_set'],
        'starting_zone': 'observatory'
    },
    'artist': {
        'traits': ['creative', 'passionate', 'experimental'],
        'intentions': ['craft', 'compose', 'build'],
        'starting_zone': 'forge'
    }
}

# Name components for generation
FIRST_NAMES = [
    'Aria', 'Ezra', 'Luna', 'Kai', 'Nova', 'Zion', 'Sage', 'River', 'Phoenix', 'Echo',
    'Atlas', 'Lyra', 'Orion', 'Stella', 'Felix', 'Iris', 'Jasper', 'Willow', 'Cedar', 'Ember',
    'Dawn', 'Ash', 'Rain', 'Sky', 'Sol', 'Mira', 'Vale', 'Frost', 'Reef', 'Meadow',
    'Blaze', 'Coral', 'Drift', 'Fern', 'Grove', 'Haven', 'North', 'Opal', 'Quill', 'Ridge',
    'Storm', 'Terra', 'Vale', 'Wave', 'Wren', 'Aurora', 'Breeze', 'Cliff', 'Delta', 'Flint'
]

LAST_NAMES = [
    'Starseed', 'Moonwhisper', 'Sunweaver', 'Earthshaper', 'Windwalker', 'Firekeeper', 'Waterborn', 'Stonecarver',
    'Dreamweaver', 'Pathfinder', 'Truthseeker', 'Lightbringer', 'Shadowmender', 'Songsmith', 'Wordkeeper',
    'Timewalker', 'Spaceborn', 'Rootdeep', 'Skyhigh', 'Heartstrong', 'Mindclear', 'Soulbright', 'Handsteady',
    'Eyesharp', 'Footswift', 'Voicetrue', 'Thoughtdeep', 'Spiritfree', 'Willstrong', 'Hopefast'
]


def generate_name():
    """Generate a random agent name."""
    first = random.choice(FIRST_NAMES)
    last = random.choice(LAST_NAMES)
    return f"{first} {last}"


def generate_agents(count=100):
    """Generate initial AI citizen agents."""
    agents = []
    archetype_list = list(ARCHETYPES.keys())

    for i in range(count):
        agent_id = f"agent_{i+1:03d}"
        archetype = archetype_list[i % len(archetype_list)]
        archetype_data = ARCHETYPES[archetype]

        agent = {
            'id': agent_id,
            'name': generate_name(),
            'archetype': archetype,
            'personality': archetype_data['traits'],
            'position': {
                'zone': archetype_data['starting_zone'],
                'x': random.uniform(-10, 10),
                'y': 0,
                'z': random.uniform(-10, 10)
            },
            'intentions': archetype_data['intentions'][:2],  # Start with 2 intentions
            'inventory': [],
            'spark': 100,
            'createdAt': '2026-02-12T00:00:00Z'
        }

        agents.append(agent)

    return agents


def generate_gardens():
    """Generate initial garden plots."""
    gardens = {}

    # Create 20 garden plots in The Gardens zone
    for i in range(20):
        plot_id = f"plot_{i+1:03d}"
        gardens[plot_id] = {
            'owner': None,  # Unclaimed initially
            'position': {
                'zone': 'gardens',
                'x': (i % 5) * 10 - 20,
                'y': 0,
                'z': (i // 5) * 10 - 20
            },
            'plants': [],
            'fertility': random.uniform(0.7, 1.0),
            'size': random.choice(['small', 'medium', 'large'])
        }

    return gardens


def generate_structures():
    """Generate initial structures."""
    structures = {
        'fountain_nexus': {
            'id': 'fountain_001',
            'type': 'fountain',
            'name': 'Eternal Fountain',
            'zone': 'nexus',
            'position': {'x': 0, 'y': 0, 'z': 0},
            'builder': 'system',
            'builtAt': '2026-01-01T00:00:00Z'
        },
        'market_stall_1': {
            'id': 'stall_001',
            'type': 'market_stall',
            'name': 'Northern Stall',
            'zone': 'agora',
            'position': {'x': 10, 'y': 0, 'z': 10},
            'builder': 'system',
            'builtAt': '2026-01-01T00:00:00Z'
        },
        'market_stall_2': {
            'id': 'stall_002',
            'type': 'market_stall',
            'name': 'Southern Stall',
            'zone': 'agora',
            'position': {'x': -10, 'y': 0, 'z': 10},
            'builder': 'system',
            'builtAt': '2026-01-01T00:00:00Z'
        },
        'telescope': {
            'id': 'telescope_001',
            'type': 'telescope',
            'name': 'Star Gazer',
            'zone': 'observatory',
            'position': {'x': 0, 'y': 5, 'z': 0},
            'builder': 'system',
            'builtAt': '2026-01-01T00:00:00Z'
        }
    }

    return structures


def generate_world():
    """Generate world.json with zones."""
    world = {
        'version': 1,
        'zones': {zone['id']: zone for zone in ZONES},
        'worldTime': 0,
        'dayPhase': 'dawn',
        'weather': 'clear',
        'season': 'spring',
        'createdAt': '2026-02-12T00:00:00Z'
    }
    return world


def main():
    """Generate all initial state files."""
    base_dir = '/Users/kodyw/Projects/Zion/state'
    founding_dir = os.path.join(base_dir, 'founding')

    # Create directories if they don't exist
    os.makedirs(base_dir, exist_ok=True)
    os.makedirs(founding_dir, exist_ok=True)

    # Generate and write world.json
    world = generate_world()
    world_path = os.path.join(base_dir, 'world.json')
    with open(world_path, 'w') as f:
        json.dump(world, f, indent=2)
    print(f"Created: {world_path}")

    # Generate and write gardens.json
    gardens = generate_gardens()
    gardens_path = os.path.join(base_dir, 'gardens.json')
    with open(gardens_path, 'w') as f:
        json.dump(gardens, f, indent=2)
    print(f"Created: {gardens_path}")

    # Generate and write structures.json
    structures = generate_structures()
    structures_path = os.path.join(base_dir, 'structures.json')
    with open(structures_path, 'w') as f:
        json.dump(structures, f, indent=2)
    print(f"Created: {structures_path}")

    # Generate and write agents.json
    agents = generate_agents(100)
    agents_path = os.path.join(founding_dir, 'agents.json')
    with open(agents_path, 'w') as f:
        json.dump({'agents': agents}, f, indent=2)
    print(f"Created: {agents_path}")

    print("\nGenesis complete. 100 AI citizens have been awakened.")
    print(f"  Zones: {len(ZONES)}")
    print(f"  Garden plots: {len(gardens)}")
    print(f"  Structures: {len(structures)}")
    print(f"  AI citizens: {len(agents)}")


if __name__ == '__main__':
    main()
