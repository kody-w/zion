(function(exports) {
  // Seasonal events system based on real-world date

  // Season definitions with date ranges
  const SEASONS = {
    spring: {
      id: 'spring',
      name: 'Spring',
      description: 'A time of renewal and growth',
      startMonth: 2, // March (0-indexed)
      endMonth: 4,   // May
      festival: {
        name: 'Bloom Festival',
        description: 'Cherry blossoms fill the air with petals of hope',
        theme: 'flower'
      },
      colors: {
        primary: '#f8b4c8',
        secondary: '#7db37d',
        accent: '#ffd4e5',
        ambient: '#ffe8f0'
      },
      bonus: {
        activity: 'garden',
        multiplier: 1.25,
        description: 'Garden yields increased'
      }
    },
    summer: {
      id: 'summer',
      name: 'Summer',
      description: 'The warmth of endless days',
      startMonth: 5, // June
      endMonth: 7,   // August
      festival: {
        name: 'Sun Festival',
        description: 'Golden light dances with fireflies at dusk',
        theme: 'sun'
      },
      colors: {
        primary: '#f0c040',
        secondary: '#ff8c42',
        accent: '#ffe080',
        ambient: '#fff4d4'
      },
      bonus: {
        activity: 'exploration',
        multiplier: 1.25,
        description: 'Exploration rewards increased'
      }
    },
    autumn: {
      id: 'autumn',
      name: 'Autumn',
      description: 'The season of abundance and reflection',
      startMonth: 8,  // September
      endMonth: 10,   // November
      festival: {
        name: 'Harvest Festival',
        description: 'Leaves fall like amber rain, celebrating the bounty',
        theme: 'harvest'
      },
      colors: {
        primary: '#d4a040',
        secondary: '#8b4513',
        accent: '#e8b860',
        ambient: '#f0e0c0'
      },
      bonus: {
        activity: 'crafting',
        multiplier: 1.25,
        description: 'Crafting rewards increased'
      }
    },
    winter: {
      id: 'winter',
      name: 'Winter',
      description: 'A time of wonder and togetherness',
      startMonth: 11, // December (wraps to Feb)
      endMonth: 1,    // February
      festival: {
        name: 'Star Festival',
        description: 'Snowflakes drift beneath starlit skies',
        theme: 'star'
      },
      colors: {
        primary: '#80c0e0',
        secondary: '#e8e8ff',
        accent: '#a0d4f0',
        ambient: '#e0f0ff'
      },
      bonus: {
        activity: 'social',
        multiplier: 1.25,
        description: 'Social rewards increased'
      }
    }
  };

  // Seasonal items available per season
  const SEASONAL_ITEMS = {
    spring: [
      {
        id: 'cherry_blossom',
        name: 'Cherry Blossom',
        description: 'Delicate pink petals from the sacred trees',
        rarity: 'rare',
        type: 'decoration'
      },
      {
        id: 'spring_bouquet',
        name: 'Spring Bouquet',
        description: 'A vibrant arrangement of seasonal flowers',
        rarity: 'uncommon',
        type: 'gift'
      },
      {
        id: 'rainbow_seed',
        name: 'Rainbow Seed',
        description: 'A magical seed that blooms in seven colors',
        rarity: 'legendary',
        type: 'consumable'
      }
    ],
    summer: [
      {
        id: 'sun_crystal',
        name: 'Sun Crystal',
        description: 'Captures the warmth and light of summer',
        rarity: 'rare',
        type: 'material'
      },
      {
        id: 'firefly_jar',
        name: 'Firefly Jar',
        description: 'A gentle glow to light your path',
        rarity: 'uncommon',
        type: 'decoration'
      },
      {
        id: 'tropical_fruit',
        name: 'Tropical Fruit',
        description: 'Sweet and refreshing, bursting with flavor',
        rarity: 'common',
        type: 'consumable'
      }
    ],
    autumn: [
      {
        id: 'golden_leaf',
        name: 'Golden Leaf',
        description: 'Preserved in its moment of perfect beauty',
        rarity: 'rare',
        type: 'material'
      },
      {
        id: 'pumpkin',
        name: 'Harvest Pumpkin',
        description: 'A symbol of the season\'s abundance',
        rarity: 'uncommon',
        type: 'decoration'
      },
      {
        id: 'maple_syrup',
        name: 'Maple Syrup',
        description: 'Sweet nectar from ancient trees',
        rarity: 'common',
        type: 'consumable'
      }
    ],
    winter: [
      {
        id: 'snowglobe',
        name: 'Snowglobe',
        description: 'A miniature winter wonderland',
        rarity: 'rare',
        type: 'decoration'
      },
      {
        id: 'star_ornament',
        name: 'Star Ornament',
        description: 'Handcrafted decoration that sparkles like the night sky',
        rarity: 'uncommon',
        type: 'decoration'
      },
      {
        id: 'hot_cocoa',
        name: 'Hot Cocoa',
        description: 'Warm comfort in a cup',
        rarity: 'common',
        type: 'consumable'
      }
    ]
  };

  // Decoration configurations per zone and season
  const SEASONAL_DECORATIONS = {
    spring: {
      town: [
        { type: 'cherry_tree', count: 8, positions: 'random' },
        { type: 'flower_bed', count: 12, positions: 'pathways' },
        { type: 'blossom_arch', count: 2, positions: 'entrances' }
      ],
      forest: [
        { type: 'wildflower_patch', count: 15, positions: 'random' },
        { type: 'butterfly_spawn', count: 6, positions: 'clearings' }
      ],
      plains: [
        { type: 'tulip_field', count: 10, positions: 'random' },
        { type: 'rainbow_garden', count: 3, positions: 'special' }
      ]
    },
    summer: {
      town: [
        { type: 'lantern_string', count: 10, positions: 'overhead' },
        { type: 'sun_banner', count: 6, positions: 'buildings' },
        { type: 'fountain_glow', count: 2, positions: 'center' }
      ],
      forest: [
        { type: 'firefly_cluster', count: 20, positions: 'random' },
        { type: 'sun_shaft', count: 8, positions: 'canopy_breaks' }
      ],
      plains: [
        { type: 'sunflower_field', count: 12, positions: 'random' },
        { type: 'heat_shimmer', count: 5, positions: 'distance' }
      ]
    },
    autumn: {
      town: [
        { type: 'hay_bale', count: 8, positions: 'random' },
        { type: 'harvest_wreath', count: 10, positions: 'doors' },
        { type: 'corn_stalk', count: 6, positions: 'corners' }
      ],
      forest: [
        { type: 'mushroom_circle', count: 5, positions: 'random' },
        { type: 'leaf_pile', count: 12, positions: 'clearings' }
      ],
      plains: [
        { type: 'scarecrow', count: 4, positions: 'fields' },
        { type: 'wheat_sheaf', count: 10, positions: 'random' }
      ]
    },
    winter: {
      town: [
        { type: 'star_decoration', count: 15, positions: 'random' },
        { type: 'ice_sculpture', count: 4, positions: 'plazas' },
        { type: 'warm_light', count: 20, positions: 'windows' }
      ],
      forest: [
        { type: 'frost_crystal', count: 12, positions: 'random' },
        { type: 'snow_drift', count: 8, positions: 'ground' }
      ],
      plains: [
        { type: 'frozen_pond', count: 2, positions: 'special' },
        { type: 'icicle_cluster', count: 6, positions: 'rock_formations' }
      ]
    }
  };

  // Particle system configurations per season
  const SEASONAL_PARTICLES = {
    spring: {
      type: 'cherry_blossom',
      count: 100,
      color: '#ffc0db',
      size: 0.3,
      speed: 0.02,
      drift: true,
      swirl: true,
      gravity: 0.001
    },
    summer: {
      type: 'firefly',
      count: 60,
      color: '#ffff80',
      size: 0.2,
      speed: 0.015,
      glow: true,
      pulse: true,
      gravity: 0
    },
    autumn: {
      type: 'falling_leaf',
      count: 80,
      color: '#d4a040',
      size: 0.4,
      speed: 0.025,
      drift: true,
      spin: true,
      gravity: 0.002
    },
    winter: {
      type: 'snowflake',
      count: 120,
      color: '#ffffff',
      size: 0.25,
      speed: 0.01,
      drift: true,
      sparkle: true,
      gravity: 0.0015
    }
  };

  // NPC greetings per season
  const SEASONAL_GREETINGS = {
    spring: [
      'The flowers are beautiful this season!',
      'Can you feel the renewal in the air?',
      'Perfect weather for the Bloom Festival!',
      'Spring brings such wonderful energy!'
    ],
    summer: [
      'Another glorious sunny day!',
      'The fireflies will be out tonight!',
      'Perfect season for adventure!',
      'The Sun Festival lights up everything!'
    ],
    autumn: [
      'The harvest has been bountiful this year!',
      'Don\'t the leaves look magnificent?',
      'Time to gather and give thanks!',
      'The Harvest Festival begins soon!'
    ],
    winter: [
      'Stay warm out there, traveler!',
      'The stars shine brightest in winter!',
      'What a magical time of year!',
      'The Star Festival brings us together!'
    ]
  };

  /**
   * Get the current season based on real-world date
   * @returns {Object} Current season data
   */
  function getCurrentSeason() {
    const now = new Date();
    const month = now.getMonth(); // 0-indexed (0 = January)

    // Check each season
    for (const seasonKey in SEASONS) {
      const season = SEASONS[seasonKey];

      // Handle winter's wrap-around (Dec, Jan, Feb)
      if (season.id === 'winter') {
        if (month >= season.startMonth || month <= season.endMonth) {
          return season;
        }
      } else {
        if (month >= season.startMonth && month <= season.endMonth) {
          return season;
        }
      }
    }

    // Fallback to spring
    return SEASONS.spring;
  }

  /**
   * Get seasonal items available during current season
   * @returns {Array} Array of seasonal items
   */
  function getSeasonalItems() {
    const season = getCurrentSeason();
    return SEASONAL_ITEMS[season.id] || [];
  }

  /**
   * Get seasonal decorations for a specific zone
   * @param {string} zone - Zone name (town, forest, plains)
   * @returns {Array} Array of decoration configurations
   */
  function getSeasonalDecorations(zone) {
    const season = getCurrentSeason();
    const decorations = SEASONAL_DECORATIONS[season.id];
    return decorations[zone] || [];
  }

  /**
   * Get particle configuration for current season
   * @returns {Object} Particle system configuration
   */
  function getSeasonalParticles() {
    const season = getCurrentSeason();
    return SEASONAL_PARTICLES[season.id];
  }

  /**
   * Get season bonus multiplier for an activity
   * @param {string} activity - Activity type (garden, exploration, crafting, social)
   * @returns {number} Multiplier (1.0 for no bonus, 1.25 for seasonal bonus)
   */
  function getSeasonBonus(activity) {
    const season = getCurrentSeason();
    if (season.bonus.activity === activity) {
      return season.bonus.multiplier;
    }
    return 1.0;
  }

  /**
   * Get days remaining until season ends
   * @returns {number} Days until season changes
   */
  function getDaysUntilSeasonEnd() {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const season = getCurrentSeason();

    let endDate;

    // Handle winter's wrap-around
    if (season.id === 'winter') {
      if (currentMonth === 11) {
        // December - end is Feb 28/29 next year
        const nextYear = currentYear + 1;
        const isLeapYear = (nextYear % 4 === 0 && nextYear % 100 !== 0) || (nextYear % 400 === 0);
        endDate = new Date(nextYear, 1, isLeapYear ? 29 : 28, 23, 59, 59);
      } else {
        // Jan or Feb
        const isLeapYear = (currentYear % 4 === 0 && currentYear % 100 !== 0) || (currentYear % 400 === 0);
        endDate = new Date(currentYear, 1, isLeapYear ? 29 : 28, 23, 59, 59);
      }
    } else {
      // For other seasons, get last day of end month
      endDate = new Date(currentYear, season.endMonth + 1, 0, 23, 59, 59);
    }

    const msPerDay = 24 * 60 * 60 * 1000;
    const daysRemaining = Math.ceil((endDate - now) / msPerDay);

    return Math.max(0, daysRemaining);
  }

  /**
   * Get a random seasonal greeting for NPCs
   * @returns {string} Seasonal greeting text
   */
  function getSeasonalGreeting() {
    const season = getCurrentSeason();
    const greetings = SEASONAL_GREETINGS[season.id];
    return greetings[Math.floor(Math.random() * greetings.length)];
  }

  /**
   * Get color scheme for current season
   * @returns {Object} Color palette with primary, secondary, accent, ambient
   */
  function getSeasonalColors() {
    const season = getCurrentSeason();
    return season.colors;
  }

  // Export all functions and data
  exports.SEASONS = SEASONS;
  exports.SEASONAL_ITEMS = SEASONAL_ITEMS;
  exports.SEASONAL_DECORATIONS = SEASONAL_DECORATIONS;
  exports.SEASONAL_PARTICLES = SEASONAL_PARTICLES;
  exports.SEASONAL_GREETINGS = SEASONAL_GREETINGS;
  exports.getCurrentSeason = getCurrentSeason;
  exports.getSeasonalItems = getSeasonalItems;
  exports.getSeasonalDecorations = getSeasonalDecorations;
  exports.getSeasonalParticles = getSeasonalParticles;
  exports.getSeasonBonus = getSeasonBonus;
  exports.getDaysUntilSeasonEnd = getDaysUntilSeasonEnd;
  exports.getSeasonalGreeting = getSeasonalGreeting;
  exports.getSeasonalColors = getSeasonalColors;

})(typeof module !== 'undefined' ? module.exports : (window.Seasons = {}));
