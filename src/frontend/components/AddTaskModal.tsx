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
  IconButton,
  InputGroup,
  InputRightElement,
} from '@chakra-ui/react';
import { useState, useEffect } from 'react';
import { createTask, fetchCategories, fetchTags, createCategory, createTag } from '@/lib/api';
import type { Category, Tag as TagType } from '@/lib/types';
import { AddIcon, CheckIcon, CloseIcon } from '@chakra-ui/icons';
import { useRefresh } from '@/contexts/RefreshContext';

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

  // Inline creation state
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showNewTag, setShowNewTag] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [creatingTag, setCreatingTag] = useState(false);

  const toast = useToast();
  const { triggerRefresh } = useRefresh();

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
    setShowNewCategory(false);
    setNewCategoryName('');
    setShowNewTag(false);
    setNewTagName('');
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

  // Handle creating a new category inline
  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;

    setCreatingCategory(true);
    try {
      const newCategory = await createCategory(newCategoryName.trim());
      setCategories([...categories, newCategory]);
      setCategoryId(newCategory.id);
      setNewCategoryName('');
      setShowNewCategory(false);
      toast({
        title: 'Category created',
        status: 'success',
        duration: 2000,
      });
    } catch (error) {
      toast({
        title: 'Failed to create category',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setCreatingCategory(false);
    }
  };

  // Handle creating a new tag inline
  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;

    setCreatingTag(true);
    try {
      const newTag = await createTag(newTagName.trim());
      setAvailableTags([...availableTags, newTag]);
      setSelectedTags([...selectedTags, newTag]);
      setNewTagName('');
      setShowNewTag(false);
      toast({
        title: 'Tag created',
        status: 'success',
        duration: 2000,
      });
    } catch (error) {
      toast({
        title: 'Failed to create tag',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setCreatingTag(false);
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
      triggerRefresh(); // Refresh other components
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
              <HStack justify="space-between" mb={1}>
                <FormLabel fontSize="sm" mb={0}>Category</FormLabel>
                {!showNewCategory && (
                  <Button
                    size="xs"
                    variant="ghost"
                    leftIcon={<AddIcon boxSize={2} />}
                    onClick={() => setShowNewCategory(true)}
                    color="brand.400"
                  >
                    New
                  </Button>
                )}
              </HStack>
              {showNewCategory ? (
                <HStack>
                  <Input
                    placeholder="Category name"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    size="sm"
                    bg="dark.bg"
                    borderColor="dark.border"
                    _focus={{ borderColor: 'brand.500' }}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateCategory()}
                  />
                  <IconButton
                    aria-label="Create category"
                    icon={<CheckIcon />}
                    size="sm"
                    colorScheme="green"
                    onClick={handleCreateCategory}
                    isLoading={creatingCategory}
                  />
                  <IconButton
                    aria-label="Cancel"
                    icon={<CloseIcon />}
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setShowNewCategory(false);
                      setNewCategoryName('');
                    }}
                  />
                </HStack>
              ) : (
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
              )}
            </FormControl>

            {/* Tags selection */}
            <FormControl>
              <HStack justify="space-between" mb={1}>
                <FormLabel fontSize="sm" mb={0}>Tags</FormLabel>
                {!showNewTag && (
                  <Button
                    size="xs"
                    variant="ghost"
                    leftIcon={<AddIcon boxSize={2} />}
                    onClick={() => setShowNewTag(true)}
                    color="brand.400"
                  >
                    New
                  </Button>
                )}
              </HStack>
              <Box>
                {/* Inline tag creation */}
                {showNewTag && (
                  <HStack mb={2}>
                    <Input
                      placeholder="Tag name"
                      value={newTagName}
                      onChange={(e) => setNewTagName(e.target.value)}
                      size="sm"
                      bg="dark.bg"
                      borderColor="dark.border"
                      _focus={{ borderColor: 'brand.500' }}
                      onKeyDown={(e) => e.key === 'Enter' && handleCreateTag()}
                    />
                    <IconButton
                      aria-label="Create tag"
                      icon={<CheckIcon />}
                      size="sm"
                      colorScheme="green"
                      onClick={handleCreateTag}
                      isLoading={creatingTag}
                    />
                    <IconButton
                      aria-label="Cancel"
                      icon={<CloseIcon />}
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setShowNewTag(false);
                        setNewTagName('');
                      }}
                    />
                  </HStack>
                )}

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

                {availableTags.filter((t) => t.name !== 'tracked').length === 0 && !showNewTag && (
                  <Text fontSize="sm" color="gray.500">
                    No tags available. Click &quot;New&quot; to create one.
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
