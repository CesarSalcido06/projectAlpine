/**
 * Project Alpine - Category Model
 *
 * Represents task categories (e.g., School, Sports, Personal).
 * Each category can have a custom color and one can be marked as default.
 */

const { DataTypes } = require('sequelize');

/**
 * Define Category model for a given Sequelize instance
 */
function defineCategory(sequelize) {
  const Category = sequelize.define('Category', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true,
        len: [1, 100],
      },
    },
    color: {
      type: DataTypes.STRING(20),
      allowNull: true,
      defaultValue: '#718096', // Default gray color
      validate: {
        // Validate hex color format
        is: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/i,
      },
    },
    isDefault: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  }, {
    tableName: 'categories',
    timestamps: true,
  });

  return Category;
}

module.exports = { defineCategory };
