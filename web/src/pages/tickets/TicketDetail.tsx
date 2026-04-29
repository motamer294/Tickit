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
  MultiSelect,
  Paper,
  Avatar,
  Timeline,
  Modal,
  Card,
  SimpleGrid,
  TextInput,
  ActionIcon,
  Progress,
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
  uploadAttachmentApi,
  deleteAttachmentApi,
  downloadAttachmentBlob,
  fetchCategoriesApi,
  fetchTagsApi,
} from '@/api/tickets.api'
import type { TicketStatus } from '@/types/ticket'

const statusColors: Record<TicketStatus, string> = {
  OPEN: 'red',
  PENDING: 'blue',
  IN_PROGRESS: 'yellow',
  RESOLVED: 'green',
  CLOSED: 'gray',
}

const statusLabels: Record<TicketStatus, string> = {
  OPEN: 'Open',
  PENDING: 'Pending',
  IN_PROGRESS: 'In Progress',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
}

const priorityColors: Record<string, string> = {
  LOW: 'green',
  MEDIUM: 'yellow',
  HIGH: 'red',
  URGENT: 'violet',
}

const sentimentColors: Record<string, string> = {
  Positive: 'green',
  Neutral: 'blue',
  Negative: 'red',
}

// ============================================
// Attachments Section Component
// ============================================

function AttachmentsSection({ ticket, queryClient }: { ticket: any; queryClient: any }) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [selectedAttachment, setSelectedAttachment] = useState<any>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      // Simulate progress for demo (since axios doesn't show real progress in this setup)
      setUploadProgress(0)

      // Create a progress interval
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev === null) return 10
          if (prev >= 90) {
            clearInterval(progressInterval)
            return prev
          }
          return prev + Math.random() * 30
        })
      }, 300)

      try {
        const result = await uploadAttachmentApi(ticket.id, file)
        clearInterval(progressInterval)
        setUploadProgress(100)
        return result
      } catch (error) {
        clearInterval(progressInterval)
        throw error
      }
    },
    onSuccess: () => {
      notifications.show({
        title: 'File uploaded',
        message: 'Attachment uploaded successfully',
        color: 'green',
      })
      queryClient.invalidateQueries({ queryKey: ['ticket', ticket.id] })
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      // Reset progress after delay
      setTimeout(() => setUploadProgress(null), 1000)
    },
    onError: (error: any) => {
      notifications.show({
        title: 'Upload failed',
        message: error.message || 'Failed to upload attachment',
        color: 'red',
      })
      setUploadProgress(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (attachmentId: number) => deleteAttachmentApi(attachmentId),
    onSuccess: () => {
      notifications.show({
        title: 'File deleted',
        message: 'Attachment deleted successfully',
        color: 'green',
      })
      queryClient.invalidateQueries({ queryKey: ['ticket', ticket.id] })
    },
    onError: (error: any) => {
      notifications.show({
        title: 'Delete failed',
        message: error.message || 'Failed to delete attachment',
        color: 'red',
      })
    },
  })

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file size (10MB max)
      const maxSize = 10 * 1024 * 1024
      if (file.size > maxSize) {
        notifications.show({
          title: 'File too large',
          message: `File size exceeds 10MB limit (${(file.size / (1024 * 1024)).toFixed(1)}MB)`,
          color: 'red',
        })
        return
      }
      uploadMutation.mutate(file)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  return (
    <Stack gap="md">
      <Group justify="space-between" align="center">
        <Group gap="xs">
          <Icon icon="solar:file-pdf-bold-duotone" width={20} />
          <Text size="lg" fw={700}>
            Attachments ({ticket.attachments?.length || 0})
          </Text>
        </Group>
      </Group>

      {/* Upload Section */}
      <Paper p="md" radius="md" withBorder style={{ borderStyle: 'dashed' }}>
        <Stack gap="sm" align="center">
          {uploadProgress !== null ? (
            <>
              <Icon icon="solar:upload-cloud-bold-duotone" width={40} color="blue" />
              <div style={{ width: '100%', textAlign: 'center' }}>
                <Text fw={500} size="sm">
                  Uploading... {Math.round(uploadProgress)}%
                </Text>
                <Progress
                  value={uploadProgress}
                  color={uploadProgress === 100 ? 'green' : 'blue'}
                  size="lg"
                  style={{ marginTop: '10px' }}
                />
              </div>
            </>
          ) : (
            <>
              <Icon icon="solar:upload-cloud-bold-duotone" width={40} color="blue" />
              <div style={{ textAlign: 'center' }}>
                <Text fw={500} size="sm">
                  Click to upload or drag and drop
                </Text>
                <Text size="xs" c="dimmed">
                  Maximum file size: 10MB
                </Text>
              </div>
              <Button
                onClick={() => fileInputRef.current?.click()}
                loading={uploadMutation.isPending}
                disabled={uploadMutation.isPending}
              >
                Select File
              </Button>
            </>
          )}
          <input
            ref={fileInputRef}
            type="file"
            hidden
            onChange={handleFileSelect}
            disabled={uploadMutation.isPending || uploadProgress !== null}
          />
        </Stack>
      </Paper>

      {/* Files List */}
      {ticket.attachments && ticket.attachments.length > 0 ? (
        <Stack gap="xs">
          {ticket.attachments.map((attachment: any) => (
            <Paper key={attachment.id} p="md" radius="md" withBorder>
              <Group justify="space-between" align="center">
                <Group gap="xs">
                  <Icon icon="solar:file-bold-duotone" width={24} color="blue" />
                  <Stack gap={0}>
                    <Text fw={500} size="sm">
                      {attachment.filename}
                    </Text>
                    <Group gap="xs">
                      <Text size="xs" c="dimmed">
                        {formatFileSize(attachment.file_size)}
                      </Text>
                      <Text size="xs" c="dimmed">
                        •
                      </Text>
                      <Text size="xs" c="dimmed">
                        {new Date(attachment.uploaded_at).toLocaleString()}
                      </Text>
                      <Text size="xs" c="dimmed">
                        •
                      </Text>
                      <Text size="xs" c="dimmed">
                        by {attachment.uploaded_by_username}
                      </Text>
                    </Group>
                  </Stack>
                </Group>
                <Group gap="xs">
                  <ActionIcon
                    color="blue"
                    variant="subtle"
                    onClick={async () => {
                      setSelectedAttachment(attachment)
                      setPreviewLoading(true)
                      try {
                        const blob = await downloadAttachmentBlob(attachment.id)
                        const url = URL.createObjectURL(blob)
                        setPreviewUrl(url)
                      } catch (error) {
                        notifications.show({
                          title: 'Preview failed',
                          message: 'Could not load file preview',
                          color: 'red',
                        })
                      } finally {
                        setPreviewLoading(false)
                        setPreviewOpen(true)
                      }
                    }}
                    title="Preview file"
                  >
                    <Icon icon="solar:eye-bold-duotone" width={18} />
                  </ActionIcon>
                  <ActionIcon
                    color="red"
                    variant="subtle"
                    onClick={() => {
                      if (confirm(`Delete "${attachment.filename}"?`)) {
                        deleteMutation.mutate(attachment.id)
                      }
                    }}
                    loading={deleteMutation.isPending}
                    disabled={deleteMutation.isPending}
                    title="Delete attachment"
                  >
                    <Icon icon="solar:trash-bin-minimalistic-bold-duotone" width={18} />
                  </ActionIcon>
                </Group>
              </Group>
            </Paper>
          ))}
        </Stack>
      ) : (
        <Text c="dimmed" size="sm" style={{ textAlign: 'center' }}>
          No attachments yet. Upload a file to get started.
        </Text>
      )}

      {/* Preview Modal */}
      {selectedAttachment && (
        <Modal
          opened={previewOpen}
          onClose={() => {
            setPreviewOpen(false)
            // Clean up object URL
            if (previewUrl) {
              URL.revokeObjectURL(previewUrl)
              setPreviewUrl(null)
            }
            setSelectedAttachment(null)
          }}
          title={selectedAttachment.filename}
          size="lg"
          centered
        >
          {previewLoading ? (
            <Center py="xl">
              <Loader />
            </Center>
          ) : ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(
              selectedAttachment.filename.split('.').pop()?.toLowerCase() || ''
            ) ? (
            <Stack align="center" gap="md">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt={selectedAttachment.filename}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '500px',
                    borderRadius: '8px',
                    objectFit: 'contain',
                  }}
                />
              ) : (
                <Text c="red">Failed to load image</Text>
              )}
              <Group>
                <Button
                  onClick={() => {
                    if (previewUrl) {
                      const link = document.createElement('a')
                      link.href = previewUrl
                      link.download = selectedAttachment.filename
                      document.body.appendChild(link)
                      link.click()
                      document.body.removeChild(link)
                    }
                  }}
                  leftSection={<Icon icon="solar:download-bold-duotone" width={18} />}
                >
                  Download
                </Button>
              </Group>
            </Stack>
          ) : ['pdf', 'txt', 'doc', 'docx', 'xls', 'xlsx'].includes(
              selectedAttachment.filename.split('.').pop()?.toLowerCase() || ''
            ) ? (
            // Document Files
            <Stack gap="md">
              <Card withBorder p="md" radius="md" bg="gray.0">
                <Stack gap="sm">
                  <Group gap="xs">
                    <Icon icon="solar:file-document-bold-duotone" width={40} color="blue" />
                    <Stack gap={0}>
                      <Text fw={500}>{selectedAttachment.filename}</Text>
                      <Text size="sm" c="dimmed">
                        {formatFileSize(selectedAttachment.file_size)}
                      </Text>
                    </Stack>
                  </Group>
                  <Text size="sm" c="dimmed">
                    Uploaded: {new Date(selectedAttachment.uploaded_at).toLocaleString()}
                  </Text>
                  <Text size="sm" c="dimmed">
                    By: {selectedAttachment.uploaded_by_username}
                  </Text>
                </Stack>
              </Card>
              <Group>
                <Button
                  onClick={() => {
                    if (previewUrl) {
                      const link = document.createElement('a')
                      link.href = previewUrl
                      link.download = selectedAttachment.filename
                      document.body.appendChild(link)
                      link.click()
                      document.body.removeChild(link)
                    }
                  }}
                  leftSection={<Icon icon="solar:download-bold-duotone" width={18} />}
                >
                  Download File
                </Button>
              </Group>
            </Stack>
          ) : (
            // Other Files
            <Stack gap="md">
              <Card withBorder p="md" radius="md" bg="gray.0">
                <Stack gap="sm">
                  <Group gap="xs">
                    <Icon icon="solar:file-bold-duotone" width={40} color="orange" />
                    <Stack gap={0}>
                      <Text fw={500}>{selectedAttachment.filename}</Text>
                      <Text size="sm" c="dimmed">
                        {formatFileSize(selectedAttachment.file_size)}
                      </Text>
                    </Stack>
                  </Group>
                  <Text size="sm" c="dimmed">
                    Uploaded: {new Date(selectedAttachment.uploaded_at).toLocaleString()}
                  </Text>
                  <Text size="sm" c="dimmed">
                    By: {selectedAttachment.uploaded_by_username}
                  </Text>
                </Stack>
              </Card>
              <Group>
                <Button
                  onClick={() => {
                    if (previewUrl) {
                      const link = document.createElement('a')
                      link.href = previewUrl
                      link.download = selectedAttachment.filename
                      document.body.appendChild(link)
                      link.click()
                      document.body.removeChild(link)
                    }
                  }}
                  leftSection={<Icon icon="solar:download-bold-duotone" width={18} />}
                >
                  Download File
                </Button>
              </Group>
            </Stack>
          )}
        </Modal>
      )}
    </Stack>
  )
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
  const [editPriority, setEditPriority] = useState<string | null>(null)
  const [editCategoryId, setEditCategoryId] = useState<string | null>(null)
  const [editTagIds, setEditTagIds] = useState<string[]>([])

  // Track original values to detect changes
  const [originalCategoryId, setOriginalCategoryId] = useState<string | null>(null)
  const [originalTagIds, setOriginalTagIds] = useState<string[]>([])

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

  // Fetch categories for dropdown
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategoriesApi,
    enabled: user?.role === 'MANAGER',
  })

  // Fetch tags for dropdown
  const { data: tags = [] } = useQuery({
    queryKey: ['tags'],
    queryFn: fetchTagsApi,
    enabled: user?.role === 'MANAGER',
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
    staleTime: 0, // Keep comments always stale to ensure fresh data
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
      queryClient.invalidateQueries({ queryKey: ['tickets'], exact: false })
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
    mutationFn: () => {
      const updateData: any = {
        title: editTitle,
        description: editDescription,
      }

      // Only include priority if it's set
      if (editPriority) {
        updateData.priority = editPriority
      }

      // Send category_id if it changed (including clearing it)
      if (editCategoryId !== originalCategoryId) {
        updateData.category_id = editCategoryId ? parseInt(editCategoryId) : null
      }

      // Send tag_ids if they changed (check actual array contents, not stringified)
      const tagsChanged = editTagIds.length !== originalTagIds.length ||
                         editTagIds.some((id, i) => id !== originalTagIds[i])
      if (tagsChanged) {
        updateData.tag_ids = editTagIds.map((id) => parseInt(id))
      }

      console.log('[UpdateMutation] Sending data:', updateData)
      console.log('[UpdateMutation] Original category:', originalCategoryId, 'New category:', editCategoryId)
      console.log('[UpdateMutation] Original tags:', originalTagIds, 'New tags:', editTagIds)

      return updateTicketApi(ticketIdNum, updateData)
    },
    onSuccess: (updatedTicket) => {
      notifications.show({
        title: 'Updated',
        message: 'Ticket has been updated successfully',
        color: 'green',
      })
      console.log('[UpdateMutation] Success, updated ticket:', updatedTicket)
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketIdNum] })
      queryClient.invalidateQueries({ queryKey: ['tickets'], exact: false })
      setEditModalOpen(false)
    },
    onError: (error: any) => {
      console.error('[UpdateMutation] Error:', error)
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
                    setEditPriority(ticket.priority)
                    const catId = ticket.category?.id ? String(ticket.category.id) : null
                    const tagIds = ticket.tags?.map((t: any) => String(t.id)) || []
                    setEditCategoryId(catId)
                    setEditTagIds(tagIds)
                    // Store originals for change detection
                    setOriginalCategoryId(catId)
                    setOriginalTagIds(tagIds)
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
                        {ticket.category ? (
                          <Group gap="xs">
                            <div
                              style={{
                                width: 12,
                                height: 12,
                                borderRadius: '50%',
                                backgroundColor: ticket.category.color || '#999',
                              }}
                            />
                            <Text fw={600}>{ticket.category.name}</Text>
                          </Group>
                        ) : (
                          <Text fw={600} c="dimmed">
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
                          <Badge color={sentimentColors[ticket.sentiment || 'Neutral']}>
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

                  {/* Tags */}
                  {ticket.tags && ticket.tags.length > 0 && (
                    <Card withBorder p="md" radius="md">
                      <Stack gap="xs">
                        <Group justify="space-between">
                          <Text size="sm" fw={500} c="dimmed">
                            Tags
                          </Text>
                          <Icon icon="solar:tag-linear" width={16} />
                        </Group>
                        <Group gap="xs">
                          {ticket.tags.map((tag) => (
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
                  )}

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
                    {ticket?.available_transitions?.length ? (
                      <Group>
                        <Select
                          placeholder="Select new status"
                          data={ticket.available_transitions.map((t: any) => ({
                            value: t.status,
                            label: t.label,
                          }))}
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
                    ) : (
                      <Group>
                        <Text size="sm" c="dimmed" fw={500}>
                          ⚠️  Status transitions data not available
                        </Text>
                        {/* Debug info */}
                        {ticket && (
                          <Text size="xs" c="gray">
                            (Status: {ticket.status}, Transitions: {JSON.stringify(ticket.available_transitions)})
                          </Text>
                        )}
                      </Group>
                    )}
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

                {/* Attachments Section */}
                <AttachmentsSection ticket={ticket} queryClient={queryClient} />
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
        size="lg"
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
          <Select
            label="Priority"
            placeholder="Select priority"
            data={[
              { value: 'LOW', label: 'Low' },
              { value: 'MEDIUM', label: 'Medium' },
              { value: 'HIGH', label: 'High' },
              { value: 'URGENT', label: 'Urgent' },
            ]}
            value={editPriority}
            onChange={setEditPriority}
            clearable
          />
          <Select
            label="Category"
            placeholder="Select category"
            data={categories.map((cat) => ({ value: String(cat.id), label: cat.name }))}
            value={editCategoryId}
            onChange={setEditCategoryId}
            clearable
          />
          <MultiSelect
            label="Tags"
            placeholder="Select tags"
            data={tags.map((tag) => ({ value: String(tag.id), label: tag.name }))}
            value={editTagIds}
            onChange={setEditTagIds}
            clearable
            searchable
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
        />
      </Modal>
    </Container>
  )
}
