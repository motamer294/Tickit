import React, { createContext, useEffect, useState, useRef } from 'react'
import { useNotificationStore } from '@/store/notification.store'
import { useAuthStore } from '@/store/auth.store'
import { useQueryClient } from '@tanstack/react-query'
import { logger } from '@/utils/logger'

export interface WebSocketContextType {
  ws: WebSocket | null
  isConnected: boolean
}

export const WebSocketContext = createContext<WebSocketContextType>({
  ws: null,
  isConnected: false,
})

// ⚠️ useWebSocketContext moved to: hooks/useWebSocketContext.ts
// Import from: import { useWebSocketContext } from '@/hooks/useWebSocketContext'

interface WebSocketProviderProps {
  children: React.ReactNode
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ children }) => {
  const [ws, setWs] = useState<WebSocket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const [shouldConnect, setShouldConnect] = useState(false)
  const queryClient = useQueryClient()
  const addNotification = useNotificationStore((s) => s.addNotification)

  // Watch for token changes and trigger connection when token becomes available
  useEffect(() => {
    // Subscribe to all auth store changes
    const unsubscribe = useAuthStore.subscribe(
      (fullState) => {
        // This fires whenever auth state changes
        const token = fullState.accessToken
        console.log('[WebSocket] 👀 Auth store changed, token:', token ? '✅ present' : '❌ missing')
        if (token && !wsRef.current) {
          console.log('[WebSocket] ✅ Token is now available! Triggering connection attempt...')
          setShouldConnect(true)
        }
      }
    )

    // Check initial token on mount
    const initialToken = useAuthStore.getState().accessToken
    if (initialToken && !wsRef.current) {
      console.log('[WebSocket] ✅ Token available on mount, will connect')
      setShouldConnect(true)
    }

    return unsubscribe
  }, [])

  // Main WebSocket connection effect (triggered when token is available or reconnect flag changes)
  useEffect(() => {
    // Get current token
    const token = useAuthStore.getState().accessToken

    // If already connected or no token, skip
    if (wsRef.current || !token) {
      if (!token) {
        console.log('[WebSocket DEBUG] Skipping: Token status: ❌ missing')
      }
      // Reset flag even if skipping
      if (shouldConnect) {
        setShouldConnect(false)
      }
      return
    }

    console.log('[WebSocket DEBUG] Initiating connection (shouldConnect flag)')

    // Reset the flag
    setShouldConnect(false)

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const hostname = window.location.hostname
    const port = window.location.port

    console.log('[WebSocket DEBUG] Current port:', port, '| Protocol:', protocol)

    // Get WebSocket configuration from environment variables
    const configuredWsPort = import.meta.env.VITE_WS_PORT || import.meta.env.VITE_API_PORT || '8000'
    const configuredWsHost = import.meta.env.VITE_WS_HOST || hostname
    const devServerPorts = (import.meta.env.VITE_DEV_SERVER_PORTS || '5173,3000').split(',')

    // Determine WebSocket host
    let wsHost = window.location.host
    if (devServerPorts.includes(port)) {
      // Dev server detected - use configured backend
      wsHost = `${configuredWsHost}:${configuredWsPort}`
      console.log('[WebSocket DEBUG] Dev server detected, using configured backend at', wsHost)
    } else if (configuredWsPort !== '80' && configuredWsPort !== '443') {
      // Use configured port (if not standard HTTP/HTTPS)
      wsHost = `${configuredWsHost}:${configuredWsPort}`
    }

    const wsUrl = `${protocol}//${wsHost}/ws/unified/`
    console.log('[WebSocket DEBUG] Connecting to:', wsUrl)
    logger.info(`[WebSocket] Attempting connection to ${wsUrl}`)

    try {
      const newWs = new WebSocket(wsUrl)

      newWs.onopen = () => {
        console.log('[WebSocket DEBUG] onopen fired')
        logger.info('[WebSocket] ✅ Connected')
        setIsConnected(true)
        const message = {
          type: 'authenticate',
          token: token,
        }
        console.log('[WebSocket DEBUG] Sending auth message with token')
        logger.info('[WebSocket] Sending authentication')
        newWs.send(JSON.stringify(message))
      }

      newWs.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          console.log('📨 WebSocket message received:', data)

          // Handle authentication confirmation
          if (data.type === 'authenticated') {
            console.log(
              `✅ Authenticated as ${data.username} (${data.role})`,
            )
            return
          }

          // Handle notifications (ticket_created, ticket_updated, etc.)
          if (
            data.type === 'TICKET_CREATED' ||
            data.type === 'TICKET_UPDATED' ||
            data.type === 'TICKET_ASSIGNED' ||
            data.type === 'TICKET_RESOLVED' ||
            data.type === 'TICKET_DELETED' ||
            data.type === 'COMMENT_ADDED'
          ) {
            console.log('🔔 Notification received:', data.type)
            addNotification({
              type: data.type,
              title: data.title || 'Notification',
              message: data.message || '',
              relatedTo: data.ticket_id ? { ticketId: data.ticket_id } : undefined,
              data: data.data,
              isGlobal: data.isGlobal,
              fromUser: data.fromUser,
            })
            // Invalidate all ticket and dashboard queries to reflect changes
            // Invalidate all ticket-related queries
            queryClient.invalidateQueries({ queryKey: ['my-tickets'] })
            queryClient.invalidateQueries({ queryKey: ['tickets'], exact: false })  // Match ['tickets'], ['tickets', 'list'], etc.
            queryClient.invalidateQueries({ queryKey: ['ticket'], exact: false })   // Match ['ticket', id]
            queryClient.invalidateQueries({ queryKey: ['analytics-dashboard'] })
            queryClient.invalidateQueries({ queryKey: ['employee', 'tasks'], exact: false })
            // Also invalidate specific ticket if available
            if (data.ticket_id) {
              queryClient.invalidateQueries({
                queryKey: ['ticket', data.ticket_id],
              })
            }
            return
          }

          // Handle real-time data changes (triggers React Query invalidation)
          if (data.type === 'data_changed') {
            // Invalidate all ticket-related queries
            queryClient.invalidateQueries({ queryKey: ['my-tickets'] })
            queryClient.invalidateQueries({ queryKey: ['employee', 'tasks'], exact: false })
            queryClient.invalidateQueries({ queryKey: ['tickets'], exact: false })    // Dashboard & all ticket queries
            queryClient.invalidateQueries({ queryKey: ['ticket'], exact: false })     // Specific ticket details
            queryClient.invalidateQueries({ queryKey: ['analytics-dashboard'] })      // Manager analytics

            if (data.ticketId) {
              queryClient.invalidateQueries({
                queryKey: ['ticket', data.ticketId],
              })
              // Special handling for comments - ensure comments list is refetched
              if (data.event === 'comment_added') {
                queryClient.invalidateQueries({
                  queryKey: ['ticket-comments', data.ticketId],
                })
                queryClient.invalidateQueries({
                  queryKey: ['comments', 'list', data.ticketId],
                })
              }
            }
            return
          }

          // Handle chat messages
          if (data.type === 'chat_message') {
            console.log('💬 Chat message received:', data)
            // ✅ Normalize message format (backend sends nested sender, frontend expects flat)
            const normalizedMessage = {
              ...data,
              sender_id: data.sender?.id || data.sender_id,
              sender_username: data.sender?.username || data.sender_username,
            }
            // Dispatch to listeners via custom event
            const event = new CustomEvent('ws_chat_message', { detail: normalizedMessage })
            window.dispatchEvent(event)
            return
          }

          // Handle pong response
          if (data.type === 'pong') {
            console.log('💓 Pong received (connection alive)')
            return
          }
        } catch (error) {
          console.error('❌ Error parsing WebSocket message:', error)
        }
      }

      newWs.onclose = () => {
        logger.warn('[WebSocket] ❌ Connection closed')
        setIsConnected(false)
        wsRef.current = null
        // Attempt reconnect after 3 seconds
        setTimeout(() => {
          if (!wsRef.current) {
            logger.debug('[WebSocket] Attempting reconnect...')
            // Trigger reconnection by recreating
          }
        }, 3000)
      }

      newWs.onerror = (error) => {
        console.error('[WebSocket DEBUG] onerror fired:', error)
        console.error('[WebSocket DEBUG] readyState:', newWs.readyState)
        console.error('[WebSocket DEBUG] url:', newWs.url)
        logger.error('[WebSocket] ❌ Connection error:', error)
        console.error('[WebSocket] Error details:', error)
        setIsConnected(false)
      }

      wsRef.current = newWs
      setWs(newWs)
    } catch (error) {
      logger.error('Failed to create WebSocket', error)
      setIsConnected(false)
    }

    return () => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close()
      }
    }
  }, [addNotification, queryClient, shouldConnect]) // ✅ Added shouldConnect to trigger reconnection

  // Automatic reconnection when connection drops
  useEffect(() => {
    const token = useAuthStore.getState().accessToken
    if (!isConnected && token && !wsRef.current) {
      const timer = setTimeout(() => {
        console.log('[WebSocket] Reconnecting after disconnect...')
        setShouldConnect(true)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [isConnected])

  return (
    <WebSocketContext.Provider value={{ ws, isConnected }}>
      {children}
    </WebSocketContext.Provider>
  )
}
