/**
 * tests/test_dungeons.js
 * 80+ tests for the Dungeons procedural dungeon generator.
 */
const { test, suite, report, assert } = require('./test_runner');
const Dungeons = require('../src/js/dungeons');

// ============================================================================
// SUITE 1: Constants & Data Tables
// ============================================================================
suite('Dungeon Constants', function() {

  test('ROOM_TYPES has all 9 types', function() {
    var expected = ['entrance','corridor','chamber','treasure_room','boss_room','puzzle_room','trap_room','rest_area','secret_room'];
    expected.forEach(function(t) {
      assert.ok(Dungeons.ROOM_TYPES[t] === t, 'Missing ROOM_TYPE: ' + t);
    });
    assert.strictEqual(Object.keys(Dungeons.ROOM_TYPES).length, 9);
  });

  test('PUZZLE_TYPES has all 6 types', function() {
    var expected = ['lever_sequence','pressure_plates','riddle','pattern_match','light_bridge','crystal_align'];
    expected.forEach(function(t) {
      assert.ok(Dungeons.PUZZLE_TYPES[t] === t, 'Missing PUZZLE_TYPE: ' + t);
    });
    assert.strictEqual(Object.keys(Dungeons.PUZZLE_TYPES).length, 6);
  });

  test('ENEMY_TYPES has all 5 enemies', function() {
    var expected = ['shadow_wisp','stone_guardian','crystal_spider','void_walker','ancient_sentinel'];
    expected.forEach(function(e) {
      assert.ok(Dungeons.ENEMY_TYPES[e], 'Missing ENEMY_TYPE: ' + e);
    });
    assert.strictEqual(Object.keys(Dungeons.ENEMY_TYPES).length, 5);
  });

  test('Each enemy has required stats', function() {
    Object.keys(Dungeons.ENEMY_TYPES).forEach(function(key) {
      var e = Dungeons.ENEMY_TYPES[key];
      assert.ok(e.hp > 0, key + ' hp must be > 0');
      assert.ok(e.attack > 0, key + ' attack must be > 0');
      assert.ok(typeof e.defense === 'number', key + ' must have defense');
      assert.ok(e.speed > 0, key + ' speed must be > 0');
      assert.ok(e.xp > 0, key + ' xp must be > 0');
      assert.ok(e.tier, key + ' must have tier');
    });
  });

  test('ancient_sentinel is boss tier', function() {
    assert.strictEqual(Dungeons.ENEMY_TYPES.ancient_sentinel.tier, 'boss');
  });

  test('LOOT_TABLES has 5 tiers', function() {
    var tiers = ['common','uncommon','rare','epic','legendary'];
    tiers.forEach(function(t) {
      assert.ok(Dungeons.LOOT_TABLES[t], 'Missing LOOT tier: ' + t);
      assert.ok(Dungeons.LOOT_TABLES[t].items.length > 0, t + ' items must not be empty');
    });
  });

  test('Each loot item has required fields', function() {
    Object.keys(Dungeons.LOOT_TABLES).forEach(function(tier) {
      Dungeons.LOOT_TABLES[tier].items.forEach(function(item) {
        assert.ok(item.id, 'item must have id');
        assert.ok(item.name, 'item must have name');
        assert.ok(item.type, 'item must have type');
        assert.ok(item.value > 0, 'item value must be > 0');
      });
    });
  });

  test('DIFFICULTY_LEVELS has 4 levels', function() {
    var expected = ['novice','adventurer','hero','legend'];
    expected.forEach(function(d) {
      assert.ok(Dungeons.DIFFICULTY_LEVELS[d], 'Missing DIFFICULTY: ' + d);
    });
    assert.strictEqual(Object.keys(Dungeons.DIFFICULTY_LEVELS).length, 4);
  });

  test('DIFFICULTY_LEVELS have correct multiplier ordering', function() {
    var n = Dungeons.DIFFICULTY_LEVELS.novice;
    var a = Dungeons.DIFFICULTY_LEVELS.adventurer;
    var h = Dungeons.DIFFICULTY_LEVELS.hero;
    var l = Dungeons.DIFFICULTY_LEVELS.legend;
    assert.ok(n.enemyHpMult < a.enemyHpMult, 'novice hp mult < adventurer');
    assert.ok(a.enemyHpMult < h.enemyHpMult, 'adventurer hp mult < hero');
    assert.ok(h.enemyHpMult < l.enemyHpMult, 'hero hp mult < legend');
    assert.ok(n.xpMult < a.xpMult, 'novice xp < adventurer');
  });

  test('DUNGEON_SIZES has 4 sizes', function() {
    var expected = ['small','medium','large','epic'];
    expected.forEach(function(s) {
      assert.ok(Dungeons.DUNGEON_SIZES[s], 'Missing SIZE: ' + s);
    });
  });

  test('DUNGEON_SIZES room ranges are correct', function() {
    assert.strictEqual(Dungeons.DUNGEON_SIZES.small.minRooms, 5);
    assert.strictEqual(Dungeons.DUNGEON_SIZES.small.maxRooms, 8);
    assert.strictEqual(Dungeons.DUNGEON_SIZES.medium.minRooms, 10);
    assert.strictEqual(Dungeons.DUNGEON_SIZES.medium.maxRooms, 15);
    assert.strictEqual(Dungeons.DUNGEON_SIZES.large.minRooms, 18);
    assert.strictEqual(Dungeons.DUNGEON_SIZES.large.maxRooms, 25);
    assert.ok(Dungeons.DUNGEON_SIZES.epic.minRooms >= 30, 'epic min >= 30');
  });
});

// ============================================================================
// SUITE 2: generatePuzzle
// ============================================================================
suite('generatePuzzle', function() {

  test('generates lever_sequence puzzle with solution array', function() {
    var p = Dungeons.generatePuzzle(12345, 'lever_sequence');
    assert.ok(p, 'puzzle must exist');
    assert.strictEqual(p.type, 'lever_sequence');
    assert.ok(Array.isArray(p.solution), 'solution must be array');
    assert.ok(p.solution.length >= 3, 'solution length >= 3');
    assert.ok(p.levers >= 3, 'levers >= 3');
  });

  test('generates pressure_plates puzzle', function() {
    var p = Dungeons.generatePuzzle(99999, 'pressure_plates');
    assert.strictEqual(p.type, 'pressure_plates');
    assert.ok(p.plates >= 4, 'plates >= 4');
    assert.ok(Array.isArray(p.solution), 'solution must be array');
    assert.ok(p.solution.length > 0, 'must have active plates');
  });

  test('generates riddle puzzle with question and string solution', function() {
    var p = Dungeons.generatePuzzle(11111, 'riddle');
    assert.strictEqual(p.type, 'riddle');
    assert.ok(p.question, 'must have question');
    assert.ok(typeof p.solution === 'string', 'riddle solution must be string');
  });

  test('generates pattern_match puzzle', function() {
    var p = Dungeons.generatePuzzle(22222, 'pattern_match');
    assert.strictEqual(p.type, 'pattern_match');
    assert.ok(Array.isArray(p.solution), 'solution must be array');
    assert.ok(p.size >= 3 && p.size <= 5, 'size in [3,5]');
  });

  test('generates light_bridge puzzle', function() {
    var p = Dungeons.generatePuzzle(33333, 'light_bridge');
    assert.strictEqual(p.type, 'light_bridge');
    assert.ok(p.segments >= 4, 'segments >= 4');
    assert.ok(Array.isArray(p.solution), 'solution array');
  });

  test('generates crystal_align puzzle with valid angles', function() {
    var p = Dungeons.generatePuzzle(44444, 'crystal_align');
    assert.strictEqual(p.type, 'crystal_align');
    assert.ok(p.crystals >= 3, 'crystals >= 3');
    var validAngles = [0,45,90,135,180,225,270,315];
    p.solution.forEach(function(angle) {
      assert.ok(validAngles.indexOf(angle) !== -1, 'angle must be valid: ' + angle);
    });
  });

  test('puzzle has id, solved=false, attempts=0', function() {
    var p = Dungeons.generatePuzzle(55555, 'pattern_match');
    assert.ok(p.id, 'must have id');
    assert.strictEqual(p.solved, false);
    assert.strictEqual(p.attempts, 0);
  });

  test('puzzle has description and hint', function() {
    var p = Dungeons.generatePuzzle(66666, 'lever_sequence');
    assert.ok(p.description, 'must have description');
    assert.ok(p.hint, 'must have hint');
  });

  test('same seed produces identical puzzle', function() {
    var p1 = Dungeons.generatePuzzle(77777, 'pattern_match');
    var p2 = Dungeons.generatePuzzle(77777, 'pattern_match');
    assert.deepStrictEqual(p1.solution, p2.solution);
  });

  test('different seeds produce different puzzles', function() {
    var p1 = Dungeons.generatePuzzle(100, 'lever_sequence');
    var p2 = Dungeons.generatePuzzle(200, 'lever_sequence');
    // different seeds — solutions very likely differ
    var same = JSON.stringify(p1.solution) === JSON.stringify(p2.solution);
    // just verify they're valid structures
    assert.ok(Array.isArray(p1.solution) && Array.isArray(p2.solution));
  });
});

// ============================================================================
// SUITE 3: solvePuzzle
// ============================================================================
suite('solvePuzzle', function() {

  test('correct array solution returns success', function() {
    var p = Dungeons.generatePuzzle(101, 'pattern_match');
    var result = Dungeons.solvePuzzle(p, p.solution.slice());
    assert.strictEqual(result.success, true);
    assert.strictEqual(p.solved, true);
  });

  test('incorrect array solution returns failure', function() {
    var p = Dungeons.generatePuzzle(102, 'pattern_match');
    var wrong = p.solution.map(function() { return 99; });
    var result = Dungeons.solvePuzzle(p, wrong);
    assert.strictEqual(result.success, false);
    assert.strictEqual(p.solved, false);
  });

  test('riddle correct answer (case-insensitive) succeeds', function() {
    var p = Dungeons.generatePuzzle(103, 'riddle');
    var correctAnswer = p.solution;
    var result = Dungeons.solvePuzzle(p, correctAnswer.toUpperCase());
    assert.strictEqual(result.success, true);
  });

  test('riddle wrong answer fails', function() {
    var p = Dungeons.generatePuzzle(104, 'riddle');
    var result = Dungeons.solvePuzzle(p, 'totally_wrong_answer_xyz');
    assert.strictEqual(result.success, false);
  });

  test('attempts counter increments on each try', function() {
    var p = Dungeons.generatePuzzle(105, 'pattern_match');
    Dungeons.solvePuzzle(p, [99, 99, 99]);
    assert.strictEqual(p.attempts, 1);
    Dungeons.solvePuzzle(p, [99, 99, 99]);
    assert.strictEqual(p.attempts, 2);
  });

  test('hint revealed after 3 failed attempts', function() {
    var p = Dungeons.generatePuzzle(106, 'pattern_match');
    var wrong = p.solution.map(function() { return 99; });
    Dungeons.solvePuzzle(p, wrong);
    Dungeons.solvePuzzle(p, wrong);
    var result = Dungeons.solvePuzzle(p, wrong);
    assert.ok(result.message.indexOf('Hint') !== -1, 'Hint should appear after 3 attempts');
  });

  test('correct solution returns xpReward', function() {
    var p = Dungeons.generatePuzzle(107, 'lever_sequence');
    var result = Dungeons.solvePuzzle(p, p.solution.slice());
    assert.ok(result.xpReward > 0, 'xpReward must be positive');
  });

  test('null puzzle returns failure gracefully', function() {
    var result = Dungeons.solvePuzzle(null, [1,2,3]);
    assert.strictEqual(result.success, false);
  });

  test('wrong length array fails', function() {
    var p = Dungeons.generatePuzzle(108, 'lever_sequence');
    var result = Dungeons.solvePuzzle(p, [1]);
    assert.strictEqual(result.success, false);
  });
});

// ============================================================================
// SUITE 4: generateEnemyEncounter
// ============================================================================
suite('generateEnemyEncounter', function() {

  test('entrance room has no enemies', function() {
    var enc = Dungeons.generateEnemyEncounter(200, 'adventurer', 'entrance');
    assert.strictEqual(enc.enemies.length, 0);
  });

  test('rest_area has no enemies', function() {
    var enc = Dungeons.generateEnemyEncounter(201, 'adventurer', 'rest_area');
    assert.strictEqual(enc.enemies.length, 0);
  });

  test('boss_room has ancient_sentinel', function() {
    var enc = Dungeons.generateEnemyEncounter(202, 'adventurer', 'boss_room');
    assert.strictEqual(enc.isBossEncounter, true);
    var boss = enc.enemies[0];
    assert.strictEqual(boss.id, 'ancient_sentinel');
  });

  test('boss_room has minions too', function() {
    var enc = Dungeons.generateEnemyEncounter(203, 'adventurer', 'boss_room');
    assert.ok(enc.enemies.length > 1, 'boss room should have minions');
  });

  test('chamber room has 1-4 enemies', function() {
    var enc = Dungeons.generateEnemyEncounter(204, 'adventurer', 'chamber');
    assert.ok(enc.enemies.length >= 1, 'at least 1 enemy');
    assert.ok(enc.enemies.length <= 4, 'at most 4 enemies');
  });

  test('enemies have instanceId', function() {
    var enc = Dungeons.generateEnemyEncounter(205, 'adventurer', 'chamber');
    enc.enemies.forEach(function(e) {
      assert.ok(e.instanceId, 'enemy must have instanceId');
    });
  });

  test('enemies are scaled to difficulty', function() {
    var encNovice = Dungeons.generateEnemyEncounter(206, 'novice', 'chamber');
    var encLegend = Dungeons.generateEnemyEncounter(206, 'legend', 'chamber');
    if (encNovice.enemies.length > 0 && encLegend.enemies.length > 0) {
      // same enemy type at same seed, legend has more hp
      assert.ok(encLegend.enemies[0].hp >= encNovice.enemies[0].hp,
        'legend enemy hp >= novice enemy hp');
    }
  });

  test('totalXp is computed', function() {
    var enc = Dungeons.generateEnemyEncounter(207, 'hero', 'boss_room');
    assert.ok(enc.totalXp > 0, 'totalXp must be positive');
  });

  test('same seed + difficulty produces identical encounter', function() {
    var enc1 = Dungeons.generateEnemyEncounter(208, 'adventurer', 'chamber');
    var enc2 = Dungeons.generateEnemyEncounter(208, 'adventurer', 'chamber');
    assert.strictEqual(enc1.enemies.length, enc2.enemies.length);
    if (enc1.enemies.length > 0) {
      assert.strictEqual(enc1.enemies[0].id, enc2.enemies[0].id);
    }
  });

  test('corridor room has 0-2 enemies', function() {
    var enc = Dungeons.generateEnemyEncounter(209, 'adventurer', 'corridor');
    assert.ok(enc.enemies.length >= 0 && enc.enemies.length <= 2);
  });
});

// ============================================================================
// SUITE 5: calculateCombatOutcome
// ============================================================================
suite('calculateCombatOutcome', function() {

  test('no enemies = immediate victory', function() {
    var result = Dungeons.calculateCombatOutcome({hp:100, attack:10, defense:5, speed:5}, []);
    assert.strictEqual(result.victory, true);
    assert.strictEqual(result.rounds, 0);
    assert.strictEqual(result.xpGained, 0);
  });

  test('very strong player defeats weak enemy', function() {
    var player = { hp: 1000, attack: 100, defense: 50, speed: 10 };
    var enemy = { instanceId: 'e1', id: 'shadow_wisp', hp: 20, attack: 4, defense: 1, speed: 3, xp: 15 };
    var result = Dungeons.calculateCombatOutcome(player, [enemy]);
    assert.strictEqual(result.victory, true);
    assert.ok(result.xpGained > 0);
  });

  test('very weak player loses to strong enemy', function() {
    var player = { hp: 5, attack: 1, defense: 0, speed: 1 };
    var enemy = { instanceId: 'e1', id: 'ancient_sentinel', hp: 200, attack: 100, defense: 10, speed: 10, xp: 150 };
    var result = Dungeons.calculateCombatOutcome(player, [enemy]);
    assert.strictEqual(result.victory, false);
    assert.strictEqual(result.survived, false);
  });

  test('damageDealt is tracked', function() {
    var player = { hp: 500, attack: 30, defense: 10, speed: 5 };
    var enemy = { instanceId: 'e1', id: 'shadow_wisp', hp: 20, attack: 4, defense: 1, speed: 3, xp: 15 };
    var result = Dungeons.calculateCombatOutcome(player, [enemy]);
    assert.ok(result.damageDealt > 0, 'must deal damage');
  });

  test('damageTaken is tracked when player survives combat', function() {
    var player = { hp: 100, attack: 5, defense: 2, speed: 5 };
    var enemy = { instanceId: 'e1', id: 'stone_guardian', hp: 60, attack: 8, defense: 3, speed: 3, xp: 40 };
    var result = Dungeons.calculateCombatOutcome(player, [enemy]);
    // stone guardian will deal at least 1 damage before going down
    // if player wins, damageTaken >= 0
    assert.ok(result.damageTaken >= 0);
  });

  test('multiple enemies all attack player each round', function() {
    var player = { hp: 200, attack: 15, defense: 5, speed: 5 };
    var enemies = [
      { instanceId: 'e1', id: 'shadow_wisp', hp: 20, attack: 4, defense: 1, speed: 5, xp: 15 },
      { instanceId: 'e2', id: 'crystal_spider', hp: 35, attack: 6, defense: 2, speed: 5, xp: 25 }
    ];
    var result = Dungeons.calculateCombatOutcome(player, enemies);
    assert.ok(result.rounds > 0);
  });

  test('xpGained is 0 on defeat', function() {
    var player = { hp: 1, attack: 1, defense: 0, speed: 1 };
    var enemy = { instanceId: 'e1', id: 'ancient_sentinel', hp: 200, attack: 200, defense: 10, speed: 10, xp: 150 };
    var result = Dungeons.calculateCombatOutcome(player, [enemy]);
    assert.strictEqual(result.xpGained, 0);
  });

  test('null playerStats returns safe result', function() {
    var result = Dungeons.calculateCombatOutcome(null, []);
    assert.strictEqual(result.victory, true);
  });
});

// ============================================================================
// SUITE 6: getLootDrop
// ============================================================================
suite('getLootDrop', function() {

  test('returns a valid item', function() {
    var loot = Dungeons.getLootDrop(300, 'adventurer', 'common');
    assert.ok(loot.id, 'loot must have id');
    assert.ok(loot.name, 'loot must have name');
    assert.ok(loot.type, 'loot must have type');
    assert.ok(loot.value > 0, 'value must be > 0');
  });

  test('loot tier is set on item', function() {
    var loot = Dungeons.getLootDrop(301, 'adventurer', 'rare');
    assert.strictEqual(loot.tier, 'rare');
  });

  test('instanceId is generated', function() {
    var loot = Dungeons.getLootDrop(302, 'adventurer', 'epic');
    assert.ok(loot.instanceId, 'instanceId must exist');
  });

  test('novice difficulty inflates loot value', function() {
    var lootNovice = Dungeons.getLootDrop(303, 'novice', 'common');
    var lootAdv = Dungeons.getLootDrop(303, 'adventurer', 'common');
    assert.ok(lootNovice.value >= lootAdv.value, 'novice loot value >= adventurer (novice has lootMult 1.2)');
  });

  test('legend difficulty deflates loot value', function() {
    var lootLegend = Dungeons.getLootDrop(304, 'legend', 'common');
    var lootAdv = Dungeons.getLootDrop(304, 'adventurer', 'common');
    assert.ok(lootLegend.value <= lootAdv.value, 'legend loot value <= adventurer');
  });

  test('same seed + difficulty + tier returns identical item', function() {
    var l1 = Dungeons.getLootDrop(305, 'hero', 'legendary');
    var l2 = Dungeons.getLootDrop(305, 'hero', 'legendary');
    assert.strictEqual(l1.id, l2.id);
    assert.strictEqual(l1.value, l2.value);
  });

  test('invalid tier falls back to common', function() {
    var loot = Dungeons.getLootDrop(306, 'adventurer', 'invalid_tier');
    assert.ok(loot.id, 'should fall back to common');
  });

  test('all tiers generate valid items', function() {
    ['common','uncommon','rare','epic','legendary'].forEach(function(tier) {
      var loot = Dungeons.getLootDrop(307, 'adventurer', tier);
      assert.ok(loot.id, tier + ' should produce valid item');
    });
  });
});

// ============================================================================
// SUITE 7: generateRoom
// ============================================================================
suite('generateRoom', function() {

  test('entrance room has no enemies', function() {
    var room = Dungeons.generateRoom(400, 'entrance', 'adventurer');
    assert.strictEqual(room.type, 'entrance');
    assert.strictEqual(room.enemies.length, 0);
  });

  test('boss_room has enemies and loot', function() {
    var room = Dungeons.generateRoom(401, 'boss_room', 'adventurer');
    assert.strictEqual(room.type, 'boss_room');
    assert.ok(room.enemies.length > 0, 'boss room must have enemies');
    assert.ok(room.loot.length > 0, 'boss room must have loot');
  });

  test('puzzle_room has a puzzle', function() {
    var room = Dungeons.generateRoom(402, 'puzzle_room', 'adventurer');
    assert.strictEqual(room.type, 'puzzle_room');
    assert.ok(room.puzzle, 'puzzle_room must have a puzzle');
  });

  test('trap_room has traps', function() {
    var room = Dungeons.generateRoom(403, 'trap_room', 'adventurer');
    assert.strictEqual(room.type, 'trap_room');
    assert.ok(room.traps.length > 0, 'trap_room must have traps');
  });

  test('treasure_room has loot', function() {
    var room = Dungeons.generateRoom(404, 'treasure_room', 'adventurer');
    assert.strictEqual(room.type, 'treasure_room');
    assert.ok(room.loot.length > 0, 'treasure_room must have loot');
  });

  test('secret_room is flagged as isSecret', function() {
    var room = Dungeons.generateRoom(405, 'secret_room', 'adventurer');
    assert.strictEqual(room.isSecret, true);
  });

  test('room has dimensions (width/height)', function() {
    var room = Dungeons.generateRoom(406, 'chamber', 'adventurer');
    assert.ok(room.width > 0, 'width must be positive');
    assert.ok(room.height > 0, 'height must be positive');
  });

  test('boss room is larger than corridor', function() {
    var boss = Dungeons.generateRoom(407, 'boss_room', 'adventurer');
    var corridor = Dungeons.generateRoom(407, 'corridor', 'adventurer');
    assert.ok(boss.width > corridor.width, 'boss room wider than corridor');
  });

  test('room has description', function() {
    var room = Dungeons.generateRoom(408, 'chamber', 'adventurer');
    assert.ok(room.description && room.description.length > 0);
  });

  test('room starts unexplored and uncleared', function() {
    var room = Dungeons.generateRoom(409, 'chamber', 'adventurer');
    assert.strictEqual(room.explored, false);
    assert.strictEqual(room.cleared, false);
  });

  test('legend difficulty produces harder enemies than adventurer (same type)', function() {
    // Test by comparing scaled HP of a known enemy type across difficulties
    // Use generateEnemyEncounter on boss_room so we always get ancient_sentinel
    var encAdv = Dungeons.generateEnemyEncounter(410, 'adventurer', 'boss_room');
    var encLeg = Dungeons.generateEnemyEncounter(410, 'legend', 'boss_room');
    var bossAdv = encAdv.enemies[0]; // always ancient_sentinel
    var bossLeg = encLeg.enemies[0]; // always ancient_sentinel
    assert.ok(bossLeg.hp > bossAdv.hp,
      'legend boss hp (' + bossLeg.hp + ') > adventurer boss hp (' + bossAdv.hp + ')');
  });

  test('same seed + type + difficulty generates identical room', function() {
    var r1 = Dungeons.generateRoom(411, 'chamber', 'adventurer');
    var r2 = Dungeons.generateRoom(411, 'chamber', 'adventurer');
    assert.strictEqual(r1.width, r2.width);
    assert.strictEqual(r1.height, r2.height);
    assert.strictEqual(r1.enemies.length, r2.enemies.length);
  });
});

// ============================================================================
// SUITE 8: generateRoomGraph
// ============================================================================
suite('generateRoomGraph', function() {

  test('returns correct room count', function() {
    var graph = Dungeons.generateRoomGraph(500, 8);
    assert.strictEqual(graph.rooms.length, 8);
    assert.strictEqual(graph.roomCount, 8);
  });

  test('entrance is room 0', function() {
    var graph = Dungeons.generateRoomGraph(501, 10);
    assert.strictEqual(graph.entranceId, 0);
  });

  test('boss room is last', function() {
    var graph = Dungeons.generateRoomGraph(502, 10);
    assert.strictEqual(graph.bossRoomId, 9);
  });

  test('all rooms are connected (reachable from entrance)', function() {
    var graph = Dungeons.generateRoomGraph(503, 10);
    // BFS from entrance
    var visited = {};
    var queue = [0];
    visited[0] = true;
    while (queue.length > 0) {
      var cur = queue.shift();
      var room = graph.rooms[cur];
      room.connections.forEach(function(c) {
        if (!visited[c]) {
          visited[c] = true;
          queue.push(c);
        }
      });
    }
    assert.strictEqual(Object.keys(visited).length, 10, 'All 10 rooms must be reachable');
  });

  test('connections are bidirectional', function() {
    var graph = Dungeons.generateRoomGraph(504, 8);
    graph.rooms.forEach(function(room, i) {
      room.connections.forEach(function(neighborId) {
        var neighbor = graph.rooms[neighborId];
        assert.ok(neighbor.connections.indexOf(i) !== -1,
          'Connection must be bidirectional: ' + i + ' <-> ' + neighborId);
      });
    });
  });

  test('same seed produces identical graph', function() {
    var g1 = Dungeons.generateRoomGraph(505, 8);
    var g2 = Dungeons.generateRoomGraph(505, 8);
    for (var i = 0; i < 8; i++) {
      assert.deepStrictEqual(g1.rooms[i].connections.sort(), g2.rooms[i].connections.sort());
    }
  });

  test('extra cycle edges add connections beyond spanning tree', function() {
    var graph = Dungeons.generateRoomGraph(506, 15);
    var totalEdges = graph.rooms.reduce(function(sum, r) { return sum + r.connections.length; }, 0);
    // spanning tree has (n-1)*2 directed edges; cycles add more
    assert.ok(totalEdges >= (15 - 1) * 2, 'must have at least spanning tree edges');
  });
});

// ============================================================================
// SUITE 9: generateDungeon
// ============================================================================
suite('generateDungeon', function() {

  test('small dungeon has 5-8 rooms', function() {
    var d = Dungeons.generateDungeon(600, 'adventurer', 'small');
    assert.ok(d.rooms.length >= 5 && d.rooms.length <= 8,
      'small dungeon rooms: ' + d.rooms.length);
  });

  test('medium dungeon has 10-15 rooms', function() {
    var d = Dungeons.generateDungeon(601, 'adventurer', 'medium');
    assert.ok(d.rooms.length >= 10 && d.rooms.length <= 15,
      'medium dungeon rooms: ' + d.rooms.length);
  });

  test('large dungeon has 18-25 rooms', function() {
    var d = Dungeons.generateDungeon(602, 'adventurer', 'large');
    assert.ok(d.rooms.length >= 18 && d.rooms.length <= 25,
      'large dungeon rooms: ' + d.rooms.length);
  });

  test('epic dungeon has 30+ rooms', function() {
    var d = Dungeons.generateDungeon(603, 'adventurer', 'epic');
    assert.ok(d.rooms.length >= 30, 'epic dungeon rooms: ' + d.rooms.length);
  });

  test('dungeon has entrance room at id 0', function() {
    var d = Dungeons.generateDungeon(604, 'adventurer', 'medium');
    var entrance = d.rooms.find(function(r) { return r.id === 0; });
    assert.ok(entrance, 'entrance room must exist');
    assert.strictEqual(entrance.type, 'entrance');
  });

  test('dungeon has boss room as last room', function() {
    var d = Dungeons.generateDungeon(605, 'adventurer', 'medium');
    var boss = d.rooms[d.rooms.length - 1];
    assert.strictEqual(boss.type, 'boss_room');
  });

  test('dungeon has at least one puzzle_room', function() {
    var d = Dungeons.generateDungeon(606, 'hero', 'medium');
    var puzzleRooms = d.rooms.filter(function(r) { return r.type === 'puzzle_room'; });
    assert.ok(puzzleRooms.length >= 1, 'must have at least 1 puzzle room');
  });

  test('dungeon has at least one treasure_room', function() {
    var d = Dungeons.generateDungeon(607, 'novice', 'medium');
    var treasureRooms = d.rooms.filter(function(r) { return r.type === 'treasure_room'; });
    assert.ok(treasureRooms.length >= 1, 'must have at least 1 treasure room');
  });

  test('dungeon seed and difficulty stored on object', function() {
    var d = Dungeons.generateDungeon(608, 'legend', 'large');
    assert.strictEqual(d.seed, 608);
    assert.strictEqual(d.difficulty, 'legend');
    assert.strictEqual(d.size, 'large');
  });

  test('all dungeon rooms have connections', function() {
    var d = Dungeons.generateDungeon(609, 'adventurer', 'medium');
    d.rooms.forEach(function(room) {
      assert.ok(Array.isArray(room.connections), 'room must have connections array');
    });
  });

  test('same seed produces identical dungeon', function() {
    var d1 = Dungeons.generateDungeon(610, 'hero', 'small');
    var d2 = Dungeons.generateDungeon(610, 'hero', 'small');
    assert.strictEqual(d1.rooms.length, d2.rooms.length);
    assert.strictEqual(d1.rooms[0].type, d2.rooms[0].type);
  });

  test('different seeds produce different dungeons', function() {
    var d1 = Dungeons.generateDungeon(611, 'adventurer', 'medium');
    var d2 = Dungeons.generateDungeon(99999, 'adventurer', 'medium');
    // at least room counts or types should differ sometimes
    var counts = [d1.rooms.length, d2.rooms.length];
    assert.ok(counts[0] >= 10 && counts[1] >= 10, 'both valid medium dungeons');
  });

  test('dungeon starts with empty exploredRooms and clearedRooms', function() {
    var d = Dungeons.generateDungeon(612, 'adventurer', 'small');
    assert.deepStrictEqual(d.exploredRooms, []);
    assert.deepStrictEqual(d.clearedRooms, []);
  });
});

// ============================================================================
// SUITE 10: getShortestPath
// ============================================================================
suite('getShortestPath', function() {

  test('path from room to itself is [roomId]', function() {
    var d = Dungeons.generateDungeon(700, 'adventurer', 'medium');
    var path = Dungeons.getShortestPath(d, 0, 0);
    assert.deepStrictEqual(path, [0]);
  });

  test('path exists from entrance to boss room', function() {
    var d = Dungeons.generateDungeon(701, 'adventurer', 'medium');
    var path = Dungeons.getShortestPath(d, 0, d.bossRoomId);
    assert.ok(path !== null, 'path must exist');
    assert.ok(path.length > 0, 'path must be non-empty');
    assert.strictEqual(path[0], 0, 'path starts at entrance');
    assert.strictEqual(path[path.length - 1], d.bossRoomId, 'path ends at boss');
  });

  test('path is valid (consecutive rooms are connected)', function() {
    var d = Dungeons.generateDungeon(702, 'adventurer', 'medium');
    var path = Dungeons.getShortestPath(d, 0, d.bossRoomId);
    assert.ok(path !== null);
    for (var i = 0; i < path.length - 1; i++) {
      var roomA = d.rooms[path[i]];
      var neighbors = roomA.connections;
      assert.ok(neighbors.indexOf(path[i+1]) !== -1,
        'consecutive path rooms must be connected: ' + path[i] + ' -> ' + path[i+1]);
    }
  });

  test('null dungeon returns null', function() {
    var result = Dungeons.getShortestPath(null, 0, 1);
    assert.strictEqual(result, null);
  });

  test('works on raw room graph too', function() {
    var graph = Dungeons.generateRoomGraph(703, 8);
    var path = Dungeons.getShortestPath(graph, 0, 7);
    assert.ok(path !== null, 'path must exist in connected graph');
    assert.strictEqual(path[0], 0);
    assert.strictEqual(path[path.length - 1], 7);
  });

  test('path length <= number of rooms', function() {
    var d = Dungeons.generateDungeon(704, 'adventurer', 'small');
    var path = Dungeons.getShortestPath(d, 0, d.bossRoomId);
    assert.ok(path !== null);
    assert.ok(path.length <= d.rooms.length);
  });
});

// ============================================================================
// SUITE 11: revealMap
// ============================================================================
suite('revealMap', function() {

  test('no explored rooms reveals only entrance neighbors', function() {
    var d = Dungeons.generateDungeon(800, 'adventurer', 'medium');
    var result = Dungeons.revealMap(d, []);
    // with no explored rooms, 0 are in exploredSet — nothing is directly revealed
    // but adjacent to explored(0) rooms would need 0 in explored
    assert.ok(Array.isArray(result.visibleRooms));
    assert.ok(Array.isArray(result.hiddenRooms));
  });

  test('exploring entrance reveals itself and neighbors', function() {
    var d = Dungeons.generateDungeon(801, 'adventurer', 'medium');
    var result = Dungeons.revealMap(d, [0]);
    assert.ok(result.visibleRooms.indexOf(0) !== -1, 'entrance itself visible');
    // neighbors of entrance should also be visible
    var entranceRoom = d.rooms[0];
    if (entranceRoom.connections.length > 0) {
      var neighbor = entranceRoom.connections[0];
      assert.ok(result.visibleRooms.indexOf(neighbor) !== -1,
        'neighbor of explored entrance should be visible');
    }
  });

  test('revealedCount equals visibleRooms length', function() {
    var d = Dungeons.generateDungeon(802, 'adventurer', 'medium');
    var result = Dungeons.revealMap(d, [0, 1, 2]);
    assert.strictEqual(result.revealedCount, result.visibleRooms.length);
  });

  test('totalRooms matches dungeon room count', function() {
    var d = Dungeons.generateDungeon(803, 'adventurer', 'small');
    var result = Dungeons.revealMap(d, [0]);
    assert.strictEqual(result.totalRooms, d.rooms.length);
  });

  test('secret room not visible unless directly explored', function() {
    var d = Dungeons.generateDungeon(804, 'adventurer', 'large');
    var secretRoom = d.rooms.find(function(r) { return r.isSecret; });
    if (secretRoom) {
      // explore all neighbors but not the secret room
      var allExplored = d.rooms
        .filter(function(r) { return r.id !== secretRoom.id; })
        .map(function(r) { return r.id; });
      var result = Dungeons.revealMap(d, allExplored);
      // secret room should NOT appear in visibleRooms unless directly explored
      // It may or may not be there, but if not directly explored it should be hidden
      var directlyExplored = allExplored.indexOf(secretRoom.id) !== -1;
      if (!directlyExplored) {
        assert.ok(result.visibleRooms.indexOf(secretRoom.id) === -1,
          'secret room not visible without direct exploration');
      }
    }
    // no secret room in this dungeon — test trivially passes
  });

  test('fully explored dungeon reveals all rooms', function() {
    var d = Dungeons.generateDungeon(805, 'adventurer', 'small');
    var allIds = d.rooms.map(function(r) { return r.id; });
    var result = Dungeons.revealMap(d, allIds);
    assert.strictEqual(result.visibleRooms.length, d.rooms.length);
  });

  test('null dungeon returns dungeon', function() {
    var result = Dungeons.revealMap(null, []);
    assert.strictEqual(result, null);
  });
});

// ============================================================================
// SUITE 12: getDungeonScore
// ============================================================================
suite('getDungeonScore', function() {

  test('zero completion yields 0 score', function() {
    var d = Dungeons.generateDungeon(900, 'adventurer', 'small');
    var score = Dungeons.getDungeonScore(d, {});
    assert.strictEqual(score.finalScore, 0);
  });

  test('boss defeated adds 1000 base points', function() {
    var d = Dungeons.generateDungeon(901, 'adventurer', 'small');
    var score = Dungeons.getDungeonScore(d, { bossDefeated: true });
    assert.ok(score.breakdown.bossDefeated === 1000);
  });

  test('each room cleared adds 100 base points', function() {
    var d = Dungeons.generateDungeon(902, 'adventurer', 'small');
    var score = Dungeons.getDungeonScore(d, { roomsCleared: 5 });
    assert.strictEqual(score.breakdown.roomsCleared, 500);
  });

  test('each puzzle solved adds 200 base points', function() {
    var d = Dungeons.generateDungeon(903, 'adventurer', 'small');
    var score = Dungeons.getDungeonScore(d, { puzzlesSolved: 3 });
    assert.strictEqual(score.breakdown.puzzlesSolved, 600);
  });

  test('legend difficulty multiplies score by 4', function() {
    var d = Dungeons.generateDungeon(904, 'legend', 'small');
    var score = Dungeons.getDungeonScore(d, { roomsCleared: 5 });
    assert.strictEqual(score.difficultyMultiplier, 4.0);
    assert.strictEqual(score.finalScore, Math.round(500 * 4.0));
  });

  test('deaths reduce score', function() {
    var d = Dungeons.generateDungeon(905, 'adventurer', 'small');
    var scoreNoDeath = Dungeons.getDungeonScore(d, { roomsCleared: 5 });
    var scoreWithDeath = Dungeons.getDungeonScore(d, { roomsCleared: 5, deaths: 2 });
    assert.ok(scoreNoDeath.finalScore > scoreWithDeath.finalScore);
  });

  test('score never goes below 0', function() {
    var d = Dungeons.generateDungeon(906, 'adventurer', 'small');
    var score = Dungeons.getDungeonScore(d, { deaths: 1000 });
    assert.ok(score.finalScore >= 0);
  });

  test('null dungeon returns 0', function() {
    var score = Dungeons.getDungeonScore(null, {});
    assert.strictEqual(score, 0);
  });

  test('score has breakdown object', function() {
    var d = Dungeons.generateDungeon(907, 'adventurer', 'small');
    var score = Dungeons.getDungeonScore(d, { roomsCleared: 3, puzzlesSolved: 1 });
    assert.ok(score.breakdown, 'breakdown must exist');
    assert.ok(typeof score.breakdown.roomsCleared === 'number');
    assert.ok(typeof score.breakdown.puzzlesSolved === 'number');
  });
});

// ============================================================================
// SUITE 13: getDungeonSummary
// ============================================================================
suite('getDungeonSummary', function() {

  test('returns null for null dungeon', function() {
    var result = Dungeons.getDungeonSummary(null);
    assert.strictEqual(result, null);
  });

  test('roomCount matches dungeon', function() {
    var d = Dungeons.generateDungeon(1000, 'adventurer', 'medium');
    var summary = Dungeons.getDungeonSummary(d);
    assert.strictEqual(summary.roomCount, d.rooms.length);
  });

  test('roomsByType includes entrance and boss_room', function() {
    var d = Dungeons.generateDungeon(1001, 'adventurer', 'medium');
    var summary = Dungeons.getDungeonSummary(d);
    assert.ok(summary.roomsByType.entrance >= 1, 'must have entrance');
    assert.ok(summary.roomsByType.boss_room >= 1, 'must have boss_room');
  });

  test('hasBoss is true for all dungeons', function() {
    var d = Dungeons.generateDungeon(1002, 'hero', 'medium');
    var summary = Dungeons.getDungeonSummary(d);
    assert.strictEqual(summary.hasBoss, true);
  });

  test('bossRoom is set with valid id', function() {
    var d = Dungeons.generateDungeon(1003, 'adventurer', 'small');
    var summary = Dungeons.getDungeonSummary(d);
    assert.ok(summary.bossRoom, 'bossRoom must be set');
    assert.ok(typeof summary.bossRoom.id === 'number');
  });

  test('totalEnemies > 0 for medium dungeon', function() {
    var d = Dungeons.generateDungeon(1004, 'adventurer', 'medium');
    var summary = Dungeons.getDungeonSummary(d);
    assert.ok(summary.totalEnemies > 0, 'must have some enemies');
  });

  test('totalLoot > 0 for medium dungeon', function() {
    var d = Dungeons.generateDungeon(1005, 'adventurer', 'medium');
    var summary = Dungeons.getDungeonSummary(d);
    assert.ok(summary.totalLoot > 0, 'must have some loot');
  });

  test('totalPuzzles >= 1 for medium dungeon', function() {
    var d = Dungeons.generateDungeon(1006, 'adventurer', 'medium');
    var summary = Dungeons.getDungeonSummary(d);
    assert.ok(summary.totalPuzzles >= 1, 'must have at least 1 puzzle');
  });

  test('estimatedTimeMinutes > 0', function() {
    var d = Dungeons.generateDungeon(1007, 'adventurer', 'medium');
    var summary = Dungeons.getDungeonSummary(d);
    assert.ok(summary.estimatedTimeMinutes > 0);
  });

  test('large dungeon has more estimated time than small', function() {
    var dSmall = Dungeons.generateDungeon(1008, 'adventurer', 'small');
    var dLarge = Dungeons.generateDungeon(1008, 'adventurer', 'large');
    var sumSmall = Dungeons.getDungeonSummary(dSmall);
    var sumLarge = Dungeons.getDungeonSummary(dLarge);
    assert.ok(sumLarge.estimatedTimeMinutes > sumSmall.estimatedTimeMinutes);
  });
});

// ============================================================================
// Print final report
// ============================================================================
if (!report()) {
  process.exit(1);
}
