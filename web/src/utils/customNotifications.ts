import { useNotificationStore } from '@/store/notification.store'

// ─── Color → variant map ───────────────────────────────────────────────────────
// Covers every color string used across the codebase

const COLOR_MAP: Record<string, 'info' | 'success' | 'warning' | 'error'> = {
  // Mantine color names
  green:  'success',
  teal:   'success',   // used in old onSuccess callbacks
  lime:   'success',
  red:    'error',
  pink:   'error',
  orange: 'warning',
  yellow: 'warning',
  amber:  'warning',
  blue:   'info',
  indigo: 'info',
  cyan:   'info',
  violet: 'info',
  purple: 'info',
  grape:  'info',
  gray:   'info',
  dark:   'info',
  // Semantic aliases (already-correct values pass through)
  success: 'success',
  error:   'error',
  warning: 'warning',
  info:    'info',
}

function toVariant(color?: string): 'info' | 'success' | 'warning' | 'error' {
  return COLOR_MAP[color ?? 'info'] ?? 'info'
}

// ─── Drop-in replacement for Mantine's notifications object ───────────────────
//
// Import this instead of '@mantine/notifications':
//   import { notifications } from '@/utils/customNotifications'
//
// The API is identical to Mantine's notifications.show() so no call sites
// need changing beyond the import.

export const notifications = {
  show({
    title,
    message,
    color,
    autoClose = 4000,
  }: {
    title?: string
    message?: string
    color?: string
    icon?: React.ReactNode      // accepted but ignored — icon is derived from variant
    autoClose?: number | false
    [key: string]: unknown
  }) {
    useNotificationStore.getState().addNotification({
      type:              'SYSTEM',
      title:             title   ?? 'Notification',
      message:           message ?? '',
      isCustomAlert:     true,
      alertVariant:      toVariant(color),
      autoCloseDuration: autoClose === false ? 999_999 : (autoClose as number),
    })
  },

  // Convenience shortcuts
  hide:   (_id?: string) => { /* no-op — toasts auto-dismiss */ },
  update: (_payload: unknown) => { /* no-op */ },
  clean:  () => { /* no-op */ },
}

// ─── alertService (legacy helper — same behaviour) ────────────────────────────

export const alertService = {
  show({
    title,
    message,
    color = 'info',
  }: {
    title:    string
    message:  string
    color?:   string
    type?:    string
  }) {
    notifications.show({ title, message, color })
  },
  success: (title: string, message: string) => notifications.show({ title, message, color: 'green'  }),
  error:   (title: string, message: string) => notifications.show({ title, message, color: 'red'    }),
  warning: (title: string, message: string) => notifications.show({ title, message, color: 'yellow' }),
  info:    (title: string, message: string) => notifications.show({ title, message, color: 'blue'   }),
}

// ─── customNotification (static helpers — safe outside React) ─────────────────

export const customNotification = {
  success: (title: string, message: string) => alertService.success(title, message),
  error:   (title: string, message: string) => alertService.error(title, message),
  warning: (title: string, message: string) => alertService.warning(title, message),
  info:    (title: string, message: string) => alertService.info(title, message),
}

// ─── useCustomNotification (React hook) ───────────────────────────────────────

import { useCallback } from 'react'

export const useCustomNotification = () => {
  const addNotification = useNotificationStore(s => s.addNotification)

  const show = useCallback(({
    title,
    message,
    type = 'info',
    duration = 4000,
  }: {
    title:    string
    message:  string
    type?:    'success' | 'error' | 'warning' | 'info'
    duration?: number
  }) => {
    addNotification({
      type:              'SYSTEM',
      title,
      message,
      isCustomAlert:     true,
      alertVariant:      type,
      autoCloseDuration: duration,
    })
  }, [addNotification])

  return { show }
}
