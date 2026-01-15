/**
 * Project Alpine - Task Generator Utility
 *
 * Utility functions for automatic task generation from trackers.
 * Handles creation of the "tracked" tag and generating tasks based on tracker schedules.
 */

const { Task, Tag, Tracker } = require('../models');
const { Op } = require('sequelize');

// Constants
const TRACKED_TAG_NAME = 'tracked';
const TRACKED_TAG_COLOR = '#805AD5'; // Purple color

/**
 * Ensures the "tracked" tag exists in the system.
 * Creates it if it doesn't exist, returns the existing one if it does.
 * @returns {Promise<Tag>} The tracked tag instance
 */
async function ensureTrackedTag() {
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
 * Calculates the due date for a task based on the tracker's frequency.
 * @param {string} frequency - The tracker frequency (hourly, daily, weekly, monthly)
 * @param {Date} startDate - The starting date (defaults to now)
 * @returns {Date} The calculated due date
 */
function calculateDueDate(frequency, startDate = new Date()) {
  const dueDate = new Date(startDate);

  switch (frequency) {
    case 'hourly':
      // Due at the end of the current hour
      dueDate.setMinutes(59, 59, 999);
      break;
    case 'daily':
      // Due at end of day (11:59 PM)
      dueDate.setHours(23, 59, 59, 999);
      break;
    case 'weekly':
      // Due at end of the week (Sunday 11:59 PM)
      const daysUntilSunday = 7 - dueDate.getDay();
      dueDate.setDate(dueDate.getDate() + daysUntilSunday);
      dueDate.setHours(23, 59, 59, 999);
      break;
    case 'monthly':
      // Due at end of the month
      dueDate.setMonth(dueDate.getMonth() + 1, 0);
      dueDate.setHours(23, 59, 59, 999);
      break;
    default:
      // Default to end of day
      dueDate.setHours(23, 59, 59, 999);
  }

  return dueDate;
}

/**
 * Calculates the initial due date for a tracker respecting scheduling fields.
 * If today is a scheduled day, returns today at scheduledTime.
 * If today is not a scheduled day, returns the next scheduled occurrence.
 * @param {Tracker} tracker - The tracker with scheduling information
 * @returns {Date} The calculated due date
 */
function calculateInitialScheduledDueDate(tracker) {
  const now = new Date();
  const { hours, minutes } = parseScheduledTime(tracker.scheduledTime);

  switch (tracker.frequency) {
    case 'hourly':
      // For hourly, just set the scheduled minutes
      const hourlyDate = new Date(now);
      hourlyDate.setMinutes(minutes, 0, 0);
      // If we're past that minute, move to next hour
      if (hourlyDate <= now) {
        hourlyDate.setHours(hourlyDate.getHours() + 1);
      }
      return hourlyDate;

    case 'daily':
      // For daily, set the scheduled time
      const dailyDate = new Date(now);
      dailyDate.setHours(hours, minutes, 0, 0);
      // If we're past that time today, it's still due today (can complete anytime)
      // But if we haven't reached the time, that's the due time
      return dailyDate;

    case 'weekly':
      // Check if today is one of the scheduled days
      const scheduledDays = tracker.scheduledDays && tracker.scheduledDays.length > 0
        ? tracker.scheduledDays.sort((a, b) => a - b)
        : [now.getDay()]; // Default to current day

      const currentDay = now.getDay();
      const isTodayScheduled = scheduledDays.includes(currentDay);

      if (isTodayScheduled) {
        // Today is a scheduled day - due today at scheduled time
        const todayDate = new Date(now);
        todayDate.setHours(hours, minutes, 0, 0);
        return todayDate;
      } else {
        // Find next scheduled day
        let daysToAdd = 0;
        let foundNextDay = false;
        for (const day of scheduledDays) {
          if (day > currentDay) {
            daysToAdd = day - currentDay;
            foundNextDay = true;
            break;
          }
        }
        if (!foundNextDay) {
          // Wrap to next week
          daysToAdd = 7 - currentDay + scheduledDays[0];
        }
        const nextDate = new Date(now);
        nextDate.setDate(nextDate.getDate() + daysToAdd);
        nextDate.setHours(hours, minutes, 0, 0);
        return nextDate;
      }

    case 'monthly':
      // Check if today is one of the scheduled dates
      const scheduledDates = tracker.scheduledDatesOfMonth && tracker.scheduledDatesOfMonth.length > 0
        ? tracker.scheduledDatesOfMonth.sort((a, b) => a - b)
        : [now.getDate()]; // Default to current date

      const currentDate = now.getDate();
      const isTodayScheduledDate = scheduledDates.includes(currentDate);

      if (isTodayScheduledDate) {
        // Today is a scheduled date - due today at scheduled time
        const todayDate = new Date(now);
        todayDate.setHours(hours, minutes, 0, 0);
        return todayDate;
      } else {
        // Find next scheduled date
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        // Check for next date in current month
        for (const date of scheduledDates) {
          if (date > currentDate) {
            const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
            if (date <= daysInMonth) {
              const nextDate = new Date(currentYear, currentMonth, date, hours, minutes, 0, 0);
              return nextDate;
            }
          }
        }

        // Go to next month
        const nextMonth = currentMonth + 1;
        const nextYear = nextMonth > 11 ? currentYear + 1 : currentYear;
        const actualNextMonth = nextMonth % 12;
        const daysInNextMonth = new Date(nextYear, actualNextMonth + 1, 0).getDate();

        for (const date of scheduledDates) {
          if (date <= daysInNextMonth) {
            return new Date(nextYear, actualNextMonth, date, hours, minutes, 0, 0);
          }
        }

        // Fallback to first day of next month
        return new Date(nextYear, actualNextMonth, 1, hours, minutes, 0, 0);
      }

    default:
      // Default to today at scheduled time
      const defaultDate = new Date(now);
      defaultDate.setHours(hours, minutes, 0, 0);
      return defaultDate;
  }
}

/**
 * Creates a task for a tracker with the "tracked" tag attached.
 * Uses scheduling fields (scheduledTime, scheduledDays, scheduledDatesOfMonth) when set.
 * @param {Tracker} tracker - The tracker to create a task for
 * @param {Object} options - Additional options
 * @param {Date} options.dueDate - Optional custom due date
 * @param {string} options.urgency - Optional urgency level (defaults to 'medium')
 * @returns {Promise<Task>} The created task with tags
 */
async function createTrackerTask(tracker, options = {}) {
  // Ensure the tracked tag exists
  const trackedTag = await ensureTrackedTag();

  // Calculate due date - use scheduling-aware calculation if scheduling fields are set
  let dueDate = options.dueDate;
  if (!dueDate) {
    const hasScheduling = tracker.scheduledTime ||
      (tracker.scheduledDays && tracker.scheduledDays.length > 0) ||
      (tracker.scheduledDatesOfMonth && tracker.scheduledDatesOfMonth.length > 0);

    if (hasScheduling) {
      // Use scheduling-aware due date calculation
      dueDate = calculateInitialScheduledDueDate(tracker);
    } else {
      // Fallback to simple end-of-period calculation
      dueDate = calculateDueDate(tracker.frequency);
    }
  }

  // Determine urgency based on frequency if not provided
  let urgency = options.urgency || 'medium';
  if (!options.urgency) {
    // Higher frequency = higher urgency
    switch (tracker.frequency) {
      case 'hourly':
        urgency = 'high';
        break;
      case 'daily':
        urgency = 'medium';
        break;
      case 'weekly':
      case 'monthly':
        urgency = 'low';
        break;
    }
  }

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
      { model: require('../models/Category'), as: 'category' },
      { model: Tag, as: 'tags' },
    ],
  });

  console.log(`Created task "${task.title}" for tracker ${tracker.id} with due date ${dueDate.toISOString()}`);

  return completeTask;
}

/**
 * Generates tasks for all active trackers that have generateTasks enabled.
 * - Archives stale pending tasks from previous periods
 * - Creates ONE task for the current period if none exists
 * - For weekly/monthly trackers, only creates on scheduled days
 * @returns {Promise<{created: Task[], skipped: number, archived: number}>} Results of the generation
 */
async function generateRecurringTasks() {
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

    // Ensure tracked tag exists
    const trackedTag = await ensureTrackedTag();

    for (const tracker of trackers) {
      try {
        // Step 1: Archive any stale pending tasks from PREVIOUS periods
        const archivedCount = await archiveStaleTasks(tracker);
        results.archived += archivedCount;

        // Step 2: Check if today is a scheduled day (for weekly/monthly)
        if (!isTodayScheduled(tracker)) {
          results.skipped++;
          continue;
        }

        // Step 3: Check if there's already an active task for this tracker in current period
        const existingTask = await findActiveTrackerTask(tracker, trackedTag.id);

        if (existingTask) {
          results.skipped++;
          continue;
        }

        // Step 4: Create a new task for the current period
        const task = await createTrackerTask(tracker);
        results.created.push(task);
      } catch (error) {
        console.error(`Error generating task for tracker ${tracker.id}:`, error);
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
 * Archives pending tasks from previous periods for a tracker.
 * This prevents old tasks from cluttering the calendar.
 * @param {Tracker} tracker - The tracker to clean up
 * @returns {Promise<number>} Number of tasks archived
 */
async function archiveStaleTasks(tracker) {
  const periodStart = getPeriodStartDate(tracker.frequency);

  // Find pending tasks from BEFORE the current period
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
 * Checks if today is a scheduled day for the tracker.
 * For daily trackers: always true
 * For weekly trackers: checks if today's day of week is in scheduledDays
 * For monthly trackers: checks if today's date is in scheduledDatesOfMonth
 * @param {Tracker} tracker - The tracker to check
 * @returns {boolean} Whether today is a scheduled day
 */
function isTodayScheduled(tracker) {
  const now = new Date();

  switch (tracker.frequency) {
    case 'hourly':
    case 'daily':
      // Daily and hourly are always scheduled
      return true;

    case 'weekly':
      // Check if today's day of week is in scheduledDays
      const scheduledDays = tracker.scheduledDays;
      if (!scheduledDays || scheduledDays.length === 0) {
        return true; // No specific days = every day
      }
      return scheduledDays.includes(now.getDay());

    case 'monthly':
      // Check if today's date is in scheduledDatesOfMonth
      const scheduledDates = tracker.scheduledDatesOfMonth;
      if (!scheduledDates || scheduledDates.length === 0) {
        return true; // No specific dates = every day
      }
      return scheduledDates.includes(now.getDate());

    default:
      return true;
  }
}

/**
 * Finds an existing active (pending/in_progress) task for a tracker.
 * Uses trackerId for reliable matching.
 * @param {Tracker} tracker - The tracker to find tasks for
 * @param {number} trackedTagId - The ID of the tracked tag (unused, kept for compatibility)
 * @returns {Promise<Task|null>} The existing task or null
 */
async function findActiveTrackerTask(tracker, trackedTagId) {
  // Calculate the period start date based on frequency
  const periodStart = getPeriodStartDate(tracker.frequency);

  // Find tasks that:
  // 1. Belong to this tracker (by trackerId)
  // 2. Are pending or in_progress
  // 3. Have a due date within the current period
  const task = await Task.findOne({
    where: {
      trackerId: tracker.id,
      status: { [Op.in]: ['pending', 'in_progress'] },
      dueDate: { [Op.gte]: periodStart },
    },
    order: [['dueDate', 'ASC']],
  });

  return task;
}

/**
 * Gets the start date of the current period based on frequency.
 * @param {string} frequency - The frequency (hourly, daily, weekly, monthly)
 * @returns {Date} The start of the current period
 */
function getPeriodStartDate(frequency) {
  const now = new Date();

  switch (frequency) {
    case 'hourly':
      return new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), 0, 0, 0);
    case 'daily':
      return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    case 'weekly':
      const dayOfWeek = now.getDay();
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - dayOfWeek);
      weekStart.setHours(0, 0, 0, 0);
      return weekStart;
    case 'monthly':
      return new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    default:
      return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  }
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
 * Calculates the next due date based on the tracker's schedule.
 * Respects scheduledTime, scheduledDays (for weekly), and scheduledDatesOfMonth (for monthly).
 * @param {Tracker} tracker - The tracker with schedule information
 * @param {Date} fromDate - The starting date to calculate from (defaults to now)
 * @returns {Date} The next due date
 */
function calculateNextDueDate(tracker, fromDate = new Date()) {
  const { hours, minutes } = parseScheduledTime(tracker.scheduledTime);
  const nextDate = new Date(fromDate);

  switch (tracker.frequency) {
    case 'hourly':
      // Next hour at scheduled minutes (or top of hour)
      nextDate.setHours(nextDate.getHours() + 1);
      nextDate.setMinutes(minutes, 0, 0);
      break;

    case 'daily':
      // Next day at scheduled time
      nextDate.setDate(nextDate.getDate() + 1);
      nextDate.setHours(hours, minutes, 0, 0);
      break;

    case 'weekly':
      // Find next scheduled day of week
      const scheduledDays = tracker.scheduledDays && tracker.scheduledDays.length > 0
        ? tracker.scheduledDays.sort((a, b) => a - b)
        : [nextDate.getDay()]; // Default to current day if not specified

      const currentDay = nextDate.getDay();
      let daysToAdd = 0;

      // Find the next scheduled day
      let foundNextDay = false;
      for (const day of scheduledDays) {
        if (day > currentDay) {
          daysToAdd = day - currentDay;
          foundNextDay = true;
          break;
        }
      }

      // If no day found this week, wrap to first scheduled day next week
      if (!foundNextDay) {
        daysToAdd = 7 - currentDay + scheduledDays[0];
      }

      nextDate.setDate(nextDate.getDate() + daysToAdd);
      nextDate.setHours(hours, minutes, 0, 0);
      break;

    case 'monthly':
      // Find next scheduled date of month
      const scheduledDates = tracker.scheduledDatesOfMonth && tracker.scheduledDatesOfMonth.length > 0
        ? tracker.scheduledDatesOfMonth.sort((a, b) => a - b)
        : [nextDate.getDate()]; // Default to current date if not specified

      const currentDate = nextDate.getDate();
      const currentMonth = nextDate.getMonth();
      const currentYear = nextDate.getFullYear();

      let foundNextDate = false;

      // Check for next scheduled date in current month
      for (const date of scheduledDates) {
        if (date > currentDate) {
          // Ensure the date is valid for the current month
          const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
          if (date <= daysInMonth) {
            nextDate.setDate(date);
            foundNextDate = true;
            break;
          }
        }
      }

      // If no date found this month, go to first scheduled date next month
      if (!foundNextDate) {
        nextDate.setMonth(currentMonth + 1, 1);
        const nextMonth = nextDate.getMonth();
        const nextYear = nextDate.getFullYear();
        const daysInNextMonth = new Date(nextYear, nextMonth + 1, 0).getDate();

        // Find first valid scheduled date in next month
        for (const date of scheduledDates) {
          if (date <= daysInNextMonth) {
            nextDate.setDate(date);
            foundNextDate = true;
            break;
          }
        }

        // Fallback to 1st if no valid date found
        if (!foundNextDate) {
          nextDate.setDate(1);
        }
      }

      nextDate.setHours(hours, minutes, 0, 0);
      break;

    default:
      // Default to next day at scheduled time
      nextDate.setDate(nextDate.getDate() + 1);
      nextDate.setHours(hours, minutes, 0, 0);
  }

  return nextDate;
}

/**
 * Creates the next occurrence of a tracker task after one is completed.
 * Uses the tracker's schedule to determine the next due date.
 * IMPORTANT: Only creates if no pending task already exists for the next period.
 * @param {Tracker} tracker - The tracker to create the next task for
 * @param {Task} completedTask - The task that was just completed (for reference)
 * @returns {Promise<Task|null>} The newly created task, or null if one already exists
 */
async function createNextTrackerTask(tracker, completedTask) {
  // Calculate the next due date based on the tracker's schedule
  const nextDueDate = calculateNextDueDate(tracker);

  // Check if there's already a pending task for this tracker with a future due date
  const existingTask = await Task.findOne({
    where: {
      trackerId: tracker.id,
      status: { [Op.in]: ['pending', 'in_progress'] },
      dueDate: { [Op.gte]: new Date() }, // Future or current tasks
    },
    order: [['dueDate', 'ASC']],
  });

  if (existingTask) {
    console.log(`Skipping task creation - pending task already exists for tracker "${tracker.name}" (task #${existingTask.id})`);
    return null;
  }

  // Ensure the tracked tag exists
  const trackedTag = await ensureTrackedTag();

  // Determine urgency based on frequency
  let urgency = 'medium';
  switch (tracker.frequency) {
    case 'hourly':
      urgency = 'high';
      break;
    case 'daily':
      urgency = 'medium';
      break;
    case 'weekly':
    case 'monthly':
      urgency = 'low';
      break;
  }

  // Create the task
  const task = await Task.create({
    title: tracker.name,
    description: tracker.description || `Auto-generated task for tracker: ${tracker.name}`,
    dueDate: nextDueDate,
    urgency,
    categoryId: tracker.taskCategoryId || null,
    trackerId: tracker.id,
  });

  // Attach the tracked tag
  await task.setTags([trackedTag]);

  // Return task with associations
  const completeTask = await Task.findByPk(task.id, {
    include: [
      { model: require('../models/Category'), as: 'category' },
      { model: Tag, as: 'tags' },
    ],
  });

  console.log(`Created next task "${task.title}" for tracker ${tracker.id} with due date ${nextDueDate.toISOString()}`);

  return completeTask;
}

module.exports = {
  TRACKED_TAG_NAME,
  TRACKED_TAG_COLOR,
  ensureTrackedTag,
  calculateDueDate,
  calculateInitialScheduledDueDate,
  calculateNextDueDate,
  createTrackerTask,
  createNextTrackerTask,
  generateRecurringTasks,
  archiveStaleTasks,
  isTodayScheduled,
  findActiveTrackerTask,
  getPeriodStartDate,
};
