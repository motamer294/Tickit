import { useNotificationStore } from '@/store/notification.store'

/**
 * Global notification helper that replaces notifications.show()
 * Works with both old Mantine style and new CustomAlert style
 */
export const alertService = {
  show: ({
    title,
    message,
    color = 'info',
    type = 'SYSTEM',
  }: {
    title: string
    message: string
    color?: 'green' | 'red' | 'yellow' | 'blue' | 'info' | 'success' | 'error' | 'warning'
    type?: string
  }) => {
    // Map Mantine colors to CustomAlert variants
    const variantMap: Record<string, 'info' | 'success' | 'warning' | 'error'> = {
      green: 'success',
      red: 'error',
      yellow: 'warning',
      blue: 'info',
      info: 'info',
      success: 'success',
      error: 'error',
      warning: 'warning',
    }

    useNotificationStore.getState().addNotification({
      type: 'SYSTEM',
      title,
      message,
      isCustomAlert: true,
      alertVariant: variantMap[color],
      autoCloseDuration: 4000,
    })
  },

  success: (title: string, message: string) => {
    alertService.show({ title, message, color: 'green' })
  },

  error: (title: string, message: string) => {
    alertService.show({ title, message, color: 'red' })
  },

  warning: (title: string, message: string) => {
    alertService.show({ title, message, color: 'yellow' })
  },

  info: (title: string, message: string) => {
    alertService.show({ title, message, color: 'blue' })
  },
}
