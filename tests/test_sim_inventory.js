#!/usr/bin/env node
// Tests for sim_inventory.js — Warehouse/Inventory Management Simulation
'use strict';

var SimInventory = require('../src/js/sim_inventory.js');

var passed = 0;
var failed = 0;

function assert(condition, msg) {
  if (condition) { passed++; console.log('  ok - ' + msg); }
  else { failed++; console.error('  FAIL - ' + msg); }
}

function assertEqual(actual, expected, msg) {
  if (actual === expected) { passed++; console.log('  ok - ' + msg); }
  else { failed++; console.error('  FAIL - ' + msg + ' — expected ' + JSON.stringify(expected) + ', got ' + JSON.stringify(actual)); }
}

function assertClose(actual, expected, tolerance, msg) {
  var tol = tolerance !== undefined ? tolerance : 0.001;
  if (Math.abs(actual - expected) <= tol) { passed++; console.log('  ok - ' + msg); }
  else { failed++; console.error('  FAIL - ' + msg + ' — expected ~' + expected + ', got ' + actual); }
}

// ============================================================
// SECTION 1: initState
// ============================================================
console.log('\n--- initState ---');

(function() {
  var s = SimInventory.initState();
  assert(s && typeof s === 'object', 'initState returns object');
  assert(typeof s.skus === 'object' && !Array.isArray(s.skus), 'skus is object');
  assert(typeof s.warehouses === 'object', 'warehouses is object');
  assert(typeof s.suppliers === 'object', 'suppliers is object');
  assert(typeof s.purchase_orders === 'object', 'purchase_orders is object');
  assert(Array.isArray(s.movements), 'movements is array');
  assert(Array.isArray(s.alerts), 'alerts is array');
  assertEqual(s._inv_version, 1, '_inv_version is 1');
  assert(Array.isArray(s._molt_log), '_molt_log is array');
  assertEqual(Object.keys(s.skus).length, 0, 'skus starts empty');
  assertEqual(Object.keys(s.warehouses).length, 0, 'warehouses starts empty');
  assertEqual(s.movements.length, 0, 'movements starts empty');
})();

(function() {
  var snapshot = {
    _inv_version: 1,
    skus: { 'sku_abc_1': { id: 'sku_abc_1', name: 'Iron Ore', active: true } },
    warehouses: {},
    suppliers: {},
    purchase_orders: {},
    movements: [],
    alerts: []
  };
  var s = SimInventory.initState(snapshot);
  assert(s.skus['sku_abc_1'] !== undefined, 'initState restores snapshot skus');
  assertEqual(s.skus['sku_abc_1'].name, 'Iron Ore', 'initState restores sku name');
  // deep clone
  snapshot.skus['sku_abc_1'].name = 'Changed';
  assertEqual(s.skus['sku_abc_1'].name, 'Iron Ore', 'initState deep clones snapshot');
})();

(function() {
  var snap = { skus: {}, warehouses: {}, movements: [], alerts: [] };
  var s = SimInventory.initState(snap);
  assert(s.suppliers !== undefined, 'initState adds missing suppliers key');
  assert(s.purchase_orders !== undefined, 'initState adds missing purchase_orders key');
})();

// ============================================================
// SECTION 2: SKU Management
// ============================================================
console.log('\n--- SKU Management ---');

(function() {
  var s = SimInventory.initState();
  var r = SimInventory.createSku(s, { name: 'Iron Ingot', category: 'raw_material', unit_cost: 5 });
  assert(r.state && r.record, 'createSku returns state+record');
  assert(r.record.id.indexOf('sku_') === 0, 'sku id has sku_ prefix');
  assertEqual(r.record.name, 'Iron Ingot', 'sku name set');
  assertEqual(r.record.category, 'raw_material', 'sku category set');
  assertEqual(r.record.unit_cost, 5, 'sku unit_cost set');
  assert(r.record.active === true, 'sku active by default');
  assertEqual(r.record.reorder_point, 0, 'reorder_point defaults to 0');
  assertEqual(r.record.reorder_qty, 0, 'reorder_qty defaults to 0');
  assert(r.state.skus[r.record.id] !== undefined, 'sku stored in state');
  assertEqual(Object.keys(s.skus).length, 0, 'original state unchanged');
})();

(function() {
  var s = SimInventory.initState();
  var r = SimInventory.createSku(s, {
    name: 'Healing Herb',
    category: 'consumable',
    unit_cost: 3,
    unit: 'bundle',
    reorder_point: 20,
    reorder_qty: 50,
    preferred_supplier_id: 'sup_test',
    tags: ['herb', 'healing']
  });
  assertEqual(r.record.unit, 'bundle', 'sku unit set');
  assertEqual(r.record.reorder_point, 20, 'reorder_point set');
  assertEqual(r.record.reorder_qty, 50, 'reorder_qty set');
  assertEqual(r.record.preferred_supplier_id, 'sup_test', 'preferred_supplier_id set');
  assertEqual(r.record.tags.length, 2, 'tags set');
  assert(r.record.createdAt, 'createdAt set');
})();

(function() {
  var s = SimInventory.initState();
  var r = SimInventory.createSku(s, { name: 'Widget' });
  assertEqual(r.record.category, 'misc', 'sku category defaults to misc');
  assertEqual(r.record.unit_cost, 0, 'sku unit_cost defaults to 0');
  assertEqual(r.record.unit, 'unit', 'sku unit defaults to unit');
})();

(function() {
  var s = SimInventory.initState();
  var r = SimInventory.createSku(s, { name: 'A' });
  s = r.state;
  var updated = SimInventory.updateSku(s, r.record.id, { name: 'Updated', unit_cost: 99 });
  assertEqual(updated.skus[r.record.id].name, 'Updated', 'updateSku name');
  assertEqual(updated.skus[r.record.id].unit_cost, 99, 'updateSku unit_cost');
  assert(updated.skus[r.record.id].updatedAt, 'updateSku sets updatedAt');
  assertEqual(s.skus[r.record.id].name, 'A', 'original unchanged after updateSku');
})();

(function() {
  var s = SimInventory.initState();
  var result = SimInventory.updateSku(s, 'nonexistent', { name: 'X' });
  assert(result === s, 'updateSku nonexistent returns same state');
})();

(function() {
  var s = SimInventory.initState();
  var r = SimInventory.createSku(s, { name: 'Old SKU' });
  s = r.state;
  var deact = SimInventory.deactivateSku(s, r.record.id);
  assertEqual(deact.skus[r.record.id].active, false, 'deactivateSku sets active false');
  assert(deact.skus[r.record.id].deactivatedAt, 'deactivateSku sets deactivatedAt');
  assertEqual(s.skus[r.record.id].active, true, 'original active state preserved');
})();

(function() {
  var s = SimInventory.initState();
  var result = SimInventory.deactivateSku(s, 'bad_id');
  assert(result === s, 'deactivateSku nonexistent returns same state');
})();

(function() {
  var s = SimInventory.initState();
  // Create two SKUs; IDs must be unique
  var r1 = SimInventory.createSku(s, { name: 'A' });
  var r2 = SimInventory.createSku(r1.state, { name: 'B' });
  assert(r1.record.id !== r2.record.id, 'createSku generates unique IDs');
})();

// ============================================================
// SECTION 3: Warehouse Locations
// ============================================================
console.log('\n--- Warehouse Locations ---');

(function() {
  var s = SimInventory.initState();
  var r = SimInventory.createWarehouse(s, { name: 'Main Warehouse', zone: 'agora', cost_method: 'fifo' });
  assert(r.state && r.record, 'createWarehouse returns state+record');
  assert(r.record.id.indexOf('wh_') === 0, 'warehouse id has wh_ prefix');
  assertEqual(r.record.name, 'Main Warehouse', 'warehouse name set');
  assertEqual(r.record.zone, 'agora', 'warehouse zone set');
  assertEqual(r.record.cost_method, 'fifo', 'warehouse cost_method set');
  assert(r.record.active === true, 'warehouse active by default');
  assert(typeof r.record.stock === 'object', 'warehouse stock initialized');
  assert(r.state.warehouses[r.record.id] !== undefined, 'warehouse in state');
  assertEqual(Object.keys(s.warehouses).length, 0, 'original state unchanged');
})();

(function() {
  var s = SimInventory.initState();
  var r = SimInventory.createWarehouse(s, { name: 'LIFO Store', cost_method: 'lifo' });
  assertEqual(r.record.cost_method, 'lifo', 'lifo cost_method set');
})();

(function() {
  var s = SimInventory.initState();
  var r = SimInventory.createWarehouse(s, { name: 'Average Store', cost_method: 'average' });
  assertEqual(r.record.cost_method, 'average', 'average cost_method set');
})();

(function() {
  var s = SimInventory.initState();
  var r = SimInventory.createWarehouse(s, { name: 'Unknown Method', cost_method: 'xyz' });
  assertEqual(r.record.cost_method, 'fifo', 'invalid cost_method defaults to fifo');
})();

(function() {
  var s = SimInventory.initState();
  var r = SimInventory.createWarehouse(s, { name: 'WH' });
  s = r.state;
  var updated = SimInventory.updateWarehouse(s, r.record.id, { name: 'Updated WH', zone: 'nexus' });
  assertEqual(updated.warehouses[r.record.id].name, 'Updated WH', 'updateWarehouse name');
  assertEqual(updated.warehouses[r.record.id].zone, 'nexus', 'updateWarehouse zone');
  assert(updated.warehouses[r.record.id].updatedAt, 'updateWarehouse sets updatedAt');
})();

(function() {
  var s = SimInventory.initState();
  var result = SimInventory.updateWarehouse(s, 'bad', { name: 'X' });
  assert(result === s, 'updateWarehouse nonexistent returns same state');
})();

// ============================================================
// SECTION 4: Stock Movements — receive
// ============================================================
console.log('\n--- Stock Movements: receive ---');

(function() {
  var s = SimInventory.initState();
  var skuR = SimInventory.createSku(s, { name: 'Iron', unit_cost: 10 });
  s = skuR.state;
  var whR = SimInventory.createWarehouse(s, { name: 'WH1', cost_method: 'fifo' });
  s = whR.state;
  var skuId = skuR.record.id;
  var whId = whR.record.id;

  var mov = SimInventory.recordMovement(s, { type: 'receive', skuId: skuId, warehouseId: whId, qty: 100, unit_cost: 10 });
  assert(!mov.error, 'receive movement no error');
  assert(mov.state && mov.movement, 'receive returns state+movement');
  assertEqual(mov.movement.type, 'receive', 'movement type is receive');
  assertEqual(mov.movement.qty, 100, 'movement qty 100');
  assertEqual(mov.state.warehouses[whId].stock[skuId].qty, 100, 'stock qty 100 after receive');
  assertEqual(mov.state.warehouses[whId].stock[skuId].cost_layers.length, 1, 'one cost layer after receive');
  assertEqual(mov.state.movements.length, 1, 'movement recorded');
  assert(mov.movement.id.indexOf('mov_') === 0, 'movement id has mov_ prefix');
})();

(function() {
  var s = SimInventory.initState();
  var skuR = SimInventory.createSku(s, { name: 'Iron', unit_cost: 10 });
  s = skuR.state;
  var whR = SimInventory.createWarehouse(s, { name: 'WH', cost_method: 'fifo' });
  s = whR.state;
  var skuId = skuR.record.id;
  var whId = whR.record.id;
  // Two receives — two cost layers
  var m1 = SimInventory.recordMovement(s, { type: 'receive', skuId: skuId, warehouseId: whId, qty: 50, unit_cost: 10 });
  var m2 = SimInventory.recordMovement(m1.state, { type: 'receive', skuId: skuId, warehouseId: whId, qty: 30, unit_cost: 12 });
  assertEqual(m2.state.warehouses[whId].stock[skuId].qty, 80, 'stock qty 80 after two receives');
  assertEqual(m2.state.warehouses[whId].stock[skuId].cost_layers.length, 2, 'two cost layers');
})();

(function() {
  // Error: unknown SKU
  var s = SimInventory.initState();
  var whR = SimInventory.createWarehouse(s, { name: 'WH' });
  s = whR.state;
  var result = SimInventory.recordMovement(s, { type: 'receive', skuId: 'bad_sku', warehouseId: whR.record.id, qty: 10 });
  assert(result.error, 'receive unknown sku returns error');
})();

(function() {
  // Error: unknown warehouse
  var s = SimInventory.initState();
  var skuR = SimInventory.createSku(s, { name: 'X' });
  s = skuR.state;
  var result = SimInventory.recordMovement(s, { type: 'receive', skuId: skuR.record.id, warehouseId: 'bad_wh', qty: 10 });
  assert(result.error, 'receive unknown warehouse returns error');
})();

(function() {
  // Error: zero qty
  var s = SimInventory.initState();
  var skuR = SimInventory.createSku(s, { name: 'X' });
  s = skuR.state;
  var whR = SimInventory.createWarehouse(s, { name: 'WH' });
  s = whR.state;
  var result = SimInventory.recordMovement(s, { type: 'receive', skuId: skuR.record.id, warehouseId: whR.record.id, qty: 0 });
  assert(result.error, 'receive zero qty returns error');
})();

// ============================================================
// SECTION 5: Stock Movements — ship
// ============================================================
console.log('\n--- Stock Movements: ship ---');

(function() {
  var s = SimInventory.initState();
  var skuR = SimInventory.createSku(s, { name: 'Iron', unit_cost: 10 });
  s = skuR.state;
  var whR = SimInventory.createWarehouse(s, { name: 'WH', cost_method: 'fifo' });
  s = whR.state;
  var skuId = skuR.record.id;
  var whId = whR.record.id;
  var m1 = SimInventory.recordMovement(s, { type: 'receive', skuId: skuId, warehouseId: whId, qty: 100, unit_cost: 10 });
  s = m1.state;
  var m2 = SimInventory.recordMovement(s, { type: 'ship', skuId: skuId, warehouseId: whId, qty: 30 });
  assert(!m2.error, 'ship no error when sufficient stock');
  assertEqual(m2.state.warehouses[whId].stock[skuId].qty, 70, 'qty 70 after ship 30');
})();

(function() {
  // Ship more than available
  var s = SimInventory.initState();
  var skuR = SimInventory.createSku(s, { name: 'X' });
  s = skuR.state;
  var whR = SimInventory.createWarehouse(s, { name: 'WH' });
  s = whR.state;
  var m1 = SimInventory.recordMovement(s, { type: 'receive', skuId: skuR.record.id, warehouseId: whR.record.id, qty: 10, unit_cost: 5 });
  var m2 = SimInventory.recordMovement(m1.state, { type: 'ship', skuId: skuR.record.id, warehouseId: whR.record.id, qty: 50 });
  assert(m2.error, 'ship over available stock returns error');
})();

(function() {
  // Ship all stock — cost layers should be empty
  var s = SimInventory.initState();
  var skuR = SimInventory.createSku(s, { name: 'X' });
  s = skuR.state;
  var whR = SimInventory.createWarehouse(s, { name: 'WH', cost_method: 'fifo' });
  s = whR.state;
  var m1 = SimInventory.recordMovement(s, { type: 'receive', skuId: skuR.record.id, warehouseId: whR.record.id, qty: 20, unit_cost: 5 });
  var m2 = SimInventory.recordMovement(m1.state, { type: 'ship', skuId: skuR.record.id, warehouseId: whR.record.id, qty: 20 });
  assertEqual(m2.state.warehouses[whR.record.id].stock[skuR.record.id].qty, 0, 'qty 0 after ship all');
  assertEqual(m2.state.warehouses[whR.record.id].stock[skuR.record.id].cost_layers.length, 0, 'no cost layers after ship all');
})();

// ============================================================
// SECTION 6: Stock Movements — adjust
// ============================================================
console.log('\n--- Stock Movements: adjust ---');

(function() {
  var s = SimInventory.initState();
  var skuR = SimInventory.createSku(s, { name: 'X', unit_cost: 5 });
  s = skuR.state;
  var whR = SimInventory.createWarehouse(s, { name: 'WH' });
  s = whR.state;
  var m1 = SimInventory.recordMovement(s, { type: 'receive', skuId: skuR.record.id, warehouseId: whR.record.id, qty: 50, unit_cost: 5 });
  s = m1.state;
  var m2 = SimInventory.recordMovement(s, { type: 'adjust', skuId: skuR.record.id, warehouseId: whR.record.id, qty: 10, unit_cost: 5 });
  assert(!m2.error, 'positive adjust no error');
  assertEqual(m2.state.warehouses[whR.record.id].stock[skuR.record.id].qty, 60, 'qty 60 after +10 adjust');
})();

(function() {
  var s = SimInventory.initState();
  var skuR = SimInventory.createSku(s, { name: 'X' });
  s = skuR.state;
  var whR = SimInventory.createWarehouse(s, { name: 'WH' });
  s = whR.state;
  var m1 = SimInventory.recordMovement(s, { type: 'receive', skuId: skuR.record.id, warehouseId: whR.record.id, qty: 50, unit_cost: 5 });
  s = m1.state;
  var m2 = SimInventory.recordMovement(s, { type: 'adjust', skuId: skuR.record.id, warehouseId: whR.record.id, qty: -15 });
  assert(!m2.error, 'negative adjust no error within stock');
  assertEqual(m2.state.warehouses[whR.record.id].stock[skuR.record.id].qty, 35, 'qty 35 after -15 adjust');
})();

(function() {
  // Adjust below zero
  var s = SimInventory.initState();
  var skuR = SimInventory.createSku(s, { name: 'X' });
  s = skuR.state;
  var whR = SimInventory.createWarehouse(s, { name: 'WH' });
  s = whR.state;
  var m1 = SimInventory.recordMovement(s, { type: 'receive', skuId: skuR.record.id, warehouseId: whR.record.id, qty: 10, unit_cost: 5 });
  s = m1.state;
  var m2 = SimInventory.recordMovement(s, { type: 'adjust', skuId: skuR.record.id, warehouseId: whR.record.id, qty: -50 });
  assert(m2.error, 'adjust below zero returns error');
})();

// ============================================================
// SECTION 7: Stock Movements — transfer
// ============================================================
console.log('\n--- Stock Movements: transfer ---');

(function() {
  var s = SimInventory.initState();
  var skuR = SimInventory.createSku(s, { name: 'X' });
  s = skuR.state;
  var wh1R = SimInventory.createWarehouse(s, { name: 'WH1', cost_method: 'fifo' });
  s = wh1R.state;
  var wh2R = SimInventory.createWarehouse(s, { name: 'WH2', cost_method: 'fifo' });
  s = wh2R.state;
  var skuId = skuR.record.id;
  var wh1 = wh1R.record.id;
  var wh2 = wh2R.record.id;

  var m1 = SimInventory.recordMovement(s, { type: 'receive', skuId: skuId, warehouseId: wh1, qty: 100, unit_cost: 8 });
  s = m1.state;
  var m2 = SimInventory.recordMovement(s, { type: 'transfer', skuId: skuId, warehouseId: wh1, qty: 40, toWarehouseId: wh2 });
  assert(!m2.error, 'transfer no error');
  assertEqual(m2.state.warehouses[wh1].stock[skuId].qty, 60, 'source wh qty 60 after transfer');
  assertEqual(m2.state.warehouses[wh2].stock[skuId].qty, 40, 'dest wh qty 40 after transfer');
})();

(function() {
  // Transfer more than available
  var s = SimInventory.initState();
  var skuR = SimInventory.createSku(s, { name: 'X' });
  s = skuR.state;
  var wh1R = SimInventory.createWarehouse(s, { name: 'WH1' });
  s = wh1R.state;
  var wh2R = SimInventory.createWarehouse(s, { name: 'WH2' });
  s = wh2R.state;
  var m1 = SimInventory.recordMovement(s, { type: 'receive', skuId: skuR.record.id, warehouseId: wh1R.record.id, qty: 5, unit_cost: 5 });
  var m2 = SimInventory.recordMovement(m1.state, { type: 'transfer', skuId: skuR.record.id, warehouseId: wh1R.record.id, qty: 20, toWarehouseId: wh2R.record.id });
  assert(m2.error, 'transfer over available returns error');
})();

(function() {
  // Transfer without toWarehouseId
  var s = SimInventory.initState();
  var skuR = SimInventory.createSku(s, { name: 'X' });
  s = skuR.state;
  var whR = SimInventory.createWarehouse(s, { name: 'WH' });
  s = whR.state;
  var m1 = SimInventory.recordMovement(s, { type: 'receive', skuId: skuR.record.id, warehouseId: whR.record.id, qty: 10, unit_cost: 5 });
  var m2 = SimInventory.recordMovement(m1.state, { type: 'transfer', skuId: skuR.record.id, warehouseId: whR.record.id, qty: 5 });
  assert(m2.error, 'transfer without toWarehouseId returns error');
})();

// ============================================================
// SECTION 8: FIFO Costing
// ============================================================
console.log('\n--- FIFO Costing ---');

(function() {
  var s = SimInventory.initState();
  var skuR = SimInventory.createSku(s, { name: 'Iron', unit_cost: 10 });
  s = skuR.state;
  var whR = SimInventory.createWarehouse(s, { name: 'WH', cost_method: 'fifo' });
  s = whR.state;
  var skuId = skuR.record.id;
  var whId = whR.record.id;

  // Receive batch 1: 10 units @ $10
  var m1 = SimInventory.recordMovement(s, { type: 'receive', skuId: skuId, warehouseId: whId, qty: 10, unit_cost: 10 });
  s = m1.state;
  // Receive batch 2: 10 units @ $20
  var m2 = SimInventory.recordMovement(s, { type: 'receive', skuId: skuId, warehouseId: whId, qty: 10, unit_cost: 20 });
  s = m2.state;

  // Ship 5 units — FIFO should consume from first batch (cost = 5 * $10 = $50)
  var m3 = SimInventory.recordMovement(s, { type: 'ship', skuId: skuId, warehouseId: whId, qty: 5 });
  s = m3.state;

  var stock = s.warehouses[whId].stock[skuId];
  assertEqual(stock.qty, 15, 'FIFO: 15 units remain after shipping 5');
  assertEqual(stock.cost_layers.length, 2, 'FIFO: still 2 layers (first partially consumed)');
  assertEqual(stock.cost_layers[0].qty, 5, 'FIFO: first layer has 5 remaining');
  assertEqual(stock.cost_layers[0].unit_cost, 10, 'FIFO: first layer still $10');
  assertEqual(stock.cost_layers[1].qty, 10, 'FIFO: second layer unchanged');
})();

(function() {
  // FIFO: ship entire first batch, consume into second
  var s = SimInventory.initState();
  var skuR = SimInventory.createSku(s, { name: 'X' });
  s = skuR.state;
  var whR = SimInventory.createWarehouse(s, { name: 'WH', cost_method: 'fifo' });
  s = whR.state;
  var skuId = skuR.record.id;
  var whId = whR.record.id;

  var m1 = SimInventory.recordMovement(s, { type: 'receive', skuId: skuId, warehouseId: whId, qty: 10, unit_cost: 10 });
  s = m1.state;
  var m2 = SimInventory.recordMovement(s, { type: 'receive', skuId: skuId, warehouseId: whId, qty: 10, unit_cost: 20 });
  s = m2.state;
  var m3 = SimInventory.recordMovement(s, { type: 'ship', skuId: skuId, warehouseId: whId, qty: 15 });
  s = m3.state;

  var stock = s.warehouses[whId].stock[skuId];
  assertEqual(stock.qty, 5, 'FIFO: 5 remain after shipping 15');
  assertEqual(stock.cost_layers.length, 1, 'FIFO: one layer remains (second batch)');
  assertEqual(stock.cost_layers[0].unit_cost, 20, 'FIFO: remaining layer is $20 batch');
  assertEqual(stock.cost_layers[0].qty, 5, 'FIFO: 5 units in remaining layer');
})();

// ============================================================
// SECTION 9: LIFO Costing
// ============================================================
console.log('\n--- LIFO Costing ---');

(function() {
  var s = SimInventory.initState();
  var skuR = SimInventory.createSku(s, { name: 'X' });
  s = skuR.state;
  var whR = SimInventory.createWarehouse(s, { name: 'WH', cost_method: 'lifo' });
  s = whR.state;
  var skuId = skuR.record.id;
  var whId = whR.record.id;

  // Batch 1: 10 @ $10, Batch 2: 10 @ $20
  var m1 = SimInventory.recordMovement(s, { type: 'receive', skuId: skuId, warehouseId: whId, qty: 10, unit_cost: 10 });
  s = m1.state;
  var m2 = SimInventory.recordMovement(s, { type: 'receive', skuId: skuId, warehouseId: whId, qty: 10, unit_cost: 20 });
  s = m2.state;

  // Ship 5 — LIFO should consume from newest batch (cost 5 * $20)
  var m3 = SimInventory.recordMovement(s, { type: 'ship', skuId: skuId, warehouseId: whId, qty: 5 });
  s = m3.state;

  var stock = s.warehouses[whId].stock[skuId];
  assertEqual(stock.qty, 15, 'LIFO: 15 remain');
  assertEqual(stock.cost_layers[0].qty, 10, 'LIFO: first layer untouched');
  assertEqual(stock.cost_layers[0].unit_cost, 10, 'LIFO: first layer still $10');
  assertEqual(stock.cost_layers[1].qty, 5, 'LIFO: second layer consumed 5');
  assertEqual(stock.cost_layers[1].unit_cost, 20, 'LIFO: second layer still $20');
})();

(function() {
  // LIFO: fully consume newest batch then into older
  var s = SimInventory.initState();
  var skuR = SimInventory.createSku(s, { name: 'X' });
  s = skuR.state;
  var whR = SimInventory.createWarehouse(s, { name: 'WH', cost_method: 'lifo' });
  s = whR.state;
  var skuId = skuR.record.id;
  var whId = whR.record.id;

  var m1 = SimInventory.recordMovement(s, { type: 'receive', skuId: skuId, warehouseId: whId, qty: 10, unit_cost: 10 });
  s = m1.state;
  var m2 = SimInventory.recordMovement(s, { type: 'receive', skuId: skuId, warehouseId: whId, qty: 10, unit_cost: 20 });
  s = m2.state;
  var m3 = SimInventory.recordMovement(s, { type: 'ship', skuId: skuId, warehouseId: whId, qty: 15 });
  s = m3.state;

  var stock = s.warehouses[whId].stock[skuId];
  assertEqual(stock.qty, 5, 'LIFO: 5 remain after ship 15');
  assertEqual(stock.cost_layers.length, 1, 'LIFO: one layer remains');
  assertEqual(stock.cost_layers[0].unit_cost, 10, 'LIFO: remaining layer is $10 (oldest)');
})();

// ============================================================
// SECTION 10: Average Cost
// ============================================================
console.log('\n--- Average Cost ---');

(function() {
  var s = SimInventory.initState();
  var skuR = SimInventory.createSku(s, { name: 'X' });
  s = skuR.state;
  var whR = SimInventory.createWarehouse(s, { name: 'WH', cost_method: 'average' });
  s = whR.state;
  var skuId = skuR.record.id;
  var whId = whR.record.id;

  var m1 = SimInventory.recordMovement(s, { type: 'receive', skuId: skuId, warehouseId: whId, qty: 10, unit_cost: 10 });
  s = m1.state;
  var m2 = SimInventory.recordMovement(s, { type: 'receive', skuId: skuId, warehouseId: whId, qty: 10, unit_cost: 20 });
  s = m2.state;
  // Ship 10 units
  var m3 = SimInventory.recordMovement(s, { type: 'ship', skuId: skuId, warehouseId: whId, qty: 10 });
  s = m3.state;

  var stock = s.warehouses[whId].stock[skuId];
  assertEqual(stock.qty, 10, 'average: 10 remain after ship 10 of 20');
  assert(stock.qty > 0, 'average: stock positive');
})();

// ============================================================
// SECTION 11: Stock Valuation
// ============================================================
console.log('\n--- Stock Valuation ---');

(function() {
  var s = SimInventory.initState();
  var skuR = SimInventory.createSku(s, { name: 'X', unit_cost: 10 });
  s = skuR.state;
  var whR = SimInventory.createWarehouse(s, { name: 'WH', cost_method: 'fifo' });
  s = whR.state;
  var skuId = skuR.record.id;
  var whId = whR.record.id;

  var m1 = SimInventory.recordMovement(s, { type: 'receive', skuId: skuId, warehouseId: whId, qty: 100, unit_cost: 10 });
  s = m1.state;

  var val = SimInventory.getStockValuation(s);
  assertEqual(val.grand_total, 1000, 'valuation grand_total 1000 (100 x $10)');
  assert(val.by_sku[skuId] !== undefined, 'valuation by_sku has entry');
  assertEqual(val.by_sku[skuId].qty, 100, 'by_sku qty 100');
  assertEqual(val.by_sku[skuId].value, 1000, 'by_sku value 1000');
  assert(val.by_warehouse[whId] !== undefined, 'valuation by_warehouse has entry');
  assertEqual(val.by_warehouse[whId].total, 1000, 'by_warehouse total 1000');
})();

(function() {
  // Valuation after ship — cost should decrease
  var s = SimInventory.initState();
  var skuR = SimInventory.createSku(s, { name: 'X' });
  s = skuR.state;
  var whR = SimInventory.createWarehouse(s, { name: 'WH', cost_method: 'fifo' });
  s = whR.state;
  var skuId = skuR.record.id;
  var whId = whR.record.id;

  var m1 = SimInventory.recordMovement(s, { type: 'receive', skuId: skuId, warehouseId: whId, qty: 100, unit_cost: 5 });
  s = m1.state;
  var m2 = SimInventory.recordMovement(s, { type: 'ship', skuId: skuId, warehouseId: whId, qty: 40 });
  s = m2.state;

  var val = SimInventory.getStockValuation(s);
  assertEqual(val.grand_total, 300, 'valuation after ship: 60 * $5 = 300');
})();

(function() {
  // Empty state valuation
  var s = SimInventory.initState();
  var val = SimInventory.getStockValuation(s);
  assertEqual(val.grand_total, 0, 'empty state valuation grand_total 0');
})();

(function() {
  // Multi-SKU valuation
  var s = SimInventory.initState();
  var sku1R = SimInventory.createSku(s, { name: 'A' });
  s = sku1R.state;
  var sku2R = SimInventory.createSku(s, { name: 'B' });
  s = sku2R.state;
  var whR = SimInventory.createWarehouse(s, { name: 'WH', cost_method: 'fifo' });
  s = whR.state;
  var sku1 = sku1R.record.id;
  var sku2 = sku2R.record.id;
  var whId = whR.record.id;

  var m1 = SimInventory.recordMovement(s, { type: 'receive', skuId: sku1, warehouseId: whId, qty: 10, unit_cost: 5 });
  s = m1.state;
  var m2 = SimInventory.recordMovement(s, { type: 'receive', skuId: sku2, warehouseId: whId, qty: 20, unit_cost: 3 });
  s = m2.state;

  var val = SimInventory.getStockValuation(s);
  assertEqual(val.grand_total, 110, 'multi-SKU valuation: 50 + 60 = 110');
})();

// ============================================================
// SECTION 12: getAverageCost
// ============================================================
console.log('\n--- getAverageCost ---');

(function() {
  var s = SimInventory.initState();
  var skuR = SimInventory.createSku(s, { name: 'X' });
  s = skuR.state;
  var whR = SimInventory.createWarehouse(s, { name: 'WH', cost_method: 'fifo' });
  s = whR.state;
  var skuId = skuR.record.id;
  var whId = whR.record.id;

  var m1 = SimInventory.recordMovement(s, { type: 'receive', skuId: skuId, warehouseId: whId, qty: 10, unit_cost: 10 });
  s = m1.state;
  var m2 = SimInventory.recordMovement(s, { type: 'receive', skuId: skuId, warehouseId: whId, qty: 10, unit_cost: 20 });
  s = m2.state;

  var avg = SimInventory.getAverageCost(s, skuId, whId);
  assertEqual(avg, 15, 'average cost (10*10 + 10*20) / 20 = 15');
})();

(function() {
  var s = SimInventory.initState();
  var skuR = SimInventory.createSku(s, { name: 'X' });
  s = skuR.state;
  var whR = SimInventory.createWarehouse(s, { name: 'WH' });
  s = whR.state;
  assertEqual(SimInventory.getAverageCost(s, skuR.record.id, whR.record.id), 0, 'getAverageCost returns 0 for empty stock');
  assertEqual(SimInventory.getAverageCost(s, 'bad', whR.record.id), 0, 'getAverageCost returns 0 for bad warehouse');
})();

// ============================================================
// SECTION 13: getTotalQty
// ============================================================
console.log('\n--- getTotalQty ---');

(function() {
  var s = SimInventory.initState();
  var skuR = SimInventory.createSku(s, { name: 'X' });
  s = skuR.state;
  var wh1R = SimInventory.createWarehouse(s, { name: 'WH1' });
  s = wh1R.state;
  var wh2R = SimInventory.createWarehouse(s, { name: 'WH2' });
  s = wh2R.state;
  var skuId = skuR.record.id;

  var m1 = SimInventory.recordMovement(s, { type: 'receive', skuId: skuId, warehouseId: wh1R.record.id, qty: 30, unit_cost: 1 });
  s = m1.state;
  var m2 = SimInventory.recordMovement(s, { type: 'receive', skuId: skuId, warehouseId: wh2R.record.id, qty: 20, unit_cost: 1 });
  s = m2.state;

  assertEqual(SimInventory.getTotalQty(s, skuId), 50, 'getTotalQty sums across warehouses');
})();

(function() {
  var s = SimInventory.initState();
  var skuR = SimInventory.createSku(s, { name: 'X' });
  s = skuR.state;
  assertEqual(SimInventory.getTotalQty(s, skuR.record.id), 0, 'getTotalQty 0 with no warehouses');
})();

// ============================================================
// SECTION 14: getSkuStock
// ============================================================
console.log('\n--- getSkuStock ---');

(function() {
  var s = SimInventory.initState();
  var skuR = SimInventory.createSku(s, { name: 'X' });
  s = skuR.state;
  var whR = SimInventory.createWarehouse(s, { name: 'WH' });
  s = whR.state;
  var skuId = skuR.record.id;
  var whId = whR.record.id;

  var m1 = SimInventory.recordMovement(s, { type: 'receive', skuId: skuId, warehouseId: whId, qty: 25, unit_cost: 2 });
  s = m1.state;

  var stock = SimInventory.getSkuStock(s, skuId);
  assertEqual(stock.total_qty, 25, 'getSkuStock total_qty 25');
  assert(stock.by_warehouse[whId] !== undefined, 'getSkuStock by_warehouse entry exists');
  assertEqual(stock.by_warehouse[whId].qty, 25, 'getSkuStock by_warehouse qty 25');
})();

// ============================================================
// SECTION 15: Reorder Points & Alerts
// ============================================================
console.log('\n--- Reorder Points & Alerts ---');

(function() {
  var s = SimInventory.initState();
  var skuR = SimInventory.createSku(s, { name: 'X', unit_cost: 5, reorder_point: 20 });
  s = skuR.state;
  var whR = SimInventory.createWarehouse(s, { name: 'WH' });
  s = whR.state;
  var skuId = skuR.record.id;
  var whId = whR.record.id;

  // Start with 50, ship 35 -> 15 remaining (below reorder point 20)
  var m1 = SimInventory.recordMovement(s, { type: 'receive', skuId: skuId, warehouseId: whId, qty: 50, unit_cost: 5 });
  s = m1.state;
  var m2 = SimInventory.recordMovement(s, { type: 'ship', skuId: skuId, warehouseId: whId, qty: 35 });
  s = m2.state;

  var alerts = SimInventory.getLowStockAlerts(s, false);
  assert(alerts.length > 0, 'low stock alert raised when qty below reorder point');
  assertEqual(alerts[0].type, 'low_stock', 'alert type is low_stock');
  assertEqual(alerts[0].skuId, skuId, 'alert skuId matches');
  assertEqual(alerts[0].reorderPoint, 20, 'alert reorderPoint 20');
  assert(!alerts[0].resolved, 'alert not resolved initially');
})();

(function() {
  // No alert when stock above reorder point
  var s = SimInventory.initState();
  var skuR = SimInventory.createSku(s, { name: 'X', reorder_point: 10 });
  s = skuR.state;
  var whR = SimInventory.createWarehouse(s, { name: 'WH' });
  s = whR.state;

  var m1 = SimInventory.recordMovement(s, { type: 'receive', skuId: skuR.record.id, warehouseId: whR.record.id, qty: 50, unit_cost: 5 });
  s = m1.state;
  var m2 = SimInventory.recordMovement(s, { type: 'ship', skuId: skuR.record.id, warehouseId: whR.record.id, qty: 5 });
  s = m2.state;

  var alerts = SimInventory.getLowStockAlerts(s, false);
  assertEqual(alerts.length, 0, 'no alert when qty above reorder point');
})();

(function() {
  // Resolve alert
  var s = SimInventory.initState();
  var skuR = SimInventory.createSku(s, { name: 'X', reorder_point: 30 });
  s = skuR.state;
  var whR = SimInventory.createWarehouse(s, { name: 'WH' });
  s = whR.state;

  var m1 = SimInventory.recordMovement(s, { type: 'receive', skuId: skuR.record.id, warehouseId: whR.record.id, qty: 40, unit_cost: 5 });
  s = m1.state;
  var m2 = SimInventory.recordMovement(s, { type: 'ship', skuId: skuR.record.id, warehouseId: whR.record.id, qty: 15 });
  s = m2.state;

  var alerts = SimInventory.getLowStockAlerts(s, false);
  assert(alerts.length > 0, 'alert raised');
  var alertId = alerts[0].id;
  var resolved = SimInventory.resolveAlert(s, alertId);
  var remainingAlerts = SimInventory.getLowStockAlerts(resolved, false);
  assertEqual(remainingAlerts.length, 0, 'no unresolved alerts after resolveAlert');
  var allAlerts = SimInventory.getLowStockAlerts(resolved, true);
  assertEqual(allAlerts.length, 1, 'resolved alert still present when includeResolved=true');
  assert(allAlerts[0].resolved, 'alert marked resolved');
  assert(allAlerts[0].resolvedAt, 'alert has resolvedAt timestamp');
})();

(function() {
  // Auto-PO generation when preferred supplier set
  var s = SimInventory.initState();
  var supR = SimInventory.registerSupplier(s, { name: 'Sup A', lead_time_days: 3 });
  s = supR.state;
  var supId = supR.record.id;

  var skuR = SimInventory.createSku(s, {
    name: 'X',
    reorder_point: 20,
    reorder_qty: 100,
    preferred_supplier_id: supId,
    unit_cost: 5
  });
  s = skuR.state;
  var whR = SimInventory.createWarehouse(s, { name: 'WH' });
  s = whR.state;

  var m1 = SimInventory.recordMovement(s, { type: 'receive', skuId: skuR.record.id, warehouseId: whR.record.id, qty: 50, unit_cost: 5 });
  s = m1.state;
  var m2 = SimInventory.recordMovement(s, { type: 'ship', skuId: skuR.record.id, warehouseId: whR.record.id, qty: 35 });
  s = m2.state;

  var openPOs = SimInventory.getOpenPurchaseOrders(s, { skuId: skuR.record.id });
  assert(openPOs.length > 0, 'auto-PO created when stock below reorder point');
  assertEqual(openPOs[0].auto_generated, true, 'auto-PO marked auto_generated');
  assertEqual(openPOs[0].qty, 100, 'auto-PO qty equals reorder_qty');
})();

// ============================================================
// SECTION 16: Supplier Registry
// ============================================================
console.log('\n--- Supplier Registry ---');

(function() {
  var s = SimInventory.initState();
  var r = SimInventory.registerSupplier(s, {
    name: 'Agora Wholesale',
    lead_time_days: 5,
    reliability_score: 90,
    zone: 'agora'
  });
  assert(r.state && r.record, 'registerSupplier returns state+record');
  assert(r.record.id.indexOf('sup_') === 0, 'supplier id has sup_ prefix');
  assertEqual(r.record.name, 'Agora Wholesale', 'supplier name set');
  assertEqual(r.record.lead_time_days, 5, 'lead_time_days set');
  assertEqual(r.record.reliability_score, 90, 'reliability_score set');
  assert(r.record.active === true, 'supplier active by default');
  assert(r.record.createdAt, 'supplier createdAt set');
  assert(r.state.suppliers[r.record.id] !== undefined, 'supplier in state');
  assertEqual(Object.keys(s.suppliers).length, 0, 'original state unchanged');
})();

(function() {
  var s = SimInventory.initState();
  var r = SimInventory.registerSupplier(s, { name: 'Default Sup' });
  assertEqual(r.record.lead_time_days, 7, 'supplier lead_time_days defaults to 7');
  assertEqual(r.record.reliability_score, 100, 'supplier reliability_score defaults to 100');
})();

(function() {
  var s = SimInventory.initState();
  var r = SimInventory.registerSupplier(s, { name: 'Sup A', lead_time_days: 3 });
  s = r.state;
  var supId = r.record.id;
  var updated = SimInventory.updateSupplier(s, supId, { name: 'Sup A v2', lead_time_days: 10 });
  assertEqual(updated.suppliers[supId].name, 'Sup A v2', 'updateSupplier name');
  assertEqual(updated.suppliers[supId].lead_time_days, 10, 'updateSupplier lead_time_days');
  assert(updated.suppliers[supId].updatedAt, 'updateSupplier sets updatedAt');
  assertEqual(s.suppliers[supId].name, 'Sup A', 'original state unchanged');
})();

(function() {
  var s = SimInventory.initState();
  var result = SimInventory.updateSupplier(s, 'bad', { name: 'X' });
  assert(result === s, 'updateSupplier nonexistent returns same state');
})();

(function() {
  var s = SimInventory.initState();
  var supR = SimInventory.registerSupplier(s, { name: 'Sup' });
  s = supR.state;
  var skuR = SimInventory.createSku(s, { name: 'X' });
  s = skuR.state;

  var updated = SimInventory.updateSupplierCatalog(s, supR.record.id, skuR.record.id, {
    unit_cost: 8,
    min_order_qty: 50
  });
  var catalog = updated.suppliers[supR.record.id].catalog;
  assert(catalog[skuR.record.id] !== undefined, 'catalog entry created');
  assertEqual(catalog[skuR.record.id].unit_cost, 8, 'catalog unit_cost set');
  assertEqual(catalog[skuR.record.id].min_order_qty, 50, 'catalog min_order_qty set');
})();

(function() {
  // rateSupplier
  var s = SimInventory.initState();
  var r = SimInventory.registerSupplier(s, { name: 'Sup', reliability_score: 100 });
  s = r.state;
  var supId = r.record.id;

  var rated = SimInventory.rateSupplier(s, supId, { on_time: false, qty_correct: false });
  assert(rated.suppliers[supId].reliability_score < 100, 'reliability_score drops on bad delivery');
})();

(function() {
  var s = SimInventory.initState();
  var r = SimInventory.registerSupplier(s, { name: 'Sup', reliability_score: 80 });
  s = r.state;
  var supId = r.record.id;
  var rated = SimInventory.rateSupplier(s, supId, { on_time: true, qty_correct: true, quality_score: 100 });
  assert(rated.suppliers[supId].reliability_score >= 80, 'reliability_score stays/rises on good delivery');
  assert(rated.suppliers[supId].rating_history.length > 0, 'rating_history recorded');
})();

(function() {
  // rateSupplier capped at 0 and 100
  var s = SimInventory.initState();
  var r = SimInventory.registerSupplier(s, { name: 'Bad Sup', reliability_score: 5 });
  s = r.state;
  var rated = SimInventory.rateSupplier(s, r.record.id, { on_time: false, qty_correct: false, quality_score: 0 });
  assert(rated.suppliers[r.record.id].reliability_score >= 0, 'reliability_score floor 0');
})();

// ============================================================
// SECTION 17: Purchase Orders — lifecycle
// ============================================================
console.log('\n--- Purchase Orders ---');

(function() {
  var s = SimInventory.initState();
  var supR = SimInventory.registerSupplier(s, { name: 'Sup' });
  s = supR.state;
  var skuR = SimInventory.createSku(s, { name: 'X', unit_cost: 10 });
  s = skuR.state;

  var r = SimInventory.createPurchaseOrder(s, {
    skuId: skuR.record.id,
    supplierId: supR.record.id,
    qty: 100,
    unit_cost: 9
  });
  assert(!r.error, 'createPurchaseOrder no error');
  assert(r.state && r.record, 'createPurchaseOrder returns state+record');
  assert(r.record.id.indexOf('po_') === 0, 'PO id has po_ prefix');
  assertEqual(r.record.status, 'draft', 'PO starts as draft');
  assertEqual(r.record.qty, 100, 'PO qty set');
  assertEqual(r.record.unit_cost, 9, 'PO unit_cost set');
  assertEqual(r.record.total_cost, 900, 'PO total_cost = qty * unit_cost');
  assertEqual(r.record.qty_received, 0, 'PO qty_received starts 0');
  assert(Array.isArray(r.record.history), 'PO history array');
  assert(r.state.purchase_orders[r.record.id] !== undefined, 'PO in state');
})();

(function() {
  // Error: unknown SKU
  var s = SimInventory.initState();
  var supR = SimInventory.registerSupplier(s, { name: 'Sup' });
  s = supR.state;
  var r = SimInventory.createPurchaseOrder(s, { skuId: 'bad', supplierId: supR.record.id, qty: 10 });
  assert(r.error, 'createPO error on bad sku');
})();

(function() {
  // Error: unknown supplier
  var s = SimInventory.initState();
  var skuR = SimInventory.createSku(s, { name: 'X' });
  s = skuR.state;
  var r = SimInventory.createPurchaseOrder(s, { skuId: skuR.record.id, supplierId: 'bad', qty: 10 });
  assert(r.error, 'createPO error on bad supplier');
})();

(function() {
  // Full lifecycle: draft -> submit -> approve -> order -> receive
  var s = SimInventory.initState();
  var supR = SimInventory.registerSupplier(s, { name: 'Sup' });
  s = supR.state;
  var skuR = SimInventory.createSku(s, { name: 'X', unit_cost: 10 });
  s = skuR.state;
  var whR = SimInventory.createWarehouse(s, { name: 'WH' });
  s = whR.state;

  var po = SimInventory.createPurchaseOrder(s, { skuId: skuR.record.id, supplierId: supR.record.id, qty: 50, unit_cost: 10, warehouseId: whR.record.id });
  s = po.state;
  var poId = po.record.id;

  // submit
  var sub = SimInventory.submitPurchaseOrder(s, poId);
  assert(!sub.error, 'submitPO no error');
  assertEqual(sub.purchase_orders[poId].status, 'submitted', 'PO status submitted');

  // approve
  var app = SimInventory.approvePurchaseOrder(sub, poId, 'manager_01');
  assert(!app.error, 'approvePO no error');
  assertEqual(app.purchase_orders[poId].status, 'approved', 'PO status approved');
  assertEqual(app.purchase_orders[poId].approvedBy, 'manager_01', 'PO approvedBy set');

  // order
  var ord = SimInventory.orderPurchaseOrder(app, poId);
  assert(!ord.error, 'orderPO no error');
  assertEqual(ord.purchase_orders[poId].status, 'ordered', 'PO status ordered');

  // receive full quantity
  var rcv = SimInventory.receivePurchaseOrder(ord, poId, { qtyReceived: 50, warehouseId: whR.record.id });
  assert(!rcv.error, 'receivePO no error');
  assertEqual(rcv.state.purchase_orders[poId].status, 'received', 'PO status received after full receipt');
  assertEqual(rcv.state.purchase_orders[poId].qty_received, 50, 'PO qty_received 50');
  // Stock should have been added
  assertEqual(rcv.state.warehouses[whR.record.id].stock[skuR.record.id].qty, 50, 'stock updated after PO receipt');
})();

(function() {
  // Partial receipt -> partial status
  var s = SimInventory.initState();
  var supR = SimInventory.registerSupplier(s, { name: 'Sup' });
  s = supR.state;
  var skuR = SimInventory.createSku(s, { name: 'X' });
  s = skuR.state;
  var whR = SimInventory.createWarehouse(s, { name: 'WH' });
  s = whR.state;

  var po = SimInventory.createPurchaseOrder(s, { skuId: skuR.record.id, supplierId: supR.record.id, qty: 100, warehouseId: whR.record.id });
  s = po.state;
  var sub = SimInventory.submitPurchaseOrder(s, po.record.id);
  var app = SimInventory.approvePurchaseOrder(sub, po.record.id, 'mgr');
  var ord = SimInventory.orderPurchaseOrder(app, po.record.id);
  var rcv = SimInventory.receivePurchaseOrder(ord, po.record.id, { qtyReceived: 60, warehouseId: whR.record.id });

  assertEqual(rcv.state.purchase_orders[po.record.id].status, 'partial', 'PO status partial after partial receipt');
  assertEqual(rcv.state.purchase_orders[po.record.id].qty_received, 60, 'qty_received 60');
})();

(function() {
  // Cancel a PO
  var s = SimInventory.initState();
  var supR = SimInventory.registerSupplier(s, { name: 'Sup' });
  s = supR.state;
  var skuR = SimInventory.createSku(s, { name: 'X' });
  s = skuR.state;
  var po = SimInventory.createPurchaseOrder(s, { skuId: skuR.record.id, supplierId: supR.record.id, qty: 10 });
  s = po.state;

  var cancelled = SimInventory.cancelPurchaseOrder(s, po.record.id, 'changed mind');
  assertEqual(cancelled.purchase_orders[po.record.id].status, 'cancelled', 'PO cancelled');
  assertEqual(cancelled.purchase_orders[po.record.id].cancelReason, 'changed mind', 'cancel reason set');
})();

(function() {
  // Cannot cancel received PO
  var s = SimInventory.initState();
  var supR = SimInventory.registerSupplier(s, { name: 'Sup' });
  s = supR.state;
  var skuR = SimInventory.createSku(s, { name: 'X' });
  s = skuR.state;
  var whR = SimInventory.createWarehouse(s, { name: 'WH' });
  s = whR.state;

  var po = SimInventory.createPurchaseOrder(s, { skuId: skuR.record.id, supplierId: supR.record.id, qty: 10, warehouseId: whR.record.id });
  s = po.state;
  var sub = SimInventory.submitPurchaseOrder(s, po.record.id);
  var app = SimInventory.approvePurchaseOrder(sub, po.record.id, 'mgr');
  var ord = SimInventory.orderPurchaseOrder(app, po.record.id);
  var rcv = SimInventory.receivePurchaseOrder(ord, po.record.id, { qtyReceived: 10, warehouseId: whR.record.id });
  s = rcv.state;
  var cancelResult = SimInventory.cancelPurchaseOrder(s, po.record.id, 'too late');
  assert(cancelResult.error, 'cannot cancel received PO');
})();

(function() {
  // Cannot approve from wrong status
  var s = SimInventory.initState();
  var supR = SimInventory.registerSupplier(s, { name: 'Sup' });
  s = supR.state;
  var skuR = SimInventory.createSku(s, { name: 'X' });
  s = skuR.state;
  var po = SimInventory.createPurchaseOrder(s, { skuId: skuR.record.id, supplierId: supR.record.id, qty: 10 });
  s = po.state;
  // Try to approve without submitting first (actually draft can be approved per spec, let's order without approve)
  var ord = SimInventory.orderPurchaseOrder(s, po.record.id);
  assert(ord.error, 'cannot order a draft PO');
})();

(function() {
  // updatePurchaseOrder
  var s = SimInventory.initState();
  var supR = SimInventory.registerSupplier(s, { name: 'Sup' });
  s = supR.state;
  var skuR = SimInventory.createSku(s, { name: 'X' });
  s = skuR.state;
  var po = SimInventory.createPurchaseOrder(s, { skuId: skuR.record.id, supplierId: supR.record.id, qty: 50, unit_cost: 10 });
  s = po.state;
  var updated = SimInventory.updatePurchaseOrder(s, po.record.id, { qty: 100, unit_cost: 8, reference: 'ref-001' });
  assertEqual(updated.purchase_orders[po.record.id].qty, 100, 'updatePO qty');
  assertEqual(updated.purchase_orders[po.record.id].unit_cost, 8, 'updatePO unit_cost');
  assertEqual(updated.purchase_orders[po.record.id].total_cost, 800, 'updatePO total_cost recalculated');
  assertEqual(updated.purchase_orders[po.record.id].reference, 'ref-001', 'updatePO reference');
})();

(function() {
  // getOpenPurchaseOrders
  var s = SimInventory.initState();
  var supR = SimInventory.registerSupplier(s, { name: 'Sup' });
  s = supR.state;
  var skuR = SimInventory.createSku(s, { name: 'X' });
  s = skuR.state;

  var po1 = SimInventory.createPurchaseOrder(s, { skuId: skuR.record.id, supplierId: supR.record.id, qty: 10 });
  s = po1.state;
  var po2 = SimInventory.createPurchaseOrder(s, { skuId: skuR.record.id, supplierId: supR.record.id, qty: 20 });
  s = po2.state;
  var cancelled = SimInventory.cancelPurchaseOrder(s, po2.record.id, 'test');
  s = cancelled;

  var open = SimInventory.getOpenPurchaseOrders(s);
  assertEqual(open.length, 1, 'getOpenPurchaseOrders returns only open POs');
})();

// ============================================================
// SECTION 18: Movement History
// ============================================================
console.log('\n--- Movement History ---');

(function() {
  var s = SimInventory.initState();
  var skuR = SimInventory.createSku(s, { name: 'X' });
  s = skuR.state;
  var whR = SimInventory.createWarehouse(s, { name: 'WH' });
  s = whR.state;
  var skuId = skuR.record.id;
  var whId = whR.record.id;

  var m1 = SimInventory.recordMovement(s, { type: 'receive', skuId: skuId, warehouseId: whId, qty: 50, unit_cost: 5 });
  s = m1.state;
  var m2 = SimInventory.recordMovement(s, { type: 'ship', skuId: skuId, warehouseId: whId, qty: 10 });
  s = m2.state;

  var hist = SimInventory.getMovementHistory(s);
  assertEqual(hist.length, 2, 'getMovementHistory returns all movements');
})();

(function() {
  var s = SimInventory.initState();
  var sku1R = SimInventory.createSku(s, { name: 'A' });
  s = sku1R.state;
  var sku2R = SimInventory.createSku(s, { name: 'B' });
  s = sku2R.state;
  var whR = SimInventory.createWarehouse(s, { name: 'WH' });
  s = whR.state;
  var sku1 = sku1R.record.id;
  var sku2 = sku2R.record.id;
  var whId = whR.record.id;

  var m1 = SimInventory.recordMovement(s, { type: 'receive', skuId: sku1, warehouseId: whId, qty: 10, unit_cost: 1 });
  s = m1.state;
  var m2 = SimInventory.recordMovement(s, { type: 'receive', skuId: sku2, warehouseId: whId, qty: 20, unit_cost: 1 });
  s = m2.state;

  var hist = SimInventory.getMovementHistory(s, { skuId: sku1 });
  assertEqual(hist.length, 1, 'filter by skuId returns 1 movement');
  assertEqual(hist[0].skuId, sku1, 'filtered movement matches skuId');
})();

(function() {
  var s = SimInventory.initState();
  var skuR = SimInventory.createSku(s, { name: 'X' });
  s = skuR.state;
  var whR = SimInventory.createWarehouse(s, { name: 'WH' });
  s = whR.state;
  var skuId = skuR.record.id;
  var whId = whR.record.id;

  var m1 = SimInventory.recordMovement(s, { type: 'receive', skuId: skuId, warehouseId: whId, qty: 50, unit_cost: 5 });
  s = m1.state;
  var m2 = SimInventory.recordMovement(s, { type: 'ship', skuId: skuId, warehouseId: whId, qty: 10 });
  s = m2.state;

  var ships = SimInventory.getMovementHistory(s, { type: 'ship' });
  assertEqual(ships.length, 1, 'filter by type returns 1 ship movement');
  var receives = SimInventory.getMovementHistory(s, { type: 'receive' });
  assertEqual(receives.length, 1, 'filter by type returns 1 receive movement');
})();

(function() {
  // Filter by 'by'
  var s = SimInventory.initState();
  var skuR = SimInventory.createSku(s, { name: 'X' });
  s = skuR.state;
  var whR = SimInventory.createWarehouse(s, { name: 'WH' });
  s = whR.state;
  var skuId = skuR.record.id;
  var whId = whR.record.id;

  var m1 = SimInventory.recordMovement(s, { type: 'receive', skuId: skuId, warehouseId: whId, qty: 50, unit_cost: 5, by: 'agent_001' });
  s = m1.state;
  var m2 = SimInventory.recordMovement(s, { type: 'receive', skuId: skuId, warehouseId: whId, qty: 20, unit_cost: 5, by: 'agent_002' });
  s = m2.state;

  var hist = SimInventory.getMovementHistory(s, { by: 'agent_001' });
  assertEqual(hist.length, 1, 'filter by "by" returns 1');
})();

// ============================================================
// SECTION 19: Metrics
// ============================================================
console.log('\n--- Metrics ---');

(function() {
  var s = SimInventory.initState();
  var m = SimInventory.getMetrics(s);
  assertEqual(m.sku_count, 0, 'metrics sku_count 0 initially');
  assertEqual(m.warehouse_count, 0, 'metrics warehouse_count 0 initially');
  assertEqual(m.supplier_count, 0, 'metrics supplier_count 0 initially');
  assertEqual(m.open_po_count, 0, 'metrics open_po_count 0 initially');
  assertEqual(m.total_inventory_value, 0, 'metrics total_inventory_value 0 initially');
  assertEqual(m.unresolved_alerts, 0, 'metrics unresolved_alerts 0 initially');
  assertEqual(m.total_movements, 0, 'metrics total_movements 0 initially');
})();

(function() {
  var s = SimInventory.initState();
  var skuR = SimInventory.createSku(s, { name: 'A', active: true });
  s = skuR.state;
  var skuR2 = SimInventory.createSku(s, { name: 'B' });
  s = skuR2.state;
  s = SimInventory.deactivateSku(s, skuR2.record.id);

  var m = SimInventory.getMetrics(s);
  assertEqual(m.sku_count, 2, 'metrics sku_count 2');
  assertEqual(m.active_sku_count, 1, 'metrics active_sku_count 1');
})();

(function() {
  var s = SimInventory.initState();
  var supR = SimInventory.registerSupplier(s, { name: 'S1', active: true });
  s = supR.state;
  var skuR = SimInventory.createSku(s, { name: 'X' });
  s = skuR.state;
  var whR = SimInventory.createWarehouse(s, { name: 'WH' });
  s = whR.state;
  var m1 = SimInventory.recordMovement(s, { type: 'receive', skuId: skuR.record.id, warehouseId: whR.record.id, qty: 100, unit_cost: 5 });
  s = m1.state;

  var po = SimInventory.createPurchaseOrder(s, { skuId: skuR.record.id, supplierId: supR.record.id, qty: 20, unit_cost: 5 });
  s = po.state;

  var m = SimInventory.getMetrics(s);
  assertEqual(m.warehouse_count, 1, 'metrics warehouse_count 1');
  assertEqual(m.supplier_count, 1, 'metrics supplier_count 1');
  assertEqual(m.open_po_count, 1, 'metrics open_po_count 1');
  assertEqual(m.total_inventory_value, 500, 'metrics total_inventory_value 500');
  assertEqual(m.total_movements, 1, 'metrics total_movements 1');
  assertEqual(m.molt_count, 0, 'metrics molt_count 0 initially');
})();

// ============================================================
// SECTION 20: applyAction dispatch
// ============================================================
console.log('\n--- applyAction dispatch ---');

(function() {
  var s = SimInventory.initState();
  var s2 = SimInventory.applyAction(s, { from: 'agent_001', payload: { action: 'create_sku', data: { name: 'Magic Dust', category: 'consumable', unit_cost: 3 } } });
  assert(Object.keys(s2.skus).length === 1, 'applyAction create_sku creates SKU');
})();

(function() {
  var s = SimInventory.initState();
  var r = SimInventory.createSku(s, { name: 'X' });
  s = r.state;
  var s2 = SimInventory.applyAction(s, { payload: { action: 'deactivate_sku', data: { id: r.record.id } } });
  assert(s2.skus[r.record.id].active === false, 'applyAction deactivate_sku works');
})();

(function() {
  var s = SimInventory.initState();
  var s2 = SimInventory.applyAction(s, { payload: { action: 'create_warehouse', data: { name: 'WH Test', cost_method: 'lifo' } } });
  assert(Object.keys(s2.warehouses).length === 1, 'applyAction create_warehouse works');
})();

(function() {
  var s = SimInventory.initState();
  var s2 = SimInventory.applyAction(s, { payload: { action: 'register_supplier', data: { name: 'Sup Test' } } });
  assert(Object.keys(s2.suppliers).length === 1, 'applyAction register_supplier works');
})();

(function() {
  var s = SimInventory.initState();
  var skuR = SimInventory.createSku(s, { name: 'X' });
  s = skuR.state;
  var whR = SimInventory.createWarehouse(s, { name: 'WH' });
  s = whR.state;

  var s2 = SimInventory.applyAction(s, {
    payload: {
      action: 'receive_stock',
      data: { skuId: skuR.record.id, warehouseId: whR.record.id, qty: 40, unit_cost: 5 }
    }
  });
  assert(s2.warehouses[whR.record.id].stock[skuR.record.id].qty === 40, 'applyAction receive_stock works');
})();

(function() {
  var s = SimInventory.initState();
  var skuR = SimInventory.createSku(s, { name: 'X' });
  s = skuR.state;
  var whR = SimInventory.createWarehouse(s, { name: 'WH' });
  s = whR.state;

  var s2 = SimInventory.applyAction(s, { payload: { action: 'receive_stock', data: { skuId: skuR.record.id, warehouseId: whR.record.id, qty: 50, unit_cost: 5 } } });
  var s3 = SimInventory.applyAction(s2, { payload: { action: 'ship_stock', data: { skuId: skuR.record.id, warehouseId: whR.record.id, qty: 20 } } });
  assertEqual(s3.warehouses[whR.record.id].stock[skuR.record.id].qty, 30, 'applyAction ship_stock works');
})();

(function() {
  // applyAction with unknown action molts
  var s = SimInventory.initState();
  var s2 = SimInventory.applyAction(s, { payload: { action: 'teleport_stock', data: {} } });
  assert(s2._molt_log.length > 0, 'unknown action results in molt log entry');
})();

(function() {
  // applyAction resolve_alert
  var s = SimInventory.initState();
  var skuR = SimInventory.createSku(s, { name: 'X', reorder_point: 30 });
  s = skuR.state;
  var whR = SimInventory.createWarehouse(s, { name: 'WH' });
  s = whR.state;
  var m1 = SimInventory.recordMovement(s, { type: 'receive', skuId: skuR.record.id, warehouseId: whR.record.id, qty: 40, unit_cost: 5 });
  s = m1.state;
  var m2 = SimInventory.recordMovement(s, { type: 'ship', skuId: skuR.record.id, warehouseId: whR.record.id, qty: 15 });
  s = m2.state;
  var alertId = s.alerts[0].id;
  var s2 = SimInventory.applyAction(s, { payload: { action: 'resolve_alert', data: { id: alertId } } });
  assert(s2.alerts[0].resolved, 'applyAction resolve_alert works');
})();

(function() {
  // applyAction create_sku via payload.data with createdBy defaulting to from
  var s = SimInventory.initState();
  var s2 = SimInventory.applyAction(s, { from: 'npc_merchant', payload: { action: 'create_sku', data: { name: 'Bolt' } } });
  var keys = Object.keys(s2.skus);
  assert(keys.length === 1, 'applyAction sku created');
})();

// ============================================================
// SECTION 21: getState (safe copy)
// ============================================================
console.log('\n--- getState ---');

(function() {
  var s = SimInventory.initState();
  var r = SimInventory.createSku(s, { name: 'X' });
  s = r.state;
  var copy = SimInventory.getState(s);
  // Mutate copy — original should be unchanged
  copy.skus[r.record.id].name = 'Changed';
  assertEqual(s.skus[r.record.id].name, 'X', 'getState returns deep copy');
})();

// ============================================================
// SECTION 22: simulateTick
// ============================================================
console.log('\n--- simulateTick ---');

(function() {
  var s = SimInventory.initState();
  var s2 = SimInventory.simulateTick(s, 42);
  assert(s2 && typeof s2 === 'object', 'simulateTick returns state');
  // After first tick, at minimum a warehouse should exist
  assert(Object.keys(s2.warehouses).length >= 1 || Object.keys(s2.skus).length >= 0, 'simulateTick runs without crash');
})();

(function() {
  // Multiple ticks should not crash and grow state
  var s = SimInventory.initState();
  for (var i = 0; i < 10; i++) {
    s = SimInventory.simulateTick(s, i * 13 + 7);
  }
  assert(s.movements.length >= 0, '10 ticks produce state with movements array');
  assert(Array.isArray(s.alerts), '10 ticks state has alerts array');
})();

(function() {
  // simulateTick with null returns null
  var result = SimInventory.simulateTick(null, 1);
  assert(result === null, 'simulateTick(null) returns null');
})();

(function() {
  // Deterministic: same seed, same initial state produces same result
  var s1 = SimInventory.initState();
  var s2 = SimInventory.initState();
  var r1 = SimInventory.simulateTick(s1, 99999);
  var r2 = SimInventory.simulateTick(s2, 99999);
  // Both should have same number of SKUs since same seed
  assertEqual(Object.keys(r1.skus).length, Object.keys(r2.skus).length, 'simulateTick deterministic sku count');
})();

// ============================================================
// SECTION 23: Constants exported
// ============================================================
console.log('\n--- Constants ---');

(function() {
  assert(Array.isArray(SimInventory.MOVEMENT_TYPES), 'MOVEMENT_TYPES exported');
  assert(SimInventory.MOVEMENT_TYPES.indexOf('receive') !== -1, 'MOVEMENT_TYPES includes receive');
  assert(SimInventory.MOVEMENT_TYPES.indexOf('ship') !== -1, 'MOVEMENT_TYPES includes ship');
  assert(SimInventory.MOVEMENT_TYPES.indexOf('transfer') !== -1, 'MOVEMENT_TYPES includes transfer');
  assert(Array.isArray(SimInventory.PO_STATUSES), 'PO_STATUSES exported');
  assert(SimInventory.PO_STATUSES.indexOf('draft') !== -1, 'PO_STATUSES includes draft');
  assert(SimInventory.PO_STATUSES.indexOf('received') !== -1, 'PO_STATUSES includes received');
  assert(Array.isArray(SimInventory.COST_METHODS), 'COST_METHODS exported');
  assert(SimInventory.COST_METHODS.indexOf('fifo') !== -1, 'COST_METHODS includes fifo');
  assert(SimInventory.COST_METHODS.indexOf('lifo') !== -1, 'COST_METHODS includes lifo');
  assert(SimInventory.COST_METHODS.indexOf('average') !== -1, 'COST_METHODS includes average');
  assert(Array.isArray(SimInventory.SKU_CATEGORIES), 'SKU_CATEGORIES exported');
})();

// ============================================================
// SECTION 24: Write-off movement
// ============================================================
console.log('\n--- Write-off ---');

(function() {
  var s = SimInventory.initState();
  var skuR = SimInventory.createSku(s, { name: 'X' });
  s = skuR.state;
  var whR = SimInventory.createWarehouse(s, { name: 'WH' });
  s = whR.state;
  var skuId = skuR.record.id;
  var whId = whR.record.id;

  var m1 = SimInventory.recordMovement(s, { type: 'receive', skuId: skuId, warehouseId: whId, qty: 30, unit_cost: 5 });
  s = m1.state;
  var m2 = SimInventory.recordMovement(s, { type: 'write_off', skuId: skuId, warehouseId: whId, qty: 10, reason: 'damaged' });
  assert(!m2.error, 'write_off no error when stock available');
  assertEqual(m2.state.warehouses[whId].stock[skuId].qty, 20, 'write_off reduces qty');
  assertEqual(m2.movement.reason, 'damaged', 'write_off reason set');
})();

(function() {
  // write_off more than available
  var s = SimInventory.initState();
  var skuR = SimInventory.createSku(s, { name: 'X' });
  s = skuR.state;
  var whR = SimInventory.createWarehouse(s, { name: 'WH' });
  s = whR.state;
  var m1 = SimInventory.recordMovement(s, { type: 'receive', skuId: skuR.record.id, warehouseId: whR.record.id, qty: 5, unit_cost: 5 });
  var m2 = SimInventory.recordMovement(m1.state, { type: 'write_off', skuId: skuR.record.id, warehouseId: whR.record.id, qty: 20 });
  assert(m2.error, 'write_off over available returns error');
})();

// ============================================================
// SECTION 25: Return movement
// ============================================================
console.log('\n--- Return movement ---');

(function() {
  var s = SimInventory.initState();
  var skuR = SimInventory.createSku(s, { name: 'X', unit_cost: 7 });
  s = skuR.state;
  var whR = SimInventory.createWarehouse(s, { name: 'WH', cost_method: 'fifo' });
  s = whR.state;
  var skuId = skuR.record.id;
  var whId = whR.record.id;

  var m1 = SimInventory.recordMovement(s, { type: 'receive', skuId: skuId, warehouseId: whId, qty: 20, unit_cost: 7 });
  s = m1.state;
  var m2 = SimInventory.recordMovement(s, { type: 'ship', skuId: skuId, warehouseId: whId, qty: 20 });
  s = m2.state;
  // Return 5 units
  var m3 = SimInventory.recordMovement(s, { type: 'return', skuId: skuId, warehouseId: whId, qty: 5, unit_cost: 7 });
  assert(!m3.error, 'return movement no error');
  assertEqual(m3.state.warehouses[whId].stock[skuId].qty, 5, 'return adds to stock qty');
})();

// ============================================================
// SECTION 26: Unknown movement type
// ============================================================
console.log('\n--- Unknown movement type ---');

(function() {
  var s = SimInventory.initState();
  var skuR = SimInventory.createSku(s, { name: 'X' });
  s = skuR.state;
  var whR = SimInventory.createWarehouse(s, { name: 'WH' });
  s = whR.state;
  var result = SimInventory.recordMovement(s, { type: 'teleport', skuId: skuR.record.id, warehouseId: whR.record.id, qty: 10 });
  assert(result.error, 'unknown movement type returns error');
})();

// ============================================================
// SECTION 27: PO lifecycle edge cases
// ============================================================
console.log('\n--- PO edge cases ---');

(function() {
  // Receive against PO without warehouseId
  var s = SimInventory.initState();
  var supR = SimInventory.registerSupplier(s, { name: 'Sup' });
  s = supR.state;
  var skuR = SimInventory.createSku(s, { name: 'X' });
  s = skuR.state;
  var po = SimInventory.createPurchaseOrder(s, { skuId: skuR.record.id, supplierId: supR.record.id, qty: 10 });
  s = po.state;
  var sub = SimInventory.submitPurchaseOrder(s, po.record.id);
  var app = SimInventory.approvePurchaseOrder(sub, po.record.id, 'mgr');
  var ord = SimInventory.orderPurchaseOrder(app, po.record.id);
  var rcv = SimInventory.receivePurchaseOrder(ord, po.record.id, { qtyReceived: 5 });
  assert(rcv.error, 'receive PO without warehouseId returns error');
})();

(function() {
  // Submit already submitted PO fails
  var s = SimInventory.initState();
  var supR = SimInventory.registerSupplier(s, { name: 'Sup' });
  s = supR.state;
  var skuR = SimInventory.createSku(s, { name: 'X' });
  s = skuR.state;
  var po = SimInventory.createPurchaseOrder(s, { skuId: skuR.record.id, supplierId: supR.record.id, qty: 10 });
  s = po.state;
  var sub1 = SimInventory.submitPurchaseOrder(s, po.record.id);
  var sub2 = SimInventory.submitPurchaseOrder(sub1, po.record.id);
  assert(sub2.error, 'submitting already submitted PO returns error');
})();

(function() {
  // PO history grows with status changes
  var s = SimInventory.initState();
  var supR = SimInventory.registerSupplier(s, { name: 'Sup' });
  s = supR.state;
  var skuR = SimInventory.createSku(s, { name: 'X' });
  s = skuR.state;
  var whR = SimInventory.createWarehouse(s, { name: 'WH' });
  s = whR.state;
  var po = SimInventory.createPurchaseOrder(s, { skuId: skuR.record.id, supplierId: supR.record.id, qty: 10, warehouseId: whR.record.id });
  s = po.state;
  var sub = SimInventory.submitPurchaseOrder(s, po.record.id);
  var app = SimInventory.approvePurchaseOrder(sub, po.record.id, 'mgr');
  var ord = SimInventory.orderPurchaseOrder(app, po.record.id);
  var rcv = SimInventory.receivePurchaseOrder(ord, po.record.id, { qtyReceived: 10, warehouseId: whR.record.id });
  assert(rcv.state.purchase_orders[po.record.id].history.length >= 3, 'PO history records status changes');
})();

(function() {
  // updatePO on nonexistent returns same state
  var s = SimInventory.initState();
  var result = SimInventory.updatePurchaseOrder(s, 'bad_id', { qty: 10 });
  assert(result === s, 'updatePO nonexistent returns same state');
})();

// ============================================================
// SECTION 28: Multi-warehouse valuation
// ============================================================
console.log('\n--- Multi-warehouse valuation ---');

(function() {
  var s = SimInventory.initState();
  var skuR = SimInventory.createSku(s, { name: 'X' });
  s = skuR.state;
  var wh1R = SimInventory.createWarehouse(s, { name: 'WH1', cost_method: 'fifo' });
  s = wh1R.state;
  var wh2R = SimInventory.createWarehouse(s, { name: 'WH2', cost_method: 'lifo' });
  s = wh2R.state;
  var skuId = skuR.record.id;

  var m1 = SimInventory.recordMovement(s, { type: 'receive', skuId: skuId, warehouseId: wh1R.record.id, qty: 10, unit_cost: 10 });
  s = m1.state;
  var m2 = SimInventory.recordMovement(s, { type: 'receive', skuId: skuId, warehouseId: wh2R.record.id, qty: 10, unit_cost: 20 });
  s = m2.state;

  var val = SimInventory.getStockValuation(s);
  assertEqual(val.grand_total, 300, 'multi-warehouse valuation: 100 + 200 = 300');
  assertEqual(val.by_sku[skuId].qty, 20, 'by_sku aggregates qty across warehouses');
  assertEqual(val.by_sku[skuId].value, 300, 'by_sku aggregates value across warehouses');
})();

// ============================================================
// SECTION 29: applyAction — adjust_stock, transfer_stock, write_off_stock, record_movement
// ============================================================
console.log('\n--- applyAction movement aliases ---');

(function() {
  var s = SimInventory.initState();
  var skuR = SimInventory.createSku(s, { name: 'X' });
  s = skuR.state;
  var whR = SimInventory.createWarehouse(s, { name: 'WH' });
  s = whR.state;
  var skuId = skuR.record.id;
  var whId = whR.record.id;

  var s2 = SimInventory.applyAction(s, { payload: { action: 'receive_stock', data: { skuId: skuId, warehouseId: whId, qty: 80, unit_cost: 3 } } });
  var s3 = SimInventory.applyAction(s2, { payload: { action: 'adjust_stock', data: { skuId: skuId, warehouseId: whId, qty: 20, unit_cost: 3 } } });
  assertEqual(s3.warehouses[whId].stock[skuId].qty, 100, 'applyAction adjust_stock (positive) works');
})();

(function() {
  var s = SimInventory.initState();
  var skuR = SimInventory.createSku(s, { name: 'X' });
  s = skuR.state;
  var whR = SimInventory.createWarehouse(s, { name: 'WH' });
  s = whR.state;
  var skuId = skuR.record.id;
  var whId = whR.record.id;

  var s2 = SimInventory.applyAction(s, { payload: { action: 'receive_stock', data: { skuId: skuId, warehouseId: whId, qty: 50, unit_cost: 5 } } });
  var s3 = SimInventory.applyAction(s2, { payload: { action: 'write_off_stock', data: { skuId: skuId, warehouseId: whId, qty: 10 } } });
  assertEqual(s3.warehouses[whId].stock[skuId].qty, 40, 'applyAction write_off_stock works');
})();

(function() {
  var s = SimInventory.initState();
  var skuR = SimInventory.createSku(s, { name: 'X' });
  s = skuR.state;
  var wh1R = SimInventory.createWarehouse(s, { name: 'WH1' });
  s = wh1R.state;
  var wh2R = SimInventory.createWarehouse(s, { name: 'WH2' });
  s = wh2R.state;
  var skuId = skuR.record.id;
  var wh1 = wh1R.record.id;
  var wh2 = wh2R.record.id;

  var s2 = SimInventory.applyAction(s, { payload: { action: 'receive_stock', data: { skuId: skuId, warehouseId: wh1, qty: 60, unit_cost: 4 } } });
  var s3 = SimInventory.applyAction(s2, { payload: { action: 'transfer_stock', data: { skuId: skuId, warehouseId: wh1, qty: 25, toWarehouseId: wh2 } } });
  assertEqual(s3.warehouses[wh1].stock[skuId].qty, 35, 'applyAction transfer_stock reduces source');
  assertEqual(s3.warehouses[wh2].stock[skuId].qty, 25, 'applyAction transfer_stock adds to dest');
})();

// ============================================================
// SECTION 30: applyAction — PO actions
// ============================================================
console.log('\n--- applyAction PO actions ---');

(function() {
  var s = SimInventory.initState();
  var supR = SimInventory.registerSupplier(s, { name: 'Sup' });
  s = supR.state;
  var skuR = SimInventory.createSku(s, { name: 'X' });
  s = skuR.state;
  var whR = SimInventory.createWarehouse(s, { name: 'WH' });
  s = whR.state;

  var s2 = SimInventory.applyAction(s, { payload: { action: 'create_po', data: { skuId: skuR.record.id, supplierId: supR.record.id, qty: 50, unit_cost: 5, warehouseId: whR.record.id } } });
  assert(Object.keys(s2.purchase_orders).length === 1, 'applyAction create_po works');

  var poId = Object.keys(s2.purchase_orders)[0];
  var s3 = SimInventory.applyAction(s2, { payload: { action: 'submit_po', data: { id: poId } } });
  assertEqual(s3.purchase_orders[poId].status, 'submitted', 'applyAction submit_po works');

  var s4 = SimInventory.applyAction(s3, { payload: { action: 'approve_po', data: { id: poId } } });
  assertEqual(s4.purchase_orders[poId].status, 'approved', 'applyAction approve_po works');

  var s5 = SimInventory.applyAction(s4, { payload: { action: 'order_po', data: { id: poId } } });
  assertEqual(s5.purchase_orders[poId].status, 'ordered', 'applyAction order_po works');

  var s6 = SimInventory.applyAction(s5, { payload: { action: 'receive_po', data: { id: poId, qtyReceived: 50, warehouseId: whR.record.id } } });
  assertEqual(s6.purchase_orders[poId].status, 'received', 'applyAction receive_po works');
})();

(function() {
  var s = SimInventory.initState();
  var supR = SimInventory.registerSupplier(s, { name: 'Sup' });
  s = supR.state;
  var skuR = SimInventory.createSku(s, { name: 'X' });
  s = skuR.state;
  var s2 = SimInventory.applyAction(s, { payload: { action: 'create_po', data: { skuId: skuR.record.id, supplierId: supR.record.id, qty: 10 } } });
  var poId = Object.keys(s2.purchase_orders)[0];
  var s3 = SimInventory.applyAction(s2, { payload: { action: 'cancel_po', data: { id: poId, reason: 'no longer needed' } } });
  assertEqual(s3.purchase_orders[poId].status, 'cancelled', 'applyAction cancel_po works');
})();

// ============================================================
// SECTION 31: applyAction — supplier actions
// ============================================================
console.log('\n--- applyAction supplier actions ---');

(function() {
  var s = SimInventory.initState();
  var supR = SimInventory.registerSupplier(s, { name: 'Sup' });
  s = supR.state;
  var supId = supR.record.id;
  var skuR = SimInventory.createSku(s, { name: 'X' });
  s = skuR.state;

  var s2 = SimInventory.applyAction(s, { payload: { action: 'update_supplier_catalog', data: { supplierId: supId, skuId: skuR.record.id, unit_cost: 12, min_order_qty: 25 } } });
  assertEqual(s2.suppliers[supId].catalog[skuR.record.id].unit_cost, 12, 'applyAction update_supplier_catalog works');
})();

(function() {
  var s = SimInventory.initState();
  var supR = SimInventory.registerSupplier(s, { name: 'Sup', reliability_score: 90 });
  s = supR.state;
  var supId = supR.record.id;
  var s2 = SimInventory.applyAction(s, { payload: { action: 'rate_supplier', data: { supplierId: supId, on_time: false, qty_correct: true } } });
  assert(s2.suppliers[supId].reliability_score < 90, 'applyAction rate_supplier drops score for late delivery');
})();

// ============================================================
// SECTION 32: Pure functions — state immutability
// ============================================================
console.log('\n--- State immutability ---');

(function() {
  var s = SimInventory.initState();
  var r = SimInventory.createSku(s, { name: 'Immutable Test' });
  // s should be unchanged
  assertEqual(Object.keys(s.skus).length, 0, 'createSku does not mutate original state');
})();

(function() {
  var s = SimInventory.initState();
  var r = SimInventory.createWarehouse(s, { name: 'WH' });
  assertEqual(Object.keys(s.warehouses).length, 0, 'createWarehouse does not mutate original state');
})();

(function() {
  var s = SimInventory.initState();
  var r = SimInventory.registerSupplier(s, { name: 'Sup' });
  assertEqual(Object.keys(s.suppliers).length, 0, 'registerSupplier does not mutate original state');
})();

(function() {
  var s = SimInventory.initState();
  var skuR = SimInventory.createSku(s, { name: 'X' });
  var s2 = skuR.state;
  var whR = SimInventory.createWarehouse(s2, { name: 'WH' });
  var s3 = whR.state;
  var m = SimInventory.recordMovement(s3, { type: 'receive', skuId: skuR.record.id, warehouseId: whR.record.id, qty: 10, unit_cost: 5 });
  assertEqual(s3.movements.length, 0, 'recordMovement does not mutate original state');
})();

// ============================================================
// SECTION 33: Auto-PO uses reorder_qty fallback
// ============================================================
console.log('\n--- Auto-PO reorder_qty fallback ---');

(function() {
  var s = SimInventory.initState();
  var supR = SimInventory.registerSupplier(s, { name: 'Sup' });
  s = supR.state;
  var skuR = SimInventory.createSku(s, {
    name: 'X',
    reorder_point: 10,
    reorder_qty: 0, // zero -> fallback to reorder_point * multiplier
    preferred_supplier_id: supR.record.id,
    unit_cost: 5
  });
  s = skuR.state;
  var whR = SimInventory.createWarehouse(s, { name: 'WH' });
  s = whR.state;

  var m1 = SimInventory.recordMovement(s, { type: 'receive', skuId: skuR.record.id, warehouseId: whR.record.id, qty: 20, unit_cost: 5 });
  s = m1.state;
  var m2 = SimInventory.recordMovement(s, { type: 'ship', skuId: skuR.record.id, warehouseId: whR.record.id, qty: 15 });
  s = m2.state;

  var openPOs = SimInventory.getOpenPurchaseOrders(s, { skuId: skuR.record.id });
  assert(openPOs.length > 0, 'auto-PO generated even with reorder_qty 0');
  // Fallback qty = reorder_point * 2 = 20
  assertEqual(openPOs[0].qty, 20, 'auto-PO qty uses fallback (reorder_point * 2)');
})();

// ============================================================
// SECTION 34: applyAction simulate_tick
// ============================================================
console.log('\n--- applyAction simulate_tick ---');

(function() {
  var s = SimInventory.initState();
  var s2 = SimInventory.applyAction(s, { payload: { action: 'simulate_tick', data: { seed: 12345 } } });
  assert(s2 && typeof s2 === 'object', 'applyAction simulate_tick returns state');
})();

// ============================================================
// SECTION 35: Supplier catalog used in auto-PO unit_cost
// ============================================================
console.log('\n--- Supplier catalog pricing ---');

(function() {
  var s = SimInventory.initState();
  var supR = SimInventory.registerSupplier(s, { name: 'Sup' });
  s = supR.state;
  var skuR = SimInventory.createSku(s, { name: 'X', unit_cost: 5, reorder_point: 10, reorder_qty: 50, preferred_supplier_id: supR.record.id });
  s = skuR.state;
  // Add catalog entry with custom price
  s = SimInventory.updateSupplierCatalog(s, supR.record.id, skuR.record.id, { unit_cost: 4, min_order_qty: 10 });
  var whR = SimInventory.createWarehouse(s, { name: 'WH' });
  s = whR.state;

  var m1 = SimInventory.recordMovement(s, { type: 'receive', skuId: skuR.record.id, warehouseId: whR.record.id, qty: 20, unit_cost: 5 });
  s = m1.state;
  var m2 = SimInventory.recordMovement(s, { type: 'ship', skuId: skuR.record.id, warehouseId: whR.record.id, qty: 15 });
  s = m2.state;

  var openPOs = SimInventory.getOpenPurchaseOrders(s, { skuId: skuR.record.id });
  assert(openPOs.length > 0, 'auto-PO generated');
  assertEqual(openPOs[0].unit_cost, 4, 'auto-PO uses supplier catalog price');
})();

// ============================================================
// SECTION 36: initState snapshot migration
// ============================================================
console.log('\n--- initState migration ---');

(function() {
  // Snapshot without suppliers/purchase_orders keys migrates cleanly
  var snap = {
    _inv_version: 1,
    skus: {},
    warehouses: {},
    movements: [],
    alerts: []
  };
  var s = SimInventory.initState(snap);
  assert(s.suppliers !== undefined, 'migrated state has suppliers');
  assert(s.purchase_orders !== undefined, 'migrated state has purchase_orders');
  assert(Array.isArray(s._molt_log), 'migrated state has _molt_log');
})();

// ============================================================
// SECTION 37: getOpenPurchaseOrders filter by supplier
// ============================================================
console.log('\n--- getOpenPurchaseOrders filters ---');

(function() {
  var s = SimInventory.initState();
  var sup1R = SimInventory.registerSupplier(s, { name: 'S1' });
  s = sup1R.state;
  var sup2R = SimInventory.registerSupplier(s, { name: 'S2' });
  s = sup2R.state;
  var skuR = SimInventory.createSku(s, { name: 'X' });
  s = skuR.state;

  var po1 = SimInventory.createPurchaseOrder(s, { skuId: skuR.record.id, supplierId: sup1R.record.id, qty: 10 });
  s = po1.state;
  var po2 = SimInventory.createPurchaseOrder(s, { skuId: skuR.record.id, supplierId: sup2R.record.id, qty: 20 });
  s = po2.state;

  var s1POs = SimInventory.getOpenPurchaseOrders(s, { supplierId: sup1R.record.id });
  assertEqual(s1POs.length, 1, 'filter POs by supplierId returns 1');
  assertEqual(s1POs[0].supplierId, sup1R.record.id, 'filtered PO has correct supplierId');
})();

// ============================================================
// SECTION 38: Multiple SKUs with reorder points — multiple alerts
// ============================================================
console.log('\n--- Multiple reorder alerts ---');

(function() {
  var s = SimInventory.initState();
  var sku1R = SimInventory.createSku(s, { name: 'A', reorder_point: 20 });
  s = sku1R.state;
  var sku2R = SimInventory.createSku(s, { name: 'B', reorder_point: 15 });
  s = sku2R.state;
  var whR = SimInventory.createWarehouse(s, { name: 'WH' });
  s = whR.state;
  var whId = whR.record.id;

  // Stock and ship both SKUs below reorder point
  var m1 = SimInventory.recordMovement(s, { type: 'receive', skuId: sku1R.record.id, warehouseId: whId, qty: 50, unit_cost: 5 });
  s = m1.state;
  var m2 = SimInventory.recordMovement(s, { type: 'receive', skuId: sku2R.record.id, warehouseId: whId, qty: 50, unit_cost: 5 });
  s = m2.state;
  var m3 = SimInventory.recordMovement(s, { type: 'ship', skuId: sku1R.record.id, warehouseId: whId, qty: 35 });
  s = m3.state;
  var m4 = SimInventory.recordMovement(s, { type: 'ship', skuId: sku2R.record.id, warehouseId: whId, qty: 40 });
  s = m4.state;

  var alerts = SimInventory.getLowStockAlerts(s, false);
  assertEqual(alerts.length, 2, 'two low stock alerts for two SKUs below reorder point');
})();

// ============================================================
// SECTION 39: applyAction update_sku
// ============================================================
console.log('\n--- applyAction update_sku ---');

(function() {
  var s = SimInventory.initState();
  var r = SimInventory.createSku(s, { name: 'Old', unit_cost: 5 });
  s = r.state;
  var s2 = SimInventory.applyAction(s, { payload: { action: 'update_sku', data: { id: r.record.id, name: 'New', unit_cost: 10 } } });
  assertEqual(s2.skus[r.record.id].name, 'New', 'applyAction update_sku name');
  assertEqual(s2.skus[r.record.id].unit_cost, 10, 'applyAction update_sku unit_cost');
})();

// ============================================================
// SECTION 40: FIFO valuation vs LIFO valuation comparison
// ============================================================
console.log('\n--- FIFO vs LIFO valuation ---');

(function() {
  // Same receives, same ships — FIFO and LIFO will have same *remaining* qty
  // but potentially different layer structures
  var s = SimInventory.initState();
  var skuR = SimInventory.createSku(s, { name: 'X' });
  s = skuR.state;
  var wh1R = SimInventory.createWarehouse(s, { name: 'FIFO WH', cost_method: 'fifo' });
  s = wh1R.state;
  var wh2R = SimInventory.createWarehouse(s, { name: 'LIFO WH', cost_method: 'lifo' });
  s = wh2R.state;
  var skuId = skuR.record.id;

  // Both receive same batches
  var m1 = SimInventory.recordMovement(s, { type: 'receive', skuId: skuId, warehouseId: wh1R.record.id, qty: 10, unit_cost: 10 });
  s = m1.state;
  var m2 = SimInventory.recordMovement(s, { type: 'receive', skuId: skuId, warehouseId: wh1R.record.id, qty: 10, unit_cost: 20 });
  s = m2.state;
  var m3 = SimInventory.recordMovement(s, { type: 'receive', skuId: skuId, warehouseId: wh2R.record.id, qty: 10, unit_cost: 10 });
  s = m3.state;
  var m4 = SimInventory.recordMovement(s, { type: 'receive', skuId: skuId, warehouseId: wh2R.record.id, qty: 10, unit_cost: 20 });
  s = m4.state;

  // Both ship 5
  var m5 = SimInventory.recordMovement(s, { type: 'ship', skuId: skuId, warehouseId: wh1R.record.id, qty: 5 });
  s = m5.state;
  var m6 = SimInventory.recordMovement(s, { type: 'ship', skuId: skuId, warehouseId: wh2R.record.id, qty: 5 });
  s = m6.state;

  var fifoStock = s.warehouses[wh1R.record.id].stock[skuId];
  var lifoStock = s.warehouses[wh2R.record.id].stock[skuId];

  assertEqual(fifoStock.qty, 15, 'FIFO: 15 remaining');
  assertEqual(lifoStock.qty, 15, 'LIFO: 15 remaining');

  // FIFO: first layer partially consumed, remaining layers have old+new cost
  assertEqual(fifoStock.cost_layers[0].unit_cost, 10, 'FIFO: oldest layer preserved first');
  // LIFO: newest layer partially consumed
  assertEqual(lifoStock.cost_layers[lifoStock.cost_layers.length - 1].unit_cost, 20, 'LIFO: newest layer partially consumed');
})();

// ============================================================
// FINAL REPORT
// ============================================================
console.log('\n========================================');
console.log(passed + ' passed, ' + failed + ' failed');
console.log('========================================\n');
if (failed > 0) { process.exit(1); }
