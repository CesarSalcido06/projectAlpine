/**
 * Project Alpine - Login Page
 *
 * User login form with username and password authentication.
 */

'use client';

import { useState } from 'react';
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
  Link,
} from '@chakra-ui/react';
import { ViewIcon, ViewOffIcon } from '@chakra-ui/icons';
import NextLink from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginPage() {
  const { login, loginAsGuest, isLoading, needsSetup } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGuestLoading, setIsGuestLoading] = useState(false);

  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await login({ username, password });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGuestLogin = async () => {
    setError('');
    setIsGuestLoading(true);

    try {
      await loginAsGuest();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to start demo. Please try again.');
    } finally {
      setIsGuestLoading(false);
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

  return (
    <Container maxW="md" py={20}>
      <Stack spacing={8}>
        <Stack align="center">
          <Heading fontSize="3xl">Project Alpine</Heading>
          <Text fontSize="lg" color="gray.500">
            Sign in to your account
          </Text>
        </Stack>

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
                  placeholder="Enter your username"
                  autoComplete="username"
                  autoFocus
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Password</FormLabel>
                <InputGroup>
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    autoComplete="current-password"
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
              </FormControl>

              <Button
                type="submit"
                colorScheme="purple"
                size="lg"
                isLoading={isSubmitting}
                loadingText="Signing in..."
              >
                Sign In
              </Button>

              <Box position="relative" py={2}>
                <Box
                  position="absolute"
                  top="50%"
                  left="0"
                  right="0"
                  borderBottom="1px"
                  borderColor="gray.600"
                />
                <Text
                  position="relative"
                  textAlign="center"
                  bg={bgColor}
                  px={2}
                  display="inline-block"
                  left="50%"
                  transform="translateX(-50%)"
                  color="gray.500"
                  fontSize="sm"
                >
                  or
                </Text>
              </Box>

              <Button
                variant="outline"
                colorScheme="gray"
                size="lg"
                onClick={handleGuestLogin}
                isLoading={isGuestLoading}
                loadingText="Starting demo..."
              >
                Try Demo Guest Mode
              </Button>

              <Text fontSize="xs" color="gray.500" textAlign="center">
                Demo data will be created for you to explore. Session expires in 24 hours.
              </Text>
            </Stack>
          </form>
        </Box>

        {needsSetup && (
          <Text textAlign="center" color="gray.500">
            First time here?{' '}
            <Link as={NextLink} href="/register" color="purple.400">
              Create an admin account
            </Link>
          </Text>
        )}
      </Stack>
    </Container>
  );
}
