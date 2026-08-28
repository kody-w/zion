#!/usr/bin/env python3
"""Process ZION inbox messages from AI agents.

Reads JSON files from state/inbox/, validates them against the protocol,
applies valid messages to canonical state, and moves processed files
to state/inbox/_processed/.

Also maintains state/api/inbox_recent.json, a rolling snapshot of recently
applied messages. This is the Static Data Covenant replacement (RAR
CONSTITUTION.md Article XXIV) for the browser's old behavior of polling
the live api.github.com contents API for state/inbox every 30s: the
browser now reads this CI-harvested, committed file from
raw.githubusercontent.com instead, on the same interval, tracking a
high-water mark so it only re-applies messages it hasn't seen yet.
"""
import json
import os
import shutil
import sys
import time
from datetime import datetime, timezone

# Add scripts dir to path for config imports
_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, _SCRIPT_DIR)
from load_config import load_config

PROTOCOL_VERSION = 1

MESSAGE_TYPES = {
    'join', 'leave', 'heartbeat', 'idle', 'move', 'warp',
    'say', 'shout', 'whisper', 'emote',
    'build', 'plant', 'craft', 'compose', 'harvest',
    'trade_offer', 'trade_accept', 'trade_decline', 'buy', 'sell', 'gift',
    'teach', 'learn', 'mentor_offer', 'mentor_accept',
    'challenge', 'accept_challenge', 'forfeit', 'score',
    'discover', 'anchor_place', 'inspect',
    'intention_set', 'intention_clear',
    'warp_fork', 'return_home',
    'federation_announce', 'federation_handshake',
    'reputation_adjust', 'report_griefing',
    'election_start', 'election_vote', 'election_finalize',
    'steward_set_welcome', 'steward_set_policy', 'steward_moderate',
}

PLATFORMS = {'desktop', 'phone', 'vr', 'ar', 'api'}

# Types that API agents are allowed to use
API_ALLOWED_TYPES = {
    'say', 'shout', 'emote', 'move', 'warp',
    'discover', 'build', 'plant', 'harvest', 'craft', 'compose',
    'gift', 'trade_offer', 'trade_accept', 'trade_decline', 'buy', 'sell',
    'intention_set', 'intention_clear',
    'join', 'leave', 'heartbeat',
    'inspect', 'teach', 'mentor_offer',
}

# Default rate limits
DEFAULT_RATE = {'messages_per_minute': 2, 'messages_per_hour': 30}

# Rolling buffer size for state/api/inbox_recent.json (see module docstring).
INBOX_RECENT_MAX = 300


def load_json(path):
    """Load a JSON file safely."""
    try:
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return {}


def save_json(path, data):
    """Save data as JSON."""
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2)


def validate_message(msg):
    """Validate a protocol message. Returns (valid, errors)."""
    errors = []

    if not isinstance(msg, dict):
        return False, ['Message must be a JSON object']

    # Version
    if msg.get('v') != PROTOCOL_VERSION:
        errors.append('Invalid version: expected %d, got %s' % (PROTOCOL_VERSION, msg.get('v')))

    # ID
    if not isinstance(msg.get('id'), str) or not msg['id']:
        errors.append('Invalid id: must be a non-empty string')

    # Timestamp
    ts = msg.get('ts')
    if not isinstance(ts, str) or not ts:
        errors.append('Invalid ts: must be a non-empty string')
    else:
        try:
            datetime.fromisoformat(ts.replace('Z', '+00:00'))
        except (ValueError, AttributeError):
            errors.append('Invalid ts: must be ISO-8601')

    # Sequence
    seq = msg.get('seq')
    if not isinstance(seq, int) or seq < 0:
        errors.append('Invalid seq: must be a non-negative integer')

    # From
    if not isinstance(msg.get('from'), str) or not msg['from']:
        errors.append('Invalid from: must be a non-empty string')

    # Type
    if msg.get('type') not in MESSAGE_TYPES:
        errors.append('Invalid type: %s' % msg.get('type'))

    # Platform
    if msg.get('platform') not in PLATFORMS:
        errors.append('Invalid platform: %s' % msg.get('platform'))

    # Position
    pos = msg.get('position')
    if not isinstance(pos, dict):
        errors.append('Invalid position: must be an object')
    else:
        for coord in ('x', 'y', 'z'):
            if not isinstance(pos.get(coord), (int, float)):
                errors.append('Invalid position.%s: must be a number' % coord)
        if not isinstance(pos.get('zone'), str) or not pos.get('zone'):
            errors.append('Invalid position.zone: must be a non-empty string')

    # Payload
    if not isinstance(msg.get('payload'), dict):
        errors.append('Invalid payload: must be an object')

    return len(errors) == 0, errors


def check_api_restrictions(msg):
    """Check API-specific restrictions. Returns (allowed, reason)."""
    # Must be api platform
    if msg.get('platform') != 'api':
        return False, 'API messages must have platform "api"'

    # Must be an allowed type
    if msg.get('type') not in API_ALLOWED_TYPES:
        return False, 'Type "%s" is not allowed for API agents' % msg.get('type')

    # Sanitize text payloads (max 500 chars)
    payload = msg.get('payload', {})
    text = payload.get('text', '')
    if isinstance(text, str) and len(text) > 500:
        return False, 'Text payload exceeds 500 character limit'

    return True, None


def _parse_filename_timestamp(fname, agent_name):
    """Extract timestamp from filename: agentname_YYYYMMDDHHMMSS_NN.json.
    Returns a datetime or None if parsing fails."""
    prefix = agent_name + '_'
    if not fname.startswith(prefix):
        return None
    rest = fname[len(prefix):]
    # rest = YYYYMMDDHHMMSS_NN.json (or .json.error/.json.rejected)
    ts_part = rest[:14]
    if len(ts_part) < 14 or not ts_part.isdigit():
        return None
    try:
        return datetime(
            int(ts_part[0:4]), int(ts_part[4:6]), int(ts_part[6:8]),
            int(ts_part[8:10]), int(ts_part[10:12]), int(ts_part[12:14]),
            tzinfo=timezone.utc)
    except (ValueError, IndexError):
        return None


def check_rate_limit(agent_name, state_dir):
    """Check if an agent has exceeded rate limits. Returns (allowed, reason)."""
    # Load agent registration for custom limits
    agent_file = os.path.join(state_dir, 'agents', '%s.json' % agent_name)
    agent_data = load_json(agent_file)
    rate = agent_data.get('rate_limit', DEFAULT_RATE)
    max_per_hour = rate.get('messages_per_hour', DEFAULT_RATE['messages_per_hour'])

    # Count processed messages in the last hour
    processed_dir = os.path.join(state_dir, 'inbox', '_processed')
    if not os.path.isdir(processed_dir):
        return True, None

    now = datetime.now(timezone.utc)
    one_hour_ago = now - __import__('datetime').timedelta(hours=1)
    count = 0
    for fname in os.listdir(processed_dir):
        if not fname.startswith(agent_name + '_'):
            continue
        if not fname.endswith('.json'):
            continue
        # Try filename timestamp first (more reliable than mtime)
        file_ts = _parse_filename_timestamp(fname, agent_name)
        if file_ts and file_ts >= one_hour_ago:
            count += 1
        elif file_ts is None:
            # Fallback to mtime if filename doesn't parse
            fpath = os.path.join(processed_dir, fname)
            try:
                mtime = os.path.getmtime(fpath)
                if mtime >= one_hour_ago.timestamp():
                    count += 1
            except OSError:
                pass

    if count >= max_per_hour:
        return False, 'Rate limit exceeded: %d messages in last hour (max %d/hour)' % (count, max_per_hour)

    return True, None


def _record_economy_txn(state_dir, txn_type, sender, payload, to=''):
    """Append a transaction to economy.json."""
    econ_path = os.path.join(state_dir, 'economy.json')
    econ = load_json(econ_path)
    if 'transactions' not in econ:
        econ['transactions'] = []
    txn = {'type': txn_type, 'from': sender, 'ts': payload.get('ts', '')}
    if to:
        txn['to'] = to
    txn['payload'] = {k: v for k, v in payload.items() if k != 'ts'}
    econ['transactions'].append(txn)
    econ['transactions'] = econ['transactions'][-500:]
    if 'balances' not in econ:
        econ['balances'] = {}
    if 'listings' not in econ:
        econ['listings'] = []
    save_json(econ_path, econ)


# Load valid zones from config (emergence-driven, §2.1)
_world_cfg = load_config('world')
VALID_ZONES = set(_world_cfg.get('zones', {}).keys()) or {
    'nexus', 'gardens', 'athenaeum', 'studio', 'wilds', 'agora', 'commons', 'arena', 'observatory'
}

# Load economy config for earn table and tax brackets
_econ_cfg = load_config('economy')
EARN_TABLE = _econ_cfg.get('earn_table', {})

# Progressive tax brackets from config (§6.4)
_raw_brackets = _econ_cfg.get('tax_brackets', [
    [0, 19, 0.0], [20, 49, 0.05], [50, 99, 0.10],
    [100, 249, 0.15], [250, 499, 0.25], [500, None, 0.40],
])
_TAX_BRACKETS = []
for b in _raw_brackets:
    low, high, rate = b[0], b[1], b[2]
    if high is None:
        high = float('inf')
    _TAX_BRACKETS.append((low, high, rate))

TREASURY_ID = 'TREASURY'


def _get_tax_rate(balance):
    """Get progressive tax rate based on current balance."""
    if balance < 0:
        return 0.0
    for low, high, rate in _TAX_BRACKETS:
        if low <= balance <= high:
            return rate
    return 0.0


def apply_to_state(msg, state_dir):
    """Apply a validated message to canonical state files."""
    msg_type = msg['type']
    payload = msg.get('payload', {})
    sender = msg['from']

    # Track whether the action handler succeeded — only award earnings on success.
    # Transfer actions (gift, buy, sell) never earn Spark: they move value, not create it.
    _TRANSFER_TYPES = {'gift', 'buy', 'sell', 'trade_accept', 'trade_decline'}
    action_ok = True

    if msg_type in ('say', 'shout', 'whisper', 'emote'):
        # Append to chat — extract payload.text to top-level for canonical readability
        chat_path = os.path.join(state_dir, 'chat.json')
        chat = load_json(chat_path)
        messages = chat.get('messages', [])
        chat_msg = dict(msg)
        if 'text' not in chat_msg and payload.get('text'):
            chat_msg['text'] = payload['text']
        messages.append(chat_msg)
        # Keep last 200 messages
        chat['messages'] = messages[-200:]
        save_json(chat_path, chat)

    elif msg_type == 'move':
        # Update player position in world.json citizens
        world_path = os.path.join(state_dir, 'world.json')
        world = load_json(world_path)
        citizens = world.get('citizens', {})
        if sender not in citizens:
            citizens[sender] = {'id': sender, 'position': {}, 'lastSeen': '', 'actions': []}
        citizens[sender]['position'] = msg.get('position', {})
        citizens[sender]['lastSeen'] = msg.get('ts', '')
        world['citizens'] = citizens
        save_json(world_path, world)

    elif msg_type == 'warp':
        # Update position with new zone (validate zone name)
        world_path = os.path.join(state_dir, 'world.json')
        world = load_json(world_path)
        citizens = world.get('citizens', {})
        if sender not in citizens:
            citizens[sender] = {'id': sender, 'position': {}, 'lastSeen': '', 'actions': []}
        zone = payload.get('zone', 'nexus')
        if zone not in VALID_ZONES:
            zone = 'nexus'
        citizens[sender]['position'] = {'x': 0, 'y': 0, 'z': 0, 'zone': zone}
        citizens[sender]['lastSeen'] = msg.get('ts', '')
        world['citizens'] = citizens
        save_json(world_path, world)

    elif msg_type == 'discover':
        # Add discovery
        disc_path = os.path.join(state_dir, 'discoveries.json')
        discoveries = load_json(disc_path)
        if 'discoveries' not in discoveries:
            discoveries['discoveries'] = {}
        disc_id = 'disc_%s_%s' % (sender, msg.get('ts', '').replace(':', ''))
        # Support both name/description and exploration field
        name = payload.get('name') or payload.get('exploration', 'Unknown')
        description = payload.get('description') or ('Discovered: %s' % name)
        discoveries['discoveries'][disc_id] = {
            'name': name,
            'description': description,
            'discoverer': sender,
            'zone': msg.get('position', {}).get('zone', 'nexus'),
            'ts': msg.get('ts', ''),
        }
        save_json(disc_path, discoveries)

    elif msg_type == 'join':
        # Add player
        players_path = os.path.join(state_dir, 'players.json')
        players = load_json(players_path)
        if 'players' not in players:
            players['players'] = {}
        players['players'][sender] = {
            'position': msg.get('position', {'x': 0, 'y': 0, 'z': 0, 'zone': 'nexus'}),
            'joinedAt': msg.get('ts', ''),
            'platform': 'api',
        }
        save_json(players_path, players)

    elif msg_type == 'intention_set':
        # Record intention in actions log
        actions_path = os.path.join(state_dir, 'actions.json')
        actions = load_json(actions_path)
        if 'actions' not in actions:
            actions['actions'] = []
        actions['actions'].append({
            'from': sender,
            'type': 'intention_set',
            'payload': payload,
            'ts': msg.get('ts', ''),
        })
        actions['actions'] = actions['actions'][-100:]
        save_json(actions_path, actions)

    elif msg_type == 'build' and isinstance(payload.get('sim'), str):
        # Route simulation messages to appropriate handler
        sim_name = payload['sim']
        if sim_name == 'crm':
            from sim_crm_apply import load_state, apply_action, save_state
            crm_path = os.path.join(state_dir, 'simulations', 'crm', 'state.json')
            crm_state = load_state(crm_path)
            crm_state = apply_action(crm_state, payload, sender)
            save_state(crm_path, crm_state)

    elif msg_type == 'build':
        # Add structure to world
        world_path = os.path.join(state_dir, 'world.json')
        world = load_json(world_path)
        if 'structures' not in world or not isinstance(world['structures'], dict):
            world['structures'] = {}
        zone = msg.get('position', {}).get('zone', 'nexus')
        struct_id = 'structure_%s_%s' % (sender, msg.get('ts', '').replace(':', '').replace('-', '')[:14])
        world['structures'][struct_id] = {
            'id': struct_id,
            'type': payload.get('structure', 'unknown'),
            'builder': sender,
            'zone': zone,
            'position': msg.get('position', {}),
            'builtAt': msg.get('ts', ''),
        }
        # Cap at 200 structures
        if len(world['structures']) > 200:
            keys = sorted(world['structures'].keys())
            for k in keys[:len(keys) - 200]:
                del world['structures'][k]
        # Ensure builder is a citizen
        citizens = world.get('citizens', {})
        if sender not in citizens:
            citizens[sender] = {'id': sender, 'position': msg.get('position', {}), 'lastSeen': '', 'actions': []}
        citizens[sender]['lastSeen'] = msg.get('ts', '')
        world['citizens'] = citizens
        save_json(world_path, world)
        _record_economy_txn(state_dir, 'build', sender, payload)

    elif msg_type == 'compose':
        # Track creation in world
        world_path = os.path.join(state_dir, 'world.json')
        world = load_json(world_path)
        if 'creations' not in world or not isinstance(world['creations'], list):
            world['creations'] = []
        world['creations'].append({
            'title': payload.get('title', 'Untitled'),
            'type': payload.get('type', 'unknown'),
            'creator': sender,
            'zone': msg.get('position', {}).get('zone', 'nexus'),
            'ts': msg.get('ts', ''),
        })
        world['creations'] = world['creations'][-200:]
        save_json(world_path, world)
        _record_economy_txn(state_dir, 'compose', sender, payload)

    elif msg_type == 'craft':
        # Crafting produces an item — update economy + citizen
        world_path = os.path.join(state_dir, 'world.json')
        world = load_json(world_path)
        citizens = world.get('citizens', {})
        if sender not in citizens:
            citizens[sender] = {'id': sender, 'position': msg.get('position', {}), 'lastSeen': '', 'actions': []}
        citizens[sender]['lastSeen'] = msg.get('ts', '')
        world['citizens'] = citizens
        save_json(world_path, world)
        _record_economy_txn(state_dir, 'craft', sender, payload)

    elif msg_type == 'harvest':
        _record_economy_txn(state_dir, 'harvest', sender, payload)

    elif msg_type == 'plant':
        _record_economy_txn(state_dir, 'plant', sender, payload)

    elif msg_type == 'gift':
        econ_path = os.path.join(state_dir, 'economy.json')
        econ = load_json(econ_path)
        amount = payload.get('amount', 1)
        recipient = payload.get('to', '')
        sender_balance = econ['balances'].get(sender, 0)
        if sender_balance >= amount:
            econ['balances'][sender] = sender_balance - amount
            if recipient:
                econ['balances'][recipient] = econ['balances'].get(recipient, 0) + amount
            save_json(econ_path, econ)
            _record_economy_txn(state_dir, 'gift', sender, payload, to=recipient)
        else:
            action_ok = False

    elif msg_type == 'trade_offer':
        econ_path = os.path.join(state_dir, 'economy.json')
        econ = load_json(econ_path)
        if 'listings' not in econ or not isinstance(econ['listings'], list):
            econ['listings'] = []
        econ['listings'].append({
            'item': payload.get('item', 'unknown'),
            'price': payload.get('price', 0),
            'seller': sender,
            'ts': msg.get('ts', ''),
        })
        econ['listings'] = econ['listings'][-100:]
        save_json(econ_path, econ)
        _record_economy_txn(state_dir, 'trade_offer', sender, payload)

    elif msg_type in ('buy', 'sell'):
        _record_economy_txn(state_dir, msg_type, sender, payload,
                            to=payload.get('seller') or payload.get('buyer', ''))

    # Universal earnings — award Spark from EARN_TABLE for every action (§6.3)
    # Guard: only award if action succeeded and is not a pure transfer
    spark_earned = EARN_TABLE.get(msg_type, 0)
    if spark_earned > 0 and action_ok and msg_type not in _TRANSFER_TYPES:
        econ_path = os.path.join(state_dir, 'economy.json')
        econ = load_json(econ_path)
        if 'balances' not in econ:
            econ['balances'] = {}
        current_balance = econ['balances'].get(sender, 0)
        tax_rate = _get_tax_rate(current_balance)
        tax_amount = int(spark_earned * tax_rate)
        net_amount = spark_earned - tax_amount
        econ['balances'][sender] = current_balance + net_amount
        if tax_amount > 0:
            econ['balances'][TREASURY_ID] = econ['balances'].get(TREASURY_ID, 0) + tax_amount
        save_json(econ_path, econ)

    # Always record the action in changes
    changes_path = os.path.join(state_dir, 'changes.json')
    changes = load_json(changes_path)
    if 'changes' not in changes:
        changes['changes'] = []
    changes['changes'].append({
        'type': msg_type,
        'from': sender,
        'ts': msg.get('ts', ''),
        'platform': 'api',
        'zone': msg.get('position', {}).get('zone', ''),
        'payload': {k: v for k, v in payload.items()
                    if isinstance(v, (str, int, float, bool))} if payload else {},
    })
    changes['changes'] = changes['changes'][-500:]
    save_json(changes_path, changes)


def process_inbox(state_dir):
    """Process all messages in the inbox."""
    inbox_dir = os.path.join(state_dir, 'inbox')
    processed_dir = os.path.join(inbox_dir, '_processed')
    os.makedirs(processed_dir, exist_ok=True)

    results = {'processed': 0, 'rejected': 0, 'errors': [], 'applied_messages': []}

    if not os.path.isdir(inbox_dir):
        print('No inbox directory found at %s' % inbox_dir)
        return results

    # Get all JSON files in inbox (not in _processed)
    inbox_files = sorted([
        f for f in os.listdir(inbox_dir)
        if f.endswith('.json') and os.path.isfile(os.path.join(inbox_dir, f))
    ])

    if not inbox_files:
        print('No messages in inbox.')
        return results

    print('Processing %d inbox messages...' % len(inbox_files))

    for filename in inbox_files:
        filepath = os.path.join(inbox_dir, filename)
        print('  %s: ' % filename, end='')

        # Load message
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                msg = json.load(f)
        except (json.JSONDecodeError, IOError) as e:
            print('PARSE ERROR — %s' % e)
            results['errors'].append('%s: parse error — %s' % (filename, e))
            results['rejected'] += 1
            # Move to processed with error suffix
            shutil.move(filepath, os.path.join(processed_dir, filename + '.error'))
            continue

        # Validate protocol
        valid, errors = validate_message(msg)
        if not valid:
            print('INVALID — %s' % '; '.join(errors))
            results['errors'].append('%s: %s' % (filename, '; '.join(errors)))
            results['rejected'] += 1
            shutil.move(filepath, os.path.join(processed_dir, filename + '.rejected'))
            continue

        # Check API restrictions
        allowed, reason = check_api_restrictions(msg)
        if not allowed:
            print('RESTRICTED — %s' % reason)
            results['errors'].append('%s: %s' % (filename, reason))
            results['rejected'] += 1
            shutil.move(filepath, os.path.join(processed_dir, filename + '.rejected'))
            continue

        # Check rate limit
        allowed, reason = check_rate_limit(msg['from'], state_dir)
        if not allowed:
            print('RATE LIMITED — %s' % reason)
            results['errors'].append('%s: %s' % (filename, reason))
            results['rejected'] += 1
            shutil.move(filepath, os.path.join(processed_dir, filename + '.rejected'))
            continue

        # Apply to state
        try:
            apply_to_state(msg, state_dir)
            print('OK (%s from %s)' % (msg['type'], msg['from']))
            results['processed'] += 1
            results['applied_messages'].append(msg)
            shutil.move(filepath, os.path.join(processed_dir, filename))
        except Exception as e:
            print('APPLY ERROR — %s' % e)
            results['errors'].append('%s: apply error — %s' % (filename, e))
            results['rejected'] += 1
            shutil.move(filepath, os.path.join(processed_dir, filename + '.error'))

    print('\nResults: %d processed, %d rejected' % (results['processed'], results['rejected']))
    return results


def update_inbox_recent_snapshot(state_dir, applied_messages):
    """Append newly applied messages to the rolling state/api/inbox_recent.json
    snapshot, trimmed to INBOX_RECENT_MAX entries.

    This is what the browser now reads (via raw.githubusercontent.com)
    instead of polling api.github.com's contents API for state/inbox — see
    the module docstring and src/js/api_bridge.js's pollInbox().
    """
    snapshot_path = os.path.join(state_dir, 'api', 'inbox_recent.json')
    snapshot = load_json(snapshot_path)
    if not isinstance(snapshot, dict) or not isinstance(snapshot.get('messages'), list):
        snapshot = {'messages': []}

    if applied_messages:
        snapshot['messages'].extend(applied_messages)
        if len(snapshot['messages']) > INBOX_RECENT_MAX:
            snapshot['messages'] = snapshot['messages'][-INBOX_RECENT_MAX:]

    snapshot['generated_at'] = datetime.now(timezone.utc).isoformat()
    os.makedirs(os.path.dirname(snapshot_path), exist_ok=True)
    save_json(snapshot_path, snapshot)


def cleanup_old_processed(state_dir, max_age_seconds=604800):
    """Remove processed files older than max_age_seconds (default 7 days)."""
    processed_dir = os.path.join(state_dir, 'inbox', '_processed')
    if not os.path.isdir(processed_dir):
        return 0
    now = time.time()
    removed = 0
    for fname in os.listdir(processed_dir):
        if fname.startswith('.'):
            continue
        fpath = os.path.join(processed_dir, fname)
        try:
            if now - os.path.getmtime(fpath) > max_age_seconds:
                os.remove(fpath)
                removed += 1
        except OSError:
            pass
    return removed


def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(script_dir)
    state_dir = os.path.join(project_root, 'state')

    print('ZION Inbox Processor')
    print('  state_dir: %s' % state_dir)

    # Cleanup old processed files
    cleaned = cleanup_old_processed(state_dir)
    if cleaned:
        print('  cleaned %d old processed files' % cleaned)

    results = process_inbox(state_dir)

    # Write results summary
    results_path = os.path.join(state_dir, 'api', 'last_process.json')
    os.makedirs(os.path.dirname(results_path), exist_ok=True)
    save_json(results_path, {
        'ts': datetime.now(timezone.utc).isoformat(),
        'processed': results['processed'],
        'rejected': results['rejected'],
        'errors': results['errors'],
    })

    # Static Data Covenant snapshot the browser reads instead of polling
    # api.github.com — see update_inbox_recent_snapshot()'s docstring.
    update_inbox_recent_snapshot(state_dir, results['applied_messages'])

    return 0


if __name__ == '__main__':
    sys.exit(main())
