/**
 * Breadth-First Search (BFS) for Prerequisite Graph Exploration
 * 
 * Traverses the graph level-by-level starting from a chosen course.
 * Shows:
 * - Current frontier / queue state
 * - Visitation order
 * - Level numbers (hop distance from start course)
 * - Reachable vs. unreachable courses
 */

export class BreadthFirstSearch {
  /**
   * Runs BFS traversal from a start node and records step-by-step snapshots.
   * @param {import('../models/Graph.js').PrerequisiteGraph} graph 
   * @param {string} startCourseId 
   * @returns {{ steps: Array, visitedOrder: string[], levels: Object, reachable: string[], unreachable: string[] }}
   */
  static run(graph, startCourseId) {
    const steps = [];
    const adj = graph.getAdjacencyList();
    const allCourses = Array.from(graph.courses.keys());

    const startId = startCourseId ? startCourseId.trim().toUpperCase() : allCourses[0];

    if (!graph.courses.has(startId)) {
      throw new Error(`Start course "${startId}" does not exist in the graph.`);
    }

    const visited = new Set();
    const queue = []; // Array of course IDs
    const levels = {}; // courseId -> level number
    const parentMap = {}; // courseId -> parentId
    const visitedOrder = [];

    // Initialize start node
    queue.push(startId);
    visited.add(startId);
    levels[startId] = 0;
    parentMap[startId] = null;

    steps.push({
      stepNumber: steps.length + 1,
      type: 'INIT',
      summary: `Initialize BFS at "${startId}"`,
      detail: `Starting Breadth-First Search exploration from Course "${startId}" (Level 0). Added "${startId}" to the FIFO queue.`,
      currentNode: startId,
      queue: [...queue],
      visitedOrder: [...visitedOrder],
      levels: { ...levels },
      activeNodes: [startId],
      highlightEdges: [],
      frontier: [startId]
    });

    while (queue.length > 0) {
      const current = queue.shift();
      visitedOrder.push(current);
      const currentLevel = levels[current];
      const courseObj = graph.getCourse(current);
      const dependents = adj.get(current) || [];

      steps.push({
        stepNumber: steps.length + 1,
        type: 'VISIT_NODE',
        summary: `Visit "${current}" (Level ${currentLevel})`,
        detail: `Dequeued and visiting "${current}" (${courseObj?.name || current}). Prerequisite hop distance from start: ${currentLevel} hop(s). Examining ${dependents.length} outgoing prerequisite connection(s).`,
        currentNode: current,
        queue: [...queue],
        visitedOrder: [...visitedOrder],
        levels: { ...levels },
        activeNodes: [current],
        highlightEdges: dependents.map(dep => ({ from: current, to: dep })),
        frontier: [...queue]
      });

      const newlyDiscovered = [];

      for (const depId of dependents) {
        if (!visited.has(depId)) {
          visited.add(depId);
          levels[depId] = currentLevel + 1;
          parentMap[depId] = current;
          queue.push(depId);
          newlyDiscovered.push(depId);

          steps.push({
            stepNumber: steps.length + 1,
            type: 'DISCOVER_NEIGHBOR',
            summary: `Discover "${depId}" via Edge ${current} → ${depId}`,
            detail: `Found unvisited dependent course "${depId}". Assigned Level ${currentLevel + 1} (${currentLevel + 1} hop(s) away). Enqueued "${depId}".`,
            currentNode: current,
            currentEdge: { from: current, to: depId },
            queue: [...queue],
            visitedOrder: [...visitedOrder],
            levels: { ...levels },
            activeNodes: [current, depId],
            highlightEdges: [{ from: current, to: depId }],
            frontier: [...queue]
          });
        } else {
          steps.push({
            stepNumber: steps.length + 1,
            type: 'ALREADY_VISITED',
            summary: `Edge ${current} → ${depId} (Already Visited)`,
            detail: `Dependent course "${depId}" was already discovered at Level ${levels[depId]}. Skipping duplicate queue entry.`,
            currentNode: current,
            currentEdge: { from: current, to: depId },
            queue: [...queue],
            visitedOrder: [...visitedOrder],
            levels: { ...levels },
            activeNodes: [current, depId],
            highlightEdges: [{ from: current, to: depId }],
            frontier: [...queue]
          });
        }
      }
    }

    // Identify unreachable courses
    const reachable = Array.from(visited);
    const unreachable = allCourses.filter(id => !visited.has(id));

    // Group courses by level
    const levelGroups = {};
    for (const [id, lvl] of Object.entries(levels)) {
      if (!levelGroups[lvl]) levelGroups[lvl] = [];
      levelGroups[lvl].push(id);
    }

    steps.push({
      stepNumber: steps.length + 1,
      type: 'COMPLETE',
      summary: 'BFS Exploration Complete',
      detail: `Explored all ${reachable.length} course(s) reachable from "${startId}" across ${Object.keys(levelGroups).length} level(s). ${unreachable.length} course(s) were not reachable downstream from this start point.`,
      queue: [],
      visitedOrder: [...visitedOrder],
      levels: { ...levels },
      activeNodes: reachable,
      highlightEdges: [],
      frontier: []
    });

    return {
      steps,
      visitedOrder,
      levels,
      levelGroups,
      parentMap,
      reachable,
      unreachable
    };
  }
}
