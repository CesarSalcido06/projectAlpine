/**
 * Project Alpine - Statistics Routes
 *
 * REST API endpoints for task statistics and analytics.
 */

const express = require('express');
const { Op, fn, col } = require('sequelize');

const router = express.Router();

// ============================================================
// GET /api/stats - Get overall statistics
// ============================================================
router.get('/', async (req, res) => {
  try {
    const { Task, sequelize } = req.models;

    // Get total ACTIVE task counts (pending + in_progress only)
    const totalTasks = await Task.count({
      where: { status: { [Op.in]: ['pending', 'in_progress'] } },
    });

    const completedTasks = await Task.count({
      where: { status: 'completed' },
    });

    const pendingTasks = await Task.count({
      where: { status: 'pending' },
    });

    const inProgressTasks = await Task.count({
      where: { status: 'in_progress' },
    });

    // Calculate completion rate based on all non-archived tasks
    const allNonArchivedTasks = totalTasks + completedTasks;
    const completionRate = allNonArchivedTasks > 0
      ? Math.round((completedTasks / allNonArchivedTasks) * 100)
      : 0;

    // Get urgency distribution (only active tasks)
    const urgencyStats = await Task.findAll({
      attributes: [
        'urgency',
        [fn('COUNT', col('id')), 'count'],
      ],
      where: { status: { [Op.in]: ['pending', 'in_progress'] } },
      group: ['urgency'],
      raw: true,
    });

    // Format urgency distribution
    const urgencyDistribution = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };

    urgencyStats.forEach((stat) => {
      urgencyDistribution[stat.urgency] = parseInt(stat.count);
    });

    // Get top tags by usage
    const topTags = await sequelize.query(`
      SELECT
        t.name,
        t.color,
        COUNT(tt.task_id) as count
      FROM tags t
      LEFT JOIN task_tags tt ON t.id = tt.tag_id
      LEFT JOIN tasks tk ON tt.task_id = tk.id AND tk.status != 'archived'
      GROUP BY t.id
      ORDER BY count DESC
      LIMIT 10
    `, {
      type: sequelize.QueryTypes.SELECT,
    });

    res.json({
      totalTasks,
      completedTasks,
      pendingTasks,
      inProgressTasks,
      completionRate,
      urgencyDistribution,
      topTags,
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// ============================================================
// GET /api/stats/tags - Get tag usage statistics
// ============================================================
router.get('/tags', async (req, res) => {
  try {
    const { sequelize } = req.models;
    const { startDate, endDate } = req.query;

    let dateFilter = '';
    if (startDate && endDate) {
      dateFilter = `AND tk.created_at BETWEEN '${startDate}' AND '${endDate}'`;
    }

    const tagStats = await sequelize.query(`
      SELECT
        t.name,
        t.color,
        COUNT(tt.task_id) as count
      FROM tags t
      LEFT JOIN task_tags tt ON t.id = tt.tag_id
      LEFT JOIN tasks tk ON tt.task_id = tk.id ${dateFilter}
      GROUP BY t.id
      ORDER BY count DESC
    `, {
      type: sequelize.QueryTypes.SELECT,
    });

    res.json(tagStats);
  } catch (error) {
    console.error('Error fetching tag stats:', error);
    res.status(500).json({ error: 'Failed to fetch tag statistics' });
  }
});

// ============================================================
// GET /api/stats/urgency - Get urgency distribution
// ============================================================
router.get('/urgency', async (req, res) => {
  try {
    const { Task } = req.models;

    const urgencyStats = await Task.findAll({
      attributes: [
        'urgency',
        [fn('COUNT', col('id')), 'count'],
      ],
      where: { status: { [Op.ne]: 'archived' } },
      group: ['urgency'],
      raw: true,
    });

    res.json(urgencyStats);
  } catch (error) {
    console.error('Error fetching urgency stats:', error);
    res.status(500).json({ error: 'Failed to fetch urgency statistics' });
  }
});

// ============================================================
// GET /api/stats/completion - Get completion trends
// ============================================================
router.get('/completion', async (req, res) => {
  try {
    const { sequelize } = req.models;
    const { days = 30 } = req.query;

    // Get completion data for the last N days
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const completionData = await sequelize.query(`
      SELECT
        date(updated_at) as date,
        COUNT(*) as completed
      FROM tasks
      WHERE status = 'completed'
        AND updated_at >= '${startDate.toISOString()}'
      GROUP BY date(updated_at)
      ORDER BY date ASC
    `, {
      type: sequelize.QueryTypes.SELECT,
    });

    res.json(completionData);
  } catch (error) {
    console.error('Error fetching completion stats:', error);
    res.status(500).json({ error: 'Failed to fetch completion statistics' });
  }
});

module.exports = router;
