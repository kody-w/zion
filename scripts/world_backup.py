#!/usr/bin/env python3
"""world_backup.py — Freeze, list, and restore ZION world state.

Usage:
    python3 scripts/world_backup.py freeze              # snapshot → state/snapshots/YYYY-MM-DD.json
    python3 scripts/world_backup.py freeze --tag v1.0    # snapshot → state/snapshots/v1.0.json
    python3 scripts/world_backup.py list                 # list all snapshots
    python3 scripts/world_backup.py restore 2026-02-28   # restore from date-keyed snapshot
    python3 scripts/world_backup.py restore latest        # restore from latest.json
    python3 scripts/world_backup.py diff 2026-02-27 2026-02-28  # compare two snapshots
"""
import argparse
import json
import os
import sys
from datetime import datetime, timezone

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
STATE_DIR = os.path.join(SCRIPT_DIR, '..', 'state')
SNAPSHOTS_DIR = os.path.join(STATE_DIR, 'snapshots')

# All JSON state files to include in snapshots
STATE_FILES = [
    'world.json', 'economy.json', 'players.json', 'chat.json',
    'changes.json', 'structures.json', 'gardens.json', 'discoveries.json',
    'actions.json', 'amendments.json', 'anchors.json', 'competitions.json',
    'federation.json', 'guilds.json', 'mentoring.json', 'pets.json',
    'reputation.json',
]


def freeze(tag=None):
    """Snapshot every JSON file in state/ into a single dated archive."""
    os.makedirs(SNAPSHOTS_DIR, exist_ok=True)

    now = datetime.now(timezone.utc)
    snapshot = {
        '_snapshot_ts': now.isoformat(),
        '_snapshot_tag': tag or now.strftime('%Y-%m-%d'),
        '_snapshot_files': [],
    }

    total_size = 0
    for filename in STATE_FILES:
        filepath = os.path.join(STATE_DIR, filename)
        if not os.path.isfile(filepath):
            continue
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                data = json.load(f)
            key = filename.replace('.json', '')
            snapshot[key] = data
            snapshot['_snapshot_files'].append(filename)
            total_size += os.path.getsize(filepath)
        except (json.JSONDecodeError, IOError) as e:
            print(f'  Warning: skipping {filename}: {e}', file=sys.stderr)

    # Save with date key or tag
    name = tag if tag else now.strftime('%Y-%m-%d')
    output_path = os.path.join(SNAPSHOTS_DIR, f'{name}.json')

    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(snapshot, f)

    snap_size = os.path.getsize(output_path)
    print(f'❄️  World frozen to {output_path}')
    print(f'   {len(snapshot["_snapshot_files"])} files captured ({total_size:,} → {snap_size:,} bytes)')
    print(f'   Tag: {name}')
    print(f'   Timestamp: {snapshot["_snapshot_ts"]}')
    return output_path


def list_snapshots():
    """List all available snapshots with metadata."""
    if not os.path.isdir(SNAPSHOTS_DIR):
        print('No snapshots directory found.')
        return []

    snapshots = []
    for f in sorted(os.listdir(SNAPSHOTS_DIR)):
        if not f.endswith('.json') or f == '.gitkeep':
            continue
        path = os.path.join(SNAPSHOTS_DIR, f)
        size = os.path.getsize(path)
        # Try to read timestamp without loading full file
        ts = '?'
        try:
            with open(path, 'r') as fh:
                # Read just enough to get the timestamp
                chunk = fh.read(200)
                if '_snapshot_ts' in chunk:
                    import re
                    m = re.search(r'"_snapshot_ts":\s*"([^"]+)"', chunk)
                    if m:
                        ts = m.group(1)[:19]
        except Exception:
            pass

        snapshots.append({'name': f.replace('.json', ''), 'file': f, 'size': size, 'ts': ts})

    if not snapshots:
        print('No snapshots found.')
        return []

    print(f'📦 {len(snapshots)} snapshot(s) in state/snapshots/\n')
    print(f'  {"Name":<20} {"Size":>10}  {"Timestamp":<20}')
    print(f'  {"─" * 20} {"─" * 10}  {"─" * 20}')
    for s in snapshots:
        size_str = f'{s["size"]:,}'
        print(f'  {s["name"]:<20} {size_str:>10}  {s["ts"]:<20}')

    return snapshots


def restore(name):
    """Restore world state from a snapshot.

    This overwrites all JSON files in state/ with the snapshot's data.
    A pre-restore backup is automatically taken first.
    """
    # Find the snapshot file
    snap_path = os.path.join(SNAPSHOTS_DIR, f'{name}.json')
    if not os.path.isfile(snap_path):
        print(f'❌ Snapshot not found: {snap_path}', file=sys.stderr)
        print(f'   Run "python3 scripts/world_backup.py list" to see available snapshots.')
        sys.exit(1)

    # Load snapshot
    with open(snap_path, 'r', encoding='utf-8') as f:
        snapshot = json.load(f)

    snap_ts = snapshot.get('_snapshot_ts', '?')
    snap_files = snapshot.get('_snapshot_files', [])
    snap_tag = snapshot.get('_snapshot_tag', name)

    print(f'⏪ Restoring from snapshot: {name}')
    print(f'   Timestamp: {snap_ts}')
    print(f'   Files: {len(snap_files)}')

    # Safety: take a pre-restore backup
    pre_restore_tag = f'pre-restore-{datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S")}'
    print(f'\n   Taking safety backup first → {pre_restore_tag}')
    freeze(tag=pre_restore_tag)

    # Restore each state file
    restored = 0
    for filename in STATE_FILES:
        key = filename.replace('.json', '')
        if key not in snapshot:
            continue

        filepath = os.path.join(STATE_DIR, filename)
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(snapshot[key], f, indent=2)
            f.write('\n')
        restored += 1
        print(f'   ✅ {filename}')

    print(f'\n🔄 Restored {restored} files from snapshot "{snap_tag}"')
    print(f'   Safety backup: state/snapshots/{pre_restore_tag}.json')
    return restored


def diff_snapshots(name_a, name_b):
    """Compare two snapshots and show what changed."""
    path_a = os.path.join(SNAPSHOTS_DIR, f'{name_a}.json')
    path_b = os.path.join(SNAPSHOTS_DIR, f'{name_b}.json')

    for p, n in [(path_a, name_a), (path_b, name_b)]:
        if not os.path.isfile(p):
            print(f'❌ Snapshot not found: {n}', file=sys.stderr)
            sys.exit(1)

    with open(path_a) as f:
        snap_a = json.load(f)
    with open(path_b) as f:
        snap_b = json.load(f)

    print(f'📊 Diff: {name_a} → {name_b}\n')
    print(f'   {"A":>6}: {snap_a.get("_snapshot_ts", "?")}')
    print(f'   {"B":>6}: {snap_b.get("_snapshot_ts", "?")}\n')

    for filename in STATE_FILES:
        key = filename.replace('.json', '')
        a_data = snap_a.get(key)
        b_data = snap_b.get(key)

        if a_data is None and b_data is None:
            continue

        a_str = json.dumps(a_data, sort_keys=True) if a_data else ''
        b_str = json.dumps(b_data, sort_keys=True) if b_data else ''

        if a_str == b_str:
            print(f'   {"=":<2} {filename}')
        else:
            a_size = len(a_str)
            b_size = len(b_str)
            delta = b_size - a_size
            sign = '+' if delta > 0 else ''
            print(f'   {"Δ":<2} {filename:<25} {sign}{delta:,} bytes')

            # Show specific changes for known structures
            if key == 'economy' and isinstance(a_data, dict) and isinstance(b_data, dict):
                a_bals = a_data.get('balances', {})
                b_bals = b_data.get('balances', {})
                a_total = sum(v for v in a_bals.values() if isinstance(v, (int, float)))
                b_total = sum(v for v in b_bals.values() if isinstance(v, (int, float)))
                print(f'      Total Spark: {a_total:,} → {b_total:,} ({b_total - a_total:+,})')

            if key == 'players' and isinstance(a_data, dict) and isinstance(b_data, dict):
                a_count = len(a_data.get('players', {}))
                b_count = len(b_data.get('players', {}))
                if a_count != b_count:
                    print(f'      Players: {a_count} → {b_count}')


def main():
    parser = argparse.ArgumentParser(
        description='ZION World Backup — freeze, list, restore, diff'
    )
    sub = parser.add_subparsers(dest='command')

    # freeze
    freeze_p = sub.add_parser('freeze', help='Snapshot current world state')
    freeze_p.add_argument('--tag', '-t', help='Custom tag name (default: YYYY-MM-DD)')

    # list
    sub.add_parser('list', help='List available snapshots')

    # restore
    restore_p = sub.add_parser('restore', help='Restore world from a snapshot')
    restore_p.add_argument('name', help='Snapshot name (e.g., 2026-02-28 or latest)')

    # diff
    diff_p = sub.add_parser('diff', help='Compare two snapshots')
    diff_p.add_argument('a', help='First snapshot name')
    diff_p.add_argument('b', help='Second snapshot name')

    args = parser.parse_args()

    if args.command == 'freeze':
        freeze(tag=args.tag)
    elif args.command == 'list':
        list_snapshots()
    elif args.command == 'restore':
        restore(args.name)
    elif args.command == 'diff':
        diff_snapshots(args.a, args.b)
    else:
        parser.print_help()


if __name__ == '__main__':
    main()
