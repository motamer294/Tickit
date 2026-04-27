import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Container,
  Stack,
  Group,
  Text,
  Paper,
  Button,
  Table,
  Badge,
  Modal,
  TextInput,
  Select,
  PasswordInput,
  LoadingOverlay,
  Center,
  Loader,
  ActionIcon,
  Tooltip,
} from '@mantine/core'
import { Icon } from '@iconify-icon/react'
import { notifications } from '@mantine/notifications'
import {
  listUsers,
  createUser,
  updateUser,
  deactivateUser,
  type User,
  type UserCreatePayload,
  type UserUpdatePayload,
} from '@/api/admin.api'

// ============================================
// Component
// ============================================

export default function UserAdminPanel() {
  const queryClient = useQueryClient()
  const [opened, setOpened] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [formData, setFormData] = useState<{
    username?: string
    email: string
    password?: string
    first_name: string
    last_name: string
    role: 'MANAGER' | 'EMPLOYEE' | 'CUSTOMER'
  }>({
    email: '',
    first_name: '',
    last_name: '',
    role: 'EMPLOYEE',
  })

  // Fetch users
  const { data: users = [], isLoading, error } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => listUsers(1000, 0),
  })

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (payload: UserCreatePayload) => {
      return createUser(payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      notifications.show({
        title: 'User Created',
        message: 'New user has been created successfully',
        color: 'green',
      })
      resetForm()
      setOpened(false)
    },
    onError: (error) => {
      notifications.show({
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to create user',
        color: 'red',
      })
    },
  })

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async (payload: { userId: number; data: UserUpdatePayload }) => {
      return updateUser(payload.userId, payload.data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      notifications.show({
        title: 'User Updated',
        message: 'User has been updated successfully',
        color: 'green',
      })
      resetForm()
      setOpened(false)
    },
    onError: (error) => {
      notifications.show({
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to update user',
        color: 'red',
      })
    },
  })

  // Deactivate user mutation
  const deactivateUserMutation = useMutation({
    mutationFn: deactivateUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      notifications.show({
        title: 'User Deactivated',
        message: 'User has been deactivated successfully',
        color: 'green',
      })
    },
    onError: (error) => {
      notifications.show({
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to deactivate user',
        color: 'red',
      })
    },
  })

  // Handlers
  const handleOpenModal = (user?: User) => {
    if (user) {
      setEditingUser(user)
      setFormData({
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
      })
    } else {
      setEditingUser(null)
      resetForm()
    }
    setOpened(true)
  }

  const resetForm = () => {
    setFormData({
      email: '',
      first_name: '',
      last_name: '',
      role: 'EMPLOYEE',
    })
    setEditingUser(null)
  }

  const handleSubmit = async () => {
    if (!formData.email || !formData.first_name || !formData.last_name) {
      notifications.show({
        title: 'Validation Error',
        message: 'Please fill in all required fields',
        color: 'yellow',
      })
      return
    }

    if (editingUser) {
      // Update existing user
      updateUserMutation.mutate({
        userId: editingUser.id,
        data: {
          email: formData.email,
          first_name: formData.first_name,
          last_name: formData.last_name,
          role: formData.role,
        },
      })
    } else {
      // Create new user
      if (!formData.username || !formData.password) {
        notifications.show({
          title: 'Validation Error',
          message: 'Username and password are required for new users',
          color: 'yellow',
        })
        return
      }
      createUserMutation.mutate({
        username: formData.username,
        email: formData.email,
        password: formData.password,
        first_name: formData.first_name,
        last_name: formData.last_name,
        role: formData.role,
      })
    }
  }

  const handleDeactivate = (user: User) => {
    if (window.confirm(`Are you sure you want to deactivate ${user.username}?`)) {
      deactivateUserMutation.mutate(user.id)
    }
  }

  // Render
  if (isLoading) {
    return (
      <Container size="lg" py="lg">
        <Center>
          <Loader />
        </Center>
      </Container>
    )
  }

  const roleColors: Record<string, string> = {
    MANAGER: 'purple',
    EMPLOYEE: 'blue',
    CUSTOMER: 'green',
  }

  const statusColors: Record<string, string> = {
    active: 'green',
    inactive: 'red',
  }

  return (
    <Container size="lg" py="lg">
      <Stack gap="lg">
        {/* Header */}
        <Group justify="space-between" align="center">
          <div>
            <Text size="lg" fw={500}>
              User Management
            </Text>
            <Text size="sm" c="dimmed">
              Create, edit, and manage system users
            </Text>
          </div>
          <Button onClick={() => handleOpenModal()} leftSection={<Icon icon="mdi:plus" />}>
            Add User
          </Button>
        </Group>

        {/* Error Alert */}
        {error && (
          <Paper p="md" bg="red.0" c="red.9" radius="md">
            <Group justify="space-between">
              <Text>Error loading users. Please try again.</Text>
              <ActionIcon
                variant="transparent"
                color="red"
                onClick={() => window.location.reload()}
              >
                <Icon icon="mdi:refresh" />
              </ActionIcon>
            </Group>
          </Paper>
        )}

        {/* Users Table */}
        <Paper withBorder radius="md" style={{ overflow: 'hidden' }}>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Username</Table.Th>
                <Table.Th>Email</Table.Th>
                <Table.Th>Name</Table.Th>
                <Table.Th>Role</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Joined</Table.Th>
                <Table.Th align="center">Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {users.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={7}>
                    <Center py="lg">
                      <Text c="dimmed">No users found</Text>
                    </Center>
                  </Table.Td>
                </Table.Tr>
              ) : (
                users.map((user) => (
                  <Table.Tr key={user.id}>
                    <Table.Td fw={500}>{user.username}</Table.Td>
                    <Table.Td>{user.email}</Table.Td>
                    <Table.Td>{`${user.first_name} ${user.last_name}`}</Table.Td>
                    <Table.Td>
                      <Badge color={roleColors[user.role]}>{user.role}</Badge>
                    </Table.Td>
                    <Table.Td>
                      <Badge color={statusColors[user.is_active ? 'active' : 'inactive']}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </Table.Td>
                    <Table.Td>{new Date(user.date_joined).toLocaleDateString()}</Table.Td>
                    <Table.Td>
                      <Group gap="xs" justify="center">
                        <Tooltip label="Edit">
                          <ActionIcon
                            variant="subtle"
                            color="blue"
                            onClick={() => handleOpenModal(user)}
                          >
                            <Icon icon="mdi:pencil" width={18} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Deactivate">
                          <ActionIcon
                            variant="subtle"
                            color="red"
                            onClick={() => handleDeactivate(user)}
                            disabled={!user.is_active}
                          >
                            <Icon icon="mdi:delete" width={18} />
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))
              )}
            </Table.Tbody>
          </Table>
        </Paper>
      </Stack>

      {/* User Form Modal */}
      <Modal
        opened={opened}
        onClose={() => {
          setOpened(false)
          resetForm()
        }}
        title={editingUser ? 'Edit User' : 'Create New User'}
        size="md"
      >
        <LoadingOverlay
          visible={createUserMutation.isPending || updateUserMutation.isPending}
          zIndex={1000}
          overlayProps={{ radius: 'sm', blur: 2 }}
        />
        <Stack gap="md">
          {!editingUser && (
            <TextInput
              label="Username"
              placeholder="Enter username"
              required
              value={formData.username || ''}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            />
          )}

          <TextInput
            label="Email"
            placeholder="Enter email"
            type="email"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />

          <Group grow>
            <TextInput
              label="First Name"
              placeholder="Enter first name"
              required
              value={formData.first_name}
              onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
            />
            <TextInput
              label="Last Name"
              placeholder="Enter last name"
              required
              value={formData.last_name}
              onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
            />
          </Group>

          <Select
            label="Role"
            placeholder="Select role"
            data={[
              { value: 'MANAGER', label: 'Manager' },
              { value: 'EMPLOYEE', label: 'Employee' },
              { value: 'CUSTOMER', label: 'Customer' },
            ]}
            value={formData.role}
            onChange={(value) =>
              setFormData({
                ...formData,
                role: (value as 'MANAGER' | 'EMPLOYEE' | 'CUSTOMER') || 'EMPLOYEE',
              })
            }
          />

          {!editingUser && (
            <PasswordInput
              label="Password"
              placeholder="Enter password"
              required
              value={formData.password || ''}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />
          )}

          <Group justify="flex-end" mt="lg">
            <Button
              variant="light"
              onClick={() => {
                setOpened(false)
                resetForm()
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              {editingUser ? 'Update User' : 'Create User'}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  )
}
