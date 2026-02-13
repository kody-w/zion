#!/usr/bin/env python3
"""State sync: merge inbox messages into canonical state files."""
import json
import sys
import os
import glob
from datetime import datetime


def parse_timestamp(ts_string):
    """Parse ISO-8601 timestamp string to datetime object."""
    try:
        # Handle both with and without 'Z' suffix
        clean_ts = ts_string.replace('Z', '+00:00')
        return datetime.fromisoformat(clean_ts)
    except (ValueError, AttributeError):
        return datetime.min


def merge_message_into_state(state, message):
    """
    Merge a protocol message into state using last-writer-wins.

    Args:
        state: current state dict
        message: protocol message to merge

    Returns:
        Updated state dict
    """
    msg_type = message.get('type')
    msg_from = message.get('from')
    msg_ts = message.get('ts')
    payload = message.get('payload', {})

    if not msg_type or not msg_from:
        return state

    # Initialize state structures if needed
    if 'citizens' not in state:
        state['citizens'] = {}

    if 'lastUpdate' not in state:
        state['lastUpdate'] = {}

    # Track citizen
    if msg_from not in state['citizens']:
        state['citizens'][msg_from] = {
            'id': msg_from,
            'position': message.get('position', {}),
            'lastSeen': msg_ts,
            'actions': []
        }

    citizen = state['citizens'][msg_from]

    # Update last seen timestamp
    citizen_ts = parse_timestamp(citizen.get('lastSeen', ''))
    msg_timestamp = parse_timestamp(msg_ts)

    if msg_timestamp > citizen_ts:
        citizen['lastSeen'] = msg_ts

    # Process type-specific updates
    if msg_type == 'move':
        if 'destination' in payload:
            citizen['position'] = payload['destination']

    elif msg_type == 'plant':
        if 'gardens' not in state:
            state['gardens'] = {}

        plot_id = payload.get('plot')
        if plot_id:
            if plot_id not in state['gardens']:
                state['gardens'][plot_id] = {'plants': []}

            state['gardens'][plot_id]['plants'].append({
                'species': payload.get('species'),
                'plantedBy': msg_from,
                'plantedAt': msg_ts,
                'growthStage': 0.0,
                'growthTime': 3600
            })

    elif msg_type == 'build':
        if 'structures' not in state:
            state['structures'] = {}

        structure_id = f"structure_{msg_from}_{int(datetime.now().timestamp())}"
        state['structures'][structure_id] = {
            'id': structure_id,
            'type': payload.get('structure'),
            'builder': msg_from,
            'builtAt': msg_ts,
            'position': message.get('position')
        }

    elif msg_type == 'craft':
        if 'inventory' not in citizen:
            citizen['inventory'] = []

        citizen['inventory'].append({
            'item': payload.get('recipe'),
            'craftedAt': msg_ts
        })

    elif msg_type == 'intention_set':
        citizen['currentIntention'] = payload.get('intention')

    elif msg_type == 'intention_clear':
        citizen.pop('currentIntention', None)

    # Record action
    if 'actions' not in citizen:
        citizen['actions'] = []

    citizen['actions'].append({
        'type': msg_type,
        'timestamp': msg_ts,
        'payload': payload
    })

    # Keep only last 100 actions per citizen
    if len(citizen['actions']) > 100:
        citizen['actions'] = citizen['actions'][-100:]

    return state


def sync_inbox_files(inbox_dir, state_dir):
    """
    Process all files in inbox and merge into canonical state.

    Args:
        inbox_dir: path to inbox directory
        state_dir: path to state directory

    Returns:
        Summary dict
    """
    summary = {
        'processed': 0,
        'errors': 0,
        'messages': 0,
        'files_deleted': 0
    }

    # Load current state
    state_file = os.path.join(state_dir, 'world.json')
    if os.path.exists(state_file):
        with open(state_file, 'r') as f:
            state = json.load(f)
    else:
        state = {
            'version': 1,
            'citizens': {},
            'lastUpdate': {}
        }

    # Process inbox files
    inbox_pattern = os.path.join(inbox_dir, '*.json')
    inbox_files = glob.glob(inbox_pattern)

    for filepath in inbox_files:
        try:
            with open(filepath, 'r') as f:
                data = json.load(f)

            # Handle both single messages and arrays
            messages = data if isinstance(data, list) else [data]

            for message in messages:
                if isinstance(message, dict):
                    state = merge_message_into_state(state, message)
                    summary['messages'] += 1

            summary['processed'] += 1

            # Delete processed file
            os.remove(filepath)
            summary['files_deleted'] += 1

        except json.JSONDecodeError as e:
            print(f"Error parsing {filepath}: {e}", file=sys.stderr)
            summary['errors'] += 1
        except Exception as e:
            print(f"Error processing {filepath}: {e}", file=sys.stderr)
            summary['errors'] += 1

    # Write updated state
    with open(state_file, 'w') as f:
        json.dump(state, f, indent=2)

    return summary


def main():
    """Main entry point: sync inbox files to canonical state."""
    base_dir = '/Users/kodyw/Projects/Zion/state'
    inbox_dir = os.path.join(base_dir, 'inbox')
    state_dir = base_dir

    # Create inbox directory if it doesn't exist
    os.makedirs(inbox_dir, exist_ok=True)

    # Sync files
    summary = sync_inbox_files(inbox_dir, state_dir)

    # Print summary
    print("State sync complete:")
    print(f"  Files processed: {summary['processed']}")
    print(f"  Messages merged: {summary['messages']}")
    print(f"  Files deleted: {summary['files_deleted']}")
    print(f"  Errors: {summary['errors']}")

    sys.exit(0 if summary['errors'] == 0 else 1)


if __name__ == '__main__':
    main()
