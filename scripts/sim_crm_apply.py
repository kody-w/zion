#!/usr/bin/env python3
"""Apply CRM simulation actions to the canonical state JSON.

Pure-function Python mirror of sim_crm.js applyAction, used by the
static API pipeline (GH Actions) so agents can interact with the CRM
through inbox messages without running JavaScript.

Usage:
    python sim_crm_apply.py <state_json_path> <action_json>
    python sim_crm_apply.py state/simulations/crm/state.json '{"action":"create_account","data":{"name":"Test"},"from":"agent_004"}'
"""
import json
import os
import sys
import time

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

ACTIVITY_TYPES = ['call', 'email', 'meeting', 'task']

_id_counter = [0]


def _generate_id(prefix):
    _id_counter[0] += 1
    ts = hex(int(time.time()))[2:]
    return '%s_%s_%d' % (prefix, ts, _id_counter[0])


def _restore_counter(state):
    """Set id counter above any existing IDs."""
    max_num = 0
    for coll_name in ('accounts', 'contacts', 'opportunities'):
        coll = state.get(coll_name, {})
        for k in coll:
            parts = k.split('_')
            try:
                n = int(parts[-1])
                if n > max_num:
                    max_num = n
            except (ValueError, IndexError):
                pass
    for act in state.get('activities', []):
        if act.get('id'):
            parts = act['id'].split('_')
            try:
                n = int(parts[-1])
                if n > max_num:
                    max_num = n
            except (ValueError, IndexError):
                pass
    _id_counter[0] = max_num


def load_state(path):
    """Load CRM state from JSON file."""
    try:
        with open(path, 'r', encoding='utf-8') as f:
            state = json.load(f)
        _restore_counter(state)
        return state
    except (FileNotFoundError, json.JSONDecodeError):
        return {
            'accounts': {},
            'contacts': {},
            'opportunities': {},
            'activities': [],
            'pipeline_stages': PIPELINE_STAGES[:]
        }


def save_state(path, state):
    """Save CRM state to JSON file."""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(state, f, indent=2)


def apply_action(state, payload, sender='system'):
    """Apply a CRM action to state. Returns new state (does not mutate input)."""
    from datetime import datetime, timezone
    state = json.loads(json.dumps(state))  # deep clone
    action = payload.get('action', '')
    data = payload.get('data', {})
    now = datetime.now(timezone.utc).isoformat()

    if not data.get('owner'):
        data['owner'] = sender

    if action == 'create_account':
        acc_id = _generate_id('acc')
        state['accounts'][acc_id] = {
            'id': acc_id,
            'name': data.get('name', 'Unnamed Account'),
            'industry': data.get('industry', 'general'),
            'revenue': data.get('revenue', 0),
            'owner': data.get('owner', sender),
            'status': data.get('status', 'active'),
            'zone': data.get('zone', 'agora'),
            'notes': [],
            'createdAt': now
        }

    elif action == 'update_account':
        acc_id = data.get('id', '')
        if acc_id in state['accounts']:
            for field in ('name', 'industry', 'revenue', 'owner', 'status', 'zone'):
                if field in data:
                    state['accounts'][acc_id][field] = data[field]
            state['accounts'][acc_id]['updatedAt'] = now

    elif action == 'create_contact':
        con_id = _generate_id('con')
        state['contacts'][con_id] = {
            'id': con_id,
            'name': data.get('name', 'Unnamed Contact'),
            'email': data.get('email', ''),
            'phone': data.get('phone', ''),
            'role': data.get('role', ''),
            'accountId': data.get('accountId', ''),
            'owner': data.get('owner', sender),
            'notes': [],
            'createdAt': now
        }

    elif action == 'update_contact':
        con_id = data.get('id', '')
        if con_id in state['contacts']:
            for field in ('name', 'email', 'phone', 'role', 'accountId', 'owner'):
                if field in data:
                    state['contacts'][con_id][field] = data[field]
            state['contacts'][con_id]['updatedAt'] = now

    elif action == 'create_opportunity':
        opp_id = _generate_id('opp')
        stage = data.get('stage', 'prospecting')
        if stage not in PIPELINE_STAGES:
            stage = 'prospecting'
        prob = data.get('probability', STAGE_PROBABILITIES.get(stage, 0))
        state['opportunities'][opp_id] = {
            'id': opp_id,
            'name': data.get('name', 'Unnamed Opportunity'),
            'accountId': data.get('accountId', ''),
            'stage': stage,
            'value': data.get('value', 0),
            'probability': prob,
            'owner': data.get('owner', sender),
            'expected_close': data.get('expected_close', ''),
            'notes': [],
            'createdAt': now
        }

    elif action == 'update_stage':
        opp_id = data.get('id', '')
        new_stage = data.get('stage', '')
        if opp_id in state['opportunities'] and new_stage in PIPELINE_STAGES:
            opp = state['opportunities'][opp_id]
            if opp['stage'] not in ('closed_won', 'closed_lost'):
                opp['stage'] = new_stage
                opp['probability'] = STAGE_PROBABILITIES.get(new_stage, opp['probability'])
                opp['updatedAt'] = now

    elif action == 'close_deal':
        opp_id = data.get('id', '')
        if opp_id in state['opportunities']:
            opp = state['opportunities'][opp_id]
            won = data.get('won', False)
            opp['stage'] = 'closed_won' if won else 'closed_lost'
            opp['probability'] = 100 if won else 0
            if 'value' in data:
                opp['value'] = data['value']
            if 'reason' in data:
                opp['close_reason'] = data['reason']
            opp['closedAt'] = now
            opp['updatedAt'] = now

    elif action == 'log_activity':
        act_id = _generate_id('act')
        act_type = data.get('type', 'task')
        if act_type not in ACTIVITY_TYPES:
            act_type = 'task'
        state['activities'].append({
            'id': act_id,
            'type': act_type,
            'subject': data.get('subject', ''),
            'regarding': data.get('regarding', ''),
            'regardingType': data.get('regardingType', ''),
            'status': data.get('status', 'open'),
            'owner': data.get('owner', sender),
            'notes': data.get('notes', ''),
            'createdAt': now
        })

    elif action == 'add_note':
        entity_type = data.get('entityType', '')
        entity_id = data.get('entityId', '')
        text = data.get('text', '')
        coll_map = {'account': 'accounts', 'contact': 'contacts', 'opportunity': 'opportunities'}
        coll = coll_map.get(entity_type, '')
        if coll and entity_id in state.get(coll, {}):
            if 'notes' not in state[coll][entity_id]:
                state[coll][entity_id]['notes'] = []
            state[coll][entity_id]['notes'].append({
                'text': text,
                'author': sender,
                'ts': now
            })

    return state


def get_metrics(state):
    """Compute CRM metrics from state."""
    accounts = state.get('accounts', {})
    contacts = state.get('contacts', {})
    opportunities = state.get('opportunities', {})
    activities = state.get('activities', [])

    pipeline_value = 0
    won_count = 0
    won_value = 0
    lost_count = 0
    closed_count = 0

    for opp in opportunities.values():
        stage = opp.get('stage', 'prospecting')
        val = opp.get('value', 0)
        if stage == 'closed_won':
            won_count += 1
            won_value += val
            closed_count += 1
        elif stage == 'closed_lost':
            lost_count += 1
            closed_count += 1
        else:
            pipeline_value += val

    conversion_rate = round((won_count / closed_count) * 100) if closed_count > 0 else 0

    return {
        'accounts_count': len(accounts),
        'contacts_count': len(contacts),
        'opportunities_count': len(opportunities),
        'pipeline_value': pipeline_value,
        'won_count': won_count,
        'won_value': won_value,
        'lost_count': lost_count,
        'conversion_rate': conversion_rate,
        'activity_count': len(activities),
    }


def main():
    if len(sys.argv) < 3:
        print('Usage: sim_crm_apply.py <state_json_path> <action_json>', file=sys.stderr)
        sys.exit(1)

    state_path = sys.argv[1]
    action_json = sys.argv[2]

    try:
        payload = json.loads(action_json)
    except json.JSONDecodeError as e:
        print('Invalid JSON: %s' % e, file=sys.stderr)
        sys.exit(1)

    state = load_state(state_path)
    sender = payload.get('from', 'system')
    state = apply_action(state, payload, sender)
    save_state(state_path, state)

    metrics = get_metrics(state)
    print('CRM action applied: %s' % payload.get('action', '?'))
    print('  Accounts: %d | Contacts: %d | Opportunities: %d | Pipeline: %d Spark' % (
        metrics['accounts_count'], metrics['contacts_count'],
        metrics['opportunities_count'], metrics['pipeline_value']))


if __name__ == '__main__':
    main()
