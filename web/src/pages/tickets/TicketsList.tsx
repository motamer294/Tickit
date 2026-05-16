import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  Container,
  Stack,
  Group,
  Text,
  Paper,
  Loader,
  Center,
  Box,
  Button,
  ActionIcon,
  TextInput,
  Collapse,
  Divider,
  Tooltip,
} from '@mantine/core'
import { Icon } from '@iconify-icon/react'
import { useAuth } from '@/hooks/useAuth'
import {
  fetchTickets,
  searchTicketsApi,
  fetchCategoriesApi,
  fetchTagsApi,
  fetchEmployeesApi,
} from '@/api/tickets.api'
import type { SearchFilters } from '@/api/tickets.api'
import { SearchBar } from '@/components/SearchBar'
import type { Ticket, TicketStatus } from '@/types/ticket'

// ─── Brand palette (matches Dashboard) ────────────────────────────────────────

const BRAND = {
  purple:      '#7F77DD',
  purpleDark:  '#534AB7',
  purpleLight: '#EEEDFE',
  red:         '#E24B4A',
  redLight:    '#FCEBEB',
  redText:     '#791F1F',
  amber:       '#EF9F27',
  amberLight:  '#FAEEDA',
  amberText:   '#633806',
  green:       '#639922',
  greenLight:  '#EAF3DE',
  greenText:   '#27500A',
  gray:        '#B4B2A9',
  grayLight:   '#F1EFE8',
  grayText:    '#444441',
  blue:        '#378ADD',
  blueLight:   '#E6F1FB',
  blueText:    '#0C447C',
}

// ─── Status / Priority metadata ────────────────────────────────────────────────

const STATUS_META: Record<TicketStatus, { label: string; dot: string; bg: string; text: string }> = {
  OPEN:        { label: 'Open',        dot: BRAND.red,   bg: BRAND.redLight,   text: BRAND.redText   },
  PENDING:     { label: 'Pending',     dot: BRAND.blue,  bg: BRAND.blueLight,  text: BRAND.blueText  },
  IN_PROGRESS: { label: 'In Progress', dot: BRAND.amber, bg: BRAND.amberLight, text: BRAND.amberText },
  RESOLVED:    { label: 'Resolved',    dot: BRAND.green, bg: BRAND.greenLight, text: BRAND.greenText },
  CLOSED:      { label: 'Closed',      dot: BRAND.gray,  bg: BRAND.grayLight,  text: BRAND.grayText  },
}

const PRIORITY_META: Record<string, { bg: string; text: string; dot: string }> = {
  HIGH:   { bg: BRAND.redLight,   text: BRAND.redText,   dot: BRAND.red   },
  MEDIUM: { bg: BRAND.amberLight, text: BRAND.amberText, dot: BRAND.amber },
  LOW:    { bg: BRAND.greenLight, text: BRAND.greenText, dot: BRAND.green },
}

const ALL_STATUSES: TicketStatus[] = ['OPEN', 'PENDING', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']

// ─── Sub-components ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: TicketStatus }) {
  const m = STATUS_META[status]
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        fontSize: 11,
        fontWeight: 500,
        padding: '3px 9px',
        borderRadius: 20,
        background: m.bg,
        color: m.text,
        whiteSpace: 'nowrap',
      }}
    >
      <span
        style={{
          width: 5, height: 5, borderRadius: '50%',
          background: m.dot, flexShrink: 0, display: 'inline-block',
        }}
      />
      {m.label}
    </span>
  )
}

function PriorityBadge({ priority }: { priority: string }) {
  const m = PRIORITY_META[priority] ?? { bg: BRAND.grayLight, text: BRAND.grayText, dot: BRAND.gray }
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        fontSize: 11,
        fontWeight: 500,
        padding: '3px 9px',
        borderRadius: 20,
        background: m.bg,
        color: m.text,
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: m.dot, flexShrink: 0, display: 'inline-block' }} />
      {priority.charAt(0) + priority.slice(1).toLowerCase()}
    </span>
  )
}

// Quick-filter status pill button
function StatusPill({
  status,
  active,
  count,
  onClick,
}: {
  status: TicketStatus | 'ALL'
  active: boolean
  count: number
  onClick: () => void
}) {
  const isAll = status === 'ALL'
  const m = isAll ? null : STATUS_META[status as TicketStatus]

  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 12,
        fontWeight: 500,
        padding: '5px 12px',
        borderRadius: 20,
        border: active
          ? `1.5px solid ${isAll ? BRAND.purple : m!.dot}`
          : '1.5px solid var(--mantine-color-default-border)',
        background: active
          ? isAll ? BRAND.purpleLight : m!.bg
          : 'transparent',
        color: active
          ? isAll ? BRAND.purpleDark : m!.text
          : 'var(--mantine-color-dimmed)',
        cursor: 'pointer',
        transition: 'all .15s',
      }}
    >
      {!isAll && (
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: active ? m!.dot : 'currentColor', opacity: active ? 1 : 0.4, flexShrink: 0 }} />
      )}
      {isAll ? 'All' : m!.label}
      <span
        style={{
          fontSize: 10,
          fontWeight: 600,
          padding: '1px 5px',
          borderRadius: 10,
          background: active ? 'rgba(0,0,0,0.08)' : 'var(--mantine-color-default-hover)',
          color: 'inherit',
        }}
      >
        {count}
      </span>
    </button>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function TicketsList() {
  const navigate = useNavigate()
  const { accessToken } = useAuth()

  const [searchResults, setSearchResults] = useState<Ticket[] | null>(null)
  const [isSearching, setIsSearching]     = useState(false)
  const [activeStatus, setActiveStatus]   = useState<TicketStatus | 'ALL'>('ALL')
  const [searchQuery, setSearchQuery]     = useState('')
  const [filtersOpen, setFiltersOpen]     = useState(false)

  // ── Queries ──
  const { data: allTickets = [], isLoading: ticketsLoading, error } = useQuery({
    queryKey: ['tickets'],
    queryFn: () => fetchTickets(),
    enabled: !!accessToken,
  })

  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: fetchCategoriesApi })
  const { data: tags = [] }       = useQuery({ queryKey: ['tags'],       queryFn: fetchTagsApi       })
  const { data: employees = [] }  = useQuery({ queryKey: ['employees'],  queryFn: fetchEmployeesApi  })

  // ── Search handler ──
  const handleSearch = async (filters: SearchFilters) => {
    setIsSearching(true)
    try {
      const results = await searchTicketsApi(filters)
      setSearchResults(results)
    } finally {
      setIsSearching(false)
    }
  }

  // ── Derived data ──
  const baseTickets = searchResults !== null ? searchResults : allTickets

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: allTickets.length }
    ALL_STATUSES.forEach((s) => {
      counts[s] = allTickets.filter((t: Ticket) => t.status === s).length
    })
    return counts
  }, [allTickets])

  const displayTickets = useMemo(() => {
    let list = baseTickets
    if (activeStatus !== 'ALL') list = list.filter((t: Ticket) => t.status === activeStatus)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(
        (t: Ticket) =>
          t.title.toLowerCase().includes(q) ||
          String(t.id).includes(q) ||
          t.creator_username?.toLowerCase().includes(q) ||
          t.assigned_to_username?.toLowerCase().includes(q),
      )
    }
    return list
  }, [baseTickets, activeStatus, searchQuery])

  const isLoading = ticketsLoading || isSearching

  // ── Error ──
  if (error) {
    return (
      <Container py="lg">
        <Text c="red">Error loading tickets: {(error as Error).message}</Text>
      </Container>
    )
  }

  const TH_STYLE: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 500,
    color: 'var(--mantine-color-dimmed)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    paddingBottom: 10,
    whiteSpace: 'nowrap',
  }

  return (
    <Container size="xl" py="lg">
      <Stack gap="lg">

        {/* ── Header ── */}
        <Group justify="space-between" align="flex-end">
          <Box>
            <Text fw={500} style={{ fontSize: 22, lineHeight: 1.2 }}>Tickets</Text>
            <Text size="sm" c="dimmed" mt={2}>
              {allTickets.length} total · {statusCounts['OPEN'] ?? 0} open
            </Text>
          </Box>
          <Button
            size="sm"
            leftSection={<Icon icon="solar:add-circle-bold-duotone" width={15} />}
            style={{ background: BRAND.purpleDark, border: 'none' }}
            onClick={() => navigate('create')}
          >
            Create ticket
          </Button>
        </Group>

        {/* ── Status quick-filter pills ── */}
        <Group gap={6} wrap="wrap">
          <StatusPill
            status="ALL"
            active={activeStatus === 'ALL'}
            count={statusCounts['ALL'] ?? 0}
            onClick={() => setActiveStatus('ALL')}
          />
          {ALL_STATUSES.map((s) => (
            <StatusPill
              key={s}
              status={s}
              active={activeStatus === s}
              count={statusCounts[s] ?? 0}
              onClick={() => setActiveStatus(s)}
            />
          ))}
        </Group>

        {/* ── Search + Filters panel ── */}
        <Paper radius="md" p="md" style={{ border: '0.5px solid var(--mantine-color-default-border)' }}>
          <Group gap={8} wrap="nowrap">
            {/* Inline keyword search */}
            <TextInput
              placeholder="Search by title, ID, or user…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.currentTarget.value)}
              leftSection={<Icon icon="solar:magnifer-linear" width={15} style={{ color: 'var(--mantine-color-dimmed)' }} />}
              rightSection={
                searchQuery ? (
                  <ActionIcon variant="subtle" size="xs" onClick={() => setSearchQuery('')}>
                    <Icon icon="solar:close-circle-linear" width={14} />
                  </ActionIcon>
                ) : null
              }
              style={{ flex: 1 }}
              styles={{
                input: { fontSize: 13, height: 36 },
              }}
            />
            <Button
              variant="default"
              size="sm"
              leftSection={<Icon icon="solar:filter-linear" width={14} />}
              rightSection={
                filtersOpen ? (
                  <Icon icon="solar:alt-arrow-up-linear" width={12} />
                ) : (
                  <Icon icon="solar:alt-arrow-down-linear" width={12} />
                )
              }
              onClick={() => setFiltersOpen((o) => !o)}
              style={{ whiteSpace: 'nowrap' }}
            >
              Advanced filters
            </Button>
          </Group>

          {/* Advanced filters (SearchBar) */}
          <Collapse in={filtersOpen}>
            <Divider my="md" />
            <SearchBar
              onSearch={handleSearch}
              employees={employees}
              categories={categories}
              tags={tags}
              isLoading={isLoading}
            />
          </Collapse>
        </Paper>

        {/* ── Table ── */}
        <Paper radius="md" style={{ border: '0.5px solid var(--mantine-color-default-border)', overflow: 'hidden' }}>
          {isLoading ? (
            <Center py={80}>
              <Loader color={BRAND.purple} />
            </Center>
          ) : (
            <>
              <Box style={{ overflowX: 'auto' }}>
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: 13,
                  }}
                >
                  <thead>
                    <tr style={{ borderBottom: '0.5px solid var(--mantine-color-default-border)' }}>
                      <th style={{ ...TH_STYLE, padding: '10px 16px' }}>ID</th>
                      <th style={{ ...TH_STYLE, padding: '10px 16px' }}>Title</th>
                      <th style={{ ...TH_STYLE, padding: '10px 16px' }}>Status</th>
                      <th style={{ ...TH_STYLE, padding: '10px 16px' }}>Priority</th>
                      <th style={{ ...TH_STYLE, padding: '10px 16px' }}>Category</th>
                      <th style={{ ...TH_STYLE, padding: '10px 16px' }}>Created by</th>
                      <th style={{ ...TH_STYLE, padding: '10px 16px' }}>Assigned to</th>
                      <th style={{ ...TH_STYLE, padding: '10px 16px' }}>Created</th>
                      <th style={{ ...TH_STYLE, padding: '10px 16px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayTickets.length > 0 ? (
                      displayTickets.map((ticket: Ticket, idx: number) => (
                        <tr
                          key={ticket.id}
                          onClick={() => navigate(`${ticket.id}`)}
                          style={{
                            borderBottom:
                              idx < displayTickets.length - 1
                                ? '0.5px solid var(--mantine-color-default-border)'
                                : 'none',
                            cursor: 'pointer',
                            transition: 'background .12s',
                          }}
                          onMouseEnter={(e) => {
                            ;(e.currentTarget as HTMLTableRowElement).style.background =
                              'var(--mantine-color-default-hover)'
                          }}
                          onMouseLeave={(e) => {
                            ;(e.currentTarget as HTMLTableRowElement).style.background = 'transparent'
                          }}
                        >
                          {/* ID */}
                          <td style={{ padding: '11px 16px', color: 'var(--mantine-color-dimmed)', fontSize: 12, whiteSpace: 'nowrap' }}>
                            #{ticket.id}
                          </td>

                          {/* Title */}
                          <td style={{ padding: '11px 16px', maxWidth: 260 }}>
                            <Text size="sm" fw={500} lineClamp={1}>
                              {ticket.title}
                            </Text>
                          </td>

                          {/* Status */}
                          <td style={{ padding: '11px 16px' }}>
                            <StatusBadge status={ticket.status} />
                          </td>

                          {/* Priority */}
                          <td style={{ padding: '11px 16px' }}>
                            {ticket.priority ? (
                              <PriorityBadge priority={ticket.priority} />
                            ) : (
                              <Text size="xs" c="dimmed">—</Text>
                            )}
                          </td>

                          {/* Category */}
                          <td style={{ padding: '11px 16px' }}>
                            {ticket.category ? (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 5,
                                  fontSize: 11,
                                  fontWeight: 500,
                                  padding: '3px 9px',
                                  borderRadius: 20,
                                  background: ticket.category.color + '22',
                                  color: ticket.category.color,
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                <span style={{ width: 5, height: 5, borderRadius: '50%', background: ticket.category.color, flexShrink: 0 }} />
                                {ticket.category.name}
                              </span>
                            ) : (
                              <Text size="xs" c="dimmed">—</Text>
                            )}
                          </td>

                          {/* Created by */}
                          <td style={{ padding: '11px 16px' }}>
                            <Text size="sm">{ticket.creator_username || 'Unknown'}</Text>
                          </td>

                          {/* Assigned to */}
                          <td style={{ padding: '11px 16px' }}>
                            {ticket.assigned_to_username === 'Unassigned' ? (
                              <Text size="sm" c="dimmed">Unassigned</Text>
                            ) : (
                              <Text size="sm">{ticket.assigned_to_username}</Text>
                            )}
                          </td>

                          {/* Created at */}
                          <td style={{ padding: '11px 16px', whiteSpace: 'nowrap' }}>
                            <Text size="xs" c="dimmed">
                              {new Date(ticket.created_at).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </Text>
                          </td>

                          {/* Action */}
                          <td
                            style={{ padding: '11px 16px' }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Tooltip label="View ticket" withArrow position="left" fz={11}>
                              <ActionIcon
                                variant="subtle"
                                size="sm"
                                style={{ color: BRAND.purpleDark }}
                                onClick={() => navigate(`${ticket.id}`)}
                              >
                                <Icon icon="solar:arrow-right-up-linear" width={15} />
                              </ActionIcon>
                            </Tooltip>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={9}>
                          <Center py={80}>
                            <Stack align="center" gap="sm">
                              <Icon
                                icon="solar:document-linear"
                                width={36}
                                style={{ color: 'var(--mantine-color-dimmed)', opacity: 0.4 }}
                              />
                              <Text size="sm" c="dimmed">No tickets found</Text>
                              {(searchQuery || activeStatus !== 'ALL' || searchResults !== null) && (
                                <Button
                                  variant="subtle"
                                  size="xs"
                                  style={{ color: BRAND.purpleDark }}
                                  onClick={() => {
                                    setSearchQuery('')
                                    setActiveStatus('ALL')
                                    setSearchResults(null)
                                  }}
                                >
                                  Clear filters
                                </Button>
                              )}
                            </Stack>
                          </Center>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </Box>

              {/* Footer */}
              <Box
                px="md"
                py="sm"
                style={{
                  borderTop: '0.5px solid var(--mantine-color-default-border)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Text size="xs" c="dimmed">
                  Showing{' '}
                  <span style={{ fontWeight: 500, color: 'var(--mantine-color-text)' }}>
                    {displayTickets.length}
                  </span>{' '}
                  of{' '}
                  <span style={{ fontWeight: 500, color: 'var(--mantine-color-text)' }}>
                    {allTickets.length}
                  </span>{' '}
                  tickets
                  {(searchResults !== null || activeStatus !== 'ALL') && ' · filtered'}
                </Text>

                {(searchQuery || activeStatus !== 'ALL' || searchResults !== null) && (
                  <Button
                    variant="subtle"
                    size="xs"
                    style={{ color: BRAND.purpleDark, padding: '0 4px', height: 'auto' }}
                    leftSection={<Icon icon="solar:close-circle-linear" width={12} />}
                    onClick={() => {
                      setSearchQuery('')
                      setActiveStatus('ALL')
                      setSearchResults(null)
                    }}
                  >
                    Clear all filters
                  </Button>
                )}
              </Box>
            </>
          )}
        </Paper>
      </Stack>
    </Container>
  )
}
