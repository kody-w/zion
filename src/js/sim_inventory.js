// sim_inventory.js — Warehouse/Inventory Management Simulation for ZION
// Article XI: Simulations run locally, store state as JSON, use pure functions.
// Manages SKUs, stock movements, reorder triggers, purchase orders, supplier
// relationships, FIFO/LIFO costing, and stock valuation.
// Operable by NPC merchants and AI agents via the standard applyAction API.
(function(exports) {
  'use strict';

  // --- Optional dependencies (guard pattern) ---
  var Economy = (typeof window !== 'undefined' && window.Economy) || {};
  var MerchantGuilds = (typeof window !== 'undefined' && window.MerchantGuilds) || {};
  var Trading = (typeof window !== 'undefined' && window.Trading) || {};

  // --- Constants ---

  var MOVEMENT_TYPES = ['receive', 'ship', 'adjust', 'transfer', 'return', 'write_off'];
  var PO_STATUSES = ['draft', 'submitted', 'approved', 'ordered', 'partial', 'received', 'cancelled'];
  var COST_METHODS = ['fifo', 'lifo', 'average'];
  var SKU_CATEGORIES = ['raw_material', 'component', 'finished_good', 'consumable', 'equipment', 'misc'];

  var DEFAULT_LEAD_TIME_DAYS = 7;
  var DEFAULT_REORDER_MULTIPLIER = 2; // reorder qty = reorder_point * multiplier
  var MAX_HISTORY_PER_SKU = 500;      // cap audit trail per SKU to avoid unbounded growth

  // --- mulberry32 seeded PRNG (deterministic NPC actions) ---

  function mulberry32(seed) {
    var s = seed >>> 0;
    return function() {
      s += 0x6d2b79f5;
      var t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // --- ID generation ---

  var idCounter = 0;

  function generateId(prefix) {
    idCounter++;
    return (prefix || 'id') + '_' + Date.now().toString(36) + '_' + idCounter;
  }

  function now() {
    return new Date().toISOString();
  }

  // --- Clone helper ---

  function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function objectKeys(obj) {
    var keys = [];
    for (var k in obj) {
      if (obj.hasOwnProperty(k)) { keys.push(k); }
    }
    return keys;
  }

  // --- initState ---

  function initState(snapshot) {
    if (snapshot && (snapshot.skus || snapshot.warehouses || snapshot._inv_version)) {
      var loaded = clone(snapshot);
      // Migration: ensure all required top-level keys exist
      if (!loaded.skus)            { loaded.skus = {}; }
      if (!loaded.warehouses)      { loaded.warehouses = {}; }
      if (!loaded.suppliers)       { loaded.suppliers = {}; }
      if (!loaded.purchase_orders) { loaded.purchase_orders = {}; }
      if (!loaded.movements)       { loaded.movements = []; }
      if (!loaded.alerts)          { loaded.alerts = []; }
      if (!loaded._inv_version)    { loaded._inv_version = 1; }
      if (!loaded._molt_log)       { loaded._molt_log = []; }
      // Restore id counter from existing data
      var maxNum = 0;
      var allIds = []
        .concat(objectKeys(loaded.skus))
        .concat(objectKeys(loaded.warehouses))
        .concat(objectKeys(loaded.suppliers))
        .concat(objectKeys(loaded.purchase_orders));
      for (var m = 0; m < loaded.movements.length; m++) {
        if (loaded.movements[m].id) { allIds.push(loaded.movements[m].id); }
      }
      for (var i = 0; i < allIds.length; i++) {
        var parts = allIds[i].split('_');
        var num = parseInt(parts[parts.length - 1], 36);
        if (!isNaN(num) && num > maxNum) { maxNum = num; }
      }
      idCounter = maxNum;
      return loaded;
    }
    return {
      _inv_version: 1,
      _molt_log: [],
      skus: {},
      warehouses: {},
      suppliers: {},
      purchase_orders: {},
      movements: [],
      alerts: []
    };
  }

  // --- Molt ---

  function molt(state, reason) {
    var s = clone(state);
    if (!s._molt_log) { s._molt_log = []; }
    s._molt_log.push({ v: s._molt_log.length + 1, reason: reason, ts: now() });
    return s;
  }

  // ============================================================
  // SKU MANAGEMENT
  // ============================================================

  function createSku(state, data) {
    var s = clone(state);
    var id = data.id || generateId('sku');
    var record = {
      id: id,
      name: data.name || 'Unnamed SKU',
      category: data.category || 'misc',
      unit_cost: data.unit_cost !== undefined ? Number(data.unit_cost) : 0,
      unit: data.unit || 'unit',
      description: data.description || '',
      active: data.active !== false,
      reorder_point: data.reorder_point !== undefined ? Number(data.reorder_point) : 0,
      reorder_qty: data.reorder_qty !== undefined ? Number(data.reorder_qty) : 0,
      preferred_supplier_id: data.preferred_supplier_id || '',
      tags: data.tags || [],
      createdAt: now(),
      createdBy: data.createdBy || 'system'
    };
    s.skus[id] = record;
    return { state: s, record: record };
  }

  function updateSku(state, skuId, data) {
    if (!state.skus[skuId]) { return state; }
    var s = clone(state);
    var sku = s.skus[skuId];
    var allowed = ['name', 'category', 'unit_cost', 'unit', 'description', 'active',
                   'reorder_point', 'reorder_qty', 'preferred_supplier_id', 'tags'];
    for (var i = 0; i < allowed.length; i++) {
      var k = allowed[i];
      if (data[k] !== undefined) { sku[k] = data[k]; }
    }
    sku.updatedAt = now();
    return s;
  }

  function deactivateSku(state, skuId) {
    if (!state.skus[skuId]) { return state; }
    var s = clone(state);
    s.skus[skuId].active = false;
    s.skus[skuId].deactivatedAt = now();
    return s;
  }

  // ============================================================
  // WAREHOUSE LOCATIONS
  // ============================================================

  function createWarehouse(state, data) {
    var s = clone(state);
    var id = data.id || generateId('wh');
    var record = {
      id: id,
      name: data.name || 'Unnamed Warehouse',
      location: data.location || '',
      zone: data.zone || 'agora',
      capacity: data.capacity !== undefined ? Number(data.capacity) : Infinity,
      cost_method: COST_METHODS.indexOf(data.cost_method) !== -1 ? data.cost_method : 'fifo',
      manager: data.manager || 'system',
      active: data.active !== false,
      // stock ledger: { skuId: { qty, cost_layers } }
      stock: {},
      createdAt: now()
    };
    s.warehouses[id] = record;
    return { state: s, record: record };
  }

  function updateWarehouse(state, warehouseId, data) {
    if (!state.warehouses[warehouseId]) { return state; }
    var s = clone(state);
    var wh = s.warehouses[warehouseId];
    var allowed = ['name', 'location', 'zone', 'capacity', 'cost_method', 'manager', 'active'];
    for (var i = 0; i < allowed.length; i++) {
      var k = allowed[i];
      if (data[k] !== undefined) { wh[k] = data[k]; }
    }
    wh.updatedAt = now();
    return s;
  }

  // Ensure a stock entry exists for a SKU inside a warehouse
  function ensureStockEntry(wh, skuId) {
    if (!wh.stock[skuId]) {
      wh.stock[skuId] = { qty: 0, cost_layers: [] };
    }
  }

  // ============================================================
  // STOCK MOVEMENTS
  // ============================================================

  /**
   * Record a stock movement and update warehouse quantities.
   * Supported types: receive, ship, adjust, transfer, return, write_off
   *
   * data: {
   *   type, skuId, warehouseId, qty, unit_cost,
   *   toWarehouseId (for transfer),
   *   reason, reference, by
   * }
   */
  function recordMovement(state, data) {
    var type = data.type || 'adjust';
    if (MOVEMENT_TYPES.indexOf(type) === -1) {
      return { state: state, error: 'Unknown movement type: ' + type };
    }
    if (!state.skus[data.skuId]) {
      return { state: state, error: 'Unknown SKU: ' + data.skuId };
    }
    if (!state.warehouses[data.warehouseId]) {
      return { state: state, error: 'Unknown warehouse: ' + data.warehouseId };
    }

    var qty = Number(data.qty) || 0;
    if (qty === 0) {
      return { state: state, error: 'Quantity must be non-zero' };
    }

    var s = clone(state);
    var wh = s.warehouses[data.warehouseId];
    ensureStockEntry(wh, data.skuId);
    var stock = wh.stock[data.skuId];
    var unitCost = data.unit_cost !== undefined ? Number(data.unit_cost) : (state.skus[data.skuId].unit_cost || 0);

    var movId = generateId('mov');
    var movement = {
      id: movId,
      type: type,
      skuId: data.skuId,
      warehouseId: data.warehouseId,
      qty: qty,
      unit_cost: unitCost,
      reason: data.reason || '',
      reference: data.reference || '',
      by: data.by || 'system',
      ts: now()
    };

    if (type === 'receive' || type === 'return') {
      // Add to stock, push a cost layer
      stock.qty += qty;
      stock.cost_layers.push({ qty: qty, unit_cost: unitCost, ts: movement.ts });

    } else if (type === 'ship' || type === 'write_off') {
      // Remove from stock using cost method
      if (stock.qty < qty) {
        return { state: state, error: 'Insufficient stock: available ' + stock.qty + ', requested ' + qty };
      }
      consumeStock(wh, data.skuId, qty, s.skus[data.skuId]);
      movement.unit_cost = unitCost; // recorded cost at time of shipment

    } else if (type === 'adjust') {
      // Positive or negative adjustment
      var newQty = stock.qty + qty;
      if (newQty < 0) {
        return { state: state, error: 'Adjustment would bring stock below zero' };
      }
      if (qty > 0) {
        stock.qty += qty;
        stock.cost_layers.push({ qty: qty, unit_cost: unitCost, ts: movement.ts });
      } else {
        consumeStock(wh, data.skuId, -qty, s.skus[data.skuId]);
      }

    } else if (type === 'transfer') {
      // Transfer between warehouses
      if (!data.toWarehouseId) {
        return { state: state, error: 'Transfer requires toWarehouseId' };
      }
      if (!s.warehouses[data.toWarehouseId]) {
        return { state: state, error: 'Unknown destination warehouse: ' + data.toWarehouseId };
      }
      if (stock.qty < qty) {
        return { state: state, error: 'Insufficient stock for transfer' };
      }
      var consumed = consumeStock(wh, data.skuId, qty, s.skus[data.skuId]);
      var toWh = s.warehouses[data.toWarehouseId];
      ensureStockEntry(toWh, data.skuId);
      toWh.stock[data.skuId].qty += qty;
      toWh.stock[data.skuId].cost_layers.push({ qty: qty, unit_cost: consumed.avgCost, ts: movement.ts });
      movement.toWarehouseId = data.toWarehouseId;
      movement.avg_cost_transferred = consumed.avgCost;
    }

    s.movements.push(movement);

    // Trim movement history growth per SKU if needed (global audit trail is kept)
    // Check reorder point after any reduction
    if (type === 'ship' || type === 'write_off' || (type === 'adjust' && qty < 0) || type === 'transfer') {
      s = checkReorderPoint(s, data.skuId);
    }

    return { state: s, movement: movement };
  }

  /**
   * Consume stock from a warehouse's cost layers using FIFO or LIFO.
   * Returns { avgCost } for transfer bookkeeping.
   * Mutates wh.stock[skuId] in place (called inside clone context).
   */
  function consumeStock(wh, skuId, qty, sku) {
    var stock = wh.stock[skuId];
    var method = wh.cost_method || 'fifo';
    var remaining = qty;
    var totalCost = 0;

    if (method === 'fifo') {
      // Consume from front (oldest first)
      while (remaining > 0 && stock.cost_layers.length > 0) {
        var layer = stock.cost_layers[0];
        if (layer.qty <= remaining) {
          totalCost += layer.qty * layer.unit_cost;
          remaining -= layer.qty;
          stock.cost_layers.shift();
        } else {
          totalCost += remaining * layer.unit_cost;
          layer.qty -= remaining;
          remaining = 0;
        }
      }
    } else if (method === 'lifo') {
      // Consume from back (newest first)
      while (remaining > 0 && stock.cost_layers.length > 0) {
        var lLayer = stock.cost_layers[stock.cost_layers.length - 1];
        if (lLayer.qty <= remaining) {
          totalCost += lLayer.qty * lLayer.unit_cost;
          remaining -= lLayer.qty;
          stock.cost_layers.pop();
        } else {
          totalCost += remaining * lLayer.unit_cost;
          lLayer.qty -= remaining;
          remaining = 0;
        }
      }
    } else {
      // average — consume proportionally but track total cost
      var avgCostCalc = stock.cost_layers.reduce(function(acc, l) { return acc + l.qty * l.unit_cost; }, 0);
      var totalUnits = stock.cost_layers.reduce(function(acc, l) { return acc + l.qty; }, 0);
      var avgUnit = totalUnits > 0 ? avgCostCalc / totalUnits : 0;
      totalCost = qty * avgUnit;
      // Reduce layers proportionally
      var factor = (totalUnits - qty) / totalUnits;
      if (factor <= 0) {
        stock.cost_layers = [];
      } else {
        for (var i = 0; i < stock.cost_layers.length; i++) {
          stock.cost_layers[i].qty = stock.cost_layers[i].qty * factor;
        }
        // Remove zero-qty layers
        stock.cost_layers = stock.cost_layers.filter(function(l) { return l.qty > 0.0001; });
      }
    }

    stock.qty -= qty;
    if (stock.qty < 0) { stock.qty = 0; }

    return { totalCost: totalCost, avgCost: qty > 0 ? totalCost / qty : 0 };
  }

  // ============================================================
  // REORDER POINTS & AUTO-PO GENERATION
  // ============================================================

  function checkReorderPoint(state, skuId) {
    var sku = state.skus[skuId];
    if (!sku || !sku.active || sku.reorder_point <= 0) { return state; }

    // Sum qty across all warehouses
    var totalQty = getTotalQty(state, skuId);

    if (totalQty <= sku.reorder_point) {
      // Check if there's already an open PO for this SKU
      var hasOpenPO = false;
      var poIds = objectKeys(state.purchase_orders);
      for (var i = 0; i < poIds.length; i++) {
        var po = state.purchase_orders[poIds[i]];
        if (po.skuId === skuId &&
            ['draft', 'submitted', 'approved', 'ordered', 'partial'].indexOf(po.status) !== -1) {
          hasOpenPO = true;
          break;
        }
      }

      var s = clone(state);

      // Raise a low-stock alert
      var alertId = generateId('alrt');
      s.alerts.push({
        id: alertId,
        type: 'low_stock',
        skuId: skuId,
        skuName: sku.name,
        currentQty: totalQty,
        reorderPoint: sku.reorder_point,
        ts: now(),
        resolved: false
      });

      // Auto-generate a PO if a preferred supplier exists and no open PO
      if (!hasOpenPO && sku.preferred_supplier_id && state.suppliers[sku.preferred_supplier_id]) {
        var reorderQty = sku.reorder_qty > 0 ? sku.reorder_qty : sku.reorder_point * DEFAULT_REORDER_MULTIPLIER;
        var supplier = state.suppliers[sku.preferred_supplier_id];
        var poResult = createPurchaseOrder(s, {
          skuId: skuId,
          supplierId: sku.preferred_supplier_id,
          qty: reorderQty,
          unit_cost: supplier.catalog && supplier.catalog[skuId]
            ? supplier.catalog[skuId].unit_cost
            : sku.unit_cost,
          auto_generated: true,
          reference: 'auto-reorder for ' + sku.name
        });
        s = poResult.state;
      }

      return s;
    }

    return state;
  }

  function getTotalQty(state, skuId) {
    var total = 0;
    var whIds = objectKeys(state.warehouses);
    for (var i = 0; i < whIds.length; i++) {
      var wh = state.warehouses[whIds[i]];
      if (wh.stock && wh.stock[skuId]) {
        total += wh.stock[skuId].qty || 0;
      }
    }
    return total;
  }

  function resolveAlert(state, alertId) {
    var s = clone(state);
    for (var i = 0; i < s.alerts.length; i++) {
      if (s.alerts[i].id === alertId) {
        s.alerts[i].resolved = true;
        s.alerts[i].resolvedAt = now();
        break;
      }
    }
    return s;
  }

  // ============================================================
  // SUPPLIER REGISTRY
  // ============================================================

  function registerSupplier(state, data) {
    var s = clone(state);
    var id = data.id || generateId('sup');
    var record = {
      id: id,
      name: data.name || 'Unnamed Supplier',
      contact: data.contact || '',
      zone: data.zone || '',
      lead_time_days: data.lead_time_days !== undefined ? Number(data.lead_time_days) : DEFAULT_LEAD_TIME_DAYS,
      reliability_score: data.reliability_score !== undefined ? Number(data.reliability_score) : 100,
      // catalog: { skuId: { unit_cost, min_order_qty } }
      catalog: data.catalog || {},
      active: data.active !== false,
      notes: data.notes || '',
      createdAt: now(),
      createdBy: data.createdBy || 'system'
    };
    s.suppliers[id] = record;
    return { state: s, record: record };
  }

  function updateSupplier(state, supplierId, data) {
    if (!state.suppliers[supplierId]) { return state; }
    var s = clone(state);
    var sup = s.suppliers[supplierId];
    var allowed = ['name', 'contact', 'zone', 'lead_time_days', 'reliability_score', 'active', 'notes', 'catalog'];
    for (var i = 0; i < allowed.length; i++) {
      var k = allowed[i];
      if (data[k] !== undefined) { sup[k] = data[k]; }
    }
    sup.updatedAt = now();
    return s;
  }

  function updateSupplierCatalog(state, supplierId, skuId, catalogEntry) {
    if (!state.suppliers[supplierId]) { return state; }
    var s = clone(state);
    if (!s.suppliers[supplierId].catalog) { s.suppliers[supplierId].catalog = {}; }
    s.suppliers[supplierId].catalog[skuId] = {
      unit_cost: catalogEntry.unit_cost !== undefined ? Number(catalogEntry.unit_cost) : 0,
      min_order_qty: catalogEntry.min_order_qty !== undefined ? Number(catalogEntry.min_order_qty) : 1
    };
    s.suppliers[supplierId].updatedAt = now();
    return s;
  }

  function rateSupplier(state, supplierId, deliveryData) {
    // deliveryData: { on_time: bool, qty_correct: bool, quality_score: 0-100 }
    if (!state.suppliers[supplierId]) { return state; }
    var s = clone(state);
    var sup = s.suppliers[supplierId];
    var score = sup.reliability_score || 100;
    if (deliveryData.on_time === false)    { score -= 10; }
    if (deliveryData.qty_correct === false){ score -= 5; }
    if (deliveryData.quality_score !== undefined) {
      // Blend current score with quality score (80/20 weighted average)
      score = Math.round(score * 0.8 + Number(deliveryData.quality_score) * 0.2);
    }
    sup.reliability_score = Math.max(0, Math.min(100, score));
    sup.updatedAt = now();
    if (!sup.rating_history) { sup.rating_history = []; }
    sup.rating_history.push({ ts: now(), data: deliveryData, resulting_score: sup.reliability_score });
    return s;
  }

  // ============================================================
  // PURCHASE ORDERS
  // ============================================================

  function createPurchaseOrder(state, data) {
    if (!data.skuId || !state.skus[data.skuId]) {
      return { state: state, error: 'Unknown SKU: ' + data.skuId };
    }
    if (!data.supplierId || !state.suppliers[data.supplierId]) {
      return { state: state, error: 'Unknown supplier: ' + data.supplierId };
    }
    var s = clone(state);
    var id = data.id || generateId('po');
    var sku = s.skus[data.skuId];
    var supplier = s.suppliers[data.supplierId];
    var qty = Number(data.qty) || 0;
    var unitCost = data.unit_cost !== undefined
      ? Number(data.unit_cost)
      : (supplier.catalog && supplier.catalog[data.skuId]
          ? supplier.catalog[data.skuId].unit_cost
          : sku.unit_cost || 0);

    var record = {
      id: id,
      skuId: data.skuId,
      skuName: sku.name,
      supplierId: data.supplierId,
      supplierName: supplier.name,
      qty: qty,
      qty_received: 0,
      unit_cost: unitCost,
      total_cost: qty * unitCost,
      status: 'draft',
      auto_generated: data.auto_generated || false,
      reference: data.reference || '',
      warehouseId: data.warehouseId || '',
      notes: data.notes || '',
      expected_delivery: data.expected_delivery || '',
      createdAt: now(),
      createdBy: data.createdBy || 'system',
      history: []
    };
    s.purchase_orders[id] = record;
    return { state: s, record: record };
  }

  function updatePurchaseOrder(state, poId, data) {
    if (!state.purchase_orders[poId]) { return state; }
    var s = clone(state);
    var po = s.purchase_orders[poId];
    var allowed = ['qty', 'unit_cost', 'reference', 'warehouseId', 'notes', 'expected_delivery'];
    for (var i = 0; i < allowed.length; i++) {
      var k = allowed[i];
      if (data[k] !== undefined) { po[k] = data[k]; }
    }
    if (data.qty !== undefined || data.unit_cost !== undefined) {
      po.total_cost = po.qty * po.unit_cost;
    }
    po.updatedAt = now();
    return s;
  }

  function approvePurchaseOrder(state, poId, approvedBy) {
    if (!state.purchase_orders[poId]) { return state; }
    var po = state.purchase_orders[poId];
    if (po.status !== 'draft' && po.status !== 'submitted') {
      return { state: state, error: 'PO cannot be approved from status: ' + po.status };
    }
    var s = clone(state);
    s.purchase_orders[poId].status = 'approved';
    s.purchase_orders[poId].approvedBy = approvedBy || 'system';
    s.purchase_orders[poId].approvedAt = now();
    s.purchase_orders[poId].history.push({ status: 'approved', by: approvedBy || 'system', ts: now() });
    return s;
  }

  function submitPurchaseOrder(state, poId) {
    if (!state.purchase_orders[poId]) { return state; }
    var po = state.purchase_orders[poId];
    if (po.status !== 'draft') {
      return { state: state, error: 'Only draft POs can be submitted' };
    }
    var s = clone(state);
    s.purchase_orders[poId].status = 'submitted';
    s.purchase_orders[poId].submittedAt = now();
    s.purchase_orders[poId].history.push({ status: 'submitted', ts: now() });
    return s;
  }

  function orderPurchaseOrder(state, poId) {
    if (!state.purchase_orders[poId]) { return state; }
    var po = state.purchase_orders[poId];
    if (po.status !== 'approved') {
      return { state: state, error: 'Only approved POs can be ordered' };
    }
    var s = clone(state);
    s.purchase_orders[poId].status = 'ordered';
    s.purchase_orders[poId].orderedAt = now();
    s.purchase_orders[poId].history.push({ status: 'ordered', ts: now() });
    return s;
  }

  function cancelPurchaseOrder(state, poId, reason) {
    if (!state.purchase_orders[poId]) { return state; }
    var po = state.purchase_orders[poId];
    if (po.status === 'received' || po.status === 'cancelled') {
      return { state: state, error: 'Cannot cancel a ' + po.status + ' PO' };
    }
    var s = clone(state);
    s.purchase_orders[poId].status = 'cancelled';
    s.purchase_orders[poId].cancelReason = reason || '';
    s.purchase_orders[poId].cancelledAt = now();
    s.purchase_orders[poId].history.push({ status: 'cancelled', reason: reason || '', ts: now() });
    return s;
  }

  /**
   * Receive goods against a PO — creates a stock movement automatically.
   * data: { qtyReceived, warehouseId, unit_cost, by }
   */
  function receivePurchaseOrder(state, poId, data) {
    if (!state.purchase_orders[poId]) {
      return { state: state, error: 'Unknown PO: ' + poId };
    }
    var po = state.purchase_orders[poId];
    if (['ordered', 'partial', 'approved'].indexOf(po.status) === -1) {
      return { state: state, error: 'PO not in receivable status: ' + po.status };
    }

    var qtyReceived = Number(data.qtyReceived) || 0;
    if (qtyReceived <= 0) {
      return { state: state, error: 'qtyReceived must be positive' };
    }

    var warehouseId = data.warehouseId || po.warehouseId;
    if (!warehouseId || !state.warehouses[warehouseId]) {
      return { state: state, error: 'Invalid or missing warehouseId for PO receipt' };
    }

    var s = clone(state);
    var spoId = s.purchase_orders[poId];
    spoId.qty_received = (spoId.qty_received || 0) + qtyReceived;
    spoId.last_receipt_at = now();

    if (spoId.qty_received >= spoId.qty) {
      spoId.status = 'received';
      spoId.receivedAt = now();
    } else {
      spoId.status = 'partial';
    }
    spoId.history.push({ status: spoId.status, qtyReceived: qtyReceived, ts: now() });

    // Record the stock receive movement
    var movResult = recordMovement(s, {
      type: 'receive',
      skuId: po.skuId,
      warehouseId: warehouseId,
      qty: qtyReceived,
      unit_cost: data.unit_cost !== undefined ? Number(data.unit_cost) : po.unit_cost,
      reason: 'PO receipt: ' + poId,
      reference: poId,
      by: data.by || 'system'
    });
    if (movResult.error) {
      return { state: state, error: movResult.error };
    }

    // Update supplier reliability
    if (data.on_time !== undefined || data.qty_correct !== undefined) {
      movResult.state = rateSupplier(movResult.state, po.supplierId, {
        on_time: data.on_time,
        qty_correct: data.qty_correct !== false
      });
    }

    return { state: movResult.state, purchase_order: movResult.state.purchase_orders[poId], movement: movResult.movement };
  }

  // ============================================================
  // STOCK VALUATION
  // ============================================================

  /**
   * Calculate total inventory value across all warehouses.
   * Returns per-SKU breakdown and grand total.
   */
  function getStockValuation(state) {
    var result = { by_sku: {}, by_warehouse: {}, grand_total: 0 };
    var whIds = objectKeys(state.warehouses);

    for (var w = 0; w < whIds.length; w++) {
      var whId = whIds[w];
      var wh = state.warehouses[whId];
      var whTotal = 0;
      var whDetail = {};

      var skuIds = objectKeys(wh.stock || {});
      for (var sk = 0; sk < skuIds.length; sk++) {
        var skuId = skuIds[sk];
        var stock = wh.stock[skuId];
        var totalValue = 0;
        for (var l = 0; l < stock.cost_layers.length; l++) {
          totalValue += stock.cost_layers[l].qty * stock.cost_layers[l].unit_cost;
        }
        whDetail[skuId] = { qty: stock.qty, value: totalValue };
        whTotal += totalValue;

        if (!result.by_sku[skuId]) {
          result.by_sku[skuId] = { qty: 0, value: 0, skuName: (state.skus[skuId] || {}).name || skuId };
        }
        result.by_sku[skuId].qty += stock.qty;
        result.by_sku[skuId].value += totalValue;
      }

      result.by_warehouse[whId] = {
        name: wh.name,
        total: whTotal,
        detail: whDetail
      };
      result.grand_total += whTotal;
    }

    return result;
  }

  /**
   * Get the effective average unit cost for a SKU in a warehouse.
   */
  function getAverageCost(state, skuId, warehouseId) {
    if (!state.warehouses[warehouseId]) { return 0; }
    var stock = state.warehouses[warehouseId].stock[skuId];
    if (!stock || stock.qty === 0) { return 0; }
    var totalCost = 0;
    for (var i = 0; i < stock.cost_layers.length; i++) {
      totalCost += stock.cost_layers[i].qty * stock.cost_layers[i].unit_cost;
    }
    return stock.qty > 0 ? totalCost / stock.qty : 0;
  }

  // ============================================================
  // MOVEMENT HISTORY & QUERIES
  // ============================================================

  function getMovementHistory(state, filters) {
    var movements = state.movements || [];
    if (!filters) { return movements.slice(); }

    return movements.filter(function(m) {
      if (filters.skuId && m.skuId !== filters.skuId) { return false; }
      if (filters.warehouseId && m.warehouseId !== filters.warehouseId) { return false; }
      if (filters.type && m.type !== filters.type) { return false; }
      if (filters.by && m.by !== filters.by) { return false; }
      if (filters.since && m.ts < filters.since) { return false; }
      if (filters.before && m.ts >= filters.before) { return false; }
      return true;
    });
  }

  function getLowStockAlerts(state, includeResolved) {
    return state.alerts.filter(function(a) {
      return includeResolved ? true : !a.resolved;
    });
  }

  function getSkuStock(state, skuId) {
    var result = { skuId: skuId, total_qty: 0, by_warehouse: {} };
    var whIds = objectKeys(state.warehouses);
    for (var i = 0; i < whIds.length; i++) {
      var whId = whIds[i];
      var wh = state.warehouses[whId];
      if (wh.stock && wh.stock[skuId]) {
        var s = wh.stock[skuId];
        result.by_warehouse[whId] = { qty: s.qty, cost_layers: s.cost_layers.length };
        result.total_qty += s.qty;
      }
    }
    return result;
  }

  function getOpenPurchaseOrders(state, filters) {
    var openStatuses = ['draft', 'submitted', 'approved', 'ordered', 'partial'];
    var poIds = objectKeys(state.purchase_orders);
    var result = [];
    for (var i = 0; i < poIds.length; i++) {
      var po = state.purchase_orders[poIds[i]];
      if (openStatuses.indexOf(po.status) === -1) { continue; }
      if (filters) {
        if (filters.skuId && po.skuId !== filters.skuId) { continue; }
        if (filters.supplierId && po.supplierId !== filters.supplierId) { continue; }
      }
      result.push(po);
    }
    return result;
  }

  // ============================================================
  // METRICS / SUMMARY
  // ============================================================

  function getMetrics(state) {
    var skuCount = 0, activeSkuCount = 0;
    var skuIds = objectKeys(state.skus);
    for (var si = 0; si < skuIds.length; si++) {
      skuCount++;
      if (state.skus[skuIds[si]].active) { activeSkuCount++; }
    }

    var warehouseCount = objectKeys(state.warehouses).length;
    var supplierCount = 0, activeSupplierCount = 0;
    var supIds = objectKeys(state.suppliers);
    for (var pi = 0; pi < supIds.length; pi++) {
      supplierCount++;
      if (state.suppliers[supIds[pi]].active) { activeSupplierCount++; }
    }

    var openPOs = 0, receivedPOs = 0, cancelledPOs = 0, totalPOValue = 0;
    var poIds = objectKeys(state.purchase_orders);
    var openStatuses = ['draft', 'submitted', 'approved', 'ordered', 'partial'];
    for (var oi = 0; oi < poIds.length; oi++) {
      var po = state.purchase_orders[poIds[oi]];
      if (openStatuses.indexOf(po.status) !== -1) { openPOs++; }
      if (po.status === 'received') { receivedPOs++; }
      if (po.status === 'cancelled') { cancelledPOs++; }
      if (openStatuses.indexOf(po.status) !== -1) { totalPOValue += po.total_cost || 0; }
    }

    var valuation = getStockValuation(state);
    var unresolved_alerts = getLowStockAlerts(state, false).length;
    var total_movements = (state.movements || []).length;

    return {
      sku_count: skuCount,
      active_sku_count: activeSkuCount,
      warehouse_count: warehouseCount,
      supplier_count: supplierCount,
      active_supplier_count: activeSupplierCount,
      open_po_count: openPOs,
      received_po_count: receivedPOs,
      cancelled_po_count: cancelledPOs,
      open_po_value: totalPOValue,
      total_inventory_value: valuation.grand_total,
      unresolved_alerts: unresolved_alerts,
      total_movements: total_movements,
      molt_count: (state._molt_log || []).length
    };
  }

  // ============================================================
  // SIMULATION TICK (NPC / AI agent autonomous actions)
  // ============================================================

  var NPC_SUPPLIER_NAMES = [
    'Agora Wholesale', 'Nexus Supply Co', 'Wilds Foragers',
    'Athenaeum Imports', 'Studio Crafters', 'Commons Collective',
    'Gardens Growers', 'Arena Smiths', 'Wandering Merchants', 'Deep Forest Traders'
  ];

  var NPC_SKU_NAMES = [
    'Iron Ingot', 'Oak Plank', 'Healing Herb', 'Crystal Shard',
    'Leather Strip', 'Cotton Bolt', 'Mystic Dust', 'Stone Block',
    'Candle Wax', 'Rope Coil', 'Copper Ore', 'Silver Thread',
    'Clay Pot', 'Wheat Bundle', 'Dye Powder'
  ];

  var NPC_CATEGORIES = ['raw_material', 'component', 'finished_good', 'consumable'];

  var _tickCount = 0;

  function simulateTick(state, seed) {
    if (!state) { return state; }
    _tickCount++;
    var rng = mulberry32(seed !== undefined ? seed : (_tickCount * 6271 + Date.now()));
    var s = state;
    var whIds = objectKeys(s.warehouses);
    var skuIds = objectKeys(s.skus);

    // Ensure at least one warehouse exists
    if (whIds.length === 0) {
      var whResult = createWarehouse(s, {
        name: 'Main Warehouse',
        zone: 'agora',
        cost_method: 'fifo'
      });
      s = whResult.state;
      whIds = objectKeys(s.warehouses);
    }

    // Occasionally create a new SKU
    if (rng() < 0.2 || skuIds.length === 0) {
      var skuName = NPC_SKU_NAMES[Math.floor(rng() * NPC_SKU_NAMES.length)];
      var cat = NPC_CATEGORIES[Math.floor(rng() * NPC_CATEGORIES.length)];
      var skuRes = createSku(s, {
        name: skuName + ' #' + _tickCount,
        category: cat,
        unit_cost: Math.round(rng() * 50) + 1,
        reorder_point: Math.floor(rng() * 20) + 5,
        reorder_qty: Math.floor(rng() * 50) + 10
      });
      s = skuRes.state;
      skuIds = objectKeys(s.skus);
    }

    // Receive stock into a random warehouse
    if (rng() < 0.7 && skuIds.length > 0) {
      var rSkuId = skuIds[Math.floor(rng() * skuIds.length)];
      var rWhId = whIds[Math.floor(rng() * whIds.length)];
      var rcvResult = recordMovement(s, {
        type: 'receive',
        skuId: rSkuId,
        warehouseId: rWhId,
        qty: Math.floor(rng() * 100) + 10,
        unit_cost: (s.skus[rSkuId] ? s.skus[rSkuId].unit_cost : 1) * (0.9 + rng() * 0.2),
        by: 'npc_merchant'
      });
      if (!rcvResult.error) { s = rcvResult.state; }
    }

    // Ship stock from a random warehouse
    if (rng() < 0.5 && skuIds.length > 0) {
      var sSkuId = skuIds[Math.floor(rng() * skuIds.length)];
      var sWhId = whIds[Math.floor(rng() * whIds.length)];
      var swh = s.warehouses[sWhId];
      if (swh && swh.stock && swh.stock[sSkuId] && swh.stock[sSkuId].qty > 0) {
        var shipQty = Math.min(Math.floor(rng() * 20) + 1, swh.stock[sSkuId].qty);
        var shipResult = recordMovement(s, {
          type: 'ship',
          skuId: sSkuId,
          warehouseId: sWhId,
          qty: shipQty,
          by: 'npc_merchant'
        });
        if (!shipResult.error) { s = shipResult.state; }
      }
    }

    // Occasionally add a supplier
    if (rng() < 0.15) {
      var supName = NPC_SUPPLIER_NAMES[Math.floor(rng() * NPC_SUPPLIER_NAMES.length)];
      var supResult = registerSupplier(s, {
        name: supName,
        lead_time_days: Math.floor(rng() * 14) + 1,
        reliability_score: Math.floor(rng() * 30) + 70
      });
      s = supResult.state;
    }

    return s;
  }

  // ============================================================
  // applyAction — main dispatch (protocol message API)
  // ============================================================

  function applyAction(state, msg) {
    var payload = msg.payload || msg;
    var action = payload.action;
    var data = payload.data || {};
    var from = msg.from || payload.from || 'system';

    if (!state._inv_version) {
      state = initState(state);
    }

    switch (action) {
      // SKU
      case 'create_sku': {
        var r = createSku(state, mergeBy(data, from));
        return r.state;
      }
      case 'update_sku':
        return updateSku(state, data.id, data);
      case 'deactivate_sku':
        return deactivateSku(state, data.id);

      // Warehouse
      case 'create_warehouse': {
        var whr = createWarehouse(state, mergeBy(data, from));
        return whr.state;
      }
      case 'update_warehouse':
        return updateWarehouse(state, data.id, data);

      // Movements
      case 'receive_stock': {
        var recR = recordMovement(state, mergeBy(mergeType(data, 'receive'), from));
        return recR.error ? state : recR.state;
      }
      case 'ship_stock': {
        var shipR = recordMovement(state, mergeBy(mergeType(data, 'ship'), from));
        return shipR.error ? state : shipR.state;
      }
      case 'adjust_stock': {
        var adjR = recordMovement(state, mergeBy(mergeType(data, 'adjust'), from));
        return adjR.error ? state : adjR.state;
      }
      case 'transfer_stock': {
        var trnR = recordMovement(state, mergeBy(mergeType(data, 'transfer'), from));
        return trnR.error ? state : trnR.state;
      }
      case 'write_off_stock': {
        var woR = recordMovement(state, mergeBy(mergeType(data, 'write_off'), from));
        return woR.error ? state : woR.state;
      }
      case 'record_movement': {
        var movR = recordMovement(state, mergeBy(data, from));
        return movR.error ? state : movR.state;
      }

      // Suppliers
      case 'register_supplier': {
        var supR = registerSupplier(state, mergeBy(data, from));
        return supR.state;
      }
      case 'update_supplier':
        return updateSupplier(state, data.id, data);
      case 'update_supplier_catalog':
        return updateSupplierCatalog(state, data.supplierId, data.skuId, data);
      case 'rate_supplier':
        return rateSupplier(state, data.supplierId, data);

      // Purchase Orders
      case 'create_po': {
        var poR = createPurchaseOrder(state, mergeBy(data, from));
        return poR.error ? state : poR.state;
      }
      case 'update_po':
        return updatePurchaseOrder(state, data.id, data);
      case 'submit_po': {
        var subR = submitPurchaseOrder(state, data.id);
        return subR.error ? state : subR;
      }
      case 'approve_po': {
        var appR = approvePurchaseOrder(state, data.id, from);
        return appR.error ? state : appR;
      }
      case 'order_po': {
        var ordR = orderPurchaseOrder(state, data.id);
        return ordR.error ? state : ordR;
      }
      case 'cancel_po': {
        var canR = cancelPurchaseOrder(state, data.id, data.reason);
        return canR.error ? state : canR;
      }
      case 'receive_po': {
        var rcvPoR = receivePurchaseOrder(state, data.id, data);
        return rcvPoR.error ? state : rcvPoR.state;
      }

      // Alerts
      case 'resolve_alert':
        return resolveAlert(state, data.id);

      // Tick
      case 'simulate_tick':
        return simulateTick(state, data.seed);

      default:
        // Unknown action: log to molt log but return state unchanged
        return molt(state, 'Unknown action: ' + action);
    }
  }

  function mergeBy(data, from) {
    var out = {};
    for (var k in data) {
      if (data.hasOwnProperty(k)) { out[k] = data[k]; }
    }
    if (!out.by && !out.createdBy) { out.createdBy = from; }
    return out;
  }

  function mergeType(data, type) {
    var out = {};
    for (var k in data) {
      if (data.hasOwnProperty(k)) { out[k] = data[k]; }
    }
    if (!out.type) { out.type = type; }
    return out;
  }

  // ============================================================
  // getState — return a safe copy (no mutations)
  // ============================================================

  function getState(state) {
    return clone(state);
  }

  // ============================================================
  // Public API
  // ============================================================

  exports.initState              = initState;
  exports.applyAction            = applyAction;
  exports.getState               = getState;

  // SKU
  exports.createSku              = createSku;
  exports.updateSku              = updateSku;
  exports.deactivateSku          = deactivateSku;

  // Warehouse
  exports.createWarehouse        = createWarehouse;
  exports.updateWarehouse        = updateWarehouse;

  // Movements
  exports.recordMovement         = recordMovement;

  // Supplier
  exports.registerSupplier       = registerSupplier;
  exports.updateSupplier         = updateSupplier;
  exports.updateSupplierCatalog  = updateSupplierCatalog;
  exports.rateSupplier           = rateSupplier;

  // Purchase Orders
  exports.createPurchaseOrder    = createPurchaseOrder;
  exports.updatePurchaseOrder    = updatePurchaseOrder;
  exports.submitPurchaseOrder    = submitPurchaseOrder;
  exports.approvePurchaseOrder   = approvePurchaseOrder;
  exports.orderPurchaseOrder     = orderPurchaseOrder;
  exports.cancelPurchaseOrder    = cancelPurchaseOrder;
  exports.receivePurchaseOrder   = receivePurchaseOrder;

  // Valuation & Queries
  exports.getStockValuation      = getStockValuation;
  exports.getAverageCost         = getAverageCost;
  exports.getMovementHistory     = getMovementHistory;
  exports.getLowStockAlerts      = getLowStockAlerts;
  exports.getSkuStock            = getSkuStock;
  exports.getOpenPurchaseOrders  = getOpenPurchaseOrders;
  exports.getTotalQty            = getTotalQty;
  exports.getMetrics             = getMetrics;

  // Alerts
  exports.resolveAlert           = resolveAlert;

  // Simulation
  exports.simulateTick           = simulateTick;

  // Constants (for tests / external inspection)
  exports.MOVEMENT_TYPES         = MOVEMENT_TYPES;
  exports.PO_STATUSES            = PO_STATUSES;
  exports.COST_METHODS           = COST_METHODS;
  exports.SKU_CATEGORIES         = SKU_CATEGORIES;

})(typeof module !== 'undefined' ? module.exports : (window.SimInventory = {}));
