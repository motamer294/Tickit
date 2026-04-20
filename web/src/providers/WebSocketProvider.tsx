import React, { createContext, useEffect, useState, useRef } from 'react'
import { useNotificationStore } from '@/store/notification.store'
import { useAuthStore } from '@/store/auth.store'
import { useQueryClient } from '@tanstack/react-query'
import { logger } from '@/utils/logger'
import { usePollingFallback } from '@/hooks/usePollingFallback'

export interface WebSocketContextType {
  ws: WebSocket | null
  isConnected: boolean
  isPollingFallback: boolean
  enablePollingFallback: () => void
  disablePollingFallback: () => void
}

export const WebSocketContext = createContext<WebSocketContextType>({
  ws: null,
  isConnected: false,
  isPollingFallback: false,
  enablePollingFallback: () => {},
  disablePollingFallback: () => {},
})

// ⚠️ useWebSocketContext moved to: hooks/useWebSocketContext.ts
// Import from: import { useWebSocketContext } from '@/hooks/useWebSocketContext'

interface WebSocketProviderProps {
  children: React.ReactNode
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ children }) => {
  const [ws, setWs] = useState<WebSocket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isPollingFallback, setIsPollingFallback] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const [shouldConnect, setShouldConnect] = useState(false)
  const queryClient = useQueryClient()
  const addNotification = useNotificationStore((s) => s.addNotification)

  // Watch for token changes and trigger connection when token becomes available
  useEffect(() => {
    let mounted = true;

    // Subscribe to all auth store changes
    const unsubscribe = useAuthStore.subscribe(
      (fullState) => {
        // This fires whenever auth state changes
        const token = fullState.accessToken
        console.log('[WebSocket] 👀 Auth store changed, token:', token ? '✅ present' : '❌ missing')
        if (token && !wsRef.current && mounted) {
          console.log('[WebSocket] ✅ Token is now available! Triggering connection attempt...')
          setShouldConnect(true)
        }
      }
    )

    // Check initial token on mount (in callback to avoid sync setState warning)
    const checkToken = () => {
      const initialToken = useAuthStore.getState().accessToken
      if (initialToken && !wsRef.current && mounted) {
        console.log('[WebSocket] ✅ Token available on mount, will connect')
        setShouldConnect(true)
      }
    }

    // Use microtask to defer the check
    Promise.resolve().then(checkToken)

    return () => {
      mounted = false
      unsubscribe()
    }
  }, [])

  // Enable/disable polling fallback controls
  const enablePollingFallback = () => {
    console.log('[WebSocket] Enabling polling fallback (WebSocket unavailable)')
    setIsPollingFallback(true)
  }

  const disablePollingFallback = () => {
    console.log('[WebSocket] Disabling polling fallback (WebSocket recovered)')
    setIsPollingFallback(false)
  }

  // Polling fallback hook - handles message delivery when WebSocket fails
  // This hook manages its own polling logic based on isPollingFallback state
  usePollingFallback({
    enabled: isPollingFallback,
    timeout: 30,
    minBackoffInterval: 1000,
    maxBackoffInterval: 30000,
    onMessageReceived: (messages) => {
      // Process polled messages the same way as WebSocket messages
      console.log('[Polling] Processing', messages.length, 'messages')
      messages.forEach(msg => {
        try {
          // Handle notifications from polling
          if (
            msg.type === 'TICKET_CREATED' ||
            msg.type === 'TICKET_UPDATED' ||
            msg.type === 'TICKET_ASSIGNED' ||
            msg.type === 'TICKET_RESOLVED' ||
            msg.type === 'TICKET_DELETED' ||
            msg.type === 'COMMENT_ADDED'
          ) {
            const msgData = msg.data as Record<string, unknown>;
            addNotification({
              type: msg.type,
              title: (msgData.title as string) || 'Notification',
              message: (msgData.message as string) || '',
              relatedTo: msgData.ticket_id ? { ticketId: msgData.ticket_id as number } : undefined,
              data: msgData,
              isGlobal: msgData.isGlobal as boolean,
              fromUser: msgData.fromUser ? { id: 0, username: msgData.fromUser as string } : undefined,
            })
            // Invalidate queries
            queryClient.invalidateQueries({ queryKey: ['my-tickets'] })
            queryClient.invalidateQueries({ queryKey: ['tickets'], exact: false })
            queryClient.invalidateQueries({ queryKey: ['ticket'], exact: false })
            queryClient.invalidateQueries({ queryKey: ['analytics-dashboard'] })
            if (msgData.ticket_id) {
              queryClient.invalidateQueries({ queryKey: ['ticket', msgData.ticket_id] })
            }
          }

          // Handle data_changed from polling
          if (msg.type === 'data_changed') {
            const msgData = msg.data as Record<string, unknown>;
            queryClient.invalidateQueries({ queryKey: ['my-tickets'] })
            queryClient.invalidateQueries({ queryKey: ['employee', 'tasks'], exact: false })
            queryClient.invalidateQueries({ queryKey: ['tickets'], exact: false })
            queryClient.invalidateQueries({ queryKey: ['ticket'], exact: false })
            queryClient.invalidateQueries({ queryKey: ['analytics-dashboard'] })
            if (msgData.ticketId) {
              queryClient.invalidateQueries({ queryKey: ['ticket', msgData.ticketId] })
              if (msgData.event === 'comment_added') {
                queryClient.invalidateQueries({ queryKey: ['ticket-comments', msgData.ticketId] })
              }
            }
          }

          // Handle chat messages from polling
          if (msg.type === 'chat_message') {
            const msgData = msg.data as Record<string, unknown>;
            const senderData = msgData.sender as Record<string, unknown>;
            const normalizedMessage = {
              ...msgData,
              sender_id: senderData?.id || msgData.sender_id,
              sender_username: senderData?.username || msgData.sender_username,
            }
            const event = new CustomEvent('ws_chat_message', { detail: normalizedMessage })
            window.dispatchEvent(event)
          }
        } catch (error) {
          console.error('[Polling] Error processing message:', error)
        }
      })
    },
    onError: (error) => {
      console.warn('[Polling] Error occurred:', error.message)
    }
  })

  // Main WebSocket connection effect (triggered when token is available or reconnect flag changes)
  useEffect(() => {
    let mounted = true;

    // Get current token
    const token = useAuthStore.getState().accessToken

    // If already connected or no token, skip
    if (wsRef.current || !token) {
      if (!token) {
        console.log('[WebSocket DEBUG] Skipping: Token status: ❌ missing')
      }
      // Reset flag even if skipping (but defer to avoid sync warning)
      if (shouldConnect) {
        Promise.resolve().then(() => {
          if (mounted) {
            setShouldConnect(false)
          }
        })
      }
      return
    }

    console.log('[WebSocket DEBUG] Initiating connection (shouldConnect flag)')

    // Reset the flag (defer to avoid sync setState warning)
    Promise.resolve().then(() => {
      if (mounted) {
        setShouldConnect(false)
      }
    })

    // ============================================
    // Determine WebSocket Protocol & URL
    // ============================================

    // Check if we should use WSS (WebSocket Secure) for HTTPS
    const useHttps = import.meta.env.VITE_USE_HTTPS === 'true'
    let protocol: 'wss:' | 'ws:'

    if (useHttps) {
      // Production: Always use WSS (secure websocket) when HTTPS is enabled
      protocol = 'wss:'
    } else {
      // Development: Detect protocol from current window location
      protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    }

    const hostname = window.location.hostname
    const port = window.location.port

    console.log('[WebSocket DEBUG] Current port:', port, '| Protocol:', protocol)

    // ============================================
    // Construct WebSocket URL
    // ============================================

    let wsUrl: string

    // Production HTTPS configuration (through Nginx reverse proxy)
    if (useHttps) {
      const httpsWsUrl = import.meta.env.VITE_WS_URL_HTTPS
      if (httpsWsUrl) {
        wsUrl = `${httpsWsUrl}/ws/unified/`
        console.log('[WebSocket DEBUG] Using HTTPS WSS URL:', wsUrl)
      } else {
        // Fallback: Use current domain for WSS
        wsUrl = `wss://${hostname}/ws/unified/`
        console.log('[WebSocket DEBUG] HTTPS enabled, using current domain for WSS:', wsUrl)
      }
    } else {
      // Development mode (HTTP/WS)

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

      wsUrl = `${protocol}//${wsHost}/ws/unified/`
      console.log('[WebSocket DEBUG] Connecting to:', wsUrl)
    }

    logger.info(`[WebSocket] Attempting connection to ${wsUrl}`)

    try {
      const newWs = new WebSocket(wsUrl)

      newWs.onopen = () => {
        console.log('[WebSocket DEBUG] onopen fired')
        logger.info('[WebSocket] ✅ Connected')
        setIsConnected(true)
        // Disable polling fallback when WebSocket connects
        disablePollingFallback()
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
        // Enable polling fallback immediately on disconnect
        enablePollingFallback()
        // Attempt reconnect after 3 seconds
        setTimeout(() => {
          if (!wsRef.current) {
            logger.debug('[WebSocket] Attempting reconnect...')
            setShouldConnect(true)
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
        // Enable polling fallback on error
        enablePollingFallback()
      }

      wsRef.current = newWs
      // Defer state update to avoid cascading renders
      Promise.resolve().then(() => {
        if (mounted) {
          setWs(newWs)
        }
      })
    } catch (error) {
      logger.error('Failed to create WebSocket', error)
      if (mounted) {
        Promise.resolve().then(() => {
          if (mounted) {
            setIsConnected(false)
          }
        })
      }
    }

    return () => {
      mounted = false
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
    <WebSocketContext.Provider value={{ ws, isConnected, isPollingFallback, enablePollingFallback, disablePollingFallback }}>
      {children}
    </WebSocketContext.Provider>
  )
}
