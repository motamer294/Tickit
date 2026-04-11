export type NotificationType = 'TICKET_ASSIGNED' | 'TICKET_UPDATED' | 'COMMENT_ADDED' | 'TICKET_RESOLVED' | 'SYSTEM'

export interface Notification {
  id: string
  type: NotificationType
  title: string
  message: string
  relatedTo?: {
    ticketId?: number
    userId?: number
  }
  read: boolean
  createdAt: Date
  actionUrl?: string
}

export interface NotificationState {
  notifications: Notification[]
  
  // Actions
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt' | 'read'>) => void
  markAsRead: (id: string) => void
  markAsUnread: (id: string) => void
  deleteNotification: (id: string) => void
  clearAll: () => void
  
  // Queries
  getUnreadCount: () => number
  getByType: (type: NotificationType) => Notification[]
}
