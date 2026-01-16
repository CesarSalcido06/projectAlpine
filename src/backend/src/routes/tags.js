/**
 * Project Alpine - Tag Routes
 *
 * REST API endpoints for tag management.
 */

const express = require('express');

const router = express.Router();

// ============================================================
// GET /api/tags - List all tags
// ============================================================
router.get('/', async (req, res) => {
  try {
    const { Tag } = req.models;

    const tags = await Tag.findAll({
      order: [['name', 'ASC']],
    });

    res.json(tags);
  } catch (error) {
    console.error('Error fetching tags:', error);
    res.status(500).json({ error: 'Failed to fetch tags' });
  }
});

// ============================================================
// GET /api/tags/:id - Get single tag
// ============================================================
router.get('/:id', async (req, res) => {
  try {
    const { Tag } = req.models;

    const tag = await Tag.findByPk(req.params.id);

    if (!tag) {
      return res.status(404).json({ error: 'Tag not found' });
    }

    res.json(tag);
  } catch (error) {
    console.error('Error fetching tag:', error);
    res.status(500).json({ error: 'Failed to fetch tag' });
  }
});

// ============================================================
// POST /api/tags - Create new tag
// ============================================================
router.post('/', async (req, res) => {
  try {
    const { Tag } = req.models;
    const { name, color } = req.body;

    // Validate required fields
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }

    // Check if tag with same name exists
    const existing = await Tag.findOne({
      where: { name: name.trim() },
    });

    if (existing) {
      return res.status(400).json({ error: 'Tag already exists' });
    }

    const tag = await Tag.create({
      name: name.trim(),
      color: color || '#4299E1',
    });

    res.status(201).json(tag);
  } catch (error) {
    console.error('Error creating tag:', error);
    res.status(500).json({ error: 'Failed to create tag' });
  }
});

// ============================================================
// PUT /api/tags/:id - Update tag
// ============================================================
router.put('/:id', async (req, res) => {
  try {
    const { Tag } = req.models;

    const tag = await Tag.findByPk(req.params.id);

    if (!tag) {
      return res.status(404).json({ error: 'Tag not found' });
    }

    const { name, color } = req.body;

    await tag.update({
      name: name !== undefined ? name.trim() : tag.name,
      color: color !== undefined ? color : tag.color,
    });

    res.json(tag);
  } catch (error) {
    console.error('Error updating tag:', error);
    res.status(500).json({ error: 'Failed to update tag' });
  }
});

// ============================================================
// DELETE /api/tags/:id - Delete tag
// ============================================================
router.delete('/:id', async (req, res) => {
  try {
    const { Tag } = req.models;

    const tag = await Tag.findByPk(req.params.id);

    if (!tag) {
      return res.status(404).json({ error: 'Tag not found' });
    }

    // This will automatically remove associations in task_tags
    await tag.destroy();

    res.json({ message: 'Tag deleted successfully' });
  } catch (error) {
    console.error('Error deleting tag:', error);
    res.status(500).json({ error: 'Failed to delete tag' });
  }
});

module.exports = router;
