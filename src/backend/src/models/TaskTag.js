/**
 * Project Alpine - Task-Tag Junction Model
 *
 * Explicit junction table for the many-to-many relationship
 * between Tasks and Tags. Prevents Sequelize from adding
 * incorrect unique constraints.
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../db/database');

const TaskTag = sequelize.define('task_tags', {
  taskId: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    field: 'task_id',
    references: {
      model: 'tasks',
      key: 'id',
    },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  },
  tagId: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    field: 'tag_id',
    references: {
      model: 'tags',
      key: 'id',
    },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  },
}, {
  tableName: 'task_tags',
  timestamps: true,
  underscored: true,
});

module.exports = TaskTag;
