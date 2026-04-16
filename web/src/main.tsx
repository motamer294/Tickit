import ReactDOM from 'react-dom/client'
import React from 'react'
import { BrowserRouter } from 'react-router-dom'
import '@mantine/core/styles.css'
import '@/styles/global.css'
import App from '@/App'
import { createApiClient } from '@/api/config'
import { useAuthStore } from '@/store/auth.store'
import { validateTokenApi } from '@/api/auth.api'
import { fetchNotifications } from '@/api/tickets.api'
import { useNotificationStore } from '@/store/notification.store'

// Initialize API client with DYNAMIC token getter
// Important: Don't capture store reference - always get fresh state!
createApiClient(
  () => useAuthStore.getState().accessToken,
  () => useAuthStore.getState().logout(),
)

// Validate stored token on startup
const initializeAuth = async () => {
  try {
    const token = useAuthStore.getState().accessToken
    if (token) {
      const result = await validateTokenApi(token)
      if (!result.valid) {
        // Token is invalid, logout the user
        useAuthStore.getState().logout()
        return
      }

      // Token is valid - load initial notifications
      try {
        const notifications = await fetchNotifications(20)
        if (notifications.length > 0) {
          const notificationStore = useNotificationStore.getState()
          notifications.forEach((notif) => {
            notificationStore.addNotification({
              type: notif.type as any,  // ✅ Cast to avoid type mismatch
              title: notif.title,
              message: notif.message,
              relatedTo: notif.ticket_id ? { ticketId: notif.ticket_id } : undefined,
              isGlobal: false,
            })
          })
          console.log(`✅ Loaded ${notifications.length} notifications from server`)
        }
      } catch (notificationError) {
        console.warn('Failed to load initial notifications:', notificationError)
        // Don't fail app startup if notifications fail
      }
    }
  } catch (error) {
    // On any error, treat as invalid token
    useAuthStore.getState().logout()
  }
}

// Run initialization before rendering
initializeAuth().finally(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </React.StrictMode>,
  )
})

