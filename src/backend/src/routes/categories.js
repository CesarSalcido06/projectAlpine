/**
 * Project Alpine - Category Routes
 *
 * REST API endpoints for category management.
 */

const express = require('express');

const router = express.Router();

// ============================================================
// GET /api/categories - List all categories
// ============================================================
router.get('/', async (req, res) => {
  try {
    const { Category } = req.models;

    const categories = await Category.findAll({
      order: [
        ['isDefault', 'DESC'],
        ['name', 'ASC'],
      ],
    });

    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// ============================================================
// GET /api/categories/:id - Get single category
// ============================================================
router.get('/:id', async (req, res) => {
  try {
    const { Category } = req.models;

    const category = await Category.findByPk(req.params.id);

    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json(category);
  } catch (error) {
    console.error('Error fetching category:', error);
    res.status(500).json({ error: 'Failed to fetch category' });
  }
});

// ============================================================
// POST /api/categories - Create new category
// ============================================================
router.post('/', async (req, res) => {
  try {
    const { Category } = req.models;
    const { name, color } = req.body;

    // Validate required fields
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }

    // Check if category with same name exists
    const existing = await Category.findOne({
      where: { name: name.trim() },
    });

    if (existing) {
      return res.status(400).json({ error: 'Category already exists' });
    }

    const category = await Category.create({
      name: name.trim(),
      color: color || '#718096',
      isDefault: false,
    });

    res.status(201).json(category);
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// ============================================================
// PUT /api/categories/:id - Update category
// ============================================================
router.put('/:id', async (req, res) => {
  try {
    const { Category } = req.models;

    const category = await Category.findByPk(req.params.id);

    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const { name, color } = req.body;

    await category.update({
      name: name !== undefined ? name.trim() : category.name,
      color: color !== undefined ? color : category.color,
    });

    res.json(category);
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

// ============================================================
// DELETE /api/categories/:id - Delete category
// ============================================================
router.delete('/:id', async (req, res) => {
  try {
    const { Category, Task } = req.models;

    const category = await Category.findByPk(req.params.id);

    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // Prevent deleting default category
    if (category.isDefault) {
      return res.status(400).json({ error: 'Cannot delete default category' });
    }

    // Set tasks in this category to null
    await Task.update(
      { categoryId: null },
      { where: { categoryId: category.id } }
    );

    await category.destroy();

    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

module.exports = router;
