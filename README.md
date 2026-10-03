# Course Prerequisite Planner — Algorithm-Centric Prototype 🎓

An interactive, visual university course prerequisite planner powered by **Directed Graph Algorithms** and **Constraint-Based Semester Scheduling**.

Designed for computer science students, academic advisors, and algorithm learners, this tool prioritizes **algorithm transparency**: it exposes intermediate graph states, in-degree updates, traversal queues, recursion stacks, and clear mathematical reasoning for every scheduled course or detected deadlock.

---

## 🌟 Key Features

* **Directed Graph Representation ($u \to v$)**: Models courses as vertices and prerequisites as directed edges ($u$ must be completed before $v$).
* **Kahn's Topological Sorting**: Step-by-step queue-based execution with zero-in-degree candidates, edge relaxation, and cycle safety guardrails.
* **Breadth-First Search (BFS)**: Explores downstream unlockable courses level-by-level, tracking frontier queues and minimum prerequisite hop distances.
* **Depth-First Search (DFS)**: Deep dependency chain traversal with live call stack inspection, traversal depth metrics, and recursion trees.
* **Dedicated Cycle Detection**: 3-color DFS state tracking (White, Gray, Black) that pinpoints back-edges, isolates exact circular loops (e.g., `A → B → C → A`), and identifies downstream blocked courses.
* **Constraint-Aware Semester Planner**:
  * Enforces prerequisite barriers (prerequisites must be completed in earlier semesters).
  * Respects semester credit limits and maximum course capacity.
  * Priority tie-breaking (High / Medium / Low) and out-degree critical-path prioritization.
  * Generates human-readable "Why Eligible" explanations for every scheduled course.
* **Interactive SVG Visualizer**:
  * Sugiyama-style topological layered DAG layout.
  * Drag-and-drop node repositioning with real-time curved edge recalculation.
  * Zoom and pan controls.
  * Dynamic state glow: Ready (Emerald), Active (Cyan), Sorted (Indigo), and Cycle (Crimson Pulse).
* **Curricular Presets**:
  * **CS Core (DAG)**: Standard computer science sequence (Programming I through Capstone).
  * **Cyclic Trap**: Intentional circular dependency to demonstrate cycle rejection.
  * **4-Year Extended**: Full 16-course degree program across 4 academic tracks.

---

## 🚀 Getting Started

### Prerequisites

* Any modern web browser (Chrome, Edge, Firefox, Safari).
* Python 3 or Node.js (for serving the static files locally).

### Running Locally

1. **Clone the repository**:
   ```bash
   git clone https://github.com/<your-username>/course-prerequisite-planner.git
   cd course-prerequisite-planner
   ```

2. **Start a local HTTP server**:
   * Using Python:
     ```bash
     python -m http.server 8000
     ```
   * Or using Node.js:
     ```bash
     npx serve .
     ```

3. **Open the browser**:
   Navigate to [http://localhost:8000](http://localhost:8000).

---

## 🧪 Automated Testing

The project includes a comprehensive automated test suite verifying all graph data structures, algorithms, and scheduling constraints:

```bash
node test_algorithms.js
```

### Test Coverage Summary:
- Graph construction, forward/reverse adjacency lists, in/out degrees.
- Kahn's algorithm topological order verification across all prerequisite edges.
- BFS queue snapshots, level hop distances, and reachability.
- DFS recursion call stack and tree indentation.
- Cycle detection, back-edge identification, and cycle node isolation.
- Semester capacity checks (credits $\le$ max, courses $\le$ max, prerequisite chronology).
- Cyclic plan rejection and error reporting.

---

## 📁 Project Structure

```
├── index.html                           # Semantic HTML5 UI layout, modals, and toolbars
├── css/
│   └── styles.css                       # Modern glassmorphism CSS design system
├── js/
│   ├── models/
│   │   ├── Course.js                    # Course model (credits, prerequisites, priority)
│   │   └── Graph.js                     # Directed graph data structure (adjList, prereqList, degrees)
│   ├── algorithms/
│   │   ├── topologicalSort.js           # Kahn's algorithm with priority tie-breaking
│   │   ├── bfs.js                       # Breadth-First Search level traversal & hop distance
│   │   ├── dfs.js                       # Depth-First Search with recursion call stack
│   │   ├── cycleDetector.js             # 3-color DFS cycle detector & loop reconstructor
│   │   └── semesterPlanner.js           # Semester scheduler with eligibility explanations
│   ├── presets/
│   │   └── sampleData.js                # Demonstration datasets (CS Core, Cyclic, Extended)
│   ├── visualizer/
│   │   └── GraphRenderer.js             # Interactive SVG visualizer with Sugiyama DAG layout
│   └── app.js                           # UI coordinator, stepper playback, and modal controllers
├── test_algorithms.js                   # Automated test suite (37 tests)
├── .gitignore                           # Git ignore definitions
└── README.md                            # Project documentation
```

---

## 📄 License

MIT License. Free for educational and personal use.
