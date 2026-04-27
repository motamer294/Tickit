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
  NumberInput,
  Select,
  Textarea,
  LoadingOverlay,
  Center,
  Loader,
  ActionIcon,
  Tooltip,
  Switch,
} from '@mantine/core'
import { Icon } from '@iconify-icon/react'
import { notifications } from '@mantine/notifications'
import { fetchCategoriesApi } from '@/api/tickets.api'
import {
  listSLAs,
  createSLA,
  updateSLA,
  deleteSLA,
  type SLA,
  type SLACreatePayload,
  type SLAUpdatePayload,
} from '@/api/admin.api'
import type { Category } from '@/types/ticket'

// ============================================
// Component
// ============================================

export default function SLAManagement() {
  const queryClient = useQueryClient()
  const [opened, setOpened] = useState(false)
  const [editingSLA, setEditingSLA] = useState<SLA | null>(null)
  const [formData, setFormData] = useState<{
    name: string
    description: string
    priority: 'HIGH' | 'MEDIUM' | 'LOW'
    category_id: number | null
    response_time_hours: number
    resolution_time_hours: number
    is_active: boolean
  }>({
    name: '',
    description: '',
    priority: 'MEDIUM',
    category_id: null,
    response_time_hours: 4,
    resolution_time_hours: 24,
    is_active: true,
  })

  // Fetch SLAs
  const { data: slas = [], isLoading, error } = useQuery({
    queryKey: ['admin-slas'],
    queryFn: () => listSLAs(1000, 0),
  })

  // Fetch categories for dropdown
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategoriesApi,
  })

  // Create SLA mutation
  const createSLAMutation = useMutation({
    mutationFn: async (payload: SLACreatePayload) => {
      return createSLA(payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-slas'] })
      notifications.show({
        title: 'SLA Created',
        message: 'New SLA has been created successfully',
        color: 'green',
      })
      resetForm()
      setOpened(false)
    },
    onError: (error) => {
      notifications.show({
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to create SLA',
        color: 'red',
      })
    },
  })

  // Update SLA mutation
  const updateSLAMutation = useMutation({
    mutationFn: async (payload: { slaId: number; data: SLAUpdatePayload }) => {
      return updateSLA(payload.slaId, payload.data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-slas'] })
      notifications.show({
        title: 'SLA Updated',
        message: 'SLA has been updated successfully',
        color: 'green',
      })
      resetForm()
      setOpened(false)
    },
    onError: (error) => {
      notifications.show({
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to update SLA',
        color: 'red',
      })
    },
  })

  // Delete SLA mutation
  const deleteSLAMutation = useMutation({
    mutationFn: deleteSLA,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-slas'] })
      notifications.show({
        title: 'SLA Deleted',
        message: 'SLA has been deleted successfully',
        color: 'green',
      })
    },
    onError: (error) => {
      notifications.show({
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to delete SLA',
        color: 'red',
      })
    },
  })

  // Handlers
  const handleOpenModal = (sla?: SLA) => {
    if (sla) {
      setEditingSLA(sla)
      setFormData({
        name: sla.name,
        description: sla.description || '',
        priority: sla.priority,
        category_id: sla.category_id,
        response_time_hours: sla.response_time_hours,
        resolution_time_hours: sla.resolution_time_hours,
        is_active: sla.is_active,
      })
    } else {
      setEditingSLA(null)
      resetForm()
    }
    setOpened(true)
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      priority: 'MEDIUM',
      category_id: null,
      response_time_hours: 4,
      resolution_time_hours: 24,
      is_active: true,
    })
    setEditingSLA(null)
  }

  const handleSubmit = async () => {
    if (!formData.name || !formData.category_id) {
      notifications.show({
        title: 'Validation Error',
        message: 'Please fill in all required fields',
        color: 'yellow',
      })
      return
    }

    if (formData.response_time_hours <= 0 || formData.resolution_time_hours <= 0) {
      notifications.show({
        title: 'Validation Error',
        message: 'Time values must be greater than 0',
        color: 'yellow',
      })
      return
    }

    const payload = {
      name: formData.name,
      description: formData.description,
      priority: formData.priority,
      category_id: formData.category_id,
      response_time_hours: formData.response_time_hours,
      resolution_time_hours: formData.resolution_time_hours,
    }

    if (editingSLA) {
      updateSLAMutation.mutate({
        slaId: editingSLA.id,
        data: { ...payload, is_active: formData.is_active },
      })
    } else {
      createSLAMutation.mutate(payload)
    }
  }

  const handleDelete = (sla: SLA) => {
    if (window.confirm(`Are you sure you want to delete SLA "${sla.name}"?`)) {
      deleteSLAMutation.mutate(sla.id)
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

  const priorityColors: Record<string, string> = {
    HIGH: 'red',
    MEDIUM: 'yellow',
    LOW: 'green',
  }

  const categoryMap = Object.fromEntries(
    (categories as Category[]).map((c) => [c.id, c.name])
  )

  return (
    <Container size="lg" py="lg">
      <Stack gap="lg">
        {/* Header */}
        <Group justify="space-between" align="center">
          <div>
            <Text size="lg" fw={500}>
              SLA Management
            </Text>
            <Text size="sm" c="dimmed">
              Define service level agreements for ticket priorities
            </Text>
          </div>
          <Button onClick={() => handleOpenModal()} leftSection={<Icon icon="mdi:plus" />}>
            Add SLA
          </Button>
        </Group>

        {/* Error Alert */}
        {error && (
          <Paper p="md" bg="red.0" c="red.9" radius="md">
            <Group justify="space-between">
              <Text>Error loading SLAs. Please try again.</Text>
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

        {/* SLAs Table */}
        <Paper withBorder radius="md" style={{ overflow: 'hidden' }}>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Name</Table.Th>
                <Table.Th>Category</Table.Th>
                <Table.Th>Priority</Table.Th>
                <Table.Th>Response Time</Table.Th>
                <Table.Th>Resolution Time</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th align="center">Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {slas.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={7}>
                    <Center py="lg">
                      <Text c="dimmed">No SLAs configured</Text>
                    </Center>
                  </Table.Td>
                </Table.Tr>
              ) : (
                slas.map((sla) => (
                  <Table.Tr key={sla.id}>
                    <Table.Td fw={500}>{sla.name}</Table.Td>
                    <Table.Td>{categoryMap[sla.category_id] || 'Unknown'}</Table.Td>
                    <Table.Td>
                      <Badge color={priorityColors[sla.priority]}>{sla.priority}</Badge>
                    </Table.Td>
                    <Table.Td>{sla.response_time_hours}h</Table.Td>
                    <Table.Td>{sla.resolution_time_hours}h</Table.Td>
                    <Table.Td>
                      <Badge color={sla.is_active ? 'green' : 'gray'}>
                        {sla.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs" justify="center">
                        <Tooltip label="Edit">
                          <ActionIcon
                            variant="subtle"
                            color="blue"
                            onClick={() => handleOpenModal(sla)}
                          >
                            <Icon icon="mdi:pencil" width={18} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Delete">
                          <ActionIcon
                            variant="subtle"
                            color="red"
                            onClick={() => handleDelete(sla)}
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

      {/* SLA Form Modal */}
      <Modal
        opened={opened}
        onClose={() => {
          setOpened(false)
          resetForm()
        }}
        title={editingSLA ? 'Edit SLA' : 'Create New SLA'}
        size="md"
      >
        <LoadingOverlay
          visible={createSLAMutation.isPending || updateSLAMutation.isPending}
          zIndex={1000}
          overlayProps={{ radius: 'sm', blur: 2 }}
        />
        <Stack gap="md">
          <TextInput
            label="SLA Name"
            placeholder="Enter SLA name (e.g., 'High Priority - Sales')"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />

          <Textarea
            label="Description"
            placeholder="Enter SLA description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />

          <Group grow>
            <Select
              label="Priority"
              placeholder="Select priority"
              data={[
                { value: 'HIGH', label: 'High' },
                { value: 'MEDIUM', label: 'Medium' },
                { value: 'LOW', label: 'Low' },
              ]}
              value={formData.priority}
              onChange={(value) =>
                setFormData({
                  ...formData,
                  priority: (value as 'HIGH' | 'MEDIUM' | 'LOW') || 'MEDIUM',
                })
              }
              required
            />

            <Select
              label="Category"
              placeholder="Select category"
              data={(categories as Category[]).map((c) => ({ value: c.id.toString(), label: c.name }))}
              value={formData.category_id?.toString() || ''}
              onChange={(value) =>
                setFormData({ ...formData, category_id: value ? parseInt(value) : null })
              }
              required
            />
          </Group>

          <Group grow>
            <NumberInput
              label="Response Time (hours)"
              placeholder="Enter response time"
              min={0}
              value={formData.response_time_hours}
              onChange={(value) =>
                setFormData({
                  ...formData,
                  response_time_hours: typeof value === 'number' ? value : 4,
                })
              }
              required
            />

            <NumberInput
              label="Resolution Time (hours)"
              placeholder="Enter resolution time"
              min={0}
              value={formData.resolution_time_hours}
              onChange={(value) =>
                setFormData({
                  ...formData,
                  resolution_time_hours: typeof value === 'number' ? value : 24,
                })
              }
              required
            />
          </Group>

          {editingSLA && (
            <Switch
              label="Active"
              description="Enable or disable this SLA"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.currentTarget.checked })}
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
            <Button onClick={handleSubmit}>{editingSLA ? 'Update SLA' : 'Create SLA'}</Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  )
}
