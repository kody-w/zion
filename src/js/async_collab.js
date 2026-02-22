/**
 * ZION Async Collaboration System
 * Asynchronous collaboration on shared projects (buildings, gardens, artworks).
 * Players contribute independently, earn Spark, and leave tasks for others.
 * Git-like contribution tracking.
 */

(function(exports) {
    'use strict';

    // ─── Project Types ────────────────────────────────────────────────────────

    var PROJECT_TYPES = {
        community_garden: {
            id: 'community_garden',
            name: 'Community Garden',
            category: 'garden',
            maxContributors: 10,
            phases: [
                { name: 'Planning', effort: 50 },
                { name: 'Planting', effort: 100 },
                { name: 'Growing', effort: 150 },
                { name: 'Harvest', effort: 75 }
            ],
            totalEffort: 375,
            sparkRewardPerEffort: 0.5,
            zone: 'gardens',
            description: 'Plant and tend a shared garden plot'
        },
        community_building: {
            id: 'community_building',
            name: 'Community Building',
            category: 'building',
            maxContributors: 15,
            phases: [
                { name: 'Design', effort: 60 },
                { name: 'Foundation', effort: 120 },
                { name: 'Construction', effort: 200 },
                { name: 'Finishing', effort: 80 }
            ],
            totalEffort: 460,
            sparkRewardPerEffort: 0.6,
            zone: 'nexus',
            description: 'Construct a shared building for the community'
        },
        mural_artwork: {
            id: 'mural_artwork',
            name: 'Mural Artwork',
            category: 'artwork',
            maxContributors: 8,
            phases: [
                { name: 'Concept', effort: 40 },
                { name: 'Sketching', effort: 80 },
                { name: 'Painting', effort: 160 },
                { name: 'Detailing', effort: 70 }
            ],
            totalEffort: 350,
            sparkRewardPerEffort: 0.7,
            zone: 'studio',
            description: 'Create a large collaborative mural'
        },
        aqueduct: {
            id: 'aqueduct',
            name: 'Aqueduct',
            category: 'infrastructure',
            maxContributors: 12,
            phases: [
                { name: 'Survey', effort: 50 },
                { name: 'Excavation', effort: 150 },
                { name: 'Construction', effort: 250 },
                { name: 'Testing', effort: 100 }
            ],
            totalEffort: 550,
            sparkRewardPerEffort: 0.55,
            zone: 'commons',
            description: 'Build a water distribution system for ZION'
        },
        monument: {
            id: 'monument',
            name: 'Monument',
            category: 'monument',
            maxContributors: 20,
            phases: [
                { name: 'Planning', effort: 80 },
                { name: 'Materials', effort: 120 },
                { name: 'Construction', effort: 300 },
                { name: 'Dedication', effort: 50 }
            ],
            totalEffort: 550,
            sparkRewardPerEffort: 0.65,
            zone: 'agora',
            description: 'Erect a monument to commemorate ZION history'
        },
        great_library: {
            id: 'great_library',
            name: 'Great Library',
            category: 'library',
            maxContributors: 12,
            phases: [
                { name: 'Architecture', effort: 70 },
                { name: 'Building', effort: 180 },
                { name: 'Cataloguing', effort: 120 },
                { name: 'Opening', effort: 60 }
            ],
            totalEffort: 430,
            sparkRewardPerEffort: 0.6,
            zone: 'athenaeum',
            description: 'Build a shared library for all knowledge in ZION'
        },
        workshop: {
            id: 'workshop',
            name: 'Shared Workshop',
            category: 'workshop',
            maxContributors: 10,
            phases: [
                { name: 'Design', effort: 40 },
                { name: 'Equipping', effort: 100 },
                { name: 'Testing', effort: 80 },
                { name: 'Launch', effort: 40 }
            ],
            totalEffort: 260,
            sparkRewardPerEffort: 0.5,
            zone: 'studio',
            description: 'Set up a shared workshop for crafting'
        },
        amphitheater: {
            id: 'amphitheater',
            name: 'Amphitheater',
            category: 'performance',
            maxContributors: 15,
            phases: [
                { name: 'Design', effort: 60 },
                { name: 'Excavation', effort: 100 },
                { name: 'Seating', effort: 150 },
                { name: 'Stage', effort: 100 }
            ],
            totalEffort: 410,
            sparkRewardPerEffort: 0.6,
            zone: 'agora',
            description: 'Build an open-air amphitheater for performances'
        }
    };

    // ─── State helpers ────────────────────────────────────────────────────────

    var projectCounter = 1;
    var todoCounter = 1;

    function createDefaultState() {
        return {
            projects: {},
            todos: {}
        };
    }

    function ensureState(state) {
        if (!state) return createDefaultState();
        if (!state.projects) state.projects = {};
        if (!state.todos) state.todos = {};
        return state;
    }

    // ─── Project Functions ────────────────────────────────────────────────────

    /**
     * Create a new collaborative project.
     * @param {Object} state - World state
     * @param {string} creatorId - Player ID creating the project
     * @param {string} typeId - PROJECT_TYPES key
     * @param {string} title - Project display title
     * @param {string} zone - Zone name where project lives
     * @param {number} currentTick - Current game tick
     * @returns {Object} { success, project?, error? }
     */
    function createProject(state, creatorId, typeId, title, zone, currentTick) {
        state = ensureState(state);

        if (!creatorId || !typeId || !title || !zone) {
            return { success: false, error: 'Missing required parameters' };
        }

        var projectType = PROJECT_TYPES[typeId];
        if (!projectType) {
            return { success: false, error: 'Unknown project type: ' + typeId };
        }

        var id = 'proj_' + (projectCounter++);

        // Build initial phase progress array (one entry per phase)
        var phaseProgress = [];
        for (var i = 0; i < projectType.phases.length; i++) {
            phaseProgress.push(0);
        }

        var project = {
            id: id,
            type: typeId,
            title: title,
            creatorId: creatorId,
            zone: zone,
            status: 'active',
            currentPhase: 0,
            phaseProgress: phaseProgress,
            contributors: {},
            todos: [],
            createdAt: currentTick || 0,
            completedAt: null,
            abandonedAt: null,
            abandonReason: null
        };

        // Auto-join creator
        project.contributors[creatorId] = {
            totalEffort: 0,
            contributions: [],
            joinedAt: currentTick || 0
        };

        state.projects[id] = project;

        return { success: true, project: project };
    }

    /**
     * Join a project as a contributor.
     * @param {Object} state
     * @param {string} playerId
     * @param {string} projectId
     * @returns {Object} { success, error? }
     */
    function joinProject(state, playerId, projectId) {
        state = ensureState(state);

        if (!playerId || !projectId) {
            return { success: false, error: 'Missing required parameters' };
        }

        var project = state.projects[projectId];
        if (!project) {
            return { success: false, error: 'Project not found' };
        }

        if (project.status !== 'active' && project.status !== 'planning') {
            return { success: false, error: 'Project is not active' };
        }

        if (project.contributors[playerId]) {
            return { success: false, error: 'Already a contributor' };
        }

        var projectType = PROJECT_TYPES[project.type];
        var contributorCount = Object.keys(project.contributors).length;
        if (projectType && contributorCount >= projectType.maxContributors) {
            return { success: false, error: 'Project is full' };
        }

        project.contributors[playerId] = {
            totalEffort: 0,
            contributions: [],
            joinedAt: 0
        };

        return { success: true };
    }

    /**
     * Leave a project.
     * @param {Object} state
     * @param {string} playerId
     * @param {string} projectId
     * @returns {Object} { success, error? }
     */
    function leaveProject(state, playerId, projectId) {
        state = ensureState(state);

        if (!playerId || !projectId) {
            return { success: false, error: 'Missing required parameters' };
        }

        var project = state.projects[projectId];
        if (!project) {
            return { success: false, error: 'Project not found' };
        }

        if (!project.contributors[playerId]) {
            return { success: false, error: 'Not a contributor' };
        }

        delete project.contributors[playerId];

        return { success: true };
    }

    /**
     * Contribute effort to a project. Awards Spark and advances phase when met.
     * @param {Object} state
     * @param {string} playerId
     * @param {string} projectId
     * @param {number} effort - Amount of effort to contribute
     * @param {string} note - Optional note about contribution
     * @param {number} currentTick
     * @returns {Object} { success, sparkEarned, phaseAdvanced, projectCompleted, error? }
     */
    function contribute(state, playerId, projectId, effort, note, currentTick) {
        state = ensureState(state);

        if (!playerId || !projectId) {
            return { success: false, sparkEarned: 0, phaseAdvanced: false, projectCompleted: false, error: 'Missing required parameters' };
        }

        if (!effort || effort <= 0) {
            return { success: false, sparkEarned: 0, phaseAdvanced: false, projectCompleted: false, error: 'Effort must be positive' };
        }

        var project = state.projects[projectId];
        if (!project) {
            return { success: false, sparkEarned: 0, phaseAdvanced: false, projectCompleted: false, error: 'Project not found' };
        }

        if (project.status !== 'active') {
            return { success: false, sparkEarned: 0, phaseAdvanced: false, projectCompleted: false, error: 'Project is not active' };
        }

        // Auto-join if not already a contributor
        if (!project.contributors[playerId]) {
            var projectType2 = PROJECT_TYPES[project.type];
            var contributorCount2 = Object.keys(project.contributors).length;
            if (projectType2 && contributorCount2 >= projectType2.maxContributors) {
                return { success: false, sparkEarned: 0, phaseAdvanced: false, projectCompleted: false, error: 'Project is full' };
            }
            project.contributors[playerId] = {
                totalEffort: 0,
                contributions: [],
                joinedAt: currentTick || 0
            };
        }

        var contributor = project.contributors[playerId];
        contributor.totalEffort += effort;
        contributor.contributions.push({
            tick: currentTick || 0,
            effort: effort,
            note: note || ''
        });

        // Apply effort to current phase
        var projectType = PROJECT_TYPES[project.type];
        var phaseAdvanced = false;
        var projectCompleted = false;
        var remainingEffort = effort;

        while (remainingEffort > 0 && project.currentPhase < projectType.phases.length) {
            var phase = projectType.phases[project.currentPhase];
            var needed = phase.effort - project.phaseProgress[project.currentPhase];

            if (remainingEffort >= needed) {
                project.phaseProgress[project.currentPhase] = phase.effort;
                remainingEffort -= needed;
                project.currentPhase += 1;
                phaseAdvanced = true;

                if (project.currentPhase >= projectType.phases.length) {
                    // All phases complete
                    project.status = 'completed';
                    project.completedAt = currentTick || 0;
                    projectCompleted = true;
                    break;
                }
            } else {
                project.phaseProgress[project.currentPhase] += remainingEffort;
                remainingEffort = 0;
            }
        }

        // Calculate Spark earned
        var sparkEarned = Math.floor(effort * projectType.sparkRewardPerEffort);

        return {
            success: true,
            sparkEarned: sparkEarned,
            phaseAdvanced: phaseAdvanced,
            projectCompleted: projectCompleted
        };
    }

    /**
     * Add a todo item to a project.
     * @param {Object} state
     * @param {string} creatorId
     * @param {string} projectId
     * @param {string} description
     * @param {string|null} assigneeId
     * @param {number} effort
     * @returns {Object} { success, todo?, error? }
     */
    function addTodo(state, creatorId, projectId, description, assigneeId, effort) {
        state = ensureState(state);

        if (!creatorId || !projectId || !description) {
            return { success: false, error: 'Missing required parameters' };
        }

        var project = state.projects[projectId];
        if (!project) {
            return { success: false, error: 'Project not found' };
        }

        if (project.status !== 'active' && project.status !== 'planning') {
            return { success: false, error: 'Project is not active' };
        }

        var todo = {
            id: 'todo_' + (todoCounter++),
            projectId: projectId,
            assigneeId: assigneeId || null,
            description: description,
            status: 'open',
            createdBy: creatorId,
            createdAt: 0,
            completedAt: null,
            effort: effort || 10
        };

        project.todos.push(todo.id);
        state.todos[todo.id] = todo;

        return { success: true, todo: todo };
    }

    /**
     * Claim a todo item (set status to in_progress, assign to player).
     * @param {Object} state
     * @param {string} playerId
     * @param {string} projectId
     * @param {string} todoId
     * @returns {Object} { success, error? }
     */
    function claimTodo(state, playerId, projectId, todoId) {
        state = ensureState(state);

        if (!playerId || !projectId || !todoId) {
            return { success: false, error: 'Missing required parameters' };
        }

        var project = state.projects[projectId];
        if (!project) {
            return { success: false, error: 'Project not found' };
        }

        var todo = state.todos[todoId];
        if (!todo) {
            return { success: false, error: 'Todo not found' };
        }

        if (todo.projectId !== projectId) {
            return { success: false, error: 'Todo does not belong to project' };
        }

        if (todo.status !== 'open') {
            return { success: false, error: 'Todo is not open' };
        }

        todo.assigneeId = playerId;
        todo.status = 'in_progress';

        return { success: true };
    }

    /**
     * Complete a todo item. Counts effort as a project contribution.
     * @param {Object} state
     * @param {string} playerId
     * @param {string} projectId
     * @param {string} todoId
     * @param {number} currentTick
     * @returns {Object} { success, sparkEarned, phaseAdvanced, projectCompleted, error? }
     */
    function completeTodo(state, playerId, projectId, todoId, currentTick) {
        state = ensureState(state);

        if (!playerId || !projectId || !todoId) {
            return { success: false, sparkEarned: 0, phaseAdvanced: false, projectCompleted: false, error: 'Missing required parameters' };
        }

        var project = state.projects[projectId];
        if (!project) {
            return { success: false, sparkEarned: 0, phaseAdvanced: false, projectCompleted: false, error: 'Project not found' };
        }

        var todo = state.todos[todoId];
        if (!todo) {
            return { success: false, sparkEarned: 0, phaseAdvanced: false, projectCompleted: false, error: 'Todo not found' };
        }

        if (todo.projectId !== projectId) {
            return { success: false, sparkEarned: 0, phaseAdvanced: false, projectCompleted: false, error: 'Todo does not belong to project' };
        }

        if (todo.status === 'completed') {
            return { success: false, sparkEarned: 0, phaseAdvanced: false, projectCompleted: false, error: 'Todo already completed' };
        }

        todo.status = 'completed';
        todo.completedAt = currentTick || 0;
        todo.assigneeId = playerId;

        // Completing a todo counts as contribution effort
        var result = contribute(state, playerId, projectId, todo.effort, 'Completed todo: ' + todo.description, currentTick);

        return result;
    }

    /**
     * Get a project by ID.
     * @param {Object} state
     * @param {string} projectId
     * @returns {Object|null}
     */
    function getProject(state, projectId) {
        state = ensureState(state);
        return state.projects[projectId] || null;
    }

    /**
     * Get all projects in a specific zone.
     * @param {Object} state
     * @param {string} zone
     * @returns {Array}
     */
    function getProjectsByZone(state, zone) {
        state = ensureState(state);
        var results = [];
        var ids = Object.keys(state.projects);
        for (var i = 0; i < ids.length; i++) {
            var p = state.projects[ids[i]];
            if (p.zone === zone) {
                results.push(p);
            }
        }
        return results;
    }

    /**
     * Get all active projects.
     * @param {Object} state
     * @returns {Array}
     */
    function getActiveProjects(state) {
        state = ensureState(state);
        var results = [];
        var ids = Object.keys(state.projects);
        for (var i = 0; i < ids.length; i++) {
            var p = state.projects[ids[i]];
            if (p.status === 'active') {
                results.push(p);
            }
        }
        return results;
    }

    /**
     * Get all projects a player has contributed to.
     * @param {Object} state
     * @param {string} playerId
     * @returns {Array}
     */
    function getPlayerProjects(state, playerId) {
        state = ensureState(state);
        var results = [];
        var ids = Object.keys(state.projects);
        for (var i = 0; i < ids.length; i++) {
            var p = state.projects[ids[i]];
            if (p.contributors[playerId]) {
                results.push(p);
            }
        }
        return results;
    }

    /**
     * Get contribution history for a player on a project.
     * @param {Object} state
     * @param {string} projectId
     * @param {string} playerId
     * @returns {Array} List of contribution objects
     */
    function getContributionHistory(state, projectId, playerId) {
        state = ensureState(state);
        var project = state.projects[projectId];
        if (!project) return [];
        var contributor = project.contributors[playerId];
        if (!contributor) return [];
        return contributor.contributions.slice();
    }

    /**
     * Get top contributors sorted by total effort (descending).
     * @param {Object} state
     * @param {string} projectId
     * @returns {Array} [{playerId, totalEffort, contributions}]
     */
    function getProjectLeaderboard(state, projectId) {
        state = ensureState(state);
        var project = state.projects[projectId];
        if (!project) return [];

        var entries = [];
        var playerIds = Object.keys(project.contributors);
        for (var i = 0; i < playerIds.length; i++) {
            var pid = playerIds[i];
            var c = project.contributors[pid];
            entries.push({
                playerId: pid,
                totalEffort: c.totalEffort,
                contributions: c.contributions.length
            });
        }

        entries.sort(function(a, b) {
            return b.totalEffort - a.totalEffort;
        });

        return entries;
    }

    /**
     * Get current phase progress details.
     * @param {Object} state
     * @param {string} projectId
     * @returns {Object} { currentPhase, phaseName, effortDone, effortNeeded, percentComplete, allPhases }
     */
    function getPhaseProgress(state, projectId) {
        state = ensureState(state);
        var project = state.projects[projectId];
        if (!project) return null;

        var projectType = PROJECT_TYPES[project.type];
        if (!projectType) return null;

        var currentPhaseIndex = project.currentPhase;
        var allPhases = [];

        for (var i = 0; i < projectType.phases.length; i++) {
            allPhases.push({
                index: i,
                name: projectType.phases[i].name,
                effortNeeded: projectType.phases[i].effort,
                effortDone: project.phaseProgress[i] || 0,
                complete: project.phaseProgress[i] >= projectType.phases[i].effort
            });
        }

        var isCompleted = project.status === 'completed';
        var phaseIndex = isCompleted ? projectType.phases.length - 1 : Math.min(currentPhaseIndex, projectType.phases.length - 1);
        var currentPhaseData = projectType.phases[phaseIndex];
        var effortDone = project.phaseProgress[phaseIndex] || 0;
        var effortNeeded = currentPhaseData ? currentPhaseData.effort : 0;
        var percentComplete = effortNeeded > 0 ? Math.floor((effortDone / effortNeeded) * 100) : 100;

        return {
            currentPhase: phaseIndex,
            phaseName: currentPhaseData ? currentPhaseData.name : 'Complete',
            effortDone: effortDone,
            effortNeeded: effortNeeded,
            percentComplete: isCompleted ? 100 : percentComplete,
            allPhases: allPhases,
            status: project.status
        };
    }

    /**
     * Manually complete a project.
     * @param {Object} state
     * @param {string} projectId
     * @param {number} currentTick
     * @returns {Object} { success, error? }
     */
    function completeProject(state, projectId, currentTick) {
        state = ensureState(state);
        var project = state.projects[projectId];
        if (!project) {
            return { success: false, error: 'Project not found' };
        }
        if (project.status === 'completed') {
            return { success: false, error: 'Project already completed' };
        }
        if (project.status === 'abandoned') {
            return { success: false, error: 'Project is abandoned' };
        }

        project.status = 'completed';
        project.completedAt = currentTick || 0;
        return { success: true };
    }

    /**
     * Abandon a project.
     * @param {Object} state
     * @param {string} projectId
     * @param {string} reason
     * @returns {Object} { success, error? }
     */
    function abandonProject(state, projectId, reason) {
        state = ensureState(state);
        var project = state.projects[projectId];
        if (!project) {
            return { success: false, error: 'Project not found' };
        }
        if (project.status === 'completed') {
            return { success: false, error: 'Cannot abandon completed project' };
        }
        if (project.status === 'abandoned') {
            return { success: false, error: 'Project already abandoned' };
        }

        project.status = 'abandoned';
        project.abandonedAt = 0;
        project.abandonReason = reason || 'No reason given';
        return { success: true };
    }

    /**
     * Get todos for a project, optionally filtered by status.
     * @param {Object} state
     * @param {string} projectId
     * @param {string|null} status - 'open'|'in_progress'|'completed'|null for all
     * @returns {Array}
     */
    function getTodos(state, projectId, status) {
        state = ensureState(state);
        var project = state.projects[projectId];
        if (!project) return [];

        var results = [];
        for (var i = 0; i < project.todos.length; i++) {
            var todo = state.todos[project.todos[i]];
            if (!todo) continue;
            if (!status || todo.status === status) {
                results.push(todo);
            }
        }
        return results;
    }

    /**
     * Get all todos assigned to a player across all projects.
     * @param {Object} state
     * @param {string} playerId
     * @returns {Array}
     */
    function getPlayerTodos(state, playerId) {
        state = ensureState(state);
        var results = [];
        var todoIds = Object.keys(state.todos);
        for (var i = 0; i < todoIds.length; i++) {
            var todo = state.todos[todoIds[i]];
            if (todo.assigneeId === playerId) {
                results.push(todo);
            }
        }
        return results;
    }

    /**
     * Get aggregate stats for a project.
     * @param {Object} state
     * @param {string} projectId
     * @returns {Object} { totalEffort, contributorCount, completedTodos, openTodos, inProgressTodos, phaseBreakdown, status }
     */
    function getProjectStats(state, projectId) {
        state = ensureState(state);
        var project = state.projects[projectId];
        if (!project) return null;

        var projectType = PROJECT_TYPES[project.type];
        var totalEffort = 0;
        var playerIds = Object.keys(project.contributors);
        for (var i = 0; i < playerIds.length; i++) {
            totalEffort += project.contributors[playerIds[i]].totalEffort;
        }

        var completedTodos = 0;
        var openTodos = 0;
        var inProgressTodos = 0;
        for (var j = 0; j < project.todos.length; j++) {
            var todo = state.todos[project.todos[j]];
            if (!todo) continue;
            if (todo.status === 'completed') completedTodos++;
            else if (todo.status === 'open') openTodos++;
            else if (todo.status === 'in_progress') inProgressTodos++;
        }

        var phaseBreakdown = [];
        if (projectType) {
            for (var k = 0; k < projectType.phases.length; k++) {
                phaseBreakdown.push({
                    name: projectType.phases[k].name,
                    effortDone: project.phaseProgress[k] || 0,
                    effortNeeded: projectType.phases[k].effort,
                    complete: (project.phaseProgress[k] || 0) >= projectType.phases[k].effort
                });
            }
        }

        return {
            totalEffort: totalEffort,
            contributorCount: playerIds.length,
            completedTodos: completedTodos,
            openTodos: openTodos,
            inProgressTodos: inProgressTodos,
            phaseBreakdown: phaseBreakdown,
            status: project.status,
            currentPhase: project.currentPhase
        };
    }

    /**
     * Get global stats across all projects.
     * @param {Object} state
     * @returns {Object} { totalProjects, completedProjects, activeProjects, abandonedProjects, totalEffort }
     */
    function getGlobalStats(state) {
        state = ensureState(state);
        var totalProjects = 0;
        var completedProjects = 0;
        var activeProjects = 0;
        var abandonedProjects = 0;
        var totalEffort = 0;

        var ids = Object.keys(state.projects);
        for (var i = 0; i < ids.length; i++) {
            var p = state.projects[ids[i]];
            totalProjects++;
            if (p.status === 'completed') completedProjects++;
            else if (p.status === 'active') activeProjects++;
            else if (p.status === 'abandoned') abandonedProjects++;

            var playerIds = Object.keys(p.contributors);
            for (var j = 0; j < playerIds.length; j++) {
                totalEffort += p.contributors[playerIds[j]].totalEffort;
            }
        }

        return {
            totalProjects: totalProjects,
            completedProjects: completedProjects,
            activeProjects: activeProjects,
            abandonedProjects: abandonedProjects,
            totalEffort: totalEffort
        };
    }

    // ─── Exports ──────────────────────────────────────────────────────────────

    exports.PROJECT_TYPES = PROJECT_TYPES;
    exports.createProject = createProject;
    exports.joinProject = joinProject;
    exports.leaveProject = leaveProject;
    exports.contribute = contribute;
    exports.addTodo = addTodo;
    exports.claimTodo = claimTodo;
    exports.completeTodo = completeTodo;
    exports.getProject = getProject;
    exports.getProjectsByZone = getProjectsByZone;
    exports.getActiveProjects = getActiveProjects;
    exports.getPlayerProjects = getPlayerProjects;
    exports.getContributionHistory = getContributionHistory;
    exports.getProjectLeaderboard = getProjectLeaderboard;
    exports.getPhaseProgress = getPhaseProgress;
    exports.completeProject = completeProject;
    exports.abandonProject = abandonProject;
    exports.getTodos = getTodos;
    exports.getPlayerTodos = getPlayerTodos;
    exports.getProjectStats = getProjectStats;
    exports.getGlobalStats = getGlobalStats;

})(typeof module !== 'undefined' ? module.exports : (window.AsyncCollab = {}));
