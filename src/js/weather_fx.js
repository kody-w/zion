(function(exports) {
  // Weather Effects System — particle configs, lighting, wind, lightning, transitions

  // ── Weather Type Constants ──────────────────────────────────────────────────

  var WEATHER_TYPES = {
    CLEAR:        'clear',
    RAIN:         'rain',
    HEAVY_RAIN:   'heavy_rain',
    SNOW:         'snow',
    BLIZZARD:     'blizzard',
    FOG:          'fog',
    THUNDERSTORM: 'thunderstorm',
    SANDSTORM:    'sandstorm',
    MIST:         'mist'
  };

  // ── Particle Configs ────────────────────────────────────────────────────────
  // Each entry: count, speed (units/s), size, color (hex), opacity, direction
  // (normalized {x,y,z}), spread (cone half-angle degrees), turbulence

  var PARTICLE_CONFIGS = {
    clear: {
      count: 0,
      speed: 0,
      size: 0,
      color: '#ffffff',
      opacity: 0,
      direction: { x: 0, y: -1, z: 0 },
      spread: 0,
      turbulence: 0,
      type: 'none'
    },
    rain: {
      count: 800,
      speed: 18,
      size: 0.08,
      color: '#a0c8e8',
      opacity: 0.55,
      direction: { x: 0.05, y: -1, z: 0 },
      spread: 5,
      turbulence: 0.15,
      type: 'streak'
    },
    heavy_rain: {
      count: 2200,
      speed: 28,
      size: 0.1,
      color: '#7aadd4',
      opacity: 0.7,
      direction: { x: 0.12, y: -1, z: 0.04 },
      spread: 8,
      turbulence: 0.35,
      type: 'streak'
    },
    snow: {
      count: 600,
      speed: 3,
      size: 0.18,
      color: '#eef4fb',
      opacity: 0.85,
      direction: { x: 0.02, y: -1, z: 0 },
      spread: 20,
      turbulence: 0.5,
      type: 'flake'
    },
    blizzard: {
      count: 1800,
      speed: 14,
      size: 0.14,
      color: '#d8ecfa',
      opacity: 0.75,
      direction: { x: 0.6, y: -0.8, z: 0.1 },
      spread: 35,
      turbulence: 1.2,
      type: 'flake'
    },
    fog: {
      count: 120,
      speed: 0.5,
      size: 18,
      color: '#c8d4dc',
      opacity: 0.28,
      direction: { x: 0.1, y: 0, z: 0 },
      spread: 90,
      turbulence: 0.05,
      type: 'volume'
    },
    thunderstorm: {
      count: 2500,
      speed: 32,
      size: 0.1,
      color: '#6090b8',
      opacity: 0.72,
      direction: { x: 0.18, y: -1, z: 0.06 },
      spread: 10,
      turbulence: 0.55,
      type: 'streak'
    },
    sandstorm: {
      count: 3000,
      speed: 22,
      size: 0.12,
      color: '#c8a050',
      opacity: 0.6,
      direction: { x: 1, y: -0.1, z: 0.2 },
      spread: 25,
      turbulence: 0.9,
      type: 'dust'
    },
    mist: {
      count: 200,
      speed: 0.8,
      size: 12,
      color: '#dce8ec',
      opacity: 0.22,
      direction: { x: 0.05, y: 0, z: 0 },
      spread: 80,
      turbulence: 0.03,
      type: 'volume'
    }
  };

  // ── Lighting Configs ────────────────────────────────────────────────────────
  // ambientColor, directionalIntensity, fogColor, fogDensity, skyColor

  var LIGHTING_CONFIGS = {
    clear: {
      ambientColor: '#c8d8f0',
      ambientIntensity: 0.7,
      directionalIntensity: 1.0,
      fogColor: '#c0d0e8',
      fogDensity: 0.0008,
      skyColor: '#87ceeb',
      shadowStrength: 0.8
    },
    rain: {
      ambientColor: '#8898a8',
      ambientIntensity: 0.5,
      directionalIntensity: 0.45,
      fogColor: '#7888a0',
      fogDensity: 0.003,
      skyColor: '#5a6878',
      shadowStrength: 0.3
    },
    heavy_rain: {
      ambientColor: '#5a6872',
      ambientIntensity: 0.38,
      directionalIntensity: 0.25,
      fogColor: '#4a5860',
      fogDensity: 0.007,
      skyColor: '#3a4858',
      shadowStrength: 0.15
    },
    snow: {
      ambientColor: '#b8c8e0',
      ambientIntensity: 0.65,
      directionalIntensity: 0.55,
      fogColor: '#c8d8e8',
      fogDensity: 0.002,
      skyColor: '#9aacc0',
      shadowStrength: 0.4
    },
    blizzard: {
      ambientColor: '#8898b0',
      ambientIntensity: 0.45,
      directionalIntensity: 0.2,
      fogColor: '#98a8c0',
      fogDensity: 0.018,
      skyColor: '#707888',
      shadowStrength: 0.05
    },
    fog: {
      ambientColor: '#a0aab0',
      ambientIntensity: 0.55,
      directionalIntensity: 0.3,
      fogColor: '#b0bac0',
      fogDensity: 0.025,
      skyColor: '#909aa0',
      shadowStrength: 0.1
    },
    thunderstorm: {
      ambientColor: '#3a4858',
      ambientIntensity: 0.3,
      directionalIntensity: 0.15,
      fogColor: '#2a3848',
      fogDensity: 0.009,
      skyColor: '#1e2838',
      shadowStrength: 0.05
    },
    sandstorm: {
      ambientColor: '#c8a048',
      ambientIntensity: 0.5,
      directionalIntensity: 0.35,
      fogColor: '#b89038',
      fogDensity: 0.022,
      skyColor: '#d0a840',
      shadowStrength: 0.15
    },
    mist: {
      ambientColor: '#a8b8c0',
      ambientIntensity: 0.6,
      directionalIntensity: 0.5,
      fogColor: '#b8c8d0',
      fogDensity: 0.012,
      skyColor: '#98a8b0',
      shadowStrength: 0.25
    }
  };

  // Time-of-day multipliers applied to base lighting
  var TIME_OF_DAY_MODIFIERS = {
    dawn: {
      ambientMultiplier: 0.6,
      directionalMultiplier: 0.4,
      tint: '#ff9060',
      tintStrength: 0.3
    },
    morning: {
      ambientMultiplier: 0.85,
      directionalMultiplier: 0.8,
      tint: '#ffe8c0',
      tintStrength: 0.1
    },
    noon: {
      ambientMultiplier: 1.0,
      directionalMultiplier: 1.0,
      tint: '#ffffff',
      tintStrength: 0
    },
    afternoon: {
      ambientMultiplier: 0.95,
      directionalMultiplier: 0.9,
      tint: '#ffe0a0',
      tintStrength: 0.12
    },
    dusk: {
      ambientMultiplier: 0.55,
      directionalMultiplier: 0.35,
      tint: '#ff7030',
      tintStrength: 0.35
    },
    night: {
      ambientMultiplier: 0.15,
      directionalMultiplier: 0.05,
      tint: '#203060',
      tintStrength: 0.5
    }
  };

  // ── Sound Hints ─────────────────────────────────────────────────────────────

  var SOUND_HINTS = {
    clear:        'ambient_wind_light',
    rain:         'rain_gentle',
    heavy_rain:   'rain_heavy',
    snow:         'wind_soft',
    blizzard:     'blizzard_howl',
    fog:          'ambient_muted',
    thunderstorm: 'storm_thunder',
    sandstorm:    'sandstorm_grit',
    mist:         'ambient_muted'
  };

  // ── Visibility Ranges (units) ────────────────────────────────────────────────

  var VISIBILITY_RANGES = {
    clear:        600,
    rain:         350,
    heavy_rain:   180,
    snow:         280,
    blizzard:     60,
    fog:          70,
    thunderstorm: 150,
    sandstorm:    50,
    mist:         120
  };

  // ── Ambient Modifiers (gameplay effects) ────────────────────────────────────

  var AMBIENT_MODIFIERS = {
    clear: {
      moveSpeed:        1.0,
      visibilityFactor: 1.0,
      catchRate:        1.0,
      gatherRate:       1.0,
      xpMultiplier:     1.0,
      staminaDrain:     1.0,
      description:      'Clear skies, ideal conditions'
    },
    rain: {
      moveSpeed:        0.9,
      visibilityFactor: 0.7,
      catchRate:        1.3,
      gatherRate:       1.1,
      xpMultiplier:     1.0,
      staminaDrain:     1.1,
      description:      'Rain boosts fishing and foraging'
    },
    heavy_rain: {
      moveSpeed:        0.75,
      visibilityFactor: 0.45,
      catchRate:        1.5,
      gatherRate:       1.2,
      xpMultiplier:     1.05,
      staminaDrain:     1.3,
      description:      'Heavy rain — slippery ground, excellent fishing'
    },
    snow: {
      moveSpeed:        0.85,
      visibilityFactor: 0.6,
      catchRate:        0.8,
      gatherRate:       0.75,
      xpMultiplier:     1.0,
      staminaDrain:     1.2,
      description:      'Snow slows movement and gathering'
    },
    blizzard: {
      moveSpeed:        0.5,
      visibilityFactor: 0.15,
      catchRate:        0.5,
      gatherRate:       0.4,
      xpMultiplier:     1.2,
      staminaDrain:     2.0,
      description:      'Blizzard — treacherous, but brave souls earn bonus XP'
    },
    fog: {
      moveSpeed:        0.95,
      visibilityFactor: 0.2,
      catchRate:        0.9,
      gatherRate:       1.0,
      xpMultiplier:     1.1,
      staminaDrain:     1.0,
      description:      'Fog hides secrets and grants exploration bonuses'
    },
    thunderstorm: {
      moveSpeed:        0.7,
      visibilityFactor: 0.35,
      catchRate:        1.4,
      gatherRate:       1.15,
      xpMultiplier:     1.3,
      staminaDrain:     1.5,
      description:      'Dangerous storm — high risk, high reward'
    },
    sandstorm: {
      moveSpeed:        0.6,
      visibilityFactor: 0.12,
      catchRate:        0.6,
      gatherRate:       0.5,
      xpMultiplier:     1.15,
      staminaDrain:     1.8,
      description:      'Sandstorm — near-zero visibility, harsh conditions'
    },
    mist: {
      moveSpeed:        1.0,
      visibilityFactor: 0.3,
      catchRate:        1.1,
      gatherRate:       1.05,
      xpMultiplier:     1.05,
      staminaDrain:     1.0,
      description:      'Gentle mist, slightly enhanced mystical properties'
    }
  };

  // ── Seasonal Weather Weights ─────────────────────────────────────────────────
  // Probabilities must sum to 1.0 per season

  var SEASONAL_WEATHER_WEIGHTS = {
    spring: {
      clear:        0.28,
      rain:         0.25,
      heavy_rain:   0.10,
      snow:         0.04,
      blizzard:     0.01,
      fog:          0.08,
      thunderstorm: 0.12,
      sandstorm:    0.02,
      mist:         0.10
    },
    summer: {
      clear:        0.45,
      rain:         0.15,
      heavy_rain:   0.06,
      snow:         0.00,
      blizzard:     0.00,
      fog:          0.04,
      thunderstorm: 0.18,
      sandstorm:    0.07,
      mist:         0.05
    },
    autumn: {
      clear:        0.25,
      rain:         0.22,
      heavy_rain:   0.12,
      snow:         0.06,
      blizzard:     0.02,
      fog:          0.15,
      thunderstorm: 0.08,
      sandstorm:    0.03,
      mist:         0.07
    },
    winter: {
      clear:        0.20,
      rain:         0.10,
      heavy_rain:   0.05,
      snow:         0.30,
      blizzard:     0.15,
      fog:          0.10,
      thunderstorm: 0.03,
      sandstorm:    0.01,
      mist:         0.06
    }
  };

  // ── Weather Transition Durations (seconds) ──────────────────────────────────

  var TRANSITION_DURATIONS = {
    // [from][to] — null falls back to default
    clear: {
      rain:         30,
      heavy_rain:   60,
      snow:         45,
      blizzard:     90,
      fog:          20,
      thunderstorm: 50,
      sandstorm:    25,
      mist:         15
    },
    rain: {
      clear:        25,
      heavy_rain:   15,
      fog:          20,
      thunderstorm: 20,
      snow:         40,
      blizzard:     70,
      sandstorm:    35,
      mist:         18
    },
    heavy_rain: {
      rain:         12,
      clear:        40,
      thunderstorm: 15,
      fog:          25,
      snow:         50,
      blizzard:     60,
      sandstorm:    30,
      mist:         25
    },
    snow: {
      clear:        35,
      rain:         30,
      blizzard:     20,
      fog:          15,
      heavy_rain:   40,
      thunderstorm: 55,
      sandstorm:    80,
      mist:         20
    },
    blizzard: {
      snow:         25,
      clear:        90,
      fog:          40,
      rain:         60,
      heavy_rain:   70,
      thunderstorm: 80,
      sandstorm:    100,
      mist:         50
    },
    fog: {
      clear:        20,
      mist:         10,
      rain:         15,
      heavy_rain:   25,
      snow:         30,
      blizzard:     50,
      thunderstorm: 35,
      sandstorm:    40
    },
    thunderstorm: {
      rain:         20,
      heavy_rain:   15,
      clear:        60,
      fog:          30,
      snow:         55,
      blizzard:     75,
      sandstorm:    45,
      mist:         35
    },
    sandstorm: {
      clear:        30,
      fog:          20,
      rain:         40,
      heavy_rain:   50,
      snow:         70,
      blizzard:     90,
      thunderstorm: 35,
      mist:         25
    },
    mist: {
      clear:        12,
      fog:          8,
      rain:         15,
      heavy_rain:   25,
      snow:         30,
      blizzard:     55,
      thunderstorm: 30,
      sandstorm:    35
    }
  };

  // ── Lightning Config ─────────────────────────────────────────────────────────

  var LIGHTNING_CHANCE = {
    clear:        0,
    rain:         0.001,
    heavy_rain:   0.004,
    snow:         0,
    blizzard:     0.0005,
    fog:          0,
    thunderstorm: 0.025,
    sandstorm:    0.003,
    mist:         0
  };

  // ── Internal Helpers ─────────────────────────────────────────────────────────

  function seededRand(seed) {
    // Simple deterministic LCG pseudo-random (0..1)
    var x = Math.sin(seed + 1) * 43758.5453123;
    return x - Math.floor(x);
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function lerpColor(hexA, hexB, t) {
    var rA = parseInt(hexA.slice(1, 3), 16);
    var gA = parseInt(hexA.slice(3, 5), 16);
    var bA = parseInt(hexA.slice(5, 7), 16);
    var rB = parseInt(hexB.slice(1, 3), 16);
    var gB = parseInt(hexB.slice(3, 5), 16);
    var bB = parseInt(hexB.slice(5, 7), 16);
    var r = Math.round(lerp(rA, rB, t));
    var g = Math.round(lerp(gA, gB, t));
    var b = Math.round(lerp(bA, bB, t));
    return '#' + ('0' + r.toString(16)).slice(-2) +
                 ('0' + g.toString(16)).slice(-2) +
                 ('0' + b.toString(16)).slice(-2);
  }

  function clamp(v, lo, hi) {
    return v < lo ? lo : v > hi ? hi : v;
  }

  function getTimeLabel(timeOfDay) {
    // timeOfDay: 0..1 (0 = midnight, 0.25 = 6am, 0.5 = noon, 0.75 = 6pm)
    if (timeOfDay === undefined || timeOfDay === null) return 'noon';
    if (timeOfDay < 0.083) return 'night';     // 0 - 2h
    if (timeOfDay < 0.208) return 'dawn';      // 2h - 5h
    if (timeOfDay < 0.375) return 'morning';   // 5h - 9h
    if (timeOfDay < 0.625) return 'noon';      // 9h - 15h
    if (timeOfDay < 0.792) return 'afternoon'; // 15h - 19h
    if (timeOfDay < 0.875) return 'dusk';      // 19h - 21h
    return 'night';                             // 21h - 24h
  }

  function validateWeatherType(type) {
    if (!PARTICLE_CONFIGS[type]) {
      throw new Error('Unknown weather type: ' + type);
    }
  }

  // ── Public API ───────────────────────────────────────────────────────────────

  /**
   * getWeatherConfig(type)
   * Returns the full configuration object for a weather type.
   * Includes particle, lighting, sound, visibility, modifiers, lightning.
   */
  function getWeatherConfig(type) {
    validateWeatherType(type);
    return {
      type:        type,
      particle:    getParticleConfig(type),
      lighting:    getLightingConfig(type, 0.5),
      sound:       SOUND_HINTS[type],
      visibility:  getVisibilityRange(type),
      modifiers:   getAmbientModifiers(type),
      lightning:   getLightningChance(type)
    };
  }

  /**
   * getParticleConfig(type)
   * Returns particle system parameters for the given weather type.
   */
  function getParticleConfig(type) {
    validateWeatherType(type);
    var cfg = PARTICLE_CONFIGS[type];
    // Return a shallow copy to prevent mutation
    return {
      count:       cfg.count,
      speed:       cfg.speed,
      size:        cfg.size,
      color:       cfg.color,
      opacity:     cfg.opacity,
      direction:   { x: cfg.direction.x, y: cfg.direction.y, z: cfg.direction.z },
      spread:      cfg.spread,
      turbulence:  cfg.turbulence,
      type:        cfg.type
    };
  }

  /**
   * getLightingConfig(type, timeOfDay)
   * Returns lighting parameters for weather + time of day.
   * timeOfDay: 0..1 (0 = midnight, 0.5 = noon)
   */
  function getLightingConfig(type, timeOfDay) {
    validateWeatherType(type);
    var base   = LIGHTING_CONFIGS[type];
    var tod    = getTimeLabel(timeOfDay);
    var mods   = TIME_OF_DAY_MODIFIERS[tod] || TIME_OF_DAY_MODIFIERS.noon;

    return {
      ambientColor:         base.ambientColor,
      ambientIntensity:     base.ambientIntensity  * mods.ambientMultiplier,
      directionalIntensity: base.directionalIntensity * mods.directionalMultiplier,
      fogColor:             base.fogColor,
      fogDensity:           base.fogDensity,
      skyColor:             base.skyColor,
      shadowStrength:       base.shadowStrength,
      timeOfDay:            tod,
      tint:                 mods.tint,
      tintStrength:         mods.tintStrength
    };
  }

  /**
   * interpolateWeather(from, to, progress)
   * Linearly interpolates between two weather states.
   * progress: 0..1
   * Returns blended particle and lighting configs.
   */
  function interpolateWeather(from, to, progress) {
    validateWeatherType(from);
    validateWeatherType(to);
    var t = clamp(progress, 0, 1);

    var pA = PARTICLE_CONFIGS[from];
    var pB = PARTICLE_CONFIGS[to];
    var lA = LIGHTING_CONFIGS[from];
    var lB = LIGHTING_CONFIGS[to];

    return {
      type:     t < 0.5 ? from : to,
      progress: t,
      particle: {
        count:      Math.round(lerp(pA.count,     pB.count,     t)),
        speed:      lerp(pA.speed,     pB.speed,     t),
        size:       lerp(pA.size,      pB.size,      t),
        color:      lerpColor(pA.color, pB.color, t),
        opacity:    lerp(pA.opacity,   pB.opacity,   t),
        direction:  {
          x: lerp(pA.direction.x, pB.direction.x, t),
          y: lerp(pA.direction.y, pB.direction.y, t),
          z: lerp(pA.direction.z, pB.direction.z, t)
        },
        spread:     lerp(pA.spread,    pB.spread,    t),
        turbulence: lerp(pA.turbulence, pB.turbulence, t),
        type:       t < 0.5 ? pA.type : pB.type
      },
      lighting: {
        ambientColor:         lerpColor(lA.ambientColor, lB.ambientColor, t),
        ambientIntensity:     lerp(lA.ambientIntensity,     lB.ambientIntensity,     t),
        directionalIntensity: lerp(lA.directionalIntensity, lB.directionalIntensity, t),
        fogColor:             lerpColor(lA.fogColor, lB.fogColor, t),
        fogDensity:           lerp(lA.fogDensity,  lB.fogDensity,  t),
        skyColor:             lerpColor(lA.skyColor, lB.skyColor, t),
        shadowStrength:       lerp(lA.shadowStrength, lB.shadowStrength, t)
      }
    };
  }

  /**
   * getWindVector(weather, time)
   * Returns wind direction and strength that evolve over time.
   * time: game time in seconds (monotonic)
   * Returns {x, y, z, strength}
   */
  function getWindVector(weather, time) {
    validateWeatherType(weather);
    var t = time || 0;

    // Base wind strengths per weather
    var baseStrengths = {
      clear:        2,
      rain:         8,
      heavy_rain:   16,
      snow:         4,
      blizzard:     30,
      fog:          1,
      thunderstorm: 22,
      sandstorm:    35,
      mist:         1.5
    };

    var base = baseStrengths[weather];

    // Slow sinusoidal drift in direction
    var angle   = (t * 0.0003) + seededRand(Math.floor(t / 120)) * Math.PI * 2;
    var gust    = 1 + 0.3 * Math.sin(t * 0.07) + 0.15 * Math.sin(t * 0.23);
    var strength = base * gust;

    return {
      x:        Math.cos(angle) * strength,
      y:        0,
      z:        Math.sin(angle) * strength,
      strength: strength
    };
  }

  /**
   * applyWindToPosition(pos, wind, mass)
   * Computes displacement from wind based on object mass.
   * pos: {x, y, z}
   * wind: result of getWindVector
   * mass: kg (heavier = less displaced)
   * Returns new position {x, y, z}
   */
  function applyWindToPosition(pos, wind, mass) {
    var m = mass > 0 ? mass : 1;
    var factor = 1 / m;
    return {
      x: pos.x + wind.x * factor,
      y: pos.y + wind.y * factor,
      z: pos.z + wind.z * factor
    };
  }

  /**
   * getVisibilityRange(weather)
   * Returns how far the player can see (in world units).
   */
  function getVisibilityRange(weather) {
    validateWeatherType(weather);
    return VISIBILITY_RANGES[weather];
  }

  /**
   * getPuddleLevel(weather, duration)
   * Returns ground water accumulation level (0..1).
   * duration: seconds the weather has been active.
   */
  function getPuddleLevel(weather, duration) {
    validateWeatherType(weather);
    var dur = duration || 0;

    // Accumulation rates (fraction per second)
    var rates = {
      clear:        -0.0005,  // evaporation
      rain:          0.002,
      heavy_rain:    0.006,
      snow:          0.0005,  // melts slowly into puddles
      blizzard:     -0.001,   // freezes, reduces puddles
      fog:           0.0002,
      thunderstorm:  0.008,
      sandstorm:    -0.003,   // sand absorbs water
      mist:          0.0004
    };

    var rate  = rates[weather];
    var level = rate * dur;
    // clamp returns 0 for negative rates at duration=0, but -0*0 = -0 in JS
    // Add 0 to normalize -0 to +0
    return clamp(level, 0, 1) + 0;
  }

  /**
   * getLightningChance(weather)
   * Returns probability (0..1) of a lightning flash per game tick.
   */
  function getLightningChance(weather) {
    validateWeatherType(weather);
    return LIGHTNING_CHANCE[weather];
  }

  /**
   * generateLightningBolt(seed)
   * Returns a deterministic random bolt path as an array of {x, y, z} points.
   * The bolt travels from sky to ground (y from ~120 to 0).
   */
  function generateLightningBolt(seed) {
    var s        = seed || 0;
    var segments = 5 + Math.floor(seededRand(s) * 4);   // 5..8 segments
    var points   = [];
    var startX   = (seededRand(s + 1) - 0.5) * 200;
    var startZ   = (seededRand(s + 2) - 0.5) * 200;
    var topY     = 110 + seededRand(s + 3) * 20;

    points.push({ x: startX, y: topY, z: startZ });

    for (var i = 1; i <= segments; i++) {
      var t       = i / segments;
      var decay   = 1 - t;
      var jitterX = (seededRand(s + i * 7 + 10) - 0.5) * 30 * decay;
      var jitterZ = (seededRand(s + i * 7 + 11) - 0.5) * 30 * decay;
      var y       = topY * (1 - t);                      // descend to 0
      points.push({
        x: startX + jitterX,
        y: y,
        z: startZ + jitterZ
      });
    }

    // Branch: 30% chance of a sub-bolt
    var branches = [];
    if (seededRand(s + 99) < 0.3 && points.length > 2) {
      var branchFrom = points[Math.floor(points.length / 2)];
      var bLen       = 2 + Math.floor(seededRand(s + 200) * 3);
      var branch     = [{ x: branchFrom.x, y: branchFrom.y, z: branchFrom.z }];
      for (var j = 1; j <= bLen; j++) {
        var bt = j / bLen;
        branch.push({
          x: branchFrom.x + (seededRand(s + 300 + j) - 0.5) * 20 * (1 - bt),
          y: branchFrom.y * (1 - bt * 0.8),
          z: branchFrom.z + (seededRand(s + 400 + j) - 0.5) * 20 * (1 - bt)
        });
      }
      branches.push(branch);
    }

    return {
      points:   points,
      segments: segments,
      branches: branches,
      seed:     seed
    };
  }

  /**
   * getWeatherTransitionDuration(from, to)
   * Returns how many seconds the transition between two weather types should take.
   */
  function getWeatherTransitionDuration(from, to) {
    validateWeatherType(from);
    validateWeatherType(to);
    if (from === to) return 0;
    var row = TRANSITION_DURATIONS[from];
    if (row && row[to] !== undefined) return row[to];
    return 40; // default fallback
  }

  /**
   * getSeasonalWeatherWeights(season)
   * Returns probability distribution object for a given season.
   * Seasons: 'spring', 'summer', 'autumn', 'winter'
   */
  function getSeasonalWeatherWeights(season) {
    var weights = SEASONAL_WEATHER_WEIGHTS[season];
    if (!weights) {
      throw new Error('Unknown season: ' + season);
    }
    // Return copy
    var copy = {};
    var types = Object.keys(weights);
    for (var i = 0; i < types.length; i++) {
      copy[types[i]] = weights[types[i]];
    }
    return copy;
  }

  /**
   * rollWeather(seed, season)
   * Deterministically selects a weather type from seasonal weights using a seed.
   */
  function rollWeather(seed, season) {
    var weights = SEASONAL_WEATHER_WEIGHTS[season];
    if (!weights) {
      throw new Error('Unknown season: ' + season);
    }
    var r      = seededRand(seed);
    var types  = Object.keys(weights);
    var cumul  = 0;
    for (var i = 0; i < types.length; i++) {
      cumul += weights[types[i]];
      if (r < cumul) return types[i];
    }
    return types[types.length - 1]; // fallback (floating point)
  }

  /**
   * getAmbientModifiers(weather)
   * Returns gameplay modifiers for the given weather type.
   */
  function getAmbientModifiers(weather) {
    validateWeatherType(weather);
    var m = AMBIENT_MODIFIERS[weather];
    return {
      moveSpeed:        m.moveSpeed,
      visibilityFactor: m.visibilityFactor,
      catchRate:        m.catchRate,
      gatherRate:       m.gatherRate,
      xpMultiplier:     m.xpMultiplier,
      staminaDrain:     m.staminaDrain,
      description:      m.description
    };
  }

  // ── Exports ──────────────────────────────────────────────────────────────────

  exports.WEATHER_TYPES              = WEATHER_TYPES;
  exports.PARTICLE_CONFIGS           = PARTICLE_CONFIGS;
  exports.LIGHTING_CONFIGS           = LIGHTING_CONFIGS;
  exports.SOUND_HINTS                = SOUND_HINTS;
  exports.VISIBILITY_RANGES          = VISIBILITY_RANGES;
  exports.AMBIENT_MODIFIERS          = AMBIENT_MODIFIERS;
  exports.SEASONAL_WEATHER_WEIGHTS   = SEASONAL_WEATHER_WEIGHTS;
  exports.TRANSITION_DURATIONS       = TRANSITION_DURATIONS;
  exports.LIGHTNING_CHANCE           = LIGHTNING_CHANCE;
  exports.TIME_OF_DAY_MODIFIERS      = TIME_OF_DAY_MODIFIERS;

  exports.getWeatherConfig           = getWeatherConfig;
  exports.getParticleConfig          = getParticleConfig;
  exports.getLightingConfig          = getLightingConfig;
  exports.interpolateWeather         = interpolateWeather;
  exports.getWindVector              = getWindVector;
  exports.applyWindToPosition        = applyWindToPosition;
  exports.getVisibilityRange         = getVisibilityRange;
  exports.getPuddleLevel             = getPuddleLevel;
  exports.getLightningChance         = getLightningChance;
  exports.generateLightningBolt      = generateLightningBolt;
  exports.getWeatherTransitionDuration = getWeatherTransitionDuration;
  exports.getSeasonalWeatherWeights  = getSeasonalWeatherWeights;
  exports.rollWeather                = rollWeather;
  exports.getAmbientModifiers        = getAmbientModifiers;

})(typeof module !== 'undefined' ? module.exports : (window.WeatherFX = {}));
