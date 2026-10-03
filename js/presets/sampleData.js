/**
 * Pre-configured Demonstration Datasets
 * Includes:
 * 1. Standard CS Curriculum (DAG - as specified in prompt section 11)
 * 2. Cyclic Prerequisite Demonstration (Contains invalid loop for error testing)
 * 3. Extended 4-Year University Curriculum (Full multi-track degree)
 */

export const SAMPLE_DATASETS = {
  standard: {
    id: 'standard',
    name: 'CS Core Curriculum (Prompt Standard DAG)',
    description: 'Models standard computer science courses from Programming I up to Capstone, fully satisfying all prerequisite rules.',
    maxCredits: 12,
    maxCourses: 3,
    courses: [
      {
        id: 'CS101',
        name: 'Programming I',
        credits: 3,
        prerequisites: [],
        priority: 'high',
        category: 'core',
        description: 'Introduction to procedural programming, variables, control flow, functions, and memory basics.'
      },
      {
        id: 'CS102',
        name: 'Programming II',
        credits: 3,
        prerequisites: ['CS101'],
        priority: 'high',
        category: 'core',
        description: 'Object-oriented programming, classes, polymorphism, interfaces, and recursion.'
      },
      {
        id: 'MATH101',
        name: 'Discrete Mathematics',
        credits: 3,
        prerequisites: [],
        priority: 'medium',
        category: 'math',
        description: 'Logic, sets, relations, functions, graph theory, and mathematical induction.'
      },
      {
        id: 'CS201',
        name: 'Data Structures',
        credits: 4,
        prerequisites: ['CS102'],
        priority: 'high',
        category: 'core',
        description: 'Arrays, linked lists, stacks, queues, trees, heaps, hash tables, and asymptotic notation.'
      },
      {
        id: 'CS301',
        name: 'Algorithms',
        credits: 4,
        prerequisites: ['CS201'],
        priority: 'high',
        category: 'core',
        description: 'Divide and conquer, greedy strategies, dynamic programming, and graph algorithms.'
      },
      {
        id: 'CS302',
        name: 'Database Systems',
        credits: 3,
        prerequisites: ['CS201'],
        priority: 'medium',
        category: 'core',
        description: 'Relational data models, SQL, indexing, transactions, and normalization.'
      },
      {
        id: 'CS303',
        name: 'Operating Systems',
        credits: 4,
        prerequisites: ['CS201'],
        priority: 'medium',
        category: 'systems',
        description: 'Processes, threads, CPU scheduling, synchronization, virtual memory, and file systems.'
      },
      {
        id: 'CS305',
        name: 'Computer Networks',
        credits: 3,
        prerequisites: ['CS303'],
        priority: 'low',
        category: 'systems',
        description: 'OSI and TCP/IP models, routing protocols, transport layer, and network security.'
      },
      {
        id: 'CS401',
        name: 'Software Engineering',
        credits: 4,
        prerequisites: ['CS201', 'CS302'],
        priority: 'high',
        category: 'core',
        description: 'Agile methodologies, software architecture, testing, CI/CD, and system design.'
      },
      {
        id: 'CS405',
        name: 'Artificial Intelligence',
        credits: 3,
        prerequisites: ['CS301', 'MATH101'],
        priority: 'medium',
        category: 'elective',
        description: 'Search algorithms, heuristic evaluation, probabilistic reasoning, and machine learning.'
      },
      {
        id: 'CS499',
        name: 'Capstone Project',
        credits: 4,
        prerequisites: ['CS401', 'CS302'],
        priority: 'high',
        category: 'capstone',
        description: 'Comprehensive senior design project applying multi-semester concepts.'
      }
    ]
  },

  cyclic: {
    id: 'cyclic',
    name: 'Cyclic Prerequisite Trap (Cycle Demonstration)',
    description: 'Contains an intentional circular loop (CS101 → CS201 → CS301 → CS101) to test Kahn cycle detection and semester planning guardrails.',
    maxCredits: 12,
    maxCourses: 3,
    courses: [
      {
        id: 'CS101',
        name: 'Programming I',
        credits: 3,
        prerequisites: ['CS301'], // Cycle back-edge from Algorithms!
        priority: 'high',
        category: 'core',
        description: 'Trap node: Lists Algorithms as prerequisite, creating circular dependency.'
      },
      {
        id: 'CS201',
        name: 'Data Structures',
        credits: 4,
        prerequisites: ['CS101'],
        priority: 'high',
        category: 'core',
        description: 'Requires Programming I.'
      },
      {
        id: 'CS301',
        name: 'Algorithms',
        credits: 4,
        prerequisites: ['CS201'],
        priority: 'high',
        category: 'core',
        description: 'Requires Data Structures, and is required by Programming I (Cycle!).'
      },
      {
        id: 'CS302',
        name: 'Database Systems',
        credits: 3,
        prerequisites: ['CS201'],
        priority: 'medium',
        category: 'core',
        description: 'Blocked node: Cannot be scheduled because prerequisite Data Structures is trapped in cycle.'
      },
      {
        id: 'MATH101',
        name: 'Calculus I',
        credits: 4,
        prerequisites: [],
        priority: 'medium',
        category: 'math',
        description: 'Unaffected foundational course: Has 0 prerequisites and can be scheduled independently.'
      },
      {
        id: 'MATH102',
        name: 'Linear Algebra',
        credits: 3,
        prerequisites: ['MATH101'],
        priority: 'low',
        category: 'math',
        description: 'Unaffected downstream course: Depends solely on Calculus I.'
      }
    ]
  },

  extended: {
    id: 'extended',
    name: 'Comprehensive 4-Year Degree (16 Courses)',
    description: 'Full multi-track computer science program spanning foundational mathematics, systems, software engineering, and machine learning.',
    maxCredits: 16,
    maxCourses: 4,
    courses: [
      { id: 'CS101', name: 'Intro to Programming', credits: 3, prerequisites: [], priority: 'high', category: 'core' },
      { id: 'MATH101', name: 'Calculus I', credits: 4, prerequisites: [], priority: 'medium', category: 'math' },
      { id: 'ENG101', name: 'Technical Writing', credits: 3, prerequisites: [], priority: 'low', category: 'elective' },
      { id: 'CS102', name: 'Object-Oriented Programming', credits: 3, prerequisites: ['CS101'], priority: 'high', category: 'core' },
      { id: 'MATH102', name: 'Discrete Structures', credits: 3, prerequisites: ['MATH101'], priority: 'medium', category: 'math' },
      { id: 'CS201', name: 'Data Structures & Algorithms I', credits: 4, prerequisites: ['CS102'], priority: 'high', category: 'core' },
      { id: 'CS205', name: 'Computer Organization & Architecture', credits: 4, prerequisites: ['CS102'], priority: 'medium', category: 'systems' },
      { id: 'MATH201', name: 'Linear Algebra', credits: 3, prerequisites: ['MATH101'], priority: 'low', category: 'math' },
      { id: 'CS301', name: 'Advanced Algorithms', credits: 4, prerequisites: ['CS201', 'MATH102'], priority: 'high', category: 'core' },
      { id: 'CS303', name: 'Operating Systems', credits: 4, prerequisites: ['CS201', 'CS205'], priority: 'medium', category: 'systems' },
      { id: 'CS304', name: 'Database Management Systems', credits: 3, prerequisites: ['CS201'], priority: 'medium', category: 'core' },
      { id: 'CS310', name: 'Computer Networks', credits: 3, prerequisites: ['CS303'], priority: 'low', category: 'systems' },
      { id: 'CS401', name: 'Software Engineering Principles', credits: 4, prerequisites: ['CS201', 'CS304'], priority: 'high', category: 'core' },
      { id: 'CS420', name: 'Machine Learning & Data Mining', credits: 3, prerequisites: ['CS301', 'MATH201'], priority: 'medium', category: 'elective' },
      { id: 'CS430', name: 'Cloud Computing & Distributed Systems', credits: 3, prerequisites: ['CS303', 'CS310'], priority: 'medium', category: 'systems' },
      { id: 'CS499', name: 'Senior Capstone Project', credits: 4, prerequisites: ['CS401', 'CS304'], priority: 'high', category: 'capstone' }
    ]
  }
};
