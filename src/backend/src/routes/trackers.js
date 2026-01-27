/**
 * Project Alpine - Tracker Routes (Occurrence-Based)
 *
 * REST API endpoints for gamified goal tracking.
 * Each scheduled occurrence is independent - streaks count
 * consecutive occurrences, not periods.
 */

const express = require('express');
const { Op } = require('sequelize');
const { XP_REWARDS, ACHIEVEMENTS } = require('../models');
const {
  ensureTrackedTag,
  createTrackerTask,
  createAllScheduledTasks,
  generateRecurringTasks,
  createNextTrackerTask,
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

// Helper to get XP progress
function getXPProgress(totalXP, level) {
  let totalNeeded = 0;
  for (let i = 1; i < level; i++) {
    totalNeeded += i * 100;
  }
  const currentLevelXP = totalXP - totalNeeded;
  const nextLevelXP = level * 100;

  return {
    current: currentLevelXP,
    needed: nextLevelXP,
    percentage: Math.min(100, Math.round((currentLevelXP / nextLevelXP) * 100)),
  };
}

// Helper to get streak multiplier
function getStreakMultiplier(streak) {
  return Math.min(1 + streak * XP_REWARDS.streakBonus, XP_REWARDS.maxStreakMultiplier);
}

/**
 * Checks if today is a scheduled day for the tracker.
 * Uses UTC to match how tasks are created and stored.
 */
function isTodayScheduledDay(tracker) {
  const today = new Date();
  const dayOfWeek = today.getUTCDay();
  const dateOfMonth = today.getUTCDate();

  switch (tracker.frequency) {
    case 'hourly':
    case 'daily':
      return true;
    case 'weekly':
      if (!tracker.scheduledDays || tracker.scheduledDays.length === 0) return true;
      return tracker.scheduledDays.includes(dayOfWeek);
    case 'monthly':
      if (!tracker.scheduledDatesOfMonth || tracker.scheduledDatesOfMonth.length === 0) return true;
      return tracker.scheduledDatesOfMonth.includes(dateOfMonth);
    default:
      return true;
  }
}

/**
 * Checks if the tracker has already been completed today.
 * Uses UTC to match how tasks are created and stored.
 */
function isAlreadyCompletedToday(tracker) {
  if (!tracker.lastCompletedAt) return false;

  const lastCompleted = new Date(tracker.lastCompletedAt);
  const today = new Date();

  // Compare using UTC dates
  const lastCompletedUTC = Date.UTC(lastCompleted.getUTCFullYear(), lastCompleted.getUTCMonth(), lastCompleted.getUTCDate());
  const todayUTC = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());

  if (tracker.frequency === 'hourly') {
    return lastCompletedUTC === todayUTC && lastCompleted.getUTCHours() === today.getUTCHours();
  }

  return lastCompletedUTC === todayUTC;
}

// ============================================================
// GET /api/trackers - List all trackers
// ============================================================
router.get('/', async (req, res) => {
  try {
    const { Tracker, Task } = req.models;

    // Generate any missing tasks for upcoming occurrences
    await generateRecurringTasks(req.models);

    const { active } = req.query;

    const where = {};
    if (active === 'true') where.isActive = true;
    if (active === 'false') where.isActive = false;

    const trackers = await Tracker.findAll({
      where,
      order: [['updatedAt', 'DESC']],
      include: [
        {
          model: Task,
          as: 'tasks',
          where: { status: { [Op.in]: ['pending', 'in_progress'] } },
          required: false,
          order: [['dueDate', 'ASC']],
        },
      ],
    });

    const now = new Date();

    // Enhance with computed fields
    const enhanced = trackers.map((tracker) => {
      const data = tracker.toJSON();

      // Progress is per occurrence (e.g., 1 of 1 for today's BJJ)
      data.progressPercentage = Math.min(100, Math.round((data.currentValue / data.targetValue) * 100));
      data.xpProgress = getXPProgress(data.totalXP, data.level);
      data.streakMultiplier = getStreakMultiplier(data.currentStreak);

      // Get next occurrence info
      const nextOccurrences = getNextScheduledOccurrences(tracker, now, 1);
      if (nextOccurrences.length > 0) {
        data.nextOccurrence = nextOccurrences[0].toISOString();
      }

      // Calculate pending count for this frequency
      if (data.tasks && data.tasks.length > 0) {
        data.tasks.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
        data.pendingCount = data.tasks.length;
        // Keep only first task for display
        data.tasks = [data.tasks[0]];
      } else {
        data.pendingCount = 0;
      }

      // Check if any pending task is overdue
      if (data.tasks && data.tasks.length > 0) {
        const firstTask = data.tasks[0];
        const taskDue = new Date(firstTask.dueDate);
        data.isOverdue = taskDue < now;
      } else {
        data.isOverdue = false;
      }

      return data;
    });

    res.json(enhanced);
  } catch (error) {
    console.error('Error fetching trackers:', error);
    res.status(500).json({ error: 'Failed to fetch trackers' });
  }
});

// ============================================================
// GET /api/trackers/stats - Get overall tracking stats
// ============================================================
router.get('/stats', async (req, res) => {
  try {
    const { Tracker } = req.models;

    const trackers = await Tracker.findAll({ where: { isActive: true } });

    const totalXP = trackers.reduce((sum, t) => sum + t.totalXP, 0);
    const totalCompletions = trackers.reduce((sum, t) => sum + t.totalCompletions, 0);
    const avgLevel = trackers.length > 0
      ? Math.round(trackers.reduce((sum, t) => sum + t.level, 0) / trackers.length)
      : 1;
    const longestStreak = Math.max(...trackers.map((t) => t.bestStreak), 0);
    const currentStreaks = trackers.filter((t) => t.currentStreak > 0).length;

    res.json({
      totalTrackers: trackers.length,
      totalXP,
      totalCompletions,
      avgLevel,
      longestStreak,
      activeStreaks: currentStreaks,
      achievements: ACHIEVEMENTS,
    });
  } catch (error) {
    console.error('Error fetching tracker stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// ============================================================
// GET /api/trackers/tracked-tag - Get or create the "tracked" tag
// ============================================================
router.get('/tracked-tag', async (req, res) => {
  try {
    const tag = await ensureTrackedTag(req.models);
    res.json(tag);
  } catch (error) {
    console.error('Error getting tracked tag:', error);
    res.status(500).json({ error: 'Failed to get tracked tag' });
  }
});

// ============================================================
// POST /api/trackers/generate-tasks - Generate recurring tasks
// ============================================================
router.post('/generate-tasks', async (req, res) => {
  try {
    const results = await generateRecurringTasks(req.models);

    res.json({
      message: 'Task generation completed',
      created: results.created.length,
      skipped: results.skipped,
      archived: results.archived,
      errors: results.errors.length,
      tasks: results.created,
    });
  } catch (error) {
    console.error('Error generating recurring tasks:', error);
    res.status(500).json({ error: 'Failed to generate recurring tasks' });
  }
});

// ============================================================
// GET /api/trackers/:id - Get single tracker
// ============================================================
router.get('/:id', async (req, res) => {
  try {
    const { Tracker } = req.models;

    const tracker = await Tracker.findByPk(req.params.id);

    if (!tracker) {
      return res.status(404).json({ error: 'Tracker not found' });
    }

    const data = tracker.toJSON();
    data.progressPercentage = Math.min(100, Math.round((data.currentValue / data.targetValue) * 100));
    data.xpProgress = getXPProgress(data.totalXP, data.level);
    data.streakMultiplier = getStreakMultiplier(data.currentStreak);

    res.json(data);
  } catch (error) {
    console.error('Error fetching tracker:', error);
    res.status(500).json({ error: 'Failed to fetch tracker' });
  }
});

// ============================================================
// GET /api/trackers/:id/tasks - Get all tasks for a tracker
// ============================================================
router.get('/:id/tasks', async (req, res) => {
  try {
    const { Tracker, Task, Category, Tag } = req.models;

    const tracker = await Tracker.findByPk(req.params.id);

    if (!tracker) {
      return res.status(404).json({ error: 'Tracker not found' });
    }

    const { status } = req.query;
    const where = { trackerId: tracker.id };

    if (status) {
      where.status = status;
    }

    const tasks = await Task.findAll({
      where,
      order: [['dueDate', 'ASC']],
      include: [
        { model: Category, as: 'category' },
        { model: Tag, as: 'tags' },
      ],
    });

    res.json(tasks);
  } catch (error) {
    console.error('Error fetching tracker tasks:', error);
    res.status(500).json({ error: 'Failed to fetch tracker tasks' });
  }
});

// ============================================================
// POST /api/trackers - Create new tracker
// ============================================================
router.post('/', async (req, res) => {
  try {
    const { Tracker } = req.models;

    const {
      name,
      description,
      icon,
      color,
      targetValue,
      targetUnit,
      frequency,
      generateTasks,
      taskCategoryId,
      taskUrgency,
      scheduledTime,
      scheduledDays,
      scheduledDatesOfMonth,
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const tracker = await Tracker.create({
      name: name.trim(),
      description,
      icon: icon || '🎯',
      color: color || '#805AD5',
      targetValue: targetValue || 1,
      targetUnit: targetUnit || 'times',
      frequency: frequency || 'daily',
      generateTasks: true, // Always enabled
      taskCategoryId,
      taskUrgency: taskUrgency || 'medium',
      periodStartDate: new Date(),
      scheduledTime: scheduledTime || null,
      scheduledDays: scheduledDays || null,
      scheduledDatesOfMonth: scheduledDatesOfMonth || null,
    });

    // Create tasks for upcoming occurrences
    let generatedTasks = [];
    try {
      generatedTasks = await createAllScheduledTasks(req.models, tracker);
      console.log(`Generated ${generatedTasks.length} task(s) for tracker "${tracker.name}"`);
    } catch (taskError) {
      console.error('Error generating initial tasks:', taskError);
    }

    const response = tracker.toJSON();
    if (generatedTasks.length > 0) {
      response.generatedTasks = generatedTasks;
      response.generatedTask = generatedTasks[0];
    }

    res.status(201).json(response);
  } catch (error) {
    console.error('Error creating tracker:', error);
    res.status(500).json({ error: 'Failed to create tracker' });
  }
});

// ============================================================
// PUT /api/trackers/:id - Update tracker
// ============================================================
router.put('/:id', async (req, res) => {
  try {
    const { Tracker, Task } = req.models;

    const tracker = await Tracker.findByPk(req.params.id);

    if (!tracker) {
      return res.status(404).json({ error: 'Tracker not found' });
    }

    const allowedFields = [
      'name', 'description', 'icon', 'color',
      'targetValue', 'targetUnit', 'frequency',
      'isActive', 'isPaused', 'taskCategoryId', 'taskUrgency',
      'scheduledTime', 'scheduledDays', 'scheduledDatesOfMonth',
    ];

    // Check if schedule-related fields are being changed
    const scheduleFields = ['scheduledTime', 'scheduledDays', 'scheduledDatesOfMonth', 'frequency'];
    const scheduleChanged = scheduleFields.some(field =>
      req.body[field] !== undefined &&
      JSON.stringify(req.body[field]) !== JSON.stringify(tracker[field])
    );

    const updates = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    await tracker.update(updates);

    // If schedule changed, delete old pending tasks and regenerate
    if (scheduleChanged && tracker.generateTasks) {
      // Delete all pending tasks for this tracker
      const deleted = await Task.destroy({
        where: {
          trackerId: tracker.id,
          status: ['pending', 'in_progress'],
        },
      });

      // Reset completion state so user can complete the new schedule
      // This prevents "already completed today" blocking new tasks
      await tracker.update({
        lastCompletedAt: null,
        currentValue: 0,
      });

      // Regenerate tasks with new schedule - use createAllScheduledTasks directly for this tracker
      await tracker.reload();
      const { createAllScheduledTasks } = require('../utils/taskGenerator');
      const newTasks = await createAllScheduledTasks(req.models, tracker);
      console.log(`Tracker "${tracker.name}" schedule updated: deleted ${deleted} old tasks, created ${newTasks.length} new tasks`);
    }

    res.json(tracker);
  } catch (error) {
    console.error('Error updating tracker:', error);
    res.status(500).json({ error: 'Failed to update tracker' });
  }
});

// ============================================================
// POST /api/trackers/:id/log - Log progress (occurrence-based)
// ============================================================
router.post('/:id/log', async (req, res) => {
  try {
    const { Tracker, Task } = req.models;

    const tracker = await Tracker.findByPk(req.params.id);

    if (!tracker) {
      return res.status(404).json({ error: 'Tracker not found' });
    }

    // Validation: Is today a scheduled day?
    if (!isTodayScheduledDay(tracker)) {
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const today = dayNames[new Date().getUTCDay()];
      let scheduledStr = '';

      if (tracker.frequency === 'weekly' && tracker.scheduledDays?.length > 0) {
        scheduledStr = tracker.scheduledDays.map(d => dayNames[d]).join(', ');
      } else if (tracker.frequency === 'monthly' && tracker.scheduledDatesOfMonth?.length > 0) {
        scheduledStr = tracker.scheduledDatesOfMonth.join(', ');
      }

      return res.status(400).json({
        error: 'Not a scheduled day',
        message: `This tracker is not scheduled for ${today}. Scheduled: ${scheduledStr}`,
      });
    }

    // Validation: Already completed today? (only if targetValue is 1)
    if (tracker.targetValue === 1 && isAlreadyCompletedToday(tracker)) {
      return res.status(400).json({
        error: 'Already completed today',
        message: 'This tracker has already been completed today. Come back tomorrow!',
      });
    }

    const { value = 1 } = req.body;
    const now = new Date();

    // Find the current/next pending task for this tracker
    const pendingTask = await Task.findOne({
      where: {
        trackerId: tracker.id,
        status: { [Op.in]: ['pending', 'in_progress'] },
      },
      order: [['dueDate', 'ASC']],
    });

    // Determine the occurrence date (from task or now)
    const occurrenceDate = pendingTask ? new Date(pendingTask.dueDate) : now;

    // Check if we missed the previous occurrence (for streak calculation)
    const { streakBroken } = await checkMissedOccurrences(req.models, tracker, occurrenceDate);

    // Update current value
    const newCurrentValue = tracker.currentValue + value;
    const goalCompleted = newCurrentValue >= tracker.targetValue;

    let xpEarned = 0;
    let leveledUp = false;
    let newLevel = tracker.level;
    let newStreak = tracker.currentStreak;

    // Update tracker
    const updates = {
      currentValue: newCurrentValue,
      consecutiveMissed: 0, // Reset since user is actively logging
    };

    if (goalCompleted) {
      // Goal completed for this occurrence
      const baseXP = XP_REWARDS[tracker.frequency];

      // Handle streak
      if (streakBroken) {
        newStreak = 1; // Start fresh streak
      } else {
        newStreak = tracker.currentStreak + 1;
      }

      const multiplier = getStreakMultiplier(newStreak);
      xpEarned = Math.round(baseXP * multiplier);

      const newTotalXP = tracker.totalXP + xpEarned;
      newLevel = calculateLevel(newTotalXP);
      leveledUp = newLevel > tracker.level;

      updates.totalXP = newTotalXP;
      updates.level = newLevel;
      updates.totalCompletions = tracker.totalCompletions + 1;
      updates.currentStreak = newStreak;
      updates.bestStreak = Math.max(tracker.bestStreak, newStreak);
      updates.lastCompletedAt = now;
      updates.lastOccurrenceDate = occurrenceDate;
      updates.currentValue = 0; // Reset for next occurrence
      updates.successfulPeriods = tracker.successfulPeriods + 1;
      updates.totalPeriods = tracker.totalPeriods + 1;
    }

    await tracker.update(updates);

    // If goal completed and there's a pending task, mark it complete
    let completedTask = null;
    if (goalCompleted && pendingTask) {
      await pendingTask.update({ status: 'completed' });
      completedTask = pendingTask;
      console.log(`Marked task "${pendingTask.title}" as completed`);

      // Create next occurrence task
      if (tracker.generateTasks) {
        try {
          await createNextTrackerTask(req.models, tracker, pendingTask);
        } catch (err) {
          console.error('Error creating next task:', err);
        }
      }
    }

    // Refresh tracker data
    await tracker.reload();

    const data = tracker.toJSON();
    data.progressPercentage = Math.min(100, Math.round((data.currentValue / data.targetValue) * 100));
    data.xpProgress = getXPProgress(data.totalXP, data.level);
    data.streakMultiplier = getStreakMultiplier(data.currentStreak);
    data.xpEarned = xpEarned;
    data.leveledUp = leveledUp;
    data.goalCompleted = goalCompleted;
    data.streakBroken = streakBroken;

    if (completedTask) {
      data.completedTask = {
        id: completedTask.id,
        title: completedTask.title,
      };
    }

    res.json(data);
  } catch (error) {
    console.error('Error logging progress:', error);
    res.status(500).json({ error: 'Failed to log progress' });
  }
});

// ============================================================
// POST /api/trackers/:id/reset - Reset current occurrence
// ============================================================
router.post('/:id/reset', async (req, res) => {
  try {
    const { Tracker } = req.models;

    const tracker = await Tracker.findByPk(req.params.id);

    if (!tracker) {
      return res.status(404).json({ error: 'Tracker not found' });
    }

    await tracker.update({
      currentValue: 0,
      lastCompletedAt: null,
    });

    res.json(tracker);
  } catch (error) {
    console.error('Error resetting tracker:', error);
    res.status(500).json({ error: 'Failed to reset tracker' });
  }
});

// ============================================================
// DELETE /api/trackers/:id - Delete tracker
// ============================================================
router.delete('/:id', async (req, res) => {
  try {
    const { Tracker, Task } = req.models;

    const tracker = await Tracker.findByPk(req.params.id);

    if (!tracker) {
      return res.status(404).json({ error: 'Tracker not found' });
    }

    // Unlink all tasks
    await Task.update(
      { trackerId: null },
      { where: { trackerId: tracker.id } }
    );

    await tracker.destroy();
    res.json({ message: 'Tracker deleted successfully' });
  } catch (error) {
    console.error('Error deleting tracker:', error);
    res.status(500).json({ error: 'Failed to delete tracker' });
  }
});

// ============================================================
// POST /api/trackers/:id/generate-task - Force generate task
// ============================================================
router.post('/:id/generate-task', async (req, res) => {
  try {
    const { Tracker } = req.models;

    const tracker = await Tracker.findByPk(req.params.id);

    if (!tracker) {
      return res.status(404).json({ error: 'Tracker not found' });
    }

    if (!tracker.isActive) {
      return res.status(400).json({ error: 'Tracker is not active' });
    }

    if (tracker.isPaused) {
      return res.status(400).json({ error: 'Tracker is paused' });
    }

    // Get next occurrence and create task
    const occurrences = getNextScheduledOccurrences(tracker, new Date(), 1);
    if (occurrences.length === 0) {
      return res.status(400).json({ error: 'No upcoming occurrences found' });
    }

    const task = await createTrackerTask(req.models, tracker, occurrences[0]);

    res.status(201).json({
      message: 'Task generated successfully',
      task,
    });
  } catch (error) {
    console.error('Error generating task for tracker:', error);
    res.status(500).json({ error: 'Failed to generate task' });
  }
});

module.exports = router;
