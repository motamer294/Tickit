import { useCallback } from 'react'
import { useNotificationStore } from '@/store/notification.store'

type NotificationType = 'success' | 'error' | 'warning' | 'info'

export const useCustomNotification = () => {
  const addNotification = useNotificationStore((s) => s.addNotification)

  const show = useCallback(
    ({
      title,
      message,
      type = 'info',
      duration = 4000,
    }: {
      title: string
      message: string
      type?: NotificationType
      duration?: number
    }) => {
      addNotification({
        type: 'SYSTEM',
        title,
        message,
        isCustomAlert: true,
        alertVariant: type as any,
        autoCloseDuration: duration,
      })
    },
    [addNotification],
  )

  return { show }
}

// Convenience wrapper to replace notifications.show()
export const customNotification = {
  success: (title: string, message: string) =>
    useNotificationStore.getState().addNotification({
      type: 'SYSTEM',
      title,
      message,
      isCustomAlert: true,
      alertVariant: 'success',
    }),

  error: (title: string, message: string) =>
    useNotificationStore.getState().addNotification({
      type: 'SYSTEM',
      title,
      message,
      isCustomAlert: true,
      alertVariant: 'error',
    }),

  warning: (title: string, message: string) =>
    useNotificationStore.getState().addNotification({
      type: 'SYSTEM',
      title,
      message,
      isCustomAlert: true,
      alertVariant: 'warning',
    }),

  info: (title: string, message: string) =>
    useNotificationStore.getState().addNotification({
      type: 'SYSTEM',
      title,
      message,
      isCustomAlert: true,
      alertVariant: 'info',
    }),
}
