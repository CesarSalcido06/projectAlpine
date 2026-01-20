/**
 * Project Alpine - Tracker Routes
 *
 * REST API endpoints for gamified goal tracking.
 */

const express = require('express');
const { Op } = require('sequelize');
const { XP_REWARDS, ACHIEVEMENTS } = require('../models');
const {
  ensureTrackedTag,
  createTrackerTask,
  createAllScheduledTasks,
  generateRecurringTasks,
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

// ============================================================
// GET /api/trackers - List all trackers
// ============================================================
router.get('/', async (req, res) => {
  try {
    const { Tracker, Task } = req.models;

    // Lazy generation: ensure recurring tasks exist for current period
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
        },
      ],
    });

    // Enhance with computed fields and filter to first pending task
    const enhanced = trackers.map((tracker) => {
      const data = tracker.toJSON();
      data.progressPercentage = Math.min(100, Math.round((data.currentValue / data.targetValue) * 100));
      data.xpProgress = getXPProgress(data.totalXP, data.level);
      data.streakMultiplier = getStreakMultiplier(data.currentStreak);
      // Sort tasks by due date and take only the first one
      if (data.tasks && data.tasks.length > 0) {
        data.tasks.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
        data.tasks = [data.tasks[0]];
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
// NOTE: This route must be defined before /:id to avoid route conflicts
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
// POST /api/trackers/generate-tasks - Generate recurring tasks for all trackers
// NOTE: This route must be defined before /:id to avoid route conflicts
// ============================================================
router.post('/generate-tasks', async (req, res) => {
  try {
    const results = await generateRecurringTasks(req.models);

    res.json({
      message: 'Task generation completed',
      created: results.created.length,
      skipped: results.skipped,
      errors: results.errors.length,
      tasks: results.created,
      errorDetails: results.errors.length > 0 ? results.errors : undefined,
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
      generateTasks: true, // Always enabled - task generation is mandatory
      taskCategoryId,
      taskUrgency: taskUrgency || 'medium',
      periodStartDate: new Date(),
      scheduledTime: scheduledTime || null,
      scheduledDays: scheduledDays || null,
      scheduledDatesOfMonth: scheduledDatesOfMonth || null,
    });

    // Task generation is always enabled - create tasks for all scheduled occurrences
    let generatedTasks = [];
    try {
      generatedTasks = await createAllScheduledTasks(req.models, tracker);
      console.log(`Generated ${generatedTasks.length} task(s) for tracker "${tracker.name}"`);
    } catch (taskError) {
      console.error('Error generating initial tasks:', taskError);
      // Don't fail the tracker creation, just log the error
    }

    const response = tracker.toJSON();
    if (generatedTasks.length > 0) {
      response.generatedTasks = generatedTasks;
      response.generatedTask = generatedTasks[0]; // Keep for backwards compatibility
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
    const { Tracker } = req.models;

    const tracker = await Tracker.findByPk(req.params.id);

    if (!tracker) {
      return res.status(404).json({ error: 'Tracker not found' });
    }

    const allowedFields = [
      'name', 'description', 'icon', 'color',
      'targetValue', 'targetUnit', 'frequency',
      'isActive', 'isPaused', 'taskCategoryId', 'taskUrgency',
      'scheduledTime', 'scheduledDays', 'scheduledDatesOfMonth',
      // Note: generateTasks is not allowed to be updated - it's always true
    ];

    const updates = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    await tracker.update(updates);
    res.json(tracker);
  } catch (error) {
    console.error('Error updating tracker:', error);
    res.status(500).json({ error: 'Failed to update tracker' });
  }
});

// ============================================================
// POST /api/trackers/:id/log - Log progress
// ============================================================
router.post('/:id/log', async (req, res) => {
  try {
    const { Tracker, Task } = req.models;

    const tracker = await Tracker.findByPk(req.params.id);

    if (!tracker) {
      return res.status(404).json({ error: 'Tracker not found' });
    }

    const { value = 1 } = req.body;

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
    let xpEarned = 0;
    let leveledUp = false;
    let newLevel = tracker.level;

    let completedTask = null;
    if (goalCompleted && !tracker.lastCompletedAt) {
      // First completion of this period - award XP
      const baseXP = XP_REWARDS[tracker.frequency];
      const multiplier = getStreakMultiplier(tracker.currentStreak);
      xpEarned = Math.round(baseXP * multiplier);

      const newTotalXP = tracker.totalXP + xpEarned;
      newLevel = calculateLevel(newTotalXP);
      leveledUp = newLevel > tracker.level;

      const newStreak = tracker.currentStreak + 1;

      await tracker.update({
        totalXP: newTotalXP,
        level: newLevel,
        totalCompletions: tracker.totalCompletions + 1,
        currentStreak: newStreak,
        bestStreak: Math.max(tracker.bestStreak, newStreak),
        lastCompletedAt: now,
      });

      // Sync: Mark the first pending tracker task as completed
      const pendingTask = await Task.findOne({
        where: {
          trackerId: tracker.id,
          status: { [Op.in]: ['pending', 'in_progress'] },
        },
        order: [['dueDate', 'ASC']],
      });

      if (pendingTask) {
        await pendingTask.update({ status: 'completed' });
        completedTask = pendingTask;
        console.log(`Synced: Marked task "${pendingTask.title}" as completed along with tracker`);
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
// POST /api/trackers/:id/reset - Reset current period
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
      periodStartDate: new Date(),
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

    // First, unlink all tasks associated with this tracker
    // This prevents foreign key constraint errors
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
// POST /api/trackers/:id/generate-task - Generate task for specific tracker
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

    // Force task generation even if generateTasks is false
    const task = await createTrackerTask(req.models, tracker);

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
