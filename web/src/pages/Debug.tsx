import { useState, useEffect } from 'react'
import {
  Container,
  Paper,
  Text,
  Stack,
  Group,
  Button,
  Code,
  Kbd,
  Title,
  Badge,
  Divider,
  Card,
} from '@mantine/core'
import { Icon } from '@iconify-icon/react'
import { useAuthStore } from '@/store/auth.store'

export default function DebugPage() {
  const [logs, setLogs] = useState<string[]>([])
  const [wsConnected, setWsConnected] = useState(false)
  const [token, setToken] = useState('')
  const [ws, setWs] = useState<WebSocket | null>(null)

  useEffect(() => {
    // Get token from auth store
    const authStore = useAuthStore.getState()
    const t = authStore.accessToken

    // Get configured URLs from environment or use defaults
    const apiHost = import.meta.env.VITE_API_HOST || window.location.hostname
    const apiPort = import.meta.env.VITE_API_PORT || '8000'
    const wsHost = import.meta.env.VITE_WS_HOST || apiHost
    const wsPort = import.meta.env.VITE_WS_PORT || apiPort
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'

    const apiUrl = `http://${apiHost}:${apiPort}/api`
    const wsUrl = `${protocol}//${wsHost}:${wsPort}/ws/unified/`

    setToken(t || 'NO TOKEN FOUND')

    addLog(' Debug Page Initialized')
    addLog(` Frontend: ${window.location.origin}`)
    addLog(` API URL: ${apiUrl}`)
    addLog(` WebSocket URL: ${wsUrl}`)
    addLog(` Token: ${t ? `${t.substring(0, 20)}...` : 'MISSING'}`)
  }, [])

  const addLog = (message: string) => {
    setLogs((prev) => [
      new Date().toLocaleTimeString() + ' ' + message,
      ...prev,
    ])
    console.log(message)
  }

  const testWebSocket = async () => {
    addLog(' Attempting WebSocket connection...')

    const t = useAuthStore.getState().accessToken
    if (!t) {
      addLog(' ERROR: No access token found')
      return
    }

    // Get configured WebSocket URL from environment or use defaults
    const wsHost = import.meta.env.VITE_WS_HOST || import.meta.env.VITE_API_HOST || window.location.hostname
    const wsPort = import.meta.env.VITE_WS_PORT || import.meta.env.VITE_API_PORT || '8000'
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'

    const wsUrl = `${protocol}//${wsHost}:${wsPort}/ws/unified/`
    addLog(` Connecting to: ${wsUrl}`)

    try {
      const newWs = new WebSocket(wsUrl)

      newWs.onopen = () => {
        addLog(' WebSocket connection successful')
        setWsConnected(true)

        // Send authentication
        addLog(' Sending authentication message...')
        newWs.send(JSON.stringify({
          type: 'authenticate',
          token: t,
        }))
      }

      newWs.onmessage = (event) => {
        const data = JSON.parse(event.data)
        addLog(` Received: ${JSON.stringify(data)}`)

        if (data.type === 'authenticated') {
          addLog(` Authenticated as: ${data.username} (${data.role})`)
        }
      }

      newWs.onerror = (error) => {
        addLog(` WebSocket error: ${error}`)
        setWsConnected(false)
      }

      newWs.onclose = () => {
        addLog(' WebSocket closed')
        setWsConnected(false)
      }

      setWs(newWs)
    } catch (error: any) {
      addLog(` Exception: ${error.message}`)
    }
  }

  const testApi = async () => {
    addLog(' Testing API connection...')

    const t = useAuthStore.getState().accessToken
    if (!t) {
      addLog(' ERROR: No access token found')
      return
    }

    try {
      addLog(` Calling GET /api/my-tickets...`)
      const response = await fetch(`http://${window.location.hostname}:8000/api/my-tickets`, {
        headers: {
          'Authorization': `Bearer ${t}`,
        },
      })

      addLog(` Response status: ${response.status}`)
      const data = await response.json()
      addLog(` API working. Got ${Array.isArray(data) ? data.length : 0} tickets`)
      addLog(`Response: ${JSON.stringify(data).substring(0, 100)}...`)
    } catch (error: any) {
      addLog(` API error: ${error.message}`)
    }
  }

  const testChatApi = async () => {
    addLog(' Testing Chat API...')

    const t = useAuthStore.getState().accessToken
    if (!t) {
      addLog(' ERROR: No access token found')
      return
    }

    try {
      // Get a ticket ID first
      const ticketsResponse = await fetch(`http://${window.location.hostname}:8000/api/my-tickets?page=1`, {
        headers: {
          'Authorization': `Bearer ${t}`,
        },
      })
      const tickets = await ticketsResponse.json()

      if (!Array.isArray(tickets) || tickets.length === 0) {
        addLog(' No tickets available to test chat')
        return
      }

      const ticketId = tickets[0]?.id
      addLog(` Testing GET /api/tickets/${ticketId}/chat...`)

      const response = await fetch(`http://${window.location.hostname}:8000/api/tickets/${ticketId}/chat`, {
        headers: {
          'Authorization': `Bearer ${t}`,
        },
      })

      addLog(` Response status: ${response.status}`)
      const data = await response.json()
      addLog(` Chat API working. Got ${Array.isArray(data) ? data.length : 0} messages`)
    } catch (error: any) {
      addLog(` Chat API error: ${error.message}`)
    }
  }

  const clearLogs = () => {
    setLogs([])
    addLog(' Logs cleared')
  }

  const closeWs = () => {
    if (ws) {
      ws.close()
      setWs(null)
      setWsConnected(false)
      addLog(' Manually closed WebSocket')
    }
  }

  return (
    <Container size="lg" py="lg">
      <Stack gap="lg">
        <div>
          <Title order={1}> Debug Console</Title>
          <Text size="sm" c="dimmed">
            Test API and WebSocket connections
          </Text>
        </div>

        {/* Status Cards */}
        <Group grow>
          <Card withBorder p="md">
            <Stack gap="xs">
              <Group justify="space-between">
                <Text size="sm" fw={500}>
                  Token Status
                </Text>
                <Badge color={token && token !== 'NO TOKEN FOUND' ? 'green' : 'red'}>
                  {token && token !== 'NO TOKEN FOUND' ? ' Present' : ' Missing'}
                </Badge>
              </Group>
              <Code block>{token.substring(0, 50)}...</Code>
            </Stack>
          </Card>

          <Card withBorder p="md">
            <Stack gap="xs">
              <Group justify="space-between">
                <Text size="sm" fw={500}>
                  WebSocket Status
                </Text>
                <Badge color={wsConnected ? 'green' : 'red'}>
                  {wsConnected ? ' Connected' : ' Disconnected'}
                </Badge>
              </Group>
              <Text size="xs" c="dimmed">
                {wsConnected
                  ? 'WebSocket is connected'
                  : 'Click "Test WebSocket" to connect'}
              </Text>
            </Stack>
          </Card>
        </Group>

        <Divider />

        {/* Test Buttons */}
        <Stack gap="sm">
          <Text size="sm" fw={600}>
            Run Tests
          </Text>
          <Group grow>
            <Button onClick={testApi} variant="light">
              Test API
            </Button>
            <Button onClick={testChatApi} variant="light">
              Test Chat API
            </Button>
            <Button onClick={testWebSocket} variant="light">
              Test WebSocket
            </Button>
            {wsConnected && (
              <Button onClick={closeWs} color="red" variant="light">
                Close WebSocket
              </Button>
            )}
          </Group>
          <Button onClick={clearLogs} color="gray" variant="subtle">
            Clear Logs
          </Button>
        </Stack>

        <Divider />

        {/* Logs */}
        <div>
          <Group justify="space-between" mb="xs">
            <Text size="sm" fw={600}>
               Event Logs ({logs.length})
            </Text>
          </Group>
          <Paper
            p="md"
            radius="md"
            withBorder
            style={{
              fontFamily: 'monospace',
              fontSize: '12px',
              backgroundColor: '#f5f5f5',
              maxHeight: '400px',
              overflowY: 'auto',
            }}
          >
            {logs.length === 0 ? (
              <Text c="dimmed" size="xs">
                No logs yet. Run a test above.
              </Text>
            ) : (
              logs.map((log, idx) => (
                <div key={idx} style={{ lineHeight: '1.5' }}>
                  {log}
                </div>
              ))
            )}
          </Paper>
        </div>

        {/* Instructions */}
        <Card withBorder p="md" radius="md">
          <Stack gap="sm">
            <Group gap="xs">
              <Icon icon="solar:info-circle-bold-duotone" width={18} />
              <Text fw={600}>How to Use This Page</Text>
            </Group>
            <ul style={{ margin: 0, paddingLeft: '20px' }}>
              <li>
                <Text size="sm">
                  <strong>Test API:</strong> Verifies REST API connection and
                  authentication
                </Text>
              </li>
              <li>
                <Text size="sm">
                  <strong>Test Chat API:</strong> Tests the chat history endpoint
                </Text>
              </li>
              <li>
                <Text size="sm">
                  <strong>Test WebSocket:</strong> Attempts WebSocket connection
                  and authentication
                </Text>
              </li>
              <li>
                <Text size="sm">
                  Watch the <Kbd> Event Logs</Kbd> section for detailed output
                </Text>
              </li>
            </ul>
          </Stack>
        </Card>
      </Stack>
    </Container>
  )
}
