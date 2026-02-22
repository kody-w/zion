// puzzle_chamber.js
/**
 * ZION Puzzle Chamber Engine
 * Procedural puzzle engine for the Athenaeum — logic puzzles, sequence challenges,
 * riddles, pattern matching, ciphers, and collaborative solving.
 * Difficulty scaling (tiers 1-5) with Spark rewards per Constitution.
 *
 * Layer: after economy.js (uses Spark reward shapes)
 * Dependencies: Progression, SkillMastery, AchievementEngine (guarded)
 */

(function(exports) {
  'use strict';

  // Guard-pattern optional dependencies
  var Progression = (typeof window !== 'undefined' && window.Progression) || {};
  var SkillMastery = (typeof window !== 'undefined' && window.SkillMastery) || {};
  var AchievementEngine = (typeof window !== 'undefined' && window.AchievementEngine) || {};

  // ============================================================================
  // MULBERRY32 SEEDED PRNG
  // ============================================================================

  function mulberry32(seed) {
    var s = seed >>> 0;
    return function() {
      s += 0x6D2B79F5;
      var t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) >>> 0;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function hashString(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function seedFrom() {
    var parts = [];
    for (var i = 0; i < arguments.length; i++) parts.push(String(arguments[i]));
    return hashString(parts.join('|'));
  }

  function rngInt(rng, min, max) {
    return min + Math.floor(rng() * (max - min + 1));
  }

  function rngPick(rng, arr) {
    return arr[Math.floor(rng() * arr.length)];
  }

  function rngShuffle(rng, arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(rng() * (i + 1));
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }

  // ============================================================================
  // CONSTANTS
  // ============================================================================

  var PUZZLE_ARCHETYPES = ['sequence', 'logic_grid', 'riddle', 'pattern', 'cipher', 'collaborative'];

  var DIFFICULTY_TIERS = {
    1: { label: 'Novice',    sparkBase: 10,  timeBonus: 5,  hints: 3, complexity: 1 },
    2: { label: 'Apprentice',sparkBase: 25,  timeBonus: 10, hints: 3, complexity: 2 },
    3: { label: 'Adept',     sparkBase: 50,  timeBonus: 20, hints: 2, complexity: 3 },
    4: { label: 'Expert',    sparkBase: 75,  timeBonus: 35, hints: 2, complexity: 4 },
    5: { label: 'Master',    sparkBase: 100, timeBonus: 50, hints: 1, complexity: 5 }
  };

  // Time limits in seconds per tier
  var TIME_LIMITS = { 1: 300, 2: 240, 3: 180, 4: 120, 5: 90 };

  // Speed bonus thresholds (fraction of time limit used)
  var SPEED_BONUS_THRESHOLDS = [
    { fraction: 0.25, multiplier: 2.0, label: 'Lightning' },
    { fraction: 0.50, multiplier: 1.5, label: 'Swift' },
    { fraction: 0.75, multiplier: 1.2, label: 'Brisk' },
    { fraction: 1.00, multiplier: 1.0, label: 'Complete' }
  ];

  // Hint cost as fraction of base reward
  var HINT_COST_FRACTION = 0.15;

  // Co-op room max players
  var COOP_MAX_PLAYERS = 4;
  var COOP_MIN_PLAYERS = 2;

  // ============================================================================
  // RIDDLE BANK — 40 riddles across difficulty tiers
  // ============================================================================

  var RIDDLE_BANK = [
    // Tier 1 — Novice
    {
      id: 'r01', tier: 1,
      question: 'I speak without a mouth and hear without ears. I have no body, but I come alive with the wind. What am I?',
      answer: 'echo',
      hints: ['I reflect something back to you.', 'You hear me after you make a sound.', 'Say something in a canyon and you will find me.']
    },
    {
      id: 'r02', tier: 1,
      question: 'The more you take, the more you leave behind. What am I?',
      answer: 'footsteps',
      hints: ['Think about walking.', 'You make me every time you move.', 'Look behind you on a trail.']
    },
    {
      id: 'r03', tier: 1,
      question: 'I have cities, but no houses live there. I have mountains, but no trees grow there. I have water, but no fish swim there. What am I?',
      answer: 'map',
      hints: ['I represent things without being them.', 'Explorers carry me.', 'I show you the world on a flat surface.']
    },
    {
      id: 'r04', tier: 1,
      question: 'What has hands but cannot clap?',
      answer: 'clock',
      hints: ['It marks time.', 'It is found on walls and wrists.', 'It has a face too.']
    },
    {
      id: 'r05', tier: 1,
      question: 'I have a head and a tail but no body. What am I?',
      answer: 'coin',
      hints: ['You can spend me.', 'I am made of metal.', 'Flip me to make a decision.']
    },
    {
      id: 'r06', tier: 1,
      question: 'What gets wetter as it dries?',
      answer: 'towel',
      hints: ['You use it after bathing.', 'It absorbs water.', 'You hang it in a bathroom.']
    },
    {
      id: 'r07', tier: 1,
      question: 'What can travel around the world while staying in a corner?',
      answer: 'stamp',
      hints: ['You put it on a letter.', 'It is very small.', 'It helps mail reach its destination.']
    },
    // Tier 2 — Apprentice
    {
      id: 'r08', tier: 2,
      question: 'I am always in front of you but cannot be seen. What am I?',
      answer: 'future',
      hints: ['I have not happened yet.', 'Yesterday is behind you, today is here, and I am...', 'Tomorrow belongs to me.']
    },
    {
      id: 'r09', tier: 2,
      question: 'The one who makes it, sells it. The one who buys it, never uses it. The one who uses it, never knows. What is it?',
      answer: 'coffin',
      hints: ['It is used after death.', 'A carpenter builds it.', 'It is a final resting place.']
    },
    {
      id: 'r10', tier: 2,
      question: 'I have branches but no leaves, roots, or trunk. What am I?',
      answer: 'bank',
      hints: ['Money is involved.', 'It has a main branch and local branches.', 'You deposit things here.']
    },
    {
      id: 'r11', tier: 2,
      question: 'What can you catch but not throw?',
      answer: 'cold',
      hints: ['It makes you sneeze.', 'You get it in winter.', 'It is an illness.']
    },
    {
      id: 'r12', tier: 2,
      question: 'I am light as a feather but even the strongest person cannot hold me for more than a few minutes. What am I?',
      answer: 'breath',
      hints: ['You need me to live.', 'You exhale me.', 'Hold me and you cannot breathe.']
    },
    {
      id: 'r13', tier: 2,
      question: 'What is full of holes but can still hold water?',
      answer: 'sponge',
      hints: ['It is soft.', 'You use it to clean.', 'It is very porous.']
    },
    // Tier 3 — Adept
    {
      id: 'r14', tier: 3,
      question: 'I have three eyes, all in a row. When the red one opens, all are frozen below. What am I?',
      answer: 'traffic light',
      hints: ['Found on roads.', 'Cars stop and go because of me.', 'I have green and yellow eyes too.']
    },
    {
      id: 'r15', tier: 3,
      question: 'The more you remove from me, the bigger I become. What am I?',
      answer: 'hole',
      hints: ['I am an absence.', 'Dig in ground and you find me.', 'I am nothing, but I grow.']
    },
    {
      id: 'r16', tier: 3,
      question: 'I can fly without wings, cry without eyes. Wherever I go, darkness flies. What am I?',
      answer: 'cloud',
      hints: ['I am in the sky.', 'Rain comes from me.', 'I block the sun.']
    },
    {
      id: 'r17', tier: 3,
      question: 'What has a neck but no head, two arms but no hands?',
      answer: 'shirt',
      hints: ['You wear me.', 'It is clothing.', 'You put your arms through my sleeves.']
    },
    {
      id: 'r18', tier: 3,
      question: 'I run but never walk, I have a mouth but never talk, I have a head but never weep, I have a bed but never sleep. What am I?',
      answer: 'river',
      hints: ['I am water in motion.', 'Fish live in me.', 'I flow to the sea.']
    },
    // Tier 4 — Expert
    {
      id: 'r19', tier: 4,
      question: 'I am not alive but I grow; I do not have lungs but I need air; I do not have a mouth but water kills me. What am I?',
      answer: 'fire',
      hints: ['I am hot.', 'I consume fuel.', 'I give light and warmth.']
    },
    {
      id: 'r20', tier: 4,
      question: 'In a one-story pink house, there was a pink person, a pink cat, a pink fish, a pink computer, a pink chair, a pink table, and a pink telephone. What color were the stairs?',
      answer: 'none',
      hints: ['Think carefully about the house type.', 'One story means no second floor.', 'There are no stairs in a one-story house.']
    },
    {
      id: 'r21', tier: 4,
      question: 'I can be cracked, made, told, and played. What am I?',
      answer: 'joke',
      hints: ['You laugh at me.', 'A comedian tells me.', 'I am meant to be funny.']
    },
    {
      id: 'r22', tier: 4,
      question: 'What is at the end of a rainbow?',
      answer: 'w',
      hints: ['Think about the word itself.', 'Not gold.', 'The last letter of the word "rainbow".']
    },
    // Tier 5 — Master
    {
      id: 'r23', tier: 5,
      question: 'I am always hungry, I must always be fed. The finger I touch, will soon turn red. What am I?',
      answer: 'fire',
      hints: ['I consume.', 'I am warm.', 'I burn.']
    },
    {
      id: 'r24', tier: 5,
      question: 'What breaks when you say it?',
      answer: 'silence',
      hints: ['It is the absence of sound.', 'A library has much of me.', 'The moment you speak, I am gone.']
    },
    {
      id: 'r25', tier: 5,
      question: 'The more you have of it, the less you see. What is it?',
      answer: 'darkness',
      hints: ['It is the opposite of light.', 'Night has much of it.', 'Candles fight against it.']
    },
    {
      id: 'r26', tier: 5,
      question: 'What is black when you buy it, red when you use it, and gray when you throw it away?',
      answer: 'charcoal',
      hints: ['It is used for fuel or drawing.', 'It comes from burned wood.', 'Artists use it.']
    },
    {
      id: 'r27', tier: 5,
      question: 'I have no beginning, end, or middle. I am not alive but I can die. What am I?',
      answer: 'circle',
      hints: ['I am a shape.', 'I am round.', 'A ring is my form.']
    },
    // Additional riddles for breadth
    {
      id: 'r28', tier: 1,
      question: 'What has one eye but cannot see?',
      answer: 'needle',
      hints: ['Used for sewing.', 'Thread goes through me.', 'I am sharp and thin.']
    },
    {
      id: 'r29', tier: 2,
      question: 'What has many teeth but cannot bite?',
      answer: 'comb',
      hints: ['Used for hair.', 'It is a grooming tool.', 'It untangles things.']
    },
    {
      id: 'r30', tier: 3,
      question: 'What gets sharper the more you use it?',
      answer: 'mind',
      hints: ['It is not a tool.', 'Learning improves it.', 'You think with it.']
    },
    {
      id: 'r31', tier: 4,
      question: 'I have keys but no locks. I have space but no room. You can enter but cannot go inside. What am I?',
      answer: 'keyboard',
      hints: ['Used with a computer.', 'You type on me.', 'I have a spacebar.']
    },
    {
      id: 'r32', tier: 5,
      question: 'The person who makes it does not need it. The person who buys it does not want it. The person who needs it does not know it. What is it?',
      answer: 'coffin',
      hints: ['It is used at the end of life.', 'A craftsperson builds it.', 'Morticians know it well.']
    },
    {
      id: 'r33', tier: 2,
      question: 'What can run but never walks, has a mouth but never talks, has a bed but never sleeps?',
      answer: 'river',
      hints: ['It flows.', 'Fish live in it.', 'It ends at the ocean.']
    },
    {
      id: 'r34', tier: 3,
      question: 'I am taken from a mine and shut in a wooden case, from which I am never released, and yet I am used by almost every person. What am I?',
      answer: 'pencil',
      hints: ['You write with me.', 'My core is graphite.', 'I am encased in wood.']
    },
    {
      id: 'r35', tier: 1,
      question: 'What has an eye in the middle of it?',
      answer: 'hurricane',
      hints: ['It is a weather event.', 'It spins.', 'It has a calm center.']
    },
    {
      id: 'r36', tier: 4,
      question: 'What has a forest but no trees, has rivers but no water, and has cities but no buildings?',
      answer: 'map',
      hints: ['It represents the world.', 'Explorers use it.', 'It is flat.']
    },
    {
      id: 'r37', tier: 5,
      question: 'I disappear when you name me. What am I?',
      answer: 'silence',
      hints: ['It is peaceful.', 'Sound destroys it.', 'Libraries have lots of it.']
    },
    {
      id: 'r38', tier: 3,
      question: 'The more there is, the less you see. Descend into me and wisdom grows. What am I?',
      answer: 'mystery',
      hints: ['It involves the unknown.', 'Puzzles are part of me.', 'Discovery ends me.']
    },
    {
      id: 'r39', tier: 2,
      question: 'What can fill a room but takes up no space?',
      answer: 'light',
      hints: ['You see by it.', 'It travels fast.', 'The sun produces it.']
    },
    {
      id: 'r40', tier: 4,
      question: 'I am always ahead of you and behind you, but you can never catch me. What am I?',
      answer: 'time',
      hints: ['It is measured in hours.', 'Clocks track it.', 'It is the fourth dimension.']
    }
  ];

  // ============================================================================
  // CIPHER ALPHABETS
  // ============================================================================

  var ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  var CIPHER_WORDS = [
    'ATHENAEUM', 'WISDOM', 'KNOWLEDGE', 'PUZZLE', 'CIPHER',
    'NEXUS', 'ZION', 'HARMONY', 'BALANCE', 'PATTERN',
    'SEQUENCE', 'LOGIC', 'REASON', 'RIDDLE', 'ENCODE',
    'DECODE', 'SYMBOL', 'SIGNAL', 'HIDDEN', 'REVEAL',
    'ANCIENT', 'SCHOLAR', 'RUNE', 'GLYPH', 'SCROLL'
  ];

  // ============================================================================
  // PATTERN SHAPES
  // ============================================================================

  var PATTERN_COLORS = ['red', 'blue', 'green', 'yellow', 'purple', 'orange'];
  var PATTERN_SHAPES = ['circle', 'square', 'triangle', 'diamond', 'star', 'cross'];

  // ============================================================================
  // LOGIC GRID TEMPLATES
  // ============================================================================

  var LOGIC_GRID_CATEGORIES = [
    { name: 'zones',    values: ['nexus', 'gardens', 'athenaeum', 'studio', 'wilds'] },
    { name: 'crafts',   values: ['alchemy', 'smithing', 'weaving', 'brewing', 'carving'] },
    { name: 'elements', values: ['fire', 'water', 'earth', 'air', 'spirit'] },
    { name: 'times',    values: ['dawn', 'morning', 'noon', 'dusk', 'midnight'] },
    { name: 'colors',   values: ['crimson', 'azure', 'emerald', 'gold', 'violet'] },
    { name: 'gems',     values: ['ruby', 'sapphire', 'emerald', 'topaz', 'amethyst'] }
  ];

  // ============================================================================
  // SEQUENCE PATTERNS
  // ============================================================================

  // Numeric sequence generators
  var SEQUENCE_GENERATORS = [
    {
      id: 'arithmetic',
      generate: function(rng, tier) {
        var start = rngInt(rng, 1, 5 * tier);
        var step = rngInt(rng, 1, 3 * tier);
        var length = 4 + tier;
        var seq = [];
        for (var i = 0; i < length; i++) seq.push(start + i * step);
        return {
          visible: seq.slice(0, length - 1),
          answer: seq[length - 1],
          rule: 'Add ' + step + ' each time',
          type: 'arithmetic'
        };
      }
    },
    {
      id: 'geometric',
      generate: function(rng, tier) {
        var start = rngInt(rng, 1, 4);
        var ratio = rngInt(rng, 2, Math.min(2 + tier, 4));
        var length = 4 + Math.floor(tier / 2);
        var seq = [];
        for (var i = 0; i < length; i++) seq.push(start * Math.pow(ratio, i));
        return {
          visible: seq.slice(0, length - 1),
          answer: seq[length - 1],
          rule: 'Multiply by ' + ratio + ' each time',
          type: 'geometric'
        };
      }
    },
    {
      id: 'fibonacci_like',
      generate: function(rng, tier) {
        var a = rngInt(rng, 1, 3);
        var b = rngInt(rng, 1, 3);
        var length = 5 + tier;
        var seq = [a, b];
        for (var i = 2; i < length; i++) seq.push(seq[i-2] + seq[i-1]);
        return {
          visible: seq.slice(0, length - 1),
          answer: seq[length - 1],
          rule: 'Each number is the sum of the previous two',
          type: 'fibonacci_like'
        };
      }
    },
    {
      id: 'squares',
      generate: function(rng, tier) {
        var offset = rngInt(rng, 0, tier);
        var length = 4 + tier;
        var seq = [];
        for (var i = 1; i <= length; i++) seq.push((i + offset) * (i + offset));
        return {
          visible: seq.slice(0, length - 1),
          answer: seq[length - 1],
          rule: 'Perfect squares starting from ' + (1 + offset),
          type: 'squares'
        };
      }
    },
    {
      id: 'triangular',
      generate: function(rng, tier) {
        var offset = rngInt(rng, 0, tier - 1);
        var length = 5 + tier;
        var seq = [];
        for (var i = 1; i <= length; i++) {
          var n = i + offset;
          seq.push(n * (n + 1) / 2);
        }
        return {
          visible: seq.slice(0, length - 1),
          answer: seq[length - 1],
          rule: 'Triangular numbers: n*(n+1)/2',
          type: 'triangular'
        };
      }
    }
  ];

  // ============================================================================
  // LEADERBOARD STORAGE (in-memory per session)
  // ============================================================================

  var _leaderboards = {};
  // Structure: { [puzzleTypeKey]: [ { playerId, playerName, solveTime, tier, timestamp } ] }

  var LEADERBOARD_MAX_ENTRIES = 10;

  // ============================================================================
  // CO-OP ROOM REGISTRY (in-memory)
  // ============================================================================

  var _coopRooms = {};
  // Structure: { [roomId]: { puzzleId, puzzle, players, contributions, solved, startTime, chat } }

  // ============================================================================
  // ACTIVE SESSIONS (in-memory)
  // ============================================================================

  var _sessions = {};
  // Structure: { [sessionId]: { puzzle, playerId, startTime, hintsUsed, solved } }

  // ============================================================================
  // PUZZLE GENERATION — SEQUENCE
  // ============================================================================

  function generateSequencePuzzle(seed, tier) {
    var rng = mulberry32(seedFrom(seed, 'sequence', tier));
    var complexity = DIFFICULTY_TIERS[tier].complexity;
    var genIndex = rngInt(rng, 0, Math.min(complexity - 1, SEQUENCE_GENERATORS.length - 1));
    var generator = SEQUENCE_GENERATORS[genIndex];
    var data = generator.generate(rng, tier);

    var hintPool = [
      'Look at the difference between consecutive numbers.',
      'Consider multiplication patterns.',
      'The rule: ' + data.rule,
      'The next number continues the ' + data.type + ' pattern.',
      'Try computing ' + data.rule.toLowerCase() + '.'
    ];

    return {
      id: 'seq_' + seed + '_t' + tier,
      archetype: 'sequence',
      tier: tier,
      title: 'Number Sequence — ' + DIFFICULTY_TIERS[tier].label,
      description: 'Complete the sequence by finding the missing next number.',
      data: {
        visible: data.visible,
        answer: data.answer,
        rule: data.rule,
        type: data.type
      },
      hints: hintPool.slice(0, DIFFICULTY_TIERS[tier].hints + 2),
      answer: String(data.answer),
      validate: function(input) {
        // Reject non-primitive types (arrays, objects)
        if (typeof input === 'object' || typeof input === 'undefined') return false;
        var n = parseFloat(String(input).trim());
        return !isNaN(n) && n === data.answer;
      },
      timeLimit: TIME_LIMITS[tier],
      sparkReward: DIFFICULTY_TIERS[tier].sparkBase,
      seed: seed
    };
  }

  // ============================================================================
  // PUZZLE GENERATION — LOGIC GRID
  // ============================================================================

  function generateLogicGridPuzzle(seed, tier) {
    var rng = mulberry32(seedFrom(seed, 'logic_grid', tier));
    var size = 2 + Math.floor(tier / 2); // 2 at tier 1, 3 at tier 3, 4 at tier 5
    size = Math.min(size, 4);

    // Pick categories
    var cats = rngShuffle(rng, LOGIC_GRID_CATEGORIES).slice(0, 2);
    var rowCat = cats[0];
    var colCat = cats[1];

    var rows = rngShuffle(rng, rowCat.values).slice(0, size);
    var cols = rngShuffle(rng, colCat.values).slice(0, size);

    // Build solution: rows[i] pairs with cols[perm[i]]
    var perm = rngShuffle(rng, cols.slice());
    var solution = {};
    for (var i = 0; i < rows.length; i++) {
      solution[rows[i]] = perm[i];
    }

    // Generate clues based on solution
    var clues = [];
    var clueCount = size + Math.floor(tier * 1.5);

    // Clue type 1: direct (X is Y)
    for (var ci = 0; ci < Math.min(2, clueCount); ci++) {
      var ri = rngInt(rng, 0, rows.length - 1);
      clues.push({
        type: 'direct',
        text: 'The ' + rowCat.name + ' "' + rows[ri] + '" is associated with "' + solution[rows[ri]] + '".',
        encoded: { row: rows[ri], col: solution[rows[ri]], is: true }
      });
    }

    // Clue type 2: negative (X is not Y)
    for (var ci2 = 0; ci2 < Math.min(clueCount - 2, 3); ci2++) {
      var ri2 = rngInt(rng, 0, rows.length - 1);
      var wrongCol = rngPick(rng, cols.filter(function(c) { return c !== solution[rows[ri2]]; }));
      if (wrongCol) {
        clues.push({
          type: 'negative',
          text: 'The ' + rowCat.name + ' "' + rows[ri2] + '" is NOT associated with "' + wrongCol + '".',
          encoded: { row: rows[ri2], col: wrongCol, is: false }
        });
      }
    }

    // Clue type 3: relative (X is adjacent to Y in the ordering)
    var ri3 = rngInt(rng, 0, rows.length - 2);
    if (rows.length > 2) {
      clues.push({
        type: 'relative',
        text: '"' + rows[ri3] + '" and "' + rows[ri3 + 1] + '" are in the same group of ' + rowCat.name + '.',
        encoded: { row1: rows[ri3], row2: rows[ri3 + 1] }
      });
    }

    var hints = [
      'Use process of elimination with the clues.',
      'Start with direct clues (X is Y) and mark the grid.',
      'Negative clues eliminate possibilities.',
      'Each ' + rowCat.name + ' pairs with exactly one ' + colCat.name + '.',
      'The solution is: ' + rows.map(function(r) { return r + '→' + solution[r]; }).join(', ')
    ];

    return {
      id: 'lgrid_' + seed + '_t' + tier,
      archetype: 'logic_grid',
      tier: tier,
      title: 'Logic Grid — ' + DIFFICULTY_TIERS[tier].label,
      description: 'Use the clues to determine the correct pairings between ' + rowCat.name + ' and ' + colCat.name + '.',
      data: {
        rows: rows,
        cols: cols,
        rowCategory: rowCat.name,
        colCategory: colCat.name,
        clues: clues,
        size: size,
        solution: solution
      },
      hints: hints.slice(0, DIFFICULTY_TIERS[tier].hints + 2),
      answer: solution,
      validate: function(input) {
        if (typeof input !== 'object' || input === null) return false;
        for (var r in solution) {
          if (input[r] !== solution[r]) return false;
        }
        return Object.keys(input).length === Object.keys(solution).length;
      },
      timeLimit: TIME_LIMITS[tier],
      sparkReward: DIFFICULTY_TIERS[tier].sparkBase,
      seed: seed
    };
  }

  // ============================================================================
  // PUZZLE GENERATION — RIDDLE
  // ============================================================================

  function generateRiddlePuzzle(seed, tier) {
    var rng = mulberry32(seedFrom(seed, 'riddle', tier));
    var pool = RIDDLE_BANK.filter(function(r) { return r.tier === tier; });
    if (pool.length === 0) pool = RIDDLE_BANK;
    var riddle = rngPick(rng, pool);

    return {
      id: 'riddle_' + seed + '_t' + tier,
      archetype: 'riddle',
      tier: tier,
      title: 'Riddle of the Athenaeum — ' + DIFFICULTY_TIERS[tier].label,
      description: riddle.question,
      data: {
        question: riddle.question,
        riddleId: riddle.id
      },
      hints: riddle.hints.slice(0, Math.max(1, DIFFICULTY_TIERS[tier].hints)),
      answer: riddle.answer.toLowerCase(),
      validate: function(input) {
        var normalized = String(input).toLowerCase().trim();
        var ans = riddle.answer.toLowerCase();
        // Accept partial match for multi-word answers
        return normalized === ans || ans.indexOf(normalized) !== -1;
      },
      timeLimit: TIME_LIMITS[tier],
      sparkReward: DIFFICULTY_TIERS[tier].sparkBase,
      seed: seed
    };
  }

  // ============================================================================
  // PUZZLE GENERATION — PATTERN
  // ============================================================================

  function generatePatternPuzzle(seed, tier) {
    var rng = mulberry32(seedFrom(seed, 'pattern', tier));
    var complexity = DIFFICULTY_TIERS[tier].complexity;

    // Build a repeating color/shape pattern
    var colorCount = Math.min(2 + Math.floor(complexity / 2), PATTERN_COLORS.length);
    var shapeCount = Math.min(1 + Math.floor(complexity / 2), PATTERN_SHAPES.length);

    var usedColors = rngShuffle(rng, PATTERN_COLORS).slice(0, colorCount);
    var usedShapes = rngShuffle(rng, PATTERN_SHAPES).slice(0, shapeCount);

    // Generate pattern period
    var periodLength = 2 + Math.floor(complexity * 0.8);
    var period = [];
    for (var i = 0; i < periodLength; i++) {
      period.push({
        color: rngPick(rng, usedColors),
        shape: rngPick(rng, usedShapes)
      });
    }

    // Repeat the period to create visible sequence + answer
    var visibleCount = periodLength * 2 + rngInt(rng, 0, periodLength - 1);
    var sequence = [];
    for (var j = 0; j < visibleCount + 1; j++) {
      sequence.push(period[j % periodLength]);
    }

    var visible = sequence.slice(0, visibleCount);
    var answer = sequence[visibleCount];

    var hints = [
      'Look for a repeating pattern in the colors.',
      'Look for a repeating pattern in the shapes.',
      'The period (repeating unit) has ' + periodLength + ' elements.',
      'Count the position of the missing item: ' + (visibleCount + 1) + '. Divide by the period length.',
      'The answer is: color=' + answer.color + ', shape=' + answer.shape
    ];

    return {
      id: 'pattern_' + seed + '_t' + tier,
      archetype: 'pattern',
      tier: tier,
      title: 'Pattern Recognition — ' + DIFFICULTY_TIERS[tier].label,
      description: 'Identify the next element in the pattern sequence.',
      data: {
        sequence: visible,
        period: periodLength,
        colors: usedColors,
        shapes: usedShapes
      },
      hints: hints.slice(0, DIFFICULTY_TIERS[tier].hints + 2),
      answer: answer,
      validate: function(input) {
        if (typeof input !== 'object' || input === null) return false;
        return input.color === answer.color && input.shape === answer.shape;
      },
      timeLimit: TIME_LIMITS[tier],
      sparkReward: DIFFICULTY_TIERS[tier].sparkBase,
      seed: seed
    };
  }

  // ============================================================================
  // PUZZLE GENERATION — CIPHER
  // ============================================================================

  function generateCipherPuzzle(seed, tier) {
    var rng = mulberry32(seedFrom(seed, 'cipher', tier));
    var complexity = DIFFICULTY_TIERS[tier].complexity;

    // Pick a word appropriate to tier length
    var wordPool = CIPHER_WORDS.filter(function(w) {
      return w.length >= 4 + complexity && w.length <= 6 + complexity * 2;
    });
    if (wordPool.length === 0) wordPool = CIPHER_WORDS;
    var plaintext = rngPick(rng, wordPool);

    // Generate Caesar shift (tier 1-2) or substitution cipher (tier 3-5)
    var cipherType = tier <= 2 ? 'caesar' : (tier <= 4 ? 'atbash' : 'substitution');

    var ciphertext = '';
    var shift = 0;
    var subMap = {};
    var reverseMap = {};

    if (cipherType === 'caesar') {
      shift = rngInt(rng, 3, 20);
      for (var i = 0; i < plaintext.length; i++) {
        var idx = ALPHABET.indexOf(plaintext[i]);
        if (idx === -1) { ciphertext += plaintext[i]; continue; }
        ciphertext += ALPHABET[(idx + shift) % 26];
      }
    } else if (cipherType === 'atbash') {
      // A=Z, B=Y, C=X, etc.
      for (var i2 = 0; i2 < plaintext.length; i2++) {
        var idx2 = ALPHABET.indexOf(plaintext[i2]);
        if (idx2 === -1) { ciphertext += plaintext[i2]; continue; }
        ciphertext += ALPHABET[25 - idx2];
      }
    } else {
      // Full substitution cipher
      var shuffled = rngShuffle(rng, ALPHABET.split(''));
      for (var k = 0; k < 26; k++) {
        subMap[ALPHABET[k]] = shuffled[k];
        reverseMap[shuffled[k]] = ALPHABET[k];
      }
      for (var i3 = 0; i3 < plaintext.length; i3++) {
        ciphertext += (subMap[plaintext[i3]] || plaintext[i3]);
      }
    }

    var hints = [
      'This is a ' + cipherType + ' cipher.',
      cipherType === 'caesar' ? 'Each letter is shifted by a fixed number of positions.' :
        cipherType === 'atbash' ? 'A becomes Z, B becomes Y, and so on.' :
        'Each letter maps to a unique different letter.',
      cipherType === 'caesar' ? 'The shift value is between 1 and 25.' :
        cipherType === 'atbash' ? 'Try reversing the alphabet.' :
        'Frequent letters in ciphertext may map to common plaintext letters.',
      cipherType === 'caesar' ? 'The shift is ' + shift + '.' :
        'Try each mapping systematically.',
      'The answer is: ' + plaintext
    ];

    return {
      id: 'cipher_' + seed + '_t' + tier,
      archetype: 'cipher',
      tier: tier,
      title: 'Cipher Decode — ' + DIFFICULTY_TIERS[tier].label,
      description: 'Decode the following ciphertext to reveal the hidden word.',
      data: {
        ciphertext: ciphertext,
        cipherType: cipherType,
        shift: cipherType === 'caesar' ? shift : 0,
        subMap: cipherType === 'substitution' ? subMap : null,
        alphabet: ALPHABET
      },
      hints: hints.slice(0, DIFFICULTY_TIERS[tier].hints + 2),
      answer: plaintext,
      validate: function(input) {
        return String(input).toUpperCase().trim() === plaintext.toUpperCase();
      },
      timeLimit: TIME_LIMITS[tier],
      sparkReward: DIFFICULTY_TIERS[tier].sparkBase,
      seed: seed
    };
  }

  // ============================================================================
  // PUZZLE GENERATION — COLLABORATIVE RELAY
  // ============================================================================

  function generateCollaborativePuzzle(seed, tier) {
    var rng = mulberry32(seedFrom(seed, 'collaborative', tier));
    var stageCount = 2 + tier; // 3 to 7 stages

    // Each stage is a mini-puzzle of a random archetype (non-collaborative)
    var stageArchetypes = ['sequence', 'riddle', 'pattern', 'cipher'];
    var stages = [];

    for (var i = 0; i < stageCount; i++) {
      var archetype = rngPick(rng, stageArchetypes);
      var stageSeed = rngInt(rng, 10000, 99999);
      var stageTier = Math.max(1, tier - 1); // Slightly easier stages
      var stagePuzzle = null;

      if (archetype === 'sequence') stagePuzzle = generateSequencePuzzle(stageSeed, stageTier);
      else if (archetype === 'riddle') stagePuzzle = generateRiddlePuzzle(stageSeed, stageTier);
      else if (archetype === 'pattern') stagePuzzle = generatePatternPuzzle(stageSeed, stageTier);
      else if (archetype === 'cipher') stagePuzzle = generateCipherPuzzle(stageSeed, stageTier);

      stages.push({
        stageIndex: i,
        archetype: archetype,
        puzzle: stagePuzzle,
        assignedPlayer: null, // Set when players join
        solved: false,
        solvedBy: null,
        solvedAt: null
      });
    }

    var hints = [
      'This is a collaborative puzzle — each player solves one stage.',
      'Stages must be completed in order.',
      'Coordinate with your team to assign stages efficiently.',
      'Each stage is worth partial Spark rewards.',
      'Complete all ' + stageCount + ' stages to earn the full reward.'
    ];

    return {
      id: 'collab_' + seed + '_t' + tier,
      archetype: 'collaborative',
      tier: tier,
      title: 'Collaborative Relay — ' + DIFFICULTY_TIERS[tier].label,
      description: 'A multi-stage puzzle requiring teamwork. Each player takes on a stage to unlock the final reward.',
      data: {
        stages: stages,
        stageCount: stageCount,
        currentStage: 0,
        teamSize: Math.min(COOP_MAX_PLAYERS, stageCount)
      },
      hints: hints.slice(0, DIFFICULTY_TIERS[tier].hints + 2),
      answer: null, // Composite — depends on stage completion
      validate: function(input) {
        // input: { stageIndex, answer }
        if (typeof input !== 'object' || input === null) return false;
        var stage = stages[input.stageIndex];
        if (!stage || stage.solved) return false;
        return stage.puzzle && stage.puzzle.validate(input.answer);
      },
      timeLimit: TIME_LIMITS[tier] * 2, // Double time for collaborative
      sparkReward: DIFFICULTY_TIERS[tier].sparkBase * stageCount,
      seed: seed
    };
  }

  // ============================================================================
  // MASTER PUZZLE GENERATOR
  // ============================================================================

  /**
   * Generate a puzzle by archetype, seed, and tier.
   * @param {string} archetype — one of PUZZLE_ARCHETYPES
   * @param {number|string} seed — deterministic seed
   * @param {number} tier — 1-5
   * @returns {object} puzzle object
   */
  function generatePuzzle(archetype, seed, tier) {
    tier = Math.max(1, Math.min(5, tier || 1));
    seed = seed || 1;

    if (archetype === 'sequence') return generateSequencePuzzle(seed, tier);
    if (archetype === 'logic_grid') return generateLogicGridPuzzle(seed, tier);
    if (archetype === 'riddle') return generateRiddlePuzzle(seed, tier);
    if (archetype === 'pattern') return generatePatternPuzzle(seed, tier);
    if (archetype === 'cipher') return generateCipherPuzzle(seed, tier);
    if (archetype === 'collaborative') return generateCollaborativePuzzle(seed, tier);

    // Default: sequence
    return generateSequencePuzzle(seed, tier);
  }

  // ============================================================================
  // DAILY PUZZLE ROTATION
  // ============================================================================

  /**
   * Get the day number from a date string or Date object.
   * @param {string|Date|number} date
   * @returns {number} integer day number
   */
  function getDayNumber(date) {
    var d;
    if (typeof date === 'number') return date;
    if (date instanceof Date) d = date;
    else d = new Date(date);
    return Math.floor(d.getTime() / 86400000);
  }

  /**
   * Get the daily featured puzzle for a given day.
   * @param {string|Date|number} date
   * @returns {object} puzzle object
   */
  function getDailyPuzzle(date) {
    var dayNum = getDayNumber(date);
    var rng = mulberry32(hashString('daily_' + dayNum));

    var archetype = PUZZLE_ARCHETYPES[Math.floor(rng() * PUZZLE_ARCHETYPES.length)];
    var tier = rngInt(rng, 1, 5);
    var seed = rngInt(rng, 100000, 999999);

    var puzzle = generatePuzzle(archetype, seed, tier);
    puzzle.isDaily = true;
    puzzle.dailyDate = dayNum;
    puzzle.dailyBonus = Math.round(puzzle.sparkReward * 0.5); // 50% bonus for daily

    return puzzle;
  }

  /**
   * Get the daily puzzle schedule for a week.
   * @param {string|Date|number} startDate
   * @returns {Array} 7 puzzles
   */
  function getWeeklySchedule(startDate) {
    var dayNum = getDayNumber(startDate);
    var schedule = [];
    for (var i = 0; i < 7; i++) {
      schedule.push(getDailyPuzzle(dayNum + i));
    }
    return schedule;
  }

  // ============================================================================
  // SESSION MANAGEMENT
  // ============================================================================

  /**
   * Start a puzzle session.
   * @param {string} playerId
   * @param {object} puzzle
   * @returns {object} session object
   */
  function startSession(playerId, puzzle) {
    if (!playerId || !puzzle) return null;
    var sessionId = 'sess_' + playerId + '_' + puzzle.id + '_' + Date.now();
    var session = {
      id: sessionId,
      playerId: playerId,
      puzzle: puzzle,
      startTime: Date.now(),
      hintsUsed: 0,
      hintCost: 0,
      solved: false,
      failed: false,
      solveTime: null,
      reward: null
    };
    _sessions[sessionId] = session;
    return session;
  }

  /**
   * Request a hint for a session.
   * @param {string} sessionId
   * @returns {object} { hint, hintIndex, cost, remaining }
   */
  function requestHint(sessionId) {
    var session = _sessions[sessionId];
    if (!session) return { error: 'session_not_found' };
    if (session.solved) return { error: 'already_solved' };
    if (session.failed) return { error: 'session_expired' };

    var puzzle = session.puzzle;
    var maxHints = puzzle.hints ? puzzle.hints.length : 0;
    if (session.hintsUsed >= maxHints) return { error: 'no_hints_remaining' };

    var hintIndex = session.hintsUsed;
    var hint = puzzle.hints[hintIndex];
    var cost = Math.round(puzzle.sparkReward * HINT_COST_FRACTION);

    session.hintsUsed++;
    session.hintCost += cost;

    return {
      hint: hint,
      hintIndex: hintIndex,
      cost: cost,
      remaining: maxHints - session.hintsUsed
    };
  }

  /**
   * Submit an answer for a session.
   * @param {string} sessionId
   * @param {*} answer
   * @returns {object} result with reward info
   */
  function submitAnswer(sessionId, answer) {
    var session = _sessions[sessionId];
    if (!session) return { error: 'session_not_found', correct: false };
    if (session.solved) return { error: 'already_solved', correct: false };
    if (session.failed) return { error: 'session_expired', correct: false };

    var puzzle = session.puzzle;
    var elapsed = (Date.now() - session.startTime) / 1000;

    // Check time limit
    if (elapsed > puzzle.timeLimit) {
      session.failed = true;
      return { error: 'time_expired', correct: false, timeUsed: elapsed };
    }

    var correct = puzzle.validate(answer);
    if (!correct) {
      return { correct: false, timeUsed: elapsed, message: 'Incorrect answer. Try again.' };
    }

    // Correct answer — calculate reward
    session.solved = true;
    session.solveTime = elapsed;

    var speedMultiplier = 1.0;
    var speedLabel = 'Complete';
    var fraction = elapsed / puzzle.timeLimit;

    for (var i = 0; i < SPEED_BONUS_THRESHOLDS.length; i++) {
      if (fraction <= SPEED_BONUS_THRESHOLDS[i].fraction) {
        speedMultiplier = SPEED_BONUS_THRESHOLDS[i].multiplier;
        speedLabel = SPEED_BONUS_THRESHOLDS[i].label;
        break;
      }
    }

    var baseSpark = puzzle.sparkReward;
    var timedSpark = Math.round(baseSpark * speedMultiplier);
    var hintDeduction = session.hintCost;
    var finalSpark = Math.max(1, timedSpark - hintDeduction);

    // Daily bonus
    if (puzzle.isDaily) {
      finalSpark += (puzzle.dailyBonus || 0);
    }

    session.reward = {
      spark: finalSpark,
      baseSpark: baseSpark,
      speedMultiplier: speedMultiplier,
      speedLabel: speedLabel,
      hintDeduction: hintDeduction,
      timeUsed: elapsed,
      dailyBonus: puzzle.isDaily ? (puzzle.dailyBonus || 0) : 0
    };

    // Update leaderboard
    var lbKey = puzzle.archetype + '_t' + puzzle.tier;
    updateLeaderboard(lbKey, {
      playerId: session.playerId,
      playerName: session.playerId,
      solveTime: elapsed,
      tier: puzzle.tier,
      timestamp: Date.now()
    });

    return {
      correct: true,
      reward: session.reward,
      solveTime: elapsed,
      message: 'Puzzle solved! You earned ' + finalSpark + ' Spark.'
    };
  }

  /**
   * Get a completed session's result.
   */
  function getSession(sessionId) {
    return _sessions[sessionId] || null;
  }

  /**
   * Check if a session has expired.
   */
  function isSessionExpired(sessionId) {
    var session = _sessions[sessionId];
    if (!session) return true;
    if (session.solved || session.failed) return session.failed;
    var elapsed = (Date.now() - session.startTime) / 1000;
    return elapsed > session.puzzle.timeLimit;
  }

  // ============================================================================
  // LEADERBOARD
  // ============================================================================

  function updateLeaderboard(key, entry) {
    if (!_leaderboards[key]) _leaderboards[key] = [];
    var lb = _leaderboards[key];
    lb.push(entry);
    lb.sort(function(a, b) { return a.solveTime - b.solveTime; });
    if (lb.length > LEADERBOARD_MAX_ENTRIES) lb.length = LEADERBOARD_MAX_ENTRIES;
  }

  /**
   * Get leaderboard for a puzzle type and tier.
   * @param {string} archetype
   * @param {number} tier
   * @returns {Array} sorted entries
   */
  function getLeaderboard(archetype, tier) {
    var key = archetype + '_t' + tier;
    return (_leaderboards[key] || []).slice();
  }

  /**
   * Get all leaderboards.
   */
  function getAllLeaderboards() {
    var result = {};
    for (var k in _leaderboards) {
      result[k] = _leaderboards[k].slice();
    }
    return result;
  }

  /**
   * Clear leaderboard (for testing or resets).
   */
  function clearLeaderboard(archetype, tier) {
    var key = archetype + '_t' + tier;
    _leaderboards[key] = [];
  }

  /**
   * Get player's best time on a puzzle type.
   */
  function getPlayerBest(archetype, tier, playerId) {
    var lb = getLeaderboard(archetype, tier);
    for (var i = 0; i < lb.length; i++) {
      if (lb[i].playerId === playerId) return lb[i];
    }
    return null;
  }

  // ============================================================================
  // CO-OP ROOM MANAGEMENT
  // ============================================================================

  /**
   * Create a co-op puzzle room.
   * @param {string} hostId — host player ID
   * @param {string} archetype — puzzle archetype (should be 'collaborative' ideally)
   * @param {number} tier — 1-5
   * @param {number|string} seed — optional seed
   * @returns {object} room
   */
  function createCoopRoom(hostId, archetype, tier, seed) {
    if (!hostId) return null;
    seed = seed || Math.floor(Math.random() * 1000000);
    var puzzle = generatePuzzle(archetype || 'collaborative', seed, tier || 1);
    var roomId = 'room_' + hostId + '_' + Date.now();

    var room = {
      id: roomId,
      hostId: hostId,
      puzzle: puzzle,
      players: [hostId],
      contributions: {}, // { playerId: [stageIndex, ...] }
      solved: false,
      startTime: null,
      endTime: null,
      chat: [],
      stageStatus: {},
      totalReward: 0
    };

    // Initialize contributions
    room.contributions[hostId] = [];

    _coopRooms[roomId] = room;
    return room;
  }

  /**
   * Join a co-op room.
   * @param {string} roomId
   * @param {string} playerId
   * @returns {object} { success, room, error }
   */
  function joinCoopRoom(roomId, playerId) {
    var room = _coopRooms[roomId];
    if (!room) return { success: false, error: 'room_not_found' };
    if (room.solved) return { success: false, error: 'room_solved' };
    if (room.players.indexOf(playerId) !== -1) return { success: false, error: 'already_in_room' };
    if (room.players.length >= COOP_MAX_PLAYERS) return { success: false, error: 'room_full' };

    room.players.push(playerId);
    room.contributions[playerId] = [];
    return { success: true, room: room };
  }

  /**
   * Leave a co-op room.
   */
  function leaveCoopRoom(roomId, playerId) {
    var room = _coopRooms[roomId];
    if (!room) return { success: false, error: 'room_not_found' };

    var idx = room.players.indexOf(playerId);
    if (idx === -1) return { success: false, error: 'not_in_room' };

    room.players.splice(idx, 1);
    delete room.contributions[playerId];
    return { success: true, playersRemaining: room.players.length };
  }

  /**
   * Start a co-op room (requires minimum players).
   */
  function startCoopRoom(roomId) {
    var room = _coopRooms[roomId];
    if (!room) return { success: false, error: 'room_not_found' };
    if (room.startTime) return { success: false, error: 'already_started' };
    if (room.players.length < COOP_MIN_PLAYERS) {
      return { success: false, error: 'not_enough_players', need: COOP_MIN_PLAYERS - room.players.length };
    }

    room.startTime = Date.now();
    return { success: true, room: room };
  }

  /**
   * Submit a stage answer in a co-op room.
   * @param {string} roomId
   * @param {string} playerId
   * @param {number} stageIndex
   * @param {*} answer
   * @returns {object} result
   */
  function submitCoopStage(roomId, playerId, stageIndex, answer) {
    var room = _coopRooms[roomId];
    if (!room) return { success: false, error: 'room_not_found' };
    if (!room.startTime) return { success: false, error: 'room_not_started' };
    if (room.solved) return { success: false, error: 'room_already_solved' };
    if (room.players.indexOf(playerId) === -1) return { success: false, error: 'not_in_room' };

    var puzzle = room.puzzle;
    if (puzzle.archetype !== 'collaborative') {
      // For non-collaborative puzzles in a co-op room, treat as single stage
      var correct = puzzle.validate(answer);
      if (correct) {
        room.solved = true;
        room.endTime = Date.now();
        var elapsed = (room.endTime - room.startTime) / 1000;
        room.contributions[playerId] = room.contributions[playerId] || [];
        room.contributions[playerId].push(stageIndex);
        room.totalReward = puzzle.sparkReward;
        return { success: true, solved: true, elapsed: elapsed, reward: room.totalReward };
      }
      return { success: false, correct: false, message: 'Incorrect answer.' };
    }

    var stages = puzzle.data.stages;
    if (!stages || stageIndex >= stages.length) return { success: false, error: 'invalid_stage' };

    var stage = stages[stageIndex];
    if (stage.solved) return { success: false, error: 'stage_already_solved' };

    // For sequential collaborative puzzles, enforce order
    if (stageIndex > 0 && !stages[stageIndex - 1].solved) {
      return { success: false, error: 'previous_stage_not_solved' };
    }

    var stageCorrect = stage.puzzle && stage.puzzle.validate(answer);
    if (!stageCorrect) return { success: false, correct: false, message: 'Incorrect stage answer.' };

    stage.solved = true;
    stage.solvedBy = playerId;
    stage.solvedAt = Date.now();

    room.contributions[playerId] = room.contributions[playerId] || [];
    room.contributions[playerId].push(stageIndex);
    room.stageStatus[stageIndex] = { solved: true, solvedBy: playerId };

    // Check if all stages complete
    var allSolved = stages.every(function(s) { return s.solved; });
    if (allSolved) {
      room.solved = true;
      room.endTime = Date.now();
      var totalElapsed = (room.endTime - room.startTime) / 1000;
      room.totalReward = puzzle.sparkReward;
      return {
        success: true, correct: true, stageComplete: true, allSolved: true,
        elapsed: totalElapsed, reward: room.totalReward,
        message: 'All stages complete! Puzzle solved!'
      };
    }

    var nextStage = stageIndex + 1;
    return {
      success: true, correct: true, stageComplete: true, allSolved: false,
      nextStage: nextStage < stages.length ? nextStage : null,
      message: 'Stage ' + stageIndex + ' complete!'
    };
  }

  /**
   * Add a chat message to a co-op room.
   */
  function addCoopChat(roomId, playerId, message) {
    var room = _coopRooms[roomId];
    if (!room) return { success: false, error: 'room_not_found' };
    if (room.players.indexOf(playerId) === -1) return { success: false, error: 'not_in_room' };

    var entry = { playerId: playerId, message: String(message).slice(0, 200), timestamp: Date.now() };
    room.chat.push(entry);
    return { success: true, entry: entry };
  }

  /**
   * Get co-op room state.
   */
  function getCoopRoom(roomId) {
    return _coopRooms[roomId] || null;
  }

  /**
   * List all active co-op rooms.
   */
  function listCoopRooms() {
    return Object.keys(_coopRooms).map(function(id) {
      var r = _coopRooms[id];
      return {
        id: r.id,
        hostId: r.hostId,
        playerCount: r.players.length,
        archetype: r.puzzle.archetype,
        tier: r.puzzle.tier,
        solved: r.solved,
        startTime: r.startTime
      };
    });
  }

  // ============================================================================
  // ACHIEVEMENT INTEGRATION
  // ============================================================================

  var PUZZLE_ACHIEVEMENTS = [
    {
      id: 'first_puzzle',
      name: 'First Insight',
      description: 'Solve your first puzzle in the Athenaeum',
      category: 'puzzles',
      trigger: { type: 'solved_count', count: 1 },
      reward: { spark: 20, badge: 'puzzle_initiate' }
    },
    {
      id: 'puzzle_apprentice',
      name: 'Puzzle Apprentice',
      description: 'Solve 10 puzzles',
      category: 'puzzles',
      trigger: { type: 'solved_count', count: 10 },
      reward: { spark: 50, badge: 'puzzle_apprentice' }
    },
    {
      id: 'puzzle_adept',
      name: 'Puzzle Adept',
      description: 'Solve 50 puzzles',
      category: 'puzzles',
      trigger: { type: 'solved_count', count: 50 },
      reward: { spark: 150, badge: 'puzzle_adept' }
    },
    {
      id: 'puzzle_master',
      name: 'Puzzle Master',
      description: 'Solve 100 puzzles',
      category: 'puzzles',
      trigger: { type: 'solved_count', count: 100 },
      reward: { spark: 500, badge: 'puzzle_master' }
    },
    {
      id: 'speed_solver',
      name: 'Lightning Mind',
      description: 'Solve a puzzle in Lightning speed (under 25% of time limit)',
      category: 'puzzles',
      trigger: { type: 'speed', speedLabel: 'Lightning' },
      reward: { spark: 75, badge: 'lightning_mind' }
    },
    {
      id: 'no_hints',
      name: 'Pure Intellect',
      description: 'Solve a Tier 5 puzzle without using any hints',
      category: 'puzzles',
      trigger: { type: 'no_hints_tier5' },
      reward: { spark: 200, badge: 'pure_intellect' }
    },
    {
      id: 'all_archetypes',
      name: 'Polymathic',
      description: 'Solve one puzzle of each of the 6 archetypes',
      category: 'puzzles',
      trigger: { type: 'all_archetypes' },
      reward: { spark: 300, badge: 'polymath' }
    },
    {
      id: 'daily_streak_7',
      name: 'Daily Devotion',
      description: 'Complete the daily puzzle 7 days in a row',
      category: 'puzzles',
      trigger: { type: 'daily_streak', count: 7 },
      reward: { spark: 250, badge: 'devoted_scholar' }
    },
    {
      id: 'coop_solver',
      name: 'Team Thinker',
      description: 'Complete a collaborative puzzle with a team',
      category: 'puzzles',
      trigger: { type: 'coop_solved' },
      reward: { spark: 100, badge: 'team_thinker' }
    },
    {
      id: 'master_tier5',
      name: 'Athenaeum Master',
      description: 'Solve a Tier 5 puzzle',
      category: 'puzzles',
      trigger: { type: 'tier5_solved' },
      reward: { spark: 150, badge: 'athenaeum_master' }
    },
    {
      id: 'cipher_specialist',
      name: 'Cryptologist',
      description: 'Solve 10 cipher puzzles',
      category: 'puzzles',
      trigger: { type: 'archetype_count', archetype: 'cipher', count: 10 },
      reward: { spark: 100, badge: 'cryptologist' }
    },
    {
      id: 'leaderboard_top',
      name: 'Hall of Fame',
      description: 'Reach the top 3 on any puzzle leaderboard',
      category: 'puzzles',
      trigger: { type: 'leaderboard_top3' },
      reward: { spark: 200, badge: 'hall_of_fame' }
    }
  ];

  /**
   * Check which achievements are triggered by a solve result.
   * @param {string} playerId
   * @param {object} solveResult — from submitAnswer
   * @param {object} puzzle
   * @param {object} playerStats — { solved_count, archetype_counts, speed_labels, daily_streak }
   * @returns {Array} newly unlocked achievements
   */
  function checkAchievements(playerId, solveResult, puzzle, playerStats) {
    if (!solveResult || !solveResult.correct) return [];
    var unlocked = [];
    var stats = playerStats || {};
    var solvedCount = stats.solved_count || 0;
    var archetypeCounts = stats.archetype_counts || {};
    var archetypeCount = archetypeCounts[puzzle.archetype] || 0;
    var dailyStreak = stats.daily_streak || 0;

    for (var i = 0; i < PUZZLE_ACHIEVEMENTS.length; i++) {
      var ach = PUZZLE_ACHIEVEMENTS[i];
      var trigger = ach.trigger;
      var triggered = false;

      if (trigger.type === 'solved_count' && solvedCount >= trigger.count) triggered = true;
      else if (trigger.type === 'speed' && solveResult.reward && solveResult.reward.speedLabel === trigger.speedLabel) triggered = true;
      else if (trigger.type === 'no_hints_tier5' && puzzle.tier === 5 && solveResult.reward && solveResult.reward.hintDeduction === 0) triggered = true;
      else if (trigger.type === 'all_archetypes') {
        var allCovered = PUZZLE_ARCHETYPES.every(function(a) { return (archetypeCounts[a] || 0) >= 1; });
        if (allCovered) triggered = true;
      }
      else if (trigger.type === 'daily_streak' && dailyStreak >= trigger.count) triggered = true;
      else if (trigger.type === 'coop_solved' && puzzle.archetype === 'collaborative') triggered = true;
      else if (trigger.type === 'tier5_solved' && puzzle.tier === 5) triggered = true;
      else if (trigger.type === 'archetype_count' && puzzle.archetype === trigger.archetype && archetypeCount >= trigger.count) triggered = true;
      else if (trigger.type === 'leaderboard_top3') {
        var lb = getLeaderboard(puzzle.archetype, puzzle.tier);
        for (var j = 0; j < Math.min(3, lb.length); j++) {
          if (lb[j].playerId === playerId) { triggered = true; break; }
        }
      }

      if (triggered) unlocked.push(ach);
    }

    return unlocked;
  }

  // ============================================================================
  // PLAYER STATS
  // ============================================================================

  var _playerStats = {};

  /**
   * Initialize or get player puzzle stats.
   */
  function getPlayerStats(playerId) {
    if (!_playerStats[playerId]) {
      _playerStats[playerId] = {
        solved_count: 0,
        attempted_count: 0,
        archetype_counts: {},
        tier_counts: {},
        speed_labels: {},
        daily_streak: 0,
        last_daily_day: null,
        hints_used_total: 0,
        total_spark_earned: 0,
        unlocked_achievements: []
      };
    }
    return _playerStats[playerId];
  }

  /**
   * Record a puzzle solve in player stats.
   * @param {string} playerId
   * @param {object} solveResult — from submitAnswer
   * @param {object} puzzle
   * @param {number} dayNumber — optional, for daily tracking
   * @returns {object} { stats, newAchievements }
   */
  function recordSolve(playerId, solveResult, puzzle, dayNumber) {
    var stats = getPlayerStats(playerId);
    stats.attempted_count++;

    if (!solveResult || !solveResult.correct) return { stats: stats, newAchievements: [] };

    stats.solved_count++;
    stats.archetype_counts[puzzle.archetype] = (stats.archetype_counts[puzzle.archetype] || 0) + 1;
    stats.tier_counts[puzzle.tier] = (stats.tier_counts[puzzle.tier] || 0) + 1;

    if (solveResult.reward) {
      var label = solveResult.reward.speedLabel;
      stats.speed_labels[label] = (stats.speed_labels[label] || 0) + 1;
      stats.hints_used_total += (solveResult.reward.hintDeduction || 0) > 0 ? 1 : 0;
      stats.total_spark_earned += solveResult.reward.spark || 0;
    }

    // Daily streak tracking
    if (puzzle.isDaily && dayNumber !== undefined) {
      if (stats.last_daily_day === dayNumber - 1) {
        stats.daily_streak++;
      } else if (stats.last_daily_day !== dayNumber) {
        stats.daily_streak = 1;
      }
      stats.last_daily_day = dayNumber;
    }

    var newAchievements = checkAchievements(playerId, solveResult, puzzle, stats);
    // Filter already unlocked
    newAchievements = newAchievements.filter(function(ach) {
      return stats.unlocked_achievements.indexOf(ach.id) === -1;
    });
    newAchievements.forEach(function(ach) {
      stats.unlocked_achievements.push(ach.id);
    });

    return { stats: stats, newAchievements: newAchievements };
  }

  // ============================================================================
  // SPEED BONUS CALCULATOR
  // ============================================================================

  /**
   * Calculate speed bonus for a solve time.
   * @param {number} solveTime — seconds
   * @param {number} timeLimit — seconds
   * @returns {object} { multiplier, label }
   */
  function calculateSpeedBonus(solveTime, timeLimit) {
    var fraction = solveTime / timeLimit;
    for (var i = 0; i < SPEED_BONUS_THRESHOLDS.length; i++) {
      if (fraction <= SPEED_BONUS_THRESHOLDS[i].fraction) {
        return { multiplier: SPEED_BONUS_THRESHOLDS[i].multiplier, label: SPEED_BONUS_THRESHOLDS[i].label };
      }
    }
    return { multiplier: 1.0, label: 'Complete' };
  }

  // ============================================================================
  // PUZZLE CATALOG — all generated reference puzzles per archetype per tier
  // ============================================================================

  /**
   * Get a catalog of reference puzzles (one per archetype per tier).
   * @returns {Array} array of puzzle descriptors
   */
  function getPuzzleCatalog() {
    var catalog = [];
    for (var t = 1; t <= 5; t++) {
      for (var a = 0; a < PUZZLE_ARCHETYPES.length; a++) {
        var archetype = PUZZLE_ARCHETYPES[a];
        var seed = hashString(archetype + '_catalog_t' + t);
        var puzzle = generatePuzzle(archetype, seed, t);
        catalog.push({
          id: puzzle.id,
          archetype: archetype,
          tier: t,
          title: puzzle.title,
          sparkReward: puzzle.sparkReward,
          timeLimit: puzzle.timeLimit
        });
      }
    }
    return catalog;
  }

  // ============================================================================
  // RESET HELPERS (for testing)
  // ============================================================================

  function resetAll() {
    _leaderboards = {};
    _coopRooms = {};
    _sessions = {};
    _playerStats = {};
  }

  // ============================================================================
  // EXPORTS
  // ============================================================================

  exports.PUZZLE_ARCHETYPES = PUZZLE_ARCHETYPES;
  exports.DIFFICULTY_TIERS = DIFFICULTY_TIERS;
  exports.TIME_LIMITS = TIME_LIMITS;
  exports.SPEED_BONUS_THRESHOLDS = SPEED_BONUS_THRESHOLDS;
  exports.RIDDLE_BANK = RIDDLE_BANK;
  exports.CIPHER_WORDS = CIPHER_WORDS;
  exports.PATTERN_COLORS = PATTERN_COLORS;
  exports.PATTERN_SHAPES = PATTERN_SHAPES;
  exports.LOGIC_GRID_CATEGORIES = LOGIC_GRID_CATEGORIES;
  exports.SEQUENCE_GENERATORS = SEQUENCE_GENERATORS;
  exports.PUZZLE_ACHIEVEMENTS = PUZZLE_ACHIEVEMENTS;
  exports.COOP_MAX_PLAYERS = COOP_MAX_PLAYERS;
  exports.COOP_MIN_PLAYERS = COOP_MIN_PLAYERS;
  exports.LEADERBOARD_MAX_ENTRIES = LEADERBOARD_MAX_ENTRIES;
  exports.HINT_COST_FRACTION = HINT_COST_FRACTION;

  // Core generation
  exports.generatePuzzle = generatePuzzle;
  exports.generateSequencePuzzle = generateSequencePuzzle;
  exports.generateLogicGridPuzzle = generateLogicGridPuzzle;
  exports.generateRiddlePuzzle = generateRiddlePuzzle;
  exports.generatePatternPuzzle = generatePatternPuzzle;
  exports.generateCipherPuzzle = generateCipherPuzzle;
  exports.generateCollaborativePuzzle = generateCollaborativePuzzle;

  // Daily rotation
  exports.getDailyPuzzle = getDailyPuzzle;
  exports.getDayNumber = getDayNumber;
  exports.getWeeklySchedule = getWeeklySchedule;

  // Sessions
  exports.startSession = startSession;
  exports.requestHint = requestHint;
  exports.submitAnswer = submitAnswer;
  exports.getSession = getSession;
  exports.isSessionExpired = isSessionExpired;

  // Leaderboards
  exports.updateLeaderboard = updateLeaderboard;
  exports.getLeaderboard = getLeaderboard;
  exports.getAllLeaderboards = getAllLeaderboards;
  exports.clearLeaderboard = clearLeaderboard;
  exports.getPlayerBest = getPlayerBest;

  // Co-op
  exports.createCoopRoom = createCoopRoom;
  exports.joinCoopRoom = joinCoopRoom;
  exports.leaveCoopRoom = leaveCoopRoom;
  exports.startCoopRoom = startCoopRoom;
  exports.submitCoopStage = submitCoopStage;
  exports.addCoopChat = addCoopChat;
  exports.getCoopRoom = getCoopRoom;
  exports.listCoopRooms = listCoopRooms;

  // Achievements & stats
  exports.checkAchievements = checkAchievements;
  exports.getPlayerStats = getPlayerStats;
  exports.recordSolve = recordSolve;

  // Helpers
  exports.calculateSpeedBonus = calculateSpeedBonus;
  exports.getPuzzleCatalog = getPuzzleCatalog;
  exports.mulberry32 = mulberry32;
  exports.hashString = hashString;
  exports.resetAll = resetAll;

})(typeof module !== 'undefined' ? module.exports : (window.PuzzleChamber = {}));
