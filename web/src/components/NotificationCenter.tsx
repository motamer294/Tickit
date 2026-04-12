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
  { type: 'TICKET_CREATED', label: 'Created', icon: 'solar:document-add-bold-duotone' },
  { type: 'TICKET_ASSIGNED', label: 'Assigned', icon: 'solar:briefcase-bold-duotone' },
  { type: 'TICKET_UPDATED', label: 'Updated', icon: 'solar:pen-bold-duotone' },
  { type: 'COMMENT_ADDED', label: 'Comments', icon: 'solar:chat-round-bold-duotone' },
  { type: 'TICKET_RESOLVED', label: 'Resolved', icon: 'solar:check-circle-bold-duotone' },
  { type: 'MANAGER_ACTIVITY', label: 'Activity', icon: 'solar:pulse-bold-duotone' },
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

  const filteredNotifications = filter === 'ALL' ? notifications : getByType(filter as NotificationType)
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

      <Popover.Dropdown
        p={0}
        w={{ base: '90vw', xs: 360, sm: 400, md: 460 }}
        style={{
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: isDark ? '0 10px 40px rgba(0, 0, 0, 0.6)' : '0 10px 40px rgba(0, 0, 0, 0.15)',
          border: `1px solid ${isDark ? 'var(--mantine-color-dark-5)' : 'var(--mantine-color-gray-2)'}`,
        }}
      >
        {/* Header - Stays fixed at top */}
        <Group
          justify="space-between"
          align="center"
          p="md"
          style={{
            background: isDark ? 'var(--mantine-color-dark-6)' : 'white',
          }}
        >
          <Group gap="xs">
            <Icon icon="solar:bell-bold-duotone" width={20} color="var(--mantine-color-blue-filled)" />
            <Text fw={600} size="md">Notifications</Text>
            {unreadCount > 0 && (
              <Badge size="sm" color="red" variant="light">
                {unreadCount} new
              </Badge>
            )}
          </Group>

          {hasNotifications && (
            <ActionIcon variant="subtle" size="sm" onClick={clearAll} color="gray">
              <Icon icon="solar:trash-bin-trash-bold-duotone" width={16} />
            </ActionIcon>
          )}
        </Group>

        <Divider m={0} />

        {/* Filter Tabs - Horizontal Scroll */}
        {hasNotifications && (
          <ScrollArea style={{ borderBottom: `1px solid var(--mantine-color-default-border)` }} scrollbars="x">
            <Group gap={6} p={12} wrap="nowrap">
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
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <Icon icon={icon} width={11} />
                  <span>{label}</span>
                </UnstyledButton>
              ))}
            </Group>
          </ScrollArea>
        )}

        {/* THE FIX: ScrollArea.Autosize */}
        <ScrollArea.Autosize
          mah="clamp(250px, calc(100vh - 180px), 60vh)"
          offsetScrollbars
          scrollbarSize={8}
        >
          {filteredNotifications.length === 0 ? (
            <Stack align="center" justify="center" mih={200} p="xl" gap="xs">
              <Icon icon="solar:inbox-bold-duotone" width={40} color="var(--mantine-color-gray-4)" />
              <Text size="sm" c="dimmed" ta="center">
                {hasNotifications ? `No ${filter.toLowerCase()} notifications` : 'No notifications yet'}
              </Text>
            </Stack>
          ) : (
            <Stack gap="xs" p="md">
              {filteredNotifications.map((notification) => (
                <NotificationItem key={notification.id} notification={notification} />
              ))}
            </Stack>
          )}
        </ScrollArea.Autosize>

      </Popover.Dropdown>
    </Popover>
  )
}
