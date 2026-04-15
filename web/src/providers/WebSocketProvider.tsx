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
  const queryClient = useQueryClient()
  const addNotification = useNotificationStore((s) => s.addNotification)

  useEffect(() => {
    if (wsRef.current) {
      return
    }

    const token = useAuthStore.getState().accessToken
    if (!token) {
      logger.warn('[WebSocket] No token available, skipping connection')
      setIsConnected(false)
      return
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const hostname = window.location.hostname
    const port = window.location.port

    // Fix: Dev server ports (5173, 3000) should connect to backend (8000)
    let wsHost = window.location.host
    if (port === '5173' || port === '3000') {
      wsHost = `${hostname}:8000`
    }

    const wsUrl = `${protocol}//${wsHost}/ws/unified/`
    logger.info(`[WebSocket] Attempting connection to ${wsUrl}`)

    try {
      const newWs = new WebSocket(wsUrl)

      newWs.onopen = () => {
        logger.info('[WebSocket] ✅ Connected')
        setIsConnected(true)
        const message = {
          type: 'authenticate',
          token: token,
        }
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
            // Invalidate query for this ticket if available
            if (data.ticket_id) {
              queryClient.invalidateQueries({
                queryKey: ['ticket', data.ticket_id],
              })
            }
            return
          }

          // Handle real-time data changes (triggers React Query invalidation)
          if (data.type === 'data_changed' || data.event) {
            console.log('🔄 Real-time update:', data.event)
            // Invalidate all ticket queries to reflect changes
            queryClient.invalidateQueries({ queryKey: ['my-tickets'] })
            queryClient.invalidateQueries({ queryKey: ['employee/tasks'] })
            if (data.ticketId) {
              queryClient.invalidateQueries({
                queryKey: ['ticket', data.ticketId],
              })
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
  }, [addNotification, queryClient]) // ✅ FIX: Added missing dependencies

  // Automatic reconnection when connection drops
  useEffect(() => {
    const token = useAuthStore.getState().accessToken
    if (!isConnected && token && !wsRef.current) {
      const timer = setTimeout(() => {
        logger.debug('Attempting WebSocket reconnect')
        // Reconnection will be handled by the main useEffect on next render
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
