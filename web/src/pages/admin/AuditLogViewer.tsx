import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Container,
  Stack,
  Group,
  Text,
  Paper,
  Table,
  Badge,
  TextInput,
  Select,
  Button,
  Center,
  Loader,
  ActionIcon,
  Tooltip,
  Grid,
  Modal,
  Textarea,
} from '@mantine/core'
import { Icon } from '@iconify-icon/react'
import { useRealtimeData } from '@/hooks/useRealtimeData'
import { listAuditLogs, type AuditLog } from '@/api/admin.api'

// ============================================
// Types
// ============================================

const ACTION_TYPE_LABELS: Record<string, string> = {
  TICKET_CREATED: 'Ticket Created',
  TICKET_UPDATED: 'Ticket Updated',
  TICKET_ASSIGNED: 'Ticket Assigned',
  STATUS_CHANGED: 'Status Changed',
  COMMENT_ADDED: 'Comment Added',
  ATTACHMENT_ADDED: 'Attachment Added',
  ATTACHMENT_DELETED: 'Attachment Deleted',
  USER_CREATED: 'User Created',
  USER_UPDATED: 'User Updated',
  USER_ROLE_CHANGED: 'Role Changed',
  OTHER: 'Other',
}

const ACTION_TYPE_COLORS: Record<string, string> = {
  TICKET_CREATED: 'blue',
  TICKET_UPDATED: 'cyan',
  TICKET_ASSIGNED: 'purple',
  STATUS_CHANGED: 'violet',
  COMMENT_ADDED: 'indigo',
  ATTACHMENT_ADDED: 'teal',
  ATTACHMENT_DELETED: 'red',
  USER_CREATED: 'green',
  USER_UPDATED: 'yellow',
  USER_ROLE_CHANGED: 'orange',
  OTHER: 'gray',
}

// ============================================
// Component
// ============================================

export default function AuditLogViewer() {
  const [filters, setFilters] = useState({
    ticketId: '',
    actionType: '',
  })
  const [page, setPage] = useState(0)
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)
  const [modalOpened, setModalOpened] = useState(false)

  const pageSize = 50

  // Enable real-time updates via WebSocket
  useRealtimeData()

  // Fetch audit logs with auto-refetch and polling
  const {
    data: logs = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['audit-logs', filters, page],
    queryFn: () =>
      listAuditLogs(
        filters.ticketId ? parseInt(filters.ticketId) : undefined,
        filters.actionType || undefined,
        pageSize,
        page * pageSize
      ),
    refetchInterval: 3000, // Poll every 3 seconds as fallback
  })

console.log(logs,isLoading,error);

  // Handlers
  const handleViewDetails = (log: AuditLog) => {
    setSelectedLog(log)
    setModalOpened(true)
  }

  const handleReset = () => {
    setFilters({ ticketId: '', actionType: '' })
    setPage(0)
  }

  // Render
  if (isLoading && page === 0) {
    return (
      <Container size="lg" py="lg">
        <Center>
          <Loader />
        </Center>
      </Container>
    )
  }

  return (
    <Container size="lg" py="lg">
      <Stack gap="lg">
        {/* Header */}
        <div>
          <Text size="lg" fw={500}>
            Audit Log
          </Text>
          <Text size="sm" c="dimmed">
            Track all system activities and changes
          </Text>
        </div>

        {/* Filters */}
        <Paper withBorder p="md" radius="md">
          <Stack gap="md">
            <Text size="sm" fw={500}>
              Filters
            </Text>
            <Grid>
              <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                <TextInput
                  label="Ticket ID"
                  placeholder="Filter by ticket ID"
                  value={filters.ticketId}
                  onChange={(e) =>
                    setFilters({ ...filters, ticketId: e.currentTarget.value })
                  }
                  type="number"
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                <Select
                  label="Action Type"
                  placeholder="Filter by action"
                  clearable
                  searchable
                  data={Object.entries(ACTION_TYPE_LABELS).map(([value, label]) => ({
                    value,
                    label,
                  }))}
                  value={filters.actionType}
                  onChange={(value) =>
                    setFilters({ ...filters, actionType: value || '' })
                  }
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 12, md: 6 }}>
                <Group justify="flex-end" align="flex-end" h="100%">
                  <Button
                    variant="light"
                    onClick={handleReset}
                    leftSection={<Icon icon="mdi:refresh" />}
                  >
                    Reset
                  </Button>
                </Group>
              </Grid.Col>
            </Grid>
          </Stack>
        </Paper>

        {/* Error Alert */}
        {error && (
          <Paper p="md" bg="red.0" c="red.9" radius="md">
            <Group justify="space-between">
              <Text>Error loading audit logs. Please try again.</Text>
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

        {/* Audit Logs Table */}
        <Paper withBorder radius="md" style={{ overflow: 'hidden' }}>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Timestamp</Table.Th>
                <Table.Th>Action</Table.Th>
                <Table.Th>Performed By</Table.Th>
                <Table.Th>Ticket ID</Table.Th>
                <Table.Th>User ID</Table.Th>
                <Table.Th align="center">Details</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {logs.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={6}>
                    <Center py="lg">
                      <Text c="dimmed">No audit logs found</Text>
                    </Center>
                  </Table.Td>
                </Table.Tr>
              ) : (
                logs.map((log) => (
                  <Table.Tr key={log.id}>
                    <Table.Td>
                      <Text size="sm">
                        {new Date(log.created_at).toLocaleString()}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge color={ACTION_TYPE_COLORS[log.action_type]}>
                        {ACTION_TYPE_LABELS[log.action_type] || log.action_type}
                      </Badge>
                    </Table.Td>
                    <Table.Td>{log.performed_by_username}</Table.Td>
                    <Table.Td>{log.ticket_id || '-'}</Table.Td>
                    <Table.Td>{log.user_id || '-'}</Table.Td>
                    <Table.Td>
                      <Tooltip label="View Details">
                        <ActionIcon
                          variant="subtle"
                          color="blue"
                          onClick={() => handleViewDetails(log)}
                        >
                          <Icon icon="mdi:information-outline" width={18} />
                        </ActionIcon>
                      </Tooltip>
                    </Table.Td>
                  </Table.Tr>
                ))
              )}
            </Table.Tbody>
          </Table>
        </Paper>

        {/* Pagination */}
        {logs.length > 0 && (
          <Group justify="center">
            <Button
              variant="light"
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              leftSection={<Icon icon="mdi:chevron-left" />}
            >
              Previous
            </Button>
            <Text size="sm" c="dimmed">
              Page {page + 1}
            </Text>
            <Button
              variant="light"
              onClick={() => setPage(page + 1)}
              disabled={logs.length < pageSize}
              rightSection={<Icon icon="mdi:chevron-right" />}
            >
              Next
            </Button>
          </Group>
        )}
      </Stack>

      {/* Details Modal */}
      {selectedLog && (
        <Modal
          opened={modalOpened}
          onClose={() => {
            setModalOpened(false)
            setSelectedLog(null)
          }}
          title="Audit Log Details"
          size="md"
        >
          <Stack gap="md">
            <Group justify="space-between">
              <Text fw={500}>Action Type:</Text>
              <Badge color={ACTION_TYPE_COLORS[selectedLog.action_type]}>
                {ACTION_TYPE_LABELS[selectedLog.action_type] || selectedLog.action_type}
              </Badge>
            </Group>

            <Group justify="space-between">
              <Text fw={500}>Timestamp:</Text>
              <Text>{new Date(selectedLog.created_at).toLocaleString()}</Text>
            </Group>

            <Group justify="space-between">
              <Text fw={500}>Performed By:</Text>
              <Text>{selectedLog.performed_by_username}</Text>
            </Group>

            {selectedLog.ticket_id && (
              <Group justify="space-between">
                <Text fw={500}>Ticket ID:</Text>
                <Text>{selectedLog.ticket_id}</Text>
              </Group>
            )}

            {selectedLog.user_id && (
              <Group justify="space-between">
                <Text fw={500}>User ID:</Text>
                <Text>{selectedLog.user_id}</Text>
              </Group>
            )}

            {selectedLog.ip_address && (
              <Group justify="space-between">
                <Text fw={500}>IP Address:</Text>
                <Text>{selectedLog.ip_address}</Text>
              </Group>
            )}

            {selectedLog.description && (
              <Stack gap="xs">
                <Text fw={500}>Description:</Text>
                <Paper p="sm" bg="gray.0" radius="md">
                  <Text size="sm">{selectedLog.description}</Text>
                </Paper>
              </Stack>
            )}

            {selectedLog.old_value && (
              <Stack gap="xs">
                <Text fw={500}>Previous Value:</Text>
                <Paper p="sm" bg="gray.0" radius="md">
                  <Text size="sm" style={{ wordBreak: 'break-all' }}>
                    {selectedLog.old_value}
                  </Text>
                </Paper>
              </Stack>
            )}

            {selectedLog.new_value && (
              <Stack gap="xs">
                <Text fw={500}>New Value:</Text>
                <Paper p="sm" bg="gray.0" radius="md">
                  <Text size="sm" style={{ wordBreak: 'break-all' }}>
                    {selectedLog.new_value}
                  </Text>
                </Paper>
              </Stack>
            )}

            {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
              <Stack gap="xs">
                <Text fw={500}>Metadata:</Text>
                <Paper p="sm" bg="gray.0" radius="md">
                  <Textarea
                    value={JSON.stringify(selectedLog.metadata, null, 2)}
                    readOnly
                    minRows={4}
                    maxRows={8}
                    styles={{
                      input: {
                        fontFamily: 'monospace',
                        fontSize: '12px',
                      },
                    }}
                  />
                </Paper>
              </Stack>
            )}
          </Stack>
        </Modal>
      )}
    </Container>
  )
}
