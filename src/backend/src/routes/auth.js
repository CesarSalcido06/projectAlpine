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
const { authLimiter } = require('../middleware/rateLimiter');

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
 * Clear auth cookie
 */
router.post('/logout', (req, res) => {
  clearAuthCookie(res);
  res.json({ message: 'Logged out successfully' });
});

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
