/**
 * Project Alpine - Tracker Model
 *
 * Gamified goal tracking with XP, levels, streaks, and recurring schedules.
 */

const { DataTypes } = require('sequelize');

// Valid frequencies
const FREQUENCIES = ['hourly', 'daily', 'weekly', 'monthly'];

// XP rewards configuration
const XP_REWARDS = {
  hourly: 5,
  daily: 10,
  weekly: 50,
  monthly: 200,
  streakBonus: 0.1, // 10% bonus per streak
  maxStreakMultiplier: 2.0,
};

// Achievement definitions
const ACHIEVEMENTS = [
  { id: 'first_completion', name: 'First Step', icon: '🌟', description: 'Complete your first goal', xpReward: 50 },
  { id: 'streak_7', name: 'Week Warrior', icon: '🔥', description: '7-day streak', xpReward: 100 },
  { id: 'streak_30', name: 'Monthly Master', icon: '💪', description: '30-day streak', xpReward: 500 },
  { id: 'streak_100', name: 'Centurion', icon: '🏆', description: '100-day streak', xpReward: 2000 },
  { id: 'level_5', name: 'Rising Star', icon: '⭐', description: 'Reach level 5', xpReward: 200 },
  { id: 'level_10', name: 'Dedicated', icon: '💫', description: 'Reach level 10', xpReward: 500 },
  { id: 'perfect_week', name: 'Perfect Week', icon: '✨', description: 'Complete all goals for a week', xpReward: 150 },
  { id: 'completions_100', name: 'Century Club', icon: '💯', description: '100 total completions', xpReward: 300 },
];

/**
 * Define Tracker model for a given Sequelize instance
 */
function defineTracker(sequelize) {
  const Tracker = sequelize.define('Tracker', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    // Basic info
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    icon: {
      type: DataTypes.STRING,
      defaultValue: '🎯',
    },
    color: {
      type: DataTypes.STRING,
      defaultValue: '#805AD5',
    },

    // Goal settings
    targetValue: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      comment: 'Target completions per period (e.g., read 30 pages)',
    },
    targetUnit: {
      type: DataTypes.STRING,
      defaultValue: 'times',
      comment: 'Unit of measurement (times, pages, minutes, miles, etc.)',
    },

    // Schedule
    frequency: {
      type: DataTypes.ENUM(...FREQUENCIES),
      defaultValue: 'daily',
    },

    // Current period progress
    currentValue: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    periodStartDate: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },

    // Gamification - XP & Levels
    totalXP: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    level: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
    },

    // Streaks
    currentStreak: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    bestStreak: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    lastCompletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    // Lifetime stats
    totalCompletions: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    totalPeriods: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    successfulPeriods: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },

    // Status
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    isPaused: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },

    // Link to tasks (optional - for auto-generating tasks)
    generateTasks: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    taskCategoryId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    taskUrgency: {
      type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
      defaultValue: 'medium',
      comment: 'Urgency level for generated tasks',
    },

    // Scheduling options for automatic task generation
    scheduledTime: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Time of day for task creation (e.g., "09:00") - used for daily/weekly/monthly',
    },
    scheduledDays: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Days of week for weekly frequency (0=Sun to 6=Sat)',
    },
    scheduledDatesOfMonth: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Days of month for monthly frequency (1-31)',
    },
  }, {
    tableName: 'trackers',
    timestamps: true,
  });

  // Static methods
  Tracker.XP_REWARDS = XP_REWARDS;
  Tracker.ACHIEVEMENTS = ACHIEVEMENTS;
  Tracker.FREQUENCIES = FREQUENCIES;

  // Helper functions
  Tracker.calculateLevel = (totalXP) => {
    // Level formula: level = floor(sqrt(totalXP / 50))
    // Level 1: 0-99 XP, Level 2: 100-249 XP, etc.
    let level = 1;
    let xpNeeded = 100;
    let totalNeeded = 0;

    while (totalXP >= totalNeeded + xpNeeded) {
      totalNeeded += xpNeeded;
      level++;
      xpNeeded = level * 100;
    }

    return level;
  };

  Tracker.getXPProgress = (totalXP, level) => {
    // Calculate XP progress within current level
    let totalNeeded = 0;
    for (let i = 1; i < level; i++) {
      totalNeeded += i * 100;
    }
    const currentLevelXP = totalXP - totalNeeded;
    const nextLevelXP = level * 100;

    return {
      current: currentLevelXP,
      needed: nextLevelXP,
      percentage: Math.min(100, Math.round((currentLevelXP / nextLevelXP) * 100)),
    };
  };

  Tracker.getStreakMultiplier = (streak) => {
    // +10% per streak day, max 2x
    return Math.min(1 + streak * XP_REWARDS.streakBonus, XP_REWARDS.maxStreakMultiplier);
  };

  return Tracker;
}

module.exports = {
  defineTracker,
  FREQUENCIES,
  XP_REWARDS,
  ACHIEVEMENTS,
};
