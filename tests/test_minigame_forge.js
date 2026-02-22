// test_minigame_forge.js — Comprehensive tests for the MinigameForge system
'use strict';
var { test, suite, report, assert } = require('./test_runner');
var Forge = require('../src/js/minigame_forge');

// ─── Helpers ─────────────────────────────────────────────────────────────────

var _uid = 0;
function uid(prefix) { return (prefix || 'player') + '_' + (++_uid); }

function freshState() {
  return {};
}

function makeSimpleRules() {
  return [
    {type: 'catch_fish', params: {fishType: 'any', count: 5}}
  ];
}

function makeMultiRules() {
  return [
    {type: 'collect', params: {itemType: 'wood', count: 10}},
    {type: 'craft_item', params: {recipeId: 'wooden_bench', count: 1}}
  ];
}

function createAndPublish(state, creatorId, title, rules, tick) {
  var res = Forge.createGame(state, creatorId, title || 'Test Game', 'desc', rules || makeSimpleRules(), 0, null, 'easy', [], tick || 0);
  assert(res.success, 'createGame should succeed: ' + (res.error || ''));
  var pub = Forge.publishGame(state, creatorId, res.game.id);
  assert(pub.success, 'publishGame should succeed: ' + (pub.error || ''));
  return res.game;
}

// Reset ID counters between test sections
function reset() { Forge._reset(); }

// ─── RULE_TYPES ───────────────────────────────────────────────────────────────

suite('RULE_TYPES — data structure', function() {
  reset();

  test('RULE_TYPES is exported and is an array', function() {
    assert(Array.isArray(Forge.RULE_TYPES), 'RULE_TYPES should be an array');
  });

  test('RULE_TYPES has exactly 10 primitives', function() {
    assert(Forge.RULE_TYPES.length === 10, 'Expected 10 rule types, got ' + Forge.RULE_TYPES.length);
  });

  test('Each rule type has id, name, and params', function() {
    Forge.RULE_TYPES.forEach(function(rt) {
      assert(typeof rt.id === 'string', 'rule type must have string id');
      assert(typeof rt.name === 'string', 'rule type must have string name');
      assert(rt.params && typeof rt.params === 'object', 'rule type must have params object');
    });
  });

  test('All expected rule type ids exist', function() {
    var expected = ['collect', 'reach_zone', 'craft_item', 'catch_fish', 'defeat_boss',
                    'trade_items', 'visit_zones', 'solve_puzzle', 'cook_meal', 'score_points'];
    expected.forEach(function(id) {
      var found = Forge.RULE_TYPES.some(function(rt) { return rt.id === id; });
      assert(found, 'Expected rule type not found: ' + id);
    });
  });

  test('All rule type ids are unique', function() {
    var ids = Forge.RULE_TYPES.map(function(rt) { return rt.id; });
    var unique = new Set(ids);
    assert(unique.size === ids.length, 'Duplicate rule type ids detected');
  });

  test('getRuleTypes() returns a copy of RULE_TYPES', function() {
    var rt = Forge.getRuleTypes();
    assert(Array.isArray(rt), 'getRuleTypes should return array');
    assert(rt.length === 10, 'getRuleTypes should return 10 items');
  });

  test('getRuleTypes() returns a fresh copy (mutation safe)', function() {
    var rt1 = Forge.getRuleTypes();
    rt1.push({id: 'fake'});
    var rt2 = Forge.getRuleTypes();
    assert(rt2.length === 10, 'Modifying returned array should not affect module');
  });

  test('collect rule has itemType and count params', function() {
    var rt = Forge.RULE_TYPES.find(function(r) { return r.id === 'collect'; });
    assert(rt.params.itemType === 'string', 'itemType should be string type');
    assert(rt.params.count === 'number', 'count should be number type');
  });

  test('defeat_boss rule has bossId param only', function() {
    var rt = Forge.RULE_TYPES.find(function(r) { return r.id === 'defeat_boss'; });
    assert(rt.params.bossId === 'string', 'bossId should be string type');
    assert(Object.keys(rt.params).length === 1, 'defeat_boss should have only 1 param');
  });

  test('score_points rule has target param', function() {
    var rt = Forge.RULE_TYPES.find(function(r) { return r.id === 'score_points'; });
    assert(rt.params.target === 'number', 'target should be number type');
  });
});

// ─── validateRules ────────────────────────────────────────────────────────────

suite('validateRules', function() {
  reset();

  test('valid single rule returns valid:true', function() {
    var res = Forge.validateRules([{type: 'catch_fish', params: {fishType: 'any', count: 5}}]);
    assert(res.valid === true, 'Should be valid');
    assert(res.error === null, 'Should have no error');
  });

  test('non-array input returns valid:false', function() {
    var res = Forge.validateRules('not an array');
    assert(res.valid === false, 'Should be invalid');
    assert(typeof res.error === 'string', 'Should have error message');
  });

  test('empty array returns valid:false', function() {
    var res = Forge.validateRules([]);
    assert(res.valid === false, 'Should be invalid for empty array');
  });

  test('unknown rule type returns valid:false', function() {
    var res = Forge.validateRules([{type: 'unknown_type', params: {}}]);
    assert(res.valid === false, 'Should be invalid for unknown type');
    assert(/unknown/i.test(res.error) || /invalid/i.test(res.error), 'Error should mention unknown/invalid type');
  });

  test('rule missing params returns valid:false', function() {
    var res = Forge.validateRules([{type: 'collect'}]);
    assert(res.valid === false, 'Should be invalid without params');
  });

  test('rule with missing required param returns valid:false', function() {
    var res = Forge.validateRules([{type: 'collect', params: {itemType: 'wood'}}]);
    assert(res.valid === false, 'Missing count param should be invalid');
  });

  test('rule with wrong param type returns valid:false', function() {
    var res = Forge.validateRules([{type: 'collect', params: {itemType: 'wood', count: 'five'}}]);
    assert(res.valid === false, 'String count should be invalid');
  });

  test('multiple valid rules return valid:true', function() {
    var res = Forge.validateRules([
      {type: 'collect', params: {itemType: 'wood', count: 5}},
      {type: 'catch_fish', params: {fishType: 'salmon', count: 3}}
    ]);
    assert(res.valid === true, 'Multiple valid rules should pass');
  });

  test('valid reach_zone rule', function() {
    var res = Forge.validateRules([{type: 'reach_zone', params: {zone: 'gardens', timeLimit: 60}}]);
    assert(res.valid === true, 'reach_zone should be valid');
  });

  test('valid defeat_boss rule', function() {
    var res = Forge.validateRules([{type: 'defeat_boss', params: {bossId: 'dragon'}}]);
    assert(res.valid === true, 'defeat_boss should be valid');
  });

  test('valid visit_zones rule', function() {
    var res = Forge.validateRules([{type: 'visit_zones', params: {zoneCount: 3, timeLimit: 120}}]);
    assert(res.valid === true, 'visit_zones should be valid');
  });

  test('valid score_points rule', function() {
    var res = Forge.validateRules([{type: 'score_points', params: {target: 100}}]);
    assert(res.valid === true, 'score_points should be valid');
  });

  test('rule without type field returns valid:false', function() {
    var res = Forge.validateRules([{params: {count: 1}}]);
    assert(res.valid === false, 'Rule without type should be invalid');
  });

  test('null params returns valid:false', function() {
    var res = Forge.validateRules([{type: 'collect', params: null}]);
    assert(res.valid === false, 'Null params should be invalid');
  });
});

// ─── createGame ───────────────────────────────────────────────────────────────

suite('createGame', function() {
  reset();

  test('creates a game with all required fields', function() {
    var state = freshState();
    var res = Forge.createGame(state, 'p1', 'Speed Fisher', 'Catch 5 fish!',
      makeSimpleRules(), 60, 'gardens', 'easy', ['fishing', 'speed'], 1000);
    assert(res.success === true, 'createGame should succeed');
    var g = res.game;
    assert(typeof g.id === 'string', 'game id should be string');
    assert(g.creatorId === 'p1', 'creatorId should match');
    assert(g.title === 'Speed Fisher', 'title should match');
    assert(g.description === 'Catch 5 fish!', 'description should match');
    assert(g.status === 'draft', 'new game should be draft');
    assert(g.plays === 0, 'plays should start at 0');
    assert(Array.isArray(g.ratings), 'ratings should be array');
    assert(g.avgRating === 0, 'avgRating should start at 0');
    assert(g.forkedFrom === null, 'forkedFrom should be null');
    assert(g.createdAt === 1000, 'createdAt should be set');
  });

  test('game is persisted in state', function() {
    var state = freshState();
    var res = Forge.createGame(state, 'p1', 'Test', 'desc', makeSimpleRules(), 0, null, 'easy', [], 0);
    assert(state.forge.games.length >= 1, 'Game should be in state');
    assert(state.forge.games.some(function(g) { return g.id === res.game.id; }), 'Game id should be in state');
  });

  test('game starts as draft', function() {
    var state = freshState();
    var res = Forge.createGame(state, 'p1', 'Test', 'desc', makeSimpleRules(), 0, null, 'easy', [], 0);
    assert(res.game.status === 'draft', 'Should start as draft');
  });

  test('returns error when creatorId missing', function() {
    var state = freshState();
    var res = Forge.createGame(state, '', 'Title', 'desc', makeSimpleRules(), 0, null, 'easy', [], 0);
    assert(res.success === false, 'Should fail without creatorId');
    assert(typeof res.error === 'string', 'Should have error message');
  });

  test('returns error when title missing', function() {
    var state = freshState();
    var res = Forge.createGame(state, 'p1', '', 'desc', makeSimpleRules(), 0, null, 'easy', [], 0);
    assert(res.success === false, 'Should fail without title');
  });

  test('returns error for empty rules array', function() {
    var state = freshState();
    var res = Forge.createGame(state, 'p1', 'Title', 'desc', [], 0, null, 'easy', [], 0);
    assert(res.success === false, 'Should fail with empty rules');
  });

  test('returns error for invalid rules', function() {
    var state = freshState();
    var res = Forge.createGame(state, 'p1', 'Title', 'desc',
      [{type: 'bad_type', params: {}}], 0, null, 'easy', [], 0);
    assert(res.success === false, 'Should fail with invalid rules');
  });

  test('returns error for invalid difficulty', function() {
    var state = freshState();
    var res = Forge.createGame(state, 'p1', 'Title', 'desc',
      makeSimpleRules(), 0, null, 'legendary', [], 0);
    assert(res.success === false, 'Should fail with invalid difficulty');
  });

  test('tags default to empty array when not provided', function() {
    var state = freshState();
    var res = Forge.createGame(state, 'p1', 'Title', 'desc', makeSimpleRules(), 0, null, 'easy', null, 0);
    assert(Array.isArray(res.game.tags), 'Tags should be array');
  });

  test('zone can be null', function() {
    var state = freshState();
    var res = Forge.createGame(state, 'p1', 'Title', 'desc', makeSimpleRules(), 0, null, 'easy', [], 0);
    assert(res.game.zone === null, 'Zone should be null');
  });

  test('timeLimit 0 means no limit', function() {
    var state = freshState();
    var res = Forge.createGame(state, 'p1', 'Title', 'desc', makeSimpleRules(), 0, null, 'easy', [], 0);
    assert(res.game.timeLimit === 0, 'timeLimit should be 0');
  });

  test('reward structure has spark and xp', function() {
    var state = freshState();
    var res = Forge.createGame(state, 'p1', 'Title', 'desc', makeSimpleRules(), 0, null, 'easy', [], 0);
    assert(typeof res.game.reward.spark === 'number', 'reward.spark should be number');
    assert(typeof res.game.reward.xp === 'number', 'reward.xp should be number');
  });

  test('multiple games get unique ids', function() {
    var state = freshState();
    var res1 = Forge.createGame(state, 'p1', 'Game 1', 'desc', makeSimpleRules(), 0, null, 'easy', [], 0);
    var res2 = Forge.createGame(state, 'p1', 'Game 2', 'desc', makeSimpleRules(), 0, null, 'easy', [], 0);
    assert(res1.game.id !== res2.game.id, 'Games should have unique ids');
  });
});

// ─── publishGame ─────────────────────────────────────────────────────────────

suite('publishGame', function() {
  reset();

  test('creator can publish draft game', function() {
    var state = freshState();
    var res = Forge.createGame(state, 'creator1', 'My Game', 'desc', makeSimpleRules(), 0, null, 'easy', [], 0);
    var pub = Forge.publishGame(state, 'creator1', res.game.id);
    assert(pub.success === true, 'Creator should be able to publish');
    assert(pub.game.status === 'published', 'Status should be published');
  });

  test('non-creator cannot publish', function() {
    var state = freshState();
    var res = Forge.createGame(state, 'creator1', 'My Game', 'desc', makeSimpleRules(), 0, null, 'easy', [], 0);
    var pub = Forge.publishGame(state, 'other_player', res.game.id);
    assert(pub.success === false, 'Non-creator should not be able to publish');
  });

  test('cannot publish non-existent game', function() {
    var state = freshState();
    var pub = Forge.publishGame(state, 'p1', 'nonexistent_id');
    assert(pub.success === false, 'Should fail for nonexistent game');
  });

  test('cannot publish archived game', function() {
    var state = freshState();
    var res = Forge.createGame(state, 'creator1', 'My Game', 'desc', makeSimpleRules(), 0, null, 'easy', [], 0);
    Forge.archiveGame(state, 'creator1', res.game.id);
    var pub = Forge.publishGame(state, 'creator1', res.game.id);
    assert(pub.success === false, 'Cannot publish archived game');
  });

  test('publishing updates game status in state', function() {
    var state = freshState();
    var res = Forge.createGame(state, 'creator1', 'My Game', 'desc', makeSimpleRules(), 0, null, 'easy', [], 0);
    Forge.publishGame(state, 'creator1', res.game.id);
    var game = Forge.getGame(state, res.game.id);
    assert(game.status === 'published', 'State should reflect published status');
  });
});

// ─── archiveGame ─────────────────────────────────────────────────────────────

suite('archiveGame', function() {
  reset();

  test('creator can archive game', function() {
    var state = freshState();
    var res = Forge.createGame(state, 'creator1', 'My Game', 'desc', makeSimpleRules(), 0, null, 'easy', [], 0);
    var arc = Forge.archiveGame(state, 'creator1', res.game.id);
    assert(arc.success === true, 'Creator should be able to archive');
    assert(arc.game.status === 'archived', 'Status should be archived');
  });

  test('non-creator cannot archive', function() {
    var state = freshState();
    var res = Forge.createGame(state, 'creator1', 'My Game', 'desc', makeSimpleRules(), 0, null, 'easy', [], 0);
    var arc = Forge.archiveGame(state, 'other_player', res.game.id);
    assert(arc.success === false, 'Non-creator should not archive');
  });

  test('cannot archive non-existent game', function() {
    var state = freshState();
    var arc = Forge.archiveGame(state, 'p1', 'nonexistent_id');
    assert(arc.success === false, 'Should fail for nonexistent game');
  });

  test('can archive a published game', function() {
    var state = freshState();
    var game = createAndPublish(state, 'creator1');
    var arc = Forge.archiveGame(state, 'creator1', game.id);
    assert(arc.success === true, 'Should be able to archive published game');
    assert(arc.game.status === 'archived', 'Status should be archived');
  });
});

// ─── forkGame ────────────────────────────────────────────────────────────────

suite('forkGame', function() {
  reset();

  test('can fork a published game', function() {
    var state = freshState();
    var original = createAndPublish(state, 'creator1', 'Original Game');
    var res = Forge.forkGame(state, 'player2', original.id, 'My Fork', 500);
    assert(res.success === true, 'Forking should succeed');
    assert(res.game.forkedFrom === original.id, 'forkedFrom should point to original');
    assert(res.game.creatorId === 'player2', 'Fork creator should be player2');
    assert(res.game.title === 'My Fork', 'Fork should use new title');
    assert(res.game.status === 'draft', 'Fork should start as draft');
    assert(res.game.plays === 0, 'Fork plays should start at 0');
    assert(res.game.ratings.length === 0, 'Fork ratings should be empty');
  });

  test('fork has unique id', function() {
    var state = freshState();
    var original = createAndPublish(state, 'creator1', 'Original Game');
    var res = Forge.forkGame(state, 'player2', original.id, 'Fork', 0);
    assert(res.game.id !== original.id, 'Fork should have different id');
  });

  test('cannot fork draft game', function() {
    var state = freshState();
    var res = Forge.createGame(state, 'creator1', 'Draft', 'desc', makeSimpleRules(), 0, null, 'easy', [], 0);
    var fork = Forge.forkGame(state, 'player2', res.game.id, 'Fork', 0);
    assert(fork.success === false, 'Cannot fork draft game');
  });

  test('cannot fork non-existent game', function() {
    var state = freshState();
    var fork = Forge.forkGame(state, 'player2', 'nonexistent_id', 'Fork', 0);
    assert(fork.success === false, 'Cannot fork nonexistent game');
  });

  test('fork copies rules from original', function() {
    var state = freshState();
    var original = createAndPublish(state, 'creator1', 'Original Game');
    var res = Forge.forkGame(state, 'player2', original.id, 'Fork', 0);
    assert(res.game.rules.length === original.rules.length, 'Fork should copy rules');
  });

  test('fork rules are independent (mutation safe)', function() {
    var state = freshState();
    var original = createAndPublish(state, 'creator1', 'Original');
    var res = Forge.forkGame(state, 'player2', original.id, 'Fork', 0);
    res.game.rules[0].params.count = 999;
    var orig = Forge.getGame(state, original.id);
    assert(orig.rules[0].params.count !== 999, 'Mutating fork rules should not affect original');
  });

  test('fork uses default title when newTitle not provided', function() {
    var state = freshState();
    var original = createAndPublish(state, 'creator1', 'My Amazing Game');
    var res = Forge.forkGame(state, 'player2', original.id, null, 0);
    assert(typeof res.game.title === 'string', 'Fork should have a title');
    assert(res.game.title.length > 0, 'Fork title should not be empty');
  });

  test('fork createdAt is set to currentTick', function() {
    var state = freshState();
    var original = createAndPublish(state, 'creator1', 'Original');
    var res = Forge.forkGame(state, 'player2', original.id, 'Fork', 999);
    assert(res.game.createdAt === 999, 'Fork createdAt should be currentTick');
  });
});

// ─── startPlay ───────────────────────────────────────────────────────────────

suite('startPlay', function() {
  reset();

  test('can start playing a published game', function() {
    var state = freshState();
    var game = createAndPublish(state, 'creator1');
    var res = Forge.startPlay(state, 'player1', game.id, 1000);
    assert(res.success === true, 'startPlay should succeed');
    assert(res.session.id !== undefined, 'session should have id');
    assert(res.session.gameId === game.id, 'session gameId should match');
    assert(res.session.playerId === 'player1', 'session playerId should match');
    assert(res.session.status === 'active', 'session should be active');
    assert(res.session.startTick === 1000, 'startTick should be set');
    assert(res.session.endTick === null, 'endTick should be null');
    assert(Array.isArray(res.session.progress), 'progress should be array');
  });

  test('cannot start playing a draft game', function() {
    var state = freshState();
    var res = Forge.createGame(state, 'creator1', 'Draft', 'desc', makeSimpleRules(), 0, null, 'easy', [], 0);
    var play = Forge.startPlay(state, 'player1', res.game.id, 0);
    assert(play.success === false, 'Cannot play draft game');
  });

  test('cannot start playing nonexistent game', function() {
    var state = freshState();
    var play = Forge.startPlay(state, 'player1', 'nonexistent_id', 0);
    assert(play.success === false, 'Cannot play nonexistent game');
  });

  test('play increments game plays count', function() {
    var state = freshState();
    var game = createAndPublish(state, 'creator1');
    var playsBefore = game.plays;
    Forge.startPlay(state, 'player1', game.id, 0);
    var updated = Forge.getGame(state, game.id);
    assert(updated.plays === playsBefore + 1, 'plays should increment');
  });

  test('progress entries match rule count', function() {
    var state = freshState();
    var game = createAndPublish(state, 'creator1', 'Multi Rule', makeMultiRules());
    var res = Forge.startPlay(state, 'player1', game.id, 0);
    assert(res.session.progress.length === 2, 'Should have progress for each rule');
  });

  test('progress starts at 0', function() {
    var state = freshState();
    var game = createAndPublish(state, 'creator1');
    var res = Forge.startPlay(state, 'player1', game.id, 0);
    res.session.progress.forEach(function(p) {
      assert(p.current === 0, 'Progress current should start at 0');
    });
  });

  test('progress target matches rule count param', function() {
    var state = freshState();
    var game = createAndPublish(state, 'creator1');
    var res = Forge.startPlay(state, 'player1', game.id, 0);
    assert(res.session.progress[0].target === 5, 'Target should match rule count=5');
  });

  test('score starts at 0', function() {
    var state = freshState();
    var game = createAndPublish(state, 'creator1');
    var res = Forge.startPlay(state, 'player1', game.id, 0);
    assert(res.session.score === 0, 'score should start at 0');
  });

  test('multiple players can play the same game simultaneously', function() {
    var state = freshState();
    var game = createAndPublish(state, 'creator1');
    var r1 = Forge.startPlay(state, 'player1', game.id, 0);
    var r2 = Forge.startPlay(state, 'player2', game.id, 0);
    assert(r1.success && r2.success, 'Both players should start successfully');
    assert(r1.session.id !== r2.session.id, 'Sessions should have unique ids');
  });
});

// ─── updateProgress ───────────────────────────────────────────────────────────

suite('updateProgress', function() {
  reset();

  test('can update progress on active session', function() {
    var state = freshState();
    var game = createAndPublish(state, 'creator1');
    var sess = Forge.startPlay(state, 'player1', game.id, 0);
    var res = Forge.updateProgress(state, sess.session.id, 0, 2);
    assert(res.success === true, 'updateProgress should succeed');
    assert(res.progress.current === 2, 'current should be 2');
  });

  test('progress does not exceed target', function() {
    var state = freshState();
    var game = createAndPublish(state, 'creator1');
    var sess = Forge.startPlay(state, 'player1', game.id, 0);
    Forge.updateProgress(state, sess.session.id, 0, 100);
    var updated = state.forge.sessions.find(function(s) { return s.id === sess.session.id; });
    assert(updated.progress[0].current <= updated.progress[0].target, 'Progress should not exceed target');
  });

  test('default increment is 1', function() {
    var state = freshState();
    var game = createAndPublish(state, 'creator1');
    var sess = Forge.startPlay(state, 'player1', game.id, 0);
    Forge.updateProgress(state, sess.session.id, 0);
    var updated = state.forge.sessions.find(function(s) { return s.id === sess.session.id; });
    assert(updated.progress[0].current === 1, 'Default increment should be 1');
  });

  test('cannot update progress on completed session', function() {
    var state = freshState();
    var game = createAndPublish(state, 'creator1');
    var sess = Forge.startPlay(state, 'player1', game.id, 0);
    Forge.updateProgress(state, sess.session.id, 0, 5);
    Forge.completePlay(state, sess.session.id, 10);
    var res = Forge.updateProgress(state, sess.session.id, 0, 1);
    assert(res.success === false, 'Cannot update completed session');
  });

  test('cannot update progress on failed session', function() {
    var state = freshState();
    var game = createAndPublish(state, 'creator1');
    var sess = Forge.startPlay(state, 'player1', game.id, 0);
    Forge.failPlay(state, sess.session.id, 'timeout');
    var res = Forge.updateProgress(state, sess.session.id, 0, 1);
    assert(res.success === false, 'Cannot update failed session');
  });

  test('returns error for nonexistent session', function() {
    var state = freshState();
    var res = Forge.updateProgress(state, 'nonexistent_session', 0, 1);
    assert(res.success === false, 'Should fail for nonexistent session');
  });

  test('returns error for invalid ruleIndex', function() {
    var state = freshState();
    var game = createAndPublish(state, 'creator1');
    var sess = Forge.startPlay(state, 'player1', game.id, 0);
    var res = Forge.updateProgress(state, sess.session.id, 99, 1);
    assert(res.success === false, 'Should fail for invalid ruleIndex');
  });

  test('can update progress on specific rule index', function() {
    var state = freshState();
    var game = createAndPublish(state, 'creator1', 'Multi', makeMultiRules());
    var sess = Forge.startPlay(state, 'player1', game.id, 0);
    Forge.updateProgress(state, sess.session.id, 1, 1);
    var updated = state.forge.sessions.find(function(s) { return s.id === sess.session.id; });
    assert(updated.progress[0].current === 0, 'Rule 0 should still be 0');
    assert(updated.progress[1].current === 1, 'Rule 1 should be 1');
  });
});

// ─── checkCompletion ─────────────────────────────────────────────────────────

suite('checkCompletion', function() {
  reset();

  test('returns complete:false when progress is not done', function() {
    var state = freshState();
    var game = createAndPublish(state, 'creator1');
    var sess = Forge.startPlay(state, 'player1', game.id, 0);
    var res = Forge.checkCompletion(state, sess.session.id, 5);
    assert(res.success === true, 'checkCompletion should succeed');
    assert(res.complete === false, 'Should not be complete with 0 progress');
  });

  test('returns complete:true when all rules satisfied', function() {
    var state = freshState();
    var game = createAndPublish(state, 'creator1');
    var sess = Forge.startPlay(state, 'player1', game.id, 0);
    Forge.updateProgress(state, sess.session.id, 0, 5);
    var res = Forge.checkCompletion(state, sess.session.id, 10);
    assert(res.complete === true, 'Should be complete when all rules done');
    assert(res.timedOut === false, 'Should not be timedOut when complete');
  });

  test('returns timedOut:true when time limit exceeded', function() {
    var state = freshState();
    var res = Forge.createGame(state, 'creator1', 'Timed', 'desc', makeSimpleRules(), 30, null, 'easy', [], 0);
    Forge.publishGame(state, 'creator1', res.game.id);
    var sess = Forge.startPlay(state, 'player1', res.game.id, 0);
    var check = Forge.checkCompletion(state, sess.session.id, 50);
    assert(check.timedOut === true, 'Should be timedOut when over time limit');
    assert(check.complete === false, 'Should not be complete when timed out');
  });

  test('no timeout when timeLimit is 0', function() {
    var state = freshState();
    var game = createAndPublish(state, 'creator1');
    var sess = Forge.startPlay(state, 'player1', game.id, 0);
    var res = Forge.checkCompletion(state, sess.session.id, 99999);
    assert(res.timedOut === false, 'Should not time out with timeLimit 0');
  });

  test('returns error for nonexistent session', function() {
    var state = freshState();
    var res = Forge.checkCompletion(state, 'nonexistent_session', 0);
    assert(res.success === false, 'Should fail for nonexistent session');
  });

  test('all rules must be satisfied for complete:true', function() {
    var state = freshState();
    var game = createAndPublish(state, 'creator1', 'Multi', makeMultiRules());
    var sess = Forge.startPlay(state, 'player1', game.id, 0);
    Forge.updateProgress(state, sess.session.id, 0, 10); // rule 0 done
    var res = Forge.checkCompletion(state, sess.session.id, 5);
    assert(res.complete === false, 'Should not be complete if only some rules done');
  });
});

// ─── completePlay ────────────────────────────────────────────────────────────

suite('completePlay', function() {
  reset();

  test('can complete an active session', function() {
    var state = freshState();
    var game = createAndPublish(state, 'creator1');
    var sess = Forge.startPlay(state, 'player1', game.id, 0);
    var res = Forge.completePlay(state, sess.session.id, 50);
    assert(res.success === true, 'completePlay should succeed');
    assert(res.session.status === 'completed', 'Session should be completed');
    assert(res.session.endTick === 50, 'endTick should be set');
    assert(typeof res.reward === 'object', 'reward should be returned');
    assert(typeof res.reward.spark === 'number', 'reward should have spark');
    assert(typeof res.reward.xp === 'number', 'reward should have xp');
    assert(typeof res.score === 'number', 'score should be number');
  });

  test('cannot complete already completed session', function() {
    var state = freshState();
    var game = createAndPublish(state, 'creator1');
    var sess = Forge.startPlay(state, 'player1', game.id, 0);
    Forge.completePlay(state, sess.session.id, 10);
    var res = Forge.completePlay(state, sess.session.id, 20);
    assert(res.success === false, 'Cannot complete already completed session');
  });

  test('cannot complete failed session', function() {
    var state = freshState();
    var game = createAndPublish(state, 'creator1');
    var sess = Forge.startPlay(state, 'player1', game.id, 0);
    Forge.failPlay(state, sess.session.id, 'timeout');
    var res = Forge.completePlay(state, sess.session.id, 10);
    assert(res.success === false, 'Cannot complete failed session');
  });

  test('returns error for nonexistent session', function() {
    var state = freshState();
    var res = Forge.completePlay(state, 'nonexistent_session', 0);
    assert(res.success === false, 'Should fail for nonexistent session');
  });

  test('elapsed is returned in result', function() {
    var state = freshState();
    var game = createAndPublish(state, 'creator1');
    var sess = Forge.startPlay(state, 'player1', game.id, 100);
    var res = Forge.completePlay(state, sess.session.id, 200);
    assert(res.elapsed === 100, 'elapsed should be endTick - startTick');
  });

  test('score is positive', function() {
    var state = freshState();
    var game = createAndPublish(state, 'creator1');
    var sess = Forge.startPlay(state, 'player1', game.id, 0);
    var res = Forge.completePlay(state, sess.session.id, 5);
    assert(res.score > 0, 'score should be positive');
  });
});

// ─── failPlay ────────────────────────────────────────────────────────────────

suite('failPlay', function() {
  reset();

  test('can fail an active session', function() {
    var state = freshState();
    var game = createAndPublish(state, 'creator1');
    var sess = Forge.startPlay(state, 'player1', game.id, 0);
    var res = Forge.failPlay(state, sess.session.id, 'time_limit');
    assert(res.success === true, 'failPlay should succeed');
    assert(res.session.status === 'failed', 'Session should be failed');
    assert(res.session.failReason === 'time_limit', 'failReason should be set');
  });

  test('cannot fail already failed session', function() {
    var state = freshState();
    var game = createAndPublish(state, 'creator1');
    var sess = Forge.startPlay(state, 'player1', game.id, 0);
    Forge.failPlay(state, sess.session.id, 'timeout');
    var res = Forge.failPlay(state, sess.session.id, 'other');
    assert(res.success === false, 'Cannot fail already failed session');
  });

  test('cannot fail completed session', function() {
    var state = freshState();
    var game = createAndPublish(state, 'creator1');
    var sess = Forge.startPlay(state, 'player1', game.id, 0);
    Forge.completePlay(state, sess.session.id, 10);
    var res = Forge.failPlay(state, sess.session.id, 'timeout');
    assert(res.success === false, 'Cannot fail completed session');
  });

  test('returns error for nonexistent session', function() {
    var state = freshState();
    var res = Forge.failPlay(state, 'nonexistent_session', 'reason');
    assert(res.success === false, 'Should fail for nonexistent session');
  });

  test('default failReason is unknown when not provided', function() {
    var state = freshState();
    var game = createAndPublish(state, 'creator1');
    var sess = Forge.startPlay(state, 'player1', game.id, 0);
    var res = Forge.failPlay(state, sess.session.id);
    assert(typeof res.session.failReason === 'string', 'failReason should be string');
  });
});

// ─── rateGame ────────────────────────────────────────────────────────────────

suite('rateGame', function() {
  reset();

  test('can rate a published game', function() {
    var state = freshState();
    var game = createAndPublish(state, 'creator1');
    var res = Forge.rateGame(state, 'player1', game.id, 4, 'Great game!');
    assert(res.success === true, 'rateGame should succeed');
    assert(typeof res.avgRating === 'number', 'avgRating should be returned');
  });

  test('rating is stored on game', function() {
    var state = freshState();
    var game = createAndPublish(state, 'creator1');
    Forge.rateGame(state, 'player1', game.id, 5, 'Amazing');
    var updated = Forge.getGame(state, game.id);
    assert(updated.ratings.length === 1, 'Rating should be stored');
    assert(updated.ratings[0].rating === 5, 'Rating value should match');
    assert(updated.ratings[0].review === 'Amazing', 'Review should match');
  });

  test('avgRating is updated correctly', function() {
    var state = freshState();
    var game = createAndPublish(state, 'creator1');
    Forge.rateGame(state, 'player1', game.id, 4);
    Forge.rateGame(state, 'player2', game.id, 2);
    var updated = Forge.getGame(state, game.id);
    assert(updated.avgRating === 3, 'avgRating should be (4+2)/2 = 3');
  });

  test('same player updating rating replaces old rating', function() {
    var state = freshState();
    var game = createAndPublish(state, 'creator1');
    Forge.rateGame(state, 'player1', game.id, 2);
    Forge.rateGame(state, 'player1', game.id, 5);
    var updated = Forge.getGame(state, game.id);
    assert(updated.ratings.length === 1, 'Should only have 1 rating from player1');
    assert(updated.ratings[0].rating === 5, 'Rating should be updated to 5');
  });

  test('cannot rate with rating < 1', function() {
    var state = freshState();
    var game = createAndPublish(state, 'creator1');
    var res = Forge.rateGame(state, 'player1', game.id, 0);
    assert(res.success === false, 'Rating 0 should be invalid');
  });

  test('cannot rate with rating > 5', function() {
    var state = freshState();
    var game = createAndPublish(state, 'creator1');
    var res = Forge.rateGame(state, 'player1', game.id, 6);
    assert(res.success === false, 'Rating 6 should be invalid');
  });

  test('cannot rate non-string rating', function() {
    var state = freshState();
    var game = createAndPublish(state, 'creator1');
    var res = Forge.rateGame(state, 'player1', game.id, 'five');
    assert(res.success === false, 'String rating should be invalid');
  });

  test('cannot rate a draft game', function() {
    var state = freshState();
    var res = Forge.createGame(state, 'creator1', 'Draft', 'desc', makeSimpleRules(), 0, null, 'easy', [], 0);
    var rate = Forge.rateGame(state, 'player1', res.game.id, 4);
    assert(rate.success === false, 'Cannot rate draft game');
  });

  test('cannot rate nonexistent game', function() {
    var state = freshState();
    var res = Forge.rateGame(state, 'player1', 'nonexistent_id', 4);
    assert(res.success === false, 'Cannot rate nonexistent game');
  });

  test('review is optional', function() {
    var state = freshState();
    var game = createAndPublish(state, 'creator1');
    var res = Forge.rateGame(state, 'player1', game.id, 3);
    assert(res.success === true, 'Rating without review should succeed');
  });
});

// ─── getGame ─────────────────────────────────────────────────────────────────

suite('getGame', function() {
  reset();

  test('returns game by id', function() {
    var state = freshState();
    var res = Forge.createGame(state, 'p1', 'Test', 'desc', makeSimpleRules(), 0, null, 'easy', [], 0);
    var game = Forge.getGame(state, res.game.id);
    assert(game !== null, 'Should find game');
    assert(game.id === res.game.id, 'Should return correct game');
  });

  test('returns null for nonexistent game', function() {
    var state = freshState();
    var game = Forge.getGame(state, 'nonexistent_id');
    assert(game === null, 'Should return null for nonexistent game');
  });
});

// ─── getPublishedGames ────────────────────────────────────────────────────────

suite('getPublishedGames', function() {
  reset();

  test('returns only published games', function() {
    var state = freshState();
    Forge.createGame(state, 'p1', 'Draft', 'desc', makeSimpleRules(), 0, null, 'easy', [], 0);
    createAndPublish(state, 'p1', 'Published');
    var games = Forge.getPublishedGames(state);
    assert(games.every(function(g) { return g.status === 'published'; }), 'All returned games should be published');
    assert(games.length >= 1, 'Should return at least 1 published game');
  });

  test('filters by zone', function() {
    var state = freshState();
    Forge.createGame(state, 'p1', 'Gardens Game', 'desc', makeSimpleRules(), 0, 'gardens', 'easy', [], 0);
    Forge.publishGame(state, 'p1', state.forge.games[state.forge.games.length - 1].id);
    Forge.createGame(state, 'p1', 'Wilds Game', 'desc', makeSimpleRules(), 0, 'wilds', 'easy', [], 0);
    Forge.publishGame(state, 'p1', state.forge.games[state.forge.games.length - 1].id);
    var gardens = Forge.getPublishedGames(state, 'gardens');
    assert(gardens.every(function(g) { return g.zone === 'gardens'; }), 'Should only return gardens games');
  });

  test('filters by difficulty', function() {
    var state = freshState();
    Forge.createGame(state, 'p1', 'Easy', 'desc', makeSimpleRules(), 0, null, 'easy', [], 0);
    Forge.publishGame(state, 'p1', state.forge.games[state.forge.games.length - 1].id);
    Forge.createGame(state, 'p1', 'Hard', 'desc', makeSimpleRules(), 0, null, 'hard', [], 0);
    Forge.publishGame(state, 'p1', state.forge.games[state.forge.games.length - 1].id);
    var easy = Forge.getPublishedGames(state, null, 'easy');
    assert(easy.every(function(g) { return g.difficulty === 'easy'; }), 'Should only return easy games');
  });

  test('filters by tags', function() {
    var state = freshState();
    Forge.createGame(state, 'p1', 'Fishing', 'desc', makeSimpleRules(), 0, null, 'easy', ['fishing'], 0);
    Forge.publishGame(state, 'p1', state.forge.games[state.forge.games.length - 1].id);
    Forge.createGame(state, 'p1', 'Crafting', 'desc', makeSimpleRules(), 0, null, 'easy', ['crafting'], 0);
    Forge.publishGame(state, 'p1', state.forge.games[state.forge.games.length - 1].id);
    var fishing = Forge.getPublishedGames(state, null, null, ['fishing']);
    assert(fishing.every(function(g) { return g.tags.indexOf('fishing') !== -1; }), 'Should only return fishing games');
  });

  test('returns all when no filters', function() {
    var state = freshState();
    createAndPublish(state, 'p1', 'Game 1');
    createAndPublish(state, 'p2', 'Game 2');
    var all = Forge.getPublishedGames(state);
    assert(all.length >= 2, 'Should return all published games');
  });
});

// ─── getPlayerGames ───────────────────────────────────────────────────────────

suite('getPlayerGames', function() {
  reset();

  test('returns games created by player', function() {
    var state = freshState();
    Forge.createGame(state, 'p1', 'P1 Game', 'desc', makeSimpleRules(), 0, null, 'easy', [], 0);
    Forge.createGame(state, 'p2', 'P2 Game', 'desc', makeSimpleRules(), 0, null, 'easy', [], 0);
    var p1Games = Forge.getPlayerGames(state, 'p1');
    assert(p1Games.every(function(g) { return g.creatorId === 'p1'; }), 'All returned games should be by p1');
  });

  test('returns empty array for player with no games', function() {
    var state = freshState();
    var games = Forge.getPlayerGames(state, 'no_games_player');
    assert(Array.isArray(games) && games.length === 0, 'Should return empty array');
  });

  test('returns all statuses for player', function() {
    var state = freshState();
    var r1 = Forge.createGame(state, 'p1', 'Draft', 'desc', makeSimpleRules(), 0, null, 'easy', [], 0);
    Forge.createGame(state, 'p1', 'Pub', 'desc', makeSimpleRules(), 0, null, 'easy', [], 0);
    Forge.publishGame(state, 'p1', state.forge.games[state.forge.games.length - 1].id);
    var p1Games = Forge.getPlayerGames(state, 'p1');
    assert(p1Games.length >= 2, 'Should return both draft and published games');
  });
});

// ─── getPopularGames ─────────────────────────────────────────────────────────

suite('getPopularGames', function() {
  reset();

  test('returns published games sorted by play count', function() {
    var state = freshState();
    var g1 = createAndPublish(state, 'p1', 'Popular');
    var g2 = createAndPublish(state, 'p1', 'Less Popular');
    Forge.startPlay(state, 'u1', g1.id, 0);
    Forge.startPlay(state, 'u2', g1.id, 0);
    Forge.startPlay(state, 'u3', g1.id, 0);
    Forge.startPlay(state, 'u4', g2.id, 0);
    var popular = Forge.getPopularGames(state, 2);
    assert(popular.length >= 1, 'Should return games');
    assert(popular[0].plays >= popular[popular.length - 1].plays, 'Should be sorted by plays descending');
  });

  test('respects count parameter', function() {
    var state = freshState();
    createAndPublish(state, 'p1', 'G1');
    createAndPublish(state, 'p1', 'G2');
    createAndPublish(state, 'p1', 'G3');
    var top2 = Forge.getPopularGames(state, 2);
    assert(top2.length <= 2, 'Should return at most count games');
  });

  test('defaults to 10 when count not provided', function() {
    var state = freshState();
    for (var i = 0; i < 15; i++) createAndPublish(state, 'p1', 'Game ' + i);
    var popular = Forge.getPopularGames(state);
    assert(popular.length <= 10, 'Default should return at most 10');
  });
});

// ─── getTopRatedGames ─────────────────────────────────────────────────────────

suite('getTopRatedGames', function() {
  reset();

  test('returns published games sorted by avg rating', function() {
    var state = freshState();
    var g1 = createAndPublish(state, 'p1', 'High Rated');
    var g2 = createAndPublish(state, 'p1', 'Low Rated');
    Forge.rateGame(state, 'u1', g1.id, 5);
    Forge.rateGame(state, 'u1', g2.id, 1);
    var top = Forge.getTopRatedGames(state, 2);
    assert(top.length >= 1, 'Should return games');
    assert(top[0].avgRating >= top[top.length - 1].avgRating, 'Should be sorted by avgRating descending');
  });

  test('respects count parameter', function() {
    var state = freshState();
    createAndPublish(state, 'p1', 'G1');
    createAndPublish(state, 'p1', 'G2');
    createAndPublish(state, 'p1', 'G3');
    var top2 = Forge.getTopRatedGames(state, 2);
    assert(top2.length <= 2, 'Should return at most count games');
  });

  test('returns only published games', function() {
    var state = freshState();
    var res = Forge.createGame(state, 'p1', 'Draft', 'desc', makeSimpleRules(), 0, null, 'easy', [], 0);
    // rate the draft somehow (it won't appear via getTopRatedGames since not published)
    var topRated = Forge.getTopRatedGames(state);
    assert(topRated.every(function(g) { return g.status === 'published'; }), 'Only published should be returned');
  });
});

// ─── getRecentGames ───────────────────────────────────────────────────────────

suite('getRecentGames', function() {
  reset();

  test('returns published games sorted by createdAt descending', function() {
    var state = freshState();
    var res1 = Forge.createGame(state, 'p1', 'Old', 'desc', makeSimpleRules(), 0, null, 'easy', [], 100);
    Forge.publishGame(state, 'p1', res1.game.id);
    var res2 = Forge.createGame(state, 'p1', 'New', 'desc', makeSimpleRules(), 0, null, 'easy', [], 999);
    Forge.publishGame(state, 'p1', res2.game.id);
    var recent = Forge.getRecentGames(state, 2);
    assert(recent.length >= 1, 'Should return games');
    if (recent.length >= 2) {
      assert(recent[0].createdAt >= recent[1].createdAt, 'Should be sorted by createdAt descending');
    }
  });

  test('respects count parameter', function() {
    var state = freshState();
    createAndPublish(state, 'p1', 'G1');
    createAndPublish(state, 'p1', 'G2');
    createAndPublish(state, 'p1', 'G3');
    var recent = Forge.getRecentGames(state, 2);
    assert(recent.length <= 2, 'Should return at most count games');
  });
});

// ─── getPlayHistory ───────────────────────────────────────────────────────────

suite('getPlayHistory', function() {
  reset();

  test('returns all sessions for player', function() {
    var state = freshState();
    var game = createAndPublish(state, 'creator1');
    Forge.startPlay(state, 'player1', game.id, 0);
    Forge.startPlay(state, 'player1', game.id, 10);
    var history = Forge.getPlayHistory(state, 'player1');
    assert(history.length >= 2, 'Should return both sessions');
  });

  test('returns empty array for player with no history', function() {
    var state = freshState();
    var history = Forge.getPlayHistory(state, 'new_player');
    assert(Array.isArray(history) && history.length === 0, 'Should return empty array');
  });

  test('does not include other players sessions', function() {
    var state = freshState();
    var game = createAndPublish(state, 'creator1');
    Forge.startPlay(state, 'player1', game.id, 0);
    Forge.startPlay(state, 'player2', game.id, 0);
    var history = Forge.getPlayHistory(state, 'player1');
    assert(history.every(function(s) { return s.playerId === 'player1'; }), 'Should only return player1 sessions');
  });

  test('includes sessions of all statuses', function() {
    var state = freshState();
    var game = createAndPublish(state, 'creator1');
    var s1 = Forge.startPlay(state, 'player1', game.id, 0);
    var s2 = Forge.startPlay(state, 'player1', game.id, 0);
    Forge.completePlay(state, s1.session.id, 10);
    Forge.failPlay(state, s2.session.id, 'timeout');
    var history = Forge.getPlayHistory(state, 'player1');
    var statuses = history.map(function(s) { return s.status; });
    assert(statuses.indexOf('completed') !== -1, 'History should include completed session');
    assert(statuses.indexOf('failed') !== -1, 'History should include failed session');
  });
});

// ─── getGameLeaderboard ───────────────────────────────────────────────────────

suite('getGameLeaderboard', function() {
  reset();

  test('returns completed sessions sorted by elapsed time', function() {
    var state = freshState();
    var game = createAndPublish(state, 'creator1');
    var s1 = Forge.startPlay(state, 'fast_player', game.id, 0);
    Forge.completePlay(state, s1.session.id, 20);
    var s2 = Forge.startPlay(state, 'slow_player', game.id, 0);
    Forge.completePlay(state, s2.session.id, 100);
    var lb = Forge.getGameLeaderboard(state, game.id, 10);
    assert(lb.length >= 2, 'Should return entries');
    assert(lb[0].elapsed <= lb[1].elapsed, 'Should be sorted fastest first');
  });

  test('each entry has rank, playerId, sessionId, score, elapsed', function() {
    var state = freshState();
    var game = createAndPublish(state, 'creator1');
    var sess = Forge.startPlay(state, 'player1', game.id, 0);
    Forge.completePlay(state, sess.session.id, 50);
    var lb = Forge.getGameLeaderboard(state, game.id, 10);
    assert(lb.length >= 1, 'Should have entry');
    var entry = lb[0];
    assert(entry.rank === 1, 'First rank should be 1');
    assert(typeof entry.playerId === 'string', 'Should have playerId');
    assert(typeof entry.sessionId === 'string', 'Should have sessionId');
    assert(typeof entry.score === 'number', 'Should have score');
    assert(typeof entry.elapsed === 'number', 'Should have elapsed');
  });

  test('only includes completed sessions', function() {
    var state = freshState();
    var game = createAndPublish(state, 'creator1');
    var s1 = Forge.startPlay(state, 'player1', game.id, 0);
    Forge.failPlay(state, s1.session.id, 'timeout');
    var s2 = Forge.startPlay(state, 'player2', game.id, 0);
    // left active
    var lb = Forge.getGameLeaderboard(state, game.id, 10);
    assert(lb.length === 0, 'Failed and active sessions should not appear in leaderboard');
  });

  test('respects count parameter', function() {
    var state = freshState();
    var game = createAndPublish(state, 'creator1');
    for (var i = 0; i < 5; i++) {
      var sess = Forge.startPlay(state, 'player' + i, game.id, 0);
      Forge.completePlay(state, sess.session.id, 10 + i);
    }
    var lb = Forge.getGameLeaderboard(state, game.id, 3);
    assert(lb.length <= 3, 'Should return at most count entries');
  });

  test('returns empty array for game with no completions', function() {
    var state = freshState();
    var game = createAndPublish(state, 'creator1');
    var lb = Forge.getGameLeaderboard(state, game.id, 10);
    assert(Array.isArray(lb) && lb.length === 0, 'Should return empty array');
  });
});

// ─── getGameStats ─────────────────────────────────────────────────────────────

suite('getGameStats', function() {
  reset();

  test('returns null for nonexistent game', function() {
    var state = freshState();
    var stats = Forge.getGameStats(state, 'nonexistent_id');
    assert(stats === null, 'Should return null for nonexistent game');
  });

  test('returns correct stats for game with plays', function() {
    var state = freshState();
    var game = createAndPublish(state, 'creator1');
    var s1 = Forge.startPlay(state, 'p1', game.id, 0);
    Forge.completePlay(state, s1.session.id, 30);
    var s2 = Forge.startPlay(state, 'p2', game.id, 0);
    Forge.failPlay(state, s2.session.id, 'timeout');
    var stats = Forge.getGameStats(state, game.id);
    assert(stats !== null, 'Should return stats');
    assert(stats.gameId === game.id, 'gameId should match');
    assert(typeof stats.plays === 'number', 'plays should be number');
    assert(stats.completions === 1, 'completions should be 1');
    assert(stats.failures === 1, 'failures should be 1');
    assert(typeof stats.completionRate === 'number', 'completionRate should be number');
    assert(stats.avgTime === 30, 'avgTime should be 30');
  });

  test('completionRate is between 0 and 1', function() {
    var state = freshState();
    var game = createAndPublish(state, 'creator1');
    var s1 = Forge.startPlay(state, 'p1', game.id, 0);
    Forge.completePlay(state, s1.session.id, 10);
    var s2 = Forge.startPlay(state, 'p2', game.id, 0);
    Forge.failPlay(state, s2.session.id, 'timeout');
    var stats = Forge.getGameStats(state, game.id);
    assert(stats.completionRate >= 0 && stats.completionRate <= 1, 'completionRate should be 0-1');
  });

  test('ratingDistribution has keys 1-5', function() {
    var state = freshState();
    var game = createAndPublish(state, 'creator1');
    Forge.rateGame(state, 'p1', game.id, 5);
    Forge.rateGame(state, 'p2', game.id, 3);
    var stats = Forge.getGameStats(state, game.id);
    assert(stats.ratingDistribution[5] === 1, 'Should have 1 five-star rating');
    assert(stats.ratingDistribution[3] === 1, 'Should have 1 three-star rating');
    assert(stats.ratingDistribution[1] === 0, 'Should have 0 one-star ratings');
  });

  test('ratingCount matches number of ratings', function() {
    var state = freshState();
    var game = createAndPublish(state, 'creator1');
    Forge.rateGame(state, 'p1', game.id, 4);
    Forge.rateGame(state, 'p2', game.id, 5);
    var stats = Forge.getGameStats(state, game.id);
    assert(stats.ratingCount === 2, 'ratingCount should be 2');
  });

  test('stats for game with no plays', function() {
    var state = freshState();
    var game = createAndPublish(state, 'creator1');
    var stats = Forge.getGameStats(state, game.id);
    assert(stats.plays === 0, 'plays should be 0');
    assert(stats.completions === 0, 'completions should be 0');
    assert(stats.completionRate === 0, 'completionRate should be 0');
    assert(stats.avgTime === 0, 'avgTime should be 0');
  });
});

// ─── getForgeStats ───────────────────────────────────────────────────────────

suite('getForgeStats', function() {
  reset();

  test('returns total game count', function() {
    var state = freshState();
    Forge.createGame(state, 'p1', 'G1', 'desc', makeSimpleRules(), 0, null, 'easy', [], 0);
    Forge.createGame(state, 'p1', 'G2', 'desc', makeSimpleRules(), 0, null, 'easy', [], 0);
    var stats = Forge.getForgeStats(state);
    assert(typeof stats.totalGames === 'number', 'totalGames should be number');
    assert(stats.totalGames >= 2, 'totalGames should count all games');
  });

  test('returns published game count', function() {
    var state = freshState();
    createAndPublish(state, 'p1', 'Published');
    Forge.createGame(state, 'p1', 'Draft', 'desc', makeSimpleRules(), 0, null, 'easy', [], 0);
    var stats = Forge.getForgeStats(state);
    assert(typeof stats.publishedGames === 'number', 'publishedGames should be number');
  });

  test('returns total plays', function() {
    var state = freshState();
    var game = createAndPublish(state, 'p1', 'Popular');
    Forge.startPlay(state, 'u1', game.id, 0);
    Forge.startPlay(state, 'u2', game.id, 0);
    var stats = Forge.getForgeStats(state);
    assert(typeof stats.totalPlays === 'number', 'totalPlays should be number');
    assert(stats.totalPlays >= 2, 'totalPlays should be at least 2');
  });

  test('returns total sessions', function() {
    var state = freshState();
    var game = createAndPublish(state, 'p1', 'G');
    Forge.startPlay(state, 'u1', game.id, 0);
    var stats = Forge.getForgeStats(state);
    assert(typeof stats.totalSessions === 'number', 'totalSessions should be number');
    assert(stats.totalSessions >= 1, 'totalSessions should count sessions');
  });

  test('returns mostPopularCreator', function() {
    var state = freshState();
    var g1 = createAndPublish(state, 'prolific_creator', 'G1');
    Forge.startPlay(state, 'u1', g1.id, 0);
    Forge.startPlay(state, 'u2', g1.id, 0);
    Forge.startPlay(state, 'u3', g1.id, 0);
    createAndPublish(state, 'other_creator', 'G2');
    var stats = Forge.getForgeStats(state);
    assert(stats.mostPopularCreator === 'prolific_creator', 'mostPopularCreator should be prolific_creator');
  });

  test('returns null mostPopularCreator when no games', function() {
    var state = freshState();
    var stats = Forge.getForgeStats(state);
    assert(stats.mostPopularCreator === null, 'No games should return null creator');
  });

  test('stats object has all expected keys', function() {
    var state = freshState();
    var stats = Forge.getForgeStats(state);
    assert(stats.hasOwnProperty('totalGames'), 'Should have totalGames');
    assert(stats.hasOwnProperty('publishedGames'), 'Should have publishedGames');
    assert(stats.hasOwnProperty('totalPlays'), 'Should have totalPlays');
    assert(stats.hasOwnProperty('totalSessions'), 'Should have totalSessions');
    assert(stats.hasOwnProperty('mostPopularCreator'), 'Should have mostPopularCreator');
  });
});

// ─── End-to-end workflow ──────────────────────────────────────────────────────

suite('End-to-end workflow', function() {
  reset();

  test('full game lifecycle: create → publish → play → complete → rate', function() {
    var state = freshState();

    // Create
    var created = Forge.createGame(state, 'creator1', 'Ultimate Fisher', 'Fish 3 any',
      [{type: 'catch_fish', params: {fishType: 'any', count: 3}}], 120, 'wilds', 'medium', ['fishing'], 100);
    assert(created.success, 'Create should succeed');
    assert(created.game.status === 'draft', 'Should start as draft');

    // Publish
    var published = Forge.publishGame(state, 'creator1', created.game.id);
    assert(published.success, 'Publish should succeed');

    // Start play
    var session = Forge.startPlay(state, 'player1', created.game.id, 200);
    assert(session.success, 'Start play should succeed');

    // Update progress
    Forge.updateProgress(state, session.session.id, 0, 1);
    Forge.updateProgress(state, session.session.id, 0, 1);
    Forge.updateProgress(state, session.session.id, 0, 1);

    // Check completion
    var check = Forge.checkCompletion(state, session.session.id, 250);
    assert(check.complete === true, 'Should be complete');
    assert(check.timedOut === false, 'Should not be timed out');

    // Complete
    var completed = Forge.completePlay(state, session.session.id, 250);
    assert(completed.success, 'Complete should succeed');
    assert(completed.reward.spark > 0, 'Should have spark reward');

    // Rate
    var rated = Forge.rateGame(state, 'player1', created.game.id, 5, 'Loved it!');
    assert(rated.success, 'Rate should succeed');
    assert(rated.avgRating === 5, 'avgRating should be 5');

    // Verify leaderboard
    var lb = Forge.getGameLeaderboard(state, created.game.id, 5);
    assert(lb.length === 1, 'Leaderboard should have 1 entry');
    assert(lb[0].rank === 1, 'Rank should be 1');
    assert(lb[0].playerId === 'player1', 'Player should be on leaderboard');
  });

  test('fork and independent play workflow', function() {
    var state = freshState();
    var original = createAndPublish(state, 'creator1', 'Original');
    var fork = Forge.forkGame(state, 'player2', original.id, 'My Fork', 500);
    assert(fork.success, 'Fork should succeed');
    Forge.publishGame(state, 'player2', fork.game.id);

    // Play the fork
    var sess = Forge.startPlay(state, 'player3', fork.game.id, 600);
    assert(sess.success, 'Should play fork');

    // Original plays should not be affected by fork plays
    var origGame = Forge.getGame(state, original.id);
    assert(origGame.plays === 0, 'Original game plays should not be affected by fork plays');
  });

  test('game forge stats aggregate correctly', function() {
    var state = freshState();
    createAndPublish(state, 'builder', 'G1');
    createAndPublish(state, 'builder', 'G2');
    var g3 = createAndPublish(state, 'other', 'G3');
    Forge.startPlay(state, 'u1', g3.id, 0);
    Forge.startPlay(state, 'u2', g3.id, 0);
    Forge.startPlay(state, 'u3', g3.id, 0);

    var stats = Forge.getForgeStats(state);
    assert(stats.totalGames >= 3, 'Should count all games');
    assert(stats.publishedGames >= 3, 'Should count published games');
    assert(stats.totalPlays >= 3, 'Should count all plays');
    assert(stats.mostPopularCreator === 'other', 'other has most plays');
  });
});

// ─── Final report ─────────────────────────────────────────────────────────────

var passed = report();
process.exit(passed ? 0 : 1);
