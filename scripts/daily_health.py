#!/usr/bin/env python3
"""Generate a daily health report for ZION autonomous systems.

Produces a markdown file at state/logs/YYYY-MM-DD.md summarizing:
- World vitals with day-over-day trends
- Agent activity and content diversity scoring
- Chat volume and zone coverage
- State file sizes and hygiene
- Inbox processing stats
- Quality score (0-100) with alerts
- Automated state rotation for unbounded growth

Also appends daily metrics to state/logs/metrics.json for trend analysis.

Uses only Python stdlib. No pip dependencies.
"""
import json
import os
import sys
import time as time_mod
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
    citizens = world.get('citizens', {})
    # Zone distribution of citizens
    zone_dist = {}
    for cid, cdata in citizens.items():
        z = cdata.get('position', {}).get('zone', 'unknown')
        zone_dist[z] = zone_dist.get(z, 0) + 1
    return {
        'worldTime': world.get('worldTime', 0),
        'dayPhase': world.get('dayPhase', 'unknown'),
        'weather': world.get('weather', 'unknown'),
        'season': world.get('season', 'unknown'),
        'lastTickAt': world.get('lastTickAt', 0),
        'zones': len(world.get('zones', {})),
        'citizens': len(citizens),
        'citizen_zones': zone_dist,
        'structures': len(world.get('structures', [])),
        'creations': len(world.get('creations', [])),
    }


def analyze_economy(state_dir):
    """Get economy stats."""
    economy = load_json(os.path.join(state_dir, 'economy.json'))
    txns = economy.get('transactions', [])
    txn_types = {}
    for t in txns:
        tt = t.get('type', 'unknown')
        txn_types[tt] = txn_types.get(tt, 0) + 1
    total_spark = sum(economy.get('balances', {}).values())
    return {
        'balances': len(economy.get('balances', {})),
        'total_spark': total_spark,
        'transactions': len(txns),
        'txn_types': txn_types,
        'listings': len(economy.get('listings', [])),
    }


def analyze_players(state_dir):
    """Get player registry stats."""
    players = load_json(os.path.join(state_dir, 'players.json'))
    return {
        'count': len(players.get('players', {})),
        'ids': sorted(players.get('players', {}).keys())[:20],
    }


def analyze_discoveries(state_dir):
    """Get discovery stats."""
    disc = load_json(os.path.join(state_dir, 'discoveries.json'))
    entries = disc.get('discoveries', {})
    zones = set()
    for d in entries.values():
        zones.add(d.get('zone', 'unknown'))
    return {
        'count': len(entries),
        'zones': sorted(zones),
    }


def analyze_workflow_failures(state_dir):
    """Check for recent workflow failures by scanning changes for gaps."""
    changes = load_json(os.path.join(state_dir, 'changes.json'))
    entries = changes.get('changes', [])
    # Look for gaps > 20 min between changes (suggests workflow failures)
    gaps = []
    prev_ts = None
    for entry in entries:
        ts_str = entry.get('ts', '')
        try:
            ts = datetime.fromisoformat(ts_str.replace('Z', '+00:00'))
            if prev_ts and (ts - prev_ts).total_seconds() > 1200:
                gaps.append({
                    'start': prev_ts.strftime('%H:%M'),
                    'end': ts.strftime('%H:%M'),
                    'minutes': int((ts - prev_ts).total_seconds() / 60),
                })
            prev_ts = ts
        except (ValueError, TypeError):
            pass
    return gaps[-5:]  # last 5 gaps


def get_last_process(state_dir):
    """Get last inbox processing result."""
    return load_json(os.path.join(state_dir, 'api', 'last_process.json'))


VALID_ZONES = {'nexus', 'gardens', 'athenaeum', 'studio', 'wilds', 'agora', 'commons', 'arena'}


def analyze_content_quality(state_dir, days=7):
    """Score content diversity and quality (0-100)."""
    chat = load_json(os.path.join(state_dir, 'chat.json'))
    changes = load_json(os.path.join(state_dir, 'changes.json'))
    actions = load_json(os.path.join(state_dir, 'actions.json'))
    messages = chat.get('messages', [])
    change_list = changes.get('changes', [])
    action_list = actions.get('actions', [])

    # Zone coverage: how many of 8 zones appear in recent chat?
    zones_seen = set()
    for msg in messages:
        z = msg.get('position', {}).get('zone')
        if z and z in VALID_ZONES:
            zones_seen.add(z)
    zone_coverage = len(zones_seen) / len(VALID_ZONES) * 100

    # Action diversity: how many distinct action types?
    action_types = set()
    for act in action_list:
        action_types.add(act.get('type', ''))
    for ch in change_list:
        action_types.add(ch.get('type', ''))
    action_types.discard('')
    # 10+ types = 100%, scale linearly
    action_diversity = min(len(action_types) / 10.0, 1.0) * 100

    # Agent diversity: how many unique agents active?
    agents_seen = set()
    for act in action_list:
        agents_seen.add(act.get('from', ''))
    agents_seen.discard('')
    # 10+ agents = 100%
    agent_diversity = min(len(agents_seen) / 10.0, 1.0) * 100

    # Chat uniqueness: check for repeated messages
    texts = [m.get('payload', {}).get('text', '') for m in messages]
    unique_texts = len(set(texts))
    text_uniqueness = (unique_texts / max(len(texts), 1)) * 100

    # Weighted quality score
    score = (
        zone_coverage * 0.25 +
        action_diversity * 0.25 +
        agent_diversity * 0.25 +
        text_uniqueness * 0.25
    )

    return {
        'score': round(score, 1),
        'zone_coverage': round(zone_coverage, 1),
        'zones_seen': sorted(zones_seen),
        'zones_missing': sorted(VALID_ZONES - zones_seen),
        'action_diversity': round(action_diversity, 1),
        'action_types': sorted(action_types),
        'agent_diversity': round(agent_diversity, 1),
        'unique_agents': len(agents_seen),
        'text_uniqueness': round(text_uniqueness, 1),
        'unique_texts': unique_texts,
        'total_texts': len(texts),
    }


def rotate_state_file(path, max_entries, key):
    """Trim a JSON array to max_entries, keeping the newest. Returns count removed."""
    data = load_json(path)
    if not isinstance(data, dict) or key not in data:
        return 0
    entries = data[key]
    if not isinstance(entries, list) or len(entries) <= max_entries:
        return 0
    removed = len(entries) - max_entries
    data[key] = entries[-max_entries:]
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2)
    return removed


def run_state_hygiene(state_dir):
    """Rotate unbounded state files. Returns summary dict."""
    results = {}
    results['changes'] = rotate_state_file(
        os.path.join(state_dir, 'changes.json'), 500, 'changes')
    results['chat'] = rotate_state_file(
        os.path.join(state_dir, 'chat.json'), 200, 'messages')
    results['actions'] = rotate_state_file(
        os.path.join(state_dir, 'actions.json'), 200, 'actions')

    # Rotate old log files (keep last 30 days)
    logs_dir = os.path.join(state_dir, 'logs')
    cutoff = datetime.now(timezone.utc) - timedelta(days=30)
    old_logs = 0
    if os.path.isdir(logs_dir):
        for fname in os.listdir(logs_dir):
            if fname.endswith('.md') and fname[:4].isdigit():
                try:
                    fdate = datetime.strptime(fname[:10], '%Y-%m-%d').replace(tzinfo=timezone.utc)
                    if fdate < cutoff:
                        os.remove(os.path.join(logs_dir, fname))
                        old_logs += 1
                except ValueError:
                    pass
    results['old_logs'] = old_logs

    return results


def load_metrics_history(logs_dir):
    """Load metrics.json as list of daily metric entries."""
    path = os.path.join(logs_dir, 'metrics.json')
    if not os.path.exists(path):
        return []
    try:
        with open(path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            return data if isinstance(data, list) else []
    except (json.JSONDecodeError, FileNotFoundError):
        return []


def save_metrics(logs_dir, metrics):
    """Append today's metrics to metrics.json (keep last 90 days)."""
    history = load_metrics_history(logs_dir)

    # Remove any existing entry for today
    today = metrics['date']
    history = [m for m in history if m.get('date') != today]
    history.append(metrics)

    # Keep last 90 days
    history = history[-90:]

    path = os.path.join(logs_dir, 'metrics.json')
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(history, f, indent=2)


def get_yesterday_metrics(logs_dir, today_date):
    """Get the most recent metrics entry before today."""
    history = load_metrics_history(logs_dir)
    for entry in reversed(history):
        if entry.get('date', '') < today_date:
            return entry
    return None


def trend_arrow(current, previous):
    """Return trend arrow comparing current to previous value."""
    if previous is None:
        return ''
    if current > previous:
        return ' ↑'
    elif current < previous:
        return ' ↓'
    return ' →'


def generate_report(state_dir, yesterday=None):
    """Generate the full daily health report as markdown."""
    now = datetime.now(timezone.utc)
    date_str = now.strftime('%Y-%m-%d')
    time_str = now.strftime('%H:%M:%S UTC')

    world = analyze_world(state_dir)
    chat = analyze_chat(state_dir)
    actions = analyze_actions(state_dir)
    changes = analyze_changes(state_dir)
    economy = analyze_economy(state_dir)
    players = analyze_players(state_dir)
    discoveries = analyze_discoveries(state_dir)
    last_proc = get_last_process(state_dir)
    file_sizes = get_file_sizes(state_dir)
    proc_total, proc_recent = count_processed_messages(state_dir)
    quality = analyze_content_quality(state_dir)
    gaps = analyze_workflow_failures(state_dir)

    # Shortcuts for yesterday comparison
    def ya(key):
        return yesterday.get(key) if yesterday else None

    lines = []
    lines.append('# ZION Daily Health Report — %s' % date_str)
    lines.append('')
    lines.append('Generated: %s | Quality Score: **%s/100**' % (time_str, quality['score']))
    lines.append('')

    # ═══════════════════════════════════════════
    # EXECUTIVE SUMMARY — the first thing to read
    # ═══════════════════════════════════════════
    lines.append('## Executive Summary')
    lines.append('')
    lines.append('| Metric | Today | Trend |')
    lines.append('|--------|-------|-------|')
    lines.append('| Quality Score | %s/100 | %s |' % (
        quality['score'], trend_arrow(quality['score'], ya('qualityScore')).strip() or '—'))
    lines.append('| Citizens | %d | %s |' % (
        world['citizens'], trend_arrow(world['citizens'], ya('citizens')).strip() or '—'))
    lines.append('| Players Registered | %d | %s |' % (
        players['count'], trend_arrow(players['count'], ya('playerCount')).strip() or '—'))
    lines.append('| Chat (24h) | %d | %s |' % (
        chat['recent_count'], trend_arrow(chat['recent_count'], ya('chatRecent')).strip() or '—'))
    lines.append('| Transactions | %d | %s |' % (
        economy['transactions'], trend_arrow(economy['transactions'], ya('transactions')).strip() or '—'))
    lines.append('| Structures | %d | %s |' % (
        world['structures'], trend_arrow(world['structures'], ya('structures')).strip() or '—'))
    lines.append('| Creations | %d | %s |' % (
        world['creations'], trend_arrow(world['creations'], ya('creations')).strip() or '—'))
    lines.append('| Discoveries | %d | %s |' % (
        discoveries['count'], trend_arrow(discoveries['count'], ya('discoveryCount')).strip() or '—'))
    lines.append('| Total Spark | %d | %s |' % (
        economy['total_spark'], trend_arrow(economy['total_spark'], ya('totalSpark')).strip() or '—'))
    lines.append('| Inbox Processed (24h) | %d | %s |' % (
        proc_recent, trend_arrow(proc_recent, ya('processedRecent')).strip() or '—'))
    lines.append('')

    # ═══════════════════════════════════════════
    # QUALITY SCORE BREAKDOWN
    # ═══════════════════════════════════════════
    lines.append('## Quality Score: %s/100' % quality['score'])
    lines.append('')
    lines.append('| Dimension | Score | Detail |')
    lines.append('|-----------|-------|--------|')
    lines.append('| Zone Coverage | %s%% | %d/8 zones visited%s |' % (
        quality['zone_coverage'], len(quality['zones_seen']),
        trend_arrow(quality['zone_coverage'], ya('zone_coverage'))))
    lines.append('| Action Diversity | %s%% | %d action types%s |' % (
        quality['action_diversity'], len(quality['action_types']),
        trend_arrow(quality['action_diversity'], ya('action_diversity'))))
    lines.append('| Agent Diversity | %s%% | %d unique agents%s |' % (
        quality['agent_diversity'], quality['unique_agents'],
        trend_arrow(quality['agent_diversity'], ya('agent_diversity'))))
    lines.append('| Chat Uniqueness | %s%% | %d/%d unique messages%s |' % (
        quality['text_uniqueness'], quality['unique_texts'], quality['total_texts'],
        trend_arrow(quality['text_uniqueness'], ya('text_uniqueness'))))
    if quality['zones_missing']:
        lines.append('')
        lines.append('Zones not yet visited: %s' % ', '.join(quality['zones_missing']))
    lines.append('')

    # ═══════════════════════════════════════════
    # WORLD VITALS
    # ═══════════════════════════════════════════
    lines.append('## World Vitals')
    lines.append('')
    lines.append('| Metric | Value |')
    lines.append('|--------|-------|')
    lines.append('| worldTime | %.1f seconds%s |' % (
        world['worldTime'], trend_arrow(world['worldTime'], ya('worldTime'))))
    lines.append('| Day Phase | %s |' % world['dayPhase'])
    lines.append('| Weather | %s |' % world['weather'])
    lines.append('| Season | %s |' % world['season'])
    lines.append('| Zones | %d |' % world['zones'])
    lines.append('| Citizens | %d%s |' % (
        world['citizens'], trend_arrow(world['citizens'], ya('citizens'))))
    lines.append('| Structures | %d |' % world['structures'])
    lines.append('| Creations | %d |' % world['creations'])
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

    # Citizen zone distribution
    if world['citizen_zones']:
        lines.append('**Citizen Distribution:**')
        for z in sorted(world['citizen_zones'].keys()):
            lines.append('- %s: %d citizens' % (z, world['citizen_zones'][z]))
        lines.append('')

    # ═══════════════════════════════════════════
    # ECONOMY
    # ═══════════════════════════════════════════
    lines.append('## Economy')
    lines.append('')
    lines.append('| Metric | Value |')
    lines.append('|--------|-------|')
    lines.append('| Accounts | %d |' % economy['balances'])
    lines.append('| Total Spark | %d |' % economy['total_spark'])
    lines.append('| Transactions | %d |' % economy['transactions'])
    lines.append('| Market Listings | %d |' % economy['listings'])
    lines.append('')
    if economy['txn_types']:
        lines.append('**Transaction Breakdown:**')
        for t, c in sorted(economy['txn_types'].items(), key=lambda x: -x[1]):
            lines.append('- %s: %d' % (t, c))
        lines.append('')

    # ═══════════════════════════════════════════
    # PLAYERS & DISCOVERIES
    # ═══════════════════════════════════════════
    lines.append('## Players & Discoveries')
    lines.append('')
    lines.append('- **%d** registered players' % players['count'])
    if players['ids']:
        lines.append('- Recent: %s' % ', '.join(players['ids'][:10]))
    lines.append('- **%d** discoveries across %d zones' % (
        discoveries['count'], len(discoveries['zones'])))
    lines.append('')

    # ═══════════════════════════════════════════
    # AGENT ACTIVITY
    # ═══════════════════════════════════════════
    lines.append('## Agent Activity (Last 24h)')
    lines.append('')
    lines.append('- **%d** changes recorded%s' % (
        changes['recent'], trend_arrow(changes['recent'], ya('changeRecent'))))
    lines.append('- **%d** unique agents acted' % len(changes['by_agent']))
    if changes['by_type']:
        lines.append('- Action breakdown: %s' % ', '.join(
            '%s (%d)' % (t, c) for t, c in sorted(changes['by_type'].items(), key=lambda x: -x[1])[:10]
        ))
    if changes['by_agent']:
        top_agents = sorted(changes['by_agent'].items(), key=lambda x: -x[1])[:5]
        lines.append('- Most active: %s' % ', '.join(
            '%s (%d)' % (a, c) for a, c in top_agents
        ))
    lines.append('')

    # ═══════════════════════════════════════════
    # CHAT ACTIVITY
    # ═══════════════════════════════════════════
    lines.append('## Chat Activity')
    lines.append('')
    lines.append('- **%d** total messages, **%d** in last 24h%s' % (
        chat['total'], chat['recent_count'],
        trend_arrow(chat['recent_count'], ya('chatRecent'))))
    if chat['recent']:
        lines.append('')
        lines.append('Recent messages:')
        for msg in chat['recent']:
            sender = msg.get('from', '?')
            text = msg.get('payload', {}).get('text', '')[:80]
            zone = msg.get('position', {}).get('zone', '?')
            lines.append('- **%s** in %s: %s' % (sender, zone, text))
    lines.append('')

    # ═══════════════════════════════════════════
    # INBOX PROCESSING
    # ═══════════════════════════════════════════
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

    # ═══════════════════════════════════════════
    # PIPELINE GAPS (workflow failures / idle periods)
    # ═══════════════════════════════════════════
    if gaps:
        lines.append('## Pipeline Gaps')
        lines.append('')
        lines.append('Activity gaps >20 minutes (possible workflow failures):')
        lines.append('')
        for gap in gaps:
            lines.append('- %s → %s (%d min gap)' % (gap['start'], gap['end'], gap['minutes']))
        lines.append('')

    # ═══════════════════════════════════════════
    # STATE FILE SIZES
    # ═══════════════════════════════════════════
    lines.append('## State File Sizes')
    lines.append('')
    lines.append('| File | Size |')
    lines.append('|------|------|')
    total_size = 0
    for name, size in file_sizes:
        total_size += size
        warning = ' ⚠️' if size > 1_000_000 else ''
        lines.append('| %s | %s%s |' % (name, format_bytes(size), warning))
    lines.append('| **Total** | **%s**%s |' % (
        format_bytes(total_size), trend_arrow(total_size, ya('stateSize'))))
    lines.append('')

    # ═══════════════════════════════════════════
    # HEALTH CHECKLIST
    # ═══════════════════════════════════════════
    lines.append('## Health Checklist')
    lines.append('')
    checks = []
    check_pass = 0
    check_total = 9
    # World time advancing?
    if world['worldTime'] > 0:
        checks.append('✅ worldTime advancing (%.0f)' % world['worldTime'])
        check_pass += 1
    else:
        checks.append('❌ worldTime stuck at 0')
    # Recent tick?
    if world['lastTickAt'] and (now.timestamp() - world['lastTickAt']) < 600:
        checks.append('✅ Game tick running (last: %d sec ago)' % int(now.timestamp() - world['lastTickAt']))
        check_pass += 1
    else:
        checks.append('⚠️ Game tick may be stale')
    # Chat active?
    if chat['recent_count'] > 0:
        checks.append('✅ Chat active (%d messages today)' % chat['recent_count'])
        check_pass += 1
    else:
        checks.append('⚠️ No chat messages in 24h')
    # Agents active?
    if changes['recent'] > 0:
        checks.append('✅ Agents producing changes (%d today)' % changes['recent'])
        check_pass += 1
    else:
        checks.append('⚠️ No agent changes in 24h')
    # Players registering?
    if players['count'] > 0:
        checks.append('✅ Players registered (%d)' % players['count'])
        check_pass += 1
    else:
        checks.append('⚠️ No players in registry')
    # Economy active?
    if economy['transactions'] > 0:
        checks.append('✅ Economy active (%d transactions)' % economy['transactions'])
        check_pass += 1
    else:
        checks.append('⚠️ No economy transactions')
    # Inbox flowing?
    if proc_recent > 0:
        checks.append('✅ Inbox processing (%d in 24h)' % proc_recent)
        check_pass += 1
    else:
        checks.append('⚠️ No inbox messages processed in 24h')
    # No errors?
    if not last_proc.get('errors'):
        checks.append('✅ No processing errors')
        check_pass += 1
    else:
        checks.append('❌ Processing errors detected')
    # State not bloated?
    if total_size < 5_000_000:
        checks.append('✅ State size healthy (%s)' % format_bytes(total_size))
        check_pass += 1
    else:
        checks.append('⚠️ State size growing (%s)' % format_bytes(total_size))

    for check in checks:
        lines.append('- %s' % check)
    lines.append('')
    lines.append('Health: **%d/%d** checks passing' % (check_pass, check_total))
    lines.append('')

    # ═══════════════════════════════════════════
    # ACTION ITEMS — the morning to-do list
    # ═══════════════════════════════════════════
    lines.append('## Action Items')
    lines.append('')
    items = []
    if quality['score'] < 50:
        items.append('🔴 **Quality score critically low (%s)** — investigate root cause' % quality['score'])
    elif quality['score'] < 75:
        items.append('🟡 **Quality score below target (%s/100)** — review dimension breakdown above' % quality['score'])
    if quality['zone_coverage'] < 75:
        items.append('🟡 **Low zone coverage (%s%%)** — agents only visiting %d/8 zones. Missing: %s' % (
            quality['zone_coverage'], len(quality['zones_seen']),
            ', '.join(quality['zones_missing'])))
    if quality['action_diversity'] < 50:
        items.append('🟡 **Low action diversity (%s%%)** — only %d action types active' % (
            quality['action_diversity'], len(quality['action_types'])))
    if quality['agent_diversity'] < 50:
        items.append('🟡 **Low agent diversity (%s%%)** — only %d unique agents' % (
            quality['agent_diversity'], quality['unique_agents']))
    if quality['text_uniqueness'] < 60:
        items.append('🟡 **Chat getting repetitive (%s%% unique)** — agents recycling same phrases' % (
            quality['text_uniqueness']))
    if economy['transactions'] == 0:
        items.append('🟡 **Economy has zero transactions** — craft/harvest/trade handlers may not be firing')
    if players['count'] == 0:
        items.append('🟡 **No registered players** — agent join messages may not be flowing')
    if world['structures'] == 0 and changes['recent'] > 0:
        items.append('🟡 **No structures built** — build handler may not be working')
    if gaps:
        items.append('🟡 **%d pipeline gaps detected** — check workflow run history for failures' % len(gaps))
    if last_proc.get('errors'):
        items.append('🔴 **Inbox processing errors** — %s' % '; '.join(last_proc['errors'][:3]))
    if world['lastTickAt'] and (now.timestamp() - world['lastTickAt']) > 600:
        items.append('🔴 **Game tick stale** — last tick %.0f min ago' % (
            (now.timestamp() - world['lastTickAt']) / 60))
    if total_size > 3_000_000:
        items.append('🟡 **State growing large (%s)** — review hygiene caps' % format_bytes(total_size))

    # Positive signals
    if yesterday:
        prev_score = ya('qualityScore')
        if prev_score is not None and quality['score'] > prev_score:
            items.append('🟢 **Quality improving** — score up from %s to %s' % (
                prev_score, quality['score']))
        prev_citizens = ya('citizens') or 0
        if world['citizens'] > prev_citizens:
            items.append('🟢 **World growing** — citizens up from %s to %d' % (
                prev_citizens, world['citizens']))

    if not items:
        items.append('🟢 **All systems healthy** — no action needed')

    for item in items:
        lines.append('- %s' % item)
    lines.append('')

    # Build today's metrics for persistence
    metrics = {
        'date': date_str,
        'ts': now.isoformat(),
        'qualityScore': quality['score'],
        'worldTime': world['worldTime'],
        'citizens': world['citizens'],
        'structures': world['structures'],
        'creations': world['creations'],
        'playerCount': players['count'],
        'discoveryCount': discoveries['count'],
        'chatTotal': chat['total'],
        'chatRecent': chat['recent_count'],
        'actionCount': actions['total'],
        'uniqueAgents': actions['unique_agents'],
        'changeTotal': changes['total'],
        'changeRecent': changes['recent'],
        'transactions': economy['transactions'],
        'totalSpark': economy['total_spark'],
        'listings': economy['listings'],
        'processedRecent': proc_recent,
        'errorCount': len(last_proc.get('errors', [])),
        'stateSize': total_size,
        'zone_coverage': quality['zone_coverage'],
        'action_diversity': quality['action_diversity'],
        'agent_diversity': quality['agent_diversity'],
        'text_uniqueness': quality['text_uniqueness'],
        'healthChecks': check_pass,
        'healthTotal': check_total,
    }

    return '\n'.join(lines), metrics


def main():
    """Generate and save daily health report."""
    script_dir = os.path.dirname(os.path.abspath(__file__))
    state_dir = os.path.join(script_dir, '..', 'state')
    logs_dir = os.path.join(state_dir, 'logs')

    os.makedirs(logs_dir, exist_ok=True)

    date_str = datetime.now(timezone.utc).strftime('%Y-%m-%d')

    # Run state hygiene first
    hygiene = run_state_hygiene(state_dir)
    hygiene_notes = []
    for key, count in hygiene.items():
        if count > 0:
            hygiene_notes.append('%s: rotated %d entries' % (key, count))
    if hygiene_notes:
        print('State hygiene: %s' % ', '.join(hygiene_notes))

    # Load yesterday's metrics for trend comparison
    yesterday = get_yesterday_metrics(logs_dir, date_str)

    # Generate report
    report, metrics = generate_report(state_dir, yesterday)

    # Append hygiene info to report
    if hygiene_notes:
        report += '\n## State Hygiene\n\n'
        for note in hygiene_notes:
            report += '- %s\n' % note
        report += '\n'

    # Save metrics
    save_metrics(logs_dir, metrics)

    # Write dated markdown report
    report_path = os.path.join(logs_dir, '%s.md' % date_str)
    with open(report_path, 'w', encoding='utf-8') as f:
        f.write(report)

    print('Health report written to %s' % report_path)
    print('')
    print(report)

    # Quality alert: exit non-zero if score drops below 50
    # or critical checks fail (worldTime stuck, errors detected)
    alert = False
    if metrics['qualityScore'] < 50:
        print('\n⚠️ ALERT: Quality score %s is below threshold (50)' % metrics['qualityScore'])
        alert = True
    if metrics['healthChecks'] < 4:
        print('\n⚠️ ALERT: Only %d/%d health checks passing' % (
            metrics['healthChecks'], metrics['healthTotal']))
        alert = True

    return 1 if alert else 0


if __name__ == '__main__':
    sys.exit(main())
