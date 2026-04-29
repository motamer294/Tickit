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
  Textarea,
  ColorPicker,
  LoadingOverlay,
  Center,
  ActionIcon,
  Tooltip,
} from '@mantine/core'
import { Icon } from '@iconify-icon/react'
import { notifications } from '@mantine/notifications'
import {
  fetchCategoriesApi,
  createCategoryApi,
  updateCategoryApi,
  deleteCategoryApi,
} from '@/api/tickets.api'
import type { Category } from '@/types/ticket'

export default function CategoryAdminPanel() {
  const queryClient = useQueryClient()
  const [opened, setOpened] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#0066cc',
  })

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: fetchCategoriesApi,
  })

  const createMutation = useMutation({
    mutationFn: (payload: typeof formData) => createCategoryApi(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] })
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      notifications.show({
        title: 'Success',
        message: 'Category created successfully',
        color: 'green',
      })
      resetForm()
      setOpened(false)
    },
    onError: (error) => {
      notifications.show({
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to create category',
        color: 'red',
      })
    },
  })

  const updateMutation = useMutation({
    mutationFn: (payload: typeof formData) =>
      updateCategoryApi(editingCategory!.id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] })
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      notifications.show({
        title: 'Success',
        message: 'Category updated successfully',
        color: 'green',
      })
      resetForm()
      setOpened(false)
    },
    onError: (error) => {
      notifications.show({
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to update category',
        color: 'red',
      })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (categoryId: number) => deleteCategoryApi(categoryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] })
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      notifications.show({
        title: 'Success',
        message: 'Category deleted successfully',
        color: 'green',
      })
    },
    onError: (error) => {
      notifications.show({
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to delete category',
        color: 'red',
      })
    },
  })

  const resetForm = () => {
    setEditingCategory(null)
    setFormData({
      name: '',
      description: '',
      color: '#0066cc',
    })
  }

  const handleOpenNew = () => {
    resetForm()
    setOpened(true)
  }

  const handleEdit = (category: Category) => {
    setEditingCategory(category)
    setFormData({
      name: category.name,
      description: category.description,
      color: category.color,
    })
    setOpened(true)
  }

  const handleSave = () => {
    if (!formData.name.trim()) {
      notifications.show({
        title: 'Validation Error',
        message: 'Category name is required',
        color: 'yellow',
      })
      return
    }

    if (editingCategory) {
      updateMutation.mutate(formData)
    } else {
      createMutation.mutate(formData)
    }
  }

  const handleDelete = (categoryId: number) => {
    if (confirm('Are you sure you want to delete this category?')) {
      deleteMutation.mutate(categoryId)
    }
  }

  return (
    <Container size="lg" py="xl">
      <Stack gap="lg">
        {/* Header */}
        <Group justify="space-between" align="center">
          <div>
            <Text size="xl" fw={600}>
              Categories
            </Text>
            <Text c="dimmed" size="sm">
              Manage ticket categories
            </Text>
          </div>
          <Button onClick={handleOpenNew} leftSection={<Icon icon="mdi:plus" />}>
            New Category
          </Button>
        </Group>

        {/* Categories Table */}
        <Paper withBorder p="md" radius="md">
          <LoadingOverlay visible={isLoading} />
          {categories.length === 0 ? (
            <Center py="xl">
              <Stack align="center" gap="sm">
                <Icon icon="mdi:folder-open" width={48} height={48} />
                <Text c="dimmed">No categories found</Text>
              </Stack>
            </Center>
          ) : (
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Name</Table.Th>
                  <Table.Th>Description</Table.Th>
                  <Table.Th>Color</Table.Th>
                  <Table.Th w={100} ta="right">
                    Actions
                  </Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {categories.map((category) => (
                  <Table.Tr key={category.id}>
                    <Table.Td fw={500}>{category.name}</Table.Td>
                    <Table.Td>{category.description}</Table.Td>
                    <Table.Td>
                      <Badge variant="filled" style={{ backgroundColor: category.color }}>
                        {category.color}
                      </Badge>
                    </Table.Td>
                    <Table.Td ta="right">
                      <Group gap={4} justify="flex-end">
                        <Tooltip label="Edit">
                          <ActionIcon
                            size="sm"
                            variant="light"
                            onClick={() => handleEdit(category)}
                          >
                            <Icon icon="mdi:pencil" width={16} height={16} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Delete">
                          <ActionIcon
                            size="sm"
                            variant="light"
                            color="red"
                            onClick={() => handleDelete(category.id)}
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
        title={editingCategory ? 'Edit Category' : 'New Category'}
      >
        <Stack gap="md">
          <TextInput
            label="Category Name"
            placeholder="Enter category name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.currentTarget.value })}
            error={!formData.name.trim() ? 'Required' : ''}
          />

          <Textarea
            label="Description"
            placeholder="Enter category description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.currentTarget.value })}
            rows={3}
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
              {editingCategory ? 'Update' : 'Create'}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  )
}
