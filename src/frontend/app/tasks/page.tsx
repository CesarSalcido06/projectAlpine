/**
 * Project Alpine - All Tasks Page
 *
 * Displays all tasks with full sorting and filtering capabilities.
 */

'use client';

import {
  Box,
  Container,
  Flex,
  Heading,
  Text,
  VStack,
  Button,
} from '@chakra-ui/react';
import { useState } from 'react';
import AppLayout from '@/components/AppLayout';
import TaskListFull from '@/components/TaskListFull';
import AddTaskModal from '@/components/AddTaskModal';
import EditTaskModal from '@/components/EditTaskModal';
import { AuthGuard } from '@/components/AuthGuard';
import type { Task } from '@/lib/types';

export default function TasksPage() {
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [isEditTaskOpen, setIsEditTaskOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleTaskCreated = () => {
    setRefreshKey((prev) => prev + 1);
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setIsEditTaskOpen(true);
  };

  const handleTaskUpdated = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <AuthGuard>
      <AppLayout>
        <Container maxW="container.xl">
          {/* Header */}
          <Flex
            direction={{ base: 'column', md: 'row' }}
            justify="space-between"
            align={{ base: 'stretch', md: 'center' }}
            gap={4}
            mb={6}
          >
            <VStack align="start" spacing={1}>
              <Heading size={{ base: 'md', md: 'lg' }}>All Tasks</Heading>
              <Text color="gray.400" fontSize="sm">
                Manage and organize all your tasks
              </Text>
            </VStack>

            <Button
              colorScheme="brand"
              onClick={() => setIsAddTaskOpen(true)}
              size={{ base: 'sm', md: 'md' }}
            >
              + Add Task
            </Button>
          </Flex>

          {/* Full task list */}
          <TaskListFull
            key={refreshKey}
            title="Tasks"
            onTaskClick={handleTaskClick}
          />
        </Container>

        <AddTaskModal
          isOpen={isAddTaskOpen}
          onClose={() => setIsAddTaskOpen(false)}
          onTaskCreated={handleTaskCreated}
        />

        <EditTaskModal
          isOpen={isEditTaskOpen}
          onClose={() => {
            setIsEditTaskOpen(false);
            setSelectedTask(null);
          }}
          task={selectedTask}
          onTaskUpdated={handleTaskUpdated}
        />
      </AppLayout>
    </AuthGuard>
  );
}
