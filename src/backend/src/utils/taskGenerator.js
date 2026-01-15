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
 * Creates a task for a tracker with the "tracked" tag attached.
 * @param {Tracker} tracker - The tracker to create a task for
 * @param {Object} options - Additional options
 * @param {Date} options.dueDate - Optional custom due date
 * @param {string} options.urgency - Optional urgency level (defaults to 'medium')
 * @returns {Promise<Task>} The created task with tags
 */
async function createTrackerTask(tracker, options = {}) {
  // Ensure the tracked tag exists
  const trackedTag = await ensureTrackedTag();

  // Calculate due date based on frequency
  const dueDate = options.dueDate || calculateDueDate(tracker.frequency);

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
 * Only creates tasks if there isn't already a pending/in_progress tracked task
 * for that tracker within the current period.
 * @returns {Promise<{created: Task[], skipped: number}>} Results of the generation
 */
async function generateRecurringTasks() {
  const results = {
    created: [],
    skipped: 0,
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
      console.log('No active trackers with task generation enabled');
      return results;
    }

    // Ensure tracked tag exists
    const trackedTag = await ensureTrackedTag();

    for (const tracker of trackers) {
      try {
        // Check if there's already an active task for this tracker
        const existingTask = await findActiveTrackerTask(tracker, trackedTag.id);

        if (existingTask) {
          console.log(`Skipping tracker "${tracker.name}" - active task already exists`);
          results.skipped++;
          continue;
        }

        // Create a new task for this tracker
        const task = await createTrackerTask(tracker);
        results.created.push(task);
      } catch (error) {
        console.error(`Error generating task for tracker ${tracker.id}:`, error);
        results.errors.push({ trackerId: tracker.id, error: error.message });
      }
    }

    console.log(`Task generation complete: ${results.created.length} created, ${results.skipped} skipped`);
    return results;
  } catch (error) {
    console.error('Error in generateRecurringTasks:', error);
    throw error;
  }
}

/**
 * Finds an existing active (pending/in_progress) task for a tracker.
 * @param {Tracker} tracker - The tracker to find tasks for
 * @param {number} trackedTagId - The ID of the tracked tag
 * @returns {Promise<Task|null>} The existing task or null
 */
async function findActiveTrackerTask(tracker, trackedTagId) {
  // Calculate the period start date based on frequency
  const periodStart = getPeriodStartDate(tracker.frequency);

  // Find tasks that:
  // 1. Have the tracked tag
  // 2. Match the tracker name
  // 3. Are pending or in_progress
  // 4. Have a due date within the current period
  const tasks = await Task.findAll({
    where: {
      title: tracker.name,
      status: { [Op.in]: ['pending', 'in_progress'] },
      dueDate: { [Op.gte]: periodStart },
    },
    include: [
      {
        model: Tag,
        as: 'tags',
        where: { id: trackedTagId },
      },
    ],
  });

  return tasks.length > 0 ? tasks[0] : null;
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

module.exports = {
  TRACKED_TAG_NAME,
  TRACKED_TAG_COLOR,
  ensureTrackedTag,
  calculateDueDate,
  createTrackerTask,
  generateRecurringTasks,
  findActiveTrackerTask,
  getPeriodStartDate,
};
