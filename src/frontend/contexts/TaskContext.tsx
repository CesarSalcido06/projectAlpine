/**
 * Project Alpine - Task Context
 *
 * Global state management for tasks.
 * Provides centralized task state and operations across all components.
 */

'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { fetchTasks, updateTask as apiUpdateTask, createTask as apiCreateTask } from '@/lib/api';
import type { Task, TaskFilters, UpdateTaskPayload, CreateTaskPayload } from '@/lib/types';

interface TaskContextType {
  tasks: Task[];
  loading: boolean;
  error: string | null;
  loadTasks: (filters?: TaskFilters) => Promise<void>;
  updateTask: (id: number, updates: UpdateTaskPayload) => Promise<Task | null>;
  createTask: (payload: CreateTaskPayload) => Promise<Task | null>;
  toggleTaskStatus: (task: Task) => Promise<void>;
  getTaskById: (id: number) => Task | undefined;
  refreshTasks: () => Promise<void>;
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

interface TaskProviderProps {
  children: ReactNode;
}

export function TaskProvider({ children }: TaskProviderProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentFilters, setCurrentFilters] = useState<TaskFilters>({});

  // Load tasks with optional filters
  const loadTasks = useCallback(async (filters?: TaskFilters) => {
    setLoading(true);
    setError(null);
    try {
      const newFilters = filters || currentFilters;
      setCurrentFilters(newFilters);
      const data = await fetchTasks(newFilters);
      setTasks(data);
    } catch (err) {
      setError('Failed to load tasks');
      console.error('Error loading tasks:', err);
    } finally {
      setLoading(false);
    }
  }, [currentFilters]);

  // Refresh tasks with current filters
  const refreshTasks = useCallback(async () => {
    await loadTasks(currentFilters);
  }, [loadTasks, currentFilters]);

  // Update a single task and refresh state
  const updateTask = useCallback(async (id: number, updates: UpdateTaskPayload): Promise<Task | null> => {
    try {
      const updatedTask = await apiUpdateTask(id, updates);

      // Update local state immediately
      setTasks(prevTasks =>
        prevTasks.map(task =>
          task.id === id ? { ...task, ...updatedTask } : task
        )
      );

      return updatedTask;
    } catch (err) {
      console.error('Error updating task:', err);
      setError('Failed to update task');
      return null;
    }
  }, []);

  // Create a new task
  const createTask = useCallback(async (payload: CreateTaskPayload): Promise<Task | null> => {
    try {
      const newTask = await apiCreateTask(payload);

      // Add to local state
      setTasks(prevTasks => [newTask, ...prevTasks]);

      return newTask;
    } catch (err) {
      console.error('Error creating task:', err);
      setError('Failed to create task');
      return null;
    }
  }, []);

  // Toggle task between pending and completed
  const toggleTaskStatus = useCallback(async (task: Task) => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    await updateTask(task.id, { status: newStatus });
  }, [updateTask]);

  // Get a task by ID
  const getTaskById = useCallback((id: number): Task | undefined => {
    return tasks.find(task => task.id === id);
  }, [tasks]);

  const value: TaskContextType = {
    tasks,
    loading,
    error,
    loadTasks,
    updateTask,
    createTask,
    toggleTaskStatus,
    getTaskById,
    refreshTasks,
  };

  return (
    <TaskContext.Provider value={value}>
      {children}
    </TaskContext.Provider>
  );
}

// Custom hook to use task context
export function useTaskContext() {
  const context = useContext(TaskContext);
  if (context === undefined) {
    throw new Error('useTaskContext must be used within a TaskProvider');
  }
  return context;
}

export default TaskContext;
