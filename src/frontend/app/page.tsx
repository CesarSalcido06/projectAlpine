/**
 * Project Alpine - Main Page
 *
 * Dashboard view with task list, calendar views, and statistics.
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
  IconButton,
  useColorModeValue,
} from '@chakra-ui/react';
import { useState } from 'react';
import TaskList from '@/components/TaskList';
import CalendarView from '@/components/CalendarView';
import StatsPanel from '@/components/StatsPanel';
import AddTaskModal from '@/components/AddTaskModal';
import Sidebar from '@/components/Sidebar';

// View type for calendar switching
type ViewType = 'day' | 'week' | 'month';

export default function Home() {
  // State for current view and modal
  const [currentView, setCurrentView] = useState<ViewType>('week');
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

  return (
    <Flex minH="100vh">
      {/* Sidebar navigation */}
      <Sidebar />

      {/* Main content area */}
      <Box flex="1" p={6}>
        <Container maxW="container.xl">
          {/* Header */}
          <Flex justify="space-between" align="center" mb={8}>
            <VStack align="start" spacing={1}>
              <Heading size="lg">Project Alpine</Heading>
              <Text color="gray.400" fontSize="sm">
                {new Date().toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </Text>
            </VStack>

            <HStack spacing={4}>
              {/* View toggle buttons */}
              <HStack bg="dark.card" p={1} borderRadius="md">
                {(['day', 'week', 'month'] as ViewType[]).map((view) => (
                  <Button
                    key={view}
                    size="sm"
                    variant={currentView === view ? 'solid' : 'ghost'}
                    colorScheme={currentView === view ? 'brand' : 'gray'}
                    onClick={() => setCurrentView(view)}
                    textTransform="capitalize"
                  >
                    {view}
                  </Button>
                ))}
              </HStack>

              {/* Add task button */}
              <Button
                colorScheme="brand"
                onClick={() => setIsAddTaskOpen(true)}
              >
                + Add Task
              </Button>
            </HStack>
          </Flex>

          {/* Main grid layout */}
          <Flex gap={6}>
            {/* Calendar/Task view - takes most space */}
            <Box flex="2">
              <CalendarView
                view={currentView}
                selectedDate={selectedDate}
                onDateChange={setSelectedDate}
              />
            </Box>

            {/* Right panel - stats and quick actions */}
            <Box flex="1" maxW="350px">
              <VStack spacing={6} align="stretch">
                <StatsPanel />
                <TaskList limit={5} title="Upcoming Tasks" />
              </VStack>
            </Box>
          </Flex>
        </Container>
      </Box>

      {/* Add task modal */}
      <AddTaskModal
        isOpen={isAddTaskOpen}
        onClose={() => setIsAddTaskOpen(false)}
      />
    </Flex>
  );
}
