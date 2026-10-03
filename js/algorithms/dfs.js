/**
 * Depth-First Search (DFS) for Dependency Exploration & Structural Analysis
 * 
 * Traverses deep down prerequisite chains with:
 * - Call Stack tracking
 * - Traversal depth calculation
 * - Visited states (WHITE: unvisited, GRAY: active on call stack, BLACK: completed)
 * - Back-edge detection for Cycle Detection
 * - Indented hierarchy tree trace
 */

export class DepthFirstSearch {
  /**
   * Runs DFS from a given start course (or full graph) and records step snapshots.
   * @param {import('../models/Graph.js').PrerequisiteGraph} graph 
   * @param {string} startCourseId 
   * @param {boolean} fullGraph - If true, continues DFS on remaining unvisited nodes after start component
   * @returns {{ steps: Array, visitedOrder: string[], callStack: string[], cyclesFound: Array, reachable: string[] }}
   */
  static run(graph, startCourseId, fullGraph = false) {
    const steps = [];
    const adj = graph.getAdjacencyList();
    const allCourses = Array.from(graph.courses.keys());

    const startId = startCourseId ? startCourseId.trim().toUpperCase() : allCourses[0];

    if (!graph.courses.has(startId)) {
      throw new Error(`Start course "${startId}" does not exist in the graph.`);
    }

    // 3-color state: 0 = WHITE (unvisited), 1 = GRAY (on recursion stack), 2 = BLACK (visited)
    const color = {};
    for (const id of allCourses) {
      color[id] = 0;
    }

    const callStack = []; // Current recursion stack of node IDs
    const visitedOrder = [];
    const cyclesFound = [];
    const treeIndentation = []; // Formatted hierarchical lines

    const getColorsSnapshot = () => ({ ...color });

    steps.push({
      stepNumber: steps.length + 1,
      type: 'INIT',
      summary: `Initialize DFS at "${startId}"`,
      detail: `Starting Depth-First Search traversal from Course "${startId}". Recursion stack initialized.`,
      currentNode: startId,
      depth: 0,
      callStack: [],
      visitedOrder: [],
      colors: getColorsSnapshot(),
      activeNodes: [startId],
      highlightEdges: [],
      treeOutput: []
    });

    const dfsVisit = (u, depth) => {
      // Mark as GRAY (currently in call stack)
      color[u] = 1;
      callStack.push(u);
      visitedOrder.push(u);

      const indentSpaces = '  '.repeat(depth);
      const prefix = depth > 0 ? '↳ ' : '● ';
      treeIndentation.push(`${indentSpaces}${prefix}${u}`);

      const dependents = adj.get(u) || [];

      steps.push({
        stepNumber: steps.length + 1,
        type: 'ENTER_NODE',
        summary: `Enter "${u}" (Depth ${depth})`,
        detail: `Pushed "${u}" onto the call stack. Marked state as GRAY (Active). Exploring its ${dependents.length} downstream dependent(s).`,
        currentNode: u,
        depth,
        callStack: [...callStack],
        visitedOrder: [...visitedOrder],
        colors: getColorsSnapshot(),
        activeNodes: [...callStack],
        highlightEdges: depth > 0 && callStack.length >= 2
          ? [{ from: callStack[callStack.length - 2], to: u }]
          : [],
        treeOutput: [...treeIndentation]
      });

      for (const v of dependents) {
        if (color[v] === 0) {
          // Tree edge to unvisited node
          steps.push({
            stepNumber: steps.length + 1,
            type: 'TREE_EDGE',
            summary: `Traverse Tree Edge ${u} → ${v}`,
            detail: `Course "${v}" is unvisited (WHITE). Recursing deeper into dependency tree.`,
            currentNode: u,
            targetNode: v,
            currentEdge: { from: u, to: v },
            depth,
            callStack: [...callStack],
            visitedOrder: [...visitedOrder],
            colors: getColorsSnapshot(),
            activeNodes: [u, v],
            highlightEdges: [{ from: u, to: v }],
            treeOutput: [...treeIndentation]
          });

          dfsVisit(v, depth + 1);
        } else if (color[v] === 1) {
          // Back-edge detected! This is a cycle!
          const cycleStartIndex = callStack.indexOf(v);
          const cyclePath = [...callStack.slice(cycleStartIndex), v];
          cyclesFound.push(cyclePath);

          steps.push({
            stepNumber: steps.length + 1,
            type: 'BACK_EDGE_CYCLE',
            summary: `Cycle Detected via Back-Edge ${u} → ${v}!`,
            detail: `Target node "${v}" is currently GRAY (still active on the call stack). Edge ${u} → ${v} creates a circular dependency: ${cyclePath.join(' → ')}.`,
            currentNode: u,
            targetNode: v,
            currentEdge: { from: u, to: v },
            depth,
            callStack: [...callStack],
            visitedOrder: [...visitedOrder],
            colors: getColorsSnapshot(),
            activeNodes: [...cyclePath],
            highlightEdges: [{ from: u, to: v, isCycle: true }],
            cyclePath,
            treeOutput: [...treeIndentation, `${indentSpaces}  ⚠️ Cycle loop back to ${v}`]
          });
        } else {
          // Forward or Cross Edge (already BLACK)
          steps.push({
            stepNumber: steps.length + 1,
            type: 'CROSS_EDGE',
            summary: `Cross/Forward Edge ${u} → ${v}`,
            detail: `Course "${v}" was already completely visited and resolved (BLACK). No new traversal needed down this branch.`,
            currentNode: u,
            targetNode: v,
            currentEdge: { from: u, to: v },
            depth,
            callStack: [...callStack],
            visitedOrder: [...visitedOrder],
            colors: getColorsSnapshot(),
            activeNodes: [u, v],
            highlightEdges: [{ from: u, to: v }],
            treeOutput: [...treeIndentation]
          });
        }
      }

      // Mark as BLACK (finished) and pop call stack
      color[u] = 2;
      callStack.pop();

      steps.push({
        stepNumber: steps.length + 1,
        type: 'EXIT_NODE',
        summary: `Finish & Pop "${u}" (Depth ${depth})`,
        detail: `All dependencies of "${u}" have been fully explored. Marked state as BLACK (Resolved). Popped from call stack.`,
        currentNode: u,
        depth,
        callStack: [...callStack],
        visitedOrder: [...visitedOrder],
        colors: getColorsSnapshot(),
        activeNodes: [...callStack],
        highlightEdges: [],
        treeOutput: [...treeIndentation]
      });
    };

    // First visit the selected start node
    dfsVisit(startId, 0);

    // If full graph traversal requested, visit any remaining unvisited nodes
    if (fullGraph) {
      for (const id of allCourses) {
        if (color[id] === 0) {
          steps.push({
            stepNumber: steps.length + 1,
            type: 'NEW_COMPONENT',
            summary: `Explore Disconnected Component from "${id}"`,
            detail: `Course "${id}" was not reachable from previous trees. Starting fresh DFS branch.`,
            currentNode: id,
            depth: 0,
            callStack: [],
            visitedOrder: [...visitedOrder],
            colors: getColorsSnapshot(),
            activeNodes: [id],
            highlightEdges: [],
            treeOutput: [...treeIndentation, `--- Disconnected Branch: ${id} ---`]
          });
          dfsVisit(id, 0);
        }
      }
    }

    const reachable = Object.keys(color).filter(id => color[id] === 2);

    steps.push({
      stepNumber: steps.length + 1,
      type: 'COMPLETE',
      summary: 'DFS Traversal Complete',
      detail: `Depth-First Search concluded. Visited ${visitedOrder.length} nodes in order: ${visitedOrder.join(' → ')}. ${cyclesFound.length > 0 ? `Found ${cyclesFound.length} cycle(s)!` : 'No cycles detected in this traversal.'}`,
      depth: 0,
      callStack: [],
      visitedOrder: [...visitedOrder],
      colors: getColorsSnapshot(),
      activeNodes: visitedOrder,
      highlightEdges: [],
      treeOutput: [...treeIndentation]
    });

    return {
      steps,
      visitedOrder,
      cyclesFound,
      reachable,
      treeIndentation
    };
  }
}
