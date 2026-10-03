/**
 * Comprehensive Automated Test Suite
 * Tests all Graph data structures, Topological Sort, BFS, DFS, Cycle Detection, and Semester Planning.
 */

import { Course } from './js/models/Course.js';
import { PrerequisiteGraph } from './js/models/Graph.js';
import { TopologicalSorter } from './js/algorithms/topologicalSort.js';
import { BreadthFirstSearch } from './js/algorithms/bfs.js';
import { DepthFirstSearch } from './js/algorithms/dfs.js';
import { CycleDetector } from './js/algorithms/cycleDetector.js';
import { SemesterPlanner } from './js/algorithms/semesterPlanner.js';
import { SAMPLE_DATASETS } from './js/presets/sampleData.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

console.log('====================================================');
console.log('TEST SUITE 1: Directed Graph Model & Data Structures');
console.log('====================================================');

const graph = new PrerequisiteGraph();
for (const c of SAMPLE_DATASETS.standard.courses) {
  graph.addCourse(new Course(c));
}

assert(graph.size === 11, `Graph has 11 courses (got ${graph.size})`);
assert(graph.edgeCount >= 10, `Graph has edge count >= 10 (got ${graph.edgeCount})`);

const inDegrees = graph.getInDegrees();
assert(inDegrees.get('CS101') === 0, 'CS101 (Programming I) has in-degree 0 (no prerequisites)');
assert(inDegrees.get('MATH101') === 0, 'MATH101 (Discrete Math) has in-degree 0');
assert(inDegrees.get('CS102') === 1, 'CS102 (Programming II) has in-degree 1 (requires CS101)');
assert(inDegrees.get('CS401') === 2, 'CS401 (Software Eng) has in-degree 2 (requires CS201 & CS302)');

const adj = graph.getAdjacencyList();
assert(adj.get('CS101').includes('CS102'), 'Adjacency list: CS101 unlocks CS102');
assert(adj.get('CS201').includes('CS301'), 'Adjacency list: CS201 unlocks CS301');

console.log('\n====================================================');
console.log("TEST SUITE 2: Kahn's Topological Sorting Algorithm");
console.log('====================================================');

const topoResult = TopologicalSorter.run(graph, { usePriority: true });
assert(topoResult.success === true, 'Topological sort succeeds on standard DAG');
assert(topoResult.order.length === 11, `All 11 courses ordered (got ${topoResult.order.length})`);
assert(topoResult.steps.length > 10, `Generated ${topoResult.steps.length} detailed step-by-step traces`);

// Verify that for EVERY prerequisite edge u -> v, u appears before v in the topological order!
let allPrereqsSatisfied = true;
const orderMap = new Map();
topoResult.order.forEach((id, idx) => orderMap.set(id, idx));

for (const course of graph.getAllCourses()) {
  for (const prereqId of course.prerequisites) {
    if (orderMap.get(prereqId) >= orderMap.get(course.id)) {
      allPrereqsSatisfied = false;
      console.error(`Violation: ${prereqId} (pos ${orderMap.get(prereqId)}) appears after ${course.id} (pos ${orderMap.get(course.id)})`);
    }
  }
}
assert(allPrereqsSatisfied, 'Topological order strictly satisfies EVERY prerequisite constraint u -> v');

console.log('\n====================================================');
console.log('TEST SUITE 3: Breadth-First Search (BFS) Traversal');
console.log('====================================================');

const bfsResult = BreadthFirstSearch.run(graph, 'CS101');
assert(bfsResult.visitedOrder[0] === 'CS101', 'BFS starts at selected course CS101');
assert(bfsResult.levels['CS101'] === 0, 'Level of start course CS101 is 0');
assert(bfsResult.levels['CS102'] === 1, 'Level of direct dependent CS102 is 1');
assert(bfsResult.levels['CS201'] === 2, 'Level of CS201 is 2');
assert(bfsResult.levels['CS301'] === 3, 'Level of CS301 is 3');
assert(bfsResult.steps.length > 5, `BFS generated ${bfsResult.steps.length} trace steps`);

console.log('\n====================================================');
console.log('TEST SUITE 4: Depth-First Search (DFS) Traversal');
console.log('====================================================');

const dfsResult = DepthFirstSearch.run(graph, 'CS101', true);
assert(dfsResult.visitedOrder.includes('CS101'), 'DFS visited start node');
assert(dfsResult.cyclesFound.length === 0, 'No cycles found in standard DAG');
assert(dfsResult.treeIndentation.length > 5, 'DFS generated indented tree exploration hierarchy');

console.log('\n====================================================');
console.log('TEST SUITE 5: Cycle Detection (Cyclic Trap Dataset)');
console.log('====================================================');

const cyclicGraph = new PrerequisiteGraph();
for (const c of SAMPLE_DATASETS.cyclic.courses) {
  cyclicGraph.addCourse(new Course(c));
}

const cycleAnalysis = CycleDetector.analyze(cyclicGraph);
assert(cycleAnalysis.hasCycle === true, 'CycleDetector successfully detected cycle');
assert(cycleAnalysis.cyclePaths.length > 0, `Detected ${cycleAnalysis.cyclePaths.length} cycle loop(s)`);

const cycleNodesArr = Array.from(cycleAnalysis.cycleNodes);
assert(cycleNodesArr.includes('CS101') && cycleNodesArr.includes('CS201') && cycleNodesArr.includes('CS301'),
  'Identified all cycle participants (CS101, CS201, CS301)');

assert(cycleAnalysis.blockedNodes.has('CS302'), 'Identified downstream blocked course (CS302)');

// Test Kahn's response to cycle
const cyclicTopoResult = TopologicalSorter.run(cyclicGraph);
assert(cyclicTopoResult.success === false, 'Kahn topological sort correctly fails on cyclic graph');
assert(cyclicTopoResult.errorMessage.includes('A complete prerequisite order cannot be generated because the prerequisite graph contains a cycle.'),
  'Emits exact required error message on cycle detection');

console.log('\n====================================================');
console.log('TEST SUITE 6: Semester-Wise Learning Plan Generator');
console.log('====================================================');

const planResult = SemesterPlanner.generatePlan(graph, {
  maxCredits: 12,
  maxCourses: 3
});

assert(planResult.success === true, 'Semester plan successfully generated for standard DAG');
assert(planResult.semesters.length >= 4, `Plan spans ${planResult.semesters.length} semesters`);
assert(planResult.unscheduled.length === 0, 'All courses successfully scheduled');

// Verify Semester Constraints:
let semesterIntegrityValid = true;
const courseToSemMap = new Map();

planResult.semesters.forEach(sem => {
  if (sem.totalCredits > 12) {
    semesterIntegrityValid = false;
    console.error(`Credit capacity exceeded in ${sem.name}: ${sem.totalCredits} > 12`);
  }
  if (sem.courses.length > 3) {
    semesterIntegrityValid = false;
    console.error(`Course count exceeded in ${sem.name}: ${sem.courses.length} > 3`);
  }
  sem.courses.forEach(c => {
    courseToSemMap.set(c.id, sem.semesterNumber);
  });
});

assert(semesterIntegrityValid, 'All semesters respect credit (<= 12) and course count (<= 3) limits');

// Verify that NO course appears in the same or earlier semester than its prerequisites
let chronologicalPrereqOrder = true;
for (const course of graph.getAllCourses()) {
  const semCourse = courseToSemMap.get(course.id);
  for (const pId of course.prerequisites) {
    const semPrereq = courseToSemMap.get(pId);
    if (semPrereq >= semCourse) {
      chronologicalPrereqOrder = false;
      console.error(`Prerequisite violation: ${pId} taken in Sem ${semPrereq}, but dependent ${course.id} taken in Sem ${semCourse}`);
    }
  }
}
assert(chronologicalPrereqOrder, 'Every course is scheduled STRICTLY AFTER all its prerequisites');

// Verify decisions explanation:
const sem1Course = planResult.semesters[0].decisions[0];
assert(sem1Course.explanation && sem1Course.explanation.length > 10,
  `Rich eligibility explanation generated: "${sem1Course.explanation.slice(0, 60)}..."`);

console.log('\n====================================================');
console.log('TEST SUITE 7: Semester Planning with Cyclic Trap');
console.log('====================================================');

const cyclicPlan = SemesterPlanner.generatePlan(cyclicGraph, {
  maxCredits: 12,
  maxCourses: 3
});

assert(cyclicPlan.success === false, 'Semester planner rejects cyclic graph');
assert(cyclicPlan.cycleInfo !== null, 'Semester planner attaches cycle diagnostics');
assert(cyclicPlan.unscheduled.length > 0, `Reports ${cyclicPlan.unscheduled.length} unscheduled blocked courses`);

const cyclicReason = cyclicPlan.unscheduled.find(u => u.course.id === 'CS101')?.reason;
assert(cyclicReason.includes('cycle'), `Unscheduled reason for CS101 cites cycle: "${cyclicReason}"`);

console.log('\n====================================================');
console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
console.log('====================================================');

if (failed > 0) {
  process.exit(1);
}
