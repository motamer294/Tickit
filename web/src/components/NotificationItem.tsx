import { ActionIcon, Box, Group, Stack, Text, ThemeIcon, useMantineTheme, useMantineColorScheme, Badge, Tooltip } from '@mantine/core'
import { Icon } from '@iconify-icon/react'
import type { Notification, NotificationType } from '@/types/notification'
import { useNotifications } from '@/hooks/useNotifications'

interface NotificationItemProps {
  notification: Notification
}

const getTypeIcon = (type: NotificationType) => {
  const icons: Record<NotificationType, string> = {
    TICKET_ASSIGNED: 'solar:briefcase-bold-duotone',
    TICKET_UPDATED: 'solar:pen-bold-duotone',
    COMMENT_ADDED: 'solar:chat-round-bold-duotone',
    TICKET_RESOLVED: 'solar:check-circle-bold-duotone',
    TICKET_DELETED: 'solar:trash-bin-trash-bold-duotone',
    TICKET_CREATED: 'solar:document-add-bold-duotone',
    MANAGER_ACTIVITY: 'solar:pulse-bold-duotone',
    PERFORMANCE_ALERT: 'solar:graph-bold-duotone',
    SYSTEM: 'solar:bell-bold-duotone',
  }
  return icons[type] || 'solar:notification-bold-duotone'
}

const getTypeColor = (type: NotificationType): string => {
  const colors: Record<NotificationType, string> = {
    TICKET_ASSIGNED: 'blue',
    TICKET_UPDATED: 'yellow',
    COMMENT_ADDED: 'violet',
    TICKET_RESOLVED: 'green',
    TICKET_DELETED: 'red',
    TICKET_CREATED: 'cyan',
    MANAGER_ACTIVITY: 'indigo',
    PERFORMANCE_ALERT: 'orange',
    SYSTEM: 'red',
  }
  return colors[type] || 'gray'
}

const getTypeLabel = (type: NotificationType) => {
  const labels: Record<NotificationType, string> = {
    TICKET_ASSIGNED: 'Assigned',
    TICKET_UPDATED: 'Updated',
    COMMENT_ADDED: 'Comment',
    TICKET_RESOLVED: 'Resolved',
    TICKET_DELETED: 'Deleted',
    TICKET_CREATED: 'Created',
    MANAGER_ACTIVITY: 'Activity',
    PERFORMANCE_ALERT: 'Alert',
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
      p="md"
      style={{
        backgroundColor: notification.read
          ? 'transparent'
          : (isDark ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.1)'),
        borderLeft: `4px solid ${borderColor}`,
        borderRadius: '8px',
        transition: 'all 0.2s ease',
        cursor: 'default',
        position: 'relative',
        overflow: 'hidden',
        width: '100%',
        boxSizing: 'border-box',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = isDark
          ? 'rgba(59, 130, 246, 0.2)'
          : 'rgba(59, 130, 246, 0.12)'
        e.currentTarget.style.transform = 'translateX(4px)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = notification.read
          ? 'transparent'
          : (isDark ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.1)')
        e.currentTarget.style.transform = 'translateX(0)'
      }}
    >
      {/* Unread indicator dot */}
      {!notification.read && (
        <div
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: theme.colors.blue[6],
            animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
          }}
        />
      )}

      <Group justify="apart" gap={8} wrap="nowrap" style={{ overflow: 'hidden' }}>
        <Group gap={12} style={{ flex: 1, overflow: 'hidden', minWidth: 0 }}>
          <ThemeIcon
            variant="light"
            size="lg"
            color={colorName}
            radius="8px"
            style={{ flexShrink: 0 }}
          >
            <Icon icon={getTypeIcon(notification.type)} width={18} height={18} />
          </ThemeIcon>

          <Stack gap={5} style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
            <Group gap={8} wrap="nowrap">
              <Text size="sm" fw={600} truncate style={{ lineHeight: 1.2 }}>
                {notification.title}
              </Text>
              <Badge
                size="xs"
                color={colorName}
                variant="dot"
                style={{
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                {getTypeLabel(notification.type)}
              </Badge>
            </Group>

            {notification.fromUser && (
              <Text size="xs" c="blue" fw={500} truncate>
                👤 {notification.fromUser.username}
              </Text>
            )}

            {notification.ticketId && (
              <Text size="xs" c="dimmed" fw={500} truncate>
                🎫 Ticket #{notification.ticketId}
              </Text>
            )}

            <Text size="sm" c="dimmed" truncate style={{ lineHeight: 1.4 }}>
              {notification.message}
            </Text>

            <Text size="xs" c="dimmed" fw={400}>
              {formatTime(notification.createdAt || new Date())}
            </Text>
          </Stack>
        </Group>

        {/* Action buttons */}
        <Group gap={4} style={{ flexShrink: 0 }}>
          <Tooltip label={notification.read ? 'Mark as unread' : 'Mark as read'} withArrow>
            <ActionIcon
              variant="light"
              size="lg"
              onClick={handleToggleRead}
              color="blue"
              title={notification.read ? 'Mark as unread' : 'Mark as read'}
              style={{
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.1)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            >
              <Icon
                icon={notification.read ? 'solar:mailbox-bold-duotone' : 'solar:mailbox-opened-bold-duotone'}
                width={18}
              />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Delete" withArrow>
            <ActionIcon
              variant="light"
              size="lg"
              onClick={() => deleteNotification(notification.id)}
              color="red"
              title="Delete"
              style={{
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.1)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            >
              <Icon icon="solar:trash-bin-minimalistic-bold-duotone" width={18} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Group>
    </Box>
  )
}
