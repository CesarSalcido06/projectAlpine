/**
 * Project Alpine - Task Routes (Occurrence-Based)
 *
 * REST API endpoints for task CRUD operations.
 * Tracked tasks work with occurrence-based trackers - no period blocking.
 */

const express = require('express');
const { Op } = require('sequelize');
const { XP_REWARDS } = require('../models');
const {
  createNextTrackerTask,
  generateRecurringTasks,
  checkMissedOccurrences,
  getNextScheduledOccurrences,
} = require('../utils/taskGenerator');

const router = express.Router();

// Helper to calculate level from XP
function calculateLevel(totalXP) {
  let level = 1;
  let xpNeeded = 100;
  let totalNeeded = 0;

  while (totalXP >= totalNeeded + xpNeeded) {
    totalNeeded += xpNeeded;
    level++;
    xpNeeded = level * 100;
  }

  return level;
}

// Helper to get streak multiplier
function getStreakMultiplier(streak) {
  return Math.min(1 + streak * XP_REWARDS.streakBonus, XP_REWARDS.maxStreakMultiplier);
}

/**
 * Checks if today is a scheduled day for the tracker.
 * @param {Tracker} tracker - The tracker to check
 * @returns {boolean} True if today is a scheduled day
 */
function isTodayScheduledDay(tracker) {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0=Sun, 6=Sat
  const dateOfMonth = today.getDate(); // 1-31

  switch (tracker.frequency) {
    case 'hourly':
    case 'daily':
      return true; // Always scheduled

    case 'weekly':
      if (!tracker.scheduledDays || tracker.scheduledDays.length === 0) {
        return true; // No specific days = all days
      }
      return tracker.scheduledDays.includes(dayOfWeek);

    case 'monthly':
      if (!tracker.scheduledDatesOfMonth || tracker.scheduledDatesOfMonth.length === 0) {
        return true; // No specific dates = all dates
      }
      return tracker.scheduledDatesOfMonth.includes(dateOfMonth);

    default:
      return true;
  }
}

/**
 * Checks if the tracker has already been completed today.
 * @param {Tracker} tracker - The tracker to check
 * @returns {boolean} True if already completed today
 */
function isAlreadyCompletedToday(tracker) {
  if (!tracker.lastCompletedAt) {
    return false;
  }

  const lastCompleted = new Date(tracker.lastCompletedAt);
  const today = new Date();

  // For hourly, check if completed this hour
  if (tracker.frequency === 'hourly') {
    return lastCompleted.toDateString() === today.toDateString() &&
           lastCompleted.getHours() === today.getHours();
  }

  // For other frequencies, check if completed today
  return lastCompleted.toDateString() === today.toDateString();
}

/**
 * Logs progress to a tracker when a tracked task is completed.
 * Occurrence-based: each completion is independent.
 *
 * @param {Object} models - User-specific models
 * @param {number} trackerId - The tracker ID
 * @param {Task} task - The task being completed
 * @param {number} value - The value to log (default 1)
 * @returns {Promise<{tracker: Tracker, xpEarned: number, leveledUp: boolean}|null>}
 */
async function logProgressToTracker(models, trackerId, task, value = 1) {
  const { Tracker } = models;

  try {
    const tracker = await Tracker.findByPk(trackerId);
    if (!tracker) {
      console.error(`Tracker ${trackerId} not found`);
      return null;
    }

    const now = new Date();
    const occurrenceDate = task.dueDate ? new Date(task.dueDate) : now;

    // Check if previous occurrence was missed (for streak calculation)
    const { streakBroken } = await checkMissedOccurrences(models, tracker, occurrenceDate);

    // Calculate XP and streak
    const baseXP = XP_REWARDS[tracker.frequency];
    let newStreak;
    if (streakBroken) {
      newStreak = 1; // Start fresh
    } else {
      newStreak = tracker.currentStreak + 1;
    }

    const multiplier = getStreakMultiplier(newStreak);
    const xpEarned = Math.round(baseXP * multiplier);
    const newTotalXP = tracker.totalXP + xpEarned;
    const newLevel = calculateLevel(newTotalXP);
    const leveledUp = newLevel > tracker.level;

    // Update tracker - increment currentValue (resets at period boundary)
    await tracker.update({
      currentValue: tracker.currentValue + value,
      totalXP: newTotalXP,
      level: newLevel,
      totalCompletions: tracker.totalCompletions + 1,
      currentStreak: newStreak,
      bestStreak: Math.max(tracker.bestStreak, newStreak),
      lastCompletedAt: now,
      lastOccurrenceDate: occurrenceDate,
      consecutiveMissed: 0,
      successfulPeriods: tracker.successfulPeriods + 1,
      totalPeriods: tracker.totalPeriods + 1,
    });

    await tracker.reload();
    console.log(`Logged completion for tracker "${tracker.name}" - XP: +${xpEarned}, Streak: ${newStreak}`);

    return { tracker, xpEarned, leveledUp, streakBroken };
  } catch (error) {
    console.error(`Error logging progress to tracker ${trackerId}:`, error);
    return null;
  }
}

/**
 * Reverts progress from a tracker when a task is uncompleted.
 * Note: XP and streaks are NOT reverted - that would be too punishing.
 *
 * @param {Object} models - User-specific models
 * @param {number} trackerId - The tracker ID
 * @returns {Promise<Tracker|null>}
 */
async function revertProgressFromTracker(models, trackerId) {
  const { Tracker } = models;

  try {
    const tracker = await Tracker.findByPk(trackerId);
    if (!tracker) {
      console.error(`Tracker ${trackerId} not found`);
      return null;
    }

    // Only revert the completion count, not XP or streak
    // This prevents gaming but isn't too punishing
    await tracker.update({
      totalCompletions: Math.max(0, tracker.totalCompletions - 1),
      successfulPeriods: Math.max(0, tracker.successfulPeriods - 1),
    });

    await tracker.reload();
    console.log(`Reverted completion count for tracker "${tracker.name}"`);
    return tracker;
  } catch (error) {
    console.error(`Error reverting tracker ${trackerId}:`, error);
    return null;
  }
}

// ============================================================
// GET /api/tasks - List all tasks with optional filters
// ============================================================
router.get('/', async (req, res) => {
  try {
    const { Task, Category, Tag } = req.models;

    // Generate any missing recurring tasks
    await generateRecurringTasks(req.models);

    const {
      limit = 50,
      offset = 0,
      categoryId,
      tagId,
      status,
      urgency,
      startDate,
      endDate,
    } = req.query;

    const where = {};

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (status) {
      where.status = status;
    } else {
      // By default, exclude archived tasks
      where.status = { [Op.ne]: 'archived' };
    }

    if (urgency) {
      where.urgency = urgency;
    }

    if (startDate || endDate) {
      where.dueDate = {};
      if (startDate) where.dueDate[Op.gte] = new Date(startDate);
      if (endDate) where.dueDate[Op.lte] = new Date(endDate);
    }

    const include = [
      { model: Category, as: 'category' },
      { model: Tag, as: 'tags' },
    ];

    if (tagId) {
      include[1].where = { id: tagId };
    }

    const tasks = await Task.findAll({
      where,
      include,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [
        ['dueDate', 'ASC'],
        ['urgency', 'DESC'],
        ['createdAt', 'DESC'],
      ],
    });

    res.json(tasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// ============================================================
// GET /api/tasks/:id - Get single task by ID
// ============================================================
router.get('/:id', async (req, res) => {
  try {
    const { Task, Category, Tag } = req.models;

    const task = await Task.findByPk(req.params.id, {
      include: [
        { model: Category, as: 'category' },
        { model: Tag, as: 'tags' },
      ],
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json(task);
  } catch (error) {
    console.error('Error fetching task:', error);
    res.status(500).json({ error: 'Failed to fetch task' });
  }
});

// ============================================================
// POST /api/tasks - Create new task
// ============================================================
router.post('/', async (req, res) => {
  try {
    const { Task, Category, Tag } = req.models;
    const { title, description, dueDate, urgency, categoryId, tagIds } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const task = await Task.create({
      title: title.trim(),
      description: description?.trim() || null,
      dueDate: dueDate || null,
      urgency: urgency || 'medium',
      categoryId: categoryId || null,
    });

    if (tagIds && tagIds.length > 0) {
      const tags = await Tag.findAll({ where: { id: tagIds } });
      const filteredTags = tags.filter(tag => tag.name !== 'tracked');
      await task.setTags(filteredTags);
    }

    const completeTask = await Task.findByPk(task.id, {
      include: [
        { model: Category, as: 'category' },
        { model: Tag, as: 'tags' },
      ],
    });

    res.status(201).json(completeTask);
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// ============================================================
// PUT /api/tasks/:id - Update existing task
// ============================================================
router.put('/:id', async (req, res) => {
  try {
    const { Task, Category, Tag, Tracker } = req.models;

    const task = await Task.findByPk(req.params.id);

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const { title, description, dueDate, urgency, status, categoryId, tagIds } = req.body;

    const isBeingCompleted = status === 'completed' && task.status !== 'completed';
    const isBeingUncompleted = task.status === 'completed' &&
      (status === 'pending' || status === 'in_progress');
    const hasTracker = task.trackerId !== null;

    // Validation for tracked tasks being completed
    if (isBeingCompleted && hasTracker) {
      const tracker = await Tracker.findByPk(task.trackerId);

      if (tracker) {
        // Check 1: Is today a scheduled day?
        if (!isTodayScheduledDay(tracker)) {
          const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
          const today = dayNames[new Date().getDay()];
          let scheduledDaysStr = '';

          if (tracker.frequency === 'weekly' && tracker.scheduledDays?.length > 0) {
            scheduledDaysStr = tracker.scheduledDays.map(d => dayNames[d]).join(', ');
          } else if (tracker.frequency === 'monthly' && tracker.scheduledDatesOfMonth?.length > 0) {
            scheduledDaysStr = tracker.scheduledDatesOfMonth.join(', ');
          }

          return res.status(400).json({
            error: 'Not a scheduled day',
            message: `This tracker is not scheduled for ${today}. Scheduled: ${scheduledDaysStr}`,
          });
        }

        // Check 2: Already completed today? (only if targetValue is 1)
        if (tracker.targetValue === 1 && isAlreadyCompletedToday(tracker)) {
          return res.status(400).json({
            error: 'Already completed today',
            message: 'This tracker has already been completed today. Come back tomorrow!',
          });
        }
      }
    }

    // Update task fields
    await task.update({
      title: title !== undefined ? title.trim() : task.title,
      description: description !== undefined ? description?.trim() || null : task.description,
      dueDate: dueDate !== undefined ? dueDate || null : task.dueDate,
      urgency: urgency || task.urgency,
      status: status || task.status,
      categoryId: categoryId !== undefined ? categoryId || null : task.categoryId,
    });

    // Update tags if provided
    if (tagIds !== undefined) {
      if (tagIds.length > 0) {
        const tags = await Tag.findAll({ where: { id: tagIds } });
        let filteredTags = tags.filter(tag => tag.name !== 'tracked');

        if (hasTracker) {
          const trackedTag = await Tag.findOne({ where: { name: 'tracked' } });
          if (trackedTag && !filteredTags.find(t => t.id === trackedTag.id)) {
            filteredTags.push(trackedTag);
          }
        }
        await task.setTags(filteredTags);
      } else {
        if (hasTracker) {
          const trackedTag = await Tag.findOne({ where: { name: 'tracked' } });
          await task.setTags(trackedTag ? [trackedTag] : []);
        } else {
          await task.setTags([]);
        }
      }
    }

    // Fetch updated task
    const updatedTask = await Task.findByPk(task.id, {
      include: [
        { model: Category, as: 'category' },
        { model: Tag, as: 'tags' },
      ],
    });

    // Handle tracker integration
    let nextTask = null;
    let trackerUpdate = null;

    if (isBeingCompleted && hasTracker) {
      console.log(`Task "${task.title}" completed - logging to tracker ${task.trackerId}`);

      // Log progress to tracker (occurrence-based, no blocking)
      const result = await logProgressToTracker(req.models, task.trackerId, task);

      if (result) {
        trackerUpdate = {
          id: result.tracker.id,
          currentValue: result.tracker.currentValue,
          targetValue: result.tracker.targetValue,
          totalXP: result.tracker.totalXP,
          level: result.tracker.level,
          currentStreak: result.tracker.currentStreak,
          xpEarned: result.xpEarned,
          leveledUp: result.leveledUp,
        };

        // Create next occurrence task
        if (result.tracker.generateTasks) {
          try {
            nextTask = await createNextTrackerTask(req.models, result.tracker, task);
            if (nextTask) {
              console.log(`Created next task "${nextTask.title}" due ${nextTask.dueDate}`);
            }
          } catch (err) {
            console.error('Error creating next task:', err);
          }
        }
      }
    }

    if (isBeingUncompleted && hasTracker) {
      console.log(`Task "${task.title}" uncompleted - reverting tracker ${task.trackerId}`);
      const tracker = await revertProgressFromTracker(req.models, task.trackerId);
      if (tracker) {
        trackerUpdate = {
          id: tracker.id,
          currentValue: tracker.currentValue,
          targetValue: tracker.targetValue,
          totalXP: tracker.totalXP,
          level: tracker.level,
          currentStreak: tracker.currentStreak,
        };
      }
    }

    const response = updatedTask.toJSON();
    if (nextTask) {
      response.nextTask = nextTask;
    }
    if (trackerUpdate) {
      response.trackerUpdate = trackerUpdate;
    }

    res.json(response);
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// ============================================================
// DELETE /api/tasks/:id - Archive task (soft delete)
// ============================================================
router.delete('/:id', async (req, res) => {
  try {
    const { Task } = req.models;

    const task = await Task.findByPk(req.params.id);

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    await task.update({ status: 'archived' });

    res.json({ message: 'Task archived successfully' });
  } catch (error) {
    console.error('Error archiving task:', error);
    res.status(500).json({ error: 'Failed to archive task' });
  }
});

module.exports = router;
