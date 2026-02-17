// sim_crm.js — CRM Simulation (Dynamics 365-style)
// Article XI: Simulations run locally, store state as JSON, use pure functions.
(function(exports) {
  'use strict';

  var PIPELINE_STAGES = [
    'prospecting', 'qualification', 'proposal',
    'negotiation', 'closed_won', 'closed_lost'
  ];

  var STAGE_PROBABILITIES = {
    'prospecting': 10,
    'qualification': 25,
    'proposal': 50,
    'negotiation': 75,
    'closed_won': 100,
    'closed_lost': 0
  };

  var ACTIVITY_TYPES = ['call', 'email', 'meeting', 'task'];

  var idCounter = 0;

  function generateId(prefix) {
    idCounter++;
    return prefix + '_' + Date.now().toString(36) + '_' + idCounter;
  }

  // --- State management ---

  function initState(snapshot) {
    if (snapshot && snapshot.accounts) {
      // Restore id counter from existing data
      var maxNum = 0;
      var collections = ['accounts', 'contacts', 'opportunities'];
      for (var c = 0; c < collections.length; c++) {
        var coll = snapshot[collections[c]] || {};
        for (var k in coll) {
          if (coll.hasOwnProperty(k)) {
            var parts = k.split('_');
            var num = parseInt(parts[parts.length - 1], 10);
            if (!isNaN(num) && num > maxNum) { maxNum = num; }
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
      return JSON.parse(JSON.stringify(snapshot));
    }
    return {
      accounts: {},
      contacts: {},
      opportunities: {},
      activities: [],
      pipeline_stages: PIPELINE_STAGES.slice()
    };
  }

  // --- Action dispatch ---

  function applyAction(state, msg) {
    var payload = msg.payload || msg;
    var action = payload.action;
    var data = payload.data || {};
    var from = msg.from || payload.from || 'system';
    var result;

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
        return state;
    }
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
    var s = clone(state);
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
    s.accounts[id] = record;
    return { state: s, record: record };
  }

  function updateAccount(state, id, data) {
    if (!state.accounts[id]) { return state; }
    var s = clone(state);
    var acct = s.accounts[id];
    var fields = ['name', 'industry', 'revenue', 'owner', 'status', 'zone'];
    for (var i = 0; i < fields.length; i++) {
      var f = fields[i];
      if (data[f] !== undefined) { acct[f] = data[f]; }
    }
    acct.updatedAt = new Date().toISOString();
    return s;
  }

  // --- CRUD: Contacts ---

  function createContact(state, data) {
    var s = clone(state);
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
    s.contacts[id] = record;
    return { state: s, record: record };
  }

  function updateContact(state, id, data) {
    if (!state.contacts[id]) { return state; }
    var s = clone(state);
    var con = s.contacts[id];
    var fields = ['name', 'email', 'phone', 'role', 'accountId', 'owner'];
    for (var i = 0; i < fields.length; i++) {
      var f = fields[i];
      if (data[f] !== undefined) { con[f] = data[f]; }
    }
    con.updatedAt = new Date().toISOString();
    return s;
  }

  // --- CRUD: Opportunities ---

  function createOpportunity(state, data) {
    var s = clone(state);
    var id = generateId('opp');
    var stage = data.stage || 'prospecting';
    var record = {
      id: id,
      name: data.name || 'Unnamed Opportunity',
      accountId: data.accountId || '',
      stage: stage,
      value: data.value || 0,
      probability: data.probability !== undefined ? data.probability : (STAGE_PROBABILITIES[stage] || 0),
      owner: data.owner || 'system',
      expected_close: data.expected_close || '',
      notes: [],
      createdAt: new Date().toISOString()
    };
    s.opportunities[id] = record;
    return { state: s, record: record };
  }

  function updateStage(state, oppId, newStage) {
    if (!state.opportunities[oppId]) { return state; }
    if (PIPELINE_STAGES.indexOf(newStage) === -1) { return state; }
    var s = clone(state);
    var opp = s.opportunities[oppId];
    // Cannot move backwards from closed states
    if (opp.stage === 'closed_won' || opp.stage === 'closed_lost') { return state; }
    opp.stage = newStage;
    opp.probability = STAGE_PROBABILITIES[newStage] || opp.probability;
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
    var s = clone(state);
    var id = generateId('act');
    var record = {
      id: id,
      type: ACTIVITY_TYPES.indexOf(data.type) !== -1 ? data.type : 'task',
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
    var collections = { account: 'accounts', contact: 'contacts', opportunity: 'opportunities' };
    var collName = collections[entityType];
    if (!collName || !state[collName] || !state[collName][entityId]) { return state; }
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
    var collections = {
      account: 'accounts', accounts: 'accounts',
      contact: 'contacts', contacts: 'contacts',
      opportunity: 'opportunities', opportunities: 'opportunities',
      activity: 'activities', activities: 'activities'
    };
    var collName = collections[entityType];
    if (!collName) { return []; }

    var source = state[collName];
    var items;

    // Activities is an array, others are objects
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

    for (var i = 0; i < PIPELINE_STAGES.length; i++) {
      stageBreakdown[PIPELINE_STAGES[i]] = { count: 0, value: 0 };
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
      stage_breakdown: stageBreakdown
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
    // Simple LCG — tickCount ensures unique sequences even for same-ms calls
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

  /**
   * Advance CRM dynamics one tick. Called periodically from game loop.
   * Each tick picks 1-2 random actions: advance a deal, log an activity,
   * occasionally create a new opportunity or close a deal.
   * @param {object} state - Current CRM state
   * @returns {object} New CRM state
   */
  function simulateTick(state) {
    if (!state || !state.accounts) { return state; }

    tickCount++;
    tickSeed = ((Date.now() + tickCount * 7919) & 0x7fffffff) || 1;
    var s = state;
    var accIds = objectKeys(s.accounts);
    var oppIds = objectKeys(s.opportunities);
    if (accIds.length === 0) { return s; }

    // Gather open opportunities
    var openOpps = [];
    for (var i = 0; i < oppIds.length; i++) {
      var opp = s.opportunities[oppIds[i]];
      if (opp && OPEN_STAGES.indexOf(opp.stage) !== -1) {
        openOpps.push(opp);
      }
    }

    // Action 1: Advance a random open deal one stage (60% chance)
    if (openOpps.length > 0 && tickRandom() < 0.6) {
      var advOpp = pickRandom(openOpps);
      var nextStage = STAGE_ADVANCE[advOpp.stage];
      if (nextStage) {
        s = updateStage(s, advOpp.id, nextStage);
        // Remove from openOpps if it closed
        if (nextStage === 'closed_won') {
          openOpps = openOpps.filter(function(o) { return o.id !== advOpp.id; });
        }
      }
    }

    // Action 2: Log an activity (70% chance)
    if (tickRandom() < 0.7) {
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
        type: pickRandom(ACTIVITY_TYPES),
        subject: pickRandom(TICK_ACTIVITY_SUBJECTS),
        regarding: regarding,
        regardingType: regardingType,
        owner: actOwner,
        status: 'completed'
      });
      s = actResult.state;
    }

    // Action 3: Create a new opportunity (15% chance)
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

    // Action 4: Close a deal (10% chance — win or lose)
    if (openOpps.length > 0 && tickRandom() < 0.1) {
      var closeOpp = pickRandom(openOpps);
      var won = tickRandom() < 0.65; // 65% win rate
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
    return null; // Stateless module — caller manages state
  }

  // --- Exports ---

  exports.PIPELINE_STAGES = PIPELINE_STAGES;
  exports.ACTIVITY_TYPES = ACTIVITY_TYPES;
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

})(typeof module !== 'undefined' ? module.exports : (window.SimCRM = {}));
