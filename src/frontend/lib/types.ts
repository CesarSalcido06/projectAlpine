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

// Task definition
export interface Task {
  id: number;
  title: string;
  description: string | null;
  dueDate: string | null;
  urgency: Urgency;
  status: TaskStatus;
  categoryId: number | null;
  category?: Category;
  tags?: Tag[];
  createdAt: string;
  updatedAt: string;
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
