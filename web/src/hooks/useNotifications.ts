import { useNotificationStore } from '@/store/notification.store'

/**
 * useNotifications: Access and manage notifications
 */
export const useNotifications = () => {
  const notifications = useNotificationStore((s) => s.notifications)
  const addNotification = useNotificationStore((s) => s.addNotification)
  const markAsRead = useNotificationStore((s) => s.markAsRead)
  const markAsUnread = useNotificationStore((s) => s.markAsUnread)
  const deleteNotification = useNotificationStore((s) => s.deleteNotification)
  const clearAll = useNotificationStore((s) => s.clearAll)
  const getUnreadCount = useNotificationStore((s) => s.getUnreadCount)
  const getByType = useNotificationStore((s) => s.getByType)

  return {
    notifications,
    addNotification,
    markAsRead,
    markAsUnread,
    deleteNotification,
    clearAll,
    getUnreadCount,
    getByType,
    unreadCount: getUnreadCount(),
  }
}

/**
 * Utility to create and send notifications
 */
export const notificationService = {
  ticketAssigned: (ticketId: number, ticketTitle: string) => {
    useNotificationStore.getState().addNotification({
      type: 'TICKET_ASSIGNED',
      title: 'Ticket Assigned',
      message: `You have been assigned: ${ticketTitle}`,
      relatedTo: { ticketId },
      actionUrl: `/app/tickets/${ticketId}`,
    })
  },

  ticketUpdated: (ticketId: number, ticketTitle: string, change: string) => {
    useNotificationStore.getState().addNotification({
      type: 'TICKET_UPDATED',
      title: 'Ticket Updated',
      message: `${ticketTitle} - ${change}`,
      relatedTo: { ticketId },
      actionUrl: `/app/tickets/${ticketId}`,
    })
  },

  commentAdded: (ticketId: number, ticketTitle: string, author: string) => {
    useNotificationStore.getState().addNotification({
      type: 'COMMENT_ADDED',
      title: 'New Comment',
      message: `${author} commented on ${ticketTitle}`,
      relatedTo: { ticketId },
      actionUrl: `/app/tickets/${ticketId}`,
    })
  },

  ticketResolved: (ticketId: number, ticketTitle: string) => {
    useNotificationStore.getState().addNotification({
      type: 'TICKET_RESOLVED',
      title: 'Ticket Resolved',
      message: `${ticketTitle} has been resolved`,
      relatedTo: { ticketId },
      actionUrl: `/app/tickets/${ticketId}`,
    })
  },

  system: (message: string) => {
    useNotificationStore.getState().addNotification({
      type: 'SYSTEM',
      title: 'System',
      message,
    })
  },
}
