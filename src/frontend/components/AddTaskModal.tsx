/**
 * Project Alpine - Add Task Modal Component
 *
 * Modal form for creating new tasks with title, description,
 * due date, urgency, category, and tags.
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
import { createTask, fetchCategories, fetchTags } from '@/lib/api';
import type { Category, Tag as TagType } from '@/lib/types';

// Urgency options for the select dropdown
const urgencyOptions = [
  { value: 'low', label: 'Low - Can wait' },
  { value: 'medium', label: 'Medium - Should do soon' },
  { value: 'high', label: 'High - Needs attention' },
  { value: 'critical', label: 'Critical - Do immediately' },
];

interface AddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTaskCreated?: () => void;
}

export default function AddTaskModal({
  isOpen,
  onClose,
  onTaskCreated,
}: AddTaskModalProps) {
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [urgency, setUrgency] = useState('medium');
  const [categoryId, setCategoryId] = useState<number | undefined>();
  const [selectedTags, setSelectedTags] = useState<TagType[]>([]);

  // Data state
  const [categories, setCategories] = useState<Category[]>([]);
  const [availableTags, setAvailableTags] = useState<TagType[]>([]);
  const [loading, setLoading] = useState(false);

  const toast = useToast();

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

          // Set default category if available
          const defaultCategory = categoriesData.find((c) => c.isDefault);
          if (defaultCategory) {
            setCategoryId(defaultCategory.id);
          }
        } catch (error) {
          console.error('Failed to load form data:', error);
        }
      };
      loadData();
    }
  }, [isOpen]);

  // Reset form when modal closes
  const handleClose = () => {
    setTitle('');
    setDescription('');
    setDueDate('');
    setUrgency('medium');
    setCategoryId(undefined);
    setSelectedTags([]);
    onClose();
  };

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
      await createTask({
        title: title.trim(),
        description: description.trim() || undefined,
        dueDate: dueDate || undefined,
        urgency,
        categoryId,
        tagIds: selectedTags.map((t) => t.id),
      });

      toast({
        title: 'Task created',
        status: 'success',
        duration: 2000,
      });

      // Notify parent and close modal
      onTaskCreated?.();
      handleClose();
    } catch (error) {
      console.error('Failed to create task:', error);
      toast({
        title: 'Failed to create task',
        description: 'Please try again',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="lg">
      <ModalOverlay bg="blackAlpha.700" />
      <ModalContent bg="dark.card" borderColor="dark.border" borderWidth="1px">
        <ModalHeader>Add New Task</ModalHeader>
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
                <FormLabel fontSize="sm">Due Date</FormLabel>
                <Input
                  type="datetime-local"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  bg="dark.bg"
                  borderColor="dark.border"
                  _focus={{ borderColor: 'brand.500' }}
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
                    {selectedTags.map((tag) => (
                      <Tag
                        key={tag.id}
                        size="md"
                        bg={tag.color || 'gray.600'}
                        color="white"
                      >
                        <TagLabel>{tag.name}</TagLabel>
                        <TagCloseButton
                          onClick={() => handleTagToggle(tag)}
                        />
                      </Tag>
                    ))}
                  </HStack>
                )}

                {/* Available tags */}
                <HStack wrap="wrap" spacing={2}>
                  {availableTags
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

                {availableTags.length === 0 && (
                  <Text fontSize="sm" color="gray.500">
                    No tags available. Create some in settings.
                  </Text>
                )}
              </Box>
            </FormControl>
          </VStack>
        </ModalBody>

        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={handleClose}>
            Cancel
          </Button>
          <Button
            colorScheme="brand"
            onClick={handleSubmit}
            isLoading={loading}
          >
            Create Task
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
