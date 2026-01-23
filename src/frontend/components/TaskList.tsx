/**
 * Project Alpine - Task List Component
 *
 * Displays a list of tasks with urgency indicators, tags, and quick actions.
 */

'use client';

import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Checkbox,
  IconButton,
  Card,
  CardHeader,
  CardBody,
  Heading,
} from '@chakra-ui/react';
import { useState, useEffect } from 'react';
import { fetchTasks, updateTask } from '@/lib/api';
import type { Task } from '@/lib/types';
import { useRefresh } from '@/contexts/RefreshContext';
import { formatDate, isToday, isOverdue } from '@/lib/dateUtils';

// Urgency level color mapping
const urgencyColors: Record<string, string> = {
  low: 'urgency.low',
  medium: 'urgency.medium',
  high: 'urgency.high',
  critical: 'urgency.critical',
};

// Urgency label mapping
const urgencyLabels: Record<string, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
};

interface TaskListProps {
  limit?: number;
  title?: string;
  categoryId?: number;
  tagId?: number;
}

export default function TaskList({
  limit,
  title = 'Tasks',
  categoryId,
  tagId,
}: TaskListProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const { refreshKey, triggerRefresh } = useRefresh();

  // Fetch tasks on mount, when filters change, or when refresh is triggered
  useEffect(() => {
    const loadTasks = async () => {
      setLoading(true);
      try {
        const data = await fetchTasks({ limit, categoryId, tagId });
        setTasks(data);
      } catch (error) {
        console.error('Failed to load tasks:', error);
      } finally {
        setLoading(false);
      }
    };
    loadTasks();
  }, [limit, categoryId, tagId, refreshKey]);

  // Handle task completion toggle
  const handleToggleComplete = async (task: Task) => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    try {
      await updateTask(task.id, { status: newStatus });
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t))
      );
      triggerRefresh(); // Refresh other components
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  };

  // Format due date for display (uses UTC for consistency)
  const formatTaskDueDate = (dateString: string) => {
    if (isToday(dateString)) {
      return 'Today';
    }
    // Check tomorrow using UTC
    const date = new Date(dateString);
    const now = new Date();
    const tomorrowUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
    const dateUTC = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
    if (dateUTC === tomorrowUTC) {
      return 'Tomorrow';
    }
    return formatDate(dateString);
  };

  return (
    <Card bg="dark.card" borderColor="dark.border" borderWidth="1px">
      <CardHeader pb={2}>
        <Heading size="sm">{title}</Heading>
      </CardHeader>
      <CardBody pt={0}>
        {loading ? (
          <Text color="gray.500" fontSize="sm">
            Loading tasks...
          </Text>
        ) : tasks.filter((t) => t.status !== 'completed').length === 0 ? (
          <Text color="gray.500" fontSize="sm">
            No tasks found
          </Text>
        ) : (
          <VStack align="stretch" spacing={3}>
            {tasks.filter((t) => t.status !== 'completed').map((task) => (
              <HStack
                key={task.id}
                p={3}
                bg="dark.bg"
                borderRadius="md"
                borderLeft="3px solid"
                borderLeftColor={urgencyColors[task.urgency] || 'gray.500'}
                _hover={{ bg: 'dark.hover' }}
                cursor="pointer"
              >
                {/* Completion checkbox */}
                <Checkbox
                  isChecked={task.status === 'completed'}
                  onChange={() => handleToggleComplete(task)}
                  colorScheme="green"
                />

                {/* Task content */}
                <VStack align="start" flex="1" spacing={1}>
                  <Text
                    fontSize="sm"
                    fontWeight="medium"
                    textDecoration={
                      task.status === 'completed' ? 'line-through' : 'none'
                    }
                    color={task.status === 'completed' ? 'gray.500' : 'white'}
                  >
                    {task.title}
                  </Text>

                  <HStack spacing={2}>
                    {/* Due date */}
                    {task.dueDate && (
                      <Text fontSize="xs" color="gray.400">
                        {formatTaskDueDate(task.dueDate)}
                      </Text>
                    )}

                    {/* Tags */}
                    {task.tags?.slice(0, 2).map((tag) => (
                      <Badge
                        key={tag.id}
                        bg={tag.color || 'gray.600'}
                        color="white"
                        fontSize="xs"
                        px={1.5}
                        borderRadius="full"
                      >
                        {tag.name}
                      </Badge>
                    ))}
                  </HStack>
                </VStack>

                {/* Urgency badge */}
                <Badge
                  bg={urgencyColors[task.urgency]}
                  color="white"
                  fontSize="xs"
                  px={2}
                >
                  {urgencyLabels[task.urgency]}
                </Badge>
              </HStack>
            ))}
          </VStack>
        )}
      </CardBody>
    </Card>
  );
}
