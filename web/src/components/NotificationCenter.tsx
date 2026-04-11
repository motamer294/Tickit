import {
  Popover,
  Group,
  Stack,
  Button,
  Text,
  Badge,
  ScrollArea,
  useMantineColorScheme,
  Box,
} from '@mantine/core'
import { Icon } from '@iconify-icon/react'
import { useState } from 'react'
import { useNotifications } from '@/hooks/useNotifications'
import { NotificationItem } from './NotificationItem'
import type { NotificationType } from '@/types/notification'

const NOTIFICATION_TYPES: Array<{ type: NotificationType | 'ALL'; label: string; icon: string }> = [
  { type: 'ALL', label: 'All', icon: 'mdi:layers-outline' },
  { type: 'TICKET_ASSIGNED', label: 'Assigned', icon: 'mdi:briefcase-outline' },
  { type: 'TICKET_UPDATED', label: 'Updated', icon: 'mdi:pencil-outline' },
  { type: 'COMMENT_ADDED', label: 'Comments', icon: 'mdi:comment-outline' },
  { type: 'TICKET_RESOLVED', label: 'Resolved', icon: 'mdi:check-circle-outline' },
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
        <Box
          component="button"
          onClick={() => setOpened(!opened)}
          style={{
            position: 'relative',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title="Notifications"
        >
          <Icon icon="mdi:bell-outline" width={24} height={24} />

          {unreadCount > 0 && (
            <Badge
              size="xs"
              circle
              color="red"
              style={{
                position: 'absolute',
                top: 0,
                right: 0,
              }}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Box>
      </Popover.Target>

      <Popover.Dropdown p="md" w={400}>
        <Stack gap="sm">
          {/* Header */}
          <Group justify="space-between" align="center">
            <Group gap={6}>
              <Icon icon="mdi:bell-outline" width={20} height={20} />
              <Text fw={600} size="md">
                Notifications
              </Text>
              {unreadCount > 0 && (
                <Badge size="sm" color="red">
                  {unreadCount} new
                </Badge>
              )}
            </Group>

            {hasNotifications && (
              <Button
                variant="subtle"
                size="xs"
                onClick={clearAll}
                title="Clear all notifications"
              >
                <Icon icon="mdi:trash-outline" width={14} height={14} />
              </Button>
            )}
          </Group>

          {/* Filter Tabs */}
          {hasNotifications && (
            <Group gap="xs" wrap="wrap">
              {NOTIFICATION_TYPES.map(({ type, label, icon }) => (
                <Button
                  key={type}
                  variant={filter === type ? 'filled' : 'light'}
                  size="xs"
                  leftSection={<Icon icon={icon} width={14} height={14} />}
                  onClick={() => setFilter(type)}
                >
                  {label}
                </Button>
              ))}
            </Group>
          )}

          {/* Notifications List */}
          <Box
            style={{
              borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
              paddingTop: '8px',
            }}
          >
            {filteredNotifications.length === 0 ? (
              <Stack align="center" justify="center" style={{ minHeight: '150px' }} gap="xs">
                <div style={{ opacity: 0.5 }}>
                  <Icon icon="mdi:inbox-outline" width={40} height={40} />
                </div>
                <Text size="sm" c="dimmed" ta="center">
                  {hasNotifications ? `No ${filter} notifications` : 'No notifications yet'}
                </Text>
              </Stack>
            ) : (
              <ScrollArea>
                <Stack gap="xs" style={{ maxHeight: '400px' }}>
                  {filteredNotifications.map((notification) => (
                    <NotificationItem key={notification.id} notification={notification} />
                  ))}
                </Stack>
              </ScrollArea>
            )}
          </Box>
        </Stack>
      </Popover.Dropdown>
    </Popover>
  )
}
