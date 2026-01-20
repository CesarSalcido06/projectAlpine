/**
 * Project Alpine - Calendar Page
 *
 * Full calendar view with day/week/month views.
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
import AppLayout from '@/components/AppLayout';
import { AuthGuard } from '@/components/AuthGuard';
import CalendarView from '@/components/CalendarView';
import AddTaskModal from '@/components/AddTaskModal';

type ViewType = 'day' | 'week' | 'month';

export default function CalendarPage() {
  const [currentView, setCurrentView] = useState<ViewType>('month');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);

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
              <Heading size={{ base: 'md', md: 'lg' }}>Calendar</Heading>
              <Text color="gray.400" fontSize="sm">
                View your tasks on the calendar
              </Text>
            </VStack>

            <HStack spacing={4} wrap="wrap" justify={{ base: 'center', md: 'flex-end' }}>
              {/* View toggle */}
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

              <Button
                colorScheme="brand"
                onClick={() => setIsAddTaskOpen(true)}
                size={{ base: 'sm', md: 'md' }}
              >
                + Add Task
              </Button>
            </HStack>
          </Flex>

          {/* Calendar */}
          <Box bg="dark.card" borderRadius="lg" p={4} borderWidth="1px" borderColor="dark.border">
            <CalendarView
              view={currentView}
              selectedDate={selectedDate}
              onDateChange={setSelectedDate}
            />
          </Box>
        </Container>

        <AddTaskModal
          isOpen={isAddTaskOpen}
          onClose={() => setIsAddTaskOpen(false)}
        />
      </AppLayout>
    </AuthGuard>
  );
}
