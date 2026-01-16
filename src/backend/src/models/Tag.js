/**
 * Project Alpine - Tag Model
 *
 * Represents tags that can be attached to tasks.
 * Tags are user-defined and can have custom colors.
 */

const { DataTypes } = require('sequelize');

/**
 * Define Tag model for a given Sequelize instance
 */
function defineTag(sequelize) {
  const Tag = sequelize.define('Tag', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true,
        len: [1, 50],
      },
    },
    color: {
      type: DataTypes.STRING(20),
      allowNull: true,
      defaultValue: '#4299E1', // Default blue color
      validate: {
        // Validate hex color format
        is: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/i,
      },
    },
  }, {
    tableName: 'tags',
    timestamps: true,
  });

  return Tag;
}

module.exports = { defineTag };
