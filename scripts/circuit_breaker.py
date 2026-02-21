#!/usr/bin/env python3
"""ZION Circuit Breaker — self-healing pipeline monitor.

Tracks consecutive workflow failures, diagnoses root causes from logs,
creates GitHub issues with analysis, and attempts auto-fixes.

Usage:
    # Record a workflow result:
    python scripts/circuit_breaker.py record <workflow_name> <conclusion> [--run-id ID] [--logs FILE]

    # Check circuit breaker state:
    python scripts/circuit_breaker.py status

    # Attempt auto-fix for a tripped circuit:
    python scripts/circuit_breaker.py fix <workflow_name>

    # Reset a specific workflow's counter:
    python scripts/circuit_breaker.py reset <workflow_name>
"""
import json
import os
import re
import sys
import copy
from datetime import datetime, timezone


# ─── Configuration ────────────────────────────────────────────

TRIP_THRESHOLD = 3          # consecutive failures before tripping
STATE_FILE = 'state/logs/circuit_breaker.json'

SEVERITY_MAP = {
    'API Process & Publish': 'high',
    'Game Tick': 'critical',
    'Agent Autonomy': 'medium',
    'Observer Agent': 'low',
    'Sync State': 'medium',
    'Daily Health Report': 'low',
}

SEVERITY_LABELS = {
    'critical': 'severity: critical',
    'high': 'severity: high',
    'medium': 'severity: medium',
    'low': 'severity: low',
}

# ─── Error Pattern Catalog ────────────────────────────────────
# Each pattern: (regex, error_id, description, severity_override, fix_id)

ERROR_PATTERNS = [
    # State corruption
    (r"'dict' object has no attribute 'append'",
     'dict_append',
     'State corruption: a list field was overwritten as a dict',
     'high',
     'fix_dict_to_list'),

    # API restriction
    (r'Type "(\w+)" is not allowed for API agents',
     'restricted_type',
     'Agent sent a message type not in API_ALLOWED_TYPES',
     'low',
     None),

    # Rate limiting
    (r'Rate limit exceeded: (\d+) messages in last hour',
     'rate_limit',
     'Agent exceeded hourly rate limit',
     'low',
     None),

    # JSON corruption
    (r'(?:JSONDecodeError|Invalid JSON|json\.decoder\.JSONDecodeError)',
     'json_corrupt',
     'A state file contains invalid JSON',
     'high',
     'fix_json_reset'),

    # Missing state file
    (r"FileNotFoundError:.*?'([^']*state/[^']*\.json)'",
     'missing_file',
     'A required state file is missing',
     'high',
     'fix_missing_state'),

    # Git push conflict
    (r'(?:Push attempt \d+ failed|failed to push|rejected.*non-fast-forward)',
     'git_conflict',
     'Git push failed due to concurrent writes',
     'medium',
     None),  # Self-resolving via retry

    # Python syntax/import error
    (r'(?:SyntaxError|ImportError|ModuleNotFoundError):?\s*(.*)',
     'python_error',
     'Python script has a syntax or import error',
     'critical',
     None),  # Needs human

    # Process crash
    (r'Process completed with exit code (\d+)',
     'exit_code',
     'A script exited with a non-zero code',
     'medium',
     None),

    # Out of memory / timeout
    (r'(?:MemoryError|killed|timeout|timed out)',
     'resource_limit',
     'Script hit memory or time limits',
     'high',
     None),

    # APPLY ERROR in inbox
    (r'APPLY ERROR',
     'apply_error',
     'Message application failed during inbox processing',
     'high',
     'fix_dict_to_list'),

    # Stale game tick
    (r'(?:worldTime.*not advancing|lastTickAt.*stale)',
     'stale_tick',
     'Game tick is not advancing world time',
     'critical',
     'fix_stale_tick'),
]


# ─── State Management ─────────────────────────────────────────

def _default_state():
    return {'workflows': {}, 'version': 1}


def _default_workflow():
    return {
        'consecutive_failures': 0,
        'last_failure_ts': None,
        'last_success_ts': None,
        'last_run_id': None,
        'tripped': False,
        'issue_number': None,
        'last_diagnosis': None,
    }


def load_state(base_dir):
    """Load circuit breaker state from JSON file."""
    path = os.path.join(base_dir, STATE_FILE)
    try:
        with open(path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            if 'workflows' not in data:
                data['workflows'] = {}
            return data
    except (FileNotFoundError, json.JSONDecodeError):
        return _default_state()


def save_state(base_dir, state):
    """Save circuit breaker state to JSON file."""
    path = os.path.join(base_dir, STATE_FILE)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(state, f, indent=2)


# ─── Diagnosis Engine ─────────────────────────────────────────

def diagnose_logs(log_text):
    """Analyze log text and return list of matched error patterns.

    Returns:
        List of dicts: [{error_id, description, severity, fix_id, match}]
    """
    findings = []
    seen_ids = set()
    for pattern, error_id, description, severity, fix_id in ERROR_PATTERNS:
        matches = re.findall(pattern, log_text, re.IGNORECASE)
        if matches and error_id not in seen_ids:
            seen_ids.add(error_id)
            findings.append({
                'error_id': error_id,
                'description': description,
                'severity': severity,
                'fix_id': fix_id,
                'match': matches[0] if matches else '',
            })
    return findings


def classify_severity(workflow_name, findings):
    """Determine overall severity from workflow + findings.

    Returns one of: critical, high, medium, low
    """
    severity_order = ['critical', 'high', 'medium', 'low']

    # Start with workflow's base severity
    base = SEVERITY_MAP.get(workflow_name, 'medium')
    best = severity_order.index(base)

    # Escalate based on findings
    for f in findings:
        idx = severity_order.index(f['severity'])
        if idx < best:
            best = idx

    return severity_order[best]


def format_issue_body(workflow_name, state_entry, findings, log_excerpt):
    """Format a GitHub issue body with diagnosis."""
    now = datetime.now(timezone.utc).isoformat()
    severity = classify_severity(workflow_name, findings)

    lines = []
    lines.append('## Circuit Breaker Tripped: %s' % workflow_name)
    lines.append('')
    lines.append('**Severity:** %s' % severity)
    lines.append('**Consecutive failures:** %d' % state_entry['consecutive_failures'])
    lines.append('**Last failure:** %s' % (state_entry.get('last_failure_ts') or 'unknown'))
    lines.append('**Last success:** %s' % (state_entry.get('last_success_ts') or 'unknown'))
    if state_entry.get('last_run_id'):
        lines.append('**Run ID:** %s' % state_entry['last_run_id'])
    lines.append('')

    if findings:
        lines.append('## Diagnosis')
        lines.append('')
        for f in findings:
            fix_note = ' (auto-fix available: `%s`)' % f['fix_id'] if f['fix_id'] else ''
            lines.append('- **[%s] %s**: %s%s' % (f['severity'].upper(), f['error_id'], f['description'], fix_note))
        lines.append('')
    else:
        lines.append('## Diagnosis')
        lines.append('')
        lines.append('No known error patterns matched. Manual investigation needed.')
        lines.append('')

    if log_excerpt:
        lines.append('## Log Excerpt')
        lines.append('')
        lines.append('```')
        # Keep last 80 lines max
        excerpt_lines = log_excerpt.strip().split('\n')
        if len(excerpt_lines) > 80:
            lines.append('... (%d lines truncated) ...' % (len(excerpt_lines) - 80))
            excerpt_lines = excerpt_lines[-80:]
        lines.extend(excerpt_lines)
        lines.append('```')
        lines.append('')

    lines.append('## Auto-Healing Status')
    lines.append('')
    fixable = [f for f in findings if f['fix_id']]
    if fixable:
        lines.append('Auto-fix will be attempted for: %s' % ', '.join(f['fix_id'] for f in fixable))
    else:
        lines.append('No auto-fix available. Manual intervention required.')
    lines.append('')
    lines.append('---')
    lines.append('*Generated by ZION Circuit Breaker at %s*' % now)

    return '\n'.join(lines)


def format_issue_title(workflow_name, severity):
    """Format a concise issue title."""
    return '[circuit-breaker] %s failing (%s)' % (workflow_name, severity)


# ─── Auto-Fix Engine ──────────────────────────────────────────

DEFAULT_STATE_FILES = {
    'world.json': {'worldTime': 0, 'dayPhase': 'day', 'weather': 'clear',
                   'season': 'spring', 'citizens': {}, 'structures': {},
                   'creations': []},
    'economy.json': {'balances': {}, 'transactions': [], 'listings': []},
    'chat.json': {'messages': []},
    'changes.json': {'changes': []},
    'players.json': {'players': {}},
    'discoveries.json': {'discoveries': {}},
    'actions.json': {'actions': []},
}

# Fields that must be lists (not dicts)
LIST_FIELDS = {
    'economy.json': ['transactions', 'listings'],
    'world.json': ['creations'],
    'chat.json': ['messages'],
    'changes.json': ['changes'],
    'actions.json': ['actions'],
}

# Fields that must be dicts (not lists)
DICT_FIELDS = {
    'world.json': ['citizens', 'structures'],
    'economy.json': ['balances'],
    'players.json': ['players'],
    'discoveries.json': ['discoveries'],
}


def apply_fix(fix_id, base_dir):
    """Apply an auto-fix. Returns (success, description) tuple."""
    state_dir = os.path.join(base_dir, 'state')

    if fix_id == 'fix_dict_to_list':
        return _fix_dict_to_list(state_dir)
    elif fix_id == 'fix_json_reset':
        return _fix_json_reset(state_dir)
    elif fix_id == 'fix_missing_state':
        return _fix_missing_state(state_dir)
    elif fix_id == 'fix_stale_tick':
        return _fix_stale_tick(state_dir)
    else:
        return False, 'Unknown fix_id: %s' % fix_id


def _load_json_safe(path):
    try:
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f), None
    except (FileNotFoundError, json.JSONDecodeError) as e:
        return None, str(e)


def _save_json(path, data):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2)


def _fix_dict_to_list(state_dir):
    """Fix fields that should be lists but got corrupted to dicts."""
    fixed = []
    for filename, fields in LIST_FIELDS.items():
        path = os.path.join(state_dir, filename)
        data, err = _load_json_safe(path)
        if data is None:
            continue
        changed = False
        for field in fields:
            if field in data and isinstance(data[field], dict):
                # Convert dict values to list
                data[field] = list(data[field].values()) if data[field] else []
                fixed.append('%s.%s' % (filename, field))
                changed = True
        if changed:
            _save_json(path, data)

    for filename, fields in DICT_FIELDS.items():
        path = os.path.join(state_dir, filename)
        data, err = _load_json_safe(path)
        if data is None:
            continue
        changed = False
        for field in fields:
            if field in data and isinstance(data[field], list):
                data[field] = {}
                fixed.append('%s.%s' % (filename, field))
                changed = True
        if changed:
            _save_json(path, data)

    if fixed:
        return True, 'Fixed type corruption in: %s' % ', '.join(fixed)
    return True, 'No type corruption found (already clean)'


def _fix_json_reset(state_dir):
    """Reset corrupted JSON files to defaults."""
    fixed = []
    for filename, default in DEFAULT_STATE_FILES.items():
        path = os.path.join(state_dir, filename)
        data, err = _load_json_safe(path)
        if data is None and os.path.exists(path):
            # File exists but is corrupted
            _save_json(path, default)
            fixed.append(filename)
    if fixed:
        return True, 'Reset corrupted files: %s' % ', '.join(fixed)
    return True, 'No corrupted JSON files found'


def _fix_missing_state(state_dir):
    """Create missing state files with defaults."""
    created = []
    for filename, default in DEFAULT_STATE_FILES.items():
        path = os.path.join(state_dir, filename)
        if not os.path.exists(path):
            _save_json(path, default)
            created.append(filename)
    # Also ensure directories exist
    for subdir in ['inbox', 'inbox/_processed', 'api', 'logs',
                   'simulations/crm', 'founding', 'agents']:
        os.makedirs(os.path.join(state_dir, subdir), exist_ok=True)
    if created:
        return True, 'Created missing files: %s' % ', '.join(created)
    return True, 'All state files present'


def _fix_stale_tick(state_dir):
    """Force-advance a stale game tick."""
    import time as _time
    path = os.path.join(state_dir, 'world.json')
    data, err = _load_json_safe(path)
    if data is None:
        return False, 'Cannot read world.json: %s' % err
    data['lastTickAt'] = _time.time()
    data['worldTime'] = data.get('worldTime', 0) + 300  # Advance 5 min
    _save_json(path, data)
    return True, 'Force-advanced worldTime by 300s and reset lastTickAt'


# ─── Record & Trip Logic ──────────────────────────────────────

def record_result(state, workflow_name, conclusion, run_id=None):
    """Record a workflow result. Returns (updated_state, just_tripped)."""
    state = copy.deepcopy(state)
    now = datetime.now(timezone.utc).isoformat()

    if workflow_name not in state['workflows']:
        state['workflows'][workflow_name] = _default_workflow()

    wf = state['workflows'][workflow_name]
    wf['last_run_id'] = run_id

    if conclusion == 'success':
        wf['consecutive_failures'] = 0
        wf['last_success_ts'] = now
        wf['tripped'] = False
        # Don't clear issue_number — let humans close it
        return state, False

    # Failure
    wf['consecutive_failures'] += 1
    wf['last_failure_ts'] = now

    just_tripped = False
    if wf['consecutive_failures'] >= TRIP_THRESHOLD and not wf['tripped']:
        wf['tripped'] = True
        just_tripped = True

    return state, just_tripped


def get_tripped_workflows(state):
    """Return list of workflow names that are currently tripped."""
    return [name for name, wf in state.get('workflows', {}).items()
            if wf.get('tripped')]


def get_status_summary(state):
    """Return a human-readable status summary."""
    lines = ['ZION Circuit Breaker Status', '=' * 40]
    workflows = state.get('workflows', {})
    if not workflows:
        lines.append('No workflow data recorded yet.')
        return '\n'.join(lines)

    for name, wf in sorted(workflows.items()):
        status = 'TRIPPED' if wf.get('tripped') else 'OK'
        failures = wf.get('consecutive_failures', 0)
        issue = '#%s' % wf['issue_number'] if wf.get('issue_number') else '-'
        lines.append('  %-30s %7s  failures=%d  issue=%s' % (name, status, failures, issue))
    return '\n'.join(lines)


# ─── CLI ──────────────────────────────────────────────────────

def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    command = sys.argv[1]
    script_dir = os.path.dirname(os.path.abspath(__file__))
    base_dir = os.path.dirname(script_dir)

    if command == 'status':
        state = load_state(base_dir)
        print(get_status_summary(state))
        sys.exit(0)

    elif command == 'record':
        if len(sys.argv) < 4:
            print('Usage: circuit_breaker.py record <workflow_name> <conclusion> [--run-id ID] [--logs FILE]')
            sys.exit(1)

        workflow_name = sys.argv[2]
        conclusion = sys.argv[3]

        run_id = None
        log_file = None
        i = 4
        while i < len(sys.argv):
            if sys.argv[i] == '--run-id' and i + 1 < len(sys.argv):
                run_id = sys.argv[i + 1]
                i += 2
            elif sys.argv[i] == '--logs' and i + 1 < len(sys.argv):
                log_file = sys.argv[i + 1]
                i += 2
            else:
                i += 1

        state = load_state(base_dir)
        state, just_tripped = record_result(state, workflow_name, conclusion, run_id)

        # Diagnose if failure
        findings = []
        log_text = ''
        if conclusion == 'failure' and log_file:
            try:
                with open(log_file, 'r', encoding='utf-8', errors='replace') as f:
                    log_text = f.read()
                findings = diagnose_logs(log_text)
            except FileNotFoundError:
                pass

        if findings:
            state['workflows'][workflow_name]['last_diagnosis'] = {
                'ts': datetime.now(timezone.utc).isoformat(),
                'findings': findings,
            }

        save_state(base_dir, state)

        # Output for the workflow to consume
        output = {
            'workflow': workflow_name,
            'conclusion': conclusion,
            'just_tripped': just_tripped,
            'consecutive_failures': state['workflows'][workflow_name]['consecutive_failures'],
            'severity': classify_severity(workflow_name, findings),
            'findings': findings,
        }

        if just_tripped:
            wf_state = state['workflows'][workflow_name]
            output['issue_title'] = format_issue_title(workflow_name,
                                                        classify_severity(workflow_name, findings))
            output['issue_body'] = format_issue_body(workflow_name, wf_state, findings, log_text)
            output['issue_labels'] = ['circuit-breaker', SEVERITY_LABELS.get(
                classify_severity(workflow_name, findings), 'severity: medium')]
            output['fixable'] = [f['fix_id'] for f in findings if f['fix_id']]

        print(json.dumps(output, indent=2))
        sys.exit(0)

    elif command == 'fix':
        if len(sys.argv) < 3:
            print('Usage: circuit_breaker.py fix <workflow_name>')
            sys.exit(1)

        workflow_name = sys.argv[2]
        state = load_state(base_dir)
        wf = state.get('workflows', {}).get(workflow_name, {})
        diagnosis = wf.get('last_diagnosis', {})
        findings = diagnosis.get('findings', [])

        results = []
        for f in findings:
            if f.get('fix_id'):
                success, desc = apply_fix(f['fix_id'], base_dir)
                results.append({'fix_id': f['fix_id'], 'success': success, 'description': desc})

        if not results:
            # Try common fixes anyway
            for fix_id in ['fix_dict_to_list', 'fix_missing_state', 'fix_json_reset']:
                success, desc = apply_fix(fix_id, base_dir)
                results.append({'fix_id': fix_id, 'success': success, 'description': desc})

        print(json.dumps({'workflow': workflow_name, 'fixes': results}, indent=2))
        sys.exit(0)

    elif command == 'reset':
        if len(sys.argv) < 3:
            print('Usage: circuit_breaker.py reset <workflow_name>')
            sys.exit(1)

        workflow_name = sys.argv[2]
        state = load_state(base_dir)
        if workflow_name in state.get('workflows', {}):
            state['workflows'][workflow_name]['consecutive_failures'] = 0
            state['workflows'][workflow_name]['tripped'] = False
            save_state(base_dir, state)
            print('Reset circuit breaker for: %s' % workflow_name)
        else:
            print('No data for workflow: %s' % workflow_name)
        sys.exit(0)

    else:
        print('Unknown command: %s' % command)
        print(__doc__)
        sys.exit(1)


if __name__ == '__main__':
    main()
