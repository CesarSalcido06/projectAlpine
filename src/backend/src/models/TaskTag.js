/**
 * Project Alpine - Task-Tag Junction Model
 *
 * Explicit junction table for the many-to-many relationship
 * between Tasks and Tags. Uses surrogate id to prevent SQLite
 * from adding unique constraints to individual foreign keys.
 */

const { DataTypes } = require('sequelize');

/**
 * Define TaskTag junction model for a given Sequelize instance
 */
function defineTaskTag(sequelize) {
  const TaskTag = sequelize.define('task_tags', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    taskId: {
      type: DataTypes.INTEGER,
      allowNull: false,
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
      allowNull: false,
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
    // Only the combination of task_id + tag_id should be unique
    indexes: [
      {
        unique: true,
        fields: ['task_id', 'tag_id'],
      },
    ],
  });

  return TaskTag;
}

module.exports = { defineTaskTag };
