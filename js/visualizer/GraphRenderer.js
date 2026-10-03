/**
 * Interactive SVG Directed Graph Visualizer
 * 
 * Features:
 * - Sugiyama-style topological layered DAG layout (Level 0 on left -> higher levels on right)
 * - Draggable nodes with real-time curve edge updating
 * - Pan and zoom controls
 * - High-contrast visual styling for states: Default, Zero-In-Degree (Ready), Active/Visiting, Visited, Trapped in Cycle
 * - Animated arrow edges with cycle highlighting
 * - Node click handlers for inspection and algorithm targeting
 */

export class GraphRenderer {
  /**
   * @param {HTMLElement} containerElement 
   * @param {Object} options
   */
  constructor(containerElement, options = {}) {
    this.container = containerElement;
    this.options = {
      width: 1200,
      height: 700,
      nodeWidth: 150,
      nodeHeight: 74,
      onNodeClick: options.onNodeClick || null,
      ...options
    };

    this.graph = null;
    this.nodePositions = new Map(); // id -> { x, y }
    this.nodeStates = new Map();    // id -> { status: 'default'|'ready'|'active'|'visited'|'cycle'|'dimmed', badge: '' }
    this.edgeStates = new Map();    // `${from}->${to}` -> { status: 'default'|'active'|'cycle'|'dimmed' }
    
    // Zoom and pan state
    this.zoom = 1;
    this.panX = 40;
    this.panY = 40;
    this.isPanning = false;
    this.panStartX = 0;
    this.panStartY = 0;

    // Node dragging state
    this.draggingNode = null;
    this.dragOffsetX = 0;
    this.dragOffsetY = 0;

    this.selectedNodeId = null;

    this.initSVG();
    this.bindEvents();
  }

  initSVG() {
    this.container.innerHTML = '';
    this.container.style.position = 'relative';
    this.container.style.overflow = 'hidden';

    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svg.setAttribute('width', '100%');
    this.svg.setAttribute('height', '100%');
    this.svg.setAttribute('class', 'graph-svg-canvas');

    // SVG Defs: Arrowhead markers and drop shadows
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    defs.innerHTML = `
      <marker id="arrow-default" viewBox="0 0 10 10" refX="28" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#64748B" />
      </marker>
      <marker id="arrow-active" viewBox="0 0 10 10" refX="28" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
        <path d="M 0 1 L 10 5 L 0 9 z" fill="#06B6D4" />
      </marker>
      <marker id="arrow-cycle" viewBox="0 0 10 10" refX="28" refY="5" markerWidth="9" markerHeight="9" orient="auto-start-reverse">
        <path d="M 0 1 L 10 5 L 0 9 z" fill="#EF4444" />
      </marker>
      <marker id="arrow-success" viewBox="0 0 10 10" refX="28" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#10B981" />
      </marker>
      <filter id="glow-active" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="6" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
      <filter id="glow-cycle" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="8" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    `;
    this.svg.appendChild(defs);

    // Main viewport transform group
    this.viewport = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    this.viewport.setAttribute('class', 'graph-viewport');
    this.svg.appendChild(this.viewport);

    // Layer groups for proper z-indexing: edges below nodes
    this.edgeLayer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    this.edgeLayer.setAttribute('class', 'edge-layer');
    this.viewport.appendChild(this.edgeLayer);

    this.nodeLayer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    this.nodeLayer.setAttribute('class', 'node-layer');
    this.viewport.appendChild(this.nodeLayer);

    this.container.appendChild(this.svg);
    this.updateTransform();
  }

  bindEvents() {
    // Pan on canvas drag
    this.svg.addEventListener('mousedown', (e) => {
      if (e.target.closest('.graph-node')) return; // Ignore if clicking a node
      this.isPanning = true;
      this.panStartX = e.clientX - this.panX;
      this.panStartY = e.clientY - this.panY;
      this.container.style.cursor = 'grabbing';
    });

    window.addEventListener('mousemove', (e) => {
      if (this.isPanning) {
        this.panX = e.clientX - this.panStartX;
        this.panY = e.clientY - this.panStartY;
        this.updateTransform();
      } else if (this.draggingNode) {
        const svgRect = this.svg.getBoundingClientRect();
        const mouseX = (e.clientX - svgRect.left - this.panX) / this.zoom;
        const mouseY = (e.clientY - svgRect.top - this.panY) / this.zoom;

        const newX = mouseX - this.dragOffsetX;
        const newY = mouseY - this.dragOffsetY;

        this.nodePositions.set(this.draggingNode, { x: newX, y: newY });
        this.renderGraphEdges();
        this.updateNodePositionInDOM(this.draggingNode, newX, newY);
      }
    });

    window.addEventListener('mouseup', () => {
      if (this.isPanning) {
        this.isPanning = false;
        this.container.style.cursor = 'default';
      }
      if (this.draggingNode) {
        this.draggingNode = null;
      }
    });

    // Zoom on wheel
    this.container.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
      const newZoom = Math.min(Math.max(this.zoom * zoomFactor, 0.25), 3.0);

      // Zoom towards mouse pointer
      const rect = this.container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      this.panX = mouseX - (mouseX - this.panX) * (newZoom / this.zoom);
      this.panY = mouseY - (mouseY - this.panY) * (newZoom / this.zoom);
      this.zoom = newZoom;

      this.updateTransform();
    }, { passive: false });
  }

  updateTransform() {
    this.viewport.setAttribute('transform', `translate(${this.panX}, ${this.panY}) scale(${this.zoom})`);
  }

  /**
   * Sets the graph and calculates initial layered topological positions.
   * @param {import('../models/Graph.js').PrerequisiteGraph} graph 
   */
  setGraph(graph) {
    this.graph = graph;
    this.calculateHierarchicalLayout();
    this.render();
  }

  /**
   * Calculates Sugiyama-style rank levels for DAG visualization.
   * Places root courses (0 prereqs) at Level 0 (left), and dependent courses in successive columns.
   */
  calculateHierarchicalLayout() {
    if (!this.graph || this.graph.size === 0) return;

    const courses = this.graph.getAllCourses();
    const prereqList = this.graph.getPrerequisitesList();
    const adj = this.graph.getAdjacencyList();

    // Compute topological ranks (longest prerequisite chain distance)
    const ranks = new Map();

    const getRank = (courseId, visitedInPath = new Set()) => {
      if (ranks.has(courseId)) return ranks.get(courseId);
      if (visitedInPath.has(courseId)) return 0; // Handle cycle fallback

      visitedInPath.add(courseId);
      const prereqs = prereqList.get(courseId) || [];
      if (prereqs.length === 0) {
        ranks.set(courseId, 0);
        return 0;
      }

      let maxRank = 0;
      for (const pId of prereqs) {
        maxRank = Math.max(maxRank, getRank(pId, new Set(visitedInPath)) + 1);
      }
      ranks.set(courseId, maxRank);
      return maxRank;
    };

    for (const course of courses) {
      getRank(course.id);
    }

    // Group courses by rank
    const columns = new Map();
    for (const [id, rank] of ranks.entries()) {
      if (!columns.has(rank)) columns.set(rank, []);
      columns.get(rank).push(id);
    }

    // Coordinates layout parameters
    const columnSpacing = 240;
    const rowSpacing = 115;
    const startX = 60;
    const startY = 60;

    this.nodePositions.clear();
    const sortedRanks = Array.from(columns.keys()).sort((a, b) => a - b);

    for (const rank of sortedRanks) {
      const colNodes = columns.get(rank);
      const colX = startX + rank * columnSpacing;
      const totalColHeight = colNodes.length * rowSpacing;
      // Center column vertically
      const offsetTop = Math.max(startY, (startY + 40) - (colNodes.length * 15));

      colNodes.forEach((nodeId, idx) => {
        this.nodePositions.set(nodeId, {
          x: colX,
          y: offsetTop + idx * rowSpacing
        });
      });
    }

    // Center viewport initially
    this.fitToScreen();
  }

  fitToScreen() {
    if (!this.nodePositions.size) return;

    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    for (const pos of this.nodePositions.values()) {
      minX = Math.min(minX, pos.x);
      maxX = Math.max(maxX, pos.x + this.options.nodeWidth);
      minY = Math.min(minY, pos.y);
      maxY = Math.max(maxY, pos.y + this.options.nodeHeight);
    }

    const padding = 60;
    const graphWidth = (maxX - minX) + padding * 2;
    const graphHeight = (maxY - minY) + padding * 2;

    const containerWidth = this.container.clientWidth || 900;
    const containerHeight = this.container.clientHeight || 600;

    const scaleX = containerWidth / graphWidth;
    const scaleY = containerHeight / graphHeight;
    this.zoom = Math.min(Math.max(Math.min(scaleX, scaleY), 0.5), 1.2);

    this.panX = (containerWidth - (maxX - minX) * this.zoom) / 2 - minX * this.zoom;
    this.panY = (containerHeight - (maxY - minY) * this.zoom) / 2 - minY * this.zoom;

    this.updateTransform();
  }

  render() {
    this.renderGraphEdges();
    this.renderGraphNodes();
  }

  renderGraphEdges() {
    this.edgeLayer.innerHTML = '';
    if (!this.graph) return;

    const adj = this.graph.getAdjacencyList();

    for (const [fromId, dependents] of adj.entries()) {
      const fromPos = this.nodePositions.get(fromId);
      if (!fromPos) continue;

      for (const toId of dependents) {
        const toPos = this.nodePositions.get(toId);
        if (!toPos) continue;

        const edgeKey = `${fromId}->${toId}`;
        const edgeState = this.edgeStates.get(edgeKey) || { status: 'default' };

        // Connect from right-center of prerequisite to left-center of target
        const startX = fromPos.x + this.options.nodeWidth;
        const startY = fromPos.y + this.options.nodeHeight / 2;
        const endX = toPos.x;
        const endY = toPos.y + this.options.nodeHeight / 2;

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        
        // Cubic bezier smooth curve
        const dx = Math.abs(endX - startX) * 0.5;
        const d = `M ${startX} ${startY} C ${startX + dx} ${startY}, ${endX - dx} ${endY}, ${endX} ${endY}`;

        path.setAttribute('d', d);
        path.setAttribute('id', `edge-${fromId}-${toId}`);
        path.setAttribute('class', `graph-edge edge-status-${edgeState.status}`);

        let marker = 'url(#arrow-default)';
        let strokeColor = '#475569';
        let strokeWidth = '2';

        if (edgeState.status === 'active') {
          marker = 'url(#arrow-active)';
          strokeColor = '#06B6D4';
          strokeWidth = '3.5';
          path.classList.add('edge-pulse');
        } else if (edgeState.status === 'cycle') {
          marker = 'url(#arrow-cycle)';
          strokeColor = '#EF4444';
          strokeWidth = '3.5';
          path.classList.add('edge-cycle-flow');
        } else if (edgeState.status === 'visited') {
          marker = 'url(#arrow-success)';
          strokeColor = '#10B981';
          strokeWidth = '2.5';
        } else if (edgeState.status === 'dimmed') {
          strokeColor = '#334155';
          strokeWidth = '1.5';
          path.style.opacity = '0.35';
        }

        path.setAttribute('stroke', strokeColor);
        path.setAttribute('stroke-width', strokeWidth);
        path.setAttribute('fill', 'none');
        path.setAttribute('marker-end', marker);

        this.edgeLayer.appendChild(path);
      }
    }
  }

  renderGraphNodes() {
    this.nodeLayer.innerHTML = '';
    if (!this.graph) return;

    const courses = this.graph.getAllCourses();
    const inDegrees = this.graph.getInDegrees();

    for (const course of courses) {
      const pos = this.nodePositions.get(course.id) || { x: 50, y: 50 };
      const inDeg = inDegrees.get(course.id) || 0;
      const nodeState = this.nodeStates.get(course.id) || {
        status: inDeg === 0 ? 'ready' : 'default',
        badge: ''
      };

      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('class', `graph-node node-${nodeState.status} ${this.selectedNodeId === course.id ? 'is-selected' : ''}`);
      g.setAttribute('id', `node-${course.id}`);
      g.setAttribute('transform', `translate(${pos.x}, ${pos.y})`);
      g.style.cursor = 'grab';

      // Background Card
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('width', this.options.nodeWidth);
      rect.setAttribute('height', this.options.nodeHeight);
      rect.setAttribute('rx', '10');
      rect.setAttribute('class', 'node-bg');

      // Priority indicator color bar (left stripe)
      const priorityBar = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      priorityBar.setAttribute('x', '0');
      priorityBar.setAttribute('y', '0');
      priorityBar.setAttribute('width', '5');
      priorityBar.setAttribute('height', this.options.nodeHeight);
      priorityBar.setAttribute('rx', '2');
      priorityBar.setAttribute('class', `priority-bar priority-${course.priority}`);

      // Course ID Text
      const textId = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      textId.setAttribute('x', '14');
      textId.setAttribute('y', '26');
      textId.setAttribute('class', 'node-id');
      textId.textContent = course.id;

      // In-Degree / Ready Badge
      const badgeG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      badgeG.setAttribute('transform', `translate(${this.options.nodeWidth - 42}, 11)`);
      
      const badgeRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      badgeRect.setAttribute('width', '34');
      badgeRect.setAttribute('height', '18');
      badgeRect.setAttribute('rx', '9');
      badgeRect.setAttribute('class', inDeg === 0 ? 'badge-ready' : 'badge-indegree');

      const badgeText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      badgeText.setAttribute('x', '17');
      badgeText.setAttribute('y', '13');
      badgeText.setAttribute('text-anchor', 'middle');
      badgeText.setAttribute('class', 'badge-text');
      badgeText.textContent = inDeg === 0 ? '0 in' : `${inDeg} in`;

      badgeG.appendChild(badgeRect);
      badgeG.appendChild(badgeText);

      // Course Name (truncated if long)
      const textName = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      textName.setAttribute('x', '14');
      textName.setAttribute('y', '46');
      textName.setAttribute('class', 'node-name');
      const maxLen = 17;
      textName.textContent = course.name.length > maxLen
        ? course.name.slice(0, maxLen - 1) + '…'
        : course.name;

      // Meta: Credits & Category
      const textMeta = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      textMeta.setAttribute('x', '14');
      textMeta.setAttribute('y', '63');
      textMeta.setAttribute('class', 'node-meta');
      textMeta.textContent = `${course.credits} cr • ${course.priority.toUpperCase()}`;

      // Assemble node
      g.appendChild(rect);
      g.appendChild(priorityBar);
      g.appendChild(textId);
      g.appendChild(badgeG);
      g.appendChild(textName);
      g.appendChild(textMeta);

      // Node Drag interaction
      g.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return; // Only left click
        this.draggingNode = course.id;
        const svgRect = this.svg.getBoundingClientRect();
        const mouseX = (e.clientX - svgRect.left - this.panX) / this.zoom;
        const mouseY = (e.clientY - svgRect.top - this.panY) / this.zoom;
        const curPos = this.nodePositions.get(course.id);
        this.dragOffsetX = mouseX - curPos.x;
        this.dragOffsetY = mouseY - curPos.y;
        g.style.cursor = 'grabbing';
        e.stopPropagation();
      });

      // Node Click handler
      g.addEventListener('click', (e) => {
        this.selectNode(course.id);
        if (this.options.onNodeClick) {
          this.options.onNodeClick(course);
        }
        e.stopPropagation();
      });

      this.nodeLayer.appendChild(g);
    }
  }

  updateNodePositionInDOM(nodeId, x, y) {
    const nodeEl = document.getElementById(`node-${nodeId}`);
    if (nodeEl) {
      nodeEl.setAttribute('transform', `translate(${x}, ${y})`);
    }
  }

  selectNode(nodeId) {
    this.selectedNodeId = nodeId;
    const allNodes = this.nodeLayer.querySelectorAll('.graph-node');
    allNodes.forEach(el => el.classList.remove('is-selected'));
    const selectedEl = document.getElementById(`node-${nodeId}`);
    if (selectedEl) {
      selectedEl.classList.add('is-selected');
    }
  }

  /**
   * Applies algorithm step highlight states to nodes and edges.
   * @param {Object} stepState 
   */
  applyStepState(stepState) {
    this.nodeStates.clear();
    this.edgeStates.clear();

    const {
      type,
      currentNode,
      currentEdge,
      activeNodes = [],
      highlightEdges = [],
      inDegrees = {},
      queue = [],
      order = [],
      cycleCourses = [],
      cyclePath = []
    } = stepState;

    const allCourses = this.graph.getAllCourses();

    for (const course of allCourses) {
      const id = course.id;
      const deg = inDegrees[id] !== undefined ? inDegrees[id] : (this.graph.getInDegrees().get(id) || 0);

      // Determine node status
      if (cycleCourses.includes(id) || cyclePath.includes(id)) {
        this.nodeStates.set(id, { status: 'cycle' });
      } else if (id === currentNode) {
        this.nodeStates.set(id, { status: 'active' });
      } else if (activeNodes.includes(id)) {
        this.nodeStates.set(id, { status: 'active' });
      } else if (order.includes(id)) {
        this.nodeStates.set(id, { status: 'visited' });
      } else if (queue.includes(id) || deg === 0) {
        this.nodeStates.set(id, { status: 'ready' });
      } else {
        this.nodeStates.set(id, { status: 'default' });
      }
    }

    // Edges
    if (highlightEdges && highlightEdges.length > 0) {
      for (const edge of highlightEdges) {
        const key = `${edge.from}->${edge.to}`;
        this.edgeStates.set(key, {
          status: edge.isCycle ? 'cycle' : 'active'
        });
      }
    }

    if (currentEdge) {
      const key = `${currentEdge.from}->${currentEdge.to}`;
      this.edgeStates.set(key, {
        status: currentEdge.isCycle ? 'cycle' : 'active'
      });
    }

    this.render();
  }

  /**
   * Resets all visual states back to clean default graph view.
   */
  resetHighlights() {
    this.nodeStates.clear();
    this.edgeStates.clear();
    this.render();
  }
}
