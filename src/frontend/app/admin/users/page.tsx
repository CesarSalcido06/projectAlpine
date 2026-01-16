/**
 * Project Alpine - Admin User Management Page
 *
 * Admin page for managing users - create, edit, delete.
 */

'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Heading,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Button,
  IconButton,
  Badge,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  FormControl,
  FormLabel,
  Input,
  Checkbox,
  useToast,
  HStack,
  Text,
  Alert,
  AlertIcon,
  InputGroup,
  InputRightElement,
  Spinner,
  Center,
} from '@chakra-ui/react';
import { ViewIcon, ViewOffIcon, DeleteIcon, EditIcon, AddIcon } from '@chakra-ui/icons';
import { AuthGuard } from '@/components/AuthGuard';
import AppLayout from '@/components/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { fetchUsers, createUser, updateUser, deleteUser } from '@/lib/api';
import type { User, CreateUserPayload, UpdateUserPayload } from '@/lib/types';

export default function AdminUsersPage() {
  return (
    <AuthGuard requireAdmin>
      <AppLayout>
        <Container maxW="container.xl">
          <UserManagement />
        </Container>
      </AppLayout>
    </AuthGuard>
  );
}

function UserManagement() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const toast = useToast();

  // Modal states
  const createModal = useDisclosure();
  const editModal = useDisclosure();
  const deleteModal = useDisclosure();

  // Form states
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    displayName: '',
    isAdmin: false,
    isActive: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Load users
  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const data = await fetchUsers();
      setUsers(data);
    } catch (error) {
      toast({
        title: 'Failed to load users',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      username: '',
      password: '',
      displayName: '',
      isAdmin: false,
      isActive: true,
    });
    setFormError('');
    setShowPassword(false);
  };

  const handleOpenCreate = () => {
    resetForm();
    createModal.onOpen();
  };

  const handleOpenEdit = (user: User) => {
    setSelectedUser(user);
    setFormData({
      username: user.username,
      password: '',
      displayName: user.displayName || '',
      isAdmin: user.isAdmin,
      isActive: user.isActive,
    });
    setFormError('');
    setShowPassword(false);
    editModal.onOpen();
  };

  const handleOpenDelete = (user: User) => {
    setSelectedUser(user);
    deleteModal.onOpen();
  };

  const handleCreate = async () => {
    setFormError('');

    if (!formData.username || !formData.password) {
      setFormError('Username and password are required');
      return;
    }

    if (formData.username.length < 3) {
      setFormError('Username must be at least 3 characters');
      return;
    }

    if (formData.password.length < 8) {
      setFormError('Password must be at least 8 characters');
      return;
    }

    setIsSubmitting(true);
    try {
      await createUser({
        username: formData.username,
        password: formData.password,
        displayName: formData.displayName || undefined,
        isAdmin: formData.isAdmin,
      });
      toast({ title: 'User created', status: 'success', duration: 2000 });
      createModal.onClose();
      resetForm();
      await loadUsers();
    } catch (error: any) {
      setFormError(error.response?.data?.error || 'Failed to create user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedUser) return;
    setFormError('');

    if (formData.password && formData.password.length < 8) {
      setFormError('Password must be at least 8 characters');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: UpdateUserPayload = {
        displayName: formData.displayName || undefined,
        isAdmin: formData.isAdmin,
        isActive: formData.isActive,
      };

      if (formData.password) {
        payload.password = formData.password;
      }

      await updateUser(selectedUser.id, payload);
      toast({ title: 'User updated', status: 'success', duration: 2000 });
      editModal.onClose();
      resetForm();
      await loadUsers();
    } catch (error: any) {
      setFormError(error.response?.data?.error || 'Failed to update user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedUser) return;

    setIsSubmitting(true);
    try {
      await deleteUser(selectedUser.id);
      toast({ title: 'User deleted', status: 'info', duration: 2000 });
      deleteModal.onClose();
      setSelectedUser(null);
      await loadUsers();
    } catch (error: any) {
      toast({
        title: 'Failed to delete user',
        description: error.response?.data?.error,
        status: 'error',
        duration: 3000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <Center py={20}>
        <Spinner size="xl" color="purple.500" />
      </Center>
    );
  }

  return (
    <Box>
      <HStack justify="space-between" mb={6}>
        <Heading size="lg">User Management</Heading>
        <Button
          leftIcon={<AddIcon />}
          colorScheme="purple"
          onClick={handleOpenCreate}
        >
          Add User
        </Button>
      </HStack>

      <Box
        bg="dark.card"
        borderRadius="lg"
        borderWidth="1px"
        borderColor="dark.border"
        overflow="hidden"
      >
        <Table variant="simple">
          <Thead>
            <Tr>
              <Th>Username</Th>
              <Th>Display Name</Th>
              <Th>Role</Th>
              <Th>Status</Th>
              <Th>Last Login</Th>
              <Th>Actions</Th>
            </Tr>
          </Thead>
          <Tbody>
            {users.map((user) => (
              <Tr key={user.id}>
                <Td>
                  <Text fontWeight="medium">@{user.username}</Text>
                </Td>
                <Td>{user.displayName || '-'}</Td>
                <Td>
                  <Badge colorScheme={user.isAdmin ? 'purple' : 'gray'}>
                    {user.isAdmin ? 'Admin' : 'User'}
                  </Badge>
                </Td>
                <Td>
                  <Badge colorScheme={user.isActive ? 'green' : 'red'}>
                    {user.isActive ? 'Active' : 'Disabled'}
                  </Badge>
                </Td>
                <Td>
                  {user.lastLoginAt
                    ? new Date(user.lastLoginAt).toLocaleDateString()
                    : 'Never'}
                </Td>
                <Td>
                  <HStack spacing={2}>
                    <IconButton
                      aria-label="Edit user"
                      icon={<EditIcon />}
                      size="sm"
                      variant="ghost"
                      onClick={() => handleOpenEdit(user)}
                    />
                    <IconButton
                      aria-label="Delete user"
                      icon={<DeleteIcon />}
                      size="sm"
                      variant="ghost"
                      colorScheme="red"
                      onClick={() => handleOpenDelete(user)}
                      isDisabled={user.id === currentUser?.id}
                      title={user.id === currentUser?.id ? "Can't delete yourself" : undefined}
                    />
                  </HStack>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>

      {/* Create User Modal */}
      <Modal isOpen={createModal.isOpen} onClose={createModal.onClose}>
        <ModalOverlay />
        <ModalContent bg="dark.card">
          <ModalHeader>Create New User</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {formError && (
              <Alert status="error" mb={4} borderRadius="md">
                <AlertIcon />
                {formError}
              </Alert>
            )}

            <FormControl isRequired mb={4}>
              <FormLabel>Username</FormLabel>
              <Input
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder="Enter username"
              />
            </FormControl>

            <FormControl mb={4}>
              <FormLabel>Display Name</FormLabel>
              <Input
                value={formData.displayName}
                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                placeholder="Enter display name (optional)"
              />
            </FormControl>

            <FormControl isRequired mb={4}>
              <FormLabel>Password</FormLabel>
              <InputGroup>
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Enter password"
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

            <Checkbox
              isChecked={formData.isAdmin}
              onChange={(e) => setFormData({ ...formData, isAdmin: e.target.checked })}
            >
              Administrator privileges
            </Checkbox>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={createModal.onClose}>
              Cancel
            </Button>
            <Button
              colorScheme="purple"
              onClick={handleCreate}
              isLoading={isSubmitting}
            >
              Create User
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Edit User Modal */}
      <Modal isOpen={editModal.isOpen} onClose={editModal.onClose}>
        <ModalOverlay />
        <ModalContent bg="dark.card">
          <ModalHeader>Edit User: @{selectedUser?.username}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {formError && (
              <Alert status="error" mb={4} borderRadius="md">
                <AlertIcon />
                {formError}
              </Alert>
            )}

            <FormControl mb={4}>
              <FormLabel>Display Name</FormLabel>
              <Input
                value={formData.displayName}
                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                placeholder="Enter display name"
              />
            </FormControl>

            <FormControl mb={4}>
              <FormLabel>New Password (leave empty to keep current)</FormLabel>
              <InputGroup>
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Enter new password"
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

            <Checkbox
              isChecked={formData.isAdmin}
              onChange={(e) => setFormData({ ...formData, isAdmin: e.target.checked })}
              mb={2}
            >
              Administrator privileges
            </Checkbox>

            <Checkbox
              isChecked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
            >
              Account active
            </Checkbox>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={editModal.onClose}>
              Cancel
            </Button>
            <Button
              colorScheme="purple"
              onClick={handleUpdate}
              isLoading={isSubmitting}
            >
              Save Changes
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={deleteModal.isOpen} onClose={deleteModal.onClose}>
        <ModalOverlay />
        <ModalContent bg="dark.card">
          <ModalHeader>Delete User</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text>
              Are you sure you want to delete user <strong>@{selectedUser?.username}</strong>?
            </Text>
            <Alert status="warning" mt={4} borderRadius="md">
              <AlertIcon />
              This will also delete all of their data (tasks, trackers, etc.). This action cannot be undone.
            </Alert>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={deleteModal.onClose}>
              Cancel
            </Button>
            <Button
              colorScheme="red"
              onClick={handleDelete}
              isLoading={isSubmitting}
            >
              Delete User
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
