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
// Creates a junction table 'task_tags'
Task.belongsToMany(Tag, {
  through: 'task_tags',
  as: 'tags',
  foreignKey: 'taskId',
});

Tag.belongsToMany(Task, {
  through: 'task_tags',
  as: 'tasks',
  foreignKey: 'tagId',
});

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  sequelize,
  Task,
  Category,
  Tag,
};
