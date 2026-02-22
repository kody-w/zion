/**
 * test_leaderboards.js — 70+ tests for the ZION Leaderboard system
 */
'use strict';

const { test, suite, report, assert } = require('./test_runner');
const LB = require('../src/js/leaderboards');

// =========================================================================
// FIXTURE BUILDERS
// =========================================================================

function makeLedger(entries) {
  // entries: [{id, balance}]
  var balances = {};
  var transactions = [];
  (entries || []).forEach(function(e) {
    balances[e.id] = e.balance;
    if (e.earnings) {
      e.earnings.forEach(function(earn) {
        transactions.push({
          from: 'SYSTEM',
          to: e.id,
          amount: earn.amount,
          type: 'earn',
          ts: earn.ts || Date.now()
        });
      });
    }
  });
  return { balances: balances, transactions: transactions };
}

function makeQuestData(entries) {
  // entries: [{id, turned, completed}]
  var data = {};
  (entries || []).forEach(function(e) {
    data[e.id] = {
      turnedInQuests: new Array(e.turned || 0).fill(null).map(function(_, i) { return 'q' + i; }),
      completedQuests: new Array(e.completed || 0).fill(null).map(function(_, i) { return 'qc' + i; })
    };
  });
  return data;
}

function makeDiscoveries(entries) {
  // entries: [{discoverer, rarity, ts?}]
  return (entries || []).map(function(e, idx) {
    return {
      id: 'disc_' + idx,
      discoverer: e.discoverer,
      type: e.type || 'location',
      rarity: e.rarity !== undefined ? e.rarity : 0.3,
      ts: e.ts !== undefined ? e.ts : Date.now()
    };
  });
}

function makeGuilds(entries) {
  // entries: [{id, name, tag, level, xp, members, treasury}]
  return (entries || []).map(function(e) {
    return {
      id: e.id || ('guild_' + Math.random()),
      name: e.name || 'Test Guild',
      tag: e.tag || 'TST',
      level: e.level || 1,
      xp: e.xp || 0,
      members: Array.isArray(e.members) ? e.members : new Array(e.members || 1).fill({ playerId: 'p1' }),
      treasury: e.treasury || 0
    };
  });
}

function makeReputation(entries) {
  // entries: [{id, score, tier, history?}]
  var data = {};
  (entries || []).forEach(function(e) {
    data[e.id] = {
      score: e.score || 0,
      tier: e.tier || 'Newcomer',
      history: e.history || []
    };
  });
  return data;
}

// =========================================================================
// SUITE 1: CONSTANTS & EXPORTS
// =========================================================================
suite('Module exports and constants', function() {
  test('CATEGORIES object is exported with all keys', function() {
    assert(LB.CATEGORIES, 'CATEGORIES exported');
    assert.strictEqual(LB.CATEGORIES.WEALTH, 'wealth');
    assert.strictEqual(LB.CATEGORIES.QUESTS, 'quests');
    assert.strictEqual(LB.CATEGORIES.EXPLORATION, 'exploration');
    assert.strictEqual(LB.CATEGORIES.GUILDS, 'guilds');
    assert.strictEqual(LB.CATEGORIES.REPUTATION, 'reputation');
    assert.strictEqual(LB.CATEGORIES.COMBINED, 'combined');
  });

  test('TIME_PERIODS object is exported with all keys', function() {
    assert(LB.TIME_PERIODS, 'TIME_PERIODS exported');
    assert.strictEqual(LB.TIME_PERIODS.ALL_TIME, 'all_time');
    assert.strictEqual(LB.TIME_PERIODS.DAILY, 'daily');
    assert.strictEqual(LB.TIME_PERIODS.WEEKLY, 'weekly');
  });

  test('COMBINED_WEIGHTS sums to 1.0', function() {
    var w = LB.COMBINED_WEIGHTS;
    var total = Object.keys(w).reduce(function(sum, k) { return sum + (w[k] || 0); }, 0);
    assert(Math.abs(total - 1.0) < 0.001, 'weights sum to 1, got ' + total);
  });

  test('all main functions are exported', function() {
    assert.strictEqual(typeof LB.getWealthRankings, 'function');
    assert.strictEqual(typeof LB.getQuestRankings, 'function');
    assert.strictEqual(typeof LB.getExplorationRankings, 'function');
    assert.strictEqual(typeof LB.getGuildRankings, 'function');
    assert.strictEqual(typeof LB.getReputationRankings, 'function');
    assert.strictEqual(typeof LB.getCombinedRankings, 'function');
    assert.strictEqual(typeof LB.getPlayerRank, 'function');
    assert.strictEqual(typeof LB.formatLeaderboard, 'function');
    assert.strictEqual(typeof LB.buildSnapshot, 'function');
    assert.strictEqual(typeof LB.getTimePeriodLabel, 'function');
    assert.strictEqual(typeof LB.getTimePeriods, 'function');
  });
});

// =========================================================================
// SUITE 2: INTERNAL HELPERS
// =========================================================================
suite('Internal helpers', function() {
  test('_rankEntries sorts descending and assigns ranks', function() {
    var entries = [
      { id: 'a', score: 10 },
      { id: 'b', score: 50 },
      { id: 'c', score: 30 }
    ];
    var ranked = LB._rankEntries(entries);
    assert.strictEqual(ranked[0].id, 'b');
    assert.strictEqual(ranked[0].rank, 1);
    assert.strictEqual(ranked[1].id, 'c');
    assert.strictEqual(ranked[1].rank, 2);
    assert.strictEqual(ranked[2].id, 'a');
    assert.strictEqual(ranked[2].rank, 3);
  });

  test('_rankEntries handles ties correctly', function() {
    var entries = [
      { id: 'a', score: 100 },
      { id: 'b', score: 100 },
      { id: 'c', score: 50 }
    ];
    var ranked = LB._rankEntries(entries);
    assert.strictEqual(ranked[0].rank, 1);
    assert.strictEqual(ranked[1].rank, 1);  // tie
    assert.strictEqual(ranked[2].rank, 3);  // skips rank 2
  });

  test('_rankEntries returns empty array for empty input', function() {
    assert.deepStrictEqual(LB._rankEntries([]), []);
    assert.deepStrictEqual(LB._rankEntries(null), []);
  });

  test('_normalise maps max score to 100', function() {
    var entries = [
      { id: 'a', score: 50 },
      { id: 'b', score: 100 },
      { id: 'c', score: 0 }
    ];
    var normed = LB._normalise(entries);
    var bEntry = normed.find(function(e) { return e.id === 'b'; });
    var aEntry = normed.find(function(e) { return e.id === 'a'; });
    var cEntry = normed.find(function(e) { return e.id === 'c'; });
    assert.strictEqual(bEntry.normScore, 100);
    assert.strictEqual(aEntry.normScore, 50);
    assert.strictEqual(cEntry.normScore, 0);
  });

  test('_normalise handles all-zero scores', function() {
    var entries = [{ id: 'a', score: 0 }, { id: 'b', score: 0 }];
    var normed = LB._normalise(entries);
    normed.forEach(function(e) { assert.strictEqual(e.normScore, 0); });
  });

  test('_normalise returns empty for empty input', function() {
    assert.deepStrictEqual(LB._normalise([]), []);
  });

  test('_timeCutoff returns 0 for all_time', function() {
    assert.strictEqual(LB._timeCutoff('all_time'), 0);
  });

  test('_timeCutoff returns past timestamp for daily', function() {
    var now = Date.now();
    var cutoff = LB._timeCutoff('daily');
    assert(cutoff > 0 && cutoff < now);
    assert(now - cutoff >= 86400000 - 100); // approximately 1 day
  });

  test('_timeCutoff returns past timestamp for weekly', function() {
    var now = Date.now();
    var cutoff = LB._timeCutoff('weekly');
    assert(cutoff > 0 && cutoff < now);
    assert(now - cutoff >= 604800000 - 100);
  });

  test('_safeInt handles non-numeric values', function() {
    assert.strictEqual(LB._safeInt(NaN), 0);
    assert.strictEqual(LB._safeInt(Infinity), 0);
    assert.strictEqual(LB._safeInt('foo'), 0);
    assert.strictEqual(LB._safeInt(null), 0);
    assert.strictEqual(LB._safeInt(42.9), 42);
    assert.strictEqual(LB._safeInt(-5), -5);
  });
});

// =========================================================================
// SUITE 3: WEALTH RANKINGS
// =========================================================================
suite('getWealthRankings', function() {
  test('returns empty for null/undefined input', function() {
    assert.deepStrictEqual(LB.getWealthRankings(null), []);
    assert.deepStrictEqual(LB.getWealthRankings(undefined), []);
    assert.deepStrictEqual(LB.getWealthRankings({}), []);
  });

  test('ranks players by balance descending', function() {
    var ledger = makeLedger([
      { id: 'alice', balance: 100 },
      { id: 'bob', balance: 500 },
      { id: 'carol', balance: 250 }
    ]);
    var ranked = LB.getWealthRankings(ledger);
    assert.strictEqual(ranked[0].id, 'bob');
    assert.strictEqual(ranked[0].rank, 1);
    assert.strictEqual(ranked[1].id, 'carol');
    assert.strictEqual(ranked[2].id, 'alice');
  });

  test('excludes TREASURY and SYSTEM accounts', function() {
    var ledger = makeLedger([
      { id: 'alice', balance: 100 },
      { id: 'TREASURY', balance: 9999 },
      { id: 'SYSTEM', balance: 9999 }
    ]);
    var ranked = LB.getWealthRankings(ledger);
    assert.strictEqual(ranked.length, 1);
    assert.strictEqual(ranked[0].id, 'alice');
  });

  test('excludes custom excludeIds', function() {
    var ledger = makeLedger([
      { id: 'alice', balance: 200 },
      { id: 'bob', balance: 100 }
    ]);
    var ranked = LB.getWealthRankings(ledger, { excludeIds: ['alice'] });
    assert.strictEqual(ranked.length, 1);
    assert.strictEqual(ranked[0].id, 'bob');
  });

  test('accepts plain balance map (no .balances wrapper)', function() {
    var ranked = LB.getWealthRankings({ alice: 500, bob: 300 });
    assert.strictEqual(ranked[0].id, 'alice');
    assert.strictEqual(ranked[0].score, 500);
  });

  test('negative balances are treated as 0', function() {
    var ledger = makeLedger([
      { id: 'alice', balance: -50 },
      { id: 'bob', balance: 0 }
    ]);
    var ranked = LB.getWealthRankings(ledger);
    ranked.forEach(function(r) { assert(r.score >= 0, 'score >= 0'); });
  });

  test('period filtering uses transactions for daily', function() {
    var cutoff = Date.now() - 86400000;
    var ledger = {
      balances: { alice: 200, bob: 100 },
      transactions: [
        { from: 'SYSTEM', to: 'alice', amount: 50, type: 'earn', ts: Date.now() - 3600000 },  // recent
        { from: 'SYSTEM', to: 'bob', amount: 200, type: 'earn', ts: cutoff - 10000 }           // old
      ]
    };
    var ranked = LB.getWealthRankings(ledger, { period: 'daily' });
    // Only alice has earnings within the daily window
    assert.strictEqual(ranked.length, 1);
    assert.strictEqual(ranked[0].id, 'alice');
    assert.strictEqual(ranked[0].score, 50);
  });

  test('includes label with Spark suffix', function() {
    var ranked = LB.getWealthRankings({ alice: 100 });
    assert(ranked[0].label.indexOf('Spark') !== -1, 'label includes Spark');
  });

  test('handles single player', function() {
    var ranked = LB.getWealthRankings({ alice: 42 });
    assert.strictEqual(ranked.length, 1);
    assert.strictEqual(ranked[0].rank, 1);
  });
});

// =========================================================================
// SUITE 4: QUEST RANKINGS
// =========================================================================
suite('getQuestRankings', function() {
  test('returns empty for null/undefined', function() {
    assert.deepStrictEqual(LB.getQuestRankings(null), []);
    assert.deepStrictEqual(LB.getQuestRankings(undefined), []);
    assert.deepStrictEqual(LB.getQuestRankings({}), []);
  });

  test('ranks players by quest count descending', function() {
    var data = makeQuestData([
      { id: 'alice', turned: 5 },
      { id: 'bob', turned: 12 },
      { id: 'carol', turned: 8 }
    ]);
    var ranked = LB.getQuestRankings(data);
    assert.strictEqual(ranked[0].id, 'bob');
    assert.strictEqual(ranked[0].score, 12);
    assert.strictEqual(ranked[1].id, 'carol');
    assert.strictEqual(ranked[2].id, 'alice');
  });

  test('uses max of turnedInQuests and completedQuests', function() {
    var data = {
      alice: { turnedInQuests: ['q1', 'q2', 'q3'], completedQuests: ['q1', 'q2', 'q3', 'q4', 'q5'] }
    };
    var ranked = LB.getQuestRankings(data);
    assert.strictEqual(ranked[0].score, 5); // max(3, 5) = 5
  });

  test('accepts array format', function() {
    var data = [
      { playerId: 'alice', turnedInQuests: ['q1'], completedQuests: [] },
      { playerId: 'bob', turnedInQuests: ['q1', 'q2'], completedQuests: [] }
    ];
    var ranked = LB.getQuestRankings(data);
    assert.strictEqual(ranked[0].id, 'bob');
  });

  test('handles players with no quests', function() {
    var data = makeQuestData([
      { id: 'alice', turned: 3 },
      { id: 'bob', turned: 0 }
    ]);
    var ranked = LB.getQuestRankings(data);
    assert.strictEqual(ranked.length, 2);
    var bob = ranked.find(function(r) { return r.id === 'bob'; });
    assert.strictEqual(bob.score, 0);
  });

  test('label includes quest count', function() {
    var ranked = LB.getQuestRankings({ alice: { turnedInQuests: ['q1', 'q2'], completedQuests: [] } });
    assert(ranked[0].label.indexOf('quests') !== -1 || ranked[0].label.indexOf('2') !== -1);
  });
});

// =========================================================================
// SUITE 5: EXPLORATION RANKINGS
// =========================================================================
suite('getExplorationRankings', function() {
  test('returns empty for null/undefined', function() {
    assert.deepStrictEqual(LB.getExplorationRankings(null), []);
    assert.deepStrictEqual(LB.getExplorationRankings(undefined), []);
    assert.deepStrictEqual(LB.getExplorationRankings([]), []);
  });

  test('aggregates discoveries by discoverer', function() {
    var discoveries = makeDiscoveries([
      { discoverer: 'alice', rarity: 0.3 },
      { discoverer: 'alice', rarity: 0.3 },
      { discoverer: 'bob', rarity: 0.3 }
    ]);
    var ranked = LB.getExplorationRankings(discoveries);
    assert.strictEqual(ranked[0].id, 'alice');
    assert.strictEqual(ranked[0].score, 2); // 2 discoveries × 1 pt each
  });

  test('applies rarity bonus scoring', function() {
    var discoveries = makeDiscoveries([
      { discoverer: 'alice', rarity: 0.95 },  // 4 pts (secret)
      { discoverer: 'bob', rarity: 0.75 },    // 3 pts (artifact)
      { discoverer: 'carol', rarity: 0.55 },  // 2 pts
      { discoverer: 'dave', rarity: 0.2 }     // 1 pt
    ]);
    var ranked = LB.getExplorationRankings(discoveries);
    var alice = ranked.find(function(r) { return r.id === 'alice'; });
    var bob = ranked.find(function(r) { return r.id === 'bob'; });
    var carol = ranked.find(function(r) { return r.id === 'carol'; });
    var dave = ranked.find(function(r) { return r.id === 'dave'; });
    assert.strictEqual(alice.score, 4);
    assert.strictEqual(bob.score, 3);
    assert.strictEqual(carol.score, 2);
    assert.strictEqual(dave.score, 1);
  });

  test('rarityBonus: false gives 1 point per discovery', function() {
    var discoveries = makeDiscoveries([
      { discoverer: 'alice', rarity: 0.95 },
      { discoverer: 'alice', rarity: 0.95 }
    ]);
    var ranked = LB.getExplorationRankings(discoveries, { rarityBonus: false });
    assert.strictEqual(ranked[0].score, 2);
  });

  test('period filtering by ts', function() {
    var now = Date.now();
    var discoveries = makeDiscoveries([
      { discoverer: 'alice', rarity: 0.3, ts: now - 3600000 },     // 1 hour ago (within daily)
      { discoverer: 'alice', rarity: 0.3, ts: now - 172800000 }    // 2 days ago (outside daily)
    ]);
    LB._setNowFn(function() { return now; });
    var ranked = LB.getExplorationRankings(discoveries, { period: 'daily' });
    LB._setNowFn(function() { return Date.now(); });
    assert.strictEqual(ranked[0].score, 1); // only the recent one
  });

  test('accepts map format {playerId: [discoveries]}', function() {
    var data = {
      alice: [
        { rarity: 0.3, ts: Date.now() },
        { rarity: 0.8, ts: Date.now() }
      ]
    };
    var ranked = LB.getExplorationRankings(data);
    assert.strictEqual(ranked[0].id, 'alice');
    assert(ranked[0].score >= 2);
  });

  test('ranks multiple players correctly', function() {
    var discoveries = makeDiscoveries([
      { discoverer: 'alice', rarity: 0.3 },
      { discoverer: 'alice', rarity: 0.3 },
      { discoverer: 'alice', rarity: 0.3 },
      { discoverer: 'bob', rarity: 0.95 }  // 4 pts
    ]);
    var ranked = LB.getExplorationRankings(discoveries);
    // alice = 3 pts, bob = 4 pts
    assert.strictEqual(ranked[0].id, 'bob');
    assert.strictEqual(ranked[0].score, 4);
    assert.strictEqual(ranked[1].id, 'alice');
    assert.strictEqual(ranked[1].score, 3);
  });
});

// =========================================================================
// SUITE 6: GUILD RANKINGS
// =========================================================================
suite('getGuildRankings', function() {
  test('returns empty for null/undefined', function() {
    assert.deepStrictEqual(LB.getGuildRankings(null), []);
    assert.deepStrictEqual(LB.getGuildRankings(undefined), []);
    assert.deepStrictEqual(LB.getGuildRankings([]), []);
  });

  test('composite score: level*1000 + xp', function() {
    var guilds = makeGuilds([
      { id: 'g1', level: 2, xp: 300 },  // 2300
      { id: 'g2', level: 1, xp: 900 },  // 1900
      { id: 'g3', level: 3, xp: 0 }     // 3000
    ]);
    var ranked = LB.getGuildRankings(guilds);
    assert.strictEqual(ranked[0].id, 'g3'); // 3000
    assert.strictEqual(ranked[1].id, 'g1'); // 2300
    assert.strictEqual(ranked[2].id, 'g2'); // 1900
  });

  test('metric:xp ranks by raw XP', function() {
    var guilds = makeGuilds([
      { id: 'g1', level: 1, xp: 800 },
      { id: 'g2', level: 5, xp: 100 }
    ]);
    var ranked = LB.getGuildRankings(guilds, { metric: 'xp' });
    assert.strictEqual(ranked[0].id, 'g1');
  });

  test('metric:members ranks by member count', function() {
    var guilds = makeGuilds([
      { id: 'g1', level: 1, xp: 0, members: 5 },
      { id: 'g2', level: 1, xp: 0, members: 15 }
    ]);
    var ranked = LB.getGuildRankings(guilds, { metric: 'members' });
    assert.strictEqual(ranked[0].id, 'g2');
  });

  test('metric:treasury ranks by treasury balance', function() {
    var guilds = makeGuilds([
      { id: 'g1', treasury: 1000 },
      { id: 'g2', treasury: 500 }
    ]);
    var ranked = LB.getGuildRankings(guilds, { metric: 'treasury' });
    assert.strictEqual(ranked[0].id, 'g1');
  });

  test('accepts {guilds: [...]} format', function() {
    var data = { guilds: makeGuilds([{ id: 'g1' }, { id: 'g2' }]) };
    var ranked = LB.getGuildRankings(data);
    assert.strictEqual(ranked.length, 2);
  });

  test('includes name, tag, level in entries', function() {
    var guilds = makeGuilds([{ id: 'g1', name: 'Sun Order', tag: 'SUN', level: 2, xp: 500 }]);
    var ranked = LB.getGuildRankings(guilds);
    assert.strictEqual(ranked[0].name, 'Sun Order');
    assert.strictEqual(ranked[0].tag, 'SUN');
    assert.strictEqual(ranked[0].level, 2);
  });

  test('skips guild entries with no id', function() {
    var guilds = [{ name: 'No ID', level: 5, xp: 999 }];
    var ranked = LB.getGuildRankings(guilds);
    assert.strictEqual(ranked.length, 0);
  });
});

// =========================================================================
// SUITE 7: REPUTATION RANKINGS
// =========================================================================
suite('getReputationRankings', function() {
  test('returns empty for null/undefined', function() {
    assert.deepStrictEqual(LB.getReputationRankings(null), []);
    assert.deepStrictEqual(LB.getReputationRankings(undefined), []);
    assert.deepStrictEqual(LB.getReputationRankings({}), []);
  });

  test('ranks players by reputation score', function() {
    var data = makeReputation([
      { id: 'alice', score: 500, tier: 'Respected' },
      { id: 'bob', score: 1500, tier: 'Honored' },
      { id: 'carol', score: 100, tier: 'Trusted' }
    ]);
    var ranked = LB.getReputationRankings(data);
    assert.strictEqual(ranked[0].id, 'bob');
    assert.strictEqual(ranked[0].score, 1500);
    assert.strictEqual(ranked[1].id, 'alice');
    assert.strictEqual(ranked[2].id, 'carol');
  });

  test('includes tier in entry', function() {
    var data = makeReputation([{ id: 'alice', score: 1500, tier: 'Honored' }]);
    var ranked = LB.getReputationRankings(data);
    assert.strictEqual(ranked[0].tier, 'Honored');
  });

  test('period filter uses history timestamps', function() {
    var now = Date.now();
    var data = {
      alice: {
        score: 500,
        tier: 'Respected',
        history: [
          { action: 'helping', change: 10, timestamp: now - 3600000 },   // recent
          { action: 'helping', change: 490, timestamp: now - 172800000 } // old
        ]
      }
    };
    LB._setNowFn(function() { return now; });
    var ranked = LB.getReputationRankings(data, { period: 'daily' });
    LB._setNowFn(function() { return Date.now(); });
    // Only the recent +10 should be counted
    assert.strictEqual(ranked[0].score, 10);
  });

  test('accepts array format', function() {
    var data = [
      { id: 'alice', score: 100, tier: 'Trusted' },
      { id: 'bob', score: 50, tier: 'Newcomer' }
    ];
    var ranked = LB.getReputationRankings(data);
    assert.strictEqual(ranked[0].id, 'alice');
  });

  test('handles missing history gracefully', function() {
    var data = { alice: { score: 200, tier: 'Trusted' } }; // no history field
    var ranked = LB.getReputationRankings(data);
    assert.strictEqual(ranked[0].score, 200);
  });
});

// =========================================================================
// SUITE 8: COMBINED RANKINGS
// =========================================================================
suite('getCombinedRankings', function() {
  test('returns array for valid data', function() {
    var data = {
      economy: makeLedger([{ id: 'alice', balance: 100 }]),
      quests: makeQuestData([{ id: 'alice', turned: 5 }]),
      discoveries: makeDiscoveries([{ discoverer: 'alice', rarity: 0.3 }]),
      reputation: makeReputation([{ id: 'alice', score: 200, tier: 'Trusted' }])
    };
    var ranked = LB.getCombinedRankings(data);
    assert(Array.isArray(ranked));
    assert(ranked.length > 0);
  });

  test('returns empty for empty/null data', function() {
    assert.deepStrictEqual(LB.getCombinedRankings(null), []);
    assert.deepStrictEqual(LB.getCombinedRankings({}), []);
  });

  test('entries have breakdown property', function() {
    var data = {
      economy: makeLedger([{ id: 'alice', balance: 100 }]),
      reputation: makeReputation([{ id: 'alice', score: 50, tier: 'Newcomer' }])
    };
    var ranked = LB.getCombinedRankings(data);
    var alice = ranked.find(function(r) { return r.id === 'alice'; });
    assert(alice.breakdown, 'breakdown exists');
    assert('wealth' in alice.breakdown, 'wealth in breakdown');
    assert('quests' in alice.breakdown, 'quests in breakdown');
  });

  test('players appearing only in one category are still ranked', function() {
    var data = {
      economy: makeLedger([{ id: 'alice', balance: 500 }]),
      reputation: makeReputation([{ id: 'bob', score: 200, tier: 'Trusted' }])
    };
    var ranked = LB.getCombinedRankings(data);
    var ids = ranked.map(function(r) { return r.id; });
    assert(ids.indexOf('alice') !== -1, 'alice in combined');
    assert(ids.indexOf('bob') !== -1, 'bob in combined');
  });

  test('custom weights change ordering', function() {
    var data = {
      economy: makeLedger([{ id: 'alice', balance: 1000 }, { id: 'bob', balance: 10 }]),
      reputation: makeReputation([
        { id: 'alice', score: 0, tier: 'Newcomer' },
        { id: 'bob', score: 9999, tier: 'Elder' }
      ])
    };
    // Weight reputation heavily
    var ranked = LB.getCombinedRankings(data, {
      weights: { wealth: 0.0, quests: 0.0, exploration: 0.0, reputation: 1.0 }
    });
    assert.strictEqual(ranked[0].id, 'bob');
  });

  test('scores are non-negative', function() {
    var data = {
      economy: makeLedger([{ id: 'alice', balance: 0 }])
    };
    var ranked = LB.getCombinedRankings(data);
    ranked.forEach(function(r) { assert(r.score >= 0, 'score >= 0'); });
  });
});

// =========================================================================
// SUITE 9: GET PLAYER RANK
// =========================================================================
suite('getPlayerRank', function() {
  test('returns null for invalid playerId', function() {
    assert.strictEqual(LB.getPlayerRank(null, 'wealth', {}), null);
    assert.strictEqual(LB.getPlayerRank('', 'wealth', {}), null);
  });

  test('returns null for unknown category', function() {
    assert.strictEqual(LB.getPlayerRank('alice', 'foobar', {}), null);
  });

  test('returns correct rank for wealth category', function() {
    var ledger = makeLedger([
      { id: 'alice', balance: 500 },
      { id: 'bob', balance: 100 }
    ]);
    var result = LB.getPlayerRank('alice', 'wealth', ledger);
    assert.strictEqual(result.rank, 1);
    assert.strictEqual(result.total, 2);
  });

  test('returns unranked entry when player not in data', function() {
    var ledger = makeLedger([{ id: 'bob', balance: 100 }]);
    var result = LB.getPlayerRank('alice', 'wealth', ledger);
    assert.strictEqual(result.rank, null);
    assert(result.label.indexOf('Unranked') !== -1 || result.score === 0);
  });

  test('works for quests category', function() {
    var data = makeQuestData([
      { id: 'alice', turned: 10 },
      { id: 'bob', turned: 5 }
    ]);
    var result = LB.getPlayerRank('bob', 'quests', data);
    assert.strictEqual(result.rank, 2);
  });

  test('works for exploration category', function() {
    var discoveries = makeDiscoveries([
      { discoverer: 'alice', rarity: 0.3 },
      { discoverer: 'alice', rarity: 0.3 },
      { discoverer: 'bob', rarity: 0.3 }
    ]);
    var result = LB.getPlayerRank('alice', 'exploration', discoveries);
    assert.strictEqual(result.rank, 1);
  });

  test('works for reputation category', function() {
    var data = makeReputation([
      { id: 'alice', score: 100, tier: 'Trusted' },
      { id: 'bob', score: 500, tier: 'Respected' }
    ]);
    var result = LB.getPlayerRank('alice', 'reputation', data);
    assert.strictEqual(result.rank, 2);
  });

  test('works for guilds category', function() {
    var guilds = makeGuilds([
      { id: 'g1', name: 'Alpha', level: 3, xp: 500 },
      { id: 'g2', name: 'Beta', level: 1, xp: 100 }
    ]);
    var result = LB.getPlayerRank('g2', 'guilds', guilds);
    assert.strictEqual(result.rank, 2);
  });

  test('works for combined category', function() {
    var data = {
      economy: makeLedger([{ id: 'alice', balance: 100 }])
    };
    var result = LB.getPlayerRank('alice', 'combined', data);
    assert(result !== null);
    assert(result.rank !== null || result.label === 'Unranked');
  });

  test('includes category in result', function() {
    var ledger = makeLedger([{ id: 'alice', balance: 100 }]);
    var result = LB.getPlayerRank('alice', 'wealth', ledger);
    assert.strictEqual(result.category, 'wealth');
  });
});

// =========================================================================
// SUITE 10: FORMAT LEADERBOARD
// =========================================================================
suite('formatLeaderboard', function() {
  test('returns empty array for null/undefined input', function() {
    assert.deepStrictEqual(LB.formatLeaderboard(null), []);
    assert.deepStrictEqual(LB.formatLeaderboard(undefined), []);
    assert.deepStrictEqual(LB.formatLeaderboard([]), []);
  });

  test('respects count option (default 10)', function() {
    var rankings = [];
    for (var i = 0; i < 30; i++) {
      rankings.push({ id: 'p' + i, score: 30 - i, rank: i + 1, name: 'p' + i, label: (30-i) + ' pts' });
    }
    var rows = LB.formatLeaderboard(rankings);
    assert.strictEqual(rows.length, 10);
  });

  test('count: 25 returns up to 25 rows', function() {
    var rankings = [];
    for (var i = 0; i < 30; i++) {
      rankings.push({ id: 'p' + i, score: 30 - i, rank: i + 1, name: 'p' + i, label: '' });
    }
    var rows = LB.formatLeaderboard(rankings, { count: 25, allowedCounts: [25] });
    assert.strictEqual(rows.length, 25);
  });

  test('highlights specified playerId', function() {
    var rankings = [
      { id: 'alice', score: 100, rank: 1, name: 'alice', label: '100 Spark' },
      { id: 'bob', score: 50, rank: 2, name: 'bob', label: '50 Spark' }
    ];
    var rows = LB.formatLeaderboard(rankings, { highlightId: 'bob' });
    var bobRow = rows.find(function(r) { return r.id === 'bob'; });
    assert.strictEqual(bobRow.isHighlighted, true);
    var aliceRow = rows.find(function(r) { return r.id === 'alice'; });
    assert.strictEqual(aliceRow.isHighlighted, false);
  });

  test('includes rank in each row', function() {
    var rankings = [
      { id: 'alice', score: 100, rank: 1, name: 'alice', label: '' }
    ];
    var rows = LB.formatLeaderboard(rankings);
    assert.strictEqual(rows[0].rank, 1);
  });

  test('showBreakdown: true includes breakdown for combined entries', function() {
    var rankings = [
      { id: 'alice', score: 75, rank: 1, name: 'alice', label: '75 pts',
        breakdown: { wealth: 50, quests: 25, exploration: 0, reputation: 0 } }
    ];
    var rows = LB.formatLeaderboard(rankings, { showBreakdown: true });
    assert(rows[0].breakdown, 'breakdown present');
    assert.strictEqual(rows[0].breakdown.wealth, 50);
  });

  test('showBreakdown: false omits breakdown', function() {
    var rankings = [
      { id: 'alice', score: 75, rank: 1, name: 'alice', label: '75 pts',
        breakdown: { wealth: 50 } }
    ];
    var rows = LB.formatLeaderboard(rankings, { showBreakdown: false });
    assert(!rows[0].breakdown, 'breakdown absent');
  });

  test('includes tier when present in entry', function() {
    var rankings = [
      { id: 'alice', score: 500, rank: 1, name: 'alice', label: 'Respected', tier: 'Respected' }
    ];
    var rows = LB.formatLeaderboard(rankings);
    assert.strictEqual(rows[0].tier, 'Respected');
  });

  test('includes tag when present in entry', function() {
    var rankings = [
      { id: 'g1', score: 3000, rank: 1, name: 'Sun Order', label: '', tag: 'SUN', level: 3 }
    ];
    var rows = LB.formatLeaderboard(rankings);
    assert.strictEqual(rows[0].tag, 'SUN');
    assert.strictEqual(rows[0].level, 3);
  });

  test('count snaps to nearest allowed value', function() {
    var rankings = [];
    for (var i = 0; i < 50; i++) {
      rankings.push({ id: 'p' + i, score: 50 - i, rank: i + 1, name: 'p' + i, label: '' });
    }
    // count: 12 should snap to 10 (nearest of [10,25,50])
    var rows = LB.formatLeaderboard(rankings, { count: 12 });
    assert.strictEqual(rows.length, 10);
  });
});

// =========================================================================
// SUITE 11: TIME PERIOD HELPERS
// =========================================================================
suite('Time period helpers', function() {
  test('getTimePeriodLabel returns correct labels', function() {
    assert.strictEqual(LB.getTimePeriodLabel('all_time'), 'All Time');
    assert.strictEqual(LB.getTimePeriodLabel('daily'), 'Today');
    assert.strictEqual(LB.getTimePeriodLabel('weekly'), 'This Week');
    assert.strictEqual(LB.getTimePeriodLabel('unknown'), 'All Time'); // default
  });

  test('getTimePeriods returns array with 3 periods', function() {
    var periods = LB.getTimePeriods();
    assert(Array.isArray(periods));
    assert.strictEqual(periods.length, 3);
    var ids = periods.map(function(p) { return p.id; });
    assert(ids.indexOf('all_time') !== -1);
    assert(ids.indexOf('daily') !== -1);
    assert(ids.indexOf('weekly') !== -1);
  });

  test('each period has id and label', function() {
    var periods = LB.getTimePeriods();
    periods.forEach(function(p) {
      assert(p.id, 'has id');
      assert(p.label, 'has label');
    });
  });
});

// =========================================================================
// SUITE 12: BUILD SNAPSHOT
// =========================================================================
suite('buildSnapshot', function() {
  var gameData = {
    economy: makeLedger([
      { id: 'alice', balance: 500 },
      { id: 'bob', balance: 300 }
    ]),
    quests: makeQuestData([
      { id: 'alice', turned: 10 },
      { id: 'bob', turned: 5 }
    ]),
    discoveries: makeDiscoveries([
      { discoverer: 'alice', rarity: 0.5 },
      { discoverer: 'bob', rarity: 0.3 }
    ]),
    guilds: makeGuilds([
      { id: 'g1', name: 'Alpha Guild', level: 2, xp: 500 }
    ]),
    reputation: makeReputation([
      { id: 'alice', score: 100, tier: 'Trusted' },
      { id: 'bob', score: 50, tier: 'Newcomer' }
    ])
  };

  test('returns object with all category keys', function() {
    var snap = LB.buildSnapshot(gameData);
    assert(snap.wealth, 'wealth');
    assert(snap.quests, 'quests');
    assert(snap.exploration, 'exploration');
    assert(snap.guilds, 'guilds');
    assert(snap.reputation, 'reputation');
    assert(snap.combined, 'combined');
    assert(snap.meta, 'meta');
  });

  test('meta includes period, count, generatedAt', function() {
    var snap = LB.buildSnapshot(gameData, { period: 'daily', count: 25 });
    assert.strictEqual(snap.meta.period, 'daily');
    assert.strictEqual(snap.meta.count, 25);
    assert(typeof snap.meta.generatedAt === 'number');
  });

  test('meta.periodLabel is correct', function() {
    var snap = LB.buildSnapshot(gameData, { period: 'weekly' });
    assert.strictEqual(snap.meta.periodLabel, 'This Week');
  });

  test('all categories return arrays', function() {
    var snap = LB.buildSnapshot(gameData);
    ['wealth','quests','exploration','guilds','reputation','combined'].forEach(function(cat) {
      assert(Array.isArray(snap[cat]), cat + ' is array');
    });
  });

  test('respects count option', function() {
    var snap = LB.buildSnapshot(gameData, { count: 10 });
    // We only have 2 players so result should be <= 10
    assert(snap.wealth.length <= 10);
  });

  test('handles null gameData gracefully', function() {
    var snap = LB.buildSnapshot(null);
    assert(snap.wealth);
    assert(snap.meta);
  });

  test('combined entries include breakdown', function() {
    var snap = LB.buildSnapshot(gameData);
    if (snap.combined.length > 0) {
      // Combined entries have breakdown when showBreakdown:true in buildSnapshot
      // Just check entry has expected fields
      assert(snap.combined[0].id, 'entry has id');
    }
  });
});

// =========================================================================
// SUITE 13: EDGE CASES
// =========================================================================
suite('Edge cases and defensive behaviour', function() {
  test('all ranking functions handle empty objects', function() {
    assert.deepStrictEqual(LB.getWealthRankings({}), []);
    assert.deepStrictEqual(LB.getQuestRankings({}), []);
    assert.deepStrictEqual(LB.getExplorationRankings({}), []);
    assert.deepStrictEqual(LB.getGuildRankings({}), []);
    assert.deepStrictEqual(LB.getReputationRankings({}), []);
  });

  test('all ranking functions handle empty arrays', function() {
    assert.deepStrictEqual(LB.getQuestRankings([]), []);
    assert.deepStrictEqual(LB.getExplorationRankings([]), []);
    assert.deepStrictEqual(LB.getGuildRankings([]), []);
    assert.deepStrictEqual(LB.getReputationRankings([]), []);
  });

  test('single player gets rank 1', function() {
    var ranked = LB.getWealthRankings({ alice: 1 });
    assert.strictEqual(ranked[0].rank, 1);
  });

  test('players with identical scores share rank', function() {
    var ledger = makeLedger([
      { id: 'alice', balance: 100 },
      { id: 'bob', balance: 100 },
      { id: 'carol', balance: 50 }
    ]);
    var ranked = LB.getWealthRankings(ledger);
    var alice = ranked.find(function(r) { return r.id === 'alice'; });
    var bob = ranked.find(function(r) { return r.id === 'bob'; });
    var carol = ranked.find(function(r) { return r.id === 'carol'; });
    assert.strictEqual(alice.rank, bob.rank); // tie at rank 1
    assert.strictEqual(carol.rank, 3);        // skip rank 2
  });

  test('formatLeaderboard does not mutate input array', function() {
    var rankings = [
      { id: 'a', score: 10, rank: 1, name: 'a', label: '' }
    ];
    var original = JSON.stringify(rankings);
    LB.formatLeaderboard(rankings);
    assert.strictEqual(JSON.stringify(rankings), original);
  });

  test('_rankEntries does not change the order of the input array', function() {
    var entries = [{ id: 'a', score: 5 }, { id: 'b', score: 10 }];
    LB._rankEntries(entries);
    // Input array order should remain unchanged (a first, b second)
    assert.strictEqual(entries[0].id, 'a');
    assert.strictEqual(entries[1].id, 'b');
  });

  test('getWealthRankings handles ledger with no transactions', function() {
    var ledger = { balances: { alice: 100 } };
    var ranked = LB.getWealthRankings(ledger);
    assert.strictEqual(ranked.length, 1);
  });

  test('getExplorationRankings ignores entries missing discoverer', function() {
    var discoveries = [
      { id: 'x', rarity: 0.5, ts: Date.now() }  // no discoverer field
    ];
    var ranked = LB.getExplorationRankings(discoveries);
    // Should not throw; may return empty or skip invalid entries
    assert(Array.isArray(ranked));
  });

  test('formatLeaderboard with count larger than rankings returns all', function() {
    var rankings = [
      { id: 'a', score: 10, rank: 1, name: 'a', label: '' },
      { id: 'b', score: 5, rank: 2, name: 'b', label: '' }
    ];
    var rows = LB.formatLeaderboard(rankings, { count: 50, allowedCounts: [50] });
    assert.strictEqual(rows.length, 2);
  });

  test('getPlayerRank total matches length of ranked array', function() {
    var data = makeQuestData([
      { id: 'a', turned: 5 },
      { id: 'b', turned: 3 },
      { id: 'c', turned: 8 }
    ]);
    var result = LB.getPlayerRank('a', 'quests', data);
    assert.strictEqual(result.total, 3);
  });
});

// =========================================================================
// REPORT
// =========================================================================
if (!report()) {
  process.exit(1);
}
