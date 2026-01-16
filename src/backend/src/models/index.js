/**
 * Project Alpine - Model Index
 *
 * Factory for creating user-specific database models.
 * Each user gets their own Sequelize instance with isolated data.
 */

const { defineTask, URGENCY_LEVELS, TASK_STATUSES } = require('./Task');
const { defineCategory } = require('./Category');
const { defineTag } = require('./Tag');
const { defineTracker, FREQUENCIES, XP_REWARDS, ACHIEVEMENTS } = require('./Tracker');
const { defineTaskTag } = require('./TaskTag');

// Cache for user models (prevents re-defining models on same sequelize instance)
const modelsCache = new WeakMap();

/**
 * Create all models for a given Sequelize instance and set up associations.
 * Models are cached per Sequelize instance to prevent re-definition errors.
 *
 * @param {Sequelize} sequelize - User's Sequelize instance
 * @returns {Object} Object containing all models
 */
function getModelsForUser(sequelize) {
  // Check cache first
  if (modelsCache.has(sequelize)) {
    return modelsCache.get(sequelize);
  }

  // Define all models
  const Task = defineTask(sequelize);
  const Category = defineCategory(sequelize);
  const Tag = defineTag(sequelize);
  const Tracker = defineTracker(sequelize);
  const TaskTag = defineTaskTag(sequelize);

  // ============================================================
  // MODEL ASSOCIATIONS
  // ============================================================

  // Task belongs to Category (many-to-one)
  Task.belongsTo(Category, {
    foreignKey: 'categoryId',
    as: 'category',
  });

  // Category has many Tasks (one-to-many)
  Category.hasMany(Task, {
    foreignKey: 'categoryId',
    as: 'tasks',
  });

  // Task and Tag many-to-many relationship
  // Uses explicit junction table to prevent unique constraint issues
  Task.belongsToMany(Tag, {
    through: TaskTag,
    as: 'tags',
    foreignKey: 'taskId',
    otherKey: 'tagId',
  });

  Tag.belongsToMany(Task, {
    through: TaskTag,
    as: 'tasks',
    foreignKey: 'tagId',
    otherKey: 'taskId',
  });

  // Task belongs to Tracker (many-to-one)
  Task.belongsTo(Tracker, {
    foreignKey: 'trackerId',
    as: 'tracker',
  });

  // Tracker has many Tasks (one-to-many)
  Tracker.hasMany(Task, {
    foreignKey: 'trackerId',
    as: 'tasks',
  });

  // ============================================================
  // BUILD MODELS OBJECT
  // ============================================================

  const models = {
    sequelize,
    Task,
    Category,
    Tag,
    Tracker,
    TaskTag,
  };

  // Cache models
  modelsCache.set(sequelize, models);

  return models;
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  getModelsForUser,
  // Export constants for use in other modules
  URGENCY_LEVELS,
  TASK_STATUSES,
  FREQUENCIES,
  XP_REWARDS,
  ACHIEVEMENTS,
};
