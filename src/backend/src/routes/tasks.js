/**
 * Project Alpine - Task Routes
 *
 * REST API endpoints for task CRUD operations.
 */

const express = require('express');
const { Op } = require('sequelize');
const { Task, Category, Tag } = require('../models');

const router = express.Router();

// ============================================================
// GET /api/tasks - List all tasks with optional filters
// ============================================================
router.get('/', async (req, res) => {
  try {
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

    // Associate tags if provided
    if (tagIds && tagIds.length > 0) {
      const tags = await Tag.findAll({ where: { id: tagIds } });
      await task.setTags(tags);
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
    const task = await Task.findByPk(req.params.id);

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const { title, description, dueDate, urgency, status, categoryId, tagIds } = req.body;

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
        await task.setTags(tags);
      } else {
        await task.setTags([]);
      }
    }

    // Fetch updated task with associations
    const updatedTask = await Task.findByPk(task.id, {
      include: [
        { model: Category, as: 'category' },
        { model: Tag, as: 'tags' },
      ],
    });

    res.json(updatedTask);
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
