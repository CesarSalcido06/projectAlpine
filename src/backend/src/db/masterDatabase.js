/**
 * Project Alpine - Master Database Configuration
 *
 * Central database that stores user credentials only.
 * Each user's actual data is stored in their own separate database.
 */

const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');
const authConfig = require('../config/auth');

// Ensure data directory exists
const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Master database path
const MASTER_DB_PATH = path.join(dataDir, 'master.db');

// Initialize Sequelize for master database
const masterSequelize = new Sequelize({
  dialect: 'sqlite',
  storage: MASTER_DB_PATH,
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  define: {
    underscored: true,
    timestamps: true,
  },
});

// Define User model
const User = masterSequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  username: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    validate: {
      len: [3, 50],
      is: /^[a-zA-Z0-9_]+$/i, // alphanumeric and underscores only
    },
  },
  passwordHash: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  displayName: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  isAdmin: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  isGuest: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  guestExpiresAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  lastLoginAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'users',
  hooks: {
    beforeCreate: async (user) => {
      // Check if this is the first user - make them admin
      const userCount = await User.count();
      if (userCount === 0) {
        user.isAdmin = true;
      }
    },
  },
});

// Instance methods
User.prototype.validatePassword = async function(password) {
  return bcrypt.compare(password, this.passwordHash);
};

User.prototype.toJSON = function() {
  const values = { ...this.get() };
  delete values.passwordHash; // Never expose password hash
  delete values.guestExpiresAt; // Don't expose internal guest data
  return values;
};

// Static methods
User.hashPassword = async function(password) {
  return bcrypt.hash(password, authConfig.bcryptRounds);
};

User.findByUsername = async function(username) {
  return User.findOne({
    where: {
      username: username.toLowerCase(),
    },
  });
};

/**
 * Initialize master database
 */
async function initializeMasterDatabase() {
  try {
    await masterSequelize.authenticate();
    console.log('Master database connection established.');

    await masterSequelize.sync({ alter: process.env.NODE_ENV === 'development' });
    console.log('Master database synchronized.');

    return true;
  } catch (error) {
    console.error('Failed to initialize master database:', error);
    return false;
  }
}

/**
 * Check if any real (non-guest) users exist (for first-time setup)
 */
async function hasUsers() {
  const count = await User.count({ where: { isGuest: false } });
  return count > 0;
}

/**
 * Clean up expired guest users and their databases
 */
async function cleanupExpiredGuests(deleteUserDatabaseFn) {
  const { Op } = require('sequelize');
  const expiredGuests = await User.findAll({
    where: {
      isGuest: true,
      guestExpiresAt: { [Op.lt]: new Date() },
    },
  });

  for (const guest of expiredGuests) {
    try {
      await deleteUserDatabaseFn(guest.id);
      await guest.destroy();
      console.log(`Cleaned up expired guest user: ${guest.username}`);
    } catch (error) {
      console.error(`Failed to cleanup guest ${guest.id}:`, error);
    }
  }

  return expiredGuests.length;
}

/**
 * Get count of admin users
 */
async function getAdminCount() {
  return User.count({ where: { isAdmin: true, isActive: true } });
}

module.exports = {
  masterSequelize,
  User,
  initializeMasterDatabase,
  hasUsers,
  getAdminCount,
  cleanupExpiredGuests,
};
