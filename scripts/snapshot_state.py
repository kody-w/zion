#!/usr/bin/env python3
"""snapshot_state.py — Capture a snapshot of the current ZION world state.

Reads key state files and merges them into a single composite snapshot JSON
file for later diffing with world_diff.py / world_news.py.

Usage:
    python3 scripts/snapshot_state.py
    python3 scripts/snapshot_state.py --output state/snapshots/latest.json
    python3 scripts/snapshot_state.py --state-dir /path/to/state --output out.json
"""

import argparse
import json
import os
import sys
from datetime import datetime, timezone

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

# State files to include in each snapshot, keyed by snapshot top-level key
STATE_FILES = {
    'world': 'world.json',
    'economy': 'economy.json',
    'gardens': 'gardens.json',
    'structures': 'structures.json',
    'chat': 'chat.json',
    'federation': 'federation.json',
    'players': 'players.json',
    'actions': 'actions.json',
}

DEFAULT_STATE_DIR = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), '..', 'state'
)
DEFAULT_SNAPSHOTS_DIR = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), '..', 'state', 'snapshots'
)


# ---------------------------------------------------------------------------
# snapshot_state
# ---------------------------------------------------------------------------

def snapshot_state(state_dir=None):
    """Read key state files and return a merged composite state dict.

    Parameters
    ----------
    state_dir : str or None
        Path to the state directory. Defaults to <project_root>/state.

    Returns
    -------
    dict
        Composite snapshot with top-level keys for each state file:
        world, economy, gardens, structures, chat, federation, players, actions.
        Missing files are silently omitted.
        A '_snapshot_ts' key is added with the current UTC timestamp.
        A '_snapshot_files' key lists which files were successfully loaded.
    """
    if state_dir is None:
        state_dir = DEFAULT_STATE_DIR

    state_dir = os.path.abspath(state_dir)

    snapshot = {
        '_snapshot_ts': datetime.now(timezone.utc).isoformat(),
        '_snapshot_files': [],
    }

    for key, filename in STATE_FILES.items():
        filepath = os.path.join(state_dir, filename)
        if os.path.isfile(filepath):
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                snapshot[key] = data
                snapshot['_snapshot_files'].append(filename)
            except (json.JSONDecodeError, IOError, OSError) as e:
                # Log but don't fail — partial snapshots are still useful
                print(
                    'Warning: could not read {}: {}'.format(filepath, e),
                    file=sys.stderr
                )
        # Silently skip missing files

    return snapshot


# ---------------------------------------------------------------------------
# save_snapshot
# ---------------------------------------------------------------------------

def save_snapshot(snapshot, output_path):
    """Write a snapshot dict to a JSON file.

    Parameters
    ----------
    snapshot : dict
        Snapshot as returned by snapshot_state().
    output_path : str
        Destination file path.

    Returns
    -------
    str
        The resolved absolute output path.
    """
    output_path = os.path.abspath(output_path)
    parent = os.path.dirname(output_path)
    if parent and not os.path.isdir(parent):
        os.makedirs(parent, exist_ok=True)

    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(snapshot, f, indent=2)
        f.write('\n')

    return output_path


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description='Snapshot the current ZION world state to a single JSON file.'
    )
    parser.add_argument(
        '--output', '-o',
        default=None,
        help=(
            'Output path for the snapshot JSON file. '
            'Defaults to state/snapshots/{timestamp}.json'
        )
    )
    parser.add_argument(
        '--state-dir', '-s',
        default=None,
        help='Path to the state directory. Defaults to <project>/state'
    )
    args = parser.parse_args()

    state_dir = args.state_dir
    snapshot = snapshot_state(state_dir=state_dir)

    if args.output:
        output_path = args.output
    else:
        # Default: state/snapshots/{timestamp}.json
        ts_safe = snapshot['_snapshot_ts'].replace(':', '').replace('+', 'p').replace('.', 'd')
        output_filename = '{}.json'.format(ts_safe)
        output_path = os.path.join(DEFAULT_SNAPSHOTS_DIR, output_filename)

    saved_path = save_snapshot(snapshot, output_path)
    print('Snapshot saved to: {}'.format(saved_path))
    print('Files captured: {}'.format(', '.join(snapshot['_snapshot_files'])))

    return saved_path


if __name__ == '__main__':
    main()
