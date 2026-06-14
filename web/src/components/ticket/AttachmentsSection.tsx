import { useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";
import {
  Loader,
  Center,
  Stack,
  Group,
  Button,
  Text,
  Modal,
  Progress,
  Box,
  ActionIcon,
  Tooltip,
} from "@mantine/core";
import { Icon } from "@iconify-icon/react";
import { notifications } from "@/utils/customNotifications";
import {
  uploadAttachmentApi,
  deleteAttachmentApi,
  downloadAttachmentBlob,
} from "@/api/tickets.api";
import { B, formatFileSize, fileIcon } from "@/utils/ticketUtils";
import { CardHeader, SLabel } from "./TicketCard";

export function AttachmentsSection({
  ticket,
  queryClient,
}: {
  ticket: any;
  queryClient: QueryClient;
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
      notifications.show({ title: "Upload failed", message: e.message, color: "red" });
      setUploadPct(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteAttachmentApi(id),
    onSuccess: () => {
      notifications.show({ title: "Deleted", message: "Attachment removed", color: "green" });
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
      notifications.show({ title: "Preview failed", message: "Could not load file", color: "red" });
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
            <Icon icon="solar:paperclip-bold-duotone" width={15} style={{ color: B.purple }} />
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
            background: uploadPct !== null ? B.purpleLight + "AA" : "transparent",
            cursor: "pointer",
            transition: "all .2s",
          }}
          onClick={() => uploadPct === null && fileInputRef.current?.click()}
        >
          {uploadPct !== null ? (
            <Stack align="center" gap="xs">
              <Icon icon="solar:upload-cloud-bold-duotone" width={28} style={{ color: B.purple }} />
              <Text size="xs" fw={500} style={{ color: B.purpleDeep }}>
                Uploading… {Math.round(uploadPct)}%
              </Text>
              <Box style={{ width: "100%", maxWidth: 200 }}>
                <Progress
                  value={uploadPct}
                  size="sm"
                  radius="xl"
                  styles={{
                    section: { background: uploadPct === 100 ? B.green : B.purple },
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
                <Icon icon="solar:upload-cloud-bold-duotone" width={18} style={{ color: B.purple }} />
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
                notifications.show({ title: "Too large", message: "Max 10 MB", color: "red" });
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
                    <Icon icon={fileIcon(att.filename)} width={15} style={{ color: B.purple }} />
                  </Box>
                  <Box style={{ minWidth: 0 }}>
                    <Text size="xs" fw={500} truncate>
                      {att.filename}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {formatFileSize(att.file_size)} · {att.uploaded_by_username}
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
              icon={selected ? fileIcon(selected.filename) : "solar:file-bold-duotone"}
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
          header: { borderBottom: "0.5px solid var(--mantine-color-default-border)", paddingBottom: 12 },
          body: { paddingTop: 16 },
        }}
      >
        {previewLoading ? (
          <Center py={80}>
            <Loader color={B.purple} />
          </Center>
        ) : selected && IMAGE_EXTS.includes(selected.filename.split(".").pop()?.toLowerCase() ?? "") ? (
          <Stack align="center" gap="md">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt={selected.filename}
                loading="lazy"
                style={{ maxWidth: "100%", maxHeight: 460, borderRadius: 8, objectFit: "contain" }}
              />
            ) : (
              <Text c="red">Failed to load</Text>
            )}
            <Button
              size="sm"
              style={{ background: B.purpleDark, border: "none" }}
              leftSection={<Icon icon="solar:download-bold-duotone" width={14} />}
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
                    icon={selected ? fileIcon(selected.filename) : "solar:file-bold-duotone"}
                    width={20}
                    style={{ color: B.purple }}
                  />
                </Box>
                <Box>
                  <Text fw={500} size="sm">{selected?.filename}</Text>
                  <Text size="xs" c="dimmed">{formatFileSize(selected?.file_size ?? 0)}</Text>
                </Box>
              </Group>
            </Box>
            <Button
              size="sm"
              style={{ background: B.purpleDark, border: "none", alignSelf: "flex-start" }}
              leftSection={<Icon icon="solar:download-bold-duotone" width={14} />}
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
            <Icon icon="solar:danger-triangle-bold-duotone" width={18} style={{ color: B.red }} />
            <Text fw={500} size="sm">Delete attachment</Text>
          </Group>
        }
        size="sm"
        centered
        radius="md"
        styles={{
          header: { borderBottom: "0.5px solid var(--mantine-color-default-border)", paddingBottom: 12 },
          body: { paddingTop: 16 },
        }}
      >
        <Stack gap="lg">
          <Box p="sm" style={{ borderRadius: 8, background: B.redLight, border: `0.5px solid ${B.red}33` }}>
            <Group gap={6}>
              <Icon icon="solar:info-circle-linear" width={13} style={{ color: B.red, flexShrink: 0 }} />
              <Text size="xs" style={{ color: B.redText }}>
                This file will be permanently removed and cannot be recovered.
              </Text>
            </Group>
          </Box>
          <Group justify="flex-end" gap={8}>
            <Button variant="default" size="sm" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              style={{ background: B.red, border: "none" }}
              loading={deleteMutation.isPending}
              onClick={() => deleteId !== null && deleteMutation.mutate(deleteId)}
            >
              Delete file
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
