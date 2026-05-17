import {
  Popover,
  Group,
  Stack,
  Text,
  ScrollArea,
  useMantineColorScheme,
  ActionIcon,
  Divider,
  Box,
  Tooltip,
} from '@mantine/core'
import { Icon } from '@iconify-icon/react'
import { useState } from 'react'
import { useNotifications } from '@/hooks/useNotifications'
import { NotificationItem } from './NotificationItem'
import type { NotificationType } from '@/types/notification'

// ─── Brand ─────────────────────────────────────────────────────────────────────

const BRAND = {
  purple:      '#7F77DD',
  purpleDark:  '#534AB7',
  purpleLight: '#EEEDFE',
  purpleText:  '#3C3489',
  red:         '#E24B4A',
  redLight:    '#FCEBEB',
}

// ─── Filter tab data ───────────────────────────────────────────────────────────

const FILTER_TABS: Array<{ type: NotificationType | 'ALL'; label: string; icon: string }> = [
  { type: 'ALL',               label: 'All',      icon: 'solar:layers-bold-duotone'                    },
  { type: 'TICKET_CREATED',    label: 'Created',  icon: 'solar:document-add-bold-duotone'              },
  { type: 'TICKET_ASSIGNED',   label: 'Assigned', icon: 'solar:briefcase-bold-duotone'                 },
  { type: 'TICKET_UPDATED',    label: 'Updated',  icon: 'solar:pen-bold-duotone'                       },
  { type: 'TICKET_RESOLVED',   label: 'Resolved', icon: 'solar:check-circle-bold-duotone'              },
  { type: 'COMMENT_ADDED',     label: 'Comments', icon: 'solar:chat-round-dots-bold-duotone'           },
  { type: 'TICKET_DELETED',    label: 'Deleted',  icon: 'solar:trash-bin-minimalistic-bold-duotone'    },
  { type: 'MANAGER_ACTIVITY',  label: 'Activity', icon: 'solar:pulse-bold-duotone'                     },
]

// ─── Filter pill ───────────────────────────────────────────────────────────────

function FilterPill({
  label,
  icon,
  active,
  onClick,
}: {
  label: string
  icon: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontSize: 11,
        fontWeight: active ? 600 : 500,
        padding: '4px 10px',
        borderRadius: 20,
        border: active
          ? `1.5px solid ${BRAND.purple}`
          : '1px solid var(--mantine-color-default-border)',
        background: active ? BRAND.purpleLight : 'transparent',
        color: active ? BRAND.purpleText : 'var(--mantine-color-dimmed)',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        transition: 'all .13s',
        flexShrink: 0,
      }}
    >
      <Icon icon={icon} width={11} style={{ color: active ? BRAND.purple : 'currentColor' }} />
      {label}
    </button>
  )
}

// ─── Component ─────────────────────────────────────────────────────────────────

export const NotificationCenter = () => {
  const { colorScheme } = useMantineColorScheme()
  const isDark = colorScheme === 'dark'
  const [opened, setOpened] = useState(false)
  const [filter, setFilter] = useState<NotificationType | 'ALL'>('ALL')

  const {
    notifications,
    unreadCount,
    getByType,
    clearAll,
    markAllAsRead,
  } = useNotifications()

  const filteredNotifications =
    filter === 'ALL' ? notifications : getByType(filter as NotificationType)
  const hasNotifications = notifications.length > 0

  return (
    <Popover
      position="bottom-end"
      withArrow
      arrowSize={10}
      opened={opened}
      onChange={setOpened}
      offset={8}
    >
      <Popover.Target>
        <Tooltip label="Notifications" withArrow fz={11} position="bottom">
          <ActionIcon
            variant="default"
            size="lg"
            radius="md"
            onClick={() => setOpened((o) => !o)}
            style={{
              position: 'relative',
              border: unreadCount > 0
                ? `1px solid ${BRAND.purple}55`
                : '1px solid var(--mantine-color-default-border)',
              background: unreadCount > 0 ? BRAND.purpleLight : undefined,
              transition: 'all .15s',
            }}
          >
            <Icon
              icon="solar:bell-bold-duotone"
              width={20}
              style={{ color: unreadCount > 0 ? BRAND.purple : 'var(--mantine-color-dimmed)' }}
            />

            {/* Unread count badge */}
            {unreadCount > 0 && (
              <Box
                style={{
                  position: 'absolute',
                  top: -5,
                  right: -5,
                  minWidth: 16,
                  height: 16,
                  borderRadius: 8,
                  background: BRAND.red,
                  border: `2px solid var(--mantine-color-body)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 9,
                  fontWeight: 700,
                  color: '#fff',
                  lineHeight: 1,
                  padding: '0 3px',
                }}
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </Box>
            )}
          </ActionIcon>
        </Tooltip>
      </Popover.Target>

      <Popover.Dropdown
        p={0}
        w={{ base: '90vw', xs: 360, sm: 400, md: 440 }}
        style={{
          borderRadius: 12,
          overflow: 'hidden',
          border: '0.5px solid var(--mantine-color-default-border)',
          boxShadow: isDark
            ? '0 8px 32px rgba(0,0,0,0.5)'
            : '0 8px 32px rgba(0,0,0,0.12)',
        }}
      >
        {/* ── Header ── */}
        <Group
          justify="space-between"
          align="center"
          px="md"
          py="sm"
          style={{
            borderBottom: '0.5px solid var(--mantine-color-default-border)',
          }}
        >
          <Group gap={8}>
            <Icon icon="solar:bell-bold-duotone" width={16} style={{ color: BRAND.purple }} />
            <Text fw={600} size="sm">Notifications</Text>
            {unreadCount > 0 && (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '2px 7px',
                  borderRadius: 20,
                  background: BRAND.redLight,
                  color: BRAND.red,
                }}
              >
                {unreadCount} new
              </span>
            )}
          </Group>

          <Group gap={4}>
            {unreadCount > 0 && (
              <Tooltip label="Mark all as read" withArrow fz={10} position="top">
                <ActionIcon
                  variant="subtle"
                  size="sm"
                  style={{ color: BRAND.purpleDark }}
                  onClick={() => markAllAsRead?.()}
                >
                  <Icon icon="solar:check-read-linear" width={14} />
                </ActionIcon>
              </Tooltip>
            )}
            {hasNotifications && (
              <Tooltip label="Clear all" withArrow fz={10} position="top">
                <ActionIcon
                  variant="subtle"
                  size="sm"
                  style={{ color: BRAND.red }}
                  onClick={clearAll}
                >
                  <Icon icon="solar:trash-bin-2-linear" width={14} />
                </ActionIcon>
              </Tooltip>
            )}
          </Group>
        </Group>

        {/* ── Filter tabs ── */}
        {hasNotifications && (
          <ScrollArea
            scrollbars="x"
            scrollbarSize={0}
            style={{ borderBottom: '0.5px solid var(--mantine-color-default-border)' }}
          >
            <Group gap={4} px="sm" py={8} wrap="nowrap">
              {FILTER_TABS.map(({ type, label, icon }) => (
                <FilterPill
                  key={type}
                  label={label}
                  icon={icon}
                  active={filter === type}
                  onClick={() => setFilter(type)}
                />
              ))}
            </Group>
          </ScrollArea>
        )}

        {/* ── List ── */}
        <ScrollArea.Autosize
          mah="clamp(240px, calc(100vh - 200px), 56vh)"
          offsetScrollbars
          scrollbarSize={6}
        >
          {filteredNotifications.length === 0 ? (
            <Stack align="center" justify="center" mih={180} p="xl" gap="sm">
              <Box
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: BRAND.purpleLight,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon icon="solar:inbox-bold-duotone" width={22} style={{ color: BRAND.purple }} />
              </Box>
              <Text size="sm" c="dimmed" ta="center" fw={500}>
                {hasNotifications
                  ? `No ${filter.toLowerCase().replace('_', ' ')} notifications`
                  : 'All caught up!'}
              </Text>
              {!hasNotifications && (
                <Text size="xs" c="dimmed" ta="center" style={{ opacity: 0.6 }}>
                  You'll see ticket updates and alerts here
                </Text>
              )}
            </Stack>
          ) : (
            <Stack gap={6} p="sm">
              {filteredNotifications.map((notification) => (
                <NotificationItem key={notification.id} notification={notification} />
              ))}
            </Stack>
          )}
        </ScrollArea.Autosize>

        {/* ── Footer ── */}
        {hasNotifications && (
          <>
            <Divider />
            <Box
              px="md"
              py="sm"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Text size="xs" c="dimmed">
                {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
                {unreadCount > 0 && ` · ${unreadCount} unread`}
              </Text>
              {filter !== 'ALL' && (
                <button
                  onClick={() => setFilter('ALL')}
                  style={{
                    fontSize: 11,
                    fontWeight: 500,
                    color: BRAND.purpleDark,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  Show all ↗
                </button>
              )}
            </Box>
          </>
        )}
      </Popover.Dropdown>
    </Popover>
  )
}
