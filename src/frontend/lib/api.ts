/**
 * Project Alpine - API Client
 *
 * Handles all HTTP requests to the backend API.
 * Uses axios for HTTP requests with proper error handling.
 */

import axios from 'axios';
import type {
  Task,
  Category,
  Tag,
  Stats,
  TagStats,
  CreateTaskPayload,
  UpdateTaskPayload,
  TaskFilters,
  Tracker,
  CreateTrackerPayload,
  UpdateTrackerPayload,
  TrackerStats,
  User,
  LoginPayload,
  RegisterPayload,
  CreateUserPayload,
  UpdateUserPayload,
  AuthResponse,
  SetupStatus,
} from './types';

// API base URL - configurable via environment variable
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 second timeout
  withCredentials: true, // Send cookies with requests
});

// ============================================================
// TASK ENDPOINTS
// ============================================================

/**
 * Fetch tasks with optional filters
 */
export async function fetchTasks(filters: TaskFilters = {}): Promise<Task[]> {
  try {
    const params = new URLSearchParams();

    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.offset) params.append('offset', filters.offset.toString());
    if (filters.categoryId) params.append('categoryId', filters.categoryId.toString());
    if (filters.tagId) params.append('tagId', filters.tagId.toString());
    if (filters.status) params.append('status', filters.status);
    if (filters.urgency) params.append('urgency', filters.urgency);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);

    const response = await api.get<Task[]>(`/tasks?${params.toString()}`);
    return response.data;
  } catch (error) {
    console.error('Failed to fetch tasks:', error);
    return [];
  }
}

/**
 * Fetch a single task by ID
 */
export async function fetchTask(id: number): Promise<Task | null> {
  try {
    const response = await api.get<Task>(`/tasks/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Failed to fetch task ${id}:`, error);
    return null;
  }
}

/**
 * Create a new task
 */
export async function createTask(payload: CreateTaskPayload): Promise<Task> {
  const response = await api.post<Task>('/tasks', payload);
  return response.data;
}

/**
 * Update an existing task
 */
export async function updateTask(
  id: number,
  payload: UpdateTaskPayload
): Promise<Task> {
  const response = await api.put<Task>(`/tasks/${id}`, payload);
  return response.data;
}

/**
 * Complete a tracked task (marks complete, logs to tracker, creates next task)
 */
export async function completeTrackerTask(taskId: number): Promise<Task> {
  const response = await api.put<Task>(`/tasks/${taskId}`, { status: 'completed' });
  return response.data;
}

/**
 * Delete a task (archives it)
 */
export async function deleteTask(id: number): Promise<void> {
  await api.delete(`/tasks/${id}`);
}

// ============================================================
// CATEGORY ENDPOINTS
// ============================================================

/**
 * Fetch all categories
 */
export async function fetchCategories(): Promise<Category[]> {
  try {
    const response = await api.get<Category[]>('/categories');
    return response.data;
  } catch (error) {
    console.error('Failed to fetch categories:', error);
    return [];
  }
}

/**
 * Create a new category
 */
export async function createCategory(
  name: string,
  color?: string
): Promise<Category> {
  const response = await api.post<Category>('/categories', { name, color });
  return response.data;
}

/**
 * Delete a category
 */
export async function deleteCategory(id: number): Promise<void> {
  await api.delete(`/categories/${id}`);
}

// ============================================================
// TAG ENDPOINTS
// ============================================================

/**
 * Fetch all tags
 */
export async function fetchTags(): Promise<Tag[]> {
  try {
    const response = await api.get<Tag[]>('/tags');
    return response.data;
  } catch (error) {
    console.error('Failed to fetch tags:', error);
    return [];
  }
}

/**
 * Create a new tag
 */
export async function createTag(name: string, color?: string): Promise<Tag> {
  const response = await api.post<Tag>('/tags', { name, color });
  return response.data;
}

/**
 * Delete a tag
 */
export async function deleteTag(id: number): Promise<void> {
  await api.delete(`/tags/${id}`);
}

// ============================================================
// STATISTICS ENDPOINTS
// ============================================================

/**
 * Fetch overall statistics
 */
export async function fetchStats(): Promise<Stats> {
  try {
    const response = await api.get<Stats>('/stats');
    return response.data;
  } catch (error) {
    console.error('Failed to fetch stats:', error);
    // Return default stats on error
    return {
      totalTasks: 0,
      completedTasks: 0,
      pendingTasks: 0,
      urgencyDistribution: { low: 0, medium: 0, high: 0, critical: 0 },
      completionRate: 0,
      topTags: [],
    };
  }
}

/**
 * Fetch tag usage statistics over time
 */
export async function fetchTagStats(
  startDate?: string,
  endDate?: string
): Promise<TagStats[]> {
  try {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    const response = await api.get<TagStats[]>(`/stats/tags?${params.toString()}`);
    return response.data;
  } catch (error) {
    console.error('Failed to fetch tag stats:', error);
    return [];
  }
}

// ============================================================
// TRACKER ENDPOINTS (Gamified Goal Tracking)
// ============================================================

/**
 * Fetch all trackers
 */
export async function fetchTrackers(active?: boolean): Promise<Tracker[]> {
  try {
    const params = new URLSearchParams();
    if (active !== undefined) params.append('active', active.toString());
    const response = await api.get<Tracker[]>(`/trackers?${params.toString()}`);
    return response.data;
  } catch (error) {
    console.error('Failed to fetch trackers:', error);
    return [];
  }
}

/**
 * Fetch a single tracker by ID
 */
export async function fetchTracker(id: number): Promise<Tracker | null> {
  try {
    const response = await api.get<Tracker>(`/trackers/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Failed to fetch tracker ${id}:`, error);
    return null;
  }
}

/**
 * Fetch tracker overall statistics
 */
export async function fetchTrackerStats(): Promise<TrackerStats> {
  try {
    const response = await api.get<TrackerStats>('/trackers/stats');
    return response.data;
  } catch (error) {
    console.error('Failed to fetch tracker stats:', error);
    return {
      totalTrackers: 0,
      totalXP: 0,
      totalCompletions: 0,
      avgLevel: 1,
      longestStreak: 0,
      activeStreaks: 0,
      achievements: [],
    };
  }
}

/**
 * Create a new tracker
 */
export async function createTracker(payload: CreateTrackerPayload): Promise<Tracker> {
  const response = await api.post<Tracker>('/trackers', payload);
  return response.data;
}

/**
 * Update an existing tracker
 */
export async function updateTracker(
  id: number,
  payload: UpdateTrackerPayload
): Promise<Tracker> {
  const response = await api.put<Tracker>(`/trackers/${id}`, payload);
  return response.data;
}

/**
 * Log progress for a tracker (increments current value)
 */
export async function logTrackerProgress(
  id: number,
  value: number = 1
): Promise<Tracker> {
  const response = await api.post<Tracker>(`/trackers/${id}/log`, { value });
  return response.data;
}

/**
 * Reset a tracker's current period
 */
export async function resetTracker(id: number): Promise<Tracker> {
  const response = await api.post<Tracker>(`/trackers/${id}/reset`);
  return response.data;
}

/**
 * Delete a tracker
 */
export async function deleteTracker(id: number): Promise<void> {
  await api.delete(`/trackers/${id}`);
}

// ============================================================
// AUTHENTICATION ENDPOINTS
// ============================================================

/**
 * Check if any users exist (for first-time setup)
 */
export async function checkSetup(): Promise<SetupStatus> {
  try {
    const response = await api.get<SetupStatus>('/auth/check-setup');
    return response.data;
  } catch (error) {
    console.error('Failed to check setup:', error);
    return { hasUsers: true }; // Default to true on error
  }
}

/**
 * Register a new user (first user becomes admin)
 */
export async function register(payload: RegisterPayload): Promise<AuthResponse> {
  const response = await api.post<AuthResponse>('/auth/register', payload);
  return response.data;
}

/**
 * Login with username and password
 */
export async function login(payload: LoginPayload): Promise<AuthResponse> {
  const response = await api.post<AuthResponse>('/auth/login', payload);
  return response.data;
}

/**
 * Logout (clears auth cookie)
 */
export async function logout(): Promise<void> {
  await api.post('/auth/logout');
}

/**
 * Get current authenticated user
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const response = await api.get<{ user: User }>('/auth/me');
    return response.data.user;
  } catch (error) {
    // Not authenticated
    return null;
  }
}

// ============================================================
// ADMIN ENDPOINTS (User Management)
// ============================================================

/**
 * Get all users (admin only)
 */
export async function fetchUsers(): Promise<User[]> {
  try {
    const response = await api.get<{ users: User[] }>('/admin/users');
    return response.data.users;
  } catch (error) {
    console.error('Failed to fetch users:', error);
    return [];
  }
}

/**
 * Create a new user (admin only)
 */
export async function createUser(payload: CreateUserPayload): Promise<User> {
  const response = await api.post<{ user: User; message: string }>('/admin/users', payload);
  return response.data.user;
}

/**
 * Update a user (admin only)
 */
export async function updateUser(id: number, payload: UpdateUserPayload): Promise<User> {
  const response = await api.put<{ user: User; message: string }>(`/admin/users/${id}`, payload);
  return response.data.user;
}

/**
 * Delete a user (admin only)
 */
export async function deleteUser(id: number): Promise<void> {
  await api.delete(`/admin/users/${id}`);
}

export default api;
