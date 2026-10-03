/**
 * Directed Graph Data Structure for Course Prerequisites
 * 
 * Formal Model:
 * - Vertex V: A university course.
 * - Directed Edge (u -> v): Course u must be completed BEFORE course v can be taken.
 *   - u is a prerequisite of v.
 *   - v is a dependent of u.
 * - Adjacency List: adjList[u] contains all dependent courses v.
 * - Reverse Adjacency List: prereqList[v] contains all prerequisites u.
 * - In-Degree(v): Number of prerequisite courses required for v.
 *   - In-Degree = 0 means the course has no unfulfilled prerequisites (can be taken immediately).
 * - Out-Degree(u): Number of courses directly unlocked by completing u.
 */

import { Course } from './Course.js';

export class PrerequisiteGraph {
  constructor() {
    /** @type {Map<string, Course>} */
    this.courses = new Map();
  }

  /**
   * Adds or updates a course in the graph.
   * @param {Course|Object} courseData 
   * @returns {Course}
   */
  addCourse(courseData) {
    const course = courseData instanceof Course ? courseData : new Course(courseData);
    this.courses.set(course.id, course);
    return course;
  }

  /**
   * Removes a course and all edges referencing it.
   * @param {string} courseId 
   * @returns {boolean}
   */
  removeCourse(courseId) {
    const id = courseId.trim().toUpperCase();
    if (!this.courses.has(id)) return false;

    // Remove from map
    this.courses.delete(id);

    // Remove as prerequisite from all remaining courses
    for (const course of this.courses.values()) {
      course.removePrerequisite(id);
    }
    return true;
  }

  /**
   * Adds a prerequisite dependency: u must be taken before v (u -> v)
   * @param {string} prereqId u
   * @param {string} targetId v
   */
  addDependency(prereqId, targetId) {
    const u = prereqId.trim().toUpperCase();
    const v = targetId.trim().toUpperCase();

    if (!this.courses.has(u)) {
      throw new Error(`Prerequisite course "${u}" does not exist in the graph.`);
    }
    if (!this.courses.has(v)) {
      throw new Error(`Target course "${v}" does not exist in the graph.`);
    }
    if (u === v) {
      throw new Error(`Cannot add self-loop: Course "${u}" cannot require itself.`);
    }

    const targetCourse = this.courses.get(v);
    targetCourse.addPrerequisite(u);
  }

  /**
   * Removes a prerequisite dependency: u no longer required for v
   * @param {string} prereqId u
   * @param {string} targetId v
   */
  removeDependency(prereqId, targetId) {
    const u = prereqId.trim().toUpperCase();
    const v = targetId.trim().toUpperCase();
    if (this.courses.has(v)) {
      this.courses.get(v).removePrerequisite(u);
    }
  }

  /**
   * Returns a course by ID.
   * @param {string} courseId 
   * @returns {Course|undefined}
   */
  getCourse(courseId) {
    return this.courses.get(courseId.trim().toUpperCase());
  }

  /**
   * Returns all courses as an array.
   * @returns {Course[]}
   */
  getAllCourses() {
    return Array.from(this.courses.values());
  }

  /**
   * Total number of vertices in the graph.
   */
  get size() {
    return this.courses.size;
  }

  /**
   * Computes the Forward Adjacency List.
   * adjList[u] = [v1, v2, ...] where u is a prerequisite for each v.
   * @returns {Map<string, string[]>}
   */
  getAdjacencyList() {
    const adj = new Map();
    for (const id of this.courses.keys()) {
      adj.set(id, []);
    }

    for (const [targetId, course] of this.courses.entries()) {
      for (const prereqId of course.prerequisites) {
        if (adj.has(prereqId)) {
          adj.get(prereqId).push(targetId);
        }
      }
    }
    return adj;
  }

  /**
   * Computes the Reverse Adjacency List (Prerequisites list).
   * prereqList[v] = [u1, u2, ...] where each u is a prerequisite of v.
   * @returns {Map<string, string[]>}
   */
  getPrerequisitesList() {
    const prereqs = new Map();
    for (const [id, course] of this.courses.entries()) {
      // Only include prerequisites that actually exist in the graph
      prereqs.set(
        id,
        course.prerequisites.filter(pId => this.courses.has(pId))
      );
    }
    return prereqs;
  }

  /**
   * Calculates the in-degree of every course in the graph.
   * In-degree = count of prerequisites.
   * @returns {Map<string, number>}
   */
  getInDegrees() {
    const inDegrees = new Map();
    for (const id of this.courses.keys()) {
      inDegrees.set(id, 0);
    }

    for (const course of this.courses.values()) {
      // Count only valid existing prerequisites
      const validPrereqs = course.prerequisites.filter(pId => this.courses.has(pId));
      inDegrees.set(course.id, validPrereqs.length);
    }
    return inDegrees;
  }

  /**
   * Calculates the out-degree of every course in the graph.
   * Out-degree = count of dependent courses unlocked by this course.
   * @returns {Map<string, number>}
   */
  getOutDegrees() {
    const outDegrees = new Map();
    for (const id of this.courses.keys()) {
      outDegrees.set(id, 0);
    }

    const adj = this.getAdjacencyList();
    for (const [u, dependents] of adj.entries()) {
      outDegrees.set(u, dependents.length);
    }
    return outDegrees;
  }

  /**
   * Returns all courses that currently have zero in-degree (no unfulfilled prerequisites).
   * @returns {Course[]}
   */
  getZeroInDegreeCourses() {
    const inDegrees = this.getInDegrees();
    const result = [];
    for (const [id, deg] of inDegrees.entries()) {
      if (deg === 0) {
        result.push(this.courses.get(id));
      }
    }
    return result;
  }

  /**
   * Validates the graph for any dangling references or self-loops.
   * @returns {{ isValid: boolean, errors: string[], warnings: string[] }}
   */
  validate() {
    const errors = [];
    const warnings = [];

    for (const [id, course] of this.courses.entries()) {
      for (const pId of course.prerequisites) {
        if (pId === id) {
          errors.push(`Course "${id}" cannot list itself as a prerequisite (self-loop).`);
        } else if (!this.courses.has(pId)) {
          warnings.push(`Course "${id}" lists missing prerequisite "${pId}".`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Total number of directed edges in the graph.
   * @returns {number}
   */
  get edgeCount() {
    let count = 0;
    for (const course of this.courses.values()) {
      count += course.prerequisites.filter(pId => this.courses.has(pId)).length;
    }
    return count;
  }

  /**
   * Clears all courses from the graph.
   */
  clear() {
    this.courses.clear();
  }

  /**
   * Deep clone of the graph.
   * @returns {PrerequisiteGraph}
   */
  clone() {
    const newGraph = new PrerequisiteGraph();
    for (const course of this.courses.values()) {
      newGraph.addCourse(course.clone());
    }
    return newGraph;
  }

  /**
   * Exports graph to standard JSON.
   */
  toJSON() {
    return Array.from(this.courses.values()).map(c => c.toJSON());
  }

  /**
   * Populates graph from JSON array.
   * @param {Array<Object>} jsonArray 
   */
  fromJSON(jsonArray) {
    this.clear();
    if (!Array.isArray(jsonArray)) return;
    for (const item of jsonArray) {
      this.addCourse(new Course(item));
    }
  }
}
