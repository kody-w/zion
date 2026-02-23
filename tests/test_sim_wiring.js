#!/usr/bin/env node
// test_sim_wiring.js — Integration tests for SimProjectManager and SimTodo wiring
'use strict';

var SimProjectManager = require('../src/js/sim_project_manager.js');
var SimTodo = require('../src/js/sim_todo.js');

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

// --- SimProjectManager integration ---

(function testProjectManagerInitState() {
  var state = SimProjectManager.initState();
  assert(state && typeof state === 'object', 'PM initState returns object');
  assert(state._schema && state._schema.collections, 'PM state has schema with collections');
  assert(state.boards && typeof state.boards === 'object', 'PM state has boards');
  assert(state.tasks && typeof state.tasks === 'object', 'PM state has tasks');
  assert(state.sprints && typeof state.sprints === 'object', 'PM state has sprints');
  assertEqual(state._sim, 'project_manager', 'PM state._sim is project_manager');
})();

(function testProjectManagerApplyActionCreateBoard() {
  var state = SimProjectManager.initState();
  var msg = { from: 'player1', payload: { sim: 'project_manager', action: 'create_boards', data: { name: 'Sprint Board' } } };
  var s2 = SimProjectManager.applyAction(state, msg);
  var boards = SimProjectManager.query(s2, 'boards', null);
  assertEqual(boards.length, 1, 'PM applyAction creates board');
  assertEqual(boards[0].name, 'Sprint Board', 'PM board has correct name');
})();

(function testProjectManagerApplyActionCreateTask() {
  var state = SimProjectManager.initState();
  var msg = { from: 'player1', payload: { sim: 'project_manager', action: 'create_tasks', data: { title: 'Fix bug', status: 'open', priority: 'high' } } };
  var s2 = SimProjectManager.applyAction(state, msg);
  var tasks = SimProjectManager.query(s2, 'tasks', null);
  assertEqual(tasks.length, 1, 'PM applyAction creates task');
  assertEqual(tasks[0].title, 'Fix bug', 'PM task has correct title');
  assertEqual(tasks[0].priority, 'high', 'PM task has correct priority');
})();

(function testProjectManagerApplyActionCreateSprint() {
  var state = SimProjectManager.initState();
  var msg = { from: 'player1', payload: { sim: 'project_manager', action: 'create_sprints', data: { name: 'Sprint 1', start_date: '2026-01-01', end_date: '2026-01-14' } } };
  var s2 = SimProjectManager.applyAction(state, msg);
  var sprints = SimProjectManager.query(s2, 'sprints', null);
  assertEqual(sprints.length, 1, 'PM applyAction creates sprint');
  assertEqual(sprints[0].name, 'Sprint 1', 'PM sprint has correct name');
})();

(function testProjectManagerCompleteTask() {
  var state = SimProjectManager.initState();
  var r = SimProjectManager.create_tasks(state, { title: 'Do thing', status: 'open' });
  state = r.state;
  var id = r.record.id;
  var msg = { from: 'p1', payload: { action: 'complete_tasks', data: { id: id } } };
  var s2 = SimProjectManager.applyAction(state, msg);
  assertEqual(s2.tasks[id].status, 'completed', 'PM complete_tasks sets status to completed');
  assert(s2.tasks[id].completedAt !== undefined, 'PM complete_tasks sets completedAt');
})();

(function testProjectManagerSnapshotRoundtrip() {
  var state = SimProjectManager.initState();
  var r1 = SimProjectManager.create_boards(state, { name: 'Board A' });
  state = r1.state;
  var r2 = SimProjectManager.create_tasks(state, { title: 'Task A' });
  state = r2.state;
  var json = JSON.stringify(state);
  var restored = SimProjectManager.initState(JSON.parse(json));
  assertEqual(Object.keys(restored.boards).length, 1, 'PM snapshot restores boards');
  assertEqual(Object.keys(restored.tasks).length, 1, 'PM snapshot restores tasks');
})();

// --- SimTodo integration ---

(function testTodoInitState() {
  var state = SimTodo.initState();
  assert(state && typeof state === 'object', 'Todo initState returns object');
  assert(state._schema && state._schema.collections, 'Todo state has schema with collections');
  assert(state.items && typeof state.items === 'object', 'Todo state has items');
  assertEqual(state._sim, 'todo', 'Todo state._sim is todo');
})();

(function testTodoApplyActionCreateItem() {
  var state = SimTodo.initState();
  var msg = { from: 'player1', payload: { sim: 'todo', action: 'create_items', data: { title: 'Buy milk', done: false } } };
  var s2 = SimTodo.applyAction(state, msg);
  var items = SimTodo.query(s2, 'items', null);
  assertEqual(items.length, 1, 'Todo applyAction creates item');
  assertEqual(items[0].title, 'Buy milk', 'Todo item has correct title');
  assertEqual(items[0].done, false, 'Todo item starts not done');
})();

(function testTodoApplyActionCompleteItem() {
  var state = SimTodo.initState();
  var r = SimTodo.create_items(state, { title: 'Walk dog', done: false });
  state = r.state;
  var id = r.record.id;
  var msg = { from: 'p1', payload: { action: 'complete_items', data: { id: id } } };
  var s2 = SimTodo.applyAction(state, msg);
  assertEqual(s2.items[id].done, true, 'Todo complete_items sets done to true');
  assert(s2.items[id].completedAt !== undefined, 'Todo complete_items sets completedAt');
})();

(function testTodoApplyActionDeleteItem() {
  var state = SimTodo.initState();
  var r = SimTodo.create_items(state, { title: 'Remove me' });
  state = r.state;
  var id = r.record.id;
  var msg = { from: 'p1', payload: { action: 'delete_items', data: { id: id } } };
  var s2 = SimTodo.applyAction(state, msg);
  assert(s2.items[id] === undefined, 'Todo delete_items removes item');
})();

(function testTodoSnapshotRoundtrip() {
  var state = SimTodo.initState();
  var r = SimTodo.create_items(state, { title: 'Persist me' });
  state = r.state;
  var json = JSON.stringify(state);
  var restored = SimTodo.initState(JSON.parse(json));
  assertEqual(Object.keys(restored.items).length, 1, 'Todo snapshot restores items');
})();

(function testTodoUnknownActionNoop() {
  var state = SimTodo.initState();
  var msg = { from: 'x', payload: { action: 'nonexistent_xyz', data: {} } };
  var s2 = SimTodo.applyAction(state, msg);
  assert(s2 === state, 'Todo unknown action returns same state');
})();

// --- Results ---

console.log('\nsim_wiring Tests: ' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) {
  process.exit(1);
} else {
  console.log('All sim wiring integration tests passed!');
}
