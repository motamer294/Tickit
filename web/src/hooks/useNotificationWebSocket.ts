import { useEffect, useRef } from 'react'
import { useNotificationStore } from '@/store/notification.store'
import type { NotificationType, Notification } from '@/types/notification'
import { useAuth } from './useAuth'

/**
 * WebSocket Hook for Real-Time Notifications
 * Connects to the backend notification WebSocket endpoint
 * Automatically reconnects on disconnect
 */
export const useNotificationWebSocket = () => {
  const { accessToken, user } = useAuth()
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isConnectingRef = useRef(false)

  const addNotification = useNotificationStore((state) =>
    state.addNotification
  )

  const connectWebSocket = () => {
    if (!accessToken || !user || isConnectingRef.current) return

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('✅ WebSocket already connected')
      return
    }

    isConnectingRef.current = true

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const host = window.location.hostname
      const port = window.location.port ? `:${window.location.port}` : ''

      // ✅ FIXED: Token NOT in URL anymore
      const wsURL = `${protocol}//${host}${port}/ws/notifications/`

      console.log('🔌 Connecting to WebSocket:', wsURL)

      wsRef.current = new WebSocket(wsURL)

      wsRef.current.onopen = () => {
        console.log('✅ WebSocket connected')
        isConnectingRef.current = false

        // ✅ SECURE: Send token in message, not URL
        wsRef.current!.send(
          JSON.stringify({
            type: 'authenticate',
            token: accessToken,
          }),
        )

        // Send keep-alive ping every 30 seconds
        const pingInterval = setInterval(() => {
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'ping' }))
          } else {
            clearInterval(pingInterval)
          }
        }, 30000)
      }

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)

          // Skip pong responses
          if (data.type === 'pong') return

          // Convert WebSocket message to notification format
          const notification: Notification = {
            id: data.id || `notif-${Date.now()}`,
            type: data.type as NotificationType,
            title: data.title,
            message: data.message,
            ticketId: data.ticketId || data.ticket_id,
            data: data.data || {},
            createdAt: new Date(data.createdAt || data.timestamp || Date.now()),
            read: false,
            isGlobal: data.isGlobal || data.is_global || false,
            fromUser: data.fromUser,
          }

          console.log('📬 Received notification:', notification.title)
          addNotification(notification)
        } catch (error) {
          console.error('❌ Error parsing WebSocket message:', error)
        }
      }

      wsRef.current.onerror = (event) => {
        console.error('❌ WebSocket error:', event)
        isConnectingRef.current = false
      }

      wsRef.current.onclose = () => {
        console.log('❌ WebSocket disconnected')
        isConnectingRef.current = false

        // Attempt to reconnect after 3 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('🔄 Attempting to reconnect...')
          connectWebSocket()
        }, 3000)
      }
    } catch (error) {
      console.error('❌ Error creating WebSocket:', error)
      isConnectingRef.current = false
    }
  }

  // Connect on mount and when token/user changes
  useEffect(() => {
    if (accessToken && user) {
      connectWebSocket()
    }

    return () => {
      // Cleanup
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.close()
      }
    }
  }, [accessToken, user])

  return {
    isConnected: wsRef.current?.readyState === WebSocket.OPEN,
    ws: wsRef.current,
  }
}
