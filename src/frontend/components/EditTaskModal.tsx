/**
 * Project Alpine - Edit Task Modal Component
 *
 * Modal form for editing existing tasks.
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
  VStack,
  HStack,
  Tag,
  TagLabel,
  TagCloseButton,
  Box,
  Text,
  useToast,
} from '@chakra-ui/react';
import { useState, useEffect } from 'react';
import { updateTask, fetchCategories, fetchTags } from '@/lib/api';
import type { Task, Category, Tag as TagType } from '@/lib/types';

// Urgency options
const urgencyOptions = [
  { value: 'low', label: 'Low - Can wait' },
  { value: 'medium', label: 'Medium - Should do soon' },
  { value: 'high', label: 'High - Needs attention' },
  { value: 'critical', label: 'Critical - Do immediately' },
];

// Status options
const statusOptions = [
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
];

interface EditTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  onTaskUpdated?: (updatedTask: Task) => void;
}

export default function EditTaskModal({
  isOpen,
  onClose,
  task,
  onTaskUpdated,
}: EditTaskModalProps) {
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [urgency, setUrgency] = useState('medium');
  const [status, setStatus] = useState('pending');
  const [categoryId, setCategoryId] = useState<number | undefined>();
  const [selectedTags, setSelectedTags] = useState<TagType[]>([]);

  // Data state
  const [categories, setCategories] = useState<Category[]>([]);
  const [availableTags, setAvailableTags] = useState<TagType[]>([]);
  const [loading, setLoading] = useState(false);

  const toast = useToast();

  // Populate form when task changes
  useEffect(() => {
    if (task && isOpen) {
      setTitle(task.title);
      setDescription(task.description || '');
      setUrgency(task.urgency);
      setStatus(task.status);
      setCategoryId(task.categoryId || undefined);
      setSelectedTags(task.tags || []);

      // Format due date for datetime-local input
      if (task.dueDate) {
        const date = new Date(task.dueDate);
        const formatted = date.toISOString().slice(0, 16);
        setDueDate(formatted);
      } else {
        setDueDate('');
      }
    }
  }, [task, isOpen]);

  // Fetch categories and tags when modal opens
  useEffect(() => {
    if (isOpen) {
      const loadData = async () => {
        try {
          const [categoriesData, tagsData] = await Promise.all([
            fetchCategories(),
            fetchTags(),
          ]);
          setCategories(categoriesData);
          setAvailableTags(tagsData);
        } catch (error) {
          console.error('Failed to load form data:', error);
        }
      };
      loadData();
    }
  }, [isOpen]);

  // Handle tag selection
  const handleTagToggle = (tag: TagType) => {
    if (selectedTags.find((t) => t.id === tag.id)) {
      setSelectedTags(selectedTags.filter((t) => t.id !== tag.id));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!task) return;

    // Validate required fields
    if (!title.trim()) {
      toast({
        title: 'Title is required',
        status: 'error',
        duration: 3000,
      });
      return;
    }

    setLoading(true);

    try {
      const updatedTask = await updateTask(task.id, {
        title: title.trim(),
        description: description.trim() || undefined,
        dueDate: dueDate || undefined,
        urgency,
        status,
        categoryId,
        tagIds: selectedTags.map((t) => t.id),
      });

      toast({
        title: 'Task updated',
        status: 'success',
        duration: 2000,
      });

      // Notify parent and close modal
      onTaskUpdated?.(updatedTask);
      onClose();
    } catch (error) {
      console.error('Failed to update task:', error);
      toast({
        title: 'Failed to update task',
        description: 'Please try again',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalOverlay bg="blackAlpha.700" />
      <ModalContent bg="dark.card" borderColor="dark.border" borderWidth="1px">
        <ModalHeader>Edit Task</ModalHeader>
        <ModalCloseButton />

        <ModalBody>
          <VStack spacing={4}>
            {/* Title input */}
            <FormControl isRequired>
              <FormLabel fontSize="sm">Title</FormLabel>
              <Input
                placeholder="What needs to be done?"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                bg="dark.bg"
                borderColor="dark.border"
                _focus={{ borderColor: 'brand.500' }}
              />
            </FormControl>

            {/* Description textarea */}
            <FormControl>
              <FormLabel fontSize="sm">Description</FormLabel>
              <Textarea
                placeholder="Add details (optional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                bg="dark.bg"
                borderColor="dark.border"
                _focus={{ borderColor: 'brand.500' }}
                rows={3}
              />
            </FormControl>

            {/* Due date and urgency row */}
            <HStack w="100%" spacing={4}>
              <FormControl flex="1">
                <FormLabel fontSize="sm">
                  Due Date
                  {task?.trackerId && (
                    <Text as="span" fontSize="xs" color="gray.500" ml={2}>
                      (managed by tracker)
                    </Text>
                  )}
                </FormLabel>
                <Input
                  type="datetime-local"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  bg="dark.bg"
                  borderColor={task?.trackerId ? 'dark.border' : 'dark.border'}
                  _focus={{ borderColor: task?.trackerId ? 'dark.border' : 'brand.500' }}
                  isDisabled={!!task?.trackerId}
                  opacity={task?.trackerId ? 0.6 : 1}
                  cursor={task?.trackerId ? 'not-allowed' : 'auto'}
                />
              </FormControl>

              <FormControl flex="1">
                <FormLabel fontSize="sm">Urgency</FormLabel>
                <Select
                  value={urgency}
                  onChange={(e) => setUrgency(e.target.value)}
                  bg="dark.bg"
                  borderColor="dark.border"
                  _focus={{ borderColor: 'brand.500' }}
                >
                  {urgencyOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </FormControl>
            </HStack>

            {/* Status select */}
            <FormControl>
              <FormLabel fontSize="sm">Status</FormLabel>
              <Select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                bg="dark.bg"
                borderColor="dark.border"
                _focus={{ borderColor: 'brand.500' }}
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </FormControl>

            {/* Category select */}
            <FormControl>
              <FormLabel fontSize="sm">Category</FormLabel>
              <Select
                placeholder="Select category"
                value={categoryId || ''}
                onChange={(e) =>
                  setCategoryId(e.target.value ? Number(e.target.value) : undefined)
                }
                bg="dark.bg"
                borderColor="dark.border"
                _focus={{ borderColor: 'brand.500' }}
              >
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
            </FormControl>

            {/* Tags selection */}
            <FormControl>
              <FormLabel fontSize="sm">Tags</FormLabel>
              <Box>
                {/* Selected tags */}
                {selectedTags.length > 0 && (
                  <HStack wrap="wrap" mb={2} spacing={2}>
                    {selectedTags.map((tag) => {
                      const isTrackedTag = tag.name === 'tracked';
                      return (
                        <Tag
                          key={tag.id}
                          size="md"
                          bg={tag.color || 'gray.600'}
                          color="white"
                          opacity={isTrackedTag ? 0.7 : 1}
                        >
                          <TagLabel>{tag.name}</TagLabel>
                          {/* Don't allow removing the "tracked" tag - it's system managed */}
                          {!isTrackedTag && (
                            <TagCloseButton onClick={() => handleTagToggle(tag)} />
                          )}
                        </Tag>
                      );
                    })}
                  </HStack>
                )}

                {/* Available tags (excluding system "tracked" tag) */}
                <HStack wrap="wrap" spacing={2}>
                  {availableTags
                    .filter((tag) => tag.name !== 'tracked') // Hide system tag
                    .filter((tag) => !selectedTags.find((t) => t.id === tag.id))
                    .map((tag) => (
                      <Tag
                        key={tag.id}
                        size="sm"
                        bg="dark.bg"
                        color="gray.300"
                        cursor="pointer"
                        _hover={{ bg: 'dark.hover' }}
                        onClick={() => handleTagToggle(tag)}
                      >
                        <TagLabel>+ {tag.name}</TagLabel>
                      </Tag>
                    ))}
                </HStack>

                {availableTags.filter((t) => t.name !== 'tracked').length === 0 && (
                  <Text fontSize="sm" color="gray.500">
                    No tags available.
                  </Text>
                )}
              </Box>
            </FormControl>
          </VStack>
        </ModalBody>

        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose}>
            Cancel
          </Button>
          <Button colorScheme="brand" onClick={handleSubmit} isLoading={loading}>
            Save Changes
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
