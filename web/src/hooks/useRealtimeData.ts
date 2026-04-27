import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from './useAuth'

/**
 * Real-Time Data Hook
 * Connects to the WebSocket and invalidates queries when data changes
 * This causes React Query to automatically refetch and update the UI
 */
export const useRealtimeData = () => {
  const { accessToken, user } = useAuth()
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isConnectingRef = useRef(false)
  const queryClient = useQueryClient()

  const connectWebSocket = () => {
    if (!accessToken || !user || isConnectingRef.current) return

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('✅ Real-time WebSocket already connected')
      return
    }

    isConnectingRef.current = true

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const host = window.location.hostname
      const port = window.location.port ? `:${window.location.port}` : ''

      // ✅ FIXED: Token NOT in URL anymore
      const wsURL = `${protocol}//${host}${port}/ws/realtime/`

      console.log('🔌 Connecting to Real-Time WebSocket:', wsURL)

      wsRef.current = new WebSocket(wsURL)

      wsRef.current.onopen = () => {
        console.log('✅ Real-time WebSocket connected')
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

          console.log('🔄 Real-time data update:', data.event)

          // Handle different event types
          switch (data.event) {
            case 'ticket_created':
              // Invalidate ticket list to trigger refetch
              console.log('📌 Invalidating ticket lists...')
              queryClient.invalidateQueries({ queryKey: ['tickets'] })
              queryClient.invalidateQueries({ queryKey: ['myTickets'] })
              queryClient.invalidateQueries({ queryKey: ['dashboard'] })
              break

            case 'ticket_deleted':
              console.log('📌 Invalidating ticket lists (deleted)...')
              queryClient.invalidateQueries({ queryKey: ['tickets'] })
              queryClient.invalidateQueries({ queryKey: ['myTickets'] })
              queryClient.invalidateQueries({ queryKey: ['dashboard'] })
              break

            case 'ticket_updated':
              console.log('📌 Invalidating ticket details & lists...')
              queryClient.invalidateQueries({ queryKey: ['tickets'] })
              queryClient.invalidateQueries({ queryKey: ['myTickets'] })
              queryClient.invalidateQueries({ queryKey: ['ticket', data.ticketId] })
              queryClient.invalidateQueries({ queryKey: ['dashboard'] })
              break

            case 'comment_added':
              console.log('📌 Invalidating comments...')
              queryClient.invalidateQueries({ queryKey: ['ticket-comments', data.ticketId] })
              queryClient.invalidateQueries({ queryKey: ['ticket', data.ticketId] })
              break

            case 'audit_log_created':
              console.log('📌 Invalidating audit logs...')
              queryClient.invalidateQueries({ queryKey: ['audit-logs'] })
              break

            default:
              // Generic data change event
              queryClient.invalidateQueries()
              break
          }
        } catch (error) {
          console.error('❌ Error parsing real-time message:', error)
        }
      }

      wsRef.current.onerror = (event) => {
        console.error('❌ Real-time WebSocket error:', event)
        isConnectingRef.current = false
      }

      wsRef.current.onclose = () => {
        console.log('❌ Real-time WebSocket disconnected')
        isConnectingRef.current = false

        // Attempt to reconnect after 5 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('🔄 Attempting to reconnect to real-time...')
          connectWebSocket()
        }, 5000)
      }
    } catch (error) {
      console.error('❌ Error creating real-time WebSocket:', error)
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
