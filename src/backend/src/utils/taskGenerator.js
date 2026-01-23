/**
 * Project Alpine - Task Generator Utility (Occurrence-Based)
 *
 * Generates tasks for trackers based on their scheduled occurrences.
 * Each scheduled time is treated as an independent occurrence:
 * - Weekly with Mon/Wed/Fri creates 3 separate tasks
 * - Daily creates one task per day
 * - Monthly with 1st/15th creates 2 tasks per month
 *
 * All functions accept a models object for per-user database isolation.
 */

const { Op } = require('sequelize');
const { XP_REWARDS } = require('../models');

// Constants
const TRACKED_TAG_NAME = 'tracked';
const TRACKED_TAG_COLOR = '#805AD5'; // Purple color

/**
 * Ensures the "tracked" tag exists in the system.
 * Creates it if it doesn't exist, returns the existing one if it does.
 * @param {Object} models - User-specific models
 * @returns {Promise<Tag>} The tracked tag instance
 */
async function ensureTrackedTag(models) {
  const { Tag } = models;

  let tag = await Tag.findOne({
    where: { name: TRACKED_TAG_NAME },
  });

  if (!tag) {
    tag = await Tag.create({
      name: TRACKED_TAG_NAME,
      color: TRACKED_TAG_COLOR,
    });
    console.log(`Created "${TRACKED_TAG_NAME}" tag with color ${TRACKED_TAG_COLOR}`);
  }

  return tag;
}

/**
 * Parses a time string (e.g., "09:00") and returns hours and minutes.
 * @param {string} timeStr - Time string in "HH:MM" format
 * @returns {{hours: number, minutes: number}} Parsed hours and minutes
 */
function parseScheduledTime(timeStr) {
  if (!timeStr) {
    return { hours: 9, minutes: 0 }; // Default to 9:00 AM
  }
  const [hours, minutes] = timeStr.split(':').map(Number);
  return {
    hours: isNaN(hours) ? 9 : hours,
    minutes: isNaN(minutes) ? 0 : minutes,
  };
}

/**
 * Gets the name of a day from its number (0-6)
 */
function getDayName(dayNum) {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[dayNum] || 'Unknown';
}

/**
 * Gets the next N scheduled occurrences for a tracker.
 * This is the core function for occurrence-based scheduling.
 *
 * @param {Tracker} tracker - The tracker with scheduling information
 * @param {Date} fromDate - Start date to calculate from (defaults to now)
 * @param {number} count - Number of occurrences to return (default 7)
 * @returns {Date[]} Array of occurrence dates
 */
function getNextScheduledOccurrences(tracker, fromDate = new Date(), count = 7) {
  const occurrences = [];
  const { hours, minutes } = parseScheduledTime(tracker.scheduledTime);
  const now = new Date(fromDate);

  switch (tracker.frequency) {
    case 'hourly': {
      // Each hour is an occurrence
      const startHour = new Date(now);
      startHour.setMinutes(minutes, 0, 0);
      if (startHour <= now) {
        startHour.setHours(startHour.getHours() + 1);
      }
      for (let i = 0; i < count; i++) {
        const occurrence = new Date(startHour);
        occurrence.setHours(occurrence.getHours() + i);
        occurrences.push(occurrence);
      }
      break;
    }

    case 'daily': {
      // Each day at scheduled time
      const startDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0, 0);
      // If today's occurrence has passed, start from tomorrow
      if (startDay <= now) {
        startDay.setDate(startDay.getDate() + 1);
      }
      // But include today if the time hasn't passed yet
      const todayOccurrence = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0, 0);
      if (todayOccurrence > now) {
        occurrences.push(todayOccurrence);
      }
      // Add future days
      for (let i = 0; occurrences.length < count; i++) {
        const occurrence = new Date(startDay);
        occurrence.setDate(occurrence.getDate() + i);
        if (!occurrences.some(d => d.getTime() === occurrence.getTime())) {
          occurrences.push(occurrence);
        }
      }
      break;
    }

    case 'weekly': {
      // Each scheduled day of the week
      const scheduledDays = tracker.scheduledDays && tracker.scheduledDays.length > 0
        ? tracker.scheduledDays.sort((a, b) => a - b)
        : [0]; // Default to Sunday if no days specified

      let currentDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      let addedCount = 0;
      const maxIterations = count * 7 + 14; // Safety limit
      let iterations = 0;

      while (addedCount < count && iterations < maxIterations) {
        iterations++;
        const dayOfWeek = currentDate.getDay();

        if (scheduledDays.includes(dayOfWeek)) {
          const occurrence = new Date(
            currentDate.getFullYear(),
            currentDate.getMonth(),
            currentDate.getDate(),
            hours,
            minutes,
            0,
            0
          );
          // Only add if it's in the future (or today's occurrence hasn't passed)
          if (occurrence > now || (occurrence.toDateString() === now.toDateString() && occurrence > now)) {
            occurrences.push(occurrence);
            addedCount++;
          } else if (occurrence.toDateString() === now.toDateString()) {
            // Today's occurrence - add if time hasn't passed
            const todayCheck = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0, 0);
            if (todayCheck > now) {
              occurrences.push(todayCheck);
              addedCount++;
            }
          }
        }

        currentDate.setDate(currentDate.getDate() + 1);
      }
      break;
    }

    case 'monthly': {
      // Each scheduled date of the month
      const scheduledDates = tracker.scheduledDatesOfMonth && tracker.scheduledDatesOfMonth.length > 0
        ? tracker.scheduledDatesOfMonth.sort((a, b) => a - b)
        : [1]; // Default to 1st if no dates specified

      let currentMonth = now.getMonth();
      let currentYear = now.getFullYear();
      let addedCount = 0;
      const maxMonths = Math.ceil(count / scheduledDates.length) + 2;

      for (let monthOffset = 0; monthOffset < maxMonths && addedCount < count; monthOffset++) {
        const month = (currentMonth + monthOffset) % 12;
        const year = currentYear + Math.floor((currentMonth + monthOffset) / 12);
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        for (const date of scheduledDates) {
          if (date > daysInMonth) continue; // Skip invalid dates

          const occurrence = new Date(year, month, date, hours, minutes, 0, 0);

          // Only add future occurrences
          if (occurrence > now) {
            occurrences.push(occurrence);
            addedCount++;
            if (addedCount >= count) break;
          }
        }
      }
      break;
    }

    default: {
      // Fallback: daily
      const startDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0, 0);
      if (startDay <= now) {
        startDay.setDate(startDay.getDate() + 1);
      }
      for (let i = 0; i < count; i++) {
        const occurrence = new Date(startDay);
        occurrence.setDate(occurrence.getDate() + i);
        occurrences.push(occurrence);
      }
    }
  }

  return occurrences.slice(0, count);
}

/**
 * Gets the previous scheduled occurrence before a given date.
 * Used for streak tracking - to check if the previous occurrence was completed.
 *
 * @param {Tracker} tracker - The tracker with scheduling information
 * @param {Date} beforeDate - Find the occurrence before this date
 * @returns {Date|null} The previous occurrence date, or null if none
 */
function getPreviousScheduledOccurrence(tracker, beforeDate = new Date()) {
  const { hours, minutes } = parseScheduledTime(tracker.scheduledTime);
  const now = new Date(beforeDate);

  switch (tracker.frequency) {
    case 'hourly': {
      const prevHour = new Date(now);
      prevHour.setMinutes(minutes, 0, 0);
      if (prevHour >= now) {
        prevHour.setHours(prevHour.getHours() - 1);
      }
      return prevHour;
    }

    case 'daily': {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      return new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), hours, minutes, 0, 0);
    }

    case 'weekly': {
      const scheduledDays = tracker.scheduledDays && tracker.scheduledDays.length > 0
        ? tracker.scheduledDays.sort((a, b) => a - b)
        : [0];

      let checkDate = new Date(now);
      checkDate.setDate(checkDate.getDate() - 1); // Start from yesterday

      for (let i = 0; i < 14; i++) { // Check up to 2 weeks back
        if (scheduledDays.includes(checkDate.getDay())) {
          return new Date(
            checkDate.getFullYear(),
            checkDate.getMonth(),
            checkDate.getDate(),
            hours,
            minutes,
            0,
            0
          );
        }
        checkDate.setDate(checkDate.getDate() - 1);
      }
      return null;
    }

    case 'monthly': {
      const scheduledDates = tracker.scheduledDatesOfMonth && tracker.scheduledDatesOfMonth.length > 0
        ? tracker.scheduledDatesOfMonth.sort((a, b) => b - a) // Descending for finding previous
        : [1];

      let checkMonth = now.getMonth();
      let checkYear = now.getFullYear();
      const todayDate = now.getDate();

      // Check current month first
      for (const date of scheduledDates) {
        if (date < todayDate) {
          return new Date(checkYear, checkMonth, date, hours, minutes, 0, 0);
        }
      }

      // Check previous month
      checkMonth--;
      if (checkMonth < 0) {
        checkMonth = 11;
        checkYear--;
      }
      const daysInPrevMonth = new Date(checkYear, checkMonth + 1, 0).getDate();
      for (const date of scheduledDates) {
        if (date <= daysInPrevMonth) {
          return new Date(checkYear, checkMonth, date, hours, minutes, 0, 0);
        }
      }
      return null;
    }

    default:
      return null;
  }
}

/**
 * Creates a task for a specific occurrence of a tracker.
 *
 * @param {Object} models - User-specific models
 * @param {Tracker} tracker - The tracker to create a task for
 * @param {Date} dueDate - The specific occurrence date/time
 * @returns {Promise<Task>} The created task with tags
 */
async function createTrackerTask(models, tracker, dueDate) {
  const { Task, Tag, Category } = models;

  // Ensure the tracked tag exists
  const trackedTag = await ensureTrackedTag(models);

  // Use tracker's configured urgency or default
  const urgency = tracker.taskUrgency || 'medium';

  // Create the task
  const task = await Task.create({
    title: tracker.name,
    description: tracker.description || `Auto-generated task for tracker: ${tracker.name}`,
    dueDate,
    urgency,
    categoryId: tracker.taskCategoryId || null,
    trackerId: tracker.id,
  });

  // Attach the tracked tag
  await task.setTags([trackedTag]);

  // Return task with associations
  const completeTask = await Task.findByPk(task.id, {
    include: [
      { model: Category, as: 'category' },
      { model: Tag, as: 'tags' },
    ],
  });

  console.log(`Created task "${task.title}" for tracker ${tracker.id} with due date ${dueDate.toISOString()}`);

  return completeTask;
}

/**
 * Archives stale tasks (past due date, not completed).
 * Occurrence-based: archives any pending task where dueDate < now.
 *
 * @param {Object} models - User-specific models
 * @param {Tracker} tracker - The tracker to clean up
 * @returns {Promise<number>} Number of tasks archived
 */
async function archiveStaleTasks(models, tracker) {
  const { Task } = models;
  const now = new Date();

  // For hourly, use current hour as cutoff
  // For daily/weekly/monthly, use start of today
  let cutoffDate;
  if (tracker.frequency === 'hourly') {
    cutoffDate = new Date(now);
    cutoffDate.setMinutes(0, 0, 0);
  } else {
    // Start of today - tasks due before today are stale
    cutoffDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  }

  // Find pending/in_progress tasks with due date before cutoff
  const staleTasks = await Task.findAll({
    where: {
      trackerId: tracker.id,
      status: { [Op.in]: ['pending', 'in_progress'] },
      dueDate: { [Op.lt]: cutoffDate },
    },
  });

  if (staleTasks.length === 0) {
    return 0;
  }

  // Archive them
  for (const task of staleTasks) {
    await task.update({ status: 'archived' });
    console.log(`Archived stale task "${task.title}" (was due ${task.dueDate.toISOString()})`);
  }

  return staleTasks.length;
}

/**
 * Generates tasks for all upcoming scheduled occurrences.
 * This is the main task generation function - called on every task list fetch.
 *
 * @param {Object} models - User-specific models
 * @returns {Promise<{created: Task[], skipped: number, archived: number}>} Results
 */
async function generateRecurringTasks(models) {
  const { Task, Tracker } = models;

  const results = {
    created: [],
    skipped: 0,
    archived: 0,
    errors: [],
  };

  try {
    // Get all active trackers with task generation enabled
    const trackers = await Tracker.findAll({
      where: {
        isActive: true,
        isPaused: false,
        generateTasks: true,
      },
    });

    if (trackers.length === 0) {
      return results;
    }

    for (const tracker of trackers) {
      try {
        // Step 1: Archive any stale tasks
        const archivedCount = await archiveStaleTasks(models, tracker);
        results.archived += archivedCount;

        // Step 2: Get next scheduled occurrences (7 for weekly/monthly, 3 for daily/hourly)
        const occurrenceCount = (tracker.frequency === 'weekly' || tracker.frequency === 'monthly') ? 7 : 3;
        const occurrences = getNextScheduledOccurrences(tracker, new Date(), occurrenceCount);

        // Step 3: For each occurrence, check if a task exists
        for (const occurrence of occurrences) {
          // Check if a task already exists for this exact due date
          const existingTask = await Task.findOne({
            where: {
              trackerId: tracker.id,
              status: { [Op.in]: ['pending', 'in_progress'] },
              dueDate: occurrence,
            },
          });

          if (existingTask) {
            results.skipped++;
            continue;
          }

          // Also check for tasks within a small time window (to handle timezone drift)
          const windowStart = new Date(occurrence.getTime() - 60000); // 1 min before
          const windowEnd = new Date(occurrence.getTime() + 60000);   // 1 min after
          const nearbyTask = await Task.findOne({
            where: {
              trackerId: tracker.id,
              status: { [Op.in]: ['pending', 'in_progress'] },
              dueDate: { [Op.between]: [windowStart, windowEnd] },
            },
          });

          if (nearbyTask) {
            results.skipped++;
            continue;
          }

          // Create task for this occurrence
          const task = await createTrackerTask(models, tracker, occurrence);
          results.created.push(task);
        }
      } catch (error) {
        console.error(`Error generating tasks for tracker ${tracker.id}:`, error);
        results.errors.push({ trackerId: tracker.id, error: error.message });
      }
    }

    if (results.created.length > 0 || results.archived > 0) {
      console.log(`Task generation: ${results.created.length} created, ${results.archived} archived, ${results.skipped} skipped`);
    }
    return results;
  } catch (error) {
    console.error('Error in generateRecurringTasks:', error);
    throw error;
  }
}

/**
 * Creates tasks for all scheduled occurrences when a tracker is first created.
 * Called once during tracker creation.
 *
 * @param {Object} models - User-specific models
 * @param {Tracker} tracker - The newly created tracker
 * @returns {Promise<Task[]>} Array of created tasks
 */
async function createAllScheduledTasks(models, tracker) {
  const occurrenceCount = (tracker.frequency === 'weekly' || tracker.frequency === 'monthly') ? 7 : 3;
  const occurrences = getNextScheduledOccurrences(tracker, new Date(), occurrenceCount);

  const tasks = [];
  for (const occurrence of occurrences) {
    const task = await createTrackerTask(models, tracker, occurrence);
    tasks.push(task);
  }

  console.log(`Created ${tasks.length} initial task(s) for tracker "${tracker.name}"`);
  return tasks;
}

/**
 * Creates the next occurrence task after one is completed.
 *
 * @param {Object} models - User-specific models
 * @param {Tracker} tracker - The tracker
 * @param {Task} completedTask - The task that was just completed
 * @returns {Promise<Task|null>} The new task, or null if already exists
 */
async function createNextTrackerTask(models, tracker, completedTask) {
  const { Task } = models;

  // Get the next occurrence after the completed task's due date
  const completedDueDate = new Date(completedTask.dueDate);
  const nextOccurrences = getNextScheduledOccurrences(tracker, completedDueDate, 3);

  // Find the first occurrence that doesn't have a task yet
  for (const occurrence of nextOccurrences) {
    // Skip if this is the same as the completed task
    if (occurrence.getTime() === completedDueDate.getTime()) {
      continue;
    }

    // Check if task already exists
    const existingTask = await Task.findOne({
      where: {
        trackerId: tracker.id,
        status: { [Op.in]: ['pending', 'in_progress'] },
        dueDate: occurrence,
      },
    });

    if (!existingTask) {
      const task = await createTrackerTask(models, tracker, occurrence);
      return task;
    }
  }

  console.log(`No new task needed for tracker "${tracker.name}" - upcoming tasks already exist`);
  return null;
}

/**
 * Checks for missed occurrences and updates tracker streak.
 * Called when logging progress or completing a task.
 *
 * @param {Object} models - User-specific models
 * @param {Tracker} tracker - The tracker to check
 * @param {Date} currentOccurrence - The occurrence being completed
 * @returns {Promise<{streakBroken: boolean, missedCount: number}>}
 */
async function checkMissedOccurrences(models, tracker, currentOccurrence) {
  const { Task } = models;

  // Get the previous occurrence
  const prevOccurrence = getPreviousScheduledOccurrence(tracker, currentOccurrence);

  if (!prevOccurrence) {
    // No previous occurrence (first time), streak continues
    return { streakBroken: false, missedCount: 0 };
  }

  // Check if the previous occurrence was completed
  const prevTask = await Task.findOne({
    where: {
      trackerId: tracker.id,
      status: 'completed',
      dueDate: {
        [Op.between]: [
          new Date(prevOccurrence.getTime() - 60000),
          new Date(prevOccurrence.getTime() + 60000),
        ],
      },
    },
  });

  // Also check if tracker's lastOccurrenceDate matches
  const lastOccurrenceMatches = tracker.lastOccurrenceDate &&
    Math.abs(new Date(tracker.lastOccurrenceDate).getTime() - prevOccurrence.getTime()) < 60000;

  if (prevTask || lastOccurrenceMatches) {
    // Previous occurrence was completed, streak continues
    return { streakBroken: false, missedCount: 0 };
  }

  // Previous occurrence was missed, streak is broken
  return { streakBroken: true, missedCount: 1 };
}

// Legacy exports for backward compatibility (some are stubs)
const calculateDueDate = (frequency, startDate = new Date()) => {
  // Simplified - just returns the date for compatibility
  return new Date(startDate);
};

const calculateInitialScheduledDueDate = (tracker) => {
  const occurrences = getNextScheduledOccurrences(tracker, new Date(), 1);
  return occurrences[0] || new Date();
};

const calculateNextDueDate = (tracker, fromDate = new Date()) => {
  const occurrences = getNextScheduledOccurrences(tracker, fromDate, 2);
  // Return second occurrence (first might be the current one)
  return occurrences[1] || occurrences[0] || new Date();
};

// Stub for legacy compatibility - not used in new model
const isTodayScheduled = () => true;
const findActiveTrackerTask = async () => null;
const getPeriodStartDate = () => new Date();
const getPeriodEndDate = () => new Date();
const countPeriodsElapsed = () => 0;
const checkAndResetTrackerPeriods = async () => ({ evaluated: 0, reset: 0, archived: 0 });

module.exports = {
  TRACKED_TAG_NAME,
  TRACKED_TAG_COLOR,
  ensureTrackedTag,
  parseScheduledTime,
  getDayName,
  getNextScheduledOccurrences,
  getPreviousScheduledOccurrence,
  createTrackerTask,
  archiveStaleTasks,
  generateRecurringTasks,
  createAllScheduledTasks,
  createNextTrackerTask,
  checkMissedOccurrences,
  // Legacy exports
  calculateDueDate,
  calculateInitialScheduledDueDate,
  calculateNextDueDate,
  isTodayScheduled,
  findActiveTrackerTask,
  getPeriodStartDate,
  getPeriodEndDate,
  countPeriodsElapsed,
  checkAndResetTrackerPeriods,
};
