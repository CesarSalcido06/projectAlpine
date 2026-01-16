/**
 * Project Alpine - Task Model
 *
 * Core model representing a task with title, description,
 * due date, urgency level, and status.
 */

const { DataTypes } = require('sequelize');

// Valid urgency levels
const URGENCY_LEVELS = ['low', 'medium', 'high', 'critical'];

// Valid task statuses
const TASK_STATUSES = ['pending', 'in_progress', 'completed', 'archived'];

/**
 * Define Task model for a given Sequelize instance
 */
function defineTask(sequelize) {
  const Task = sequelize.define('Task', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 255],
      },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    dueDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    urgency: {
      type: DataTypes.ENUM(...URGENCY_LEVELS),
      allowNull: false,
      defaultValue: 'medium',
      validate: {
        isIn: [URGENCY_LEVELS],
      },
    },
    status: {
      type: DataTypes.ENUM(...TASK_STATUSES),
      allowNull: false,
      defaultValue: 'pending',
      validate: {
        isIn: [TASK_STATUSES],
      },
    },
    categoryId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'categories',
        key: 'id',
      },
    },
    trackerId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'trackers',
        key: 'id',
      },
      comment: 'Reference to parent tracker for auto-generated tasks',
    },
  }, {
    tableName: 'tasks',
    timestamps: true,
  });

  // Export constants for use elsewhere
  Task.URGENCY_LEVELS = URGENCY_LEVELS;
  Task.TASK_STATUSES = TASK_STATUSES;

  return Task;
}

// Export constants at module level as well
module.exports = {
  defineTask,
  URGENCY_LEVELS,
  TASK_STATUSES,
};
