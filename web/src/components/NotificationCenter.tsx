import {
  Popover,
  Group,
  Stack,
  Text,
  Badge,
  ScrollArea,
  useMantineColorScheme,
  ActionIcon,
  Divider,
  UnstyledButton,
  Tooltip,
} from '@mantine/core'
import { Icon } from '@iconify-icon/react'
import { useState } from 'react'
import { useNotifications } from '@/hooks/useNotifications'
import { NotificationItem } from './NotificationItem'
import type { NotificationType } from '@/types/notification'

const NOTIFICATION_TYPES: Array<{ type: NotificationType | 'ALL'; label: string; icon: string }> = [
  { type: 'ALL', label: 'All', icon: 'solar:layers-bold-duotone' },
  { type: 'TICKET_ASSIGNED', label: 'Assigned', icon: 'solar:briefcase-bold-duotone' },
  { type: 'TICKET_UPDATED', label: 'Updated', icon: 'solar:pen-bold-duotone' },
  { type: 'COMMENT_ADDED', label: 'Comments', icon: 'solar:chat-round-bold-duotone' },
  { type: 'TICKET_RESOLVED', label: 'Resolved', icon: 'solar:check-circle-bold-duotone' },
]

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
  } = useNotifications()

  const filteredNotifications =
    filter === 'ALL' ? notifications : getByType(filter as NotificationType)

  const hasNotifications = notifications.length > 0

  return (
    <Popover position="bottom-end" withArrow opened={opened} onChange={setOpened}>
      <Popover.Target>
        <Tooltip label="Notifications" withArrow position="bottom">
          <ActionIcon
            variant={unreadCount > 0 ? 'light' : 'default'}
            size="lg"
            radius="md"
            color={unreadCount > 0 ? 'blue' : undefined}
            onClick={() => setOpened(!opened)}
            style={{
              border: unreadCount > 0 ? '1px solid var(--mantine-color-blue-4)' : '1px solid var(--mantine-color-default-border)',
              transition: 'all 0.2s ease',
              position: 'relative',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-1px)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
          >
            <Icon icon="solar:bell-bold-duotone" width={24} color={unreadCount > 0 ? 'var(--mantine-color-blue-6)' : 'currentColor'} />

            {unreadCount > 0 && (
              <Badge
                size="xs"
                circle
                color="red"
                variant="filled"
                style={{
                  position: 'absolute',
                  top: -8,
                  right: -8,
                  fontWeight: 700,
                }}
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </Badge>
            )}
          </ActionIcon>
        </Tooltip>
      </Popover.Target>

      <Popover.Dropdown p={0} w={{ base: '90vw', xs: 320, sm: 360, md: 420 }} maw="calc(100vw - 16px)">
        <Stack gap={0} style={{ borderRadius: 'var(--mantine-radius-md)' }}>
          {/* Header */}
          <Group
            justify="space-between"
            align="center"
            p="md"
            style={{
              background: isDark ? 'var(--mantine-color-dark-7)' : 'var(--mantine-color-gray-0)',
              borderRadius: 'var(--mantine-radius-md) var(--mantine-radius-md) 0 0',
            }}
          >
            <Group gap="xs">
              <Icon icon="solar:bell-bold-duotone" width={20} color="var(--mantine-color-blue-filled)" />
              <Text fw={600} size="md">
                Notifications
              </Text>
              {unreadCount > 0 && (
                <Badge size="sm" color="red" variant="light">
                  {unreadCount} new
                </Badge>
              )}
            </Group>

            {hasNotifications && (
              <Tooltip label="Clear all" withArrow>
                <ActionIcon
                  variant="subtle"
                  size="sm"
                  onClick={clearAll}
                  color="gray"
                >
                  <Icon icon="solar:trash-bin-trash-bold-duotone" width={16} />
                </ActionIcon>
              </Tooltip>
            )}
          </Group>

          <Divider m={0} />

          {/* Filter Tabs */}
          {hasNotifications && (
            <Group gap={6} p={12} wrap="wrap" style={{ borderBottom: `1px solid var(--mantine-color-default-border)`, overflowX: 'auto' }}>
              {NOTIFICATION_TYPES.map(({ type, label, icon }) => (
                <UnstyledButton
                  key={type}
                  onClick={() => setFilter(type)}
                  style={{
                    padding: '5px 10px',
                    borderRadius: 'var(--mantine-radius-md)',
                    fontSize: '11px',
                    fontWeight: filter === type ? 600 : 500,
                    backgroundColor: filter === type ? 'var(--mantine-color-blue-light)' : 'transparent',
                    color: filter === type ? 'var(--mantine-color-blue-filled)' : 'var(--mantine-color-gray-7)',
                    border: filter === type ? '1px solid var(--mantine-color-blue-3)' : '1px solid var(--mantine-color-default-border)',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                  onMouseEnter={(e) => {
                    if (filter !== type) {
                      e.currentTarget.style.backgroundColor = isDark ? 'rgba(59, 130, 246, 0.08)' : 'rgba(59, 130, 246, 0.05)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (filter !== type) {
                      e.currentTarget.style.backgroundColor = 'transparent'
                    }
                  }}
                >
                  <Icon icon={icon} width={11} />
                  <span>{label}</span>
                </UnstyledButton>
              ))}
            </Group>
          )}

          {/* Notifications List */}
          {filteredNotifications.length === 0 ? (
            <Stack
              align="center"
              justify="center"
              style={{
                minHeight: '200px',
                padding: 'var(--mantine-spacing-xl)',
              }}
              gap="xs"
            >
              <Icon
                icon="solar:inbox-bold-duotone"
                width={40}
                color="var(--mantine-color-gray-4)"
              />
              <Text size="sm" c="dimmed" ta="center">
                {hasNotifications ? `No ${filter} notifications` : 'No notifications yet'}
              </Text>
            </Stack>
          ) : (
            <ScrollArea style={{ maxHeight: '450px' }}>
              <Stack gap="xs" p="md">
                {filteredNotifications.map((notification) => (
                  <NotificationItem key={notification.id} notification={notification} />
                ))}
              </Stack>
            </ScrollArea>
          )}
        </Stack>
      </Popover.Dropdown>
    </Popover>
  )
}
