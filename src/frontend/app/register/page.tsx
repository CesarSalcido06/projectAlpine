/**
 * Project Alpine - Register Page
 *
 * First-time setup page for creating the admin account.
 * Only accessible when no users exist in the system.
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Button,
  Container,
  FormControl,
  FormLabel,
  Heading,
  Input,
  Stack,
  Text,
  useColorModeValue,
  Alert,
  AlertIcon,
  InputGroup,
  InputRightElement,
  IconButton,
  FormHelperText,
} from '@chakra-ui/react';
import { ViewIcon, ViewOffIcon, CheckCircleIcon } from '@chakra-ui/icons';
import { useAuth } from '@/contexts/AuthContext';

export default function RegisterPage() {
  const { register, isLoading, needsSetup, isAuthenticated } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  // Redirect if already authenticated or setup not needed
  useEffect(() => {
    if (!isLoading && !needsSetup && isAuthenticated) {
      router.push('/');
    }
    if (!isLoading && !needsSetup && !isAuthenticated) {
      // Users exist but not authenticated - redirect to login
      router.push('/login');
    }
  }, [isLoading, needsSetup, isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate username
    if (username.length < 3 || username.length > 50) {
      setError('Username must be between 3 and 50 characters');
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setError('Username can only contain letters, numbers, and underscores');
      return;
    }

    // Validate password
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsSubmitting(true);

    try {
      await register({
        username,
        password,
        displayName: displayName || undefined,
      });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <Container maxW="md" py={20}>
        <Box textAlign="center">
          <Text>Loading...</Text>
        </Box>
      </Container>
    );
  }

  if (!needsSetup) {
    return null;
  }

  return (
    <Container maxW="md" py={20}>
      <Stack spacing={8}>
        <Stack align="center">
          <Heading fontSize="3xl">Welcome to Project Alpine</Heading>
          <Text fontSize="lg" color="gray.500" textAlign="center">
            Create your admin account to get started
          </Text>
        </Stack>

        <Alert status="info" borderRadius="md">
          <CheckCircleIcon mr={2} />
          <Text fontSize="sm">
            This will be the administrator account with full access to manage users.
          </Text>
        </Alert>

        <Box
          bg={bgColor}
          p={8}
          borderRadius="lg"
          borderWidth="1px"
          borderColor={borderColor}
          shadow="lg"
        >
          {error && (
            <Alert status="error" mb={4} borderRadius="md">
              <AlertIcon />
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <Stack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Username</FormLabel>
                <Input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Choose a username"
                  autoComplete="username"
                  autoFocus
                />
                <FormHelperText>
                  Letters, numbers, and underscores only (3-50 characters)
                </FormHelperText>
              </FormControl>

              <FormControl>
                <FormLabel>Display Name</FormLabel>
                <Input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your display name (optional)"
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Password</FormLabel>
                <InputGroup>
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a password"
                    autoComplete="new-password"
                  />
                  <InputRightElement>
                    <IconButton
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      icon={showPassword ? <ViewOffIcon /> : <ViewIcon />}
                      onClick={() => setShowPassword(!showPassword)}
                      variant="ghost"
                      size="sm"
                    />
                  </InputRightElement>
                </InputGroup>
                <FormHelperText>Minimum 8 characters</FormHelperText>
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Confirm Password</FormLabel>
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  autoComplete="new-password"
                />
              </FormControl>

              <Button
                type="submit"
                colorScheme="purple"
                size="lg"
                isLoading={isSubmitting}
                loadingText="Creating account..."
              >
                Create Admin Account
              </Button>
            </Stack>
          </form>
        </Box>
      </Stack>
    </Container>
  );
}
