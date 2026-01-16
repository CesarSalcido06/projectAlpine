/**
 * Project Alpine - Admin Routes
 *
 * Admin-only routes for user management.
 */

const express = require('express');
const router = express.Router();
const { User, getAdminCount } = require('../db/masterDatabase');
const { deleteUserDatabase } = require('../db/userDatabaseManager');
const authConfig = require('../config/auth');

/**
 * GET /api/admin/users
 * List all users
 */
router.get('/users', async (req, res) => {
  try {
    const users = await User.findAll({
      order: [['createdAt', 'ASC']],
    });
    res.json({ users: users.map(u => u.toJSON()) });
  } catch (error) {
    console.error('List users error:', error);
    res.status(500).json({ error: 'Failed to list users' });
  }
});

/**
 * POST /api/admin/users
 * Create a new user (admin only)
 */
router.post('/users', async (req, res) => {
  try {
    const { username, password, displayName, isAdmin } = req.body;

    // Validate input
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    if (username.length < 3 || username.length > 50) {
      return res.status(400).json({ error: 'Username must be between 3 and 50 characters' });
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return res.status(400).json({ error: 'Username can only contain letters, numbers, and underscores' });
    }

    if (password.length < authConfig.passwordMinLength) {
      return res.status(400).json({ error: `Password must be at least ${authConfig.passwordMinLength} characters` });
    }

    // Check if username is taken
    const existingUser = await User.findByUsername(username);
    if (existingUser) {
      return res.status(409).json({ error: 'Username is already taken' });
    }

    // Hash password and create user
    const passwordHash = await User.hashPassword(password);
    const user = await User.create({
      username: username.toLowerCase(),
      passwordHash,
      displayName: displayName || username,
      isAdmin: isAdmin || false,
    });

    res.status(201).json({
      user: user.toJSON(),
      message: 'User created successfully',
    });
  } catch (error) {
    console.error('Create user error:', error);
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ error: error.errors[0]?.message || 'Validation error' });
    }
    res.status(500).json({ error: 'Failed to create user' });
  }
});

/**
 * GET /api/admin/users/:id
 * Get a specific user
 */
router.get('/users/:id', async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user: user.toJSON() });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

/**
 * PUT /api/admin/users/:id
 * Update a user
 */
router.put('/users/:id', async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { displayName, isAdmin, isActive, password } = req.body;
    const updates = {};

    if (displayName !== undefined) {
      updates.displayName = displayName;
    }

    if (isActive !== undefined) {
      // Prevent disabling the only active admin
      if (!isActive && user.isAdmin) {
        const adminCount = await getAdminCount();
        if (adminCount <= 1) {
          return res.status(400).json({ error: 'Cannot disable the only admin account' });
        }
      }
      updates.isActive = isActive;
    }

    if (isAdmin !== undefined) {
      // Prevent removing admin from the only admin
      if (!isAdmin && user.isAdmin) {
        const adminCount = await getAdminCount();
        if (adminCount <= 1) {
          return res.status(400).json({ error: 'Cannot remove admin privileges from the only admin' });
        }
      }
      updates.isAdmin = isAdmin;
    }

    if (password) {
      if (password.length < authConfig.passwordMinLength) {
        return res.status(400).json({ error: `Password must be at least ${authConfig.passwordMinLength} characters` });
      }
      updates.passwordHash = await User.hashPassword(password);
    }

    await user.update(updates);

    res.json({
      user: user.toJSON(),
      message: 'User updated successfully',
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

/**
 * DELETE /api/admin/users/:id
 * Delete a user and their database
 */
router.delete('/users/:id', async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prevent deleting yourself
    if (req.user.id === userId) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    // Prevent deleting the only admin
    if (user.isAdmin) {
      const adminCount = await getAdminCount();
      if (adminCount <= 1) {
        return res.status(400).json({ error: 'Cannot delete the only admin account' });
      }
    }

    // Delete user's database first
    await deleteUserDatabase(userId);

    // Delete user from master database
    await user.destroy();

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

module.exports = router;
