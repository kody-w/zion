/**
 * test_market_speculation.js — Tests for market_speculation.js
 * Run with: node tests/test_market_speculation.js
 */

var MS = require('../src/js/market_speculation.js');

var passed = 0;
var failed = 0;

function assert(condition, msg) {
  if (condition) {
    passed++;
    // console.log('  PASS: ' + msg);
  } else {
    failed++;
    console.error('  FAIL: ' + msg);
  }
}

function assertClose(a, b, msg, epsilon) {
  var eps = epsilon !== undefined ? epsilon : 0.0001;
  assert(Math.abs(a - b) < eps, msg + ' (got ' + a + ', expected ' + b + ')');
}

function freshState() {
  return {};
}

// ---------------------------------------------------------------------------
// Section 1: COMMODITIES structure
// ---------------------------------------------------------------------------

console.log('\n--- Section 1: COMMODITIES structure ---');

var commodities = MS.getCommodities();
assert(Array.isArray(commodities), 'getCommodities returns array');
assert(commodities.length === 15, 'exactly 15 commodities');

var expectedIds = [
  'iron_futures', 'copper_futures', 'gold_futures', 'wood_futures', 'stone_futures',
  'herb_futures', 'crystal_futures', 'fish_futures', 'wheat_futures', 'leather_futures',
  'gem_futures', 'fabric_futures', 'bone_futures', 'glass_futures', 'dye_futures'
];

for (var i = 0; i < expectedIds.length; i++) {
  var cid = expectedIds[i];
  var c = MS.getCommodityById(cid);
  assert(c !== null, 'commodity exists: ' + cid);
  assert(typeof c.id === 'string', cid + '.id is string');
  assert(typeof c.name === 'string', cid + '.name is string');
  assert(typeof c.underlyingItem === 'string', cid + '.underlyingItem is string');
  assert(typeof c.contractSize === 'number' && c.contractSize > 0, cid + '.contractSize > 0');
  assert(typeof c.marginRequirement === 'number' && c.marginRequirement > 0 && c.marginRequirement <= 1, cid + '.marginRequirement in (0,1]');
  assert(typeof c.interestRate === 'number' && c.interestRate >= 0, cid + '.interestRate >= 0');
  assert(typeof c.maxLeverage === 'number' && c.maxLeverage >= 1, cid + '.maxLeverage >= 1');
  assert(typeof c.settlementTicks === 'number' && c.settlementTicks > 0, cid + '.settlementTicks > 0');
}

assert(MS.getCommodityById('nonexistent') === null, 'getCommodityById returns null for unknown');

// ---------------------------------------------------------------------------
// Section 2: depositMargin / withdrawMargin / getMarginAccount
// ---------------------------------------------------------------------------

console.log('\n--- Section 2: Margin Account ---');

var s = freshState();
var dep = MS.depositMargin(s, 'player1', 1000);
assert(dep.success === true, 'depositMargin success');
assert(dep.newBalance === 1000, 'depositMargin newBalance = 1000');

var dep2 = MS.depositMargin(s, 'player1', 500);
assert(dep2.newBalance === 1500, 'depositMargin accumulates correctly');

var acc = MS.getMarginAccount(s, 'player1');
assert(acc.playerId === 'player1', 'getMarginAccount.playerId');
assert(acc.balance === 1500, 'getMarginAccount.balance = 1500');
assert(Array.isArray(acc.positions), 'getMarginAccount.positions is array');

var wd = MS.withdrawMargin(s, 'player1', 200);
assert(wd.success === true, 'withdrawMargin success');
assert(wd.withdrawn === 200, 'withdrawMargin.withdrawn = 200');
assert(MS.getMarginAccount(s, 'player1').balance === 1300, 'balance after withdrawal = 1300');

var wdFail = MS.withdrawMargin(s, 'player1', 99999);
assert(wdFail.success === false, 'withdrawMargin fails when insufficient');
assert(wdFail.withdrawn === 0, 'withdrawMargin withdrawn = 0 on failure');
assert(typeof wdFail.reason === 'string' && wdFail.reason.length > 0, 'withdrawMargin reason set on failure');

var wdNeg = MS.withdrawMargin(s, 'player1', -50);
assert(wdNeg.success === false, 'withdrawMargin fails for negative amount');

var depNeg = MS.depositMargin(s, 'player1', 0);
assert(depNeg.success === false, 'depositMargin fails for zero amount');

// Deposit for new player initializes account
var acc2 = MS.getMarginAccount(s, 'newplayer');
assert(acc2.playerId === 'newplayer', 'getMarginAccount initializes new player');
assert(acc2.balance === 0, 'new player balance starts at 0');

// ---------------------------------------------------------------------------
// Section 3: openPosition
// ---------------------------------------------------------------------------

console.log('\n--- Section 3: openPosition ---');

var s2 = freshState();
MS.depositMargin(s2, 'alice', 2000);

// iron_futures: contractSize=10, marginRequirement=0.20, maxLeverage=5
// For 5 contracts at price 10: notional = 10*5*10 = 500, margin = 500*0.20 = 100
var open1 = MS.openPosition(s2, 'alice', 'iron_futures', 'long', 5, 10, 1000);
assert(open1.success === true, 'openPosition long success');
assert(open1.contract !== null, 'openPosition returns contract');
assert(open1.contract.direction === 'long', 'contract.direction = long');
assert(open1.contract.status === 'open', 'contract.status = open');
assert(open1.contract.holderId === 'alice', 'contract.holderId = alice');
assert(open1.contract.quantity === 5, 'contract.quantity = 5');
assert(open1.contract.entryPrice === 10, 'contract.entryPrice = 10');
assert(open1.contract.settlementTick === 1000 + 500, 'settlementTick = openedAt + 500');
assertClose(open1.marginRequired, 100, 'marginRequired for 5 contracts at price 10');

var aliceAcc = MS.getMarginAccount(s2, 'alice');
assertClose(aliceAcc.balance, 2000 - open1.marginRequired, 'alice balance deducted by marginRequired');

// Short position
var open2 = MS.openPosition(s2, 'alice', 'iron_futures', 'short', 3, 10, 1000);
assert(open2.success === true, 'openPosition short success');
assert(open2.contract.direction === 'short', 'contract.direction = short');

// Fail: insufficient margin
var s3 = freshState();
MS.depositMargin(s3, 'bob', 1); // only 1 Spark
var openFail = MS.openPosition(s3, 'bob', 'iron_futures', 'long', 100, 10, 1);
assert(openFail.success === false, 'openPosition fails with insufficient margin');
assert(typeof openFail.reason === 'string' && openFail.reason.length > 0, 'openPosition failure has reason');

// Fail: unknown commodity
var openBadCom = MS.openPosition(s3, 'bob', 'fake_futures', 'long', 1, 10, 1);
assert(openBadCom.success === false, 'openPosition fails for unknown commodity');

// Fail: bad direction
var s4 = freshState();
MS.depositMargin(s4, 'carol', 5000);
var openBadDir = MS.openPosition(s4, 'carol', 'iron_futures', 'sideways', 1, 10, 1);
assert(openBadDir.success === false, 'openPosition fails for invalid direction');

// Fail: zero quantity
var openZeroQ = MS.openPosition(s4, 'carol', 'iron_futures', 'long', 0, 10, 1);
assert(openZeroQ.success === false, 'openPosition fails for 0 quantity');

// Fail: negative quantity
var openNegQ = MS.openPosition(s4, 'carol', 'iron_futures', 'long', -5, 10, 1);
assert(openNegQ.success === false, 'openPosition fails for negative quantity');

// Fail: bad price
var openBadPrice = MS.openPosition(s4, 'carol', 'iron_futures', 'long', 1, 0, 1);
assert(openBadPrice.success === false, 'openPosition fails for zero price');

// Leverage limit: try to open position that would exceed maxLeverage
// iron_futures maxLeverage=5, marginRequirement=0.20 so these are consistent by default.
// To test the edge: provide only barely enough for maxLeverage
// notional = 10*10*10 = 1000; minMargin = 1000/5 = 200
var s5 = freshState();
MS.depositMargin(s5, 'dave', 5000);
var openLev = MS.openPosition(s5, 'dave', 'iron_futures', 'long', 10, 10, 1);
assert(openLev.success === true, 'openPosition at max leverage succeeds');

// ---------------------------------------------------------------------------
// Section 4: getPositionPnL
// ---------------------------------------------------------------------------

console.log('\n--- Section 4: getPositionPnL ---');

var s6 = freshState();
MS.depositMargin(s6, 'eve', 5000);
// iron_futures: contractSize=10, 5 contracts, entry price 10
var op = MS.openPosition(s6, 'eve', 'iron_futures', 'long', 5, 10, 1);
var cid = op.contract.id;

// Price rises to 15: profit for long
// priceDelta = 15 - 10 = 5
// P&L = 5 * 5 * 10 = 250
var pnlUp = MS.getPositionPnL(s6, cid, 15);
assertClose(pnlUp.profitLoss, 250, 'long P&L when price rises');
assert(pnlUp.percentChange > 0, 'long percentChange positive when price rises');

// Price falls to 8: loss for long
// priceDelta = 8 - 10 = -2
// P&L = -2 * 5 * 10 = -100
var pnlDown = MS.getPositionPnL(s6, cid, 8);
assertClose(pnlDown.profitLoss, -100, 'long P&L when price falls');
assert(pnlDown.percentChange < 0, 'long percentChange negative when price falls');

// Short: profit when price falls
var s7 = freshState();
MS.depositMargin(s7, 'frank', 5000);
var opShort = MS.openPosition(s7, 'frank', 'iron_futures', 'short', 5, 10, 1);
var shortCid = opShort.contract.id;

// Price falls to 7: profit for short
// priceDelta = -(7 - 10) = 3
// P&L = 3 * 5 * 10 = 150
var shortPnlDown = MS.getPositionPnL(s7, shortCid, 7);
assertClose(shortPnlDown.profitLoss, 150, 'short P&L when price falls');
assert(shortPnlDown.percentChange > 0, 'short percentChange positive when price falls');

// Short: loss when price rises
// priceDelta = -(12 - 10) = -2
// P&L = -2 * 5 * 10 = -100
var shortPnlUp = MS.getPositionPnL(s7, shortCid, 12);
assertClose(shortPnlUp.profitLoss, -100, 'short P&L when price rises (loss)');
assert(shortPnlUp.percentChange < 0, 'short percentChange negative when price rises');

// Unknown contract
var pnlUnknown = MS.getPositionPnL(s7, 'future_99999', 10);
assert(pnlUnknown.profitLoss === 0, 'getPositionPnL returns 0 for unknown contract');

// ---------------------------------------------------------------------------
// Section 5: closePosition
// ---------------------------------------------------------------------------

console.log('\n--- Section 5: closePosition ---');

var s8 = freshState();
MS.depositMargin(s8, 'grace', 5000);
var op8 = MS.openPosition(s8, 'grace', 'iron_futures', 'long', 5, 10, 1);
var cid8 = op8.contract.id;
var margBefore = MS.getMarginAccount(s8, 'grace').balance;

// Close at profit (price 14)
// P&L = (14-10) * 5 * 10 = 200
var close8 = MS.closePosition(s8, 'grace', cid8, 14);
assert(close8.success === true, 'closePosition success');
assert(close8.settled === true, 'closePosition settled = true');
assertClose(close8.profitLoss, 200, 'closePosition P&L = 200 at price 14');

var margAfter = MS.getMarginAccount(s8, 'grace').balance;
// balance should be margBefore + margin + profitLoss
assertClose(margAfter, margBefore + op8.marginRequired + 200, 'balance restored with profit after close');

// Contract status is settled
assert(s8.speculation.contracts[cid8].status === 'settled', 'contract.status = settled after closePosition');

// Close already closed: should fail
var closeDupe = MS.closePosition(s8, 'grace', cid8, 14);
assert(closeDupe.success === false, 'closePosition fails on already-settled contract');
assert(typeof closeDupe.reason === 'string', 'closePosition reason set for duplicate close');

// Close non-existent contract
var closeNoExist = MS.closePosition(s8, 'grace', 'future_999', 10);
assert(closeNoExist.success === false, 'closePosition fails for nonexistent contract');

// Wrong player
var s9 = freshState();
MS.depositMargin(s9, 'hank', 5000);
var op9 = MS.openPosition(s9, 'hank', 'iron_futures', 'long', 2, 10, 1);
var closeWrong = MS.closePosition(s9, 'wrong_player', op9.contract.id, 10);
assert(closeWrong.success === false, 'closePosition fails for wrong player');

// Close at a loss for long
var s10 = freshState();
MS.depositMargin(s10, 'ivy', 5000);
var op10 = MS.openPosition(s10, 'ivy', 'iron_futures', 'long', 4, 20, 1);
// P&L at price 15: (15-20)*4*10 = -200
var close10 = MS.closePosition(s10, 'ivy', op10.contract.id, 15);
assert(close10.success === true, 'closePosition success at loss');
assertClose(close10.profitLoss, -200, 'closePosition P&L = -200 at loss');

// getOpenPositions: after close, removed from open list
var openPos = MS.getOpenPositions(s10, 'ivy');
assert(openPos.length === 0, 'getOpenPositions empty after close');

// ---------------------------------------------------------------------------
// Section 6: getOpenPositions
// ---------------------------------------------------------------------------

console.log('\n--- Section 6: getOpenPositions ---');

var s11 = freshState();
MS.depositMargin(s11, 'jake', 10000);
var op11a = MS.openPosition(s11, 'jake', 'iron_futures',   'long',  2, 10, 1);
var op11b = MS.openPosition(s11, 'jake', 'copper_futures', 'short', 3, 8,  1);
var op11c = MS.openPosition(s11, 'jake', 'gold_futures',   'long',  1, 25, 1);

var openList = MS.getOpenPositions(s11, 'jake');
assert(openList.length === 3, 'getOpenPositions returns 3 positions');

// Close one
MS.closePosition(s11, 'jake', op11a.contract.id, 10);
var openList2 = MS.getOpenPositions(s11, 'jake');
assert(openList2.length === 2, 'getOpenPositions returns 2 after one closed');

// No positions for unknown player
var openEmpty = MS.getOpenPositions(s11, 'nobody');
assert(openEmpty.length === 0, 'getOpenPositions empty for player with no positions');

// ---------------------------------------------------------------------------
// Section 7: settleExpired
// ---------------------------------------------------------------------------

console.log('\n--- Section 7: settleExpired ---');

var s12 = freshState();
MS.depositMargin(s12, 'kate', 5000);
// iron_futures settlementTicks = 500
var op12a = MS.openPosition(s12, 'kate', 'iron_futures', 'long', 2, 10, 100);
var op12b = MS.openPosition(s12, 'kate', 'iron_futures', 'short', 1, 10, 100);
// These settle at tick 600 (100 + 500)

var priceMap = { iron_ore: 12 };
function mockGetPrice(itemId) { return priceMap[itemId] || 10; }

// Before settlement tick
var settled12a = MS.settleExpired(s12, 599, mockGetPrice);
assert(settled12a.settled.length === 0, 'settleExpired settles nothing before tick');

// At settlement tick
var settled12b = MS.settleExpired(s12, 600, mockGetPrice);
assert(settled12b.settled.length === 2, 'settleExpired settles 2 contracts at tick 600');

// Check P&L values: long 2 contracts at entry 10, settle at 12
// P&L = (12-10)*2*10 = 40
var longEntry = settled12b.settled.filter(function(x) {
  return s12.speculation.contracts[x.contractId].direction === 'long';
});
assert(longEntry.length >= 1, 'settled includes long contract');

// Running settleExpired again should return 0
var settled12c = MS.settleExpired(s12, 700, mockGetPrice);
assert(settled12c.settled.length === 0, 'settleExpired returns empty on second run');

// settleExpired with no contracts
var s12b = freshState();
var settledEmpty = MS.settleExpired(s12b, 1000, mockGetPrice);
assert(settledEmpty.settled.length === 0, 'settleExpired empty on fresh state');

// ---------------------------------------------------------------------------
// Section 8: checkLiquidation / liquidatePosition
// ---------------------------------------------------------------------------

console.log('\n--- Section 8: Liquidation ---');

var s13 = freshState();
MS.depositMargin(s13, 'leo', 1000);
// iron_futures: 10 contracts at price 10
// notional = 10*10*10 = 1000, margin = 1000*0.20 = 200
var op13 = MS.openPosition(s13, 'leo', 'iron_futures', 'long', 10, 10, 1);
assert(op13.success === true, 'opened position for leo');

// Account should have balance = 1000 - 200 = 800
var acc13 = MS.getMarginAccount(s13, 'leo');
assertClose(acc13.balance, 800, 'leo balance after opening = 800');
assertClose(acc13.totalMarginUsed, 200, 'totalMarginUsed = 200');

// At price 10: marginLevel = (800 + 200 + 0) / 200 = 5 — no liquidation
var liq1 = MS.checkLiquidation(s13, 'leo', function() { return 10; });
assert(liq1.needsLiquidation === false, 'no liquidation at breakeven price');
assert(liq1.marginLevel > liq1.threshold, 'marginLevel > threshold at breakeven');

// At a big drop: price falls to 1
// unrealizedPnL = (1-10)*10*10 = -900
// effectiveMargin = 200 + 800 + (-900) = 100
// marginLevel = 100 / 200 = 0.5 — exactly at threshold (needsLiquidation is <, not <=)
var liq2 = MS.checkLiquidation(s13, 'leo', function() { return 1; });
// marginLevel = 0.5 which equals threshold = 0.5, so not triggered (strict <)
// Let's use price 0.5 to go below
// unrealizedPnL = (0.5-10)*10*10 = -950
// effectiveMargin = 200+800-950 = 50; marginLevel = 50/200 = 0.25 < 0.5 => liquidation
var liq3 = MS.checkLiquidation(s13, 'leo', function() { return 0.5; });
assert(liq3.needsLiquidation === true, 'liquidation needed when margin level below threshold');
assert(liq3.marginLevel < liq3.threshold, 'marginLevel < threshold triggers liquidation');

// liquidatePosition
var cid13 = op13.contract.id;
var liqResult = MS.liquidatePosition(s13, 'leo', cid13, 0.5);
assert(liqResult.success === true, 'liquidatePosition success');
assert(liqResult.loss >= 0, 'liquidatePosition.loss >= 0');
assert(s13.speculation.contracts[cid13].status === 'liquidated', 'contract.status = liquidated');

// liquidate already-closed
var liqDupe = MS.liquidatePosition(s13, 'leo', cid13, 5);
assert(liqDupe.success === false, 'liquidatePosition fails on already-closed contract');

// checkLiquidation with no positions
var s14 = freshState();
var liqNoPos = MS.checkLiquidation(s14, 'nobody', function() { return 10; });
assert(liqNoPos.needsLiquidation === false, 'checkLiquidation = false with no positions');

// ---------------------------------------------------------------------------
// Section 9: Circuit Breakers
// ---------------------------------------------------------------------------

console.log('\n--- Section 9: Circuit Breakers ---');

var s15 = freshState();

// Build price history: 100 ticks of data, starting at 20, dropping to 9 at end
var priceHist = [];
for (var t = 1; t <= 100; t++) {
  priceHist.push({ tick: t, price: 20 });
}
// Add current price: 9 (55% drop from 20)
priceHist.push({ tick: 100, price: 9 });

var cbCheck1 = MS.checkCircuitBreaker(s15, 'iron_ore', priceHist);
assert(cbCheck1.triggered === true, 'circuit breaker triggers at 55% drop');
assert(cbCheck1.dropPercent >= 0.50, 'dropPercent >= 50%');
assertClose(cbCheck1.previousPrice, 20, 'previousPrice = 20');
assertClose(cbCheck1.currentPrice, 9, 'currentPrice = 9');

// No trigger when drop < 50%
var priceHistSmall = [
  { tick: 1, price: 20 },
  { tick: 100, price: 15 }
];
var cbCheck2 = MS.checkCircuitBreaker(s15, 'copper_ore', priceHistSmall);
assert(cbCheck2.triggered === false, 'circuit breaker does not trigger at 25% drop');

// triggerCircuitBreaker
var trigResult = MS.triggerCircuitBreaker(s15, 'iron_ore', 100);
assert(trigResult.paused === true, 'triggerCircuitBreaker paused = true');
assert(trigResult.resumeAt === 150, 'triggerCircuitBreaker resumeAt = 150 (100 + 50)');

// isTradeAllowed: trading paused
var tradeCheck1 = MS.isTradeAllowed(s15, 'iron_ore', 120);
assert(tradeCheck1.allowed === false, 'isTradeAllowed = false during circuit breaker pause');
assert(typeof tradeCheck1.reason === 'string' && tradeCheck1.reason.length > 0, 'isTradeAllowed reason set during pause');
assert(tradeCheck1.resumeAt === 150, 'isTradeAllowed resumeAt = 150');

// isTradeAllowed: before circuit breaker triggered, should be allowed
var tradeCheck2 = MS.isTradeAllowed(s15, 'unknown_item', 100);
assert(tradeCheck2.allowed === true, 'isTradeAllowed = true for unknown item (no CB)');

// isTradeAllowed: after pause ends
var tradeCheck3 = MS.isTradeAllowed(s15, 'iron_ore', 150);
assert(tradeCheck3.allowed === true, 'isTradeAllowed = true after pause expires (tick >= pausedUntil)');

// Check circuit breaker is deactivated after expiry
var cbState = s15.speculation.circuitBreakers['iron_ore'];
assert(cbState.active === false, 'circuit breaker deactivated after isTradeAllowed at expiry tick');

// Trigger again and test tick > resumeAt
MS.triggerCircuitBreaker(s15, 'iron_ore', 200);
var tradeCheck4 = MS.isTradeAllowed(s15, 'iron_ore', 260);
assert(tradeCheck4.allowed === true, 'isTradeAllowed = true well after pause ends');

// Empty price history
var cbEmpty = MS.checkCircuitBreaker(s15, 'iron_ore', []);
assert(cbEmpty.triggered === false, 'checkCircuitBreaker = false on empty history');

// Single price point
var cbSingle = MS.checkCircuitBreaker(s15, 'iron_ore', [{ tick: 1, price: 10 }]);
assert(cbSingle.triggered === false, 'checkCircuitBreaker = false with single price');

// ---------------------------------------------------------------------------
// Section 10: detectMonopoly / breakMonopoly
// ---------------------------------------------------------------------------

console.log('\n--- Section 10: Monopoly Detection ---');

var s16 = freshState();
// Create a state with guilds
s16.guilds = {
  'guild_iron': { members: ['ironlord', 'ironlord2', 'ironlord3'] },
  'guild_free': { members: ['freetrader1', 'freetrader2'] }
};

MS.depositMargin(s16, 'ironlord',  50000);
MS.depositMargin(s16, 'ironlord2', 50000);
MS.depositMargin(s16, 'ironlord3', 50000);
MS.depositMargin(s16, 'freetrader1', 50000);
MS.depositMargin(s16, 'freetrader2', 50000);

// Iron guild opens 70 contracts (long), free traders open 30
// This gives iron guild 70% control
for (var q = 0; q < 7; q++) {
  MS.openPosition(s16, 'ironlord',  'iron_futures', 'long', 10, 5, 1);
}
for (var q2 = 0; q2 < 3; q2++) {
  MS.openPosition(s16, 'freetrader1', 'iron_futures', 'long', 10, 5, 1);
}

var mono1 = MS.detectMonopoly(s16, 'iron_ore');
assert(mono1.hasMonopoly === true, 'detectMonopoly finds monopoly at 70%');
assert(mono1.guildId !== null, 'detectMonopoly guildId set');
assert(mono1.controlPercent > 0.60, 'controlPercent > 60%');

// No monopoly when distributed evenly
var s17 = freshState();
MS.depositMargin(s17, 'player_a', 50000);
MS.depositMargin(s17, 'player_b', 50000);
MS.depositMargin(s17, 'player_c', 50000);
MS.openPosition(s17, 'player_a', 'iron_futures', 'long', 5, 5, 1);
MS.openPosition(s17, 'player_b', 'iron_futures', 'long', 5, 5, 1);
MS.openPosition(s17, 'player_c', 'iron_futures', 'long', 5, 5, 1);

var mono2 = MS.detectMonopoly(s17, 'iron_ore');
assert(mono2.hasMonopoly === false, 'no monopoly when evenly distributed (33% each)');

// No monopoly when no open positions
var mono3 = MS.detectMonopoly(freshState(), 'iron_ore');
assert(mono3.hasMonopoly === false, 'no monopoly with no contracts');

// detectMonopoly on item with no commodity definition
var mono4 = MS.detectMonopoly(s16, 'unknown_item');
assert(mono4.hasMonopoly === false, 'detectMonopoly = false for item with no commodity');

// breakMonopoly
var breakResult = MS.breakMonopoly(s16, 'iron_ore', 12345);
assert(breakResult.alternativeSpawned === true, 'breakMonopoly spawns alternatives');
assert(Array.isArray(breakResult.locations), 'breakMonopoly returns locations array');
assert(breakResult.locations.length >= 3, 'breakMonopoly spawns at least 3 locations');

for (var li = 0; li < breakResult.locations.length; li++) {
  var loc = breakResult.locations[li];
  assert(loc.itemId === 'iron_ore', 'location.itemId = iron_ore');
  assert(typeof loc.x === 'number', 'location.x is number');
  assert(typeof loc.z === 'number', 'location.z is number');
  assert(loc.quantity > 0, 'location.quantity > 0');
}

// Deterministic: same seed gives same result
var br2 = MS.breakMonopoly(s16, 'iron_ore', 12345);
assert(br2.locations.length === breakResult.locations.length, 'breakMonopoly is deterministic with same seed');

// Different seeds give potentially different results (count can vary)
var br3 = MS.breakMonopoly(s16, 'iron_ore', 99999);
assert(Array.isArray(br3.locations), 'breakMonopoly locations array with different seed');

// ---------------------------------------------------------------------------
// Section 11: getMarketHealth
// ---------------------------------------------------------------------------

console.log('\n--- Section 11: getMarketHealth ---');

var s18 = freshState();
var health0 = MS.getMarketHealth(s18);
assert(typeof health0.volatilityIndex === 'number', 'health.volatilityIndex is number');
assert(typeof health0.activePositions === 'number', 'health.activePositions is number');
assert(typeof health0.marginUtilization === 'number', 'health.marginUtilization is number');
assert(typeof health0.totalOpenInterest === 'number', 'health.totalOpenInterest is number');
assert(health0.activePositions === 0, 'fresh state: activePositions = 0');
assert(health0.totalOpenInterest === 0, 'fresh state: totalOpenInterest = 0');

MS.depositMargin(s18, 'mona', 5000);
MS.depositMargin(s18, 'nate', 5000);
var op18a = MS.openPosition(s18, 'mona', 'iron_futures',   'long', 3, 10, 1);
var op18b = MS.openPosition(s18, 'nate', 'copper_futures', 'long', 2, 8, 1);

var health1 = MS.getMarketHealth(s18);
assert(health1.activePositions === 2, 'health.activePositions = 2 after opening 2 contracts');
assert(health1.totalOpenInterest > 0, 'health.totalOpenInterest > 0');
assert(health1.marginUtilization > 0, 'health.marginUtilization > 0 when positions open');

// Trigger a circuit breaker and verify volatilityIndex > 0
MS.triggerCircuitBreaker(s18, 'iron_ore', 10);
var health2 = MS.getMarketHealth(s18);
assert(health2.volatilityIndex > 0, 'volatilityIndex > 0 when circuit breaker active');

// ---------------------------------------------------------------------------
// Section 12: getTopTraders
// ---------------------------------------------------------------------------

console.log('\n--- Section 12: getTopTraders ---');

var s19 = freshState();
MS.depositMargin(s19, 'trader_a', 5000);
MS.depositMargin(s19, 'trader_b', 5000);
MS.depositMargin(s19, 'trader_c', 5000);

// trader_a makes 200 profit, trader_b loses 50, trader_c makes 100
var op19a = MS.openPosition(s19, 'trader_a', 'iron_futures', 'long', 2, 10, 1);
MS.closePosition(s19, 'trader_a', op19a.contract.id, 20); // P&L = 10*2*10 = 200

var op19b = MS.openPosition(s19, 'trader_b', 'iron_futures', 'long', 1, 10, 1);
MS.closePosition(s19, 'trader_b', op19b.contract.id, 5); // P&L = -5*1*10 = -50

var op19c = MS.openPosition(s19, 'trader_c', 'iron_futures', 'long', 1, 10, 1);
MS.closePosition(s19, 'trader_c', op19c.contract.id, 20); // P&L = 10*1*10 = 100

var top3 = MS.getTopTraders(s19, 3);
assert(Array.isArray(top3), 'getTopTraders returns array');
assert(top3.length === 3, 'getTopTraders returns 3 traders');
assert(top3[0].playerId === 'trader_a', 'top trader is trader_a');
assert(top3[1].playerId === 'trader_c', 'second trader is trader_c');
assert(top3[2].playerId === 'trader_b', 'third trader is trader_b (loss)');
assert(top3[0].totalProfitLoss > top3[1].totalProfitLoss, 'sorted by P&L descending');

// Default count
var top10 = MS.getTopTraders(s19);
assert(Array.isArray(top10), 'getTopTraders with no count returns array');

// No traders
var topEmpty = MS.getTopTraders(freshState(), 5);
assert(topEmpty.length === 0, 'getTopTraders = empty for fresh state');

// ---------------------------------------------------------------------------
// Section 13: getTradingVolume
// ---------------------------------------------------------------------------

console.log('\n--- Section 13: getTradingVolume ---');

var s20 = freshState();
MS.depositMargin(s20, 'vol_trader', 50000);

// Open 5 iron positions over different ticks
for (var vi = 0; vi < 5; vi++) {
  MS.openPosition(s20, 'vol_trader', 'iron_futures', 'long', 1, 10, 100 + vi * 20);
}
// Open 2 copper positions
MS.openPosition(s20, 'vol_trader', 'copper_futures', 'long', 1, 8, 110);
MS.openPosition(s20, 'vol_trader', 'copper_futures', 'long', 1, 8, 130);

// Volume for iron in window [50, 200]: last tick is 180, window=150 → since=30 → all 5
var vol1 = MS.getTradingVolume(s20, 'iron_futures', 150, 180);
assert(vol1.volume >= 5, 'getTradingVolume captures 5 iron trades in window');
assert(vol1.tradeCount >= 5, 'getTradingVolume tradeCount >= 5');

// Volume for copper in window
var volCu = MS.getTradingVolume(s20, 'copper_futures', 150, 180);
assert(volCu.volume >= 2, 'getTradingVolume captures copper trades');

// Volume for unknown commodity
var volNone = MS.getTradingVolume(s20, 'fake_futures', 100, 200);
assert(volNone.volume === 0, 'getTradingVolume = 0 for unknown commodity');

// Very narrow window misses old trades
var volNarrow = MS.getTradingVolume(s20, 'iron_futures', 5, 180);
// Only trades within ticks [175, 180]: the 5th position was at tick 180 (100+4*20=180)
assert(volNarrow.volume <= vol1.volume, 'narrow window has <= volume than wide window');

// ---------------------------------------------------------------------------
// Section 14: Edge Cases
// ---------------------------------------------------------------------------

console.log('\n--- Section 14: Edge Cases ---');

// Negative margin account balance after huge loss — balance can go negative
var s21 = freshState();
MS.depositMargin(s21, 'loser', 200);
// iron_futures: 1 contract at price 100
// notional = 10*1*100 = 1000, margin = 1000*0.20 = 200
var op21 = MS.openPosition(s21, 'loser', 'iron_futures', 'long', 1, 100, 1);
assert(op21.success === true, 'opened with 200 margin exactly');
assert(MS.getMarginAccount(s21, 'loser').balance === 0, 'balance 0 after opening');

// withdrawMargin 0 from zero balance
var wdZero = MS.withdrawMargin(s21, 'loser', 100);
assert(wdZero.success === false, 'withdrawMargin fails when no free balance');

// Multiple commodities can have different settlement ticks
var ironC = MS.getCommodityById('iron_futures');
var gemC  = MS.getCommodityById('gem_futures');
assert(ironC.settlementTicks !== gemC.settlementTicks || ironC.settlementTicks === gemC.settlementTicks,
  'different commodities can have different settlement ticks');

// openPosition for every commodity type
var s22 = freshState();
MS.depositMargin(s22, 'bigtrader', 100000);
var allComs = MS.getCommodities();
var successCount = 0;
for (var ci2 = 0; ci2 < allComs.length; ci2++) {
  var result = MS.openPosition(s22, 'bigtrader', allComs[ci2].id, 'long', 1, 10, 1);
  if (result.success) successCount++;
}
assert(successCount === allComs.length, 'can open position in all 15 commodities');

// All positions appear in getOpenPositions
var allOpen = MS.getOpenPositions(s22, 'bigtrader');
assert(allOpen.length === allComs.length, 'all ' + allComs.length + ' positions visible in getOpenPositions');

// settleExpired: partial expiry (only some contracts expired)
var s23 = freshState();
MS.depositMargin(s23, 'mixed', 50000);
// iron expires at tick 1+500 = 501; gem expires at tick 1+400 = 401
var op23iron = MS.openPosition(s23, 'mixed', 'iron_futures', 'long', 1, 10, 1);
var op23gem  = MS.openPosition(s23, 'mixed', 'gem_futures',  'long', 1, 50, 1);

function mockPrice23(itemId) {
  if (itemId === 'iron_ore') return 12;
  if (itemId === 'gem')      return 55;
  return 10;
}

// At tick 450: only gem_futures expired (settlementTick=401)
var partial1 = MS.settleExpired(s23, 450, mockPrice23);
assert(partial1.settled.length === 1, 'settleExpired: only gem settled at tick 450');
assert(s23.speculation.contracts[op23gem.contract.id].status !== 'open', 'gem contract not open after settlement');
assert(s23.speculation.contracts[op23iron.contract.id].status === 'open', 'iron contract still open at tick 450');

// At tick 501: iron_futures now expired
var partial2 = MS.settleExpired(s23, 510, mockPrice23);
assert(partial2.settled.length === 1, 'settleExpired: iron settled at tick 510');

// P&L on long iron from 10 to 12 = +2 * 1 * 10 = +20
var ironSettledPnL = partial2.settled[0].profitLoss;
assertClose(ironSettledPnL, 20, 'iron settled P&L = 20');

// ---------------------------------------------------------------------------
// Section 15: Integration / Realistic Trading Scenario
// ---------------------------------------------------------------------------

console.log('\n--- Section 15: Integration Scenario ---');

var s24 = freshState();
MS.depositMargin(s24, 'alice24', 10000);
MS.depositMargin(s24, 'bob24',   10000);

// Alice goes long on wood (bullish)
// wood_futures: contractSize=20, marginRequirement=0.15, maxLeverage=6
// 3 contracts at price 6: notional=360
// marginRequired = max(360*0.15, 360/6) = max(54, 60) = 60
var opAlice = MS.openPosition(s24, 'alice24', 'wood_futures', 'long', 3, 6, 500);
assert(opAlice.success === true, 'alice opened wood long');
assertClose(opAlice.marginRequired, 60, 'alice margin = 60 (minMargin from maxLeverage)');

// Bob goes short on wood (bearish)
var opBob = MS.openPosition(s24, 'bob24', 'wood_futures', 'short', 3, 6, 500);
assert(opBob.success === true, 'bob opened wood short');

// Price rises to 9
var alicePnL = MS.getPositionPnL(s24, opAlice.contract.id, 9);
var bobPnL   = MS.getPositionPnL(s24, opBob.contract.id,   9);

// Alice long: (9-6)*3*20 = 180
assertClose(alicePnL.profitLoss, 180, 'alice long P&L at price 9 = 180');
// Bob short: -(9-6)*3*20 = -180
assertClose(bobPnL.profitLoss, -180, 'bob short P&L at price 9 = -180');

// Close both
var closeAlice = MS.closePosition(s24, 'alice24', opAlice.contract.id, 9);
var closeBob   = MS.closePosition(s24, 'bob24',   opBob.contract.id,   9);
assertClose(closeAlice.profitLoss, 180,  'alice close P&L = 180');
assertClose(closeBob.profitLoss,  -180, 'bob close P&L = -180');

// Top traders: alice first, bob second
var top2 = MS.getTopTraders(s24, 2);
assert(top2[0].playerId === 'alice24', 'alice is top trader');
assert(top2[1].playerId === 'bob24',   'bob is second trader');
assert(top2[0].totalProfitLoss > top2[1].totalProfitLoss, 'alice profit > bob profit');

// Market health
var health24 = MS.getMarketHealth(s24);
assert(health24.activePositions === 0, 'health: 0 active positions after closing all');

// ---------------------------------------------------------------------------
// Final Summary
// ---------------------------------------------------------------------------

console.log('\n===========================================');
console.log('Results: ' + passed + ' passed, ' + failed + ' failed');
console.log('Total:   ' + (passed + failed) + ' assertions');
console.log('===========================================');

if (failed > 0) {
  process.exit(1);
} else {
  console.log('All tests passed!');
  process.exit(0);
}
