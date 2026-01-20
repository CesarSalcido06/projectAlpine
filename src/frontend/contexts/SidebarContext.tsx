/**
 * Project Alpine - Sidebar Context
 *
 * Manages sidebar open/closed state across the application
 * for responsive mobile-friendly navigation.
 */

'use client';

import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { useDisclosure } from '@chakra-ui/react';

interface SidebarContextType {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  onToggle: () => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: ReactNode }) {
  const { isOpen, onOpen, onClose, onToggle } = useDisclosure();

  // Close sidebar on route change (handled by onNavigate in Sidebar)
  // Close sidebar when resizing to desktop
  useEffect(() => {
    const handleResize = () => {
      // lg breakpoint is 1024px
      if (window.innerWidth >= 1024 && isOpen) {
        onClose();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isOpen, onClose]);

  return (
    <SidebarContext.Provider value={{ isOpen, onOpen, onClose, onToggle }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
}
