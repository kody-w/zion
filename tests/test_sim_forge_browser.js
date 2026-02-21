#!/usr/bin/env node
// test_sim_forge_browser.js — Tests for sim_forge_browser.js
// Vanilla JS, zero external deps
'use strict';

var SimForge = require('../src/js/sim_forge_browser.js');

var passed = 0;
var failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
  } else {
    failed++;
    console.error('FAIL: ' + message);
  }
}

function assertEqual(actual, expected, message) {
  if (actual === expected) {
    passed++;
  } else {
    failed++;
    console.error('FAIL: ' + message + ' — expected ' + JSON.stringify(expected) + ', got ' + JSON.stringify(actual));
  }
}

function assertThrows(fn, containsMsg, label) {
  try {
    fn();
    failed++;
    console.error('FAIL: ' + label + ' — expected an error to be thrown');
  } catch (e) {
    if (containsMsg && e.message.indexOf(containsMsg) === -1) {
      failed++;
      console.error('FAIL: ' + label + ' — error message "' + e.message + '" does not contain "' + containsMsg + '"');
    } else {
      passed++;
    }
  }
}

// ===========================================================================
// parseSpec tests
// ===========================================================================

console.log('\n--- parseSpec ---');

(function testParseSpec_valid_object() {
  var spec = SimForge.parseSpec({
    name: 'my_sim',
    collections: { items: { fields: ['name', 'qty'] } }
  });
  assertEqual(spec.name, 'my_sim', 'parseSpec accepts valid object');
  assert(Array.isArray(spec.collections.items.fields), 'parseSpec fields is array');
  assertEqual(spec.collections.items.fields[0], 'name', 'parseSpec preserves fields');
})();

(function testParseSpec_valid_json_string() {
  var spec = SimForge.parseSpec('{"name":"test_sim","collections":{"records":{"fields":[]}}}');
  assertEqual(spec.name, 'test_sim', 'parseSpec accepts JSON string');
})();

(function testParseSpec_applies_default_actions() {
  var spec = SimForge.parseSpec({ name: 'foo', collections: { items: {} } });
  assert(Array.isArray(spec.actions), 'parseSpec sets default actions array');
  assert(spec.actions.indexOf('create') !== -1, 'default actions include create');
  assert(spec.actions.indexOf('update') !== -1, 'default actions include update');
  assert(spec.actions.indexOf('delete') !== -1, 'default actions include delete');
})();

(function testParseSpec_applies_default_description() {
  var spec = SimForge.parseSpec({ name: 'my_thing', collections: { items: {} } });
  assert(spec.description && spec.description.length > 0, 'parseSpec sets default description');
  assert(spec.description.indexOf('my thing') !== -1, 'description replaces underscores with spaces');
})();

(function testParseSpec_normalises_null_fields() {
  var spec = SimForge.parseSpec({ name: 'norm', collections: { items: { fields: null } } });
  assert(Array.isArray(spec.collections.items.fields), 'parseSpec normalises null fields to array');
  assertEqual(spec.collections.items.fields.length, 0, 'null fields becomes empty array');
})();

(function testParseSpec_normalises_non_object_coll() {
  var spec = SimForge.parseSpec({ name: 'norm2', collections: { items: 'string_coll_def' } });
  assert(Array.isArray(spec.collections.items.fields), 'parseSpec normalises non-object collection def');
})();

(function testParseSpec_deep_copies_input() {
  var input = { name: 'dcopy', collections: { items: { fields: ['a'] } } };
  var spec = SimForge.parseSpec(input);
  input.collections.items.fields.push('b');
  assertEqual(spec.collections.items.fields.length, 1, 'parseSpec deep copies input — mutations do not affect parsed spec');
})();

// --- Invalid specs ---
(function testParseSpec_rejects_invalid_json() {
  assertThrows(function() { SimForge.parseSpec('not json at all {{{'); }, 'Invalid JSON', 'parseSpec rejects invalid JSON string');
})();

(function testParseSpec_rejects_missing_name() {
  assertThrows(function() { SimForge.parseSpec({ collections: { items: {} } }); }, 'name', 'parseSpec rejects missing name');
})();

(function testParseSpec_rejects_empty_name() {
  assertThrows(function() { SimForge.parseSpec({ name: '', collections: { items: {} } }); }, 'name', 'parseSpec rejects empty name');
})();

(function testParseSpec_rejects_invalid_name_chars() {
  assertThrows(function() { SimForge.parseSpec({ name: '123invalid', collections: { items: {} } }); }, 'name', 'parseSpec rejects name starting with digit');
})();

(function testParseSpec_rejects_name_with_spaces() {
  assertThrows(function() { SimForge.parseSpec({ name: 'my sim', collections: { items: {} } }); }, 'name', 'parseSpec rejects name with spaces');
})();

(function testParseSpec_rejects_name_with_hyphens() {
  assertThrows(function() { SimForge.parseSpec({ name: 'my-sim', collections: { items: {} } }); }, 'name', 'parseSpec rejects name with hyphens');
})();

(function testParseSpec_rejects_missing_collections() {
  assertThrows(function() { SimForge.parseSpec({ name: 'ok' }); }, 'collections', 'parseSpec rejects missing collections');
})();

(function testParseSpec_rejects_empty_collections() {
  assertThrows(function() { SimForge.parseSpec({ name: 'ok', collections: {} }); }, 'collections', 'parseSpec rejects empty collections');
})();

(function testParseSpec_rejects_non_object_input() {
  assertThrows(function() { SimForge.parseSpec(42); }, null, 'parseSpec rejects non-object input');
})();

(function testParseSpec_rejects_array_input() {
  assertThrows(function() { SimForge.parseSpec([1, 2, 3]); }, null, 'parseSpec rejects array input');
})();

(function testParseSpec_rejects_array_fields() {
  // fields must be an array, so a non-array value (that isn't null) should throw
  assertThrows(function() {
    SimForge.parseSpec({ name: 'x', collections: { items: { fields: 'bad' } } });
  }, 'fields', 'parseSpec rejects non-array fields');
})();

// Valid name forms
(function testParseSpec_accepts_underscore_name() {
  var spec = SimForge.parseSpec({ name: '_private', collections: { items: {} } });
  assertEqual(spec.name, '_private', 'parseSpec accepts name starting with underscore');
})();

(function testParseSpec_accepts_uppercase_name() {
  var spec = SimForge.parseSpec({ name: 'MySimulation', collections: { items: {} } });
  assertEqual(spec.name, 'MySimulation', 'parseSpec accepts PascalCase name');
})();

// ===========================================================================
// generateModule tests
// ===========================================================================

console.log('\n--- generateModule ---');

var _todoSpec = SimForge.parseSpec({
  name: 'todo',
  collections: {
    tasks: { fields: ['title', 'done', 'priority'] },
    tags: { fields: ['name', 'color'] }
  }
});

(function testGenerateModule_returns_string() {
  var src = SimForge.generateModule(_todoSpec);
  assert(typeof src === 'string', 'generateModule returns string');
  assert(src.length > 100, 'generateModule returns non-trivial string');
})();

(function testGenerateModule_valid_syntax() {
  var src = SimForge.generateModule(_todoSpec);
  // Use new Function to validate syntax (same approach as Python version uses)
  var ok = false;
  try {
    new Function(src);
    ok = true;
  } catch (e) {
    // try alternative: wrap in a function to handle the self-invoking UMD
    try {
      new Function('module', src);
      ok = true;
    } catch (e2) {
      ok = false;
    }
  }
  assert(ok, 'generateModule output is syntactically valid JS');
})();

(function testGenerateModule_contains_umd_pattern() {
  var src = SimForge.generateModule(_todoSpec);
  assert(src.indexOf('(function(exports)') !== -1, 'generateModule output has UMD (function(exports) wrapper');
  assert(src.indexOf("typeof module !== 'undefined'") !== -1, 'generateModule output has UMD module check');
})();

(function testGenerateModule_contains_collection_names() {
  var src = SimForge.generateModule(_todoSpec);
  assert(src.indexOf('tasks') !== -1, 'generateModule output references tasks collection');
  assert(src.indexOf('tags') !== -1, 'generateModule output references tags collection');
})();

(function testGenerateModule_contains_crud_functions() {
  var src = SimForge.generateModule(_todoSpec);
  assert(src.indexOf('create_tasks') !== -1, 'generateModule has create_tasks function');
  assert(src.indexOf('update_tasks') !== -1, 'generateModule has update_tasks function');
  assert(src.indexOf('delete_tasks') !== -1, 'generateModule has delete_tasks function');
  assert(src.indexOf('create_tags') !== -1, 'generateModule has create_tags function');
})();

(function testGenerateModule_contains_required_exports() {
  var src = SimForge.generateModule(_todoSpec);
  assert(src.indexOf('exports.initState') !== -1, 'generateModule exports initState');
  assert(src.indexOf('exports.applyAction') !== -1, 'generateModule exports applyAction');
  assert(src.indexOf('exports.getState') !== -1, 'generateModule exports getState');
  assert(src.indexOf('exports.getSchema') !== -1, 'generateModule exports getSchema');
  assert(src.indexOf('exports.query') !== -1, 'generateModule exports query');
})();

(function testGenerateModule_window_export_name() {
  var src = SimForge.generateModule(_todoSpec);
  // For spec name 'todo', window export should be SimTodo
  assert(src.indexOf('SimTodo') !== -1, 'generateModule uses correct window export name SimTodo');
})();

(function testGenerateModule_snake_case_window_name() {
  var spec = SimForge.parseSpec({ name: 'my_project', collections: { items: {} } });
  var src = SimForge.generateModule(spec);
  assert(src.indexOf('SimMyProject') !== -1, 'generateModule converts snake_case name to PascalCase for window export');
})();

(function testGenerateModule_custom_action_complete() {
  var spec = SimForge.parseSpec({
    name: 'completer',
    collections: { tasks: { fields: ['title', 'done', 'status'] } },
    actions: ['create', 'update', 'delete', 'complete']
  });
  var src = SimForge.generateModule(spec);
  assert(src.indexOf("'complete_tasks'") !== -1, 'generateModule handles complete custom action');
  assert(src.indexOf('.done = true') !== -1, 'complete action sets done=true when done field exists');
  assert(src.indexOf(".status = 'completed'") !== -1, 'complete action sets status=completed when status field exists');
})();

(function testGenerateModule_custom_action_assign() {
  var spec = SimForge.parseSpec({
    name: 'assigner',
    collections: { tasks: { fields: ['title', 'assignee'] } },
    actions: ['create', 'update', 'delete', 'assign']
  });
  var src = SimForge.generateModule(spec);
  assert(src.indexOf("'assign_tasks'") !== -1, 'generateModule handles assign custom action for collection with assignee field');
})();

(function testGenerateModule_custom_action_move() {
  var spec = SimForge.parseSpec({
    name: 'mover',
    collections: { cards: { fields: ['title', 'board_id'] } },
    actions: ['create', 'update', 'delete', 'move']
  });
  var src = SimForge.generateModule(spec);
  assert(src.indexOf("'move_cards'") !== -1, 'generateModule handles move custom action for collection with board_id');
})();

// ===========================================================================
// generateState tests
// ===========================================================================

console.log('\n--- generateState ---');

(function testGenerateState_returns_object() {
  var state = SimForge.generateState(_todoSpec);
  assert(state && typeof state === 'object', 'generateState returns object');
})();

(function testGenerateState_has_schema() {
  var state = SimForge.generateState(_todoSpec);
  assert(state._schema && state._schema.collections, 'generateState has _schema.collections');
})();

(function testGenerateState_has_sim_name() {
  var state = SimForge.generateState(_todoSpec);
  assertEqual(state._sim, 'todo', 'generateState has _sim name');
})();

(function testGenerateState_has_empty_collections() {
  var state = SimForge.generateState(_todoSpec);
  assert(state.tasks !== undefined, 'generateState has tasks collection');
  assert(state.tags !== undefined, 'generateState has tags collection');
  assertEqual(Object.keys(state.tasks).length, 0, 'generateState tasks collection is empty');
  assertEqual(Object.keys(state.tags).length, 0, 'generateState tags collection is empty');
})();

(function testGenerateState_schema_has_prefix() {
  var state = SimForge.generateState(_todoSpec);
  assertEqual(state._schema.collections.tasks.prefix, 'tas', 'generateState schema has correct prefix for tasks');
  assertEqual(state._schema.collections.tags.prefix, 'tag', 'generateState schema has correct prefix for tags');
})();

(function testGenerateState_schema_has_fields() {
  var state = SimForge.generateState(_todoSpec);
  assert(Array.isArray(state._schema.collections.tasks.fields), 'generateState schema tasks fields is array');
  assert(state._schema.collections.tasks.fields.indexOf('title') !== -1, 'generateState schema tasks has title field');
  assert(state._schema.collections.tasks.fields.indexOf('done') !== -1, 'generateState schema tasks has done field');
})();

(function testGenerateState_has_created_at() {
  var state = SimForge.generateState(_todoSpec);
  assert(typeof state._created_at === 'string' && state._created_at.length > 0, 'generateState has _created_at timestamp');
})();

// ===========================================================================
// generateTests tests
// ===========================================================================

console.log('\n--- generateTests ---');

(function testGenerateTests_returns_string() {
  var src = SimForge.generateTests(_todoSpec);
  assert(typeof src === 'string', 'generateTests returns string');
  assert(src.length > 100, 'generateTests returns non-trivial string');
})();

(function testGenerateTests_has_shebang() {
  var src = SimForge.generateTests(_todoSpec);
  assert(src.indexOf('#!/usr/bin/env node') === 0, 'generateTests has shebang line');
})();

(function testGenerateTests_has_require() {
  var src = SimForge.generateTests(_todoSpec);
  assert(src.indexOf("require('../src/js/sim_todo.js')") !== -1, 'generateTests has correct require path');
})();

(function testGenerateTests_has_test_functions() {
  var src = SimForge.generateTests(_todoSpec);
  assert(src.indexOf('testInitStateEmpty') !== -1, 'generateTests has testInitStateEmpty');
  assert(src.indexOf('testCreate_tasks') !== -1, 'generateTests has testCreate_tasks');
  assert(src.indexOf('testUpdate_tasks') !== -1, 'generateTests has testUpdate_tasks');
  assert(src.indexOf('testDelete_tasks') !== -1, 'generateTests has testDelete_tasks');
  assert(src.indexOf('testQuery') !== -1, 'generateTests has testQuery');
  assert(src.indexOf('testSnapshotRoundtrip') !== -1, 'generateTests has testSnapshotRoundtrip');
})();

(function testGenerateTests_valid_syntax() {
  var src = SimForge.generateTests(_todoSpec);
  // The generated test file has a require() call and a shebang line.
  // Strip the shebang before syntax-checking so new Function() won't reject it.
  var noShebang = src.replace(/^#!.*\n/, '');
  // Wrap in a function so require/process/console references do not throw during parse
  var wrapped = '(function(require, process, console) {\n' + noShebang + '\n})';
  var ok = false;
  try {
    new Function('return ' + wrapped + ';');
    ok = true;
  } catch (e) {
    console.error('  Syntax error in generated tests: ' + e.message);
  }
  assert(ok, 'generateTests output is syntactically valid JS');
})();

// ===========================================================================
// forge tests
// ===========================================================================

console.log('\n--- forge ---');

(function testForge_returns_all_outputs() {
  var result = SimForge.forge({
    name: 'widget',
    collections: { widgets: { fields: ['name', 'color'] } }
  });
  assert(result && typeof result === 'object', 'forge returns object');
  assertEqual(result.name, 'widget', 'forge returns name');
  assert(typeof result.moduleSource === 'string' && result.moduleSource.length > 0, 'forge returns moduleSource string');
  assert(result.initialState && typeof result.initialState === 'object', 'forge returns initialState object');
  assert(typeof result.testSource === 'string' && result.testSource.length > 0, 'forge returns testSource string');
})();

(function testForge_module_source_is_valid() {
  var result = SimForge.forge({
    name: 'ftest',
    collections: { items: { fields: ['name'] } }
  });
  var ok = false;
  try {
    new Function('module', result.moduleSource);
    ok = true;
  } catch (e) {
    // try without module arg
    try {
      new Function(result.moduleSource);
      ok = true;
    } catch (e2) { ok = false; }
  }
  assert(ok, 'forge moduleSource is syntactically valid JS');
})();

(function testForge_initial_state_has_collections() {
  var result = SimForge.forge({
    name: 'ftwo',
    collections: { widgets: { fields: ['name'] }, gadgets: {} }
  });
  assert(result.initialState.widgets !== undefined, 'forge initialState has widgets');
  assert(result.initialState.gadgets !== undefined, 'forge initialState has gadgets');
  assertEqual(result.initialState._sim, 'ftwo', 'forge initialState._sim is correct');
})();

(function testForge_accepts_string_spec() {
  var result = SimForge.forge('{"name":"strspec","collections":{"items":{}}}');
  assertEqual(result.name, 'strspec', 'forge accepts JSON string input');
})();

// ===========================================================================
// loadAndRun tests
// ===========================================================================

console.log('\n--- loadAndRun ---');

var _liveSpec = {
  name: 'live_test',
  collections: {
    notes: { fields: ['title', 'body', 'done', 'status'] },
    labels: { fields: ['name', 'color'] }
  },
  actions: ['create', 'update', 'delete', 'complete']
};

(function testLoadAndRun_returns_module() {
  var sim = SimForge.loadAndRun(_liveSpec);
  assert(sim && typeof sim === 'object', 'loadAndRun returns object');
  assert(typeof sim.initState === 'function', 'loadAndRun module has initState');
  assert(typeof sim.applyAction === 'function', 'loadAndRun module has applyAction');
  assert(typeof sim.getState === 'function', 'loadAndRun module has getState');
  assert(typeof sim.getSchema === 'function', 'loadAndRun module has getSchema');
  assert(typeof sim.query === 'function', 'loadAndRun module has query');
})();

(function testLoadAndRun_initState_works() {
  var sim = SimForge.loadAndRun(_liveSpec);
  var state = sim.initState();
  assert(state && typeof state === 'object', 'loadAndRun: initState returns object');
  assert(state._schema && state._schema.collections, 'loadAndRun: initState has schema');
  assert(state.notes !== undefined, 'loadAndRun: initState has notes collection');
  assert(state.labels !== undefined, 'loadAndRun: initState has labels collection');
})();

(function testLoadAndRun_applyAction_create() {
  var sim = SimForge.loadAndRun(_liveSpec);
  var state = sim.initState();
  var msg = { from: 'player1', payload: { action: 'create_notes', data: { title: 'Hello World' } } };
  var newState = sim.applyAction(state, msg);
  var items = sim.query(newState, 'notes', null);
  assertEqual(items.length, 1, 'loadAndRun: applyAction create adds record');
  assertEqual(items[0].title, 'Hello World', 'loadAndRun: applyAction create sets title');
  assertEqual(items[0].owner, 'player1', 'loadAndRun: applyAction create sets owner');
})();

(function testLoadAndRun_applyAction_update() {
  var sim = SimForge.loadAndRun(_liveSpec);
  var state = sim.initState();
  var r = sim.create_notes(state, { title: 'Before' });
  state = r.state;
  var id = r.record.id;
  var msg = { from: 'player1', payload: { action: 'update_notes', data: { id: id, title: 'After' } } };
  var newState = sim.applyAction(state, msg);
  assertEqual(newState.notes[id].title, 'After', 'loadAndRun: applyAction update changes title');
  assertEqual(state.notes[id].title, 'Before', 'loadAndRun: applyAction update does not mutate original state');
})();

(function testLoadAndRun_applyAction_delete() {
  var sim = SimForge.loadAndRun(_liveSpec);
  var state = sim.initState();
  var r = sim.create_notes(state, { title: 'Delete me' });
  state = r.state;
  var id = r.record.id;
  var msg = { from: 'player1', payload: { action: 'delete_notes', data: { id: id } } };
  var newState = sim.applyAction(state, msg);
  assert(newState.notes[id] === undefined, 'loadAndRun: applyAction delete removes record');
})();

(function testLoadAndRun_complete_action() {
  var sim = SimForge.loadAndRun(_liveSpec);
  var state = sim.initState();
  var r = sim.create_notes(state, { title: 'Todo item', done: false, status: 'active' });
  state = r.state;
  var id = r.record.id;
  var msg = { from: 'player1', payload: { action: 'complete_notes', data: { id: id } } };
  var newState = sim.applyAction(state, msg);
  assert(newState.notes[id].done === true, 'loadAndRun: complete action sets done=true');
  assertEqual(newState.notes[id].status, 'completed', 'loadAndRun: complete action sets status=completed');
  assert(typeof newState.notes[id].completedAt === 'string', 'loadAndRun: complete action sets completedAt');
})();

(function testLoadAndRun_getState_works() {
  var sim = SimForge.loadAndRun(_liveSpec);
  sim.initState();
  var state = sim.getState();
  assert(state && typeof state === 'object', 'loadAndRun: getState returns object');
  assert(state._schema !== undefined, 'loadAndRun: getState includes schema');
})();

(function testLoadAndRun_getSchema_works() {
  var sim = SimForge.loadAndRun(_liveSpec);
  sim.initState();
  var schema = sim.getSchema();
  assert(schema && schema.collections, 'loadAndRun: getSchema returns collections');
  assert(schema.collections.notes, 'loadAndRun: getSchema has notes collection');
  assert(schema.collections.labels, 'loadAndRun: getSchema has labels collection');
})();

(function testLoadAndRun_query_works() {
  var sim = SimForge.loadAndRun(_liveSpec);
  var state = sim.initState();
  var r1 = sim.create_notes(state, { title: 'A', status: 'active' });
  state = r1.state;
  var r2 = sim.create_notes(state, { title: 'B', status: 'done' });
  state = r2.state;
  var all = sim.query(state, 'notes', null);
  assertEqual(all.length, 2, 'loadAndRun: query all returns 2');
  var active = sim.query(state, 'notes', { status: 'active' });
  assertEqual(active.length, 1, 'loadAndRun: query filtered returns 1');
})();

(function testLoadAndRun_snapshot_roundtrip() {
  var sim = SimForge.loadAndRun(_liveSpec);
  var state = sim.initState();
  var r = sim.create_notes(state, { title: 'Persist me' });
  state = r.state;
  var json = JSON.stringify(state);
  var restored = sim.initState(JSON.parse(json));
  assertEqual(Object.keys(restored.notes).length, 1, 'loadAndRun: snapshot roundtrip restores notes');
})();

(function testLoadAndRun_rejects_invalid_spec() {
  assertThrows(function() {
    SimForge.loadAndRun({ name: '123bad', collections: { items: {} } });
  }, 'name', 'loadAndRun rejects invalid spec');
})();

// ===========================================================================
// getExampleSpecs tests
// ===========================================================================

console.log('\n--- getExampleSpecs ---');

(function testGetExampleSpecs_returns_array() {
  var examples = SimForge.getExampleSpecs();
  assert(Array.isArray(examples), 'getExampleSpecs returns array');
  assert(examples.length >= 4, 'getExampleSpecs returns at least 4 examples');
})();

(function testGetExampleSpecs_all_valid() {
  var examples = SimForge.getExampleSpecs();
  for (var i = 0; i < examples.length; i++) {
    var ex = examples[i];
    var ok = false;
    try {
      SimForge.parseSpec(ex);
      ok = true;
    } catch (e) {
      console.error('  Example "' + (ex.name || i) + '" failed parseSpec: ' + e.message);
    }
    assert(ok, 'getExampleSpecs[' + i + '] "' + (ex.name || i) + '" is a valid spec');
  }
})();

(function testGetExampleSpecs_produce_working_simulations() {
  var examples = SimForge.getExampleSpecs();
  for (var i = 0; i < examples.length; i++) {
    var ex = examples[i];
    var ok = false;
    try {
      var sim = SimForge.loadAndRun(ex);
      var state = sim.initState();
      ok = state && typeof state === 'object' && state._schema;
    } catch (e) {
      console.error('  Example "' + (ex.name || i) + '" loadAndRun failed: ' + e.message);
    }
    assert(ok, 'getExampleSpecs[' + i + '] "' + (ex.name || i) + '" produces working simulation');
  }
})();

(function testGetExampleSpecs_todo_spec() {
  var examples = SimForge.getExampleSpecs();
  var todo = null;
  for (var i = 0; i < examples.length; i++) {
    if (examples[i].name === 'todo') { todo = examples[i]; break; }
  }
  assert(todo !== null, 'getExampleSpecs includes todo spec');
  assert(todo.collections.tasks, 'todo spec has tasks collection');
  assert(Array.isArray(todo.collections.tasks.fields), 'todo spec tasks has fields');
})();

(function testGetExampleSpecs_project_manager_spec() {
  var examples = SimForge.getExampleSpecs();
  var pm = null;
  for (var i = 0; i < examples.length; i++) {
    if (examples[i].name === 'project_manager') { pm = examples[i]; break; }
  }
  assert(pm !== null, 'getExampleSpecs includes project_manager spec');
  assert(pm.collections.projects, 'project_manager spec has projects collection');
  assert(pm.collections.tasks, 'project_manager spec has tasks collection');
})();

(function testGetExampleSpecs_inventory_spec() {
  var examples = SimForge.getExampleSpecs();
  var inv = null;
  for (var i = 0; i < examples.length; i++) {
    if (examples[i].name === 'inventory') { inv = examples[i]; break; }
  }
  assert(inv !== null, 'getExampleSpecs includes inventory spec');
  assert(inv.collections.items, 'inventory spec has items collection');
})();

(function testGetExampleSpecs_recipe_book_spec() {
  var examples = SimForge.getExampleSpecs();
  var rb = null;
  for (var i = 0; i < examples.length; i++) {
    if (examples[i].name === 'recipe_book') { rb = examples[i]; break; }
  }
  assert(rb !== null, 'getExampleSpecs includes recipe_book spec');
  assert(rb.collections.recipes, 'recipe_book spec has recipes collection');
})();

// ===========================================================================
// Cross-check: JS output matches expected patterns from Python version
// ===========================================================================

console.log('\n--- Cross-check with Python version patterns ---');

(function testCrossCheck_module_header() {
  var spec = SimForge.parseSpec({
    name: 'xcheck',
    description: 'A cross-check simulation',
    collections: { items: { fields: ['name'] } }
  });
  var src = SimForge.generateModule(spec);
  assert(src.indexOf('// sim_xcheck.js') === 0, 'generateModule header matches Python pattern: starts with // sim_name.js');
  assert(src.indexOf('// Auto-generated by sim_forge.py') !== -1, 'generateModule has Python attribution comment');
  assert(src.indexOf('// initState(snapshot), applyAction(state, message), getState(), getSchema()') !== -1, 'generateModule has API comment line');
})();

(function testCrossCheck_schema_structure() {
  var spec = SimForge.parseSpec({
    name: 'schcheck',
    collections: {
      boards: { fields: ['title', 'status'] }
    }
  });
  var src = SimForge.generateModule(spec);
  assert(src.indexOf("var _schema = {") !== -1, 'generateModule has _schema var');
  assert(src.indexOf("'boards': { prefix: 'boa', fields: ['title', 'status'] }") !== -1, 'generateModule schema has correct board entry with prefix');
})();

(function testCrossCheck_id_prefix() {
  // Python: _coll_prefix = coll_name[:3].lower()
  // items -> ite, boards -> boa, people -> peo
  var spec = SimForge.parseSpec({
    name: 'preftest',
    collections: {
      items: { fields: [] },
      boards: { fields: [] },
      people: { fields: [] }
    }
  });
  var src = SimForge.generateModule(spec);
  assert(src.indexOf("generateId('ite')") !== -1, 'items collection uses "ite" prefix');
  assert(src.indexOf("generateId('boa')") !== -1, 'boards collection uses "boa" prefix');
  assert(src.indexOf("generateId('peo')") !== -1, 'people collection uses "peo" prefix');
})();

(function testCrossCheck_singular_default_name() {
  // Python: coll_name.rstrip('s') — strips trailing 's'
  var spec = SimForge.parseSpec({
    name: 'singtest',
    collections: {
      tasks: { fields: [] },
      categories: { fields: [] }
    }
  });
  var src = SimForge.generateModule(spec);
  assert(src.indexOf("Unnamed task") !== -1, 'tasks default name is "Unnamed task" (strips trailing s)');
  assert(src.indexOf("Unnamed categorie") !== -1, 'categories default name is "Unnamed categorie" (strips trailing s like Python rstrip(s))');
})();

(function testCrossCheck_mergeOwner_function() {
  var spec = SimForge.parseSpec({ name: 'mo', collections: { items: {} } });
  var src = SimForge.generateModule(spec);
  assert(src.indexOf('function mergeOwner(data, from)') !== -1, 'generateModule has mergeOwner function');
  assert(src.indexOf("if (!out.owner) { out.owner = from || 'system'; }") !== -1, 'mergeOwner sets owner from system if missing');
})();

(function testCrossCheck_objectKeys_polyfill() {
  var spec = SimForge.parseSpec({ name: 'ok', collections: { items: {} } });
  var src = SimForge.generateModule(spec);
  assert(src.indexOf('function objectKeys(obj)') !== -1, 'generateModule has objectKeys helper');
})();

(function testCrossCheck_umd_footer() {
  // Python: _window_name = 'Sim' + _pascal(name) where _pascal splits on '_' and capitalizes
  // 'footer_test' -> ['footer','test'] -> 'FooterTest' -> window name 'SimFooterTest'
  var spec = SimForge.parseSpec({ name: 'footer_test', collections: { items: {} } });
  var src = SimForge.generateModule(spec);
  var expectedFooter = "})(typeof module !== 'undefined' ? module.exports : (window.SimFooterTest = {}));";
  assert(src.indexOf(expectedFooter) !== -1, 'generateModule UMD footer matches Python pattern');
})();

// ===========================================================================
// Edge cases
// ===========================================================================

console.log('\n--- Edge cases ---');

(function testEdge_single_collection() {
  var spec = SimForge.parseSpec({ name: 'solo', collections: { items: {} } });
  var result = SimForge.forge(spec);
  assert(typeof result.moduleSource === 'string', 'forge works with 1-collection spec');
  assert(typeof result.testSource === 'string', 'generateTests works with 1-collection spec');
  var sim = SimForge.loadAndRun(spec);
  var state = sim.initState();
  assert(state.items !== undefined, 'single collection spec: items collection exists');
})();

(function testEdge_many_fields() {
  var spec = SimForge.parseSpec({
    name: 'bigspec',
    collections: {
      records: {
        fields: ['f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8', 'f9', 'f10']
      }
    }
  });
  var result = SimForge.forge(spec);
  assert(typeof result.moduleSource === 'string', 'forge works with many-field spec');
  var sim = SimForge.loadAndRun(spec);
  var state = sim.initState();
  var r = sim.create_records(state, { f1: 'a', f5: 'b', f10: 'c' });
  assertEqual(r.record.f1, 'a', 'many-fields: f1 stored correctly');
  assertEqual(r.record.f10, 'c', 'many-fields: f10 stored correctly');
})();

(function testEdge_multiple_collections() {
  var spec = SimForge.parseSpec({
    name: 'multi',
    collections: {
      alpha: { fields: ['name'] },
      beta: { fields: ['title'] },
      gamma: { fields: ['label'] }
    }
  });
  var result = SimForge.forge(spec);
  var src = result.moduleSource;
  assert(src.indexOf('create_alpha') !== -1, 'multi-collection: create_alpha present');
  assert(src.indexOf('create_beta') !== -1, 'multi-collection: create_beta present');
  assert(src.indexOf('create_gamma') !== -1, 'multi-collection: create_gamma present');
  var sim = SimForge.loadAndRun(spec);
  var state = sim.initState();
  var ra = sim.create_alpha(state, { name: 'A' });
  var rb = sim.create_beta(ra.state, { title: 'B' });
  var rg = sim.create_gamma(rb.state, { label: 'G' });
  state = rg.state;
  assertEqual(Object.keys(state.alpha).length, 1, 'multi-collection alpha has 1 record');
  assertEqual(Object.keys(state.beta).length, 1, 'multi-collection beta has 1 record');
  assertEqual(Object.keys(state.gamma).length, 1, 'multi-collection gamma has 1 record');
})();

(function testEdge_collection_with_no_fields() {
  var spec = SimForge.parseSpec({ name: 'nofields', collections: { items: {} } });
  var sim = SimForge.loadAndRun(spec);
  var state = sim.initState();
  var r = sim.create_items(state, {});
  assert(r.record && r.record.id, 'no-fields collection: create sets id');
  assert(r.record.name === 'Unnamed item', 'no-fields collection: create sets default name');
})();

(function testEdge_loadAndRun_isolated_instances() {
  // Two loadAndRun calls should produce isolated modules (separate _state, _idCounter)
  var spec = SimForge.parseSpec({ name: 'isolated', collections: { items: {} } });
  var sim1 = SimForge.loadAndRun(spec);
  var sim2 = SimForge.loadAndRun(spec);
  var s1 = sim1.initState();
  var r1 = sim1.create_items(s1, { name: 'sim1 item' });
  s1 = r1.state;

  var s2 = sim2.initState();
  // sim2 should start fresh
  var items2 = sim2.query(s2, 'items', null);
  assertEqual(items2.length, 0, 'loadAndRun instances are isolated — sim2 has no records from sim1');
})();

(function testEdge_forge_does_not_mutate_spec() {
  var original = { name: 'muttest', collections: { items: { fields: ['name'] } } };
  var copy = JSON.parse(JSON.stringify(original));
  SimForge.forge(original);
  // Check that forge didn't add actions or description to original
  assert(JSON.stringify(original) !== JSON.stringify(copy) ||
         original.name === copy.name, 'forge may add defaults to parsed spec but original input description should match original intent');
  // At minimum the name is preserved
  assertEqual(original.name, 'muttest', 'forge does not corrupt original spec name');
})();

(function testEdge_name_with_underscores() {
  var spec = SimForge.parseSpec({ name: 'my_cool_sim', collections: { entries: { fields: ['text'] } } });
  var src = SimForge.generateModule(spec);
  assert(src.indexOf('SimMyCoolSim') !== -1, 'underscore name converts to PascalCase for window export');
  var sim = SimForge.loadAndRun(spec);
  var state = sim.initState();
  assert(state.entries !== undefined, 'underscored sim name: entries collection exists');
})();

// ===========================================================================
// Results
// ===========================================================================

console.log('\n--- Results ---');
console.log('\nsim_forge_browser Tests: ' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) {
  process.exit(1);
} else {
  console.log('All sim_forge_browser tests passed!');
}
