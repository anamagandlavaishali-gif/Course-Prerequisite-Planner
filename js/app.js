/**
 * Main Application Controller
 * Coordinates Models, Graph Renderer, Algorithm Stepper, UI Bindings, and Presets.
 */

import { Course } from './models/Course.js';
import { PrerequisiteGraph } from './models/Graph.js';
import { TopologicalSorter } from './algorithms/topologicalSort.js';
import { BreadthFirstSearch } from './algorithms/bfs.js';
import { DepthFirstSearch } from './algorithms/dfs.js';
import { CycleDetector } from './algorithms/cycleDetector.js';
import { SemesterPlanner } from './algorithms/semesterPlanner.js';
import { GraphRenderer } from './visualizer/GraphRenderer.js';
import { SAMPLE_DATASETS } from './presets/sampleData.js';

class App {
  constructor() {
    this.graph = new PrerequisiteGraph();
    this.currentMode = 'topo'; // 'topo' | 'bfs' | 'dfs' | 'cycle' | 'planner'
    this.currentPresetKey = 'standard';
    
    // Stepper State
    this.steps = [];
    this.currentStepIndex = 0;
    this.isPlaying = false;
    this.playbackInterval = null;
    this.playbackSpeed = 1000; // ms per step

    // Algorithm Parameters
    this.selectedStartNode = null;
    this.usePriorityTieBreak = true;
    this.plannerMaxCredits = 12;
    this.plannerMaxCourses = 3;

    this.initDOMReferences();
    this.initRenderer();
    this.bindEvents();
    this.loadPreset('standard');
  }

  initDOMReferences() {
    // Top Bar
    this.themeToggleBtn = document.getElementById('themeToggleBtn');
    this.presetBtns = document.querySelectorAll('.preset-btn');
    this.addCourseBtn = document.getElementById('addCourseBtn');
    this.inspectGraphBtn = document.getElementById('inspectGraphBtn');

    // Sidebar Left
    this.courseSearchInput = document.getElementById('courseSearchInput');
    this.courseCardList = document.getElementById('courseCardList');
    this.totalCoursesCount = document.getElementById('totalCoursesCount');

    // Canvas Area
    this.canvasContainer = document.getElementById('graphCanvasContainer');
    this.btnZoomIn = document.getElementById('btnZoomIn');
    this.btnZoomOut = document.getElementById('btnZoomOut');
    this.btnFitScreen = document.getElementById('btnFitScreen');
    this.btnResetLayout = document.getElementById('btnResetLayout');

    // Right Panel: Tabs & Views
    this.algoTabBtns = document.querySelectorAll('.tab-btn');
    this.stepperSection = document.getElementById('stepperSection');
    this.plannerSection = document.getElementById('plannerSection');

    // Stepper Controls
    this.btnStepFirst = document.getElementById('btnStepFirst');
    this.btnStepPrev = document.getElementById('btnStepPrev');
    this.btnStepPlay = document.getElementById('btnStepPlay');
    this.btnStepNext = document.getElementById('btnStepNext');
    this.btnStepLast = document.getElementById('btnStepLast');
    this.speedSelect = document.getElementById('speedSelect');
    this.stepCounter = document.getElementById('stepCounter');
    this.stepProgressFill = document.getElementById('stepProgressFill');

    // Explanation Banner
    this.stepExplanationCard = document.getElementById('stepExplanationCard');
    this.stepTypeBadge = document.getElementById('stepTypeBadge');
    this.stepHeadline = document.getElementById('stepHeadline');
    this.stepDetail = document.getElementById('stepDetail');

    // Live Data Structures
    this.dsContainer = document.getElementById('dsContainer');

    // Semester Planner DOM
    this.plannerCreditsInput = document.getElementById('plannerCreditsInput');
    this.plannerCoursesInput = document.getElementById('plannerCoursesInput');
    this.btnRunPlanner = document.getElementById('btnRunPlanner');
    this.btnExportPlan = document.getElementById('btnExportPlan');
    this.semesterResultsContainer = document.getElementById('semesterResultsContainer');
    this.cycleAlertBanner = document.getElementById('cycleAlertBanner');

    // Modals
    this.courseModal = document.getElementById('courseModal');
    this.courseForm = document.getElementById('courseForm');
    this.modalTitle = document.getElementById('modalTitle');
    this.inputCourseId = document.getElementById('inputCourseId');
    this.inputCourseName = document.getElementById('inputCourseName');
    this.inputCourseCredits = document.getElementById('inputCourseCredits');
    this.selectCoursePriority = document.getElementById('selectCoursePriority');
    this.prereqCheckboxContainer = document.getElementById('prereqCheckboxContainer');
    this.btnSaveCourse = document.getElementById('btnSaveCourse');
    this.btnDeleteCourse = document.getElementById('btnDeleteCourse');
    this.btnCloseModal = document.getElementById('btnCloseModal');
    this.btnCancelModal = document.getElementById('btnCancelModal');

    // Graph Matrix Modal
    this.matrixModal = document.getElementById('matrixModal');
    this.btnCloseMatrixModal = document.getElementById('btnCloseMatrixModal');
    this.matrixContent = document.getElementById('matrixContent');

    // Toast Container
    this.toastContainer = document.getElementById('toastContainer');
  }

  initRenderer() {
    this.renderer = new GraphRenderer(this.canvasContainer, {
      onNodeClick: (course) => {
        this.handleNodeClick(course);
      }
    });
  }

  bindEvents() {
    // Theme toggle
    this.themeToggleBtn?.addEventListener('click', () => {
      document.body.classList.toggle('light-theme');
      const isLight = document.body.classList.contains('light-theme');
      this.themeToggleBtn.innerHTML = isLight ? '🌙' : '☀️';
      this.renderer.render();
    });

    // Preset buttons
    this.presetBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const presetKey = btn.dataset.preset;
        this.loadPreset(presetKey);
      });
    });

    // Canvas toolbar buttons
    this.btnZoomIn?.addEventListener('click', () => {
      this.renderer.zoom = Math.min(this.renderer.zoom * 1.2, 3.0);
      this.renderer.updateTransform();
    });
    this.btnZoomOut?.addEventListener('click', () => {
      this.renderer.zoom = Math.max(this.renderer.zoom / 1.2, 0.25);
      this.renderer.updateTransform();
    });
    this.btnFitScreen?.addEventListener('click', () => {
      this.renderer.fitToScreen();
    });
    this.btnResetLayout?.addEventListener('click', () => {
      this.renderer.calculateHierarchicalLayout();
    });

    // Course search
    this.courseSearchInput?.addEventListener('input', (e) => {
      this.renderSidebarCourseList(e.target.value);
    });

    // Add Course Modal open
    this.addCourseBtn?.addEventListener('click', () => {
      this.openCourseModal();
    });

    // Inspect Graph representation
    this.inspectGraphBtn?.addEventListener('click', () => {
      this.openGraphMatrixModal();
    });

    // Modal Close
    this.btnCloseModal?.addEventListener('click', () => this.closeCourseModal());
    this.btnCancelModal?.addEventListener('click', () => this.closeCourseModal());
    this.btnCloseMatrixModal?.addEventListener('click', () => this.closeGraphMatrixModal());

    // Save Course Form
    this.courseForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveCourseFromModal();
    });

    // Delete Course
    this.btnDeleteCourse?.addEventListener('click', () => {
      this.deleteCourseFromModal();
    });

    // Algorithm Tab Buttons
    this.algoTabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.mode;
        this.switchMode(mode);
      });
    });

    // Stepper playback controls
    this.btnStepFirst?.addEventListener('click', () => this.jumpToStep(0));
    this.btnStepPrev?.addEventListener('click', () => this.jumpToStep(this.currentStepIndex - 1));
    this.btnStepNext?.addEventListener('click', () => this.jumpToStep(this.currentStepIndex + 1));
    this.btnStepLast?.addEventListener('click', () => this.jumpToStep(this.steps.length - 1));
    this.btnStepPlay?.addEventListener('click', () => this.togglePlayback());

    this.speedSelect?.addEventListener('change', (e) => {
      this.playbackSpeed = Number(e.target.value);
      if (this.isPlaying) {
        this.pausePlayback();
        this.startPlayback();
      }
    });

    // Semester Planner controls
    this.btnRunPlanner?.addEventListener('click', () => {
      this.runSemesterPlanner();
    });

    this.btnExportPlan?.addEventListener('click', () => {
      this.exportPlanAsMarkdown();
    });
  }

  loadPreset(presetKey) {
    this.currentPresetKey = presetKey;
    const preset = SAMPLE_DATASETS[presetKey];
    if (!preset) return;

    this.presetBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.preset === presetKey);
    });

    this.graph.clear();
    for (const c of preset.courses) {
      this.graph.addCourse(new Course(c));
    }

    this.plannerMaxCredits = preset.maxCredits || 12;
    this.plannerMaxCourses = preset.maxCourses || 3;
    if (this.plannerCreditsInput) this.plannerCreditsInput.value = this.plannerMaxCredits;
    if (this.plannerCoursesInput) this.plannerCoursesInput.value = this.plannerMaxCourses;

    this.renderer.setGraph(this.graph);
    this.renderSidebarCourseList();

    this.showToast(`Loaded preset: ${preset.name}`, 'info');

    // Run the active mode algorithm
    this.runCurrentModeAlgorithm();
  }

  switchMode(mode) {
    this.currentMode = mode;
    this.pausePlayback();

    this.algoTabBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === mode);
    });

    const isPlanner = (mode === 'planner');
    if (this.stepperSection) this.stepperSection.style.display = isPlanner ? 'none' : 'flex';
    if (this.plannerSection) this.plannerSection.style.display = isPlanner ? 'flex' : 'none';

    this.runCurrentModeAlgorithm();
  }

  runCurrentModeAlgorithm() {
    this.pausePlayback();

    // Default start node for BFS/DFS is first zero-in-degree course or first course
    const zeroIn = this.graph.getZeroInDegreeCourses();
    const all = this.graph.getAllCourses();
    const defaultStart = zeroIn.length > 0 ? zeroIn[0].id : (all.length > 0 ? all[0].id : null);
    const startNode = this.selectedStartNode && this.graph.getCourse(this.selectedStartNode)
      ? this.selectedStartNode
      : defaultStart;

    if (this.currentMode === 'topo') {
      const result = TopologicalSorter.run(this.graph, { usePriority: this.usePriorityTieBreak });
      this.steps = result.steps;
      this.jumpToStep(0);
    } else if (this.currentMode === 'bfs') {
      if (!startNode) return;
      const result = BreadthFirstSearch.run(this.graph, startNode);
      this.steps = result.steps;
      this.jumpToStep(0);
    } else if (this.currentMode === 'dfs') {
      if (!startNode) return;
      const result = DepthFirstSearch.run(this.graph, startNode, true);
      this.steps = result.steps;
      this.jumpToStep(0);
    } else if (this.currentMode === 'cycle') {
      const result = CycleDetector.runStepByStep(this.graph);
      this.steps = result.steps;
      this.jumpToStep(0);
    } else if (this.currentMode === 'planner') {
      this.runSemesterPlanner();
    }
  }

  jumpToStep(index) {
    if (!this.steps || this.steps.length === 0) return;
    const clampedIndex = Math.max(0, Math.min(index, this.steps.length - 1));
    this.currentStepIndex = clampedIndex;

    const step = this.steps[clampedIndex];
    this.updateStepperUI(step);
    this.renderer.applyStepState(step);

    // Disable navigation buttons at boundaries
    if (this.btnStepFirst) this.btnStepFirst.disabled = (clampedIndex === 0);
    if (this.btnStepPrev) this.btnStepPrev.disabled = (clampedIndex === 0);
    if (this.btnStepNext) this.btnStepNext.disabled = (clampedIndex === this.steps.length - 1);
    if (this.btnStepLast) this.btnStepLast.disabled = (clampedIndex === this.steps.length - 1);

    if (clampedIndex === this.steps.length - 1 && this.isPlaying) {
      this.pausePlayback();
    }
  }

  updateStepperUI(step) {
    const total = this.steps.length;
    const current = this.currentStepIndex + 1;

    if (this.stepCounter) this.stepCounter.textContent = `Step ${current} of ${total}`;
    if (this.stepProgressFill) {
      const percent = total > 1 ? (this.currentStepIndex / (total - 1)) * 100 : 100;
      this.stepProgressFill.style.width = `${percent}%`;
    }

    if (this.stepTypeBadge) this.stepTypeBadge.textContent = step.type || 'STEP';
    if (this.stepHeadline) this.stepHeadline.textContent = step.summary || '';
    if (this.stepDetail) this.stepDetail.textContent = step.detail || '';

    const isCycleStep = (step.type === 'CYCLE_DETECTED' || step.type === 'BACK_EDGE_CYCLE' || step.type === 'CYCLE_FOUND' || step.type === 'CYCLE_SUMMARY');
    if (this.stepExplanationCard) {
      this.stepExplanationCard.classList.toggle('is-cycle', isCycleStep);
    }

    this.renderDataStructuresPanel(step);
  }

  renderDataStructuresPanel(step) {
    if (!this.dsContainer) return;
    this.dsContainer.innerHTML = '';

    if (this.currentMode === 'topo') {
      // 1. Zero-In-Degree Queue
      const queueBlock = this.createDSBlock('Zero In-Degree Queue (Ready)', (step.queue || []).map(id => {
        return `<span class="ds-chip chip-queue">${id}</span>`;
      }).join('') || '<span style="font-size:0.7rem; color:var(--text-muted); font-style:italic;">Queue is empty</span>');

      // 2. Current Topological Order
      const orderBlock = this.createDSBlock('Topological Order So Far', (step.order || []).map((id, idx) => {
        return `<span class="ds-chip ${idx === step.order.length - 1 ? 'chip-active' : ''}">${id}</span>`;
      }).join(' <span style="color:var(--text-muted); font-size:0.65rem;">➔</span> ') || '<span style="font-size:0.7rem; color:var(--text-muted); font-style:italic;">None scheduled yet</span>');

      // 3. Live In-Degree Map
      const inDegObj = step.inDegrees || {};
      const inDegCells = Object.entries(inDegObj).map(([id, deg]) => {
        return `<div class="indegree-cell ${deg === 0 ? 'zero' : ''}"><span>${id}</span><strong>${deg}</strong></div>`;
      }).join('');
      const inDegBlock = this.createDSBlock('Current In-Degrees', `<div class="indegree-grid">${inDegCells}</div>`);

      this.dsContainer.appendChild(queueBlock);
      this.dsContainer.appendChild(orderBlock);
      this.dsContainer.appendChild(inDegBlock);
    } else if (this.currentMode === 'bfs') {
      // BFS Queue
      const queueBlock = this.createDSBlock('BFS FIFO Queue', (step.queue || []).map(id => {
        return `<span class="ds-chip chip-queue">${id}</span>`;
      }).join('') || '<span style="font-size:0.7rem; color:var(--text-muted); font-style:italic;">Queue is empty</span>');

      // Visited Order
      const visitedBlock = this.createDSBlock('Visitation Order', (step.visitedOrder || []).map(id => {
        return `<span class="ds-chip chip-active">${id}</span>`;
      }).join(' ➔ ') || '<span style="font-size:0.7rem; color:var(--text-muted); font-style:italic;">None</span>');

      // Level Hops Map
      const levelsObj = step.levels || {};
      const levelCells = Object.entries(levelsObj).map(([id, lvl]) => {
        return `<div class="indegree-cell"><span>${id}</span><strong>Lvl ${lvl}</strong></div>`;
      }).join('');
      const levelBlock = this.createDSBlock('Prerequisite Hop Distance', `<div class="indegree-grid">${levelCells}</div>`);

      this.dsContainer.appendChild(queueBlock);
      this.dsContainer.appendChild(visitedBlock);
      this.dsContainer.appendChild(levelBlock);
    } else if (this.currentMode === 'dfs') {
      // DFS Call Stack
      const stackBlock = this.createDSBlock('Call Stack (Active Recursion)', (step.callStack || []).map(id => {
        return `<span class="ds-chip chip-active">${id}</span>`;
      }).join(' ➔ ') || '<span style="font-size:0.7rem; color:var(--text-muted); font-style:italic;">Stack empty</span>');

      // Indented Tree Output
      const treeLines = (step.treeOutput || []).map(line => `<div>${line}</div>`).join('');
      const treeBlock = this.createDSBlock('Exploration Tree & Depth', `<div style="font-family:var(--font-mono); font-size:0.7rem; color:var(--text-primary); line-height:1.5;">${treeLines || 'Tree initialized'}</div>`);

      this.dsContainer.appendChild(stackBlock);
      this.dsContainer.appendChild(treeBlock);
    } else if (this.currentMode === 'cycle') {
      // Active Path
      const stackBlock = this.createDSBlock('Active Search Path', (step.callStack || []).map(id => {
        return `<span class="ds-chip chip-active">${id}</span>`;
      }).join(' ➔ ') || '<span style="font-size:0.7rem; color:var(--text-muted); font-style:italic;">Path empty</span>');

      // Cycle Paths
      const cycles = step.cyclePaths || [];
      const cycleBlocks = cycles.map(path => {
        return `<div style="color:#F87171; font-family:var(--font-mono); font-size:0.75rem; margin-top:4px;">⚠️ ${path.join(' ➔ ')}</div>`;
      }).join('') || '<span style="font-size:0.7rem; color:var(--color-emerald);">No cycles found so far</span>';
      const cycleBlock = this.createDSBlock('Detected Cycle Loops', cycleBlocks);

      this.dsContainer.appendChild(stackBlock);
      this.dsContainer.appendChild(cycleBlock);
    }
  }

  createDSBlock(title, contentHTML) {
    const block = document.createElement('div');
    block.className = 'ds-block';
    block.innerHTML = `
      <div class="ds-title">${title}</div>
      <div class="ds-items-container">${contentHTML}</div>
    `;
    return block;
  }

  togglePlayback() {
    if (this.isPlaying) {
      this.pausePlayback();
    } else {
      this.startPlayback();
    }
  }

  startPlayback() {
    if (this.currentStepIndex >= this.steps.length - 1) {
      this.currentStepIndex = 0;
    }
    this.isPlaying = true;
    if (this.btnStepPlay) {
      this.btnStepPlay.innerHTML = '⏸';
      this.btnStepPlay.title = 'Pause';
    }
    this.playbackInterval = setInterval(() => {
      if (this.currentStepIndex < this.steps.length - 1) {
        this.jumpToStep(this.currentStepIndex + 1);
      } else {
        this.pausePlayback();
      }
    }, this.playbackSpeed);
  }

  pausePlayback() {
    this.isPlaying = false;
    if (this.playbackInterval) {
      clearInterval(this.playbackInterval);
      this.playbackInterval = null;
    }
    if (this.btnStepPlay) {
      this.btnStepPlay.innerHTML = '▶';
      this.btnStepPlay.title = 'Play';
    }
  }

  runSemesterPlanner() {
    const maxCredits = Number(this.plannerCreditsInput?.value) || 12;
    const maxCourses = Number(this.plannerCoursesInput?.value) || 3;

    const plan = SemesterPlanner.generatePlan(this.graph, {
      maxCredits,
      maxCourses
    });

    this.latestPlan = plan;
    this.renderSemesterPlanView(plan);
  }

  renderSemesterPlanView(plan) {
    if (!this.semesterResultsContainer) return;
    this.semesterResultsContainer.innerHTML = '';

    // Cycle Alert
    if (plan.cycleInfo && this.cycleAlertBanner) {
      this.cycleAlertBanner.style.display = 'flex';
      const loopTexts = plan.cycleInfo.cyclePaths.map(p => p.join(' ➔ ')).join(' | ');
      this.cycleAlertBanner.innerHTML = `
        <h4>⚠️ Cyclic Prerequisite Error Detected</h4>
        <p>A complete prerequisite order cannot be generated because the prerequisite graph contains a cycle: [${loopTexts}].</p>
        <p style="font-size:0.68rem; color:#FECACA; margin-top:2px;">No course trapped in a mutual cycle can ever be scheduled because its prerequisites can never be fulfilled.</p>
      `;
    } else if (this.cycleAlertBanner) {
      this.cycleAlertBanner.style.display = 'none';
    }

    if (plan.semesters.length === 0 && (!plan.unscheduled || plan.unscheduled.length === 0)) {
      this.semesterResultsContainer.innerHTML = '<div style="color:var(--text-muted); font-size:0.8rem; padding:1rem; text-align:center;">No courses to plan.</div>';
      return;
    }

    // Render each semester card
    const cardsWrapper = document.createElement('div');
    cardsWrapper.className = 'semester-cards-container';

    plan.semesters.forEach(sem => {
      const card = document.createElement('div');
      card.className = 'semester-card';

      const header = document.createElement('div');
      header.className = 'semester-card-header';
      header.innerHTML = `
        <span class="semester-title">${sem.name}</span>
        <span class="semester-capacity-badge">${sem.courses.length}/${sem.maxCourses} courses • ${sem.totalCredits}/${sem.maxCredits} credits</span>
      `;

      const body = document.createElement('div');
      body.className = 'semester-card-body';

      sem.decisions.forEach(item => {
        if (item.status !== 'SCHEDULED') return;
        const row = document.createElement('div');
        row.className = 'semester-course-row';
        row.innerHTML = `
          <div class="semester-course-top">
            <span class="course-code-bold">${item.course.id} — ${item.course.name}</span>
            <span class="tag tag-ready">${item.course.credits} cr</span>
          </div>
          <div class="course-why-eligible">${item.explanation}</div>
        `;
        body.appendChild(row);
      });

      card.appendChild(header);
      card.appendChild(body);
      cardsWrapper.appendChild(card);
    });

    // Unscheduled Blocked Courses Card
    if (plan.unscheduled && plan.unscheduled.length > 0) {
      const unscheduledCard = document.createElement('div');
      unscheduledCard.className = 'semester-card';
      unscheduledCard.style.borderColor = 'rgba(239, 68, 68, 0.4)';

      const header = document.createElement('div');
      header.className = 'semester-card-header';
      header.style.background = 'rgba(239, 68, 68, 0.15)';
      header.innerHTML = `
        <span class="semester-title" style="color:#F87171;">⚠️ Unscheduled Courses (${plan.unscheduled.length})</span>
        <span class="semester-capacity-badge" style="color:#FECACA;">Prerequisite / Cycle Blockers</span>
      `;

      const body = document.createElement('div');
      body.className = 'semester-card-body';

      plan.unscheduled.forEach(item => {
        const row = document.createElement('div');
        row.className = 'semester-course-row';
        row.style.borderLeftColor = '#EF4444';
        row.innerHTML = `
          <div class="semester-course-top">
            <span class="course-code-bold" style="color:#FCA5A5;">${item.course.id} — ${item.course.name}</span>
            <span class="tag tag-cycle">${item.course.credits} cr</span>
          </div>
          <div class="course-why-eligible" style="color:#FECACA;">${item.reason}</div>
        `;
        body.appendChild(row);
      });

      unscheduledCard.appendChild(header);
      unscheduledCard.appendChild(body);
      cardsWrapper.appendChild(unscheduledCard);
    }

    this.semesterResultsContainer.appendChild(cardsWrapper);
  }

  exportPlanAsMarkdown() {
    if (!this.latestPlan) {
      this.runSemesterPlanner();
    }
    const plan = this.latestPlan;
    if (!plan) return;

    let md = `# University Course Prerequisite & Semester Plan\n\n`;
    md += `**Generated on**: ${new Date().toLocaleString()}\n`;
    md += `**Constraint Profile**: Max ${this.plannerMaxCourses} courses / semester, Max ${this.plannerMaxCredits} credits / semester\n\n`;

    if (plan.cycleInfo) {
      md += `> [!CAUTION]\n`;
      md += `> **Prerequisite Cycle Detected**: A complete schedule could not be created because of circular dependencies:\n`;
      plan.cycleInfo.cyclePaths.forEach(p => {
        md += `> - ${p.join(' → ')}\n`;
      });
      md += `\n`;
    }

    plan.semesters.forEach(sem => {
      md += `## ${sem.name} (${sem.totalCredits} credits, ${sem.courses.length} courses)\n\n`;
      sem.decisions.forEach(d => {
        if (d.status === 'SCHEDULED') {
          md += `* **${d.course.id}**: ${d.course.name} (${d.course.credits} cr)\n`;
          md += `  * *Eligibility*: ${d.explanation}\n`;
        }
      });
      md += `\n`;
    });

    if (plan.unscheduled.length > 0) {
      md += `## Unscheduled Courses\n\n`;
      plan.unscheduled.forEach(u => {
        md += `* **${u.course.id}**: ${u.course.name} (${u.course.credits} cr)\n`;
        md += `  * *Reason*: ${u.reason}\n`;
      });
      md += `\n`;
    }

    // Copy to clipboard
    navigator.clipboard.writeText(md).then(() => {
      this.showToast('Semester plan copied to clipboard in Markdown format!', 'success');
    }).catch(() => {
      this.showToast('Plan formatted. Ready to export.', 'info');
    });
  }

  renderSidebarCourseList(filterText = '') {
    if (!this.courseCardList) return;
    this.courseCardList.innerHTML = '';

    const courses = this.graph.getAllCourses();
    if (this.totalCoursesCount) this.totalCoursesCount.textContent = courses.length;

    const query = filterText.toLowerCase().trim();
    const inDegrees = this.graph.getInDegrees();

    const filtered = courses.filter(c => {
      return c.id.toLowerCase().includes(query) || c.name.toLowerCase().includes(query);
    });

    filtered.forEach(course => {
      const inDeg = inDegrees.get(course.id) || 0;
      const card = document.createElement('div');
      card.className = `course-item ${this.renderer.selectedNodeId === course.id ? 'selected' : ''}`;
      card.id = `sidebar-course-${course.id}`;

      const prereqsHTML = course.prerequisites.length > 0
        ? course.prerequisites.map(p => `<span class="prereq-pill">${p}</span>`).join('')
        : '<span style="font-size:0.65rem; color:var(--text-muted);">None (Root)</span>';

      card.innerHTML = `
        <div class="course-item-header">
          <span class="course-item-code">${course.id}</span>
          <div class="course-item-badges">
            <span class="tag ${inDeg === 0 ? 'tag-ready' : ''}">${inDeg === 0 ? 'READY' : `${inDeg} in`}</span>
            <span class="tag tag-${course.priority}">${course.priority.toUpperCase()}</span>
          </div>
        </div>
        <div class="course-item-name" title="${course.name}">${course.name}</div>
        <div class="course-item-prereqs">
          <span style="font-size:0.65rem;">Req:</span> ${prereqsHTML}
        </div>
      `;

      card.addEventListener('click', () => {
        this.renderer.selectNode(course.id);
        this.handleNodeClick(course);
      });

      this.courseCardList.appendChild(card);
    });
  }

  handleNodeClick(course) {
    this.selectedStartNode = course.id;
    // Highlight in sidebar
    document.querySelectorAll('.course-item').forEach(el => el.classList.remove('selected'));
    const sidebarEl = document.getElementById(`sidebar-course-${course.id}`);
    if (sidebarEl) {
      sidebarEl.classList.add('selected');
      sidebarEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    if (this.currentMode === 'bfs' || this.currentMode === 'dfs') {
      this.showToast(`Selected "${course.id}" as start course for ${this.currentMode.toUpperCase()}`, 'info');
      this.runCurrentModeAlgorithm();
    }
  }

  openCourseModal(editCourse = null) {
    if (!this.courseModal) return;
    this.editingCourseId = editCourse ? editCourse.id : null;

    if (this.modalTitle) {
      this.modalTitle.textContent = editCourse ? `Edit Course ${editCourse.id}` : 'Add New University Course';
    }

    if (this.inputCourseId) {
      this.inputCourseId.value = editCourse ? editCourse.id : '';
      this.inputCourseId.disabled = Boolean(editCourse);
    }
    if (this.inputCourseName) {
      this.inputCourseName.value = editCourse ? editCourse.name : '';
    }
    if (this.inputCourseCredits) {
      this.inputCourseCredits.value = editCourse ? editCourse.credits : 3;
    }
    if (this.selectCoursePriority) {
      this.selectCoursePriority.value = editCourse ? editCourse.priority : 'medium';
    }
    if (this.btnDeleteCourse) {
      this.btnDeleteCourse.style.display = editCourse ? 'inline-flex' : 'none';
    }

    // Populate prerequisite checkboxes
    if (this.prereqCheckboxContainer) {
      this.prereqCheckboxContainer.innerHTML = '';
      const allCourses = this.graph.getAllCourses();
      const currentId = editCourse ? editCourse.id : null;

      allCourses.forEach(c => {
        if (c.id === currentId) return; // Prevent self-loop selection

        const label = document.createElement('label');
        label.className = 'checkbox-label';
        const isChecked = editCourse ? editCourse.prerequisites.includes(c.id) : false;

        label.innerHTML = `
          <input type="checkbox" value="${c.id}" ${isChecked ? 'checked' : ''} />
          <span><strong>${c.id}</strong> (${c.name})</span>
        `;
        this.prereqCheckboxContainer.appendChild(label);
      });
    }

    this.courseModal.classList.add('open');
  }

  closeCourseModal() {
    if (this.courseModal) this.courseModal.classList.remove('open');
  }

  saveCourseFromModal() {
    const id = this.inputCourseId?.value.trim().toUpperCase();
    const name = this.inputCourseName?.value.trim();
    const credits = Number(this.inputCourseCredits?.value) || 3;
    const priority = this.selectCoursePriority?.value || 'medium';

    if (!id || !name) {
      this.showToast('Please enter both Course ID and Course Name.', 'error');
      return;
    }

    // Collect selected prerequisites
    const selectedPrereqs = [];
    const checkboxes = this.prereqCheckboxContainer?.querySelectorAll('input[type="checkbox"]:checked');
    checkboxes?.forEach(cb => selectedPrereqs.push(cb.value));

    const course = new Course({
      id,
      name,
      credits,
      priority,
      prerequisites: selectedPrereqs
    });

    this.graph.addCourse(course);
    this.closeCourseModal();

    this.renderer.setGraph(this.graph);
    this.renderSidebarCourseList();
    this.showToast(`Saved course "${id}" with ${selectedPrereqs.length} prerequisite(s).`, 'success');
    this.runCurrentModeAlgorithm();
  }

  deleteCourseFromModal() {
    if (!this.editingCourseId) return;
    const id = this.editingCourseId;
    this.graph.removeCourse(id);
    this.closeCourseModal();

    this.renderer.setGraph(this.graph);
    this.renderSidebarCourseList();
    this.showToast(`Deleted course "${id}" from graph.`, 'info');
    this.runCurrentModeAlgorithm();
  }

  openGraphMatrixModal() {
    if (!this.matrixModal || !this.matrixContent) return;

    const adj = this.graph.getAdjacencyList();
    const prereqs = this.graph.getPrerequisitesList();
    const inDegs = this.graph.getInDegrees();
    const outDegs = this.graph.getOutDegrees();
    const courses = this.graph.getAllCourses();

    let html = `
      <div style="display:flex; flex-direction:column; gap:1.25rem;">
        <div>
          <h4 style="color:var(--color-cyan); font-size:0.85rem; margin-bottom:0.5rem;">Prerequisite Graph Formal Model</h4>
          <p style="font-size:0.75rem; color:var(--text-secondary); line-height:1.4;">
            Vertices: <strong>${courses.length}</strong> courses | Directed Edges: <strong>${this.graph.edgeCount}</strong> prerequisite dependencies.<br>
            Directed Edge <code>u → v</code> means <em>Course u must be completed BEFORE Course v</em>.
          </p>
        </div>

        <div>
          <h4 style="color:var(--text-primary); font-size:0.8rem; margin-bottom:0.4rem;">Forward Adjacency List (Unlocks)</h4>
          <div style="background:rgba(0,0,0,0.3); border:1px solid var(--border-subtle); border-radius:6px; padding:0.6rem; font-family:var(--font-mono); font-size:0.75rem; max-height:160px; overflow-y:auto;">
    `;

    for (const [u, dependents] of adj.entries()) {
      const depStr = dependents.length > 0 ? dependents.join(', ') : '∅ (Terminal course)';
      html += `<div><strong>${u}</strong> ➔ [${depStr}]</div>`;
    }

    html += `
          </div>
        </div>

        <div>
          <h4 style="color:var(--text-primary); font-size:0.8rem; margin-bottom:0.4rem;">Reverse Adjacency List (Requires)</h4>
          <div style="background:rgba(0,0,0,0.3); border:1px solid var(--border-subtle); border-radius:6px; padding:0.6rem; font-family:var(--font-mono); font-size:0.75rem; max-height:160px; overflow-y:auto;">
    `;

    for (const [v, prereqArr] of prereqs.entries()) {
      const prereqStr = prereqArr.length > 0 ? prereqArr.join(', ') : '∅ (Foundational/Root)';
      html += `<div><strong>${v}</strong> ⬅ [${prereqStr}]</div>`;
    }

    html += `
          </div>
        </div>

        <div>
          <h4 style="color:var(--text-primary); font-size:0.8rem; margin-bottom:0.4rem;">In-Degree and Out-Degree Table</h4>
          <div style="overflow-x:auto;">
            <table style="width:100%; border-collapse:collapse; font-size:0.75rem; font-family:var(--font-mono);">
              <thead>
                <tr style="border-bottom:1px solid var(--border-subtle); color:var(--text-secondary); text-align:left;">
                  <th style="padding:4px 8px;">Course</th>
                  <th style="padding:4px 8px;">Credits</th>
                  <th style="padding:4px 8px;">In-Degree (Prereqs)</th>
                  <th style="padding:4px 8px;">Out-Degree (Dependents)</th>
                  <th style="padding:4px 8px;">Priority</th>
                </tr>
              </thead>
              <tbody>
    `;

    courses.forEach(c => {
      const inD = inDegs.get(c.id) || 0;
      const outD = outDegs.get(c.id) || 0;
      html += `
        <tr style="border-bottom:1px solid rgba(255,255,255,0.04);">
          <td style="padding:4px 8px; font-weight:700; color:var(--color-cyan);">${c.id}</td>
          <td style="padding:4px 8px;">${c.credits}</td>
          <td style="padding:4px 8px; color:${inD === 0 ? 'var(--color-emerald)' : 'inherit'};">${inD} ${inD === 0 ? '✓ Ready' : ''}</td>
          <td style="padding:4px 8px;">${outD}</td>
          <td style="padding:4px 8px;">${c.priority.toUpperCase()}</td>
        </tr>
      `;
    });

    html += `
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    this.matrixContent.innerHTML = html;
    this.matrixModal.classList.add('open');
  }

  closeGraphMatrixModal() {
    if (this.matrixModal) this.matrixModal.classList.remove('open');
  }

  showToast(message, type = 'info') {
    if (!this.toastContainer) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '❌';

    toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
    this.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 250);
    }, 3500);
  }
}

// Bootstrap on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
});
