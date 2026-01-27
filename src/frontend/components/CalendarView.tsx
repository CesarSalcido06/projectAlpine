/**
 * Project Alpine - Calendar View Component
 *
 * Displays tasks in day, week, or month view format.
 */

'use client';

import {
  Box,
  Grid,
  GridItem,
  VStack,
  HStack,
  Text,
  Badge,
  Card,
  CardBody,
  IconButton,
  Flex,
  Checkbox,
  useToast,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverHeader,
  PopoverBody,
  PopoverArrow,
  PopoverCloseButton,
  Button,
} from '@chakra-ui/react';
import { useState, useEffect, useMemo } from 'react';
import { fetchTasks, updateTask } from '@/lib/api';
import type { Task } from '@/lib/types';
import { useRefresh } from '@/contexts/RefreshContext';
import { formatTime, isSameCalendarDay } from '@/lib/dateUtils';

type ViewType = 'day' | 'week' | 'month';

// Urgency level color mapping
const urgencyColors: Record<string, string> = {
  low: 'urgency.low',
  medium: 'urgency.medium',
  high: 'urgency.high',
  critical: 'urgency.critical',
};

interface CalendarViewProps {
  view: ViewType;
  selectedDate: Date;
  onDateChange: (date: Date) => void;
}

export default function CalendarView({
  view,
  selectedDate,
  onDateChange,
}: CalendarViewProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  const { refreshKey, triggerRefresh } = useRefresh();

  // Fetch tasks for the selected date range
  useEffect(() => {
    const loadTasks = async () => {
      setLoading(true);
      try {
        const data = await fetchTasks({});
        setTasks(data);
      } catch (error) {
        console.error('Failed to load tasks:', error);
      } finally {
        setLoading(false);
      }
    };
    loadTasks();
  }, [selectedDate, view, refreshKey]);

  // Handle task completion toggle
  const handleToggleComplete = async (task: Task) => {
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
      console.error('Failed to update task:', error);
      toast({
        title: 'Failed to update task',
        status: 'error',
        duration: 3000,
      });
    }
  };

  // Navigate to previous period
  const handlePrevious = () => {
    const newDate = new Date(selectedDate);
    if (view === 'day') newDate.setDate(newDate.getDate() - 1);
    else if (view === 'week') newDate.setDate(newDate.getDate() - 7);
    else newDate.setMonth(newDate.getMonth() - 1);
    onDateChange(newDate);
  };

  // Navigate to next period
  const handleNext = () => {
    const newDate = new Date(selectedDate);
    if (view === 'day') newDate.setDate(newDate.getDate() + 1);
    else if (view === 'week') newDate.setDate(newDate.getDate() + 7);
    else newDate.setMonth(newDate.getMonth() + 1);
    onDateChange(newDate);
  };

  // Get tasks for a specific date (using UTC to avoid timezone shifts)
  const getTasksForDate = (date: Date): Task[] => {
    return tasks.filter((task) => isSameCalendarDay(task.dueDate, date));
  };

  // Generate week days for week view
  const weekDays = useMemo(() => {
    const days: Date[] = [];
    const startOfWeek = new Date(selectedDate);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());

    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      days.push(day);
    }
    return days;
  }, [selectedDate]);

  // Generate month days for month view
  const monthDays = useMemo(() => {
    const days: (Date | null)[] = [];
    const firstDay = new Date(
      selectedDate.getFullYear(),
      selectedDate.getMonth(),
      1
    );
    const lastDay = new Date(
      selectedDate.getFullYear(),
      selectedDate.getMonth() + 1,
      0
    );

    // Add empty cells for days before the first day of month
    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push(null);
    }

    // Add all days of the month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(
        new Date(selectedDate.getFullYear(), selectedDate.getMonth(), i)
      );
    }

    return days;
  }, [selectedDate]);

  // Format header based on view
  const getHeaderText = () => {
    if (view === 'day') {
      return selectedDate.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      });
    } else if (view === 'week') {
      const endOfWeek = new Date(weekDays[6]);
      return `${weekDays[0].toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })} - ${endOfWeek.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })}`;
    } else {
      return selectedDate.toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      });
    }
  };

  return (
    <Card bg="dark.card" borderColor="dark.border" borderWidth="1px">
      <CardBody>
        {/* Navigation header */}
        <Flex justify="space-between" align="center" mb={4}>
          <IconButton
            aria-label="Previous"
            variant="ghost"
            onClick={handlePrevious}
          >
            ←
          </IconButton>
          <Text fontWeight="semibold" fontSize="lg">
            {getHeaderText()}
          </Text>
          <IconButton aria-label="Next" variant="ghost" onClick={handleNext}>
            →
          </IconButton>
        </Flex>

        {/* Day View */}
        {view === 'day' && (
          <VStack align="stretch" spacing={2}>
            {loading ? (
              <Text color="gray.500">Loading...</Text>
            ) : (
              getTasksForDate(selectedDate).map((task) => (
                <TaskCard key={task.id} task={task} onToggleComplete={handleToggleComplete} />
              ))
            )}
            {!loading && getTasksForDate(selectedDate).length === 0 && (
              <Text color="gray.500" textAlign="center" py={8}>
                No tasks for this day
              </Text>
            )}
          </VStack>
        )}

        {/* Week View */}
        {view === 'week' && (
          <Grid templateColumns="repeat(7, 1fr)" gap={2}>
            {/* Day headers */}
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <GridItem key={day}>
                <Text
                  fontSize="xs"
                  color="gray.500"
                  textAlign="center"
                  fontWeight="semibold"
                >
                  {day}
                </Text>
              </GridItem>
            ))}

            {/* Day cells */}
            {weekDays.map((day, index) => {
              const dayTasks = getTasksForDate(day);
              const isToday = day.toDateString() === new Date().toDateString();

              return (
                <GridItem key={index}>
                  <Popover placement="auto" isLazy>
                    <PopoverTrigger>
                      <Box
                        p={2}
                        minH={{ base: '70px', md: '100px' }}
                        bg={isToday ? 'dark.hover' : 'dark.bg'}
                        borderRadius="md"
                        border="1px solid"
                        borderColor={isToday ? 'brand.500' : 'dark.border'}
                        cursor="pointer"
                        _hover={{ bg: 'dark.hover' }}
                      >
                        <Text
                          fontSize="sm"
                          fontWeight={isToday ? 'bold' : 'normal'}
                          color={isToday ? 'brand.400' : 'gray.300'}
                          mb={2}
                        >
                          {day.getDate()}
                        </Text>
                        {dayTasks.length > 0 && (
                          <HStack spacing={1} wrap="wrap">
                            {dayTasks.slice(0, 4).map((task) => (
                              <Box
                                key={task.id}
                                w={2.5}
                                h={2.5}
                                borderRadius="full"
                                bg={urgencyColors[task.urgency]}
                              />
                            ))}
                            {dayTasks.length > 4 && (
                              <Text fontSize="xs" color="gray.400">
                                +{dayTasks.length - 4}
                              </Text>
                            )}
                          </HStack>
                        )}
                      </Box>
                    </PopoverTrigger>
                    <PopoverContent bg="dark.card" borderColor="dark.border" maxW="300px">
                      <PopoverArrow bg="dark.card" />
                      <PopoverCloseButton />
                      <PopoverHeader borderColor="dark.border" fontWeight="semibold">
                        {day.toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })}
                        {dayTasks.length > 0 && (
                          <Badge ml={2} colorScheme="purple" fontSize="xs">
                            {dayTasks.length} task{dayTasks.length !== 1 ? 's' : ''}
                          </Badge>
                        )}
                      </PopoverHeader>
                      <PopoverBody maxH="250px" overflowY="auto">
                        {dayTasks.length === 0 ? (
                          <Text color="gray.500" fontSize="sm" py={2}>
                            No tasks for this day
                          </Text>
                        ) : (
                          <VStack align="stretch" spacing={2}>
                            {dayTasks.map((task) => (
                              <HStack
                                key={task.id}
                                p={2}
                                bg="dark.hover"
                                borderRadius="md"
                                borderLeft="3px solid"
                                borderLeftColor={urgencyColors[task.urgency]}
                                spacing={2}
                              >
                                <Checkbox
                                  isChecked={task.status === 'completed'}
                                  onChange={() => handleToggleComplete(task)}
                                  colorScheme="green"
                                  size="sm"
                                />
                                <VStack align="start" spacing={0} flex="1">
                                  <Text
                                    fontSize="sm"
                                    fontWeight="medium"
                                    textDecoration={task.status === 'completed' ? 'line-through' : 'none'}
                                    color={task.status === 'completed' ? 'gray.500' : 'white'}
                                    noOfLines={1}
                                  >
                                    {task.title}
                                  </Text>
                                  {task.dueDate && (
                                    <Text fontSize="xs" color="gray.500">
                                      {formatTime(task.dueDate)}
                                    </Text>
                                  )}
                                </VStack>
                              </HStack>
                            ))}
                          </VStack>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          colorScheme="purple"
                          w="100%"
                          mt={2}
                          onClick={() => onDateChange(day)}
                        >
                          View Day Details
                        </Button>
                      </PopoverBody>
                    </PopoverContent>
                  </Popover>
                </GridItem>
              );
            })}
          </Grid>
        )}

        {/* Month View */}
        {view === 'month' && (
          <Grid templateColumns="repeat(7, 1fr)" gap={1}>
            {/* Day headers */}
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <GridItem key={day}>
                <Text
                  fontSize="xs"
                  color="gray.500"
                  textAlign="center"
                  fontWeight="semibold"
                  py={2}
                >
                  {day}
                </Text>
              </GridItem>
            ))}

            {/* Day cells */}
            {monthDays.map((day, index) => {
              if (!day) {
                return <GridItem key={index} />;
              }

              const dayTasks = getTasksForDate(day);
              const isToday = day.toDateString() === new Date().toDateString();

              return (
                <GridItem key={index}>
                  <Popover placement="auto" isLazy>
                    <PopoverTrigger>
                      <Box
                        p={1}
                        minH="80px"
                        bg={isToday ? 'dark.hover' : 'transparent'}
                        borderRadius="md"
                        border="1px solid"
                        borderColor={isToday ? 'brand.500' : 'dark.border'}
                        cursor="pointer"
                        _hover={{ bg: 'dark.hover' }}
                      >
                        <Text
                          fontSize="xs"
                          fontWeight={isToday ? 'bold' : 'normal'}
                          color={isToday ? 'brand.400' : 'gray.400'}
                        >
                          {day.getDate()}
                        </Text>
                        {dayTasks.length > 0 && (
                          <HStack mt={1} spacing={0.5}>
                            {dayTasks.slice(0, 3).map((task) => (
                              <Box
                                key={task.id}
                                w={2}
                                h={2}
                                borderRadius="full"
                                bg={urgencyColors[task.urgency]}
                              />
                            ))}
                            {dayTasks.length > 3 && (
                              <Text fontSize="8px" color="gray.500">
                                +{dayTasks.length - 3}
                              </Text>
                            )}
                          </HStack>
                        )}
                      </Box>
                    </PopoverTrigger>
                    <PopoverContent bg="dark.card" borderColor="dark.border" maxW="300px">
                      <PopoverArrow bg="dark.card" />
                      <PopoverCloseButton />
                      <PopoverHeader borderColor="dark.border" fontWeight="semibold">
                        {day.toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })}
                        {dayTasks.length > 0 && (
                          <Badge ml={2} colorScheme="purple" fontSize="xs">
                            {dayTasks.length} task{dayTasks.length !== 1 ? 's' : ''}
                          </Badge>
                        )}
                      </PopoverHeader>
                      <PopoverBody maxH="250px" overflowY="auto">
                        {dayTasks.length === 0 ? (
                          <Text color="gray.500" fontSize="sm" py={2}>
                            No tasks for this day
                          </Text>
                        ) : (
                          <VStack align="stretch" spacing={2}>
                            {dayTasks.map((task) => (
                              <HStack
                                key={task.id}
                                p={2}
                                bg="dark.hover"
                                borderRadius="md"
                                borderLeft="3px solid"
                                borderLeftColor={urgencyColors[task.urgency]}
                                spacing={2}
                              >
                                <Checkbox
                                  isChecked={task.status === 'completed'}
                                  onChange={() => handleToggleComplete(task)}
                                  colorScheme="green"
                                  size="sm"
                                />
                                <VStack align="start" spacing={0} flex="1">
                                  <Text
                                    fontSize="sm"
                                    fontWeight="medium"
                                    textDecoration={task.status === 'completed' ? 'line-through' : 'none'}
                                    color={task.status === 'completed' ? 'gray.500' : 'white'}
                                    noOfLines={1}
                                  >
                                    {task.title}
                                  </Text>
                                  {task.dueDate && (
                                    <Text fontSize="xs" color="gray.500">
                                      {formatTime(task.dueDate)}
                                    </Text>
                                  )}
                                </VStack>
                              </HStack>
                            ))}
                          </VStack>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          colorScheme="purple"
                          w="100%"
                          mt={2}
                          onClick={() => onDateChange(day)}
                        >
                          View Day Details
                        </Button>
                      </PopoverBody>
                    </PopoverContent>
                  </Popover>
                </GridItem>
              );
            })}
          </Grid>
        )}
      </CardBody>
    </Card>
  );
}

// Task card component for day view with completion toggle
interface TaskCardProps {
  task: Task;
  onToggleComplete: (task: Task) => void;
}

function TaskCard({ task, onToggleComplete }: TaskCardProps) {
  return (
    <HStack
      p={3}
      bg="dark.bg"
      borderRadius="md"
      borderLeft="3px solid"
      borderLeftColor={urgencyColors[task.urgency]}
      _hover={{ bg: 'dark.hover' }}
    >
      {/* Completion checkbox */}
      <Checkbox
        isChecked={task.status === 'completed'}
        onChange={() => onToggleComplete(task)}
        colorScheme="green"
      />

      <VStack align="start" flex="1" spacing={0}>
        <Text
          fontWeight="medium"
          textDecoration={task.status === 'completed' ? 'line-through' : 'none'}
          color={task.status === 'completed' ? 'gray.500' : 'white'}
        >
          {task.title}
        </Text>
        {task.description && (
          <Text fontSize="sm" color="gray.400" noOfLines={1}>
            {task.description}
          </Text>
        )}
      </VStack>
      {task.tags?.map((tag) => (
        <Badge
          key={tag.id}
          bg={tag.color || 'gray.600'}
          color="white"
          fontSize="xs"
        >
          {tag.name}
        </Badge>
      ))}
    </HStack>
  );
}
