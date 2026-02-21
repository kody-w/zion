#!/usr/bin/env python3
"""world_diff.py — World Diff narrative tool for ZION.

Compares two JSON state snapshots and generates a human-readable narrative
of what changed in the world.

Usage:
    python3 scripts/world_diff.py before.json after.json
    python3 scripts/world_diff.py state_dir_before/ state_dir_after/

API:
    diff = diff_states(before_dict, after_dict)
    narrative = narrate_diff(diff)
    diff = diff_files(path_before, path_after)
"""

import json
import os
import sys

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

ZONE_NAMES = {
    'nexus': 'the Nexus',
    'gardens': 'the Gardens',
    'athenaeum': 'the Athenaeum',
    'studio': 'the Studio',
    'wilds': 'the Wilds',
    'agora': 'the Agora',
    'commons': 'the Commons',
    'arena': 'the Arena',
    'observatory': 'the Observatory',
}

# ---------------------------------------------------------------------------
# Loading helpers
# ---------------------------------------------------------------------------

def _load_json_file(path):
    """Load a single JSON file and return the parsed dict."""
    with open(path, 'r') as f:
        return json.load(f)


def _load_state_from_path(path):
    """Load state from a file or directory.

    If path is a directory, look for known state JSON files and merge them
    into a composite state dict keyed by filename stem.

    If path is a single JSON file, load it as-is (it may already be a
    composite state dict or a single-category dict — we try to detect).
    """
    if os.path.isdir(path):
        known_files = {
            'economy': 'economy.json',
            'gardens': 'gardens.json',
            'structures': 'structures.json',
            'chat': 'chat.json',
            'federation': 'federation.json',
            'players': 'players.json',
            'world': 'world.json',
            'actions': 'actions.json',
        }
        state = {}
        for key, filename in known_files.items():
            filepath = os.path.join(path, filename)
            if os.path.isfile(filepath):
                state[key] = _load_json_file(filepath)
        return state
    else:
        return _load_json_file(path)


# ---------------------------------------------------------------------------
# diff_states
# ---------------------------------------------------------------------------

def diff_states(before, after):
    """Compare two state dicts and return a structured diff.

    Parameters
    ----------
    before : dict
        State snapshot before the period.
    after : dict
        State snapshot after the period.

    Returns
    -------
    dict
        Structured diff with sections: economy, movement, players,
        gardens, structures, chat, federation.
    """
    return {
        'economy': _diff_economy(
            before.get('economy', {}),
            after.get('economy', {})
        ),
        'movement': _diff_movement(
            before.get('players', {}),
            after.get('players', {})
        ),
        'players': _diff_players(
            before.get('players', {}),
            after.get('players', {})
        ),
        'gardens': _diff_gardens(
            before.get('gardens', {}),
            after.get('gardens', {})
        ),
        'structures': _diff_structures(
            before.get('structures', {}),
            after.get('structures', {})
        ),
        'chat': _diff_chat(
            before.get('chat', {}),
            after.get('chat', {})
        ),
        'federation': _diff_federation(
            before.get('federation', {}),
            after.get('federation', {})
        ),
    }


# ---------------------------------------------------------------------------
# Economy diff
# ---------------------------------------------------------------------------

def _diff_economy(before, after):
    before_balances = before.get('balances', {})
    after_balances = after.get('balances', {})
    before_txs = before.get('transactions', [])
    after_txs = after.get('transactions', [])

    # Balance changes for every entity that exists in either snapshot
    all_entities = set(before_balances.keys()) | set(after_balances.keys())
    balance_changes = {}
    for entity in all_entities:
        b = before_balances.get(entity, 0)
        a = after_balances.get(entity, 0)
        delta = a - b
        if delta != 0:
            balance_changes[entity] = delta

    # Treasury specifically
    treasury_delta = balance_changes.pop('TREASURY', 0)

    # New transactions: those present in after but not in before
    # We key transactions by (type, from, ts) or just index-compare
    # Since transactions are ordered lists, we consider those appended after the before set.
    before_tx_ids = _tx_id_set(before_txs)
    new_transactions = [tx for tx in after_txs if _tx_id(tx) not in before_tx_ids]

    return {
        'balance_changes': balance_changes,
        'treasury_delta': treasury_delta,
        'new_transactions': new_transactions,
    }


def _tx_id(tx):
    """Create a stable identity key for a transaction."""
    # Use id field if present, else fallback to (type, from, ts)
    if tx.get('id'):
        return tx['id']
    return (tx.get('type', ''), tx.get('from', ''), tx.get('ts', ''), json.dumps(tx.get('payload', {})))


def _tx_id_set(txs):
    return set(_tx_id(tx) for tx in txs)


# ---------------------------------------------------------------------------
# Movement diff
# ---------------------------------------------------------------------------

def _diff_movement(before_players_blob, after_players_blob):
    before_players = _extract_players(before_players_blob)
    after_players = _extract_players(after_players_blob)

    zone_transitions = []
    for pid, after_data in after_players.items():
        if pid not in before_players:
            continue  # new player join handled separately
        before_zone = _get_zone(before_players[pid])
        after_zone = _get_zone(after_data)
        if before_zone and after_zone and before_zone != after_zone:
            zone_transitions.append({
                'player': pid,
                'from_zone': before_zone,
                'to_zone': after_zone,
            })

    return {
        'zone_transitions': zone_transitions,
    }


def _extract_players(blob):
    """Normalise players blob — may be {'players': {...}} or just {...}."""
    if not blob:
        return {}
    if isinstance(blob, dict) and 'players' in blob:
        return blob['players'] or {}
    return blob


def _get_zone(player_data):
    pos = player_data.get('position', {})
    return pos.get('zone') if pos else None


# ---------------------------------------------------------------------------
# Players diff
# ---------------------------------------------------------------------------

def _diff_players(before_players_blob, after_players_blob):
    before_players = _extract_players(before_players_blob)
    after_players = _extract_players(after_players_blob)

    before_ids = set(before_players.keys())
    after_ids = set(after_players.keys())

    joined = sorted(after_ids - before_ids)
    left = sorted(before_ids - after_ids)

    return {
        'joined': joined,
        'left': left,
    }


# ---------------------------------------------------------------------------
# Gardens diff
# ---------------------------------------------------------------------------

def _diff_gardens(before, after):
    new_plants = []
    harvests = []
    ownership_changes = []
    fertility_changes = []
    new_plots = []

    # Plots present in after but not before
    for plot_id, after_plot in after.items():
        if plot_id not in before:
            new_plots.append(plot_id)
            continue

        before_plot = before[plot_id]

        # Ownership change
        before_owner = before_plot.get('owner')
        after_owner = after_plot.get('owner')
        if before_owner != after_owner:
            ownership_changes.append({
                'plot': plot_id,
                'from_owner': before_owner,
                'to_owner': after_owner,
            })

        # Plant changes
        before_plants = list(before_plot.get('plants', []))
        after_plants = list(after_plot.get('plants', []))
        before_set = _multiset(before_plants)
        after_set = _multiset(after_plants)

        added = _multiset_subtract(after_set, before_set)
        removed = _multiset_subtract(before_set, after_set)

        if added:
            new_plants.append({
                'plot': plot_id,
                'added': added,
            })
        if removed:
            harvests.append({
                'plot': plot_id,
                'removed': removed,
            })

        # Fertility change (only track meaningful changes > 0.01)
        before_fert = before_plot.get('fertility', 0.0)
        after_fert = after_plot.get('fertility', 0.0)
        delta = after_fert - before_fert
        if abs(delta) > 0.01:
            fertility_changes.append({
                'plot': plot_id,
                'from_fertility': before_fert,
                'to_fertility': after_fert,
                'delta': delta,
            })

    return {
        'new_plots': new_plots,
        'new_plants': new_plants,
        'harvests': harvests,
        'ownership_changes': ownership_changes,
        'fertility_changes': fertility_changes,
    }


def _multiset(items):
    """Convert list to a dict of item -> count."""
    result = {}
    for item in items:
        result[item] = result.get(item, 0) + 1
    return result


def _multiset_subtract(a, b):
    """Return items in a that aren't in b (as a flat list)."""
    result = []
    for item, count in a.items():
        extra = count - b.get(item, 0)
        result.extend([item] * max(0, extra))
    return result


# ---------------------------------------------------------------------------
# Structures diff
# ---------------------------------------------------------------------------

def _diff_structures(before, after):
    new_builds = []
    removals = []
    modifications = []

    before_keys = set(before.keys())
    after_keys = set(after.keys())

    # New structures
    for key in after_keys - before_keys:
        s = after[key]
        new_builds.append({
            'id': s.get('id', key),
            'type': s.get('type', 'unknown'),
            'name': s.get('name', key),
            'zone': s.get('zone', 'unknown'),
            'builder': s.get('builder', 'unknown'),
            'builtAt': s.get('builtAt'),
        })

    # Removed structures
    for key in before_keys - after_keys:
        s = before[key]
        removals.append({
            'id': s.get('id', key),
            'type': s.get('type', 'unknown'),
            'name': s.get('name', key),
            'zone': s.get('zone', 'unknown'),
        })

    # Modified structures
    for key in before_keys & after_keys:
        b = before[key]
        a = after[key]
        if b != a:
            modifications.append({
                'id': a.get('id', key),
                'type': a.get('type', 'unknown'),
                'name': a.get('name', key),
                'zone': a.get('zone', 'unknown'),
                'before': b,
                'after': a,
            })

    return {
        'new_builds': new_builds,
        'removals': removals,
        'modifications': modifications,
    }


# ---------------------------------------------------------------------------
# Chat diff
# ---------------------------------------------------------------------------

def _diff_chat(before, after):
    before_msgs = before.get('messages', []) if before else []
    after_msgs = after.get('messages', []) if after else []

    before_ids = set(m.get('id') for m in before_msgs if m.get('id'))
    new_messages = [m for m in after_msgs if m.get('id') not in before_ids]

    # Handle case where messages have no id — fall back to length-based diff
    if not before_ids and not any(m.get('id') for m in after_msgs):
        new_messages = after_msgs[len(before_msgs):]

    return {
        'new_messages': new_messages,
        'new_message_count': len(new_messages),
    }


# ---------------------------------------------------------------------------
# Federation diff
# ---------------------------------------------------------------------------

def _diff_federation(before, after):
    before_feds = before.get('federations', []) if before else []
    after_feds = after.get('federations', []) if after else []
    before_worlds = before.get('discoveredWorlds', []) if before else []
    after_worlds = after.get('discoveredWorlds', []) if after else []

    before_fed_ids = set(_fed_id(f) for f in before_feds)
    new_federations = [f for f in after_feds if _fed_id(f) not in before_fed_ids]

    before_world_ids = set(_world_id(w) for w in before_worlds)
    new_worlds = [w for w in after_worlds if _world_id(w) not in before_world_ids]

    before_rate = (before.get('sparkExchangeRate', 1.0) or 1.0) if before else 1.0
    after_rate = (after.get('sparkExchangeRate', 1.0) or 1.0) if after else 1.0
    exchange_rate_delta = after_rate - before_rate

    return {
        'new_federations': new_federations,
        'new_worlds': new_worlds,
        'exchange_rate_delta': exchange_rate_delta,
    }


def _fed_id(f):
    return f.get('id') or f.get('name') or json.dumps(f, sort_keys=True)


def _world_id(w):
    return w.get('worldId') or w.get('endpoint') or json.dumps(w, sort_keys=True)


# ---------------------------------------------------------------------------
# narrate_diff
# ---------------------------------------------------------------------------

def narrate_diff(diff):
    """Convert a structured diff dict into a human-readable narrative string.

    Parameters
    ----------
    diff : dict
        As returned by diff_states().

    Returns
    -------
    str
        A narrative paragraph (or paragraphs) describing what changed.
    """
    sentences = []

    # --- Economy ---
    economy = diff.get('economy', {})

    treasury_delta = economy.get('treasury_delta', 0)
    if treasury_delta > 0:
        sentences.append(
            'The TREASURY grew by {} Spark.'.format(treasury_delta)
        )
    elif treasury_delta < 0:
        sentences.append(
            'The TREASURY shrank by {} Spark.'.format(abs(treasury_delta))
        )

    balance_changes = economy.get('balance_changes', {})
    for entity, delta in sorted(balance_changes.items()):
        if entity == 'TREASURY':
            continue
        if delta > 0:
            sentences.append(
                '{} earned {} Spark.'.format(entity, delta)
            )
        else:
            sentences.append(
                '{} spent {} Spark.'.format(entity, abs(delta))
            )

    new_txs = economy.get('new_transactions', [])
    ubi_txs = [t for t in new_txs if t.get('type') == 'ubi']
    if ubi_txs:
        sentences.append(
            'UBI payments were distributed to {} recipients.'.format(len(ubi_txs))
        )

    craft_txs = [t for t in new_txs if t.get('type') == 'craft']
    if craft_txs:
        crafted_items = [t.get('payload', {}).get('recipe', 'something') for t in craft_txs]
        if len(crafted_items) == 1:
            sentences.append(
                '{} crafted a {}.'.format(
                    craft_txs[0].get('from', 'someone'),
                    crafted_items[0]
                )
            )
        else:
            sentences.append(
                'Citizens crafted {} items: {}.'.format(
                    len(crafted_items),
                    ', '.join(crafted_items[:3]) + ('...' if len(crafted_items) > 3 else '')
                )
            )

    # --- Players ---
    players = diff.get('players', {})

    for pid in players.get('joined', []):
        sentences.append(
            '{} arrived in ZION for the first time.'.format(pid)
        )

    for pid in players.get('left', []):
        sentences.append(
            '{} departed ZION.'.format(pid)
        )

    # --- Movement ---
    movement = diff.get('movement', {})
    for t in movement.get('zone_transitions', []):
        from_z = ZONE_NAMES.get(t['from_zone'], t['from_zone'])
        to_z = ZONE_NAMES.get(t['to_zone'], t['to_zone'])
        sentences.append(
            '{} moved from {} to {}.'.format(t['player'], from_z, to_z)
        )

    # --- Gardens ---
    gardens = diff.get('gardens', {})

    for plot_id in gardens.get('new_plots', []):
        sentences.append(
            'A new garden plot ({}) was established.'.format(plot_id)
        )

    for entry in gardens.get('new_plants', []):
        added = entry.get('added', [])
        plot = entry.get('plot', 'unknown')
        if len(added) == 1:
            sentences.append(
                'A {} was planted in {}.'.format(added[0], plot)
            )
        elif len(added) > 1:
            sentences.append(
                '{} plants were added to {}: {}.'.format(
                    len(added), plot, ', '.join(added)
                )
            )

    for entry in gardens.get('harvests', []):
        removed = entry.get('removed', [])
        plot = entry.get('plot', 'unknown')
        if len(removed) == 1:
            sentences.append(
                'A {} was harvested from {}.'.format(removed[0], plot)
            )
        elif len(removed) > 1:
            sentences.append(
                '{} plants were harvested from {}: {}.'.format(
                    len(removed), plot, ', '.join(removed)
                )
            )

    for change in gardens.get('ownership_changes', []):
        plot = change['plot']
        to_owner = change['to_owner']
        from_owner = change['from_owner']
        if from_owner is None:
            sentences.append(
                '{} claimed ownership of {}.'.format(to_owner, plot)
            )
        elif to_owner is None:
            sentences.append(
                '{} released ownership of {}.'.format(from_owner, plot)
            )
        else:
            sentences.append(
                'Ownership of {} transferred from {} to {}.'.format(
                    plot, from_owner, to_owner
                )
            )

    for fc in gardens.get('fertility_changes', []):
        plot = fc['plot']
        delta = fc['delta']
        if delta > 0:
            sentences.append(
                'The soil of {} grew more fertile (up {:.0%}).'.format(
                    plot, delta
                )
            )
        else:
            sentences.append(
                'The soil of {} lost some fertility (down {:.0%}).'.format(
                    plot, abs(delta)
                )
            )

    # --- Structures ---
    structures = diff.get('structures', {})

    for build in structures.get('new_builds', []):
        zone = ZONE_NAMES.get(build['zone'], build['zone'])
        sentences.append(
            'A new {} appeared in {}, built by {}.'.format(
                build['type'], zone, build['builder']
            )
        )

    for removal in structures.get('removals', []):
        zone = ZONE_NAMES.get(removal['zone'], removal['zone'])
        sentences.append(
            'A {} in {} was demolished.'.format(removal['type'], zone)
        )

    for mod in structures.get('modifications', []):
        zone = ZONE_NAMES.get(mod['zone'], mod['zone'])
        sentences.append(
            'The {} in {} was modified.'.format(mod['name'], zone)
        )

    # --- Chat ---
    chat = diff.get('chat', {})
    new_msgs = chat.get('new_messages', [])
    if new_msgs:
        speakers = list(dict.fromkeys(m.get('from', 'unknown') for m in new_msgs))
        if len(new_msgs) == 1:
            msg = new_msgs[0]
            text = msg.get('payload', {}).get('text', '')
            preview = (text[:60] + '...') if len(text) > 60 else text
            sentences.append(
                '{} said: "{}".'.format(msg.get('from', 'someone'), preview)
            )
        elif len(new_msgs) <= 3:
            for msg in new_msgs:
                text = msg.get('payload', {}).get('text', '')
                preview = (text[:40] + '...') if len(text) > 40 else text
                sentences.append(
                    '{} said: "{}".'.format(msg.get('from', 'someone'), preview)
                )
        else:
            sentences.append(
                '{} new messages were exchanged among: {}.'.format(
                    len(new_msgs),
                    ', '.join(speakers[:3]) + ('...' if len(speakers) > 3 else '')
                )
            )

    # --- Federation ---
    federation = diff.get('federation', {})

    for fed in federation.get('new_federations', []):
        sentences.append(
            'ZION formed a federation with {}.'.format(
                fed.get('name', 'an unknown world')
            )
        )

    for world in federation.get('new_worlds', []):
        sentences.append(
            'A new world was discovered: {}.'.format(
                world.get('worldName', world.get('worldId', 'unknown'))
            )
        )

    rate_delta = federation.get('exchange_rate_delta', 0.0)
    if abs(rate_delta) > 0.001:
        direction = 'rose' if rate_delta > 0 else 'fell'
        sentences.append(
            'The Spark exchange rate {} by {:.3f}.'.format(direction, abs(rate_delta))
        )

    # --- Final assembly ---
    if not sentences:
        return 'No notable changes occurred in ZION.'

    return ' '.join(sentences)


# ---------------------------------------------------------------------------
# diff_files
# ---------------------------------------------------------------------------

def diff_files(path_before, path_after):
    """Load two state snapshots from file paths and return a structured diff.

    Parameters
    ----------
    path_before : str
        Path to a JSON file or directory containing state JSON files.
    path_after : str
        Path to a JSON file or directory containing state JSON files.

    Returns
    -------
    dict
        Structured diff as returned by diff_states().
    """
    before = _load_state_from_path(path_before)
    after = _load_state_from_path(path_after)
    return diff_states(before, after)


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------

def main():
    if len(sys.argv) < 3:
        print('Usage: python3 scripts/world_diff.py <before> <after>', file=sys.stderr)
        print('  <before> and <after> can be JSON files or directories.', file=sys.stderr)
        sys.exit(1)

    path_before = sys.argv[1]
    path_after = sys.argv[2]

    try:
        diff = diff_files(path_before, path_after)
    except (FileNotFoundError, IOError, OSError) as e:
        print('Error loading state: {}'.format(e), file=sys.stderr)
        sys.exit(1)

    narrative = narrate_diff(diff)
    print(narrative)

    # Optionally print the raw diff if --json flag is given
    if '--json' in sys.argv:
        print('\n--- Raw diff ---')
        print(json.dumps(diff, indent=2))


if __name__ == '__main__':
    main()
