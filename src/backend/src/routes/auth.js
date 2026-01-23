/**
 * Project Alpine - Authentication Routes
 *
 * Public routes for user registration, login, and logout.
 * Protected by rate limiting to prevent brute force attacks.
 */

const express = require('express');
const router = express.Router();
const { User, hasUsers, initializeMasterDatabase } = require('../db/masterDatabase');
const authConfig = require('../config/auth');
const { requireAuth, generateToken, setAuthCookie, clearAuthCookie } = require('../middleware/auth');
const { authLimiter, guestLimiter } = require('../middleware/rateLimiter');
const { getUserDatabase, initializeUserDatabase, deleteUserDatabase } = require('../db/userDatabaseManager');
const { getModelsForUser } = require('../models');

/**
 * GET /api/auth/check-setup
 * Check if any users exist (for first-time setup detection)
 */
router.get('/check-setup', async (req, res) => {
  try {
    const usersExist = await hasUsers();
    res.json({ hasUsers: usersExist });
  } catch (error) {
    console.error('Check setup error:', error);
    res.status(500).json({ error: 'Failed to check setup status' });
  }
});

/**
 * POST /api/auth/register
 * Register a new user
 * - First user becomes admin automatically
 * - Subsequent users require admin to create (handled via admin routes)
 * - Rate limited to prevent abuse
 */
router.post('/register', authLimiter, async (req, res) => {
  try {
    const { username, password, displayName } = req.body;

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

    // Check if users already exist - if so, only admins can create new users
    const usersExist = await hasUsers();
    if (usersExist) {
      return res.status(403).json({ error: 'Registration is disabled. Contact an administrator to create an account.' });
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
    });

    // Generate token and set cookie
    const token = generateToken(user);
    setAuthCookie(res, token);

    res.status(201).json({
      user: user.toJSON(),
      message: user.isAdmin ? 'Admin account created successfully' : 'Account created successfully',
    });
  } catch (error) {
    console.error('Registration error:', error);
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ error: error.errors[0]?.message || 'Validation error' });
    }
    res.status(500).json({ error: 'Failed to create account' });
  }
});

/**
 * POST /api/auth/login
 * Login with username and password
 * Rate limited to prevent brute force attacks
 */
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Find user
    const user = await User.findByUsername(username);
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(401).json({ error: 'Account is disabled' });
    }

    // Validate password
    const isValidPassword = await user.validatePassword(password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Update last login time
    await user.update({ lastLoginAt: new Date() });

    // Generate token and set cookie
    const token = generateToken(user);
    setAuthCookie(res, token);

    res.json({
      user: user.toJSON(),
      message: 'Login successful',
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

/**
 * POST /api/auth/logout
 * Clear auth cookie and clean up guest data if applicable
 */
router.post('/logout', requireAuth, async (req, res) => {
  try {
    const user = req.user;

    // If this is a guest user, delete their account and database
    if (user && user.isGuest) {
      const userId = user.id;

      // Delete the user's database first
      await deleteUserDatabase(userId);

      // Delete the user from master database
      await user.destroy();

      console.log(`Guest user ${user.username} logged out and cleaned up`);
    }

    clearAuthCookie(res);
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    // Still clear the cookie even if cleanup fails
    clearAuthCookie(res);
    res.json({ message: 'Logged out successfully' });
  }
});

/**
 * POST /api/auth/guest
 * Create a temporary guest session for demo purposes
 * Guest sessions expire after 24 hours
 * Strictly rate limited (5/hour) to prevent DDOS/abuse
 */
router.post('/guest', guestLimiter, async (req, res) => {
  try {
    // Generate unique guest username
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const guestUsername = `guest_${timestamp}_${randomStr}`;

    // Guest sessions expire in 24 hours
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Create guest user (no real password needed, just a placeholder)
    const guestUser = await User.create({
      username: guestUsername,
      passwordHash: 'guest_no_password',
      displayName: 'Demo User',
      isAdmin: false,
      isActive: true,
      isGuest: true,
      guestExpiresAt: expiresAt,
    });

    // Initialize guest database with demo data
    const sequelize = await getUserDatabase(guestUser.id);
    const models = getModelsForUser(sequelize);
    await initializeUserDatabase(guestUser.id, models);

    // Seed demo data for the guest
    await seedGuestDemoData(models);

    // Generate token and set cookie
    const token = generateToken(guestUser);
    setAuthCookie(res, token);

    res.status(201).json({
      user: guestUser.toJSON(),
      message: 'Welcome to the demo! Your session will expire in 24 hours.',
      isGuest: true,
    });
  } catch (error) {
    console.error('Guest login error:', error);
    res.status(500).json({ error: 'Failed to create guest session' });
  }
});

/**
 * Seed demo data for guest users
 */
async function seedGuestDemoData(models) {
  const { Task, Category, Tag, Tracker } = models;

  try {
    // Create demo categories
    const workCategory = await Category.create({ name: 'Work', color: '#3182CE' });
    const personalCategory = await Category.create({ name: 'Personal', color: '#38A169' });
    const fitnessCategory = await Category.create({ name: 'Fitness', color: '#DD6B20' });

    // Create demo tags
    const urgentTag = await Tag.create({ name: 'urgent', color: '#E53E3E' });
    const meetingTag = await Tag.create({ name: 'meeting', color: '#805AD5' });
    const healthTag = await Tag.create({ name: 'health', color: '#38A169' });

    // Get dates for demo tasks
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    // Create demo tasks
    const tasks = [
      {
        title: 'Review quarterly report',
        description: 'Go through Q4 financials and prepare summary',
        dueDate: tomorrow,
        urgency: 'high',
        status: 'pending',
        categoryId: workCategory.id,
      },
      {
        title: 'Team standup meeting',
        description: 'Daily sync with the development team',
        dueDate: today,
        urgency: 'medium',
        status: 'in_progress',
        categoryId: workCategory.id,
      },
      {
        title: 'Gym workout',
        description: 'Leg day - squats, lunges, calf raises',
        dueDate: today,
        urgency: 'medium',
        status: 'pending',
        categoryId: fitnessCategory.id,
      },
      {
        title: 'Grocery shopping',
        description: 'Weekly groceries - fruits, vegetables, protein',
        dueDate: tomorrow,
        urgency: 'low',
        status: 'pending',
        categoryId: personalCategory.id,
      },
      {
        title: 'Project deadline',
        description: 'Submit final deliverables for client project',
        dueDate: nextWeek,
        urgency: 'critical',
        status: 'pending',
        categoryId: workCategory.id,
      },
      {
        title: 'Read book chapter',
        description: 'Continue reading "Atomic Habits" - Chapter 5',
        dueDate: null,
        urgency: 'low',
        status: 'pending',
        categoryId: personalCategory.id,
      },
    ];

    for (const taskData of tasks) {
      const task = await Task.create(taskData);

      // Add some tags
      if (taskData.urgency === 'critical' || taskData.urgency === 'high') {
        await task.addTag(urgentTag);
      }
      if (taskData.title.includes('meeting')) {
        await task.addTag(meetingTag);
      }
      if (taskData.categoryId === fitnessCategory.id) {
        await task.addTag(healthTag);
      }
    }

    // Create demo trackers
    await Tracker.create({
      name: 'Daily Exercise',
      description: 'Stay active every day',
      targetValue: 1,
      currentValue: 0,
      unit: 'workout',
      frequency: 'daily',
      level: 3,
      totalXP: 450,
      currentStreak: 5,
      bestStreak: 12,
      totalCompletions: 28,
      isActive: true,
    });

    await Tracker.create({
      name: 'Read 30 mins',
      description: 'Read for at least 30 minutes',
      targetValue: 30,
      currentValue: 15,
      unit: 'minutes',
      frequency: 'daily',
      level: 2,
      totalXP: 180,
      currentStreak: 3,
      bestStreak: 7,
      totalCompletions: 14,
      isActive: true,
    });

    await Tracker.create({
      name: 'Weekly Meal Prep',
      description: 'Prepare meals for the week',
      targetValue: 1,
      currentValue: 0,
      unit: 'session',
      frequency: 'weekly',
      level: 4,
      totalXP: 680,
      currentStreak: 2,
      bestStreak: 8,
      totalCompletions: 16,
      isActive: true,
    });

    console.log('Guest demo data seeded successfully');
  } catch (error) {
    console.error('Failed to seed guest demo data:', error);
  }
}

/**
 * GET /api/auth/me
 * Get current authenticated user
 */
router.get('/me', requireAuth, async (req, res) => {
  try {
    res.json({ user: req.user.toJSON() });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ error: 'Failed to get user info' });
  }
});

module.exports = router;
