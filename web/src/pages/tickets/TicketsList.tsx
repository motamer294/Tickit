import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  Table,
  Button,
  Group,
  Badge,
  ActionIcon,
  Container,
  Stack,
  Text,
  TextInput,
  Select,
  Loader,
  Center,
} from '@mantine/core'
import { Icon } from '@iconify-icon/react'
import { useAuth } from '@/hooks/useAuth'
import { fetchTickets } from '@/api/tickets.api'
import type { Ticket, TicketStatus } from '@/types/ticket'
import { useState } from 'react'

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

export default function TicketsList() {
  const navigate = useNavigate()
  const { accessToken } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<TicketStatus | null>(null)

  const {
    data: tickets,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['tickets', accessToken],
    queryFn: () => fetchTickets(),
    enabled: !!accessToken,
  })

  // Filter tickets based on search and status
  const filteredTickets = (tickets || []).filter((ticket: Ticket) => {
    const matchesSearch =
      ticket.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = !statusFilter || ticket.status === statusFilter
    return matchesSearch && matchesStatus
  })

  if (isLoading) {
    return (
      <Center h={300}>
        <Loader />
      </Center>
    )
  }

  if (error) {
    return (
      <Container py="lg">
        <Text c="red">Error loading tickets: {error.message}</Text>
      </Container>
    )
  }

  return (
    <Container size="xl" py="lg">
      <Stack gap="md">
        {/* Header with Create Button */}
        <Group justify="space-between" align="center">
          <Text size="xl" fw={700}>
            Tickets
          </Text>
          <Button
            leftSection={<Icon icon="solar:add-circle-bold-duotone" />}
            onClick={() => navigate('create')}
          >
            Create Ticket
          </Button>
        </Group>

        {/* Filters */}
        <Group grow>
          <TextInput
            placeholder="Search by title or description..."
            leftSection={<Icon icon="solar:magnifer-linear" />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.currentTarget.value)}
          />
          <Select
            placeholder="Filter by status"
            data={[
              { value: 'OPEN', label: 'Open' },
              { value: 'IN_PROGRESS', label: 'In Progress' },
              { value: 'RESOLVED', label: 'Resolved' },
              { value: 'CLOSED', label: 'Closed' },
            ]}
            clearable
            searchable
            value={statusFilter}
            onChange={(value) => setStatusFilter(value as TicketStatus | null)}
          />
        </Group>

        {/* Tickets Table */}
        <div style={{ overflowX: 'auto' }}>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>ID</Table.Th>
                <Table.Th>Title</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Created By</Table.Th>
                <Table.Th>Assigned To</Table.Th>
                <Table.Th>Created At</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {filteredTickets.length > 0 ? (
                filteredTickets.map((ticket: Ticket) => (
                  <Table.Tr key={ticket.id}>
                    <Table.Td>#{ticket.id}</Table.Td>
                    <Table.Td fw={500}>{ticket.title}</Table.Td>
                    <Table.Td>
                      <Badge
                        color={statusColors[ticket.status]}
                        variant="light"
                      >
                        {statusLabels[ticket.status]}
                      </Badge>
                    </Table.Td>
                    <Table.Td>{ticket.creator_username || 'Unknown'}</Table.Td>
                    <Table.Td>
                      {ticket.assigned_to_username === 'Unassigned' ? (
                        <Text c="dimmed" size="sm">
                          Unassigned
                        </Text>
                      ) : (
                        ticket.assigned_to_username
                      )}
                    </Table.Td>
                    <Table.Td>
                      {new Date(ticket.created_at).toLocaleDateString()}
                    </Table.Td>
                    <Table.Td>
                      <ActionIcon
                        variant="subtle"
                        color="blue"
                        onClick={() => navigate(`${ticket.id}`)}
                      >
                        <Icon icon="solar:eye-bold-duotone" />
                      </ActionIcon>
                    </Table.Td>
                  </Table.Tr>
                ))
              ) : (
                <Table.Tr>
                  <Table.Td colSpan={7} ta="center" py="xl">
                    <Text c="dimmed">No tickets found</Text>
                  </Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        </div>

        {/* Stats */}
        <Group justify="flex-end">
          <Text size="sm" c="dimmed">
            Showing {filteredTickets.length} of {tickets?.length || 0} tickets
          </Text>
        </Group>
      </Stack>
    </Container>
  )
}
