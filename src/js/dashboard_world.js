// dashboard_world.js — WORLD STATUS panel for ZION dashboard (UI-only mode)
// Shows time of day, weather, active events, season info, and world news.
(function(exports) {
  'use strict';

  // ── Zone IDs ──────────────────────────────────────────────────────────────
  var ZONE_IDS = ['nexus', 'gardens', 'athenaeum', 'studio', 'wilds', 'agora', 'commons', 'arena'];

  var ZONE_NAMES = {
    nexus:     'The Nexus',
    gardens:   'The Gardens',
    athenaeum: 'The Athenaeum',
    studio:    'The Studio',
    wilds:     'The Wilds',
    agora:     'The Agora',
    commons:   'The Commons',
    arena:     'The Arena'
  };

  // ── Time System ───────────────────────────────────────────────────────────

  /**
   * Creates a new world time state.
   * 1 real second = 1 game minute (timeScale = 60).
   * Full day = 1200 ticks = 20 real minutes.
   */
  function createWorldTime() {
    return {
      tick: 0,
      dayLength: 1200,
      timeScale: 60
    };
  }

  /**
   * Advance world time by deltaTicks.
   * Returns new state (does not mutate).
   */
  function advanceTime(state, deltaTicks) {
    var delta = deltaTicks || 0;
    return {
      tick: state.tick + delta,
      dayLength: state.dayLength,
      timeScale: state.timeScale
    };
  }

  /**
   * Returns time-of-day as fraction 0–1.
   *   0.0 = midnight, 0.25 = 6:00, 0.5 = noon, 0.75 = 18:00
   */
  function getTimeOfDay(tick, dayLength) {
    var len = dayLength || 1200;
    return (tick % len) / len;
  }

  /**
   * Returns the named phase of day.
   * 0.00–0.20 → 'night'
   * 0.20–0.30 → 'dawn'
   * 0.30–0.45 → 'morning'
   * 0.45–0.55 → 'noon'
   * 0.55–0.70 → 'afternoon'
   * 0.70–0.80 → 'dusk'
   * 0.80–1.00 → 'evening'
   */
  function getPhaseOfDay(timeOfDay) {
    // Wrap only integer multiples to avoid floating-point drift at phase boundaries.
    var t = timeOfDay - Math.floor(timeOfDay); // equivalent to fmod, no precision loss
    if (t < 0.20) return 'night';
    if (t < 0.30) return 'dawn';
    if (t < 0.45) return 'morning';
    if (t < 0.55) return 'noon';
    if (t < 0.70) return 'afternoon';
    if (t < 0.80) return 'dusk';
    return 'evening';
  }

  /**
   * Formats time-of-day fraction as "HH:MM" (24-hour).
   */
  function formatGameTime(timeOfDay) {
    var t = timeOfDay - Math.floor(timeOfDay);
    var totalMinutes = Math.floor(t * 24 * 60);
    var hours   = Math.floor(totalMinutes / 60);
    var minutes = totalMinutes % 60;
    return (hours < 10 ? '0' : '') + hours + ':' + (minutes < 10 ? '0' : '') + minutes;
  }

  /**
   * Returns the current day number (1-based) from the tick counter.
   */
  function getDayNumber(tick, dayLength) {
    var len = dayLength || 1200;
    return Math.floor(tick / len) + 1;
  }

  /**
   * Returns the season name for a given day number.
   * Cycles every 360 days: spring 1–90, summer 91–180, autumn 181–270, winter 271–360.
   */
  function getSeason(dayNumber) {
    var d = ((dayNumber - 1) % 360) + 1; // 1-based within 360-day year
    if (d <= 90)  return 'spring';
    if (d <= 180) return 'summer';
    if (d <= 270) return 'autumn';
    return 'winter';
  }

  /**
   * Returns progress within current season as 0–1.
   */
  function getSeasonProgress(dayNumber) {
    var d = ((dayNumber - 1) % 360) + 1;
    if (d <= 90)  return (d - 1) / 90;
    if (d <= 180) return (d - 91) / 90;
    if (d <= 270) return (d - 181) / 90;
    return (d - 271) / 90;
  }

  /**
   * Returns a formatted display string for the current time state.
   * Example: "Day 42 | 14:30 | Afternoon | Summer"
   */
  function formatTimeDisplay(tick, dayLength) {
    var len     = dayLength || 1200;
    var tod     = getTimeOfDay(tick, len);
    var day     = getDayNumber(tick, len);
    var phase   = getPhaseOfDay(tod);
    var season  = getSeason(day);
    var timeStr = formatGameTime(tod);

    var phaseLabel  = phase.charAt(0).toUpperCase() + phase.slice(1);
    var seasonLabel = season.charAt(0).toUpperCase() + season.slice(1);

    return 'Day ' + day + ' | ' + timeStr + ' | ' + phaseLabel + ' | ' + seasonLabel;
  }

  // ── Seeded RNG ────────────────────────────────────────────────────────────

  /**
   * Simple deterministic PRNG based on mulberry32.
   * Returns a function that produces 0–1 floats.
   */
  function createSeededRng(seed) {
    var s = (seed >>> 0) || 1;
    return function() {
      s = (s + 0x6d2b79f5) >>> 0;
      var t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) >>> 0;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ── Weather System ────────────────────────────────────────────────────────

  /**
   * Creates an empty weather state.
   */
  function createWeatherState() {
    return {
      zones: {},
      globalWind: { speed: 0, direction: 0 },
      lastUpdate: 0
    };
  }

  // Relative likelihoods per season; each type maps to weight 0–10
  var WEATHER_WEIGHTS = {
    spring:   { clear: 4, cloudy: 3, overcast: 2, rain: 3, storm: 1, fog: 2, snow: 0, heatwave: 0, wind: 2 },
    summer:   { clear: 6, cloudy: 2, overcast: 1, rain: 2, storm: 2, fog: 0, snow: 0, heatwave: 2, wind: 1 },
    autumn:   { clear: 3, cloudy: 3, overcast: 3, rain: 3, storm: 2, fog: 3, snow: 1, heatwave: 0, wind: 3 },
    winter:   { clear: 2, cloudy: 3, overcast: 3, rain: 2, storm: 1, fog: 2, snow: 5, heatwave: 0, wind: 2 }
  };

  var WIND_DIRECTIONS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

  /**
   * Seeded weather generation for a single zone.
   * Returns { type, intensity, temperature, windSpeed, windDirection, visibility, precipitation }
   */
  function generateWeather(seed, zoneId, season, timeOfDay) {
    var rng     = createSeededRng(seed + _hashStr(zoneId + (season || 'spring')));
    var weights = WEATHER_WEIGHTS[season || 'spring'] || WEATHER_WEIGHTS.spring;

    // Build weighted table
    var types = Object.keys(weights);
    var total = 0;
    for (var i = 0; i < types.length; i++) {
      total += weights[types[i]];
    }
    var roll = rng() * total;
    var type = 'clear';
    var cum  = 0;
    for (var j = 0; j < types.length; j++) {
      cum += weights[types[j]];
      if (roll < cum) { type = types[j]; break; }
    }

    var intensity   = Math.round(rng() * 10) / 10; // 0.0–1.0
    var windSpeed   = Math.floor(rng() * 60);       // 0–59 km/h
    var windDir     = WIND_DIRECTIONS[Math.floor(rng() * 8)];
    var visibility  = _calcVisibility(type, intensity);
    var precip      = _calcPrecipitation(type, intensity);
    var temperature = getTemperature(season, timeOfDay, zoneId, { type: type, intensity: intensity });

    return {
      type:        type,
      intensity:   intensity,
      temperature: temperature,
      windSpeed:   windSpeed,
      windDirection: windDir,
      visibility:  visibility,
      precipitation: precip
    };
  }

  function _calcVisibility(type, intensity) {
    var base = { clear: 100, cloudy: 80, overcast: 60, rain: 50, storm: 30, fog: 20, snow: 40, heatwave: 90, wind: 70 };
    var v = (base[type] || 80) - Math.floor(intensity * 20);
    return Math.max(10, v);
  }

  function _calcPrecipitation(type, intensity) {
    if (type === 'rain' || type === 'storm') return Math.floor(intensity * 30);
    if (type === 'snow') return Math.floor(intensity * 15);
    return 0;
  }

  /** Simple djb2-style string hash to an unsigned integer. */
  function _hashStr(s) {
    var h = 5381;
    for (var i = 0; i < s.length; i++) {
      h = ((h << 5) + h) + s.charCodeAt(i);
      h = h >>> 0;
    }
    return h;
  }

  /**
   * Returns the current weather for a zone from state.
   */
  function getWeatherForZone(state, zoneId) {
    if (!state || !state.zones) return null;
    return state.zones[zoneId] || null;
  }

  /**
   * Update weather for all 8 zones; returns a new state.
   */
  function updateAllWeather(state, seed, season, timeOfDay) {
    var newZones = {};
    for (var i = 0; i < ZONE_IDS.length; i++) {
      var zid = ZONE_IDS[i];
      newZones[zid] = generateWeather(seed, zid, season, timeOfDay);
    }
    return {
      zones:      newZones,
      globalWind: { speed: Math.floor(Math.random() * 40), direction: Math.floor(Math.random() * 360) },
      lastUpdate: Date.now()
    };
  }

  // Season base temperatures (°C)
  var SEASON_BASE_TEMP = { spring: 15, summer: 28, autumn: 12, winter: 2 };

  // Zone temperature modifiers
  var ZONE_TEMP_MOD = { wilds: -3, arena: 2, gardens: 1 };

  // Weather temperature modifiers
  var WEATHER_TEMP_MOD = { rain: -3, heatwave: 10, snow: -5, storm: -4, fog: -1 };

  /**
   * Calculate temperature for zone/time/weather combination.
   */
  function getTemperature(season, timeOfDay, zoneId, weather) {
    var base     = SEASON_BASE_TEMP[season] !== undefined ? SEASON_BASE_TEMP[season] : 15;
    var tod      = timeOfDay || 0;
    var todMod   = 0;
    var phase    = getPhaseOfDay(tod);
    if (phase === 'night' || phase === 'evening') todMod = -8;
    else if (phase === 'noon') todMod = 5;
    else if (phase === 'afternoon') todMod = 3;
    else if (phase === 'morning' || phase === 'dawn') todMod = -2;

    var zoneMod    = ZONE_TEMP_MOD[zoneId] || 0;
    var weatherMod = 0;
    if (weather && weather.type) {
      weatherMod = WEATHER_TEMP_MOD[weather.type] || 0;
    }

    return Math.round(base + todMod + zoneMod + weatherMod);
  }

  /**
   * Returns human-readable weather summary.
   * Example: "Clear skies, 22C, Light breeze from NW, Visibility: Good"
   */
  function formatWeatherDisplay(weather) {
    if (!weather) return 'Unknown conditions';

    var typeLabels = {
      clear:    'Clear skies',
      cloudy:   'Partly cloudy',
      overcast: 'Overcast',
      rain:     'Rain',
      storm:    'Storm',
      fog:      'Foggy',
      snow:     'Snow',
      heatwave: 'Heat wave',
      wind:     'Windy'
    };

    var label = typeLabels[weather.type] || weather.type;
    var temp  = weather.temperature + 'C';

    var windLabel;
    var ws = weather.windSpeed || 0;
    if (ws < 5)       windLabel = 'Calm';
    else if (ws < 20) windLabel = 'Light breeze from ' + (weather.windDirection || 'N');
    else if (ws < 40) windLabel = 'Moderate wind from ' + (weather.windDirection || 'N');
    else              windLabel = 'Strong wind from ' + (weather.windDirection || 'N');

    var vis     = weather.visibility || 100;
    var visLabel;
    if (vis >= 80)      visLabel = 'Excellent';
    else if (vis >= 50) visLabel = 'Good';
    else if (vis >= 30) visLabel = 'Moderate';
    else                visLabel = 'Poor';

    return label + ', ' + temp + ', ' + windLabel + ', Visibility: ' + visLabel;
  }

  /**
   * Returns a bracket-icon for a weather type.
   */
  function getWeatherIcon(type) {
    var icons = {
      clear:    '[*]',
      cloudy:   '[~]',
      overcast: '[~]',
      rain:     '[/]',
      storm:    '[!]',
      fog:      '[.]',
      snow:     '[:]',
      heatwave: '[^]',
      wind:     '[>]'
    };
    return icons[type] || '[?]';
  }

  /**
   * Returns gameplay effects for a weather condition.
   * { fishingBonus, farmingBonus, explorationPenalty, combatModifier }
   */
  function getWeatherEffect(weather) {
    if (!weather) {
      return { fishingBonus: 0, farmingBonus: 0, explorationPenalty: 0, combatModifier: 0 };
    }
    var type   = weather.type || 'clear';
    var effect = {
      fishingBonus:       0,
      farmingBonus:       0,
      explorationPenalty: 0,
      combatModifier:     0
    };

    switch (type) {
      case 'rain':
        effect.fishingBonus  = 20;
        effect.farmingBonus  = 10;
        break;
      case 'storm':
        effect.explorationPenalty = 30;
        effect.combatModifier     = -10;
        break;
      case 'clear':
        effect.explorationPenalty = -10; // bonus (negative penalty)
        break;
      case 'heatwave':
        effect.farmingBonus = -20;
        break;
      case 'snow':
        effect.explorationPenalty = 15;
        effect.combatModifier     = -5;
        break;
      case 'fog':
        effect.explorationPenalty = 10;
        effect.combatModifier     = -5;
        break;
      case 'wind':
        effect.explorationPenalty = 5;
        break;
    }
    return effect;
  }

  // ── World Events ──────────────────────────────────────────────────────────

  /**
   * Creates an empty event state.
   */
  function createEventState() {
    return {
      active:   [],
      upcoming: [],
      history:  [],
      nextId:   1
    };
  }

  // Event type catalog
  var EVENT_TYPES = {
    market_day: {
      title:       'Market Day',
      description: 'Double market activity in the Agora. Merchants and buyers flood the stalls.',
      zone:        'agora',
      duration:    600
    },
    festival: {
      title:       'Community Festival',
      description: 'A joyful community celebration fills the Commons with music and laughter.',
      zone:        'commons',
      duration:    900
    },
    harvest: {
      title:       'Great Harvest',
      description: 'Bonus gathering in the Gardens as crops and herbs grow in abundance.',
      zone:        'gardens',
      duration:    480
    },
    tournament: {
      title:       'Grand Tournament',
      description: 'Competitors clash in the Arena for glory and prizes.',
      zone:        'arena',
      duration:    720
    },
    storm_surge: {
      title:       'Storm Surge',
      description: 'A violent storm tears through the Wilds. Dangerous for those unprepared.',
      zone:        'wilds',
      duration:    360
    },
    knowledge_fair: {
      title:       'Knowledge Fair',
      description: 'Bonus XP for learning and teaching in the Athenaeum.',
      zone:        'athenaeum',
      duration:    600
    },
    art_exhibition: {
      title:       'Art Exhibition',
      description: 'A grand exhibition in the Studio grants crafting bonuses to all artisans.',
      zone:        'studio',
      duration:    480
    },
    full_moon: {
      title:       'Full Moon',
      description: 'The full moon rises, enhancing stargazing and attracting rare fish.',
      zone:        'nexus',
      duration:    1200
    },
    meteor_shower: {
      title:       'Meteor Shower',
      description: 'Star fragments can be found across the world during this celestial event.',
      zone:        'nexus',
      duration:    600
    },
    migration: {
      title:       'Creature Migration',
      description: 'Rare creatures appear in the Wilds, offering unique encounters.',
      zone:        'wilds',
      duration:    720
    }
  };

  var EVENT_TYPE_KEYS = Object.keys(EVENT_TYPES);

  /**
   * Seeded event generation for a given day and season.
   * Returns an event object: { id, type, title, description, zone, startTick, duration, rewards, participants }
   */
  function generateEvent(seed, dayNumber, season) {
    var rng = createSeededRng(seed + (dayNumber || 1) * 997 + _hashStr(season || 'spring'));
    var idx  = Math.floor(rng() * EVENT_TYPE_KEYS.length);
    var type = EVENT_TYPE_KEYS[idx];
    var def  = EVENT_TYPES[type];

    // Seasonal event weighting: some events appear more in certain seasons
    var seasonalBias = {
      spring:  ['harvest', 'festival', 'migration'],
      summer:  ['tournament', 'market_day', 'meteor_shower'],
      autumn:  ['harvest', 'art_exhibition', 'knowledge_fair'],
      winter:  ['festival', 'full_moon', 'storm_surge']
    };
    var biased = seasonalBias[season || 'spring'];
    if (biased && rng() < 0.5) {
      type = biased[Math.floor(rng() * biased.length)];
      def  = EVENT_TYPES[type];
    }

    var startTick = Math.floor(rng() * 1200); // random start within a day
    var rewards = {
      sparks:    10 + Math.floor(rng() * 40),
      xp:        5  + Math.floor(rng() * 20),
      item:      rng() > 0.7 ? 'rare_item' : null
    };

    return {
      id:           0, // assigned by state
      type:         type,
      title:        def.title,
      description:  def.description,
      zone:         def.zone,
      startTick:    startTick,
      duration:     def.duration,
      rewards:      rewards,
      participants: []
    };
  }

  /**
   * Returns events whose time window covers currentTick.
   */
  function getActiveEvents(state, currentTick) {
    if (!state || !state.active) return [];
    return state.active.filter(function(ev) {
      return currentTick >= ev.startTick && currentTick < (ev.startTick + ev.duration);
    });
  }

  /**
   * Returns events starting within lookahead ticks from currentTick.
   */
  function getUpcomingEvents(state, currentTick, lookahead) {
    if (!state || !state.upcoming) return [];
    var ahead = lookahead !== undefined ? lookahead : 300;
    return state.upcoming.filter(function(ev) {
      return ev.startTick > currentTick && ev.startTick <= currentTick + ahead;
    });
  }

  /**
   * Add a player as a participant in an event.
   * Returns { success, state, event }.
   */
  function joinEvent(state, eventId, playerId) {
    if (!state || !state.active) return { success: false, state: state, event: null };
    var ev = null;
    var activeIdx = -1;
    for (var i = 0; i < state.active.length; i++) {
      if (state.active[i].id === eventId) {
        ev = state.active[i];
        activeIdx = i;
        break;
      }
    }
    if (!ev) return { success: false, state: state, event: null };
    if (ev.participants.indexOf(playerId) !== -1) {
      return { success: false, state: state, event: ev };
    }

    var newEvent = _cloneEvent(ev);
    newEvent.participants.push(playerId);

    var newActive = state.active.slice();
    newActive[activeIdx] = newEvent;

    var newState = {
      active:   newActive,
      upcoming: state.upcoming,
      history:  state.history,
      nextId:   state.nextId
    };
    return { success: true, state: newState, event: newEvent };
  }

  /**
   * Finalize an event. Moves it to history and returns rewards.
   * Returns { success, state, rewards }.
   */
  function completeEvent(state, eventId, currentTick) {
    if (!state || !state.active) return { success: false, state: state, rewards: [] };
    var ev = null;
    var activeIdx = -1;
    for (var i = 0; i < state.active.length; i++) {
      if (state.active[i].id === eventId) {
        ev = state.active[i];
        activeIdx = i;
        break;
      }
    }
    if (!ev) return { success: false, state: state, rewards: [] };

    var completedEvent = _cloneEvent(ev);
    completedEvent.completedAt = currentTick;

    var newActive  = state.active.slice();
    newActive.splice(activeIdx, 1);

    var newHistory = state.history.concat([completedEvent]);

    var rewards = ev.participants.map(function(pid) {
      return { playerId: pid, sparks: ev.rewards.sparks, xp: ev.rewards.xp, item: ev.rewards.item };
    });

    var newState = {
      active:   newActive,
      upcoming: state.upcoming,
      history:  newHistory,
      nextId:   state.nextId
    };
    return { success: true, state: newState, rewards: rewards };
  }

  function _cloneEvent(ev) {
    return {
      id:           ev.id,
      type:         ev.type,
      title:        ev.title,
      description:  ev.description,
      zone:         ev.zone,
      startTick:    ev.startTick,
      duration:     ev.duration,
      rewards:      { sparks: ev.rewards.sparks, xp: ev.rewards.xp, item: ev.rewards.item },
      participants: ev.participants.slice(),
      completedAt:  ev.completedAt
    };
  }

  /**
   * Returns HTML for an event card.
   */
  function formatEventCard(event, currentTick) {
    var tick   = currentTick || 0;
    var endTick = event.startTick + event.duration;
    var remaining = endTick - tick;
    var minutes   = Math.max(0, Math.floor(remaining / 60));
    var seconds   = Math.max(0, remaining % 60);
    var timeLabel = remaining > 0
      ? (minutes + 'm ' + seconds + 's remaining')
      : 'Ended';

    var zoneName  = ZONE_NAMES[event.zone] || event.zone;
    var partCount = event.participants ? event.participants.length : 0;

    return '<div class="dw-event-card" data-event-id="' + event.id + '">' +
      '<div class="dw-event-header">' +
        '<span class="dw-event-title">' + _escHtml(event.title) + '</span>' +
        '<span class="dw-event-zone">' + _escHtml(zoneName) + '</span>' +
      '</div>' +
      '<div class="dw-event-desc">' + _escHtml(event.description) + '</div>' +
      '<div class="dw-event-meta">' +
        '<span class="dw-event-time">' + timeLabel + '</span>' +
        '<span class="dw-event-participants">' + partCount + ' participants</span>' +
      '</div>' +
      '<button class="dw-event-join-btn" data-event-id="' + event.id + '">[Join]</button>' +
    '</div>';
  }

  // ── World News ────────────────────────────────────────────────────────────

  /**
   * Creates an empty news state.
   */
  function createNewsState() {
    return {
      entries:    [],
      maxEntries: 50
    };
  }

  /**
   * Adds a news entry to the state. Trims to maxEntries.
   * entry: { type, title, description, timestamp, zone }
   */
  function addNewsEntry(state, entry) {
    var newEntries = state.entries.concat([{
      type:        entry.type      || 'discovery',
      title:       entry.title     || '',
      description: entry.description || '',
      timestamp:   entry.timestamp !== undefined ? entry.timestamp : Date.now(),
      zone:        entry.zone      || null
    }]);
    if (newEntries.length > state.maxEntries) {
      newEntries = newEntries.slice(newEntries.length - state.maxEntries);
    }
    return { entries: newEntries, maxEntries: state.maxEntries };
  }

  /**
   * Returns the last N news entries (default 10), most recent last.
   */
  function getRecentNews(state, limit) {
    if (!state || !state.entries) return [];
    var n = limit !== undefined ? limit : 10;
    return state.entries.slice(-n);
  }

  /**
   * Returns HTML for a scrollable news feed.
   */
  function formatNewsFeed(entries) {
    if (!entries || entries.length === 0) {
      return '<div class="dw-news-feed"><p class="dw-news-empty">No recent news.</p></div>';
    }

    var TYPE_BADGE_CLASS = {
      event_start:  'badge-event',
      event_end:    'badge-event',
      election:     'badge-election',
      guild:        'badge-guild',
      achievement:  'badge-achievement',
      weather:      'badge-weather',
      discovery:    'badge-discovery',
      economy:      'badge-economy'
    };

    var html = '<div class="dw-news-feed">';
    // Show most recent first
    var reversed = entries.slice().reverse();
    for (var i = 0; i < reversed.length; i++) {
      var e        = reversed[i];
      var badgeCls = TYPE_BADGE_CLASS[e.type] || 'badge-discovery';
      var tsLabel  = _formatTimestamp(e.timestamp);
      html += '<div class="dw-news-entry">' +
        '<span class="dw-news-ts">' + _escHtml(tsLabel) + '</span>' +
        '<span class="dw-news-badge ' + badgeCls + '">' + _escHtml(e.type) + '</span>' +
        '<span class="dw-news-title">' + _escHtml(e.title) + '</span>' +
        '<p class="dw-news-desc">'    + _escHtml(e.description) + '</p>' +
      '</div>';
    }
    html += '</div>';
    return html;
  }

  /**
   * Compares current and previous game state, generating news entries for changes.
   * Returns an array of news entry objects.
   */
  function generateAutoNews(gameState, previousState) {
    var news = [];
    if (!gameState || !previousState) return news;

    // Weather shifts
    if (gameState.weather && previousState.weather) {
      for (var i = 0; i < ZONE_IDS.length; i++) {
        var zid = ZONE_IDS[i];
        var cur  = gameState.weather.zones  && gameState.weather.zones[zid];
        var prev = previousState.weather && previousState.weather.zones && previousState.weather.zones[zid];
        if (cur && prev && cur.type !== prev.type) {
          news.push({
            type:        'weather',
            title:       'Weather change in ' + (ZONE_NAMES[zid] || zid),
            description: 'Conditions changed from ' + prev.type + ' to ' + cur.type + '.',
            timestamp:   Date.now(),
            zone:        zid
          });
        }
      }
    }

    // Economy milestones (if ledger present)
    if (gameState.ledger && previousState.ledger) {
      var curTx  = (gameState.ledger.transactions  || []).length;
      var prevTx = (previousState.ledger.transactions || []).length;
      if (curTx > prevTx) {
        var delta = curTx - prevTx;
        if (delta >= 10) {
          news.push({
            type:        'economy',
            title:       'Busy market activity',
            description: delta + ' new transactions recorded in the ledger.',
            timestamp:   Date.now(),
            zone:        'agora'
          });
        }
      }
    }

    // Zone player arrivals (players object or array)
    if (gameState.players && previousState.players) {
      var curPlayers  = Object.keys(gameState.players).length;
      var prevPlayers = Object.keys(previousState.players).length;
      if (curPlayers > prevPlayers) {
        news.push({
          type:        'discovery',
          title:       'New arrivals in ZION',
          description: (curPlayers - prevPlayers) + ' new citizen(s) have joined the world.',
          timestamp:   Date.now(),
          zone:        'nexus'
        });
      }
    }

    return news;
  }

  // ── Zone Activity ─────────────────────────────────────────────────────────

  /**
   * Returns per-zone activity summary from game state.
   * Returns { zoneId: { playerCount, npcCount, activeEvents, weather, temperature } }
   */
  function getZoneActivity(gameState) {
    var result = {};

    for (var i = 0; i < ZONE_IDS.length; i++) {
      var zid = ZONE_IDS[i];
      result[zid] = {
        playerCount:  0,
        npcCount:     0,
        activeEvents: 0,
        weather:      null,
        temperature:  null
      };
    }

    if (!gameState) return result;

    // Count players per zone
    if (gameState.players) {
      var playerKeys = Object.keys(gameState.players);
      for (var p = 0; p < playerKeys.length; p++) {
        var player = gameState.players[playerKeys[p]];
        var zone   = player && player.zone;
        if (zone && result[zone]) {
          result[zone].playerCount++;
        }
      }
    }

    // Count NPCs per zone
    if (gameState.npcs) {
      var npcKeys = Object.keys(gameState.npcs);
      for (var n = 0; n < npcKeys.length; n++) {
        var npc  = gameState.npcs[npcKeys[n]];
        var nZone = npc && npc.zone;
        if (nZone && result[nZone]) {
          result[nZone].npcCount++;
        }
      }
    }

    // Count active events per zone
    if (gameState.events && gameState.events.active) {
      var evs   = gameState.events.active;
      var cTick = gameState.tick || 0;
      for (var e = 0; e < evs.length; e++) {
        var ev = evs[e];
        if (cTick >= ev.startTick && cTick < ev.startTick + ev.duration) {
          if (ev.zone && result[ev.zone]) {
            result[ev.zone].activeEvents++;
          }
        }
      }
    }

    // Attach weather per zone
    if (gameState.weather && gameState.weather.zones) {
      for (var z = 0; z < ZONE_IDS.length; z++) {
        var zkey = ZONE_IDS[z];
        var w    = gameState.weather.zones[zkey];
        if (w) {
          result[zkey].weather     = w.type;
          result[zkey].temperature = w.temperature;
        }
      }
    }

    return result;
  }

  /**
   * Returns an HTML grid of all 8 zones with activity summaries.
   * currentZone (optional) is highlighted in gold.
   */
  function formatZoneActivityGrid(activity, currentZone) {
    var html = '<div class="dw-zone-grid">';
    for (var i = 0; i < ZONE_IDS.length; i++) {
      var zid      = ZONE_IDS[i];
      var data     = (activity && activity[zid]) || { playerCount: 0, npcCount: 0, activeEvents: 0, weather: null, temperature: null };
      var name     = ZONE_NAMES[zid] || zid;
      var isCurrent = zid === currentZone;
      var cls      = 'dw-zone-cell' + (isCurrent ? ' dw-zone-current' : '');
      var wIcon    = data.weather ? getWeatherIcon(data.weather) : '';
      var tempStr  = data.temperature !== null && data.temperature !== undefined ? data.temperature + 'C' : '--';

      html += '<div class="' + cls + '" data-zone="' + zid + '">' +
        '<div class="dw-zone-name">' + _escHtml(name) + '</div>' +
        '<div class="dw-zone-stats">' +
          '<span class="dw-zone-players">' + data.playerCount + ' players</span>' +
          '<span class="dw-zone-npcs">'    + data.npcCount    + ' npcs</span>' +
        '</div>' +
        '<div class="dw-zone-events">' + data.activeEvents + ' event(s)</div>' +
        '<div class="dw-zone-weather">' + wIcon + ' ' + (data.weather || '--') + ' ' + tempStr + '</div>' +
      '</div>';
    }
    html += '</div>';
    return html;
  }

  // ── Panel DOM builder ────────────────────────────────────────────────────

  /**
   * Creates the full WORLD STATUS panel DOM element (div).
   * Works in Node.js (returns a plain object) and in browser (returns HTMLElement).
   */
  function createWorldPanel() {
    // Build lightweight panel descriptor that works both in Node and browser
    var panel = _createElement('div', 'dw-world-panel');

    // ── Clock & Calendar section ──────────────────────────────────────────
    var clockSection = _createElement('section', 'dw-section dw-section-clock');
    clockSection.innerHTML =
      '<h3 class="dw-section-title">Clock and Calendar</h3>' +
      '<div class="dw-clock-display">' +
        '<span class="dw-time-display">00:00</span>' +
        '<span class="dw-phase-display">Night</span>' +
      '</div>' +
      '<div class="dw-calendar-display">' +
        '<span class="dw-day-display">Day 1</span>' +
        '<span class="dw-season-display">Spring</span>' +
      '</div>';

    // ── Weather section ───────────────────────────────────────────────────
    var weatherSection = _createElement('section', 'dw-section dw-section-weather');
    weatherSection.innerHTML =
      '<h3 class="dw-section-title">Weather</h3>' +
      '<div class="dw-weather-container">' +
        '<p class="dw-weather-loading">Loading weather data...</p>' +
      '</div>';

    // ── World Events section ───────────────────────────────────────────────
    var eventsSection = _createElement('section', 'dw-section dw-section-events');
    eventsSection.innerHTML =
      '<h3 class="dw-section-title">World Events</h3>' +
      '<div class="dw-events-active">' +
        '<h4>Active Events</h4>' +
        '<p class="dw-no-events">No active events.</p>' +
      '</div>' +
      '<div class="dw-events-upcoming">' +
        '<h4>Upcoming Events</h4>' +
        '<p class="dw-no-events">No upcoming events.</p>' +
      '</div>';

    // ── Zone Activity section ──────────────────────────────────────────────
    var zonesSection = _createElement('section', 'dw-section dw-section-zones');
    zonesSection.innerHTML =
      '<h3 class="dw-section-title">Zone Activity</h3>' +
      '<div class="dw-zone-activity-container">' +
        formatZoneActivityGrid(null, null) +
      '</div>';

    // ── World News section ─────────────────────────────────────────────────
    var newsSection = _createElement('section', 'dw-section dw-section-news');
    newsSection.innerHTML =
      '<h3 class="dw-section-title">World News</h3>' +
      formatNewsFeed([]);

    _appendChild(panel, clockSection);
    _appendChild(panel, weatherSection);
    _appendChild(panel, eventsSection);
    _appendChild(panel, zonesSection);
    _appendChild(panel, newsSection);

    return panel;
  }

  // ── Small DOM helpers (isomorphic) ────────────────────────────────────────

  function _createElement(tag, className) {
    if (typeof document !== 'undefined') {
      var el = document.createElement(tag);
      if (className) el.className = className;
      return el;
    }
    // Minimal Node.js shim
    return {
      tagName:   tag.toUpperCase(),
      className: className || '',
      innerHTML: '',
      children:  [],
      setAttribute: function(k, v) { this[k] = v; },
      appendChild:  function(child) { this.children.push(child); }
    };
  }

  function _appendChild(parent, child) {
    if (typeof parent.appendChild === 'function') {
      parent.appendChild(child);
    }
  }

  // ── Misc helpers ──────────────────────────────────────────────────────────

  function _escHtml(str) {
    if (typeof str !== 'string') return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function _formatTimestamp(ts) {
    if (!ts) return '--';
    var d = new Date(ts);
    if (isNaN(d.getTime())) return String(ts);
    var h = d.getHours(),   m = d.getMinutes();
    var D = d.getDate(),    M = d.getMonth() + 1, Y = d.getFullYear();
    return (D < 10 ? '0' : '') + D + '/' + (M < 10 ? '0' : '') + M + '/' + Y +
           ' ' + (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
  }

  // ── Exports ───────────────────────────────────────────────────────────────

  exports.ZONE_IDS         = ZONE_IDS;
  exports.ZONE_NAMES       = ZONE_NAMES;
  exports.EVENT_TYPES      = EVENT_TYPES;

  // Time
  exports.createWorldTime     = createWorldTime;
  exports.advanceTime         = advanceTime;
  exports.getTimeOfDay        = getTimeOfDay;
  exports.getPhaseOfDay       = getPhaseOfDay;
  exports.formatGameTime      = formatGameTime;
  exports.getDayNumber        = getDayNumber;
  exports.getSeason           = getSeason;
  exports.getSeasonProgress   = getSeasonProgress;
  exports.formatTimeDisplay   = formatTimeDisplay;

  // Weather
  exports.createWeatherState  = createWeatherState;
  exports.generateWeather     = generateWeather;
  exports.getWeatherForZone   = getWeatherForZone;
  exports.updateAllWeather    = updateAllWeather;
  exports.getTemperature      = getTemperature;
  exports.formatWeatherDisplay = formatWeatherDisplay;
  exports.getWeatherIcon      = getWeatherIcon;
  exports.getWeatherEffect    = getWeatherEffect;

  // Events
  exports.createEventState    = createEventState;
  exports.generateEvent       = generateEvent;
  exports.getActiveEvents     = getActiveEvents;
  exports.getUpcomingEvents   = getUpcomingEvents;
  exports.joinEvent           = joinEvent;
  exports.completeEvent       = completeEvent;
  exports.formatEventCard     = formatEventCard;

  // News
  exports.createNewsState     = createNewsState;
  exports.addNewsEntry        = addNewsEntry;
  exports.getRecentNews       = getRecentNews;
  exports.formatNewsFeed      = formatNewsFeed;
  exports.generateAutoNews    = generateAutoNews;

  // Zone activity
  exports.getZoneActivity         = getZoneActivity;
  exports.formatZoneActivityGrid  = formatZoneActivityGrid;

  // Panel
  exports.createWorldPanel        = createWorldPanel;

})(typeof module !== 'undefined' ? module.exports : (window.DashboardWorld = {}));
