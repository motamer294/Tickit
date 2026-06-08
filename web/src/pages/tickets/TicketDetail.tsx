import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import { useRef, useEffect, useState } from "react";
import {
  Container,
  Loader,
  Center,
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
  Progress,
  Box,
  Divider,
  Tooltip,
  Avatar,
} from "@mantine/core";
import { Icon } from "@iconify-icon/react";
import { notifications } from "@/utils/customNotifications";
import { useAuth } from "@/hooks/useAuth";
import { CustomAlert } from "@/components/CustomAlert";
import { ChatSection } from "@/components/ChatSection";
import {
  fetchTicketById,
  updateTicketStatusApi,
  addCommentApi,
  fetchTicketComments,
  assignTicketApi,
  deleteTicketApi,
  updateTicketApi,
  uploadAttachmentApi,
  deleteAttachmentApi,
  downloadAttachmentBlob,
  fetchCategoriesApi,
  fetchTagsApi,
} from "@/api/tickets.api";
import {
  fetchEmployeesWithTeamApi,
  groupEmployeesByTeamOnly,
} from "@/api/departments.api";
import type { TicketStatus } from "@/types/ticket";

// ─── Brand ────────────────────────────────────────────────────────────────────

const B = {
  purple: "#7F77DD",
  purpleDark: "#534AB7",
  purpleDeep: "#3C3489",
  purpleLight: "#EEEDFE",
  purpleMid: "#AFA9EC",
  red: "#E24B4A",
  redLight: "#FCEBEB",
  redText: "#791F1F",
  amber: "#EF9F27",
  amberLight: "#FAEEDA",
  amberText: "#633806",
  green: "#639922",
  greenLight: "#EAF3DE",
  greenText: "#27500A",
  gray: "#B4B2A9",
  grayLight: "#F1EFE8",
  grayText: "#444441",
  blue: "#378ADD",
  blueLight: "#E6F1FB",
  blueText: "#0C447C",
};

const AVATAR_PALETTES = [
  { bg: "#EEEDFE", color: "#3C3489" },
  { bg: "#E1F5EE", color: "#085041" },
  { bg: "#FAEEDA", color: "#633806" },
  { bg: "#FAECE7", color: "#712B13" },
  { bg: "#E6F1FB", color: "#0C447C" },
  { bg: "#FBEAF0", color: "#72243E" },
];

const STATUS_META: Record<
  TicketStatus,
  { label: string; bg: string; text: string; dot: string }
> = {
  OPEN: { label: "Open", bg: B.redLight, text: B.redText, dot: B.red },
  PENDING: { label: "Pending", bg: B.blueLight, text: B.blueText, dot: B.blue },
  IN_PROGRESS: {
    label: "In Progress",
    bg: B.amberLight,
    text: B.amberText,
    dot: B.amber,
  },
  RESOLVED: {
    label: "Resolved",
    bg: B.greenLight,
    text: B.greenText,
    dot: B.green,
  },
  CLOSED: { label: "Closed", bg: B.grayLight, text: B.grayText, dot: B.gray },
};

const PRIORITY_META: Record<string, { bg: string; text: string; dot: string }> =
  {
    LOW: { bg: B.greenLight, text: B.greenText, dot: B.green },
    MEDIUM: { bg: B.amberLight, text: B.amberText, dot: B.amber },
    HIGH: { bg: B.redLight, text: B.redText, dot: B.red },
    URGENT: { bg: B.redLight, text: B.redText, dot: B.red },
  };

const SENTIMENT_META: Record<
  string,
  { bg: string; text: string; dot: string; icon: string }
> = {
  Positive: {
    bg: B.greenLight,
    text: B.greenText,
    dot: B.green,
    icon: "solar:smile-circle-bold-duotone",
  },
  Neutral: {
    bg: B.blueLight,
    text: B.blueText,
    dot: B.blue,
    icon: "solar:face-id-bold-duotone",
  },
  Negative: {
    bg: B.redLight,
    text: B.redText,
    dot: B.red,
    icon: "solar:sad-circle-bold-duotone",
  },
};

// ─── Tiny helpers ─────────────────────────────────────────────────────────────

function getInitials(name = "") {
  return (
    name
      .split(/[\s._-]/)
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?"
  );
}
function getAvatarPal(name = "") {
  const idx = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return AVATAR_PALETTES[idx % AVATAR_PALETTES.length];
}
function formatFileSize(bytes: number) {
  if (!bytes) return "0 B";
  const k = 1024,
    s = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return (bytes / k ** i).toFixed(1) + " " + s[i];
}
function fileIcon(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext))
    return "solar:gallery-bold-duotone";
  if (ext === "pdf") return "solar:file-pdf-bold-duotone";
  if (["doc", "docx"].includes(ext)) return "solar:file-text-bold-duotone";
  return "solar:file-bold-duotone";
}

// ─── Shared micro-components ──────────────────────────────────────────────────

/** Dot-pill badge — matches every page in the app */
function Pill({
  label,
  bg,
  text,
  dot,
}: {
  label: string;
  bg: string;
  text: string;
  dot: string;
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        fontSize: 11,
        fontWeight: 500,
        padding: "4px 10px",
        borderRadius: 20,
        background: bg,
        color: text,
        whiteSpace: "nowrap",
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: dot,
          flexShrink: 0,
        }}
      />
      {label}
    </span>
  );
}

/** Section label — uppercase xs text, used throughout the app */
function SLabel({ children }: { children: React.ReactNode }) {
  return (
    <Text
      size="xs"
      tt="uppercase"
      fw={500}
      c="dimmed"
      style={{ letterSpacing: "0.06em" }}
    >
      {children}
    </Text>
  );
}

/** Card wrapper — the universal 0.5px border card */
function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <Box
      style={{
        background: "var(--mantine-color-body)",
        border: "0.5px solid var(--mantine-color-default-border)",
        borderRadius: 12,
        overflow: "hidden",
        ...style,
      }}
    >
      {children}
    </Box>
  );
}

/** Card header row */
function CardHeader({
  left,
  right,
}: {
  left: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <Box
      px="md"
      py="sm"
      style={{
        borderBottom: "0.5px solid var(--mantine-color-default-border)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <Group gap={8}>{left}</Group>
      {right && <Box>{right}</Box>}
    </Box>
  );
}

/** Modal with consistent styling */
function StyledModal({
  opened,
  onClose,
  title,
  children,
  size = "md",
}: {
  opened: boolean;
  onClose: () => void;
  title: React.ReactNode;
  children: React.ReactNode;
  size?: string;
}) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={title}
      size={size}
      centered
      radius="md"
      styles={{
        header: {
          borderBottom: "0.5px solid var(--mantine-color-default-border)",
          paddingBottom: 12,
        },
        body: { paddingTop: 16 },
      }}
    />
  );
}

// ─── Attachments ──────────────────────────────────────────────────────────────

function AttachmentsSection({
  ticket,
  queryClient,
}: {
  ticket: any;
  queryClient: any;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadPct, setUploadPct] = useState<number | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      setUploadPct(0);
      const iv = setInterval(
        () =>
          setUploadPct((p) =>
            p !== null && p < 88 ? p + Math.random() * 25 : p,
          ),
        300,
      );
      try {
        const r = await uploadAttachmentApi(ticket.id, file);
        clearInterval(iv);
        setUploadPct(100);
        return r;
      } catch (e) {
        clearInterval(iv);
        throw e;
      }
    },
    onSuccess: () => {
      notifications.show({
        title: "Uploaded",
        message: "Attachment uploaded successfully",
        color: "green",
      });
      queryClient.invalidateQueries({ queryKey: ["ticket", ticket.id] });
      if (fileInputRef.current) fileInputRef.current.value = "";
      setTimeout(() => setUploadPct(null), 900);
    },
    onError: (e: any) => {
      notifications.show({
        title: "Upload failed",
        message: e.message,
        color: "red",
      });
      setUploadPct(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteAttachmentApi(id),
    onSuccess: () => {
      notifications.show({
        title: "Deleted",
        message: "Attachment removed",
        color: "green",
      });
      queryClient.invalidateQueries({ queryKey: ["ticket", ticket.id] });
      setDeleteId(null);
    },
    onError: (e: any) =>
      notifications.show({ title: "Error", message: e.message, color: "red" }),
  });

  const openPreview = async (att: any) => {
    setSelected(att);
    setPreviewLoading(true);
    try {
      setPreviewUrl(URL.createObjectURL(await downloadAttachmentBlob(att.id)));
    } catch {
      notifications.show({
        title: "Preview failed",
        message: "Could not load file",
        color: "red",
      });
    } finally {
      setPreviewLoading(false);
      setPreviewOpen(true);
    }
  };

  const download = () => {
    if (!previewUrl || !selected) return;
    const a = document.createElement("a");
    a.href = previewUrl;
    a.download = selected.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const atts = ticket.attachments || [];
  const IMAGE_EXTS = ["jpg", "jpeg", "png", "gif", "webp"];

  return (
    <>
      <CardHeader
        left={
          <>
            <Icon
              icon="solar:paperclip-bold-duotone"
              width={15}
              style={{ color: B.purple }}
            />
            <SLabel>Attachments</SLabel>
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
              {atts.length}
            </span>
          </>
        }
      />

      <Box p="md">
        {/* Upload zone */}
        <Box
          mb="sm"
          style={{
            border: `1.5px dashed ${uploadPct !== null ? B.purple : "var(--mantine-color-default-border)"}`,
            borderRadius: 10,
            padding: "18px 16px",
            textAlign: "center",
            background:
              uploadPct !== null ? B.purpleLight + "AA" : "transparent",
            cursor: "pointer",
            transition: "all .2s",
          }}
          onClick={() => uploadPct === null && fileInputRef.current?.click()}
        >
          {uploadPct !== null ? (
            <Stack align="center" gap="xs">
              <Icon
                icon="solar:upload-cloud-bold-duotone"
                width={28}
                style={{ color: B.purple }}
              />
              <Text size="xs" fw={500} style={{ color: B.purpleDeep }}>
                Uploading… {Math.round(uploadPct)}%
              </Text>
              <Box style={{ width: "100%", maxWidth: 200 }}>
                <Progress
                  value={uploadPct}
                  size="sm"
                  radius="xl"
                  styles={{
                    bar: { background: uploadPct === 100 ? B.green : B.purple },
                  }}
                />
              </Box>
            </Stack>
          ) : (
            <Stack align="center" gap={6}>
              <Box
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: B.purpleLight,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto",
                }}
              >
                <Icon
                  icon="solar:upload-cloud-bold-duotone"
                  width={18}
                  style={{ color: B.purple }}
                />
              </Box>
              <Text size="xs" fw={500}>
                Click to upload or drag & drop
              </Text>
              <Text size="xs" c="dimmed">
                Max 10 MB
              </Text>
            </Stack>
          )}
          <input
            ref={fileInputRef}
            type="file"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              if (f.size > 10 * 1024 * 1024) {
                notifications.show({
                  title: "Too large",
                  message: "Max 10 MB",
                  color: "red",
                });
                return;
              }
              uploadMutation.mutate(f);
            }}
          />
        </Box>

        {/* File rows */}
        {atts.length === 0 ? (
          <Text size="xs" c="dimmed" ta="center" py="sm">
            No attachments yet
          </Text>
        ) : (
          <Stack gap={6}>
            {atts.map((att: any) => (
              <Group
                key={att.id}
                justify="space-between"
                align="center"
                px="sm"
                py="xs"
                style={{
                  borderRadius: 8,
                  background: "var(--mantine-color-default-hover)",
                  border: "0.5px solid var(--mantine-color-default-border)",
                  transition: "background .12s",
                }}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLDivElement).style.background =
                    "var(--mantine-color-default-hover)")
                }
              >
                <Group gap={10} wrap="nowrap" style={{ minWidth: 0 }}>
                  <Box
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 8,
                      background: B.purpleLight,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Icon
                      icon={fileIcon(att.filename)}
                      width={15}
                      style={{ color: B.purple }}
                    />
                  </Box>
                  <Box style={{ minWidth: 0 }}>
                    <Text size="xs" fw={500} truncate>
                      {att.filename}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {formatFileSize(att.file_size)} ·{" "}
                      {att.uploaded_by_username}
                    </Text>
                  </Box>
                </Group>
                <Group gap={2} wrap="nowrap">
                  <Tooltip label="Preview" withArrow fz={11}>
                    <ActionIcon
                      variant="subtle"
                      size="sm"
                      style={{ color: B.purpleDark }}
                      onClick={() => openPreview(att)}
                    >
                      <Icon icon="solar:eye-linear" width={14} />
                    </ActionIcon>
                  </Tooltip>
                  <Tooltip label="Delete" withArrow fz={11}>
                    <ActionIcon
                      variant="subtle"
                      size="sm"
                      style={{ color: B.red }}
                      onClick={() => setDeleteId(att.id)}
                    >
                      <Icon icon="solar:trash-bin-2-linear" width={14} />
                    </ActionIcon>
                  </Tooltip>
                </Group>
              </Group>
            ))}
          </Stack>
        )}
      </Box>

      {/* Preview modal */}
      <Modal
        opened={previewOpen}
        onClose={() => {
          setPreviewOpen(false);
          if (previewUrl) URL.revokeObjectURL(previewUrl);
          setPreviewUrl(null);
          setSelected(null);
        }}
        title={
          <Group gap={8}>
            <Icon
              icon={
                selected
                  ? fileIcon(selected.filename)
                  : "solar:file-bold-duotone"
              }
              width={16}
              style={{ color: B.purple }}
            />
            <Text fw={500} size="sm">
              {selected?.filename}
            </Text>
          </Group>
        }
        size="lg"
        centered
        radius="md"
        styles={{
          header: {
            borderBottom: "0.5px solid var(--mantine-color-default-border)",
            paddingBottom: 12,
          },
          body: { paddingTop: 16 },
        }}
      >
        {previewLoading ? (
          <Center py={80}>
            <Loader color={B.purple} />
          </Center>
        ) : selected &&
          IMAGE_EXTS.includes(
            selected.filename.split(".").pop()?.toLowerCase() ?? "",
          ) ? (
          <Stack align="center" gap="md">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt={selected.filename}
                style={{
                  maxWidth: "100%",
                  maxHeight: 460,
                  borderRadius: 8,
                  objectFit: "contain",
                }}
              />
            ) : (
              <Text c="red">Failed to load</Text>
            )}
            <Button
              size="sm"
              style={{ background: B.purpleDark, border: "none" }}
              leftSection={
                <Icon icon="solar:download-bold-duotone" width={14} />
              }
              onClick={download}
            >
              Download
            </Button>
          </Stack>
        ) : (
          <Stack gap="md">
            <Box
              p="md"
              style={{
                borderRadius: 10,
                background: "var(--mantine-color-default-hover)",
                border: "0.5px solid var(--mantine-color-default-border)",
              }}
            >
              <Group gap={12}>
                <Box
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: B.purpleLight,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon
                    icon={
                      selected
                        ? fileIcon(selected.filename)
                        : "solar:file-bold-duotone"
                    }
                    width={20}
                    style={{ color: B.purple }}
                  />
                </Box>
                <Box>
                  <Text fw={500} size="sm">
                    {selected?.filename}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {formatFileSize(selected?.file_size ?? 0)}
                  </Text>
                </Box>
              </Group>
            </Box>
            <Button
              size="sm"
              style={{
                background: B.purpleDark,
                border: "none",
                alignSelf: "flex-start",
              }}
              leftSection={
                <Icon icon="solar:download-bold-duotone" width={14} />
              }
              onClick={download}
            >
              Download
            </Button>
          </Stack>
        )}
      </Modal>

      {/* Delete confirm modal */}
      <Modal
        opened={deleteId !== null}
        onClose={() => setDeleteId(null)}
        title={
          <Group gap={8}>
            <Icon
              icon="solar:danger-triangle-bold-duotone"
              width={18}
              style={{ color: B.red }}
            />
            <Text fw={500} size="sm">
              Delete attachment
            </Text>
          </Group>
        }
        size="sm"
        centered
        radius="md"
        styles={{
          header: {
            borderBottom: "0.5px solid var(--mantine-color-default-border)",
            paddingBottom: 12,
          },
          body: { paddingTop: 16 },
        }}
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
            <Group gap={6}>
              <Icon
                icon="solar:info-circle-linear"
                width={13}
                style={{ color: B.red, flexShrink: 0 }}
              />
              <Text size="xs" style={{ color: B.redText }}>
                This file will be permanently removed and cannot be recovered.
              </Text>
            </Group>
          </Box>
          <Group justify="flex-end" gap={8}>
            <Button
              variant="default"
              size="sm"
              onClick={() => setDeleteId(null)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              style={{ background: B.red, border: "none" }}
              loading={deleteMutation.isPending}
              onClick={() =>
                deleteId !== null && deleteMutation.mutate(deleteId)
              }
            >
              Delete file
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
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

  const ticketIdNum = parseInt(ticketId || "0");
  const isManager = user?.role === "MANAGER";

  const { data: employees = [], isLoading: empLoading } = useQuery({
    queryKey: ["employees-with-team"],
    queryFn: fetchEmployeesWithTeamApi,
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

  if (isLoading)
    return (
      <Center h={300}>
        <Loader color={B.purple} />
      </Center>
    );

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
              <Pill label={statusM.label} {...statusM} />
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
              { label: "Created by", name: ticket.creator_username },
              {
                label: "Assigned to",
                name: ticket.assigned_to_username,
                isAssignee: true,
              },
            ].map((m) => {
              const pal = getAvatarPal(m.name);
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
                      <Avatar
                        size={20}
                        radius="xl"
                        style={{ ...pal, fontSize: 8, fontWeight: 700 }}
                      >
                        {getInitials(m.name)}
                      </Avatar>
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

            {/* Actions — push to right */}
            {isManager && (
              <Group gap={6} style={{ marginLeft: "auto" }}>
                <Tooltip label="Edit ticket" withArrow fz={11}>
                  <ActionIcon
                    variant="default"
                    size="md"
                    radius="md"
                    onClick={openEdit}
                  >
                    <Icon
                      icon="solar:pen-2-linear"
                      width={15}
                      style={{ color: B.purpleDark }}
                    />
                  </ActionIcon>
                </Tooltip>
                <Tooltip label="Delete ticket" withArrow fz={11}>
                  <ActionIcon
                    variant="default"
                    size="md"
                    radius="md"
                    onClick={() => setDeleteConfirmOpen(true)}
                  >
                    <Icon
                      icon="solar:trash-bin-2-linear"
                      width={15}
                      style={{ color: B.red }}
                    />
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
                <SimpleGrid cols={{ base: 2, sm: 4 }} spacing={10} mb="md">
                  {/* Category */}
                  <Box
                    p="sm"
                    style={{
                      borderRadius: 8,
                      border: "0.5px solid var(--mantine-color-default-border)",
                    }}
                  >
                    <Group justify="space-between" mb={6}>
                      <Text size="xs" c="dimmed" fw={500}>
                        Category
                      </Text>
                      <Icon
                        icon="solar:folder-bold-duotone"
                        width={13}
                        style={{ color: "var(--mantine-color-dimmed)" }}
                      />
                    </Group>
                    {ticket.category ? (
                      <Group gap={6} wrap="nowrap">
                        <Box
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            background: ticket.category.color,
                            boxShadow: `0 0 0 2px ${ticket.category.color}33`,
                            flexShrink: 0,
                          }}
                        />
                        <Text size="xs" fw={600}>
                          {ticket.category.name}
                        </Text>
                      </Group>
                    ) : (
                      <Text size="xs" c="dimmed">
                        —
                      </Text>
                    )}
                  </Box>
                  {/* Priority */}
                  <Box
                    p="sm"
                    style={{
                      borderRadius: 8,
                      border: "0.5px solid var(--mantine-color-default-border)",
                    }}
                  >
                    <Group justify="space-between" mb={6}>
                      <Text size="xs" c="dimmed" fw={500}>
                        Priority
                      </Text>
                      <Icon
                        icon="solar:bolt-bold-duotone"
                        width={13}
                        style={{ color: priorityM.dot }}
                      />
                    </Group>
                    <Pill label={ticket.priority ?? "—"} {...priorityM} />
                  </Box>
                  {/* Sentiment */}
                  <Box
                    p="sm"
                    style={{
                      borderRadius: 8,
                      border: "0.5px solid var(--mantine-color-default-border)",
                    }}
                  >
                    <Group justify="space-between" mb={6}>
                      <Text size="xs" c="dimmed" fw={500}>
                        Sentiment
                      </Text>
                      <Icon
                        icon={sentimentM.icon}
                        width={13}
                        style={{ color: sentimentM.dot }}
                      />
                    </Group>
                    <Pill label={ticket.sentiment ?? "—"} {...sentimentM} />
                  </Box>
                  {/* Status */}
                  <Box
                    p="sm"
                    style={{
                      borderRadius: 8,
                      border: "0.5px solid var(--mantine-color-default-border)",
                    }}
                  >
                    <Group justify="space-between" mb={6}>
                      <Text size="xs" c="dimmed" fw={500}>
                        Status
                      </Text>
                      <Icon
                        icon="solar:clipboard-list-bold-duotone"
                        width={13}
                        style={{ color: statusM.dot }}
                      />
                    </Group>
                    <Pill label={statusM.label} {...statusM} />
                  </Box>
                </SimpleGrid>

                {/* Tags */}
                {ticket.tags?.length > 0 && (
                  <Group gap={6} wrap="wrap" mb="md">
                    <Text
                      size="xs"
                      c="dimmed"
                      fw={500}
                      style={{ alignSelf: "center" }}
                    >
                      Tags
                    </Text>
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
                        <span
                          style={{
                            width: 5,
                            height: 5,
                            borderRadius: "50%",
                            background: tag.color || B.gray,
                          }}
                        />
                        #{tag.name}
                      </span>
                    ))}
                  </Group>
                )}

                {/* AI Suggested Solution */}
                {ticket.ai_suggested_solution && (
                  <Box
                    p="md"
                    style={{
                      borderRadius: 10,
                      background: B.purpleLight,
                      border: `0.5px solid ${B.purpleMid}44`,
                    }}
                  >
                    <Group gap={7} mb={8}>
                      <Icon
                        icon="solar:lightbulb-bold-duotone"
                        width={14}
                        style={{ color: B.purple }}
                      />
                      <Text size="xs" fw={600} style={{ color: B.purpleDeep }}>
                        AI suggested solution
                      </Text>
                    </Group>
                    <Text
                      size="sm"
                      style={{ lineHeight: 1.65, color: B.purpleDark }}
                    >
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
                    const pal = getAvatarPal(comment.author_username);
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
                          <Avatar
                            size={28}
                            radius="xl"
                            style={{
                              ...pal,
                              fontSize: 9,
                              fontWeight: 700,
                              flexShrink: 0,
                              marginTop: 2,
                            }}
                          >
                            {getInitials(comment.author_username)}
                          </Avatar>
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
            {canUpdateStatus && ticket.available_transitions?.length > 0 && (
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
                    data={ticket.available_transitions.map((t: any) => ({
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
                    <Avatar
                      size={32}
                      radius="xl"
                      style={{
                        ...getAvatarPal(ticket.assigned_to_username),
                        fontSize: 10,
                        fontWeight: 700,
                      }}
                    >
                      {getInitials(ticket.assigned_to_username)}
                    </Avatar>
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
