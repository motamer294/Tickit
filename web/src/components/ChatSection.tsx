import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import {
  Paper,
  ScrollArea,
  Group,
  Text,
  Loader,
  Badge,
  Stack,
  Divider,
  Textarea,
  Avatar,
  ActionIcon,
  Center,
  useMantineColorScheme,
} from '@mantine/core'
import { Icon } from '@iconify-icon/react'
import { notifications } from '@mantine/notifications'
import { useWebSocketContext } from '@/hooks/useWebSocketContext'
import { fetchChatMessages, type ChatMessage } from '@/api/tickets.api'

interface ChatSectionProps {
  ticketId: number
  currentUserId: number
}

export function ChatSection({
  ticketId,
  currentUserId,
}: ChatSectionProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [joined, setJoined] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const { ws, isConnected } = useWebSocketContext()
  const { colorScheme } = useMantineColorScheme()
  const isDark = colorScheme === 'dark'

  // DEBUG: Log connection status
  useEffect(() => {
    console.log(`💬 ChatSection: isConnected=${isConnected}, wss=${ws ? 'present' : 'null'}, joined=${joined}`)
  }, [isConnected, ws, joined])

  // Fetch initial chat messages
  useEffect(() => {
    const loadMessages = async () => {
      try {
        setLoading(true)
        const data = await fetchChatMessages(ticketId)
        setMessages(data)
        setTimeout(() => {
          if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
          }
        }, 100)
      } catch (error) {
        console.error('Failed to load chat messages:', error)
        notifications.show({
          title: 'Error',
          message: 'Failed to load chat messages',
          color: 'red',
        })
      } finally {
        setLoading(false)
      }
    }

    loadMessages()
  }, [ticketId])

  // Join chat room when component mounts or ticket changes
  useEffect(() => {
    if (!ws || !isConnected || ws.readyState !== WebSocket.OPEN) {
      setJoined(false)
      return
    }

    // Send join_chat message to subscribe to this ticket's chat group
    try {
      ws.send(
        JSON.stringify({
          type: 'join_chat',
          ticket_id: ticketId,
        }),
      )
      setJoined(true)
      console.log(`✅ ChatSection: Joined chat for ticket ${ticketId}`)
    } catch (error) {
      console.error('Error joining chat:', error)
      setJoined(false)
    }
  }, [ws, isConnected, ticketId])

  // Handle incoming chat messages via custom event from WebSocketProvider
  const handleChatMessage = useCallback((event: Event) => {
    try {
      const customEvent = event as CustomEvent
      const data = customEvent.detail

      // Only process chat messages for this ticket
      if (data.type === 'chat_message' && data.ticket_id === ticketId) {
        console.log('💬 ChatSection received message:', data)
        const newMessage: ChatMessage = {
          id: data.message_id || data.id,
          ticket_id: data.ticket_id,
          message: data.message,
          sender_id: data.sender_id,
          sender_username: data.sender_username,
          timestamp: data.timestamp || data.created_at,
        }
        setMessages((prev) => [...prev, newMessage])
        // Auto-scroll to new message
        setTimeout(() => {
          if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
          }
        }, 0)
      }
    } catch (error) {
      console.error('Error processing WebSocket chat message:', error)
    }
  }, [ticketId])

  // Set up listener for custom events from WebSocketProvider (only once)
  useEffect(() => {
    console.log('💬 ChatSection: Adding custom event listener for ws_chat_message')
    window.addEventListener('ws_chat_message', handleChatMessage)
    return () => {
      console.log('💬 ChatSection: Removing custom event listener')
      window.removeEventListener('ws_chat_message', handleChatMessage)
    }
  }, [handleChatMessage])

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      setTimeout(() => {
        scrollRef.current!.scrollTop = scrollRef.current!.scrollHeight
      }, 50)
    }
  }, [messages])

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !ws || !isConnected || !joined) {
      const reason = !inputValue.trim() ? 'empty message'
        : !ws ? 'no WebSocket'
        : !isConnected ? 'not connected'
        : 'not joined chat room'
      notifications.show({
        title: 'Cannot send message',
        message: `Connection not ready (${reason}).`,
        color: 'yellow',
      })
      return
    }

    try {
      setSending(true)

      ws.send(
        JSON.stringify({
          type: 'chat_message',
          ticket_id: ticketId,
          sender_id: currentUserId,
          message: inputValue.trim(),
        }),
      )

      console.log(`💬 Sent message to ticket ${ticketId}`)
      setInputValue('')
    } catch (error) {
      console.error('Error sending message:', error)
      notifications.show({
        title: 'Error',
        message: 'Failed to send message. Please try again.',
        color: 'red',
      })
    } finally {
      setSending(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  // Group messages by date
  const groupedMessages = useMemo(() => {
    const groups: { [key: string]: ChatMessage[] } = {}

    messages.forEach((msg) => {
      const date = new Date(msg.timestamp).toLocaleDateString()
      if (!groups[date]) {
        groups[date] = []
      }
      groups[date].push(msg)
    })

    return groups
  }, [messages])

  if (loading) {
    return (
      <Paper p="md" radius="md" withBorder>
        <Center h={300}>
          <Loader />
        </Center>
      </Paper>
    )
  }

  return (
    <Paper p="md" radius="md" withBorder>
      <Stack gap="sm" h="100%">
        {/* Header */}
        <Group justify="space-between" align="center">
          <Stack gap={0}>
            <Text fw={700} size="lg">
              Messages
            </Text>
            <Text size="xs" c="dimmed">
              Ticket chat
            </Text>
          </Stack>
          <Badge
            variant="outline"
            color={isConnected ? 'green' : 'red'}
            size="md"
          >
            {isConnected ? 'Connected' : 'Offline'}
          </Badge>
        </Group>

        <Divider />

        {/* Messages Display */}
        <ScrollArea
          style={{ flex: 1, minHeight: 300 }}
          viewportRef={scrollRef}
          type="auto"
        >
          {messages.length > 0 ? (
            <Stack gap="md" p="sm">
              {Object.entries(groupedMessages).map(([date, dateMessages]) => (
                <div key={date}>
                  <Group justify="center" mb="md">
                    <Text size="xs" c="dimmed">
                      {date}
                    </Text>
                  </Group>

                  {dateMessages.map((msg) => {
                    const isOwn = msg.sender_id === currentUserId
                    return (
                      <Group
                        key={msg.id}
                        justify={isOwn ? 'flex-end' : 'flex-start'}
                        mb="sm"
                      >
                        <Group gap="xs" style={{ maxWidth: '65%' }}>
                          {!isOwn && (
                            <Avatar name={msg.sender_username} size={36} />
                          )}
                          <Stack gap={2}>
                            {!isOwn && (
                              <Text size="xs" fw={500} c="dimmed">
                                {msg.sender_username}
                              </Text>
                            )}
                            <Paper
                              p="sm"
                              radius="md"
                              style={{
                                backgroundColor: isOwn
                                  ? isDark
                                    ? '#2c3e50'
                                    : '#e3f2fd'
                                  : isDark
                                    ? '#374151'
                                    : '#f5f5f5',
                              }}
                            >
                              <Text size="sm">{msg.message}</Text>
                            </Paper>
                            <Text size="xs" c="dimmed">
                              {new Date(msg.timestamp).toLocaleTimeString()}
                            </Text>
                          </Stack>
                          {isOwn && (
                            <Avatar name={msg.sender_username} size={36} />
                          )}
                        </Group>
                      </Group>
                    )
                  })}
                </div>
              ))}
            </Stack>
          ) : (
            <Center h={200}>
              <Text c="dimmed" size="sm">
                No messages yet
              </Text>
            </Center>
          )}
        </ScrollArea>

        <Divider />

        {/* Input Area */}
        <Stack gap="xs">
          <Textarea
            placeholder="Type your message... (Shift+Enter for new line)"
            value={inputValue}
            onChange={(e) => setInputValue(e.currentTarget.value)}
            onKeyDown={handleKeyPress}
            minRows={3}
            maxRows={5}
            disabled={!isConnected || sending}
            rightSection={
              <ActionIcon
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || !isConnected || sending}
                loading={sending}
                variant="filled"
                style={{ marginRight: 4, marginBottom: 4 }}
              >
                <Icon icon="solar:send-bold-duotone" width={18} />
              </ActionIcon>
            }
          />
        </Stack>
      </Stack>
    </Paper>
  )
}
