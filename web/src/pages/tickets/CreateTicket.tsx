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
} from '@mantine/core'
import { useForm } from '@mantine/form'
import { Icon } from '@iconify-icon/react'
import { notifications } from '@mantine/notifications'
import { createTicketApi, fetchEmployeesApi } from '@/api/tickets.api'
import { useAuth } from '@/hooks/useAuth'
import type { Ticket } from '@/types/ticket'
import { useState } from 'react'

const priorityColors: Record<string, string> = {
  HIGH: 'red',
  MEDIUM: 'yellow',
  LOW: 'green',
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
    enabled: user?.role === 'MANAGER', // Only fetch if manager
  })

  const form = useForm({
    initialValues: {
      title: '',
      description: '',
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
      const payload: any = { ...data }

      // For managers: use manual assignment if selected, otherwise leave unassigned
      if (user?.role === 'MANAGER' && selectedEmployeeId) {
        payload.autoAssign = false
        payload.assignedToId = Number(selectedEmployeeId)
      }
      // For employees/customers: auto-assign by workload
      else if (user?.role !== 'MANAGER') {
        payload.autoAssign = true
      }
      // For managers with no selection: leave unassigned (no autoAssign or assignedToId)

      return createTicketApi(payload)
    },
    onSuccess: (data) => {
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
                    <Text fw={600} size="lg">
                      {createdTicket.category}
                    </Text>
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
                        color={priorityColors[createdTicket.priority] || 'gray'}
                      />
                    </Group>
                    <Group justify="space-between" align="flex-end">
                      <Text fw={600} size="lg">
                        {createdTicket.priority}
                      </Text>
                      <Badge
                        color={priorityColors[createdTicket.priority]}
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
                        icon={sentimentIcons[createdTicket.sentiment]}
                        width={16}
                        color={sentimentColors[createdTicket.sentiment]}
                      />
                    </Group>
                    <Group justify="space-between" align="flex-end">
                      <Text fw={600} size="lg">
                        {createdTicket.sentiment}
                      </Text>
                      <Badge
                        color={sentimentColors[createdTicket.sentiment]}
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
                  <Paper p="md" radius="md" bg="blue.0">
                    <Group gap="xs" c="dimmed">
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
