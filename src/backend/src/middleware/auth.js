/**
 * Project Alpine - Authentication Middleware
 *
 * Provides JWT verification and user database loading.
 */

const jwt = require('jsonwebtoken');
const authConfig = require('../config/auth');
const { User } = require('../db/masterDatabase');
const { getUserDatabase, initializeUserDatabase } = require('../db/userDatabaseManager');
const { getModelsForUser } = require('../models');

/**
 * Extract JWT token from request
 */
function getTokenFromRequest(req) {
  // Check cookie first
  if (req.cookies && req.cookies[authConfig.cookieName]) {
    return req.cookies[authConfig.cookieName];
  }

  // Check Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  return null;
}

/**
 * Middleware to require authentication
 * Loads user's database and models into req
 */
async function requireAuth(req, res, next) {
  try {
    const token = getTokenFromRequest(req);

    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Verify token
    const decoded = jwt.verify(token, authConfig.jwtSecret);

    // Get user from master database
    const user = await User.findByPk(decoded.userId);

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    if (!user.isActive) {
      return res.status(401).json({ error: 'Account is disabled' });
    }

    // Get user's database
    const sequelize = await getUserDatabase(user.id);

    // Get models bound to user's database
    const models = getModelsForUser(sequelize);

    // Initialize database if needed (creates tables and default data)
    await initializeUserDatabase(user.id, models);

    // Attach to request
    req.user = user;
    req.userSequelize = sequelize;
    req.models = models;

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    console.error('Auth middleware error:', error);
    return res.status(500).json({ error: 'Authentication error' });
  }
}

/**
 * Middleware to require admin privileges
 * Must be used after requireAuth
 */
function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (!req.user.isAdmin) {
    return res.status(403).json({ error: 'Admin privileges required' });
  }

  next();
}

/**
 * Optional auth middleware - loads user if token present, but doesn't require it
 */
async function optionalAuth(req, res, next) {
  try {
    const token = getTokenFromRequest(req);

    if (!token) {
      return next();
    }

    const decoded = jwt.verify(token, authConfig.jwtSecret);
    const user = await User.findByPk(decoded.userId);

    if (user && user.isActive) {
      const sequelize = await getUserDatabase(user.id);
      const models = getModelsForUser(sequelize);
      await initializeUserDatabase(user.id, models);

      req.user = user;
      req.userSequelize = sequelize;
      req.models = models;
    }

    next();
  } catch (error) {
    // Token invalid, continue without auth
    next();
  }
}

/**
 * Generate JWT token for user
 */
function generateToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      username: user.username,
      isAdmin: user.isAdmin,
    },
    authConfig.jwtSecret,
    { expiresIn: authConfig.jwtExpiresIn }
  );
}

/**
 * Set auth cookie on response
 */
function setAuthCookie(res, token) {
  res.cookie(authConfig.cookieName, token, authConfig.cookieOptions);
}

/**
 * Clear auth cookie
 */
function clearAuthCookie(res) {
  res.clearCookie(authConfig.cookieName, {
    httpOnly: true,
    secure: authConfig.cookieOptions.secure,
    sameSite: authConfig.cookieOptions.sameSite,
    path: '/',
  });
}

module.exports = {
  requireAuth,
  requireAdmin,
  optionalAuth,
  generateToken,
  setAuthCookie,
  clearAuthCookie,
  getTokenFromRequest,
};
