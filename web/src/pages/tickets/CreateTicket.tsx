import { useMutation, useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  Container,
  TextInput,
  Textarea,
  Button,
  Stack,
  Group,
  Paper,
  Text,
  Badge,
  Center,
  Loader,
  Divider,
  Card,
  SimpleGrid,
  Select,
  MultiSelect,
} from '@mantine/core'
import { useForm } from '@mantine/form'
import { Icon } from '@iconify-icon/react'
import { notifications } from '@mantine/notifications'
import { createTicketApi, fetchEmployeesApi, fetchCategoriesApi, fetchTagsApi } from '@/api/tickets.api'
import { useAuth } from '@/hooks/useAuth'
import type { Ticket } from '@/types/ticket'
import { useState } from 'react'

const priorityColors: Record<string, string> = {
  URGENT: '#FF1493',
  HIGH: '#FF6B6B',
  MEDIUM: '#FFA500',
  LOW: '#90EE90',
}

const sentimentColors: Record<string, string> = {
  Positive: 'green',
  Neutral: 'blue',
  Negative: 'red',
}

const sentimentIcons: Record<string, string> = {
  Positive: 'solar:smile-circle-bold-duotone',
  Neutral: 'solar:face-id-bold-duotone',
  Negative: 'solar:sad-circle-bold-duotone',
}

export default function CreateTicket() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [createdTicket, setCreatedTicket] = useState<Ticket | null>(null)
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(
    null,
  )

  // Fetch employees for dropdown (Option A)
  const { data: employees = [], isLoading: employeesLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: fetchEmployeesApi,
    enabled: user?.role === 'MANAGER',
  })

  // Fetch categories
  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategoriesApi,
  })

  // Fetch tags
  const { data: tags = [], isLoading: tagsLoading } = useQuery({
    queryKey: ['tags'],
    queryFn: fetchTagsApi,
  })

  const form = useForm({
    initialValues: {
      title: '',
      description: '',
      priority: 'MEDIUM',
      category_id: null as number | null,
      tag_ids: [] as number[],
    },
    validate: {
      title: (val) =>
        val.length < 3 ? 'Title must be at least 3 characters' : null,
      description: (val) =>
        val.length < 10 ? 'Description must be at least 10 characters' : null,
    },
  })

  const createMutation = useMutation({
    mutationFn: (data: typeof form.values) => {
      const payload: any = {
        title: data.title,
        description: data.description,
        priority: data.priority,
        category_id: data.category_id,
        tag_ids: data.tag_ids,
      }

      // For managers: use manual assignment if selected
      if (user?.role === 'MANAGER' && selectedEmployeeId) {
        payload.assignedToId = Number(selectedEmployeeId)
      }

      return createTicketApi(payload)
    },
    onSuccess: (data) => {
      console.log('✅ CreateTicket: Ticket created successfully:', data)
      setCreatedTicket(data)
      const assignmentText =
        data.assigned_to_username && data.assigned_to_username !== 'Unassigned'
          ? ` • Assigned to ${data.assigned_to_username}`
          : ''
      notifications.show({
        title: '✨ Ticket created with AI analysis',
        message: `Ticket #${data.id} - ${data.category} - ${data.priority} priority${assignmentText}`,
        color: 'green',
      })
    },
    onError: (error: any) => {
      console.error('❌ CreateTicket: Failed to create:', error)
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to create ticket',
        color: 'red',
      })
    },
  })

  // Show success screen with AI analysis
  if (createdTicket) {
    return (
      <Container size="md" py="lg">
        <Stack gap="lg">
          {/* Success Header */}
          <Group justify="space-between" align="center">
            <Stack gap="sm">
              <Group gap="xs">
                <Icon
                  icon="solar:check-circle-bold-duotone"
                  width={28}
                  color="green"
                />
                <Text size="lg" fw={700} c="green">
                  Ticket Created Successfully
                </Text>
              </Group>
              <Text size="sm" c="dimmed">
                Ticket #{createdTicket.id} · {createdTicket.title}
              </Text>
            </Stack>
          </Group>

          {/* AI Analysis Results */}
          <Paper p="lg" radius="md" withBorder>
            <Stack gap="md">
              <Group justify="space-between" align="center">
                <Group gap="xs">
                  <Icon icon="solar:cpu-bolt-bold-duotone" width={20} />
                  <Text fw={600}>AI Analysis Results</Text>
                </Group>
                <Text size="xs" c="dimmed">
                  Auto-categorized by ML Engine
                </Text>
              </Group>

              <Divider />

              {/* Analysis Grid */}
              <SimpleGrid cols={2} spacing="md">
                {/* Category */}
                <Card withBorder p="md" radius="md">
                  <Stack gap="xs">
                    <Group justify="space-between">
                      <Text size="sm" fw={500} c="dimmed">
                        Category
                      </Text>
                      <Icon
                        icon="solar:tag-bold-duotone"
                        width={16}
                        color="blue"
                      />
                    </Group>
                    {createdTicket.category ? (
                      <Group gap="xs">
                        <div
                          style={{
                            width: 12,
                            height: 12,
                            borderRadius: '50%',
                            backgroundColor: createdTicket.category.color || '#999',
                          }}
                        />
                        <Text fw={600} size="lg">
                          {createdTicket.category.name}
                        </Text>
                      </Group>
                    ) : (
                      <Text fw={600} size="lg" c="dimmed">
                        Unassigned
                      </Text>
                    )}
                  </Stack>
                </Card>

                {/* Priority */}
                <Card withBorder p="md" radius="md">
                  <Stack gap="xs">
                    <Group justify="space-between">
                      <Text size="sm" fw={500} c="dimmed">
                        Priority
                      </Text>
                      <Icon
                        icon="solar:bolt-bold-duotone"
                        width={16}
                        color={priorityColors[createdTicket.priority || 'MEDIUM'] || 'gray'}
                      />
                    </Group>
                    <Group justify="space-between" align="flex-end">
                      <Text fw={600} size="lg">
                        {createdTicket.priority}
                      </Text>
                      <Badge
                        color={priorityColors[createdTicket.priority || 'MEDIUM']}
                        variant="light"
                      >
                        {createdTicket.priority}
                      </Badge>
                    </Group>
                  </Stack>
                </Card>

                {/* Sentiment Analysis */}
                <Card withBorder p="md" radius="md">
                  <Stack gap="xs">
                    <Group justify="space-between">
                      <Text size="sm" fw={500} c="dimmed">
                        Sentiment
                      </Text>
                      <Icon
                        icon={sentimentIcons[createdTicket.sentiment || 'Neutral']}
                        width={16}
                        color={sentimentColors[createdTicket.sentiment || 'Neutral']}
                      />
                    </Group>
                    <Group justify="space-between" align="flex-end">
                      <Text fw={600} size="lg">
                        {createdTicket.sentiment}
                      </Text>
                      <Badge
                        color={sentimentColors[createdTicket.sentiment || 'Neutral']}
                        variant="light"
                      >
                        {createdTicket.sentiment}
                      </Badge>
                    </Group>
                  </Stack>
                </Card>

                {/* Status */}
                <Card withBorder p="md" radius="md">
                  <Stack gap="xs">
                    <Group justify="space-between">
                      <Text size="sm" fw={500} c="dimmed">
                        Status
                      </Text>
                      <Icon
                        icon="solar:clipboard-list-bold-duotone"
                        width={16}
                        color="yellow"
                      />
                    </Group>
                    <Group justify="space-between" align="flex-end">
                      <Text fw={600} size="lg">
                        {createdTicket.status}
                      </Text>
                      <Badge color="yellow" variant="light">
                        {createdTicket.status}
                      </Badge>
                    </Group>
                  </Stack>
                </Card>
              </SimpleGrid>

              {/* Tags */}
              {createdTicket.tags && createdTicket.tags.length > 0 && (
                <>
                  <Divider />
                  <Card withBorder p="md" radius="md">
                    <Stack gap="xs">
                      <Group justify="space-between">
                        <Text size="sm" fw={500} c="dimmed">
                          Tags
                        </Text>
                        <Icon icon="solar:tag-linear" width={16} />
                      </Group>
                      <Group gap="xs">
                        {createdTicket.tags.map((tag) => (
                          <Badge
                            key={tag.id}
                            variant="dot"
                            style={{
                              backgroundColor: tag.color || '#999',
                              color: '#fff',
                            }}
                          >
                            #{tag.name}
                          </Badge>
                        ))}
                      </Group>
                    </Stack>
                  </Card>
                </>
              )}

              <Divider />

              {/* Suggested Solution */}
              {createdTicket.ai_suggested_solution && (
                <Card withBorder p="md" radius="md">
                  <Stack gap="xs">
                    <Group gap="xs">
                      <Icon icon="solar:lightbulb-bold-duotone" width={18} />
                      <Text fw={600} size="md">
                        AI Suggested Solution
                      </Text>
                    </Group>
                    <Text size="sm" style={{ lineHeight: 1.6 }}>
                      {createdTicket.ai_suggested_solution}
                    </Text>
                  </Stack>
                </Card>
              )}
            </Stack>
          </Paper>

          {/* Action Buttons */}
          <Group justify="flex-end" pt="md">
            <Button
              variant="subtle"
              onClick={() => {
                setCreatedTicket(null)
                setSelectedEmployeeId(null)
                form.reset()
              }}
            >
              Create Another
            </Button>
            <Button
              onClick={() => navigate(`../${createdTicket.id}`)}
              leftSection={
                <Icon icon="solar:arrow-right-bold-duotone" width="20" />
              }
            >
              View Ticket Details
            </Button>
          </Group>
        </Stack>
      </Container>
    )
  }

  // Show form
  return (
    <Container size="md" py="lg">
      <Stack gap="lg">
        {/* Header */}
        <Group justify="space-between">
          <div>
            <Text size="lg" fw={700}>
              Create New Ticket
            </Text>
            <Text size="sm" c="dimmed">
              Submit a support request - AI will analyze and categorize it
            </Text>
          </div>
        </Group>

        {/* Info Card - AI Powered Analysis */}
        <Card withBorder p="md" radius="md">
          <Group gap="xs">
            <Icon icon="solar:info-circle-bold-duotone" width={20} />
            <Stack gap={0}>
              <Text fw={500} size="sm">
                AI-Powered Analysis
              </Text>
              <Text size="xs" c="dimmed">
                Our AI engine will automatically analyze your ticket, categorize
                it, assess priority, and suggest solutions.
              </Text>
            </Stack>
          </Group>
        </Card>

        {/* Form */}
        <Paper p="lg" radius="md" withBorder>
          {createMutation.isPending ? (
            <Center py="xl">
              <Stack gap="md" align="center">
                <Loader />
                <div>
                  <Text fw={600}>Creating ticket...</Text>
                  <Text size="sm" c="dimmed">
                    AI is analyzing your request
                  </Text>
                </div>
              </Stack>
            </Center>
          ) : (
            <form
              onSubmit={form.onSubmit((values) => {
                createMutation.mutate(values)
              })}
            >
              <Stack gap="md">
                <TextInput
                  required
                  label="Issue Title"
                  placeholder="e.g., Cannot login to my account"
                  description="Brief summary of your issue"
                  size="md"
                  leftSection={
                    <Icon icon="solar:clipboard-list-bold-duotone" width="20" />
                  }
                  {...form.getInputProps('title')}
                />

                <Textarea
                  required
                  label="Detailed Description"
                  placeholder="Please describe your issue in detail, including any error messages, steps to reproduce, and what you've tried so far."
                  description="The more details you provide, the better we can help"
                  descriptionProps={{ c: 'dimmed', size: 'xs' }}
                  minRows={8}
                  maxRows={15}
                  size="md"
                  autoFocus
                  {...form.getInputProps('description')}
                />

                {/* Priority & Category Selection */}
                <Paper p="md" radius="md" withBorder>
                  <Stack gap="sm">
                    <Group grow>
                      {/* Priority */}
                      <Select
                        label="Priority"
                        placeholder="Select priority level"
                        data={[
                          { value: 'LOW', label: '🟢 Low' },
                          { value: 'MEDIUM', label: '🟡 Medium' },
                          { value: 'HIGH', label: '🔴 High' },
                          { value: 'URGENT', label: '🔥 Urgent' },
                        ]}
                        {...form.getInputProps('priority')}
                        searchable
                      />

                      {/* Category */}
                      <Select
                        label="Category"
                        placeholder="Select category"
                        data={categories.map((cat) => ({
                          value: cat.id.toString(),
                          label: cat.name,
                        }))}
                        {...form.getInputProps('category_id')}
                        searchable
                        clearable
                        disabled={categoriesLoading}
                      />
                    </Group>

                    {/* Tags */}
                    <MultiSelect
                      label="Tags"
                      placeholder="Add tags to organize this ticket"
                      data={tags.map((tag) => ({
                        value: tag.id.toString(),
                        label: `#${tag.name}`,
                      }))}
                      searchable
                      clearable
                      disabled={tagsLoading}
                      {...form.getInputProps('tag_ids')}
                    />
                  </Stack>
                </Paper>

                {/* Assignment Section (Managers Only) */}
                {user?.role === 'MANAGER' && (
                  <Paper p="md" radius="md" bga="dimmed">
                    <Stack gap="sm">
                      <div>
                        <Text fw={600} size="sm" mb="auto">
                          Assign to Employee
                        </Text>
                        <Text size="xs" >
                          Optional: Manually assign this ticket to an employee
                        </Text>
                      </div>

                      <Select
                        label="Select Employee"
                        placeholder={
                          employeesLoading
                            ? 'Loading employees...'
                            : 'Choose an employee (optional)'
                        }
                        data={employees.map((emp) => ({
                          value: emp.id.toString(),
                          label: emp.username,
                        }))}
                        value={selectedEmployeeId}
                        onChange={setSelectedEmployeeId}
                        disabled={employeesLoading || employees.length === 0}
                        searchable
                        clearable
                      />
                    </Stack>
                  </Paper>
                )}

                {/* Auto-Assign Info (Non-Managers) */}
                {user?.role !== 'MANAGER' && (
                  <Paper p="md" radius="md" withBorder>
                    <Group gap="xs" c="blue">
                      <Icon icon="solar:info-circle-bold-duotone" width={20} />
                      <Text size="sm">
                        This ticket will be automatically assigned to the
                        available employee with the least workload.
                      </Text>
                    </Group>
                  </Paper>
                )}

                <Group justify="flex-end" pt="md">
                  <Button variant="subtle" onClick={() => navigate('..')}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createMutation.isPending}
                    leftSection={
                      <Icon icon="solar:check-circle-bold-duotone" width="20" />
                    }
                  >
                    Submit Ticket
                  </Button>
                </Group>
              </Stack>
            </form>
          )}
        </Paper>

        {/* Tips Card */}
        <Card withBorder p="md" radius="md">
          <Stack gap="sm">
            <Group gap="xs">
              <Icon icon="solar:lightbulb-bold-duotone" width={18} />
              <Text fw={600} size="sm">
                Tips for better support
              </Text>
            </Group>
            <Stack gap="xs" ml="md">
              <Text size="xs" c="dimmed">
                • Be specific and detailed in your description
              </Text>
              <Text size="xs" c="dimmed">
                • Include error messages or screenshots if applicable
              </Text>
              <Text size="xs" c="dimmed">
                • Our AI will automatically assign priority and category
              </Text>
              <Text size="xs" c="dimmed">
                • You'll see a suggested solution immediately after creation
              </Text>
            </Stack>
          </Stack>
        </Card>
      </Stack>
    </Container>
  )
}
