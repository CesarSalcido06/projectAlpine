/**
 * Project Alpine - Task Generator Utility
 *
 * Utility functions for automatic task generation from trackers.
 * Handles creation of the "tracked" tag and generating tasks based on tracker schedules.
 *
 * All functions accept a models object for per-user database isolation.
 */

const { Op } = require('sequelize');
const { FREQUENCIES, XP_REWARDS, ACHIEVEMENTS } = require('../models');

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
      // Use explicit date construction to avoid timezone issues
      return new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0, 0);

    case 'weekly':
      // Check if today is one of the scheduled days
      const scheduledDays = tracker.scheduledDays && tracker.scheduledDays.length > 0
        ? tracker.scheduledDays.sort((a, b) => a - b)
        : [now.getDay()]; // Default to current day

      const currentDay = now.getDay();
      const isTodayScheduled = scheduledDays.includes(currentDay);

      if (isTodayScheduled) {
        // Today is a scheduled day - due today at scheduled time
        // Use explicit date construction to avoid timezone issues
        return new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0, 0);
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
        const targetDate = new Date(now);
        targetDate.setDate(now.getDate() + daysToAdd);
        // Use explicit date construction to avoid timezone issues
        return new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), hours, minutes, 0, 0);
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
        // Use explicit date construction to avoid timezone issues
        return new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0, 0);
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
      // Use explicit date construction to avoid timezone issues
      return new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0, 0);
  }
}

/**
 * Creates a task for a tracker with the "tracked" tag attached.
 * Uses scheduling fields (scheduledTime, scheduledDays, scheduledDatesOfMonth) when set.
 * @param {Object} models - User-specific models
 * @param {Tracker} tracker - The tracker to create a task for
 * @param {Object} options - Additional options
 * @param {Date} options.dueDate - Optional custom due date
 * @param {string} options.urgency - Optional urgency level (defaults to 'medium')
 * @returns {Promise<Task>} The created task with tags
 */
async function createTrackerTask(models, tracker, options = {}) {
  const { Task, Tag, Category } = models;

  // Ensure the tracked tag exists
  const trackedTag = await ensureTrackedTag(models);

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
      { model: Category, as: 'category' },
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
 * @param {Object} models - User-specific models
 * @returns {Promise<{created: Task[], skipped: number, archived: number}>} Results of the generation
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

    // Ensure tracked tag exists
    const trackedTag = await ensureTrackedTag(models);

    for (const tracker of trackers) {
      try {
        // Step 1: Archive any stale pending tasks from PREVIOUS periods
        const archivedCount = await archiveStaleTasks(models, tracker);
        results.archived += archivedCount;

        // Step 2: Check if today is a scheduled day (for weekly/monthly)
        if (!isTodayScheduled(tracker)) {
          results.skipped++;
          continue;
        }

        // Step 3: Check if there's already an active task for this tracker in current period
        const existingTask = await findActiveTrackerTask(models, tracker, trackedTag.id);

        if (existingTask) {
          results.skipped++;
          continue;
        }

        // Step 4: Create a new task for the current period
        const task = await createTrackerTask(models, tracker);
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
 * @param {Object} models - User-specific models
 * @param {Tracker} tracker - The tracker to clean up
 * @returns {Promise<number>} Number of tasks archived
 */
async function archiveStaleTasks(models, tracker) {
  const { Task } = models;
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
 * @param {Object} models - User-specific models
 * @param {Tracker} tracker - The tracker to find tasks for
 * @param {number} trackedTagId - The ID of the tracked tag (unused, kept for compatibility)
 * @returns {Promise<Task|null>} The existing task or null
 */
async function findActiveTrackerTask(models, tracker, trackedTagId) {
  const { Task } = models;

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
  const baseDate = new Date(fromDate);

  switch (tracker.frequency) {
    case 'hourly':
      // Next hour at scheduled minutes (or top of hour)
      baseDate.setHours(baseDate.getHours() + 1);
      return new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), baseDate.getHours(), minutes, 0, 0);

    case 'daily':
      // Next day at scheduled time
      baseDate.setDate(baseDate.getDate() + 1);
      return new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), hours, minutes, 0, 0);

    case 'weekly':
      // Check if specific days are scheduled
      if (tracker.scheduledDays && tracker.scheduledDays.length > 0) {
        // Find next scheduled day of week
        const scheduledDays = tracker.scheduledDays.sort((a, b) => a - b);
        const currentDay = baseDate.getDay();
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

        baseDate.setDate(baseDate.getDate() + daysToAdd);
        return new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), hours, minutes, 0, 0);
      } else {
        // No specific days - default to end of NEXT week (Sunday)
        const currentDay = baseDate.getDay();
        const daysUntilNextSunday = currentDay === 0 ? 7 : 14 - currentDay; // Next week's Sunday
        baseDate.setDate(baseDate.getDate() + daysUntilNextSunday);
        return new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), 23, 59, 59, 0);
      }

    case 'monthly':
      // Check if specific dates are scheduled
      if (tracker.scheduledDatesOfMonth && tracker.scheduledDatesOfMonth.length > 0) {
        // Find next scheduled date of month
        const scheduledDates = tracker.scheduledDatesOfMonth.sort((a, b) => a - b);
        const currentDate = baseDate.getDate();
        const currentMonth = baseDate.getMonth();
        const currentYear = baseDate.getFullYear();

        // Check for next scheduled date in current month
        for (const date of scheduledDates) {
          if (date > currentDate) {
            // Ensure the date is valid for the current month
            const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
            if (date <= daysInMonth) {
              return new Date(currentYear, currentMonth, date, hours, minutes, 0, 0);
            }
          }
        }

        // If no date found this month, go to first scheduled date next month
        const nextMonth = currentMonth + 1;
        const nextYear = nextMonth > 11 ? currentYear + 1 : currentYear;
        const actualNextMonth = nextMonth % 12;
        const daysInNextMonth = new Date(nextYear, actualNextMonth + 1, 0).getDate();

        // Find first valid scheduled date in next month
        for (const date of scheduledDates) {
          if (date <= daysInNextMonth) {
            return new Date(nextYear, actualNextMonth, date, hours, minutes, 0, 0);
          }
        }

        // Fallback to 1st if no valid date found
        return new Date(nextYear, actualNextMonth, 1, hours, minutes, 0, 0);
      } else {
        // No specific dates - default to end of NEXT month
        const nextMonth = baseDate.getMonth() + 1;
        const nextYear = nextMonth > 11 ? baseDate.getFullYear() + 1 : baseDate.getFullYear();
        const actualNextMonth = nextMonth % 12;
        const lastDayOfNextMonth = new Date(nextYear, actualNextMonth + 1, 0).getDate();
        return new Date(nextYear, actualNextMonth, lastDayOfNextMonth, 23, 59, 59, 0);
      }

    default:
      // Default to next day at scheduled time
      baseDate.setDate(baseDate.getDate() + 1);
      return new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), hours, minutes, 0, 0);
  }
}

/**
 * Creates the next occurrence of a tracker task after one is completed.
 * Uses the tracker's schedule to determine the next due date.
 * IMPORTANT: Only creates if no pending task already exists for the next period.
 * @param {Object} models - User-specific models
 * @param {Tracker} tracker - The tracker to create the next task for
 * @param {Task} completedTask - The task that was just completed (for reference)
 * @returns {Promise<Task|null>} The newly created task, or null if one already exists
 */
async function createNextTrackerTask(models, tracker, completedTask) {
  const { Task, Tag, Category } = models;

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
  const trackedTag = await ensureTrackedTag(models);

  // Use tracker's configured urgency or default to medium
  const urgency = tracker.taskUrgency || 'medium';

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
      { model: Category, as: 'category' },
      { model: Tag, as: 'tags' },
    ],
  });

  console.log(`Created next task "${task.title}" for tracker ${tracker.id} with due date ${nextDueDate.toISOString()}`);

  return completeTask;
}

/**
 * Creates tasks for ALL scheduled occurrences in the current week/month.
 * For weekly trackers with Mon/Wed/Fri, this creates 3 tasks.
 * For monthly trackers with specific dates, creates tasks for all those dates.
 * @param {Object} models - User-specific models
 * @param {Tracker} tracker - The tracker to create tasks for
 * @returns {Promise<Task[]>} Array of created tasks
 */
async function createAllScheduledTasks(models, tracker) {
  const { Task, Tag, Category } = models;

  const tasks = [];
  const trackedTag = await ensureTrackedTag(models);
  const { hours, minutes } = parseScheduledTime(tracker.scheduledTime);
  const now = new Date();

  // Use tracker's configured urgency or default to medium
  const urgency = tracker.taskUrgency || 'medium';

  if (tracker.frequency === 'weekly' && tracker.scheduledDays && tracker.scheduledDays.length > 0) {
    // For weekly trackers, create tasks for all scheduled days in current and next week
    const scheduledDays = tracker.scheduledDays.sort((a, b) => a - b);
    const currentDay = now.getDay();

    for (const day of scheduledDays) {
      let daysToAdd = day - currentDay;
      if (daysToAdd < 0) {
        // Day already passed this week, schedule for next week
        daysToAdd += 7;
      }

      // Calculate the target date first
      const targetDate = new Date(now);
      targetDate.setDate(now.getDate() + daysToAdd);

      // Create the due date with explicit components to avoid timezone issues
      const dueDate = new Date(
        targetDate.getFullYear(),
        targetDate.getMonth(),
        targetDate.getDate(),
        hours,
        minutes,
        0,
        0
      );

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

      // Fetch complete task with associations
      const completeTask = await Task.findByPk(task.id, {
        include: [
          { model: Category, as: 'category' },
          { model: Tag, as: 'tags' },
        ],
      });

      tasks.push(completeTask);
      console.log(`Created task "${task.title}" for ${getDayName(day)} (${dueDate.toISOString()})`);
    }
  } else if (tracker.frequency === 'monthly' && tracker.scheduledDatesOfMonth && tracker.scheduledDatesOfMonth.length > 0) {
    // For monthly trackers, create tasks for all scheduled dates in current month
    const scheduledDates = tracker.scheduledDatesOfMonth.sort((a, b) => a - b);
    const currentDate = now.getDate();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    for (const date of scheduledDates) {
      if (date > daysInMonth) continue; // Skip invalid dates for this month

      const dueDate = new Date(currentYear, currentMonth, date, hours, minutes, 0, 0);

      // Skip dates in the past
      if (dueDate < now) continue;

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

      // Fetch complete task with associations
      const completeTask = await Task.findByPk(task.id, {
        include: [
          { model: Category, as: 'category' },
          { model: Tag, as: 'tags' },
        ],
      });

      tasks.push(completeTask);
      console.log(`Created task "${task.title}" for ${date}/${currentMonth + 1} (${dueDate.toISOString()})`);
    }
  } else if (tracker.frequency === 'weekly') {
    // Weekly frequency with no specific days - default to end of week (Sunday)
    // Task can be completed anytime during the week
    const { hours, minutes } = parseScheduledTime(tracker.scheduledTime);

    // Calculate end of current week (Sunday)
    const currentDay = now.getDay();
    const daysUntilSunday = currentDay === 0 ? 0 : 7 - currentDay;

    const targetDate = new Date(now);
    targetDate.setDate(now.getDate() + daysUntilSunday);
    const dueDate = new Date(
      targetDate.getFullYear(),
      targetDate.getMonth(),
      targetDate.getDate(),
      23, 59, 59, 0 // End of day
    );

    const task = await Task.create({
      title: tracker.name,
      description: tracker.description || `Auto-generated task for tracker: ${tracker.name}`,
      dueDate,
      urgency: tracker.taskUrgency || 'medium',
      categoryId: tracker.taskCategoryId || null,
      trackerId: tracker.id,
    });

    await task.setTags([trackedTag]);

    const completeTask = await Task.findByPk(task.id, {
      include: [
        { model: Category, as: 'category' },
        { model: Tag, as: 'tags' },
      ],
    });

    tasks.push(completeTask);
    console.log(`Created task "${task.title}" for end of week (${dueDate.toISOString()})`);
  } else if (tracker.frequency === 'monthly') {
    // Monthly frequency with no specific dates - default to end of month
    // Task can be completed anytime during the month
    const { hours, minutes } = parseScheduledTime(tracker.scheduledTime);

    // Calculate end of current month
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const dueDate = new Date(
      now.getFullYear(),
      now.getMonth(),
      lastDayOfMonth,
      23, 59, 59, 0 // End of day
    );

    const task = await Task.create({
      title: tracker.name,
      description: tracker.description || `Auto-generated task for tracker: ${tracker.name}`,
      dueDate,
      urgency: tracker.taskUrgency || 'medium',
      categoryId: tracker.taskCategoryId || null,
      trackerId: tracker.id,
    });

    await task.setTags([trackedTag]);

    const completeTask = await Task.findByPk(task.id, {
      include: [
        { model: Category, as: 'category' },
        { model: Tag, as: 'tags' },
      ],
    });

    tasks.push(completeTask);
    console.log(`Created task "${task.title}" for end of month (${dueDate.toISOString()})`);
  } else {
    // For daily/hourly, create single task for today
    const task = await createTrackerTask(models, tracker);
    if (task) tasks.push(task);
  }

  return tasks;
}

/**
 * Gets the name of a day from its number (0-6)
 */
function getDayName(dayNum) {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[dayNum] || 'Unknown';
}

/**
 * Calculates the end date of a period given a start date and frequency.
 * @param {string} frequency - The frequency (hourly, daily, weekly, monthly)
 * @param {Date} periodStart - The start of the period
 * @returns {Date} The end of the period
 */
function getPeriodEndDate(frequency, periodStart) {
  const end = new Date(periodStart);

  switch (frequency) {
    case 'hourly':
      end.setHours(end.getHours() + 1);
      break;
    case 'daily':
      end.setDate(end.getDate() + 1);
      break;
    case 'weekly':
      end.setDate(end.getDate() + 7);
      break;
    case 'monthly':
      end.setMonth(end.getMonth() + 1);
      break;
    default:
      end.setDate(end.getDate() + 1);
  }

  return end;
}

/**
 * Checks and resets tracker periods for all active trackers.
 * This function evaluates elapsed periods and:
 * - Breaks streaks if goals weren't met
 * - Resets currentValue for new periods
 * - Tracks consecutiveMissed periods
 * - Auto-archives trackers with 7+ consecutive misses
 *
 * @param {Object} models - User-specific models
 * @returns {Promise<{evaluated: number, reset: number, archived: number}>} Results
 */
async function checkAndResetTrackerPeriods(models) {
  const { Tracker } = models;

  const results = {
    evaluated: 0,
    reset: 0,
    archived: 0,
    errors: [],
  };

  try {
    // Get all active, non-paused trackers
    const trackers = await Tracker.findAll({
      where: {
        isActive: true,
        isPaused: false,
      },
    });

    const now = new Date();

    for (const tracker of trackers) {
      try {
        results.evaluated++;

        // Get the current period start for this frequency
        const currentPeriodStart = getPeriodStartDate(tracker.frequency);
        const trackerPeriodStart = new Date(tracker.periodStartDate);

        // If tracker's period is already current, no reset needed
        if (trackerPeriodStart >= currentPeriodStart) {
          continue;
        }

        // Calculate how many periods have elapsed
        let periodsElapsed = 0;
        let periodCheck = new Date(trackerPeriodStart);

        while (getPeriodEndDate(tracker.frequency, periodCheck) <= now) {
          periodsElapsed++;
          periodCheck = getPeriodEndDate(tracker.frequency, periodCheck);

          // Safety limit to prevent infinite loops
          if (periodsElapsed > 365) break;
        }

        if (periodsElapsed === 0) {
          continue;
        }

        // Evaluate each missed period
        let newStreak = tracker.currentStreak;
        let newConsecutiveMissed = tracker.consecutiveMissed || 0;
        let totalPeriodsToAdd = periodsElapsed;
        let successfulPeriodsToAdd = 0;

        // The first elapsed period might have been completed
        // (if currentValue >= targetValue when that period ended)
        const wasFirstPeriodComplete = tracker.currentValue >= tracker.targetValue;

        if (wasFirstPeriodComplete) {
          // First period was successful
          newStreak++;
          successfulPeriodsToAdd++;
          newConsecutiveMissed = 0;

          // Remaining periods (2nd onward) were all missed
          const missedPeriods = periodsElapsed - 1;
          if (missedPeriods > 0) {
            newStreak = 0; // Streak broken
            newConsecutiveMissed = missedPeriods;
          }
        } else {
          // First period was NOT completed, all periods are missed
          newStreak = 0;
          newConsecutiveMissed += periodsElapsed;
        }

        // Update best streak if applicable
        const newBestStreak = Math.max(tracker.bestStreak, newStreak);

        // Check for auto-archive (7+ consecutive missed periods)
        const shouldArchive = newConsecutiveMissed >= 7;

        // Update the tracker
        await tracker.update({
          currentValue: 0,
          periodStartDate: currentPeriodStart,
          currentStreak: newStreak,
          bestStreak: newBestStreak,
          consecutiveMissed: newConsecutiveMissed,
          totalPeriods: tracker.totalPeriods + totalPeriodsToAdd,
          successfulPeriods: tracker.successfulPeriods + successfulPeriodsToAdd,
          isActive: !shouldArchive,
        });

        results.reset++;

        if (shouldArchive) {
          results.archived++;
          console.log(`Auto-archived tracker "${tracker.name}" after ${newConsecutiveMissed} consecutive missed periods`);
        } else {
          console.log(`Reset tracker "${tracker.name}": ${periodsElapsed} periods elapsed, streak=${newStreak}, missed=${newConsecutiveMissed}`);
        }
      } catch (error) {
        console.error(`Error resetting tracker ${tracker.id}:`, error);
        results.errors.push({ trackerId: tracker.id, error: error.message });
      }
    }

    return results;
  } catch (error) {
    console.error('Error in checkAndResetTrackerPeriods:', error);
    throw error;
  }
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
  createAllScheduledTasks,
  generateRecurringTasks,
  archiveStaleTasks,
  isTodayScheduled,
  findActiveTrackerTask,
  getPeriodStartDate,
  getPeriodEndDate,
  checkAndResetTrackerPeriods,
};
