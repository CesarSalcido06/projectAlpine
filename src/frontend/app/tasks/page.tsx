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
  HStack,
  Button,
} from '@chakra-ui/react';
import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import TaskListFull from '@/components/TaskListFull';
import AddTaskModal from '@/components/AddTaskModal';

export default function TasksPage() {
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleTaskCreated = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <Flex minH="100vh">
      <Sidebar />

      <Box flex="1" p={6}>
        <Container maxW="container.xl">
          {/* Header */}
          <Flex justify="space-between" align="center" mb={6}>
            <VStack align="start" spacing={1}>
              <Heading size="lg">All Tasks</Heading>
              <Text color="gray.400" fontSize="sm">
                Manage and organize all your tasks
              </Text>
            </VStack>

            <Button
              colorScheme="brand"
              onClick={() => setIsAddTaskOpen(true)}
            >
              + Add Task
            </Button>
          </Flex>

          {/* Full task list */}
          <TaskListFull key={refreshKey} title="Tasks" />
        </Container>
      </Box>

      <AddTaskModal
        isOpen={isAddTaskOpen}
        onClose={() => setIsAddTaskOpen(false)}
        onTaskCreated={handleTaskCreated}
      />
    </Flex>
  );
}
