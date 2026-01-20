/**
 * Project Alpine - Tracker Page Component
 *
 * Main page for gamified goal tracking with XP, levels, and streaks.
 */

'use client';

import {
  Box,
  VStack,
  HStack,
  Text,
  SimpleGrid,
  Button,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  useDisclosure,
  useToast,
  Spinner,
  Progress,
} from '@chakra-ui/react';
import { useState, useEffect, useCallback } from 'react';
import {
  fetchTrackers,
  fetchTrackerStats,
  createTracker,
  updateTracker,
  logTrackerProgress,
  resetTracker,
  deleteTracker,
  completeTrackerTask,
} from '@/lib/api';
import type { Tracker, TrackerStats, CreateTrackerPayload } from '@/lib/types';
import TrackerCard from './TrackerCard';
import AddTrackerModal from './AddTrackerModal';
import { useRefresh } from '@/contexts/RefreshContext';

export default function TrackerPage() {
  const [trackers, setTrackers] = useState<Tracker[]>([]);
  const [stats, setStats] = useState<TrackerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [editTracker, setEditTracker] = useState<Tracker | null>(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();

  // Animation state for XP gains
  const [xpAnimation, setXpAnimation] = useState<{ amount: number; show: boolean }>({
    amount: 0,
    show: false,
  });

  const { refreshKey, triggerRefresh } = useRefresh();

  const loadData = useCallback(async () => {
    try {
      const [trackersData, statsData] = await Promise.all([
        fetchTrackers(true),
        fetchTrackerStats(),
      ]);
      setTrackers(trackersData);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load tracker data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData, refreshKey]);

  // Handle tracker creation/update
  const handleSubmit = async (payload: CreateTrackerPayload) => {
    try {
      if (editTracker) {
        await updateTracker(editTracker.id, payload);
        toast({ title: 'Tracker updated', status: 'success', duration: 2000 });
      } else {
        await createTracker(payload);
        toast({ title: 'Tracker created! Start tracking your progress.', status: 'success', duration: 2000 });
      }
      await loadData();
      triggerRefresh(); // Refresh other components
      onClose();
      setEditTracker(null);
    } catch (error: any) {
      toast({
        title: 'Failed to save tracker',
        description: error.response?.data?.error || 'Unknown error',
        status: 'error',
        duration: 3000,
      });
    }
  };

  // Handle progress logging
  const handleLog = async (id: number, value: number = 1) => {
    try {
      const result = await logTrackerProgress(id, value);

      // Show XP animation if earned
      if (result.xpEarned && result.xpEarned > 0) {
        setXpAnimation({ amount: result.xpEarned, show: true });
        setTimeout(() => setXpAnimation({ amount: 0, show: false }), 2000);
      }

      // Show level up toast
      if (result.leveledUp) {
        toast({
          title: 'LEVEL UP!',
          description: `You reached Level ${result.level}!`,
          status: 'success',
          duration: 4000,
          isClosable: true,
        });
      } else if (result.goalCompleted && result.xpEarned) {
        toast({
          title: 'Goal Complete!',
          description: `+${result.xpEarned} XP earned!`,
          status: 'success',
          duration: 2000,
        });
      }

      await loadData();
      triggerRefresh(); // Refresh other components
    } catch (error: any) {
      toast({
        title: 'Failed to log progress',
        description: error.response?.data?.error || 'Unknown error',
        status: 'error',
        duration: 3000,
      });
    }
  };

  // Handle edit
  const handleEdit = (tracker: Tracker) => {
    setEditTracker(tracker);
    onOpen();
  };

  // Handle reset
  const handleReset = async (id: number) => {
    try {
      await resetTracker(id);
      await loadData();
      triggerRefresh(); // Refresh other components
      toast({ title: 'Period reset', status: 'info', duration: 2000 });
    } catch (error: any) {
      toast({
        title: 'Failed to reset tracker',
        description: error.response?.data?.error || 'Unknown error',
        status: 'error',
        duration: 3000,
      });
    }
  };

  // Handle delete
  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this tracker? All progress will be lost.')) {
      return;
    }

    try {
      await deleteTracker(id);
      await loadData();
      triggerRefresh(); // Refresh other components
      toast({ title: 'Tracker deleted', status: 'info', duration: 2000 });
    } catch (error: any) {
      toast({
        title: 'Failed to delete tracker',
        description: error.response?.data?.error || 'Unknown error',
        status: 'error',
        duration: 3000,
      });
    }
  };

  // Open create modal
  const handleCreate = () => {
    setEditTracker(null);
    onOpen();
  };

  // Handle quick complete (complete task + log progress + create next task)
  const handleQuickComplete = async (trackerId: number, taskId: number) => {
    try {
      const result = await completeTrackerTask(taskId);

      // Show XP animation if tracker was updated with XP
      if (result.trackerUpdate) {
        const tracker = trackers.find(t => t.id === trackerId);
        if (tracker) {
          const xpGained = result.trackerUpdate.totalXP - tracker.totalXP;
          if (xpGained > 0) {
            setXpAnimation({ amount: xpGained, show: true });
            setTimeout(() => setXpAnimation({ amount: 0, show: false }), 2000);
          }
        }
      }

      // Show success toast
      toast({
        title: 'Task Complete!',
        description: result.nextTask
          ? `Next task created for ${new Date(result.nextTask.dueDate!).toLocaleDateString()}`
          : 'Progress logged to tracker',
        status: 'success',
        duration: 2000,
      });

      await loadData();
      triggerRefresh(); // Refresh other components
    } catch (error: any) {
      toast({
        title: 'Failed to complete task',
        description: error.response?.data?.error || 'Unknown error',
        status: 'error',
        duration: 3000,
      });
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minH="400px">
        <Spinner size="xl" color="brand.500" />
      </Box>
    );
  }

  return (
    <Box position="relative">
      {/* XP Animation Overlay */}
      {xpAnimation.show && (
        <Box
          position="fixed"
          top="50%"
          left="50%"
          transform="translate(-50%, -50%)"
          zIndex={1000}
          animation="floatUp 2s ease-out"
        >
          <Text
            fontSize="4xl"
            fontWeight="bold"
            color="purple.400"
            textShadow="0 0 20px rgba(128, 90, 213, 0.8)"
          >
            +{xpAnimation.amount} XP
          </Text>
        </Box>
      )}

      <VStack align="stretch" spacing={6}>
        {/* Header */}
        <HStack justify="space-between" align="center" wrap="wrap" gap={4}>
          <VStack align="start" spacing={0}>
            <Text fontSize="2xl" fontWeight="bold">Goal Tracker</Text>
            <Text color="gray.500">Track habits and level up your life</Text>
          </VStack>
          <Button
            bg="brand.500"
            color="white"
            _hover={{ bg: 'brand.600' }}
            onClick={handleCreate}
          >
            + New Tracker
          </Button>
        </HStack>

        {/* Overall Stats Banner */}
        {stats && (
          <Box
            bg="dark.card"
            borderRadius="xl"
            border="1px"
            borderColor="dark.border"
            p={6}
            position="relative"
            overflow="hidden"
          >
            {/* Background gradient */}
            <Box
              position="absolute"
              top={0}
              left={0}
              right={0}
              bottom={0}
              bgGradient="linear(to-r, purple.900, pink.900)"
              opacity={0.3}
            />

            <VStack align="stretch" spacing={4} position="relative">
              {/* Level Info */}
              <HStack spacing={4} wrap="wrap">
                <Box
                  w={16}
                  h={16}
                  borderRadius="full"
                  bg="purple.600"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  fontSize="3xl"
                  border="3px solid"
                  borderColor="purple.400"
                  flexShrink={0}
                >
                  {stats.avgLevel >= 10 ? '🏆' : stats.avgLevel >= 5 ? '⭐' : '🎯'}
                </Box>
                <VStack align="start" spacing={0}>
                  <Text fontSize="sm" color="gray.400">Average Level</Text>
                  <Text fontSize={{ base: '2xl', md: '3xl' }} fontWeight="bold">Level {stats.avgLevel}</Text>
                  <Text fontSize="sm" color="purple.400">
                    {stats.totalXP.toLocaleString()} Total XP
                  </Text>
                </VStack>
              </HStack>

              {/* Stats Grid */}
              <SimpleGrid columns={{ base: 2, md: 4 }} spacing={{ base: 4, md: 8 }}>
                <Stat textAlign="center">
                  <StatLabel color="gray.400" fontSize={{ base: 'xs', md: 'sm' }}>Active Trackers</StatLabel>
                  <StatNumber fontSize={{ base: 'xl', md: '2xl' }}>{stats.totalTrackers}</StatNumber>
                </Stat>
                <Stat textAlign="center">
                  <StatLabel color="gray.400" fontSize={{ base: 'xs', md: 'sm' }}>Completions</StatLabel>
                  <StatNumber fontSize={{ base: 'xl', md: '2xl' }} color="green.400">
                    {stats.totalCompletions}
                  </StatNumber>
                </Stat>
                <Stat textAlign="center">
                  <StatLabel color="gray.400" fontSize={{ base: 'xs', md: 'sm' }}>Active Streaks</StatLabel>
                  <StatNumber fontSize={{ base: 'xl', md: '2xl' }} color="orange.400">
                    {stats.activeStreaks} 🔥
                  </StatNumber>
                </Stat>
                <Stat textAlign="center">
                  <StatLabel color="gray.400" fontSize={{ base: 'xs', md: 'sm' }}>Best Streak</StatLabel>
                  <StatNumber fontSize={{ base: 'xl', md: '2xl' }} color="yellow.400">
                    {stats.longestStreak} 🏆
                  </StatNumber>
                </Stat>
              </SimpleGrid>

              {/* Global XP Bar */}
              <Box>
                <HStack justify="space-between" mb={1}>
                  <Text fontSize="xs" color="gray.500">Global Progress</Text>
                  <Text fontSize="xs" color="gray.500">
                    Next milestone: {Math.ceil(stats.totalXP / 1000) * 1000} XP
                  </Text>
                </HStack>
                <Progress
                  value={(stats.totalXP % 1000) / 10}
                  size="sm"
                  borderRadius="full"
                  bg="whiteAlpha.200"
                  sx={{
                    '& > div': {
                      background: 'linear-gradient(90deg, #805AD5, #D53F8C, #ED8936)',
                    },
                  }}
                />
              </Box>
            </VStack>
          </Box>
        )}

        {/* Tracker Grid */}
        {trackers.length === 0 ? (
          <Box
            bg="dark.card"
            borderRadius="xl"
            border="1px dashed"
            borderColor="dark.border"
            p={12}
            textAlign="center"
          >
            <Text fontSize="4xl" mb={4}>🎯</Text>
            <Text fontSize="lg" fontWeight="bold" mb={2}>
              No trackers yet
            </Text>
            <Text color="gray.500" mb={4}>
              Create your first tracker to start leveling up!
            </Text>
            <Button
              bg="brand.500"
              color="white"
              _hover={{ bg: 'brand.600' }}
              onClick={handleCreate}
            >
              Create First Tracker
            </Button>
          </Box>
        ) : (
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
            {trackers.map((tracker) => (
              <TrackerCard
                key={tracker.id}
                tracker={tracker}
                onLog={handleLog}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onReset={handleReset}
                onQuickComplete={handleQuickComplete}
              />
            ))}
          </SimpleGrid>
        )}

        {/* Achievements Section */}
        {stats && stats.achievements.length > 0 && (
          <Box
            bg="dark.card"
            borderRadius="xl"
            border="1px"
            borderColor="dark.border"
            p={6}
          >
            <Text fontSize="lg" fontWeight="bold" mb={4}>Achievements</Text>
            <SimpleGrid columns={{ base: 2, md: 4, lg: 8 }} spacing={4}>
              {stats.achievements.map((achievement) => (
                <VStack
                  key={achievement.id}
                  p={3}
                  bg="dark.hover"
                  borderRadius="lg"
                  opacity={0.5}
                  _hover={{ opacity: 0.8 }}
                  cursor="pointer"
                  title={achievement.description}
                >
                  <Text fontSize="2xl">{achievement.icon}</Text>
                  <Text fontSize="xs" textAlign="center" color="gray.500">
                    {achievement.name}
                  </Text>
                </VStack>
              ))}
            </SimpleGrid>
          </Box>
        )}
      </VStack>

      {/* Add/Edit Modal */}
      <AddTrackerModal
        isOpen={isOpen}
        onClose={() => {
          onClose();
          setEditTracker(null);
        }}
        onSubmit={handleSubmit}
        editTracker={editTracker}
      />

      {/* CSS for animations */}
      <style jsx global>{`
        @keyframes floatUp {
          0% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -150%) scale(1.5);
          }
        }
        @keyframes shimmer {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }
      `}</style>
    </Box>
  );
}
