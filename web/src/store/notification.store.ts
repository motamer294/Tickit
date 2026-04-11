import { create } from 'zustand'
import type { Notification, NotificationType, NotificationState } from '@/types/notification'

/**
 * Notifications Store
 * Manages in-memory notifications state (session-only)
 * No persistence to localStorage
 */
export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],

  // Add new notification
  addNotification: (notification) => {
    const newNotification: Notification = {
      ...notification,
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      read: false,
    }

    set((state) => ({
      notifications: [newNotification, ...state.notifications],
    }))

    // Auto-dismiss after 10 seconds if unread
    setTimeout(() => {
      const current = get().notifications.find((n) => n.id === newNotification.id)
      if (current && !current.read) {
        get().markAsRead(newNotification.id)
      }
    }, 10000)
  },

  // Mark notification as read
  markAsRead: (id) => {
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n,
      ),
    }))
  },

  // Mark notification as unread
  markAsUnread: (id) => {
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read: false } : n,
      ),
    }))
  },

  // Delete notification
  deleteNotification: (id) => {
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    }))
  },

  // Clear all notifications
  clearAll: () => {
    set({ notifications: [] })
  },

  // Get unread count
  getUnreadCount: () => {
    return get().notifications.filter((n) => !n.read).length
  },

  // Get notifications by type
  getByType: (type: NotificationType) => {
    return get().notifications.filter((n) => n.type === type)
  },
}))
