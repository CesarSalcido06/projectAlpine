/**
 * Project Alpine - Tracker Card Component
 *
 * Displays a single tracker with gamified XP bar, streak info, and progress.
 */

'use client';

import {
  Box,
  VStack,
  HStack,
  Text,
  Progress,
  Badge,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  useToast,
} from '@chakra-ui/react';
import type { Tracker } from '@/lib/types';

interface TrackerCardProps {
  tracker: Tracker;
  onLog: (id: number, value?: number) => void;
  onEdit: (tracker: Tracker) => void;
  onDelete: (id: number) => void;
  onReset: (id: number) => void;
}

export default function TrackerCard({
  tracker,
  onLog,
  onEdit,
  onDelete,
  onReset,
}: TrackerCardProps) {
  const toast = useToast();

  const progressPercent = tracker.progressPercentage ||
    Math.min(100, Math.round((tracker.currentValue / tracker.targetValue) * 100));

  const xpProgress = tracker.xpProgress || { current: 0, needed: 100, percentage: 0 };
  const streakMultiplier = tracker.streakMultiplier || 1;

  const isGoalComplete = tracker.currentValue >= tracker.targetValue;

  // Frequency label
  const frequencyLabels: Record<string, string> = {
    hourly: 'per hour',
    daily: 'per day',
    weekly: 'per week',
    monthly: 'per month',
  };

  return (
    <Box
      bg="dark.card"
      borderRadius="xl"
      border="1px"
      borderColor={isGoalComplete ? 'green.500' : 'dark.border'}
      p={5}
      position="relative"
      overflow="hidden"
      transition="all 0.2s"
      _hover={{ borderColor: tracker.color, transform: 'translateY(-2px)' }}
    >
      {/* Glow effect when complete */}
      {isGoalComplete && (
        <Box
          position="absolute"
          top={0}
          left={0}
          right={0}
          height="3px"
          bgGradient="linear(to-r, green.400, teal.400, green.400)"
          animation="shimmer 2s infinite"
        />
      )}

      <VStack align="stretch" spacing={4}>
        {/* Header */}
        <HStack justify="space-between">
          <HStack spacing={3}>
            <Box
              w={12}
              h={12}
              borderRadius="lg"
              bg={tracker.color}
              display="flex"
              alignItems="center"
              justifyContent="center"
              fontSize="2xl"
            >
              {tracker.icon}
            </Box>
            <VStack align="start" spacing={0}>
              <Text fontWeight="bold" fontSize="lg">{tracker.name}</Text>
              <Text fontSize="xs" color="gray.500">
                {tracker.targetValue} {tracker.targetUnit} {frequencyLabels[tracker.frequency]}
              </Text>
            </VStack>
          </HStack>

          <Menu>
            <MenuButton
              as={IconButton}
              aria-label="Options"
              icon={<Text>⋮</Text>}
              variant="ghost"
              size="sm"
            />
            <MenuList bg="dark.card" borderColor="dark.border">
              <MenuItem
                bg="dark.card"
                _hover={{ bg: 'dark.hover' }}
                onClick={() => onEdit(tracker)}
              >
                Edit Tracker
              </MenuItem>
              <MenuItem
                bg="dark.card"
                _hover={{ bg: 'dark.hover' }}
                onClick={() => onReset(tracker.id)}
              >
                Reset Period
              </MenuItem>
              <MenuItem
                bg="dark.card"
                _hover={{ bg: 'red.900' }}
                color="red.400"
                onClick={() => onDelete(tracker.id)}
              >
                Delete Tracker
              </MenuItem>
            </MenuList>
          </Menu>
        </HStack>

        {/* Goal Progress */}
        <Box>
          <HStack justify="space-between" mb={2}>
            <Text fontSize="sm" color="gray.400">Today's Progress</Text>
            <Text fontSize="sm" fontWeight="bold">
              {tracker.currentValue} / {tracker.targetValue} {tracker.targetUnit}
            </Text>
          </HStack>
          <Box position="relative">
            <Progress
              value={progressPercent}
              size="lg"
              borderRadius="full"
              bg="dark.hover"
              sx={{
                '& > div': {
                  background: isGoalComplete
                    ? 'linear-gradient(90deg, #38A169, #68D391)'
                    : `linear-gradient(90deg, ${tracker.color}, ${tracker.color}cc)`,
                },
              }}
            />
            {isGoalComplete && (
              <Badge
                position="absolute"
                right={2}
                top="50%"
                transform="translateY(-50%)"
                colorScheme="green"
                fontSize="xs"
              >
                COMPLETE
              </Badge>
            )}
          </Box>
        </Box>

        {/* XP Bar (Game-style) */}
        <Box
          bg="dark.hover"
          borderRadius="lg"
          p={3}
        >
          <HStack justify="space-between" mb={2}>
            <HStack spacing={2}>
              <Badge
                bg="purple.600"
                color="white"
                fontSize="sm"
                px={2}
                py={1}
                borderRadius="md"
              >
                LVL {tracker.level}
              </Badge>
              <Text fontSize="sm" color="gray.400">
                {tracker.totalXP.toLocaleString()} XP
              </Text>
            </HStack>
            <Text fontSize="xs" color="gray.500">
              {xpProgress.current} / {xpProgress.needed} XP to next level
            </Text>
          </HStack>

          {/* XP Progress Bar */}
          <Box position="relative" h={3}>
            <Box
              position="absolute"
              top={0}
              left={0}
              right={0}
              bottom={0}
              bg="gray.700"
              borderRadius="full"
              overflow="hidden"
            >
              <Box
                h="100%"
                w={`${xpProgress.percentage}%`}
                bgGradient="linear(to-r, purple.500, pink.500)"
                borderRadius="full"
                transition="width 0.5s ease"
              />
            </Box>
            {/* Shine effect */}
            <Box
              position="absolute"
              top={0}
              left={0}
              w={`${xpProgress.percentage}%`}
              h="50%"
              bgGradient="linear(to-b, whiteAlpha.300, transparent)"
              borderTopRadius="full"
            />
          </Box>
        </Box>

        {/* Stats Row */}
        <HStack justify="space-between" pt={2}>
          {/* Streak */}
          <VStack spacing={0} align="center">
            <HStack spacing={1}>
              <Text fontSize="lg">🔥</Text>
              <Text fontWeight="bold" fontSize="lg" color="orange.400">
                {tracker.currentStreak}
              </Text>
            </HStack>
            <Text fontSize="xs" color="gray.500">Current Streak</Text>
          </VStack>

          {/* Best Streak */}
          <VStack spacing={0} align="center">
            <HStack spacing={1}>
              <Text fontSize="lg">🏆</Text>
              <Text fontWeight="bold" fontSize="lg" color="yellow.400">
                {tracker.bestStreak}
              </Text>
            </HStack>
            <Text fontSize="xs" color="gray.500">Best Streak</Text>
          </VStack>

          {/* Multiplier */}
          <VStack spacing={0} align="center">
            <HStack spacing={1}>
              <Text fontSize="lg">⚡</Text>
              <Text fontWeight="bold" fontSize="lg" color="cyan.400">
                {streakMultiplier.toFixed(1)}x
              </Text>
            </HStack>
            <Text fontSize="xs" color="gray.500">XP Bonus</Text>
          </VStack>

          {/* Total Completions */}
          <VStack spacing={0} align="center">
            <HStack spacing={1}>
              <Text fontSize="lg">✅</Text>
              <Text fontWeight="bold" fontSize="lg" color="green.400">
                {tracker.totalCompletions}
              </Text>
            </HStack>
            <Text fontSize="xs" color="gray.500">Total Done</Text>
          </VStack>
        </HStack>

        {/* Log Button */}
        <Box
          as="button"
          w="100%"
          py={3}
          borderRadius="lg"
          bg={isGoalComplete ? 'green.600' : tracker.color}
          color="white"
          fontWeight="bold"
          transition="all 0.2s"
          _hover={{ opacity: 0.9, transform: 'scale(1.02)' }}
          _active={{ transform: 'scale(0.98)' }}
          onClick={() => onLog(tracker.id)}
          disabled={tracker.isPaused}
          opacity={tracker.isPaused ? 0.5 : 1}
        >
          {tracker.isPaused ? 'Paused' : isGoalComplete ? '+ Log Extra' : `+ Log ${tracker.targetUnit}`}
        </Box>
      </VStack>
    </Box>
  );
}
