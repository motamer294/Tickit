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
  ColorPicker,
  LoadingOverlay,
  Center,
  ActionIcon,
  Tooltip,
} from '@mantine/core'
import { Icon } from '@iconify-icon/react'
import { notifications } from '@mantine/notifications'
import {
  fetchTagsApi,
  createTagApi,
  updateTagApi,
  deleteTagApi,
} from '@/api/tickets.api'
import type { Tag } from '@/types/ticket'

export default function TagAdminPanel() {
  const queryClient = useQueryClient()
  const [opened, setOpened] = useState(false)
  const [editingTag, setEditingTag] = useState<Tag | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    color: '#0066cc',
  })

  const { data: tags = [], isLoading } = useQuery({
    queryKey: ['admin-tags'],
    queryFn: fetchTagsApi,
  })

  const createMutation = useMutation({
    mutationFn: (payload: typeof formData) => createTagApi(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tags'] })
      queryClient.invalidateQueries({ queryKey: ['tags'] })
      notifications.show({
        title: 'Success',
        message: 'Tag created successfully',
        color: 'green',
      })
      resetForm()
      setOpened(false)
    },
    onError: (error) => {
      notifications.show({
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to create tag',
        color: 'red',
      })
    },
  })

  const updateMutation = useMutation({
    mutationFn: (payload: typeof formData) => updateTagApi(editingTag!.id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tags'] })
      queryClient.invalidateQueries({ queryKey: ['tags'] })
      notifications.show({
        title: 'Success',
        message: 'Tag updated successfully',
        color: 'green',
      })
      resetForm()
      setOpened(false)
    },
    onError: (error) => {
      notifications.show({
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to update tag',
        color: 'red',
      })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (tagId: number) => deleteTagApi(tagId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tags'] })
      queryClient.invalidateQueries({ queryKey: ['tags'] })
      notifications.show({
        title: 'Success',
        message: 'Tag deleted successfully',
        color: 'green',
      })
    },
    onError: (error) => {
      notifications.show({
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to delete tag',
        color: 'red',
      })
    },
  })

  const resetForm = () => {
    setEditingTag(null)
    setFormData({
      name: '',
      color: '#0066cc',
    })
  }

  const handleOpenNew = () => {
    resetForm()
    setOpened(true)
  }

  const handleEdit = (tag: Tag) => {
    setEditingTag(tag)
    setFormData({
      name: tag.name,
      color: tag.color,
    })
    setOpened(true)
  }

  const handleSave = () => {
    if (!formData.name.trim()) {
      notifications.show({
        title: 'Validation Error',
        message: 'Tag name is required',
        color: 'yellow',
      })
      return
    }

    if (editingTag) {
      updateMutation.mutate(formData)
    } else {
      createMutation.mutate(formData)
    }
  }

  const handleDelete = (tagId: number) => {
    if (confirm('Are you sure you want to delete this tag?')) {
      deleteMutation.mutate(tagId)
    }
  }

  return (
    <Container size="lg" py="xl">
      <Stack gap="lg">
        {/* Header */}
        <Group justify="space-between" align="center">
          <div>
            <Text size="xl" fw={600}>
              Tags
            </Text>
            <Text c="dimmed" size="sm">
              Manage ticket tags
            </Text>
          </div>
          <Button onClick={handleOpenNew} leftSection={<Icon icon="mdi:plus" />}>
            New Tag
          </Button>
        </Group>

        {/* Tags Table */}
        <Paper withBorder p="md" radius="md">
          <LoadingOverlay visible={isLoading} />
          {tags.length === 0 ? (
            <Center py="xl">
              <Stack align="center" gap="sm">
                <Icon icon="mdi:label-outline" width={48} height={48} />
                <Text c="dimmed">No tags found</Text>
              </Stack>
            </Center>
          ) : (
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Name</Table.Th>
                  <Table.Th>Color</Table.Th>
                  <Table.Th w={100} ta="right">
                    Actions
                  </Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {tags.map((tag) => (
                  <Table.Tr key={tag.id}>
                    <Table.Td fw={500}>{tag.name}</Table.Td>
                    <Table.Td>
                      <Badge variant="filled" style={{ backgroundColor: tag.color }}>
                        {tag.color}
                      </Badge>
                    </Table.Td>
                    <Table.Td ta="right">
                      <Group gap={4} justify="flex-end">
                        <Tooltip label="Edit">
                          <ActionIcon
                            size="sm"
                            variant="light"
                            onClick={() => handleEdit(tag)}
                          >
                            <Icon icon="mdi:pencil" width={16} height={16} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Delete">
                          <ActionIcon
                            size="sm"
                            variant="light"
                            color="red"
                            onClick={() => handleDelete(tag.id)}
                            loading={deleteMutation.isPending}
                          >
                            <Icon icon="mdi:delete" width={16} height={16} />
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          )}
        </Paper>
      </Stack>

      {/* Modal */}
      <Modal
        opened={opened}
        onClose={() => {
          setOpened(false)
          resetForm()
        }}
        title={editingTag ? 'Edit Tag' : 'New Tag'}
      >
        <Stack gap="md">
          <TextInput
            label="Tag Name"
            placeholder="Enter tag name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.currentTarget.value })}
            error={!formData.name.trim() ? 'Required' : ''}
          />

          <div>
            <Text size="sm" fw={500} mb={8}>
              Color
            </Text>
            <ColorPicker
              value={formData.color}
              onChange={(color) => setFormData({ ...formData, color })}
              swatchesPerRow={8}
            />
          </div>

          <Group justify="flex-end">
            <Button variant="default" onClick={() => setOpened(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              loading={createMutation.isPending || updateMutation.isPending}
            >
              {editingTag ? 'Update' : 'Create'}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  )
}
