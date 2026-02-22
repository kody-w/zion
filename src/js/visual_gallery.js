// visual_gallery.js
/**
 * ZION Visual Gallery — In-World Art Gallery for The Studio
 * Players create pixel paintings, text-art, and pattern artworks,
 * display on gallery walls, earn Spark per viewer, curate exhibitions,
 * rate artworks, and trade art as inventory items.
 *
 * Zone: The Studio (-200, -100)
 * Dependencies: Creation, Economy, Inventory, Cosmetics
 */

(function(exports) {
  'use strict';

  // ---------------------------------------------------------------------------
  // Dependency guards
  // ---------------------------------------------------------------------------

  var Creation  = (typeof window !== 'undefined' && window.Creation)  || {};
  var Economy   = (typeof window !== 'undefined' && window.Economy)   || {};
  var Inventory = (typeof window !== 'undefined' && window.Inventory) || {};
  var Cosmetics = (typeof window !== 'undefined' && window.Cosmetics) || {};

  // ---------------------------------------------------------------------------
  // Seeded PRNG — mulberry32
  // ---------------------------------------------------------------------------

  function mulberry32(seed) {
    return function() {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
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

  function seedFrom(base, suffix) {
    return hashString(String(base) + '|' + String(suffix));
  }

  function rngInt(rng, min, max) {
    return min + Math.floor(rng() * (max - min + 1));
  }

  function rngPick(rng, arr) {
    return arr[Math.floor(rng() * arr.length)];
  }

  // ---------------------------------------------------------------------------
  // Internal counters
  // ---------------------------------------------------------------------------

  var artworkCounter   = 0;
  var exhibitionCounter = 0;
  var viewCounter      = 0;
  var ratingCounter    = 0;

  // ---------------------------------------------------------------------------
  // Constants
  // ---------------------------------------------------------------------------

  // Artwork mediums
  var MEDIUMS = ['pixel', 'text', 'pattern'];

  // Max dimensions per medium
  var MEDIUM_MAX_DIMS = {
    pixel:   { width: 64,  height: 64  },
    text:    { width: 256, height: 64  },
    pattern: { width: 32,  height: 32  }
  };

  // Viewer Spark rewards (1–5 per view)
  var VIEWER_SPARK_MIN = 1;
  var VIEWER_SPARK_MAX = 5;

  // Gallery rooms with capacity limits
  var GALLERY_ROOMS = {
    main_hall: {
      id: 'main_hall',
      name: 'Main Hall',
      capacity: 20,
      description: 'The central gallery space with the highest foot traffic',
      zone: 'studio',
      featured: true
    },
    east_wing: {
      id: 'east_wing',
      name: 'East Wing',
      capacity: 12,
      description: 'Dedicated to pixel art and digital media',
      zone: 'studio',
      featured: false
    },
    west_wing: {
      id: 'west_wing',
      name: 'West Wing',
      capacity: 12,
      description: 'Home to text art and poetry installations',
      zone: 'studio',
      featured: false
    },
    atrium: {
      id: 'atrium',
      name: 'Atrium',
      capacity: 8,
      description: 'Intimate space for curated exhibitions',
      zone: 'studio',
      featured: false
    },
    vault: {
      id: 'vault',
      name: 'The Vault',
      capacity: 6,
      description: 'Reserved for legendary and rare artworks',
      zone: 'studio',
      featured: false
    }
  };

  // Named gallery wall slots per room
  var ROOM_WALL_SLOTS = {
    main_hall:  ['north_1','north_2','north_3','north_4','south_1','south_2','south_3','south_4','east_1','east_2','west_1','west_2','center_pedestal','skylight_1','skylight_2','skylight_3','skylight_4','entrance_left','entrance_right','feature_wall'],
    east_wing:  ['pixel_row_1','pixel_row_2','pixel_row_3','pixel_row_4','corner_nook_1','corner_nook_2','side_a_1','side_a_2','side_b_1','side_b_2','back_wall_1','back_wall_2'],
    west_wing:  ['text_wall_1','text_wall_2','text_wall_3','text_wall_4','reading_alcove','poetry_pedestal_1','poetry_pedestal_2','script_wall_1','script_wall_2','ambient_1','ambient_2','ambient_3'],
    atrium:     ['center_a','center_b','left_curve','right_curve','alcove_1','alcove_2','alcove_3','alcove_4'],
    vault:      ['vault_main','vault_secondary','secure_1','secure_2','archive_1','archive_2']
  };

  // Rating system
  var MIN_RATING = 1;
  var MAX_RATING = 5;

  // Exhibition max artworks
  var MAX_EXHIBITION_ARTWORKS = 12;

  // Featured art rotation count
  var FEATURED_ART_COUNT = 5;

  // Art trading constants
  var ART_BASE_PRICE_BY_RARITY = {
    common:    10,
    uncommon:  25,
    rare:      75,
    epic:      200,
    legendary: 500
  };

  // Artist rank thresholds (by total views)
  var ARTIST_RANKS = [
    { rank: 'apprentice',   minViews: 0    },
    { rank: 'journeyman',   minViews: 50   },
    { rank: 'craftsman',    minViews: 200  },
    { rank: 'artisan',      minViews: 500  },
    { rank: 'master',       minViews: 1000 },
    { rank: 'grandmaster',  minViews: 2500 },
    { rank: 'legend',       minViews: 5000 }
  ];

  // Rarity thresholds for artworks based on rating
  var RARITY_BY_AVG_RATING = [
    { rarity: 'common',    minRating: 0   },
    { rarity: 'uncommon',  minRating: 2.5 },
    { rarity: 'rare',      minRating: 3.5 },
    { rarity: 'epic',      minRating: 4.2 },
    { rarity: 'legendary', minRating: 4.8 }
  ];

  // Spark cost for listing art in vault (prestige room)
  var VAULT_LISTING_COST = 50;

  // Max artworks per artist active in gallery at once
  var MAX_ARTIST_GALLERY_SLOTS = 10;

  // View cooldown per viewer per artwork (ms) — prevents farming
  var VIEW_COOLDOWN_MS = 300000; // 5 minutes

  // ---------------------------------------------------------------------------
  // State initialisation
  // ---------------------------------------------------------------------------

  /**
   * Initialise the visual gallery sub-state on a world state object.
   * @param {Object} state - The world state object
   */
  function initGallery(state) {
    if (!state.gallery) {
      state.gallery = {
        artworks:     {},   // artworkId -> artwork object
        wallSlots:    {},   // roomId -> { slotName -> artworkId | null }
        exhibitions:  {},   // exhibitionId -> exhibition object
        ratings:      {},   // artworkId -> { ratings: [], avgRating, ratingCount }
        viewLog:      {},   // artworkId -> [ { viewerId, ts } ]
        artistProfiles: {}, // playerId -> artistProfile
        featured:     [],   // [ artworkId ] — top-rated rotating works
        tradeListing: {}    // artworkId -> { price, sellerId, listedAt }
      };
      // Initialise wall slots for all rooms
      for (var roomId in GALLERY_ROOMS) {
        state.gallery.wallSlots[roomId] = {};
        var slots = ROOM_WALL_SLOTS[roomId] || [];
        for (var si = 0; si < slots.length; si++) {
          state.gallery.wallSlots[roomId][slots[si]] = null;
        }
      }
    }
    return state;
  }

  // ---------------------------------------------------------------------------
  // Artist profile helpers
  // ---------------------------------------------------------------------------

  function ensureArtistProfile(state, playerId) {
    if (!state.gallery.artistProfiles[playerId]) {
      state.gallery.artistProfiles[playerId] = {
        playerId:      playerId,
        artworks:      [],   // artwork IDs
        exhibitions:   [],   // exhibition IDs
        totalViews:    0,
        totalEarnings: 0,
        rank:          'apprentice',
        joinedAt:      Date.now()
      };
    }
    return state.gallery.artistProfiles[playerId];
  }

  function updateArtistRank(profile) {
    var rank = 'apprentice';
    for (var i = 0; i < ARTIST_RANKS.length; i++) {
      if (profile.totalViews >= ARTIST_RANKS[i].minViews) {
        rank = ARTIST_RANKS[i].rank;
      }
    }
    profile.rank = rank;
  }

  function getArtistProfile(state, playerId) {
    return state.gallery.artistProfiles[playerId] || null;
  }

  // ---------------------------------------------------------------------------
  // Artwork creation
  // ---------------------------------------------------------------------------

  /**
   * Create a new artwork.
   * @param {Object} state
   * @param {string} artistId
   * @param {Object} opts - { title, medium, width, height, data, description }
   * @returns {{ success: boolean, artworkId?: string, error?: string }}
   */
  function createArtwork(state, artistId, opts) {
    initGallery(state);

    if (!artistId || typeof artistId !== 'string') {
      return { success: false, error: 'Invalid artist ID' };
    }
    if (!opts || !opts.title || typeof opts.title !== 'string') {
      return { success: false, error: 'Artwork title required' };
    }
    if (opts.title.length > 80) {
      return { success: false, error: 'Title too long (max 80 chars)' };
    }
    var medium = opts.medium;
    if (!medium || MEDIUMS.indexOf(medium) === -1) {
      return { success: false, error: 'Invalid medium. Must be: ' + MEDIUMS.join(', ') };
    }

    var maxDims = MEDIUM_MAX_DIMS[medium];
    var width  = (opts.width  !== undefined && opts.width  !== null) ? opts.width  : maxDims.width;
    var height = (opts.height !== undefined && opts.height !== null) ? opts.height : maxDims.height;

    if (typeof width !== 'number'  || width  < 1 || width  > maxDims.width)  { return { success: false, error: 'Width out of range for medium ' + medium }; }
    if (typeof height !== 'number' || height < 1 || height > maxDims.height) { return { success: false, error: 'Height out of range for medium ' + medium }; }

    // data is optional — store as-is (string or array)
    var data = opts.data !== undefined ? opts.data : null;

    var profile = ensureArtistProfile(state, artistId);
    if (profile.artworks.length >= 100) {
      return { success: false, error: 'Artist artwork limit reached (100)' };
    }

    var artworkId = 'art_' + (++artworkCounter) + '_' + Date.now().toString(36);
    var now = Date.now();

    var artwork = {
      id:          artworkId,
      title:       opts.title,
      medium:      medium,
      width:       width,
      height:      height,
      data:        data,
      description: opts.description || '',
      artistId:    artistId,
      createdAt:   now,
      views:       0,
      rarity:      'common',
      tradeable:   true,
      price:       ART_BASE_PRICE_BY_RARITY['common']
    };

    state.gallery.artworks[artworkId] = artwork;
    state.gallery.ratings[artworkId]  = { ratings: [], avgRating: 0, ratingCount: 0 };
    state.gallery.viewLog[artworkId]  = [];

    profile.artworks.push(artworkId);

    return { success: true, artworkId: artworkId, artwork: artwork };
  }

  /**
   * Get artwork by ID.
   */
  function getArtwork(state, artworkId) {
    if (!state.gallery) return null;
    return state.gallery.artworks[artworkId] || null;
  }

  /**
   * Get all artworks for an artist.
   */
  function getArtistArtworks(state, artistId) {
    if (!state.gallery) return [];
    var profile = state.gallery.artistProfiles[artistId];
    if (!profile) return [];
    return profile.artworks.map(function(id) { return state.gallery.artworks[id]; }).filter(Boolean);
  }

  // ---------------------------------------------------------------------------
  // Gallery wall display
  // ---------------------------------------------------------------------------

  /**
   * Display an artwork on a named gallery wall slot.
   * @param {Object} state
   * @param {string} artistId  - Must be the artwork owner or curator
   * @param {string} artworkId
   * @param {string} roomId
   * @param {string} slotName
   * @returns {{ success: boolean, error?: string }}
   */
  function displayArtwork(state, artistId, artworkId, roomId, slotName) {
    initGallery(state);

    var artwork = state.gallery.artworks[artworkId];
    if (!artwork) { return { success: false, error: 'Artwork not found' }; }
    if (artwork.artistId !== artistId) { return { success: false, error: 'Only the artist can display their artwork' }; }

    var room = GALLERY_ROOMS[roomId];
    if (!room) { return { success: false, error: 'Gallery room not found: ' + roomId }; }

    var roomSlots = ROOM_WALL_SLOTS[roomId] || [];
    if (roomSlots.indexOf(slotName) === -1) { return { success: false, error: 'Invalid slot "' + slotName + '" for room ' + roomId }; }

    // Count how many slots this artist already occupies in total
    var artistSlotCount = 0;
    for (var rid in state.gallery.wallSlots) {
      var slots = state.gallery.wallSlots[rid];
      for (var s in slots) {
        if (slots[s]) {
          var slotArtwork = state.gallery.artworks[slots[s]];
          if (slotArtwork && slotArtwork.artistId === artistId) {
            artistSlotCount++;
          }
        }
      }
    }
    if (artistSlotCount >= MAX_ARTIST_GALLERY_SLOTS) {
      return { success: false, error: 'Artist gallery slot limit reached (' + MAX_ARTIST_GALLERY_SLOTS + ')' };
    }

    // Vault costs Spark
    if (roomId === 'vault') {
      // Check rarity requirement for vault
      if (artwork.rarity === 'common' || artwork.rarity === 'uncommon') {
        return { success: false, error: 'Only rare or better artworks may be displayed in The Vault' };
      }
    }

    // Check if slot already occupied
    var occupant = state.gallery.wallSlots[roomId][slotName];
    if (occupant && occupant !== artworkId) {
      return { success: false, error: 'Slot already occupied by another artwork' };
    }

    state.gallery.wallSlots[roomId][slotName] = artworkId;
    artwork.displayedIn = roomId;
    artwork.displayedSlot = slotName;

    return { success: true, roomId: roomId, slotName: slotName };
  }

  /**
   * Remove artwork from gallery wall.
   */
  function removeArtworkFromWall(state, artistId, artworkId) {
    initGallery(state);
    var artwork = state.gallery.artworks[artworkId];
    if (!artwork) { return { success: false, error: 'Artwork not found' }; }
    if (artwork.artistId !== artistId) { return { success: false, error: 'Only the artist can remove their artwork' }; }

    var found = false;
    for (var roomId in state.gallery.wallSlots) {
      var slots = state.gallery.wallSlots[roomId];
      for (var slotName in slots) {
        if (slots[slotName] === artworkId) {
          slots[slotName] = null;
          found = true;
        }
      }
    }
    if (!found) { return { success: false, error: 'Artwork is not displayed on any wall' }; }
    artwork.displayedIn   = null;
    artwork.displayedSlot = null;
    return { success: true };
  }

  /**
   * Get all artworks currently displayed in a room.
   */
  function getRoomDisplay(state, roomId) {
    if (!state.gallery) return {};
    if (!GALLERY_ROOMS[roomId]) return {};
    var slots = state.gallery.wallSlots[roomId] || {};
    var result = {};
    for (var slotName in slots) {
      var id = slots[slotName];
      result[slotName] = id ? (state.gallery.artworks[id] || null) : null;
    }
    return result;
  }

  // ---------------------------------------------------------------------------
  // Viewer Spark — earn Spark when other players view art
  // ---------------------------------------------------------------------------

  /**
   * Record a view of an artwork. Awards Spark to the artist.
   * @param {Object} state
   * @param {string} viewerId   - The player viewing the art
   * @param {string} artworkId
   * @param {number} [now]      - Override timestamp (for testing)
   * @returns {{ success: boolean, sparkAwarded?: number, error?: string }}
   */
  function recordView(state, viewerId, artworkId, now) {
    initGallery(state);
    var ts = now !== undefined ? now : Date.now();

    var artwork = state.gallery.artworks[artworkId];
    if (!artwork) { return { success: false, error: 'Artwork not found' }; }

    // Don't award Spark for viewing your own art
    var selfView = (viewerId === artwork.artistId);

    // Check view cooldown to prevent farming
    var viewLog = state.gallery.viewLog[artworkId];
    if (!viewLog) {
      state.gallery.viewLog[artworkId] = [];
      viewLog = state.gallery.viewLog[artworkId];
    }

    if (!selfView) {
      for (var i = 0; i < viewLog.length; i++) {
        if (viewLog[i].viewerId === viewerId && (ts - viewLog[i].ts) < VIEW_COOLDOWN_MS) {
          return { success: false, error: 'View cooldown active for this artwork' };
        }
      }
    }

    // Record the view
    viewLog.push({ viewerId: viewerId, ts: ts });
    artwork.views = (artwork.views || 0) + 1;

    var sparkAwarded = 0;
    if (!selfView) {
      // Deterministic spark amount based on viewer + artwork + view count
      var rng = mulberry32(seedFrom(artworkId + viewerId, artwork.views));
      sparkAwarded = rngInt(rng, VIEWER_SPARK_MIN, VIEWER_SPARK_MAX);

      // Update artist profile earnings
      var profile = ensureArtistProfile(state, artwork.artistId);
      profile.totalViews++;
      profile.totalEarnings += sparkAwarded;
      updateArtistRank(profile);

      // Call Economy.earn if available
      if (typeof Economy.earn === 'function' && state.ledger) {
        Economy.earn(state.ledger, artwork.artistId, 'artwork_view', sparkAwarded);
      }
    }

    // Refresh featured list after each view
    _refreshFeatured(state);

    return { success: true, sparkAwarded: sparkAwarded, totalViews: artwork.views, selfView: selfView };
  }

  // ---------------------------------------------------------------------------
  // Art Rating
  // ---------------------------------------------------------------------------

  /**
   * Rate an artwork (1–5 stars).
   * @param {Object} state
   * @param {string} raterId
   * @param {string} artworkId
   * @param {number} stars    — integer 1–5
   * @returns {{ success: boolean, newAvg?: number, error?: string }}
   */
  function rateArtwork(state, raterId, artworkId, stars) {
    initGallery(state);

    var artwork = state.gallery.artworks[artworkId];
    if (!artwork) { return { success: false, error: 'Artwork not found' }; }
    if (raterId === artwork.artistId) { return { success: false, error: 'Artists cannot rate their own work' }; }

    if (typeof stars !== 'number' || stars < MIN_RATING || stars > MAX_RATING || Math.floor(stars) !== stars) {
      return { success: false, error: 'Rating must be an integer 1–5' };
    }

    var ratingRecord = state.gallery.ratings[artworkId];
    if (!ratingRecord) {
      state.gallery.ratings[artworkId] = { ratings: [], avgRating: 0, ratingCount: 0 };
      ratingRecord = state.gallery.ratings[artworkId];
    }

    // Remove existing rating from this rater (update rather than duplicate)
    var prevIndex = -1;
    for (var i = 0; i < ratingRecord.ratings.length; i++) {
      if (ratingRecord.ratings[i].raterId === raterId) {
        prevIndex = i;
        break;
      }
    }
    if (prevIndex !== -1) {
      ratingRecord.ratings.splice(prevIndex, 1);
    }

    var ratingId = 'rating_' + (++ratingCounter);
    ratingRecord.ratings.push({ ratingId: ratingId, raterId: raterId, stars: stars, ts: Date.now() });

    // Recalculate average
    var total = 0;
    for (var j = 0; j < ratingRecord.ratings.length; j++) {
      total += ratingRecord.ratings[j].stars;
    }
    ratingRecord.avgRating   = total / ratingRecord.ratings.length;
    ratingRecord.ratingCount = ratingRecord.ratings.length;

    // Update artwork rarity based on new average
    _updateArtworkRarity(artwork, ratingRecord.avgRating);

    // Refresh featured
    _refreshFeatured(state);

    return { success: true, newAvg: ratingRecord.avgRating, ratingCount: ratingRecord.ratingCount };
  }

  function getRating(state, artworkId) {
    if (!state.gallery) return null;
    return state.gallery.ratings[artworkId] || null;
  }

  function _updateArtworkRarity(artwork, avgRating) {
    var rarity = 'common';
    for (var i = 0; i < RARITY_BY_AVG_RATING.length; i++) {
      if (avgRating >= RARITY_BY_AVG_RATING[i].minRating) {
        rarity = RARITY_BY_AVG_RATING[i].rarity;
      }
    }
    artwork.rarity = rarity;
    artwork.price  = ART_BASE_PRICE_BY_RARITY[rarity];
  }

  // ---------------------------------------------------------------------------
  // Exhibitions
  // ---------------------------------------------------------------------------

  /**
   * Create an exhibition (themed collection of artworks).
   * @param {Object} state
   * @param {string} curatorId
   * @param {Object} opts - { title, theme, description, artworkIds }
   * @returns {{ success: boolean, exhibitionId?: string, error?: string }}
   */
  function createExhibition(state, curatorId, opts) {
    initGallery(state);

    if (!curatorId) { return { success: false, error: 'Curator ID required' }; }
    if (!opts || !opts.title) { return { success: false, error: 'Exhibition title required' }; }
    if (opts.title.length > 100) { return { success: false, error: 'Title too long (max 100 chars)' }; }
    if (!opts.theme || typeof opts.theme !== 'string') { return { success: false, error: 'Exhibition theme required' }; }

    var artworkIds = opts.artworkIds || [];
    if (!Array.isArray(artworkIds)) { return { success: false, error: 'artworkIds must be an array' }; }
    if (artworkIds.length > MAX_EXHIBITION_ARTWORKS) {
      return { success: false, error: 'Exhibition limit is ' + MAX_EXHIBITION_ARTWORKS + ' artworks' };
    }

    // Validate all artworks exist
    for (var i = 0; i < artworkIds.length; i++) {
      if (!state.gallery.artworks[artworkIds[i]]) {
        return { success: false, error: 'Artwork not found: ' + artworkIds[i] };
      }
    }

    var exhibitionId = 'exh_' + (++exhibitionCounter) + '_' + Date.now().toString(36);
    var now = Date.now();

    var exhibition = {
      id:          exhibitionId,
      title:       opts.title,
      theme:       opts.theme,
      description: opts.description || '',
      curatorId:   curatorId,
      artworkIds:  artworkIds.slice(),
      createdAt:   now,
      active:      true,
      views:       0
    };

    state.gallery.exhibitions[exhibitionId] = exhibition;

    var profile = ensureArtistProfile(state, curatorId);
    profile.exhibitions.push(exhibitionId);

    return { success: true, exhibitionId: exhibitionId, exhibition: exhibition };
  }

  /**
   * Add an artwork to an exhibition.
   */
  function addArtworkToExhibition(state, curatorId, exhibitionId, artworkId) {
    initGallery(state);
    var exh = state.gallery.exhibitions[exhibitionId];
    if (!exh) { return { success: false, error: 'Exhibition not found' }; }
    if (exh.curatorId !== curatorId) { return { success: false, error: 'Only the curator can modify this exhibition' }; }
    if (!state.gallery.artworks[artworkId]) { return { success: false, error: 'Artwork not found' }; }
    if (exh.artworkIds.indexOf(artworkId) !== -1) { return { success: false, error: 'Artwork already in exhibition' }; }
    if (exh.artworkIds.length >= MAX_EXHIBITION_ARTWORKS) {
      return { success: false, error: 'Exhibition is full (' + MAX_EXHIBITION_ARTWORKS + ' max)' };
    }
    exh.artworkIds.push(artworkId);
    return { success: true, artworkCount: exh.artworkIds.length };
  }

  /**
   * Remove an artwork from an exhibition.
   */
  function removeArtworkFromExhibition(state, curatorId, exhibitionId, artworkId) {
    initGallery(state);
    var exh = state.gallery.exhibitions[exhibitionId];
    if (!exh) { return { success: false, error: 'Exhibition not found' }; }
    if (exh.curatorId !== curatorId) { return { success: false, error: 'Only the curator can modify this exhibition' }; }
    var idx = exh.artworkIds.indexOf(artworkId);
    if (idx === -1) { return { success: false, error: 'Artwork not in this exhibition' }; }
    exh.artworkIds.splice(idx, 1);
    return { success: true, artworkCount: exh.artworkIds.length };
  }

  /**
   * Get an exhibition by ID.
   */
  function getExhibition(state, exhibitionId) {
    if (!state.gallery) return null;
    return state.gallery.exhibitions[exhibitionId] || null;
  }

  /**
   * Close (deactivate) an exhibition.
   */
  function closeExhibition(state, curatorId, exhibitionId) {
    initGallery(state);
    var exh = state.gallery.exhibitions[exhibitionId];
    if (!exh) { return { success: false, error: 'Exhibition not found' }; }
    if (exh.curatorId !== curatorId) { return { success: false, error: 'Only the curator can close this exhibition' }; }
    exh.active = false;
    return { success: true };
  }

  /**
   * Record a view of an exhibition (increments view counter on each artwork).
   */
  function viewExhibition(state, viewerId, exhibitionId, now) {
    initGallery(state);
    var ts = now !== undefined ? now : Date.now();
    var exh = state.gallery.exhibitions[exhibitionId];
    if (!exh) { return { success: false, error: 'Exhibition not found' }; }
    if (!exh.active) { return { success: false, error: 'Exhibition is not active' }; }
    exh.views = (exh.views || 0) + 1;

    var totalSpark = 0;
    var results = [];
    for (var i = 0; i < exh.artworkIds.length; i++) {
      var res = recordView(state, viewerId, exh.artworkIds[i], ts + i);
      if (res.success) { totalSpark += res.sparkAwarded; }
      results.push(res);
    }
    return { success: true, exhibitionViews: exh.views, sparkAwarded: totalSpark, artworkResults: results };
  }

  // ---------------------------------------------------------------------------
  // Art Trading
  // ---------------------------------------------------------------------------

  /**
   * List an artwork for trade at a given price.
   * @param {Object} state
   * @param {string} sellerId
   * @param {string} artworkId
   * @param {number} price
   * @returns {{ success: boolean, error?: string }}
   */
  function listArtForTrade(state, sellerId, artworkId, price) {
    initGallery(state);
    var artwork = state.gallery.artworks[artworkId];
    if (!artwork) { return { success: false, error: 'Artwork not found' }; }
    if (artwork.artistId !== sellerId) { return { success: false, error: 'Only the artist can list their artwork for trade' }; }
    if (!artwork.tradeable) { return { success: false, error: 'This artwork is not tradeable' }; }
    if (typeof price !== 'number' || price <= 0) { return { success: false, error: 'Price must be a positive number' }; }
    if (Math.floor(price) !== price) { return { success: false, error: 'Price must be a whole number (Spark)' }; }

    state.gallery.tradeListing[artworkId] = {
      price:    price,
      sellerId: sellerId,
      listedAt: Date.now()
    };
    artwork.listedForTrade = true;
    return { success: true, artworkId: artworkId, price: price };
  }

  /**
   * Cancel a trade listing.
   */
  function cancelTradeListing(state, sellerId, artworkId) {
    initGallery(state);
    var listing = state.gallery.tradeListing[artworkId];
    if (!listing) { return { success: false, error: 'No active listing for this artwork' }; }
    if (listing.sellerId !== sellerId) { return { success: false, error: 'Only the seller can cancel this listing' }; }
    delete state.gallery.tradeListing[artworkId];
    var artwork = state.gallery.artworks[artworkId];
    if (artwork) { artwork.listedForTrade = false; }
    return { success: true };
  }

  /**
   * Purchase a listed artwork.
   * @param {Object} state
   * @param {string} buyerId
   * @param {string} artworkId
   * @returns {{ success: boolean, error?: string }}
   */
  function purchaseArtwork(state, buyerId, artworkId) {
    initGallery(state);
    var listing = state.gallery.tradeListing[artworkId];
    if (!listing) { return { success: false, error: 'Artwork not listed for trade' }; }
    var artwork = state.gallery.artworks[artworkId];
    if (!artwork) { return { success: false, error: 'Artwork not found' }; }
    if (buyerId === listing.sellerId) { return { success: false, error: 'Cannot purchase your own artwork' }; }

    var price = listing.price;

    // Attempt Economy transfer if available
    if (typeof Economy.transfer === 'function' && state.ledger) {
      var txResult = Economy.transfer(state.ledger, buyerId, listing.sellerId, price, 'art_purchase');
      if (txResult && txResult.success === false) {
        return { success: false, error: txResult.error || 'Insufficient Spark' };
      }
    }

    // Transfer artwork ownership
    var prevArtist = artwork.artistId;
    artwork.artistId = buyerId;
    artwork.listedForTrade = false;
    delete state.gallery.tradeListing[artworkId];

    // Update artist profiles
    var sellerProfile = state.gallery.artistProfiles[prevArtist];
    if (sellerProfile) {
      var idx = sellerProfile.artworks.indexOf(artworkId);
      if (idx !== -1) { sellerProfile.artworks.splice(idx, 1); }
      sellerProfile.totalEarnings += price;
    }
    var buyerProfile = ensureArtistProfile(state, buyerId);
    buyerProfile.artworks.push(artworkId);

    return { success: true, artworkId: artworkId, price: price, newOwner: buyerId };
  }

  /**
   * Get all active trade listings.
   */
  function getTradeListings(state) {
    if (!state.gallery) return [];
    var listings = [];
    for (var artworkId in state.gallery.tradeListing) {
      var listing = state.gallery.tradeListing[artworkId];
      var artwork = state.gallery.artworks[artworkId];
      if (artwork && listing) {
        listings.push({
          artworkId: artworkId,
          title:     artwork.title,
          medium:    artwork.medium,
          rarity:    artwork.rarity,
          price:     listing.price,
          sellerId:  listing.sellerId,
          listedAt:  listing.listedAt
        });
      }
    }
    return listings;
  }

  /**
   * Make an artwork non-tradeable (artist locks it permanently).
   */
  function lockArtwork(state, artistId, artworkId) {
    initGallery(state);
    var artwork = state.gallery.artworks[artworkId];
    if (!artwork) { return { success: false, error: 'Artwork not found' }; }
    if (artwork.artistId !== artistId) { return { success: false, error: 'Only the artist can lock their artwork' }; }
    // Remove from trade listing if listed
    if (state.gallery.tradeListing[artworkId]) {
      delete state.gallery.tradeListing[artworkId];
    }
    artwork.tradeable = false;
    artwork.listedForTrade = false;
    return { success: true };
  }

  // ---------------------------------------------------------------------------
  // Featured Art
  // ---------------------------------------------------------------------------

  /**
   * Refresh the featured artworks list (top FEATURED_ART_COUNT by avg rating).
   */
  function _refreshFeatured(state) {
    if (!state.gallery) return;
    var artworkIds = Object.keys(state.gallery.artworks);
    var scored = artworkIds.map(function(id) {
      var art = state.gallery.artworks[id];
      var rating = state.gallery.ratings[id] || { avgRating: 0, ratingCount: 0 };
      return { id: id, score: rating.avgRating + (rating.ratingCount * 0.01) + (art.views * 0.001) };
    });
    scored.sort(function(a, b) { return b.score - a.score; });
    state.gallery.featured = scored.slice(0, FEATURED_ART_COUNT).map(function(s) { return s.id; });
  }

  /**
   * Get the current featured artworks.
   */
  function getFeaturedArtworks(state) {
    if (!state.gallery) return [];
    _refreshFeatured(state);
    return state.gallery.featured.map(function(id) { return state.gallery.artworks[id]; }).filter(Boolean);
  }

  // ---------------------------------------------------------------------------
  // Gallery room queries
  // ---------------------------------------------------------------------------

  /**
   * Get info about a gallery room.
   */
  function getRoomInfo(state, roomId) {
    var room = GALLERY_ROOMS[roomId];
    if (!room) return null;
    initGallery(state);
    var slots = state.gallery.wallSlots[roomId] || {};
    var occupiedCount = 0;
    for (var slotName in slots) {
      if (slots[slotName]) { occupiedCount++; }
    }
    return {
      id:           room.id,
      name:         room.name,
      capacity:     room.capacity,
      description:  room.description,
      zone:         room.zone,
      featured:     room.featured,
      occupiedSlots: occupiedCount,
      availableSlots: room.capacity - occupiedCount
    };
  }

  /**
   * Get all gallery rooms info.
   */
  function getAllRooms(state) {
    initGallery(state);
    return Object.keys(GALLERY_ROOMS).map(function(roomId) { return getRoomInfo(state, roomId); });
  }

  /**
   * Get all artworks displayed in a specific room (populated).
   */
  function getArtworksInRoom(state, roomId) {
    if (!state.gallery) return [];
    var slots = state.gallery.wallSlots[roomId];
    if (!slots) return [];
    var result = [];
    for (var slotName in slots) {
      var id = slots[slotName];
      if (id && state.gallery.artworks[id]) {
        result.push(state.gallery.artworks[id]);
      }
    }
    return result;
  }

  // ---------------------------------------------------------------------------
  // Artwork search and queries
  // ---------------------------------------------------------------------------

  /**
   * Search artworks by criteria.
   * @param {Object} state
   * @param {Object} filters - { medium, rarity, minRating, maxRating, artistId }
   * @returns {Array}
   */
  function searchArtworks(state, filters) {
    if (!state.gallery) return [];
    filters = filters || {};
    var results = [];
    for (var id in state.gallery.artworks) {
      var art = state.gallery.artworks[id];
      var rating = state.gallery.ratings[id] || { avgRating: 0 };
      var match = true;
      if (filters.medium && art.medium !== filters.medium) { match = false; }
      if (filters.rarity && art.rarity !== filters.rarity) { match = false; }
      if (typeof filters.minRating === 'number' && rating.avgRating < filters.minRating) { match = false; }
      if (typeof filters.maxRating === 'number' && rating.avgRating > filters.maxRating) { match = false; }
      if (filters.artistId && art.artistId !== filters.artistId) { match = false; }
      if (match) { results.push(art); }
    }
    return results;
  }

  /**
   * Get top artworks by views.
   */
  function getTopByViews(state, limit) {
    if (!state.gallery) return [];
    limit = limit || 10;
    var arts = Object.keys(state.gallery.artworks).map(function(id) { return state.gallery.artworks[id]; });
    arts.sort(function(a, b) { return (b.views || 0) - (a.views || 0); });
    return arts.slice(0, limit);
  }

  /**
   * Get top artworks by rating.
   */
  function getTopByRating(state, limit) {
    if (!state.gallery) return [];
    limit = limit || 10;
    var arts = Object.keys(state.gallery.artworks).map(function(id) {
      var rating = state.gallery.ratings[id] || { avgRating: 0 };
      return { artwork: state.gallery.artworks[id], avgRating: rating.avgRating };
    });
    arts.sort(function(a, b) { return b.avgRating - a.avgRating; });
    return arts.slice(0, limit).map(function(a) { return a.artwork; });
  }

  // ---------------------------------------------------------------------------
  // Gallery statistics
  // ---------------------------------------------------------------------------

  /**
   * Get overall gallery statistics.
   */
  function getGalleryStats(state) {
    if (!state.gallery) {
      return { totalArtworks: 0, totalExhibitions: 0, totalViews: 0, totalArtists: 0, totalListings: 0 };
    }
    var totalViews = 0;
    for (var id in state.gallery.artworks) {
      totalViews += state.gallery.artworks[id].views || 0;
    }
    return {
      totalArtworks:   Object.keys(state.gallery.artworks).length,
      totalExhibitions: Object.keys(state.gallery.exhibitions).length,
      totalViews:      totalViews,
      totalArtists:    Object.keys(state.gallery.artistProfiles).length,
      totalListings:   Object.keys(state.gallery.tradeListing).length
    };
  }

  // ---------------------------------------------------------------------------
  // Artwork deletion (artist can remove their own non-exhibited work)
  // ---------------------------------------------------------------------------

  /**
   * Delete an artwork (artist only, only if not in an active exhibition).
   */
  function deleteArtwork(state, artistId, artworkId) {
    initGallery(state);
    var artwork = state.gallery.artworks[artworkId];
    if (!artwork) { return { success: false, error: 'Artwork not found' }; }
    if (artwork.artistId !== artistId) { return { success: false, error: 'Only the artist can delete their artwork' }; }

    // Check if in active exhibition
    for (var exhId in state.gallery.exhibitions) {
      var exh = state.gallery.exhibitions[exhId];
      if (exh.active && exh.artworkIds.indexOf(artworkId) !== -1) {
        return { success: false, error: 'Cannot delete artwork that is in an active exhibition' };
      }
    }

    // Remove from wall slots
    for (var roomId in state.gallery.wallSlots) {
      var slots = state.gallery.wallSlots[roomId];
      for (var slotName in slots) {
        if (slots[slotName] === artworkId) { slots[slotName] = null; }
      }
    }

    // Remove from trade listings
    if (state.gallery.tradeListing[artworkId]) {
      delete state.gallery.tradeListing[artworkId];
    }

    // Remove from ratings and viewLog
    delete state.gallery.ratings[artworkId];
    delete state.gallery.viewLog[artworkId];

    // Remove from artist profile
    var profile = state.gallery.artistProfiles[artistId];
    if (profile) {
      var idx = profile.artworks.indexOf(artworkId);
      if (idx !== -1) { profile.artworks.splice(idx, 1); }
    }

    // Remove from artworks
    delete state.gallery.artworks[artworkId];

    // Remove from featured
    var featIdx = state.gallery.featured.indexOf(artworkId);
    if (featIdx !== -1) { state.gallery.featured.splice(featIdx, 1); }

    _refreshFeatured(state);
    return { success: true };
  }

  // ---------------------------------------------------------------------------
  // Deterministic artwork data generation (for pixel/pattern art)
  // ---------------------------------------------------------------------------

  /**
   * Generate deterministic pixel art data using mulberry32.
   * @param {string} seed - Unique seed string
   * @param {number} width
   * @param {number} height
   * @param {number} [colorCount] - Number of colors in palette (2–16)
   * @returns {Array} Flat array of palette indices, length = width * height
   */
  function generatePixelData(seed, width, height, colorCount) {
    colorCount = colorCount || 8;
    if (colorCount < 2) { colorCount = 2; }
    if (colorCount > 16) { colorCount = 16; }
    var rng = mulberry32(hashString(String(seed)));
    var data = [];
    for (var i = 0; i < width * height; i++) {
      data.push(Math.floor(rng() * colorCount));
    }
    return data;
  }

  /**
   * Generate deterministic text art data using mulberry32.
   * @param {string} seed
   * @param {number} width  - chars per line
   * @param {number} height - number of lines
   * @returns {Array} Array of strings (lines)
   */
  function generateTextData(seed, width, height) {
    var charset = ' .,:;|![]{}#@%&*+=-~^';
    var rng = mulberry32(hashString(String(seed)));
    var lines = [];
    for (var y = 0; y < height; y++) {
      var line = '';
      for (var x = 0; x < width; x++) {
        line += charset[Math.floor(rng() * charset.length)];
      }
      lines.push(line);
    }
    return lines;
  }

  /**
   * Generate deterministic pattern data using mulberry32.
   * @param {string} seed
   * @param {number} width
   * @param {number} height
   * @returns {Array} 2D array of values 0–1
   */
  function generatePatternData(seed, width, height) {
    var rng = mulberry32(hashString(String(seed)));
    var rows = [];
    for (var y = 0; y < height; y++) {
      var row = [];
      for (var x = 0; x < width; x++) {
        row.push(Math.round(rng() * 100) / 100);
      }
      rows.push(row);
    }
    return rows;
  }

  // ---------------------------------------------------------------------------
  // Utility
  // ---------------------------------------------------------------------------

  function getConstants() {
    return {
      MEDIUMS:              MEDIUMS,
      MEDIUM_MAX_DIMS:      MEDIUM_MAX_DIMS,
      GALLERY_ROOMS:        GALLERY_ROOMS,
      ROOM_WALL_SLOTS:      ROOM_WALL_SLOTS,
      VIEWER_SPARK_MIN:     VIEWER_SPARK_MIN,
      VIEWER_SPARK_MAX:     VIEWER_SPARK_MAX,
      MAX_EXHIBITION_ARTWORKS: MAX_EXHIBITION_ARTWORKS,
      FEATURED_ART_COUNT:   FEATURED_ART_COUNT,
      ARTIST_RANKS:         ARTIST_RANKS,
      MAX_ARTIST_GALLERY_SLOTS: MAX_ARTIST_GALLERY_SLOTS,
      VIEW_COOLDOWN_MS:     VIEW_COOLDOWN_MS,
      MIN_RATING:           MIN_RATING,
      MAX_RATING:           MAX_RATING,
      ART_BASE_PRICE_BY_RARITY: ART_BASE_PRICE_BY_RARITY,
      RARITY_BY_AVG_RATING: RARITY_BY_AVG_RATING,
      VAULT_LISTING_COST:   VAULT_LISTING_COST,
      MAX_ARTIST_GALLERY_SLOTS: MAX_ARTIST_GALLERY_SLOTS
    };
  }

  // ---------------------------------------------------------------------------
  // Exports
  // ---------------------------------------------------------------------------

  exports.initGallery                 = initGallery;
  exports.createArtwork               = createArtwork;
  exports.getArtwork                  = getArtwork;
  exports.getArtistArtworks           = getArtistArtworks;
  exports.displayArtwork              = displayArtwork;
  exports.removeArtworkFromWall       = removeArtworkFromWall;
  exports.getRoomDisplay              = getRoomDisplay;
  exports.recordView                  = recordView;
  exports.rateArtwork                 = rateArtwork;
  exports.getRating                   = getRating;
  exports.createExhibition            = createExhibition;
  exports.addArtworkToExhibition      = addArtworkToExhibition;
  exports.removeArtworkFromExhibition = removeArtworkFromExhibition;
  exports.getExhibition               = getExhibition;
  exports.closeExhibition             = closeExhibition;
  exports.viewExhibition              = viewExhibition;
  exports.listArtForTrade             = listArtForTrade;
  exports.cancelTradeListing          = cancelTradeListing;
  exports.purchaseArtwork             = purchaseArtwork;
  exports.getTradeListings            = getTradeListings;
  exports.lockArtwork                 = lockArtwork;
  exports.getFeaturedArtworks         = getFeaturedArtworks;
  exports.getRoomInfo                 = getRoomInfo;
  exports.getAllRooms                 = getAllRooms;
  exports.getArtworksInRoom           = getArtworksInRoom;
  exports.searchArtworks              = searchArtworks;
  exports.getTopByViews               = getTopByViews;
  exports.getTopByRating              = getTopByRating;
  exports.getGalleryStats             = getGalleryStats;
  exports.deleteArtwork               = deleteArtwork;
  exports.generatePixelData           = generatePixelData;
  exports.generateTextData            = generateTextData;
  exports.generatePatternData         = generatePatternData;
  exports.getArtistProfile            = getArtistProfile;
  exports.getConstants                = getConstants;

  // Internal helpers exposed for testing
  exports._mulberry32      = mulberry32;
  exports._hashString      = hashString;
  exports._updateArtworkRarity = _updateArtworkRarity;
  exports._refreshFeatured = _refreshFeatured;

})(typeof module !== 'undefined' ? module.exports : (window.VisualGallery = {}));
