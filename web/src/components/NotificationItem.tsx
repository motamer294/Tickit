import { ActionIcon, Box, Group, Stack, Text, ThemeIcon, useMantineTheme, useMantineColorScheme } from '@mantine/core'
import { Icon } from '@iconify-icon/react'
import type { Notification, NotificationType } from '@/types/notification'
import { useNotifications } from '@/hooks/useNotifications'

interface NotificationItemProps {
  notification: Notification
}

const getTypeIcon = (type: NotificationType) => {
  const icons = {
    TICKET_ASSIGNED: 'mdi:briefcase-outline',
    TICKET_UPDATED: 'mdi:pencil-outline',
    COMMENT_ADDED: 'mdi:comment-outline',
    TICKET_RESOLVED: 'mdi:check-circle-outline',
    SYSTEM: 'mdi:bell-outline',
  }
  return icons[type] || 'mdi:notification-outline'
}

const getTypeColor = (type: NotificationType): string => {
  const colors = {
    TICKET_ASSIGNED: 'blue',
    TICKET_UPDATED: 'yellow',
    COMMENT_ADDED: 'violet',
    TICKET_RESOLVED: 'green',
    SYSTEM: 'red',
  }
  return colors[type] || 'gray'
}

const getTypeLabel = (type: NotificationType) => {
  const labels = {
    TICKET_ASSIGNED: 'Assigned',
    TICKET_UPDATED: 'Updated',
    COMMENT_ADDED: 'Comment',
    TICKET_RESOLVED: 'Resolved',
    SYSTEM: 'System',
  }
  return labels[type]
}

const formatTime = (date: Date) => {
  const now = new Date()
  const diffMs = now.getTime() - new Date(date).getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`

  return new Date(date).toLocaleDateString()
}

export const NotificationItem = ({ notification }: NotificationItemProps) => {
  const theme = useMantineTheme()
  const { colorScheme } = useMantineColorScheme()
  const isDark = colorScheme === 'dark'
  const { markAsRead, markAsUnread, deleteNotification } = useNotifications()

  const bgColor = isDark
    ? notification.read
      ? 'rgba(255, 255, 255, 0.02)'
      : 'rgba(255, 255, 255, 0.05)'
    : notification.read
      ? 'rgba(0, 0, 0, 0.01)'
      : 'rgba(0, 0, 0, 0.03)'

  const hoverBg = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)'

  const colorName = getTypeColor(notification.type)
  const borderColor = theme.colors[colorName]?.[6] || theme.colors.gray[6]

  const handleToggleRead = () => {
    if (notification.read) {
      markAsUnread(notification.id)
    } else {
      markAsRead(notification.id)
    }
  }

  return (
    <Box
      p="xs"
      style={{
        backgroundColor: bgColor,
        borderLeftWidth: '3px',
        borderLeftStyle: 'solid',
        borderLeftColor: borderColor,
        borderRadius: 'var(--mantine-radius-sm)',
        transition: 'background-color 200ms ease',
        cursor: 'default',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = hoverBg
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = bgColor
      }}
    >
      <Group justify="apart" gap={6}>
        <Group gap="xs" style={{ flex: 1 }}>
          <ThemeIcon
            variant="light"
            size="lg"
            color={getTypeColor(notification.type)}
            radius="md"
          >
            <Icon icon={getTypeIcon(notification.type)} width={18} height={18} />
          </ThemeIcon>

          <Stack gap={0} style={{ flex: 1 }}>
            <Group gap={6}>
              <Text size="sm" fw={600}>
                {notification.title}
              </Text>
              <Text
                size="xs"
                c="dimmed"
                style={{
                  backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                  padding: '2px 6px',
                  borderRadius: '4px',
                }}
              >
                {getTypeLabel(notification.type)}
              </Text>
            </Group>
            <Text size="sm" c="dimmed" style={{ marginTop: '2px' }}>
              {notification.message}
            </Text>
            <Text size="xs" c="dimmed" style={{ marginTop: '4px' }}>
              {formatTime(notification.createdAt)}
            </Text>
          </Stack>

          {!notification.read && (
            <Box
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: `var(--mantine-color-${getTypeColor(notification.type)}-6)`,
              }}
            />
          )}
        </Group>

        <Group gap={4}>
          <ActionIcon
            variant="subtle"
            color={notification.read ? 'gray' : 'blue'}
            size="sm"
            onClick={handleToggleRead}
            title={notification.read ? 'Mark as unread' : 'Mark as read'}
          >
            <Icon
              icon={notification.read ? 'mdi:envelope-open-outline' : 'mdi:email-outline'}
              width={16}
              height={16}
            />
          </ActionIcon>

          <ActionIcon
            variant="subtle"
            color="red"
            size="sm"
            onClick={() => deleteNotification(notification.id)}
            title="Delete notification"
          >
            <Icon icon="mdi:trash-outline" width={16} height={16} />
          </ActionIcon>
        </Group>
      </Group>
    </Box>
  )
}
