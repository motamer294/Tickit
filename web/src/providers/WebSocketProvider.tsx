import React, { createContext, useContext, useEffect, useState, useRef } from 'react'

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

  useEffect(() => {
    if (wsRef.current) {
      return
    }

    const token = localStorage.getItem('access_token')
    if (!token) {
      setIsConnected(false)
      return
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.host
    const wsUrl = `${protocol}//${host}/ws/notifications/`

    try {
      const newWs = new WebSocket(wsUrl)

      newWs.onopen = () => {
        setIsConnected(true)
        const message = {
          type: 'authenticate',
          token: token,
        }
        newWs.send(JSON.stringify(message))
      }

      newWs.onclose = () => {
        setIsConnected(false)
        wsRef.current = null
      }

      newWs.onerror = (error) => {
        console.error('WebSocket error:', error)
        setIsConnected(false)
      }

      wsRef.current = newWs
      setWs(newWs)
    } catch (error) {
      console.error('Failed to create WebSocket:', error)
      setIsConnected(false)
    }

    return () => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close()
      }
    }
  }, [])

  return (
    <WebSocketContext.Provider value={{ ws: ws || wsRef.current, isConnected }}>
      {children}
    </WebSocketContext.Provider>
  )
}
