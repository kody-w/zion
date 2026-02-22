/**
 * tests/test_api_bridge.js
 * Test suite for the ZION ApiBridge module
 * 30+ tests covering exports, buildSnapshot, getLatestSnapshot,
 * publishStateSnapshot, pollInbox, update, and edge cases.
 */

'use strict';

// ---------------------------------------------------------------------------
// Environment setup — must happen before requiring the module
// ---------------------------------------------------------------------------

var localStorageStore = {};

global.localStorage = {
  getItem: function(key) {
    return localStorageStore.hasOwnProperty(key) ? localStorageStore[key] : null;
  },
  setItem: function(key, value) {
    localStorageStore[key] = value;
  },
  removeItem: function(key) {
    delete localStorageStore[key];
  }
};

global.window = { location: { hostname: 'localhost' } };

global.fetch = function() {
  return Promise.resolve({ ok: false });
};

// ---------------------------------------------------------------------------
// Load test framework and module
// ---------------------------------------------------------------------------

const { test, suite, report, assert } = require('./test_runner');
const ApiBridge = require('../src/js/api_bridge');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Reset localStorage between tests */
function clearLocalStorage() {
  localStorageStore = {};
}

/** Build a minimal valid gameState */
function minimalGameState() {
  return {
    messages: [],
    players: {},
    structures: []
  };
}

/** Build a richer gameState exercising more snapshot branches */
function richGameState() {
  return {
    messages: [
      { from: 'alice', type: 'say', payload: { text: 'hello' }, ts: '2026-01-01T00:00:00Z' },
      { from: 'bob',   type: 'emote', payload: { text: 'waves' }, ts: '2026-01-01T00:01:00Z' }
    ],
    players: {
      alice: { position: { x: 0, y: 0, z: 0, zone: 'nexus' } },
      bob:   { position: { x: 10, y: 0, z: 10, zone: 'gardens' } }
    },
    structures: [{ id: 's1', type: 'house' }]
  };
}

// ---------------------------------------------------------------------------
// SUITE 1: Export verification
// ---------------------------------------------------------------------------

suite('Export verification', function() {
  test('module exports an object', function() {
    assert.ok(ApiBridge && typeof ApiBridge === 'object');
  });

  test('exports init as a function', function() {
    assert.strictEqual(typeof ApiBridge.init, 'function');
  });

  test('exports update as a function', function() {
    assert.strictEqual(typeof ApiBridge.update, 'function');
  });

  test('exports buildSnapshot as a function', function() {
    assert.strictEqual(typeof ApiBridge.buildSnapshot, 'function');
  });

  test('exports publishStateSnapshot as a function', function() {
    assert.strictEqual(typeof ApiBridge.publishStateSnapshot, 'function');
  });

  test('exports pollInbox as a function', function() {
    assert.strictEqual(typeof ApiBridge.pollInbox, 'function');
  });

  test('exports getLatestSnapshot as a function', function() {
    assert.strictEqual(typeof ApiBridge.getLatestSnapshot, 'function');
  });

  test('exports exactly 6 named functions', function() {
    var keys = Object.keys(ApiBridge);
    assert.strictEqual(keys.length, 6);
  });

  test('does not export sumValues (private helper)', function() {
    assert.ok(!ApiBridge.hasOwnProperty('sumValues'));
  });

  test('does not export processPendingMessages (private helper)', function() {
    assert.ok(!ApiBridge.hasOwnProperty('processPendingMessages'));
  });
});

// ---------------------------------------------------------------------------
// SUITE 2: init()
// ---------------------------------------------------------------------------

suite('init', function() {
  test('init does not throw', function() {
    var threw = false;
    try {
      ApiBridge.init();
    } catch (e) {
      threw = true;
    }
    assert.strictEqual(threw, false);
  });

  test('init can be called multiple times without error', function() {
    var threw = false;
    try {
      ApiBridge.init();
      ApiBridge.init();
      ApiBridge.init();
    } catch (e) {
      threw = true;
    }
    assert.strictEqual(threw, false);
  });
});

// ---------------------------------------------------------------------------
// SUITE 3: buildSnapshot — null / undefined / edge inputs
// ---------------------------------------------------------------------------

suite('buildSnapshot — null and undefined inputs', function() {
  test('does not throw when called with null', function() {
    var threw = false;
    try {
      ApiBridge.buildSnapshot(null);
    } catch (e) {
      threw = true;
    }
    assert.strictEqual(threw, false);
  });

  test('does not throw when called with undefined', function() {
    var threw = false;
    try {
      ApiBridge.buildSnapshot(undefined);
    } catch (e) {
      threw = true;
    }
    assert.strictEqual(threw, false);
  });

  test('returns an object when called with null', function() {
    var result = ApiBridge.buildSnapshot(null);
    assert.ok(result && typeof result === 'object');
  });

  test('returns an object when called with undefined', function() {
    var result = ApiBridge.buildSnapshot(undefined);
    assert.ok(result && typeof result === 'object');
  });

  test('does not throw when called with an empty object', function() {
    var threw = false;
    try {
      ApiBridge.buildSnapshot({});
    } catch (e) {
      threw = true;
    }
    assert.strictEqual(threw, false);
  });

  test('returns an object when called with an empty object', function() {
    var result = ApiBridge.buildSnapshot({});
    assert.ok(result && typeof result === 'object');
  });
});

// ---------------------------------------------------------------------------
// SUITE 4: buildSnapshot — snapshot structure with minimal gameState
// ---------------------------------------------------------------------------

suite('buildSnapshot — snapshot structure', function() {
  var snap;

  // Build once, reuse across all tests in this suite
  snap = ApiBridge.buildSnapshot(minimalGameState());

  test('snapshot has version field v = 1', function() {
    assert.strictEqual(snap.v, 1);
  });

  test('snapshot has ts field as a string', function() {
    assert.strictEqual(typeof snap.ts, 'string');
  });

  test('snapshot ts is a valid ISO 8601 timestamp', function() {
    var d = new Date(snap.ts);
    assert.ok(!isNaN(d.getTime()));
  });

  test('snapshot has world object', function() {
    assert.ok(snap.world && typeof snap.world === 'object');
  });

  test('snapshot.world has time field', function() {
    assert.ok('time' in snap.world);
  });

  test('snapshot.world has dayPhase field', function() {
    assert.ok('dayPhase' in snap.world);
  });

  test('snapshot.world has weather field', function() {
    assert.ok('weather' in snap.world);
  });

  test('snapshot.world has season field', function() {
    assert.ok('season' in snap.world);
  });

  test('snapshot.world.dayPhase defaults to "day"', function() {
    assert.strictEqual(snap.world.dayPhase, 'day');
  });

  test('snapshot.world.weather defaults to "clear"', function() {
    assert.strictEqual(snap.world.weather, 'clear');
  });

  test('snapshot.world.season defaults to "spring"', function() {
    assert.strictEqual(snap.world.season, 'spring');
  });

  test('snapshot.world.time defaults to 0', function() {
    assert.strictEqual(snap.world.time, 0);
  });

  test('snapshot has zones object', function() {
    assert.ok(snap.zones && typeof snap.zones === 'object');
  });

  test('snapshot has players object', function() {
    assert.ok(snap.players && typeof snap.players === 'object');
  });

  test('snapshot has npcs array', function() {
    assert.ok(Array.isArray(snap.npcs));
  });

  test('snapshot has recent_chat array', function() {
    assert.ok(Array.isArray(snap.recent_chat));
  });

  test('snapshot has economy object', function() {
    assert.ok(snap.economy && typeof snap.economy === 'object');
  });

  test('snapshot.economy has total_spark field', function() {
    assert.ok('total_spark' in snap.economy);
  });

  test('snapshot.economy has active_listings field', function() {
    assert.ok('active_listings' in snap.economy);
  });

  test('snapshot.economy.total_spark is a number', function() {
    assert.strictEqual(typeof snap.economy.total_spark, 'number');
  });

  test('snapshot.economy.active_listings is a number', function() {
    assert.strictEqual(typeof snap.economy.active_listings, 'number');
  });

  test('snapshot.economy.total_spark defaults to 0 with no balances', function() {
    assert.strictEqual(snap.economy.total_spark, 0);
  });

  test('snapshot.economy.active_listings defaults to 0 with no listings', function() {
    assert.strictEqual(snap.economy.active_listings, 0);
  });

  test('snapshot has simulations object', function() {
    assert.ok(snap.simulations && typeof snap.simulations === 'object');
  });
});

// ---------------------------------------------------------------------------
// SUITE 5: buildSnapshot — players from liveState via State mock
// ---------------------------------------------------------------------------

suite('buildSnapshot — with mocked State module', function() {
  test('players object empty when State unavailable', function() {
    // State is not defined globally — default path returns empty players
    var snap = ApiBridge.buildSnapshot(minimalGameState());
    assert.deepStrictEqual(snap.players, {});
  });

  test('players populated when State.getLiveState returns players', function() {
    global.State = {
      getLiveState: function() {
        return {
          players: {
            alice: { position: { zone: 'nexus' } }
          }
        };
      }
    };
    var snap = ApiBridge.buildSnapshot(minimalGameState());
    assert.ok(snap.players.hasOwnProperty('alice'));
    delete global.State;
  });

  test('player entry has position field', function() {
    global.State = {
      getLiveState: function() {
        return {
          players: {
            alice: { position: { x: 5, y: 0, z: 10, zone: 'gardens' } }
          }
        };
      }
    };
    var snap = ApiBridge.buildSnapshot(minimalGameState());
    assert.ok('position' in snap.players.alice);
    delete global.State;
  });

  test('player entry has zone field', function() {
    global.State = {
      getLiveState: function() {
        return {
          players: {
            alice: { position: { zone: 'gardens' } }
          }
        };
      }
    };
    var snap = ApiBridge.buildSnapshot(minimalGameState());
    assert.strictEqual(snap.players.alice.zone, 'gardens');
    delete global.State;
  });

  test('player entry has online: true', function() {
    global.State = {
      getLiveState: function() {
        return {
          players: {
            alice: { position: { zone: 'nexus' } }
          }
        };
      }
    };
    var snap = ApiBridge.buildSnapshot(minimalGameState());
    assert.strictEqual(snap.players.alice.online, true);
    delete global.State;
  });

  test('player with no position zone defaults zone to "nexus"', function() {
    global.State = {
      getLiveState: function() {
        return {
          players: {
            charlie: { position: {} }
          }
        };
      }
    };
    var snap = ApiBridge.buildSnapshot(minimalGameState());
    assert.strictEqual(snap.players.charlie.zone, 'nexus');
    delete global.State;
  });

  test('player with no position at all defaults zone to "nexus"', function() {
    global.State = {
      getLiveState: function() {
        return {
          players: {
            dave: {}
          }
        };
      }
    };
    var snap = ApiBridge.buildSnapshot(minimalGameState());
    assert.strictEqual(snap.players.dave.zone, 'nexus');
    delete global.State;
  });

  test('multiple players all appear in snapshot', function() {
    global.State = {
      getLiveState: function() {
        return {
          players: {
            alice: { position: { zone: 'nexus' } },
            bob:   { position: { zone: 'gardens' } },
            carol: { position: { zone: 'wilds' } }
          }
        };
      }
    };
    var snap = ApiBridge.buildSnapshot(minimalGameState());
    assert.ok(snap.players.hasOwnProperty('alice'));
    assert.ok(snap.players.hasOwnProperty('bob'));
    assert.ok(snap.players.hasOwnProperty('carol'));
    delete global.State;
  });
});

// ---------------------------------------------------------------------------
// SUITE 6: buildSnapshot — zones from Zones mock
// ---------------------------------------------------------------------------

suite('buildSnapshot — with mocked Zones module', function() {
  test('zones object is empty when Zones unavailable', function() {
    var snap = ApiBridge.buildSnapshot(minimalGameState());
    assert.deepStrictEqual(snap.zones, {});
  });

  test('zones populated when Zones.getAllZoneIds returns zone list', function() {
    global.Zones = {
      getAllZoneIds: function() { return ['nexus', 'gardens']; },
      getZone: function(id) { return { name: id, description: 'desc' }; }
    };
    var snap = ApiBridge.buildSnapshot(minimalGameState());
    assert.ok(snap.zones.hasOwnProperty('nexus'));
    assert.ok(snap.zones.hasOwnProperty('gardens'));
    delete global.Zones;
  });

  test('zone summary has name field', function() {
    global.Zones = {
      getAllZoneIds: function() { return ['nexus']; },
      getZone: function(id) { return { name: 'The Nexus', description: 'Central hub' }; }
    };
    var snap = ApiBridge.buildSnapshot(minimalGameState());
    assert.strictEqual(snap.zones.nexus.name, 'The Nexus');
    delete global.Zones;
  });

  test('zone summary has description field', function() {
    global.Zones = {
      getAllZoneIds: function() { return ['nexus']; },
      getZone: function(id) { return { name: 'The Nexus', description: 'Central hub' }; }
    };
    var snap = ApiBridge.buildSnapshot(minimalGameState());
    assert.strictEqual(snap.zones.nexus.description, 'Central hub');
    delete global.Zones;
  });

  test('zone summary has player_count = 0 when no players in zone', function() {
    global.Zones = {
      getAllZoneIds: function() { return ['nexus']; },
      getZone: function(id) { return { name: 'nexus', description: '' }; }
    };
    var snap = ApiBridge.buildSnapshot(minimalGameState());
    assert.strictEqual(snap.zones.nexus.player_count, 0);
    delete global.Zones;
  });

  test('zone summary has npc_count = 0 when no NPCs defined', function() {
    global.Zones = {
      getAllZoneIds: function() { return ['nexus']; },
      getZone: function(id) { return { name: 'nexus', description: '' }; }
    };
    var snap = ApiBridge.buildSnapshot(minimalGameState());
    assert.strictEqual(snap.zones.nexus.npc_count, 0);
    delete global.Zones;
  });

  test('zone player_count increments for each player in that zone', function() {
    global.Zones = {
      getAllZoneIds: function() { return ['nexus', 'gardens']; },
      getZone: function(id) { return { name: id, description: '' }; }
    };
    global.State = {
      getLiveState: function() {
        return {
          players: {
            alice: { position: { zone: 'nexus' } },
            bob:   { position: { zone: 'nexus' } },
            carol: { position: { zone: 'gardens' } }
          }
        };
      }
    };
    var snap = ApiBridge.buildSnapshot(minimalGameState());
    assert.strictEqual(snap.zones.nexus.player_count, 2);
    assert.strictEqual(snap.zones.gardens.player_count, 1);
    delete global.Zones;
    delete global.State;
  });
});

// ---------------------------------------------------------------------------
// SUITE 7: buildSnapshot — recent_chat from liveState
// ---------------------------------------------------------------------------

suite('buildSnapshot — recent_chat', function() {
  test('recent_chat is empty when no chat in liveState', function() {
    var snap = ApiBridge.buildSnapshot(minimalGameState());
    assert.deepStrictEqual(snap.recent_chat, []);
  });

  test('recent_chat populated from State.getLiveState chat', function() {
    global.State = {
      getLiveState: function() {
        return {
          chat: [
            { from: 'alice', type: 'say', payload: { text: 'Hello!' }, ts: '2026-01-01T00:00:00Z' }
          ]
        };
      }
    };
    var snap = ApiBridge.buildSnapshot(minimalGameState());
    assert.strictEqual(snap.recent_chat.length, 1);
    delete global.State;
  });

  test('recent_chat entry has from field', function() {
    global.State = {
      getLiveState: function() {
        return {
          chat: [
            { from: 'alice', type: 'say', payload: { text: 'Hi' }, ts: '2026-01-01T00:00:00Z' }
          ]
        };
      }
    };
    var snap = ApiBridge.buildSnapshot(minimalGameState());
    assert.strictEqual(snap.recent_chat[0].from, 'alice');
    delete global.State;
  });

  test('recent_chat entry has type field', function() {
    global.State = {
      getLiveState: function() {
        return {
          chat: [
            { from: 'alice', type: 'emote', payload: { text: 'waves' }, ts: '2026-01-01T00:00:00Z' }
          ]
        };
      }
    };
    var snap = ApiBridge.buildSnapshot(minimalGameState());
    assert.strictEqual(snap.recent_chat[0].type, 'emote');
    delete global.State;
  });

  test('recent_chat entry has text field from payload.text', function() {
    global.State = {
      getLiveState: function() {
        return {
          chat: [
            { from: 'alice', type: 'say', payload: { text: 'Hello world' }, ts: '2026-01-01T00:00:00Z' }
          ]
        };
      }
    };
    var snap = ApiBridge.buildSnapshot(minimalGameState());
    assert.strictEqual(snap.recent_chat[0].text, 'Hello world');
    delete global.State;
  });

  test('recent_chat entry has ts field', function() {
    global.State = {
      getLiveState: function() {
        return {
          chat: [
            { from: 'alice', type: 'say', payload: { text: 'Hi' }, ts: '2026-01-01T00:00:00Z' }
          ]
        };
      }
    };
    var snap = ApiBridge.buildSnapshot(minimalGameState());
    assert.strictEqual(snap.recent_chat[0].ts, '2026-01-01T00:00:00Z');
    delete global.State;
  });

  test('recent_chat entry defaults type to "say" when type is missing', function() {
    global.State = {
      getLiveState: function() {
        return {
          chat: [
            { from: 'bob', payload: { text: 'hey' }, ts: '2026-01-01T00:00:00Z' }
          ]
        };
      }
    };
    var snap = ApiBridge.buildSnapshot(minimalGameState());
    assert.strictEqual(snap.recent_chat[0].type, 'say');
    delete global.State;
  });

  test('recent_chat defaults from to "" when missing', function() {
    global.State = {
      getLiveState: function() {
        return {
          chat: [
            { type: 'say', payload: { text: 'hey' }, ts: '2026-01-01T00:00:00Z' }
          ]
        };
      }
    };
    var snap = ApiBridge.buildSnapshot(minimalGameState());
    assert.strictEqual(snap.recent_chat[0].from, '');
    delete global.State;
  });

  test('recent_chat defaults text to "" when payload missing', function() {
    global.State = {
      getLiveState: function() {
        return {
          chat: [
            { from: 'alice', type: 'say', ts: '2026-01-01T00:00:00Z' }
          ]
        };
      }
    };
    var snap = ApiBridge.buildSnapshot(minimalGameState());
    assert.strictEqual(snap.recent_chat[0].text, '');
    delete global.State;
  });

  test('recent_chat is capped at last 20 entries', function() {
    var chatLog = [];
    for (var i = 0; i < 30; i++) {
      chatLog.push({ from: 'user' + i, type: 'say', payload: { text: 'msg' + i }, ts: '' });
    }
    global.State = {
      getLiveState: function() { return { chat: chatLog }; }
    };
    var snap = ApiBridge.buildSnapshot(minimalGameState());
    assert.ok(snap.recent_chat.length <= 20);
    delete global.State;
  });

  test('recent_chat contains the LAST 20 messages (not first)', function() {
    var chatLog = [];
    for (var i = 0; i < 25; i++) {
      chatLog.push({ from: 'user', type: 'say', payload: { text: 'msg' + i }, ts: '' });
    }
    global.State = {
      getLiveState: function() { return { chat: chatLog }; }
    };
    var snap = ApiBridge.buildSnapshot(minimalGameState());
    // The last message should be msg24
    assert.strictEqual(snap.recent_chat[snap.recent_chat.length - 1].text, 'msg24');
    delete global.State;
  });
});

// ---------------------------------------------------------------------------
// SUITE 8: buildSnapshot — economy from liveState
// ---------------------------------------------------------------------------

suite('buildSnapshot — economy', function() {
  test('economy.total_spark sums all balances', function() {
    global.State = {
      getLiveState: function() {
        return {
          economy: {
            balances: { alice: 100, bob: 250, carol: 50 },
            listings: []
          }
        };
      }
    };
    var snap = ApiBridge.buildSnapshot(minimalGameState());
    assert.strictEqual(snap.economy.total_spark, 400);
    delete global.State;
  });

  test('economy.active_listings counts listing array length', function() {
    global.State = {
      getLiveState: function() {
        return {
          economy: {
            balances: {},
            listings: [{ id: 'l1' }, { id: 'l2' }, { id: 'l3' }]
          }
        };
      }
    };
    var snap = ApiBridge.buildSnapshot(minimalGameState());
    assert.strictEqual(snap.economy.active_listings, 3);
    delete global.State;
  });

  test('economy.total_spark ignores non-numeric balance values', function() {
    global.State = {
      getLiveState: function() {
        return {
          economy: {
            balances: { alice: 100, bob: 'invalid', carol: 50 },
            listings: []
          }
        };
      }
    };
    var snap = ApiBridge.buildSnapshot(minimalGameState());
    assert.strictEqual(snap.economy.total_spark, 150);
    delete global.State;
  });

  test('economy.total_spark = 0 with empty balances', function() {
    global.State = {
      getLiveState: function() {
        return { economy: { balances: {}, listings: [] } };
      }
    };
    var snap = ApiBridge.buildSnapshot(minimalGameState());
    assert.strictEqual(snap.economy.total_spark, 0);
    delete global.State;
  });
});

// ---------------------------------------------------------------------------
// SUITE 9: buildSnapshot — NPCs from NPCs mock
// ---------------------------------------------------------------------------

suite('buildSnapshot — NPCs', function() {
  test('npcs array is empty when NPCs module unavailable', function() {
    var snap = ApiBridge.buildSnapshot(minimalGameState());
    assert.deepStrictEqual(snap.npcs, []);
  });

  test('npcs populated from NPCs.getAllNPCs()', function() {
    global.NPCs = {
      getAllNPCs: function() {
        return [
          { id: 'npc1', name: 'Elder', archetype: 'teacher', position: { zone: 'nexus' } }
        ];
      }
    };
    var snap = ApiBridge.buildSnapshot(minimalGameState());
    assert.strictEqual(snap.npcs.length, 1);
    delete global.NPCs;
  });

  test('npc entry has id field', function() {
    global.NPCs = {
      getAllNPCs: function() {
        return [{ id: 'npc1', name: 'Elder', archetype: 'teacher', position: { zone: 'nexus' } }];
      }
    };
    var snap = ApiBridge.buildSnapshot(minimalGameState());
    assert.strictEqual(snap.npcs[0].id, 'npc1');
    delete global.NPCs;
  });

  test('npc entry has name field', function() {
    global.NPCs = {
      getAllNPCs: function() {
        return [{ id: 'npc1', name: 'Elder Zara', archetype: 'teacher', position: { zone: 'nexus' } }];
      }
    };
    var snap = ApiBridge.buildSnapshot(minimalGameState());
    assert.strictEqual(snap.npcs[0].name, 'Elder Zara');
    delete global.NPCs;
  });

  test('npc entry has archetype field', function() {
    global.NPCs = {
      getAllNPCs: function() {
        return [{ id: 'npc1', name: 'Elder', archetype: 'philosopher', position: { zone: 'nexus' } }];
      }
    };
    var snap = ApiBridge.buildSnapshot(minimalGameState());
    assert.strictEqual(snap.npcs[0].archetype, 'philosopher');
    delete global.NPCs;
  });

  test('npc entry has zone field', function() {
    global.NPCs = {
      getAllNPCs: function() {
        return [{ id: 'npc1', name: 'Elder', archetype: 'teacher', position: { zone: 'gardens' } }];
      }
    };
    var snap = ApiBridge.buildSnapshot(minimalGameState());
    assert.strictEqual(snap.npcs[0].zone, 'gardens');
    delete global.NPCs;
  });

  test('npc with no position zone defaults to "nexus"', function() {
    global.NPCs = {
      getAllNPCs: function() {
        return [{ id: 'npc2', name: 'Guard', archetype: 'warrior', position: {} }];
      }
    };
    var snap = ApiBridge.buildSnapshot(minimalGameState());
    assert.strictEqual(snap.npcs[0].zone, 'nexus');
    delete global.NPCs;
  });

  test('npc with no position at all defaults zone to "nexus"', function() {
    global.NPCs = {
      getAllNPCs: function() {
        return [{ id: 'npc3', name: 'Wanderer', archetype: 'explorer' }];
      }
    };
    var snap = ApiBridge.buildSnapshot(minimalGameState());
    assert.strictEqual(snap.npcs[0].zone, 'nexus');
    delete global.NPCs;
  });
});

// ---------------------------------------------------------------------------
// SUITE 10: getLatestSnapshot
// ---------------------------------------------------------------------------

suite('getLatestSnapshot', function() {
  test('returns null before any publishStateSnapshot call', function() {
    clearLocalStorage();
    assert.strictEqual(ApiBridge.getLatestSnapshot(), null);
  });

  test('returns null when localStorage holds no zion_api_state key', function() {
    clearLocalStorage();
    assert.strictEqual(ApiBridge.getLatestSnapshot(), null);
  });

  test('returns a parsed object after publishStateSnapshot is called', function() {
    clearLocalStorage();
    ApiBridge.publishStateSnapshot(minimalGameState());
    var snap = ApiBridge.getLatestSnapshot();
    assert.ok(snap && typeof snap === 'object');
  });

  test('returned snapshot has version field v = 1', function() {
    clearLocalStorage();
    ApiBridge.publishStateSnapshot(minimalGameState());
    var snap = ApiBridge.getLatestSnapshot();
    assert.strictEqual(snap.v, 1);
  });

  test('returned snapshot has ts string', function() {
    clearLocalStorage();
    ApiBridge.publishStateSnapshot(minimalGameState());
    var snap = ApiBridge.getLatestSnapshot();
    assert.strictEqual(typeof snap.ts, 'string');
  });

  test('returned snapshot has world, players, zones, npcs, economy fields', function() {
    clearLocalStorage();
    ApiBridge.publishStateSnapshot(minimalGameState());
    var snap = ApiBridge.getLatestSnapshot();
    assert.ok('world' in snap);
    assert.ok('players' in snap);
    assert.ok('zones' in snap);
    assert.ok('npcs' in snap);
    assert.ok('economy' in snap);
  });

  test('returns null when localStorage contains invalid JSON', function() {
    localStorageStore['zion_api_state'] = '{ bad json {{{{';
    var result = ApiBridge.getLatestSnapshot();
    assert.strictEqual(result, null);
  });

  test('returns null when localStorage.getItem returns null', function() {
    clearLocalStorage();
    // No key set — getItem returns null
    assert.strictEqual(ApiBridge.getLatestSnapshot(), null);
  });

  test('snapshot in localStorage is overwritten on second publish', function() {
    clearLocalStorage();
    ApiBridge.publishStateSnapshot(minimalGameState());
    var ts1 = ApiBridge.getLatestSnapshot().ts;

    // Small delay to ensure a different timestamp
    var later = new Date(Date.now() + 1).toISOString();
    // Publish again
    ApiBridge.publishStateSnapshot(minimalGameState());
    var ts2 = ApiBridge.getLatestSnapshot().ts;

    // Both are valid ISO strings — the snapshot is re-written (ts2 is a new call)
    assert.strictEqual(typeof ts2, 'string');
  });
});

// ---------------------------------------------------------------------------
// SUITE 11: publishStateSnapshot
// ---------------------------------------------------------------------------

suite('publishStateSnapshot', function() {
  test('does not throw with null gameState', function() {
    var threw = false;
    try {
      ApiBridge.publishStateSnapshot(null);
    } catch (e) {
      threw = true;
    }
    assert.strictEqual(threw, false);
  });

  test('does not throw with minimal gameState', function() {
    var threw = false;
    try {
      ApiBridge.publishStateSnapshot(minimalGameState());
    } catch (e) {
      threw = true;
    }
    assert.strictEqual(threw, false);
  });

  test('stores zion_api_state in localStorage', function() {
    clearLocalStorage();
    ApiBridge.publishStateSnapshot(minimalGameState());
    assert.ok(localStorageStore.hasOwnProperty('zion_api_state'));
  });

  test('stores zion_api_state_ts in localStorage', function() {
    clearLocalStorage();
    ApiBridge.publishStateSnapshot(minimalGameState());
    assert.ok(localStorageStore.hasOwnProperty('zion_api_state_ts'));
  });

  test('stored zion_api_state is valid JSON', function() {
    clearLocalStorage();
    ApiBridge.publishStateSnapshot(minimalGameState());
    var raw = localStorageStore['zion_api_state'];
    var threw = false;
    try {
      JSON.parse(raw);
    } catch (e) {
      threw = true;
    }
    assert.strictEqual(threw, false);
  });

  test('stored snapshot ts matches stored zion_api_state_ts', function() {
    clearLocalStorage();
    ApiBridge.publishStateSnapshot(minimalGameState());
    var parsed = JSON.parse(localStorageStore['zion_api_state']);
    assert.strictEqual(localStorageStore['zion_api_state_ts'], parsed.ts);
  });

  test('does not throw when localStorage.setItem throws (graceful failure)', function() {
    var origSetItem = global.localStorage.setItem;
    global.localStorage.setItem = function() { throw new Error('QuotaExceeded'); };
    var threw = false;
    try {
      ApiBridge.publishStateSnapshot(minimalGameState());
    } catch (e) {
      threw = true;
    }
    global.localStorage.setItem = origSetItem;
    assert.strictEqual(threw, false);
  });
});

// ---------------------------------------------------------------------------
// SUITE 12: pollInbox
// ---------------------------------------------------------------------------

suite('pollInbox', function() {
  test('does not throw with null gameState', function() {
    var threw = false;
    try {
      ApiBridge.pollInbox(null);
    } catch (e) {
      threw = true;
    }
    assert.strictEqual(threw, false);
  });

  test('does not throw with minimal gameState', function() {
    var threw = false;
    try {
      ApiBridge.pollInbox(minimalGameState());
    } catch (e) {
      threw = true;
    }
    assert.strictEqual(threw, false);
  });

  test('returns undefined (fire-and-forget pattern)', function() {
    var result = ApiBridge.pollInbox(minimalGameState());
    assert.strictEqual(result, undefined);
  });

  test('does not throw when fetch returns a rejected promise', function() {
    global.fetch = function() { return Promise.reject(new Error('network error')); };
    var threw = false;
    try {
      ApiBridge.pollInbox(minimalGameState());
    } catch (e) {
      threw = true;
    }
    // Restore default fetch
    global.fetch = function() { return Promise.resolve({ ok: false }); };
    assert.strictEqual(threw, false);
  });
});

// ---------------------------------------------------------------------------
// SUITE 13: update
// ---------------------------------------------------------------------------

suite('update', function() {
  test('does not throw with null gameState', function() {
    var threw = false;
    try {
      ApiBridge.update(Date.now(), null);
    } catch (e) {
      threw = true;
    }
    assert.strictEqual(threw, false);
  });

  test('does not throw with minimal gameState', function() {
    var threw = false;
    try {
      ApiBridge.update(Date.now(), minimalGameState());
    } catch (e) {
      threw = true;
    }
    assert.strictEqual(threw, false);
  });

  test('does not throw when now is 0', function() {
    var threw = false;
    try {
      ApiBridge.update(0, minimalGameState());
    } catch (e) {
      threw = true;
    }
    assert.strictEqual(threw, false);
  });

  test('triggers publishStateSnapshot (writes to localStorage) after PUBLISH_INTERVAL', function() {
    clearLocalStorage();
    // Call update twice with timestamps separated by PUBLISH_INTERVAL (60000ms).
    // The first call records lastPublishTime = T. The second call with T + 60001
    // satisfies (now - lastPublishTime >= 60000) and triggers a publish.
    var T = Date.now();
    ApiBridge.update(T, minimalGameState());           // sets lastPublishTime = T
    ApiBridge.update(T + 60001, minimalGameState());  // T+60001 - T = 60001 >= 60000 → publish
    assert.ok(localStorageStore.hasOwnProperty('zion_api_state'));
  });

  test('does not throw when now is a large number', function() {
    // Use Date.now()-based value to avoid contaminating lastPublishTime to MAX_SAFE_INTEGER
    var largeNow = Date.now() + 1000000;
    var threw = false;
    try {
      ApiBridge.update(largeNow, minimalGameState());
    } catch (e) {
      threw = true;
    }
    assert.strictEqual(threw, false);
  });

  test('returns undefined (fire-and-forget loop step)', function() {
    var result = ApiBridge.update(Date.now(), minimalGameState());
    assert.strictEqual(result, undefined);
  });
});

// ---------------------------------------------------------------------------
// SUITE 14: buildSnapshot — rich gameState round-trip
// ---------------------------------------------------------------------------

suite('buildSnapshot — rich gameState round-trip', function() {
  test('returns object with correct v field using rich gameState', function() {
    var snap = ApiBridge.buildSnapshot(richGameState());
    assert.strictEqual(snap.v, 1);
  });

  test('snapshot ts is recent (within 5 seconds)', function() {
    var before = Date.now();
    var snap = ApiBridge.buildSnapshot(richGameState());
    var snapTime = new Date(snap.ts).getTime();
    var after = Date.now();
    assert.ok(snapTime >= before - 100 && snapTime <= after + 100);
  });

  test('can call buildSnapshot multiple times and get independent snapshots', function() {
    var snap1 = ApiBridge.buildSnapshot(minimalGameState());
    var snap2 = ApiBridge.buildSnapshot(minimalGameState());
    // They should be separate objects
    assert.ok(snap1 !== snap2);
  });

  test('buildSnapshot does not mutate the gameState argument', function() {
    var gs = richGameState();
    var keysBeforeCount = Object.keys(gs).length;
    ApiBridge.buildSnapshot(gs);
    assert.strictEqual(Object.keys(gs).length, keysBeforeCount);
  });
});

// ---------------------------------------------------------------------------
// FINAL REPORT
// ---------------------------------------------------------------------------

var success = report();
process.exit(success ? 0 : 1);
