/**
 * Semester-Wise Learning Plan Generator
 * 
 * Generates an optimal, constraint-satisfying semester schedule respecting:
 * 1. Prerequisite barrier (Prerequisites must be completed in an EARLIER semester).
 * 2. Maximum course count limit per semester.
 * 3. Maximum credit count limit per semester.
 * 4. Priority and critical-path tie-breaking.
 * 5. Explains why each course is eligible or why it was deferred/blocked.
 */

import { CycleDetector } from './cycleDetector.js';

export class SemesterPlanner {
  /**
   * Plans courses across semesters given capacity and prerequisite constraints.
   * @param {import('../models/Graph.js').PrerequisiteGraph} graph 
   * @param {Object} options 
   * @param {number} options.maxCredits - Maximum credits per semester (e.g., 16)
   * @param {number} options.maxCourses - Maximum courses per semester (e.g., 4)
   * @param {string[]} options.preCompleted - Courses already completed/waived
   * @param {number} options.startSemester - Starting semester index (1)
   * @returns {{ success: boolean, semesters: Array, unscheduled: Array, explanations: Array, cycleInfo?: Object }}
   */
  static generatePlan(graph, options = {}) {
    const maxCredits = Number(options.maxCredits) || 16;
    const maxCourses = Number(options.maxCourses) || 4;
    const preCompleted = new Set((options.preCompleted || []).map(id => id.trim().toUpperCase()));
    const startSemester = Number(options.startSemester) || 1;

    const allCourses = graph.getAllCourses();
    const adj = graph.getAdjacencyList();
    const prereqList = graph.getPrerequisitesList();

    // 1. Analyze for cycles first
    const cycleAnalysis = CycleDetector.analyze(graph);

    const completed = new Set(preCompleted);
    const scheduled = new Set(preCompleted);
    const courseSemesterMap = new Map(); // courseId -> semester number

    // Mark pre-completed courses as semester 0
    for (const id of preCompleted) {
      courseSemesterMap.set(id, 0);
    }

    const semesters = [];
    const explanations = [];
    const unscheduled = [];
    const steps = [];

    let currentSemesterNum = startSemester;
    const maxIterationLimit = 20; // Guard against abnormal infinite loops

    while (scheduled.size < allCourses.length && currentSemesterNum <= maxIterationLimit) {
      // Find all courses eligible for this semester
      // A course is eligible if:
      // 1. It is not yet scheduled
      // 2. ALL its prerequisites are in the `completed` set (completed in a previous semester!)
      const eligibleCandidates = [];
      const deferredReasons = new Map();

      for (const course of allCourses) {
        if (scheduled.has(course.id)) continue;

        const prereqs = prereqList.get(course.id) || [];
        const missingPrereqs = prereqs.filter(pId => !completed.has(pId));

        if (missingPrereqs.length === 0) {
          eligibleCandidates.push(course);
        } else {
          deferredReasons.set(course.id, {
            reason: `Prerequisite(s) not yet completed: [${missingPrereqs.join(', ')}]`,
            missingPrereqs
          });
        }
      }

      // If no candidate is eligible, we cannot proceed further
      if (eligibleCandidates.length === 0) {
        break;
      }

      // Sort eligible candidates by:
      // 1. Priority (High = 3, Medium = 2, Low = 1)
      // 2. Out-degree (unlocking more downstream courses first)
      // 3. Credits (descending or alphabetical)
      const outDegrees = graph.getOutDegrees();
      eligibleCandidates.sort((a, b) => {
        if (b.priorityWeight !== a.priorityWeight) {
          return b.priorityWeight - a.priorityWeight;
        }
        const outA = outDegrees.get(a.id) || 0;
        const outB = outDegrees.get(b.id) || 0;
        if (outB !== outA) {
          return outB - outA;
        }
        return a.id.localeCompare(b.id);
      });

      // Greedy bin-packing into current semester
      const semesterCourses = [];
      let semesterCredits = 0;
      const courseDecisions = [];

      for (const course of eligibleCandidates) {
        const canFitCredits = (semesterCredits + course.credits) <= maxCredits;
        const canFitCourseCount = (semesterCourses.length + 1) <= maxCourses;

        if (canFitCredits && canFitCourseCount) {
          semesterCourses.push(course);
          semesterCredits += course.credits;
          scheduled.add(course.id);
          courseSemesterMap.set(course.id, currentSemesterNum);

          const prereqs = prereqList.get(course.id) || [];
          let prereqNote = 'No prerequisites required (Foundational course)';
          if (prereqs.length > 0) {
            const prereqDetails = prereqs.map(pId => {
              const sem = courseSemesterMap.get(pId);
              return `${pId} (completed in Semester ${sem === 0 ? 'Prior/Waived' : sem})`;
            }).join(', ');
            prereqNote = `Prerequisites satisfied: ${prereqDetails}`;
          }

          courseDecisions.push({
            course,
            status: 'SCHEDULED',
            explanation: `Eligible: ${prereqNote}. Priority: ${course.priority.toUpperCase()} (${course.priorityWeight} pts). Fits semester budget (${semesterCredits}/${maxCredits} credits, ${semesterCourses.length}/${maxCourses} courses).`
          });
        } else {
          let capacityReason = '';
          if (!canFitCourseCount && !canFitCredits) {
            capacityReason = `Semester capacity reached (max ${maxCourses} courses and max ${maxCredits} credits).`;
          } else if (!canFitCourseCount) {
            capacityReason = `Semester course limit reached (${semesterCourses.length}/${maxCourses} courses).`;
          } else {
            capacityReason = `Credit limit exceeded (adding ${course.credits} credits would exceed ${maxCredits} credits limit; current load: ${semesterCredits} cr).`;
          }

          courseDecisions.push({
            course,
            status: 'DEFERRED',
            explanation: `Deferred to future semester: Prerequisites are met, but ${capacityReason}`
          });
        }
      }

      // If nothing could be scheduled this semester (e.g. single course credits > maxCredits)
      if (semesterCourses.length === 0) {
        // Find the blocked candidate and record error
        for (const candidate of eligibleCandidates) {
          if (candidate.credits > maxCredits) {
            unscheduled.push({
              course: candidate,
              reason: `Course credits (${candidate.credits} credits) exceeds maximum allowed credits per semester (${maxCredits} credits). Cannot be scheduled.`
            });
            scheduled.add(candidate.id); // Prevent infinite loop
          }
        }
        break;
      }

      // Add courses taken in this semester to the `completed` set for FUTURE semesters
      for (const course of semesterCourses) {
        completed.add(course.id);
      }

      const semesterRecord = {
        semesterNumber: currentSemesterNum,
        name: `Semester ${currentSemesterNum}`,
        courses: semesterCourses,
        totalCredits: semesterCredits,
        maxCredits,
        maxCourses,
        decisions: courseDecisions
      };

      semesters.push(semesterRecord);

      explanations.push({
        semesterNumber: currentSemesterNum,
        summary: `Semester ${currentSemesterNum}: Scheduled ${semesterCourses.length} course(s) (${semesterCredits}/${maxCredits} credits)`,
        decisions: courseDecisions
      });

      steps.push({
        stepNumber: steps.length + 1,
        type: 'SEMESTER_ASSIGNED',
        semesterNumber: currentSemesterNum,
        semesterRecord,
        summary: `Generated Semester ${currentSemesterNum}`,
        detail: `Placed ${semesterCourses.map(c => c.id).join(', ')} into Semester ${currentSemesterNum}. Total load: ${semesterCredits} credits.`,
        activeNodes: semesterCourses.map(c => c.id)
      });

      currentSemesterNum++;
    }

    // Check for remaining unscheduled courses
    for (const course of allCourses) {
      if (!scheduled.has(course.id)) {
        let reason = '';
        if (cycleAnalysis.cycleNodes.has(course.id)) {
          reason = 'Dependency cycle detected: This course is part of a circular prerequisite loop and cannot be scheduled.';
        } else if (cycleAnalysis.blockedNodes.has(course.id)) {
          reason = 'Blocked by cycle: Depends on a prerequisite course that is trapped in a circular dependency.';
        } else {
          const prereqs = prereqList.get(course.id) || [];
          const missing = prereqs.filter(pId => !completed.has(pId));
          reason = `Prerequisite not completed: Missing prerequisite course(s) [${missing.join(', ')}] could not be fulfilled.`;
        }

        unscheduled.push({
          course,
          reason
        });
      }
    }

    const success = unscheduled.length === 0 && !cycleAnalysis.hasCycle;

    return {
      success,
      semesters,
      unscheduled,
      explanations,
      steps,
      cycleInfo: cycleAnalysis.hasCycle ? cycleAnalysis : null,
      errorMessage: cycleAnalysis.hasCycle
        ? 'A complete prerequisite order cannot be generated because the prerequisite graph contains a cycle.'
        : (unscheduled.length > 0 ? `${unscheduled.length} course(s) could not be scheduled due to constraints.` : null)
    };
  }
}
