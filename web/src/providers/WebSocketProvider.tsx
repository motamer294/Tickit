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
    let mounted = true

    const unsubscribe = useAuthStore.subscribe((fullState) => {
      const token = fullState.accessToken
      console.log('[WebSocket] 👀 Auth store changed, token:', token ? '✅ present' : '❌ missing')
      if (token && !wsRef.current && mounted) {
        console.log('[WebSocket] ✅ Token is now available! Triggering connection attempt...')
        setShouldConnect(true)
      }
    })

    // Check initial token on mount
    Promise.resolve().then(() => {
      const initialToken = useAuthStore.getState().accessToken
      if (initialToken && !wsRef.current && mounted) {
        console.log('[WebSocket] ✅ Token available on mount, will connect')
        setShouldConnect(true)
      }
    })

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

  // Polling fallback hook
  usePollingFallback({
    enabled: isPollingFallback,
    timeout: 30,
    minBackoffInterval: 1000,
    maxBackoffInterval: 30000,
    onMessageReceived: (messages) => {
      console.log('[Polling] Processing', messages.length, 'messages')
      messages.forEach((msg) => {
        try {
          if (
            msg.type === 'TICKET_CREATED' ||
            msg.type === 'TICKET_UPDATED' ||
            msg.type === 'TICKET_ASSIGNED' ||
            msg.type === 'TICKET_RESOLVED' ||
            msg.type === 'TICKET_DELETED' ||
            msg.type === 'COMMENT_ADDED'
          ) {
            const msgData = msg.data as Record<string, unknown>
            addNotification({
              type: msg.type,
              title: (msgData.title as string) || 'Notification',
              message: (msgData.message as string) || '',
              relatedTo: msgData.ticket_id ? { ticketId: msgData.ticket_id as number } : undefined,
              data: msgData,
              isGlobal: msgData.isGlobal as boolean,
              fromUser: msgData.fromUser ? { id: 0, username: msgData.fromUser as string } : undefined,
            })
            queryClient.invalidateQueries({ queryKey: ['my-tickets'] })
            queryClient.invalidateQueries({ queryKey: ['tickets'], exact: false })
            queryClient.invalidateQueries({ queryKey: ['ticket'], exact: false })
            queryClient.invalidateQueries({ queryKey: ['analytics-dashboard'] })
            if (msgData.ticket_id) {
              queryClient.invalidateQueries({ queryKey: ['ticket', msgData.ticket_id] })
            }
          }

          if (msg.type === 'data_changed') {
            const msgData = msg.data as Record<string, unknown>
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

          if (msg.type === 'chat_message') {
            const msgData = msg.data as Record<string, unknown>
            const senderData = msgData.sender as Record<string, unknown>
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
    },
  })

  // Main WebSocket connection effect
  useEffect(() => {
    let mounted = true

    const token = useAuthStore.getState().accessToken

    if (wsRef.current || !token) {
      if (!token) {
        console.log('[WebSocket DEBUG] Skipping: no token')
      }
      if (shouldConnect) {
        Promise.resolve().then(() => {
          if (mounted) setShouldConnect(false)
        })
      }
      return
    }

    console.log('[WebSocket DEBUG] Initiating connection')

    Promise.resolve().then(() => {
      if (mounted) setShouldConnect(false)
    })

    // ============================================================
    // Build WSS URL
    // Since Nginx is the reverse proxy handling SSL termination,
    // we always use wss:// and the current hostname (no port needed
    // because Nginx listens on 443 and proxies /ws/ to Django).
    // ============================================================
    const hostname = window.location.hostname

    // Allow override via env var for special cases (optional)
    const envWsUrl = import.meta.env.VITE_WS_URL_HTTPS

    let wsUrl: string
    if (envWsUrl) {
      // e.g. VITE_WS_URL_HTTPS=wss://yourdomain.com
      wsUrl = `${envWsUrl}/ws/unified/`
      console.log('[WebSocket DEBUG] Using env WSS URL:', wsUrl)
    } else {
      // ✅ Always WSS through Nginx reverse proxy
      // Nginx handles SSL and proxies /ws/ → Django Channels (ws://)
      wsUrl = `wss://${hostname}/ws/unified/`
      console.log('[WebSocket DEBUG] Using Nginx reverse proxy WSS URL:', wsUrl)
    }

    logger.info(`[WebSocket] Attempting connection to ${wsUrl}`)

    try {
      const newWs = new WebSocket(wsUrl)

      newWs.onopen = () => {
        console.log('[WebSocket DEBUG] onopen fired ✅')
        logger.info('[WebSocket] ✅ Connected')

        // ✅ FIX: Set BOTH ws state and isConnected in the same event handler
        // so consumers never see isConnected=true with ws=null
        setIsConnected(true)
        setWs(newWs)           // ← moved here, no longer deferred
        wsRef.current = newWs  // ensure ref is also up to date

        disablePollingFallback()

        const message = { type: 'authenticate', token }
        console.log('[WebSocket DEBUG] Sending auth message')
        logger.info('[WebSocket] Sending authentication')
        newWs.send(JSON.stringify(message))
      }

      newWs.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          console.log('📨 WebSocket message received:', data)

          if (data.type === 'authenticated') {
            console.log(`✅ Authenticated as ${data.username} (${data.role})`)
            return
          }

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
            queryClient.invalidateQueries({ queryKey: ['my-tickets'] })
            queryClient.invalidateQueries({ queryKey: ['tickets'], exact: false })
            queryClient.invalidateQueries({ queryKey: ['ticket'], exact: false })
            queryClient.invalidateQueries({ queryKey: ['analytics-dashboard'] })
            queryClient.invalidateQueries({ queryKey: ['employee', 'tasks'], exact: false })
            if (data.ticket_id) {
              queryClient.invalidateQueries({ queryKey: ['ticket', data.ticket_id] })
            }
            return
          }

          if (data.type === 'data_changed') {
            // AI triage finished — only refetch the one ticket, skip list/dashboard churn
            if (data.event === 'ticket_ai_complete') {
              if (data.ticketId) {
                queryClient.invalidateQueries({ queryKey: ['ticket', data.ticketId] })
              }
              return
            }

            queryClient.invalidateQueries({ queryKey: ['my-tickets'] })
            queryClient.invalidateQueries({ queryKey: ['employee', 'tasks'], exact: false })
            queryClient.invalidateQueries({ queryKey: ['tickets'], exact: false })
            queryClient.invalidateQueries({ queryKey: ['ticket'], exact: false })
            queryClient.invalidateQueries({ queryKey: ['analytics-dashboard'] })
            if (data.ticketId) {
              queryClient.invalidateQueries({ queryKey: ['ticket', data.ticketId] })
              if (data.event === 'comment_added') {
                queryClient.invalidateQueries({ queryKey: ['ticket-comments', data.ticketId] })
                queryClient.invalidateQueries({ queryKey: ['comments', 'list', data.ticketId] })
              }
            }
            return
          }

          if (data.type === 'chat_message') {
            console.log('💬 Chat message received:', data)
            const normalizedMessage = {
              ...data,
              sender_id: data.sender?.id || data.sender_id,
              sender_username: data.sender?.username || data.sender_username,
            }
            const event = new CustomEvent('ws_chat_message', { detail: normalizedMessage })
            window.dispatchEvent(event)
            return
          }

          if (data.type === 'pong') {
            console.log('💓 Pong received (connection alive)')
            return
          }
        } catch (error) {
          console.error('❌ Error parsing WebSocket message:', error)
        }
      }

      newWs.onclose = (event) => {
        logger.warn('[WebSocket] ❌ Connection closed', event.code, event.reason)
        // ✅ FIX: Clear both ws state and isConnected together
        setIsConnected(false)
        setWs(null)
        wsRef.current = null
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
        // ✅ FIX: Clear both together on error too
        setIsConnected(false)
        setWs(null)
        enablePollingFallback()
        // wsRef will be cleaned up in onclose which fires after onerror
      }

      // ✅ FIX: wsRef is set here for internal guard logic (before onopen)
      // but setWs() is now called inside onopen so React state is consistent
      wsRef.current = newWs

    } catch (error) {
      logger.error('Failed to create WebSocket', error)
      if (mounted) {
        setIsConnected(false)
        setWs(null)
      }
    }

    return () => {
      mounted = false
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close()
      }
    }
  }, [addNotification, queryClient, shouldConnect])

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
    <WebSocketContext.Provider
      value={{ ws, isConnected, isPollingFallback, enablePollingFallback, disablePollingFallback }}
    >
      {children}
    </WebSocketContext.Provider>
  )
}
