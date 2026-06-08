import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import {
  Paper,
  ScrollArea,
  Group,
  Text,
  Loader,
  Stack,
  Textarea,
  Avatar,
  ActionIcon,
  Center,
  Box,
  Tooltip,
  useMantineColorScheme,
} from "@mantine/core";
import { Icon } from "@iconify-icon/react";
import { notifications } from "@/utils/customNotifications";
import { useWebSocketContext } from "@/hooks/useWebSocketContext";
import { fetchChatMessages, type ChatMessage } from "@/api/tickets.api";

// ─── Brand palette ─────────────────────────────────────────────────────────────

const BRAND = {
  purple: "#7F77DD",
  purpleDark: "#534AB7",
  purpleLight: "#EEEDFE",
  purpleText: "#3C3489",
  red: "#E24B4A",
  redLight: "#FCEBEB",
  green: "#639922",
  greenLight: "#EAF3DE",
  greenText: "#27500A",
};

const AVATAR_PALETTES = [
  { bg: "#EEEDFE", color: "#3C3489" },
  { bg: "#E1F5EE", color: "#085041" },
  { bg: "#FAEEDA", color: "#633806" },
  { bg: "#FAECE7", color: "#712B13" },
  { bg: "#E6F1FB", color: "#0C447C" },
  { bg: "#FBEAF0", color: "#72243E" },
];

function getAvatarPalette(username: string) {
  const idx = username.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return AVATAR_PALETTES[idx % AVATAR_PALETTES.length];
}

function getInitials(name: string) {
  return name
    .split(/[\s._-]/)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatTime(timestamp: string) {
  return new Date(timestamp).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ─── Props ─────────────────────────────────────────────────────────────────────

interface ChatSectionProps {
  ticketId: number;
  currentUserId: number;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function ChatSection({ ticketId, currentUserId }: ChatSectionProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [joined, setJoined] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { ws, isConnected } = useWebSocketContext();
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === "dark";

  const scrollToBottom = (delay = 50) => {
    setTimeout(() => {
      if (scrollRef.current)
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, delay);
  };

  // ── Load initial messages ──
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await fetchChatMessages(ticketId);
        setMessages(data);
        scrollToBottom(100);
      } catch {
        notifications.show({
          title: "Error",
          message: "Failed to load chat messages",
          color: "red",
        });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [ticketId]);

  // ── Join chat room ──
  useEffect(() => {
    if (!ws || !isConnected || ws.readyState !== WebSocket.OPEN) {
      setJoined(false);
      return;
    }
    try {
      ws.send(JSON.stringify({ type: "join_chat", ticket_id: ticketId }));
      setJoined(true);
    } catch {
      setJoined(false);
    }
  }, [ws, isConnected, ticketId]);

  // ── Receive messages ──
  const handleChatMessage = useCallback(
    (event: Event) => {
      try {
        const data = (event as CustomEvent).detail;
        if (data.type === "chat_message" && data.ticket_id === ticketId) {
          const msg: ChatMessage = {
            id: data.message_id || data.id,
            ticket_id: data.ticket_id,
            message: data.message,
            sender_id: data.sender_id,
            sender_username: data.sender_username,
            timestamp: data.timestamp || data.created_at,
          };
          setMessages((prev) => [...prev, msg]);
          scrollToBottom(0);
        }
      } catch {
        /* noop */
      }
    },
    [ticketId],
  );

  useEffect(() => {
    window.addEventListener("ws_chat_message", handleChatMessage);
    return () =>
      window.removeEventListener("ws_chat_message", handleChatMessage);
  }, [handleChatMessage]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // ── Send ──
  const handleSend = async () => {
    if (!inputValue.trim() || !ws || !isConnected || !joined) {
      notifications.show({
        title: "Cannot send",
        message: !inputValue.trim()
          ? "Message is empty"
          : "Connection not ready — please wait.",
        color: "yellow",
      });
      return;
    }
    try {
      setSending(true);
      ws.send(
        JSON.stringify({
          type: "chat_message",
          ticket_id: ticketId,
          sender_id: currentUserId,
          message: inputValue.trim(),
        }),
      );
      setInputValue("");
      inputRef.current?.focus();
    } catch {
      notifications.show({
        title: "Error",
        message: "Failed to send message. Please try again.",
        color: "red",
      });
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ── Group by date ──
  const groupedMessages = useMemo(() => {
    const groups: Record<string, ChatMessage[]> = {};
    messages.forEach((msg) => {
      const key = new Date(msg.timestamp).toLocaleDateString();
      if (!groups[key]) groups[key] = [];
      groups[key].push(msg);
    });
    return groups;
  }, [messages]);

  // ── Loading ──
  if (loading) {
    return (
      <Paper
        radius="md"
        style={{ border: "0.5px solid var(--mantine-color-default-border)" }}
      >
        <Center h={320}>
          <Loader color={BRAND.purple} />
        </Center>
      </Paper>
    );
  }

  const canSend = !!inputValue.trim() && isConnected && joined && !sending;

  return (
    <Paper
      radius="md"
      style={{
        border: "0.5px solid var(--mantine-color-default-border)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* ── Header ── */}
      <Box
        px="md"
        py="sm"
        style={{
          borderBottom: "0.5px solid var(--mantine-color-default-border)",
          flexShrink: 0,
        }}
      >
        <Group justify="space-between" align="center">
          <Group gap={8}>
            <Icon
              icon="solar:chat-round-dots-bold-duotone"
              width={16}
              style={{ color: BRAND.purple }}
            />
            <Box>
              <Text fw={600} size="sm" style={{ lineHeight: 1.2 }}>
                Messages
              </Text>
              <Text size="xs" c="dimmed">
                Ticket live chat
              </Text>
            </Box>
          </Group>

          {/* Connection status */}
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              fontSize: 11,
              fontWeight: 500,
              padding: "3px 10px",
              borderRadius: 20,
              background: isConnected ? BRAND.greenLight : BRAND.redLight,
              color: isConnected ? BRAND.greenText : BRAND.red,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: isConnected ? BRAND.green : BRAND.red,
                display: "inline-block",
                ...(isConnected
                  ? { boxShadow: `0 0 0 2px ${BRAND.greenLight}` }
                  : {}),
              }}
            />
            {isConnected ? "Connected" : "Offline"}
          </span>
        </Group>
      </Box>

      {/* ── Messages ── */}
      <ScrollArea
        style={{ flex: 1, minHeight: 320 }}
        viewportRef={scrollRef}
        scrollbarSize={6}
        type="auto"
      >
        {messages.length === 0 ? (
          <Center h={280}>
            <Stack align="center" gap="sm">
              <Box
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: BRAND.purpleLight,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon
                  icon="solar:chat-round-dots-bold-duotone"
                  width={22}
                  style={{ color: BRAND.purple }}
                />
              </Box>
              <Text size="sm" c="dimmed" fw={500}>
                No messages yet
              </Text>
              <Text size="xs" c="dimmed" style={{ opacity: 0.6 }}>
                Start the conversation below
              </Text>
            </Stack>
          </Center>
        ) : (
          <Stack gap={0} p="md">
            {Object.entries(groupedMessages).map(([dateKey, dateMessages]) => (
              <Box key={dateKey}>
                {/* Date separator */}
                <Group justify="center" my="md" gap={10}>
                  <Box
                    style={{
                      flex: 1,
                      height: 1,
                      background: "var(--mantine-color-default-border)",
                    }}
                  />
                  <Text
                    size="xs"
                    c="dimmed"
                    fw={500}
                    style={{
                      fontSize: 10,
                      letterSpacing: "0.05em",
                      textTransform: "uppercase",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {formatDate(dateKey)}
                  </Text>
                  <Box
                    style={{
                      flex: 1,
                      height: 1,
                      background: "var(--mantine-color-default-border)",
                    }}
                  />
                </Group>

                {/* Messages */}
                <Stack gap={6}>
                  {dateMessages.map((msg, msgIdx) => {
                    const isOwn = msg.sender_id === currentUserId;
                    const pal = getAvatarPalette(msg.sender_username);

                    // Show avatar only on first message in a run from same sender
                    const prevMsg = dateMessages[msgIdx - 1];
                    const isFirstInRun =
                      !prevMsg || prevMsg.sender_id !== msg.sender_id;

                    return (
                      <Group
                        key={msg.id}
                        justify={isOwn ? "flex-end" : "flex-start"}
                        align="flex-end"
                        gap={8}
                        wrap="nowrap"
                      >
                        {/* Other user avatar (left side) */}
                        {!isOwn && (
                          <Box
                            style={{
                              width: 28,
                              flexShrink: 0,
                              alignSelf: "flex-end",
                            }}
                          >
                            {isFirstInRun ? (
                              <Avatar
                                size={28}
                                radius="xl"
                                style={{
                                  background: pal.bg,
                                  color: pal.color,
                                  fontSize: 9,
                                  fontWeight: 700,
                                }}
                              >
                                {getInitials(msg.sender_username)}
                              </Avatar>
                            ) : null}
                          </Box>
                        )}

                        {/* Bubble */}
                        <Stack
                          gap={2}
                          style={{
                            maxWidth: "62%",
                            alignItems: isOwn ? "flex-end" : "flex-start",
                          }}
                        >
                          {/* Sender name (other users, first in run only) */}
                          {!isOwn && isFirstInRun && (
                            <Text
                              size="xs"
                              fw={600}
                              c="dimmed"
                              style={{ paddingLeft: 2 }}
                            >
                              {msg.sender_username}
                            </Text>
                          )}

                          <Box
                            px="sm"
                            py={7}
                            style={{
                              borderRadius: isOwn
                                ? "14px 14px 4px 14px"
                                : "14px 14px 14px 4px",
                              background: isOwn
                                ? BRAND.purpleDark
                                : isDark
                                  ? "var(--mantine-color-dark-5)"
                                  : "var(--mantine-color-gray-1)",
                              color: isOwn
                                ? "#fff"
                                : "var(--mantine-color-text)",
                              maxWidth: "100%",
                            }}
                          >
                            <Text
                              size="sm"
                              style={{
                                lineHeight: 1.45,
                                color: "inherit",
                                wordBreak: "break-word",
                                whiteSpace: "pre-wrap",
                              }}
                            >
                              {msg.message}
                            </Text>
                          </Box>

                          {/* Timestamp */}
                          <Text
                            size="xs"
                            style={{
                              fontSize: 10,
                              color: "var(--mantine-color-dimmed)",
                              opacity: 0.65,
                              paddingInline: 2,
                            }}
                          >
                            {formatTime(msg.timestamp)}
                          </Text>
                        </Stack>

                        {/* Own avatar (right side) */}
                        {isOwn && (
                          <Box
                            style={{
                              width: 28,
                              flexShrink: 0,
                              alignSelf: "flex-end",
                            }}
                          >
                            {isFirstInRun ? (
                              <Avatar
                                size={28}
                                radius="xl"
                                style={{
                                  background: BRAND.purpleLight,
                                  color: BRAND.purpleText,
                                  fontSize: 9,
                                  fontWeight: 700,
                                }}
                              >
                                {getInitials(msg.sender_username)}
                              </Avatar>
                            ) : null}
                          </Box>
                        )}
                      </Group>
                    );
                  })}
                </Stack>
              </Box>
            ))}
          </Stack>
        )}
      </ScrollArea>

      {/* ── Input area ── */}
      <Box
        style={{
          borderTop: "0.5px solid var(--mantine-color-default-border)",
          padding: "10px 12px",
          flexShrink: 0,
        }}
      >
        {/* Offline warning */}
        {!isConnected && (
          <Group
            gap={6}
            mb={8}
            px="sm"
            py={6}
            style={{
              borderRadius: 8,
              background: BRAND.redLight,
              border: `0.5px solid ${BRAND.red}33`,
            }}
          >
            <Icon
              icon="solar:danger-triangle-linear"
              width={13}
              style={{ color: BRAND.red, flexShrink: 0 }}
            />
            <Text size="xs" style={{ color: BRAND.red }}>
              You're offline — messages cannot be sent
            </Text>
          </Group>
        )}

        <Group gap={8} align="flex-end" wrap="nowrap">
          <Textarea
            ref={inputRef}
            placeholder="Type a message… (Enter to send, Shift+Enter for new line)"
            value={inputValue}
            onChange={(e) => setInputValue(e.currentTarget.value)}
            onKeyDown={handleKeyDown}
            minRows={1}
            maxRows={5}
            disabled={!isConnected || sending}
            autosize
            style={{ flex: 1 }}
            styles={{
              input: {
                fontSize: 13,
                borderRadius: 10,
                border: "0.5px solid var(--mantine-color-default-border)",
                padding: "8px 12px",
                resize: "none",
                transition: "border-color .15s",
              },
            }}
          />

          <Tooltip
            label={canSend ? "Send message" : "Type a message first"}
            withArrow
            fz={11}
            position="top"
          >
            <ActionIcon
              size={36}
              radius={10}
              onClick={handleSend}
              disabled={!canSend}
              loading={sending}
              style={{
                background: canSend
                  ? BRAND.purpleDark
                  : "var(--mantine-color-default-hover)",
                border: "none",
                flexShrink: 0,
                transition: "background .15s, transform .15s",
              }}
              onMouseEnter={(e) => {
                if (canSend)
                  (e.currentTarget as HTMLButtonElement).style.transform =
                    "scale(1.05)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform =
                  "scale(1)";
              }}
            >
              <Icon
                icon="solar:send-bold-duotone"
                width={16}
                style={{
                  color: canSend ? "#fff" : "var(--mantine-color-dimmed)",
                }}
              />
            </ActionIcon>
          </Tooltip>
        </Group>

        <Text
          size="xs"
          c="dimmed"
          mt={4}
          style={{ fontSize: 10, opacity: 0.6 }}
        >
          Enter to send · Shift+Enter for new line
        </Text>
      </Box>
    </Paper>
  );
}
