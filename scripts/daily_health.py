#!/usr/bin/env python3
"""Generate a daily health report for ZION autonomous systems.

Produces a markdown file at state/logs/YYYY-MM-DD.md summarizing:
- World vitals (time, weather, season, day phase)
- Agent activity (actions generated, agents active)
- Chat volume and recent messages
- State file sizes (detect bloat)
- Inbox processing stats
- Error summary from changes.json
- Processed message counts

Uses only Python stdlib. No pip dependencies.
"""
import json
import os
import sys
from datetime import datetime, timezone, timedelta


def load_json(path):
    """Load JSON file safely, return empty dict/list on failure."""
    try:
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return {}


def format_bytes(size):
    """Format byte size as human-readable string."""
    for unit in ['B', 'KB', 'MB']:
        if size < 1024:
            return '%.1f %s' % (size, unit)
        size /= 1024
    return '%.1f GB' % size


def get_file_sizes(state_dir):
    """Get sizes of all state JSON files."""
    sizes = []
    for name in sorted(os.listdir(state_dir)):
        path = os.path.join(state_dir, name)
        if os.path.isfile(path) and name.endswith('.json'):
            size = os.path.getsize(path)
            sizes.append((name, size))
    return sizes


def count_processed_messages(state_dir, hours=24):
    """Count processed inbox messages in the last N hours."""
    processed_dir = os.path.join(state_dir, 'inbox', '_processed')
    if not os.path.isdir(processed_dir):
        return 0, 0
    cutoff = datetime.now().timestamp() - (hours * 3600)
    total = 0
    recent = 0
    for fname in os.listdir(processed_dir):
        if fname.startswith('.'):
            continue
        total += 1
        fpath = os.path.join(processed_dir, fname)
        try:
            if os.path.getmtime(fpath) >= cutoff:
                recent += 1
        except OSError:
            pass
    return total, recent


def analyze_changes(state_dir, hours=24):
    """Analyze changes.json for activity in the last N hours."""
    changes = load_json(os.path.join(state_dir, 'changes.json'))
    entries = changes.get('changes', [])
    cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)

    by_type = {}
    by_agent = {}
    recent = 0

    for entry in entries:
        ts_str = entry.get('ts', '')
        try:
            ts = datetime.fromisoformat(ts_str.replace('Z', '+00:00'))
            if ts >= cutoff:
                recent += 1
                t = entry.get('type', 'unknown')
                by_type[t] = by_type.get(t, 0) + 1
                a = entry.get('from', 'unknown')
                by_agent[a] = by_agent.get(a, 0) + 1
        except (ValueError, TypeError):
            pass

    return {
        'total': len(entries),
        'recent': recent,
        'by_type': by_type,
        'by_agent': by_agent,
    }


def analyze_chat(state_dir, hours=24):
    """Analyze chat.json for message volume."""
    chat = load_json(os.path.join(state_dir, 'chat.json'))
    messages = chat.get('messages', [])
    cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)

    recent = []
    for msg in messages:
        ts_str = msg.get('ts', '')
        try:
            ts = datetime.fromisoformat(ts_str.replace('Z', '+00:00'))
            if ts >= cutoff:
                recent.append(msg)
        except (ValueError, TypeError):
            pass

    return {
        'total': len(messages),
        'recent_count': len(recent),
        'recent': recent[-5:],  # last 5 messages
    }


def analyze_actions(state_dir):
    """Analyze actions.json for agent activity."""
    actions = load_json(os.path.join(state_dir, 'actions.json'))
    acts = actions.get('actions', [])

    by_agent = {}
    by_type = {}
    for act in acts:
        a = act.get('from', 'unknown')
        by_agent[a] = by_agent.get(a, 0) + 1
        t = act.get('type', 'unknown')
        by_type[t] = by_type.get(t, 0) + 1

    return {
        'total': len(acts),
        'by_agent': by_agent,
        'by_type': by_type,
        'unique_agents': len(by_agent),
    }


def analyze_world(state_dir):
    """Get world vitals."""
    world = load_json(os.path.join(state_dir, 'world.json'))
    return {
        'worldTime': world.get('worldTime', 0),
        'dayPhase': world.get('dayPhase', 'unknown'),
        'weather': world.get('weather', 'unknown'),
        'season': world.get('season', 'unknown'),
        'lastTickAt': world.get('lastTickAt', 0),
        'zones': len(world.get('zones', {})),
        'citizens': len(world.get('citizens', {})),
    }


def analyze_economy(state_dir):
    """Get economy stats."""
    economy = load_json(os.path.join(state_dir, 'economy.json'))
    return {
        'balances': len(economy.get('balances', {})),
        'transactions': len(economy.get('transactions', [])),
        'listings': len(economy.get('listings', [])),
    }


def get_last_process(state_dir):
    """Get last inbox processing result."""
    return load_json(os.path.join(state_dir, 'api', 'last_process.json'))


def generate_report(state_dir):
    """Generate the full daily health report as markdown."""
    now = datetime.now(timezone.utc)
    date_str = now.strftime('%Y-%m-%d')
    time_str = now.strftime('%H:%M:%S UTC')

    world = analyze_world(state_dir)
    chat = analyze_chat(state_dir)
    actions = analyze_actions(state_dir)
    changes = analyze_changes(state_dir)
    economy = analyze_economy(state_dir)
    last_proc = get_last_process(state_dir)
    file_sizes = get_file_sizes(state_dir)
    proc_total, proc_recent = count_processed_messages(state_dir)

    lines = []
    lines.append('# ZION Daily Health Report — %s' % date_str)
    lines.append('')
    lines.append('Generated: %s' % time_str)
    lines.append('')

    # World Vitals
    lines.append('## World Vitals')
    lines.append('')
    lines.append('| Metric | Value |')
    lines.append('|--------|-------|')
    lines.append('| worldTime | %.1f seconds |' % world['worldTime'])
    lines.append('| Day Phase | %s |' % world['dayPhase'])
    lines.append('| Weather | %s |' % world['weather'])
    lines.append('| Season | %s |' % world['season'])
    lines.append('| Zones | %d |' % world['zones'])
    lines.append('| Active Citizens | %d |' % world['citizens'])
    tick_age = 'never'
    if world['lastTickAt']:
        age_sec = now.timestamp() - world['lastTickAt']
        if age_sec < 600:
            tick_age = '%d seconds ago' % int(age_sec)
        elif age_sec < 7200:
            tick_age = '%d minutes ago' % int(age_sec / 60)
        else:
            tick_age = '%.1f hours ago ⚠️' % (age_sec / 3600)
    lines.append('| Last Tick | %s |' % tick_age)
    lines.append('')

    # Agent Activity
    lines.append('## Agent Activity')
    lines.append('')
    lines.append('- **%d** actions in queue' % actions['total'])
    lines.append('- **%d** unique agents active' % actions['unique_agents'])
    if actions['by_type']:
        lines.append('- Action types: %s' % ', '.join(
            '%s (%d)' % (t, c) for t, c in sorted(actions['by_type'].items(), key=lambda x: -x[1])[:10]
        ))
    if actions['by_agent']:
        top_agents = sorted(actions['by_agent'].items(), key=lambda x: -x[1])[:5]
        lines.append('- Top agents: %s' % ', '.join(
            '%s (%d)' % (a, c) for a, c in top_agents
        ))
    lines.append('')

    # Chat
    lines.append('## Chat Activity')
    lines.append('')
    lines.append('- **%d** total messages, **%d** in last 24h' % (chat['total'], chat['recent_count']))
    if chat['recent']:
        lines.append('')
        lines.append('Recent messages:')
        for msg in chat['recent']:
            sender = msg.get('from', '?')
            text = msg.get('payload', {}).get('text', '')[:80]
            zone = msg.get('position', {}).get('zone', '?')
            lines.append('- **%s** in %s: %s' % (sender, zone, text))
    lines.append('')

    # Changes (last 24h)
    lines.append('## Changes (Last 24h)')
    lines.append('')
    lines.append('- **%d** changes recorded (%d total all-time)' % (changes['recent'], changes['total']))
    if changes['by_type']:
        lines.append('- By type: %s' % ', '.join(
            '%s (%d)' % (t, c) for t, c in sorted(changes['by_type'].items(), key=lambda x: -x[1])
        ))
    lines.append('')

    # Inbox Processing
    lines.append('## Inbox Processing')
    lines.append('')
    lines.append('- **%d** messages processed (last 24h), **%d** total in archive' % (proc_recent, proc_total))
    if last_proc:
        lines.append('- Last run: %s — %d processed, %d rejected' % (
            last_proc.get('ts', '?')[:19], last_proc.get('processed', 0), last_proc.get('rejected', 0)
        ))
        if last_proc.get('errors'):
            lines.append('- ⚠️ **Errors**: %s' % '; '.join(last_proc['errors']))
    lines.append('')

    # Economy
    lines.append('## Economy')
    lines.append('')
    lines.append('- Balances tracked: %d' % economy['balances'])
    lines.append('- Transactions: %d' % economy['transactions'])
    lines.append('- Market listings: %d' % economy['listings'])
    lines.append('')

    # State File Sizes
    lines.append('## State File Sizes')
    lines.append('')
    lines.append('| File | Size |')
    lines.append('|------|------|')
    total_size = 0
    for name, size in file_sizes:
        total_size += size
        warning = ' ⚠️' if size > 1_000_000 else ''
        lines.append('| %s | %s%s |' % (name, format_bytes(size), warning))
    lines.append('| **Total** | **%s** |' % format_bytes(total_size))
    lines.append('')

    # Health Checklist
    lines.append('## Health Checklist')
    lines.append('')
    checks = []
    # World time advancing?
    if world['worldTime'] > 0:
        checks.append('✅ worldTime advancing (%.0f)' % world['worldTime'])
    else:
        checks.append('❌ worldTime stuck at 0')
    # Recent tick?
    if world['lastTickAt'] and (now.timestamp() - world['lastTickAt']) < 600:
        checks.append('✅ Game tick running (last: %d sec ago)' % int(now.timestamp() - world['lastTickAt']))
    else:
        checks.append('⚠️ Game tick may be stale')
    # Chat active?
    if chat['recent_count'] > 0:
        checks.append('✅ Chat active (%d messages today)' % chat['recent_count'])
    else:
        checks.append('⚠️ No chat messages in 24h')
    # Agents active?
    if actions['unique_agents'] > 0:
        checks.append('✅ Agents active (%d unique)' % actions['unique_agents'])
    else:
        checks.append('⚠️ No agent activity')
    # No errors?
    if not last_proc.get('errors'):
        checks.append('✅ No processing errors')
    else:
        checks.append('❌ Processing errors detected')
    # State not bloated?
    if total_size < 5_000_000:
        checks.append('✅ State size healthy (%s)' % format_bytes(total_size))
    else:
        checks.append('⚠️ State size growing (%s)' % format_bytes(total_size))

    for check in checks:
        lines.append('- %s' % check)
    lines.append('')

    return '\n'.join(lines)


def main():
    """Generate and save daily health report."""
    script_dir = os.path.dirname(os.path.abspath(__file__))
    state_dir = os.path.join(script_dir, '..', 'state')
    logs_dir = os.path.join(state_dir, 'logs')

    os.makedirs(logs_dir, exist_ok=True)

    report = generate_report(state_dir)

    # Write to dated file
    date_str = datetime.now(timezone.utc).strftime('%Y-%m-%d')
    report_path = os.path.join(logs_dir, '%s.md' % date_str)
    with open(report_path, 'w', encoding='utf-8') as f:
        f.write(report)

    print('Health report written to %s' % report_path)

    # Also print to stdout for CI logs
    print('')
    print(report)

    return 0


if __name__ == '__main__':
    sys.exit(main())
