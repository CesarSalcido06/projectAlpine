/**
 * Project Alpine - Statistics Page
 *
 * Analytics dashboard with task completion trends and insights.
 */

'use client';

import {
  Box,
  Container,
  Flex,
  Heading,
  Text,
  VStack,
  SimpleGrid,
  Card,
  CardHeader,
  CardBody,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Progress,
} from '@chakra-ui/react';
import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { AuthGuard } from '@/components/AuthGuard';
import StatsPanel from '@/components/StatsPanel';
import { fetchStats, fetchTasks } from '@/lib/api';
import type { Stats, Task } from '@/lib/types';
import { useRefresh } from '@/contexts/RefreshContext';

export default function StatsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const { refreshKey } = useRefresh();

  useEffect(() => {
    const loadData = async () => {
      try {
        const [statsData, tasksData] = await Promise.all([
          fetchStats(),
          fetchTasks({}),
        ]);
        setStats(statsData);
        setTasks(tasksData);
      } catch (error) {
        console.error('Failed to load stats:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [refreshKey]);

  // Calculate additional stats
  const completedToday = tasks.filter((t) => {
    if (t.status !== 'completed') return false;
    const updated = new Date(t.updatedAt);
    const today = new Date();
    return updated.toDateString() === today.toDateString();
  }).length;

  const overdueCount = tasks.filter((t) => {
    if (!t.dueDate || t.status === 'completed') return false;
    return new Date(t.dueDate) < new Date();
  }).length;

  const urgencyBreakdown = {
    critical: tasks.filter((t) => t.urgency === 'critical' && t.status !== 'completed').length,
    high: tasks.filter((t) => t.urgency === 'high' && t.status !== 'completed').length,
    medium: tasks.filter((t) => t.urgency === 'medium' && t.status !== 'completed').length,
    low: tasks.filter((t) => t.urgency === 'low' && t.status !== 'completed').length,
  };

  return (
    <AuthGuard>
      <AppLayout>
        <Container maxW="container.xl">
          {/* Header */}
          <VStack align="start" spacing={1} mb={6}>
            <Heading size="lg">Statistics</Heading>
            <Text color="gray.400" fontSize="sm">
              Track your productivity and task completion trends
            </Text>
          </VStack>

          {loading ? (
            <Text color="gray.500">Loading statistics...</Text>
          ) : (
            <VStack spacing={6} align="stretch">
              {/* Overview cards */}
              <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={4}>
                <Card bg="dark.card" borderColor="dark.border" borderWidth="1px">
                  <CardBody>
                    <Stat>
                      <StatLabel color="gray.400">Active Tasks</StatLabel>
                      <StatNumber>{stats?.totalTasks || 0}</StatNumber>
                      <StatHelpText>Pending + In Progress</StatHelpText>
                    </Stat>
                  </CardBody>
                </Card>

                <Card bg="dark.card" borderColor="dark.border" borderWidth="1px">
                  <CardBody>
                    <Stat>
                      <StatLabel color="gray.400">Completed</StatLabel>
                      <StatNumber color="green.400">
                        {stats?.completedTasks || 0}
                      </StatNumber>
                      <StatHelpText>{completedToday} today (all time total)</StatHelpText>
                    </Stat>
                  </CardBody>
                </Card>

                <Card bg="dark.card" borderColor="dark.border" borderWidth="1px">
                  <CardBody>
                    <Stat>
                      <StatLabel color="gray.400">Pending</StatLabel>
                      <StatNumber color="yellow.400">
                        {stats?.pendingTasks || 0}
                      </StatNumber>
                      <StatHelpText>{overdueCount} overdue</StatHelpText>
                    </Stat>
                  </CardBody>
                </Card>

                <Card bg="dark.card" borderColor="dark.border" borderWidth="1px">
                  <CardBody>
                    <Stat>
                      <StatLabel color="gray.400">Completion Rate</StatLabel>
                      <StatNumber color="brand.400">
                        {stats?.completionRate || 0}%
                      </StatNumber>
                      <StatHelpText>Overall</StatHelpText>
                    </Stat>
                  </CardBody>
                </Card>
              </SimpleGrid>

              {/* Urgency breakdown */}
              <Card bg="dark.card" borderColor="dark.border" borderWidth="1px">
                <CardHeader>
                  <Heading size="sm">Urgency Breakdown</Heading>
                </CardHeader>
                <CardBody>
                  <VStack spacing={4} align="stretch">
                    <Box>
                      <Flex justify="space-between" mb={1}>
                        <Text fontSize="sm" color="red.400">Critical</Text>
                        <Text fontSize="sm">{urgencyBreakdown.critical}</Text>
                      </Flex>
                      <Progress
                        value={(urgencyBreakdown.critical / (stats?.pendingTasks || 1)) * 100}
                        colorScheme="red"
                        size="sm"
                        borderRadius="full"
                      />
                    </Box>

                    <Box>
                      <Flex justify="space-between" mb={1}>
                        <Text fontSize="sm" color="orange.400">High</Text>
                        <Text fontSize="sm">{urgencyBreakdown.high}</Text>
                      </Flex>
                      <Progress
                        value={(urgencyBreakdown.high / (stats?.pendingTasks || 1)) * 100}
                        colorScheme="orange"
                        size="sm"
                        borderRadius="full"
                      />
                    </Box>

                    <Box>
                      <Flex justify="space-between" mb={1}>
                        <Text fontSize="sm" color="yellow.400">Medium</Text>
                        <Text fontSize="sm">{urgencyBreakdown.medium}</Text>
                      </Flex>
                      <Progress
                        value={(urgencyBreakdown.medium / (stats?.pendingTasks || 1)) * 100}
                        colorScheme="yellow"
                        size="sm"
                        borderRadius="full"
                      />
                    </Box>

                    <Box>
                      <Flex justify="space-between" mb={1}>
                        <Text fontSize="sm" color="green.400">Low</Text>
                        <Text fontSize="sm">{urgencyBreakdown.low}</Text>
                      </Flex>
                      <Progress
                        value={(urgencyBreakdown.low / (stats?.pendingTasks || 1)) * 100}
                        colorScheme="green"
                        size="sm"
                        borderRadius="full"
                      />
                    </Box>
                  </VStack>
                </CardBody>
              </Card>

              {/* Quick stats panel */}
              <StatsPanel />
            </VStack>
          )}
        </Container>
      </AppLayout>
    </AuthGuard>
  );
}
