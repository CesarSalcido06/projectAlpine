/**
 * Project Alpine - Task Generator Utility (Period-Bounded)
 *
 * Generates tasks for trackers scoped to their natural period:
 * - Daily: Creates task for TODAY only
 * - Weekly: Creates tasks for all scheduled days in THIS WEEK (Sun-Sat)
 * - Monthly: Creates tasks for all scheduled dates in THIS MONTH
 * - Hourly: Creates task for the current hour
 *
 * New tasks are created when the period rolls over (new day/week/month).
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
 * Gets the start and end of the current period based on frequency.
 * @param {string} frequency - 'hourly', 'daily', 'weekly', or 'monthly'
 * @param {Date} referenceDate - Date to calculate period from
 * @returns {{start: Date, end: Date}} Period boundaries
 */
function getCurrentPeriodBounds(frequency, referenceDate = new Date()) {
  const now = new Date(referenceDate);

  switch (frequency) {
    case 'hourly': {
      const start = new Date(now);
      start.setMinutes(0, 0, 0);
      const end = new Date(start);
      end.setHours(end.getHours() + 1);
      return { start, end };
    }

    case 'daily': {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      return { start, end };
    }

    case 'weekly': {
      // Week starts on Sunday (day 0)
      const dayOfWeek = now.getDay();
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek, 0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 7);
      return { start, end };
    }

    case 'monthly': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0);
      return { start, end };
    }

    default:
      // Default to daily
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      return { start, end };
  }
}

/**
 * Gets all scheduled occurrences within the CURRENT period only.
 * This is the key function that scopes tasks to their natural period.
 *
 * @param {Tracker} tracker - The tracker with scheduling information
 * @param {Date} referenceDate - Date to calculate from (defaults to now)
 * @returns {Date[]} Array of occurrence dates within the current period
 */
function getOccurrencesForCurrentPeriod(tracker, referenceDate = new Date()) {
  const occurrences = [];
  const { hours, minutes } = parseScheduledTime(tracker.scheduledTime);
  const now = new Date(referenceDate);
  const { start: periodStart, end: periodEnd } = getCurrentPeriodBounds(tracker.frequency, now);

  switch (tracker.frequency) {
    case 'hourly': {
      // Just the current hour
      const occurrence = new Date(now);
      occurrence.setMinutes(minutes, 0, 0);
      occurrences.push(occurrence);
      break;
    }

    case 'daily': {
      // Just today at the scheduled time
      const occurrence = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0, 0);
      occurrences.push(occurrence);
      break;
    }

    case 'weekly': {
      // All scheduled days within this week
      const scheduledDays = tracker.scheduledDays && tracker.scheduledDays.length > 0
        ? tracker.scheduledDays.sort((a, b) => a - b)
        : [0]; // Default to Sunday if no days specified

      for (const dayOfWeek of scheduledDays) {
        // Calculate the date for this day of the week within the current week
        const occurrence = new Date(periodStart);
        occurrence.setDate(periodStart.getDate() + dayOfWeek);
        occurrence.setHours(hours, minutes, 0, 0);

        // Only include if within period bounds
        if (occurrence >= periodStart && occurrence < periodEnd) {
          occurrences.push(occurrence);
        }
      }
      break;
    }

    case 'monthly': {
      // All scheduled dates within this month
      const scheduledDates = tracker.scheduledDatesOfMonth && tracker.scheduledDatesOfMonth.length > 0
        ? tracker.scheduledDatesOfMonth.sort((a, b) => a - b)
        : [1]; // Default to 1st if no dates specified

      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

      for (const date of scheduledDates) {
        if (date <= daysInMonth) {
          const occurrence = new Date(now.getFullYear(), now.getMonth(), date, hours, minutes, 0, 0);
          occurrences.push(occurrence);
        }
      }
      break;
    }

    default: {
      // Fallback: daily
      const occurrence = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0, 0);
      occurrences.push(occurrence);
    }
  }

  return occurrences;
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

  console.log(`Created task "${task.title}" due ${dueDate.toISOString()}`);

  return completeTask;
}

/**
 * Archives stale tasks (past due date, not completed).
 * For period-based: archives tasks from PREVIOUS periods.
 * Also resets tracker's currentValue when a new period starts.
 *
 * @param {Object} models - User-specific models
 * @param {Tracker} tracker - The tracker to clean up
 * @returns {Promise<number>} Number of tasks archived
 */
async function archiveStaleTasks(models, tracker) {
  const { Task, Tracker } = models;
  const now = new Date();

  // Get the start of current period - anything before this is stale
  const { start: periodStart } = getCurrentPeriodBounds(tracker.frequency, now);

  // Check if we need to reset currentValue for the new period
  // If lastCompletedAt is before periodStart, we're in a new period
  if (tracker.lastCompletedAt && new Date(tracker.lastCompletedAt) < periodStart) {
    if (tracker.currentValue > 0) {
      await tracker.update({ currentValue: 0 });
      console.log(`Reset currentValue for tracker "${tracker.name}" (new period)`);
    }
  }

  // Find pending/in_progress tasks with due date before current period
  const staleTasks = await Task.findAll({
    where: {
      trackerId: tracker.id,
      status: { [Op.in]: ['pending', 'in_progress'] },
      dueDate: { [Op.lt]: periodStart },
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
 * Generates tasks for the CURRENT period only.
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
        // Step 1: Archive any stale tasks from previous periods
        const archivedCount = await archiveStaleTasks(models, tracker);
        results.archived += archivedCount;

        // Step 2: Get occurrences for the CURRENT period only
        const occurrences = getOccurrencesForCurrentPeriod(tracker);

        // Step 3: For each occurrence, check if a task exists
        for (const occurrence of occurrences) {
          // Check if a task already exists for this exact due date
          const existingTask = await Task.findOne({
            where: {
              trackerId: tracker.id,
              status: { [Op.in]: ['pending', 'in_progress', 'completed'] },
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
              status: { [Op.in]: ['pending', 'in_progress', 'completed'] },
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
 * Creates tasks for all scheduled occurrences in the CURRENT period when a tracker is created.
 * Called once during tracker creation.
 *
 * @param {Object} models - User-specific models
 * @param {Tracker} tracker - The newly created tracker
 * @returns {Promise<Task[]>} Array of created tasks
 */
async function createAllScheduledTasks(models, tracker) {
  const occurrences = getOccurrencesForCurrentPeriod(tracker);

  const tasks = [];
  for (const occurrence of occurrences) {
    const task = await createTrackerTask(models, tracker, occurrence);
    tasks.push(task);
  }

  console.log(`Created ${tasks.length} task(s) for tracker "${tracker.name}" (current period)`);
  return tasks;
}

/**
 * Does NOT create next period tasks - that happens when the new period starts.
 * This is called after completion but we no longer auto-create future tasks.
 *
 * @param {Object} models - User-specific models
 * @param {Tracker} tracker - The tracker
 * @param {Task} completedTask - The task that was just completed
 * @returns {Promise<null>} Always returns null - next period tasks created on period rollover
 */
async function createNextTrackerTask(models, tracker, completedTask) {
  // Tasks for the next period are created when that period starts
  // (via generateRecurringTasks being called on next request)
  // We don't auto-create future period tasks here
  console.log(`Task completed for tracker "${tracker.name}" - next period tasks will generate automatically`);
  return null;
}

/**
 * Checks for missed occurrences and determines if streak should break.
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

/**
 * Gets the next scheduled occurrences (for display/API purposes).
 * Unlike getOccurrencesForCurrentPeriod, this can look into future periods.
 *
 * @param {Tracker} tracker - The tracker
 * @param {Date} fromDate - Start date
 * @param {number} count - Number of occurrences to get
 * @returns {Date[]} Array of upcoming occurrence dates
 */
function getNextScheduledOccurrences(tracker, fromDate = new Date(), count = 3) {
  const occurrences = [];
  const { hours, minutes } = parseScheduledTime(tracker.scheduledTime);
  const now = new Date(fromDate);

  switch (tracker.frequency) {
    case 'hourly': {
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
      let currentDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0, 0);
      if (currentDay <= now) {
        currentDay.setDate(currentDay.getDate() + 1);
      }
      for (let i = 0; i < count; i++) {
        const occurrence = new Date(currentDay);
        occurrence.setDate(occurrence.getDate() + i);
        occurrences.push(occurrence);
      }
      break;
    }

    case 'weekly': {
      const scheduledDays = tracker.scheduledDays && tracker.scheduledDays.length > 0
        ? tracker.scheduledDays.sort((a, b) => a - b)
        : [0];

      let currentDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      let addedCount = 0;

      while (addedCount < count) {
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
          if (occurrence > now) {
            occurrences.push(occurrence);
            addedCount++;
          }
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }
      break;
    }

    case 'monthly': {
      const scheduledDates = tracker.scheduledDatesOfMonth && tracker.scheduledDatesOfMonth.length > 0
        ? tracker.scheduledDatesOfMonth.sort((a, b) => a - b)
        : [1];

      let currentMonth = now.getMonth();
      let currentYear = now.getFullYear();
      let addedCount = 0;

      while (addedCount < count) {
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        for (const date of scheduledDates) {
          if (date <= daysInMonth) {
            const occurrence = new Date(currentYear, currentMonth, date, hours, minutes, 0, 0);
            if (occurrence > now) {
              occurrences.push(occurrence);
              addedCount++;
              if (addedCount >= count) break;
            }
          }
        }
        currentMonth++;
        if (currentMonth > 11) {
          currentMonth = 0;
          currentYear++;
        }
      }
      break;
    }
  }

  return occurrences.slice(0, count);
}

// Legacy exports for backward compatibility
const calculateDueDate = (frequency, startDate = new Date()) => {
  return new Date(startDate);
};

const calculateInitialScheduledDueDate = (tracker) => {
  const occurrences = getOccurrencesForCurrentPeriod(tracker);
  return occurrences[0] || new Date();
};

const calculateNextDueDate = (tracker, fromDate = new Date()) => {
  const occurrences = getNextScheduledOccurrences(tracker, fromDate, 1);
  return occurrences[0] || new Date();
};

// Legacy stubs
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
  getCurrentPeriodBounds,
  getOccurrencesForCurrentPeriod,
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
