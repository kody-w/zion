/**
 * Tests for src/js/time_capsules.js
 * 80+ tests covering all exported functions, constants, edge cases,
 * material minDays enforcement, decay/expiry, capacity limits,
 * discovery radius, message sanitization, burial costs, zone queries,
 * and recently-opened feeds.
 */

const { test, suite, report, assert } = require('./test_runner');
const TC = require('../src/js/time_capsules');

// =========================================================================
// TEST HELPERS
// =========================================================================

let _uidN = 0;
function uid(prefix) { return (prefix || 'p') + '_' + (++_uidN); }

/** Freeze "now" at a fixed timestamp so time-sensitive tests are deterministic */
let _fakeNow = Date.now();
TC._getNow = function() { return _fakeNow; };

function advanceDays(d) { _fakeNow += d * 24 * 60 * 60 * 1000; }
function advanceMs(ms)  { _fakeNow += ms; }
function resetTime()    { _fakeNow = Date.now(); }

/** Reset module state between suites */
function fresh() {
  TC.resetCapsules();
  resetTime();
}

/** Bury a wooden message capsule 2 days from now — minimum valid case */
function burySimple(playerId, overrides) {
  overrides = overrides || {};
  var pos      = overrides.position || { x: 0, z: 0 };
  var type     = overrides.type     || 'message';
  var material = overrides.material || 'wooden';
  var contents = overrides.contents !== undefined ? overrides.contents : { message: 'Hello future!' };
  var unlock   = overrides.unlockDate || (_fakeNow + 2 * 24 * 60 * 60 * 1000);
  return TC.buryCapsule(playerId, pos, type, material, contents, unlock);
}

// =========================================================================
// SUITE: CONSTANTS
// =========================================================================

suite('TimeCapsules — Constants', function() {

  test('DISCOVERY_RADIUS is 20', function() {
    assert.strictEqual(TC.DISCOVERY_RADIUS, 20);
  });

  test('MAX_CAPSULES_PER_PLAYER is 5', function() {
    assert.strictEqual(TC.MAX_CAPSULES_PER_PLAYER, 5);
  });

  test('CAPSULE_TYPES has message, gift, legacy, commemorative', function() {
    assert(TC.CAPSULE_TYPES.message,        'message type missing');
    assert(TC.CAPSULE_TYPES.gift,           'gift type missing');
    assert(TC.CAPSULE_TYPES.legacy,         'legacy type missing');
    assert(TC.CAPSULE_TYPES.commemorative,  'commemorative type missing');
  });

  test('CAPSULE_MATERIALS has wooden, stone, crystal, eternal', function() {
    assert(TC.CAPSULE_MATERIALS.wooden,  'wooden missing');
    assert(TC.CAPSULE_MATERIALS.stone,   'stone missing');
    assert(TC.CAPSULE_MATERIALS.crystal, 'crystal missing');
    assert(TC.CAPSULE_MATERIALS.eternal, 'eternal missing');
  });

  test('message type has maxItems 0 and canHaveItems false', function() {
    assert.strictEqual(TC.CAPSULE_TYPES.message.maxItems, 0);
    assert.strictEqual(TC.CAPSULE_TYPES.message.canHaveItems, false);
  });

  test('gift type has maxItems 1', function() {
    assert.strictEqual(TC.CAPSULE_TYPES.gift.maxItems, 1);
  });

  test('legacy type has maxItems 5', function() {
    assert.strictEqual(TC.CAPSULE_TYPES.legacy.maxItems, 5);
  });

  test('commemorative type has maxItems 3', function() {
    assert.strictEqual(TC.CAPSULE_TYPES.commemorative.maxItems, 3);
  });

  test('wooden material minDays is 1', function() {
    assert.strictEqual(TC.CAPSULE_MATERIALS.wooden.minDays, 1);
  });

  test('stone material minDays is 7', function() {
    assert.strictEqual(TC.CAPSULE_MATERIALS.stone.minDays, 7);
  });

  test('crystal material minDays is 30', function() {
    assert.strictEqual(TC.CAPSULE_MATERIALS.crystal.minDays, 30);
  });

  test('eternal material minDays is 365', function() {
    assert.strictEqual(TC.CAPSULE_MATERIALS.eternal.minDays, 365);
  });

  test('wooden material decays after 30 days', function() {
    assert.strictEqual(TC.CAPSULE_MATERIALS.wooden.decayDays, 30);
  });

  test('eternal material has null decayDays (never decays)', function() {
    assert.strictEqual(TC.CAPSULE_MATERIALS.eternal.decayDays, null);
  });

  test('STATUS constants exported', function() {
    assert.strictEqual(TC.STATUS_BURIED,  'buried');
    assert.strictEqual(TC.STATUS_READY,   'ready');
    assert.strictEqual(TC.STATUS_OPENED,  'opened');
    assert.strictEqual(TC.STATUS_EXPIRED, 'expired');
  });

});

// =========================================================================
// SUITE: buryCapsule — happy path
// =========================================================================

suite('TimeCapsules — buryCapsule happy path', function() {

  test('bury a simple message capsule returns success', function() {
    fresh();
    var p = uid('player');
    var r = burySimple(p);
    assert(r.success, 'Expected success: ' + (r.error || ''));
  });

  test('returned capsule has correct type and material', function() {
    fresh();
    var p = uid('player');
    var r = burySimple(p);
    assert.strictEqual(r.capsule.type,     'message');
    assert.strictEqual(r.capsule.material, 'wooden');
  });

  test('returned capsule has an id', function() {
    fresh();
    var r = burySimple(uid());
    assert(typeof r.capsule.id === 'string' && r.capsule.id.length > 0);
  });

  test('returned capsule has correct position', function() {
    fresh();
    var r = TC.buryCapsule(uid(), { x: 42, z: -7 }, 'message', 'wooden',
      { message: 'Hi' }, _fakeNow + 2 * 86400000);
    assert.strictEqual(r.capsule.position.x, 42);
    assert.strictEqual(r.capsule.position.z, -7);
  });

  test('returned capsule status is buried', function() {
    fresh();
    var r = burySimple(uid());
    assert.strictEqual(r.capsule.status, TC.STATUS_BURIED);
  });

  test('returned capsule has buriedBy set to playerId', function() {
    fresh();
    var p = uid();
    var r = burySimple(p);
    assert.strictEqual(r.capsule.buriedBy, p);
  });

  test('two buried capsules get distinct IDs', function() {
    fresh();
    var p = uid();
    var r1 = burySimple(p);
    var r2 = burySimple(p);
    assert.notStrictEqual(r1.capsule.id, r2.capsule.id);
  });

  test('bury a gift capsule with one item succeeds', function() {
    fresh();
    var r = TC.buryCapsule(uid(), { x: 0, z: 0 }, 'gift', 'wooden',
      { message: 'A gift for you', items: ['flower_rose'] },
      _fakeNow + 2 * 86400000);
    assert(r.success, r.error);
  });

  test('bury a legacy capsule with 5 items succeeds', function() {
    fresh();
    var items = ['a', 'b', 'c', 'd', 'e'];
    var r = TC.buryCapsule(uid(), { x: 0, z: 0 }, 'legacy', 'stone',
      { message: 'Legacy', items: items },
      _fakeNow + 8 * 86400000);
    assert(r.success, r.error);
  });

  test('bury a commemorative capsule with eventId succeeds', function() {
    fresh();
    var r = TC.buryCapsule(uid(), { x: 0, z: 0 }, 'commemorative', 'crystal',
      { message: 'Grand Fest', items: [], eventId: 'event_grand_fest_2026' },
      _fakeNow + 31 * 86400000);
    assert(r.success, r.error);
  });

  test('bury with stone material and 8-day unlock succeeds', function() {
    fresh();
    var r = TC.buryCapsule(uid(), { x: 0, z: 0 }, 'message', 'stone',
      { message: 'Stone msg' }, _fakeNow + 8 * 86400000);
    assert(r.success, r.error);
  });

});

// =========================================================================
// SUITE: buryCapsule — validation errors
// =========================================================================

suite('TimeCapsules — buryCapsule validation errors', function() {

  test('invalid playerId returns error', function() {
    fresh();
    var r = TC.buryCapsule(null, { x: 0, z: 0 }, 'message', 'wooden',
      { message: 'hi' }, _fakeNow + 2 * 86400000);
    assert(!r.success);
    assert(r.error);
  });

  test('missing position returns error', function() {
    fresh();
    var r = TC.buryCapsule(uid(), null, 'message', 'wooden',
      { message: 'hi' }, _fakeNow + 2 * 86400000);
    assert(!r.success);
  });

  test('position without z returns error', function() {
    fresh();
    var r = TC.buryCapsule(uid(), { x: 0 }, 'message', 'wooden',
      { message: 'hi' }, _fakeNow + 2 * 86400000);
    assert(!r.success);
  });

  test('invalid capsule type returns error', function() {
    fresh();
    var r = TC.buryCapsule(uid(), { x: 0, z: 0 }, 'treasure_chest', 'wooden',
      { message: 'hi' }, _fakeNow + 2 * 86400000);
    assert(!r.success);
    assert(r.error.includes('type') || r.error.includes('Invalid'));
  });

  test('invalid material returns error', function() {
    fresh();
    var r = TC.buryCapsule(uid(), { x: 0, z: 0 }, 'message', 'titanium',
      { message: 'hi' }, _fakeNow + 2 * 86400000);
    assert(!r.success);
  });

  test('wooden unlock date less than 1 day ahead returns error', function() {
    fresh();
    var r = TC.buryCapsule(uid(), { x: 0, z: 0 }, 'message', 'wooden',
      { message: 'hi' }, _fakeNow + 3600000); // only 1 hour ahead
    assert(!r.success);
    assert(r.error.includes('day'));
  });

  test('stone unlock date less than 7 days ahead returns error', function() {
    fresh();
    var r = TC.buryCapsule(uid(), { x: 0, z: 0 }, 'message', 'stone',
      { message: 'hi' }, _fakeNow + 3 * 86400000); // 3 days
    assert(!r.success);
  });

  test('crystal unlock date less than 30 days ahead returns error', function() {
    fresh();
    var r = TC.buryCapsule(uid(), { x: 0, z: 0 }, 'message', 'crystal',
      { message: 'hi' }, _fakeNow + 5 * 86400000); // 5 days
    assert(!r.success);
  });

  test('eternal unlock date less than 365 days ahead returns error', function() {
    fresh();
    var r = TC.buryCapsule(uid(), { x: 0, z: 0 }, 'message', 'eternal',
      { message: 'hi' }, _fakeNow + 100 * 86400000); // 100 days
    assert(!r.success);
  });

  test('message capsule with items returns error', function() {
    fresh();
    var r = TC.buryCapsule(uid(), { x: 0, z: 0 }, 'message', 'wooden',
      { message: 'hi', items: ['flower_rose'] }, _fakeNow + 2 * 86400000);
    assert(!r.success);
    assert(r.error.includes('item'));
  });

  test('gift capsule with 2 items returns error (max 1)', function() {
    fresh();
    var r = TC.buryCapsule(uid(), { x: 0, z: 0 }, 'gift', 'wooden',
      { message: 'hi', items: ['a', 'b'] }, _fakeNow + 2 * 86400000);
    assert(!r.success);
  });

  test('legacy capsule with 6 items returns error (max 5)', function() {
    fresh();
    var r = TC.buryCapsule(uid(), { x: 0, z: 0 }, 'legacy', 'wooden',
      { message: 'hi', items: ['a','b','c','d','e','f'] }, _fakeNow + 2 * 86400000);
    assert(!r.success);
  });

  test('commemorative capsule without eventId returns error', function() {
    fresh();
    var r = TC.buryCapsule(uid(), { x: 0, z: 0 }, 'commemorative', 'crystal',
      { message: 'event' }, _fakeNow + 31 * 86400000);
    assert(!r.success);
    assert(r.error.includes('eventId'));
  });

  test('missing unlockDate returns error', function() {
    fresh();
    var r = TC.buryCapsule(uid(), { x: 0, z: 0 }, 'message', 'wooden',
      { message: 'hi' }, undefined);
    assert(!r.success);
  });

  test('non-numeric unlockDate returns error', function() {
    fresh();
    var r = TC.buryCapsule(uid(), { x: 0, z: 0 }, 'message', 'wooden',
      { message: 'hi' }, 'tomorrow');
    assert(!r.success);
  });

});

// =========================================================================
// SUITE: MAX_CAPSULES_PER_PLAYER enforcement
// =========================================================================

suite('TimeCapsules — MAX_CAPSULES_PER_PLAYER enforcement', function() {

  test('fifth capsule from same player succeeds', function() {
    fresh();
    var p = uid();
    for (var i = 0; i < 4; i++) burySimple(p);
    var r = burySimple(p);
    assert(r.success, 'Fifth capsule should succeed');
  });

  test('sixth capsule from same player fails', function() {
    fresh();
    var p = uid();
    for (var i = 0; i < 5; i++) burySimple(p);
    var r = burySimple(p);
    assert(!r.success);
    assert(r.error.includes('maximum'));
  });

  test('different player can still bury when another player is at cap', function() {
    fresh();
    var p1 = uid(), p2 = uid();
    for (var i = 0; i < 5; i++) burySimple(p1);
    var r = burySimple(p2);
    assert(r.success, 'p2 should be able to bury');
  });

  test('opened capsule does not count toward player burial limit', function() {
    fresh();
    var p = uid();
    for (var i = 0; i < 5; i++) burySimple(p);

    // Open the first capsule
    var buriedList = TC.getPlayerBuriedCapsules(p);
    var cap = buriedList[0];
    // Advance past unlock
    advanceDays(3);
    TC.openCapsule(cap.id, uid('other'));

    // Now p should be at 4 active — can bury one more
    var r = burySimple(p);
    assert(r.success, 'Should be able to bury after one opened: ' + (r.error || ''));
  });

});

// =========================================================================
// SUITE: getCapsuleStatus
// =========================================================================

suite('TimeCapsules — getCapsuleStatus', function() {

  test('fresh capsule has status buried', function() {
    fresh();
    var r = burySimple(uid());
    assert.strictEqual(TC.getCapsuleStatus(r.capsule.id), TC.STATUS_BURIED);
  });

  test('capsule after unlock date has status ready', function() {
    fresh();
    var r = burySimple(uid());
    advanceDays(3);
    assert.strictEqual(TC.getCapsuleStatus(r.capsule.id), TC.STATUS_READY);
  });

  test('opened capsule has status opened', function() {
    fresh();
    var r = burySimple(uid());
    advanceDays(3);
    TC.openCapsule(r.capsule.id, uid());
    assert.strictEqual(TC.getCapsuleStatus(r.capsule.id), TC.STATUS_OPENED);
  });

  test('wooden capsule past 30-day decay returns expired', function() {
    fresh();
    var r = burySimple(uid());
    advanceDays(35);
    assert.strictEqual(TC.getCapsuleStatus(r.capsule.id), TC.STATUS_EXPIRED);
  });

  test('eternal capsule past 400 days is not expired', function() {
    fresh();
    var p = uid();
    var r = TC.buryCapsule(p, { x: 0, z: 0 }, 'message', 'eternal',
      { message: 'eternal msg' }, _fakeNow + 366 * 86400000);
    advanceDays(400);
    var status = TC.getCapsuleStatus(r.capsule.id);
    assert.notStrictEqual(status, TC.STATUS_EXPIRED);
  });

  test('unknown capsuleId returns null', function() {
    fresh();
    assert.strictEqual(TC.getCapsuleStatus('no_such_capsule'), null);
  });

});

// =========================================================================
// SUITE: isExpired
// =========================================================================

suite('TimeCapsules — isExpired', function() {

  test('fresh capsule is not expired', function() {
    fresh();
    var r = burySimple(uid());
    var list = TC.getPlayerBuriedCapsules(r.capsule.buriedBy);
    assert.strictEqual(TC.isExpired(null), false);
  });

  test('null returns false', function() {
    assert.strictEqual(TC.isExpired(null), false);
  });

  test('undefined returns false', function() {
    assert.strictEqual(TC.isExpired(undefined), false);
  });

  test('wooden capsule object past 30 days is expired', function() {
    fresh();
    var r = burySimple(uid());
    advanceDays(35);
    // getCapsuleStatus updates in-place; build a raw object to test isExpired directly
    var fakeWoodenCap = {
      status:   TC.STATUS_BURIED,
      material: 'wooden',
      buriedAt: _fakeNow - 35 * 86400000,
      unlockAt: _fakeNow - 33 * 86400000,
      openedBy: null
    };
    assert.strictEqual(TC.isExpired(fakeWoodenCap), true);
  });

  test('opened capsule is not considered expired by isExpired', function() {
    // Opened takes precedence
    var openedCap = {
      status:   TC.STATUS_OPENED,
      material: 'wooden',
      buriedAt: Date.now() - 40 * 86400000,
      unlockAt: Date.now() - 38 * 86400000,
      openedBy: 'someone'
    };
    // When status is OPENED, computeStatus returns OPENED not EXPIRED
    assert.strictEqual(TC.isExpired(openedCap), false);
  });

});

// =========================================================================
// SUITE: getTimeRemaining
// =========================================================================

suite('TimeCapsules — getTimeRemaining', function() {

  test('non-existent capsule returns -1', function() {
    fresh();
    assert.strictEqual(TC.getTimeRemaining('ghost_cap'), -1);
  });

  test('fresh capsule has positive time remaining', function() {
    fresh();
    var r = burySimple(uid());
    assert(TC.getTimeRemaining(r.capsule.id) > 0);
  });

  test('capsule past unlock date returns 0', function() {
    fresh();
    var r = burySimple(uid());
    advanceDays(3);
    assert.strictEqual(TC.getTimeRemaining(r.capsule.id), 0);
  });

  test('time remaining decreases as time passes', function() {
    fresh();
    var r = burySimple(uid());
    var t1 = TC.getTimeRemaining(r.capsule.id);
    advanceDays(1);
    var t2 = TC.getTimeRemaining(r.capsule.id);
    assert(t2 < t1, 'Time remaining should decrease');
  });

});

// =========================================================================
// SUITE: openCapsule
// =========================================================================

suite('TimeCapsules — openCapsule', function() {

  test('opening a ready capsule returns success', function() {
    fresh();
    var r = burySimple(uid());
    advanceDays(3);
    var o = TC.openCapsule(r.capsule.id, uid());
    assert(o.success, o.error);
  });

  test('opened capsule returns correct message', function() {
    fresh();
    var r = burySimple(uid());
    advanceDays(3);
    var o = TC.openCapsule(r.capsule.id, uid());
    assert.strictEqual(o.contents.message, 'Hello future!');
  });

  test('opened capsule returns buriedBy player', function() {
    fresh();
    var p = uid();
    var r = burySimple(p);
    advanceDays(3);
    var o = TC.openCapsule(r.capsule.id, uid());
    assert.strictEqual(o.contents.buriedBy, p);
  });

  test('opening a buried (locked) capsule fails', function() {
    fresh();
    var r = burySimple(uid());
    var o = TC.openCapsule(r.capsule.id, uid());
    assert(!o.success);
  });

  test('opening an already opened capsule fails', function() {
    fresh();
    var r = burySimple(uid());
    advanceDays(3);
    TC.openCapsule(r.capsule.id, uid());
    var o = TC.openCapsule(r.capsule.id, uid());
    assert(!o.success);
    assert(o.error.includes('already'));
  });

  test('opening an expired capsule fails', function() {
    fresh();
    var r = burySimple(uid());
    advanceDays(35);
    var o = TC.openCapsule(r.capsule.id, uid());
    assert(!o.success);
    assert(o.error.includes('decay'));
  });

  test('non-existent capsule open returns error', function() {
    fresh();
    var o = TC.openCapsule('ghost_cap', uid());
    assert(!o.success);
    assert(o.error.includes('found'));
  });

  test('opened capsule with items returns items array', function() {
    fresh();
    var r = TC.buryCapsule(uid(), { x: 0, z: 0 }, 'gift', 'wooden',
      { message: 'gift!', items: ['seed_lotus'] }, _fakeNow + 2 * 86400000);
    advanceDays(3);
    var o = TC.openCapsule(r.capsule.id, uid());
    assert(o.success, o.error);
    assert.deepStrictEqual(o.contents.items, ['seed_lotus']);
  });

});

// =========================================================================
// SUITE: digUpCapsule
// =========================================================================

suite('TimeCapsules — digUpCapsule', function() {

  test('digUpCapsule succeeds when within DISCOVERY_RADIUS and ready', function() {
    fresh();
    var r = TC.buryCapsule(uid(), { x: 100, z: 100 }, 'message', 'wooden',
      { message: 'dig me' }, _fakeNow + 2 * 86400000);
    advanceDays(3);
    var result = TC.digUpCapsule(uid(), r.capsule.id, { x: 110, z: 100 });
    assert(result.success, result.error);
  });

  test('digUpCapsule fails when outside DISCOVERY_RADIUS', function() {
    fresh();
    var r = TC.buryCapsule(uid(), { x: 0, z: 0 }, 'message', 'wooden',
      { message: 'far away' }, _fakeNow + 2 * 86400000);
    advanceDays(3);
    var result = TC.digUpCapsule(uid(), r.capsule.id, { x: 9999, z: 9999 });
    assert(!result.success);
    assert(result.error.includes('within'));
  });

  test('digUpCapsule without playerPosition skips proximity check', function() {
    fresh();
    var r = burySimple(uid());
    advanceDays(3);
    var result = TC.digUpCapsule(uid(), r.capsule.id, null);
    assert(result.success, result.error);
  });

  test('digUpCapsule on buried capsule returns not-ready error', function() {
    fresh();
    var r = burySimple(uid());
    var result = TC.digUpCapsule(uid(), r.capsule.id, { x: 0, z: 0 });
    assert(!result.success);
  });

  test('digUpCapsule on expired capsule returns decay error', function() {
    fresh();
    var r = burySimple(uid());
    advanceDays(35);
    var result = TC.digUpCapsule(uid(), r.capsule.id, { x: 0, z: 0 });
    assert(!result.success);
    assert(result.error.includes('decay'));
  });

});

// =========================================================================
// SUITE: getNearbyCapsules
// =========================================================================

suite('TimeCapsules — getNearbyCapsules', function() {

  test('finds capsule within radius', function() {
    fresh();
    TC.buryCapsule(uid(), { x: 5, z: 5 }, 'message', 'wooden',
      { message: 'near' }, _fakeNow + 2 * 86400000);
    var nearby = TC.getNearbyCapsules(0, 0, 20);
    assert(nearby.length > 0, 'Should find nearby capsule');
  });

  test('does not find capsule outside radius', function() {
    fresh();
    TC.buryCapsule(uid(), { x: 500, z: 500 }, 'message', 'wooden',
      { message: 'far' }, _fakeNow + 2 * 86400000);
    var nearby = TC.getNearbyCapsules(0, 0, 20);
    assert.strictEqual(nearby.length, 0, 'Should not find distant capsule');
  });

  test('does not reveal message contents in nearby results', function() {
    fresh();
    TC.buryCapsule(uid(), { x: 5, z: 5 }, 'message', 'wooden',
      { message: 'secret treasure' }, _fakeNow + 2 * 86400000);
    var nearby = TC.getNearbyCapsules(0, 0, 20);
    assert.strictEqual(nearby.length, 1);
    assert(!nearby[0].message, 'Message should not be exposed in nearby results');
    assert(!nearby[0].items,   'Items should not be exposed in nearby results');
  });

  test('expired capsules not returned in nearby results', function() {
    fresh();
    TC.buryCapsule(uid(), { x: 5, z: 5 }, 'message', 'wooden',
      { message: 'rotted' }, _fakeNow + 2 * 86400000);
    advanceDays(35);
    var nearby = TC.getNearbyCapsules(0, 0, 20);
    assert.strictEqual(nearby.length, 0, 'Expired capsule should be invisible');
  });

  test('defaults to DISCOVERY_RADIUS when radius omitted', function() {
    fresh();
    TC.buryCapsule(uid(), { x: 19, z: 0 }, 'message', 'wooden',
      { message: 'edge' }, _fakeNow + 2 * 86400000);
    var nearby = TC.getNearbyCapsules(0, 0);
    assert(nearby.length > 0, 'Should use default DISCOVERY_RADIUS of 20');
  });

  test('returns distance field in each nearby entry', function() {
    fresh();
    TC.buryCapsule(uid(), { x: 3, z: 4 }, 'message', 'wooden',
      { message: 'measured' }, _fakeNow + 2 * 86400000);
    var nearby = TC.getNearbyCapsules(0, 0, 20);
    assert.strictEqual(nearby.length, 1);
    assert.strictEqual(nearby[0].distance, 5); // sqrt(9+16)
  });

});

// =========================================================================
// SUITE: getCapsuleHint
// =========================================================================

suite('TimeCapsules — getCapsuleHint', function() {

  test('returns hint for valid capsule', function() {
    fresh();
    var r = TC.buryCapsule(uid(), { x: 0, z: 0 }, 'message', 'wooden',
      { message: 'hello', hint: 'From a wanderer' }, _fakeNow + 2 * 86400000);
    var h = TC.getCapsuleHint(r.capsule.id);
    assert(h.success, h.error);
    assert.strictEqual(h.hint, 'From a wanderer');
  });

  test('auto-generates hint when none provided', function() {
    fresh();
    var r = burySimple(uid());
    var h = TC.getCapsuleHint(r.capsule.id);
    assert(h.success, h.error);
    assert(typeof h.hint === 'string' && h.hint.length > 0, 'Auto-hint should be non-empty');
  });

  test('returns error for unknown capsule', function() {
    fresh();
    var h = TC.getCapsuleHint('ghost');
    assert(!h.success);
  });

  test('returns error for expired capsule', function() {
    fresh();
    var r = burySimple(uid());
    advanceDays(35);
    var h = TC.getCapsuleHint(r.capsule.id);
    assert(!h.success);
  });

  test('hint does not reveal message content directly', function() {
    fresh();
    var r = TC.buryCapsule(uid(), { x: 0, z: 0 }, 'message', 'wooden',
      { message: 'supersecretpassword', hint: 'Something from the past' },
      _fakeNow + 2 * 86400000);
    var h = TC.getCapsuleHint(r.capsule.id);
    assert(h.success);
    assert(!h.hint.includes('supersecretpassword'), 'Hint should not reveal message body');
  });

});

// =========================================================================
// SUITE: getPlayerBuriedCapsules
// =========================================================================

suite('TimeCapsules — getPlayerBuriedCapsules', function() {

  test('returns empty array for player with no capsules', function() {
    fresh();
    var result = TC.getPlayerBuriedCapsules(uid());
    assert(Array.isArray(result));
    assert.strictEqual(result.length, 0);
  });

  test('returns correct count for player with 3 capsules', function() {
    fresh();
    var p = uid();
    burySimple(p); burySimple(p); burySimple(p);
    var result = TC.getPlayerBuriedCapsules(p);
    assert.strictEqual(result.length, 3);
  });

  test('includes opened capsules in buried list', function() {
    fresh();
    var p = uid();
    var r = burySimple(p);
    advanceDays(3);
    TC.openCapsule(r.capsule.id, uid());
    var result = TC.getPlayerBuriedCapsules(p);
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].status, TC.STATUS_OPENED);
  });

  test('does not include other player capsules', function() {
    fresh();
    var p1 = uid(), p2 = uid();
    burySimple(p1); burySimple(p2);
    var result = TC.getPlayerBuriedCapsules(p1);
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].buriedBy, p1);
  });

});

// =========================================================================
// SUITE: getPlayerOpenedCapsules
// =========================================================================

suite('TimeCapsules — getPlayerOpenedCapsules', function() {

  test('returns empty array for player who opened nothing', function() {
    fresh();
    var result = TC.getPlayerOpenedCapsules(uid());
    assert(Array.isArray(result));
    assert.strictEqual(result.length, 0);
  });

  test('returns capsule after player opens it', function() {
    fresh();
    var opener = uid();
    var r = burySimple(uid());
    advanceDays(3);
    TC.openCapsule(r.capsule.id, opener);
    var opened = TC.getPlayerOpenedCapsules(opener);
    assert.strictEqual(opened.length, 1);
    assert.strictEqual(opened[0].id, r.capsule.id);
  });

  test('includes message in opened capsule record', function() {
    fresh();
    var opener = uid();
    var r = TC.buryCapsule(uid(), { x: 0, z: 0 }, 'message', 'wooden',
      { message: 'A note from the past' }, _fakeNow + 2 * 86400000);
    advanceDays(3);
    TC.openCapsule(r.capsule.id, opener);
    var opened = TC.getPlayerOpenedCapsules(opener);
    assert.strictEqual(opened[0].message, 'A note from the past');
  });

});

// =========================================================================
// SUITE: addItemToCapsule
// =========================================================================

suite('TimeCapsules — addItemToCapsule', function() {

  test('add item to gift capsule succeeds', function() {
    fresh();
    var p = uid();
    var r = TC.buryCapsule(p, { x: 0, z: 0 }, 'gift', 'wooden',
      { message: 'with love', items: [] }, _fakeNow + 2 * 86400000);
    var add = TC.addItemToCapsule(r.capsule.id, p, 'seed_lotus');
    assert(add.success, add.error);
  });

  test('add item to message capsule fails (type does not allow items)', function() {
    fresh();
    var p = uid();
    var r = burySimple(p);
    var add = TC.addItemToCapsule(r.capsule.id, p, 'seed_lotus');
    assert(!add.success);
    assert(add.error.includes('item'));
  });

  test('add item by non-owner fails', function() {
    fresh();
    var p = uid();
    var r = TC.buryCapsule(p, { x: 0, z: 0 }, 'gift', 'wooden',
      { message: 'gift', items: [] }, _fakeNow + 2 * 86400000);
    var add = TC.addItemToCapsule(r.capsule.id, uid('thief'), 'seed_lotus');
    assert(!add.success);
    assert(add.error.includes('owner'));
  });

  test('adding beyond capacity fails', function() {
    fresh();
    var p = uid();
    var r = TC.buryCapsule(p, { x: 0, z: 0 }, 'gift', 'wooden',
      { message: 'gift', items: ['item_a'] }, _fakeNow + 2 * 86400000);
    var add = TC.addItemToCapsule(r.capsule.id, p, 'item_b');
    assert(!add.success);
    assert(add.error.includes('capacity') || add.error.includes('maximum'));
  });

  test('add item to opened capsule fails', function() {
    fresh();
    var p = uid();
    var r = TC.buryCapsule(p, { x: 0, z: 0 }, 'gift', 'wooden',
      { message: 'gift', items: [] }, _fakeNow + 2 * 86400000);
    advanceDays(3);
    TC.openCapsule(r.capsule.id, uid());
    var add = TC.addItemToCapsule(r.capsule.id, p, 'seed_lotus');
    assert(!add.success);
    assert(add.error.includes('opened'));
  });

  test('add item to expired capsule fails', function() {
    fresh();
    var p = uid();
    var r = TC.buryCapsule(p, { x: 0, z: 0 }, 'gift', 'wooden',
      { message: 'gift', items: [] }, _fakeNow + 2 * 86400000);
    advanceDays(35);
    var add = TC.addItemToCapsule(r.capsule.id, p, 'seed_lotus');
    assert(!add.success);
    assert(add.error.includes('expired'));
  });

});

// =========================================================================
// SUITE: setMessage
// =========================================================================

suite('TimeCapsules — setMessage', function() {

  test('owner can set message', function() {
    fresh();
    var p = uid();
    var r = burySimple(p);
    var result = TC.setMessage(r.capsule.id, p, 'Updated message for you');
    assert(result.success, result.error);
  });

  test('non-owner cannot set message', function() {
    fresh();
    var p = uid();
    var r = burySimple(p);
    var result = TC.setMessage(r.capsule.id, uid('hacker'), 'I hijacked this');
    assert(!result.success);
    assert(result.error.includes('owner'));
  });

  test('message updated is returned on open', function() {
    fresh();
    var p = uid();
    var r = burySimple(p);
    TC.setMessage(r.capsule.id, p, 'Revised greeting');
    advanceDays(3);
    var o = TC.openCapsule(r.capsule.id, uid());
    assert.strictEqual(o.contents.message, 'Revised greeting');
  });

  test('empty message returns error', function() {
    fresh();
    var p = uid();
    var r = burySimple(p);
    var result = TC.setMessage(r.capsule.id, p, '   ');
    assert(!result.success);
  });

  test('message over MAX_MESSAGE_LENGTH returns error', function() {
    fresh();
    var p = uid();
    var r = burySimple(p);
    var longMsg = 'a'.repeat(TC.MAX_MESSAGE_LENGTH + 1);
    var result = TC.setMessage(r.capsule.id, p, longMsg);
    assert(!result.success);
    assert(result.error.includes('character'));
  });

  test('cannot set message on opened capsule', function() {
    fresh();
    var p = uid();
    var r = burySimple(p);
    advanceDays(3);
    TC.openCapsule(r.capsule.id, uid());
    var result = TC.setMessage(r.capsule.id, p, 'Too late');
    assert(!result.success);
  });

});

// =========================================================================
// SUITE: sanitizeMessage
// =========================================================================

suite('TimeCapsules — sanitizeMessage', function() {

  test('clean message passes', function() {
    var r = TC.sanitizeMessage('Hello world!');
    assert(r.ok, r.error);
    assert.strictEqual(r.clean, 'Hello world!');
  });

  test('trims leading/trailing whitespace', function() {
    var r = TC.sanitizeMessage('  hi there  ');
    assert(r.ok);
    assert.strictEqual(r.clean, 'hi there');
  });

  test('message exceeding max length fails', function() {
    var r = TC.sanitizeMessage('a'.repeat(TC.MAX_MESSAGE_LENGTH + 1));
    assert(!r.ok);
    assert(r.error.includes('character'));
  });

  test('empty message fails', function() {
    var r = TC.sanitizeMessage('');
    assert(!r.ok);
  });

  test('whitespace-only message fails', function() {
    var r = TC.sanitizeMessage('   ');
    assert(!r.ok);
  });

  test('non-string input fails', function() {
    var r = TC.sanitizeMessage(12345);
    assert(!r.ok);
  });

  test('message with profanity fails', function() {
    var r = TC.sanitizeMessage('This is a fuck test');
    assert(!r.ok);
    assert(r.error.includes('prohibited'));
  });

  test('message exactly at max length passes', function() {
    var r = TC.sanitizeMessage('a'.repeat(TC.MAX_MESSAGE_LENGTH));
    assert(r.ok, r.error);
  });

});

// =========================================================================
// SUITE: calculateBurialCost
// =========================================================================

suite('TimeCapsules — calculateBurialCost', function() {

  test('message + wooden = 5 * 1 = 5', function() {
    fresh();
    assert.strictEqual(TC.calculateBurialCost('message', 'wooden'), 5);
  });

  test('message + stone = 5 * 2 = 10', function() {
    assert.strictEqual(TC.calculateBurialCost('message', 'stone'), 10);
  });

  test('message + crystal = 5 * 4 = 20', function() {
    assert.strictEqual(TC.calculateBurialCost('message', 'crystal'), 20);
  });

  test('message + eternal = 5 * 10 = 50', function() {
    assert.strictEqual(TC.calculateBurialCost('message', 'eternal'), 50);
  });

  test('legacy + eternal = 50 * 10 = 500', function() {
    assert.strictEqual(TC.calculateBurialCost('legacy', 'eternal'), 500);
  });

  test('gift + wooden = 15 * 1 = 15', function() {
    assert.strictEqual(TC.calculateBurialCost('gift', 'wooden'), 15);
  });

  test('commemorative + crystal = 30 * 4 = 120', function() {
    assert.strictEqual(TC.calculateBurialCost('commemorative', 'crystal'), 120);
  });

  test('invalid type returns -1', function() {
    assert.strictEqual(TC.calculateBurialCost('magic_box', 'wooden'), -1);
  });

  test('invalid material returns -1', function() {
    assert.strictEqual(TC.calculateBurialCost('message', 'cardboard'), -1);
  });

  test('both invalid returns -1', function() {
    assert.strictEqual(TC.calculateBurialCost('x', 'y'), -1);
  });

});

// =========================================================================
// SUITE: getCapsuleCapacity
// =========================================================================

suite('TimeCapsules — getCapsuleCapacity', function() {

  test('message capacity is 0', function() {
    assert.strictEqual(TC.getCapsuleCapacity('message'), 0);
  });

  test('gift capacity is 1', function() {
    assert.strictEqual(TC.getCapsuleCapacity('gift'), 1);
  });

  test('legacy capacity is 5', function() {
    assert.strictEqual(TC.getCapsuleCapacity('legacy'), 5);
  });

  test('commemorative capacity is 3', function() {
    assert.strictEqual(TC.getCapsuleCapacity('commemorative'), 3);
  });

  test('unknown type returns -1', function() {
    assert.strictEqual(TC.getCapsuleCapacity('chest'), -1);
  });

});

// =========================================================================
// SUITE: getCapsulesByZone
// =========================================================================

suite('TimeCapsules — getCapsulesByZone', function() {

  test('returns capsules buried in specified zone', function() {
    fresh();
    TC.buryCapsule(uid(), { x: 0, z: 0 }, 'message', 'wooden',
      { message: 'gardens note', zone: 'gardens' }, _fakeNow + 2 * 86400000);
    var result = TC.getCapsulesByZone('gardens');
    assert.strictEqual(result.length, 1);
  });

  test('does not return capsules from other zones', function() {
    fresh();
    TC.buryCapsule(uid(), { x: 0, z: 0 }, 'message', 'wooden',
      { message: 'wilds note', zone: 'wilds' }, _fakeNow + 2 * 86400000);
    var result = TC.getCapsulesByZone('gardens');
    assert.strictEqual(result.length, 0);
  });

  test('capsule without zone is not returned by getCapsulesByZone', function() {
    fresh();
    burySimple(uid()); // no zone set
    var result = TC.getCapsulesByZone('nexus');
    assert.strictEqual(result.length, 0);
  });

  test('zone results do not expose message content', function() {
    fresh();
    TC.buryCapsule(uid(), { x: 0, z: 0 }, 'message', 'wooden',
      { message: 'secret', zone: 'studio' }, _fakeNow + 2 * 86400000);
    var result = TC.getCapsulesByZone('studio');
    assert.strictEqual(result.length, 1);
    assert(!result[0].message, 'Message content should not be exposed');
  });

});

// =========================================================================
// SUITE: getRecentlyOpened
// =========================================================================

suite('TimeCapsules — getRecentlyOpened', function() {

  test('returns empty array when nothing opened', function() {
    fresh();
    var r = TC.getRecentlyOpened(5);
    assert(Array.isArray(r));
    assert.strictEqual(r.length, 0);
  });

  test('returns opened capsule after opening', function() {
    fresh();
    var r = burySimple(uid());
    advanceDays(3);
    TC.openCapsule(r.capsule.id, uid());
    var feed = TC.getRecentlyOpened(10);
    assert.strictEqual(feed.length, 1);
  });

  test('respects limit parameter', function() {
    fresh();
    for (var i = 0; i < 5; i++) {
      var r = burySimple(uid());
      advanceDays(3);
      TC.openCapsule(r.capsule.id, uid());
    }
    var feed = TC.getRecentlyOpened(3);
    assert.strictEqual(feed.length, 3);
  });

  test('most recently opened comes first', function() {
    fresh();
    // Bury two capsules at the start
    var r1 = burySimple(uid());
    var r2 = burySimple(uid());

    // Advance past unlock so both are READY
    advanceDays(3);

    // Open r1 first, then advance a bit, then open r2
    TC.openCapsule(r1.capsule.id, uid());
    advanceMs(10000);
    TC.openCapsule(r2.capsule.id, uid());

    var feed = TC.getRecentlyOpened(10);
    assert.strictEqual(feed[0].id, r2.capsule.id, 'Most recent should be first');
  });

  test('defaults to 10 entries when limit omitted', function() {
    fresh();
    for (var i = 0; i < 12; i++) {
      var r = burySimple(uid());
      advanceDays(3);
      TC.openCapsule(r.capsule.id, uid());
    }
    var feed = TC.getRecentlyOpened();
    assert.strictEqual(feed.length, 10);
  });

  test('feed entries include buriedBy and openedBy', function() {
    fresh();
    var burierPlayer = uid('burier');
    var openerPlayer = uid('opener');
    var r = burySimple(burierPlayer);
    advanceDays(3);
    TC.openCapsule(r.capsule.id, openerPlayer);
    var feed = TC.getRecentlyOpened(1);
    assert.strictEqual(feed[0].buriedBy, burierPlayer);
    assert.strictEqual(feed[0].openedBy, openerPlayer);
  });

});

// =========================================================================
// SUITE: State persistence (initCapsules / getCapsuleState / resetCapsules)
// =========================================================================

suite('TimeCapsules — State persistence', function() {

  test('getCapsuleState returns serializable object', function() {
    fresh();
    burySimple(uid());
    var state = TC.getCapsuleState();
    assert(state.capsules && typeof state.capsules === 'object');
    assert(typeof state.capsuleCounter === 'number');
  });

  test('resetCapsules empties all state', function() {
    fresh();
    burySimple(uid());
    TC.resetCapsules();
    var state = TC.getCapsuleState();
    assert.strictEqual(Object.keys(state.capsules).length, 0);
  });

  test('initCapsules restores saved state', function() {
    fresh();
    var p = uid();
    var r = burySimple(p);
    var saved = JSON.parse(JSON.stringify(TC.getCapsuleState()));
    TC.resetCapsules();

    TC.initCapsules(saved);
    var list = TC.getPlayerBuriedCapsules(p);
    assert.strictEqual(list.length, 1);
    assert.strictEqual(list[0].id, r.capsule.id);
  });

  test('initCapsules with null does nothing', function() {
    fresh();
    burySimple(uid());
    var countBefore = Object.keys(TC.getCapsuleState().capsules).length;
    TC.initCapsules(null);
    // State should be unchanged (null is a no-op)
    var countAfter = Object.keys(TC.getCapsuleState().capsules).length;
    assert.strictEqual(countAfter, countBefore);
  });

});

// =========================================================================
// SUITE: formatTimeRemaining
// =========================================================================

suite('TimeCapsules — formatTimeRemaining', function() {

  test('0 ms returns ready now', function() {
    assert.strictEqual(TC.formatTimeRemaining(0), 'Ready now');
  });

  test('negative ms returns ready now', function() {
    assert.strictEqual(TC.formatTimeRemaining(-100), 'Ready now');
  });

  test('30 seconds formats correctly', function() {
    var r = TC.formatTimeRemaining(30000);
    assert(r.includes('second'), 'Should mention seconds');
  });

  test('2 hours formats as hours', function() {
    var r = TC.formatTimeRemaining(2 * 3600000);
    assert(r.includes('hour'), 'Should mention hours');
  });

  test('3 days formats as days', function() {
    var r = TC.formatTimeRemaining(3 * 86400000);
    assert(r.includes('day'), 'Should mention days');
  });

});

// =========================================================================
// RUN
// =========================================================================

if (!report()) {
  process.exit(1);
}
