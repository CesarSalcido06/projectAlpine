/**
 * Project Alpine - App Layout
 *
 * Responsive layout wrapper with collapsible sidebar.
 * - Mobile (< lg): Hamburger menu with drawer sidebar
 * - Desktop (>= lg): Always visible sidebar
 *
 * Uses CSS-based responsive display for consistent behavior.
 */

'use client';

import {
  Box,
  Flex,
  IconButton,
  Drawer,
  DrawerOverlay,
  DrawerContent,
  DrawerBody,
} from '@chakra-ui/react';
import { HamburgerIcon, CloseIcon } from '@chakra-ui/icons';
import { useSidebar } from '@/contexts/SidebarContext';
import Sidebar from './Sidebar';
import { ReactNode } from 'react';

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const { isOpen, onOpen, onClose } = useSidebar();

  return (
    <Flex minH="100vh" bg="dark.bg">
      {/* Desktop Sidebar - hidden on mobile, visible on lg+ */}
      <Box
        display={{ base: 'none', lg: 'block' }}
        flexShrink={0}
        position="sticky"
        top={0}
        h="100vh"
      >
        <Sidebar />
      </Box>

      {/* Mobile Hamburger Button - visible on mobile, hidden on lg+ */}
      <IconButton
        aria-label="Open menu"
        icon={<HamburgerIcon boxSize={5} />}
        display={{ base: 'flex', lg: 'none' }}
        position="fixed"
        top={3}
        left={3}
        zIndex={20}
        onClick={onOpen}
        bg="dark.card"
        color="white"
        borderColor="dark.border"
        borderWidth="1px"
        _hover={{ bg: 'dark.hover' }}
        _active={{ bg: 'dark.hover' }}
        size="md"
        boxShadow="lg"
      />

      {/* Mobile Drawer Sidebar */}
      <Drawer
        isOpen={isOpen}
        placement="left"
        onClose={onClose}
        size="xs"
      >
        <DrawerOverlay bg="blackAlpha.700" />
        <DrawerContent bg="dark.card" maxW="250px">
          {/* Close button inside drawer */}
          <IconButton
            aria-label="Close menu"
            icon={<CloseIcon />}
            position="absolute"
            top={3}
            right={3}
            zIndex={1}
            onClick={onClose}
            variant="ghost"
            color="gray.400"
            _hover={{ color: 'white', bg: 'dark.hover' }}
            size="sm"
          />
          <DrawerBody p={0}>
            <Sidebar onNavigate={onClose} />
          </DrawerBody>
        </DrawerContent>
      </Drawer>

      {/* Main Content Area */}
      <Box
        flex="1"
        p={{ base: 4, md: 6 }}
        pt={{ base: 16, lg: 6 }}
        minW={0}
        overflow="auto"
      >
        {children}
      </Box>
    </Flex>
  );
}
