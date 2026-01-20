/**
 * Project Alpine - Full Task List Component
 *
 * Complete task list with sorting, filtering, and organization tools.
 * Displays all tasks in a top-down list with full controls.
 */

'use client';

import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Checkbox,
  Button,
  Select,
  Input,
  InputGroup,
  InputLeftElement,
  Card,
  CardHeader,
  CardBody,
  Heading,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Flex,
  Divider,
  useToast,
} from '@chakra-ui/react';
import { useState, useEffect, useMemo } from 'react';
import { fetchTasks, fetchCategories, fetchTags, updateTask, deleteTask } from '@/lib/api';
import type { Task, Category, Tag } from '@/lib/types';
import { useRefresh } from '@/contexts/RefreshContext';

// Sorting options type
type SortField = 'dueDate' | 'urgency' | 'category' | 'title' | 'createdAt';
type SortOrder = 'asc' | 'desc';

interface SortOptions {
  sortBy: SortField;
  sortOrder: SortOrder;
}

// Urgency level color mapping
const urgencyColors: Record<string, string> = {
  low: 'green.500',
  medium: 'yellow.500',
  high: 'orange.500',
  critical: 'red.500',
};

const urgencyLabels: Record<string, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
};

const urgencyOrder: Record<string, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

interface TaskListFullProps {
  showArchived?: boolean;
  title?: string;
  onTaskClick?: (task: Task) => void;
}

export default function TaskListFull({
  showArchived = false,
  title = 'All Tasks',
  onTaskClick,
}: TaskListFullProps) {
  // Data state
  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [filterTag, setFilterTag] = useState<string>('');
  const [filterUrgency, setFilterUrgency] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');

  // Sort state
  const [sortOptions, setSortOptions] = useState<SortOptions>({
    sortBy: 'dueDate',
    sortOrder: 'asc',
  });

  const toast = useToast();
  const { refreshKey, triggerRefresh } = useRefresh();

  // Fetch all data on mount and when refresh is triggered
  useEffect(() => {
    loadData();
  }, [showArchived, refreshKey]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [tasksData, categoriesData, tagsData] = await Promise.all([
        fetchTasks({ status: showArchived ? 'archived' : undefined }),
        fetchCategories(),
        fetchTags(),
      ]);
      setTasks(tasksData);
      setCategories(categoriesData);
      setTags(tagsData);
    } catch (error) {
      console.error('Failed to load data:', error);
      toast({
        title: 'Failed to load tasks',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort tasks
  const filteredAndSortedTasks = useMemo(() => {
    let result = [...tasks];

    // Hide completed tasks by default (unless explicitly filtered for completed)
    if (!filterStatus || filterStatus !== 'completed') {
      result = result.filter((task) => task.status !== 'completed');
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (task) =>
          task.title.toLowerCase().includes(query) ||
          task.description?.toLowerCase().includes(query)
      );
    }

    // Apply category filter
    if (filterCategory) {
      result = result.filter(
        (task) => task.categoryId?.toString() === filterCategory
      );
    }

    // Apply tag filter
    if (filterTag) {
      result = result.filter((task) =>
        task.tags?.some((tag) => tag.id.toString() === filterTag)
      );
    }

    // Apply urgency filter
    if (filterUrgency) {
      result = result.filter((task) => task.urgency === filterUrgency);
    }

    // Apply status filter
    if (filterStatus) {
      result = result.filter((task) => task.status === filterStatus);
    }

    // Apply sorting
    result.sort((a, b) => {
      let comparison = 0;

      switch (sortOptions.sortBy) {
        case 'dueDate':
          const dateA = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
          const dateB = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
          comparison = dateA - dateB;
          break;

        case 'urgency':
          comparison =
            (urgencyOrder[b.urgency] || 0) - (urgencyOrder[a.urgency] || 0);
          break;

        case 'category':
          const catA = categories.find((c) => c.id === a.categoryId)?.name || '';
          const catB = categories.find((c) => c.id === b.categoryId)?.name || '';
          comparison = catA.localeCompare(catB);
          break;

        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;

        case 'createdAt':
          comparison =
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          break;
      }

      return sortOptions.sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [tasks, searchQuery, filterCategory, filterTag, filterUrgency, filterStatus, sortOptions, categories]);

  // Handle task completion toggle
  const handleToggleComplete = async (task: Task, e: React.MouseEvent) => {
    e.stopPropagation();
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    try {
      await updateTask(task.id, { status: newStatus });
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t))
      );
      toast({
        title: newStatus === 'completed' ? 'Task completed!' : 'Task reopened',
        status: 'success',
        duration: 2000,
      });
      triggerRefresh(); // Refresh other components
    } catch (error) {
      toast({
        title: 'Failed to update task',
        status: 'error',
        duration: 3000,
      });
    }
  };

  // Handle task deletion
  const handleDeleteTask = async (taskId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteTask(taskId);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      toast({
        title: 'Task archived',
        status: 'info',
        duration: 2000,
      });
      triggerRefresh(); // Refresh other components
    } catch (error) {
      toast({
        title: 'Failed to delete task',
        status: 'error',
        duration: 3000,
      });
    }
  };

  // Format due date for display
  const formatDueDate = (dateString: string, taskStatus?: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Completed tasks should not show as overdue
    if (taskStatus === 'completed') {
      return {
        text: date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        }),
        color: 'green.400',
      };
    }

    if (date.toDateString() === today.toDateString()) {
      return { text: 'Today', color: 'orange.400' };
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return { text: 'Tomorrow', color: 'yellow.400' };
    } else if (date < today) {
      return { text: 'Overdue', color: 'red.400' };
    } else {
      return {
        text: date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        }),
        color: 'gray.400',
      };
    }
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery('');
    setFilterCategory('');
    setFilterTag('');
    setFilterUrgency('');
    setFilterStatus('');
  };

  const hasActiveFilters =
    searchQuery || filterCategory || filterTag || filterUrgency || filterStatus;

  return (
    <Card bg="dark.card" borderColor="dark.border" borderWidth="1px">
      <CardHeader>
        <VStack align="stretch" spacing={4}>
          {/* Header with title and count */}
          <Flex justify="space-between" align="center">
            <HStack>
              <Heading size="md">{title}</Heading>
              <Badge colorScheme="brand" fontSize="sm">
                {filteredAndSortedTasks.length} tasks
              </Badge>
            </HStack>

            {/* Sort controls */}
            <HStack spacing={2}>
              <Select
                size="sm"
                value={sortOptions.sortBy}
                onChange={(e) =>
                  setSortOptions((prev) => ({
                    ...prev,
                    sortBy: e.target.value as SortField,
                  }))
                }
                bg="dark.bg"
                borderColor="dark.border"
                w="140px"
              >
                <option value="dueDate">Sort by Date</option>
                <option value="urgency">Sort by Urgency</option>
                <option value="category">Sort by Category</option>
                <option value="title">Sort by Title</option>
                <option value="createdAt">Sort by Created</option>
              </Select>

              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  setSortOptions((prev) => ({
                    ...prev,
                    sortOrder: prev.sortOrder === 'asc' ? 'desc' : 'asc',
                  }))
                }
              >
                {sortOptions.sortOrder === 'asc' ? '↑' : '↓'}
              </Button>
            </HStack>
          </Flex>

          {/* Filter controls */}
          <HStack spacing={3} flexWrap="wrap">
            {/* Search */}
            <InputGroup size="sm" maxW="200px">
              <InputLeftElement pointerEvents="none">
                <Text color="gray.400">🔍</Text>
              </InputLeftElement>
              <Input
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                bg="dark.bg"
                borderColor="dark.border"
              />
            </InputGroup>

            {/* Category filter */}
            <Select
              size="sm"
              placeholder="All Categories"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              bg="dark.bg"
              borderColor="dark.border"
              maxW="150px"
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id.toString()}>
                  {cat.name}
                </option>
              ))}
            </Select>

            {/* Tag filter */}
            <Select
              size="sm"
              placeholder="All Tags"
              value={filterTag}
              onChange={(e) => setFilterTag(e.target.value)}
              bg="dark.bg"
              borderColor="dark.border"
              maxW="150px"
            >
              {tags.map((tag) => (
                <option key={tag.id} value={tag.id.toString()}>
                  {tag.name}
                </option>
              ))}
            </Select>

            {/* Urgency filter */}
            <Select
              size="sm"
              placeholder="All Urgency"
              value={filterUrgency}
              onChange={(e) => setFilterUrgency(e.target.value)}
              bg="dark.bg"
              borderColor="dark.border"
              maxW="130px"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </Select>

            {/* Status filter */}
            <Select
              size="sm"
              placeholder="All Status"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              bg="dark.bg"
              borderColor="dark.border"
              maxW="130px"
            >
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </Select>

            {/* Clear filters button */}
            {hasActiveFilters && (
              <Button size="sm" variant="ghost" onClick={clearFilters}>
                Clear filters
              </Button>
            )}
          </HStack>
        </VStack>
      </CardHeader>

      <Divider borderColor="dark.border" />

      <CardBody>
        {loading ? (
          <Text color="gray.500">Loading tasks...</Text>
        ) : filteredAndSortedTasks.length === 0 ? (
          <VStack py={8} spacing={3}>
            <Text fontSize="2xl">📋</Text>
            <Text color="gray.500">
              {hasActiveFilters
                ? 'No tasks match your filters'
                : 'No tasks yet. Create one to get started!'}
            </Text>
            {hasActiveFilters && (
              <Button size="sm" variant="outline" onClick={clearFilters}>
                Clear filters
              </Button>
            )}
          </VStack>
        ) : (
          <VStack align="stretch" spacing={2}>
            {filteredAndSortedTasks.map((task) => {
              const dueDateInfo = task.dueDate
                ? formatDueDate(task.dueDate, task.status)
                : null;
              const category = categories.find((c) => c.id === task.categoryId);

              return (
                <HStack
                  key={task.id}
                  p={4}
                  bg="dark.bg"
                  borderRadius="md"
                  borderLeft="4px solid"
                  borderLeftColor={urgencyColors[task.urgency] || 'gray.500'}
                  _hover={{ bg: 'dark.hover' }}
                  cursor="pointer"
                  onClick={() => onTaskClick?.(task)}
                  justify="space-between"
                >
                  <HStack flex="1" spacing={4}>
                    {/* Completion checkbox */}
                    <Checkbox
                      isChecked={task.status === 'completed'}
                      onChange={() => {}}
                      onClick={(e) => handleToggleComplete(task, e)}
                      colorScheme="green"
                      size="lg"
                    />

                    {/* Task content */}
                    <VStack align="start" flex="1" spacing={1}>
                      <Text
                        fontSize="md"
                        fontWeight="medium"
                        textDecoration={
                          task.status === 'completed' ? 'line-through' : 'none'
                        }
                        color={
                          task.status === 'completed' ? 'gray.500' : 'white'
                        }
                      >
                        {task.title}
                      </Text>

                      {task.description && (
                        <Text
                          fontSize="sm"
                          color="gray.400"
                          noOfLines={1}
                        >
                          {task.description}
                        </Text>
                      )}

                      <HStack spacing={3} mt={1}>
                        {/* Category */}
                        {category && (
                          <HStack spacing={1}>
                            <Box
                              w={2}
                              h={2}
                              borderRadius="full"
                              bg={category.color || 'gray.500'}
                            />
                            <Text fontSize="xs" color="gray.400">
                              {category.name}
                            </Text>
                          </HStack>
                        )}

                        {/* Due date */}
                        {dueDateInfo && (
                          <Text fontSize="xs" color={dueDateInfo.color}>
                            {dueDateInfo.text}
                          </Text>
                        )}

                        {/* Tags */}
                        {task.tags?.slice(0, 3).map((tag) => (
                          <Badge
                            key={tag.id}
                            bg={tag.color || 'gray.600'}
                            color="white"
                            fontSize="xs"
                            px={2}
                            borderRadius="full"
                          >
                            {tag.name}
                          </Badge>
                        ))}
                      </HStack>
                    </VStack>
                  </HStack>

                  {/* Right side: urgency and actions */}
                  <HStack spacing={3}>
                    <Badge
                      bg={urgencyColors[task.urgency]}
                      color="white"
                      fontSize="xs"
                      px={2}
                      py={1}
                    >
                      {urgencyLabels[task.urgency]}
                    </Badge>

                    <Menu>
                      <MenuButton
                        as={Button}
                        size="sm"
                        variant="ghost"
                        onClick={(e) => e.stopPropagation()}
                      >
                        ⋮
                      </MenuButton>
                      <MenuList bg="dark.card" borderColor="dark.border">
                        <MenuItem
                          bg="dark.card"
                          _hover={{ bg: 'dark.hover' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            onTaskClick?.(task);
                          }}
                        >
                          Edit
                        </MenuItem>
                        <MenuItem
                          bg="dark.card"
                          _hover={{ bg: 'dark.hover' }}
                          color="red.400"
                          onClick={(e) => handleDeleteTask(task.id, e)}
                        >
                          Archive
                        </MenuItem>
                      </MenuList>
                    </Menu>
                  </HStack>
                </HStack>
              );
            })}
          </VStack>
        )}
      </CardBody>
    </Card>
  );
}
