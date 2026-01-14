/**
 * Project Alpine - Database Configuration
 *
 * SQLite database setup with Sequelize ORM.
 * Stores data in local file for persistence.
 */

const { Sequelize } = require('sequelize');
const path = require('path');

// Database file path - stored in project data directory
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../data/alpine.db');

// Initialize Sequelize with SQLite
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: DB_PATH,
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  define: {
    // Use snake_case for database columns
    underscored: true,
    // Add timestamps to all models
    timestamps: true,
  },
});

/**
 * Test database connection
 */
async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log('Database connection established successfully.');
    return true;
  } catch (error) {
    console.error('Unable to connect to database:', error);
    return false;
  }
}

/**
 * Initialize database and sync models
 */
async function initializeDatabase() {
  try {
    // Sync all models with database
    // Use alter: true in development to update schema without losing data
    await sequelize.sync({ alter: process.env.NODE_ENV === 'development' });
    console.log('Database synchronized successfully.');
    return true;
  } catch (error) {
    console.error('Failed to synchronize database:', error);
    return false;
  }
}

module.exports = {
  sequelize,
  testConnection,
  initializeDatabase,
};
