// Separate file to avoid hot refresh issues with context hooks
import { useContext } from 'react'
import { WebSocketContext } from '@/providers/WebSocketProvider'

/**
 * Hook to access the WebSocket context
 * Provides: ws (WebSocket instance) and isConnected (boolean)
 *
 * Usage:
 * const { ws, isConnected } = useWebSocketContext()
 */
export const useWebSocketContext = () => {
  const context = useContext(WebSocketContext)
  if (!context) {
    throw new Error('useWebSocketContext must be used within WebSocketProvider')
  }
  return context
}
