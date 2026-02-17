#!/usr/bin/env python3
"""Apply CRM simulation actions to the canonical state JSON.

Self-evolving Python mirror of sim_crm.js applyAction. When an unknown
action arrives the simulation molts — adding new collections, fields,
pipeline stages, or activity types on the fly.

Used by the static API pipeline (GH Actions) so agents can interact with
the CRM through inbox messages without running JavaScript.

Usage:
    python sim_crm_apply.py <state_json_path> <action_json>
    python sim_crm_apply.py state/simulations/crm/state.json '{"action":"create_account","data":{"name":"Test"},"from":"agent_004"}'
"""
import json
import os
import sys
import time
from datetime import datetime, timezone

DEFAULT_PIPELINE = [
    'prospecting', 'qualification', 'proposal',
    'negotiation', 'closed_won', 'closed_lost'
]

DEFAULT_STAGE_PROBABILITIES = {
    'prospecting': 10,
    'qualification': 25,
    'proposal': 50,
    'negotiation': 75,
    'closed_won': 100,
    'closed_lost': 0,
}

DEFAULT_ACTIVITY_TYPES = ['call', 'email', 'meeting', 'task']

DEFAULT_SCHEMA = {
    'collections': {
        'accounts':      {'prefix': 'acc', 'fields': ['name', 'industry', 'revenue', 'owner', 'status', 'zone']},
        'contacts':      {'prefix': 'con', 'fields': ['name', 'email', 'phone', 'role', 'accountId', 'owner']},
        'opportunities': {'prefix': 'opp', 'fields': ['name', 'accountId', 'stage', 'value', 'probability', 'owner', 'expected_close']},
    },
    'activity_types': DEFAULT_ACTIVITY_TYPES[:],
    'pipeline_stages': DEFAULT_PIPELINE[:],
    'stage_probabilities': dict(DEFAULT_STAGE_PROBABILITIES),
}

_id_counter = [0]


def _generate_id(prefix):
    _id_counter[0] += 1
    ts = hex(int(time.time()))[2:]
    return '%s_%s_%d' % (prefix, ts, _id_counter[0])


def _restore_counter(state):
    """Set id counter above any existing IDs."""
    max_num = 0
    schema = state.get('_schema', DEFAULT_SCHEMA)
    coll_names = list(schema.get('collections', {}).keys())
    scan_keys = set(coll_names) | {'accounts', 'contacts', 'opportunities'}
    for coll_name in scan_keys:
        coll = state.get(coll_name, {})
        if isinstance(coll, dict):
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


def _now_iso():
    return datetime.now(timezone.utc).isoformat()


def _deep_copy(obj):
    return json.loads(json.dumps(obj))


# --- State management ---

def load_state(path):
    """Load CRM state from JSON file, migrating v1 states."""
    try:
        with open(path, 'r', encoding='utf-8') as f:
            state = json.load(f)
        _restore_counter(state)
        # Migrate v1 states
        if '_schema' not in state:
            state['_schema'] = _deep_copy(DEFAULT_SCHEMA)
        if '_molt_log' not in state:
            state['_molt_log'] = []
        if 'pipeline_stages' not in state:
            state['pipeline_stages'] = state['_schema']['pipeline_stages'][:]
        return state
    except (FileNotFoundError, json.JSONDecodeError):
        return {
            '_schema': _deep_copy(DEFAULT_SCHEMA),
            '_molt_log': [],
            'accounts': {},
            'contacts': {},
            'opportunities': {},
            'activities': [],
            'pipeline_stages': DEFAULT_PIPELINE[:],
        }


def save_state(path, state):
    """Save CRM state to JSON file."""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(state, f, indent=2)


# --- Molt: the simulation adapts ---

def _molt(state, reason):
    s = _deep_copy(state)
    if '_molt_log' not in s:
        s['_molt_log'] = []
    s['_molt_log'].append({
        'v': len(s['_molt_log']) + 1,
        'reason': reason,
        'ts': _now_iso(),
    })
    return s


def _ensure_collection(state, coll_name, prefix):
    coll = state.get(coll_name)
    if isinstance(coll, dict):
        return state
    s = _molt(state, 'New collection: ' + coll_name)
    s[coll_name] = {}
    if coll_name not in s['_schema']['collections']:
        s['_schema']['collections'][coll_name] = {
            'prefix': prefix or coll_name[:3],
            'fields': [],
        }
    return s


def _ensure_pipeline_stage(state, stage_name):
    stages = state['_schema']['pipeline_stages']
    if stage_name in stages:
        return state
    s = _molt(state, 'New pipeline stage: ' + stage_name)
    # Insert before closed stages
    try:
        closed_idx = stages.index('closed_won')
    except ValueError:
        closed_idx = len(stages)
    s['_schema']['pipeline_stages'].insert(closed_idx, stage_name)
    s['pipeline_stages'] = s['_schema']['pipeline_stages'][:]
    if stage_name not in s['_schema']['stage_probabilities']:
        pos = s['_schema']['pipeline_stages'].index(stage_name)
        total = len(s['_schema']['pipeline_stages'])
        s['_schema']['stage_probabilities'][stage_name] = round((pos / max(total - 1, 1)) * 100)
    return s


def _ensure_activity_type(state, type_name):
    if type_name in state['_schema']['activity_types']:
        return state
    s = _molt(state, 'New activity type: ' + type_name)
    s['_schema']['activity_types'].append(type_name)
    return s


def _learn_fields(state, coll_name, data):
    schema = state['_schema']
    if coll_name not in schema['collections']:
        return state
    known = schema['collections'][coll_name]['fields']
    new_fields = [k for k in data if k not in ('id', 'owner') and k not in known]
    if not new_fields:
        return state
    s = _molt(state, 'New fields on %s: %s' % (coll_name, ', '.join(new_fields)))
    s['_schema']['collections'][coll_name]['fields'].extend(new_fields)
    return s


# --- Molt for unknown actions ---

def _molt_for_action(state, action, data, sender):
    if not action or not isinstance(action, str):
        return state
    parts = action.split('_')
    if len(parts) < 2:
        return state

    verb = parts[0]
    entity_singular = '_'.join(parts[1:])
    coll_name = entity_singular + 's'
    prefix = entity_singular[:3]

    if verb == 'create':
        s = _ensure_collection(state, coll_name, prefix)
        s = _learn_fields(s, coll_name, data)
        s = _deep_copy(s)
        rec_id = _generate_id(prefix)
        record = {
            'id': rec_id,
            'owner': data.get('owner', sender),
            'createdAt': _now_iso(),
        }
        for k, v in data.items():
            record[k] = v
        if 'name' not in record:
            record['name'] = 'Unnamed ' + entity_singular
        if 'notes' not in record:
            record['notes'] = []
        s[coll_name][rec_id] = record
        return s

    elif verb == 'update':
        coll = state.get(coll_name, {})
        rec_id = data.get('id', '')
        if not isinstance(coll, dict) or rec_id not in coll:
            return state
        s = _learn_fields(state, coll_name, data)
        s = _deep_copy(s)
        target = s[coll_name][rec_id]
        for k, v in data.items():
            if k != 'id':
                target[k] = v
        target['updatedAt'] = _now_iso()
        return s

    elif verb == 'delete':
        coll = state.get(coll_name, {})
        rec_id = data.get('id', '')
        if not isinstance(coll, dict) or rec_id not in coll:
            return state
        s = _deep_copy(state)
        del s[coll_name][rec_id]
        return s

    elif verb == 'list':
        return state

    return state


# --- CRUD: Accounts ---

def _create_account(state, data, sender):
    s = _learn_fields(state, 'accounts', data)
    s = _deep_copy(s)
    acc_id = _generate_id('acc')
    record = {
        'id': acc_id,
        'name': data.get('name', 'Unnamed Account'),
        'industry': data.get('industry', 'general'),
        'revenue': data.get('revenue', 0),
        'owner': data.get('owner', sender),
        'status': data.get('status', 'active'),
        'zone': data.get('zone', 'agora'),
        'notes': [],
        'createdAt': _now_iso(),
    }
    for k, v in data.items():
        if k not in record:
            record[k] = v
    s['accounts'][acc_id] = record
    return s


def _update_account(state, data):
    acc_id = data.get('id', '')
    if acc_id not in state.get('accounts', {}):
        return state
    s = _learn_fields(state, 'accounts', data)
    s = _deep_copy(s)
    acct = s['accounts'][acc_id]
    for k, v in data.items():
        if k != 'id':
            acct[k] = v
    acct['updatedAt'] = _now_iso()
    return s


# --- CRUD: Contacts ---

def _create_contact(state, data, sender):
    s = _learn_fields(state, 'contacts', data)
    s = _deep_copy(s)
    con_id = _generate_id('con')
    record = {
        'id': con_id,
        'name': data.get('name', 'Unnamed Contact'),
        'email': data.get('email', ''),
        'phone': data.get('phone', ''),
        'role': data.get('role', ''),
        'accountId': data.get('accountId', ''),
        'owner': data.get('owner', sender),
        'notes': [],
        'createdAt': _now_iso(),
    }
    for k, v in data.items():
        if k not in record:
            record[k] = v
    s['contacts'][con_id] = record
    return s


def _update_contact(state, data):
    con_id = data.get('id', '')
    if con_id not in state.get('contacts', {}):
        return state
    s = _learn_fields(state, 'contacts', data)
    s = _deep_copy(s)
    con = s['contacts'][con_id]
    for k, v in data.items():
        if k != 'id':
            con[k] = v
    con['updatedAt'] = _now_iso()
    return s


# --- CRUD: Opportunities ---

def _create_opportunity(state, data, sender):
    s = state
    stage = data.get('stage', 'prospecting')
    stages = s.get('_schema', {}).get('pipeline_stages', DEFAULT_PIPELINE)
    if stage not in stages:
        s = _ensure_pipeline_stage(s, stage)
    s = _learn_fields(s, 'opportunities', data)
    s = _deep_copy(s)
    opp_id = _generate_id('opp')
    probs = s.get('_schema', {}).get('stage_probabilities', DEFAULT_STAGE_PROBABILITIES)
    prob = data.get('probability', probs.get(stage, 0))
    record = {
        'id': opp_id,
        'name': data.get('name', 'Unnamed Opportunity'),
        'accountId': data.get('accountId', ''),
        'stage': stage,
        'value': data.get('value', 0),
        'probability': prob,
        'owner': data.get('owner', sender),
        'expected_close': data.get('expected_close', ''),
        'notes': [],
        'createdAt': _now_iso(),
    }
    for k, v in data.items():
        if k not in record:
            record[k] = v
    s['opportunities'][opp_id] = record
    return s


def _update_stage(state, data):
    opp_id = data.get('id', '')
    new_stage = data.get('stage', '')
    if opp_id not in state.get('opportunities', {}):
        return state
    s = state
    stages = s.get('_schema', {}).get('pipeline_stages', DEFAULT_PIPELINE)
    if new_stage not in stages:
        s = _ensure_pipeline_stage(s, new_stage)
    s = _deep_copy(s)
    opp = s['opportunities'][opp_id]
    if opp.get('stage') in ('closed_won', 'closed_lost'):
        return state
    opp['stage'] = new_stage
    probs = s.get('_schema', {}).get('stage_probabilities', DEFAULT_STAGE_PROBABILITIES)
    if new_stage in probs:
        opp['probability'] = probs[new_stage]
    opp['updatedAt'] = _now_iso()
    return s


def _close_deal(state, data):
    opp_id = data.get('id', '')
    if opp_id not in state.get('opportunities', {}):
        return state
    s = _deep_copy(state)
    opp = s['opportunities'][opp_id]
    won = data.get('won', False)
    opp['stage'] = 'closed_won' if won else 'closed_lost'
    opp['probability'] = 100 if won else 0
    if 'value' in data:
        opp['value'] = data['value']
    if 'reason' in data:
        opp['close_reason'] = data['reason']
    now = _now_iso()
    opp['closedAt'] = now
    opp['updatedAt'] = now
    return s


# --- Activities ---

def _log_activity(state, data, sender):
    s = state
    act_type = data.get('type', 'task')
    act_types = s.get('_schema', {}).get('activity_types', DEFAULT_ACTIVITY_TYPES)
    if act_type not in act_types:
        s = _ensure_activity_type(s, act_type)
    s = _deep_copy(s)
    act_id = _generate_id('act')
    record = {
        'id': act_id,
        'type': act_type,
        'subject': data.get('subject', ''),
        'regarding': data.get('regarding', ''),
        'regardingType': data.get('regardingType', ''),
        'status': data.get('status', 'open'),
        'owner': data.get('owner', sender),
        'notes': data.get('notes', ''),
        'createdAt': _now_iso(),
    }
    s['activities'].append(record)
    return s


# --- Notes ---

def _add_note(state, data, sender):
    entity_type = data.get('entityType', '')
    entity_id = data.get('entityId', '')
    text = data.get('text', '')
    singular_map = {'account': 'accounts', 'contact': 'contacts', 'opportunity': 'opportunities'}
    coll_name = singular_map.get(entity_type, entity_type)
    if not coll_name.endswith('s') and coll_name not in state:
        coll_name = coll_name + 's'
    coll = state.get(coll_name, {})
    if not isinstance(coll, dict) or entity_id not in coll:
        return state
    s = _deep_copy(state)
    entity = s[coll_name][entity_id]
    if 'notes' not in entity:
        entity['notes'] = []
    entity['notes'].append({
        'text': text,
        'author': sender,
        'ts': _now_iso(),
    })
    return s


# --- Action dispatch (with molting) ---

def apply_action(state, payload, sender='system'):
    """Apply a CRM action to state. Returns new state (does not mutate input)."""
    state = _deep_copy(state)
    # Ensure schema exists
    if '_schema' not in state:
        state['_schema'] = _deep_copy(DEFAULT_SCHEMA)
    if '_molt_log' not in state:
        state['_molt_log'] = []

    action = payload.get('action', '')
    data = payload.get('data', {})

    if not data.get('owner'):
        data['owner'] = sender

    if action == 'create_account':
        return _create_account(state, data, sender)
    elif action == 'update_account':
        return _update_account(state, data)
    elif action == 'create_contact':
        return _create_contact(state, data, sender)
    elif action == 'update_contact':
        return _update_contact(state, data)
    elif action == 'create_opportunity':
        return _create_opportunity(state, data, sender)
    elif action == 'update_stage':
        return _update_stage(state, data)
    elif action == 'close_deal':
        return _close_deal(state, data)
    elif action == 'log_activity':
        return _log_activity(state, data, sender)
    elif action == 'add_note':
        return _add_note(state, data, sender)
    else:
        # --- MOLT: handle unknown actions ---
        return _molt_for_action(state, action, data, sender)


# --- Metrics ---

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

    extra_collections = []
    schema = state.get('_schema', {})
    for coll_name in schema.get('collections', {}):
        if coll_name not in ('accounts', 'contacts', 'opportunities'):
            extra_collections.append(coll_name)

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
        'molt_count': len(state.get('_molt_log', [])),
        'extra_collections': extra_collections,
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
    if metrics['molt_count'] > 0:
        print('  Molts: %d | Extra collections: %s' % (
            metrics['molt_count'], ', '.join(metrics['extra_collections']) or 'none'))


if __name__ == '__main__':
    main()
