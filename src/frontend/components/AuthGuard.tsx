/**
 * Project Alpine - Authentication Guard
 *
 * Wrapper component that protects routes requiring authentication.
 * Shows loading state while checking auth, redirects if not authenticated.
 */

'use client';

import { useAuth } from '@/contexts/AuthContext';
import { Box, Spinner, Center, Text } from '@chakra-ui/react';

interface AuthGuardProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export function AuthGuard({ children, requireAdmin = false }: AuthGuardProps) {
  const { isLoading, isAuthenticated, user } = useAuth();

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <Center h="100vh">
        <Box textAlign="center">
          <Spinner size="xl" color="purple.500" thickness="4px" />
          <Text mt={4} color="gray.500">Loading...</Text>
        </Box>
      </Center>
    );
  }

  // If not authenticated, the AuthContext will handle redirect
  if (!isAuthenticated) {
    return (
      <Center h="100vh">
        <Box textAlign="center">
          <Spinner size="xl" color="purple.500" thickness="4px" />
          <Text mt={4} color="gray.500">Redirecting to login...</Text>
        </Box>
      </Center>
    );
  }

  // Check admin requirement
  if (requireAdmin && !user?.isAdmin) {
    return (
      <Center h="100vh">
        <Box textAlign="center">
          <Text fontSize="xl" color="red.400">Access Denied</Text>
          <Text color="gray.500" mt={2}>You need admin privileges to access this page.</Text>
        </Box>
      </Center>
    );
  }

  // User is authenticated (and admin if required)
  return <>{children}</>;
}

export default AuthGuard;
