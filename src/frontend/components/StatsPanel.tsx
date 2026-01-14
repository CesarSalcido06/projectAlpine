/**
 * Project Alpine - Statistics Panel Component
 *
 * Displays task statistics, urgency distribution, and completion trends.
 */

'use client';

import {
  Box,
  VStack,
  HStack,
  Text,
  Card,
  CardHeader,
  CardBody,
  Heading,
  Progress,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  SimpleGrid,
} from '@chakra-ui/react';
import { useState, useEffect } from 'react';
import { fetchStats } from '@/lib/api';
import type { Stats } from '@/lib/types';

// Urgency level color mapping
const urgencyColors: Record<string, string> = {
  low: 'green.400',
  medium: 'yellow.400',
  high: 'orange.400',
  critical: 'red.400',
};

export default function StatsPanel() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch statistics on mount
  useEffect(() => {
    const loadStats = async () => {
      setLoading(true);
      try {
        const data = await fetchStats();
        setStats(data);
      } catch (error) {
        console.error('Failed to load stats:', error);
        // Use mock data if API fails
        setStats({
          totalTasks: 0,
          completedTasks: 0,
          pendingTasks: 0,
          urgencyDistribution: {
            low: 0,
            medium: 0,
            high: 0,
            critical: 0,
          },
          completionRate: 0,
          topTags: [],
        });
      } finally {
        setLoading(false);
      }
    };
    loadStats();
  }, []);

  if (loading) {
    return (
      <Card bg="dark.card" borderColor="dark.border" borderWidth="1px">
        <CardBody>
          <Text color="gray.500">Loading statistics...</Text>
        </CardBody>
      </Card>
    );
  }

  if (!stats) return null;

  // Calculate total for urgency distribution
  const urgencyTotal = Object.values(stats.urgencyDistribution).reduce(
    (a, b) => a + b,
    0
  );

  return (
    <Card bg="dark.card" borderColor="dark.border" borderWidth="1px">
      <CardHeader pb={2}>
        <Heading size="sm">Statistics</Heading>
      </CardHeader>
      <CardBody pt={0}>
        <VStack align="stretch" spacing={4}>
          {/* Quick stats grid */}
          <SimpleGrid columns={2} spacing={4}>
            <Stat>
              <StatLabel color="gray.400" fontSize="xs">
                Total Tasks
              </StatLabel>
              <StatNumber fontSize="2xl">{stats.totalTasks}</StatNumber>
            </Stat>
            <Stat>
              <StatLabel color="gray.400" fontSize="xs">
                Completed
              </StatLabel>
              <StatNumber fontSize="2xl" color="green.400">
                {stats.completedTasks}
              </StatNumber>
            </Stat>
          </SimpleGrid>

          {/* Completion rate */}
          <Box>
            <HStack justify="space-between" mb={1}>
              <Text fontSize="sm" color="gray.400">
                Completion Rate
              </Text>
              <Text fontSize="sm" fontWeight="semibold">
                {stats.completionRate}%
              </Text>
            </HStack>
            <Progress
              value={stats.completionRate}
              colorScheme="green"
              size="sm"
              borderRadius="full"
              bg="dark.bg"
            />
          </Box>

          {/* Urgency distribution */}
          <Box>
            <Text fontSize="sm" color="gray.400" mb={2}>
              Urgency Distribution
            </Text>
            <VStack align="stretch" spacing={2}>
              {Object.entries(stats.urgencyDistribution).map(
                ([level, count]) => {
                  const percentage =
                    urgencyTotal > 0 ? (count / urgencyTotal) * 100 : 0;
                  return (
                    <Box key={level}>
                      <HStack justify="space-between" mb={1}>
                        <HStack spacing={2}>
                          <Box
                            w={2}
                            h={2}
                            borderRadius="full"
                            bg={urgencyColors[level]}
                          />
                          <Text fontSize="xs" textTransform="capitalize">
                            {level}
                          </Text>
                        </HStack>
                        <Text fontSize="xs" color="gray.400">
                          {count}
                        </Text>
                      </HStack>
                      <Progress
                        value={percentage}
                        size="xs"
                        borderRadius="full"
                        bg="dark.bg"
                        sx={{
                          '& > div': {
                            bg: urgencyColors[level],
                          },
                        }}
                      />
                    </Box>
                  );
                }
              )}
            </VStack>
          </Box>

          {/* Top tags */}
          {stats.topTags && stats.topTags.length > 0 && (
            <Box>
              <Text fontSize="sm" color="gray.400" mb={2}>
                Most Used Tags
              </Text>
              <VStack align="stretch" spacing={1}>
                {stats.topTags.slice(0, 5).map((tag) => (
                  <HStack key={tag.name} justify="space-between">
                    <HStack spacing={2}>
                      <Box
                        w={2}
                        h={2}
                        borderRadius="full"
                        bg={tag.color || 'gray.500'}
                      />
                      <Text fontSize="sm">{tag.name}</Text>
                    </HStack>
                    <Text fontSize="sm" color="gray.400">
                      {tag.count}
                    </Text>
                  </HStack>
                ))}
              </VStack>
            </Box>
          )}
        </VStack>
      </CardBody>
    </Card>
  );
}
