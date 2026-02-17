#!/usr/bin/env python3
"""Seed the CRM simulation with merchant NPC data from founding agents.

Generates: state/simulations/crm/state.json
Reads: state/founding/agents.json

Creates ~10 accounts (merchant shops), ~25 contacts (neighboring NPCs),
~20 opportunities in various pipeline stages, and ~25 activities.
"""
import json
import os
import random
import hashlib
from datetime import datetime, timezone, timedelta

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
AGENTS_PATH = os.path.join(PROJECT_ROOT, 'state', 'founding', 'agents.json')
OUTPUT_PATH = os.path.join(PROJECT_ROOT, 'state', 'simulations', 'crm', 'state.json')

PIPELINE_STAGES = [
    'prospecting', 'qualification', 'proposal',
    'negotiation', 'closed_won', 'closed_lost'
]

STAGE_PROBABILITIES = {
    'prospecting': 10,
    'qualification': 25,
    'proposal': 50,
    'negotiation': 75,
    'closed_won': 100,
    'closed_lost': 0,
}

INDUSTRIES = [
    'trade', 'crafts', 'herbalism', 'alchemy',
    'enchanting', 'provisions', 'lore', 'music',
    'artifacts', 'exploration_gear'
]

DEAL_NAMES = [
    'Crystal Supply Contract', 'Herb Bulk Order', 'Enchanted Tools Deal',
    'Seasonal Provisions Pack', 'Rare Artifact Acquisition',
    'Music Instrument Commission', 'Lore Manuscript Collection',
    'Exploration Kit Supply', 'Alchemy Reagent Subscription',
    'Trading Post Expansion', 'Gemstone Wholesale Agreement',
    'Healing Potion Supply', 'Map Cartography Service',
    'Festival Decoration Order', 'Training Equipment Deal',
    'Scroll Binding Contract', 'Seed Variety Package',
    'Forge Material Supply', 'Textile Dye Shipment',
    'Waystone Maintenance Contract'
]

ACTIVITY_SUBJECTS = [
    'Initial outreach call', 'Follow-up on proposal',
    'Quarterly business review', 'Product demonstration',
    'Contract negotiation meeting', 'Pricing discussion',
    'Delivery coordination', 'Quality check meeting',
    'Renewal discussion', 'New product introduction',
    'Payment terms negotiation', 'Feedback collection call',
    'Partnership exploration', 'Supply chain review',
    'Inventory planning session'
]


def stable_seed(text):
    """Create a stable random seed from text."""
    return int(hashlib.md5(text.encode()).hexdigest()[:8], 16)


def make_email(name):
    """Generate an email from an NPC name."""
    parts = name.lower().split()
    return '%s.%s@zion.world' % (parts[0], parts[-1]) if len(parts) > 1 else '%s@zion.world' % parts[0]


def make_phone(seed_val):
    """Generate a phone-like string from seed."""
    rng = random.Random(seed_val)
    return 'ZN-%03d-%04d' % (rng.randint(100, 999), rng.randint(1000, 9999))


def main():
    # Load agents
    with open(AGENTS_PATH, 'r', encoding='utf-8') as f:
        agents_data = json.load(f)
    agents = agents_data.get('agents', [])

    # Separate merchants from others
    merchants = [a for a in agents if a['archetype'] == 'merchant']
    non_merchants = [a for a in agents if a['archetype'] != 'merchant']

    # Use deterministic RNG for reproducible output
    rng = random.Random(42)

    now = datetime.now(timezone.utc)
    base_ts = now - timedelta(days=30)  # Seed data from "30 days ago"

    state = {
        '_schema': {
            'collections': {
                'accounts':      {'prefix': 'acc', 'fields': ['name', 'industry', 'revenue', 'owner', 'status', 'zone']},
                'contacts':      {'prefix': 'con', 'fields': ['name', 'email', 'phone', 'role', 'accountId', 'owner']},
                'opportunities': {'prefix': 'opp', 'fields': ['name', 'accountId', 'stage', 'value', 'probability', 'owner', 'expected_close']},
            },
            'activity_types': ['call', 'email', 'meeting', 'task'],
            'pipeline_stages': PIPELINE_STAGES[:],
            'stage_probabilities': dict(STAGE_PROBABILITIES),
        },
        '_molt_log': [],
        'accounts': {},
        'contacts': {},
        'opportunities': {},
        'activities': [],
        'pipeline_stages': PIPELINE_STAGES[:]
    }

    acc_counter = 0
    con_counter = 0
    opp_counter = 0
    act_counter = 0

    # Create accounts from merchants
    for merchant in merchants:
        acc_counter += 1
        acc_id = 'acc_seed_%d' % acc_counter
        industry = INDUSTRIES[acc_counter % len(INDUSTRIES)]
        revenue = rng.randint(500, 10000)
        created_at = (base_ts + timedelta(days=rng.randint(0, 10))).isoformat()

        shop_name = "%s's %s Shop" % (merchant['name'].split()[0], industry.title())

        state['accounts'][acc_id] = {
            'id': acc_id,
            'name': shop_name,
            'industry': industry,
            'revenue': revenue,
            'owner': merchant['id'],
            'status': 'active',
            'zone': merchant['position']['zone'],
            'notes': [],
            'createdAt': created_at
        }

        # Find 2-3 neighboring NPCs as contacts for this account
        same_zone = [a for a in non_merchants if a['position']['zone'] == merchant['position']['zone']]
        if len(same_zone) < 2:
            same_zone = non_merchants[:]
        contact_npcs = rng.sample(same_zone, min(rng.randint(2, 3), len(same_zone)))

        for npc in contact_npcs:
            con_counter += 1
            con_id = 'con_seed_%d' % con_counter
            created_at = (base_ts + timedelta(days=rng.randint(0, 15))).isoformat()

            state['contacts'][con_id] = {
                'id': con_id,
                'name': npc['name'],
                'email': make_email(npc['name']),
                'phone': make_phone(stable_seed(npc['id'])),
                'role': npc['archetype'],
                'accountId': acc_id,
                'owner': merchant['id'],
                'notes': [],
                'createdAt': created_at
            }

        # Create 1-3 opportunities per merchant
        num_opps = rng.randint(1, 3)
        for j in range(num_opps):
            opp_counter += 1
            opp_id = 'opp_seed_%d' % opp_counter
            # Distribute across stages (weighted toward open stages)
            stage_weights = [3, 3, 2, 2, 1, 1]  # prospecting through closed_lost
            stage = rng.choices(PIPELINE_STAGES, weights=stage_weights, k=1)[0]
            value = rng.randint(100, 5000)
            created_at = (base_ts + timedelta(days=rng.randint(0, 20))).isoformat()
            expected_close = (now + timedelta(days=rng.randint(7, 90))).strftime('%Y-%m-%d')

            deal_name = DEAL_NAMES[opp_counter % len(DEAL_NAMES)]

            opp = {
                'id': opp_id,
                'name': deal_name,
                'accountId': acc_id,
                'stage': stage,
                'value': value,
                'probability': STAGE_PROBABILITIES[stage],
                'owner': merchant['id'],
                'expected_close': expected_close,
                'notes': [],
                'createdAt': created_at
            }
            if stage in ('closed_won', 'closed_lost'):
                opp['closedAt'] = (base_ts + timedelta(days=rng.randint(15, 28))).isoformat()
            state['opportunities'][opp_id] = opp

    # Create 25 activities spread across merchants and deals
    activity_types = ['call', 'email', 'meeting', 'task']
    opp_ids = list(state['opportunities'].keys())
    acc_ids = list(state['accounts'].keys())

    for i in range(25):
        act_counter += 1
        act_id = 'act_seed_%d' % act_counter
        act_type = rng.choice(activity_types)
        subject = ACTIVITY_SUBJECTS[i % len(ACTIVITY_SUBJECTS)]
        owner = rng.choice(merchants)['id']
        created_at = (base_ts + timedelta(days=rng.randint(0, 28), hours=rng.randint(0, 23))).isoformat()

        # Reference either an opportunity or account
        if opp_ids and rng.random() > 0.3:
            regarding = rng.choice(opp_ids)
            regarding_type = 'opportunity'
        elif acc_ids:
            regarding = rng.choice(acc_ids)
            regarding_type = 'account'
        else:
            regarding = ''
            regarding_type = ''

        status = rng.choice(['completed', 'completed', 'completed', 'open'])

        state['activities'].append({
            'id': act_id,
            'type': act_type,
            'subject': subject,
            'regarding': regarding,
            'regardingType': regarding_type,
            'status': status,
            'owner': owner,
            'notes': '',
            'createdAt': created_at
        })

    # Write output
    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
        json.dump(state, f, indent=2)

    # Summary
    print('CRM Seed Complete:')
    print('  Accounts:      %d' % len(state['accounts']))
    print('  Contacts:      %d' % len(state['contacts']))
    print('  Opportunities: %d' % len(state['opportunities']))
    print('  Activities:    %d' % len(state['activities']))
    print('  Output: %s' % OUTPUT_PATH)
    return 0


if __name__ == '__main__':
    exit(main())
