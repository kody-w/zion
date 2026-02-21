/**
 * ZION Civilization Timelapse Renderer
 * Processes civilization_sim.py output into frame-by-frame playback,
 * camera paths, audio mappings, and 2D canvas rendering helpers.
 *
 * UMD module — works in browser (window.Timelapse) and Node.js (module.exports).
 */

(function(exports) {
  'use strict';

  // ─── Zone Config ────────────────────────────────────────────

  var ZONES = ['nexus', 'gardens', 'athenaeum', 'studio', 'wilds', 'agora', 'commons', 'arena'];

  // World positions (cx, cz) from ZONE_CENTERS in civilization_sim.py
  var ZONE_CENTERS = {
    nexus:     { x: 0,    z: 0    },
    gardens:   { x: 200,  z: 30   },
    athenaeum: { x: 100,  z: -220 },
    studio:    { x: -200, z: -100 },
    wilds:     { x: -30,  z: 260  },
    agora:     { x: -190, z: 120  },
    commons:   { x: 170,  z: 190  },
    arena:     { x: 0,    z: -240 }
  };

  // Zone mood → harmony name mapping
  var ZONE_MOOD = {
    nexus:     'welcoming',
    gardens:   'peaceful',
    athenaeum: 'curious',
    studio:    'creative',
    wilds:     'adventurous',
    agora:     'bustling',
    commons:   'communal',
    arena:     'intense'
  };

  // Archetype → instrument mapping
  var ARCHETYPE_INSTRUMENT = {
    gardener:    'soft pads',
    builder:     'percussion',
    storyteller: 'vocals/melody',
    merchant:    'bass',
    explorer:    'strings',
    teacher:     'piano',
    musician:    'lead synth',
    healer:      'choir',
    philosopher: 'ambient',
    artist:      'bells'
  };

  // Zone colors for minimap rendering
  var ZONE_COLORS = {
    nexus:     '#daa520',
    gardens:   '#4caf50',
    athenaeum: '#2196f3',
    studio:    '#e040fb',
    wilds:     '#ff5722',
    agora:     '#ff9800',
    commons:   '#00bcd4',
    arena:     '#f44336'
  };

  // Event type → icon character
  var EVENT_ICONS = {
    join:      '+',
    build:     'B',
    creation:  'C',
    discovery: 'D',
    harvest:   'H',
    trade:     'T',
    plant:     'P',
    craft:     'K',
    weather:   'W',
    milestone: '*',
    ubi:       '$'
  };

  // ─── Data Processing ────────────────────────────────────────

  /**
   * loadSimData(simJson) — parse civilization_sim.py JSON output into timeline.
   *
   * Input format (from civilization_sim.py main() raw_data output):
   *   {
   *     snapshots: [{tick, population, structures, creations, gardens, discoveries,
   *                  total_spark, txn_volume, listings, active_zones, zone_populations,
   *                  gini, weather, season, dayPhase, chat_messages}],
   *     analysis: {...},
   *     notable_events: [[tick, type, description], ...],
   *     final_population, final_structures, final_creations, final_discoveries
   *   }
   *
   * Returns timeline: {frames, totalTicks, notableEvents, analysis}
   */
  function loadSimData(simJson) {
    var snapshots = simJson.snapshots || [];
    var rawEvents = simJson.notable_events || [];
    var analysis = simJson.analysis || {};

    // Build frame list — one frame per snapshot
    var frames = [];
    for (var i = 0; i < snapshots.length; i++) {
      var snap = snapshots[i];
      frames.push(_snapshotToFrame(snap, rawEvents));
    }

    // Build notable events list: [{tick, type, description}]
    var notableEvents = [];
    for (var j = 0; j < rawEvents.length; j++) {
      var ev = rawEvents[j];
      if (Array.isArray(ev) && ev.length >= 3) {
        notableEvents.push({ tick: ev[0], type: ev[1], description: ev[2] });
      } else if (ev && typeof ev === 'object') {
        notableEvents.push(ev);
      }
    }

    var totalTicks = frames.length > 0 ? frames[frames.length - 1].tick : 0;

    return {
      frames: frames,
      totalTicks: totalTicks,
      notableEvents: notableEvents,
      analysis: analysis
    };
  }

  /**
   * Convert a raw snapshot to a normalized frame object.
   */
  function _snapshotToFrame(snap, rawEvents) {
    var tick = snap.tick || 0;

    // Build zoneActivity from zone_populations
    var zoneActivity = {};
    var zonePop = snap.zone_populations || {};
    for (var z = 0; z < ZONES.length; z++) {
      var zone = ZONES[z];
      zoneActivity[zone] = zonePop[zone] || 0;
    }

    // Collect events that fall at this tick
    var events = [];
    if (rawEvents) {
      for (var e = 0; e < rawEvents.length; e++) {
        var ev = rawEvents[e];
        var evTick = Array.isArray(ev) ? ev[0] : (ev.tick || 0);
        if (evTick === tick) {
          events.push(Array.isArray(ev)
            ? { tick: ev[0], type: ev[1], description: ev[2] }
            : ev);
        }
      }
    }

    return {
      tick: tick,
      population: snap.population || 0,
      zoneActivity: zoneActivity,
      economy: {
        totalSpark: snap.total_spark || 0,
        gini: snap.gini || 0,
        txnVolume: snap.txn_volume || 0,
        listings: snap.listings || 0,
        activeZones: snap.active_zones || 0
      },
      events: events,
      culture: {
        weather: snap.weather || 'clear',
        season: snap.season || 'spring',
        dayPhase: snap.dayPhase || 'day',
        structures: snap.structures || 0,
        creations: snap.creations || 0,
        gardens: snap.gardens || 0,
        discoveries: snap.discoveries || 0,
        chatMessages: snap.chat_messages || 0
      }
    };
  }

  /**
   * getFrame(timeline, tick) — return frame for the exact tick, or null.
   */
  function getFrame(timeline, tick) {
    if (!timeline || !timeline.frames || tick < 0) return null;
    var frames = timeline.frames;
    for (var i = 0; i < frames.length; i++) {
      if (frames[i].tick === tick) return frames[i];
    }
    return null;
  }

  /**
   * interpolateFrame(timeline, t) — smoothly interpolated frame at normalized t (0-1).
   * Linearly interpolates numeric values between adjacent frames.
   */
  function interpolateFrame(timeline, t) {
    if (!timeline || !timeline.frames || timeline.frames.length === 0) return null;
    var frames = timeline.frames;

    if (frames.length === 1) {
      return _cloneFrame(frames[0]);
    }

    // Clamp t
    t = Math.max(0, Math.min(1, t));

    // Map t to position in frames array
    var pos = t * (frames.length - 1);
    var lo = Math.floor(pos);
    var hi = Math.ceil(pos);
    var alpha = pos - lo;

    // Clamp indices
    lo = Math.max(0, Math.min(frames.length - 1, lo));
    hi = Math.max(0, Math.min(frames.length - 1, hi));

    if (lo === hi) return _cloneFrame(frames[lo]);

    var fA = frames[lo];
    var fB = frames[hi];

    // Interpolate zone activity
    var zoneActivity = {};
    for (var z = 0; z < ZONES.length; z++) {
      var zone = ZONES[z];
      zoneActivity[zone] = _lerp(fA.zoneActivity[zone], fB.zoneActivity[zone], alpha);
    }

    return {
      tick: _lerp(fA.tick, fB.tick, alpha),
      population: _lerp(fA.population, fB.population, alpha),
      zoneActivity: zoneActivity,
      economy: {
        totalSpark: _lerp(fA.economy.totalSpark, fB.economy.totalSpark, alpha),
        gini: _lerp(fA.economy.gini, fB.economy.gini, alpha),
        txnVolume: _lerp(fA.economy.txnVolume, fB.economy.txnVolume, alpha),
        listings: _lerp(fA.economy.listings, fB.economy.listings, alpha),
        activeZones: _lerp(fA.economy.activeZones, fB.economy.activeZones, alpha)
      },
      events: alpha < 0.5 ? fA.events : fB.events,
      culture: alpha < 0.5 ? fA.culture : fB.culture
    };
  }

  /**
   * getSummary(timeline) — return high-level summary of the civilization history.
   * Returns {totalTicks, peakPopulation, majorEvents, dominantZones}
   */
  function getSummary(timeline) {
    if (!timeline || !timeline.frames || timeline.frames.length === 0) {
      return { totalTicks: 0, peakPopulation: 0, majorEvents: [], dominantZones: [] };
    }

    var frames = timeline.frames;
    var totalTicks = timeline.totalTicks;
    var peakPopulation = 0;

    // Zone activity accumulator
    var zoneTotal = {};
    for (var z = 0; z < ZONES.length; z++) {
      zoneTotal[ZONES[z]] = 0;
    }

    for (var i = 0; i < frames.length; i++) {
      var frame = frames[i];
      if (frame.population > peakPopulation) {
        peakPopulation = frame.population;
      }
      for (var z2 = 0; z2 < ZONES.length; z2++) {
        var zone = ZONES[z2];
        zoneTotal[zone] += (frame.zoneActivity[zone] || 0);
      }
    }

    // Sort zones by total activity
    var sortedZones = ZONES.slice().sort(function(a, b) {
      return zoneTotal[b] - zoneTotal[a];
    });

    // Dominant zones = those with above-average total activity
    var totalActivity = 0;
    for (var z3 = 0; z3 < ZONES.length; z3++) {
      totalActivity += zoneTotal[ZONES[z3]];
    }
    var avgActivity = totalActivity / ZONES.length;
    var dominantZones = sortedZones.filter(function(z) {
      return zoneTotal[z] > avgActivity;
    });
    if (dominantZones.length === 0) {
      dominantZones = [sortedZones[0]]; // at least one
    }

    return {
      totalTicks: totalTicks,
      peakPopulation: peakPopulation,
      majorEvents: timeline.notableEvents || [],
      dominantZones: dominantZones
    };
  }

  // ─── Camera Path ────────────────────────────────────────────

  /**
   * generateCameraPath(timeline, options?) — generate 3D flyover keyframes.
   *
   * Options: {altitude, orbitSpeed, zoomOnEvents}
   * Returns [{tick, position: {x,y,z}, lookAt: {x,y,z}, fov}]
   */
  function generateCameraPath(timeline, options) {
    options = options || {};
    var altitude = typeof options.altitude === 'number' ? options.altitude : 150;
    var orbitSpeed = typeof options.orbitSpeed === 'number' ? options.orbitSpeed : 1.0;
    var zoomOnEvents = options.zoomOnEvents !== false;

    var frames = timeline.frames || [];
    if (frames.length === 0) {
      return [_makeKeyframe(0, { x: 0, y: altitude, z: 300 }, { x: 0, y: 0, z: 0 }, 60)];
    }

    var keyframes = [];
    var totalFrames = frames.length;

    for (var i = 0; i < totalFrames; i++) {
      var frame = frames[i];
      var t = totalFrames > 1 ? i / (totalFrames - 1) : 0;

      // Base orbit angle — full circle over the run
      var angle = t * Math.PI * 2 * orbitSpeed;

      // Orbit radius contracts as population grows (civilization consolidates)
      var popFraction = frame.population > 0 ? Math.min(frame.population / 100, 1) : 0;
      var orbitRadius = 400 - popFraction * 150; // 400 → 250

      // Find most active zone to focus on
      var dominantZone = _getDominantZone(frame.zoneActivity);
      var focusCenter = ZONE_CENTERS[dominantZone] || ZONE_CENTERS.nexus;

      // Camera orbits around a focus between world center and dominant zone
      var focusBlend = 0.3; // 30% pull toward dominant zone
      var lookX = focusCenter.x * focusBlend;
      var lookZ = focusCenter.z * focusBlend;

      var camX = lookX + orbitRadius * Math.cos(angle);
      var camZ = lookZ + orbitRadius * Math.sin(angle);
      var camY = altitude;

      // Zoom in (lower fov) during high-activity periods
      var totalActivity = _sumZoneActivity(frame.zoneActivity);
      var activityFraction = Math.min(totalActivity / 100, 1);
      var fov = 60 - activityFraction * 20; // 60° → 40°

      // Zoom in on notable events
      if (zoomOnEvents && frame.events && frame.events.length > 0) {
        fov = Math.max(fov - 10, 25);
        // Swoop closer to the active zone
        var activeCenter = ZONE_CENTERS[dominantZone] || ZONE_CENTERS.nexus;
        camX = activeCenter.x + 80 * Math.cos(angle);
        camZ = activeCenter.z + 80 * Math.sin(angle);
        camY = altitude * 0.6;
      }

      keyframes.push(_makeKeyframe(
        frame.tick,
        { x: camX, y: camY, z: camZ },
        { x: lookX, y: 0, z: lookZ },
        fov
      ));
    }

    return keyframes;
  }

  /**
   * getCameraAt(cameraPath, t) — interpolated camera state at normalized t (0-1).
   * Returns {position, lookAt, fov}.
   */
  function getCameraAt(cameraPath, t) {
    if (!cameraPath || cameraPath.length === 0) {
      return _makeKeyframe(0, { x: 0, y: 150, z: 300 }, { x: 0, y: 0, z: 0 }, 60);
    }

    if (cameraPath.length === 1) {
      return {
        position: { x: cameraPath[0].position.x, y: cameraPath[0].position.y, z: cameraPath[0].position.z },
        lookAt: { x: cameraPath[0].lookAt.x, y: cameraPath[0].lookAt.y, z: cameraPath[0].lookAt.z },
        fov: cameraPath[0].fov
      };
    }

    t = Math.max(0, Math.min(1, t));

    var pos = t * (cameraPath.length - 1);
    var lo = Math.floor(pos);
    var hi = Math.ceil(pos);
    var alpha = pos - lo;

    lo = Math.max(0, Math.min(cameraPath.length - 1, lo));
    hi = Math.max(0, Math.min(cameraPath.length - 1, hi));

    if (lo === hi) {
      return {
        position: { x: cameraPath[lo].position.x, y: cameraPath[lo].position.y, z: cameraPath[lo].position.z },
        lookAt: { x: cameraPath[lo].lookAt.x, y: cameraPath[lo].lookAt.y, z: cameraPath[lo].lookAt.z },
        fov: cameraPath[lo].fov
      };
    }

    var kA = cameraPath[lo];
    var kB = cameraPath[hi];

    return {
      position: {
        x: _lerp(kA.position.x, kB.position.x, alpha),
        y: _lerp(kA.position.y, kB.position.y, alpha),
        z: _lerp(kA.position.z, kB.position.z, alpha)
      },
      lookAt: {
        x: _lerp(kA.lookAt.x, kB.lookAt.x, alpha),
        y: _lerp(kA.lookAt.y, kB.lookAt.y, alpha),
        z: _lerp(kA.lookAt.z, kB.lookAt.z, alpha)
      },
      fov: _lerp(kA.fov, kB.fov, alpha)
    };
  }

  // ─── Audio Mapping ──────────────────────────────────────────

  /**
   * mapToAudio(frame) — derive procedural audio parameters from a frame.
   * Returns {tempo, harmony, intensity, instruments}
   */
  function mapToAudio(frame) {
    // Determine dominant zone
    var dominantZone = _getDominantZone(frame.zoneActivity);
    var harmony = ZONE_MOOD[dominantZone] || 'welcoming';

    // Tempo: base 60 BPM + up to 80 BPM based on total activity
    var totalActivity = _sumZoneActivity(frame.zoneActivity);
    var activityFraction = Math.min(totalActivity / 100, 1);
    var tempo = 60 + activityFraction * 80;

    // Intensity: weighted combination of activity, economy velocity, and events
    var eventWeight = Math.min((frame.events ? frame.events.length : 0) / 5, 1);
    var popFraction = Math.min((frame.population || 0) / 100, 1);
    var intensity = activityFraction * 0.5 + eventWeight * 0.3 + popFraction * 0.2;
    intensity = Math.max(0, Math.min(1, intensity));

    // Instruments based on which archetypes are known to inhabit dominant zone
    // Zone → archetype affinity (from civilization_sim.py _pick_zone)
    var zoneArchetypes = {
      nexus:     ['gardener', 'builder', 'storyteller', 'merchant', 'teacher', 'musician', 'healer', 'philosopher', 'artist'],
      gardens:   ['gardener', 'healer', 'artist'],
      athenaeum: ['storyteller', 'teacher', 'philosopher'],
      studio:    ['builder', 'musician', 'artist'],
      wilds:     ['explorer', 'philosopher'],
      agora:     ['storyteller', 'merchant', 'musician'],
      commons:   ['gardener', 'merchant', 'healer'],
      arena:     ['builder', 'explorer']
    };

    var activeArchetypes = zoneArchetypes[dominantZone] || [];
    var instruments = [];
    var seen = {};
    for (var a = 0; a < activeArchetypes.length; a++) {
      var instr = ARCHETYPE_INSTRUMENT[activeArchetypes[a]];
      if (instr && !seen[instr]) {
        seen[instr] = true;
        instruments.push(instr);
      }
    }

    // Add a few secondary zone instruments proportional to activity
    for (var z = 0; z < ZONES.length; z++) {
      var zone = ZONES[z];
      if (zone !== dominantZone && (frame.zoneActivity[zone] || 0) > 5) {
        var secondaryArchetypes = zoneArchetypes[zone] || [];
        if (secondaryArchetypes.length > 0) {
          var instr2 = ARCHETYPE_INSTRUMENT[secondaryArchetypes[0]];
          if (instr2 && !seen[instr2]) {
            seen[instr2] = true;
            instruments.push(instr2);
          }
        }
      }
    }

    return {
      tempo: Math.round(tempo),
      harmony: harmony,
      intensity: intensity,
      instruments: instruments
    };
  }

  // ─── Playback Controller ────────────────────────────────────

  /**
   * createController(timeline) — create a playback controller.
   *
   * controller.play(speed?)      — start playback
   * controller.pause()           — pause
   * controller.seek(tick)        — jump to tick
   * controller.getProgress()     — {currentTick, totalTicks, percent}
   * controller.onFrame(cb)       — called each tick advance with {frame, camera, audio}
   * controller.onEvent(cb)       — called on notable events
   * controller.setSpeed(n)       — set speed multiplier
   * controller.getSpeed()        — get current speed
   * controller.isPlaying()       — playback state
   * controller.update(dtMs)      — advance playback by dt milliseconds
   */
  function createController(timeline) {
    var currentTick = 0;
    var totalTicks = timeline.totalTicks || 0;
    var playing = false;
    var speed = 1;
    var frameCallbacks = [];
    var eventCallbacks = [];
    var cameraPath = generateCameraPath(timeline);
    var accumulatedMs = 0;

    // Track which notable events have fired
    var firedEvents = {};

    // Ticks-per-second at 1x speed — 1 tick per second
    var TICKS_PER_SECOND = 1;

    function getProgress() {
      var pct = totalTicks > 0 ? (currentTick / totalTicks) * 100 : 0;
      return {
        currentTick: currentTick,
        totalTicks: totalTicks,
        percent: pct
      };
    }

    function seek(tick) {
      currentTick = Math.max(0, Math.min(totalTicks, tick));
      accumulatedMs = 0;
      _fireFrame();
    }

    function play(s) {
      if (typeof s === 'number') speed = s;
      playing = true;
    }

    function pause() {
      playing = false;
    }

    function setSpeed(s) {
      speed = s;
    }

    function getSpeed() {
      return speed;
    }

    function isPlaying() {
      return playing;
    }

    function onFrame(cb) {
      frameCallbacks.push(cb);
    }

    function onEvent(cb) {
      eventCallbacks.push(cb);
    }

    /**
     * update(dtMs) — advance the controller by dtMs milliseconds.
     * Call this from your animation/game loop.
     */
    function update(dtMs) {
      if (!playing || totalTicks === 0) {
        _fireFrame();
        return;
      }

      accumulatedMs += dtMs * speed;
      var ticksToAdvance = Math.floor(accumulatedMs / (1000 / TICKS_PER_SECOND));
      accumulatedMs -= ticksToAdvance * (1000 / TICKS_PER_SECOND);

      if (ticksToAdvance <= 0) return;

      var oldTick = currentTick;
      currentTick = Math.min(totalTicks, currentTick + ticksToAdvance);

      if (currentTick !== oldTick) {
        _fireFrame();
        _checkEvents(oldTick, currentTick);
      }

      if (currentTick >= totalTicks) {
        playing = false;
      }
    }

    function _fireFrame() {
      if (frameCallbacks.length === 0) return;
      var t = totalTicks > 0 ? currentTick / totalTicks : 0;
      var interpFrame = interpolateFrame(timeline, t);
      var cam = getCameraAt(cameraPath, t);
      var audio = mapToAudio(interpFrame || (timeline.frames[0] || {}));
      var data = { frame: interpFrame, camera: cam, audio: audio };
      for (var i = 0; i < frameCallbacks.length; i++) {
        frameCallbacks[i](data);
      }
    }

    function _checkEvents(fromTick, toTick) {
      if (eventCallbacks.length === 0) return;
      var events = timeline.notableEvents || [];
      for (var i = 0; i < events.length; i++) {
        var ev = events[i];
        var evTick = ev.tick || 0;
        var evKey = evTick + '_' + i;
        if (evTick > fromTick && evTick <= toTick && !firedEvents[evKey]) {
          firedEvents[evKey] = true;
          for (var j = 0; j < eventCallbacks.length; j++) {
            eventCallbacks[j](ev);
          }
        }
      }
    }

    return {
      play: play,
      pause: pause,
      seek: seek,
      getProgress: getProgress,
      onFrame: onFrame,
      onEvent: onEvent,
      setSpeed: setSpeed,
      getSpeed: getSpeed,
      isPlaying: isPlaying,
      update: update
    };
  }

  // ─── 2D Canvas Rendering Helpers ────────────────────────────

  /**
   * renderMinimap(ctx, frame, width, height) — draw zone activity minimap.
   * Renders the 8 zones as dots on a 2D projection of the world, sized by population.
   */
  function renderMinimap(ctx, frame, width, height) {
    var pad = 10;
    var w = width - pad * 2;
    var h = height - pad * 2;

    // World bounds: roughly -280 to +280 in X and Z
    var WORLD_SIZE = 320;

    // Background
    ctx.fillStyle = '#0a0e1a';
    ctx.fillRect(0, 0, width, height);

    // Border
    ctx.strokeStyle = '#1a1f30';
    ctx.lineWidth = 1;
    ctx.strokeRect(pad, pad, w, h);

    // Total activity for scaling
    var maxActivity = 0;
    for (var z = 0; z < ZONES.length; z++) {
      var act = frame.zoneActivity[ZONES[z]] || 0;
      if (act > maxActivity) maxActivity = act;
    }
    if (maxActivity === 0) maxActivity = 1;

    // Draw each zone
    for (var i = 0; i < ZONES.length; i++) {
      var zoneName = ZONES[i];
      var center = ZONE_CENTERS[zoneName];
      var activity = frame.zoneActivity[zoneName] || 0;
      var color = ZONE_COLORS[zoneName];

      // Map world coords to canvas
      var cx = pad + ((center.x + WORLD_SIZE) / (WORLD_SIZE * 2)) * w;
      var cy = pad + ((-center.z + WORLD_SIZE) / (WORLD_SIZE * 2)) * h; // Z is inverted

      // Radius based on activity (min 4, max 20)
      var radius = 4 + (activity / maxActivity) * 16;

      // Draw zone circle
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.3 + (activity / maxActivity) * 0.7;
      ctx.fill();
      ctx.globalAlpha = 1;

      // Zone label
      ctx.fillStyle = '#ffffff';
      ctx.font = '9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(zoneName.charAt(0).toUpperCase(), cx, cy + 3);

      // Activity count below label
      if (activity > 0) {
        ctx.fillStyle = color;
        ctx.font = '8px monospace';
        ctx.fillText(String(Math.round(activity)), cx, cy + radius + 10);
      }
    }

    // Reset text align
    ctx.textAlign = 'left';

    // Population overlay in top-left
    ctx.fillStyle = '#daa520';
    ctx.font = 'bold 11px monospace';
    ctx.fillText('Pop: ' + Math.round(frame.population), pad + 4, pad + 14);
  }

  /**
   * renderTimeline(ctx, timeline, currentTick, width, height) — draw scrubber bar.
   */
  function renderTimeline(ctx, timeline, currentTick, width, height) {
    var pad = 20;
    var barH = 8;
    var barY = height / 2 - barH / 2;
    var barW = width - pad * 2;

    // Background
    ctx.fillStyle = '#0a0e1a';
    ctx.fillRect(0, 0, width, height);

    // Track background
    ctx.fillStyle = '#1a1f30';
    ctx.fillRect(pad, barY, barW, barH);

    var frames = timeline.frames || [];
    var totalTicks = timeline.totalTicks || 1;

    // Color-coded segments by dominant zone
    for (var i = 0; i < frames.length; i++) {
      var frame = frames[i];
      var t = totalTicks > 0 ? frame.tick / totalTicks : 0;
      var x = pad + t * barW;
      var segW = frames.length > 1 && i < frames.length - 1
        ? (frames[i + 1].tick - frame.tick) / totalTicks * barW
        : 4;

      var dominantZone = _getDominantZone(frame.zoneActivity);
      ctx.fillStyle = ZONE_COLORS[dominantZone] || '#888';
      ctx.globalAlpha = 0.6;
      ctx.fillRect(x, barY, Math.max(segW, 2), barH);
      ctx.globalAlpha = 1;
    }

    // Event markers
    var events = timeline.notableEvents || [];
    for (var e = 0; e < events.length; e++) {
      var ev = events[e];
      var evTick = ev.tick || 0;
      var evT = totalTicks > 0 ? evTick / totalTicks : 0;
      var evX = pad + evT * barW;
      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = 0.8;
      ctx.fillRect(evX - 1, barY - 3, 2, barH + 6);
      ctx.globalAlpha = 1;
    }

    // Progress indicator (playhead)
    var progress = totalTicks > 0 ? currentTick / totalTicks : 0;
    var playX = pad + progress * barW;
    ctx.fillStyle = '#daa520';
    ctx.fillRect(playX - 2, barY - 4, 4, barH + 8);

    // Time labels
    ctx.fillStyle = '#666';
    ctx.font = '10px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('Tick 0', pad, height - 4);
    ctx.textAlign = 'right';
    ctx.fillText('Tick ' + totalTicks, pad + barW, height - 4);
    ctx.textAlign = 'center';
    ctx.fillText('Tick ' + Math.round(currentTick), playX, barY - 8);
    ctx.textAlign = 'left';
  }

  /**
   * renderStats(ctx, frame, x, y) — draw current stats overlay.
   */
  function renderStats(ctx, frame, x, y) {
    var lineH = 18;
    var padX = 12;
    var padY = 10;
    var bgW = 180;
    var bgH = 8 * lineH + padY * 2;

    // Background panel
    ctx.fillStyle = 'rgba(10, 14, 26, 0.85)';
    ctx.fillRect(x, y, bgW, bgH);
    ctx.strokeStyle = '#1a1f30';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, bgW, bgH);

    // Header
    ctx.fillStyle = '#daa520';
    ctx.font = 'bold 12px monospace';
    ctx.fillText('TICK ' + Math.round(frame.tick || 0), x + padX, y + padY + lineH * 0.7);

    // Stats
    var stats = [
      ['Population', Math.round(frame.population || 0)],
      ['Spark', Math.round((frame.economy && frame.economy.totalSpark) || 0)],
      ['Gini', ((frame.economy && frame.economy.gini) || 0).toFixed(3)],
      ['Weather', (frame.culture && frame.culture.weather) || 'clear'],
      ['Season', (frame.culture && frame.culture.season) || 'spring'],
      ['Phase', (frame.culture && frame.culture.dayPhase) || 'day'],
      ['Structures', (frame.culture && frame.culture.structures) || 0]
    ];

    ctx.font = '11px monospace';
    for (var i = 0; i < stats.length; i++) {
      var ly = y + padY + lineH * (i + 1.5);
      ctx.fillStyle = '#888';
      ctx.fillText(stats[i][0], x + padX, ly);
      ctx.fillStyle = '#e0e0e0';
      ctx.fillText(String(stats[i][1]), x + padX + 100, ly);
    }
  }

  /**
   * renderEventBanner(ctx, event) — draw event announcement banner.
   * Renders centered on its canvas (assumes ctx is full-width context).
   * Event: {type, description}
   */
  function renderEventBanner(ctx, event) {
    var desc = (event && event.description) ? event.description : '';
    var type = (event && event.type) ? event.type : 'event';
    var icon = EVENT_ICONS[type] || '!';

    // Banner colors by event type
    var bgColors = {
      discovery: '#0d2a0d',
      milestone: '#1a1400',
      build:     '#0a1a2a',
      creation:  '#1a0a1a',
      join:      '#0a1a0a',
      trade:     '#1a0f00',
      harvest:   '#0a1a0a',
      ubi:       '#0a0a1a'
    };
    var textColors = {
      discovery: '#4caf50',
      milestone: '#daa520',
      build:     '#2196f3',
      creation:  '#e040fb',
      join:      '#00bcd4',
      trade:     '#ff9800',
      harvest:   '#8bc34a',
      ubi:       '#9c27b0'
    };

    var bgColor = bgColors[type] || '#0a0e1a';
    var textColor = textColors[type] || '#e0e0e0';

    var bannerH = 44;
    var bannerY = 0;

    // Background bar
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, bannerY, 800, bannerH); // use 800 as default width

    ctx.strokeStyle = textColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(0, bannerY, 800, bannerH);

    // Icon
    ctx.fillStyle = textColor;
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('[' + icon + ']', 16, bannerY + 28);

    // Description text
    ctx.fillStyle = '#e0e0e0';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText(desc, 60, bannerY + 28);

    ctx.textAlign = 'left';
  }

  // ─── Internal Helpers ────────────────────────────────────────

  function _lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function _cloneFrame(frame) {
    var zoneActivity = {};
    for (var z = 0; z < ZONES.length; z++) {
      zoneActivity[ZONES[z]] = frame.zoneActivity[ZONES[z]] || 0;
    }
    return {
      tick: frame.tick,
      population: frame.population,
      zoneActivity: zoneActivity,
      economy: {
        totalSpark: frame.economy.totalSpark,
        gini: frame.economy.gini,
        txnVolume: frame.economy.txnVolume,
        listings: frame.economy.listings,
        activeZones: frame.economy.activeZones
      },
      events: frame.events,
      culture: frame.culture
    };
  }

  function _makeKeyframe(tick, position, lookAt, fov) {
    return { tick: tick, position: position, lookAt: lookAt, fov: fov };
  }

  function _getDominantZone(zoneActivity) {
    var best = ZONES[0];
    var bestVal = -1;
    for (var z = 0; z < ZONES.length; z++) {
      var val = zoneActivity[ZONES[z]] || 0;
      if (val > bestVal) {
        bestVal = val;
        best = ZONES[z];
      }
    }
    return best;
  }

  function _sumZoneActivity(zoneActivity) {
    var total = 0;
    for (var z = 0; z < ZONES.length; z++) {
      total += zoneActivity[ZONES[z]] || 0;
    }
    return total;
  }

  // ─── Exports ────────────────────────────────────────────────

  exports.loadSimData = loadSimData;
  exports.getFrame = getFrame;
  exports.interpolateFrame = interpolateFrame;
  exports.getSummary = getSummary;
  exports.generateCameraPath = generateCameraPath;
  exports.getCameraAt = getCameraAt;
  exports.mapToAudio = mapToAudio;
  exports.createController = createController;
  exports.renderMinimap = renderMinimap;
  exports.renderTimeline = renderTimeline;
  exports.renderStats = renderStats;
  exports.renderEventBanner = renderEventBanner;

  // Expose constants for external use
  exports.ZONES = ZONES;
  exports.ZONE_CENTERS = ZONE_CENTERS;
  exports.ZONE_MOOD = ZONE_MOOD;
  exports.ZONE_COLORS = ZONE_COLORS;
  exports.ARCHETYPE_INSTRUMENT = ARCHETYPE_INSTRUMENT;

})(typeof module !== 'undefined' ? module.exports : (window.Timelapse = {}));
