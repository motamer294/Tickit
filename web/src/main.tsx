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
import { logger } from '@/utils/logger'

// Initialize API client with DYNAMIC token getter
// Important: Don't capture store reference - always get fresh state!
createApiClient(
  () => useAuthStore.getState().accessToken,
  () => useAuthStore.getState().logout(),
)

// Validate stored token on startup
const initializeAuth = async () => {
  logger.debug('[INIT] Starting authentication initialization')
  useAuthStore.getState().setLoading(true)
  logger.debug('[INIT] Set isLoading=true')

  try {
    const token = useAuthStore.getState().accessToken
    logger.debug('[INIT] Retrieved token from store:', token ? `${token.substring(0, 20)}...` : 'NO TOKEN')

    if (token) {
      logger.debug('[INIT] Token found, validating...')
      const result = await validateTokenApi(token)
      logger.debug('[INIT] Validation result:', result)

      if (!result.valid) {
        logger.debug('[INIT] Token invalid, logging out')
        useAuthStore.getState().logout()
        return
      }

      logger.debug('[INIT] Token valid! Loading notifications...')
      try {
        const notifications = await fetchNotifications(20)
        if (notifications.length > 0) {
          const notificationStore = useNotificationStore.getState()
          notifications.forEach((notif) => {
            notificationStore.addNotification({
              type: notif.type,
              title: notif.title,
              message: notif.message,
              relatedTo: notif.ticket_id ? { ticketId: notif.ticket_id } : undefined,
              isGlobal: false,
            })
          })
          logger.debug(`Loaded ${notifications.length} notifications from server`)
        }
      } catch (notificationError) {
        logger.warn('Failed to load initial notifications:', notificationError)
      }
    } else {
      logger.debug('[INIT] No token found in store, user will see login page')
    }
  } catch (error) {
    logger.error('[INIT] Error during initialization:', error)
    useAuthStore.getState().logout()
  } finally {
    useAuthStore.getState().setLoading(false)
    logger.debug('[INIT] Set isLoading=false, app ready to render')
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
