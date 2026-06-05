import { ActionIcon, Box, Group, Stack, Text, Tooltip, useMantineColorScheme } from '@mantine/core'
import { Icon } from '@iconify-icon/react'
import type { Notification, NotificationType } from '@/types/notification'
import { useNotifications } from '@/hooks/useNotifications'

// ─── Brand palette ─────────────────────────────────────────────────────────────

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
  blue:        '#378ADD',
  blueLight:   '#E6F1FB',
  blueText:    '#0C447C',
  teal:        '#0E9E8E',
  tealLight:   '#E0F5F3',
  tealText:    '#065F57',
  cyan:        '#1EA8BF',
  cyanLight:   '#E2F6FA',
  cyanText:    '#0B5F6E',
  orange:      '#E87B23',
  orangeLight: '#FDF0E4',
  orangeText:  '#7A3A05',
  gray:        '#B4B2A9',
  grayLight:   '#F1EFE8',
  grayText:    '#444441',
}

// ─── Type metadata ─────────────────────────────────────────────────────────────

const TYPE_META: Record<
  NotificationType,
  {
    label: string;
    icon: string;
    dot: string;
    bg: string;
    text: string;
    iconBg: string;
  }
> = {
  TICKET_ASSIGNED: {
    label: "Assigned",
    icon: "si:briefcase-detailed-duotone",
    dot: BRAND.purple,
    bg: BRAND.purpleLight,
    text: BRAND.purpleText,
    iconBg: BRAND.purpleLight,
  },
  TICKET_UPDATED: {
    label: "Updated",
    icon: "solar:pen-bold-duotone",
    dot: BRAND.amber,
    bg: BRAND.amberLight,
    text: BRAND.amberText,
    iconBg: BRAND.amberLight,
  },
  COMMENT_ADDED: {
    label: "Comment",
    icon: "solar:chat-round-dots-bold-duotone",
    dot: BRAND.blue,
    bg: BRAND.blueLight,
    text: BRAND.blueText,
    iconBg: BRAND.blueLight,
  },
  TICKET_RESOLVED: {
    label: "Resolved",
    icon: "solar:check-circle-bold-duotone",
    dot: BRAND.green,
    bg: BRAND.greenLight,
    text: BRAND.greenText,
    iconBg: BRAND.greenLight,
  },
  TICKET_DELETED: {
    label: "Deleted",
    icon: "solar:trash-bin-trash-bold-duotone",
    dot: BRAND.red,
    bg: BRAND.redLight,
    text: BRAND.redText,
    iconBg: BRAND.redLight,
  },
  TICKET_CREATED: {
    label: "Created",
    icon: "solar:document-add-bold-duotone",
    dot: BRAND.teal,
    bg: BRAND.tealLight,
    text: BRAND.tealText,
    iconBg: BRAND.tealLight,
  },
  MANAGER_ACTIVITY: {
    label: "Activity",
    icon: "solar:pulse-bold-duotone",
    dot: BRAND.cyan,
    bg: BRAND.cyanLight,
    text: BRAND.cyanText,
    iconBg: BRAND.cyanLight,
  },
  PERFORMANCE_ALERT: {
    label: "Alert",
    icon: "solar:graph-bold-duotone",
    dot: BRAND.orange,
    bg: BRAND.orangeLight,
    text: BRAND.orangeText,
    iconBg: BRAND.orangeLight,
  },
  SYSTEM: {
    label: "System",
    icon: "solar:bell-bold-duotone",
    dot: BRAND.red,
    bg: BRAND.redLight,
    text: BRAND.redText,
    iconBg: BRAND.redLight,
  },
};

const DEFAULT_META = TYPE_META.SYSTEM

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(date: Date): string {
  const diffMs   = Date.now() - new Date(date).getTime()
  const diffMins  = Math.floor(diffMs / 60_000)
  const diffHours = Math.floor(diffMs / 3_600_000)
  const diffDays  = Math.floor(diffMs / 86_400_000)
  if (diffMins  < 1)  return 'just now'
  if (diffMins  < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays  < 7)  return `${diffDays}d ago`
  return new Date(date).toLocaleDateString()
}

// ─── Component ─────────────────────────────────────────────────────────────────

interface NotificationItemProps {
  notification: Notification
}

export const NotificationItem = ({ notification }: NotificationItemProps) => {
  const { colorScheme } = useMantineColorScheme()
  const isDark = colorScheme === 'dark'
  const { markAsRead, markAsUnread, deleteNotification } = useNotifications()
  const meta = TYPE_META[notification.type] ?? DEFAULT_META

  const unreadBg = isDark ? 'rgba(127,119,221,0.12)' : BRAND.purpleLight + '88'

  const handleToggleRead = () =>
    notification.read ? markAsUnread(notification.id) : markAsRead(notification.id)

  return (
    <Box
      p="sm"
      style={{
        position: 'relative',
        borderRadius: 10,
        border: `0.5px solid ${notification.read ? 'var(--mantine-color-default-border)' : meta.dot + '44'}`,
        background: notification.read ? 'transparent' : unreadBg,
        borderLeft: `3px solid ${notification.read ? 'var(--mantine-color-default-border)' : meta.dot}`,
        transition: 'background .15s, transform .15s',
        cursor: 'default',
        overflow: 'hidden',
      }}
      onMouseEnter={(e) => {
        ;(e.currentTarget as HTMLDivElement).style.background =
          isDark ? 'rgba(127,119,221,0.15)' : BRAND.purpleLight + 'BB'
        ;(e.currentTarget as HTMLDivElement).style.transform = 'translateX(2px)'
      }}
      onMouseLeave={(e) => {
        ;(e.currentTarget as HTMLDivElement).style.background = notification.read
          ? 'transparent'
          : unreadBg
        ;(e.currentTarget as HTMLDivElement).style.transform = 'translateX(0)'
      }}
    >
      {/* Unread dot */}
      {!notification.read && (
        <Box
          style={{
            position: 'absolute',
            top: 10,
            right: 10,
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: BRAND.purple,
            boxShadow: `0 0 0 2px ${BRAND.purpleLight}`,
          }}
        />
      )}

      <Group gap={10} wrap="nowrap" align="flex-start">
        {/* Type icon */}
        <Box
          style={{
            width: 34,
            height: 34,
            borderRadius: 9,
            background: meta.iconBg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Icon icon={meta.icon} width={16} style={{ color: meta.dot }} />
        </Box>

        {/* Content */}
        <Stack gap={3} style={{ flex: 1, minWidth: 0 }}>
          {/* Title + type badge */}
          <Group gap={6} wrap="nowrap" align="center">
            <Text
              size="xs"
              fw={notification.read ? 500 : 600}
              truncate
              style={{ lineHeight: 1.3, flex: 1, minWidth: 0 }}
            >
              {notification.title}
            </Text>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 3,
                fontSize: 10,
                fontWeight: 600,
                padding: '2px 7px',
                borderRadius: 20,
                background: meta.bg,
                color: meta.text,
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              <span style={{ width: 4, height: 4, borderRadius: '50%', background: meta.dot }} />
              {meta.label}
            </span>
          </Group>

          {/* From user */}
          {notification.fromUser && (
            <Group gap={4} wrap="nowrap">
              <Icon icon="solar:user-linear" width={10} style={{ color: 'var(--mantine-color-dimmed)', flexShrink: 0 }} />
              <Text size="xs" c="dimmed" fw={500} truncate>
                {notification.fromUser.username}
              </Text>
            </Group>
          )}

          {/* Ticket ref */}
          {notification.ticketId && (
            <Group gap={4} wrap="nowrap">
              <Icon icon="solar:ticket-linear" width={10} style={{ color: 'var(--mantine-color-dimmed)', flexShrink: 0 }} />
              <Text size="xs" c="dimmed" truncate>
                Ticket #{notification.ticketId}
              </Text>
            </Group>
          )}

          {/* Message */}
          <Text
            size="xs"
            c="dimmed"
            truncate
            style={{ lineHeight: 1.4 }}
          >
            {notification.message}
          </Text>

          {/* Timestamp + actions in one row */}
          <Group justify="space-between" align="center" mt={2}>
            <Text size="xs" style={{ color: 'var(--mantine-color-dimmed)', opacity: 0.7, fontSize: 10 }}>
              {formatTime(notification.createdAt ?? new Date())}
            </Text>
            <Group gap={2}>
              <Tooltip
                label={notification.read ? 'Mark as unread' : 'Mark as read'}
                withArrow
                fz={10}
                position="top"
              >
                <ActionIcon
                  variant="subtle"
                  size="xs"
                  style={{ color: BRAND.purpleDark }}
                  onClick={handleToggleRead}
                >
                  <Icon
                    icon={notification.read
                      ? 'solar:letter-bold-duotone'
                      : 'solar:letter-opened-bold-duotone'}
                    width={13}
                  />
                </ActionIcon>
              </Tooltip>
              <Tooltip label="Delete" withArrow fz={10} position="top">
                <ActionIcon
                  variant="subtle"
                  size="xs"
                  style={{ color: BRAND.red }}
                  onClick={() => deleteNotification(notification.id)}
                >
                  <Icon icon="solar:trash-bin-2-linear" width={13} />
                </ActionIcon>
              </Tooltip>
            </Group>
          </Group>
        </Stack>
      </Group>
    </Box>
  )
}
