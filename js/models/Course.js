/**
 * Course Data Model
 * Represents a single university course with its attributes and prerequisite links.
 */
export class Course {
  constructor({
    id,
    name,
    credits = 3,
    prerequisites = [],
    priority = 'medium', // 'high' | 'medium' | 'low'
    isCompleted = false,  // For courses already taken/waived
    description = '',
    category = 'core'     // 'core' | 'math' | 'systems' | 'elective' | 'capstone'
  }) {
    if (!id || typeof id !== 'string') {
      throw new Error('Course ID must be a non-empty string');
    }
    this.id = id.trim().toUpperCase();
    this.name = name ? name.trim() : this.id;
    this.credits = Number(credits) || 3;
    // Set of prerequisite course IDs (A must be completed before this course)
    this.prerequisites = Array.isArray(prerequisites)
      ? [...new Set(prerequisites.map(p => p.trim().toUpperCase()))]
      : [];
    this.priority = ['high', 'medium', 'low'].includes(priority) ? priority : 'medium';
    this.isCompleted = Boolean(isCompleted);
    this.description = description || '';
    this.category = category || 'core';
  }

  get priorityWeight() {
    switch (this.priority) {
      case 'high': return 3;
      case 'medium': return 2;
      case 'low': return 1;
      default: return 2;
    }
  }

  addPrerequisite(courseId) {
    const cleanId = courseId.trim().toUpperCase();
    if (cleanId === this.id) {
      throw new Error(`Self-loop detected: Course ${this.id} cannot be a prerequisite of itself.`);
    }
    if (!this.prerequisites.includes(cleanId)) {
      this.prerequisites.push(cleanId);
    }
  }

  removePrerequisite(courseId) {
    const cleanId = courseId.trim().toUpperCase();
    this.prerequisites = this.prerequisites.filter(id => id !== cleanId);
  }

  hasPrerequisite(courseId) {
    return this.prerequisites.includes(courseId.trim().toUpperCase());
  }

  clone() {
    return new Course({
      id: this.id,
      name: this.name,
      credits: this.credits,
      prerequisites: [...this.prerequisites],
      priority: this.priority,
      isCompleted: this.isCompleted,
      description: this.description,
      category: this.category
    });
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      credits: this.credits,
      prerequisites: [...this.prerequisites],
      priority: this.priority,
      isCompleted: this.isCompleted,
      description: this.description,
      category: this.category
    };
  }
}
