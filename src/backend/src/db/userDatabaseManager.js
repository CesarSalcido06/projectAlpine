/**
 * Project Alpine - User Database Manager
 *
 * Manages per-user SQLite databases for complete data isolation.
 * Each user gets their own database file in /data/users/user_{id}/alpine.db
 */

const { Sequelize } = require('sequelize');
const path = require('path');
const fs = require('fs');

// Cache for user database connections
const connectionCache = new Map();

// Track which databases have been initialized (synced)
const initializedDatabases = new Set();

// Base data directory
const DATA_DIR = path.join(__dirname, '../../data');
const USERS_DIR = path.join(DATA_DIR, 'users');

// Ensure users directory exists
if (!fs.existsSync(USERS_DIR)) {
  fs.mkdirSync(USERS_DIR, { recursive: true });
}

/**
 * Get the database path for a specific user
 */
function getUserDatabasePath(userId) {
  return path.join(USERS_DIR, `user_${userId}`, 'alpine.db');
}

/**
 * Get the directory path for a specific user
 */
function getUserDirectory(userId) {
  return path.join(USERS_DIR, `user_${userId}`);
}

/**
 * Create or get a Sequelize instance for a specific user
 */
async function getUserDatabase(userId) {
  // Check cache first
  if (connectionCache.has(userId)) {
    return connectionCache.get(userId);
  }

  const userDir = getUserDirectory(userId);
  const dbPath = getUserDatabasePath(userId);

  // Ensure user directory exists
  if (!fs.existsSync(userDir)) {
    fs.mkdirSync(userDir, { recursive: true });
  }

  // Create new Sequelize instance for this user
  const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: dbPath,
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    define: {
      underscored: true,
      timestamps: true,
    },
  });

  // Test connection
  await sequelize.authenticate();

  // Cache the connection
  connectionCache.set(userId, sequelize);

  return sequelize;
}

/**
 * Apply schema migrations to add new columns safely
 */
async function applyMigrations(sequelize) {
  const queryInterface = sequelize.getQueryInterface();

  // Migration: Add consecutiveMissed column to trackers table
  try {
    const tableInfo = await queryInterface.describeTable('trackers');
    if (!tableInfo.consecutive_missed) {
      await sequelize.query(
        'ALTER TABLE trackers ADD COLUMN consecutive_missed INTEGER DEFAULT 0'
      );
      console.log('Migration: Added consecutive_missed column to trackers');
    }

    // Migration: Add lastOccurrenceDate column to trackers table (for occurrence-based tracking)
    if (!tableInfo.last_occurrence_date) {
      await sequelize.query(
        'ALTER TABLE trackers ADD COLUMN last_occurrence_date DATETIME'
      );
      console.log('Migration: Added last_occurrence_date column to trackers');
    }
  } catch (err) {
    // Table might not exist yet, which is fine - it will be created by sync
    if (!err.message.includes('no such table')) {
      console.error('Migration error:', err.message);
    }
  }
}

/**
 * Initialize a new user's database with models and default data
 */
async function initializeUserDatabase(userId, models) {
  const sequelize = await getUserDatabase(userId);
  const { Category } = models;

  // Only sync if this database hasn't been initialized yet this session
  if (!initializedDatabases.has(userId)) {
    // Use force: false to only create tables if they don't exist
    await sequelize.sync({ force: false });

    // Apply migrations for new columns
    await applyMigrations(sequelize);

    initializedDatabases.add(userId);

    // Create default category if it doesn't exist
    const defaultCategory = await Category.findOne({ where: { isDefault: true } });
    if (!defaultCategory) {
      await Category.create({
        name: 'General',
        color: '#718096',
        isDefault: true,
      });
      console.log(`Created default category for user ${userId}`);
    }
  }

  return sequelize;
}

/**
 * Delete a user's database and directory
 */
async function deleteUserDatabase(userId) {
  // Close connection if cached
  if (connectionCache.has(userId)) {
    const sequelize = connectionCache.get(userId);
    await sequelize.close();
    connectionCache.delete(userId);
  }

  // Delete user directory
  const userDir = getUserDirectory(userId);
  if (fs.existsSync(userDir)) {
    fs.rmSync(userDir, { recursive: true, force: true });
    console.log(`Deleted database for user ${userId}`);
  }
}

/**
 * Close a user's database connection (for cleanup)
 */
async function closeUserDatabase(userId) {
  if (connectionCache.has(userId)) {
    const sequelize = connectionCache.get(userId);
    await sequelize.close();
    connectionCache.delete(userId);
  }
}

/**
 * Close all cached database connections
 */
async function closeAllConnections() {
  for (const [userId, sequelize] of connectionCache) {
    await sequelize.close();
    console.log(`Closed connection for user ${userId}`);
  }
  connectionCache.clear();
}

/**
 * Check if a user's database exists
 */
function userDatabaseExists(userId) {
  return fs.existsSync(getUserDatabasePath(userId));
}

/**
 * Get database statistics
 */
function getDatabaseStats() {
  return {
    cachedConnections: connectionCache.size,
    userIds: Array.from(connectionCache.keys()),
  };
}

module.exports = {
  getUserDatabase,
  initializeUserDatabase,
  deleteUserDatabase,
  closeUserDatabase,
  closeAllConnections,
  userDatabaseExists,
  getUserDatabasePath,
  getUserDirectory,
  getDatabaseStats,
};
