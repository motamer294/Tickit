import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import {
  Container,
  Stack,
  Group,
  Button,
  Text,
  Textarea,
  Select,
  MultiSelect,
  Modal,
  SimpleGrid,
  TextInput,
  ActionIcon,
  Box,
  Divider,
  Tooltip,
  Skeleton,
  Loader,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";

import { Icon } from "@iconify-icon/react";
import { notifications } from "@/utils/customNotifications";
import { useAuth } from "@/hooks/useAuth";
import { CustomAlert } from "@/components/CustomAlert";
import { ChatSection } from "@/components/ChatSection";
import UserAvatar from "@/components/UserAvatar";
import {
  fetchTicketById,
  updateTicketStatusApi,
  addCommentApi,
  fetchTicketComments,
  assignTicketApi,
  deleteTicketApi,
  updateTicketApi,
  fetchCategoriesApi,
  fetchTagsApi,
} from "@/api/tickets.api";
import {
  fetchEmployeesWithTeamApi,
  groupEmployeesByTeamOnly,
} from "@/api/departments.api";
import type { TicketStatus } from "@/types/ticket";
import {
  B,
  STATUS_META,
  PRIORITY_META,
  SENTIMENT_META,
} from "@/utils/ticketUtils";
import { Pill, SLabel, Card, CardHeader } from "@/components/ticket/TicketCard";
import { AttachmentsSection } from "@/components/ticket/AttachmentsSection";

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function TicketDetailSkeleton() {
  return (
    <Container size="xl" py="lg">
      <Stack gap="md">
        <Skeleton height={16} width={110} radius="sm" />
        {/* Hero card */}
        <Box style={{ border: "0.5px solid var(--mantine-color-default-border)", borderRadius: 12, overflow: "hidden" }}>
          <Box px="lg" pt="lg" pb="md">
            <Skeleton height={11} width={80} mb={10} radius="sm" />
            <Skeleton height={20} mb={8} radius="sm" />
            <Skeleton height={20} width="55%" mb={12} radius="sm" />
            <Group gap={8}>
              <Skeleton height={26} width={68} radius="xl" />
              <Skeleton height={26} width={92} radius="xl" />
              <Skeleton height={26} width={76} radius="xl" />
            </Group>
          </Box>
          <Box px="lg" py="sm" style={{ borderTop: "0.5px solid var(--mantine-color-default-border)", background: "var(--mantine-color-default-hover)", display: "flex", gap: 28, flexWrap: "wrap" }}>
            <Skeleton height={40} width={120} radius="sm" />
            <Skeleton height={40} width={120} radius="sm" />
            <Skeleton height={40} width={90} radius="sm" />
          </Box>
        </Box>
        {/* Body */}
        <SimpleGrid cols={{ base: 1, md: 2 }} spacing={12} style={{ alignItems: "start" }}>
          <Stack gap={12}>
            <Skeleton height={140} radius="md" />
            <Skeleton height={260} radius="md" />
            <Skeleton height={320} radius="md" />
          </Stack>
          <Stack gap={12}>
            <Skeleton height={120} radius="md" />
            <Skeleton height={150} radius="md" />
            <Skeleton height={110} radius="md" />
            <Skeleton height={200} radius="md" />
          </Stack>
        </SimpleGrid>
      </Stack>
    </Container>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function TicketDetail() {
  const { ticketId } = useParams<{ ticketId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [commentText, setCommentText] = useState("");
  const [newStatus, setNewStatus] = useState<TicketStatus | null>(null);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedEmpId, setSelectedEmpId] = useState<string | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editPriority, setEditPriority] = useState<string | null>(null);
  const [editCategoryId, setEditCategoryId] = useState<string | null>(null);
  const [editTagIds, setEditTagIds] = useState<string[]>([]);
  const [origCategoryId, setOrigCategoryId] = useState<string | null>(null);
  const [origTagIds, setOrigTagIds] = useState<string[]>([]);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [chatModalOpen, setChatModalOpen] = useState(false);

  const isMobile = useMediaQuery("(max-width: 640px)");
  const ticketIdNum = parseInt(ticketId || "0");
  const isManager = user?.role === "MANAGER";

  const { data: employees = [], isLoading: empLoading } = useQuery({
    queryKey: ["employees-with-team"],
    queryFn: () => fetchEmployeesWithTeamApi(),
    enabled: isManager,
  });
  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategoriesApi,
    enabled: isManager,
  });
  const { data: tags = [] } = useQuery({
    queryKey: ["tags"],
    queryFn: fetchTagsApi,
    enabled: isManager,
  });

  const {
    data: ticket,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["ticket", ticketIdNum],
    queryFn: () => fetchTicketById(ticketIdNum),
    enabled: !!ticketIdNum,
  });

  const { data: comments = [] } = useQuery({
    queryKey: ["ticket-comments", ticketIdNum],
    queryFn: () => fetchTicketComments(ticketIdNum),
    enabled: !!ticketIdNum,
    staleTime: 0,
  });

  const statusMutation = useMutation({
    mutationFn: (s: TicketStatus) => updateTicketStatusApi(ticketIdNum, s),
    onSuccess: () => {
      notifications.show({
        title: "Status updated",
        message: "Ticket status updated",
        color: "green",
      });
      queryClient.invalidateQueries({ queryKey: ["ticket", ticketIdNum] });
      setNewStatus(null);
    },
    onError: (e: any) =>
      notifications.show({ title: "Error", message: e.message, color: "red" }),
  });

  const commentMutation = useMutation({
    mutationFn: () => addCommentApi(ticketIdNum, commentText),
    onSuccess: () => {
      notifications.show({
        title: "Comment posted",
        message: "Your comment has been added",
        color: "green",
      });
      queryClient.invalidateQueries({
        queryKey: ["ticket-comments", ticketIdNum],
      });
      setCommentText("");
    },
    onError: (e: any) =>
      notifications.show({ title: "Error", message: e.message, color: "red" }),
  });

  const assignMutation = useMutation({
    mutationFn: (id: number) => assignTicketApi(ticketIdNum, id),
    onSuccess: () => {
      notifications.show({
        title: "Assigned",
        message: "Ticket reassigned successfully",
        color: "green",
      });
      queryClient.invalidateQueries({ queryKey: ["ticket", ticketIdNum] });
      queryClient.invalidateQueries({ queryKey: ["tickets"], exact: false });
      setAssignModalOpen(false);
      setSelectedEmpId(null);
    },
    onError: (e: any) =>
      notifications.show({ title: "Error", message: e.message, color: "red" }),
  });

  const updateMutation = useMutation({
    mutationFn: () => {
      const d: any = { title: editTitle, description: editDesc };
      if (editPriority) d.priority = editPriority;
      if (editCategoryId !== origCategoryId)
        d.category_id = editCategoryId ? parseInt(editCategoryId) : null;
      const changed =
        editTagIds.length !== origTagIds.length ||
        editTagIds.some((id, i) => id !== origTagIds[i]);
      if (changed) d.tag_ids = editTagIds.map(Number);
      return updateTicketApi(ticketIdNum, d);
    },
    onSuccess: () => {
      notifications.show({
        title: "Updated",
        message: "Ticket updated",
        color: "green",
      });
      queryClient.invalidateQueries({ queryKey: ["ticket", ticketIdNum] });
      queryClient.invalidateQueries({ queryKey: ["tickets"], exact: false });
      setEditModalOpen(false);
    },
    onError: (e: any) =>
      notifications.show({ title: "Error", message: e.message, color: "red" }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteTicketApi(ticketIdNum),
    onSuccess: () => {
      notifications.show({
        title: "Deleted",
        message: "Ticket deleted",
        color: "green",
      });
      navigate("..");
    },
    onError: (e: any) =>
      notifications.show({ title: "Error", message: e.message, color: "red" }),
  });

  if (isLoading) return <TicketDetailSkeleton />;

  if (error || !ticket) {
    return (
      <Container py="lg">
        <Stack gap="lg">
          <CustomAlert variant="error" title="Unable to Load Ticket">
            {error instanceof Error
              ? error.message
              : "Ticket not found or has been deleted"}
          </CustomAlert>
          <Button variant="default" size="sm" onClick={() => navigate("..")}>
            ← Back to Tickets
          </Button>
        </Stack>
      </Container>
    );
  }

  const statusM = STATUS_META[ticket.status] ?? STATUS_META.OPEN;
  const priorityM =
    PRIORITY_META[ticket.priority ?? "MEDIUM"] ?? PRIORITY_META.MEDIUM;
  const sentimentM =
    SENTIMENT_META[ticket.sentiment ?? "Neutral"] ?? SENTIMENT_META.Neutral;
  const canUpdateStatus = isManager || ticket.assigned_to_id === user?.id;

  const openEdit = () => {
    const catId = ticket.category?.id ? String(ticket.category.id) : null;
    const tagIds = ticket.tags?.map((t: any) => String(t.id)) || [];
    setEditTitle(ticket.title);
    setEditDesc(ticket.description);
    setEditPriority(ticket.priority ?? null);
    setEditCategoryId(catId);
    setEditTagIds(tagIds);
    setOrigCategoryId(catId);
    setOrigTagIds(tagIds);
    setEditModalOpen(true);
  };

  // ─── Shared modal title builder ──────────────────────────────────────────────
  const mTitle = (icon: string, label: string, color = B.purple) => (
    <Group gap={8}>
      <Icon icon={icon} width={18} style={{ color }} />
      <Text fw={500} size="sm">
        {label}
      </Text>
    </Group>
  );
  const mStyles = {
    header: {
      borderBottom: "0.5px solid var(--mantine-color-default-border)",
      paddingBottom: 12,
    },
    body: { paddingTop: 16 },
  };

  return (
    <Container size="xl" py="lg">
      <Stack gap="md">
        {/* ── Back nav ─────────────────────────────────────────────────────── */}
        <Group
          gap={6}
          style={{ cursor: "pointer", width: "fit-content" }}
          onClick={() => navigate("..")}
        >
          <Icon
            icon="solar:arrow-left-linear"
            width={15}
            style={{ color: "var(--mantine-color-dimmed)" }}
          />
          <Text size="sm" c="dimmed">
            Back to tickets
          </Text>
        </Group>

        {/* ── Hero card ────────────────────────────────────────────────────── */}
        <Card>
          {/* Title area */}
          <Box px={{ base: "md", sm: "lg" }} pt={{ base: "md", sm: "lg" }} pb="md">
            <Text
              size="xs"
              fw={500}
              c="dimmed"
              tt="uppercase"
              style={{ letterSpacing: "0.06em", marginBottom: 6 }}
            >
              Ticket #{ticket.id}
            </Text>
            <Text
              fw={500}
              style={{ fontSize: 18, lineHeight: 1.35, marginBottom: 12 }}
            >
              {ticket.title}
            </Text>
            {/* Badges row */}
            <Group gap={8} wrap="wrap">
              <Pill {...statusM} />
              {ticket.priority && (
                <Pill
                  label={
                    ticket.priority.charAt(0) +
                    ticket.priority.slice(1).toLowerCase() +
                    " priority"
                  }
                  {...priorityM}
                />
              )}
              {ticket.category && (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    fontSize: 11,
                    fontWeight: 500,
                    padding: "4px 10px",
                    borderRadius: 20,
                    background: (ticket.category.color || B.gray) + "22",
                    color: ticket.category.color || B.gray,
                    whiteSpace: "nowrap",
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: ticket.category.color || B.gray,
                      flexShrink: 0,
                    }}
                  />
                  {ticket.category.name}
                </span>
              )}
              {ticket.sentiment && (
                <Pill label={ticket.sentiment + " sentiment"} {...sentimentM} />
              )}
            </Group>
          </Box>

          {/* Meta bar */}
          <Box
            px={{ base: "md", sm: "lg" }}
            py="sm"
            style={{
              borderTop: "0.5px solid var(--mantine-color-default-border)",
              background: "var(--mantine-color-default-hover)",
              display: "flex",
              alignItems: "center",
              gap: 28,
              rowGap: 10,
              flexWrap: "wrap",
            }}
          >
            {/* Creator */}
            {[
              { label: "Created by", name: ticket.creator_username, id: ticket.creator_id },
              {
                label: "Assigned to",
                name: ticket.assigned_to_username,
                id: ticket.assigned_to_id,
                isAssignee: true,
              },
            ].map((m) => {
              const isUnassigned = m.name === "Unassigned";
              return (
                <Box key={m.label}>
                  <Text
                    size="xs"
                    fw={500}
                    c="dimmed"
                    tt="uppercase"
                    style={{ letterSpacing: "0.06em", marginBottom: 3 }}
                  >
                    {m.label}
                  </Text>
                  <Group gap={7} wrap="nowrap">
                    {!isUnassigned && (
                      <UserAvatar
                        userId={m.id}
                        name={m.name}
                        size={20}
                        radius="xl"
                        style={{ fontSize: 8, fontWeight: 700 }}
                      />
                    )}
                    <Text
                      size="sm"
                      fw={500}
                      c={isUnassigned ? "dimmed" : undefined}
                    >
                      {m.name}
                    </Text>
                    {m.isAssignee && isManager && (
                      <Text
                        size="xs"
                        fw={500}
                        style={{
                          color: B.purple,
                          cursor: "pointer",
                          lineHeight: 1,
                        }}
                        onClick={() => setAssignModalOpen(true)}
                      >
                        Reassign
                      </Text>
                    )}
                  </Group>
                </Box>
              );
            })}

            {/* Created date */}
            <Box>
              <Text
                size="xs"
                fw={500}
                c="dimmed"
                tt="uppercase"
                style={{ letterSpacing: "0.06em", marginBottom: 3 }}
              >
                Created
              </Text>
              <Text size="sm" fw={500}>
                {new Date(ticket.created_at).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </Text>
            </Box>

            {/* Actions */}
            {isManager && (
              <Group gap={6} style={{ marginLeft: isMobile ? 0 : "auto" }}>
                <Tooltip label="Edit ticket" withArrow fz={11}>
                  <ActionIcon variant="default" size="md" radius="md" onClick={openEdit}>
                    <Icon icon="solar:pen-2-linear" width={15} style={{ color: B.purpleDark }} />
                  </ActionIcon>
                </Tooltip>
                <Tooltip label="Delete ticket" withArrow fz={11}>
                  <ActionIcon variant="default" size="md" radius="md" onClick={() => setDeleteConfirmOpen(true)}>
                    <Icon icon="solar:trash-bin-2-linear" width={15} style={{ color: B.red }} />
                  </ActionIcon>
                </Tooltip>
              </Group>
            )}
          </Box>
        </Card>

        {/* ── Two-column body ───────────────────────────────────────────────── */}
        <Box className="td-grid">
          {/* LEFT column */}
          <Stack gap={12}>
            {/* Description */}
            <Card>
              <CardHeader
                left={
                  <>
                    <Icon
                      icon="solar:document-text-bold-duotone"
                      width={15}
                      style={{ color: B.purple }}
                    />
                    <SLabel>Description</SLabel>
                  </>
                }
              />
              <Box p={{ base: "md", sm: "lg" }}>
                <Text
                  size="sm"
                  style={{
                    lineHeight: 1.75,
                    whiteSpace: "pre-wrap",
                    color: "var(--mantine-color-dimmed)",
                  }}
                >
                  {ticket.description}
                </Text>
              </Box>
            </Card>

            {/* AI Analysis */}
            <Card>
              <CardHeader
                left={
                  <>
                    <Icon
                      icon="solar:cpu-bolt-bold-duotone"
                      width={15}
                      style={{ color: B.purple }}
                    />
                    <SLabel>AI analysis</SLabel>
                  </>
                }
                right={
                  <Text size="xs" c="dimmed" className="td-ai-hint">
                    Auto-analyzed by ML Engine
                  </Text>
                }
              />
              <Box p="md">
                {/* ── AI processing states ── */}
                {(ticket.ai_status === "PENDING" || ticket.ai_status === "PROCESSING") && (
                  <Box
                    p="sm"
                    mb="md"
                    style={{
                      borderRadius: 10,
                      background: B.purpleLight,
                      border: `0.5px solid ${B.purpleMid}44`,
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <Loader size={14} color={B.purple} type="dots" />
                    <Text size="xs" fw={500} style={{ color: B.purpleDeep }}>
                      {ticket.ai_status === "PROCESSING"
                        ? "AI is analysing your ticket…"
                        : "AI analysis queued — results will appear shortly"}
                    </Text>
                  </Box>
                )}

                {ticket.ai_status === "FAILED" && (
                  <Box
                    p="sm"
                    mb="md"
                    style={{
                      borderRadius: 10,
                      background: "#FCEBEB",
                      border: `0.5px solid ${B.red}33`,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <Icon icon="solar:danger-triangle-bold-duotone" width={14} style={{ color: B.red, flexShrink: 0 }} />
                    <Text size="xs" fw={500} style={{ color: B.redText }}>
                      AI analysis failed. The ticket has been saved — a support agent will triage it manually.
                    </Text>
                  </Box>
                )}

                {/* ── Stat cards (show skeleton while AI is running) ── */}
                <SimpleGrid cols={{ base: 2, sm: 4 }} spacing={10} mb="md">
                  {/* Category */}
                  <Box p="sm" style={{ borderRadius: 8, border: "0.5px solid var(--mantine-color-default-border)" }}>
                    <Group justify="space-between" mb={6}>
                      <Text size="xs" c="dimmed" fw={500}>Category</Text>
                      <Icon icon="solar:folder-bold-duotone" width={13} style={{ color: "var(--mantine-color-dimmed)" }} />
                    </Group>
                    {ticket.ai_status === "PENDING" || ticket.ai_status === "PROCESSING" ? (
                      <Skeleton height={18} width="70%" radius="sm" />
                    ) : ticket.category ? (
                      <Group gap={6} wrap="nowrap">
                        <Box style={{ width: 8, height: 8, borderRadius: "50%", background: ticket.category.color, boxShadow: `0 0 0 2px ${ticket.category.color}33`, flexShrink: 0 }} />
                        <Text size="xs" fw={600}>{ticket.category.name}</Text>
                      </Group>
                    ) : (
                      <Text size="xs" c="dimmed">—</Text>
                    )}
                  </Box>

                  {/* Priority */}
                  <Box p="sm" style={{ borderRadius: 8, border: "0.5px solid var(--mantine-color-default-border)" }}>
                    <Group justify="space-between" mb={6}>
                      <Text size="xs" c="dimmed" fw={500}>Priority</Text>
                      <Icon icon="solar:bolt-bold-duotone" width={13} style={{ color: priorityM.dot }} />
                    </Group>
                    <Pill label={ticket.priority ?? "—"} {...priorityM} />
                  </Box>

                  {/* Sentiment */}
                  <Box p="sm" style={{ borderRadius: 8, border: "0.5px solid var(--mantine-color-default-border)" }}>
                    <Group justify="space-between" mb={6}>
                      <Text size="xs" c="dimmed" fw={500}>Sentiment</Text>
                      <Icon icon={sentimentM.icon} width={13} style={{ color: sentimentM.dot }} />
                    </Group>
                    {ticket.ai_status === "PENDING" || ticket.ai_status === "PROCESSING" ? (
                      <Skeleton height={18} width="60%" radius="sm" />
                    ) : (
                      <Pill label={ticket.sentiment ?? "—"} {...sentimentM} />
                    )}
                  </Box>

                  {/* Status */}
                  <Box p="sm" style={{ borderRadius: 8, border: "0.5px solid var(--mantine-color-default-border)" }}>
                    <Group justify="space-between" mb={6}>
                      <Text size="xs" c="dimmed" fw={500}>Status</Text>
                      <Icon icon="solar:clipboard-list-bold-duotone" width={13} style={{ color: statusM.dot }} />
                    </Group>
                    <Pill {...statusM} />
                  </Box>
                </SimpleGrid>

                {/* Tags */}
                {ticket.tags?.length > 0 && (
                  <Group gap={6} wrap="wrap" mb="md">
                    <Text size="xs" c="dimmed" fw={500} style={{ alignSelf: "center" }}>Tags</Text>
                    {ticket.tags.map((tag: any) => (
                      <span
                        key={tag.id}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          fontSize: 11,
                          fontWeight: 500,
                          padding: "3px 9px",
                          borderRadius: 20,
                          background: (tag.color || B.gray) + "22",
                          color: tag.color || B.gray,
                        }}
                      >
                        <span style={{ width: 5, height: 5, borderRadius: "50%", background: tag.color || B.gray }} />
                        #{tag.name}
                      </span>
                    ))}
                  </Group>
                )}

                {/* AI Suggested Solution */}
                {(ticket.ai_status === "PENDING" || ticket.ai_status === "PROCESSING") && (
                  <Box p="md" style={{ borderRadius: 10, background: B.purpleLight, border: `0.5px solid ${B.purpleMid}44` }}>
                    <Group gap={7} mb={10}>
                      <Icon icon="solar:lightbulb-bold-duotone" width={14} style={{ color: B.purple }} />
                      <Text size="xs" fw={600} style={{ color: B.purpleDeep }}>AI suggested solution</Text>
                    </Group>
                    <Skeleton height={12} mb={6} radius="sm" />
                    <Skeleton height={12} mb={6} width="90%" radius="sm" />
                    <Skeleton height={12} width="75%" radius="sm" />
                  </Box>
                )}

                {ticket.ai_status === "DONE" && ticket.ai_suggested_solution && (
                  <Box p="md" style={{ borderRadius: 10, background: B.purpleLight, border: `0.5px solid ${B.purpleMid}44` }}>
                    <Group gap={7} mb={8}>
                      <Icon icon="solar:lightbulb-bold-duotone" width={14} style={{ color: B.purple }} />
                      <Text size="xs" fw={600} style={{ color: B.purpleDeep }}>AI suggested solution</Text>
                    </Group>
                    <Text size="sm" style={{ lineHeight: 1.65, color: B.purpleDark }}>
                      {ticket.ai_suggested_solution}
                    </Text>
                  </Box>
                )}
              </Box>
            </Card>

            {/* Comments */}
            <Card>
              <CardHeader
                left={
                  <>
                    <Icon
                      icon="solar:chat-round-dots-bold-duotone"
                      width={15}
                      style={{ color: B.purple }}
                    />
                    <SLabel>Comments</SLabel>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        padding: "2px 7px",
                        borderRadius: 10,
                        background: B.purpleLight,
                        color: B.purpleDeep,
                      }}
                    >
                      {comments.length}
                    </span>
                  </>
                }
                right={
                  <Button
                    variant="default"
                    size="xs"
                    leftSection={
                      <Icon icon="solar:chat-square-bold-duotone" width={13} />
                    }
                    onClick={() => setChatModalOpen(true)}
                  >
                    Live chat
                  </Button>
                }
              />

              {/* Comment list */}
              {comments.length === 0 ? (
                <Box py="xl" style={{ textAlign: "center" }}>
                  <Text size="sm" c="dimmed">
                    No comments yet — be the first
                  </Text>
                </Box>
              ) : (
                <Stack gap={0}>
                  {comments.map((comment: any, idx: number) => {
                    return (
                      <Box
                        key={comment.id}
                        px="lg"
                        py="md"
                        style={{
                          borderBottom:
                            idx < comments.length - 1
                              ? "0.5px solid var(--mantine-color-default-border)"
                              : "none",
                        }}
                      >
                        <Group gap={10} align="flex-start" wrap="nowrap">
                          <UserAvatar
                            userId={comment.author_id}
                            name={comment.author_username}
                            size={28}
                            radius="xl"
                            style={{
                              fontSize: 9,
                              fontWeight: 700,
                              flexShrink: 0,
                              marginTop: 2,
                            }}
                          />
                          <Box style={{ flex: 1, minWidth: 0 }}>
                            <Group gap={8} mb={6}>
                              <Text size="xs" fw={600}>
                                {comment.author_username}
                              </Text>
                              <Text
                                size="xs"
                                c="dimmed"
                                style={{ fontSize: 10 }}
                              >
                                {new Date(
                                  comment.created_at,
                                ).toLocaleDateString(undefined, {
                                  month: "short",
                                  day: "numeric",
                                })}{" "}
                                ·{" "}
                                {new Date(
                                  comment.created_at,
                                ).toLocaleTimeString(undefined, {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </Text>
                            </Group>
                            <Box
                              px="sm"
                              py={8}
                              style={{
                                borderRadius: "2px 10px 10px 10px",
                                background:
                                  "var(--mantine-color-default-hover)",
                                border:
                                  "0.5px solid var(--mantine-color-default-border)",
                              }}
                            >
                              <Text
                                size="sm"
                                style={{
                                  lineHeight: 1.55,
                                  whiteSpace: "pre-wrap",
                                }}
                              >
                                {comment.text}
                              </Text>
                            </Box>
                          </Box>
                        </Group>
                      </Box>
                    );
                  })}
                </Stack>
              )}

              {/* Add comment */}
              <Box
                px="lg"
                py="md"
                style={{
                  borderTop: "0.5px solid var(--mantine-color-default-border)",
                }}
              >
                <Textarea
                  placeholder="Write a comment… (Enter to post, Shift+Enter for new line)"
                  value={commentText}
                  onChange={(e) => setCommentText(e.currentTarget.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      if (commentText.trim()) commentMutation.mutate();
                    }
                  }}
                  minRows={2}
                  maxRows={6}
                  autosize
                  mb={8}
                  styles={{
                    input: {
                      fontSize: 13,
                      borderRadius: 8,
                      border: "0.5px solid var(--mantine-color-default-border)",
                      background: "var(--mantine-color-default-hover)",
                    },
                  }}
                />
                <Group justify="flex-end">
                  <Button
                    size="sm"
                    style={{
                      background: commentText.trim() ? B.purpleDark : undefined,
                      border: "none",
                    }}
                    loading={commentMutation.isPending}
                    disabled={!commentText.trim()}
                    onClick={() => commentMutation.mutate()}
                    leftSection={
                      <Icon icon="solar:send-bold-duotone" width={13} />
                    }
                  >
                    Post comment
                  </Button>
                </Group>
              </Box>
            </Card>
          </Stack>

          {/* RIGHT sidebar */}
          <Stack gap={12}>
            {/* Update status */}
            {canUpdateStatus && (ticket.available_transitions?.length ?? 0) > 0 && (
              <Card>
                <CardHeader
                  left={
                    <>
                      <Icon
                        icon="solar:refresh-circle-bold-duotone"
                        width={15}
                        style={{ color: B.purple }}
                      />
                      <SLabel>Update status</SLabel>
                    </>
                  }
                />
                <Box p="md">
                  <Select
                    placeholder="Select new status…"
                    data={(ticket.available_transitions ?? []).map((t: any) => ({
                      value: t.status,
                      label: t.label,
                    }))}
                    value={newStatus}
                    onChange={(val) => setNewStatus(val as TicketStatus)}
                    clearable
                    mb="sm"
                    styles={{ input: { fontSize: 13 } }}
                  />
                  <Button
                    size="sm"
                    fullWidth
                    style={{
                      background: newStatus ? B.purpleDark : undefined,
                      border: "none",
                      justifyContent: "center",
                    }}
                    loading={statusMutation.isPending}
                    disabled={!newStatus}
                    onClick={() => {
                      if (newStatus) statusMutation.mutate(newStatus);
                    }}
                  >
                    Update status
                  </Button>
                </Box>
              </Card>
            )}

            {/* Assignee card */}
            <Card>
              <CardHeader
                left={
                  <>
                    <Icon
                      icon="solar:user-check-bold-duotone"
                      width={15}
                      style={{ color: B.purple }}
                    />
                    <SLabel>Assignee</SLabel>
                  </>
                }
                right={
                  isManager && (
                    <Text
                      size="xs"
                      fw={500}
                      style={{ color: B.purple, cursor: "pointer" }}
                      onClick={() => setAssignModalOpen(true)}
                    >
                      Reassign
                    </Text>
                  )
                }
              />
              <Box p="md">
                {ticket.assigned_to_username === "Unassigned" ? (
                  <Group
                    gap={8}
                    px="sm"
                    py="sm"
                    style={{
                      borderRadius: 8,
                      background: "var(--mantine-color-default-hover)",
                      border: "0.5px solid var(--mantine-color-default-border)",
                    }}
                  >
                    <Icon
                      icon="solar:user-linear"
                      width={14}
                      style={{ color: "var(--mantine-color-dimmed)" }}
                    />
                    <Text size="sm" c="dimmed">
                      Unassigned
                    </Text>
                    {isManager && (
                      <Button
                        variant="subtle"
                        size="xs"
                        style={{
                          color: B.purpleDark,
                          marginLeft: "auto",
                          padding: "0 4px",
                        }}
                        onClick={() => setAssignModalOpen(true)}
                      >
                        Assign now
                      </Button>
                    )}
                  </Group>
                ) : (
                  <Group
                    gap={10}
                    px="sm"
                    py="sm"
                    style={{
                      borderRadius: 8,
                      background: "var(--mantine-color-default-hover)",
                      border: "0.5px solid var(--mantine-color-default-border)",
                    }}
                  >
                    <UserAvatar
                      userId={ticket.assigned_to_id}
                      name={ticket.assigned_to_username}
                      size={32}
                      radius="xl"
                      style={{ fontSize: 10, fontWeight: 700 }}
                    />
                    <Box style={{ flex: 1, minWidth: 0 }}>
                      <Text size="sm" fw={500}>
                        {ticket.assigned_to_username}
                      </Text>
                      <Text size="xs" c="dimmed">
                        Assigned agent
                      </Text>
                    </Box>
                  </Group>
                )}
              </Box>
            </Card>

            {/* Live chat teaser */}
            <Card>
              <CardHeader
                left={
                  <>
                    <Box
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: "50%",
                        background: B.green,
                        animation: "pulse 2s infinite",
                        boxShadow: `0 0 0 2px ${B.greenLight}`,
                      }}
                    />
                    <SLabel>Live chat</SLabel>
                  </>
                }
              />
              <Box p="md">
                <Text size="xs" c="dimmed" mb="sm">
                  Real-time messaging via WebSocket — see instant replies from
                  the assigned team.
                </Text>
                <Button
                  fullWidth
                  size="sm"
                  variant="default"
                  leftSection={
                    <Icon
                      icon="solar:chat-round-dots-bold-duotone"
                      width={14}
                      style={{ color: B.purple }}
                    />
                  }
                  onClick={() => setChatModalOpen(true)}
                  style={{
                    justifyContent: "center",
                    borderColor: `${B.purple}44`,
                    background: B.purpleLight,
                  }}
                >
                  <Text size="sm" fw={500} style={{ color: B.purpleDeep }}>
                    Open live chat
                  </Text>
                </Button>
              </Box>
            </Card>

            {/* Attachments sidebar card */}
            <Card>
              <AttachmentsSection ticket={ticket} queryClient={queryClient} />
            </Card>
          </Stack>
        </Box>
      </Stack>

      {/* ── Modals ──────────────────────────────────────────────────────────── */}

      {/* Assign */}
      <Modal
        opened={assignModalOpen}
        onClose={() => {
          setAssignModalOpen(false);
          setSelectedEmpId(null);
        }}
        title={mTitle("solar:user-check-bold-duotone", "Reassign ticket")}
        centered
        size="sm"
        radius="md"
        styles={mStyles}
      >
        <Stack gap="md">
          <Select
            label={
              <Text size="xs" fw={500} mb={4}>
                Select employee
              </Text>
            }
            placeholder={empLoading ? "Loading…" : "Search employees…"}
            data={groupEmployeesByTeamOnly(employees)}
            value={selectedEmpId}
            onChange={setSelectedEmpId}
            disabled={empLoading || employees.length === 0}
            searchable
            clearable
            leftSection={
              <Icon
                icon="solar:user-linear"
                width={14}
                style={{ color: "var(--mantine-color-dimmed)" }}
              />
            }
            styles={{ input: { fontSize: 13 } }}
          />
          <Divider />
          <Group justify="flex-end" gap={8}>
            <Button
              variant="default"
              size="sm"
              onClick={() => {
                setAssignModalOpen(false);
                setSelectedEmpId(null);
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              style={{ background: B.purpleDark, border: "none" }}
              loading={assignMutation.isPending}
              disabled={!selectedEmpId}
              onClick={() => {
                if (selectedEmpId) assignMutation.mutate(Number(selectedEmpId));
              }}
            >
              Assign
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Edit */}
      <Modal
        opened={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title={mTitle("solar:pen-2-bold-duotone", "Edit ticket")}
        centered
        size="lg"
        radius="md"
        styles={mStyles}
      >
        <Stack gap="md">
          <TextInput
            label={
              <Text size="xs" fw={500} mb={4}>
                Title
              </Text>
            }
            value={editTitle}
            onChange={(e) => setEditTitle(e.currentTarget.value)}
            styles={{ input: { fontSize: 13 } }}
          />
          <Textarea
            label={
              <Text size="xs" fw={500} mb={4}>
                Description
              </Text>
            }
            value={editDesc}
            onChange={(e) => setEditDesc(e.currentTarget.value)}
            minRows={5}
            maxRows={12}
            autosize
            styles={{ input: { fontSize: 13 } }}
          />
          <Group grow gap="md">
            <Select
              label={
                <Text size="xs" fw={500} mb={4}>
                  Priority
                </Text>
              }
              data={[
                { value: "LOW", label: "Low" },
                { value: "MEDIUM", label: "Medium" },
                { value: "HIGH", label: "High" },
                { value: "URGENT", label: "Urgent" },
              ]}
              value={editPriority}
              onChange={setEditPriority}
              clearable
              styles={{ input: { fontSize: 13 } }}
            />
            <Select
              label={
                <Text size="xs" fw={500} mb={4}>
                  Category
                </Text>
              }
              placeholder="Any category"
              data={categories.map((c: any) => ({
                value: String(c.id),
                label: c.name,
              }))}
              value={editCategoryId}
              onChange={setEditCategoryId}
              clearable
              styles={{ input: { fontSize: 13 } }}
            />
          </Group>
          <MultiSelect
            label={
              <Text size="xs" fw={500} mb={4}>
                Tags
              </Text>
            }
            placeholder="Select tags…"
            data={tags.map((t: any) => ({
              value: String(t.id),
              label: t.name,
            }))}
            value={editTagIds}
            onChange={setEditTagIds}
            clearable
            searchable
            styles={{ input: { fontSize: 13 } }}
          />
          <Divider />
          <Group justify="flex-end" gap={8}>
            <Button
              variant="default"
              size="sm"
              onClick={() => setEditModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              style={{ background: B.purpleDark, border: "none" }}
              loading={updateMutation.isPending}
              disabled={!editTitle.trim() || !editDesc.trim()}
              onClick={() => updateMutation.mutate()}
            >
              Save changes
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Delete */}
      <Modal
        opened={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        title={mTitle(
          "solar:danger-triangle-bold-duotone",
          "Delete ticket",
          B.red,
        )}
        centered
        size="sm"
        radius="md"
        styles={mStyles}
      >
        <Stack gap="lg">
          <Box
            p="sm"
            style={{
              borderRadius: 8,
              background: B.redLight,
              border: `0.5px solid ${B.red}33`,
            }}
          >
            <Group gap={8} align="flex-start">
              <Icon
                icon="solar:info-circle-linear"
                width={14}
                style={{ color: B.red, flexShrink: 0, marginTop: 1 }}
              />
              <Text size="sm" style={{ color: B.redText }}>
                You are about to permanently delete{" "}
                <strong>
                  #{ticket.id} — {ticket.title}
                </strong>
                . This cannot be undone.
              </Text>
            </Group>
          </Box>
          <Group justify="flex-end" gap={8}>
            <Button
              variant="default"
              size="sm"
              onClick={() => setDeleteConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              style={{ background: B.red, border: "none" }}
              loading={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate()}
            >
              Delete ticket
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Chat */}
      <Modal
        opened={chatModalOpen}
        onClose={() => setChatModalOpen(false)}
        title={mTitle(
          "solar:chat-round-dots-bold-duotone",
          `Live chat · Ticket #${ticketIdNum}`,
        )}
        size="lg"
        centered
        radius="md"
        styles={{
          header: {
            borderBottom: "0.5px solid var(--mantine-color-default-border)",
            paddingBottom: 12,
          },
          body: { paddingTop: 0 },
        }}
      >
        <ChatSection ticketId={ticketIdNum} currentUserId={user!.id} />
      </Modal>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.3} }
        .td-grid { display:grid; grid-template-columns:1fr 300px; gap:12px; align-items:start; }
        @media (max-width:768px) {
          .td-grid { grid-template-columns:1fr; }
          .td-ai-hint { display:none; }
        }
      `}</style>
    </Container>
  );
}
