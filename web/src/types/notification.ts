export type NotificationType = 
  | 'TICKET_ASSIGNED' 
  | 'TICKET_UPDATED' 
  | 'COMMENT_ADDED' 
  | 'TICKET_RESOLVED' 
  | 'TICKET_DELETED'
  | 'SYSTEM'

export interface Notification {
  id: string
  type: NotificationType
  title: string
  message: string
  ticketId?: number
  relatedTo?: {
    ticketId?: number
    userId?: number
  }
  data?: Record<string, any>
  read: boolean
  createdAt: Date
  actionUrl?: string
  isGlobal?: boolean  // Global notifications for managers
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
