import React, { createContext, useContext, useEffect, useState, useRef } from 'react'
import { useNotificationStore } from '@/store/notification.store'
import { useAuthStore } from '@/store/auth.store'
import { useQueryClient } from '@tanstack/react-query'

interface WebSocketContextType {
  ws: WebSocket | null
  isConnected: boolean
}

const WebSocketContext = createContext<WebSocketContextType>({
  ws: null,
  isConnected: false,
})

export const useWebSocketContext = () => {
  const context = useContext(WebSocketContext)
  if (!context) {
    throw new Error('useWebSocketContext must be used within WebSocketProvider')
  }
  return context
}

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
      setIsConnected(false)
      return
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.host
    const wsUrl = `${protocol}//${host}/ws/unified/`

    try {
      const newWs = new WebSocket(wsUrl)

      newWs.onopen = () => {
        console.log('✅ Unified WebSocket connected')
        setIsConnected(true)
        const message = {
          type: 'authenticate',
          token: token,
        }
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

          // Handle chat messages - ✅ LET THEM PASS THROUGH to ChatSection listeners
          if (data.type === 'chat_message') {
            console.log('💬 Chat message received')
            // ✅ IMPORTANT: Don't consume chat messages here
            // Let them propagate to ChatSection's listener
            // Just return after logging
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
        console.log('❌ Unified WebSocket closed')
        setIsConnected(false)
        wsRef.current = null
        // Attempt reconnect after 3 seconds
        setTimeout(() => {
          if (!wsRef.current) {
            console.log('🔄 Attempting WebSocket reconnect...')
            // Trigger reconnection by recreating
          }
        }, 3000)
      }

      newWs.onerror = (error) => {
        console.error('❌ WebSocket error:', error)
        setIsConnected(false)
      }

      wsRef.current = newWs
      setWs(newWs)
    } catch (error) {
      console.error('❌ Failed to create WebSocket:', error)
      setIsConnected(false)
    }

    return () => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close()
      }
    }
  }, []) // Empty dependency - only initialize once on mount

  return (
    <WebSocketContext.Provider value={{ ws: ws || wsRef.current, isConnected }}>
      {children}
    </WebSocketContext.Provider>
  )
}
