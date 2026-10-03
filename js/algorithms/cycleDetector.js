/**
 * Dedicated Cycle Detection & Structural Analysis
 * 
 * Uses Depth-First Search with 3-color states (White, Gray, Black)
 * to locate all cycle components, back-edges, and reconstruct exact loop paths.
 */

export class CycleDetector {
  /**
   * Analyzes the graph for cycles and returns comprehensive cycle diagnostics.
   * @param {import('../models/Graph.js').PrerequisiteGraph} graph 
   * @returns {{ hasCycle: boolean, cyclePaths: Array<string[]>, cycleNodes: Set<string>, blockedNodes: Set<string>, explanation: string }}
   */
  static analyze(graph) {
    const adj = graph.getAdjacencyList();
    const allCourses = Array.from(graph.courses.keys());

    // 0: WHITE (unvisited), 1: GRAY (visiting), 2: BLACK (visited)
    const color = new Map();
    for (const id of allCourses) {
      color.set(id, 0);
    }

    const parent = new Map();
    const cyclePaths = [];
    const cycleNodes = new Set();

    const dfs = (u, currentPath) => {
      color.set(u, 1);
      currentPath.push(u);

      const dependents = adj.get(u) || [];
      for (const v of dependents) {
        if (color.get(v) === 1) {
          // Found back-edge u -> v! Cycle confirmed.
          const cycleStartIndex = currentPath.indexOf(v);
          const cycleLoop = [...currentPath.slice(cycleStartIndex), v];
          cyclePaths.push(cycleLoop);
          for (const node of cycleLoop) {
            cycleNodes.add(node);
          }
        } else if (color.get(v) === 0) {
          parent.set(v, u);
          dfs(v, currentPath);
        }
      }

      currentPath.pop();
      color.set(u, 2);
    };

    for (const id of allCourses) {
      if (color.get(id) === 0) {
        dfs(id, []);
      }
    }

    // Now find any downstream courses that are blocked by these cycles
    const blockedNodes = new Set(cycleNodes);
    let changed = true;
    while (changed) {
      changed = false;
      for (const [u, dependents] of adj.entries()) {
        if (blockedNodes.has(u)) {
          for (const v of dependents) {
            if (!blockedNodes.has(v)) {
              blockedNodes.add(v);
              changed = true;
            }
          }
        }
      }
    }

    const hasCycle = cyclePaths.length > 0;
    let explanation = '';

    if (hasCycle) {
      const pathDescriptions = cyclePaths.map(path => path.join(' → ')).join(' | ');
      explanation = `A complete prerequisite order cannot be generated because the prerequisite graph contains a cycle: [${pathDescriptions}]. In a circular prerequisite chain, every course requires another course in the loop to be completed first, creating an impossible mutual deadlock where no course ever achieves zero remaining prerequisites.`;
    } else {
      explanation = 'The prerequisite graph is a valid Directed Acyclic Graph (DAG). There are no circular dependencies, and a valid topological schedule is guaranteed to exist.';
    }

    return {
      hasCycle,
      cyclePaths,
      cycleNodes,
      blockedNodes,
      explanation
    };
  }

  /**
   * Generates step-by-step snapshots specifically for cycle detection visualization.
   * @param {import('../models/Graph.js').PrerequisiteGraph} graph 
   */
  static runStepByStep(graph) {
    const steps = [];
    const adj = graph.getAdjacencyList();
    const allCourses = Array.from(graph.courses.keys());

    const color = new Map();
    for (const id of allCourses) {
      color.set(id, 0);
    }

    const callStack = [];
    const cyclePaths = [];
    const cycleEdges = [];

    steps.push({
      stepNumber: steps.length + 1,
      type: 'INIT',
      summary: 'Begin Cycle Detection Analysis',
      detail: `Scanning ${allCourses.length} courses for circular prerequisite loops using 3-color DFS state tracking.`,
      activeNodes: [],
      highlightEdges: [],
      callStack: [],
      cyclePaths: []
    });

    const dfs = (u) => {
      color.set(u, 1);
      callStack.push(u);

      steps.push({
        stepNumber: steps.length + 1,
        type: 'VISIT',
        summary: `Mark "${u}" as GRAY (In Active Stack)`,
        detail: `Added "${u}" to recursion path [${callStack.join(' → ')}].`,
        currentNode: u,
        activeNodes: [...callStack],
        highlightEdges: [],
        callStack: [...callStack],
        cyclePaths: [...cyclePaths]
      });

      const dependents = adj.get(u) || [];
      for (const v of dependents) {
        if (color.get(v) === 1) {
          // Back-edge cycle
          const startIdx = callStack.indexOf(v);
          const loop = [...callStack.slice(startIdx), v];
          cyclePaths.push(loop);
          cycleEdges.push({ from: u, to: v });

          steps.push({
            stepNumber: steps.length + 1,
            type: 'CYCLE_FOUND',
            summary: `Circular Dependency Found: ${loop.join(' → ')}!`,
            detail: `Detected Back-Edge ${u} → ${v}. Course "${v}" is an ancestor of "${u}" on the active call stack. Complete loop: ${loop.join(' → ')}. Topological ordering is impossible.`,
            currentNode: u,
            targetNode: v,
            currentEdge: { from: u, to: v },
            activeNodes: [...loop],
            highlightEdges: [{ from: u, to: v, isCycle: true }],
            callStack: [...callStack],
            cyclePaths: [...cyclePaths]
          });
        } else if (color.get(v) === 0) {
          steps.push({
            stepNumber: steps.length + 1,
            type: 'TRAVERSE',
            summary: `Check Dependency ${u} → ${v}`,
            detail: `Course "${v}" is not yet visited. Recursing down branch.`,
            currentNode: u,
            targetNode: v,
            currentEdge: { from: u, to: v },
            activeNodes: [u, v],
            highlightEdges: [{ from: u, to: v }],
            callStack: [...callStack],
            cyclePaths: [...cyclePaths]
          });
          dfs(v);
        }
      }

      callStack.pop();
      color.set(u, 2);

      steps.push({
        stepNumber: steps.length + 1,
        type: 'FINISH_NODE',
        summary: `Mark "${u}" as BLACK (Resolved)`,
        detail: `Finished exploring all branches rooted at "${u}". Removed from active recursion stack.`,
        currentNode: u,
        activeNodes: [...callStack],
        highlightEdges: [],
        callStack: [...callStack],
        cyclePaths: [...cyclePaths]
      });
    };

    for (const id of allCourses) {
      if (color.get(id) === 0) {
        dfs(id);
      }
    }

    const hasCycle = cyclePaths.length > 0;

    steps.push({
      stepNumber: steps.length + 1,
      type: hasCycle ? 'CYCLE_SUMMARY' : 'DAG_SUMMARY',
      summary: hasCycle ? 'Analysis Finished: Graph Contains Cycle' : 'Analysis Finished: Graph is a DAG',
      detail: hasCycle
        ? `Identified ${cyclePaths.length} circular prerequisite loop(s). A complete prerequisite order cannot be generated because the prerequisite graph contains a cycle.`
        : 'All courses and prerequisites were verified. No circular dependencies exist in the graph. The graph is a valid DAG.',
      activeNodes: hasCycle ? Array.from(new Set(cyclePaths.flat())) : allCourses,
      highlightEdges: cycleEdges,
      callStack: [],
      cyclePaths: [...cyclePaths]
    });

    return {
      steps,
      hasCycle,
      cyclePaths
    };
  }
}
