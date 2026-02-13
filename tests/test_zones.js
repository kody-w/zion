const { test, suite, report, assert } = require('./test_runner');
const Zones = require('../src/js/zones');

suite('Zone Tests', () => {

  test('8 genesis zones exist', () => {
    const zoneIds = Zones.getAllZoneIds();
    assert.strictEqual(zoneIds.length, 8, 'Should have exactly 8 zones');

    const expectedZones = ['nexus', 'gardens', 'athenaeum', 'studio', 'wilds', 'agora', 'commons', 'arena'];
    expectedZones.forEach(zoneId => {
      assert(zoneIds.includes(zoneId), `Missing zone: ${zoneId}`);
    });
  });

  test('Each zone has rules object', () => {
    const zoneIds = Zones.getAllZoneIds();
    zoneIds.forEach(zoneId => {
      const zone = Zones.getZone(zoneId);
      assert(zone !== null, `Zone ${zoneId} not found`);
      assert(zone.rules !== undefined, `Zone ${zoneId} missing rules`);
      assert(typeof zone.rules === 'object', `Zone ${zoneId} rules not an object`);
    });
  });

  test('Each zone has required rule fields', () => {
    const zoneIds = Zones.getAllZoneIds();
    const requiredFields = ['pvp', 'building', 'harvesting', 'trading', 'competition', 'safe'];

    zoneIds.forEach(zoneId => {
      const rules = Zones.getZoneRules(zoneId);
      requiredFields.forEach(field => {
        assert(rules[field] !== undefined, `Zone ${zoneId} missing rule: ${field}`);
      });
    });
  });

  test('Nexus: pvp=false, safe=true, competition=false', () => {
    const rules = Zones.getZoneRules('nexus');
    assert.strictEqual(rules.pvp, false, 'Nexus should have pvp=false');
    assert.strictEqual(rules.safe, true, 'Nexus should have safe=true');
    assert.strictEqual(rules.competition, false, 'Nexus should have competition=false');
  });

  test('Arena: pvp=true, competition=true', () => {
    const rules = Zones.getZoneRules('arena');
    assert.strictEqual(rules.pvp, true, 'Arena should have pvp=true');
    assert.strictEqual(rules.competition, true, 'Arena should have competition=true');
  });

  test('Gardens: harvesting=true, building=false', () => {
    const rules = Zones.getZoneRules('gardens');
    assert.strictEqual(rules.harvesting, true, 'Gardens should have harvesting=true');
    assert.strictEqual(rules.building, false, 'Gardens should have building=false');
  });

  test('Commons: building=true', () => {
    const rules = Zones.getZoneRules('commons');
    assert.strictEqual(rules.building, true, 'Commons should have building=true');
  });

  test('Cannot build in no-build zone (nexus)', () => {
    const allowed = Zones.isActionAllowed('build', 'nexus');
    assert.strictEqual(allowed, false, 'Building should not be allowed in Nexus');
  });

  test('Can build in commons', () => {
    const allowed = Zones.isActionAllowed('build', 'commons');
    assert.strictEqual(allowed, true, 'Building should be allowed in Commons');
  });

  test('Cannot challenge in non-competition zone (nexus)', () => {
    const allowed = Zones.isActionAllowed('challenge', 'nexus');
    assert.strictEqual(allowed, false, 'Challenge should not be allowed in Nexus');
  });

  test('Can challenge in arena', () => {
    const allowed = Zones.isActionAllowed('challenge', 'arena');
    assert.strictEqual(allowed, true, 'Challenge should be allowed in Arena');
  });

  test('All zones connected to Nexus', () => {
    const zoneIds = Zones.getAllZoneIds();
    zoneIds.forEach(zoneId => {
      if (zoneId === 'nexus') return;

      const zone = Zones.getZone(zoneId);
      const connectedToNexus = zone.portals.includes('nexus');
      const nexusConnectedToZone = Zones.getConnectedZones('nexus').includes(zoneId);

      assert(connectedToNexus || nexusConnectedToZone,
        `Zone ${zoneId} should be connected to Nexus either directly or via Nexus portals`);
    });
  });

  test('getSpawnZone returns nexus', () => {
    const spawnZone = Zones.getSpawnZone();
    assert.strictEqual(spawnZone, 'nexus', 'Spawn zone should be nexus');
  });

  test('getZoneRules returns correct rules object', () => {
    const rules = Zones.getZoneRules('gardens');
    assert(rules !== null, 'Rules should not be null');
    assert(typeof rules === 'object', 'Rules should be an object');
    assert.strictEqual(rules.harvesting, true);
    assert.strictEqual(rules.building, false);
  });

  test('getZone returns complete zone data', () => {
    const zone = Zones.getZone('athenaeum');
    assert(zone !== null, 'Zone should not be null');
    assert.strictEqual(zone.name, 'The Athenaeum');
    assert(zone.description !== undefined, 'Zone should have description');
    assert(zone.terrain !== undefined, 'Zone should have terrain');
    assert(zone.bounds !== undefined, 'Zone should have bounds');
    assert(zone.rules !== undefined, 'Zone should have rules');
    assert(zone.portals !== undefined, 'Zone should have portals');
  });

  test('getConnectedZones returns portal array', () => {
    const portals = Zones.getConnectedZones('nexus');
    assert(Array.isArray(portals), 'Should return an array');
    assert(portals.length > 0, 'Nexus should have connected zones');
    assert(portals.includes('gardens'), 'Nexus should connect to gardens');
    assert(portals.includes('arena'), 'Nexus should connect to arena');
  });

  test('zoneExists checks zone validity', () => {
    assert.strictEqual(Zones.zoneExists('nexus'), true);
    assert.strictEqual(Zones.zoneExists('gardens'), true);
    assert.strictEqual(Zones.zoneExists('invalid_zone'), false);
    assert.strictEqual(Zones.zoneExists(''), false);
  });

  test('isActionAllowed returns false for invalid zone', () => {
    const allowed = Zones.isActionAllowed('build', 'invalid_zone');
    assert.strictEqual(allowed, false, 'Should return false for invalid zone');
  });

  test('isActionAllowed returns true for unmapped actions', () => {
    const allowed = Zones.isActionAllowed('say', 'nexus');
    assert.strictEqual(allowed, true, 'Unmapped actions should be allowed by default');
  });

  test('Harvesting allowed in gardens and wilds', () => {
    assert.strictEqual(Zones.isActionAllowed('harvest', 'gardens'), true);
    assert.strictEqual(Zones.isActionAllowed('harvest', 'wilds'), true);
  });

  test('Trading allowed in most zones', () => {
    const tradingZones = ['nexus', 'gardens', 'athenaeum', 'studio', 'wilds', 'agora', 'commons'];
    tradingZones.forEach(zoneId => {
      const allowed = Zones.isActionAllowed('trade_offer', zoneId);
      assert.strictEqual(allowed, true, `Trading should be allowed in ${zoneId}`);
    });
  });

  test('Trading not allowed in arena', () => {
    const allowed = Zones.isActionAllowed('trade_offer', 'arena');
    assert.strictEqual(allowed, false, 'Trading should not be allowed in Arena');
  });

});

const success = report();
process.exit(success ? 0 : 1);
