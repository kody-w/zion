'use strict';
/**
 * Tests for src/js/async_collab.js
 * Run with: node tests/test_async_collab.js
 */

var AsyncCollab = require('../src/js/async_collab');

var passed = 0;
var failed = 0;
var errors = [];

function assert(condition, msg) {
    if (!condition) {
        failed++;
        var err = new Error(msg || 'Assertion failed');
        errors.push(err);
        console.log('  FAIL: ' + (msg || 'Assertion failed'));
    } else {
        passed++;
        console.log('  pass: ' + (msg || 'ok'));
    }
}

function assertEqual(a, b, msg) {
    var label = msg || ('Expected ' + JSON.stringify(a) + ' to equal ' + JSON.stringify(b));
    assert(a === b, label + ' (got: ' + JSON.stringify(a) + ', expected: ' + JSON.stringify(b) + ')');
}

function assertNotNull(val, msg) {
    assert(val !== null && val !== undefined, msg || 'Expected non-null value');
}

function assertNull(val, msg) {
    assert(val === null || val === undefined, msg || 'Expected null/undefined');
}

function assertDeepEqual(a, b, msg) {
    assert(JSON.stringify(a) === JSON.stringify(b), msg || 'Objects not deeply equal');
}

function suite(name, fn) {
    console.log('\n=== ' + name + ' ===');
    fn();
}

// ─── Fresh state helper ───────────────────────────────────────────────────────

function makeState() {
    return { projects: {}, todos: {} };
}

// ─── Suite 1: PROJECT_TYPES ───────────────────────────────────────────────────

suite('PROJECT_TYPES constants', function() {
    assert(typeof AsyncCollab.PROJECT_TYPES === 'object', 'PROJECT_TYPES is an object');

    var keys = Object.keys(AsyncCollab.PROJECT_TYPES);
    assertEqual(keys.length, 8, 'There are exactly 8 project types');

    var expectedTypes = [
        'community_garden', 'community_building', 'mural_artwork', 'aqueduct',
        'monument', 'great_library', 'workshop', 'amphitheater'
    ];
    for (var i = 0; i < expectedTypes.length; i++) {
        assert(AsyncCollab.PROJECT_TYPES[expectedTypes[i]] !== undefined, 'Has type: ' + expectedTypes[i]);
    }

    var requiredFields = ['id', 'name', 'category', 'maxContributors', 'phases', 'totalEffort', 'sparkRewardPerEffort', 'zone', 'description'];
    for (var t = 0; t < keys.length; t++) {
        var pt = AsyncCollab.PROJECT_TYPES[keys[t]];
        for (var f = 0; f < requiredFields.length; f++) {
            assert(pt[requiredFields[f]] !== undefined, pt.id + ' has field: ' + requiredFields[f]);
        }
    }

    // community_garden specifics
    var garden = AsyncCollab.PROJECT_TYPES.community_garden;
    assertEqual(garden.category, 'garden', 'community_garden category is garden');
    assertEqual(garden.maxContributors, 10, 'community_garden maxContributors is 10');
    assertEqual(garden.totalEffort, 375, 'community_garden totalEffort is 375');
    assertEqual(garden.sparkRewardPerEffort, 0.5, 'community_garden sparkRewardPerEffort is 0.5');
    assertEqual(garden.zone, 'gardens', 'community_garden zone is gardens');
    assertEqual(garden.phases.length, 4, 'community_garden has 4 phases');

    // Check all 8 categories are represented
    var categories = {};
    for (var c = 0; c < keys.length; c++) {
        categories[AsyncCollab.PROJECT_TYPES[keys[c]].category] = true;
    }
    var expectedCategories = ['garden', 'building', 'artwork', 'infrastructure', 'monument', 'library', 'workshop', 'performance'];
    for (var ec = 0; ec < expectedCategories.length; ec++) {
        assert(categories[expectedCategories[ec]], 'Has category: ' + expectedCategories[ec]);
    }

    // phases are arrays with name + effort
    for (var pt2 = 0; pt2 < keys.length; pt2++) {
        var type = AsyncCollab.PROJECT_TYPES[keys[pt2]];
        assert(Array.isArray(type.phases), type.id + ' phases is array');
        for (var ph = 0; ph < type.phases.length; ph++) {
            assert(typeof type.phases[ph].name === 'string', type.id + ' phase[' + ph + '] has name');
            assert(typeof type.phases[ph].effort === 'number', type.id + ' phase[' + ph + '] has effort');
            assert(type.phases[ph].effort > 0, type.id + ' phase[' + ph + '] effort > 0');
        }
    }
});

// ─── Suite 2: createProject ───────────────────────────────────────────────────

suite('createProject', function() {
    var state = makeState();

    var result = AsyncCollab.createProject(state, 'player1', 'community_garden', 'The Moonlight Garden', 'gardens', 1000);
    assert(result.success, 'createProject returns success');
    assertNotNull(result.project, 'createProject returns project');
    assertEqual(result.project.type, 'community_garden', 'project type is community_garden');
    assertEqual(result.project.title, 'The Moonlight Garden', 'project title correct');
    assertEqual(result.project.creatorId, 'player1', 'project creatorId correct');
    assertEqual(result.project.zone, 'gardens', 'project zone correct');
    assertEqual(result.project.status, 'active', 'new project status is active');
    assertEqual(result.project.currentPhase, 0, 'starts at phase 0');
    assertEqual(result.project.phaseProgress.length, 4, 'phaseProgress has 4 entries');
    assertEqual(result.project.createdAt, 1000, 'createdAt is currentTick');
    assertNull(result.project.completedAt, 'completedAt is null');
    assert(result.project.contributors['player1'] !== undefined, 'creator auto-joined as contributor');

    // Project is stored in state
    var stored = state.projects[result.project.id];
    assertNotNull(stored, 'project stored in state');
    assertEqual(stored.id, result.project.id, 'stored project has correct id');

    // phaseProgress all zeros initially
    for (var i = 0; i < result.project.phaseProgress.length; i++) {
        assertEqual(result.project.phaseProgress[i], 0, 'phaseProgress[' + i + '] starts at 0');
    }

    // Missing params
    var r2 = AsyncCollab.createProject(state, null, 'community_garden', 'title', 'gardens', 0);
    assert(!r2.success, 'fails without creatorId');

    var r3 = AsyncCollab.createProject(state, 'p1', null, 'title', 'gardens', 0);
    assert(!r3.success, 'fails without typeId');

    var r4 = AsyncCollab.createProject(state, 'p1', 'community_garden', null, 'gardens', 0);
    assert(!r4.success, 'fails without title');

    var r5 = AsyncCollab.createProject(state, 'p1', 'community_garden', 'title', null, 0);
    assert(!r5.success, 'fails without zone');

    // Unknown type
    var r6 = AsyncCollab.createProject(state, 'p1', 'dragon_castle', 'title', 'nexus', 0);
    assert(!r6.success, 'fails with unknown type');
    assertNotNull(r6.error, 'has error message for unknown type');

    // Multiple projects get unique IDs
    var s2 = makeState();
    var pA = AsyncCollab.createProject(s2, 'p1', 'community_garden', 'Garden A', 'gardens', 1);
    var pB = AsyncCollab.createProject(s2, 'p1', 'community_building', 'Building B', 'nexus', 2);
    assert(pA.project.id !== pB.project.id, 'each project gets unique id');
});

// ─── Suite 3: joinProject ─────────────────────────────────────────────────────

suite('joinProject', function() {
    var state = makeState();
    var cp = AsyncCollab.createProject(state, 'creator', 'community_garden', 'Test Garden', 'gardens', 1);
    var projectId = cp.project.id;

    var r1 = AsyncCollab.joinProject(state, 'player2', projectId);
    assert(r1.success, 'player2 can join project');
    assertNotNull(state.projects[projectId].contributors['player2'], 'player2 added to contributors');

    // Joining again fails
    var r2 = AsyncCollab.joinProject(state, 'player2', projectId);
    assert(!r2.success, 'cannot join twice');
    assertNotNull(r2.error, 'duplicate join has error message');

    // Joining non-existent project
    var r3 = AsyncCollab.joinProject(state, 'player3', 'proj_99999');
    assert(!r3.success, 'cannot join non-existent project');

    // Missing params
    var r4 = AsyncCollab.joinProject(state, null, projectId);
    assert(!r4.success, 'fails without playerId');

    var r5 = AsyncCollab.joinProject(state, 'player4', null);
    assert(!r5.success, 'fails without projectId');

    // Cannot join completed project
    AsyncCollab.completeProject(state, projectId, 100);
    var r6 = AsyncCollab.joinProject(state, 'player5', projectId);
    assert(!r6.success, 'cannot join completed project');

    // Cannot join abandoned project
    var s2 = makeState();
    var cp2 = AsyncCollab.createProject(s2, 'c1', 'workshop', 'WS', 'studio', 1);
    AsyncCollab.abandonProject(s2, cp2.project.id, 'test');
    var r7 = AsyncCollab.joinProject(s2, 'p2', cp2.project.id);
    assert(!r7.success, 'cannot join abandoned project');

    // Max contributors limit
    var s3 = makeState();
    var cpSmall = AsyncCollab.createProject(s3, 'owner', 'workshop', 'Small WS', 'studio', 1);
    // workshop maxContributors = 10; owner is already 1
    for (var i = 0; i < 9; i++) {
        AsyncCollab.joinProject(s3, 'filler_' + i, cpSmall.project.id);
    }
    var rFull = AsyncCollab.joinProject(s3, 'overflow', cpSmall.project.id);
    assert(!rFull.success, 'cannot exceed maxContributors');
});

// ─── Suite 4: leaveProject ────────────────────────────────────────────────────

suite('leaveProject', function() {
    var state = makeState();
    var cp = AsyncCollab.createProject(state, 'creator', 'community_garden', 'Garden', 'gardens', 1);
    var projectId = cp.project.id;
    AsyncCollab.joinProject(state, 'player2', projectId);

    var r1 = AsyncCollab.leaveProject(state, 'player2', projectId);
    assert(r1.success, 'player2 can leave project');
    assertNull(state.projects[projectId].contributors['player2'], 'player2 removed from contributors');

    // Leaving again fails
    var r2 = AsyncCollab.leaveProject(state, 'player2', projectId);
    assert(!r2.success, 'cannot leave if not a member');

    // Non-existent project
    var r3 = AsyncCollab.leaveProject(state, 'player3', 'proj_99999');
    assert(!r3.success, 'cannot leave non-existent project');

    // Missing params
    var r4 = AsyncCollab.leaveProject(state, null, projectId);
    assert(!r4.success, 'fails without playerId');

    var r5 = AsyncCollab.leaveProject(state, 'creator', null);
    assert(!r5.success, 'fails without projectId');
});

// ─── Suite 5: contribute ─────────────────────────────────────────────────────

suite('contribute', function() {
    var state = makeState();
    var cp = AsyncCollab.createProject(state, 'player1', 'community_garden', 'Garden', 'gardens', 1);
    var projectId = cp.project.id;

    // Basic contribution
    var r1 = AsyncCollab.contribute(state, 'player1', projectId, 10, 'First water', 2);
    assert(r1.success, 'contribution succeeds');
    assert(r1.sparkEarned > 0, 'Spark earned on contribution');
    assertEqual(r1.sparkEarned, 5, 'Spark = effort * sparkRewardPerEffort (10 * 0.5 = 5)');
    assert(!r1.phaseAdvanced, 'phase not advanced with partial effort');
    assert(!r1.projectCompleted, 'project not completed with partial effort');

    var contributor = state.projects[projectId].contributors['player1'];
    assertEqual(contributor.totalEffort, 10, 'contributor totalEffort updated');
    assertEqual(contributor.contributions.length, 1, 'contribution recorded');
    assertEqual(contributor.contributions[0].effort, 10, 'contribution effort recorded');
    assertEqual(contributor.contributions[0].tick, 2, 'contribution tick recorded');
    assertEqual(contributor.contributions[0].note, 'First water', 'contribution note recorded');

    // Phase advance: community_garden phase 0 needs 50 effort
    var r2 = AsyncCollab.contribute(state, 'player1', projectId, 40, 'Complete planning', 3);
    assert(r2.success, 'second contribution succeeds');
    assert(r2.phaseAdvanced, 'phase advances when effort met');
    assertEqual(state.projects[projectId].currentPhase, 1, 'project moved to phase 1');

    // Auto-join on contribute
    var r3 = AsyncCollab.contribute(state, 'newcomer', projectId, 5, 'Helped out', 4);
    assert(r3.success, 'non-member can contribute (auto-join)');
    assertNotNull(state.projects[projectId].contributors['newcomer'], 'newcomer auto-joined');

    // Invalid effort
    var r4 = AsyncCollab.contribute(state, 'player1', projectId, -5, 'Negative', 5);
    assert(!r4.success, 'negative effort fails');

    var r5 = AsyncCollab.contribute(state, 'player1', projectId, 0, 'Zero', 5);
    assert(!r5.success, 'zero effort fails');

    // Non-existent project
    var r6 = AsyncCollab.contribute(state, 'player1', 'proj_99999', 10, '', 5);
    assert(!r6.success, 'cannot contribute to non-existent project');

    // Cannot contribute to completed project
    var s2 = makeState();
    var cp2 = AsyncCollab.createProject(s2, 'p1', 'workshop', 'WS', 'studio', 1);
    AsyncCollab.completeProject(s2, cp2.project.id, 10);
    var r7 = AsyncCollab.contribute(s2, 'p1', cp2.project.id, 10, '', 20);
    assert(!r7.success, 'cannot contribute to completed project');

    // Project completion via contributions
    var s3 = makeState();
    var cp3 = AsyncCollab.createProject(s3, 'p1', 'community_garden', 'Garden', 'gardens', 1);
    // totalEffort = 375: phase0=50, phase1=100, phase2=150, phase3=75
    var bigR = AsyncCollab.contribute(s3, 'p1', cp3.project.id, 375, 'All at once', 5);
    assert(bigR.success, 'large contribution succeeds');
    assert(bigR.projectCompleted, 'project completed when all effort done');
    assertEqual(s3.projects[cp3.project.id].status, 'completed', 'project status is completed');
    assertNotNull(s3.projects[cp3.project.id].completedAt, 'completedAt set');

    // Missing params
    var r8 = AsyncCollab.contribute(state, null, projectId, 10, '', 5);
    assert(!r8.success, 'fails without playerId');
});

// ─── Suite 6: addTodo ─────────────────────────────────────────────────────────

suite('addTodo', function() {
    var state = makeState();
    var cp = AsyncCollab.createProject(state, 'player1', 'community_garden', 'Garden', 'gardens', 1);
    var projectId = cp.project.id;

    var r1 = AsyncCollab.addTodo(state, 'player1', projectId, 'Water the west plot', null, 10);
    assert(r1.success, 'addTodo succeeds');
    assertNotNull(r1.todo, 'returns todo object');
    assert(r1.todo.id.startsWith('todo_'), 'todo has id');
    assertEqual(r1.todo.projectId, projectId, 'todo has correct projectId');
    assertNull(r1.todo.assigneeId, 'unassigned todo assigneeId is null');
    assertEqual(r1.todo.description, 'Water the west plot', 'todo description correct');
    assertEqual(r1.todo.status, 'open', 'new todo status is open');
    assertEqual(r1.todo.createdBy, 'player1', 'createdBy correct');
    assertNull(r1.todo.completedAt, 'completedAt is null');
    assertEqual(r1.todo.effort, 10, 'todo effort correct');

    // Todo stored in state
    var storedTodo = state.todos[r1.todo.id];
    assertNotNull(storedTodo, 'todo stored in state');

    // Todo id in project
    assert(state.projects[projectId].todos.indexOf(r1.todo.id) !== -1, 'todo id in project.todos');

    // Assigned todo
    var r2 = AsyncCollab.addTodo(state, 'player1', projectId, 'Plant seeds', 'player2', 20);
    assert(r2.success, 'addTodo with assignee succeeds');
    assertEqual(r2.todo.assigneeId, 'player2', 'assigneeId is player2');

    // Default effort
    var r3 = AsyncCollab.addTodo(state, 'player1', projectId, 'Check soil', null, null);
    assert(r3.success, 'addTodo with no effort uses default');
    assertEqual(r3.todo.effort, 10, 'default effort is 10');

    // Missing params
    var r4 = AsyncCollab.addTodo(state, null, projectId, 'desc', null, 10);
    assert(!r4.success, 'fails without creatorId');

    var r5 = AsyncCollab.addTodo(state, 'player1', null, 'desc', null, 10);
    assert(!r5.success, 'fails without projectId');

    var r6 = AsyncCollab.addTodo(state, 'player1', projectId, null, null, 10);
    assert(!r6.success, 'fails without description');

    // Non-existent project
    var r7 = AsyncCollab.addTodo(state, 'player1', 'proj_99999', 'desc', null, 10);
    assert(!r7.success, 'fails for non-existent project');

    // Cannot add todo to completed project
    var s2 = makeState();
    var cp2 = AsyncCollab.createProject(s2, 'p1', 'workshop', 'WS', 'studio', 1);
    AsyncCollab.completeProject(s2, cp2.project.id, 5);
    var r8 = AsyncCollab.addTodo(s2, 'p1', cp2.project.id, 'Do something', null, 5);
    assert(!r8.success, 'cannot add todo to completed project');
});

// ─── Suite 7: claimTodo ───────────────────────────────────────────────────────

suite('claimTodo', function() {
    var state = makeState();
    var cp = AsyncCollab.createProject(state, 'player1', 'community_garden', 'Garden', 'gardens', 1);
    var projectId = cp.project.id;
    var t1 = AsyncCollab.addTodo(state, 'player1', projectId, 'Water plants', null, 10);
    var todoId = t1.todo.id;

    var r1 = AsyncCollab.claimTodo(state, 'player2', projectId, todoId);
    assert(r1.success, 'player2 can claim open todo');
    assertEqual(state.todos[todoId].status, 'in_progress', 'todo status is in_progress');
    assertEqual(state.todos[todoId].assigneeId, 'player2', 'assigneeId updated to player2');

    // Cannot claim already in_progress todo
    var r2 = AsyncCollab.claimTodo(state, 'player3', projectId, todoId);
    assert(!r2.success, 'cannot claim in_progress todo');

    // Cannot claim completed todo
    var t2 = AsyncCollab.addTodo(state, 'player1', projectId, 'Harvest', null, 5);
    AsyncCollab.completeTodo(state, 'player1', projectId, t2.todo.id, 10);
    var r3 = AsyncCollab.claimTodo(state, 'player2', projectId, t2.todo.id);
    assert(!r3.success, 'cannot claim completed todo');

    // Non-existent project
    var r4 = AsyncCollab.claimTodo(state, 'player1', 'proj_99999', todoId);
    assert(!r4.success, 'fails for non-existent project');

    // Non-existent todo
    var r5 = AsyncCollab.claimTodo(state, 'player1', projectId, 'todo_99999');
    assert(!r5.success, 'fails for non-existent todo');

    // Missing params
    var r6 = AsyncCollab.claimTodo(state, null, projectId, todoId);
    assert(!r6.success, 'fails without playerId');

    var r7 = AsyncCollab.claimTodo(state, 'player1', null, todoId);
    assert(!r7.success, 'fails without projectId');

    var r8 = AsyncCollab.claimTodo(state, 'player1', projectId, null);
    assert(!r8.success, 'fails without todoId');

    // Todo from different project cannot be claimed via wrong projectId
    var s2 = makeState();
    var cpA = AsyncCollab.createProject(s2, 'p1', 'workshop', 'WS_A', 'studio', 1);
    var cpB = AsyncCollab.createProject(s2, 'p1', 'workshop', 'WS_B', 'studio', 1);
    var tA = AsyncCollab.addTodo(s2, 'p1', cpA.project.id, 'Task A', null, 5);
    var r9 = AsyncCollab.claimTodo(s2, 'p2', cpB.project.id, tA.todo.id);
    assert(!r9.success, 'cannot claim todo via wrong projectId');
});

// ─── Suite 8: completeTodo ────────────────────────────────────────────────────

suite('completeTodo', function() {
    var state = makeState();
    var cp = AsyncCollab.createProject(state, 'player1', 'community_garden', 'Garden', 'gardens', 1);
    var projectId = cp.project.id;

    var t1 = AsyncCollab.addTodo(state, 'player1', projectId, 'Water plants', null, 20);
    var todoId = t1.todo.id;

    // Completing a todo counts as contribution
    var r1 = AsyncCollab.completeTodo(state, 'player2', projectId, todoId, 5);
    assert(r1.success, 'completeTodo succeeds');
    assert(r1.sparkEarned > 0, 'Spark earned from completing todo');
    assertEqual(state.todos[todoId].status, 'completed', 'todo status is completed');
    assertEqual(state.todos[todoId].completedAt, 5, 'todo completedAt set');
    assertEqual(state.todos[todoId].assigneeId, 'player2', 'assigneeId updated to completer');

    // Completing twice fails
    var r2 = AsyncCollab.completeTodo(state, 'player2', projectId, todoId, 6);
    assert(!r2.success, 'cannot complete already completed todo');

    // Non-existent project
    var r3 = AsyncCollab.completeTodo(state, 'player1', 'proj_99999', todoId, 5);
    assert(!r3.success, 'fails for non-existent project');

    // Non-existent todo
    var r4 = AsyncCollab.completeTodo(state, 'player1', projectId, 'todo_99999', 5);
    assert(!r4.success, 'fails for non-existent todo');

    // Missing params
    var r5 = AsyncCollab.completeTodo(state, null, projectId, todoId, 5);
    assert(!r5.success, 'fails without playerId');

    // Effort from todo is applied to project progress
    var s2 = makeState();
    var cp2 = AsyncCollab.createProject(s2, 'p1', 'workshop', 'WS', 'studio', 1);
    // workshop phase 0 needs 40 effort
    var tBig = AsyncCollab.addTodo(s2, 'p1', cp2.project.id, 'Big task', null, 40);
    var r6 = AsyncCollab.completeTodo(s2, 'p1', cp2.project.id, tBig.todo.id, 10);
    assert(r6.success, 'large todo completes successfully');
    assert(r6.phaseAdvanced, 'completing large todo advances phase');

    // Todo belonging to different project cannot be completed via wrong projectId
    var s3 = makeState();
    var cpX = AsyncCollab.createProject(s3, 'p1', 'workshop', 'WS_X', 'studio', 1);
    var cpY = AsyncCollab.createProject(s3, 'p1', 'workshop', 'WS_Y', 'studio', 1);
    var tX = AsyncCollab.addTodo(s3, 'p1', cpX.project.id, 'Task X', null, 10);
    var r7 = AsyncCollab.completeTodo(s3, 'p1', cpY.project.id, tX.todo.id, 5);
    assert(!r7.success, 'cannot complete todo via wrong projectId');
});

// ─── Suite 9: getProject ──────────────────────────────────────────────────────

suite('getProject', function() {
    var state = makeState();
    var cp = AsyncCollab.createProject(state, 'player1', 'community_garden', 'Garden', 'gardens', 1);
    var projectId = cp.project.id;

    var proj = AsyncCollab.getProject(state, projectId);
    assertNotNull(proj, 'getProject returns project');
    assertEqual(proj.id, projectId, 'returned project has correct id');

    var notFound = AsyncCollab.getProject(state, 'proj_99999');
    assertNull(notFound, 'getProject returns null for non-existent project');
});

// ─── Suite 10: getProjectsByZone ─────────────────────────────────────────────

suite('getProjectsByZone', function() {
    var state = makeState();
    AsyncCollab.createProject(state, 'p1', 'community_garden', 'Garden 1', 'gardens', 1);
    AsyncCollab.createProject(state, 'p1', 'community_garden', 'Garden 2', 'gardens', 2);
    AsyncCollab.createProject(state, 'p1', 'community_building', 'Building', 'nexus', 3);
    AsyncCollab.createProject(state, 'p1', 'monument', 'Monument', 'agora', 4);

    var gardenProjects = AsyncCollab.getProjectsByZone(state, 'gardens');
    assertEqual(gardenProjects.length, 2, 'two projects in gardens zone');
    for (var i = 0; i < gardenProjects.length; i++) {
        assertEqual(gardenProjects[i].zone, 'gardens', 'all returned projects are in gardens');
    }

    var nexusProjects = AsyncCollab.getProjectsByZone(state, 'nexus');
    assertEqual(nexusProjects.length, 1, 'one project in nexus zone');

    var emptyZone = AsyncCollab.getProjectsByZone(state, 'wilds');
    assertEqual(emptyZone.length, 0, 'empty array for zone with no projects');
});

// ─── Suite 11: getActiveProjects ─────────────────────────────────────────────

suite('getActiveProjects', function() {
    var state = makeState();
    var cp1 = AsyncCollab.createProject(state, 'p1', 'community_garden', 'G1', 'gardens', 1);
    var cp2 = AsyncCollab.createProject(state, 'p1', 'community_garden', 'G2', 'gardens', 2);
    var cp3 = AsyncCollab.createProject(state, 'p1', 'workshop', 'WS', 'studio', 3);

    AsyncCollab.completeProject(state, cp2.project.id, 10);
    AsyncCollab.abandonProject(state, cp3.project.id, 'test');

    var active = AsyncCollab.getActiveProjects(state);
    assertEqual(active.length, 1, 'one active project');
    assertEqual(active[0].id, cp1.project.id, 'correct active project');

    // Empty state
    var s2 = makeState();
    var empty = AsyncCollab.getActiveProjects(s2);
    assertEqual(empty.length, 0, 'no active projects in empty state');
});

// ─── Suite 12: getPlayerProjects ─────────────────────────────────────────────

suite('getPlayerProjects', function() {
    var state = makeState();
    var cp1 = AsyncCollab.createProject(state, 'player1', 'community_garden', 'G1', 'gardens', 1);
    var cp2 = AsyncCollab.createProject(state, 'player1', 'monument', 'M1', 'agora', 2);
    var cp3 = AsyncCollab.createProject(state, 'player2', 'workshop', 'WS', 'studio', 3);

    AsyncCollab.joinProject(state, 'player1', cp3.project.id);

    var p1Projects = AsyncCollab.getPlayerProjects(state, 'player1');
    assertEqual(p1Projects.length, 3, 'player1 is in 3 projects');

    var p2Projects = AsyncCollab.getPlayerProjects(state, 'player2');
    assertEqual(p2Projects.length, 1, 'player2 is in 1 project');

    var p3Projects = AsyncCollab.getPlayerProjects(state, 'player3');
    assertEqual(p3Projects.length, 0, 'unknown player has no projects');
});

// ─── Suite 13: getContributionHistory ────────────────────────────────────────

suite('getContributionHistory', function() {
    var state = makeState();
    var cp = AsyncCollab.createProject(state, 'player1', 'community_garden', 'Garden', 'gardens', 1);
    var projectId = cp.project.id;

    AsyncCollab.contribute(state, 'player1', projectId, 10, 'note1', 2);
    AsyncCollab.contribute(state, 'player1', projectId, 20, 'note2', 3);
    AsyncCollab.contribute(state, 'player1', projectId, 5, 'note3', 4);

    var history = AsyncCollab.getContributionHistory(state, projectId, 'player1');
    assertEqual(history.length, 3, 'player1 has 3 contributions');
    assertEqual(history[0].effort, 10, 'first contribution effort');
    assertEqual(history[0].note, 'note1', 'first contribution note');
    assertEqual(history[1].effort, 20, 'second contribution effort');
    assertEqual(history[2].effort, 5, 'third contribution effort');

    // Non-contributor
    var empty = AsyncCollab.getContributionHistory(state, projectId, 'stranger');
    assertEqual(empty.length, 0, 'non-contributor returns empty array');

    // Non-existent project
    var notFound = AsyncCollab.getContributionHistory(state, 'proj_99999', 'player1');
    assertEqual(notFound.length, 0, 'non-existent project returns empty array');
});

// ─── Suite 14: getProjectLeaderboard ─────────────────────────────────────────

suite('getProjectLeaderboard', function() {
    var state = makeState();
    var cp = AsyncCollab.createProject(state, 'player1', 'community_garden', 'Garden', 'gardens', 1);
    var projectId = cp.project.id;

    AsyncCollab.contribute(state, 'player1', projectId, 30, '', 1);
    AsyncCollab.contribute(state, 'player2', projectId, 50, '', 2);
    AsyncCollab.contribute(state, 'player3', projectId, 10, '', 3);

    var lb = AsyncCollab.getProjectLeaderboard(state, projectId);
    assertEqual(lb.length, 3, 'leaderboard has 3 entries');
    assertEqual(lb[0].playerId, 'player2', 'top contributor is player2');
    assertEqual(lb[0].totalEffort, 50, 'player2 effort is 50');
    assertEqual(lb[1].playerId, 'player1', 'second is player1');
    assertEqual(lb[1].totalEffort, 30, 'player1 effort is 30');
    assertEqual(lb[2].playerId, 'player3', 'third is player3');
    assertEqual(lb[2].totalEffort, 10, 'player3 effort is 10');

    // Each entry has contributions count
    assert(typeof lb[0].contributions === 'number', 'leaderboard entry has contributions count');

    // Non-existent project
    var notFound = AsyncCollab.getProjectLeaderboard(state, 'proj_99999');
    assertEqual(notFound.length, 0, 'non-existent project returns empty array');

    // Single contributor
    var s2 = makeState();
    var cp2 = AsyncCollab.createProject(s2, 'solo', 'workshop', 'Solo WS', 'studio', 1);
    var lb2 = AsyncCollab.getProjectLeaderboard(s2, cp2.project.id);
    assertEqual(lb2.length, 1, 'single contributor leaderboard');
    assertEqual(lb2[0].playerId, 'solo', 'solo player is top');
});

// ─── Suite 15: getPhaseProgress ──────────────────────────────────────────────

suite('getPhaseProgress', function() {
    var state = makeState();
    var cp = AsyncCollab.createProject(state, 'player1', 'community_garden', 'Garden', 'gardens', 1);
    var projectId = cp.project.id;
    // phases: [{Planning:50},{Planting:100},{Growing:150},{Harvest:75}]

    var pp = AsyncCollab.getPhaseProgress(state, projectId);
    assertNotNull(pp, 'getPhaseProgress returns object');
    assertEqual(pp.currentPhase, 0, 'starts at phase 0');
    assertEqual(pp.phaseName, 'Planning', 'phase name is Planning');
    assertEqual(pp.effortDone, 0, 'no effort done');
    assertEqual(pp.effortNeeded, 50, 'phase 0 needs 50');
    assertEqual(pp.percentComplete, 0, '0% complete');
    assertEqual(pp.allPhases.length, 4, 'allPhases has 4 entries');

    AsyncCollab.contribute(state, 'player1', projectId, 25, '', 2);
    var pp2 = AsyncCollab.getPhaseProgress(state, projectId);
    assertEqual(pp2.effortDone, 25, '25 effort done');
    assertEqual(pp2.percentComplete, 50, '50% complete');

    // Complete phase 0
    AsyncCollab.contribute(state, 'player1', projectId, 25, '', 3);
    var pp3 = AsyncCollab.getPhaseProgress(state, projectId);
    assertEqual(pp3.currentPhase, 1, 'advanced to phase 1');
    assertEqual(pp3.phaseName, 'Planting', 'phase name is Planting');

    // Completed project
    var s2 = makeState();
    var cp2 = AsyncCollab.createProject(s2, 'p1', 'workshop', 'WS', 'studio', 1);
    AsyncCollab.completeProject(s2, cp2.project.id, 5);
    var pp4 = AsyncCollab.getPhaseProgress(s2, cp2.project.id);
    assertEqual(pp4.status, 'completed', 'completed project status shown');
    assertEqual(pp4.percentComplete, 100, 'completed project is 100%');

    // Non-existent project
    var notFound = AsyncCollab.getPhaseProgress(state, 'proj_99999');
    assertNull(notFound, 'non-existent project returns null');
});

// ─── Suite 16: completeProject ────────────────────────────────────────────────

suite('completeProject', function() {
    var state = makeState();
    var cp = AsyncCollab.createProject(state, 'player1', 'community_garden', 'Garden', 'gardens', 1);
    var projectId = cp.project.id;

    var r1 = AsyncCollab.completeProject(state, projectId, 100);
    assert(r1.success, 'completeProject succeeds');
    assertEqual(state.projects[projectId].status, 'completed', 'project status is completed');
    assertEqual(state.projects[projectId].completedAt, 100, 'completedAt set to tick');

    // Cannot complete twice
    var r2 = AsyncCollab.completeProject(state, projectId, 200);
    assert(!r2.success, 'cannot complete already completed project');

    // Non-existent project
    var r3 = AsyncCollab.completeProject(state, 'proj_99999', 100);
    assert(!r3.success, 'fails for non-existent project');

    // Cannot complete abandoned project
    var s2 = makeState();
    var cp2 = AsyncCollab.createProject(s2, 'p1', 'workshop', 'WS', 'studio', 1);
    AsyncCollab.abandonProject(s2, cp2.project.id, 'test');
    var r4 = AsyncCollab.completeProject(s2, cp2.project.id, 10);
    assert(!r4.success, 'cannot complete abandoned project');
});

// ─── Suite 17: abandonProject ─────────────────────────────────────────────────

suite('abandonProject', function() {
    var state = makeState();
    var cp = AsyncCollab.createProject(state, 'player1', 'community_garden', 'Garden', 'gardens', 1);
    var projectId = cp.project.id;

    var r1 = AsyncCollab.abandonProject(state, projectId, 'Not enough contributors');
    assert(r1.success, 'abandonProject succeeds');
    assertEqual(state.projects[projectId].status, 'abandoned', 'project status is abandoned');
    assertEqual(state.projects[projectId].abandonReason, 'Not enough contributors', 'abandonReason set');

    // Cannot abandon twice
    var r2 = AsyncCollab.abandonProject(state, projectId, 'Again');
    assert(!r2.success, 'cannot abandon already abandoned project');

    // Cannot abandon completed project
    var s2 = makeState();
    var cp2 = AsyncCollab.createProject(s2, 'p1', 'workshop', 'WS', 'studio', 1);
    AsyncCollab.completeProject(s2, cp2.project.id, 5);
    var r3 = AsyncCollab.abandonProject(s2, cp2.project.id, 'reason');
    assert(!r3.success, 'cannot abandon completed project');

    // Non-existent project
    var r4 = AsyncCollab.abandonProject(state, 'proj_99999', 'reason');
    assert(!r4.success, 'fails for non-existent project');

    // Default reason
    var s3 = makeState();
    var cp3 = AsyncCollab.createProject(s3, 'p1', 'community_garden', 'G', 'gardens', 1);
    AsyncCollab.abandonProject(s3, cp3.project.id, null);
    assertNotNull(s3.projects[cp3.project.id].abandonReason, 'default reason set when null');
});

// ─── Suite 18: getTodos ───────────────────────────────────────────────────────

suite('getTodos', function() {
    var state = makeState();
    var cp = AsyncCollab.createProject(state, 'player1', 'community_garden', 'Garden', 'gardens', 1);
    var projectId = cp.project.id;

    var t1 = AsyncCollab.addTodo(state, 'player1', projectId, 'Task 1', null, 10);
    var t2 = AsyncCollab.addTodo(state, 'player1', projectId, 'Task 2', null, 10);
    var t3 = AsyncCollab.addTodo(state, 'player1', projectId, 'Task 3', null, 10);

    AsyncCollab.claimTodo(state, 'player2', projectId, t2.todo.id);
    AsyncCollab.completeTodo(state, 'player1', projectId, t3.todo.id, 5);

    // All todos
    var all = AsyncCollab.getTodos(state, projectId, null);
    assertEqual(all.length, 3, 'getTodos returns all 3 todos');

    // Open todos
    var open = AsyncCollab.getTodos(state, projectId, 'open');
    assertEqual(open.length, 1, 'one open todo');
    assertEqual(open[0].id, t1.todo.id, 'correct open todo');

    // In-progress todos
    var inProg = AsyncCollab.getTodos(state, projectId, 'in_progress');
    assertEqual(inProg.length, 1, 'one in_progress todo');
    assertEqual(inProg[0].id, t2.todo.id, 'correct in_progress todo');

    // Completed todos
    var completed = AsyncCollab.getTodos(state, projectId, 'completed');
    assertEqual(completed.length, 1, 'one completed todo');
    assertEqual(completed[0].id, t3.todo.id, 'correct completed todo');

    // Non-existent project
    var notFound = AsyncCollab.getTodos(state, 'proj_99999', null);
    assertEqual(notFound.length, 0, 'non-existent project returns empty array');
});

// ─── Suite 19: getPlayerTodos ─────────────────────────────────────────────────

suite('getPlayerTodos', function() {
    var state = makeState();
    var cp1 = AsyncCollab.createProject(state, 'player1', 'community_garden', 'G1', 'gardens', 1);
    var cp2 = AsyncCollab.createProject(state, 'player1', 'workshop', 'WS', 'studio', 2);

    AsyncCollab.addTodo(state, 'player1', cp1.project.id, 'Garden task 1', 'player2', 10);
    AsyncCollab.addTodo(state, 'player1', cp1.project.id, 'Garden task 2', 'player2', 10);
    AsyncCollab.addTodo(state, 'player1', cp2.project.id, 'Workshop task', 'player3', 10);
    AsyncCollab.addTodo(state, 'player1', cp1.project.id, 'Unassigned', null, 10);

    var p2Todos = AsyncCollab.getPlayerTodos(state, 'player2');
    assertEqual(p2Todos.length, 2, 'player2 has 2 todos');
    for (var i = 0; i < p2Todos.length; i++) {
        assertEqual(p2Todos[i].assigneeId, 'player2', 'todo is assigned to player2');
    }

    var p3Todos = AsyncCollab.getPlayerTodos(state, 'player3');
    assertEqual(p3Todos.length, 1, 'player3 has 1 todo');

    var p4Todos = AsyncCollab.getPlayerTodos(state, 'player4');
    assertEqual(p4Todos.length, 0, 'unknown player has no todos');
});

// ─── Suite 20: getProjectStats ────────────────────────────────────────────────

suite('getProjectStats', function() {
    var state = makeState();
    var cp = AsyncCollab.createProject(state, 'player1', 'community_garden', 'Garden', 'gardens', 1);
    var projectId = cp.project.id;

    AsyncCollab.contribute(state, 'player1', projectId, 30, '', 2);
    AsyncCollab.contribute(state, 'player2', projectId, 20, '', 3);
    var t1 = AsyncCollab.addTodo(state, 'player1', projectId, 'Todo 1', null, 10);
    var t2 = AsyncCollab.addTodo(state, 'player1', projectId, 'Todo 2', 'player2', 10);
    AsyncCollab.claimTodo(state, 'player1', projectId, t1.todo.id);
    AsyncCollab.completeTodo(state, 'player2', projectId, t2.todo.id, 5);

    var stats = AsyncCollab.getProjectStats(state, projectId);
    assertNotNull(stats, 'getProjectStats returns object');
    assert(stats.totalEffort > 0, 'totalEffort is positive');
    assertEqual(stats.contributorCount, 2, 'contributorCount is 2');
    assertEqual(stats.completedTodos, 1, 'completedTodos is 1');
    assertEqual(stats.openTodos, 0, 'openTodos is 0');
    assertEqual(stats.inProgressTodos, 1, 'inProgressTodos is 1');
    assert(Array.isArray(stats.phaseBreakdown), 'phaseBreakdown is an array');
    assertEqual(stats.phaseBreakdown.length, 4, 'phaseBreakdown has 4 entries for community_garden');
    assertEqual(stats.status, 'active', 'status is active');

    // Each phaseBreakdown entry has required fields
    for (var i = 0; i < stats.phaseBreakdown.length; i++) {
        var phase = stats.phaseBreakdown[i];
        assert(typeof phase.name === 'string', 'phase has name');
        assert(typeof phase.effortDone === 'number', 'phase has effortDone');
        assert(typeof phase.effortNeeded === 'number', 'phase has effortNeeded');
        assert(typeof phase.complete === 'boolean', 'phase has complete flag');
    }

    // Non-existent project
    var notFound = AsyncCollab.getProjectStats(state, 'proj_99999');
    assertNull(notFound, 'non-existent project returns null');
});

// ─── Suite 21: getGlobalStats ─────────────────────────────────────────────────

suite('getGlobalStats', function() {
    var state = makeState();

    // Empty state
    var gs0 = AsyncCollab.getGlobalStats(state);
    assertEqual(gs0.totalProjects, 0, 'empty state: 0 total projects');
    assertEqual(gs0.completedProjects, 0, 'empty state: 0 completed');
    assertEqual(gs0.activeProjects, 0, 'empty state: 0 active');
    assertEqual(gs0.abandonedProjects, 0, 'empty state: 0 abandoned');
    assertEqual(gs0.totalEffort, 0, 'empty state: 0 total effort');

    var cp1 = AsyncCollab.createProject(state, 'p1', 'community_garden', 'G1', 'gardens', 1);
    var cp2 = AsyncCollab.createProject(state, 'p1', 'community_garden', 'G2', 'gardens', 2);
    var cp3 = AsyncCollab.createProject(state, 'p1', 'workshop', 'WS', 'studio', 3);

    AsyncCollab.contribute(state, 'p1', cp1.project.id, 50, '', 4);
    AsyncCollab.contribute(state, 'p1', cp2.project.id, 30, '', 5);
    AsyncCollab.completeProject(state, cp2.project.id, 6);
    AsyncCollab.abandonProject(state, cp3.project.id, 'test');

    var gs = AsyncCollab.getGlobalStats(state);
    assertEqual(gs.totalProjects, 3, '3 total projects');
    assertEqual(gs.completedProjects, 1, '1 completed project');
    assertEqual(gs.activeProjects, 1, '1 active project');
    assertEqual(gs.abandonedProjects, 1, '1 abandoned project');
    assert(gs.totalEffort >= 80, 'total effort >= 80');
});

// ─── Suite 22: Multi-phase project completion via contributions ───────────────

suite('Multi-phase completion', function() {
    var state = makeState();
    // workshop phases: Design=40, Equipping=100, Testing=80, Launch=40
    var cp = AsyncCollab.createProject(state, 'p1', 'workshop', 'Full WS', 'studio', 1);
    var projectId = cp.project.id;

    // Phase 0: Design needs 40
    var r1 = AsyncCollab.contribute(state, 'p1', projectId, 40, '', 2);
    assert(r1.phaseAdvanced, 'phase 0 completed');
    assertEqual(state.projects[projectId].currentPhase, 1, 'moved to phase 1');

    // Phase 1: Equipping needs 100
    AsyncCollab.contribute(state, 'p1', projectId, 50, '', 3);
    var r2 = AsyncCollab.contribute(state, 'p1', projectId, 50, '', 4);
    assert(r2.phaseAdvanced, 'phase 1 completed');
    assertEqual(state.projects[projectId].currentPhase, 2, 'moved to phase 2');

    // Phase 2 + 3 at once (80 + 40 = 120 effort)
    var r3 = AsyncCollab.contribute(state, 'p1', projectId, 120, '', 5);
    assert(r3.phaseAdvanced, 'phases 2 and 3 completed');
    assert(r3.projectCompleted, 'project completed');
    assertEqual(state.projects[projectId].status, 'completed', 'project is completed');

    // Leaderboard reflects all contributions
    var lb = AsyncCollab.getProjectLeaderboard(state, projectId);
    assertEqual(lb[0].playerId, 'p1', 'solo contributor at top');
    assertEqual(lb[0].totalEffort, 260, 'total effort matches (40+50+50+120)');
});

// ─── Suite 23: Spark calculation ─────────────────────────────────────────────

suite('Spark calculation', function() {
    // sparkRewardPerEffort for each type
    var testCases = [
        { typeId: 'community_garden', effort: 10, expected: 5 },   // 0.5 * 10
        { typeId: 'community_building', effort: 10, expected: 6 }, // 0.6 * 10
        { typeId: 'mural_artwork', effort: 10, expected: 7 },      // 0.7 * 10
        { typeId: 'aqueduct', effort: 20, expected: 11 },          // 0.55 * 20
        { typeId: 'monument', effort: 20, expected: 13 },          // 0.65 * 20
        { typeId: 'great_library', effort: 10, expected: 6 },      // 0.6 * 10
        { typeId: 'workshop', effort: 10, expected: 5 },           // 0.5 * 10
        { typeId: 'amphitheater', effort: 10, expected: 6 }        // 0.6 * 10
    ];

    for (var i = 0; i < testCases.length; i++) {
        var tc = testCases[i];
        var state = makeState();
        var cp = AsyncCollab.createProject(state, 'p1', tc.typeId, 'T', 'nexus', 1);
        var r = AsyncCollab.contribute(state, 'p1', cp.project.id, tc.effort, '', 2);
        assertEqual(r.sparkEarned, tc.expected, tc.typeId + ' Spark: effort=' + tc.effort + ' expected=' + tc.expected);
    }
});

// ─── Suite 24: Edge cases and integration ─────────────────────────────────────

suite('Edge cases and integration', function() {
    // Null state becomes default state
    var state = null;
    var r = AsyncCollab.createProject(state, 'p1', 'community_garden', 'G', 'gardens', 1);
    // ensureState should handle null without crash
    // But since state is null, we can't really verify storage
    // Just check no crash
    assert(typeof r === 'object', 'createProject handles null state without crash');

    // Multiple contributors to same project
    var s = makeState();
    var cp = AsyncCollab.createProject(s, 'p1', 'community_garden', 'Garden', 'gardens', 1);
    var pid = cp.project.id;

    for (var i = 2; i <= 5; i++) {
        AsyncCollab.joinProject(s, 'player' + i, pid);
        AsyncCollab.contribute(s, 'player' + i, pid, i * 5, 'Contribution from player' + i, i * 10);
    }

    var lb = AsyncCollab.getProjectLeaderboard(s, pid);
    assertEqual(lb.length, 5, '5 contributors in leaderboard');
    // Sorted by effort descending: player5=25, player4=20, player3=15, player2=10, player1=0
    assertEqual(lb[0].playerId, 'player5', 'highest contributor first');
    assertEqual(lb[0].totalEffort, 25, 'player5 has 25 effort');

    // History is isolated per contributor
    var history = AsyncCollab.getContributionHistory(s, pid, 'player3');
    assertEqual(history.length, 1, 'player3 has 1 contribution in history');
    assertEqual(history[0].effort, 15, 'player3 contribution effort is 15');

    // Stats account for all contributors
    var stats = AsyncCollab.getProjectStats(s, pid);
    assertEqual(stats.contributorCount, 5, 'stats show 5 contributors');
    // Total = 0 (p1) + 10 + 15 + 20 + 25 = 70
    assertEqual(stats.totalEffort, 70, 'total effort is sum of all contributions');

    // Todo workflow: create -> claim -> complete
    var t = AsyncCollab.addTodo(s, 'p1', pid, 'Workflow test todo', null, 30);
    var todoId = t.todo.id;
    assertEqual(s.todos[todoId].status, 'open', 'todo starts open');
    AsyncCollab.claimTodo(s, 'player2', pid, todoId);
    assertEqual(s.todos[todoId].status, 'in_progress', 'todo is in_progress after claim');
    AsyncCollab.completeTodo(s, 'player2', pid, todoId, 99);
    assertEqual(s.todos[todoId].status, 'completed', 'todo is completed');
    assertEqual(s.todos[todoId].completedAt, 99, 'completedAt set');

    // getPlayerTodos reflects all assigned todos across projects
    var s2 = makeState();
    var cpA = AsyncCollab.createProject(s2, 'admin', 'community_garden', 'A', 'gardens', 1);
    var cpB = AsyncCollab.createProject(s2, 'admin', 'monument', 'B', 'agora', 2);
    AsyncCollab.addTodo(s2, 'admin', cpA.project.id, 'In garden', 'worker', 5);
    AsyncCollab.addTodo(s2, 'admin', cpB.project.id, 'In monument', 'worker', 5);
    AsyncCollab.addTodo(s2, 'admin', cpA.project.id, 'Unassigned', null, 5);
    var workerTodos = AsyncCollab.getPlayerTodos(s2, 'worker');
    assertEqual(workerTodos.length, 2, 'worker has 2 assigned todos across projects');

    // Phase progress stays consistent across contributions
    var s3 = makeState();
    var cpWS = AsyncCollab.createProject(s3, 'p1', 'workshop', 'WS', 'studio', 1);
    // Phase 0 needs 40 effort; contribute 20 twice
    AsyncCollab.contribute(s3, 'p1', cpWS.project.id, 20, '', 1);
    var pp = AsyncCollab.getPhaseProgress(s3, cpWS.project.id);
    assertEqual(pp.effortDone, 20, 'phase progress shows 20 after first contribution');
    assertEqual(pp.percentComplete, 50, 'phase is 50% complete');
    AsyncCollab.contribute(s3, 'p1', cpWS.project.id, 20, '', 2);
    var pp2 = AsyncCollab.getPhaseProgress(s3, cpWS.project.id);
    assertEqual(pp2.currentPhase, 1, 'phase 1 now after completing phase 0');
    assertEqual(pp2.phaseName, 'Equipping', 'phase name is Equipping');
});

// ─── Final Report ─────────────────────────────────────────────────────────────

console.log('\n============================');
console.log('Total: ' + (passed + failed) + ' tests');
console.log('Passed: ' + passed);
console.log('Failed: ' + failed);
if (errors.length > 0) {
    console.log('\nFailed tests:');
    for (var ei = 0; ei < errors.length; ei++) {
        console.log('  - ' + errors[ei].message);
    }
}
console.log('============================');
process.exit(failed > 0 ? 1 : 0);
