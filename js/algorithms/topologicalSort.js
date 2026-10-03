/**
 * Topological Sort via Kahn's Algorithm (BFS-based In-Degree reduction)
 * 
 * Steps:
 * 1. Compute in-degree for all vertices.
 * 2. Initialize a queue with all vertices having in-degree 0.
 * 3. While queue is not empty:
 *    a. Dequeue vertex u (using priority/alphabetical order for deterministic tie-breaking).
 *    b. Append u to topological order.
 *    c. For each dependent neighbor v of u:
 *       i. Decrement in-degree of v.
 *       ii. If in-degree of v becomes 0, enqueue v.
 * 4. If number of sorted vertices == total vertices, valid DAG order generated.
 *    Otherwise, a cycle exists (unprocessed vertices form/depend on cycles).
 */

export class TopologicalSorter {
  /**
   * Generates step-by-step execution snapshots of Kahn's Algorithm.
   * @param {import('../models/Graph.js').PrerequisiteGraph} graph 
   * @param {Object} options
   * @param {boolean} options.usePriority - Whether to tie-break zero-in-degree queue by course priority
   * @returns {{ steps: Array, success: boolean, order: string[], cycleCourses: string[], errorMessage?: string }}
   */
  static run(graph, options = { usePriority: true }) {
    const steps = [];
    const totalVertices = graph.size;

    if (totalVertices === 0) {
      return {
        steps: [{
          stepNumber: 1,
          type: 'EMPTY',
          summary: 'Graph is empty',
          detail: 'No courses present in the graph to sort.',
          inDegrees: {},
          queue: [],
          order: [],
          activeNodes: [],
          highlightEdges: [],
          codeLine: 1
        }],
        success: true,
        order: [],
        cycleCourses: []
      };
    }

    // Step 1: Calculate in-degrees and build adjacency list
    const inDegrees = new Map(graph.getInDegrees());
    const adj = graph.getAdjacencyList();
    const sortedOrder = [];
    const visited = new Set();

    // Priority comparator for zero-in-degree queue
    const sortQueue = (q) => {
      if (!options.usePriority) return q.sort();
      return q.sort((a, b) => {
        const courseA = graph.getCourse(a);
        const courseB = graph.getCourse(b);
        const pDiff = (courseB?.priorityWeight || 2) - (courseA?.priorityWeight || 2);
        if (pDiff !== 0) return pDiff;
        return a.localeCompare(b);
      });
    };

    // Step 2: Find all initial zero-in-degree courses
    let queue = [];
    for (const [id, deg] of inDegrees.entries()) {
      if (deg === 0) {
        queue.push(id);
      }
    }
    queue = sortQueue(queue);

    const getInDegreeSnapshot = () => {
      const obj = {};
      for (const [k, v] of inDegrees.entries()) {
        obj[k] = v;
      }
      return obj;
    };

    // Snapshot: Initialization
    steps.push({
      stepNumber: steps.length + 1,
      type: 'INIT',
      summary: 'Calculate Initial In-Degrees',
      detail: `Calculated in-degree (number of prerequisites) for all ${totalVertices} courses. Found ${queue.length} course(s) with in-degree 0: [${queue.join(', ') || 'None'}].`,
      inDegrees: getInDegreeSnapshot(),
      queue: [...queue],
      order: [...sortedOrder],
      activeNodes: [...queue],
      highlightEdges: [],
      codeLine: 2
    });

    if (queue.length === 0 && totalVertices > 0) {
      const cycleCourses = Array.from(graph.courses.keys());
      steps.push({
        stepNumber: steps.length + 1,
        type: 'CYCLE_DETECTED',
        summary: 'Immediate Prerequisite Cycle Detected!',
        detail: 'No course has in-degree 0. Every single course requires at least one prerequisite, forming a closed dependency cycle. No starting course can be chosen.',
        inDegrees: getInDegreeSnapshot(),
        queue: [],
        order: [],
        activeNodes: cycleCourses,
        highlightEdges: [],
        codeLine: 3
      });

      return {
        steps,
        success: false,
        order: [],
        cycleCourses,
        errorMessage: 'A complete prerequisite order cannot be generated because the prerequisite graph contains a cycle.'
      };
    }

    // Step 3: Process the queue
    while (queue.length > 0) {
      // Pick next eligible course
      const current = queue.shift();
      sortedOrder.push(current);
      visited.add(current);

      const courseObj = graph.getCourse(current);
      const dependents = adj.get(current) || [];

      steps.push({
        stepNumber: steps.length + 1,
        type: 'SELECT',
        summary: `Select Course "${current}"`,
        detail: `Dequeued "${current}" (${courseObj?.name || current}) because its in-degree is 0 (all prerequisites satisfied). Appended to topological order. It unlocks ${dependents.length} dependent course(s).`,
        currentNode: current,
        inDegrees: getInDegreeSnapshot(),
        queue: [...queue],
        order: [...sortedOrder],
        activeNodes: [current],
        highlightEdges: dependents.map(dep => ({ from: current, to: dep })),
        codeLine: 5
      });

      // Step 4: Decrement in-degree of all dependent courses
      for (const depId of dependents) {
        const oldDeg = inDegrees.get(depId);
        const newDeg = oldDeg - 1;
        inDegrees.set(depId, newDeg);

        let unlockedMessage = '';
        const becameZero = newDeg === 0;

        if (becameZero) {
          queue.push(depId);
          queue = sortQueue(queue);
          unlockedMessage = `In-degree reached 0! Course "${depId}" is now eligible and enqueued.`;
        } else {
          unlockedMessage = `In-degree reduced from ${oldDeg} to ${newDeg} (still waiting on ${newDeg} prerequisites).`;
        }

        steps.push({
          stepNumber: steps.length + 1,
          type: becameZero ? 'ENQUEUE_ZERO' : 'DECREMENT',
          summary: `Relax Edge ${current} → ${depId}`,
          detail: `Since prerequisite "${current}" is completed, updated "${depId}". ${unlockedMessage}`,
          currentNode: current,
          currentEdge: { from: current, to: depId },
          inDegrees: getInDegreeSnapshot(),
          queue: [...queue],
          order: [...sortedOrder],
          activeNodes: [current, depId],
          highlightEdges: [{ from: current, to: depId }],
          codeLine: becameZero ? 8 : 7
        });
      }
    }

    // Check if all vertices were sorted
    if (sortedOrder.length === totalVertices) {
      steps.push({
        stepNumber: steps.length + 1,
        type: 'SUCCESS',
        summary: 'Topological Sort Completed Successfully',
        detail: `All ${totalVertices} courses have been processed with zero remaining dependencies. A valid prerequisite progression order has been established: ${sortedOrder.join(' → ')}.`,
        inDegrees: getInDegreeSnapshot(),
        queue: [],
        order: [...sortedOrder],
        activeNodes: [...sortedOrder],
        highlightEdges: [],
        codeLine: 10
      });

      return {
        steps,
        success: true,
        order: sortedOrder,
        cycleCourses: []
      };
    } else {
      // Cycle detected! Vertices with inDegree > 0 could not be processed
      const cycleCourses = [];
      for (const [id, deg] of inDegrees.entries()) {
        if (deg > 0) {
          cycleCourses.push(id);
        }
      }

      steps.push({
        stepNumber: steps.length + 1,
        type: 'CYCLE_DETECTED',
        summary: 'Prerequisite Cycle Detected!',
        detail: `A complete prerequisite order cannot be generated because the prerequisite graph contains a cycle. Only ${sortedOrder.length} of ${totalVertices} courses could be scheduled. The following courses are trapped in or blocked by a circular dependency: [${cycleCourses.join(', ')}].`,
        inDegrees: getInDegreeSnapshot(),
        queue: [],
        order: [...sortedOrder],
        activeNodes: cycleCourses,
        highlightEdges: [],
        codeLine: 12
      });

      return {
        steps,
        success: false,
        order: sortedOrder,
        cycleCourses,
        errorMessage: 'A complete prerequisite order cannot be generated because the prerequisite graph contains a cycle.'
      };
    }
  }
}
