/**
 * Project Alpine - Sidebar Navigation
 *
 * Minimal sidebar with navigation links, categories, tags filter,
 * and user info with logout functionality.
 */

'use client';

import {
  Box,
  VStack,
  HStack,
  Text,
  Divider,
  Badge,
  Input,
  IconButton,
  useToast,
  Avatar,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  MenuDivider,
  Spinner,
} from '@chakra-ui/react';
import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  fetchCategories,
  fetchTags,
  createCategory,
  deleteCategory,
  createTag,
  deleteTag,
} from '@/lib/api';
import type { Category, Tag } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';

// Navigation items for the sidebar
const navItems = [
  { label: 'Dashboard', icon: '📊', href: '/' },
  { label: 'All Tasks', icon: '📋', href: '/tasks' },
  { label: 'Trackers', icon: '🎯', href: '/trackers' },
  { label: 'Statistics', icon: '📈', href: '/stats' },
  { label: 'Archive', icon: '📦', href: '/archive' },
];

// Admin navigation items
const adminNavItems = [
  { label: 'User Management', icon: '👥', href: '/admin/users' },
];

// Default color options for new items
const colorOptions = [
  '#E53E3E', '#DD6B20', '#D69E2E', '#38A169',
  '#319795', '#3182CE', '#805AD5', '#D53F8C',
];

interface SidebarProps {
  onNavigate?: () => void;
}

export default function Sidebar({ onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout, isLoading: authLoading } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Add input states
  const [showCategoryInput, setShowCategoryInput] = useState(false);
  const [showTagInput, setShowTagInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newTagName, setNewTagName] = useState('');

  // Hover states for delete buttons
  const [hoveredCategory, setHoveredCategory] = useState<number | null>(null);
  const [hoveredTag, setHoveredTag] = useState<number | null>(null);

  const categoryInputRef = useRef<HTMLInputElement>(null);
  const tagInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  // Fetch categories and tags on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [categoriesData, tagsData] = await Promise.all([
        fetchCategories(),
        fetchTags(),
      ]);
      setCategories(categoriesData);
      setTags(tagsData);
    } catch (error) {
      console.error('Failed to load sidebar data:', error);
    }
  };

  // Focus input when shown
  useEffect(() => {
    if (showCategoryInput && categoryInputRef.current) {
      categoryInputRef.current.focus();
    }
  }, [showCategoryInput]);

  useEffect(() => {
    if (showTagInput && tagInputRef.current) {
      tagInputRef.current.focus();
    }
  }, [showTagInput]);

  // Category handlers
  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;

    try {
      const randomColor = colorOptions[Math.floor(Math.random() * colorOptions.length)];
      await createCategory(newCategoryName.trim(), randomColor);
      setNewCategoryName('');
      setShowCategoryInput(false);
      await loadData();
      toast({ title: 'Category created', status: 'success', duration: 2000 });
    } catch (error: any) {
      toast({
        title: 'Failed to create category',
        description: error.response?.data?.error || 'Unknown error',
        status: 'error',
        duration: 3000,
      });
    }
  };

  const handleDeleteCategory = async (id: number, isDefault: boolean) => {
    if (isDefault) {
      toast({ title: 'Cannot delete default category', status: 'warning', duration: 2000 });
      return;
    }

    try {
      await deleteCategory(id);
      await loadData();
      toast({ title: 'Category deleted', status: 'info', duration: 2000 });
    } catch (error: any) {
      toast({
        title: 'Failed to delete category',
        description: error.response?.data?.error || 'Unknown error',
        status: 'error',
        duration: 3000,
      });
    }
  };

  // Tag handlers
  const handleAddTag = async () => {
    if (!newTagName.trim()) return;

    try {
      const randomColor = colorOptions[Math.floor(Math.random() * colorOptions.length)];
      await createTag(newTagName.trim(), randomColor);
      setNewTagName('');
      setShowTagInput(false);
      await loadData();
      toast({ title: 'Tag created', status: 'success', duration: 2000 });
    } catch (error: any) {
      toast({
        title: 'Failed to create tag',
        description: error.response?.data?.error || 'Unknown error',
        status: 'error',
        duration: 3000,
      });
    }
  };

  const handleDeleteTag = async (id: number) => {
    try {
      await deleteTag(id);
      await loadData();
      toast({ title: 'Tag deleted', status: 'info', duration: 2000 });
    } catch (error: any) {
      toast({
        title: 'Failed to delete tag',
        description: error.response?.data?.error || 'Unknown error',
        status: 'error',
        duration: 3000,
      });
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <Box
      w="250px"
      h="100vh"
      bg="dark.card"
      borderRight="1px"
      borderColor="dark.border"
      p={4}
      overflowY="auto"
      display="flex"
      flexDirection="column"
      css={{
        '&::-webkit-scrollbar': {
          width: '4px',
        },
        '&::-webkit-scrollbar-track': {
          background: 'transparent',
        },
        '&::-webkit-scrollbar-thumb': {
          background: '#4A5568',
          borderRadius: '2px',
        },
      }}
    >
      <VStack align="stretch" spacing={6} flex="1">
        {/* Logo/Brand */}
        <HStack spacing={2} px={2} py={4}>
          <Text fontSize="xl">🏔️</Text>
          <Text fontWeight="bold" fontSize="lg">
            Alpine
          </Text>
        </HStack>

        <Divider borderColor="dark.border" />

        {/* Main Navigation */}
        <VStack align="stretch" spacing={1}>
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link key={item.href} href={item.href} style={{ textDecoration: 'none' }} onClick={onNavigate}>
                <HStack
                  px={3}
                  py={2}
                  borderRadius="md"
                  cursor="pointer"
                  bg={isActive ? 'dark.hover' : 'transparent'}
                  _hover={{ bg: 'dark.hover' }}
                  borderLeft={isActive ? '3px solid' : '3px solid transparent'}
                  borderLeftColor={isActive ? 'brand.500' : 'transparent'}
                >
                  <Text>{item.icon}</Text>
                  <Text fontSize="sm" fontWeight={isActive ? 'semibold' : 'normal'}>
                    {item.label}
                  </Text>
                </HStack>
              </Link>
            );
          })}
        </VStack>

        {/* Admin Navigation (only for admins) */}
        {user?.isAdmin && (
          <>
            <Divider borderColor="dark.border" />
            <VStack align="stretch" spacing={1}>
              <Text fontSize="xs" color="gray.500" fontWeight="semibold" px={3}>
                ADMIN
              </Text>
              {adminNavItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link key={item.href} href={item.href} style={{ textDecoration: 'none' }} onClick={onNavigate}>
                    <HStack
                      px={3}
                      py={2}
                      borderRadius="md"
                      cursor="pointer"
                      bg={isActive ? 'dark.hover' : 'transparent'}
                      _hover={{ bg: 'dark.hover' }}
                      borderLeft={isActive ? '3px solid' : '3px solid transparent'}
                      borderLeftColor={isActive ? 'brand.500' : 'transparent'}
                    >
                      <Text>{item.icon}</Text>
                      <Text fontSize="sm" fontWeight={isActive ? 'semibold' : 'normal'}>
                        {item.label}
                      </Text>
                    </HStack>
                  </Link>
                );
              })}
            </VStack>
          </>
        )}

        <Divider borderColor="dark.border" />

        {/* Categories Section */}
        <VStack align="stretch" spacing={2}>
          <HStack justify="space-between" px={3}>
            <Text fontSize="xs" color="gray.500" fontWeight="semibold">
              CATEGORIES
            </Text>
            <Text
              fontSize="sm"
              color="gray.500"
              cursor="pointer"
              _hover={{ color: 'white' }}
              onClick={() => setShowCategoryInput(!showCategoryInput)}
              title="Add category"
            >
              +
            </Text>
          </HStack>

          {/* Inline Add Category Input */}
          {showCategoryInput && (
            <Box px={3}>
              <Input
                ref={categoryInputRef}
                size="sm"
                placeholder="Category name..."
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddCategory();
                  if (e.key === 'Escape') {
                    setShowCategoryInput(false);
                    setNewCategoryName('');
                  }
                }}
                onBlur={() => {
                  if (!newCategoryName.trim()) {
                    setShowCategoryInput(false);
                  }
                }}
                bg="dark.hover"
                border="1px"
                borderColor="dark.border"
                _focus={{ borderColor: 'brand.500' }}
              />
            </Box>
          )}

          {categories.length === 0 && !showCategoryInput ? (
            <Text fontSize="sm" color="gray.500" px={3}>
              No categories yet
            </Text>
          ) : (
            categories.map((category) => (
              <HStack
                key={category.id}
                px={3}
                py={1}
                cursor="pointer"
                _hover={{ bg: 'dark.hover' }}
                borderRadius="md"
                onMouseEnter={() => setHoveredCategory(category.id)}
                onMouseLeave={() => setHoveredCategory(null)}
                justify="space-between"
              >
                <HStack>
                  <Box
                    w={2}
                    h={2}
                    borderRadius="full"
                    bg={category.color || 'gray.500'}
                  />
                  <Text fontSize="sm">{category.name}</Text>
                </HStack>
                {hoveredCategory === category.id && !category.isDefault && (
                  <Text
                    fontSize="xs"
                    color="gray.500"
                    cursor="pointer"
                    _hover={{ color: 'red.400' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteCategory(category.id, category.isDefault);
                    }}
                    title="Delete category"
                  >
                    ✕
                  </Text>
                )}
              </HStack>
            ))
          )}
        </VStack>

        <Divider borderColor="dark.border" />

        {/* Tags Section */}
        <VStack align="stretch" spacing={2}>
          <HStack justify="space-between" px={3}>
            <Text fontSize="xs" color="gray.500" fontWeight="semibold">
              TAGS
            </Text>
            <Text
              fontSize="sm"
              color="gray.500"
              cursor="pointer"
              _hover={{ color: 'white' }}
              onClick={() => setShowTagInput(!showTagInput)}
              title="Add tag"
            >
              +
            </Text>
          </HStack>

          {/* Inline Add Tag Input */}
          {showTagInput && (
            <Box px={3}>
              <Input
                ref={tagInputRef}
                size="sm"
                placeholder="Tag name..."
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddTag();
                  if (e.key === 'Escape') {
                    setShowTagInput(false);
                    setNewTagName('');
                  }
                }}
                onBlur={() => {
                  if (!newTagName.trim()) {
                    setShowTagInput(false);
                  }
                }}
                bg="dark.hover"
                border="1px"
                borderColor="dark.border"
                _focus={{ borderColor: 'brand.500' }}
              />
            </Box>
          )}

          <Box px={2}>
            <HStack wrap="wrap" spacing={2}>
              {tags.filter((t) => t.name !== 'tracked').length === 0 && !showTagInput ? (
                <Text fontSize="sm" color="gray.500" px={1}>
                  No tags yet
                </Text>
              ) : (
                tags.filter((tag) => tag.name !== 'tracked').map((tag) => (
                  <Badge
                    key={tag.id}
                    bg={tag.color || 'gray.600'}
                    color="white"
                    fontSize="xs"
                    px={2}
                    py={0.5}
                    borderRadius="full"
                    cursor="pointer"
                    _hover={{ opacity: 0.8 }}
                    onMouseEnter={() => setHoveredTag(tag.id)}
                    onMouseLeave={() => setHoveredTag(null)}
                    position="relative"
                    onClick={() => {
                      if (hoveredTag === tag.id) {
                        handleDeleteTag(tag.id);
                      }
                    }}
                  >
                    {tag.name}
                    {hoveredTag === tag.id && (
                      <Text
                        as="span"
                        ml={1}
                        fontSize="10px"
                        opacity={0.8}
                        _hover={{ opacity: 1 }}
                      >
                        ✕
                      </Text>
                    )}
                  </Badge>
                ))
              )}
            </HStack>
          </Box>
        </VStack>

        {/* Spacer */}
        <Box flex="1" />

        {/* User Info Section */}
        <Divider borderColor="dark.border" />
        <Box px={2} py={2}>
          {authLoading ? (
            <HStack justify="center" py={2}>
              <Spinner size="sm" color="gray.500" />
            </HStack>
          ) : user ? (
            <Menu>
              <MenuButton
                as={Box}
                cursor="pointer"
                borderRadius="md"
                _hover={{ bg: 'dark.hover' }}
                p={2}
              >
                <HStack spacing={3}>
                  <Avatar
                    size="sm"
                    name={user.displayName || user.username}
                    bg="purple.500"
                  />
                  <Box flex="1" overflow="hidden">
                    <Text fontSize="sm" fontWeight="medium" noOfLines={1}>
                      {user.displayName || user.username}
                    </Text>
                    <Text fontSize="xs" color="gray.500" noOfLines={1}>
                      {user.isAdmin ? 'Administrator' : 'User'}
                    </Text>
                  </Box>
                </HStack>
              </MenuButton>
              <MenuList bg="dark.card" borderColor="dark.border">
                <MenuItem
                  bg="dark.card"
                  _hover={{ bg: 'dark.hover' }}
                  fontSize="sm"
                  isDisabled
                >
                  @{user.username}
                </MenuItem>
                <MenuDivider borderColor="dark.border" />
                <MenuItem
                  bg="dark.card"
                  _hover={{ bg: 'dark.hover' }}
                  onClick={handleLogout}
                  fontSize="sm"
                  color="red.400"
                  isDisabled={isLoggingOut}
                >
                  {isLoggingOut ? 'Logging out...' : 'Sign Out'}
                </MenuItem>
              </MenuList>
            </Menu>
          ) : null}
        </Box>
      </VStack>
    </Box>
  );
}
