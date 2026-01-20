/**
 * Project Alpine - Task Routes
 *
 * REST API endpoints for task CRUD operations.
 */

const express = require('express');
const { Op } = require('sequelize');
const { XP_REWARDS } = require('../models');
const { createNextTrackerTask, generateRecurringTasks } = require('../utils/taskGenerator');

const router = express.Router();

/**
 * Helper function to log progress to a tracker.
 * This is called when a tracked task is marked as completed.
 * @param {Object} models - User-specific models
 * @param {number} trackerId - The tracker ID
 * @param {number} value - The value to log (default 1)
 * @returns {Promise<Tracker|null>} The updated tracker or null
 */
async function logProgressToTracker(models, trackerId, value = 1) {
  const { Tracker } = models;

  try {
    const tracker = await Tracker.findByPk(trackerId);
    if (!tracker) {
      console.error(`Tracker ${trackerId} not found for logging progress`);
      return null;
    }

    // Check if we need to reset for new period
    const now = new Date();
    const periodStart = new Date(tracker.periodStartDate);
    let needsReset = false;

    switch (tracker.frequency) {
      case 'hourly':
        needsReset = now.getTime() - periodStart.getTime() > 3600000;
        break;
      case 'daily':
        needsReset = now.toDateString() !== periodStart.toDateString();
        break;
      case 'weekly':
        const weekMs = 7 * 24 * 60 * 60 * 1000;
        needsReset = now.getTime() - periodStart.getTime() > weekMs;
        break;
      case 'monthly':
        needsReset = now.getMonth() !== periodStart.getMonth() ||
          now.getFullYear() !== periodStart.getFullYear();
        break;
    }

    if (needsReset) {
      // Check if previous period was successful
      const wasSuccessful = tracker.currentValue >= tracker.targetValue;

      await tracker.update({
        currentValue: value,
        periodStartDate: now,
        totalPeriods: tracker.totalPeriods + 1,
        successfulPeriods: tracker.successfulPeriods + (wasSuccessful ? 1 : 0),
        // Reset streak if period was missed
        currentStreak: wasSuccessful ? tracker.currentStreak : 0,
      });
    } else {
      await tracker.update({
        currentValue: tracker.currentValue + value,
      });
    }

    // Check if goal completed this period
    const goalCompleted = tracker.currentValue >= tracker.targetValue;

    if (goalCompleted && !tracker.lastCompletedAt) {
      // First completion of this period - award XP
      const baseXP = XP_REWARDS[tracker.frequency];
      const multiplier = Math.min(1 + tracker.currentStreak * XP_REWARDS.streakBonus, XP_REWARDS.maxStreakMultiplier);
      const xpEarned = Math.round(baseXP * multiplier);

      const newTotalXP = tracker.totalXP + xpEarned;
      // Calculate new level
      let level = 1;
      let xpNeeded = 100;
      let totalNeeded = 0;
      while (newTotalXP >= totalNeeded + xpNeeded) {
        totalNeeded += xpNeeded;
        level++;
        xpNeeded = level * 100;
      }
      const newStreak = tracker.currentStreak + 1;

      await tracker.update({
        totalXP: newTotalXP,
        level: level,
        totalCompletions: tracker.totalCompletions + 1,
        currentStreak: newStreak,
        bestStreak: Math.max(tracker.bestStreak, newStreak),
        lastCompletedAt: now,
      });
    }

    await tracker.reload();
    console.log(`Logged progress (${value}) to tracker "${tracker.name}" (${trackerId})`);
    return tracker;
  } catch (error) {
    console.error(`Error logging progress to tracker ${trackerId}:`, error);
    return null;
  }
}

/**
 * Helper function to revert progress from a tracker.
 * This is called when a tracked task is "uncompleted" (changed from completed to pending/in_progress).
 * Note: XP and streaks are NOT reverted - that would be too punishing.
 * @param {Object} models - User-specific models
 * @param {number} trackerId - The tracker ID
 * @param {number} value - The value to decrement (default 1)
 * @returns {Promise<Tracker|null>} The updated tracker or null
 */
async function revertProgressFromTracker(models, trackerId, value = 1) {
  const { Tracker } = models;

  try {
    const tracker = await Tracker.findByPk(trackerId);
    if (!tracker) {
      console.error(`Tracker ${trackerId} not found for reverting progress`);
      return null;
    }

    // Calculate new currentValue, ensuring it doesn't go below 0
    const newCurrentValue = Math.max(0, tracker.currentValue - value);

    // Check if the goal was previously complete and now isn't
    const wasGoalComplete = tracker.currentValue >= tracker.targetValue;
    const isGoalStillComplete = newCurrentValue >= tracker.targetValue;

    const updates = {
      currentValue: newCurrentValue,
    };

    // If goal was complete but now isn't, clear lastCompletedAt
    // Note: We do NOT revert XP or streak - those are permanent rewards
    if (wasGoalComplete && !isGoalStillComplete) {
      updates.lastCompletedAt = null;
      console.log(`Tracker "${tracker.name}" goal is no longer complete (${newCurrentValue}/${tracker.targetValue})`);
    }

    await tracker.update(updates);
    await tracker.reload();

    console.log(`Reverted progress (-${value}) from tracker "${tracker.name}" (${trackerId}): ${tracker.currentValue + value} -> ${newCurrentValue}`);
    return tracker;
  } catch (error) {
    console.error(`Error reverting progress from tracker ${trackerId}:`, error);
    return null;
  }
}

// ============================================================
// GET /api/tasks - List all tasks with optional filters
// ============================================================
router.get('/', async (req, res) => {
  try {
    const { Task, Category, Tag } = req.models;

    // Lazy generation: ensure recurring tasks exist for current period
    // This runs on every task list request but is fast (checks then skips if tasks exist)
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

    // Build where clause based on filters
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

    // Date range filter
    if (startDate || endDate) {
      where.dueDate = {};
      if (startDate) where.dueDate[Op.gte] = new Date(startDate);
      if (endDate) where.dueDate[Op.lte] = new Date(endDate);
    }

    // Build include options
    const include = [
      { model: Category, as: 'category' },
      { model: Tag, as: 'tags' },
    ];

    // If filtering by tag, add tag constraint
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

    // Validate required fields
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Title is required' });
    }

    // Create task
    const task = await Task.create({
      title: title.trim(),
      description: description?.trim() || null,
      dueDate: dueDate || null,
      urgency: urgency || 'medium',
      categoryId: categoryId || null,
    });

    // Associate tags if provided (excluding system "tracked" tag)
    if (tagIds && tagIds.length > 0) {
      const tags = await Tag.findAll({ where: { id: tagIds } });
      // Filter out the "tracked" tag - it can only be assigned by the tracker system
      const filteredTags = tags.filter(tag => tag.name !== 'tracked');
      await task.setTags(filteredTags);
    }

    // Fetch complete task with associations
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

    // Check if task is being marked as completed and has a trackerId
    const isBeingCompleted = status === 'completed' && task.status !== 'completed';
    // Check if task is being "uncompleted" (changed from completed to pending/in_progress)
    const isBeingUncompleted = task.status === 'completed' &&
      (status === 'pending' || status === 'in_progress');
    const hasTracker = task.trackerId !== null;

    // Prevent completing tracker tasks outside their period
    // Weekly/Monthly tasks can be completed anytime within their period
    // Daily/Hourly tasks must be completed on or after their due date
    if (isBeingCompleted && hasTracker && task.dueDate) {
      const { Tracker } = req.models;
      const tracker = await Tracker.findByPk(task.trackerId);

      if (tracker) {
        const now = new Date();
        const taskDueDate = new Date(task.dueDate);
        let canComplete = false;

        switch (tracker.frequency) {
          case 'monthly':
            // Can complete if we're in the same month as the due date
            canComplete = now.getFullYear() === taskDueDate.getFullYear() &&
                         now.getMonth() === taskDueDate.getMonth();
            break;

          case 'weekly':
            // Can complete if we're in the same week as the due date
            // Week runs from Monday (day 1) to Sunday (day 0)
            // For a task due on Sunday, the whole preceding week can complete it
            const getWeekNumber = (date) => {
              const d = new Date(date);
              d.setHours(0, 0, 0, 0);
              // Adjust so Monday is day 0 and Sunday is day 6
              const dayNum = d.getDay() === 0 ? 6 : d.getDay() - 1;
              // Set to Monday of this week
              d.setDate(d.getDate() - dayNum);
              return d.getTime();
            };
            const nowWeekNum = getWeekNumber(now);
            const dueWeekNum = getWeekNumber(taskDueDate);
            canComplete = nowWeekNum === dueWeekNum;
            break;

          case 'daily':
          case 'hourly':
          default:
            // Must be on or after the due date
            const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const dueDateStart = new Date(taskDueDate.getFullYear(), taskDueDate.getMonth(), taskDueDate.getDate());
            canComplete = todayStart >= dueDateStart;
            break;
        }

        if (!canComplete) {
          const periodName = tracker.frequency === 'monthly' ? 'month' :
                            tracker.frequency === 'weekly' ? 'week' : 'day';
          return res.status(400).json({
            error: 'Cannot complete future tracker task',
            message: `This task is for a future ${periodName}. You can only complete tracker tasks within their scheduled period.`
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
        // Filter out manually added "tracked" tag - it can only be assigned by tracker system
        let filteredTags = tags.filter(tag => tag.name !== 'tracked');

        // If this is a tracker task, preserve the "tracked" tag
        if (hasTracker) {
          const trackedTag = await Tag.findOne({ where: { name: 'tracked' } });
          if (trackedTag && !filteredTags.find(t => t.id === trackedTag.id)) {
            filteredTags.push(trackedTag);
          }
        }
        await task.setTags(filteredTags);
      } else {
        // If clearing all tags but this is a tracker task, keep the "tracked" tag
        if (hasTracker) {
          const trackedTag = await Tag.findOne({ where: { name: 'tracked' } });
          await task.setTags(trackedTag ? [trackedTag] : []);
        } else {
          await task.setTags([]);
        }
      }
    }

    // Fetch updated task with associations
    const updatedTask = await Task.findByPk(task.id, {
      include: [
        { model: Category, as: 'category' },
        { model: Tag, as: 'tags' },
      ],
    });

    // Handle auto-repeat for tracked tasks
    let nextTask = null;
    let trackerUpdate = null;

    if (isBeingCompleted && hasTracker) {
      // First check if the tracker's period goal is already complete
      const tracker = await Tracker.findByPk(task.trackerId);

      if (tracker && tracker.currentValue >= tracker.targetValue) {
        // Goal already met for this period - don't allow completion
        console.log(`Task completion blocked - tracker "${tracker.name}" goal already met (${tracker.currentValue}/${tracker.targetValue})`);
        // Revert the status change
        await task.update({ status: 'pending' });
        return res.status(400).json({
          error: 'Goal already completed for this period',
          message: `You've already completed your ${tracker.frequency} goal of ${tracker.targetValue} ${tracker.targetUnit}. Next task will be available tomorrow.`
        });
      }

      console.log(`Task "${task.title}" completed - triggering auto-repeat for tracker ${task.trackerId}`);

      // 1. Log progress to the tracker
      trackerUpdate = await logProgressToTracker(req.models, task.trackerId);

      // 2. Create the next occurrence based on the tracker's schedule (only if generateTasks is enabled)
      if (trackerUpdate && trackerUpdate.generateTasks) {
        try {
          nextTask = await createNextTrackerTask(req.models, trackerUpdate, task);
          if (nextTask) {
            console.log(`Created next task "${nextTask.title}" with due date ${nextTask.dueDate}`);
          }
        } catch (taskError) {
          console.error('Error creating next tracker task:', taskError);
          // Don't fail the update, just log the error
        }
      }
    }

    // Handle uncompleting tracked tasks
    if (isBeingUncompleted && hasTracker) {
      console.log(`Task "${task.title}" uncompleted - reverting progress for tracker ${task.trackerId}`);
      trackerUpdate = await revertProgressFromTracker(req.models, task.trackerId);
    }

    // Build response with optional nextTask
    const response = updatedTask.toJSON();
    if (nextTask) {
      response.nextTask = nextTask;
    }
    if (trackerUpdate) {
      response.trackerUpdate = {
        id: trackerUpdate.id,
        currentValue: trackerUpdate.currentValue,
        targetValue: trackerUpdate.targetValue,
        totalXP: trackerUpdate.totalXP,
        level: trackerUpdate.level,
        currentStreak: trackerUpdate.currentStreak,
      };
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

    // Soft delete - set status to archived
    await task.update({ status: 'archived' });

    res.json({ message: 'Task archived successfully' });
  } catch (error) {
    console.error('Error archiving task:', error);
    res.status(500).json({ error: 'Failed to archive task' });
  }
});

module.exports = router;
