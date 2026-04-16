/**
 * useWebSocket: Unified WebSocket Hook (Deprecated in favor of WebSocketProvider)
 * This hook is now a wrapper around WebSocketContext
 * Use useWebSocketContext() from '@/hooks/useWebSocketContext' for direct access
 */

import { useWebSocketContext } from '@/hooks/useWebSocketContext'

/**
 * Deprecated: Use useWebSocketContext() instead
 * Returns the shared WebSocket connection from the provider
 */
export const useWebSocket = () => {
  return useWebSocketContext()
}
