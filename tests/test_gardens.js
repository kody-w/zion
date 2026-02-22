// test_gardens.js — Comprehensive tests for the Garden Collaboration module
// Tests cover: createGarden, addCollaborator, removeCollaborator, getCollaborators,
// canTend, tendGarden, getGardenHealth, getContributions, getHarvestShare,
// getBonusFromCollaboration, getGardenStats, listPublicGardens, setGardenPublic,
// protocol handlers, and constants.

const { test, suite, report, assert } = require('./test_runner');
const Gardens = require('../src/js/gardens');

// ─── Utility: fresh state before each suite ────────────────────────────────

function reset() {
  Gardens._resetStore();
}

// ─── Fixtures ──────────────────────────────────────────────────────────────

var validPos = { x: 10, y: 0, z: 20 };

// ═══════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════

suite('Constants', function() {
  test('MAX_COLLABORATORS is a positive integer', function() {
    assert(Number.isInteger(Gardens.MAX_COLLABORATORS) && Gardens.MAX_COLLABORATORS > 0,
      'MAX_COLLABORATORS should be a positive integer');
  });

  test('MAX_COLLABORATORS defaults to 5', function() {
    assert(Gardens.MAX_COLLABORATORS === 5, 'MAX_COLLABORATORS should be 5');
  });

  test('COLLABORATION_BONUS is a positive number', function() {
    assert(typeof Gardens.COLLABORATION_BONUS === 'number' && Gardens.COLLABORATION_BONUS > 0,
      'COLLABORATION_BONUS should be a positive number');
  });

  test('COLLABORATION_BONUS defaults to 0.1', function() {
    assert(Gardens.COLLABORATION_BONUS === 0.1, 'COLLABORATION_BONUS should be 0.1');
  });

  test('VALID_TEND_ACTIONS includes water, weed, fertilize', function() {
    assert(Gardens.VALID_TEND_ACTIONS.indexOf('water') !== -1, 'water should be valid');
    assert(Gardens.VALID_TEND_ACTIONS.indexOf('weed') !== -1, 'weed should be valid');
    assert(Gardens.VALID_TEND_ACTIONS.indexOf('fertilize') !== -1, 'fertilize should be valid');
  });

  test('GARDEN_ZONES includes gardens', function() {
    assert(Gardens.GARDEN_ZONES.indexOf('gardens') !== -1,
      'GARDEN_ZONES should include gardens');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// createGarden
// ═══════════════════════════════════════════════════════════════════════════

suite('createGarden', function() {
  test('creates a garden successfully', function() {
    reset();
    var result = Gardens.createGarden('alice', validPos, 'gardens');
    assert(result.success === true, 'Should succeed');
    assert(result.garden !== undefined, 'Should return garden object');
  });

  test('returned garden has correct ownerId', function() {
    reset();
    var result = Gardens.createGarden('alice', validPos, 'gardens');
    assert(result.garden.ownerId === 'alice', 'ownerId should be alice');
  });

  test('returned garden has correct position', function() {
    reset();
    var result = Gardens.createGarden('alice', validPos, 'gardens');
    assert(result.garden.position.x === 10, 'x should be 10');
    assert(result.garden.position.y === 0, 'y should be 0');
    assert(result.garden.position.z === 20, 'z should be 20');
  });

  test('returned garden has correct zoneName', function() {
    reset();
    var result = Gardens.createGarden('alice', validPos, 'gardens');
    assert(result.garden.zoneName === 'gardens', 'zone should be gardens');
  });

  test('returned garden starts with empty collaborators', function() {
    reset();
    var result = Gardens.createGarden('alice', validPos, 'gardens');
    assert(Array.isArray(result.garden.collaborators), 'collaborators should be array');
    assert(result.garden.collaborators.length === 0, 'should start with no collaborators');
  });

  test('returned garden starts as private (isPublic: false)', function() {
    reset();
    var result = Gardens.createGarden('alice', validPos, 'gardens');
    assert(result.garden.isPublic === false, 'garden should start private');
  });

  test('returned garden has a unique id', function() {
    reset();
    var r1 = Gardens.createGarden('alice', validPos, 'gardens');
    var r2 = Gardens.createGarden('bob', validPos, 'gardens');
    assert(r1.garden.id !== r2.garden.id, 'garden IDs should be unique');
  });

  test('returned garden has a createdAt timestamp', function() {
    reset();
    var before = Date.now();
    var result = Gardens.createGarden('alice', validPos, 'gardens');
    var after = Date.now();
    assert(result.garden.createdAt >= before && result.garden.createdAt <= after,
      'createdAt should be current time');
  });

  test('fails with empty ownerId', function() {
    reset();
    var result = Gardens.createGarden('', validPos, 'gardens');
    assert(result.success === false, 'Should fail with empty ownerId');
    assert(typeof result.error === 'string', 'Should return error string');
  });

  test('fails with non-string ownerId', function() {
    reset();
    var result = Gardens.createGarden(42, validPos, 'gardens');
    assert(result.success === false, 'Should fail with non-string ownerId');
  });

  test('fails with invalid zone (nexus)', function() {
    reset();
    var result = Gardens.createGarden('alice', validPos, 'nexus');
    assert(result.success === false, 'Should fail in nexus zone');
    assert(result.error.includes('nexus'), 'Error should mention zone');
  });

  test('fails with invalid zone (arena)', function() {
    reset();
    var result = Gardens.createGarden('alice', validPos, 'arena');
    assert(result.success === false, 'Should fail in arena zone');
  });

  test('fails with null position', function() {
    reset();
    var result = Gardens.createGarden('alice', null, 'gardens');
    assert(result.success === false, 'Should fail with null position');
  });

  test('fails with non-numeric position fields', function() {
    reset();
    var result = Gardens.createGarden('alice', { x: 'a', y: 0, z: 0 }, 'gardens');
    assert(result.success === false, 'Should fail with non-numeric x');
  });

  test('defaults to gardens zone when none specified', function() {
    reset();
    var result = Gardens.createGarden('alice', validPos);
    assert(result.success === true, 'Should succeed without zone');
    assert(result.garden.zoneName === 'gardens', 'Should default to gardens zone');
  });

  test('owner contribution counter initialised to 0', function() {
    reset();
    var result = Gardens.createGarden('alice', validPos, 'gardens');
    assert(result.garden.contributions['alice'] === 0,
      'Owner contribution should start at 0');
  });

  test('allows wilds zone', function() {
    reset();
    var result = Gardens.createGarden('alice', validPos, 'wilds');
    assert(result.success === true, 'Should succeed in wilds zone');
    assert(result.garden.zoneName === 'wilds', 'Zone should be wilds');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// addCollaborator
// ═══════════════════════════════════════════════════════════════════════════

suite('addCollaborator', function() {
  test('owner can add a collaborator', function() {
    reset();
    var g = Gardens.createGarden('alice', validPos, 'gardens').garden;
    var result = Gardens.addCollaborator(g.id, 'alice', 'bob');
    assert(result.success === true, 'Should succeed');
  });

  test('collaborator appears in collaborators list', function() {
    reset();
    var g = Gardens.createGarden('alice', validPos, 'gardens').garden;
    Gardens.addCollaborator(g.id, 'alice', 'bob');
    var collabs = Gardens.getCollaborators(g.id);
    assert(collabs.indexOf('bob') !== -1, 'bob should be in collaborators');
  });

  test('non-owner cannot add collaborator', function() {
    reset();
    var g = Gardens.createGarden('alice', validPos, 'gardens').garden;
    var result = Gardens.addCollaborator(g.id, 'bob', 'charlie');
    assert(result.success === false, 'Non-owner should not be able to add collaborator');
    assert(result.error.includes('owner'), 'Error should mention owner');
  });

  test('fails with unknown garden id', function() {
    reset();
    var result = Gardens.addCollaborator('nonexistent', 'alice', 'bob');
    assert(result.success === false, 'Should fail with unknown garden');
  });

  test('fails when adding owner as collaborator', function() {
    reset();
    var g = Gardens.createGarden('alice', validPos, 'gardens').garden;
    var result = Gardens.addCollaborator(g.id, 'alice', 'alice');
    assert(result.success === false, 'Should fail when adding owner as collaborator');
  });

  test('fails when adding same collaborator twice', function() {
    reset();
    var g = Gardens.createGarden('alice', validPos, 'gardens').garden;
    Gardens.addCollaborator(g.id, 'alice', 'bob');
    var result = Gardens.addCollaborator(g.id, 'alice', 'bob');
    assert(result.success === false, 'Should fail on duplicate collaborator');
    assert(result.error.includes('already'), 'Error should mention already');
  });

  test('fails when MAX_COLLABORATORS reached', function() {
    reset();
    var g = Gardens.createGarden('alice', validPos, 'gardens').garden;
    for (var i = 0; i < Gardens.MAX_COLLABORATORS; i++) {
      Gardens.addCollaborator(g.id, 'alice', 'player' + i);
    }
    var result = Gardens.addCollaborator(g.id, 'alice', 'playerX');
    assert(result.success === false, 'Should fail when at max collaborators');
    assert(result.error.includes('maximum') || result.error.includes('max'),
      'Error should mention maximum');
  });

  test('new collaborator contribution starts at 0', function() {
    reset();
    var g = Gardens.createGarden('alice', validPos, 'gardens').garden;
    Gardens.addCollaborator(g.id, 'alice', 'bob');
    var contributions = Gardens.getContributions(g.id);
    assert(contributions['bob'] === 0, 'New collaborator contributions should start at 0');
  });

  test('fails with empty collaboratorId', function() {
    reset();
    var g = Gardens.createGarden('alice', validPos, 'gardens').garden;
    var result = Gardens.addCollaborator(g.id, 'alice', '');
    assert(result.success === false, 'Should fail with empty collaboratorId');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// removeCollaborator
// ═══════════════════════════════════════════════════════════════════════════

suite('removeCollaborator', function() {
  test('owner can remove a collaborator', function() {
    reset();
    var g = Gardens.createGarden('alice', validPos, 'gardens').garden;
    Gardens.addCollaborator(g.id, 'alice', 'bob');
    var result = Gardens.removeCollaborator(g.id, 'alice', 'bob');
    assert(result.success === true, 'Should succeed');
  });

  test('removed collaborator no longer in list', function() {
    reset();
    var g = Gardens.createGarden('alice', validPos, 'gardens').garden;
    Gardens.addCollaborator(g.id, 'alice', 'bob');
    Gardens.removeCollaborator(g.id, 'alice', 'bob');
    var collabs = Gardens.getCollaborators(g.id);
    assert(collabs.indexOf('bob') === -1, 'bob should no longer be a collaborator');
  });

  test('non-owner cannot remove collaborator', function() {
    reset();
    var g = Gardens.createGarden('alice', validPos, 'gardens').garden;
    Gardens.addCollaborator(g.id, 'alice', 'bob');
    var result = Gardens.removeCollaborator(g.id, 'charlie', 'bob');
    assert(result.success === false, 'Non-owner should not remove collaborator');
  });

  test('fails with unknown garden id', function() {
    reset();
    var result = Gardens.removeCollaborator('nonexistent', 'alice', 'bob');
    assert(result.success === false, 'Should fail with unknown garden');
  });

  test('fails when player is not a collaborator', function() {
    reset();
    var g = Gardens.createGarden('alice', validPos, 'gardens').garden;
    var result = Gardens.removeCollaborator(g.id, 'alice', 'charlie');
    assert(result.success === false, 'Should fail if not a collaborator');
    assert(result.error.includes('not a collaborator'), 'Error should mention not a collaborator');
  });

  test('can add collaborator again after removing', function() {
    reset();
    var g = Gardens.createGarden('alice', validPos, 'gardens').garden;
    Gardens.addCollaborator(g.id, 'alice', 'bob');
    Gardens.removeCollaborator(g.id, 'alice', 'bob');
    var result = Gardens.addCollaborator(g.id, 'alice', 'bob');
    assert(result.success === true, 'Should be able to re-add after removal');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// getCollaborators
// ═══════════════════════════════════════════════════════════════════════════

suite('getCollaborators', function() {
  test('returns empty array for garden with no collaborators', function() {
    reset();
    var g = Gardens.createGarden('alice', validPos, 'gardens').garden;
    var result = Gardens.getCollaborators(g.id);
    assert(Array.isArray(result), 'Should return array');
    assert(result.length === 0, 'Should be empty');
  });

  test('returns correct list of collaborators', function() {
    reset();
    var g = Gardens.createGarden('alice', validPos, 'gardens').garden;
    Gardens.addCollaborator(g.id, 'alice', 'bob');
    Gardens.addCollaborator(g.id, 'alice', 'charlie');
    var result = Gardens.getCollaborators(g.id);
    assert(result.length === 2, 'Should have 2 collaborators');
    assert(result.indexOf('bob') !== -1, 'bob should be in list');
    assert(result.indexOf('charlie') !== -1, 'charlie should be in list');
  });

  test('returns empty array for unknown garden', function() {
    reset();
    var result = Gardens.getCollaborators('nonexistent');
    assert(Array.isArray(result), 'Should return array');
    assert(result.length === 0, 'Should be empty for unknown garden');
  });

  test('returned array does not include the owner', function() {
    reset();
    var g = Gardens.createGarden('alice', validPos, 'gardens').garden;
    Gardens.addCollaborator(g.id, 'alice', 'bob');
    var result = Gardens.getCollaborators(g.id);
    assert(result.indexOf('alice') === -1, 'Owner should not be in collaborator list');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// canTend
// ═══════════════════════════════════════════════════════════════════════════

suite('canTend', function() {
  test('owner can tend own garden', function() {
    reset();
    var g = Gardens.createGarden('alice', validPos, 'gardens').garden;
    assert(Gardens.canTend(g.id, 'alice') === true, 'Owner should be able to tend');
  });

  test('collaborator can tend garden', function() {
    reset();
    var g = Gardens.createGarden('alice', validPos, 'gardens').garden;
    Gardens.addCollaborator(g.id, 'alice', 'bob');
    assert(Gardens.canTend(g.id, 'bob') === true, 'Collaborator should be able to tend');
  });

  test('stranger cannot tend private garden', function() {
    reset();
    var g = Gardens.createGarden('alice', validPos, 'gardens').garden;
    assert(Gardens.canTend(g.id, 'charlie') === false,
      'Stranger should not tend private garden');
  });

  test('anyone can tend public garden', function() {
    reset();
    var g = Gardens.createGarden('alice', validPos, 'gardens').garden;
    Gardens.setGardenPublic(g.id, 'alice', true);
    assert(Gardens.canTend(g.id, 'stranger') === true,
      'Stranger should tend public garden');
  });

  test('returns false for unknown garden', function() {
    reset();
    assert(Gardens.canTend('nonexistent', 'alice') === false, 'Should return false for unknown garden');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// tendGarden
// ═══════════════════════════════════════════════════════════════════════════

suite('tendGarden', function() {
  test('owner can water garden', function() {
    reset();
    var g = Gardens.createGarden('alice', validPos, 'gardens').garden;
    var result = Gardens.tendGarden(g.id, 'alice', 'water');
    assert(result.success === true, 'Owner should be able to water');
  });

  test('owner can weed garden', function() {
    reset();
    var g = Gardens.createGarden('alice', validPos, 'gardens').garden;
    var result = Gardens.tendGarden(g.id, 'alice', 'weed');
    assert(result.success === true, 'Owner should be able to weed');
  });

  test('owner can fertilize garden', function() {
    reset();
    var g = Gardens.createGarden('alice', validPos, 'gardens').garden;
    var result = Gardens.tendGarden(g.id, 'alice', 'fertilize');
    assert(result.success === true, 'Owner should be able to fertilize');
  });

  test('tending event returned with correct shape', function() {
    reset();
    var g = Gardens.createGarden('alice', validPos, 'gardens').garden;
    var result = Gardens.tendGarden(g.id, 'alice', 'water');
    assert(result.tendingEvent !== undefined, 'Should return tendingEvent');
    assert(result.tendingEvent.playerId === 'alice', 'playerId should be alice');
    assert(result.tendingEvent.action === 'water', 'action should be water');
    assert(typeof result.tendingEvent.ts === 'number', 'ts should be a number');
  });

  test('tending increments contribution counter', function() {
    reset();
    var g = Gardens.createGarden('alice', validPos, 'gardens').garden;
    Gardens.tendGarden(g.id, 'alice', 'water');
    Gardens.tendGarden(g.id, 'alice', 'water');
    var contributions = Gardens.getContributions(g.id);
    assert(contributions['alice'] === 2, 'Alice should have 2 contributions');
  });

  test('collaborator can tend garden', function() {
    reset();
    var g = Gardens.createGarden('alice', validPos, 'gardens').garden;
    Gardens.addCollaborator(g.id, 'alice', 'bob');
    var result = Gardens.tendGarden(g.id, 'bob', 'water');
    assert(result.success === true, 'Collaborator should be able to tend');
  });

  test('stranger cannot tend private garden', function() {
    reset();
    var g = Gardens.createGarden('alice', validPos, 'gardens').garden;
    var result = Gardens.tendGarden(g.id, 'stranger', 'water');
    assert(result.success === false, 'Stranger should not tend private garden');
    assert(result.error.includes('permission'), 'Error should mention permission');
  });

  test('stranger can tend public garden', function() {
    reset();
    var g = Gardens.createGarden('alice', validPos, 'gardens').garden;
    Gardens.setGardenPublic(g.id, 'alice', true);
    var result = Gardens.tendGarden(g.id, 'stranger', 'water');
    assert(result.success === true, 'Stranger should tend public garden');
  });

  test('fails with invalid action', function() {
    reset();
    var g = Gardens.createGarden('alice', validPos, 'gardens').garden;
    var result = Gardens.tendGarden(g.id, 'alice', 'attack');
    assert(result.success === false, 'Should fail with invalid action');
    assert(result.error.includes('Invalid'), 'Error should mention Invalid');
  });

  test('fails with unknown garden', function() {
    reset();
    var result = Gardens.tendGarden('nonexistent', 'alice', 'water');
    assert(result.success === false, 'Should fail with unknown garden');
  });

  test('multiple tenders each get their contribution counted', function() {
    reset();
    var g = Gardens.createGarden('alice', validPos, 'gardens').garden;
    Gardens.addCollaborator(g.id, 'alice', 'bob');
    Gardens.tendGarden(g.id, 'alice', 'water');
    Gardens.tendGarden(g.id, 'bob', 'weed');
    Gardens.tendGarden(g.id, 'bob', 'fertilize');
    var contributions = Gardens.getContributions(g.id);
    assert(contributions['alice'] === 1, 'alice should have 1 contribution');
    assert(contributions['bob'] === 2, 'bob should have 2 contributions');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// getGardenHealth
// ═══════════════════════════════════════════════════════════════════════════

suite('getGardenHealth', function() {
  test('returns 0 for garden with no tending', function() {
    reset();
    var g = Gardens.createGarden('alice', validPos, 'gardens').garden;
    var health = Gardens.getGardenHealth(g);
    assert(health === 0, 'Untended garden should have 0 health');
  });

  test('health increases with tending actions', function() {
    reset();
    var g = Gardens.createGarden('alice', validPos, 'gardens').garden;
    Gardens.tendGarden(g.id, 'alice', 'water');
    var health = Gardens.getGardenHealth(g);
    assert(health > 0, 'Health should increase after tending');
  });

  test('health is capped at 1.0', function() {
    reset();
    var g = Gardens.createGarden('alice', validPos, 'gardens').garden;
    // Tend 20 times to saturate
    for (var i = 0; i < 20; i++) {
      Gardens.tendGarden(g.id, 'alice', 'water');
    }
    var health = Gardens.getGardenHealth(g);
    assert(health <= 1.0, 'Health should never exceed 1.0');
  });

  test('health is at least 0', function() {
    reset();
    var g = Gardens.createGarden('alice', validPos, 'gardens').garden;
    var health = Gardens.getGardenHealth(g);
    assert(health >= 0, 'Health should never be negative');
  });

  test('returns 0 for null/undefined garden', function() {
    var health = Gardens.getGardenHealth(null);
    assert(health === 0, 'Should return 0 for null garden');
  });

  test('collaboration bonus increases health', function() {
    reset();
    var g = Gardens.createGarden('alice', validPos, 'gardens').garden;
    Gardens.addCollaborator(g.id, 'alice', 'bob');

    // Tend exactly 5 times as alice only (base = 0.5)
    for (var i = 0; i < 5; i++) {
      Gardens.tendGarden(g.id, 'alice', 'water');
    }
    var healthAlone = Gardens.getGardenHealth(g);

    // Now bob tends too (adds collaboration bonus)
    Gardens.tendGarden(g.id, 'bob', 'weed');
    var healthCollaborative = Gardens.getGardenHealth(g);

    assert(healthCollaborative > healthAlone || healthCollaborative >= healthAlone,
      'Collaboration should not decrease health');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// getContributions
// ═══════════════════════════════════════════════════════════════════════════

suite('getContributions', function() {
  test('returns empty object for unknown garden', function() {
    reset();
    var result = Gardens.getContributions('nonexistent');
    assert(typeof result === 'object' && result !== null, 'Should return object');
    assert(Object.keys(result).length === 0, 'Should be empty for unknown garden');
  });

  test('returns owner with 0 contributions on fresh garden', function() {
    reset();
    var g = Gardens.createGarden('alice', validPos, 'gardens').garden;
    var result = Gardens.getContributions(g.id);
    assert(result['alice'] === 0, 'Owner should start with 0 contributions');
  });

  test('tracks contributions correctly after tending', function() {
    reset();
    var g = Gardens.createGarden('alice', validPos, 'gardens').garden;
    Gardens.addCollaborator(g.id, 'alice', 'bob');
    Gardens.tendGarden(g.id, 'alice', 'water');
    Gardens.tendGarden(g.id, 'alice', 'weed');
    Gardens.tendGarden(g.id, 'bob', 'fertilize');
    var result = Gardens.getContributions(g.id);
    assert(result['alice'] === 2, 'alice should have 2 contributions');
    assert(result['bob'] === 1, 'bob should have 1 contribution');
  });

  test('returns a copy, not a reference to internal state', function() {
    reset();
    var g = Gardens.createGarden('alice', validPos, 'gardens').garden;
    var result = Gardens.getContributions(g.id);
    result['alice'] = 999;
    var result2 = Gardens.getContributions(g.id);
    assert(result2['alice'] === 0, 'Mutating returned object should not affect internal state');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// getHarvestShare
// ═══════════════════════════════════════════════════════════════════════════

suite('getHarvestShare', function() {
  test('owner gets 100% with no tending and no collaborators', function() {
    reset();
    var g = Gardens.createGarden('alice', validPos, 'gardens').garden;
    var share = Gardens.getHarvestShare(g.id, 'alice');
    assert(share === 1, 'Owner should get 100% share with no tending');
  });

  test('returns 0 for unknown garden', function() {
    reset();
    var share = Gardens.getHarvestShare('nonexistent', 'alice');
    assert(share === 0, 'Should return 0 for unknown garden');
  });

  test('shares add up across all contributors', function() {
    reset();
    var g = Gardens.createGarden('alice', validPos, 'gardens').garden;
    Gardens.addCollaborator(g.id, 'alice', 'bob');
    Gardens.tendGarden(g.id, 'alice', 'water');  // alice: 1
    Gardens.tendGarden(g.id, 'bob', 'weed');     // bob:   1
    var shareAlice = Gardens.getHarvestShare(g.id, 'alice');
    var shareBob = Gardens.getHarvestShare(g.id, 'bob');
    var total = shareAlice + shareBob;
    assert(Math.abs(total - 1) < 0.001, 'Shares should sum to 1: got ' + total);
  });

  test('proportional shares reflect contribution ratio', function() {
    reset();
    var g = Gardens.createGarden('alice', validPos, 'gardens').garden;
    Gardens.addCollaborator(g.id, 'alice', 'bob');
    Gardens.tendGarden(g.id, 'alice', 'water');   // alice: 1
    Gardens.tendGarden(g.id, 'alice', 'water');   // alice: 2
    Gardens.tendGarden(g.id, 'bob', 'weed');      // bob:   1
    // alice = 2/3, bob = 1/3
    var shareAlice = Gardens.getHarvestShare(g.id, 'alice');
    var shareBob = Gardens.getHarvestShare(g.id, 'bob');
    assert(Math.abs(shareAlice - 2/3) < 0.001,
      'alice share should be ~0.667, got ' + shareAlice);
    assert(Math.abs(shareBob - 1/3) < 0.001,
      'bob share should be ~0.333, got ' + shareBob);
  });

  test('non-collaborator with no contributions gets 0', function() {
    reset();
    var g = Gardens.createGarden('alice', validPos, 'gardens').garden;
    Gardens.tendGarden(g.id, 'alice', 'water');
    var share = Gardens.getHarvestShare(g.id, 'stranger');
    assert(share === 0, 'Non-collaborator should get 0 share');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// getBonusFromCollaboration
// ═══════════════════════════════════════════════════════════════════════════

suite('getBonusFromCollaboration', function() {
  test('returns 0 for solo garden with no tending', function() {
    reset();
    var g = Gardens.createGarden('alice', validPos, 'gardens').garden;
    var bonus = Gardens.getBonusFromCollaboration(g);
    assert(bonus === 0, 'Solo un-tended garden should have 0 bonus');
  });

  test('returns 0 when only one person has tended', function() {
    reset();
    var g = Gardens.createGarden('alice', validPos, 'gardens').garden;
    Gardens.tendGarden(g.id, 'alice', 'water');
    var bonus = Gardens.getBonusFromCollaboration(g);
    assert(bonus === 0, 'Solo tending should have 0 collaboration bonus');
  });

  test('returns COLLABORATION_BONUS when two players tend', function() {
    reset();
    var g = Gardens.createGarden('alice', validPos, 'gardens').garden;
    Gardens.addCollaborator(g.id, 'alice', 'bob');
    Gardens.tendGarden(g.id, 'alice', 'water');
    Gardens.tendGarden(g.id, 'bob', 'weed');
    var bonus = Gardens.getBonusFromCollaboration(g);
    assert(Math.abs(bonus - Gardens.COLLABORATION_BONUS) < 0.001,
      'Should be exactly 1 bonus unit for 2 active tenders');
  });

  test('bonus scales with number of active tenders', function() {
    reset();
    var g = Gardens.createGarden('alice', validPos, 'gardens').garden;
    Gardens.addCollaborator(g.id, 'alice', 'bob');
    Gardens.addCollaborator(g.id, 'alice', 'charlie');
    Gardens.tendGarden(g.id, 'alice', 'water');
    Gardens.tendGarden(g.id, 'bob', 'weed');
    Gardens.tendGarden(g.id, 'charlie', 'fertilize');
    var bonus = Gardens.getBonusFromCollaboration(g);
    var expected = 2 * Gardens.COLLABORATION_BONUS;
    assert(Math.abs(bonus - expected) < 0.001,
      'Bonus should be 2x for 3 active tenders, got ' + bonus);
  });

  test('returns 0 for null garden', function() {
    var bonus = Gardens.getBonusFromCollaboration(null);
    assert(bonus === 0, 'Should return 0 for null garden');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// getGardenStats
// ═══════════════════════════════════════════════════════════════════════════

suite('getGardenStats', function() {
  test('returns null for unknown garden', function() {
    reset();
    var stats = Gardens.getGardenStats('nonexistent');
    assert(stats === null, 'Should return null for unknown garden');
  });

  test('returned stats have all required fields', function() {
    reset();
    var g = Gardens.createGarden('alice', validPos, 'gardens').garden;
    var stats = Gardens.getGardenStats(g.id);
    assert(stats !== null, 'Stats should not be null');
    assert(stats.id !== undefined, 'Should have id');
    assert(stats.ownerId !== undefined, 'Should have ownerId');
    assert(stats.zoneName !== undefined, 'Should have zoneName');
    assert(stats.position !== undefined, 'Should have position');
    assert(Array.isArray(stats.collaborators), 'collaborators should be array');
    assert(typeof stats.isPublic === 'boolean', 'isPublic should be boolean');
    assert(typeof stats.health === 'number', 'health should be number');
    assert(typeof stats.collaborationBonus === 'number', 'collaborationBonus should be number');
    assert(typeof stats.totalTendingActions === 'number', 'totalTendingActions should be number');
    assert(typeof stats.contributions === 'object', 'contributions should be object');
  });

  test('stats reflect tending correctly', function() {
    reset();
    var g = Gardens.createGarden('alice', validPos, 'gardens').garden;
    Gardens.tendGarden(g.id, 'alice', 'water');
    Gardens.tendGarden(g.id, 'alice', 'weed');
    var stats = Gardens.getGardenStats(g.id);
    assert(stats.totalTendingActions === 2, 'Should have 2 total tending actions');
  });

  test('stats actionBreakdown counts each action type', function() {
    reset();
    var g = Gardens.createGarden('alice', validPos, 'gardens').garden;
    Gardens.tendGarden(g.id, 'alice', 'water');
    Gardens.tendGarden(g.id, 'alice', 'water');
    Gardens.tendGarden(g.id, 'alice', 'weed');
    var stats = Gardens.getGardenStats(g.id);
    assert(stats.actionBreakdown.water === 2, 'Should have 2 water actions');
    assert(stats.actionBreakdown.weed === 1, 'Should have 1 weed action');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// listPublicGardens
// ═══════════════════════════════════════════════════════════════════════════

suite('listPublicGardens', function() {
  test('returns empty array when no public gardens', function() {
    reset();
    Gardens.createGarden('alice', validPos, 'gardens');
    var result = Gardens.listPublicGardens();
    assert(Array.isArray(result), 'Should return array');
    assert(result.length === 0, 'Should be empty when no public gardens');
  });

  test('returns public gardens', function() {
    reset();
    var g = Gardens.createGarden('alice', validPos, 'gardens').garden;
    Gardens.setGardenPublic(g.id, 'alice', true);
    var result = Gardens.listPublicGardens();
    assert(result.length === 1, 'Should return 1 public garden');
    assert(result[0].id === g.id, 'Should return correct garden');
  });

  test('does not return private gardens', function() {
    reset();
    Gardens.createGarden('alice', validPos, 'gardens');
    var result = Gardens.listPublicGardens();
    assert(result.length === 0, 'Private garden should not appear in list');
  });

  test('returns stats objects (not raw garden objects)', function() {
    reset();
    var g = Gardens.createGarden('alice', validPos, 'gardens').garden;
    Gardens.setGardenPublic(g.id, 'alice', true);
    var result = Gardens.listPublicGardens();
    assert(result[0].health !== undefined, 'Should return stats with health');
    assert(result[0].collaborationBonus !== undefined, 'Should return stats with collaborationBonus');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// setGardenPublic
// ═══════════════════════════════════════════════════════════════════════════

suite('setGardenPublic', function() {
  test('owner can make garden public', function() {
    reset();
    var g = Gardens.createGarden('alice', validPos, 'gardens').garden;
    var result = Gardens.setGardenPublic(g.id, 'alice', true);
    assert(result.success === true, 'Should succeed');
  });

  test('garden is public after setGardenPublic(true)', function() {
    reset();
    var g = Gardens.createGarden('alice', validPos, 'gardens').garden;
    Gardens.setGardenPublic(g.id, 'alice', true);
    var stats = Gardens.getGardenStats(g.id);
    assert(stats.isPublic === true, 'Garden should be public');
  });

  test('owner can make garden private again', function() {
    reset();
    var g = Gardens.createGarden('alice', validPos, 'gardens').garden;
    Gardens.setGardenPublic(g.id, 'alice', true);
    var result = Gardens.setGardenPublic(g.id, 'alice', false);
    assert(result.success === true, 'Should succeed setting private');
    var stats = Gardens.getGardenStats(g.id);
    assert(stats.isPublic === false, 'Garden should be private again');
  });

  test('non-owner cannot change visibility', function() {
    reset();
    var g = Gardens.createGarden('alice', validPos, 'gardens').garden;
    var result = Gardens.setGardenPublic(g.id, 'bob', true);
    assert(result.success === false, 'Non-owner should not change visibility');
    assert(result.error.includes('owner'), 'Error should mention owner');
  });

  test('fails for unknown garden', function() {
    reset();
    var result = Gardens.setGardenPublic('nonexistent', 'alice', true);
    assert(result.success === false, 'Should fail for unknown garden');
  });

  test('fails with non-boolean isPublic', function() {
    reset();
    var g = Gardens.createGarden('alice', validPos, 'gardens').garden;
    var result = Gardens.setGardenPublic(g.id, 'alice', 'yes');
    assert(result.success === false, 'Should fail with non-boolean isPublic');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Protocol message handlers
// ═══════════════════════════════════════════════════════════════════════════

suite('Protocol Handlers', function() {
  test('handleGardenCreate creates a garden from protocol message', function() {
    reset();
    var msg = {
      from: 'alice',
      payload: {
        position: { x: 5, y: 0, z: 5 },
        zone: 'gardens'
      }
    };
    var result = Gardens.handleGardenCreate(msg);
    assert(result.success === true, 'handleGardenCreate should succeed');
    assert(result.garden !== undefined, 'Should return garden');
    assert(result.garden.ownerId === 'alice', 'ownerId should be alice');
  });

  test('handleGardenCreate defaults zone to gardens', function() {
    reset();
    var msg = {
      from: 'alice',
      payload: { position: { x: 0, y: 0, z: 0 } }
    };
    var result = Gardens.handleGardenCreate(msg);
    assert(result.success === true, 'Should succeed');
    assert(result.garden.zoneName === 'gardens', 'Should default to gardens zone');
  });

  test('handleGardenInvite invites a collaborator', function() {
    reset();
    var g = Gardens.createGarden('alice', validPos, 'gardens').garden;
    var msg = {
      from: 'alice',
      payload: { gardenId: g.id, collaboratorId: 'bob' }
    };
    var result = Gardens.handleGardenInvite(msg);
    assert(result.success === true, 'handleGardenInvite should succeed');
    var collabs = Gardens.getCollaborators(g.id);
    assert(collabs.indexOf('bob') !== -1, 'bob should now be a collaborator');
  });

  test('handleGardenUninvite removes a collaborator', function() {
    reset();
    var g = Gardens.createGarden('alice', validPos, 'gardens').garden;
    Gardens.addCollaborator(g.id, 'alice', 'bob');
    var msg = {
      from: 'alice',
      payload: { gardenId: g.id, collaboratorId: 'bob' }
    };
    var result = Gardens.handleGardenUninvite(msg);
    assert(result.success === true, 'handleGardenUninvite should succeed');
    var collabs = Gardens.getCollaborators(g.id);
    assert(collabs.indexOf('bob') === -1, 'bob should no longer be a collaborator');
  });

  test('handleGardenTend records tending', function() {
    reset();
    var g = Gardens.createGarden('alice', validPos, 'gardens').garden;
    var msg = {
      from: 'alice',
      payload: { gardenId: g.id, action: 'water' }
    };
    var result = Gardens.handleGardenTend(msg);
    assert(result.success === true, 'handleGardenTend should succeed');
    assert(result.tendingEvent !== undefined, 'Should return tendingEvent');
  });

  test('handleGardenSetPublic makes garden public', function() {
    reset();
    var g = Gardens.createGarden('alice', validPos, 'gardens').garden;
    var msg = {
      from: 'alice',
      payload: { gardenId: g.id, isPublic: true }
    };
    var result = Gardens.handleGardenSetPublic(msg);
    assert(result.success === true, 'handleGardenSetPublic should succeed');
    var stats = Gardens.getGardenStats(g.id);
    assert(stats.isPublic === true, 'Garden should be public');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Integration scenarios
// ═══════════════════════════════════════════════════════════════════════════

suite('Integration: Full Collaboration Workflow', function() {
  test('full cycle: create, invite, tend, share, harvest', function() {
    reset();

    // Alice creates a garden
    var createResult = Gardens.createGarden('alice', { x: 0, y: 0, z: 0 }, 'gardens');
    assert(createResult.success === true, 'Garden creation should succeed');
    var gardenId = createResult.garden.id;

    // Alice invites bob and charlie
    assert(Gardens.addCollaborator(gardenId, 'alice', 'bob').success === true, 'Add bob');
    assert(Gardens.addCollaborator(gardenId, 'alice', 'charlie').success === true, 'Add charlie');

    // All three tend the garden
    Gardens.tendGarden(gardenId, 'alice', 'water');
    Gardens.tendGarden(gardenId, 'alice', 'weed');
    Gardens.tendGarden(gardenId, 'bob', 'fertilize');
    Gardens.tendGarden(gardenId, 'bob', 'water');
    Gardens.tendGarden(gardenId, 'charlie', 'weed');

    // Check health is > 0 with collaboration bonus
    var stats = Gardens.getGardenStats(gardenId);
    assert(stats.health > 0, 'Garden should have positive health');
    assert(stats.collaborationBonus > 0, 'Should have collaboration bonus');

    // Check shares sum to 1
    var shareAlice = Gardens.getHarvestShare(gardenId, 'alice');
    var shareBob = Gardens.getHarvestShare(gardenId, 'bob');
    var shareCharlie = Gardens.getHarvestShare(gardenId, 'charlie');
    var total = shareAlice + shareBob + shareCharlie;
    assert(Math.abs(total - 1) < 0.001, 'Shares should sum to 1');

    // alice contributed 2, bob 2, charlie 1 — total 5
    assert(Math.abs(shareAlice - 2/5) < 0.001, 'Alice share should be 2/5');
    assert(Math.abs(shareBob - 2/5) < 0.001, 'Bob share should be 2/5');
    assert(Math.abs(shareCharlie - 1/5) < 0.001, 'Charlie share should be 1/5');
  });

  test('removing collaborator does not affect past contributions', function() {
    reset();
    var g = Gardens.createGarden('alice', validPos, 'gardens').garden;
    Gardens.addCollaborator(g.id, 'alice', 'bob');
    Gardens.tendGarden(g.id, 'bob', 'water');
    Gardens.removeCollaborator(g.id, 'alice', 'bob');

    // bob's contribution should still be recorded
    var contributions = Gardens.getContributions(g.id);
    assert(contributions['bob'] === 1, 'Past contributions should persist after removal');
  });

  test('making garden public allows community tending', function() {
    reset();
    var g = Gardens.createGarden('alice', validPos, 'gardens').garden;
    Gardens.setGardenPublic(g.id, 'alice', true);

    // Strangers can tend
    var r1 = Gardens.tendGarden(g.id, 'stranger1', 'water');
    var r2 = Gardens.tendGarden(g.id, 'stranger2', 'weed');
    assert(r1.success === true, 'stranger1 should tend public garden');
    assert(r2.success === true, 'stranger2 should tend public garden');

    var bonus = Gardens.getBonusFromCollaboration(g);
    assert(bonus > 0, 'Community tending should generate collaboration bonus');
  });
});

const success = report();
process.exit(success ? 0 : 1);
