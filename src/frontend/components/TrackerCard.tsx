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
  SimpleGrid,
} from '@chakra-ui/react';
import type { Tracker, Task } from '@/lib/types';

interface TrackerCardProps {
  tracker: Tracker;
  onLog: (id: number, value?: number) => void;
  onEdit: (tracker: Tracker) => void;
  onDelete: (id: number) => void;
  onReset: (id: number) => void;
  onQuickComplete?: (trackerId: number, taskId: number) => void;
}

export default function TrackerCard({
  tracker,
  onLog,
  onEdit,
  onDelete,
  onReset,
  onQuickComplete,
}: TrackerCardProps) {
  const toast = useToast();

  // Get the first pending task associated with this tracker
  const pendingTask: Task | undefined = tracker.tasks && tracker.tasks.length > 0
    ? tracker.tasks[0]
    : undefined;

  // Format the due time for display
  const formatDueTime = (dueDate: string | null): string => {
    if (!dueDate) return '';
    const date = new Date(dueDate);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const isTomorrow = date.toDateString() === new Date(now.getTime() + 86400000).toDateString();

    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (isToday) {
      return `Today at ${timeStr}`;
    } else if (isTomorrow) {
      return `Tomorrow at ${timeStr}`;
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ` at ${timeStr}`;
    }
  };

  const progressPercent = tracker.progressPercentage ||
    Math.min(100, Math.round((tracker.currentValue / tracker.targetValue) * 100));

  const xpProgress = tracker.xpProgress || { current: 0, needed: 100, percentage: 0 };
  const streakMultiplier = tracker.streakMultiplier || 1;

  const isGoalComplete = tracker.currentValue >= tracker.targetValue;

  // Frequency label
  const frequencyLabels: Record<string, string> = {
    hourly: 'per hour',
    daily: 'per day',
    weekly: 'per session',  // Changed to reflect occurrence-based
    monthly: 'per session',
  };

  // Progress label based on frequency
  const getProgressLabel = (): string => {
    const pendingCount = (tracker as any).pendingCount || 0;
    switch (tracker.frequency) {
      case 'hourly':
        return 'This Hour';
      case 'daily':
        return 'Today';
      case 'weekly':
        return pendingCount > 1 ? `${pendingCount} sessions this week` : 'This Session';
      case 'monthly':
        return pendingCount > 1 ? `${pendingCount} sessions this month` : 'This Session';
      default:
        return 'Progress';
    }
  };

  // Check if overdue
  const isOverdue = (tracker as any).isOverdue || false;

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
            <HStack spacing={2}>
              <Text fontSize="sm" color="gray.400">{getProgressLabel()}</Text>
              {isOverdue && (
                <Badge colorScheme="red" fontSize="xs">OVERDUE</Badge>
              )}
            </HStack>
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

        {/* Pending Task Section */}
        {pendingTask && (
          <Box
            bg="dark.hover"
            borderRadius="lg"
            p={3}
            border="1px"
            borderColor={isOverdue ? 'red.500' : 'purple.600'}
          >
            <HStack justify="space-between" align="start">
              <VStack align="start" spacing={1} flex={1}>
                <HStack spacing={2}>
                  <Badge colorScheme={isOverdue ? 'red' : 'purple'} fontSize="xs">
                    {isOverdue ? 'OVERDUE' : 'NEXT'}
                  </Badge>
                  <Text fontSize="sm" fontWeight="semibold" noOfLines={1}>
                    {pendingTask.title}
                  </Text>
                </HStack>
                {pendingTask.dueDate && (
                  <Text fontSize="xs" color={isOverdue ? 'red.300' : 'gray.400'}>
                    Due: {formatDueTime(pendingTask.dueDate)}
                  </Text>
                )}
              </VStack>
              {onQuickComplete && (
                <Box
                  as="button"
                  px={3}
                  py={1}
                  borderRadius="md"
                  bg="green.600"
                  color="white"
                  fontSize="sm"
                  fontWeight="bold"
                  transition="all 0.2s"
                  _hover={{ bg: 'green.500', transform: 'scale(1.05)' }}
                  _active={{ transform: 'scale(0.95)' }}
                  onClick={() => onQuickComplete(tracker.id, pendingTask.id)}
                >
                  Complete
                </Box>
              )}
            </HStack>
          </Box>
        )}

        {/* XP Bar (Game-style) */}
        <Box
          bg="dark.hover"
          borderRadius="lg"
          p={3}
        >
          <HStack justify="space-between" mb={2} wrap="wrap" gap={1}>
            <HStack spacing={2}>
              <Badge
                bg="purple.600"
                color="white"
                fontSize={{ base: 'xs', md: 'sm' }}
                px={2}
                py={1}
                borderRadius="md"
              >
                LVL {tracker.level}
              </Badge>
              <Text fontSize={{ base: 'xs', md: 'sm' }} color="gray.400">
                {tracker.totalXP.toLocaleString()} XP
              </Text>
            </HStack>
            <Text fontSize="xs" color="gray.500" textAlign="right">
              {xpProgress.current}/{xpProgress.needed} to lvl up
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
        <SimpleGrid columns={4} spacing={2} pt={2}>
          {/* Streak */}
          <VStack spacing={0} align="center">
            <HStack spacing={0.5}>
              <Text fontSize={{ base: 'sm', md: 'lg' }}>🔥</Text>
              <Text fontWeight="bold" fontSize={{ base: 'sm', md: 'lg' }} color="orange.400">
                {tracker.currentStreak}
              </Text>
            </HStack>
            <Text fontSize="xs" color="gray.500" textAlign="center">Streak</Text>
          </VStack>

          {/* Best Streak */}
          <VStack spacing={0} align="center">
            <HStack spacing={0.5}>
              <Text fontSize={{ base: 'sm', md: 'lg' }}>🏆</Text>
              <Text fontWeight="bold" fontSize={{ base: 'sm', md: 'lg' }} color="yellow.400">
                {tracker.bestStreak}
              </Text>
            </HStack>
            <Text fontSize="xs" color="gray.500" textAlign="center">Best</Text>
          </VStack>

          {/* Multiplier */}
          <VStack spacing={0} align="center">
            <HStack spacing={0.5}>
              <Text fontSize={{ base: 'sm', md: 'lg' }}>⚡</Text>
              <Text fontWeight="bold" fontSize={{ base: 'sm', md: 'lg' }} color="cyan.400">
                {streakMultiplier.toFixed(1)}x
              </Text>
            </HStack>
            <Text fontSize="xs" color="gray.500" textAlign="center">Bonus</Text>
          </VStack>

          {/* Total Completions */}
          <VStack spacing={0} align="center">
            <HStack spacing={0.5}>
              <Text fontSize={{ base: 'sm', md: 'lg' }}>✅</Text>
              <Text fontWeight="bold" fontSize={{ base: 'sm', md: 'lg' }} color="green.400">
                {tracker.totalCompletions}
              </Text>
            </HStack>
            <Text fontSize="xs" color="gray.500" textAlign="center">Done</Text>
          </VStack>
        </SimpleGrid>

        {/* Log Button - hidden when goal is complete */}
        {!isGoalComplete && (
          <Box
            as="button"
            w="100%"
            py={3}
            borderRadius="lg"
            bg={tracker.color}
            color="white"
            fontWeight="bold"
            transition="all 0.2s"
            _hover={{ opacity: 0.9, transform: 'scale(1.02)' }}
            _active={{ transform: 'scale(0.98)' }}
            onClick={() => onLog(tracker.id)}
            disabled={tracker.isPaused}
            opacity={tracker.isPaused ? 0.5 : 1}
          >
            {tracker.isPaused ? 'Paused' : `+ Log ${tracker.targetUnit}`}
          </Box>
        )}
      </VStack>
    </Box>
  );
}
