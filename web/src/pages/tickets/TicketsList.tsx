import { useState } from 'react'
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
  Loader,
  Center,
} from '@mantine/core'
import { Icon } from '@iconify-icon/react'
import { useAuth } from '@/hooks/useAuth'
import { fetchTickets, searchTicketsApi, fetchCategoriesApi, fetchTagsApi, fetchEmployeesApi } from '@/api/tickets.api'
import type { SearchFilters } from '@/api/tickets.api'
import { SearchBar } from '@/components/SearchBar'
import type { Ticket, TicketStatus } from '@/types/ticket'

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

export default function TicketsList() {
  const navigate = useNavigate()
  const { accessToken } = useAuth()
  const [searchResults, setSearchResults] = useState<Ticket[] | null>(null)
  const [isSearching, setIsSearching] = useState(false)

  // Fetch tickets
  const {
    data: allTickets,
    isLoading: ticketsLoading,
    error,
  } = useQuery({
    queryKey: ['tickets'],
    queryFn: () => fetchTickets(),
    enabled: !!accessToken,
  })

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => fetchCategoriesApi(),
  })

  // Fetch tags
  const { data: tags = [] } = useQuery({
    queryKey: ['tags'],
    queryFn: () => fetchTagsApi(),
  })

  // Fetch employees
  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => fetchEmployeesApi(),
  })

  // Handle search
  const handleSearch = async (filters: SearchFilters) => {
    setIsSearching(true)
    try {
      const results = await searchTicketsApi(filters)
      setSearchResults(results)
    } finally {
      setIsSearching(false)
    }
  }

  // Determine which tickets to display
  const displayTickets = searchResults !== null ? searchResults : (allTickets || [])
  const isLoading = ticketsLoading || isSearching

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

        {/* Search & Filters */}
        <SearchBar
          onSearch={handleSearch}
          employees={employees}
          categories={categories}
          tags={tags}
          isLoading={isLoading}
        />

        {/* Tickets Table */}
        {isLoading ? (
          <Center py={60}>
            <Loader />
          </Center>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>ID</Table.Th>
                    <Table.Th>Title</Table.Th>
                    <Table.Th>Status</Table.Th>
                    <Table.Th>Priority</Table.Th>
                    <Table.Th>Category</Table.Th>
                    <Table.Th>Created By</Table.Th>
                    <Table.Th>Assigned To</Table.Th>
                    <Table.Th>Created At</Table.Th>
                    <Table.Th>Actions</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {displayTickets.length > 0 ? (
                    displayTickets.map((ticket: Ticket) => (
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
                        <Table.Td>
                          <Badge size="sm" variant="dot">
                            {ticket.priority || 'N/A'}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          {ticket.category ? (
                            <Badge size="sm" style={{ backgroundColor: ticket.category.color }}>
                              {ticket.category.name}
                            </Badge>
                          ) : (
                            <Text c="dimmed" size="sm">
                              —
                            </Text>
                          )}
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
                      <Table.Td colSpan={9} ta="center" py="xl">
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
                Showing {displayTickets.length} of {allTickets?.length || 0} tickets
                {searchResults !== null && ' (filtered)'}
              </Text>
            </Group>
          </>
        )}
      </Stack>
    </Container>
  )
}
