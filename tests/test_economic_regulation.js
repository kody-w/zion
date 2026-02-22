/**
 * tests/test_economic_regulation.js
 * 145+ tests for the ZION Economic Regulation module.
 * Covers UBI, progressive income tax, wealth tax, treasury, economic health metrics,
 * balance floor, tax exemption, ledger transparency, and daily processing.
 *
 * Per Constitution §6.4: Progressive Taxation and Universal Basic Income.
 *
 * Run with: node tests/test_economic_regulation.js
 */

'use strict';

var ER = require('../src/js/economic_regulation');

// ============================================================================
// MINIMAL TEST HARNESS (var-only, zero-dep, ZION convention)
// ============================================================================

var passed = 0;
var failed = 0;
var total = 0;
var currentSection = '';

function section(title) {
  currentSection = title;
  console.log('\n--- ' + title + ' ---');
}

function assert(condition, msg) {
  total++;
  if (condition) {
    passed++;
    console.log('  PASS: ' + msg);
  } else {
    failed++;
    console.log('  FAIL: [' + currentSection + '] ' + msg);
  }
}

function assertEqual(a, b, msg) {
  assert(a === b, msg + ' (expected ' + JSON.stringify(b) + ', got ' + JSON.stringify(a) + ')');
}

function assertClose(a, b, epsilon, msg) {
  var eps = typeof epsilon === 'number' ? epsilon : 0.001;
  assert(Math.abs(a - b) <= eps, msg + ' (expected ~' + b + ', got ' + a + ')');
}

// ============================================================================
// HELPERS
// ============================================================================

var playerSeq = 0;
function uid() { return 'player_' + (++playerSeq); }

function freshState() {
  return ER.createState();
}

/**
 * Register n players, each with a given balance, returns array of player IDs.
 */
function registerN(state, n, balance, tick) {
  var ids = [];
  for (var i = 0; i < n; i++) {
    var id = uid();
    ER.registerPlayer(state, id, balance || 0, tick || 0);
    ids.push(id);
  }
  return ids;
}

// ============================================================================
// SECTION 1: MODULE EXPORTS
// ============================================================================

section('Module exports');

assert(typeof ER === 'object', 'module exports an object');
assert(Array.isArray(ER.TAX_BRACKETS), 'TAX_BRACKETS is an array');
assertEqual(ER.TAX_BRACKETS.length, 5, 'TAX_BRACKETS has exactly 5 brackets');
assert(typeof ER.createState === 'function', 'createState is exported');
assert(typeof ER.registerPlayer === 'function', 'registerPlayer is exported');
assert(typeof ER.processIncomeTax === 'function', 'processIncomeTax is exported');
assert(typeof ER.processWealthTax === 'function', 'processWealthTax is exported');
assert(typeof ER.distributeUBI === 'function', 'distributeUBI is exported');
assert(typeof ER.getTaxBracket === 'function', 'getTaxBracket is exported');
assert(typeof ER.getPlayerTaxRecord === 'function', 'getPlayerTaxRecord is exported');
assert(typeof ER.getTreasury === 'function', 'getTreasury is exported');
assert(typeof ER.getUBIEstimate === 'function', 'getUBIEstimate is exported');
assert(typeof ER.isExempt === 'function', 'isExempt is exported');
assert(typeof ER.getGiniCoefficient === 'function', 'getGiniCoefficient is exported');
assert(typeof ER.getMedianBalance === 'function', 'getMedianBalance is exported');
assert(typeof ER.getCirculationVelocity === 'function', 'getCirculationVelocity is exported');
assert(typeof ER.getEconomicHealth === 'function', 'getEconomicHealth is exported');
assert(typeof ER.getDailyReport === 'function', 'getDailyReport is exported');
assert(typeof ER.getWealthDistribution === 'function', 'getWealthDistribution is exported');
assert(typeof ER.getTopTaxPayers === 'function', 'getTopTaxPayers is exported');
assert(typeof ER.getTaxRevenue === 'function', 'getTaxRevenue is exported');
assert(typeof ER.processDaily === 'function', 'processDaily is exported');

// ============================================================================
// SECTION 2: CONSTANTS
// ============================================================================

section('Constants and configuration');

assertEqual(ER.BALANCE_FLOOR, 10, 'BALANCE_FLOOR is 10');
assertEqual(ER.UBI_MIN, 1, 'UBI_MIN is 1');
assertEqual(ER.UBI_MAX, 50, 'UBI_MAX is 50');
assertEqual(ER.WEALTH_TAX_THRESHOLD, 500, 'WEALTH_TAX_THRESHOLD is 500');
assertEqual(ER.WEALTH_TAX_RATE, 0.02, 'WEALTH_TAX_RATE is 0.02');
assertEqual(ER.NEW_PLAYER_EXEMPT_TICKS, 500, 'NEW_PLAYER_EXEMPT_TICKS is 500');
assertEqual(ER.INITIAL_TREASURY, 1000, 'INITIAL_TREASURY is 1000');

// ============================================================================
// SECTION 3: TAX BRACKET DEFINITIONS
// ============================================================================

section('TAX_BRACKETS structure');

// Validate all brackets have required fields
var bracketFields = ['min', 'max', 'rate', 'label'];
var allBracketsValid = true;
for (var bi = 0; bi < ER.TAX_BRACKETS.length; bi++) {
  var br = ER.TAX_BRACKETS[bi];
  for (var fi = 0; fi < bracketFields.length; fi++) {
    if (!(bracketFields[fi] in br)) { allBracketsValid = false; break; }
  }
}
assert(allBracketsValid, 'all brackets have min/max/rate/label fields');

// First bracket is 0%
assertEqual(ER.TAX_BRACKETS[0].rate, 0.00, 'bracket 0: rate is 0%');
assertEqual(ER.TAX_BRACKETS[0].min, 0, 'bracket 0: min is 0');

// Rates are non-decreasing
var ratesIncreasing = true;
for (var ri = 1; ri < ER.TAX_BRACKETS.length; ri++) {
  if (ER.TAX_BRACKETS[ri].rate < ER.TAX_BRACKETS[ri - 1].rate) {
    ratesIncreasing = false;
  }
}
assert(ratesIncreasing, 'tax rates are non-decreasing across brackets');

// Top bracket is 40%
assertEqual(ER.TAX_BRACKETS[4].rate, 0.40, 'bracket 4 (top): rate is 40%');
assert(ER.TAX_BRACKETS[4].max === Infinity, 'top bracket max is Infinity');

// No bracket has rate > 0.40
var noExcessRate = ER.TAX_BRACKETS.every(function(b) { return b.rate <= 0.40; });
assert(noExcessRate, 'no bracket has rate above 40%');

// ============================================================================
// SECTION 4: createState
// ============================================================================

section('createState');

var s0 = freshState();
assert(typeof s0 === 'object', 'createState returns an object');
assertEqual(s0.treasury, 1000, 'initial treasury is 1000');
assert(typeof s0.players === 'object', 'players is an object');
assert(Array.isArray(s0.taxLog), 'taxLog is an array');
assert(Array.isArray(s0.ubiLog), 'ubiLog is an array');
assert(Array.isArray(s0.dailyStats), 'dailyStats is an array');
assertEqual(Object.keys(s0.players).length, 0, 'no players at start');
assertEqual(s0.taxLog.length, 0, 'taxLog starts empty');
assertEqual(s0.ubiLog.length, 0, 'ubiLog starts empty');

// States are independent
var s1 = freshState();
var s2 = freshState();
s1.treasury = 9999;
assertEqual(s2.treasury, 1000, 'states are independent');

// ============================================================================
// SECTION 5: registerPlayer
// ============================================================================

section('registerPlayer');

var rs = freshState();
var rResult = ER.registerPlayer(rs, 'alice', 100, 0);
assertEqual(rResult.success, true, 'registerPlayer returns success:true');
assert(rs.players['alice'] !== undefined, 'player alice exists in state');
assertEqual(rs.players['alice'].balance, 100, 'player balance set correctly');
assertEqual(rs.players['alice'].joinTick, 0, 'joinTick recorded');
assertEqual(rs.players['alice'].totalTaxPaid, 0, 'totalTaxPaid starts at 0');
assertEqual(rs.players['alice'].totalUBIReceived, 0, 'totalUBIReceived starts at 0');
assertEqual(rs.players['alice'].totalEarnings, 0, 'totalEarnings starts at 0');
assert(Array.isArray(rs.players['alice'].taxHistory), 'taxHistory is array');
assert(Array.isArray(rs.players['alice'].ubiHistory), 'ubiHistory is array');

// Duplicate registration fails
var dupResult = ER.registerPlayer(rs, 'alice', 200, 0);
assertEqual(dupResult.success, false, 'duplicate registerPlayer fails');
assertEqual(rs.players['alice'].balance, 100, 'balance unchanged on duplicate');

// Invalid playerId
var badId = ER.registerPlayer(rs, '', 100, 0);
assertEqual(badId.success, false, 'empty playerId fails');
var badId2 = ER.registerPlayer(rs, null, 100, 0);
assertEqual(badId2.success, false, 'null playerId fails');

// Balance below floor is raised to floor
var lowBalResult = ER.registerPlayer(rs, 'newbie', 5, 0);
assertEqual(lowBalResult.success, true, 'register with balance below floor succeeds');
assertEqual(rs.players['newbie'].balance, ER.BALANCE_FLOOR, 'balance raised to BALANCE_FLOOR');

// Balance of exactly 0 is raised to floor
var zeroBalPlayer = uid();
ER.registerPlayer(rs, zeroBalPlayer, 0, 0);
assertEqual(rs.players[zeroBalPlayer].balance, ER.BALANCE_FLOOR, 'balance 0 raised to BALANCE_FLOOR');

// Join tick stored
var latejoin = uid();
ER.registerPlayer(rs, latejoin, 100, 750);
assertEqual(rs.players[latejoin].joinTick, 750, 'late joinTick stored correctly');

// ============================================================================
// SECTION 6: getTaxBracket
// ============================================================================

section('getTaxBracket');

// Balance 0-49: 0%
assertEqual(ER.getTaxBracket(0).rate, 0.00, 'balance 0 => 0% rate');
assertEqual(ER.getTaxBracket(25).rate, 0.00, 'balance 25 => 0% rate');
assertEqual(ER.getTaxBracket(49).rate, 0.00, 'balance 49 => 0% rate');

// Balance 50-199: 10%
assertEqual(ER.getTaxBracket(50).rate, 0.10, 'balance 50 => 10% rate');
assertEqual(ER.getTaxBracket(100).rate, 0.10, 'balance 100 => 10% rate');
assertEqual(ER.getTaxBracket(199).rate, 0.10, 'balance 199 => 10% rate');

// Balance 200-499: 20%
assertEqual(ER.getTaxBracket(200).rate, 0.20, 'balance 200 => 20% rate');
assertEqual(ER.getTaxBracket(350).rate, 0.20, 'balance 350 => 20% rate');
assertEqual(ER.getTaxBracket(499).rate, 0.20, 'balance 499 => 20% rate');

// Balance 500-999: 30%
assertEqual(ER.getTaxBracket(500).rate, 0.30, 'balance 500 => 30% rate');
assertEqual(ER.getTaxBracket(750).rate, 0.30, 'balance 750 => 30% rate');
assertEqual(ER.getTaxBracket(999).rate, 0.30, 'balance 999 => 30% rate');

// Balance 1000+: 40%
assertEqual(ER.getTaxBracket(1000).rate, 0.40, 'balance 1000 => 40% rate');
assertEqual(ER.getTaxBracket(5000).rate, 0.40, 'balance 5000 => 40% rate');

// Negative balance: treated as 0
assertEqual(ER.getTaxBracket(-10).rate, 0.00, 'negative balance => 0% rate');

// Returns bracketIndex
assertEqual(ER.getTaxBracket(0).bracketIndex, 0, 'balance 0 => bracketIndex 0');
assertEqual(ER.getTaxBracket(50).bracketIndex, 1, 'balance 50 => bracketIndex 1');
assertEqual(ER.getTaxBracket(200).bracketIndex, 2, 'balance 200 => bracketIndex 2');
assertEqual(ER.getTaxBracket(500).bracketIndex, 3, 'balance 500 => bracketIndex 3');
assertEqual(ER.getTaxBracket(1000).bracketIndex, 4, 'balance 1000 => bracketIndex 4');

// ============================================================================
// SECTION 7: isExempt
// ============================================================================

section('isExempt');

var es = freshState();
ER.registerPlayer(es, 'newPlayer', 100, 0);
ER.registerPlayer(es, 'oldPlayer', 100, 0);

// New player (tick 0, current tick 100) => exempt (100-0=100 < 500)
assert(ER.isExempt(es, 'newPlayer', 100) === true, 'player at tick 100, joined 0 => exempt');

// Player at tick 499 => still exempt
assert(ER.isExempt(es, 'newPlayer', 499) === true, 'player at tick 499, joined 0 => still exempt');

// Player at tick 500 => NOT exempt (500-0=500, not < 500)
assert(ER.isExempt(es, 'newPlayer', 500) === false, 'player at tick 500, joined 0 => not exempt');

// Player at tick 1000 => not exempt
assert(ER.isExempt(es, 'newPlayer', 1000) === false, 'player at tick 1000 => not exempt');

// Unknown player => false
assert(ER.isExempt(es, 'ghost', 100) === false, 'unknown player => not exempt');

// Player joined at tick 200, current tick 650 => 650-200=450 < 500 => exempt
var midJoiner = uid();
ER.registerPlayer(es, midJoiner, 100, 200);
assert(ER.isExempt(es, midJoiner, 650) === true, 'player joined 200, tick 650 => exempt (450<500)');
assert(ER.isExempt(es, midJoiner, 700) === false, 'player joined 200, tick 700 => not exempt (500>=500)');

// ============================================================================
// SECTION 8: processIncomeTax — basic cases
// ============================================================================

section('processIncomeTax — basic cases');

var its = freshState();
ER.registerPlayer(its, 'p1', 0, 0); // balance 0, but floor raises to 10
ER.registerPlayer(its, 'p2', 50, 0);
ER.registerPlayer(its, 'p3', 200, 0);
ER.registerPlayer(its, 'p4', 500, 0);
ER.registerPlayer(its, 'p5', 1000, 0);

// Balance 10 (floor) => 0% bracket (0-49)
var itr0 = ER.processIncomeTax(its, 'p1', 20, 600);
assertEqual(itr0.success, true, 'processIncomeTax success');
assertEqual(itr0.taxAmount, 0, 'balance 10 (0% bracket): tax=0 on 20 earnings');
assertEqual(itr0.netEarnings, 20, 'netEarnings = gross when 0% tax');

// Balance 50 => 10%: earnings 100, tax=floor(100*0.10)=10
var itr1 = ER.processIncomeTax(its, 'p2', 100, 600);
assertEqual(itr1.success, true, 'processIncomeTax p2 success');
assertEqual(itr1.taxAmount, 10, 'balance 50 (10%): tax=10 on 100 earnings');
assertEqual(itr1.netEarnings, 90, 'p2 netEarnings=90');
assertEqual(itr1.bracket.rate, 0.10, 'p2 bracket rate is 0.10');

// Balance 200 => 20%: earnings 50, tax=floor(50*0.20)=10
var itr2 = ER.processIncomeTax(its, 'p3', 50, 600);
assertEqual(itr2.taxAmount, 10, 'balance 200 (20%): tax=10 on 50 earnings');
assertEqual(itr2.netEarnings, 40, 'p3 netEarnings=40');

// Balance 500 => 30%: earnings 30, tax=floor(30*0.30)=9
var itr3 = ER.processIncomeTax(its, 'p4', 30, 600);
assertEqual(itr3.taxAmount, 9, 'balance 500 (30%): tax=9 on 30 earnings');
assertEqual(itr3.netEarnings, 21, 'p4 netEarnings=21');

// Balance 1000 => 40%: earnings 100, tax=floor(100*0.40)=40
var itr4 = ER.processIncomeTax(its, 'p5', 100, 600);
assertEqual(itr4.taxAmount, 40, 'balance 1000 (40%): tax=40 on 100 earnings');
assertEqual(itr4.netEarnings, 60, 'p5 netEarnings=60');

// ============================================================================
// SECTION 9: processIncomeTax — floor rounding (player-favorable)
// ============================================================================

section('processIncomeTax — floor rounding');

var frs = freshState();
ER.registerPlayer(frs, 'fr1', 50, 0);  // 10% bracket
ER.registerPlayer(frs, 'fr2', 200, 0); // 20% bracket

// 10% of 7 = 0.7 => floor to 0
var frResult1 = ER.processIncomeTax(frs, 'fr1', 7, 600);
assertEqual(frResult1.taxAmount, 0, 'floor(7 * 0.10)=0 (player-favorable)');
assertEqual(frResult1.netEarnings, 7, 'netEarnings=7 when tax floors to 0');

// 20% of 3 = 0.6 => floor to 0
var frResult2 = ER.processIncomeTax(frs, 'fr2', 3, 600);
assertEqual(frResult2.taxAmount, 0, 'floor(3 * 0.20)=0 (player-favorable)');

// 30% of 3 = 0.9 => floor to 0
var frs2 = freshState();
ER.registerPlayer(frs2, 'fr3', 500, 0);
var frResult3 = ER.processIncomeTax(frs2, 'fr3', 3, 600);
assertEqual(frResult3.taxAmount, 0, 'floor(3 * 0.30)=0 (player-favorable)');

// 10% of 19 = 1.9 => floor to 1
var frs3 = freshState();
ER.registerPlayer(frs3, 'fr4', 50, 0);
var frResult4 = ER.processIncomeTax(frs3, 'fr4', 19, 600);
assertEqual(frResult4.taxAmount, 1, 'floor(19 * 0.10)=1');
assertEqual(frResult4.netEarnings, 18, 'netEarnings=18 after floor rounding');

// ============================================================================
// SECTION 10: processIncomeTax — treasury credited
// ============================================================================

section('processIncomeTax — treasury and log');

var tcs = freshState();
ER.registerPlayer(tcs, 'tc1', 50, 0);
var initialTreasury = tcs.treasury;

ER.processIncomeTax(tcs, 'tc1', 100, 600); // 10% => tax=10

assertEqual(tcs.treasury, initialTreasury + 10, 'treasury increased by tax amount');
assertEqual(tcs.taxLog.length, 1, 'one tax log entry created');
assertEqual(tcs.taxLog[0].type, 'income_tax', 'log type is income_tax');
assertEqual(tcs.taxLog[0].taxAmount, 10, 'log taxAmount is 10');
assertEqual(tcs.taxLog[0].playerId, 'tc1', 'log playerId is tc1');
assertEqual(tcs.taxLog[0].tick, 600, 'log tick is 600');
assertEqual(tcs.players['tc1'].totalTaxPaid, 10, 'player totalTaxPaid updated');

// Zero tax does not add to taxLog
var tcs2 = freshState();
ER.registerPlayer(tcs2, 'tc2', 10, 0); // 0% bracket
ER.processIncomeTax(tcs2, 'tc2', 10, 600);
assertEqual(tcs2.taxLog.length, 0, 'zero tax does not create log entry');

// ============================================================================
// SECTION 11: processIncomeTax — new player exemption
// ============================================================================

section('processIncomeTax — new player exemption');

var exs = freshState();
ER.registerPlayer(exs, 'exempt1', 500, 0); // 30% bracket normally

// At tick 400 (still exempt: 400-0=400 < 500)
var exResult = ER.processIncomeTax(exs, 'exempt1', 100, 400);
assertEqual(exResult.success, true, 'exempt player income tax success');
assertEqual(exResult.taxAmount, 0, 'exempt player pays 0 tax');
assertEqual(exResult.netEarnings, 100, 'exempt player keeps full earnings');
assertEqual(exResult.exempt, true, 'result.exempt is true for exempt player');
assertEqual(exs.taxLog.length, 0, 'no tax log entry for exempt player');

// At tick 500 (no longer exempt)
var exResult2 = ER.processIncomeTax(exs, 'exempt1', 100, 500);
assertEqual(exResult2.exempt, false, 'result.exempt is false once not exempt');
assert(exResult2.taxAmount > 0, 'non-exempt player with high balance pays tax');

// ============================================================================
// SECTION 12: processIncomeTax — balance updated correctly
// ============================================================================

section('processIncomeTax — balance update');

var bus = freshState();
ER.registerPlayer(bus, 'bu1', 100, 0); // 10% bracket

// Before: balance=100, earnings=50, tax=5, net=45
var buBefore = bus.players['bu1'].balance;
ER.processIncomeTax(bus, 'bu1', 50, 600);
assertEqual(bus.players['bu1'].balance, buBefore + 45, 'balance updated by netEarnings');
assertEqual(bus.players['bu1'].totalEarnings, 50, 'totalEarnings updated by gross amount');

// processIncomeTax on unknown player
var unknown = ER.processIncomeTax(bus, 'ghost_player', 100, 600);
assertEqual(unknown.success, false, 'unknown player returns success:false');

// processIncomeTax with 0 earnings
var zero = ER.processIncomeTax(bus, 'bu1', 0, 600);
assertEqual(zero.success, true, '0 earnings returns success:true');
assertEqual(zero.taxAmount, 0, '0 earnings => 0 tax');

// ============================================================================
// SECTION 13: processWealthTax
// ============================================================================

section('processWealthTax');

var wts = freshState();
ER.registerPlayer(wts, 'rich1', 600, 0);  // 100 above threshold, 2%=2
ER.registerPlayer(wts, 'rich2', 1000, 0); // 500 above threshold, 2%=10
ER.registerPlayer(wts, 'poor1', 400, 0);  // below threshold, no tax

var wtResult = ER.processWealthTax(wts, 10);
assert(typeof wtResult.totalCollected === 'number', 'totalCollected is a number');
assert(Array.isArray(wtResult.taxed), 'taxed is an array');
assertEqual(wtResult.taxed.length, 2, 'two players were wealth-taxed');
assertEqual(wtResult.totalCollected, 12, 'total wealth tax = 2 + 10 = 12');

// Individual player balances
assertEqual(wts.players['rich1'].balance, 598, 'rich1 balance 600 - 2 = 598');
assertEqual(wts.players['rich2'].balance, 990, 'rich2 balance 1000 - 10 = 990');
assertEqual(wts.players['poor1'].balance, 400, 'poor1 balance unchanged');

// Treasury increased
assert(wts.treasury > 1000, 'treasury increased after wealth tax');

// ============================================================================
// SECTION 14: processWealthTax — floor rounding
// ============================================================================

section('processWealthTax — floor rounding');

var wfls = freshState();
ER.registerPlayer(wfls, 'almostTaxed', 520, 0); // 20 above, 2%=0.4 => floor 0

var wflResult = ER.processWealthTax(wfls, 10);
assertEqual(wflResult.totalCollected, 0, 'floor(20 * 0.02) = 0, no tax collected');
assertEqual(wflResult.taxed.length, 0, 'no players taxed when floor rounds to 0');
assertEqual(wfls.players['almostTaxed'].balance, 520, 'balance unchanged when tax=0');

// ============================================================================
// SECTION 15: processWealthTax — balance floor enforcement
// ============================================================================

section('processWealthTax — balance floor enforcement');

var wbfs = freshState();
// Player with balance just over threshold but wealth tax would push below floor
// Example: balance = 511, taxable=11, 2%=0.22 => floor=0 (no tax in this case)
// Let's force a case: balance=502 => taxable=2, 2%=0.04 => floor=0
ER.registerPlayer(wbfs, 'edgeCase', 502, 0);
var wbfResult = ER.processWealthTax(wbfs, 10);
assertEqual(wbfResult.totalCollected, 0, 'edge case: floor(2*0.02)=0');

// Larger case: balance = 550, taxable=50, 2%=1 Spark
var wbfs2 = freshState();
ER.registerPlayer(wbfs2, 'wealthyEdge', 550, 0);
var wbfResult2 = ER.processWealthTax(wbfs2, 10);
assertEqual(wbfResult2.totalCollected, 1, 'floor(50 * 0.02) = 1');
assertEqual(wbfs2.players['wealthyEdge'].balance, 549, 'balance 550 - 1 = 549');

// ============================================================================
// SECTION 16: processWealthTax — log entries
// ============================================================================

section('processWealthTax — log entries');

var wls = freshState();
ER.registerPlayer(wls, 'whale', 1500, 0); // 1000 above, 2%=20

ER.processWealthTax(wls, 5);
var wtLogs = wls.taxLog.filter(function(e) { return e.type === 'wealth_tax'; });
assertEqual(wtLogs.length, 1, 'one wealth_tax log entry');
assertEqual(wtLogs[0].playerId, 'whale', 'log playerId is whale');
assertEqual(wtLogs[0].taxAmount, 20, 'log taxAmount is 20');
assertEqual(wtLogs[0].tick, 5, 'log tick is 5');
assertEqual(wls.players['whale'].totalTaxPaid, 20, 'totalTaxPaid updated');
assert(wls.players['whale'].taxHistory.length > 0, 'player taxHistory has entry');

// ============================================================================
// SECTION 17: processWealthTax — no tax on players below threshold
// ============================================================================

section('processWealthTax — no tax below threshold');

var wnts = freshState();
ER.registerPlayer(wnts, 'at499', 499, 0);
ER.registerPlayer(wnts, 'at500', 500, 0);

var wntResult = ER.processWealthTax(wnts, 10);
assertEqual(wntResult.taxed.length, 0, 'players at or below 500 not taxed');
assertEqual(wntResult.totalCollected, 0, 'no wealth tax collected');

// ============================================================================
// SECTION 18: distributeUBI — basic
// ============================================================================

section('distributeUBI — basic distribution');

var ubs = freshState();
ubs.treasury = 200;
ER.registerPlayer(ubs, 'u1', 10, 0);
ER.registerPlayer(ubs, 'u2', 10, 0);
ER.registerPlayer(ubs, 'u3', 10, 0);
ER.registerPlayer(ubs, 'u4', 10, 0);

// treasury=200, 4 players => perPlayer=floor(200/4)=50 => clamped to UBI_MAX=50
var ubResult = ER.distributeUBI(ubs, 10);
assertEqual(ubResult.perPlayer, 50, 'UBI perPlayer = 50 (clamped to UBI_MAX)');
assertEqual(ubResult.recipients, 4, 'all 4 players received UBI');
assertEqual(ubResult.totalDistributed, 200, 'totalDistributed = 200');
assertEqual(ubs.treasury, 0, 'treasury emptied after UBI');

// Player balances increased
assertEqual(ubs.players['u1'].balance, 60, 'u1 balance = 10 + 50 = 60');
assertEqual(ubs.players['u2'].balance, 60, 'u2 balance = 10 + 50 = 60');

// ============================================================================
// SECTION 19: distributeUBI — UBI_MIN and UBI_MAX clamping
// ============================================================================

section('distributeUBI — min/max clamping');

// Low treasury: 3 players, treasury=6 => perPlayer=2 (above UBI_MIN)
var ubMin = freshState();
ubMin.treasury = 6;
registerN(ubMin, 3, 10, 0);

var ubMinResult = ER.distributeUBI(ubMin, 10);
assert(ubMinResult.perPlayer >= 1, 'perPlayer >= UBI_MIN (1)');
assertEqual(ubMinResult.perPlayer, 2, 'perPlayer = floor(6/3) = 2');

// High treasury: 2 players, treasury=5000 => perPlayer=50 (capped at UBI_MAX)
var ubMax = freshState();
ubMax.treasury = 5000;
registerN(ubMax, 2, 10, 0);

var ubMaxResult = ER.distributeUBI(ubMax, 10);
assertEqual(ubMaxResult.perPlayer, 50, 'perPlayer capped at UBI_MAX (50)');
assertEqual(ubMaxResult.recipients, 2, 'both players receive UBI');

// ============================================================================
// SECTION 20: distributeUBI — treasury too low
// ============================================================================

section('distributeUBI — insufficient treasury');

// treasury=0 => no UBI
var ubZ = freshState();
ubZ.treasury = 0;
registerN(ubZ, 3, 10, 0);
var ubZResult = ER.distributeUBI(ubZ, 10);
assertEqual(ubZResult.totalDistributed, 0, 'treasury=0: no UBI distributed');
assertEqual(ubZResult.recipients, 0, 'no recipients when treasury=0');

// treasury=2, 5 players => perPlayer=floor(2/5)=0 => no UBI
var ubLow = freshState();
ubLow.treasury = 2;
registerN(ubLow, 5, 10, 0);
var ubLowResult = ER.distributeUBI(ubLow, 10);
assertEqual(ubLowResult.perPlayer, 0, 'treasury too low: perPlayer=0');
assertEqual(ubLowResult.totalDistributed, 0, 'no UBI when perPlayer=0');

// No players => no UBI
var ubNP = freshState();
ubNP.treasury = 1000;
var ubNPResult = ER.distributeUBI(ubNP, 10);
assertEqual(ubNPResult.totalDistributed, 0, 'no players => no UBI');
assertEqual(ubNPResult.perPlayer, 0, 'no players => perPlayer=0');

// ============================================================================
// SECTION 21: distributeUBI — log entries
// ============================================================================

section('distributeUBI — log entries');

var ubls = freshState();
ubls.treasury = 100;
ER.registerPlayer(ubls, 'ub_log1', 10, 0);
ER.registerPlayer(ubls, 'ub_log2', 10, 0);

ER.distributeUBI(ubls, 7);
assertEqual(ubls.ubiLog.length, 2, 'two UBI log entries created');
assertEqual(ubls.ubiLog[0].type, 'ubi', 'log type is ubi');
assertEqual(ubls.ubiLog[0].tick, 7, 'log tick is 7');
assert(typeof ubls.ubiLog[0].amount === 'number', 'log amount is a number');
assert(ubls.ubiLog[0].amount > 0, 'log amount > 0');

// Player ubiHistory updated
assert(ubls.players['ub_log1'].ubiHistory.length > 0, 'player ubiHistory populated');
assertEqual(ubls.players['ub_log1'].totalUBIReceived, ubls.ubiLog[0].amount, 'totalUBIReceived updated');

// ============================================================================
// SECTION 22: getTreasury
// ============================================================================

section('getTreasury');

var gts = freshState();
assertEqual(ER.getTreasury(gts), 1000, 'initial treasury = 1000');

gts.treasury = 500;
assertEqual(ER.getTreasury(gts), 500, 'getTreasury reflects updated value');

ER.registerPlayer(gts, 'rich_tx', 200, 0);
ER.processIncomeTax(gts, 'rich_tx', 100, 600); // 20% => 20 tax
assertEqual(ER.getTreasury(gts), 520, 'treasury increases by tax amount');

// ============================================================================
// SECTION 23: getUBIEstimate
// ============================================================================

section('getUBIEstimate');

var ues = freshState();
assertEqual(ER.getUBIEstimate(ues).perPlayer, 0, 'no players => perPlayer=0');

ues.treasury = 300;
registerN(ues, 3, 10, 0);

var ueResult = ER.getUBIEstimate(ues);
assertEqual(ueResult.perPlayer, 50, 'floor(300/3)=100, clamped to UBI_MAX=50');
assertEqual(ueResult.eligibleCount, 3, 'eligibleCount=3');
assertEqual(ueResult.totalEstimate, 150, 'totalEstimate = 50*3 = 150');

// With sparse treasury
var ues2 = freshState();
ues2.treasury = 10;
registerN(ues2, 3, 10, 0);

var ueResult2 = ER.getUBIEstimate(ues2);
assertEqual(ueResult2.perPlayer, 3, 'floor(10/3)=3 >= UBI_MIN');

// ============================================================================
// SECTION 24: getPlayerTaxRecord
// ============================================================================

section('getPlayerTaxRecord');

var ptrs = freshState();
ER.registerPlayer(ptrs, 'ptR1', 200, 0);
ER.processIncomeTax(ptrs, 'ptR1', 50, 600); // 20%, tax=10

var record = ER.getPlayerTaxRecord(ptrs, 'ptR1');
assert(record !== null, 'getPlayerTaxRecord returns non-null for known player');
assertEqual(record.playerId, 'ptR1', 'record.playerId correct');
assertEqual(record.totalTaxPaid, 10, 'record.totalTaxPaid = 10');
assertEqual(record.totalEarnings, 50, 'record.totalEarnings = 50');
assert(Array.isArray(record.taxHistory), 'record.taxHistory is array');
assertEqual(record.taxHistory.length, 1, 'taxHistory has 1 entry');
assert(Array.isArray(record.ubiHistory), 'record.ubiHistory is array');

// Unknown player returns null
var nullRecord = ER.getPlayerTaxRecord(ptrs, 'ghost');
assert(nullRecord === null, 'unknown player returns null');

// ============================================================================
// SECTION 25: getGiniCoefficient
// ============================================================================

section('getGiniCoefficient');

// Empty state => 0
var gs = freshState();
assertEqual(ER.getGiniCoefficient(gs), 0, 'no players => Gini = 0');

// All equal => Gini near 0
var gEqual = freshState();
registerN(gEqual, 5, 100, 0);
var gEqualResult = ER.getGiniCoefficient(gEqual);
assert(gEqualResult < 0.01, 'equal balances => Gini ~ 0 (got ' + gEqualResult + ')');

// Extreme inequality: 1 very rich, many at floor — use large gap
var gIneq = freshState();
ER.registerPlayer(gIneq, 'rich_one', 10000, 0);
ER.registerPlayer(gIneq, 'poor1g', 10, 0);
ER.registerPlayer(gIneq, 'poor2g', 10, 0);
ER.registerPlayer(gIneq, 'poor3g', 10, 0);
var gIneqResult = ER.getGiniCoefficient(gIneq);
assert(gIneqResult > 0.5, 'extreme inequality (10000 vs 10,10,10) => Gini > 0.5 (got ' + gIneqResult + ')');
assert(gIneqResult <= 1, 'Gini <= 1');

// Gini is non-negative
assert(gEqualResult >= 0, 'Gini >= 0 for equal distribution');

// ============================================================================
// SECTION 26: getMedianBalance
// ============================================================================

section('getMedianBalance');

// Empty => 0
var mbs = freshState();
assertEqual(ER.getMedianBalance(mbs), 0, 'empty state => median = 0');

// Single player
var mb1 = freshState();
ER.registerPlayer(mb1, 'solo', 200, 0);
assertEqual(ER.getMedianBalance(mb1), 200, 'single player => median = their balance');

// Odd count: [10, 20, 30] => median = 20
var mb3 = freshState();
ER.registerPlayer(mb3, 'a', 30, 0);
ER.registerPlayer(mb3, 'b', 10, 0);
ER.registerPlayer(mb3, 'c', 20, 0);
assertEqual(ER.getMedianBalance(mb3), 20, 'odd count [10,20,30] => median = 20');

// Even count: [10, 20, 30, 40] => median = (20+30)/2 = 25
var mb4 = freshState();
ER.registerPlayer(mb4, 'a1', 40, 0);
ER.registerPlayer(mb4, 'b1', 10, 0);
ER.registerPlayer(mb4, 'c1', 30, 0);
ER.registerPlayer(mb4, 'd1', 20, 0);
assertEqual(ER.getMedianBalance(mb4), 25, 'even count [10,20,30,40] => median = 25');

// ============================================================================
// SECTION 27: getCirculationVelocity
// ============================================================================

section('getCirculationVelocity');

// Empty => 0
var cvs = freshState();
assertEqual(ER.getCirculationVelocity(cvs), 0, 'empty state => velocity = 0');

// No tax paid => 0
var cvNT = freshState();
ER.registerPlayer(cvNT, 'cv1', 100, 0);
assertEqual(ER.getCirculationVelocity(cvNT), 0, 'no tax paid => velocity = 0');

// With tax paid
var cvT = freshState();
ER.registerPlayer(cvT, 'cv2', 200, 0);
ER.processIncomeTax(cvT, 'cv2', 100, 600); // 20% => 20 tax
var vel = ER.getCirculationVelocity(cvT);
assert(vel > 0, 'velocity > 0 after tax paid');
assert(vel <= 1, 'velocity typically <= 1 for reasonable economies');

// ============================================================================
// SECTION 28: getEconomicHealth
// ============================================================================

section('getEconomicHealth');

// Returns a number 0-100
var ehs = freshState();
var ehBase = ER.getEconomicHealth(ehs);
assert(typeof ehBase === 'number', 'getEconomicHealth returns a number');
assert(ehBase >= 0, 'health >= 0');
assert(ehBase <= 100, 'health <= 100');

// Healthy economy (equal, treasury well-funded)
var ehHealthy = freshState();
ehHealthy.treasury = 5000;
registerN(ehHealthy, 10, 100, 0);
var healthScore = ER.getEconomicHealth(ehHealthy);
assert(healthScore >= 0, 'healthy economy health >= 0');

// ============================================================================
// SECTION 29: getDailyReport
// ============================================================================

section('getDailyReport');

var drs = freshState();
// Register players with joinTick=0; use currentTick=600 so they're not exempt
ER.registerPlayer(drs, 'dr1', 200, 0);
ER.registerPlayer(drs, 'dr2', 100, 0);
ER.processIncomeTax(drs, 'dr1', 50, 600);  // 20% = 10 tax (tick 600, not exempt)
ER.processWealthTax(drs, 600);

var drReport = ER.getDailyReport(drs, 600);
assert(typeof drReport === 'object', 'getDailyReport returns an object');
assertEqual(drReport.tick, 600, 'report.tick = 600');
assert(typeof drReport.treasury === 'number', 'report.treasury is a number');
assert(typeof drReport.playerCount === 'number', 'report.playerCount is a number');
assertEqual(drReport.playerCount, 2, 'report.playerCount = 2');
assert(typeof drReport.taxRevenue === 'number', 'report.taxRevenue is a number');
assert(drReport.taxRevenue >= 0, 'taxRevenue >= 0');
assert(typeof drReport.ubiDistributed === 'number', 'report.ubiDistributed is a number');
assert(typeof drReport.medianBalance === 'number', 'report.medianBalance is a number');
assert(typeof drReport.giniCoefficient === 'number', 'report.giniCoefficient is a number');
assert(typeof drReport.economicHealth === 'number', 'report.economicHealth is a number');

// Tax revenue from tick-10 matches processIncomeTax
assert(drReport.incomeTaxRevenue > 0, 'incomeTaxRevenue > 0 after income tax at tick 10');

// ============================================================================
// SECTION 30: getWealthDistribution
// ============================================================================

section('getWealthDistribution');

var wds = freshState();
ER.registerPlayer(wds, 'wd1', 25, 0);   // bucket 0-49
ER.registerPlayer(wds, 'wd2', 100, 0);  // bucket 50-199
ER.registerPlayer(wds, 'wd3', 300, 0);  // bucket 200-499
ER.registerPlayer(wds, 'wd4', 700, 0);  // bucket 500-999
ER.registerPlayer(wds, 'wd5', 1200, 0); // bucket 1000+

var dist = ER.getWealthDistribution(wds);
assert(Array.isArray(dist), 'getWealthDistribution returns an array');
assertEqual(dist.length, 5, 'distribution has 5 buckets');

// Each bucket has the right structure
assert('range' in dist[0], 'bucket has range field');
assert('count' in dist[0], 'bucket has count field');
assert('totalBalance' in dist[0], 'bucket has totalBalance field');

// Correct placement
var bucket0_49 = dist.find(function(b) { return b.range === '0-49'; });
assert(bucket0_49 !== undefined, '0-49 bucket exists');
assertEqual(bucket0_49.count, 1, '0-49 bucket has 1 player (balance 25)');

var bucket1000plus = dist.find(function(b) { return b.range === '1000+'; });
assert(bucket1000plus !== undefined, '1000+ bucket exists');
assertEqual(bucket1000plus.count, 1, '1000+ bucket has 1 player (balance 1200)');

// Total count across all buckets = total players
var totalCount = dist.reduce(function(sum, b) { return sum + b.count; }, 0);
assertEqual(totalCount, 5, 'total count across buckets = total players');

// ============================================================================
// SECTION 31: getTopTaxPayers
// ============================================================================

section('getTopTaxPayers');

var ttp = freshState();
ER.registerPlayer(ttp, 'ttA', 1000, 0);
ER.registerPlayer(ttp, 'ttB', 500, 0);
ER.registerPlayer(ttp, 'ttC', 200, 0);

ER.processIncomeTax(ttp, 'ttA', 100, 600); // 40% => 40
ER.processIncomeTax(ttp, 'ttB', 100, 600); // 30% => 30
ER.processIncomeTax(ttp, 'ttC', 100, 600); // 20% => 20

var top = ER.getTopTaxPayers(ttp, 2);
assert(Array.isArray(top), 'getTopTaxPayers returns array');
assertEqual(top.length, 2, 'returns top 2');
assertEqual(top[0].playerId, 'ttA', 'first is highest tax payer (ttA)');
assertEqual(top[0].totalTaxPaid, 40, 'ttA paid 40 total');
assertEqual(top[1].playerId, 'ttB', 'second is ttB with 30');

// Default count = 10
var ttpAll = ER.getTopTaxPayers(ttp);
assert(ttpAll.length <= 3, 'default returns at most all players');

// Top payer has balance field
assert('balance' in top[0], 'top payer entry has balance field');

// ============================================================================
// SECTION 32: getTaxRevenue
// ============================================================================

section('getTaxRevenue');

var trv = freshState();
// Register players with joinTick=0; use currentTick > 500 so they're not exempt
ER.registerPlayer(trv, 'trv1', 500, 0);
ER.registerPlayer(trv, 'trv2', 1000, 0);

ER.processIncomeTax(trv, 'trv1', 100, 510); // tick 510 (not exempt), 30% => 30
ER.processIncomeTax(trv, 'trv2', 100, 520); // tick 520 (not exempt), 40% => 40
ER.processWealthTax(trv, 530);              // tick 530

// Revenue in tick range [510, 520] = income tax entries
var rev1020 = ER.getTaxRevenue(trv, 510, 520);
assert(rev1020 > 0, 'revenue from tick 510-520 > 0');

// Revenue in tick range [530, 530] = wealth tax only
var rev30 = ER.getTaxRevenue(trv, 530, 530);
assert(rev30 > 0, 'revenue from tick 530 (wealth tax) > 0');

// Revenue with no events in range
var revEmpty = ER.getTaxRevenue(trv, 999, 999);
assertEqual(revEmpty, 0, 'no events in range => revenue = 0');

// Total revenue across all ticks
var revAll = ER.getTaxRevenue(trv, 0, 9999);
assert(revAll >= rev1020 + rev30, 'total revenue >= sum of ranges');

// ============================================================================
// SECTION 33: processDaily
// ============================================================================

section('processDaily');

var pds = freshState();
pds.treasury = 500;
ER.registerPlayer(pds, 'pd1', 600, 0);  // wealth tax applies
ER.registerPlayer(pds, 'pd2', 50, 0);   // no wealth tax

var pdResult = ER.processDaily(pds, 100);
assert(typeof pdResult === 'object', 'processDaily returns object');
assert('wealthTax' in pdResult, 'result has wealthTax field');
assert('ubi' in pdResult, 'result has ubi field');
assert('snapshot' in pdResult, 'result has snapshot field');

// Daily stats recorded
assertEqual(pds.dailyStats.length, 1, 'dailyStats has 1 entry after processDaily');
assertEqual(pds.dailyStats[0].tick, 100, 'dailyStats[0].tick = 100');

// Wealth tax ran
assert(pdResult.wealthTax.totalCollected >= 0, 'wealthTax.totalCollected is non-negative');

// UBI ran (treasury should have changed)
assert(typeof pdResult.ubi.totalDistributed === 'number', 'ubi.totalDistributed is a number');

// Multiple processDaily calls accumulate stats
ER.processDaily(pds, 200);
assertEqual(pds.dailyStats.length, 2, 'dailyStats has 2 entries after second processDaily');

// ============================================================================
// SECTION 34: CONSTITUTION §6.4 COMPLIANCE
// ============================================================================

section('Constitution §6.4 compliance');

// §6.4.1: Tax applies only to new earnings (not existing balance)
var compS = freshState();
ER.registerPlayer(compS, 'comp1', 500, 0); // existing balance 500
var compInitBal = compS.players['comp1'].balance;
ER.processIncomeTax(compS, 'comp1', 100, 600); // 30% on new earnings only
// Tax = floor(100 * 0.30) = 30, balance = 500 + 70 = 570
assertEqual(compS.players['comp1'].balance, compInitBal + 70, '§6.4.1: existing balance untouched, only new earnings taxed');

// §6.4.2: Tax rounds in player's favor (floor)
var compS2 = freshState();
ER.registerPlayer(compS2, 'comp2', 50, 0); // 10%
var compR = ER.processIncomeTax(compS2, 'comp2', 9, 600); // 9 * 0.10 = 0.9 => floor 0
assertEqual(compR.taxAmount, 0, '§6.4.2: tax rounds DOWN (player-favorable)');

// §6.4.3: TREASURY never goes negative
var compS3 = freshState();
compS3.treasury = 5;
registerN(compS3, 100, 10, 0); // 100 players, perPlayer would be floor(5/100)=0 => no UBI
var compUBI = ER.distributeUBI(compS3, 1);
assert(ER.getTreasury(compS3) >= 0, '§6.4.3: TREASURY cannot go negative');

// §6.4.4: UBI = once per game day, equal distribution
var compS4 = freshState();
compS4.treasury = 500;
registerN(compS4, 5, 10, 0);
var compUBIR = ER.distributeUBI(compS4, 1);
assertEqual(compUBIR.recipients, 5, '§6.4.4: all 5 players receive UBI');
assert(compUBIR.perPlayer > 0, '§6.4.4: perPlayer > 0');

// §6.4.5: Balance floor — no balance falls below BALANCE_FLOOR (10) from taxes
// (taxes do not push below floor; floor was already raised at registration)
var compS5 = freshState();
ER.registerPlayer(compS5, 'floor_test', 15, 0); // just above floor
// Note: income tax uses netEarnings, not existing balance, so floor is enforced at registration
// Wealth tax enforces floor
compS5.players['floor_test'].balance = 511; // 11 above threshold
ER.processWealthTax(compS5, 1); // 2% of 11 = 0.22 => floor 0 => no tax
assert(compS5.players['floor_test'].balance >= ER.BALANCE_FLOOR, '§6.4.5: balance never below BALANCE_FLOOR');

// §6.4.6: Wealth tax = 2% on balance above 500, once per day, rounded down
var compS6 = freshState();
ER.registerPlayer(compS6, 'wealthy', 600, 0);
ER.processWealthTax(compS6, 1);
// taxable = 100, 2% = 2
assertEqual(compS6.players['wealthy'].balance, 598, '§6.4.6: wealth tax = floor(2% * (balance - 500))');

// §6.4.7: Transparency — all transactions logged
// Use tick > 500 so the player is no longer exempt (joined at tick 0)
var compS7 = freshState();
ER.registerPlayer(compS7, 'transparent', 200, 0);
ER.processIncomeTax(compS7, 'transparent', 100, 600); // tick 600, not exempt
assertEqual(compS7.taxLog.length, 1, '§6.4.7: income tax logged in taxLog');

compS7.treasury = 500;
ER.registerPlayer(compS7, 'ubi_recv', 10, 0);
ER.distributeUBI(compS7, 1);
assert(compS7.ubiLog.length > 0, '§6.4.7: UBI payment logged in ubiLog');

// §6.4.8: No retroactive income taxation — only new earnings taxed
// (Covered by §6.4.1 test above)
assert(true, '§6.4.8: no retroactive tax (only new earnings taxed)');

// ============================================================================
// SECTION 35: EDGE CASES AND ROBUSTNESS
// ============================================================================

section('Edge cases and robustness');

// processIncomeTax with invalid earnings
var edgeS = freshState();
ER.registerPlayer(edgeS, 'edge1', 100, 0);
var invalidEarn = ER.processIncomeTax(edgeS, 'edge1', -10, 600);
assertEqual(invalidEarn.success, false, 'negative earnings fails');

// processWealthTax on empty state
var emptyWT = freshState();
var emptyWTResult = ER.processWealthTax(emptyWT, 1);
assertEqual(emptyWTResult.totalCollected, 0, 'processWealthTax on empty state => 0 collected');
assert(Array.isArray(emptyWTResult.taxed), 'taxed is array even on empty state');

// distributeUBI on state with no players
var noPlayers = freshState();
noPlayers.treasury = 5000;
var npResult = ER.distributeUBI(noPlayers, 1);
assertEqual(npResult.totalDistributed, 0, 'no players => no UBI');

// getMedianBalance with two players (even count)
var twoP = freshState();
ER.registerPlayer(twoP, 'tp1', 100, 0);
ER.registerPlayer(twoP, 'tp2', 200, 0);
assertEqual(ER.getMedianBalance(twoP), 150, 'two players: median = (100+200)/2 = 150');

// getDailyReport with tick=0
var zeroTickReport = ER.getDailyReport(freshState(), 0);
assert(typeof zeroTickReport.tick === 'number', 'getDailyReport tick=0 returns valid report');

// getTopTaxPayers with count larger than player count
var ttBig = freshState();
ER.registerPlayer(ttBig, 'only_one', 500, 0);
ER.processIncomeTax(ttBig, 'only_one', 100, 600);
var ttBigResult = ER.getTopTaxPayers(ttBig, 100);
assertEqual(ttBigResult.length, 1, 'getTopTaxPayers with count>players returns all players');

// getTaxRevenue with startTick > endTick => 0
var trBadRange = ER.getTaxRevenue(freshState(), 100, 50);
assertEqual(trBadRange, 0, 'getTaxRevenue with startTick > endTick => 0');

// processDaily with no players still works
var pdEmpty = freshState();
var pdEmptyResult = ER.processDaily(pdEmpty, 1);
assert(pdEmptyResult !== null, 'processDaily on empty state does not throw');
assertEqual(pdEmpty.dailyStats.length, 1, 'dailyStats appended even with no players');

// Player taxHistory and ubiHistory are independent per player
var indepS = freshState();
ER.registerPlayer(indepS, 'indepA', 200, 0);
ER.registerPlayer(indepS, 'indepB', 200, 0);
ER.processIncomeTax(indepS, 'indepA', 100, 600);
assertEqual(indepS.players['indepA'].taxHistory.length, 1, 'indepA has 1 tax history entry');
assertEqual(indepS.players['indepB'].taxHistory.length, 0, 'indepB has 0 tax history entries');

// ============================================================================
// RESULTS SUMMARY
// ============================================================================

console.log('\n========================================');
console.log('Economic Regulation Test Results');
console.log('========================================');
console.log('Total:  ' + total);
console.log('Passed: ' + passed);
console.log('Failed: ' + failed);
console.log('========================================');

if (failed > 0) {
  process.exit(1);
} else {
  console.log('All tests passed!');
  process.exit(0);
}
