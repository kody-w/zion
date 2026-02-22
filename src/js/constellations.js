// constellations.js
/**
 * ZION Constellations & Stargazing System
 * Night sky with lore, celestial events, astrology bonuses
 * UMD module pattern — browser + Node.js compatible
 */
(function(exports) {
  'use strict';

  // ─── STAR CATALOG ────────────────────────────────────────────────────────────
  // 50+ named stars with brightness (0-1), color (hex), azimuth (0-2π), elevation (0-π/2)
  var STAR_CATALOG = [
    // Azimuth in radians (0=North, π/2=East, π=South, 3π/2=West), elevation in radians
    { id: 0,  name: 'Solara',     brightness: 1.00, color: '#fffbe8', azimuth: 0.00, elevation: 1.50 },
    { id: 1,  name: 'Veridian',   brightness: 0.92, color: '#b8f0c8', azimuth: 0.52, elevation: 1.20 },
    { id: 2,  name: 'Ardentus',   brightness: 0.88, color: '#ff9944', azimuth: 1.05, elevation: 0.95 },
    { id: 3,  name: 'Crystallon', brightness: 0.85, color: '#a8d8ff', azimuth: 1.57, elevation: 0.80 },
    { id: 4,  name: 'Luminara',   brightness: 0.83, color: '#ffffff', azimuth: 2.09, elevation: 1.10 },
    { id: 5,  name: 'Pyrokan',    brightness: 0.80, color: '#ff6633', azimuth: 2.62, elevation: 0.70 },
    { id: 6,  name: 'Tempestia',  brightness: 0.78, color: '#ccddff', azimuth: 3.14, elevation: 0.60 },
    { id: 7,  name: 'Geovex',     brightness: 0.75, color: '#ddbb88', azimuth: 3.67, elevation: 1.00 },
    { id: 8,  name: 'Melodrix',   brightness: 0.73, color: '#ffaacc', azimuth: 4.19, elevation: 0.85 },
    { id: 9,  name: 'Aegishorn',  brightness: 0.71, color: '#88ccff', azimuth: 4.71, elevation: 1.30 },
    { id: 10, name: 'Dreamveil',  brightness: 0.70, color: '#ddaaff', azimuth: 5.24, elevation: 0.55 },
    { id: 11, name: 'Flameroot',  brightness: 0.68, color: '#ff8855', azimuth: 5.76, elevation: 0.90 },
    { id: 12, name: 'Wispling',   brightness: 0.66, color: '#eeeebb', azimuth: 0.26, elevation: 0.45 },
    { id: 13, name: 'Mercouri',   brightness: 0.65, color: '#ffd080', azimuth: 0.79, elevation: 1.05 },
    { id: 14, name: 'Sanctivir',  brightness: 0.63, color: '#ccffcc', azimuth: 1.31, elevation: 0.75 },
    { id: 15, name: 'Obliveon',   brightness: 0.61, color: '#8899cc', azimuth: 1.83, elevation: 0.40 },
    { id: 16, name: 'Thornveil',  brightness: 0.60, color: '#bbdd99', azimuth: 2.36, elevation: 0.65 },
    { id: 17, name: 'Caducea',    brightness: 0.58, color: '#ffccaa', azimuth: 2.88, elevation: 1.20 },
    { id: 18, name: 'Nexara',     brightness: 0.57, color: '#ffffff', azimuth: 3.40, elevation: 0.50 },
    { id: 19, name: 'Wandrix',    brightness: 0.55, color: '#aaddff', azimuth: 3.93, elevation: 0.80 },
    { id: 20, name: 'Heliosa',    brightness: 0.54, color: '#ffee88', azimuth: 4.45, elevation: 1.10 },
    { id: 21, name: 'Ferralis',   brightness: 0.52, color: '#ddaa66', azimuth: 4.97, elevation: 0.35 },
    { id: 22, name: 'Boreaxis',   brightness: 0.51, color: '#aaccee', azimuth: 5.50, elevation: 0.70 },
    { id: 23, name: 'Vortaxis',   brightness: 0.50, color: '#ccbbff', azimuth: 6.02, elevation: 0.95 },
    { id: 24, name: 'Solvara',    brightness: 0.48, color: '#ffdd88', azimuth: 0.39, elevation: 0.60 },
    { id: 25, name: 'Minthos',    brightness: 0.47, color: '#99ffcc', azimuth: 0.91, elevation: 1.00 },
    { id: 26, name: 'Cruxalis',   brightness: 0.46, color: '#ff99bb', azimuth: 1.44, elevation: 0.55 },
    { id: 27, name: 'Duskwing',   brightness: 0.45, color: '#cc9966', azimuth: 1.96, elevation: 0.85 },
    { id: 28, name: 'Tidewatcher',brightness: 0.43, color: '#88ddff', azimuth: 2.48, elevation: 1.15 },
    { id: 29, name: 'Emberveil',  brightness: 0.42, color: '#ff7755', azimuth: 3.01, elevation: 0.45 },
    { id: 30, name: 'Petalux',    brightness: 0.41, color: '#ffbbdd', azimuth: 3.53, elevation: 0.75 },
    { id: 31, name: 'Luminos',    brightness: 0.40, color: '#eeffaa', azimuth: 4.06, elevation: 1.20 },
    { id: 32, name: 'Axioral',    brightness: 0.38, color: '#aabbcc', azimuth: 4.58, elevation: 0.65 },
    { id: 33, name: 'Hollowvex',  brightness: 0.37, color: '#bbaadd', azimuth: 5.11, elevation: 0.40 },
    { id: 34, name: 'Chartaxis',  brightness: 0.36, color: '#ddddaa', azimuth: 5.63, elevation: 0.90 },
    { id: 35, name: 'Fernova',    brightness: 0.35, color: '#99cc88', azimuth: 0.13, elevation: 1.10 },
    { id: 36, name: 'Prismalis',  brightness: 0.33, color: '#dde8ff', azimuth: 0.65, elevation: 0.50 },
    { id: 37, name: 'Zephyron',   brightness: 0.32, color: '#cceeff', azimuth: 1.18, elevation: 0.80 },
    { id: 38, name: 'Runeveil',   brightness: 0.31, color: '#cc99ff', azimuth: 1.70, elevation: 0.60 },
    { id: 39, name: 'Thalaxis',   brightness: 0.30, color: '#88bbdd', azimuth: 2.22, elevation: 1.00 },
    { id: 40, name: 'Cendrix',    brightness: 0.29, color: '#ffddaa', azimuth: 2.75, elevation: 0.35 },
    { id: 41, name: 'Irisveil',   brightness: 0.28, color: '#ffccee', azimuth: 3.28, elevation: 0.70 },
    { id: 42, name: 'Magnavar',   brightness: 0.27, color: '#aaddcc', azimuth: 3.80, elevation: 1.05 },
    { id: 43, name: 'Orvaris',    brightness: 0.26, color: '#eedd99', azimuth: 4.32, elevation: 0.45 },
    { id: 44, name: 'Spindrift',  brightness: 0.25, color: '#99bbcc', azimuth: 4.85, elevation: 0.85 },
    { id: 45, name: 'Volcanix',   brightness: 0.24, color: '#ff6644', azimuth: 5.37, elevation: 0.65 },
    { id: 46, name: 'Serenalis',  brightness: 0.23, color: '#cceebb', azimuth: 5.90, elevation: 0.95 },
    { id: 47, name: 'Miravox',    brightness: 0.22, color: '#ffaaee', azimuth: 0.47, elevation: 0.50 },
    { id: 48, name: 'Stoneheart', brightness: 0.21, color: '#ccbbaa', azimuth: 1.00, elevation: 0.75 },
    { id: 49, name: 'Aetheron',   brightness: 0.20, color: '#aaccff', azimuth: 1.52, elevation: 1.30 },
    { id: 50, name: 'Verdaxis',   brightness: 0.19, color: '#88dd88', azimuth: 2.05, elevation: 0.60 },
    { id: 51, name: 'Pyreveil',   brightness: 0.18, color: '#ffaa66', azimuth: 2.57, elevation: 0.40 },
    { id: 52, name: 'Solstrix',   brightness: 0.17, color: '#ffffcc', azimuth: 3.10, elevation: 1.10 }
  ];

  // ─── CONSTELLATION CATALOG ───────────────────────────────────────────────────
  // 12 ZION-lore constellations, each tied to a zone archetype
  var CONSTELLATION_CATALOG = {
    the_builder: {
      id: 'the_builder',
      name: 'The Builder',
      stars: [7, 21, 34, 40, 48, 11],
      lore_text: 'Six stars form a hammer and anvil in the night sky. Ancient legend tells of the first Builders of ZION, who raised the great Nexus from raw stone and starlight. When The Builder rises, crafters find their hands blessed with steadier skill and finer vision. It is said that any structure begun beneath this constellation will stand for a thousand years.',
      associated_zone: 'studio',
      bonus_type: 'crafting',
      bonus_value: 1.30,
      discovery_difficulty: 2,
      season_peak: 'winter',
      azimuth_center: 2.80,
      elevation_center: 0.70
    },
    the_gardener: {
      id: 'the_gardener',
      name: 'The Gardener',
      stars: [1, 14, 16, 25, 30, 35, 50],
      lore_text: 'Seven stars trace a graceful figure kneeling among endless blooms. The Gardener is the patron of all who tend the living world of ZION. Her stars guide seeds to find the richest soil and coax rain from reluctant clouds. Those who harvest beneath her gaze receive a gift of abundance — more than they planted, more than they dared hope for.',
      associated_zone: 'gardens',
      bonus_type: 'harvesting',
      bonus_value: 1.35,
      discovery_difficulty: 1,
      season_peak: 'spring',
      azimuth_center: 1.10,
      elevation_center: 0.80
    },
    the_scholar: {
      id: 'the_scholar',
      name: 'The Scholar',
      stars: [0, 4, 12, 18, 36, 49],
      lore_text: 'Six blazing stars shape an open tome suspended in the heavens. The Scholar has watched over the Athenaeum since the first scrolls were laid upon its shelves. Scholars who study beneath this constellation find their understanding deepens, connections forming between ideas that seemed distant. Knowledge flows like water when The Scholar is overhead.',
      associated_zone: 'athenaeum',
      bonus_type: 'learning',
      bonus_value: 1.40,
      discovery_difficulty: 2,
      season_peak: 'autumn',
      azimuth_center: 0.20,
      elevation_center: 1.00
    },
    the_wanderer: {
      id: 'the_wanderer',
      name: 'The Wanderer',
      stars: [19, 22, 33, 37, 44, 46],
      lore_text: 'Six stars outline a figure mid-stride, staff in hand, horizon ahead. The Wanderer is beloved by explorers, guiding those who venture into the unknown corners of ZION. Under this constellation, paths seem clearer, distances shorter, and hidden places reveal themselves to those with the courage to seek them. The Wanderer asks only that you keep moving forward.',
      associated_zone: 'wilds',
      bonus_type: 'exploration',
      bonus_value: 1.30,
      discovery_difficulty: 3,
      season_peak: 'summer',
      azimuth_center: 4.20,
      elevation_center: 0.65
    },
    the_merchant: {
      id: 'the_merchant',
      name: 'The Merchant',
      stars: [13, 20, 24, 27, 43, 51],
      lore_text: 'Six stars form a set of scales perfectly balanced in the sky. The Merchant is the celestial guardian of fair exchange and honest dealing. In ZION\'s markets and agoras, traders invoke The Merchant before sealing important deals. When the scales overhead tip toward alignment, all transactions carry an invisible blessing of prosperity for both parties.',
      associated_zone: 'agora',
      bonus_type: 'trading',
      bonus_value: 1.25,
      discovery_difficulty: 2,
      season_peak: 'autumn',
      azimuth_center: 3.60,
      elevation_center: 0.80
    },
    the_guardian: {
      id: 'the_guardian',
      name: 'The Guardian',
      stars: [3, 6, 9, 15, 32, 39],
      lore_text: 'Six stars form a towering sentinel with shield raised high. The Guardian stands eternal watch over ZION, protecting its people in darkness and storm. Citizens who face danger call upon The Guardian for strength and resolve. When this constellation is ascendant, those in the Commons find solidarity in numbers, and community bonds hold firmer against adversity.',
      associated_zone: 'commons',
      bonus_type: 'defense',
      bonus_value: 1.30,
      discovery_difficulty: 2,
      season_peak: 'winter',
      azimuth_center: 2.20,
      elevation_center: 0.75
    },
    the_musician: {
      id: 'the_musician',
      name: 'The Musician',
      stars: [8, 26, 31, 41, 47, 52],
      lore_text: 'Six stars trace a lyre whose strings are drawn taut across the sky. The Musician breathes inspiration into artists, poets, and performers throughout ZION. On nights when this constellation is high overhead, music carries farther than it should, voices ring with unexpected clarity, and audiences feel moved in ways they cannot explain. The Musician offers the greatest gift: the power to make others feel.',
      associated_zone: 'studio',
      bonus_type: 'performance',
      bonus_value: 1.35,
      discovery_difficulty: 3,
      season_peak: 'summer',
      azimuth_center: 4.60,
      elevation_center: 0.80
    },
    the_healer: {
      id: 'the_healer',
      name: 'The Healer',
      stars: [5, 17, 28, 38, 42, 45],
      lore_text: 'Six stars outline a gentle hand extended in offering. The Healer constellation is one of the oldest recognized in ZION, charted by the first physicians who noticed that the sick recovered faster when certain star-patterns hung overhead. Under The Healer, injuries mend more swiftly, ailments ease, and the weary find rest that truly restores. In the Gardens, healers gather herbs blessed by this light.',
      associated_zone: 'gardens',
      bonus_type: 'healing',
      bonus_value: 1.40,
      discovery_difficulty: 3,
      season_peak: 'spring',
      azimuth_center: 3.00,
      elevation_center: 0.75
    },
    the_philosopher: {
      id: 'the_philosopher',
      name: 'The Philosopher',
      stars: [0, 10, 23, 36, 38, 49],
      lore_text: 'Six stars form a spiraling shape resembling an ouroboros — the serpent consuming its own tail. The Philosopher watches over those who seek truth beyond mere knowledge. Beneath this constellation, questions become more interesting than their answers, and citizens find themselves drawn into profound conversation. The deepest mysteries of ZION yield their secrets only to those willing to sit in the Philosopher\'s light.',
      associated_zone: 'athenaeum',
      bonus_type: 'wisdom',
      bonus_value: 1.45,
      discovery_difficulty: 4,
      season_peak: 'autumn',
      azimuth_center: 0.55,
      elevation_center: 1.05
    },
    the_artist: {
      id: 'the_artist',
      name: 'The Artist',
      stars: [2, 26, 30, 41, 47, 50],
      lore_text: 'Six stars scatter in what looks like random color until one steps back and sees the portrait — a face gazing upward, in perpetual wonder. The Artist constellation celebrates creative vision and the courage to make something new. When these stars align, crafters report that their work takes on unexpected beauty, and even simple creations seem to carry a spark of something transcendent.',
      associated_zone: 'studio',
      bonus_type: 'creativity',
      bonus_value: 1.35,
      discovery_difficulty: 3,
      season_peak: 'summer',
      azimuth_center: 1.80,
      elevation_center: 0.65
    },
    the_dreamer: {
      id: 'the_dreamer',
      name: 'The Dreamer',
      stars: [10, 15, 33, 38, 41, 52],
      lore_text: 'Six faint stars that are barely visible unless one relaxes their gaze and lets the eye drift — then the pattern emerges, a sleeping form surrounded by floating thought-bubbles. The Dreamer is patron of visionaries, those who see what could be rather than what is. Under this constellation, the boundary between possibility and reality seems thin, and bold ideas find unexpected paths to realization.',
      associated_zone: 'nexus',
      bonus_type: 'inspiration',
      bonus_value: 1.50,
      discovery_difficulty: 5,
      season_peak: 'winter',
      azimuth_center: 5.00,
      elevation_center: 0.55
    },
    the_phoenix: {
      id: 'the_phoenix',
      name: 'The Phoenix',
      stars: [2, 5, 11, 20, 29, 45, 52],
      lore_text: 'Seven stars trace a great bird with wings ablaze, rising from a cloud of ember-stars below. The Phoenix is the rarest and most powerful constellation in ZION\'s sky, appearing only at certain alignments and never in the same intensity twice. It is the constellation of transformation and rebirth. Those who witness The Phoenix at its peak are said to be marked for change — great loss followed by greater becoming.',
      associated_zone: 'arena',
      bonus_type: 'resilience',
      bonus_value: 1.60,
      discovery_difficulty: 5,
      season_peak: 'winter',
      azimuth_center: 4.90,
      elevation_center: 0.85
    }
  };

  // ─── CELESTIAL EVENTS ────────────────────────────────────────────────────────
  var CELESTIAL_EVENTS = {
    shooting_star: {
      id: 'shooting_star',
      name: 'Shooting Star',
      description: 'A single streak of light arcs across the sky, there and gone in a breath.',
      duration_seconds: 3,
      rarity: 0.15,
      effect: { type: 'xp_boost', value: 1.10, duration_minutes: 5 },
      visual: { color: '#ffffff', trail_length: 0.8 }
    },
    meteor_shower: {
      id: 'meteor_shower',
      name: 'Meteor Shower',
      description: 'Dozens of meteors rain down in a spectacular celestial display.',
      duration_seconds: 120,
      rarity: 0.04,
      effect: { type: 'xp_boost', value: 1.25, duration_minutes: 30 },
      visual: { color: '#ffccaa', trail_length: 1.5 }
    },
    comet: {
      id: 'comet',
      name: 'The Wandering Comet',
      description: 'A great comet blazes across ZION\'s sky, its tail stretching across a third of the heavens.',
      duration_seconds: 600,
      rarity: 0.02,
      effect: { type: 'rare_spawn', value: 2.0, duration_minutes: 60 },
      visual: { color: '#88ddff', tail_color: '#aaffcc', tail_length: 3.0 }
    },
    lunar_eclipse: {
      id: 'lunar_eclipse',
      name: 'Lunar Eclipse',
      description: 'The moon turns blood-red as ZION\'s shadow falls across its face.',
      duration_seconds: 3600,
      rarity: 0.01,
      effect: { type: 'mystery_bonus', value: 1.5, duration_minutes: 120 },
      visual: { moon_color: '#cc3300', ambient_shift: 0.3 }
    },
    planetary_alignment: {
      id: 'planetary_alignment',
      name: 'Planetary Alignment',
      description: 'ZION\'s wandering lights form a perfect line — an omen of great significance.',
      duration_seconds: 1800,
      rarity: 0.005,
      effect: { type: 'all_bonuses', value: 1.20, duration_minutes: 90 },
      visual: { glow_color: '#ffffaa', line_width: 2.0 }
    },
    nova: {
      id: 'nova',
      name: 'Nova',
      description: 'A star in the northeast briefly blazes as bright as the moon before fading — a death cry heard across the ages.',
      duration_seconds: 300,
      rarity: 0.008,
      effect: { type: 'discovery_boost', value: 3.0, duration_minutes: 45 },
      visual: { color: '#ffffff', pulse_scale: 4.0, fade_time: 240 }
    },
    aurora_burst: {
      id: 'aurora_burst',
      name: 'Aurora Burst',
      description: 'Curtains of green, violet, and gold ripple across the northern sky, painting ZION in otherworldly hues.',
      duration_seconds: 7200,
      rarity: 0.03,
      effect: { type: 'social_bonus', value: 1.30, duration_minutes: 180 },
      visual: { colors: ['#00ff88', '#aa44ff', '#ffdd00'], wave_speed: 0.5 }
    }
  };

  // ─── ZODIAC SIGNS ────────────────────────────────────────────────────────────
  // Based on day-of-year (join date) — 12 signs spanning ~30 days each
  var ZODIAC_CATALOG = [
    {
      id: 'ironborn',
      name: 'Ironborn',
      symbol: 'anvil',
      day_start: 1, day_end: 30,
      description: 'Born at the turning of the year, Ironborn citizens carry an inner forge — their resolve hardens under pressure.',
      bonus: { type: 'crafting', value: 0.05 }
    },
    {
      id: 'seedweaver',
      name: 'Seedweaver',
      symbol: 'sprout',
      day_start: 31, day_end: 59,
      description: 'Seedweavers possess the patience of roots and the ambition of climbing vines. They tend what others overlook.',
      bonus: { type: 'harvesting', value: 0.05 }
    },
    {
      id: 'tidecaller',
      name: 'Tidecaller',
      symbol: 'wave',
      day_start: 60, day_end: 90,
      description: 'Those born when the ice breaks are pulled by forces invisible to others. They feel the tides of change before they arrive.',
      bonus: { type: 'trading', value: 0.05 }
    },
    {
      id: 'stormwatcher',
      name: 'Stormwatcher',
      symbol: 'lightning',
      day_start: 91, day_end: 120,
      description: 'Stormwatchers stand at the edge of chaos and feel alive. Their boldness in uncertainty inspires those around them.',
      bonus: { type: 'exploration', value: 0.05 }
    },
    {
      id: 'flamebrand',
      name: 'Flamebrand',
      symbol: 'flame',
      day_start: 121, day_end: 151,
      description: 'The Flamebrand burns bright and fast, leaving warmth wherever they pass. Their creative passion is unmatched.',
      bonus: { type: 'performance', value: 0.05 }
    },
    {
      id: 'thornmind',
      name: 'Thornmind',
      symbol: 'scroll',
      day_start: 152, day_end: 181,
      description: 'Sharp minds that cut to truth like thorns through undergrowth. Thornmind citizens see patterns others miss.',
      bonus: { type: 'learning', value: 0.05 }
    },
    {
      id: 'scalebinder',
      name: 'Scalebinder',
      symbol: 'scales',
      day_start: 182, day_end: 212,
      description: 'Scalebinders seek balance in all things. Their steady hand makes them natural mediators and fair dealers.',
      bonus: { type: 'trading', value: 0.07 }
    },
    {
      id: 'voidwalker',
      name: 'Voidwalker',
      symbol: 'void',
      day_start: 213, day_end: 243,
      description: 'Drawn to shadows and secrets, Voidwalkers explore where others fear to tread — and return with things unseen.',
      bonus: { type: 'exploration', value: 0.07 }
    },
    {
      id: 'archbow',
      name: 'Archbow',
      symbol: 'arrow',
      day_start: 244, day_end: 273,
      description: 'The Archbow never misses what they aim at. Their focus and ambition carry them farther than most dream possible.',
      bonus: { type: 'competition', value: 0.07 }
    },
    {
      id: 'stonepeak',
      name: 'Stonepeak',
      symbol: 'mountain',
      day_start: 274, day_end: 304,
      description: 'Slow to change, lasting forever. Stonepeaks build things meant to endure — structures, friendships, legacies.',
      bonus: { type: 'building', value: 0.07 }
    },
    {
      id: 'crystallight',
      name: 'Crystallight',
      symbol: 'crystal',
      day_start: 305, day_end: 334,
      description: 'Crystallights refract what they receive into something more beautiful. They take inspiration from everywhere.',
      bonus: { type: 'creativity', value: 0.08 }
    },
    {
      id: 'dreamfish',
      name: 'Dreamfish',
      symbol: 'fish',
      day_start: 335, day_end: 366,
      description: 'Swimming between worlds, Dreamfish are comfortable in ambiguity. Their intuitions are rarely wrong.',
      bonus: { type: 'wisdom', value: 0.08 }
    }
  ];

  // ─── INTERNAL HELPERS ────────────────────────────────────────────────────────

  /**
   * Simple deterministic pseudo-random based on a seed
   * @param {number} seed
   * @returns {number} 0..1
   */
  function seededRand(seed) {
    var x = Math.sin(seed + 1) * 43758.5453123;
    return x - Math.floor(x);
  }

  /**
   * Get day-of-year (1-366) from a Date or ISO string
   * @param {Date|string} date
   * @returns {number}
   */
  function getDayOfYear(date) {
    var d = (date instanceof Date) ? date : new Date(date);
    var start = new Date(d.getFullYear(), 0, 0);
    var diff = d - start;
    var oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay);
  }

  /**
   * Normalize worldTime to fractional day (0.0 = midnight, 0.5 = noon, 1.0 = midnight)
   * worldTime can be a number (Unix ms), a fraction 0-1, or a Date
   */
  function normalizeWorldTime(worldTime) {
    if (worldTime instanceof Date) {
      return (worldTime.getHours() * 3600 + worldTime.getMinutes() * 60 + worldTime.getSeconds()) / 86400;
    }
    if (typeof worldTime === 'number') {
      if (worldTime > 1000) {
        // Unix ms timestamp
        var d = new Date(worldTime);
        return (d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds()) / 86400;
      }
      // Already a 0-1 fraction
      return worldTime % 1.0;
    }
    return 0.5;
  }

  /**
   * Season string from worldTime
   * @param {number|Date|string} worldTime
   * @param {string} [seasonOverride]
   * @returns {string} 'spring'|'summer'|'autumn'|'winter'
   */
  function resolveSeason(worldTime, seasonOverride) {
    if (seasonOverride && typeof seasonOverride === 'string') {
      return seasonOverride;
    }
    var now = (worldTime instanceof Date) ? worldTime : new Date(typeof worldTime === 'number' && worldTime > 1000 ? worldTime : Date.now());
    var month = now.getMonth(); // 0-11
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    if (month >= 8 && month <= 10) return 'autumn';
    return 'winter';
  }

  // ─── EXPORTED FUNCTIONS ──────────────────────────────────────────────────────

  /**
   * Check whether it is night time (stars visible)
   * Night = before 6:00 or after 20:00 (fraction < 0.25 or > 0.833)
   * @param {number|Date} worldTime
   * @returns {boolean}
   */
  function isNightTime(worldTime) {
    var frac = normalizeWorldTime(worldTime);
    // Night: 0.0 (midnight) to 0.25 (6am) OR 0.833 (8pm) to 1.0 (midnight)
    return frac < 0.25 || frac > 0.833;
  }

  /**
   * Get the current moon phase
   * Returns an object with phase name and fraction (0 = new moon, 0.5 = full moon)
   * @param {number|Date} worldTime
   * @returns {{ phase: string, fraction: number, illumination: number }}
   */
  function getPhaseOfMoon(worldTime) {
    var ts = (worldTime instanceof Date) ? worldTime.getTime() :
             (typeof worldTime === 'number' && worldTime > 1000) ? worldTime :
             Date.now();
    // Lunar cycle ≈ 29.53059 days in ms
    var LUNAR_CYCLE_MS = 29.53059 * 24 * 60 * 60 * 1000;
    // Known new moon reference: Jan 13 2021 05:00 UTC
    var NEW_MOON_REF = 1610517600000;
    var elapsed = ((ts - NEW_MOON_REF) % LUNAR_CYCLE_MS + LUNAR_CYCLE_MS) % LUNAR_CYCLE_MS;
    var fraction = elapsed / LUNAR_CYCLE_MS; // 0=new, 0.5=full

    var phase;
    var illumination;
    if (fraction < 0.0625) {
      phase = 'new_moon'; illumination = 0.0;
    } else if (fraction < 0.1875) {
      phase = 'waxing_crescent'; illumination = fraction * 4;
    } else if (fraction < 0.3125) {
      phase = 'first_quarter'; illumination = 0.5;
    } else if (fraction < 0.4375) {
      phase = 'waxing_gibbous'; illumination = 0.5 + (fraction - 0.25) * 4;
    } else if (fraction < 0.5625) {
      phase = 'full_moon'; illumination = 1.0;
    } else if (fraction < 0.6875) {
      phase = 'waning_gibbous'; illumination = 1.0 - (fraction - 0.5) * 4;
    } else if (fraction < 0.8125) {
      phase = 'last_quarter'; illumination = 0.5;
    } else if (fraction < 0.9375) {
      phase = 'waning_crescent'; illumination = (1.0 - fraction) * 4;
    } else {
      phase = 'new_moon'; illumination = 0.0;
    }

    return { phase: phase, fraction: fraction, illumination: illumination };
  }

  /**
   * Get all stars visible at the current world time and season
   * Returns empty array during daytime
   * @param {number|Date} worldTime
   * @param {string} [season]
   * @returns {Array}
   */
  function getVisibleStars(worldTime, season) {
    if (!isNightTime(worldTime)) {
      return [];
    }
    var frac = normalizeWorldTime(worldTime);
    var resolvedSeason = resolveSeason(worldTime, season);
    // Seasonal visibility offset: shift azimuth by ~90° per season
    var seasonOffset = { spring: 0, summer: Math.PI / 2, autumn: Math.PI, winter: 3 * Math.PI / 2 };
    var offset = seasonOffset[resolvedSeason] || 0;
    // At deep night (frac near 0 or 1) all stars visible; near dawn/dusk some fade
    var nightDepth = frac < 0.5 ? 1.0 - frac / 0.25 : (frac - 0.833) / (1.0 - 0.833);
    nightDepth = Math.min(1.0, Math.max(0.0, nightDepth));

    var visible = [];
    for (var i = 0; i < STAR_CATALOG.length; i++) {
      var star = STAR_CATALOG[i];
      // Adjust azimuth by season offset for sky rotation
      var adjustedAzimuth = (star.azimuth + offset) % (Math.PI * 2);
      // Only show stars above horizon (elevation > 0)
      if (star.elevation > 0.05) {
        visible.push({
          id: star.id,
          name: star.name,
          brightness: star.brightness * nightDepth,
          color: star.color,
          azimuth: adjustedAzimuth,
          elevation: star.elevation
        });
      }
    }
    return visible;
  }

  /**
   * Get constellations visible at the given world time + season
   * @param {number|Date} worldTime
   * @param {string} [season]
   * @returns {Array}
   */
  function getVisibleConstellations(worldTime, season) {
    if (!isNightTime(worldTime)) {
      return [];
    }
    var resolvedSeason = resolveSeason(worldTime, season);
    var visible = [];
    for (var id in CONSTELLATION_CATALOG) {
      var c = CONSTELLATION_CATALOG[id];
      // Constellations are always visible at night, but peak in their associated season
      visible.push({
        id: c.id,
        name: c.name,
        stars: c.stars.slice(),
        associated_zone: c.associated_zone,
        bonus_type: c.bonus_type,
        is_peak_season: (c.season_peak === resolvedSeason),
        discovery_difficulty: c.discovery_difficulty
      });
    }
    return visible;
  }

  /**
   * Attempt to identify a constellation from player-selected star indices
   * Uses a matching algorithm based on star set intersection
   * @param {Array<number>} starIndices — array of star IDs the player selected
   * @returns {{ matched: boolean, constellationId: string|null, confidence: number }}
   */
  function identifyConstellation(starIndices) {
    if (!starIndices || starIndices.length < 2) {
      return { matched: false, constellationId: null, confidence: 0 };
    }
    var selected = {};
    for (var i = 0; i < starIndices.length; i++) {
      selected[starIndices[i]] = true;
    }
    var bestId = null;
    var bestScore = 0;
    for (var id in CONSTELLATION_CATALOG) {
      var c = CONSTELLATION_CATALOG[id];
      var matches = 0;
      for (var j = 0; j < c.stars.length; j++) {
        if (selected[c.stars[j]]) matches++;
      }
      // Score: intersection / union (Jaccard similarity)
      var union = Object.keys(selected).length + c.stars.length - matches;
      var score = union > 0 ? matches / union : 0;
      if (score > bestScore) {
        bestScore = score;
        bestId = id;
      }
    }
    // Threshold: require at least 50% similarity to count as a match
    var matched = bestScore >= 0.5;
    return {
      matched: matched,
      constellationId: matched ? bestId : null,
      confidence: Math.round(bestScore * 100)
    };
  }

  /**
   * Discover a constellation for a player — updates the state object
   * @param {string} playerId
   * @param {string} constellationId
   * @param {Object} state — mutable state object with .discoveries map
   * @returns {{ success: boolean, alreadyDiscovered: boolean, sparksEarned: number }}
   */
  function discoverConstellation(playerId, constellationId, state) {
    if (!CONSTELLATION_CATALOG[constellationId]) {
      return { success: false, alreadyDiscovered: false, sparksEarned: 0, error: 'Unknown constellation' };
    }
    if (!state) state = {};
    if (!state.discoveries) state.discoveries = {};
    if (!state.discoveries[playerId]) state.discoveries[playerId] = {};
    if (state.discoveries[playerId][constellationId]) {
      return { success: false, alreadyDiscovered: true, sparksEarned: 0 };
    }
    var c = CONSTELLATION_CATALOG[constellationId];
    var sparksEarned = c.discovery_difficulty * 10;
    state.discoveries[playerId][constellationId] = {
      ts: Date.now(),
      sparksEarned: sparksEarned
    };
    return { success: true, alreadyDiscovered: false, sparksEarned: sparksEarned };
  }

  /**
   * Get all constellations discovered by a player
   * @param {string} playerId
   * @param {Object} state
   * @returns {Array<{ id: string, name: string, ts: number, sparksEarned: number }>}
   */
  function getDiscoveredConstellations(playerId, state) {
    if (!state || !state.discoveries || !state.discoveries[playerId]) {
      return [];
    }
    var result = [];
    var playerDisc = state.discoveries[playerId];
    for (var id in playerDisc) {
      if (CONSTELLATION_CATALOG[id]) {
        result.push({
          id: id,
          name: CONSTELLATION_CATALOG[id].name,
          ts: playerDisc[id].ts,
          sparksEarned: playerDisc[id].sparksEarned
        });
      }
    }
    return result;
  }

  /**
   * Get the lore text for a constellation
   * @param {string} constellationId
   * @returns {string|null}
   */
  function getConstellationLore(constellationId) {
    var c = CONSTELLATION_CATALOG[constellationId];
    return c ? c.lore_text : null;
  }

  /**
   * Get the active zone bonus when a constellation is overhead
   * During peak season the bonus is amplified
   * @param {string} constellationId
   * @param {number|Date} worldTime
   * @returns {{ bonus_type: string, value: number, active: boolean, zone: string }|null}
   */
  function getActiveBonus(constellationId, worldTime) {
    var c = CONSTELLATION_CATALOG[constellationId];
    if (!c) return null;
    var night = isNightTime(worldTime);
    if (!night) return { bonus_type: c.bonus_type, value: 1.0, active: false, zone: c.associated_zone };
    var season = resolveSeason(worldTime);
    var isPeak = (c.season_peak === season);
    var value = isPeak ? c.bonus_value * 1.15 : c.bonus_value;
    return {
      bonus_type: c.bonus_type,
      value: Math.round(value * 100) / 100,
      active: true,
      zone: c.associated_zone,
      is_peak_season: isPeak
    };
  }

  /**
   * Get deterministic celestial events for a given world time + seed
   * @param {number|Date} worldTime
   * @param {number} seed — integer seed for determinism
   * @returns {Array<{ event_id: string, active: boolean, time_until_next: number }>}
   */
  function getCelestialEvents(worldTime, seed) {
    var ts = (worldTime instanceof Date) ? worldTime.getTime() :
             (typeof worldTime === 'number' && worldTime > 1000) ? worldTime :
             Date.now();
    var results = [];
    var idx = 0;
    for (var eventId in CELESTIAL_EVENTS) {
      var ev = CELESTIAL_EVENTS[eventId];
      // Determine if event is active using seeded random per hour window
      var hourSlot = Math.floor(ts / (1000 * 60 * 60));
      var r = seededRand(seed + hourSlot + idx * 7919);
      var active = r < ev.rarity;
      // Time until next event (deterministic)
      var nextSlot = hourSlot + Math.ceil(1.0 / ev.rarity * seededRand(seed + idx * 3571));
      results.push({
        event_id: eventId,
        name: ev.name,
        active: active,
        time_until_next: active ? 0 : (nextSlot - hourSlot) * 3600 * 1000
      });
      idx++;
    }
    return results;
  }

  /**
   * Get gameplay effect for a celestial event
   * @param {string} eventId
   * @returns {{ type: string, value: number, duration_minutes: number }|null}
   */
  function getEventEffect(eventId) {
    var ev = CELESTIAL_EVENTS[eventId];
    return ev ? { type: ev.effect.type, value: ev.effect.value, duration_minutes: ev.effect.duration_minutes } : null;
  }

  /**
   * Get star chart visual data for rendering
   * @param {string} playerId
   * @param {Object} state — game state with discoveries
   * @returns {{ stars: Array, constellations: Array, discovered: Array, totalConstellations: number }}
   */
  function getStarChart(playerId, state) {
    var discovered = getDiscoveredConstellations(playerId, state);
    var discoveredMap = {};
    for (var i = 0; i < discovered.length; i++) {
      discoveredMap[discovered[i].id] = true;
    }
    var constellations = [];
    for (var id in CONSTELLATION_CATALOG) {
      var c = CONSTELLATION_CATALOG[id];
      constellations.push({
        id: c.id,
        name: c.name,
        stars: c.stars.slice(),
        azimuth_center: c.azimuth_center,
        elevation_center: c.elevation_center,
        discovered: !!discoveredMap[id],
        discovery_difficulty: c.discovery_difficulty
      });
    }
    return {
      stars: STAR_CATALOG.slice(),
      constellations: constellations,
      discovered: discovered,
      totalConstellations: Object.keys(CONSTELLATION_CATALOG).length,
      totalStars: STAR_CATALOG.length
    };
  }

  /**
   * Get the zodiac sign for a player based on their join date
   * @param {Date|string|number} joinDate
   * @returns {{ id: string, name: string, symbol: string, description: string, bonus: Object }|null}
   */
  function getZodiacSign(joinDate) {
    var day = getDayOfYear(joinDate instanceof Date ? joinDate :
               typeof joinDate === 'number' ? new Date(joinDate) :
               new Date(joinDate));
    for (var i = 0; i < ZODIAC_CATALOG.length; i++) {
      var z = ZODIAC_CATALOG[i];
      if (day >= z.day_start && day <= z.day_end) {
        return { id: z.id, name: z.name, symbol: z.symbol, description: z.description, bonus: z.bonus };
      }
    }
    // Fallback to last sign (handles edge cases)
    var last = ZODIAC_CATALOG[ZODIAC_CATALOG.length - 1];
    return { id: last.id, name: last.name, symbol: last.symbol, description: last.description, bonus: last.bonus };
  }

  /**
   * Get the permanent bonus for a zodiac sign
   * @param {string} signId
   * @returns {{ type: string, value: number }|null}
   */
  function getZodiacBonus(signId) {
    for (var i = 0; i < ZODIAC_CATALOG.length; i++) {
      if (ZODIAC_CATALOG[i].id === signId) {
        return ZODIAC_CATALOG[i].bonus;
      }
    }
    return null;
  }

  /**
   * Calculate total XP earned from stargazing activities
   * @param {Array<{ id: string, sparksEarned: number }>} discoveries — from getDiscoveredConstellations
   * @returns {{ totalXP: number, breakdown: Object }}
   */
  function getStargazingXP(discoveries) {
    if (!discoveries || !discoveries.length) {
      return { totalXP: 0, breakdown: {} };
    }
    var total = 0;
    var breakdown = {};
    for (var i = 0; i < discoveries.length; i++) {
      var d = discoveries[i];
      var c = CONSTELLATION_CATALOG[d.id];
      if (!c) continue;
      // XP = sparksEarned * difficulty multiplier
      var xp = d.sparksEarned * c.discovery_difficulty;
      breakdown[d.id] = xp;
      total += xp;
    }
    return { totalXP: total, breakdown: breakdown };
  }

  // ─── EXPORTS ─────────────────────────────────────────────────────────────────
  exports.STAR_CATALOG = STAR_CATALOG;
  exports.CONSTELLATION_CATALOG = CONSTELLATION_CATALOG;
  exports.CELESTIAL_EVENTS = CELESTIAL_EVENTS;
  exports.ZODIAC_CATALOG = ZODIAC_CATALOG;
  exports.isNightTime = isNightTime;
  exports.getPhaseOfMoon = getPhaseOfMoon;
  exports.getVisibleStars = getVisibleStars;
  exports.getVisibleConstellations = getVisibleConstellations;
  exports.identifyConstellation = identifyConstellation;
  exports.discoverConstellation = discoverConstellation;
  exports.getDiscoveredConstellations = getDiscoveredConstellations;
  exports.getConstellationLore = getConstellationLore;
  exports.getActiveBonus = getActiveBonus;
  exports.getCelestialEvents = getCelestialEvents;
  exports.getEventEffect = getEventEffect;
  exports.getStarChart = getStarChart;
  exports.getZodiacSign = getZodiacSign;
  exports.getZodiacBonus = getZodiacBonus;
  exports.getStargazingXP = getStargazingXP;

})(typeof module !== 'undefined' ? module.exports : (window.Constellations = {}));
