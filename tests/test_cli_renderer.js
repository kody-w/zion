// test_cli_renderer.js — Tests for ZION CLI ASCII renderer
const { test, suite, report, assert } = require('./test_runner');
const path = require('path');
const Renderer = require(path.join(__dirname, '..', 'cli', 'renderer.js'));
const Zones = require(path.join(__dirname, '..', 'src', 'js', 'zones.js'));

suite('CLI Renderer — Viewport', function() {
  test('worldToView centers player in viewport', function() {
    var v = Renderer.worldToView(10, 10, 'nexus', 10, 10);
    assert.strictEqual(v.x, Math.floor(Renderer.VIEW_W / 2));
    assert.strictEqual(v.z, Math.floor(Renderer.VIEW_H / 2));
  });

  test('worldToView offsets relative to player', function() {
    var v = Renderer.worldToView(15, 10, 'nexus', 10, 10);
    assert.strictEqual(v.x, Math.floor(Renderer.VIEW_W / 2) + 5);
  });

  test('inViewport returns true for valid coordinates', function() {
    assert.strictEqual(Renderer.inViewport(0, 0), true);
    assert.strictEqual(Renderer.inViewport(Renderer.VIEW_W - 1, Renderer.VIEW_H - 1), true);
  });

  test('inViewport returns false for out of bounds', function() {
    assert.strictEqual(Renderer.inViewport(-1, 0), false);
    assert.strictEqual(Renderer.inViewport(0, -1), false);
    assert.strictEqual(Renderer.inViewport(Renderer.VIEW_W, 0), false);
    assert.strictEqual(Renderer.inViewport(0, Renderer.VIEW_H), false);
  });
});

suite('CLI Renderer — Render Output', function() {
  test('render produces non-empty output', function() {
    var lines = Renderer.render({
      state: { players: {}, structures: {}, gardens: {} },
      playerId: 'testplayer',
      playerPos: { x: 0, z: 0 },
      zone: 'nexus',
      chatLog: [],
      spark: 42
    });
    assert.ok(Array.isArray(lines));
    assert.ok(lines.length > 10, 'Expected at least 10 lines, got ' + lines.length);
  });

  test('render includes zone name in title', function() {
    var lines = Renderer.render({
      state: { players: {}, structures: {}, gardens: {} },
      playerId: 'testplayer',
      playerPos: { x: 0, z: 0 },
      zone: 'nexus',
      chatLog: [],
      spark: 0
    });
    var output = lines.join('\n');
    assert.ok(output.includes('The Nexus'), 'Output should include zone name "The Nexus"');
  });

  test('render includes player name in legend', function() {
    var lines = Renderer.render({
      state: { players: {}, structures: {}, gardens: {} },
      playerId: 'kody-w',
      playerPos: { x: 0, z: 0 },
      zone: 'nexus',
      chatLog: [],
      spark: 0
    });
    var output = lines.join('\n');
    assert.ok(output.includes('kody-w'), 'Output should include player name');
  });

  test('render includes Spark count in HUD', function() {
    var lines = Renderer.render({
      state: { players: {}, structures: {}, gardens: {} },
      playerId: 'testplayer',
      playerPos: { x: 0, z: 0 },
      zone: 'nexus',
      chatLog: [],
      spark: 99
    });
    var output = lines.join('\n');
    assert.ok(output.includes('99'), 'Output should include Spark count 99');
  });

  test('render includes portal list', function() {
    var lines = Renderer.render({
      state: { players: {}, structures: {}, gardens: {} },
      playerId: 'testplayer',
      playerPos: { x: 0, z: 0 },
      zone: 'nexus',
      chatLog: [],
      spark: 0
    });
    var output = lines.join('\n');
    assert.ok(output.includes('gardens'), 'Output should include portal "gardens"');
    assert.ok(output.includes('[1]'), 'Output should include portal number [1]');
  });

  test('render shows nearby players', function() {
    var state = {
      players: {
        other_player: {
          position: { x: 3, y: 0, z: 3, zone: 'nexus' }
        }
      },
      structures: {},
      gardens: {}
    };
    var lines = Renderer.render({
      state: state,
      playerId: 'testplayer',
      playerPos: { x: 0, z: 0 },
      zone: 'nexus',
      chatLog: [],
      spark: 0
    });
    var output = lines.join('\n');
    assert.ok(output.includes('other_player'), 'Output should include nearby player name');
  });

  test('render shows chat messages', function() {
    var lines = Renderer.render({
      state: { players: {}, structures: {}, gardens: {} },
      playerId: 'testplayer',
      playerPos: { x: 0, z: 0 },
      zone: 'nexus',
      chatLog: [
        { from: 'agent_042', text: 'Hello world!' }
      ],
      spark: 0
    });
    var output = lines.join('\n');
    assert.ok(output.includes('Hello world!'), 'Output should include chat message');
    assert.ok(output.includes('agent_042'), 'Output should include chat sender');
  });

  test('render in chat mode shows input prompt', function() {
    var lines = Renderer.render({
      state: { players: {}, structures: {}, gardens: {} },
      playerId: 'testplayer',
      playerPos: { x: 0, z: 0 },
      zone: 'nexus',
      chatLog: [],
      spark: 0,
      chatMode: true,
      chatBuffer: 'hello'
    });
    var output = lines.join('\n');
    assert.ok(output.includes('>'), 'Output should include input prompt ">"');
    assert.ok(output.includes('hello'), 'Output should include chat buffer');
  });

  test('render shows zone rules', function() {
    var lines = Renderer.render({
      state: { players: {}, structures: {}, gardens: {} },
      playerId: 'testplayer',
      playerPos: { x: 0, z: 0 },
      zone: 'arena',
      chatLog: [],
      spark: 0
    });
    var output = lines.join('\n');
    assert.ok(output.includes('PVP'), 'Arena should show PVP rule');
  });
});

suite('CLI Renderer — Help & Inventory', function() {
  test('renderHelp produces output with controls', function() {
    var lines = Renderer.renderHelp();
    var output = lines.join('\n');
    assert.ok(output.includes('WASD') || output.includes('W/'), 'Help should mention movement keys');
    assert.ok(output.includes('Enter'), 'Help should mention Enter key');
    assert.ok(output.includes('Quit'), 'Help should mention Quit');
  });

  test('renderInventory shows empty state', function() {
    var lines = Renderer.renderInventory({}, 0);
    var output = lines.join('\n');
    assert.ok(output.includes('empty') || output.includes('Empty'), 'Should show empty inventory');
  });

  test('renderInventory shows items', function() {
    var lines = Renderer.renderInventory({ wood: 5, crystal: 2 }, 100);
    var output = lines.join('\n');
    assert.ok(output.includes('wood'), 'Should show wood item');
    assert.ok(output.includes('crystal'), 'Should show crystal item');
    assert.ok(output.includes('100'), 'Should show Spark balance');
  });

  test('renderSplash shows ZION title', function() {
    var lines = Renderer.renderSplash();
    var output = lines.join('\n');
    assert.ok(output.includes('ZION') || output.includes('minds meet in peace'), 'Splash should include ZION branding');
  });
});

suite('CLI Renderer — All zones renderable', function() {
  var allZones = Zones.getAllZoneIds();
  allZones.forEach(function(zoneId) {
    test('renders zone: ' + zoneId, function() {
      var lines = Renderer.render({
        state: { players: {}, structures: {}, gardens: {} },
        playerId: 'testplayer',
        playerPos: { x: 0, z: 0 },
        zone: zoneId,
        chatLog: [],
        spark: 0
      });
      assert.ok(lines.length > 5, 'Zone ' + zoneId + ' should render');
      var zone = Zones.getZone(zoneId);
      var output = lines.join('\n');
      assert.ok(output.includes(zone.name), 'Should include zone name: ' + zone.name);
    });
  });
});

suite('CLI Renderer — MARKERS defined', function() {
  test('all markers are single characters or short strings', function() {
    var keys = Object.keys(Renderer.MARKERS);
    assert.ok(keys.length > 5, 'Should have multiple markers defined');
    keys.forEach(function(k) {
      assert.ok(typeof Renderer.MARKERS[k] === 'string', 'Marker ' + k + ' should be a string');
      assert.ok(Renderer.MARKERS[k].length > 0, 'Marker ' + k + ' should not be empty');
    });
  });
});

var ok = report();
process.exit(ok ? 0 : 1);
