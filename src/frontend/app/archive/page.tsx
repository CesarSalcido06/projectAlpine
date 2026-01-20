/**
 * Project Alpine - Archive Page
 *
 * View archived/deleted tasks with restore functionality.
 */

'use client';

import {
  Box,
  Container,
  Heading,
  Text,
  VStack,
  HStack,
  Button,
  Card,
  CardHeader,
  CardBody,
  Badge,
  useToast,
} from '@chakra-ui/react';
import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { AuthGuard } from '@/components/AuthGuard';
import { fetchTasks, updateTask } from '@/lib/api';
import type { Task } from '@/lib/types';

export default function ArchivePage() {
  const [archivedTasks, setArchivedTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    loadArchivedTasks();
  }, []);

  const loadArchivedTasks = async () => {
    setLoading(true);
    try {
      // Fetch tasks with archived status
      const tasks = await fetchTasks({ status: 'archived' });
      setArchivedTasks(tasks);
    } catch (error) {
      console.error('Failed to load archived tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreTask = async (taskId: number) => {
    try {
      await updateTask(taskId, { status: 'pending' });
      setArchivedTasks((prev) => prev.filter((t) => t.id !== taskId));
      toast({
        title: 'Task restored',
        status: 'success',
        duration: 2000,
      });
    } catch (error) {
      toast({
        title: 'Failed to restore task',
        status: 'error',
        duration: 3000,
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <AuthGuard>
      <AppLayout>
        <Container maxW="container.xl">
          {/* Header */}
          <VStack align="start" spacing={1} mb={6}>
            <HStack>
              <Heading size="lg">Archive</Heading>
              <Badge colorScheme="gray" fontSize="sm">
                {archivedTasks.length} items
              </Badge>
            </HStack>
            <Text color="gray.400" fontSize="sm">
              View and restore archived tasks
            </Text>
          </VStack>

          {/* Archived tasks list */}
          <Card bg="dark.card" borderColor="dark.border" borderWidth="1px">
            <CardHeader>
              <Heading size="sm">Archived Tasks</Heading>
            </CardHeader>
            <CardBody>
              {loading ? (
                <Text color="gray.500">Loading archived tasks...</Text>
              ) : archivedTasks.length === 0 ? (
                <VStack py={8} spacing={3}>
                  <Text fontSize="3xl">📦</Text>
                  <Text color="gray.500">No archived tasks</Text>
                  <Text color="gray.500" fontSize="sm">
                    Archived tasks will appear here
                  </Text>
                </VStack>
              ) : (
                <VStack align="stretch" spacing={2}>
                  {archivedTasks.map((task) => (
                    <HStack
                      key={task.id}
                      p={4}
                      bg="dark.bg"
                      borderRadius="md"
                      justify="space-between"
                      opacity={0.7}
                      _hover={{ opacity: 1 }}
                    >
                      <VStack align="start" spacing={1}>
                        <Text fontWeight="medium" textDecoration="line-through">
                          {task.title}
                        </Text>
                        <HStack spacing={3}>
                          <Text fontSize="xs" color="gray.500">
                            Archived {formatDate(task.updatedAt)}
                          </Text>
                          {task.tags?.map((tag) => (
                            <Badge
                              key={tag.id}
                              fontSize="xs"
                              bg={tag.color || 'gray.600'}
                              color="white"
                            >
                              {tag.name}
                            </Badge>
                          ))}
                        </HStack>
                      </VStack>

                      <Button
                        size="sm"
                        variant="outline"
                        colorScheme="brand"
                        onClick={() => handleRestoreTask(task.id)}
                      >
                        Restore
                      </Button>
                    </HStack>
                  ))}
                </VStack>
              )}
            </CardBody>
          </Card>
        </Container>
      </AppLayout>
    </AuthGuard>
  );
}
