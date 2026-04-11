import { ActionIcon, Box, Group, Stack, Text, ThemeIcon, useMantineTheme, useMantineColorScheme } from '@mantine/core'
import { Icon } from '@iconify-icon/react'
import type { Notification, NotificationType } from '@/types/notification'
import { useNotifications } from '@/hooks/useNotifications'

interface NotificationItemProps {
  notification: Notification
}

const getTypeIcon = (type: NotificationType) => {
  const icons = {
    TICKET_ASSIGNED: 'solar:briefcase-bold-duotone',
    TICKET_UPDATED: 'solar:pen-bold-duotone',
    COMMENT_ADDED: 'solar:chat-round-bold-duotone',
    TICKET_RESOLVED: 'solar:check-circle-bold-duotone',
    SYSTEM: 'solar:bell-bold-duotone',
  }
  return icons[type] || 'solar:notification-bold-duotone'
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

  const bgColor = notification.read
    ? 'transparent'
    : (isDark ? 'rgba(59, 130, 246, 0.12)' : 'rgba(59, 130, 246, 0.08)')

  const colorName = getTypeColor(notification.type)
  const borderColor = theme.colors[colorName]?.[6] || theme.colors.gray[6]

  const handleToggleRead = () => {
    if (notification.read) {
      markAsUnread(notification.id)
    } else {
      markAsRead(notification.id)
    }
  }

  const hoverBg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'

  return (
    <Box
      p="sm"
      style={{
        backgroundColor: bgColor,
        borderLeft: `3px solid ${borderColor}`,
        borderRadius: 'var(--mantine-radius-md)',
        transition: 'all 0.2s ease',
        cursor: 'default',
      }}
      onMouseEnter={(e) => {
        if (notification.read) {
          e.currentTarget.style.backgroundColor = hoverBg
        }
      }}
      onMouseLeave={(e) => {
        if (notification.read) {
          e.currentTarget.style.backgroundColor = 'transparent'
        }
      }}
    >
      <Group justify="apart" gap={8}>
        <Group gap={10} style={{ flex: 1 }}>
          <ThemeIcon
            variant="light"
            size="md"
            color={colorName}
            radius="md"
            style={{ flexShrink: 0 }}
          >
            <Icon icon={getTypeIcon(notification.type)} width={16} height={16} />
          </ThemeIcon>

          <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
            <Group gap={6} wrap="nowrap">
              <Text size="sm" fw={600} truncate>
                {notification.title}
              </Text>
              <Text
                size="xs"
                fw={500}
                c="white"
                style={{
                  padding: '3px 7px',
                  borderRadius: '4px',
                  backgroundColor: theme.colors[colorName]?.[6],
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                {getTypeLabel(notification.type)}
              </Text>
            </Group>
            <Text size="sm" c="dimmed" truncate style={{ lineHeight: 1.3 }}>
              {notification.message}
            </Text>
            <Text size="xs" c="dimmed">
              {formatTime(notification.createdAt)}
            </Text>
          </Stack>

          {!notification.read && (
            <Box
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: borderColor,
                flexShrink: 0,
              }}
            />
          )}
        </Group>

        <Group gap={2} style={{ flexShrink: 0 }}>
          <ActionIcon
            variant="subtle"
            color={notification.read ? 'gray' : colorName}
            size="xs"
            onClick={handleToggleRead}
            title={notification.read ? 'Mark as unread' : 'Mark as read'}
          >
            <Icon
              icon={notification.read ? 'solar:letter-opened-bold-duotone' : 'solar:letter-bold-duotone'}
              width={14}
            />
          </ActionIcon>

          <ActionIcon
            variant="subtle"
            color="red"
            size="xs"
            onClick={() => deleteNotification(notification.id)}
            title="Delete notification"
          >
            <Icon icon="solar:trash-bin-trash-bold-duotone" width={14} />
          </ActionIcon>
        </Group>
      </Group>
    </Box>
  )
}
