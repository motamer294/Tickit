import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useNavigate } from 'react-router-dom'
import { useRef, useEffect, useState } from 'react'
import {
  Container,
  Loader,
  Center,
  Stack,
  Group,
  Button,
  Badge,
  Text,
  Textarea,
  Select,
  Paper,
  Avatar,
  Timeline,
  Modal,
  Card,
  SimpleGrid,
  TextInput,
  ActionIcon,
} from '@mantine/core'
import { Icon } from '@iconify-icon/react'
import { notifications } from '@mantine/notifications'
import { useAuth } from '@/hooks/useAuth'
import { ChatSection } from '@/components/ChatSection'
import {
  fetchTicketById,
  updateTicketStatusApi,
  addCommentApi,
  fetchTicketComments,
  assignTicketApi,
  fetchEmployeesApi,
  deleteTicketApi,
  updateTicketApi,
} from '@/api/tickets.api'
import type { TicketStatus } from '@/types/ticket'

const statusColors: Record<TicketStatus, string> = {
  OPEN: 'red',
  IN_PROGRESS: 'yellow',
  RESOLVED: 'green',
  CLOSED: 'gray',
}

const statusLabels: Record<TicketStatus, string> = {
  OPEN: 'Open',
  IN_PROGRESS: 'In Progress',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
}

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

export default function TicketDetail() {
  const { ticketId } = useParams<{ ticketId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [commentText, setCommentText] = useState('')
  const [newStatus, setNewStatus] = useState<TicketStatus | null>(null)
  const [assignModalOpen, setAssignModalOpen] = useState(false)
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(
    null,
  )
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [chatModalOpen, setChatModalOpen] = useState(false)

  // Store ticket info for notifications
  const ticketTitle = useRef<string>('')

  // Fetch employees for dropdown
  const { data: employees = [], isLoading: employeesLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: fetchEmployeesApi,
    enabled: user?.role === 'MANAGER', // Only fetch if manager
  })

  const ticketIdNum = parseInt(ticketId || '0')

  // Debug logging
  console.log(
    '[TicketDetail] Mounted with ticketId:',
    ticketId,
    'parsed:',
    ticketIdNum,
  )

  const {
    data: ticket,
    isLoading: ticketLoading,
    error: ticketError,
  } = useQuery({
    queryKey: ['ticket', ticketIdNum],
    queryFn: () => {
      console.log('[TicketDetail] Fetching ticket:', ticketIdNum)
      return fetchTicketById(ticketIdNum)
    },
    enabled: !!ticketIdNum,
  })

  // Update ticketTitle ref whenever ticket loads
  useEffect(() => {
    if (ticket?.title) {
      ticketTitle.current = ticket.title
    }
  }, [ticket?.title])

  const { data: comments = [] } = useQuery({
    queryKey: ['ticket-comments', ticketIdNum],
    queryFn: () => fetchTicketComments(ticketIdNum),
    enabled: !!ticketIdNum,
  })

  const updateStatusMutation = useMutation({
    mutationFn: (status: TicketStatus) =>
      updateTicketStatusApi(ticketIdNum, status),
    onSuccess: (_updatedTicket, _newStatus) => {
      notifications.show({
        title: 'Status updated',
        message: 'Ticket status has been updated successfully',
        color: 'green',
      })
      // ✅ REMOVED: Client-side notification (server sends via WebSocket)
      // This prevents duplicate notifications
      console.log('[Status Update] Posted - server will broadcast via WebSocket')
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketIdNum] })
      setNewStatus(null)
    },
    onError: (error: any) => {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to update status',
        color: 'red',
      })
    },
  })

  const addCommentMutation = useMutation({
    mutationFn: () => addCommentApi(ticketIdNum, commentText),
    onSuccess: () => {
      notifications.show({
        title: 'Comment added',
        message: 'Your comment has been posted',
        color: 'green',
      })
      // ✅ REMOVED: Client-side notification (server sends via WebSocket)
      // This prevents duplicate notifications
      console.log('[Comment] Posted - server will broadcast via WebSocket')
      queryClient.invalidateQueries({
        queryKey: ['ticket-comments', ticketIdNum],
      })
      setCommentText('')
    },
    onError: (error: any) => {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to add comment',
        color: 'red',
      })
    },
  })

  const assignMutation = useMutation({
    mutationFn: (empId: number) => assignTicketApi(ticketIdNum, empId),
    onSuccess: (_data) => {
      notifications.show({
        title: 'Assigned',
        message: 'Ticket has been assigned successfully',
        color: 'green',
      })
      // ✅ REMOVED: Client-side notification (server sends via WebSocket)
      // This prevents duplicate notifications
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketIdNum] })
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
      setAssignModalOpen(false)
      setSelectedEmployeeId(null)
    },
    onError: (error: any) => {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to assign ticket',
        color: 'red',
      })
    },
  })

  const updateMutation = useMutation({
    mutationFn: () =>
      updateTicketApi(ticketIdNum, {
        title: editTitle,
        description: editDescription,
      }),
    onSuccess: () => {
      notifications.show({
        title: 'Updated',
        message: 'Ticket has been updated successfully',
        color: 'green',
      })
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketIdNum] })
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
      setEditModalOpen(false)
    },
    onError: (error: any) => {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to update ticket',
        color: 'red',
      })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteTicketApi(ticketIdNum),
    onSuccess: () => {
      notifications.show({
        title: 'Deleted',
        message: 'Ticket has been deleted successfully',
        color: 'green',
      })
      // ✅ REMOVED: Client-side notification (server sends via WebSocket)
      // This prevents duplicate notifications
      console.log('[Delete] Ticket deleted - server will broadcast via WebSocket')
      navigate('..')
    },
    onError: (error: any) => {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to delete ticket',
        color: 'red',
      })
    },
  })

  if (ticketLoading) {
    return (
      <Center h={300}>
        <Loader />
      </Center>
    )
  }

  if (ticketError) {
    const errorMessage =
      ticketError instanceof Error
        ? ticketError.message
        : 'Failed to load ticket'
    console.error(
      '[TicketDetail] Error loading ticket:',
      errorMessage,
      ticketError,
    )
    return (
      <Container py="lg">
        <Stack gap="md">
          <Text c="red" fw={500}>
            {errorMessage}
          </Text>
          <Button onClick={() => navigate('..')} variant="light">
            Back to Tickets
          </Button>
        </Stack>
      </Container>
    )
  }

  if (!ticket) {
    console.warn('[TicketDetail] No ticket data, but also no error')
    return (
      <Container py="lg">
        <Stack gap="md">
          <Text c="red" fw={500}>
            Ticket not found
          </Text>
          <Button onClick={() => navigate('..')} variant="light">
            Back to Tickets
          </Button>
        </Stack>
      </Container>
    )
  }

  console.log('[TicketDetail] Ticket loaded:', ticket)

  const canUpdateStatus =
    user?.role === 'MANAGER' || ticket.assigned_to_id === user?.id
  const isManager = user?.role === 'MANAGER'

  return (
    <Container size="xl" py="lg">
      <Stack gap="lg">
        {/* Header - Full Width */}
        <Group justify="space-between" align="flex-start">
          <Stack gap="sm">
            <Group>
              <Text size="lg" fw={700}>
                #{ticket.id} - {ticket.title}
              </Text>
              <Badge color={statusColors[ticket.status]}>
                {statusLabels[ticket.status]}
              </Badge>
            </Group>
            <Group gap="xl">
              <div>
                <Text size="sm" c="dimmed">
                  Created by
                </Text>
                <Text fw={500}>{ticket.creator_username}</Text>
              </div>
              <div>
                <Text size="sm" c="dimmed">
                  Assigned to
                </Text>
                <Group gap="xs">
                  <Text fw={500}>
                    {ticket.assigned_to_username === 'Unassigned'
                      ? 'Unassigned'
                      : ticket.assigned_to_username}
                  </Text>
                  {isManager && (
                    <Button
                      variant="subtle"
                      size="xs"
                      onClick={() => setAssignModalOpen(true)}
                      leftSection={
                        <Icon icon="solar:pen-new-round-linear" width={14} />
                      }
                    >
                      Reassign
                    </Button>
                  )}
                </Group>
              </div>
              <div>
                <Text size="sm" c="dimmed">
                  Created at
                </Text>
                <Text fw={500}>
                  {new Date(ticket.created_at).toLocaleDateString()}
                </Text>
              </div>
            </Group>
          </Stack>
          <Group>
            {isManager && (
              <>
                <ActionIcon
                  variant="subtle"
                  color="blue"
                  onClick={() => {
                    setEditTitle(ticket.title)
                    setEditDescription(ticket.description)
                    setEditModalOpen(true)
                  }}
                  title="Edit ticket"
                >
                  <Icon icon="solar:pen-bold-duotone" width={20} />
                </ActionIcon>
                <ActionIcon
                  variant="subtle"
                  color="red"
                  onClick={() => setDeleteConfirmOpen(true)}
                  title="Delete ticket"
                >
                  <Icon icon="solar:trash-bin-minimalistic-bold-duotone" width={20} />
                </ActionIcon>
              </>
            )}
            <Button variant="subtle" onClick={() => navigate('..')}>
              <Icon icon="solar:arrow-left-linear" /> Back
            </Button>
          </Group>
        </Group>

        {/* Description */}
        <Paper p="md" radius="md" withBorder>
          <Stack gap="sm">
            <Text size="sm" fw={500} c="dimmed">
              Description
            </Text>
            <Text>{ticket.description}</Text>
          </Stack>
        </Paper>

        {/* AI Analysis Section */}
        <Paper p="lg" radius="md" withBorder>
                <Stack gap="md">
                  <Group justify="space-between" align="center">
                    <Group gap="xs">
                      <Icon icon="solar:cpu-bolt-bold-duotone" width={20} />
                      <Text fw={600}>AI Analysis</Text>
                    </Group>
                    <Text size="xs" c="dimmed">
                      Auto-analyzed by ML Engine
                    </Text>
                  </Group>

                  <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md">
                    {/* Category */}
                    <Card withBorder p="md" radius="md">
                      <Stack gap="xs">
                        <Group justify="space-between">
                          <Text size="sm" fw={500} c="dimmed">
                            Category
                          </Text>
                          <Icon icon="solar:tag-bold-duotone" width={16} />
                        </Group>
                        <Text fw={600}>{ticket.category}</Text>
                      </Stack>
                    </Card>

                    {/* Priority */}
                    <Card withBorder p="md" radius="md">
                      <Stack gap="xs">
                        <Group justify="space-between">
                          <Text size="sm" fw={500} c="dimmed">
                            Priority
                          </Text>
                          <Icon icon="solar:bolt-bold-duotone" width={16} />
                        </Group>
                        <Group justify="space-between" align="flex-end">
                          <Text fw={600}>{ticket.priority}</Text>
                          <Badge color={priorityColors[ticket.priority] || 'gray'}>
                            {ticket.priority}
                          </Badge>
                        </Group>
                      </Stack>
                    </Card>

                    {/* Sentiment */}
                    <Card withBorder p="md" radius="md">
                      <Stack gap="xs">
                        <Group justify="space-between">
                          <Text size="sm" fw={500} c="dimmed">
                            Sentiment
                          </Text>
                          <Icon icon="solar:face-id-bold-duotone" width={16} />
                        </Group>
                        <Group justify="space-between" align="flex-end">
                          <Text fw={600}>{ticket.sentiment}</Text>
                          <Badge color={sentimentColors[ticket.sentiment]}>
                            {ticket.sentiment}
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
                          <Icon icon="solar:clipboard-list-bold-duotone" width={16} />
                        </Group>
                        <Group justify="space-between" align="flex-end">
                          <Text fw={600}>{ticket.status}</Text>
                          <Badge color={statusColors[ticket.status]}>
                            {ticket.status}
                          </Badge>
                        </Group>
                      </Stack>
                    </Card>
                  </SimpleGrid>

                  {/* Suggested Solution */}
                  {ticket.ai_suggested_solution && (
                    <Card withBorder p="md" radius="md">
                      <Stack gap="xs">
                        <Group gap="xs">
                          <Icon icon="solar:lightbulb-bold-duotone" width={18} />
                          <Text fw={600} size="md">
                            AI Suggested Solution
                          </Text>
                        </Group>
                        <Text size="sm" style={{ lineHeight: 1.6 }}>
                          {ticket.ai_suggested_solution}
                        </Text>
                      </Stack>
                    </Card>
                  )}
                </Stack>
              </Paper>

              {/* Status Update (if allowed) */}
              {canUpdateStatus && (
                <Paper p="md" radius="md" withBorder>
                  <Stack gap="sm">
                    <Text size="sm" fw={500} c="dimmed">
                      Update Status
                    </Text>
                    <Group>
                      <Select
                        placeholder="Select new status"
                        data={[
                          { value: 'OPEN', label: 'Open' },
                          { value: 'IN_PROGRESS', label: 'In Progress' },
                          { value: 'RESOLVED', label: 'Resolved' },
                          { value: 'CLOSED', label: 'Closed' },
                        ]}
                        value={newStatus}
                        onChange={(value) => setNewStatus(value as TicketStatus)}
                        clearable
                        searchable
                      />
                      <Button
                        onClick={() => {
                          if (newStatus) {
                            updateStatusMutation.mutate(newStatus)
                          }
                        }}
                        loading={updateStatusMutation.isPending}
                        disabled={!newStatus}
                      >
                        Update
                      </Button>
                    </Group>
                  </Stack>
                </Paper>
              )}

              {/* Comments Section */}
              <Stack gap="md">
                <Group justify="space-between" align="center">
                  <Text size="lg" fw={700}>
                    Comments ({comments.length})
                  </Text>
                  <Button
                    variant="light"
                    onClick={() => setChatModalOpen(true)}
                    leftSection={<Icon icon="solar:chat-square-bold-duotone" width={16} />}
                  >
                    Open Chat
                  </Button>
                </Group>

                {/* Comments List */}
                {comments.length > 0 ? (
                  <Timeline active={comments.length} bulletSize={24} lineWidth={2}>
                    {comments.map((comment: any) => (
                      <Timeline.Item
                        key={comment.id}
                        bullet={
                          <Avatar
                            name={comment.author_username}
                            size={24}
                            radius="xl"
                          />
                        }
                      >
                        <Group justify="space-between" mb="xs">
                          <div>
                            <Text fw={500} size="sm">
                              {comment.author_username}
                            </Text>
                            <Text size="xs" c="dimmed">
                              {new Date(comment.created_at).toLocaleString()}
                            </Text>
                          </div>
                        </Group>
                        <Paper p="md" radius="md" withBorder>
                          <Text size="sm">{comment.text}</Text>
                        </Paper>
                      </Timeline.Item>
                    ))}
                  </Timeline>
                ) : (
                  <Text c="dimmed" size="sm">
                    No comments yet
                  </Text>
                )}

                {/* Add Comment */}
                <Paper p="md" radius="md" withBorder>
                  <Stack gap="sm">
                    <Textarea
                      label="Add a comment"
                      placeholder="Type your comment here..."
                      value={commentText}
                      onChange={(e) => setCommentText(e.currentTarget.value)}
                      minRows={3}
                      maxRows={6}
                    />
                    <Button
                      onClick={() => addCommentMutation.mutate()}
                      loading={addCommentMutation.isPending}
                      disabled={!commentText.trim()}
                    >
                      Post Comment
                    </Button>
                  </Stack>
                </Paper>
              </Stack>
      </Stack>

      {/* Assignment Modal (Manager only) */}
      <Modal
        opened={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        title="Assign Ticket to Employee"
        centered
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Select an employee to assign this ticket to
          </Text>
          <Select
            label="Select Employee"
            placeholder={
              employeesLoading ? 'Loading employees...' : 'Choose an employee'
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
            required
          />
          <Group justify="flex-end" gap="sm">
            <Button variant="subtle" onClick={() => setAssignModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedEmployeeId) {
                  assignMutation.mutate(Number(selectedEmployeeId))
                }
              }}
              loading={assignMutation.isPending}
              disabled={!selectedEmployeeId}
            >
              Assign
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Edit Modal (Manager only) */}
      <Modal
        opened={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Edit Ticket"
        centered
      >
        <Stack gap="md">
          <TextInput
            label="Title"
            placeholder="Ticket title"
            value={editTitle}
            onChange={(e) => setEditTitle(e.currentTarget.value)}
          />
          <Textarea
            label="Description"
            placeholder="Ticket description"
            value={editDescription}
            onChange={(e) => setEditDescription(e.currentTarget.value)}
            minRows={5}
            maxRows={10}
          />
          <Group justify="flex-end" gap="sm">
            <Button variant="subtle" onClick={() => setEditModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => updateMutation.mutate()}
              loading={updateMutation.isPending}
              disabled={!editTitle.trim() || !editDescription.trim()}
            >
              Save Changes
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Delete Confirmation Modal (Manager only) */}
      <Modal
        opened={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        title="Delete Ticket"
        centered
      >
        <Stack gap="md">
          <Group gap="xs">
            <Icon icon="solar:danger-bold-duotone" width={24} color="red" />
            <Text>
              Are you sure you want to delete this ticket? This action cannot be
              undone.
            </Text>
          </Group>

          <Paper p="md" radius="md" withBorder c="red">
            <Text size="sm" c="red" fw={500}>
              Ticket #{ticket.id} - {ticket.title}
            </Text>
          </Paper>

          <Group justify="flex-end" gap="sm">
            <Button
              variant="subtle"
              onClick={() => setDeleteConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              color="red"
              onClick={() => deleteMutation.mutate()}
              loading={deleteMutation.isPending}
            >
              Delete Ticket
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Chat Modal */}
      <Modal
        opened={chatModalOpen}
        onClose={() => setChatModalOpen(false)}
        title="Live Chat"
        size="lg"
        centered
      >
        <ChatSection
          ticketId={ticketIdNum}
          currentUserId={user!.id}
          currentUsername={user!.username}
        />
      </Modal>
    </Container>
  )
}
