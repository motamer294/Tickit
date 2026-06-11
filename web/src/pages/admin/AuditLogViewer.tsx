import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Container,
  Stack,
  Group,
  Text,
  Paper,
  TextInput,
  Select,
  Button,
  Center,
  Loader,
  ActionIcon,
  Tooltip,
  Modal,
  Box,
  Avatar,
  Divider,
  Textarea,
} from '@mantine/core'
import { Icon } from '@iconify-icon/react'
import { listAuditLogs, type AuditLog } from '@/api/admin.api'

// ─── Brand palette (matches all other pages) ───────────────────────────────────

const BRAND = {
  purple:      '#7F77DD',
  purpleDark:  '#534AB7',
  purpleLight: '#EEEDFE',
  purpleText:  '#3C3489',
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
  teal:        '#0E9E8E',
  tealLight:   '#E0F5F3',
  tealText:    '#065F57',
  violet:      '#9C59D1',
  violetLight: '#F3EAFB',
  violetText:  '#5B1F8A',
  cyan:        '#1EA8BF',
  cyanLight:   '#E2F6FA',
  cyanText:    '#0B5F6E',
  orange:      '#E87B23',
  orangeLight: '#FDF0E4',
  orangeText:  '#7A3A05',
}

// ─── Action type metadata ──────────────────────────────────────────────────────

const ACTION_META: Record<string, { label: string; bg: string; text: string; dot: string; icon: string }> = {
  TICKET_CREATED:        { label: 'Ticket Created',        bg: BRAND.blueLight,   text: BRAND.blueText,   dot: BRAND.blue,   icon: 'solar:ticket-bold-duotone'              },
  TICKET_UPDATED:        { label: 'Ticket Updated',        bg: BRAND.cyanLight,   text: BRAND.cyanText,   dot: BRAND.cyan,   icon: 'solar:pen-2-bold-duotone'               },
  TICKET_DELETED:        { label: 'Ticket Deleted',        bg: BRAND.redLight,    text: BRAND.redText,    dot: BRAND.red,    icon: 'solar:trash-bin-minimalistic-bold-duotone'},
  TICKET_ASSIGNED:       { label: 'Ticket Assigned',       bg: BRAND.purpleLight, text: BRAND.purpleText, dot: BRAND.purple, icon: 'solar:user-check-bold-duotone'          },
  STATUS_CHANGED:        { label: 'Status Changed',        bg: BRAND.violetLight, text: BRAND.violetText, dot: BRAND.violet, icon: 'solar:refresh-circle-bold-duotone'      },
  COMMENT_ADDED:         { label: 'Comment Added',         bg: BRAND.blueLight,   text: BRAND.blueText,   dot: BRAND.blue,   icon: 'solar:chat-round-dots-bold-duotone'     },
  ATTACHMENT_ADDED:      { label: 'Attachment Added',      bg: BRAND.tealLight,   text: BRAND.tealText,   dot: BRAND.teal,   icon: 'solar:paperclip-bold-duotone'           },
  ATTACHMENT_DELETED:    { label: 'Attachment Deleted',    bg: BRAND.redLight,    text: BRAND.redText,    dot: BRAND.red,    icon: 'solar:trash-bin-2-bold-duotone'         },
  CATEGORY_CREATED:      { label: 'Category Created',      bg: BRAND.greenLight,  text: BRAND.greenText,  dot: BRAND.green,  icon: 'solar:tag-bold-duotone'                 },
  CATEGORY_UPDATED:      { label: 'Category Updated',      bg: BRAND.amberLight,  text: BRAND.amberText,  dot: BRAND.amber,  icon: 'solar:tag-bold-duotone'                 },
  CATEGORY_DELETED:      { label: 'Category Deleted',      bg: BRAND.redLight,    text: BRAND.redText,    dot: BRAND.red,    icon: 'solar:tag-bold-duotone'                 },
  TAG_CREATED:           { label: 'Tag Created',           bg: BRAND.greenLight,  text: BRAND.greenText,  dot: BRAND.green,  icon: 'solar:hashtag-bold-duotone'             },
  TAG_UPDATED:           { label: 'Tag Updated',           bg: BRAND.amberLight,  text: BRAND.amberText,  dot: BRAND.amber,  icon: 'solar:hashtag-bold-duotone'             },
  TAG_DELETED:           { label: 'Tag Deleted',           bg: BRAND.redLight,    text: BRAND.redText,    dot: BRAND.red,    icon: 'solar:hashtag-bold-duotone'             },
  USER_CREATED:          { label: 'User Created',          bg: BRAND.greenLight,  text: BRAND.greenText,  dot: BRAND.green,  icon: 'solar:user-plus-bold-duotone'           },
  USER_UPDATED:          { label: 'User Updated',          bg: BRAND.amberLight,  text: BRAND.amberText,  dot: BRAND.amber,  icon: 'solar:user-id-bold-duotone'             },
  USER_ROLE_CHANGED:     { label: 'Role Changed',          bg: BRAND.orangeLight, text: BRAND.orangeText, dot: BRAND.orange, icon: 'solar:shield-user-bold-duotone'         },
  USER_PROFILE_UPDATED:  { label: 'Profile Updated',       bg: BRAND.cyanLight,   text: BRAND.cyanText,   dot: BRAND.cyan,   icon: 'solar:user-rounded-bold-duotone'        },
  USER_PASSWORD_CHANGED: { label: 'Password Changed',      bg: BRAND.orangeLight, text: BRAND.orangeText, dot: BRAND.orange, icon: 'solar:lock-password-bold-duotone'       },
  USER_DEACTIVATED:      { label: 'User Deactivated',      bg: BRAND.redLight,    text: BRAND.redText,    dot: BRAND.red,    icon: 'solar:user-block-bold-duotone'          },
  OTHER:                 { label: 'Other',                 bg: BRAND.grayLight,   text: BRAND.grayText,   dot: BRAND.gray,   icon: 'solar:info-circle-bold-duotone'         },
}

const AVATAR_PALETTES = [
  { bg: '#EEEDFE', color: '#3C3489' },
  { bg: '#E1F5EE', color: '#085041' },
  { bg: '#FAEEDA', color: '#633806' },
  { bg: '#FAECE7', color: '#712B13' },
  { bg: '#E6F1FB', color: '#0C447C' },
  { bg: '#FBEAF0', color: '#72243E' },
]

function getInitials(name: string) {
  return (name || '?')
    .split(/[\s._-]/)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function ActionBadge({ actionType }: { actionType: string }) {
  const m = ACTION_META[actionType] ?? ACTION_META.OTHER
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

function StatCard({
  label,
  value,
  icon,
  accentColor,
}: {
  label: string
  value: number | string
  icon: string
  accentColor: string
}) {
  return (
    <Paper
      radius="md"
      p="md"
      style={{
        border: '0.5px solid var(--mantine-color-default-border)',
        position: 'relative',
        overflow: 'hidden',
        flex: 1,
      }}
    >
      <Group justify="space-between" mb={8}>
        <Text size="xs" c="dimmed" tt="uppercase" fw={500} style={{ letterSpacing: '0.05em' }}>
          {label}
        </Text>
        <Icon icon={icon} width={15} style={{ color: accentColor, opacity: 0.75 }} />
      </Group>
      <Text fw={500} style={{ fontSize: 28, lineHeight: 1 }}>{value}</Text>
      <Box
        style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          height: 3, background: accentColor,
        }}
      />
    </Paper>
  )
}

// Detail row for modal
function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Box>
      <Text size="xs" tt="uppercase" fw={500} c="dimmed" mb={4} style={{ letterSpacing: '0.05em' }}>
        {label}
      </Text>
      <Box>{children}</Box>
    </Box>
  )
}

// Value block (old/new/description)
function ValueBlock({ value }: { value: string }) {
  return (
    <Box
      p="sm"
      style={{
        background: 'var(--mantine-color-default-hover)',
        borderRadius: 'var(--mantine-radius-md)',
        border: '0.5px solid var(--mantine-color-default-border)',
        fontFamily: 'monospace',
        fontSize: 12,
        wordBreak: 'break-all',
        whiteSpace: 'pre-wrap',
        color: 'var(--mantine-color-text)',
      }}
    >
      {value}
    </Box>
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

const PAGE_SIZE = 50

// ─── Main Component ────────────────────────────────────────────────────────────

export default function AuditLogViewer() {
  const [filters, setFilters] = useState({ ticketId: '', actionType: '' })
  const [page, setPage]       = useState(0)
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)
  const [modalOpened, setModalOpened] = useState(false)

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
        PAGE_SIZE,
        page * PAGE_SIZE,
      ),
  })

  const handleViewDetails = (log: AuditLog) => {
    setSelectedLog(log)
    setModalOpened(true)
  }

  const handleReset = () => {
    setFilters({ ticketId: '', actionType: '' })
    setPage(0)
  }

  // Summary counts for stat cards
  const actionCounts = useMemo(() => {
    const ticket  = logs.filter((l: AuditLog) => l.action_type.startsWith('TICKET')).length
    const user    = logs.filter((l: AuditLog) => l.action_type.startsWith('USER')).length
    const other   = logs.length - ticket - user
    return { ticket, user, other }
  }, [logs])

  const isFiltered = filters.ticketId || filters.actionType

  if (isLoading && page === 0) {
    return (
      <Container size="lg" py="lg">
        <Center h={300}><Loader color={BRAND.purple} /></Center>
      </Container>
    )
  }

  return (
    <Container size="lg" py="lg">
      <style>{`
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 2px ${BRAND.greenLight}; }
          50%       { box-shadow: 0 0 0 5px ${BRAND.greenLight}; }
        }
      `}</style>
      <Stack gap="lg">

        {/* ── Header ── */}
        <Group justify="space-between" align="flex-end">
          <Box>
            <Text fw={500} style={{ fontSize: 22, lineHeight: 1.2 }}>Audit Log</Text>
            <Text size="sm" c="dimmed" mt={2}>Track all system activities and changes</Text>
          </Box>
          <Group gap={6} align="center">
            {/* Live indicator */}
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 11,
                fontWeight: 500,
                padding: '4px 10px',
                borderRadius: 20,
                background: BRAND.greenLight,
                color: BRAND.greenText,
              }}
            >
              <span
                style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: BRAND.green,
                  display: 'inline-block',
                  boxShadow: `0 0 0 2px ${BRAND.greenLight}`,
                  animation: 'pulse 2s infinite',
                }}
              />
              Live · refresh every 3s
            </span>
          </Group>
        </Group>

        {/* ── Stat cards ── */}
        <Group gap={10} wrap="nowrap">
          <StatCard label="Entries shown"  value={logs.length}          icon="solar:list-check-linear"           accentColor={BRAND.purple} />
          <StatCard label="Ticket events"  value={actionCounts.ticket}  icon="solar:ticket-linear"               accentColor={BRAND.blue}   />
          <StatCard label="User events"    value={actionCounts.user}    icon="solar:user-id-linear"              accentColor={BRAND.green}  />
          <StatCard label="Other events"   value={actionCounts.other}   icon="solar:info-circle-linear"          accentColor={BRAND.gray}   />
        </Group>

        {/* ── Filters ── */}
        <Paper radius="md" p="md" style={{ border: '0.5px solid var(--mantine-color-default-border)' }}>
          <Group gap={10} wrap="wrap" align="flex-end">
            <TextInput
              label={<Text size="xs" fw={500} mb={4}>Ticket ID</Text>}
              placeholder="e.g. 42"
              type="number"
              value={filters.ticketId}
              onChange={(e) => { setFilters({ ...filters, ticketId: e.currentTarget.value }); setPage(0) }}
              leftSection={<Icon icon="solar:ticket-linear" width={14} style={{ color: 'var(--mantine-color-dimmed)' }} />}
              style={{ width: 160 }}
              styles={{ input: { fontSize: 13, height: 34 } }}
            />
            <Select
              label={<Text size="xs" fw={500} mb={4}>Action type</Text>}
              placeholder="All actions"
              clearable
              searchable
              data={Object.entries(ACTION_META).map(([value, m]) => ({ value, label: m.label }))}
              value={filters.actionType}
              onChange={(value) => { setFilters({ ...filters, actionType: value || '' }); setPage(0) }}
              style={{ width: 220 }}
              styles={{ input: { fontSize: 13, height: 34 } }}
            />
            {isFiltered && (
              <Button
                variant="subtle"
                size="sm"
                style={{ color: BRAND.purpleDark, marginBottom: 1 }}
                leftSection={<Icon icon="solar:close-circle-linear" width={13} />}
                onClick={handleReset}
              >
                Clear filters
              </Button>
            )}
          </Group>
        </Paper>

        {/* ── Error ── */}
        {error && (
          <Paper p="md" radius="md" style={{ background: BRAND.redLight, border: `0.5px solid ${BRAND.red}33` }}>
            <Group justify="space-between">
              <Group gap={8}>
                <Icon icon="solar:danger-triangle-linear" width={15} style={{ color: BRAND.red }} />
                <Text size="sm" style={{ color: BRAND.redText }}>Error loading audit logs. Please try again.</Text>
              </Group>
              <ActionIcon variant="subtle" color="red" size="sm" onClick={() => window.location.reload()}>
                <Icon icon="solar:refresh-linear" width={15} />
              </ActionIcon>
            </Group>
          </Paper>
        )}

        {/* ── Table ── */}
        <Paper radius="md" style={{ border: '0.5px solid var(--mantine-color-default-border)', overflow: 'hidden' }}>
          {isLoading ? (
            <Center py={80}><Loader color={BRAND.purple} /></Center>
          ) : (
            <>
              <Box style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '0.5px solid var(--mantine-color-default-border)' }}>
                      <th style={{ ...TH_STYLE, padding: '10px 16px' }}>Timestamp</th>
                      <th style={{ ...TH_STYLE, padding: '10px 16px' }}>Action</th>
                      <th style={{ ...TH_STYLE, padding: '10px 16px' }}>Performed by</th>
                      <th style={{ ...TH_STYLE, padding: '10px 16px' }}>Ticket</th>
                      <th style={{ ...TH_STYLE, padding: '10px 16px' }}>User</th>
                      <th style={{ ...TH_STYLE, padding: '10px 16px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.length > 0 ? (
                      logs.map((log: AuditLog, idx: number) => {
                        const pal = AVATAR_PALETTES[
                          Math.abs(
                            (log.performed_by_username || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0),
                          ) % AVATAR_PALETTES.length
                        ]
                        const meta = ACTION_META[log.action_type] ?? ACTION_META.OTHER
                        return (
                          <tr
                            key={log.id}
                            style={{
                              borderBottom:
                                idx < logs.length - 1
                                  ? '0.5px solid var(--mantine-color-default-border)'
                                  : 'none',
                              transition: 'background .12s',
                            }}
                            onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = 'var(--mantine-color-default-hover)' }}
                            onMouseLeave={(e)  => { (e.currentTarget as HTMLTableRowElement).style.background = 'transparent' }}
                          >
                            {/* Timestamp */}
                            <td style={{ padding: '10px 16px', whiteSpace: 'nowrap' }}>
                              <Text size="xs" c="dimmed">
                                {new Date(log.created_at).toLocaleDateString(undefined, {
                                  month: 'short', day: 'numeric', year: 'numeric',
                                })}
                              </Text>
                              <Text size="xs" c="dimmed" style={{ opacity: 0.7 }}>
                                {new Date(log.created_at).toLocaleTimeString(undefined, {
                                  hour: '2-digit', minute: '2-digit', second: '2-digit',
                                })}
                              </Text>
                            </td>

                            {/* Action badge */}
                            <td style={{ padding: '10px 16px' }}>
                              <Group gap={6} wrap="nowrap">
                                <Icon icon={meta.icon} width={14} style={{ color: meta.dot, flexShrink: 0 }} />
                                <ActionBadge actionType={log.action_type} />
                              </Group>
                            </td>

                            {/* Performed by */}
                            <td style={{ padding: '10px 16px' }}>
                              <Group gap={8} wrap="nowrap">
                                <Avatar
                                  size={26}
                                  radius="xl"
                                  style={{ background: pal.bg, color: pal.color, fontSize: 9, fontWeight: 600, flexShrink: 0 }}
                                >
                                  {getInitials(log.performed_by_username)}
                                </Avatar>
                                <Text size="sm">{log.performed_by_username}</Text>
                              </Group>
                            </td>

                            {/* Ticket ID */}
                            <td style={{ padding: '10px 16px' }}>
                              {log.ticket_id ? (
                                <span
                                  style={{
                                    fontSize: 11,
                                    fontWeight: 500,
                                    padding: '3px 8px',
                                    borderRadius: 20,
                                    background: BRAND.blueLight,
                                    color: BRAND.blueText,
                                  }}
                                >
                                  #{log.ticket_id}
                                </span>
                              ) : (
                                <Text size="xs" c="dimmed">—</Text>
                              )}
                            </td>

                            {/* User ID */}
                            <td style={{ padding: '10px 16px' }}>
                              {log.user_id ? (
                                <Text size="xs" c="dimmed">#{log.user_id}</Text>
                              ) : (
                                <Text size="xs" c="dimmed">—</Text>
                              )}
                            </td>

                            {/* Details action */}
                            <td style={{ padding: '10px 16px' }}>
                              <Tooltip label="View details" withArrow fz={11} position="left">
                                <ActionIcon
                                  variant="subtle"
                                  size="sm"
                                  style={{ color: BRAND.purpleDark }}
                                  onClick={() => handleViewDetails(log)}
                                >
                                  <Icon icon="solar:eye-linear" width={15} />
                                </ActionIcon>
                              </Tooltip>
                            </td>
                          </tr>
                        )
                      })
                    ) : (
                      <tr>
                        <td colSpan={6}>
                          <Center py={80}>
                            <Stack align="center" gap="sm">
                              <Icon
                                icon="solar:list-check-linear"
                                width={36}
                                style={{ color: 'var(--mantine-color-dimmed)', opacity: 0.4 }}
                              />
                              <Text size="sm" c="dimmed">No audit logs found</Text>
                              {isFiltered && (
                                <Button
                                  variant="subtle"
                                  size="xs"
                                  style={{ color: BRAND.purpleDark }}
                                  onClick={handleReset}
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

              {/* Table footer + pagination */}
              <Box
                px="md"
                py="sm"
                style={{
                  borderTop: '0.5px solid var(--mantine-color-default-border)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <Text size="xs" c="dimmed">
                  {logs.length > 0
                    ? <>
                        Page <span style={{ fontWeight: 500, color: 'var(--mantine-color-text)' }}>{page + 1}</span>
                        {' · '}
                        Showing <span style={{ fontWeight: 500, color: 'var(--mantine-color-text)' }}>{logs.length}</span> entries
                        {isFiltered && ' · filtered'}
                      </>
                    : 'No entries'
                  }
                </Text>

                {logs.length > 0 && (
                  <Group gap={6}>
                    <Button
                      variant="default"
                      size="xs"
                      disabled={page === 0}
                      leftSection={<Icon icon="solar:alt-arrow-left-linear" width={12} />}
                      onClick={() => setPage(Math.max(0, page - 1))}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="default"
                      size="xs"
                      disabled={logs.length < PAGE_SIZE}
                      rightSection={<Icon icon="solar:alt-arrow-right-linear" width={12} />}
                      onClick={() => setPage(page + 1)}
                    >
                      Next
                    </Button>
                  </Group>
                )}
              </Box>
            </>
          )}
        </Paper>
      </Stack>

      {/* ── Details Modal ── */}
      {selectedLog && (
        <Modal
          opened={modalOpened}
          onClose={() => { setModalOpened(false); setSelectedLog(null) }}
          title={
            <Group gap={8}>
              <Icon
                icon={ACTION_META[selectedLog.action_type]?.icon ?? 'solar:info-circle-bold-duotone'}
                width={18}
                style={{ color: ACTION_META[selectedLog.action_type]?.dot ?? BRAND.gray }}
              />
              <Text fw={500} size="sm">Audit log details</Text>
            </Group>
          }
          size="md"
          radius="md"
          styles={{
            header: { borderBottom: '0.5px solid var(--mantine-color-default-border)', paddingBottom: 12 },
            body:   { paddingTop: 16 },
          }}
        >
          <Stack gap="md">
            {/* Top summary row */}
            <Group gap={10} wrap="wrap">
              <ActionBadge actionType={selectedLog.action_type} />
              <Text size="xs" c="dimmed">
                {new Date(selectedLog.created_at).toLocaleString(undefined, {
                  month: 'short', day: 'numeric', year: 'numeric',
                  hour: '2-digit', minute: '2-digit', second: '2-digit',
                })}
              </Text>
            </Group>

            <Divider />

            {/* Core fields */}
            <SimpleDetailGrid>
              <DetailRow label="Performed by">
                <Group gap={8} wrap="nowrap">
                  <Avatar
                    size={22}
                    radius="xl"
                    style={{ background: BRAND.purpleLight, color: BRAND.purpleText, fontSize: 8, fontWeight: 600 }}
                  >
                    {getInitials(selectedLog.performed_by_username)}
                  </Avatar>
                  <Text size="sm">{selectedLog.performed_by_username}</Text>
                </Group>
              </DetailRow>

              {selectedLog.ticket_id && (
                <DetailRow label="Ticket ID">
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 500,
                      padding: '3px 9px',
                      borderRadius: 20,
                      background: BRAND.blueLight,
                      color: BRAND.blueText,
                    }}
                  >
                    #{selectedLog.ticket_id}
                  </span>
                </DetailRow>
              )}

              {selectedLog.user_id && (
                <DetailRow label="User ID">
                  <Text size="sm" c="dimmed">#{selectedLog.user_id}</Text>
                </DetailRow>
              )}

              {selectedLog.ip_address && (
                <DetailRow label="IP address">
                  <Text size="sm" style={{ fontFamily: 'monospace' }}>{selectedLog.ip_address}</Text>
                </DetailRow>
              )}
            </SimpleDetailGrid>

            {/* Description */}
            {selectedLog.description && (
              <>
                <Divider />
                <DetailRow label="Description">
                  <ValueBlock value={selectedLog.description} />
                </DetailRow>
              </>
            )}

            {/* Old value */}
            {selectedLog.old_value && (
              <>
                <Divider />
                <DetailRow label="Previous value">
                  <ValueBlock value={selectedLog.old_value} />
                </DetailRow>
              </>
            )}

            {/* New value */}
            {selectedLog.new_value && (
              <DetailRow label="New value">
                <Box
                  p="sm"
                  style={{
                    background: BRAND.greenLight,
                    borderRadius: 'var(--mantine-radius-md)',
                    border: `0.5px solid ${BRAND.green}33`,
                    fontFamily: 'monospace',
                    fontSize: 12,
                    wordBreak: 'break-all',
                    whiteSpace: 'pre-wrap',
                    color: BRAND.greenText,
                  }}
                >
                  {selectedLog.new_value}
                </Box>
              </DetailRow>
            )}

            {/* Metadata */}
            {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
              <>
                <Divider />
                <DetailRow label="Metadata">
                  <Textarea
                    value={JSON.stringify(selectedLog.metadata, null, 2)}
                    readOnly
                    minRows={3}
                    maxRows={8}
                    styles={{
                      input: {
                        fontFamily: 'monospace',
                        fontSize: 11,
                        background: 'var(--mantine-color-default-hover)',
                        border: '0.5px solid var(--mantine-color-default-border)',
                        color: 'var(--mantine-color-text)',
                      },
                    }}
                  />
                </DetailRow>
              </>
            )}

            <Divider />
            <Group justify="flex-end">
              <Button
                variant="default"
                size="sm"
                onClick={() => { setModalOpened(false); setSelectedLog(null) }}
              >
                Close
              </Button>
            </Group>
          </Stack>
        </Modal>
      )}
    </Container>
  )
}

// Tiny layout helper — 2-col grid inside modal
function SimpleDetailGrid({ children }: { children: React.ReactNode }) {
  return (
    <Box
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
        gap: 12,
      }}
    >
      {children}
    </Box>
  )
}
