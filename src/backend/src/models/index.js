/**
 * Project Alpine - Model Index
 *
 * Central export for all database models.
 * Defines relationships between models.
 */

const { sequelize } = require('../db/database');
const Task = require('./Task');
const Category = require('./Category');
const Tag = require('./Tag');
const Tracker = require('./Tracker');
const TaskTag = require('./TaskTag');

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
// EXPORTS
// ============================================================

module.exports = {
  sequelize,
  Task,
  Category,
  Tag,
  Tracker,
  TaskTag,
};
