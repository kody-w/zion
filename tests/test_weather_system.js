// test_weather_system.js — Tests for the weather_change protocol message and state handling
const { test, suite, report, assert } = require('./test_runner');
const Protocol = require('../src/js/protocol');
const State = require('../src/js/state');

// ── Protocol: weather_change message type ────────────────────────────────────

suite('Protocol: weather_change message type', function() {

  test('weather_change is a valid message type', function() {
    assert.ok(Protocol.MESSAGE_TYPES.has('weather_change'), 'MESSAGE_TYPES must include weather_change');
  });

  test('createMessage succeeds for weather_change', function() {
    var msg = Protocol.createMessage('weather_change', 'player1', { weather: 'rain' });
    assert.strictEqual(msg.type, 'weather_change');
    assert.strictEqual(msg.from, 'player1');
    assert.strictEqual(msg.payload.weather, 'rain');
  });

  test('weather_change message validates successfully', function() {
    var msg = Protocol.createMessage('weather_change', 'player1', { weather: 'snow' });
    var result = Protocol.validateMessage(msg);
    assert.strictEqual(result.valid, true, 'Expected valid, got errors: ' + result.errors.join(', '));
  });

  test('weather_change with zone-specific payload', function() {
    var msg = Protocol.createMessage('weather_change', 'world_system', {
      weather: 'thunderstorm',
      zone: 'wilds',
      duration: 300000
    });
    assert.strictEqual(msg.payload.weather, 'thunderstorm');
    assert.strictEqual(msg.payload.zone, 'wilds');
    assert.strictEqual(msg.payload.duration, 300000);
  });

  test('convenience creator works for weather_change', function() {
    var msg = Protocol.create.weather_change('system', { weather: 'fog' });
    assert.strictEqual(msg.type, 'weather_change');
    assert.strictEqual(msg.payload.weather, 'fog');
  });

  test('weather_change message has all standard protocol fields', function() {
    var msg = Protocol.createMessage('weather_change', 'player1', { weather: 'rain' });
    assert.ok(msg.v === 1, 'version');
    assert.ok(typeof msg.id === 'string' && msg.id.length > 0, 'id');
    assert.ok(typeof msg.ts === 'string', 'timestamp');
    assert.ok(typeof msg.seq === 'number', 'sequence');
    assert.ok(msg.from === 'player1', 'from');
    assert.ok(msg.type === 'weather_change', 'type');
    assert.ok(typeof msg.platform === 'string', 'platform');
    assert.ok(typeof msg.position === 'object', 'position');
    assert.ok(typeof msg.payload === 'object', 'payload');
  });

  test('weather_change is not in CONSENT_REQUIRED_TYPES', function() {
    assert.ok(!Protocol.CONSENT_REQUIRED_TYPES.has('weather_change'),
      'weather_change should not require consent');
  });
});

// ── State: global weather_change handling ────────────────────────────────────

suite('State: global weather_change handling', function() {

  test('applyMessage updates world.weather for global weather_change', function() {
    var state = State.createWorldState();
    assert.strictEqual(state.world.weather, 'clear');

    var msg = Protocol.createMessage('weather_change', 'system', { weather: 'rain' });
    var newState = State.applyMessage(state, msg);

    assert.strictEqual(newState.world.weather, 'rain');
  });

  test('global weather_change records who changed it', function() {
    var state = State.createWorldState();
    var msg = Protocol.createMessage('weather_change', 'weather_god', { weather: 'snow' });
    var newState = State.applyMessage(state, msg);

    assert.strictEqual(newState.world.weatherChangedBy, 'weather_god');
    assert.ok(newState.world.weatherChangedAt, 'weatherChangedAt should be set');
  });

  test('global weather_change does not create zoneWeather', function() {
    var state = State.createWorldState();
    var msg = Protocol.createMessage('weather_change', 'system', { weather: 'fog' });
    var newState = State.applyMessage(state, msg);

    assert.ok(!newState.world.zoneWeather, 'zoneWeather should not be set for global change');
  });

  test('sequential global weather changes update correctly', function() {
    var state = State.createWorldState();

    var msg1 = Protocol.createMessage('weather_change', 'system', { weather: 'rain' });
    state = State.applyMessage(state, msg1);
    assert.strictEqual(state.world.weather, 'rain');

    var msg2 = Protocol.createMessage('weather_change', 'system', { weather: 'thunderstorm' });
    state = State.applyMessage(state, msg2);
    assert.strictEqual(state.world.weather, 'thunderstorm');

    var msg3 = Protocol.createMessage('weather_change', 'system', { weather: 'clear' });
    state = State.applyMessage(state, msg3);
    assert.strictEqual(state.world.weather, 'clear');
  });

  test('weather_change without weather payload is a no-op', function() {
    var state = State.createWorldState();
    var msg = Protocol.createMessage('weather_change', 'system', { zone: 'nexus' });
    var newState = State.applyMessage(state, msg);

    assert.strictEqual(newState.world.weather, 'clear', 'Weather should remain clear');
  });

  test('weather_change is recorded in changes array', function() {
    var state = State.createWorldState();
    var msg = Protocol.createMessage('weather_change', 'system', { weather: 'blizzard' });
    var newState = State.applyMessage(state, msg);

    var lastChange = newState.changes[newState.changes.length - 1];
    assert.strictEqual(lastChange.type, 'weather_change');
    assert.strictEqual(lastChange.from, 'system');
  });
});

// ── State: zone-specific weather_change handling ─────────────────────────────

suite('State: zone-specific weather_change handling', function() {

  test('zone weather_change creates zoneWeather entry', function() {
    var state = State.createWorldState();
    var msg = Protocol.createMessage('weather_change', 'system', {
      weather: 'snow',
      zone: 'gardens'
    });
    var newState = State.applyMessage(state, msg);

    assert.ok(newState.world.zoneWeather, 'zoneWeather should exist');
    assert.ok(newState.world.zoneWeather.gardens, 'gardens entry should exist');
    assert.strictEqual(newState.world.zoneWeather.gardens.weather, 'snow');
  });

  test('zone weather_change records metadata', function() {
    var state = State.createWorldState();
    var msg = Protocol.createMessage('weather_change', 'druid_player', {
      weather: 'fog',
      zone: 'wilds',
      duration: 600000
    });
    var newState = State.applyMessage(state, msg);

    var zw = newState.world.zoneWeather.wilds;
    assert.strictEqual(zw.weather, 'fog');
    assert.strictEqual(zw.changed_by, 'druid_player');
    assert.strictEqual(zw.duration, 600000);
    assert.ok(zw.changed_at, 'changed_at should be set');
  });

  test('zone weather does not affect global weather', function() {
    var state = State.createWorldState();
    var msg = Protocol.createMessage('weather_change', 'system', {
      weather: 'thunderstorm',
      zone: 'arena'
    });
    var newState = State.applyMessage(state, msg);

    assert.strictEqual(newState.world.weather, 'clear', 'Global weather should stay clear');
    assert.strictEqual(newState.world.zoneWeather.arena.weather, 'thunderstorm');
  });

  test('multiple zones can have different weather', function() {
    var state = State.createWorldState();

    var msg1 = Protocol.createMessage('weather_change', 'system', {
      weather: 'snow',
      zone: 'wilds'
    });
    state = State.applyMessage(state, msg1);

    var msg2 = Protocol.createMessage('weather_change', 'system', {
      weather: 'rain',
      zone: 'gardens'
    });
    state = State.applyMessage(state, msg2);

    var msg3 = Protocol.createMessage('weather_change', 'system', {
      weather: 'sandstorm',
      zone: 'arena'
    });
    state = State.applyMessage(state, msg3);

    assert.strictEqual(state.world.zoneWeather.wilds.weather, 'snow');
    assert.strictEqual(state.world.zoneWeather.gardens.weather, 'rain');
    assert.strictEqual(state.world.zoneWeather.arena.weather, 'sandstorm');
  });

  test('zone weather can be updated (overwritten)', function() {
    var state = State.createWorldState();

    var msg1 = Protocol.createMessage('weather_change', 'system', {
      weather: 'rain',
      zone: 'nexus'
    });
    state = State.applyMessage(state, msg1);
    assert.strictEqual(state.world.zoneWeather.nexus.weather, 'rain');

    var msg2 = Protocol.createMessage('weather_change', 'system', {
      weather: 'clear',
      zone: 'nexus'
    });
    state = State.applyMessage(state, msg2);
    assert.strictEqual(state.world.zoneWeather.nexus.weather, 'clear');
  });

  test('zone weather with null duration stores null', function() {
    var state = State.createWorldState();
    var msg = Protocol.createMessage('weather_change', 'system', {
      weather: 'mist',
      zone: 'athenaeum'
    });
    var newState = State.applyMessage(state, msg);

    assert.strictEqual(newState.world.zoneWeather.athenaeum.duration, null);
  });
});

// ── State: immutability checks ───────────────────────────────────────────────

suite('State: weather_change immutability', function() {

  test('global weather_change does not mutate original state', function() {
    var state = State.createWorldState();
    var originalWeather = state.world.weather;

    var msg = Protocol.createMessage('weather_change', 'system', { weather: 'storm' });
    State.applyMessage(state, msg);

    assert.strictEqual(state.world.weather, originalWeather, 'Original state should not be mutated');
  });

  test('zone weather_change does not mutate original state', function() {
    var state = State.createWorldState();

    var msg = Protocol.createMessage('weather_change', 'system', {
      weather: 'snow',
      zone: 'gardens'
    });
    var newState = State.applyMessage(state, msg);

    assert.ok(!state.world.zoneWeather, 'Original state should not have zoneWeather');
    assert.ok(newState.world.zoneWeather.gardens, 'New state should have gardens weather');
  });

  test('updating zone weather does not mutate previous zoneWeather object', function() {
    var state = State.createWorldState();

    var msg1 = Protocol.createMessage('weather_change', 'system', {
      weather: 'rain',
      zone: 'nexus'
    });
    var state2 = State.applyMessage(state, msg1);

    var msg2 = Protocol.createMessage('weather_change', 'system', {
      weather: 'fog',
      zone: 'nexus'
    });
    var state3 = State.applyMessage(state2, msg2);

    assert.strictEqual(state2.world.zoneWeather.nexus.weather, 'rain', 'state2 should still have rain');
    assert.strictEqual(state3.world.zoneWeather.nexus.weather, 'fog', 'state3 should have fog');
  });
});

// ── All weather types round-trip ─────────────────────────────────────────────

suite('State: all weather types round-trip', function() {

  var WEATHER_TYPES = ['clear', 'cloudy', 'rain', 'heavy_rain', 'snow', 'blizzard',
                       'fog', 'thunderstorm', 'sandstorm', 'mist', 'storm'];

  WEATHER_TYPES.forEach(function(weatherType) {
    test('weather_change with type "' + weatherType + '" round-trips correctly', function() {
      var state = State.createWorldState();
      var msg = Protocol.createMessage('weather_change', 'system', { weather: weatherType });
      var newState = State.applyMessage(state, msg);
      assert.strictEqual(newState.world.weather, weatherType);
    });
  });

  WEATHER_TYPES.forEach(function(weatherType) {
    test('zone weather_change with type "' + weatherType + '" round-trips correctly', function() {
      var state = State.createWorldState();
      var msg = Protocol.createMessage('weather_change', 'system', {
        weather: weatherType,
        zone: 'wilds'
      });
      var newState = State.applyMessage(state, msg);
      assert.strictEqual(newState.world.zoneWeather.wilds.weather, weatherType);
    });
  });
});

report();
