#!/usr/bin/env python3
"""Tests for sim_forge.py — Simulation Forge meta-tool"""
import sys
import os
import json
import unittest
import importlib.util
import tempfile
import subprocess

# Make scripts/ importable
SCRIPTS_DIR = os.path.join(os.path.dirname(__file__), '..', 'scripts')
sys.path.insert(0, os.path.abspath(SCRIPTS_DIR))

# Load sim_forge as a module
def load_sim_forge():
    forge_path = os.path.join(SCRIPTS_DIR, 'sim_forge.py')
    spec = importlib.util.spec_from_file_location('sim_forge', forge_path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod

forge = load_sim_forge()

# ---------------------------------------------------------------------------
# Spec fixtures
# ---------------------------------------------------------------------------

MINIMAL_SPEC = {
    "name": "todo",
    "collections": {
        "items": {"fields": ["title", "done"]}
    },
    "actions": ["create", "update", "delete", "complete"]
}

PM_SPEC = {
    "name": "project_manager",
    "description": "A project management tool with boards, tasks, and sprints",
    "collections": {
        "boards": {"fields": ["name", "description", "created_at"]},
        "tasks": {"fields": ["title", "status", "assignee", "board_id", "priority", "due_date"]},
        "sprints": {"fields": ["name", "start_date", "end_date", "board_id", "status"]}
    },
    "actions": ["create", "update", "delete", "assign", "move", "complete"]
}

INVALID_SPECS = [
    {},                                         # no name
    {"name": "x"},                             # no collections
    {"name": "x", "collections": {}},          # empty collections
    {"name": "123bad"},                        # name starts with digit
    {"name": "has space", "collections": {"a": {"fields": []}}},  # name has space
    {"name": "ok", "collections": "not-a-dict"},  # collections wrong type
]


# ---------------------------------------------------------------------------
# parse_spec tests
# ---------------------------------------------------------------------------

class TestParseSpec(unittest.TestCase):

    def test_parse_valid_json_string(self):
        spec = forge.parse_spec(json.dumps(MINIMAL_SPEC))
        self.assertEqual(spec['name'], 'todo')
        self.assertIn('items', spec['collections'])

    def test_parse_dict_passthrough(self):
        spec = forge.parse_spec(MINIMAL_SPEC)
        self.assertEqual(spec['name'], 'todo')

    def test_parse_pm_spec(self):
        spec = forge.parse_spec(PM_SPEC)
        self.assertEqual(spec['name'], 'project_manager')
        self.assertEqual(len(spec['collections']), 3)
        self.assertIn('boards', spec['collections'])
        self.assertIn('tasks', spec['collections'])
        self.assertIn('sprints', spec['collections'])

    def test_parse_adds_default_actions(self):
        spec = forge.parse_spec({"name": "x", "collections": {"y": {"fields": ["a"]}}})
        self.assertIn('actions', spec)
        self.assertIsInstance(spec['actions'], list)
        self.assertGreater(len(spec['actions']), 0)

    def test_parse_preserves_description(self):
        spec = forge.parse_spec(PM_SPEC)
        self.assertEqual(spec.get('description'), PM_SPEC['description'])

    def test_parse_invalid_no_name(self):
        with self.assertRaises(ValueError):
            forge.parse_spec({})

    def test_parse_invalid_no_collections(self):
        with self.assertRaises(ValueError):
            forge.parse_spec({"name": "x"})

    def test_parse_invalid_empty_collections(self):
        with self.assertRaises(ValueError):
            forge.parse_spec({"name": "x", "collections": {}})

    def test_parse_invalid_name_starts_with_digit(self):
        with self.assertRaises(ValueError):
            forge.parse_spec({"name": "123bad", "collections": {"a": {"fields": []}}})

    def test_parse_invalid_name_has_space(self):
        with self.assertRaises(ValueError):
            forge.parse_spec({"name": "has space", "collections": {"a": {"fields": []}}})

    def test_parse_invalid_collections_not_dict(self):
        with self.assertRaises(ValueError):
            forge.parse_spec({"name": "ok", "collections": "not-a-dict"})

    def test_parse_fields_default_to_list(self):
        spec = forge.parse_spec({
            "name": "x",
            "collections": {"items": {}}  # no fields key
        })
        self.assertIsInstance(spec['collections']['items']['fields'], list)

    def test_parse_preserves_collection_fields(self):
        spec = forge.parse_spec(MINIMAL_SPEC)
        self.assertEqual(spec['collections']['items']['fields'], ['title', 'done'])


# ---------------------------------------------------------------------------
# generate_module tests
# ---------------------------------------------------------------------------

class TestGenerateModule(unittest.TestCase):

    def setUp(self):
        self.todo_spec = forge.parse_spec(MINIMAL_SPEC)
        self.pm_spec = forge.parse_spec(PM_SPEC)
        self.todo_js = forge.generate_module(self.todo_spec)
        self.pm_js = forge.generate_module(self.pm_spec)

    def test_returns_string(self):
        self.assertIsInstance(self.todo_js, str)
        self.assertIsInstance(self.pm_js, str)

    def test_umd_pattern_present(self):
        self.assertIn('typeof module !== \'undefined\'', self.todo_js)
        self.assertIn('module.exports', self.todo_js)

    def test_window_export_name(self):
        # window.SimTodo or window.Sim_todo
        self.assertIn('window.Sim', self.todo_js)
        self.assertIn('window.Sim', self.pm_js)

    def test_exports_initState(self):
        self.assertIn('exports.initState', self.todo_js)

    def test_exports_applyAction(self):
        self.assertIn('exports.applyAction', self.todo_js)

    def test_exports_getState(self):
        self.assertIn('exports.getState', self.todo_js)

    def test_exports_getSchema(self):
        self.assertIn('exports.getSchema', self.todo_js)

    def test_schema_contains_collection_names(self):
        self.assertIn('items', self.todo_js)
        self.assertIn('boards', self.pm_js)
        self.assertIn('tasks', self.pm_js)
        self.assertIn('sprints', self.pm_js)

    def test_schema_contains_fields(self):
        self.assertIn('title', self.todo_js)
        self.assertIn('done', self.todo_js)
        self.assertIn('assignee', self.pm_js)

    def test_initState_handles_snapshot(self):
        self.assertIn('snapshot', self.todo_js)

    def test_applyAction_handles_create(self):
        # Should have create action handling
        self.assertIn('create', self.todo_js)

    def test_applyAction_handles_update(self):
        self.assertIn('update', self.todo_js)

    def test_applyAction_handles_delete(self):
        self.assertIn('delete', self.todo_js)

    def test_node_syntax_check_todo(self):
        """Generated JS must pass node -c syntax check"""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.js', delete=False) as f:
            f.write(self.todo_js)
            fname = f.name
        try:
            result = subprocess.run(['node', '-c', fname], capture_output=True, text=True)
            self.assertEqual(result.returncode, 0,
                             f'node -c failed:\n{result.stderr}')
        finally:
            os.unlink(fname)

    def test_node_syntax_check_pm(self):
        """Generated PM module must pass node -c syntax check"""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.js', delete=False) as f:
            f.write(self.pm_js)
            fname = f.name
        try:
            result = subprocess.run(['node', '-c', fname], capture_output=True, text=True)
            self.assertEqual(result.returncode, 0,
                             f'node -c failed:\n{result.stderr}')
        finally:
            os.unlink(fname)

    def test_var_not_const_let(self):
        """Generated JS uses var for ES5 compatibility (not const/let at module level)"""
        lines = self.todo_js.split('\n')
        for line in lines:
            stripped = line.strip()
            # Skip comments
            if stripped.startswith('//') or stripped.startswith('*'):
                continue
            # const/let at the top of lines are a red flag
            if stripped.startswith('const ') or stripped.startswith('let '):
                self.fail(f'Found const/let in generated module: {line}')

    def test_deep_clone_in_getState(self):
        self.assertIn('JSON.parse(JSON.stringify', self.todo_js)

    def test_multiple_collections_all_present(self):
        for coll_name in ['boards', 'tasks', 'sprints']:
            self.assertIn(coll_name, self.pm_js)


# ---------------------------------------------------------------------------
# generate_state tests
# ---------------------------------------------------------------------------

class TestGenerateState(unittest.TestCase):

    def setUp(self):
        self.todo_spec = forge.parse_spec(MINIMAL_SPEC)
        self.pm_spec = forge.parse_spec(PM_SPEC)
        self.todo_state_str = forge.generate_state(self.todo_spec)
        self.pm_state_str = forge.generate_state(self.pm_spec)

    def test_returns_string(self):
        self.assertIsInstance(self.todo_state_str, str)

    def test_valid_json(self):
        parsed = json.loads(self.todo_state_str)
        self.assertIsInstance(parsed, dict)

    def test_has_schema(self):
        parsed = json.loads(self.todo_state_str)
        self.assertIn('_schema', parsed)

    def test_schema_has_collections(self):
        parsed = json.loads(self.todo_state_str)
        self.assertIn('collections', parsed['_schema'])

    def test_schema_collections_match_spec(self):
        parsed = json.loads(self.todo_state_str)
        self.assertIn('items', parsed['_schema']['collections'])

    def test_schema_fields_preserved(self):
        parsed = json.loads(self.todo_state_str)
        fields = parsed['_schema']['collections']['items']['fields']
        self.assertIn('title', fields)
        self.assertIn('done', fields)

    def test_collections_initialized_as_objects(self):
        parsed = json.loads(self.todo_state_str)
        self.assertIn('items', parsed)
        self.assertIsInstance(parsed['items'], dict)

    def test_pm_state_all_collections(self):
        parsed = json.loads(self.pm_state_str)
        for coll in ['boards', 'tasks', 'sprints']:
            self.assertIn(coll, parsed)
            self.assertIsInstance(parsed[coll], dict)

    def test_has_created_at(self):
        parsed = json.loads(self.todo_state_str)
        self.assertIn('_created_at', parsed)

    def test_has_sim_name(self):
        parsed = json.loads(self.todo_state_str)
        self.assertIn('_sim', parsed)
        self.assertEqual(parsed['_sim'], 'todo')


# ---------------------------------------------------------------------------
# generate_tests tests
# ---------------------------------------------------------------------------

class TestGenerateTests(unittest.TestCase):

    def setUp(self):
        self.todo_spec = forge.parse_spec(MINIMAL_SPEC)
        self.pm_spec = forge.parse_spec(PM_SPEC)
        self.todo_tests = forge.generate_tests(self.todo_spec)
        self.pm_tests = forge.generate_tests(self.pm_spec)

    def test_returns_string(self):
        self.assertIsInstance(self.todo_tests, str)

    def test_has_require(self):
        self.assertIn('require(', self.todo_tests)

    def test_requires_correct_module(self):
        self.assertIn('sim_todo', self.todo_tests)

    def test_has_initState_test(self):
        self.assertIn('initState', self.todo_tests)

    def test_has_create_test(self):
        self.assertIn('create', self.todo_tests)

    def test_has_update_test(self):
        self.assertIn('update', self.todo_tests)

    def test_has_delete_test(self):
        self.assertIn('delete', self.todo_tests)

    def test_has_schema_validation(self):
        self.assertIn('_schema', self.todo_tests)

    def test_has_assert_function(self):
        self.assertIn('function assert(', self.todo_tests)

    def test_tests_for_all_collections(self):
        for coll in ['boards', 'tasks', 'sprints']:
            self.assertIn(coll, self.pm_tests)

    def test_has_edge_case_missing_fields(self):
        # Test for missing required fields / edge cases
        self.assertIn('missing', self.todo_tests.lower())

    def test_has_invalid_id_test(self):
        self.assertIn('nonexistent', self.todo_tests)

    def test_has_applyAction_test(self):
        self.assertIn('applyAction', self.todo_tests)

    def test_has_snapshot_roundtrip(self):
        self.assertIn('JSON.stringify', self.todo_tests)

    def test_has_exit_code(self):
        self.assertIn('process.exit', self.todo_tests)

    def test_node_syntax_check(self):
        """Generated test JS must pass node -c syntax check"""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.js', delete=False) as f:
            f.write(self.todo_tests)
            fname = f.name
        try:
            result = subprocess.run(['node', '-c', fname], capture_output=True, text=True)
            self.assertEqual(result.returncode, 0,
                             f'node -c failed on generated tests:\n{result.stderr}')
        finally:
            os.unlink(fname)

    def test_pm_tests_require_correct_module(self):
        self.assertIn('sim_project_manager', self.pm_tests)


# ---------------------------------------------------------------------------
# forge() integration tests
# ---------------------------------------------------------------------------

class TestForge(unittest.TestCase):

    def setUp(self):
        self.tmp_dir = tempfile.mkdtemp()
        # Create required subdirs that forge expects
        os.makedirs(os.path.join(self.tmp_dir, 'src', 'js'), exist_ok=True)
        os.makedirs(os.path.join(self.tmp_dir, 'state', 'simulations'), exist_ok=True)
        os.makedirs(os.path.join(self.tmp_dir, 'tests'), exist_ok=True)

    def tearDown(self):
        import shutil
        shutil.rmtree(self.tmp_dir)

    def test_forge_creates_three_files(self):
        spec = forge.parse_spec(MINIMAL_SPEC)
        paths = forge.forge(spec, self.tmp_dir)
        self.assertEqual(len(paths), 3)

    def test_forge_js_module_path(self):
        spec = forge.parse_spec(MINIMAL_SPEC)
        paths = forge.forge(spec, self.tmp_dir)
        js_path = next(p for p in paths if p.endswith('.js') and 'sim_' in os.path.basename(p) and 'test' not in os.path.basename(p))
        self.assertTrue(os.path.exists(js_path))
        self.assertIn('sim_todo', js_path)

    def test_forge_state_json_path(self):
        spec = forge.parse_spec(MINIMAL_SPEC)
        paths = forge.forge(spec, self.tmp_dir)
        state_path = next(p for p in paths if p.endswith('.json'))
        self.assertTrue(os.path.exists(state_path))
        self.assertIn('todo', state_path)

    def test_forge_test_js_path(self):
        spec = forge.parse_spec(MINIMAL_SPEC)
        paths = forge.forge(spec, self.tmp_dir)
        test_path = next(p for p in paths if 'test_sim_' in os.path.basename(p))
        self.assertTrue(os.path.exists(test_path))

    def test_forge_js_passes_syntax(self):
        spec = forge.parse_spec(MINIMAL_SPEC)
        paths = forge.forge(spec, self.tmp_dir)
        js_path = next(p for p in paths if p.endswith('.js') and 'sim_' in os.path.basename(p) and 'test' not in os.path.basename(p))
        result = subprocess.run(['node', '-c', js_path], capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, f'node -c failed:\n{result.stderr}')

    def test_forge_test_js_passes_syntax(self):
        spec = forge.parse_spec(MINIMAL_SPEC)
        paths = forge.forge(spec, self.tmp_dir)
        test_path = next(p for p in paths if 'test_sim_' in os.path.basename(p))
        result = subprocess.run(['node', '-c', test_path], capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, f'node -c failed:\n{result.stderr}')

    def test_forge_state_json_valid(self):
        spec = forge.parse_spec(MINIMAL_SPEC)
        paths = forge.forge(spec, self.tmp_dir)
        state_path = next(p for p in paths if p.endswith('.json'))
        with open(state_path) as f:
            data = json.load(f)
        self.assertIn('_schema', data)
        self.assertIn('items', data)

    def test_forge_pm_spec(self):
        spec = forge.parse_spec(PM_SPEC)
        paths = forge.forge(spec, self.tmp_dir)
        self.assertEqual(len(paths), 3)
        js_path = next(p for p in paths if 'sim_project_manager' in p and 'test' not in os.path.basename(p))
        self.assertTrue(os.path.exists(js_path))

    def test_forge_returns_absolute_paths(self):
        spec = forge.parse_spec(MINIMAL_SPEC)
        paths = forge.forge(spec, self.tmp_dir)
        for p in paths:
            self.assertTrue(os.path.isabs(p), f'Path not absolute: {p}')


# ---------------------------------------------------------------------------
# Generated module functional tests (run the generated JS with node)
# ---------------------------------------------------------------------------

class TestGeneratedModuleFunctional(unittest.TestCase):
    """Run the generated JS module against test scenarios using node."""

    def setUp(self):
        self.tmp_dir = tempfile.mkdtemp()
        os.makedirs(os.path.join(self.tmp_dir, 'src', 'js'), exist_ok=True)
        os.makedirs(os.path.join(self.tmp_dir, 'state', 'simulations'), exist_ok=True)
        os.makedirs(os.path.join(self.tmp_dir, 'tests'), exist_ok=True)
        spec = forge.parse_spec(MINIMAL_SPEC)
        paths = forge.forge(spec, self.tmp_dir)
        self.js_path = next(p for p in paths if p.endswith('.js') and 'sim_todo' in p and 'test' not in os.path.basename(p))

    def tearDown(self):
        import shutil
        shutil.rmtree(self.tmp_dir)

    def _run_js(self, script):
        """Run a JS snippet that requires the generated module."""
        full_script = f"var Sim = require({json.dumps(self.js_path)});\n" + script
        with tempfile.NamedTemporaryFile(mode='w', suffix='.js', delete=False) as f:
            f.write(full_script)
            fname = f.name
        try:
            result = subprocess.run(['node', fname], capture_output=True, text=True)
            return result
        finally:
            os.unlink(fname)

    def test_initState_empty(self):
        r = self._run_js("""
var s = Sim.initState();
if (!s || typeof s !== 'object') { process.exit(1); }
if (!s.items || typeof s.items !== 'object') { process.exit(1); }
console.log('ok');
""")
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertIn('ok', r.stdout)

    def test_initState_from_snapshot(self):
        r = self._run_js("""
var snap = { items: { 'itm_1': { id: 'itm_1', title: 'Hello' } }, _schema: { collections: { items: { fields: ['title','done'] } } } };
var s = Sim.initState(snap);
if (!s.items['itm_1']) { console.error('no item'); process.exit(1); }
if (s.items['itm_1'].title !== 'Hello') { console.error('wrong title'); process.exit(1); }
console.log('ok');
""")
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertIn('ok', r.stdout)

    def test_applyAction_create(self):
        r = self._run_js("""
var s = Sim.initState();
var msg = { from: 'user1', payload: { action: 'create_items', data: { title: 'Buy milk', done: false } } };
var s2 = Sim.applyAction(s, msg);
var keys = Object.keys(s2.items);
if (keys.length !== 1) { console.error('expected 1 item, got ' + keys.length); process.exit(1); }
if (s2.items[keys[0]].title !== 'Buy milk') { console.error('wrong title'); process.exit(1); }
console.log('ok');
""")
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertIn('ok', r.stdout)

    def test_applyAction_update(self):
        r = self._run_js("""
var s = Sim.initState();
var msg1 = { from: 'user1', payload: { action: 'create_items', data: { title: 'Task A' } } };
s = Sim.applyAction(s, msg1);
var id = Object.keys(s.items)[0];
var msg2 = { from: 'user1', payload: { action: 'update_items', data: { id: id, title: 'Task A Updated' } } };
s = Sim.applyAction(s, msg2);
if (s.items[id].title !== 'Task A Updated') { console.error('not updated'); process.exit(1); }
console.log('ok');
""")
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertIn('ok', r.stdout)

    def test_applyAction_delete(self):
        r = self._run_js("""
var s = Sim.initState();
var msg1 = { from: 'u', payload: { action: 'create_items', data: { title: 'Del me' } } };
s = Sim.applyAction(s, msg1);
var id = Object.keys(s.items)[0];
var msg2 = { from: 'u', payload: { action: 'delete_items', data: { id: id } } };
s = Sim.applyAction(s, msg2);
if (Object.keys(s.items).length !== 0) { console.error('not deleted'); process.exit(1); }
console.log('ok');
""")
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertIn('ok', r.stdout)

    def test_getState_returns_clone(self):
        r = self._run_js("""
var s = Sim.initState();
var got = Sim.getState();
if (!got || typeof got !== 'object') { console.error('bad getState'); process.exit(1); }
console.log('ok');
""")
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertIn('ok', r.stdout)

    def test_getSchema_returns_schema(self):
        r = self._run_js("""
var s = Sim.initState();
var schema = Sim.getSchema();
if (!schema || !schema.collections || !schema.collections.items) { console.error('bad schema'); process.exit(1); }
console.log('ok');
""")
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertIn('ok', r.stdout)

    def test_pure_function_original_unchanged(self):
        r = self._run_js("""
var s = Sim.initState();
var original_keys = Object.keys(s.items).length;
var msg = { from: 'u', payload: { action: 'create_items', data: { title: 'X' } } };
Sim.applyAction(s, msg);
if (Object.keys(s.items).length !== original_keys) { console.error('original mutated!'); process.exit(1); }
console.log('ok');
""")
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertIn('ok', r.stdout)

    def test_snapshot_roundtrip(self):
        r = self._run_js("""
var s = Sim.initState();
var msg = { from: 'u', payload: { action: 'create_items', data: { title: 'Persist me', done: false } } };
s = Sim.applyAction(s, msg);
var json = JSON.stringify(s);
var restored = Sim.initState(JSON.parse(json));
var keys = Object.keys(restored.items);
if (keys.length !== 1) { console.error('wrong item count after restore'); process.exit(1); }
if (restored.items[keys[0]].title !== 'Persist me') { console.error('wrong title after restore'); process.exit(1); }
console.log('ok');
""")
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertIn('ok', r.stdout)


# ---------------------------------------------------------------------------
# Generated test file execution
# ---------------------------------------------------------------------------

class TestGeneratedTestsRun(unittest.TestCase):
    """The auto-generated test file should itself pass when run with node."""

    def setUp(self):
        self.tmp_dir = tempfile.mkdtemp()
        os.makedirs(os.path.join(self.tmp_dir, 'src', 'js'), exist_ok=True)
        os.makedirs(os.path.join(self.tmp_dir, 'state', 'simulations'), exist_ok=True)
        os.makedirs(os.path.join(self.tmp_dir, 'tests'), exist_ok=True)

    def tearDown(self):
        import shutil
        shutil.rmtree(self.tmp_dir)

    def test_generated_todo_tests_pass(self):
        spec = forge.parse_spec(MINIMAL_SPEC)
        paths = forge.forge(spec, self.tmp_dir)
        test_path = next(p for p in paths if 'test_sim_todo' in p)
        result = subprocess.run(['node', test_path], capture_output=True, text=True)
        self.assertEqual(result.returncode, 0,
                         f'Generated tests failed:\nstdout: {result.stdout}\nstderr: {result.stderr}')

    def test_generated_pm_tests_pass(self):
        spec = forge.parse_spec(PM_SPEC)
        paths = forge.forge(spec, self.tmp_dir)
        test_path = next(p for p in paths if 'test_sim_project_manager' in p)
        result = subprocess.run(['node', test_path], capture_output=True, text=True)
        self.assertEqual(result.returncode, 0,
                         f'Generated PM tests failed:\nstdout: {result.stdout}\nstderr: {result.stderr}')


# ---------------------------------------------------------------------------
# CLI tests
# ---------------------------------------------------------------------------

class TestCLI(unittest.TestCase):

    def setUp(self):
        self.tmp_dir = tempfile.mkdtemp()
        os.makedirs(os.path.join(self.tmp_dir, 'src', 'js'), exist_ok=True)
        os.makedirs(os.path.join(self.tmp_dir, 'state', 'simulations'), exist_ok=True)
        os.makedirs(os.path.join(self.tmp_dir, 'tests'), exist_ok=True)
        self.forge_script = os.path.join(SCRIPTS_DIR, 'sim_forge.py')

    def tearDown(self):
        import shutil
        shutil.rmtree(self.tmp_dir)

    def _run_cli(self, args, stdin=None):
        cmd = ['python3', self.forge_script] + args
        return subprocess.run(cmd, capture_output=True, text=True, input=stdin)

    def test_cli_from_spec_file(self):
        spec_path = os.path.join(self.tmp_dir, 'todo_spec.json')
        with open(spec_path, 'w') as f:
            json.dump(MINIMAL_SPEC, f)
        r = self._run_cli([spec_path, '--output-dir', self.tmp_dir])
        self.assertEqual(r.returncode, 0, f'CLI failed:\n{r.stdout}\n{r.stderr}')
        self.assertTrue(os.path.exists(os.path.join(self.tmp_dir, 'src', 'js', 'sim_todo.js')))

    def test_cli_from_stdin(self):
        spec_json = json.dumps(MINIMAL_SPEC)
        r = self._run_cli(['--output-dir', self.tmp_dir], stdin=spec_json)
        self.assertEqual(r.returncode, 0, f'CLI stdin failed:\n{r.stdout}\n{r.stderr}')
        self.assertTrue(os.path.exists(os.path.join(self.tmp_dir, 'src', 'js', 'sim_todo.js')))

    def test_cli_creates_state_json(self):
        spec_path = os.path.join(self.tmp_dir, 'pm_spec.json')
        with open(spec_path, 'w') as f:
            json.dump(PM_SPEC, f)
        r = self._run_cli([spec_path, '--output-dir', self.tmp_dir])
        self.assertEqual(r.returncode, 0, f'CLI failed:\n{r.stdout}\n{r.stderr}')
        state_path = os.path.join(self.tmp_dir, 'state', 'simulations', 'project_manager', 'state.json')
        self.assertTrue(os.path.exists(state_path))

    def test_cli_creates_test_file(self):
        spec_path = os.path.join(self.tmp_dir, 'spec.json')
        with open(spec_path, 'w') as f:
            json.dump(MINIMAL_SPEC, f)
        r = self._run_cli([spec_path, '--output-dir', self.tmp_dir])
        self.assertEqual(r.returncode, 0)
        self.assertTrue(os.path.exists(os.path.join(self.tmp_dir, 'tests', 'test_sim_todo.js')))

    def test_cli_reports_created_files(self):
        spec_path = os.path.join(self.tmp_dir, 'spec.json')
        with open(spec_path, 'w') as f:
            json.dump(MINIMAL_SPEC, f)
        r = self._run_cli([spec_path, '--output-dir', self.tmp_dir])
        self.assertEqual(r.returncode, 0)
        self.assertIn('sim_todo', r.stdout)

    def test_cli_invalid_spec_exits_nonzero(self):
        r = self._run_cli(['--output-dir', self.tmp_dir], stdin='{}')
        self.assertNotEqual(r.returncode, 0)

    def test_cli_no_args_reads_stdin(self):
        spec_json = json.dumps(MINIMAL_SPEC)
        r = self._run_cli(['--output-dir', self.tmp_dir], stdin=spec_json)
        self.assertEqual(r.returncode, 0, f'stdin mode failed:\n{r.stdout}\n{r.stderr}')


if __name__ == '__main__':
    unittest.main(verbosity=2)
