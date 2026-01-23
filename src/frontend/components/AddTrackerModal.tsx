/**
 * Project Alpine - Add/Edit Tracker Modal
 *
 * Modal for creating and editing trackers with gamification settings.
 */

'use client';

import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Button,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  Select,
  HStack,
  VStack,
  Box,
  Text,
  SimpleGrid,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Checkbox,
  Wrap,
  WrapItem,
  FormHelperText,
} from '@chakra-ui/react';
import { useState, useEffect } from 'react';
import type { Tracker, CreateTrackerPayload, TrackerFrequency, Urgency } from '@/lib/types';

interface AddTrackerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateTrackerPayload) => void;
  editTracker?: Tracker | null;
}

const icons = ['🎯', '📚', '🏃', '💪', '🧘', '💊', '🎨', '🎵', '💻', '✍️', '🌱', '💧'];
const colors = [
  '#805AD5', '#D53F8C', '#DD6B20', '#38A169',
  '#3182CE', '#E53E3E', '#D69E2E', '#319795',
];
const frequencies: { value: TrackerFrequency; label: string }[] = [
  { value: 'hourly', label: 'Hourly' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

const urgencyOptions: { value: Urgency; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
];

export default function AddTrackerModal({
  isOpen,
  onClose,
  onSubmit,
  editTracker,
}: AddTrackerModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('🎯');
  const [color, setColor] = useState('#805AD5');
  const [targetValue, setTargetValue] = useState(1);
  const [targetUnit, setTargetUnit] = useState('times');
  const [frequency, setFrequency] = useState<TrackerFrequency>('daily');
  const [taskUrgency, setTaskUrgency] = useState<Urgency>('medium');
  // Auto task generation is always enabled - hardcoded
  const generateTasks = true;
  const [scheduledTime, setScheduledTime] = useState('09:00');
  const [scheduledDays, setScheduledDays] = useState<number[]>([1, 2, 3, 4, 5]); // Mon-Fri default
  const [scheduledDatesOfMonth, setScheduledDatesOfMonth] = useState<number[]>([1]);

  const daysOfWeek = [
    { value: 0, label: 'Sun' },
    { value: 1, label: 'Mon' },
    { value: 2, label: 'Tue' },
    { value: 3, label: 'Wed' },
    { value: 4, label: 'Thu' },
    { value: 5, label: 'Fri' },
    { value: 6, label: 'Sat' },
  ];

  const toggleDayOfWeek = (day: number) => {
    setScheduledDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  };

  const toggleDateOfMonth = (date: number) => {
    setScheduledDatesOfMonth((prev) =>
      prev.includes(date) ? prev.filter((d) => d !== date) : [...prev, date].sort((a, b) => a - b)
    );
  };

  // Reset or populate form when modal opens
  useEffect(() => {
    if (isOpen) {
      if (editTracker) {
        setName(editTracker.name);
        setDescription(editTracker.description || '');
        setIcon(editTracker.icon);
        setColor(editTracker.color);
        setTargetValue(editTracker.targetValue);
        setTargetUnit(editTracker.targetUnit);
        setFrequency(editTracker.frequency);
        setTaskUrgency(editTracker.taskUrgency || 'medium');
        // generateTasks is always true - no need to set
        setScheduledTime(editTracker.scheduledTime || '09:00');
        setScheduledDays(editTracker.scheduledDays || [1, 2, 3, 4, 5]);
        setScheduledDatesOfMonth(editTracker.scheduledDatesOfMonth || [1]);
      } else {
        setName('');
        setDescription('');
        setIcon('🎯');
        setColor('#805AD5');
        setTargetValue(1);
        setTargetUnit('times');
        setFrequency('daily');
        setTaskUrgency('medium');
        // generateTasks is always true - no need to set
        setScheduledTime('09:00');
        setScheduledDays([1, 2, 3, 4, 5]);
        setScheduledDatesOfMonth([1]);
      }
    }
  }, [isOpen, editTracker]);

  const handleSubmit = () => {
    if (!name.trim()) return;

    const payload: CreateTrackerPayload = {
      name: name.trim(),
      description: description.trim() || undefined,
      icon,
      color,
      targetValue,
      targetUnit,
      frequency,
      taskUrgency,
      generateTasks,
    };

    // Add scheduling options based on frequency when generateTasks is enabled
    if (generateTasks) {
      if (frequency === 'daily') {
        payload.scheduledTime = scheduledTime;
      } else if (frequency === 'weekly') {
        payload.scheduledTime = scheduledTime;
        payload.scheduledDays = scheduledDays.length > 0 ? scheduledDays : [1]; // Default to Monday
      } else if (frequency === 'monthly') {
        payload.scheduledTime = scheduledTime;
        payload.scheduledDatesOfMonth = scheduledDatesOfMonth.length > 0 ? scheduledDatesOfMonth : [1];
      }
    }

    onSubmit(payload);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalOverlay bg="blackAlpha.700" />
      <ModalContent bg="dark.card" borderColor="dark.border">
        <ModalHeader>{editTracker ? 'Edit Tracker' : 'Create New Tracker'}</ModalHeader>
        <ModalCloseButton />

        <ModalBody>
          <VStack spacing={5}>
            {/* Name */}
            <FormControl isRequired>
              <FormLabel>Tracker Name</FormLabel>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Read 30 pages, Run 5k, Take vitamins"
                bg="dark.hover"
                border="1px"
                borderColor="dark.border"
                _focus={{ borderColor: 'brand.500' }}
              />
            </FormControl>

            {/* Description */}
            <FormControl>
              <FormLabel>Description (optional)</FormLabel>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Why is this goal important to you?"
                bg="dark.hover"
                border="1px"
                borderColor="dark.border"
                _focus={{ borderColor: 'brand.500' }}
                rows={2}
              />
            </FormControl>

            {/* Icon Selection */}
            <FormControl>
              <FormLabel>Icon</FormLabel>
              <SimpleGrid columns={6} spacing={2}>
                {icons.map((i) => (
                  <Box
                    key={i}
                    as="button"
                    type="button"
                    w={10}
                    h={10}
                    borderRadius="md"
                    bg={icon === i ? color : 'dark.hover'}
                    border="2px"
                    borderColor={icon === i ? color : 'transparent'}
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    fontSize="xl"
                    transition="all 0.2s"
                    _hover={{ bg: 'dark.border' }}
                    onClick={() => setIcon(i)}
                  >
                    {i}
                  </Box>
                ))}
              </SimpleGrid>
            </FormControl>

            {/* Color Selection */}
            <FormControl>
              <FormLabel>Color</FormLabel>
              <SimpleGrid columns={8} spacing={2}>
                {colors.map((c) => (
                  <Box
                    key={c}
                    as="button"
                    type="button"
                    w={8}
                    h={8}
                    borderRadius="md"
                    bg={c}
                    border="3px"
                    borderColor={color === c ? 'white' : 'transparent'}
                    transition="all 0.2s"
                    _hover={{ transform: 'scale(1.1)' }}
                    onClick={() => setColor(c)}
                  />
                ))}
              </SimpleGrid>
            </FormControl>

            {/* Target Value & Unit */}
            <HStack w="100%" spacing={4}>
              <FormControl flex={1}>
                <FormLabel>Target Amount</FormLabel>
                <NumberInput
                  value={targetValue}
                  onChange={(_, val) => setTargetValue(val || 1)}
                  min={1}
                  max={1000}
                >
                  <NumberInputField
                    bg="dark.hover"
                    border="1px"
                    borderColor="dark.border"
                    _focus={{ borderColor: 'brand.500' }}
                  />
                  <NumberInputStepper>
                    <NumberIncrementStepper borderColor="dark.border" />
                    <NumberDecrementStepper borderColor="dark.border" />
                  </NumberInputStepper>
                </NumberInput>
              </FormControl>

              <FormControl flex={1}>
                <FormLabel>Unit</FormLabel>
                <Input
                  value={targetUnit}
                  onChange={(e) => setTargetUnit(e.target.value)}
                  placeholder="times, pages, minutes, miles"
                  bg="dark.hover"
                  border="1px"
                  borderColor="dark.border"
                  _focus={{ borderColor: 'brand.500' }}
                />
              </FormControl>
            </HStack>

            {/* Frequency and Urgency */}
            <HStack w="100%" spacing={4}>
              <FormControl flex={1}>
                <FormLabel>Repeat Frequency</FormLabel>
                <Select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value as TrackerFrequency)}
                  bg="dark.hover"
                  border="1px"
                  borderColor="dark.border"
                  _focus={{ borderColor: 'brand.500' }}
                >
                  {frequencies.map((f) => (
                    <option key={f.value} value={f.value} style={{ background: '#1A202C' }}>
                      {f.label}
                    </option>
                  ))}
                </Select>
              </FormControl>

              <FormControl flex={1}>
                <FormLabel>Task Urgency</FormLabel>
                <Select
                  value={taskUrgency}
                  onChange={(e) => setTaskUrgency(e.target.value as Urgency)}
                  bg="dark.hover"
                  border="1px"
                  borderColor="dark.border"
                  _focus={{ borderColor: 'brand.500' }}
                >
                  {urgencyOptions.map((u) => (
                    <option key={u.value} value={u.value} style={{ background: '#1A202C' }}>
                      {u.label}
                    </option>
                  ))}
                </Select>
              </FormControl>
            </HStack>

            {/* Scheduling Options - always shown since task generation is always enabled */}
            <Box
                w="100%"
                p={4}
                bg="dark.hover"
                borderRadius="lg"
                border="1px"
                borderColor="dark.border"
              >
                <Text fontSize="sm" fontWeight="semibold" mb={3} color="gray.300">
                  Scheduling Options
                </Text>
                <VStack spacing={4} align="stretch">
                  {/* Time Picker - for daily, weekly, monthly */}
                  {(frequency === 'daily' || frequency === 'weekly' || frequency === 'monthly') && (
                    <FormControl>
                      <FormLabel fontSize="sm">Due Time</FormLabel>
                      <HStack spacing={3}>
                        <Input
                          type="time"
                          value={scheduledTime}
                          onChange={(e) => setScheduledTime(e.target.value)}
                          bg="dark.bg"
                          border="1px"
                          borderColor="dark.border"
                          _focus={{ borderColor: 'brand.500' }}
                          w="150px"
                        />
                        <Button
                          size="sm"
                          variant={scheduledTime === '23:59' ? 'solid' : 'outline'}
                          colorScheme="purple"
                          onClick={() => setScheduledTime('23:59')}
                          px={4}
                        >
                          EOD
                        </Button>
                      </HStack>
                      <FormHelperText>
                        Select a time or click EOD for end of day (11:59 PM)
                      </FormHelperText>
                    </FormControl>
                  )}

                  {/* Day of Week Selector - for weekly frequency */}
                  {frequency === 'weekly' && (
                    <FormControl>
                      <FormLabel fontSize="sm">Days of Week</FormLabel>
                      <HStack spacing={2} wrap="wrap">
                        {daysOfWeek.map((day) => (
                          <Checkbox
                            key={day.value}
                            isChecked={scheduledDays.includes(day.value)}
                            onChange={() => toggleDayOfWeek(day.value)}
                            colorScheme="purple"
                            bg={scheduledDays.includes(day.value) ? 'purple.900' : 'dark.bg'}
                            px={3}
                            py={2}
                            borderRadius="md"
                            border="1px"
                            borderColor={scheduledDays.includes(day.value) ? 'purple.500' : 'dark.border'}
                          >
                            {day.label}
                          </Checkbox>
                        ))}
                      </HStack>
                      <FormHelperText>
                        Select which days of the week to create tasks
                      </FormHelperText>
                    </FormControl>
                  )}

                  {/* Day of Month Selector - for monthly frequency */}
                  {frequency === 'monthly' && (
                    <FormControl>
                      <FormLabel fontSize="sm">Days of Month</FormLabel>
                      <Wrap spacing={1}>
                        {Array.from({ length: 31 }, (_, i) => i + 1).map((date) => (
                          <WrapItem key={date}>
                            <Box
                              as="button"
                              type="button"
                              w={8}
                              h={8}
                              fontSize="xs"
                              fontWeight={scheduledDatesOfMonth.includes(date) ? 'bold' : 'normal'}
                              borderRadius="md"
                              bg={scheduledDatesOfMonth.includes(date) ? 'purple.600' : 'dark.bg'}
                              color={scheduledDatesOfMonth.includes(date) ? 'white' : 'gray.400'}
                              border="1px"
                              borderColor={scheduledDatesOfMonth.includes(date) ? 'purple.500' : 'dark.border'}
                              display="flex"
                              alignItems="center"
                              justifyContent="center"
                              transition="all 0.2s"
                              _hover={{ bg: scheduledDatesOfMonth.includes(date) ? 'purple.500' : 'dark.border' }}
                              onClick={() => toggleDateOfMonth(date)}
                            >
                              {date}
                            </Box>
                          </WrapItem>
                        ))}
                      </Wrap>
                      <FormHelperText>
                        Select which days of the month to create tasks (click to toggle)
                      </FormHelperText>
                    </FormControl>
                  )}

                  {/* Info for hourly frequency */}
                  {frequency === 'hourly' && (
                    <Text fontSize="sm" color="gray.500">
                      Hourly tasks will be created at the start of each hour.
                    </Text>
                  )}
                </VStack>
              </Box>

            {/* Preview */}
            <Box
              w="100%"
              p={4}
              bg="dark.hover"
              borderRadius="lg"
              border="1px"
              borderColor="dark.border"
            >
              <Text fontSize="sm" color="gray.500" mb={2}>Preview</Text>
              <HStack spacing={3}>
                <Box
                  w={10}
                  h={10}
                  borderRadius="lg"
                  bg={color}
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  fontSize="xl"
                >
                  {icon}
                </Box>
                <VStack align="start" spacing={0}>
                  <Text fontWeight="bold">{name || 'Tracker Name'}</Text>
                  <Text fontSize="xs" color="gray.500">
                    {targetValue} {targetUnit} per {frequency.replace('ly', '')}
                  </Text>
                </VStack>
              </HStack>
            </Box>
          </VStack>
        </ModalBody>

        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose}>
            Cancel
          </Button>
          <Button
            bg={color}
            color="white"
            onClick={handleSubmit}
            isDisabled={!name.trim()}
            _hover={{ opacity: 0.9 }}
          >
            {editTracker ? 'Save Changes' : 'Create Tracker'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
