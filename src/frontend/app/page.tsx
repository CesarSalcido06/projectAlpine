/**
 * Project Alpine - Main Page
 *
 * Dashboard view with task list, calendar views, and statistics.
 * Responsive layout: stats appear under calendar on mobile.
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
import TaskList from '@/components/TaskList';
import CalendarView from '@/components/CalendarView';
import StatsPanel from '@/components/StatsPanel';
import AddTaskModal from '@/components/AddTaskModal';
import AppLayout from '@/components/AppLayout';
import { AuthGuard } from '@/components/AuthGuard';
import { useAuth } from '@/contexts/AuthContext';

// View type for calendar switching
type ViewType = 'day' | 'week' | 'month';

export default function Home() {
  // State for current view and modal
  const [currentView, setCurrentView] = useState<ViewType>('week');
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const { user } = useAuth();

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
            mb={8}
          >
            <VStack align="start" spacing={1}>
              <Heading size={{ base: 'md', md: 'lg' }}>
                Welcome, {user?.displayName || user?.username || 'User'}
              </Heading>
              <Text color="gray.400" fontSize="sm">
                {new Date().toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </Text>
            </VStack>

            <HStack spacing={4} wrap="wrap" justify={{ base: 'center', md: 'flex-end' }}>
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
                size={{ base: 'sm', md: 'md' }}
              >
                + Add Task
              </Button>
            </HStack>
          </Flex>

          {/* Main grid layout - responsive */}
          <Flex
            direction={{ base: 'column', lg: 'row' }}
            gap={6}
          >
            {/* Calendar/Task view - takes most space */}
            <Box flex="2" minW={0}>
              <CalendarView
                view={currentView}
                selectedDate={selectedDate}
                onDateChange={setSelectedDate}
              />
            </Box>

            {/* Right panel (bottom on mobile) - stats and quick actions */}
            <Box
              flex={{ base: 'none', lg: '1' }}
              maxW={{ base: '100%', lg: '350px' }}
              w="100%"
            >
              <VStack spacing={6} align="stretch">
                <StatsPanel />
                <TaskList limit={5} title="Upcoming Tasks" />
              </VStack>
            </Box>
          </Flex>
        </Container>

        {/* Add task modal */}
        <AddTaskModal
          isOpen={isAddTaskOpen}
          onClose={() => setIsAddTaskOpen(false)}
        />
      </AppLayout>
    </AuthGuard>
  );
}
