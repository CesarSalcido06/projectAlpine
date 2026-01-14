/**
 * Project Alpine - Sidebar Navigation
 *
 * Minimal sidebar with navigation links, categories, and tags filter.
 */

'use client';

import {
  Box,
  VStack,
  HStack,
  Text,
  Icon,
  Divider,
  Badge,
  useColorModeValue,
} from '@chakra-ui/react';
import { useState, useEffect } from 'react';
import { fetchCategories, fetchTags } from '@/lib/api';
import type { Category, Tag } from '@/lib/types';

// Navigation items for the sidebar
const navItems = [
  { label: 'Dashboard', icon: '📊', href: '/' },
  { label: 'All Tasks', icon: '📋', href: '/tasks' },
  { label: 'Calendar', icon: '📅', href: '/calendar' },
  { label: 'Statistics', icon: '📈', href: '/stats' },
  { label: 'Archive', icon: '📦', href: '/archive' },
];

export default function Sidebar() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [activeNav, setActiveNav] = useState('/');

  // Fetch categories and tags on mount
  useEffect(() => {
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
    loadData();
  }, []);

  return (
    <Box
      w="250px"
      minH="100vh"
      bg="dark.card"
      borderRight="1px"
      borderColor="dark.border"
      p={4}
    >
      <VStack align="stretch" spacing={6}>
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
          {navItems.map((item) => (
            <HStack
              key={item.href}
              px={3}
              py={2}
              borderRadius="md"
              cursor="pointer"
              bg={activeNav === item.href ? 'dark.hover' : 'transparent'}
              _hover={{ bg: 'dark.hover' }}
              onClick={() => setActiveNav(item.href)}
            >
              <Text>{item.icon}</Text>
              <Text fontSize="sm">{item.label}</Text>
            </HStack>
          ))}
        </VStack>

        <Divider borderColor="dark.border" />

        {/* Categories Section */}
        <VStack align="stretch" spacing={2}>
          <Text fontSize="xs" color="gray.500" fontWeight="semibold" px={3}>
            CATEGORIES
          </Text>
          {categories.length === 0 ? (
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
              >
                <Box
                  w={2}
                  h={2}
                  borderRadius="full"
                  bg={category.color || 'gray.500'}
                />
                <Text fontSize="sm">{category.name}</Text>
              </HStack>
            ))
          )}
        </VStack>

        <Divider borderColor="dark.border" />

        {/* Tags Section */}
        <VStack align="stretch" spacing={2}>
          <Text fontSize="xs" color="gray.500" fontWeight="semibold" px={3}>
            TAGS
          </Text>
          <Box px={2}>
            <HStack wrap="wrap" spacing={2}>
              {tags.length === 0 ? (
                <Text fontSize="sm" color="gray.500" px={1}>
                  No tags yet
                </Text>
              ) : (
                tags.slice(0, 8).map((tag) => (
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
                  >
                    {tag.name}
                  </Badge>
                ))
              )}
            </HStack>
          </Box>
        </VStack>
      </VStack>
    </Box>
  );
}
