#!/usr/bin/env python3
"""Tests for ZION Circuit Breaker — self-healing pipeline monitor.

Tests cover: state tracking, error pattern matching, severity classification,
auto-fix logic, issue formatting, and deduplication.
"""
import json
import os
import shutil
import sys
import tempfile
import time
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'scripts'))
from circuit_breaker import (
    load_state, save_state, record_result, diagnose_logs,
    classify_severity, format_issue_body, format_issue_title,
    apply_fix, get_tripped_workflows, get_status_summary,
    TRIP_THRESHOLD, ERROR_PATTERNS, SEVERITY_MAP,
    _default_state, _default_workflow,
    LIST_FIELDS, DICT_FIELDS, DEFAULT_STATE_FILES,
)


def make_base_dir():
    """Create a temp project dir with state subdirectory."""
    d = tempfile.mkdtemp()
    state_dir = os.path.join(d, 'state')
    logs_dir = os.path.join(state_dir, 'logs')
    os.makedirs(logs_dir, exist_ok=True)
    # Create default state files
    for fname, content in DEFAULT_STATE_FILES.items():
        with open(os.path.join(state_dir, fname), 'w') as f:
            json.dump(content, f)
    return d


# ─── State Tracking ───────────────────────────────────────────

class TestStateManagement(unittest.TestCase):

    def setUp(self):
        self.base_dir = make_base_dir()

    def tearDown(self):
        shutil.rmtree(self.base_dir)

    def test_load_empty_state(self):
        state = load_state(self.base_dir)
        self.assertIn('workflows', state)
        self.assertEqual(len(state['workflows']), 0)

    def test_save_and_load(self):
        state = _default_state()
        state['workflows']['Test'] = _default_workflow()
        state['workflows']['Test']['consecutive_failures'] = 5
        save_state(self.base_dir, state)
        loaded = load_state(self.base_dir)
        self.assertEqual(loaded['workflows']['Test']['consecutive_failures'], 5)

    def test_load_corrupted_file(self):
        path = os.path.join(self.base_dir, 'state', 'logs', 'circuit_breaker.json')
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, 'w') as f:
            f.write('NOT JSON{{{')
        state = load_state(self.base_dir)
        self.assertIn('workflows', state)


# ─── Record & Trip Logic ──────────────────────────────────────

class TestRecordResult(unittest.TestCase):

    def test_success_resets_counter(self):
        state = _default_state()
        state['workflows']['Game Tick'] = _default_workflow()
        state['workflows']['Game Tick']['consecutive_failures'] = 2
        state, tripped = record_result(state, 'Game Tick', 'success')
        self.assertEqual(state['workflows']['Game Tick']['consecutive_failures'], 0)
        self.assertFalse(tripped)
        self.assertFalse(state['workflows']['Game Tick']['tripped'])

    def test_failure_increments_counter(self):
        state = _default_state()
        state, _ = record_result(state, 'Game Tick', 'failure')
        self.assertEqual(state['workflows']['Game Tick']['consecutive_failures'], 1)

    def test_trips_at_threshold(self):
        state = _default_state()
        for i in range(TRIP_THRESHOLD - 1):
            state, tripped = record_result(state, 'Game Tick', 'failure')
            self.assertFalse(tripped)
        # This one should trip
        state, tripped = record_result(state, 'Game Tick', 'failure')
        self.assertTrue(tripped)
        self.assertTrue(state['workflows']['Game Tick']['tripped'])
        self.assertEqual(state['workflows']['Game Tick']['consecutive_failures'], TRIP_THRESHOLD)

    def test_does_not_retrip(self):
        """Once tripped, subsequent failures should not re-trip."""
        state = _default_state()
        for i in range(TRIP_THRESHOLD):
            state, _ = record_result(state, 'Game Tick', 'failure')
        # Already tripped, next failure should NOT re-trip
        state, tripped = record_result(state, 'Game Tick', 'failure')
        self.assertFalse(tripped)
        self.assertTrue(state['workflows']['Game Tick']['tripped'])

    def test_success_after_trip_resets(self):
        state = _default_state()
        for i in range(TRIP_THRESHOLD):
            state, _ = record_result(state, 'Game Tick', 'failure')
        self.assertTrue(state['workflows']['Game Tick']['tripped'])
        state, _ = record_result(state, 'Game Tick', 'success')
        self.assertFalse(state['workflows']['Game Tick']['tripped'])
        self.assertEqual(state['workflows']['Game Tick']['consecutive_failures'], 0)

    def test_records_run_id(self):
        state = _default_state()
        state, _ = record_result(state, 'API Process', 'failure', run_id='12345')
        self.assertEqual(state['workflows']['API Process']['last_run_id'], '12345')

    def test_records_timestamps(self):
        state = _default_state()
        state, _ = record_result(state, 'API Process', 'failure')
        self.assertIsNotNone(state['workflows']['API Process']['last_failure_ts'])

        state, _ = record_result(state, 'API Process', 'success')
        self.assertIsNotNone(state['workflows']['API Process']['last_success_ts'])

    def test_new_workflow_auto_created(self):
        state = _default_state()
        state, _ = record_result(state, 'Brand New Workflow', 'failure')
        self.assertIn('Brand New Workflow', state['workflows'])

    def test_multiple_workflows_independent(self):
        state = _default_state()
        for i in range(TRIP_THRESHOLD):
            state, _ = record_result(state, 'Game Tick', 'failure')
        state, _ = record_result(state, 'API Process', 'failure')
        self.assertTrue(state['workflows']['Game Tick']['tripped'])
        self.assertFalse(state['workflows']['API Process']['tripped'])
        self.assertEqual(state['workflows']['API Process']['consecutive_failures'], 1)


# ─── Diagnosis Engine ─────────────────────────────────────────

class TestDiagnoseLogs(unittest.TestCase):

    def test_detects_dict_append(self):
        log = "APPLY ERROR — 'dict' object has no attribute 'append'"
        findings = diagnose_logs(log)
        ids = [f['error_id'] for f in findings]
        self.assertIn('dict_append', ids)

    def test_detects_restricted_type(self):
        log = 'RESTRICTED — Type "inspect" is not allowed for API agents'
        findings = diagnose_logs(log)
        ids = [f['error_id'] for f in findings]
        self.assertIn('restricted_type', ids)

    def test_detects_rate_limit(self):
        log = 'Rate limit exceeded: 31 messages in last hour (max 30/hour)'
        findings = diagnose_logs(log)
        ids = [f['error_id'] for f in findings]
        self.assertIn('rate_limit', ids)

    def test_detects_json_corruption(self):
        log = 'json.decoder.JSONDecodeError: Expecting value: line 1 column 1'
        findings = diagnose_logs(log)
        ids = [f['error_id'] for f in findings]
        self.assertIn('json_corrupt', ids)

    def test_detects_missing_file(self):
        log = "FileNotFoundError: [Errno 2] No such file: '/state/world.json'"
        findings = diagnose_logs(log)
        ids = [f['error_id'] for f in findings]
        self.assertIn('missing_file', ids)

    def test_detects_git_conflict(self):
        log = 'Push attempt 3 failed, retrying...\nrejected non-fast-forward'
        findings = diagnose_logs(log)
        ids = [f['error_id'] for f in findings]
        self.assertIn('git_conflict', ids)

    def test_detects_python_error(self):
        log = 'SyntaxError: invalid syntax (game_tick.py, line 42)'
        findings = diagnose_logs(log)
        ids = [f['error_id'] for f in findings]
        self.assertIn('python_error', ids)

    def test_detects_apply_error(self):
        log = 'agent_089_file.json: APPLY ERROR — some exception'
        findings = diagnose_logs(log)
        ids = [f['error_id'] for f in findings]
        self.assertIn('apply_error', ids)

    def test_detects_exit_code(self):
        log = '##[error]Process completed with exit code 1'
        findings = diagnose_logs(log)
        ids = [f['error_id'] for f in findings]
        self.assertIn('exit_code', ids)

    def test_no_duplicates(self):
        log = ("APPLY ERROR — 'dict' object has no attribute 'append'\n"
               "APPLY ERROR — 'dict' object has no attribute 'append'\n"
               "APPLY ERROR — 'dict' object has no attribute 'append'\n")
        findings = diagnose_logs(log)
        ids = [f['error_id'] for f in findings]
        self.assertEqual(ids.count('dict_append'), 1)
        self.assertEqual(ids.count('apply_error'), 1)

    def test_clean_log_returns_empty(self):
        log = 'Processing 15 inbox messages...\nResults: 15 processed, 0 rejected\n'
        findings = diagnose_logs(log)
        self.assertEqual(len(findings), 0)

    def test_multiple_errors_detected(self):
        log = ("APPLY ERROR — 'dict' object has no attribute 'append'\n"
               "Rate limit exceeded: 50 messages in last hour\n"
               "Push attempt 3 failed, retrying...\n")
        findings = diagnose_logs(log)
        ids = [f['error_id'] for f in findings]
        self.assertIn('dict_append', ids)
        self.assertIn('rate_limit', ids)
        self.assertIn('git_conflict', ids)


# ─── Severity Classification ──────────────────────────────────

class TestSeverityClassification(unittest.TestCase):

    def test_game_tick_is_critical(self):
        severity = classify_severity('Game Tick', [])
        self.assertEqual(severity, 'critical')

    def test_observer_is_low(self):
        severity = classify_severity('Observer Agent', [])
        self.assertEqual(severity, 'low')

    def test_finding_escalates_severity(self):
        findings = [{'severity': 'critical', 'error_id': 'test', 'fix_id': None}]
        severity = classify_severity('Observer Agent', findings)
        self.assertEqual(severity, 'critical')

    def test_unknown_workflow_defaults_medium(self):
        severity = classify_severity('Unknown Workflow', [])
        self.assertEqual(severity, 'medium')


# ─── Issue Formatting ─────────────────────────────────────────

class TestIssueFormatting(unittest.TestCase):

    def test_issue_title_format(self):
        title = format_issue_title('Game Tick', 'critical')
        self.assertIn('Game Tick', title)
        self.assertIn('critical', title)
        self.assertIn('circuit-breaker', title)

    def test_issue_body_contains_findings(self):
        state_entry = _default_workflow()
        state_entry['consecutive_failures'] = 3
        findings = [{'error_id': 'dict_append', 'description': 'State corruption',
                      'severity': 'high', 'fix_id': 'fix_dict_to_list', 'match': ''}]
        body = format_issue_body('Game Tick', state_entry, findings, 'some logs')
        self.assertIn('dict_append', body)
        self.assertIn('fix_dict_to_list', body)
        self.assertIn('State corruption', body)
        self.assertIn('Consecutive failures', body)

    def test_issue_body_handles_no_findings(self):
        state_entry = _default_workflow()
        state_entry['consecutive_failures'] = 3
        body = format_issue_body('Game Tick', state_entry, [], '')
        self.assertIn('Manual investigation needed', body)

    def test_issue_body_truncates_long_logs(self):
        state_entry = _default_workflow()
        state_entry['consecutive_failures'] = 3
        long_log = '\n'.join(['line %d' % i for i in range(200)])
        body = format_issue_body('Test', state_entry, [], long_log)
        self.assertIn('truncated', body)


# ─── Auto-Fix Engine ──────────────────────────────────────────

class TestAutoFix(unittest.TestCase):

    def setUp(self):
        self.base_dir = make_base_dir()

    def tearDown(self):
        shutil.rmtree(self.base_dir)

    def test_fix_dict_to_list_fixes_corrupted_listings(self):
        econ_path = os.path.join(self.base_dir, 'state', 'economy.json')
        with open(econ_path, 'w') as f:
            json.dump({'balances': {}, 'transactions': [], 'listings': {'bad': 'data'}}, f)
        success, desc = apply_fix('fix_dict_to_list', self.base_dir)
        self.assertTrue(success)
        with open(econ_path) as f:
            econ = json.load(f)
        self.assertIsInstance(econ['listings'], list)

    def test_fix_dict_to_list_fixes_corrupted_creations(self):
        world_path = os.path.join(self.base_dir, 'state', 'world.json')
        with open(world_path, 'w') as f:
            json.dump({'creations': {'bad': 'data'}, 'citizens': {}, 'structures': {}}, f)
        success, desc = apply_fix('fix_dict_to_list', self.base_dir)
        self.assertTrue(success)
        with open(world_path) as f:
            world = json.load(f)
        self.assertIsInstance(world['creations'], list)

    def test_fix_dict_to_list_preserves_dict_values(self):
        """When converting dict to list, should keep the values."""
        econ_path = os.path.join(self.base_dir, 'state', 'economy.json')
        with open(econ_path, 'w') as f:
            json.dump({'balances': {}, 'transactions': [],
                       'listings': {'a': {'item': 'tool'}, 'b': {'item': 'gem'}}}, f)
        apply_fix('fix_dict_to_list', self.base_dir)
        with open(econ_path) as f:
            econ = json.load(f)
        self.assertIsInstance(econ['listings'], list)
        self.assertEqual(len(econ['listings']), 2)

    def test_fix_dict_to_list_fixes_list_to_dict(self):
        """citizens should be a dict, not a list."""
        world_path = os.path.join(self.base_dir, 'state', 'world.json')
        with open(world_path, 'w') as f:
            json.dump({'citizens': ['bad'], 'structures': {}, 'creations': []}, f)
        success, desc = apply_fix('fix_dict_to_list', self.base_dir)
        self.assertTrue(success)
        with open(world_path) as f:
            world = json.load(f)
        self.assertIsInstance(world['citizens'], dict)

    def test_fix_dict_to_list_clean_state(self):
        success, desc = apply_fix('fix_dict_to_list', self.base_dir)
        self.assertTrue(success)
        self.assertIn('already clean', desc)

    def test_fix_json_reset(self):
        # Corrupt a file
        econ_path = os.path.join(self.base_dir, 'state', 'economy.json')
        with open(econ_path, 'w') as f:
            f.write('BROKEN{{{')
        success, desc = apply_fix('fix_json_reset', self.base_dir)
        self.assertTrue(success)
        self.assertIn('economy.json', desc)
        with open(econ_path) as f:
            econ = json.load(f)
        self.assertIn('balances', econ)

    def test_fix_json_reset_clean_state(self):
        success, desc = apply_fix('fix_json_reset', self.base_dir)
        self.assertTrue(success)
        self.assertIn('No corrupted', desc)

    def test_fix_missing_state(self):
        # Delete a file
        os.remove(os.path.join(self.base_dir, 'state', 'chat.json'))
        success, desc = apply_fix('fix_missing_state', self.base_dir)
        self.assertTrue(success)
        self.assertIn('chat.json', desc)
        self.assertTrue(os.path.exists(os.path.join(self.base_dir, 'state', 'chat.json')))

    def test_fix_missing_state_creates_dirs(self):
        success, desc = apply_fix('fix_missing_state', self.base_dir)
        self.assertTrue(success)
        self.assertTrue(os.path.isdir(os.path.join(self.base_dir, 'state', 'inbox')))
        self.assertTrue(os.path.isdir(os.path.join(self.base_dir, 'state', 'api')))

    def test_fix_stale_tick(self):
        world_path = os.path.join(self.base_dir, 'state', 'world.json')
        with open(world_path, 'w') as f:
            json.dump({'worldTime': 100, 'lastTickAt': 0}, f)
        success, desc = apply_fix('fix_stale_tick', self.base_dir)
        self.assertTrue(success)
        with open(world_path) as f:
            world = json.load(f)
        self.assertEqual(world['worldTime'], 400)  # 100 + 300
        self.assertGreater(world['lastTickAt'], 0)

    def test_unknown_fix_id(self):
        success, desc = apply_fix('fix_nonexistent', self.base_dir)
        self.assertFalse(success)
        self.assertIn('Unknown', desc)


# ─── Tripped Workflow Queries ─────────────────────────────────

class TestTrippedQueries(unittest.TestCase):

    def test_get_tripped_empty(self):
        state = _default_state()
        self.assertEqual(get_tripped_workflows(state), [])

    def test_get_tripped_returns_names(self):
        state = _default_state()
        state['workflows']['A'] = _default_workflow()
        state['workflows']['A']['tripped'] = True
        state['workflows']['B'] = _default_workflow()
        state['workflows']['B']['tripped'] = False
        tripped = get_tripped_workflows(state)
        self.assertEqual(tripped, ['A'])


class TestStatusSummary(unittest.TestCase):

    def test_empty_state(self):
        summary = get_status_summary(_default_state())
        self.assertIn('No workflow data', summary)

    def test_shows_workflow_status(self):
        state = _default_state()
        state['workflows']['Game Tick'] = _default_workflow()
        state['workflows']['Game Tick']['consecutive_failures'] = 3
        state['workflows']['Game Tick']['tripped'] = True
        summary = get_status_summary(state)
        self.assertIn('Game Tick', summary)
        self.assertIn('TRIPPED', summary)


# ─── Error Pattern Coverage ───────────────────────────────────

class TestPatternCoverage(unittest.TestCase):
    """Ensure all error patterns have valid structure."""

    def test_all_patterns_have_five_fields(self):
        for pattern in ERROR_PATTERNS:
            self.assertEqual(len(pattern), 5,
                             'Pattern must have 5 fields: %s' % (pattern,))

    def test_all_patterns_compile(self):
        import re
        for regex, error_id, desc, severity, fix_id in ERROR_PATTERNS:
            try:
                re.compile(regex, re.IGNORECASE)
            except re.error as e:
                self.fail('Pattern %s does not compile: %s' % (error_id, e))

    def test_all_severities_valid(self):
        valid = {'critical', 'high', 'medium', 'low'}
        for _, error_id, _, severity, _ in ERROR_PATTERNS:
            self.assertIn(severity, valid,
                          'Pattern %s has invalid severity: %s' % (error_id, severity))

    def test_all_fix_ids_implemented(self):
        """Every fix_id referenced in patterns must work in apply_fix."""
        base_dir = make_base_dir()
        try:
            fix_ids = set(fix_id for _, _, _, _, fix_id in ERROR_PATTERNS if fix_id)
            for fix_id in fix_ids:
                success, desc = apply_fix(fix_id, base_dir)
                self.assertTrue(success,
                                'fix_id %s failed: %s' % (fix_id, desc))
        finally:
            shutil.rmtree(base_dir)


# ─── Integration: Record + Diagnose + Fix ─────────────────────

class TestIntegration(unittest.TestCase):

    def setUp(self):
        self.base_dir = make_base_dir()

    def tearDown(self):
        shutil.rmtree(self.base_dir)

    def test_full_trip_cycle(self):
        """Record 3 failures -> trip -> fix -> success -> reset."""
        state = load_state(self.base_dir)

        # 3 failures
        for i in range(3):
            state, tripped = record_result(state, 'API Process & Publish', 'failure')
        self.assertTrue(tripped)
        self.assertTrue(state['workflows']['API Process & Publish']['tripped'])

        # Apply fix
        success, desc = apply_fix('fix_dict_to_list', self.base_dir)
        self.assertTrue(success)

        # Success resets
        state, tripped = record_result(state, 'API Process & Publish', 'success')
        self.assertFalse(state['workflows']['API Process & Publish']['tripped'])
        self.assertEqual(state['workflows']['API Process & Publish']['consecutive_failures'], 0)

    def test_diagnose_and_fix_dict_corruption(self):
        """Simulate the Feb 18 crash: dict corruption -> diagnose -> fix."""
        # Corrupt economy
        econ_path = os.path.join(self.base_dir, 'state', 'economy.json')
        with open(econ_path, 'w') as f:
            json.dump({'balances': {}, 'transactions': [],
                       'listings': {'corrupted': True}}, f)

        # Diagnose from log
        log = "APPLY ERROR — 'dict' object has no attribute 'append'"
        findings = diagnose_logs(log)
        self.assertTrue(any(f['fix_id'] == 'fix_dict_to_list' for f in findings))

        # Apply the suggested fix
        for f in findings:
            if f['fix_id']:
                success, desc = apply_fix(f['fix_id'], self.base_dir)
                self.assertTrue(success)

        # Verify fix
        with open(econ_path) as f:
            econ = json.load(f)
        self.assertIsInstance(econ['listings'], list)

    def test_state_persists_across_load_save(self):
        state = load_state(self.base_dir)
        for i in range(3):
            state, _ = record_result(state, 'Game Tick', 'failure')
        save_state(self.base_dir, state)

        loaded = load_state(self.base_dir)
        self.assertEqual(loaded['workflows']['Game Tick']['consecutive_failures'], 3)
        self.assertTrue(loaded['workflows']['Game Tick']['tripped'])


if __name__ == '__main__':
    unittest.main()
