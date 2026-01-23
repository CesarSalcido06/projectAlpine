/**
 * Project Alpine - TypeScript Type Definitions
 *
 * Shared types for tasks, categories, tags, and statistics.
 */

// Urgency levels for tasks
export type Urgency = 'low' | 'medium' | 'high' | 'critical';

// Task status options
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'archived';

// Tag definition
export interface Tag {
  id: number;
  name: string;
  color: string | null;
  createdAt?: string;
}

// Category definition
export interface Category {
  id: number;
  name: string;
  color: string | null;
  isDefault: boolean;
  createdAt?: string;
}

// Tracker update summary (returned when completing a tracked task)
export interface TrackerUpdateSummary {
  id: number;
  currentValue: number;
  targetValue: number;
  totalXP: number;
  level: number;
  currentStreak: number;
  xpEarned?: number;
  leveledUp?: boolean;
}

// Task definition
export interface Task {
  id: number;
  title: string;
  description: string | null;
  dueDate: string | null;
  urgency: Urgency;
  status: TaskStatus;
  categoryId: number | null;
  trackerId: number | null; // Reference to parent tracker for auto-generated tasks
  category?: Category;
  tags?: Tag[];
  createdAt: string;
  updatedAt: string;
  // Auto-repeat fields (returned when completing a tracked task)
  nextTask?: Task; // The next occurrence created by auto-repeat
  trackerUpdate?: TrackerUpdateSummary; // Summary of tracker progress update
}

// Task creation payload
export interface CreateTaskPayload {
  title: string;
  description?: string;
  dueDate?: string;
  urgency: string;
  categoryId?: number;
  tagIds?: number[];
}

// Task update payload
export interface UpdateTaskPayload {
  title?: string;
  description?: string;
  dueDate?: string;
  urgency?: string;
  status?: string;
  categoryId?: number;
  tagIds?: number[];
}

// Task query filters
export interface TaskFilters {
  limit?: number;
  offset?: number;
  categoryId?: number;
  tagId?: number;
  status?: string;
  urgency?: string;
  startDate?: string;
  endDate?: string;
}

// Urgency distribution in statistics
export interface UrgencyDistribution {
  low: number;
  medium: number;
  high: number;
  critical: number;
}

// Tag usage statistics
export interface TagStats {
  name: string;
  color: string | null;
  count: number;
}

// Overall statistics
export interface Stats {
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  urgencyDistribution: UrgencyDistribution;
  completionRate: number;
  topTags: TagStats[];
}

// API response wrapper
export interface ApiResponse<T> {
  data: T;
  message?: string;
  error?: string;
}

// ============================================================
// TRACKER TYPES (Gamified Goal Tracking)
// ============================================================

// Frequency options for trackers
export type TrackerFrequency = 'hourly' | 'daily' | 'weekly' | 'monthly';

// XP progress within current level
export interface XPProgress {
  current: number;
  needed: number;
  percentage: number;
}

// Achievement definition
export interface Achievement {
  id: string;
  name: string;
  icon: string;
  description: string;
  xpReward: number;
}

// Tracker definition
export interface Tracker {
  id: number;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  targetValue: number;
  targetUnit: string;
  frequency: TrackerFrequency;
  currentValue: number;
  periodStartDate: string;
  totalXP: number;
  level: number;
  currentStreak: number;
  bestStreak: number;
  lastCompletedAt: string | null;
  totalCompletions: number;
  totalPeriods: number;
  successfulPeriods: number;
  isActive: boolean;
  isPaused: boolean;
  generateTasks: boolean;
  taskCategoryId: number | null;
  taskUrgency: Urgency;
  // Scheduling fields for automatic task generation
  scheduledTime: string | null; // Time of day for task creation (e.g., "09:00")
  scheduledDays: number[] | null; // Days of week for weekly frequency (0=Sun to 6=Sat)
  scheduledDatesOfMonth: number[] | null; // Days of month for monthly frequency (1-31)
  createdAt: string;
  updatedAt: string;
  // Computed fields from API
  progressPercentage?: number;
  xpProgress?: XPProgress;
  streakMultiplier?: number;
  xpEarned?: number;
  leveledUp?: boolean;
  goalCompleted?: boolean;
  // Occurrence-based tracking fields
  lastOccurrenceDate?: string | null;
  nextOccurrence?: string; // Next scheduled occurrence date
  pendingCount?: number; // Number of pending tasks for this tracker
  isOverdue?: boolean; // Whether the next task is overdue
  streakBroken?: boolean; // Whether the streak was broken on last completion
  // Associated tasks (pending tasks for this tracker)
  tasks?: Task[];
}

// Tracker creation payload
export interface CreateTrackerPayload {
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  targetValue?: number;
  targetUnit?: string;
  frequency?: TrackerFrequency;
  generateTasks?: boolean;
  taskCategoryId?: number;
  taskUrgency?: Urgency;
  // Scheduling options for automatic task generation
  scheduledTime?: string; // Time of day (e.g., "09:00") - used for DAILY frequency
  scheduledDays?: number[]; // Days of week (0=Sun to 6=Sat) - used for WEEKLY frequency
  scheduledDatesOfMonth?: number[]; // Days of month (1-31) - used for MONTHLY frequency
}

// Tracker update payload
export interface UpdateTrackerPayload {
  name?: string;
  description?: string;
  icon?: string;
  color?: string;
  targetValue?: number;
  targetUnit?: string;
  frequency?: TrackerFrequency;
  isActive?: boolean;
  isPaused?: boolean;
  generateTasks?: boolean;
  taskCategoryId?: number;
  taskUrgency?: Urgency;
  // Scheduling options for automatic task generation
  scheduledTime?: string; // Time of day (e.g., "09:00") - used for DAILY frequency
  scheduledDays?: number[]; // Days of week (0=Sun to 6=Sat) - used for WEEKLY frequency
  scheduledDatesOfMonth?: number[]; // Days of month (1-31) - used for MONTHLY frequency
}

// Tracker overall statistics
export interface TrackerStats {
  totalTrackers: number;
  totalXP: number;
  totalCompletions: number;
  avgLevel: number;
  longestStreak: number;
  activeStreaks: number;
  achievements: Achievement[];
}

// ============================================================
// USER AUTHENTICATION TYPES
// ============================================================

// User definition
export interface User {
  id: number;
  username: string;
  displayName: string | null;
  isAdmin: boolean;
  isActive: boolean;
  isGuest: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// Auth state
export interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

// Login payload
export interface LoginPayload {
  username: string;
  password: string;
}

// Register payload
export interface RegisterPayload {
  username: string;
  password: string;
  displayName?: string;
}

// Create user payload (admin)
export interface CreateUserPayload {
  username: string;
  password: string;
  displayName?: string;
  isAdmin?: boolean;
}

// Update user payload (admin)
export interface UpdateUserPayload {
  displayName?: string;
  isAdmin?: boolean;
  isActive?: boolean;
  password?: string;
}

// Auth response
export interface AuthResponse {
  user: User;
  message?: string;
}

// Setup status response
export interface SetupStatus {
  hasUsers: boolean;
}
