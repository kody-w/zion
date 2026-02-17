// sim_crm.js — Self-evolving CRM Simulation (Dynamics 365-style)
// Article XI: Simulations run locally, store state as JSON, use pure functions.
// The state JSON IS the simulation — portable between raw GitHub and local disk.
// When an unknown action arrives, the simulation molts to handle it.
(function(exports) {
  'use strict';

  // --- Defaults (used only when creating a fresh state) ---

  var DEFAULT_PIPELINE = [
    'prospecting', 'qualification', 'proposal',
    'negotiation', 'closed_won', 'closed_lost'
  ];

  var DEFAULT_STAGE_PROB = {
    'prospecting': 10, 'qualification': 25, 'proposal': 50,
    'negotiation': 75, 'closed_won': 100, 'closed_lost': 0
  };

  var DEFAULT_ACTIVITY_TYPES = ['call', 'email', 'meeting', 'task'];

  var DEFAULT_SCHEMA = {
    collections: {
      accounts:      { prefix: 'acc', fields: ['name','industry','revenue','owner','status','zone'] },
      contacts:      { prefix: 'con', fields: ['name','email','phone','role','accountId','owner'] },
      opportunities: { prefix: 'opp', fields: ['name','accountId','stage','value','probability','owner','expected_close'] }
    },
    activity_types: DEFAULT_ACTIVITY_TYPES.slice(),
    pipeline_stages: DEFAULT_PIPELINE.slice(),
    stage_probabilities: JSON.parse(JSON.stringify(DEFAULT_STAGE_PROB))
  };

  var idCounter = 0;

  function generateId(prefix) {
    idCounter++;
    return prefix + '_' + Date.now().toString(36) + '_' + idCounter;
  }

  // --- State management ---

  function initState(snapshot) {
    if (snapshot && (snapshot.accounts || snapshot._schema)) {
      // Restore id counter from existing data
      var maxNum = 0;
      var schema = snapshot._schema || DEFAULT_SCHEMA;
      var collNames = objectKeys(schema.collections || {});
      // Also scan legacy top-level collections
      var scanKeys = collNames.concat(['accounts', 'contacts', 'opportunities']);
      for (var c = 0; c < scanKeys.length; c++) {
        var coll = snapshot[scanKeys[c]];
        if (coll && typeof coll === 'object' && !Array.isArray(coll)) {
          for (var k in coll) {
            if (coll.hasOwnProperty(k)) {
              var parts = k.split('_');
              var num = parseInt(parts[parts.length - 1], 10);
              if (!isNaN(num) && num > maxNum) { maxNum = num; }
            }
          }
        }
      }
      var activities = snapshot.activities || [];
      for (var a = 0; a < activities.length; a++) {
        if (activities[a].id) {
          var aParts = activities[a].id.split('_');
          var aNum = parseInt(aParts[aParts.length - 1], 10);
          if (!isNaN(aNum) && aNum > maxNum) { maxNum = aNum; }
        }
      }
      idCounter = maxNum;

      var loaded = JSON.parse(JSON.stringify(snapshot));
      // Ensure schema exists (migrate v1 states)
      if (!loaded._schema) {
        loaded._schema = JSON.parse(JSON.stringify(DEFAULT_SCHEMA));
      }
      if (!loaded._molt_log) { loaded._molt_log = []; }
      // Ensure pipeline_stages at top level for backward compat
      if (!loaded.pipeline_stages) {
        loaded.pipeline_stages = loaded._schema.pipeline_stages.slice();
      }
      return loaded;
    }
    return {
      _schema: JSON.parse(JSON.stringify(DEFAULT_SCHEMA)),
      _molt_log: [],
      accounts: {},
      contacts: {},
      opportunities: {},
      activities: [],
      pipeline_stages: DEFAULT_PIPELINE.slice()
    };
  }

  // --- Molt: the simulation adapts ---

  function molt(state, reason) {
    var s = clone(state);
    if (!s._molt_log) { s._molt_log = []; }
    s._molt_log.push({
      v: s._molt_log.length + 1,
      reason: reason,
      ts: new Date().toISOString()
    });
    return s;
  }

  function ensureCollection(state, collName, prefix) {
    if (state[collName] && typeof state[collName] === 'object' && !Array.isArray(state[collName])) {
      return state;
    }
    var s = molt(state, 'New collection: ' + collName);
    s[collName] = {};
    if (!s._schema.collections[collName]) {
      s._schema.collections[collName] = { prefix: prefix || collName.substring(0, 3), fields: [] };
    }
    return s;
  }

  function ensurePipelineStage(state, stageName) {
    var stages = state._schema.pipeline_stages;
    if (stages.indexOf(stageName) !== -1) { return state; }
    var s = molt(state, 'New pipeline stage: ' + stageName);
    // Insert before closed stages
    var closedIdx = stages.indexOf('closed_won');
    if (closedIdx === -1) { closedIdx = stages.length; }
    s._schema.pipeline_stages.splice(closedIdx, 0, stageName);
    s.pipeline_stages = s._schema.pipeline_stages.slice();
    if (!s._schema.stage_probabilities[stageName]) {
      // Estimate probability based on position
      var pos = s._schema.pipeline_stages.indexOf(stageName);
      var total = s._schema.pipeline_stages.length;
      s._schema.stage_probabilities[stageName] = Math.round((pos / (total - 1)) * 100);
    }
    return s;
  }

  function ensureActivityType(state, typeName) {
    if (state._schema.activity_types.indexOf(typeName) !== -1) { return state; }
    var s = molt(state, 'New activity type: ' + typeName);
    s._schema.activity_types.push(typeName);
    return s;
  }

  function learnFields(state, collName, data) {
    // Absorb any new fields into the schema
    var schema = state._schema;
    if (!schema.collections[collName]) { return state; }
    var known = schema.collections[collName].fields;
    var newFields = [];
    for (var k in data) {
      if (data.hasOwnProperty(k) && k !== 'id' && k !== 'owner' && known.indexOf(k) === -1) {
        newFields.push(k);
      }
    }
    if (newFields.length === 0) { return state; }
    var s = molt(state, 'New fields on ' + collName + ': ' + newFields.join(', '));
    for (var i = 0; i < newFields.length; i++) {
      s._schema.collections[collName].fields.push(newFields[i]);
    }
    return s;
  }

  // --- Action dispatch (with molting) ---

  function applyAction(state, msg) {
    var payload = msg.payload || msg;
    var action = payload.action;
    var data = payload.data || {};
    var from = msg.from || payload.from || 'system';
    var result;

    // Ensure schema exists
    if (!state._schema) {
      state = initState(state);
    }

    switch (action) {
      case 'create_account':
        result = createAccount(state, mergeOwner(data, from));
        return result.state;

      case 'update_account':
        return updateAccount(state, data.id, data);

      case 'create_contact':
        result = createContact(state, mergeOwner(data, from));
        return result.state;

      case 'update_contact':
        return updateContact(state, data.id, data);

      case 'create_opportunity':
        result = createOpportunity(state, mergeOwner(data, from));
        return result.state;

      case 'update_stage':
        return updateStage(state, data.id, data.stage);

      case 'close_deal':
        return closeDeal(state, data.id, data.won, data);

      case 'log_activity':
        result = logActivity(state, mergeOwner(data, from));
        return result.state;

      case 'add_note':
        return addNote(state, data.entityType, data.entityId, data.text, from);

      default:
        // --- MOLT: handle unknown actions ---
        return moltForAction(state, action, data, from);
    }
  }

  /**
   * When the simulation doesn't know an action, it molts.
   * Patterns: create_X, update_X, delete_X, list_X
   */
  function moltForAction(state, action, data, from) {
    if (!action || typeof action !== 'string') { return state; }

    var parts = action.split('_');
    if (parts.length < 2) { return state; }

    var verb = parts[0];
    // e.g. create_lead → verb=create, entitySingular=lead, collName=leads
    var entitySingular = parts.slice(1).join('_');
    var collName = entitySingular + 's';
    var prefix = entitySingular.substring(0, 3);

    if (verb === 'create') {
      var s = ensureCollection(state, collName, prefix);
      s = learnFields(s, collName, data);
      var s2 = clone(s);
      var id = generateId(prefix);
      var record = { id: id, owner: data.owner || from, createdAt: new Date().toISOString() };
      for (var k in data) {
        if (data.hasOwnProperty(k)) { record[k] = data[k]; }
      }
      if (!record.name) { record.name = 'Unnamed ' + entitySingular; }
      if (!record.notes) { record.notes = []; }
      s2[collName][id] = record;
      return s2;

    } else if (verb === 'update') {
      if (!state[collName] || !data.id || !state[collName][data.id]) { return state; }
      var su = clone(state);
      su = learnFields(su, collName, data);
      var target = su[collName][data.id];
      for (var uk in data) {
        if (data.hasOwnProperty(uk) && uk !== 'id') { target[uk] = data[uk]; }
      }
      target.updatedAt = new Date().toISOString();
      return su;

    } else if (verb === 'delete') {
      if (!state[collName] || !data.id || !state[collName][data.id]) { return state; }
      var sd = clone(state);
      delete sd[collName][data.id];
      return sd;

    } else if (verb === 'list') {
      // Read-only, no state change
      return state;
    }

    return state;
  }

  function mergeOwner(data, from) {
    var out = {};
    for (var k in data) {
      if (data.hasOwnProperty(k)) { out[k] = data[k]; }
    }
    if (!out.owner) { out.owner = from; }
    return out;
  }

  // --- CRUD: Accounts ---

  function createAccount(state, data) {
    var s = learnFields(state, 'accounts', data);
    s = clone(s);
    var id = generateId('acc');
    var record = {
      id: id,
      name: data.name || 'Unnamed Account',
      industry: data.industry || 'general',
      revenue: data.revenue || 0,
      owner: data.owner || 'system',
      status: data.status || 'active',
      zone: data.zone || 'agora',
      notes: [],
      createdAt: new Date().toISOString()
    };
    // Absorb extra fields from data
    for (var k in data) {
      if (data.hasOwnProperty(k) && record[k] === undefined) { record[k] = data[k]; }
    }
    s.accounts[id] = record;
    return { state: s, record: record };
  }

  function updateAccount(state, id, data) {
    if (!state.accounts[id]) { return state; }
    var s = learnFields(state, 'accounts', data);
    s = clone(s);
    var acct = s.accounts[id];
    for (var k in data) {
      if (data.hasOwnProperty(k) && k !== 'id') { acct[k] = data[k]; }
    }
    acct.updatedAt = new Date().toISOString();
    return s;
  }

  // --- CRUD: Contacts ---

  function createContact(state, data) {
    var s = learnFields(state, 'contacts', data);
    s = clone(s);
    var id = generateId('con');
    var record = {
      id: id,
      name: data.name || 'Unnamed Contact',
      email: data.email || '',
      phone: data.phone || '',
      role: data.role || '',
      accountId: data.accountId || '',
      owner: data.owner || 'system',
      notes: [],
      createdAt: new Date().toISOString()
    };
    for (var k in data) {
      if (data.hasOwnProperty(k) && record[k] === undefined) { record[k] = data[k]; }
    }
    s.contacts[id] = record;
    return { state: s, record: record };
  }

  function updateContact(state, id, data) {
    if (!state.contacts[id]) { return state; }
    var s = learnFields(state, 'contacts', data);
    s = clone(s);
    var con = s.contacts[id];
    for (var k in data) {
      if (data.hasOwnProperty(k) && k !== 'id') { con[k] = data[k]; }
    }
    con.updatedAt = new Date().toISOString();
    return s;
  }

  // --- CRUD: Opportunities ---

  function createOpportunity(state, data) {
    var s = state;
    var stage = data.stage || 'prospecting';
    // Molt if unknown stage
    if (s._schema && s._schema.pipeline_stages.indexOf(stage) === -1) {
      s = ensurePipelineStage(s, stage);
    }
    s = learnFields(s, 'opportunities', data);
    s = clone(s);
    var id = generateId('opp');
    var probs = s._schema ? s._schema.stage_probabilities : DEFAULT_STAGE_PROB;
    var record = {
      id: id,
      name: data.name || 'Unnamed Opportunity',
      accountId: data.accountId || '',
      stage: stage,
      value: data.value || 0,
      probability: data.probability !== undefined ? data.probability : (probs[stage] || 0),
      owner: data.owner || 'system',
      expected_close: data.expected_close || '',
      notes: [],
      createdAt: new Date().toISOString()
    };
    for (var k in data) {
      if (data.hasOwnProperty(k) && record[k] === undefined) { record[k] = data[k]; }
    }
    s.opportunities[id] = record;
    return { state: s, record: record };
  }

  function updateStage(state, oppId, newStage) {
    if (!state.opportunities[oppId]) { return state; }
    var s = state;
    var stages = s._schema ? s._schema.pipeline_stages : DEFAULT_PIPELINE;
    // Molt if unknown stage
    if (stages.indexOf(newStage) === -1) {
      s = ensurePipelineStage(s, newStage);
      stages = s._schema.pipeline_stages;
    }
    s = clone(s);
    var opp = s.opportunities[oppId];
    if (opp.stage === 'closed_won' || opp.stage === 'closed_lost') { return state; }
    opp.stage = newStage;
    var probs = s._schema ? s._schema.stage_probabilities : DEFAULT_STAGE_PROB;
    opp.probability = probs[newStage] !== undefined ? probs[newStage] : opp.probability;
    opp.updatedAt = new Date().toISOString();
    return s;
  }

  function closeDeal(state, oppId, won, details) {
    if (!state.opportunities[oppId]) { return state; }
    var s = clone(state);
    var opp = s.opportunities[oppId];
    opp.stage = won ? 'closed_won' : 'closed_lost';
    opp.probability = won ? 100 : 0;
    if (details && details.value !== undefined) { opp.value = details.value; }
    if (details && details.reason) { opp.close_reason = details.reason; }
    opp.closedAt = new Date().toISOString();
    opp.updatedAt = opp.closedAt;
    return s;
  }

  // --- Activities ---

  function logActivity(state, data) {
    var s = state;
    var actType = data.type || 'task';
    // Molt if unknown activity type
    if (s._schema && s._schema.activity_types.indexOf(actType) === -1) {
      s = ensureActivityType(s, actType);
    }
    s = clone(s);
    var id = generateId('act');
    var record = {
      id: id,
      type: actType,
      subject: data.subject || '',
      regarding: data.regarding || '',
      regardingType: data.regardingType || '',
      status: data.status || 'open',
      owner: data.owner || 'system',
      notes: data.notes || '',
      createdAt: new Date().toISOString()
    };
    s.activities.push(record);
    return { state: s, record: record };
  }

  // --- Notes ---

  function addNote(state, entityType, entityId, text, author) {
    // Look up collection from schema
    var collName = entityType;
    if (!state[collName]) {
      // Try singular→plural
      collName = entityType + 's';
    }
    // Also support legacy singular names
    var singularMap = { account: 'accounts', contact: 'contacts', opportunity: 'opportunities' };
    if (singularMap[entityType]) { collName = singularMap[entityType]; }

    if (!state[collName] || !state[collName][entityId]) { return state; }
    var s = clone(state);
    var entity = s[collName][entityId];
    if (!entity.notes) { entity.notes = []; }
    entity.notes.push({
      text: text,
      author: author || 'system',
      ts: new Date().toISOString()
    });
    return s;
  }

  // --- Query ---

  function query(state, entityType, filters) {
    // Resolve collection name — try exact, then plural, then legacy map
    var collName = entityType;
    var legacy = {
      account: 'accounts', accounts: 'accounts',
      contact: 'contacts', contacts: 'contacts',
      opportunity: 'opportunities', opportunities: 'opportunities',
      activity: 'activities', activities: 'activities'
    };
    if (legacy[entityType]) {
      collName = legacy[entityType];
    } else if (!state[collName] && state[collName + 's']) {
      collName = collName + 's';
    }

    var source = state[collName];
    if (!source) { return []; }
    var items;

    if (Array.isArray(source)) {
      items = source.slice();
    } else {
      items = [];
      for (var k in source) {
        if (source.hasOwnProperty(k)) {
          items.push(source[k]);
        }
      }
    }

    if (!filters) { return items; }

    return items.filter(function(item) {
      for (var key in filters) {
        if (filters.hasOwnProperty(key)) {
          if (item[key] !== filters[key]) { return false; }
        }
      }
      return true;
    });
  }

  // --- Metrics ---

  function getMetrics(state) {
    var accounts = state.accounts || {};
    var opportunities = state.opportunities || {};
    var contacts = state.contacts || {};
    var activities = state.activities || [];
    var stages = (state._schema && state._schema.pipeline_stages) || DEFAULT_PIPELINE;

    var accountCount = 0;
    for (var a in accounts) { if (accounts.hasOwnProperty(a)) { accountCount++; } }

    var contactCount = 0;
    for (var c in contacts) { if (contacts.hasOwnProperty(c)) { contactCount++; } }

    var oppCount = 0;
    var pipelineValue = 0;
    var wonCount = 0;
    var lostCount = 0;
    var wonValue = 0;
    var closedCount = 0;
    var stageBreakdown = {};

    for (var i = 0; i < stages.length; i++) {
      stageBreakdown[stages[i]] = { count: 0, value: 0 };
    }

    for (var o in opportunities) {
      if (opportunities.hasOwnProperty(o)) {
        var opp = opportunities[o];
        oppCount++;
        var stage = opp.stage || 'prospecting';
        if (stageBreakdown[stage]) {
          stageBreakdown[stage].count++;
          stageBreakdown[stage].value += opp.value || 0;
        }
        if (stage === 'closed_won') {
          wonCount++;
          wonValue += opp.value || 0;
          closedCount++;
        } else if (stage === 'closed_lost') {
          lostCount++;
          closedCount++;
        } else {
          pipelineValue += opp.value || 0;
        }
      }
    }

    var conversionRate = closedCount > 0 ? Math.round((wonCount / closedCount) * 100) : 0;

    // Count molted collections beyond the 3 defaults
    var extraCollections = [];
    if (state._schema && state._schema.collections) {
      var collKeys = objectKeys(state._schema.collections);
      for (var ci = 0; ci < collKeys.length; ci++) {
        if (['accounts', 'contacts', 'opportunities'].indexOf(collKeys[ci]) === -1) {
          extraCollections.push(collKeys[ci]);
        }
      }
    }

    return {
      accounts_count: accountCount,
      contacts_count: contactCount,
      opportunities_count: oppCount,
      pipeline_value: pipelineValue,
      won_count: wonCount,
      won_value: wonValue,
      lost_count: lostCount,
      conversion_rate: conversionRate,
      activity_count: activities.length,
      stage_breakdown: stageBreakdown,
      molt_count: (state._molt_log || []).length,
      extra_collections: extraCollections
    };
  }

  // --- Simulation tick ---

  var OPEN_STAGES = ['prospecting', 'qualification', 'proposal', 'negotiation'];
  var STAGE_ADVANCE = {
    'prospecting': 'qualification',
    'qualification': 'proposal',
    'proposal': 'negotiation',
    'negotiation': 'closed_won'
  };

  var TICK_DEAL_NAMES = [
    'Enchanted Gem Lot', 'Potion Ingredient Bundle', 'Scroll Consignment',
    'Festival Supply Order', 'Armor Repair Contract', 'Seed Catalog Deal',
    'Map Commission', 'Instrument Materials', 'Forge Fuel Shipment',
    'Textile Dye Batch', 'Herb Subscription', 'Crystal Lens Order',
    'Waystone Part Supply', 'Lantern Oil Contract', 'Rune Ink Purchase'
  ];

  var TICK_ACTIVITY_SUBJECTS = [
    'Checked in on deal progress', 'Sent pricing update',
    'Met to discuss terms', 'Followed up after delivery',
    'Reviewed quarterly numbers', 'Negotiated bulk discount',
    'Introduced new product line', 'Resolved supply delay',
    'Scheduled next review', 'Collected feedback on service'
  ];

  var tickSeed = 1;
  var tickCount = 0;

  function tickRandom() {
    tickSeed = (tickSeed * 1664525 + 1013904223) & 0x7fffffff;
    return (tickSeed & 0xffff) / 0x10000;
  }

  function pickRandom(arr) {
    return arr[Math.floor(tickRandom() * arr.length)];
  }

  function objectKeys(obj) {
    var keys = [];
    for (var k in obj) { if (obj.hasOwnProperty(k)) { keys.push(k); } }
    return keys;
  }

  function simulateTick(state) {
    if (!state || !state.accounts) { return state; }

    tickCount++;
    tickSeed = ((Date.now() + tickCount * 7919) & 0x7fffffff) || 1;
    var s = state;
    var accIds = objectKeys(s.accounts);
    var oppIds = objectKeys(s.opportunities);
    if (accIds.length === 0) { return s; }

    var openOpps = [];
    for (var i = 0; i < oppIds.length; i++) {
      var opp = s.opportunities[oppIds[i]];
      if (opp && OPEN_STAGES.indexOf(opp.stage) !== -1) {
        openOpps.push(opp);
      }
    }

    if (openOpps.length > 0 && tickRandom() < 0.6) {
      var advOpp = pickRandom(openOpps);
      var nextStage = STAGE_ADVANCE[advOpp.stage];
      if (nextStage) {
        s = updateStage(s, advOpp.id, nextStage);
        if (nextStage === 'closed_won') {
          openOpps = openOpps.filter(function(o) { return o.id !== advOpp.id; });
        }
      }
    }

    if (tickRandom() < 0.7) {
      var actTypes = (s._schema && s._schema.activity_types) || DEFAULT_ACTIVITY_TYPES;
      var actOwner = s.accounts[pickRandom(accIds)].owner || 'system';
      var regarding = '';
      var regardingType = '';
      if (openOpps.length > 0 && tickRandom() > 0.3) {
        var refOpp = pickRandom(openOpps);
        regarding = refOpp.id;
        regardingType = 'opportunity';
      } else {
        regarding = pickRandom(accIds);
        regardingType = 'account';
      }
      var actResult = logActivity(s, {
        type: pickRandom(actTypes),
        subject: pickRandom(TICK_ACTIVITY_SUBJECTS),
        regarding: regarding,
        regardingType: regardingType,
        owner: actOwner,
        status: 'completed'
      });
      s = actResult.state;
    }

    if (tickRandom() < 0.15 && accIds.length > 0) {
      var accId = pickRandom(accIds);
      var acct = s.accounts[accId];
      var oppResult = createOpportunity(s, {
        name: pickRandom(TICK_DEAL_NAMES),
        accountId: accId,
        stage: pickRandom(['prospecting', 'prospecting', 'qualification']),
        value: Math.floor(tickRandom() * 4000) + 200,
        owner: acct.owner || 'system'
      });
      s = oppResult.state;
    }

    if (openOpps.length > 0 && tickRandom() < 0.1) {
      var closeOpp = pickRandom(openOpps);
      var won = tickRandom() < 0.65;
      s = closeDeal(s, closeOpp.id, won, {
        reason: won ? 'terms agreed' : 'budget constraints'
      });
    }

    return s;
  }

  // --- Helpers ---

  function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function getState() {
    return null;
  }

  // --- Exports ---

  exports.PIPELINE_STAGES = DEFAULT_PIPELINE;
  exports.ACTIVITY_TYPES = DEFAULT_ACTIVITY_TYPES;
  exports.initState = initState;
  exports.applyAction = applyAction;
  exports.createAccount = createAccount;
  exports.updateAccount = updateAccount;
  exports.createContact = createContact;
  exports.updateContact = updateContact;
  exports.createOpportunity = createOpportunity;
  exports.updateStage = updateStage;
  exports.closeDeal = closeDeal;
  exports.logActivity = logActivity;
  exports.addNote = addNote;
  exports.query = query;
  exports.getMetrics = getMetrics;
  exports.getState = getState;
  exports.simulateTick = simulateTick;
  exports.molt = molt;
  exports.ensureCollection = ensureCollection;
  exports.ensurePipelineStage = ensurePipelineStage;
  exports.ensureActivityType = ensureActivityType;

})(typeof module !== 'undefined' ? module.exports : (window.SimCRM = {}));
