(function(exports) {
  // Spatial Hash Grid — O(1) amortized nearby-entity lookups
  // Replaces O(n) linear scans and O(n^2) nested loops throughout the codebase

  /**
   * Create a new spatial hash grid
   * @param {number} cellSize - Size of each grid cell (world units)
   * @returns {Object} Grid object
   */
  function createGrid(cellSize) {
    return {
      cellSize: cellSize || 50,
      cells: {},       // cellKey -> { id: {id, x, z} }
      entityCell: {}   // entityId -> cellKey
    };
  }

  /**
   * Compute cell key from world coordinates
   */
  function cellKey(grid, x, z) {
    return Math.floor(x / grid.cellSize) + '_' + Math.floor(z / grid.cellSize);
  }

  /**
   * Insert an entity into the grid
   * @param {Object} grid
   * @param {string} id - Entity identifier
   * @param {number} x - World X coordinate
   * @param {number} z - World Z coordinate
   */
  function insert(grid, id, x, z) {
    var key = cellKey(grid, x, z);
    if (!grid.cells[key]) grid.cells[key] = {};
    grid.cells[key][id] = { id: id, x: x, z: z };
    grid.entityCell[id] = key;
  }

  /**
   * Remove an entity from the grid
   * @param {Object} grid
   * @param {string} id - Entity identifier
   */
  function remove(grid, id) {
    var key = grid.entityCell[id];
    if (key && grid.cells[key]) {
      delete grid.cells[key][id];
      if (Object.keys(grid.cells[key]).length === 0) {
        delete grid.cells[key];
      }
    }
    delete grid.entityCell[id];
  }

  /**
   * Update an entity's position (remove + insert)
   * @param {Object} grid
   * @param {string} id
   * @param {number} x
   * @param {number} z
   */
  function update(grid, id, x, z) {
    var newKey = cellKey(grid, x, z);
    var oldKey = grid.entityCell[id];
    if (oldKey === newKey) {
      // Same cell, just update coords
      if (grid.cells[newKey] && grid.cells[newKey][id]) {
        grid.cells[newKey][id].x = x;
        grid.cells[newKey][id].z = z;
      }
      return;
    }
    remove(grid, id);
    insert(grid, id, x, z);
  }

  /**
   * Query all entities within radius of a point
   * @param {Object} grid
   * @param {number} x - Center X
   * @param {number} z - Center Z
   * @param {number} r - Search radius
   * @returns {Array} Array of {id, x, z, dist}
   */
  function queryRadius(grid, x, z, r) {
    var results = [];
    var cs = grid.cellSize;
    var r2 = r * r;
    var minCX = Math.floor((x - r) / cs);
    var maxCX = Math.floor((x + r) / cs);
    var minCZ = Math.floor((z - r) / cs);
    var maxCZ = Math.floor((z + r) / cs);

    for (var cx = minCX; cx <= maxCX; cx++) {
      for (var cz = minCZ; cz <= maxCZ; cz++) {
        var key = cx + '_' + cz;
        var cell = grid.cells[key];
        if (!cell) continue;
        var ids = Object.keys(cell);
        for (var i = 0; i < ids.length; i++) {
          var e = cell[ids[i]];
          var dx = e.x - x;
          var dz = e.z - z;
          var d2 = dx * dx + dz * dz;
          if (d2 <= r2) {
            results.push({ id: e.id, x: e.x, z: e.z, dist: Math.sqrt(d2) });
          }
        }
      }
    }
    return results;
  }

  /**
   * Clear all entities from the grid
   * @param {Object} grid
   */
  function clear(grid) {
    grid.cells = {};
    grid.entityCell = {};
  }

  exports.createGrid = createGrid;
  exports.insert = insert;
  exports.remove = remove;
  exports.update = update;
  exports.queryRadius = queryRadius;
  exports.clear = clear;

  // =========================================================================
  // ADAPTIVE SPATIAL GRID — brute-force below threshold, hash grid above
  // =========================================================================

  var ADAPTIVE_THRESHOLD = 200;

  function createAdaptiveGrid(cellSize) {
    return {
      grid: createGrid(cellSize),
      entities: {},  // id -> {id, x, z}
      count: 0,
      threshold: ADAPTIVE_THRESHOLD,
      gridPopulated: false
    };
  }

  function adaptiveInsert(ag, id, x, z) {
    ag.entities[id] = { id: id, x: x, z: z };
    ag.count++;

    if (ag.count >= ag.threshold) {
      if (!ag.gridPopulated) {
        // Bulk-insert all entities into the hash grid
        var ids = Object.keys(ag.entities);
        for (var i = 0; i < ids.length; i++) {
          var e = ag.entities[ids[i]];
          insert(ag.grid, e.id, e.x, e.z);
        }
        ag.gridPopulated = true;
      } else {
        insert(ag.grid, id, x, z);
      }
    }
  }

  function adaptiveRemove(ag, id) {
    if (ag.entities[id]) {
      delete ag.entities[id];
      ag.count--;
    }
    if (ag.gridPopulated) {
      remove(ag.grid, id);
    }
  }

  function adaptiveUpdate(ag, id, x, z) {
    ag.entities[id] = { id: id, x: x, z: z };
    if (ag.gridPopulated) {
      update(ag.grid, id, x, z);
    }
  }

  function adaptiveQueryRadius(ag, x, z, r) {
    if (ag.gridPopulated) {
      return queryRadius(ag.grid, x, z, r);
    }

    // Brute-force path for small entity counts
    var results = [];
    var r2 = r * r;
    var ids = Object.keys(ag.entities);
    for (var i = 0; i < ids.length; i++) {
      var e = ag.entities[ids[i]];
      var dx = e.x - x;
      var dz = e.z - z;
      var d2 = dx * dx + dz * dz;
      if (d2 <= r2) {
        results.push({ id: e.id, x: e.x, z: e.z, dist: Math.sqrt(d2) });
      }
    }
    return results;
  }

  function adaptiveClear(ag) {
    ag.entities = {};
    ag.count = 0;
    ag.gridPopulated = false;
    clear(ag.grid);
  }

  exports.ADAPTIVE_THRESHOLD = ADAPTIVE_THRESHOLD;
  exports.createAdaptiveGrid = createAdaptiveGrid;
  exports.adaptiveInsert = adaptiveInsert;
  exports.adaptiveRemove = adaptiveRemove;
  exports.adaptiveUpdate = adaptiveUpdate;
  exports.adaptiveQueryRadius = adaptiveQueryRadius;
  exports.adaptiveClear = adaptiveClear;

})(typeof module !== 'undefined' ? module.exports : (window.SpatialGrid = {}));
