import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Container,
  Stack,
  Group,
  Text,
  Paper,
  Button,
  Modal,
  TextInput,
  ColorPicker,
  LoadingOverlay,
  Center,
  ActionIcon,
  Tooltip,
  Box,
  Divider,
} from "@mantine/core";
import { Icon } from "@iconify-icon/react";
import { notifications } from "@/utils/customNotifications";
import {
  fetchTagsApi,
  createTagApi,
  updateTagApi,
  deleteTagApi,
} from "@/api/tickets.api";
import type { Tag } from "@/types/ticket";

// ─── Brand palette ─────────────────────────────────────────────────────────────

const BRAND = {
  purple: "#7F77DD",
  purpleDark: "#534AB7",
  purpleLight: "#EEEDFE",
  purpleText: "#3C3489",
  red: "#E24B4A",
  redLight: "#FCEBEB",
  redText: "#791F1F",
  green: "#639922",
  greenLight: "#EAF3DE",
  greenText: "#27500A",
  blue: "#378ADD",
  blueLight: "#E6F1FB",
  blueText: "#0C447C",
};

const DEFAULT_FORM = { name: "", color: "#7F77DD" };

const SWATCHES = [
  "#7F77DD",
  "#534AB7",
  "#E24B4A",
  "#EF9F27",
  "#639922",
  "#378ADD",
  "#0E9E8E",
  "#9C59D1",
  "#E87B23",
  "#1EA8BF",
  "#D04A8F",
  "#B4B2A9",
  "#2C7BE5",
  "#00B4A0",
  "#FF6B6B",
];

const TH_STYLE: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 500,
  color: "var(--mantine-color-dimmed)",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  paddingBottom: 10,
  whiteSpace: "nowrap",
};

// ─── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon,
  accentColor,
}: {
  label: string;
  value: number;
  icon: string;
  accentColor: string;
}) {
  return (
    <Paper
      radius="md"
      p="md"
      style={{
        border: "0.5px solid var(--mantine-color-default-border)",
        position: "relative",
        overflow: "hidden",
        flex: 1,
      }}
    >
      <Group justify="space-between" mb={8}>
        <Text
          size="xs"
          c="dimmed"
          tt="uppercase"
          fw={500}
          style={{ letterSpacing: "0.05em" }}
        >
          {label}
        </Text>
        <Icon
          icon={icon}
          width={15}
          style={{ color: accentColor, opacity: 0.75 }}
        />
      </Group>
      <Text fw={500} style={{ fontSize: 28, lineHeight: 1 }}>
        {value}
      </Text>
      <Box
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 3,
          background: accentColor,
        }}
      />
    </Paper>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function TagAdminPanel() {
  const queryClient = useQueryClient();

  const [opened, setOpened] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [formData, setFormData] = useState(DEFAULT_FORM);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");

  // ── Queries ──
  const { data: tags = [], isLoading } = useQuery({
    queryKey: ["admin-tags"],
    queryFn: fetchTagsApi,
  });

  // ── Mutations ──
  const createMutation = useMutation({
    mutationFn: (payload: typeof formData) => createTagApi(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-tags"] });
      queryClient.invalidateQueries({ queryKey: ["tags"] });
      notifications.show({
        title: "Tag created",
        message: "Tag created successfully",
        color: "green",
      });
      closeModal();
    },
    onError: (err) =>
      notifications.show({
        title: "Error",
        message: err instanceof Error ? err.message : "Failed to create tag",
        color: "red",
      }),
  });

  const updateMutation = useMutation({
    mutationFn: (payload: typeof formData) =>
      updateTagApi(editingTag!.id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-tags"] });
      queryClient.invalidateQueries({ queryKey: ["tags"] });
      notifications.show({
        title: "Tag updated",
        message: "Tag updated successfully",
        color: "green",
      });
      closeModal();
    },
    onError: (err) =>
      notifications.show({
        title: "Error",
        message: err instanceof Error ? err.message : "Failed to update tag",
        color: "red",
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteTagApi(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-tags"] });
      queryClient.invalidateQueries({ queryKey: ["tags"] });
      notifications.show({
        title: "Tag deleted",
        message: "Tag deleted successfully",
        color: "green",
      });
      setDeleteConfirmId(null);
    },
    onError: (err) =>
      notifications.show({
        title: "Error",
        message: err instanceof Error ? err.message : "Failed to delete tag",
        color: "red",
      }),
  });

  // ── Handlers ──
  const closeModal = () => {
    setOpened(false);
    setEditingTag(null);
    setFormData(DEFAULT_FORM);
  };

  const handleOpenNew = () => {
    setEditingTag(null);
    setFormData(DEFAULT_FORM);
    setOpened(true);
  };

  const handleEdit = (tag: Tag) => {
    setEditingTag(tag);
    setFormData({ name: tag.name, color: tag.color });
    setOpened(true);
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      notifications.show({
        title: "Validation error",
        message: "Tag name is required",
        color: "yellow",
      });
      return;
    }
    if (editingTag) updateMutation.mutate(formData);
    else createMutation.mutate(formData);
  };

  // ── Filtered list ──
  const displayTags = useMemo(() => {
    if (!searchQuery.trim()) return tags;
    const q = searchQuery.toLowerCase();
    return tags.filter((t: Tag) => t.name.toLowerCase().includes(q));
  }, [tags, searchQuery]);

  return (
    <Container size="lg" py="lg">
      <Stack gap="lg">
        {/* ── Header ── */}
        <Group justify="space-between" align="flex-end">
          <Box>
            <Text fw={500} style={{ fontSize: 22, lineHeight: 1.2 }}>
              Tags
            </Text>
            <Text size="sm" c="dimmed" mt={2}>
              Manage ticket tags and their colors
            </Text>
          </Box>
          <Button
            size="sm"
            leftSection={
              <Icon icon="solar:add-circle-bold-duotone" width={15} />
            }
            style={{ background: BRAND.purpleDark, border: "none" }}
            onClick={handleOpenNew}
          >
            New tag
          </Button>
        </Group>

        {/* ── Stat cards ── */}
        <Group gap={10} wrap="nowrap">
          <StatCard
            label="Total tags"
            value={tags.length}
            icon="solar:tag-linear"
            accentColor={BRAND.purple}
          />
          <StatCard
            label="Shown"
            value={displayTags.length}
            icon="solar:filter-linear"
            accentColor={BRAND.blue}
          />
        </Group>

        {/* ── Table card ── */}
        <Paper
          radius="md"
          style={{
            border: "0.5px solid var(--mantine-color-default-border)",
            overflow: "hidden",
          }}
        >
          {/* Toolbar */}
          <Box
            px="md"
            py="sm"
            style={{
              borderBottom: "0.5px solid var(--mantine-color-default-border)",
            }}
          >
            <Group justify="space-between">
              <TextInput
                placeholder="Search tags…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.currentTarget.value)}
                leftSection={
                  <Icon
                    icon="solar:magnifer-linear"
                    width={14}
                    style={{ color: "var(--mantine-color-dimmed)" }}
                  />
                }
                rightSection={
                  searchQuery ? (
                    <ActionIcon
                      variant="subtle"
                      size="xs"
                      onClick={() => setSearchQuery("")}
                    >
                      <Icon icon="solar:close-circle-linear" width={13} />
                    </ActionIcon>
                  ) : null
                }
                style={{ width: 220 }}
                styles={{ input: { fontSize: 13, height: 34 } }}
              />
              <Text size="xs" c="dimmed">
                {displayTags.length} of {tags.length} tags
              </Text>
            </Group>
          </Box>

          {/* Body */}
          {isLoading ? (
            <Center py={80}>
              <Box style={{ position: "relative", width: 40, height: 40 }}>
                <LoadingOverlay visible />
              </Box>
            </Center>
          ) : displayTags.length === 0 ? (
            <Center py={80}>
              <Stack align="center" gap="sm">
                <Icon
                  icon="solar:tag-linear"
                  width={36}
                  style={{ color: "var(--mantine-color-dimmed)", opacity: 0.4 }}
                />
                <Text size="sm" c="dimmed">
                  {searchQuery ? "No tags match your search" : "No tags yet"}
                </Text>
                {searchQuery ? (
                  <Button
                    variant="subtle"
                    size="xs"
                    style={{ color: BRAND.purpleDark }}
                    onClick={() => setSearchQuery("")}
                  >
                    Clear search
                  </Button>
                ) : (
                  <Button
                    variant="subtle"
                    size="xs"
                    style={{ color: BRAND.purpleDark }}
                    onClick={handleOpenNew}
                  >
                    Create first tag
                  </Button>
                )}
              </Stack>
            </Center>
          ) : (
            <Box style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: 13,
                }}
              >
                <thead>
                  <tr
                    style={{
                      borderBottom:
                        "0.5px solid var(--mantine-color-default-border)",
                    }}
                  >
                    <th style={{ ...TH_STYLE, padding: "10px 16px" }}>Tag</th>
                    <th style={{ ...TH_STYLE, padding: "10px 16px" }}>Color</th>
                    <th style={{ ...TH_STYLE, padding: "10px 16px" }}>
                      Preview
                    </th>
                    <th style={{ ...TH_STYLE, padding: "10px 16px" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {displayTags.map((tag: Tag, idx: number) => (
                    <tr
                      key={tag.id}
                      style={{
                        borderBottom:
                          idx < displayTags.length - 1
                            ? "0.5px solid var(--mantine-color-default-border)"
                            : "none",
                        transition: "background .12s",
                      }}
                      onMouseEnter={(e) => {
                        (
                          e.currentTarget as HTMLTableRowElement
                        ).style.background =
                          "var(--mantine-color-default-hover)";
                      }}
                      onMouseLeave={(e) => {
                        (
                          e.currentTarget as HTMLTableRowElement
                        ).style.background = "transparent";
                      }}
                    >
                      {/* Name + dot */}
                      <td style={{ padding: "10px 16px" }}>
                        <Group gap={10} wrap="nowrap">
                          <Box
                            style={{
                              width: 10,
                              height: 10,
                              borderRadius: "50%",
                              background: tag.color,
                              flexShrink: 0,
                              boxShadow: `0 0 0 2px ${tag.color}33`,
                            }}
                          />
                          <Text size="sm" fw={500}>
                            {tag.name}
                          </Text>
                        </Group>
                      </td>

                      {/* Color swatch + hex */}
                      <td style={{ padding: "10px 16px" }}>
                        <Group gap={8} wrap="nowrap">
                          <Box
                            style={{
                              width: 22,
                              height: 22,
                              borderRadius: 6,
                              background: tag.color,
                              border: "0.5px solid rgba(0,0,0,0.1)",
                              flexShrink: 0,
                            }}
                          />
                          <Text
                            size="xs"
                            style={{
                              fontFamily: "monospace",
                              color: "var(--mantine-color-dimmed)",
                            }}
                          >
                            {tag.color}
                          </Text>
                        </Group>
                      </td>

                      {/* Badge preview */}
                      <td style={{ padding: "10px 16px" }}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            fontSize: 11,
                            fontWeight: 500,
                            padding: "3px 9px",
                            borderRadius: 20,
                            background: tag.color + "22",
                            color: tag.color,
                            whiteSpace: "nowrap",
                          }}
                        >
                          <span
                            style={{
                              width: 5,
                              height: 5,
                              borderRadius: "50%",
                              background: tag.color,
                              flexShrink: 0,
                            }}
                          />
                          {tag.name}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: "10px 16px" }}>
                        <Group gap={4} justify="flex-end" wrap="nowrap">
                          <Tooltip
                            label="Edit tag"
                            withArrow
                            fz={11}
                            position="top"
                          >
                            <ActionIcon
                              variant="subtle"
                              size="sm"
                              style={{ color: BRAND.purpleDark }}
                              onClick={() => handleEdit(tag)}
                            >
                              <Icon icon="solar:pen-2-linear" width={15} />
                            </ActionIcon>
                          </Tooltip>
                          <Tooltip
                            label="Delete tag"
                            withArrow
                            fz={11}
                            position="top"
                          >
                            <ActionIcon
                              variant="subtle"
                              size="sm"
                              style={{ color: BRAND.red }}
                              onClick={() => {
                                setDeleteConfirmId(tag.id);
                                setDeleteConfirmName(tag.name);
                              }}
                            >
                              <Icon
                                icon="solar:trash-bin-2-linear"
                                width={15}
                              />
                            </ActionIcon>
                          </Tooltip>
                        </Group>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Box>
          )}

          {/* Footer */}
          {displayTags.length > 0 && (
            <Box
              px="md"
              py="sm"
              style={{
                borderTop: "0.5px solid var(--mantine-color-default-border)",
              }}
            >
              <Text size="xs" c="dimmed">
                {displayTags.length} tag{displayTags.length !== 1 ? "s" : ""}
                {searchQuery && " · filtered"}
              </Text>
            </Box>
          )}
        </Paper>
      </Stack>

      {/* ── Create / Edit Modal ── */}
      <Modal
        opened={opened}
        onClose={closeModal}
        title={
          <Group gap={8}>
            <Icon
              icon={
                editingTag
                  ? "solar:pen-2-bold-duotone"
                  : "solar:tag-bold-duotone"
              }
              width={18}
              style={{ color: formData.color || BRAND.purple }}
            />
            <Text fw={500} size="sm">
              {editingTag ? "Edit tag" : "New tag"}
            </Text>
          </Group>
        }
        size="sm"
        radius="md"
        styles={{
          header: {
            borderBottom: "0.5px solid var(--mantine-color-default-border)",
            paddingBottom: 12,
          },
          body: { paddingTop: 16 },
        }}
      >
        <LoadingOverlay
          visible={createMutation.isPending || updateMutation.isPending}
          zIndex={1000}
          overlayProps={{ radius: "sm", blur: 2 }}
        />

        <Stack gap="md">
          {/* Name */}
          <TextInput
            label={
              <Text size="xs" fw={500} mb={4}>
                Tag name
              </Text>
            }
            placeholder="e.g. Bug, Urgent, Feature…"
            required
            value={formData.name}
            onChange={(e) =>
              setFormData({ ...formData, name: e.currentTarget.value })
            }
            styles={{ input: { fontSize: 13 } }}
          />

          {/* Color */}
          <Box>
            <Text size="xs" fw={500} mb={8}>
              Color
            </Text>

            {/* Live preview */}
            <Group gap={10} mb={12} align="center">
              <Box
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 7,
                  background: formData.color,
                  border: "0.5px solid rgba(0,0,0,0.12)",
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  fontSize: 12,
                  fontWeight: 500,
                  padding: "3px 10px",
                  borderRadius: 20,
                  background: formData.color + "22",
                  color: formData.color,
                }}
              >
                <span
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: "50%",
                    background: formData.color,
                    display: "inline-block",
                  }}
                />
                {formData.name || "Preview"}
              </span>
            </Group>

            <ColorPicker
              value={formData.color}
              onChange={(color) => setFormData({ ...formData, color })}
              swatches={SWATCHES}
              swatchesPerRow={8}
              format="hex"
              styles={{ swatch: { borderRadius: 4 } }}
            />

            {/* Hex input */}
            <TextInput
              mt={8}
              placeholder="#000000"
              value={formData.color}
              onChange={(e) => {
                const val = e.currentTarget.value;
                if (/^#[0-9A-Fa-f]{0,6}$/.test(val))
                  setFormData({ ...formData, color: val });
              }}
              leftSection={
                <Box
                  style={{
                    width: 13,
                    height: 13,
                    borderRadius: 3,
                    background: formData.color,
                    border: "0.5px solid rgba(0,0,0,0.15)",
                  }}
                />
              }
              style={{ width: 130 }}
              styles={{
                input: { fontSize: 12, fontFamily: "monospace", height: 30 },
              }}
            />
          </Box>

          <Divider />

          {/* Actions */}
          <Group justify="flex-end" gap={8}>
            <Button variant="default" size="sm" onClick={closeModal}>
              Cancel
            </Button>
            <Button
              size="sm"
              style={{ background: formData.color, border: "none" }}
              loading={createMutation.isPending || updateMutation.isPending}
              onClick={handleSave}
            >
              {editingTag ? "Save changes" : "Create tag"}
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* ── Delete Confirm Modal ── */}
      <Modal
        opened={deleteConfirmId !== null}
        onClose={() => setDeleteConfirmId(null)}
        title={
          <Group gap={8}>
            <Icon
              icon="solar:danger-triangle-bold-duotone"
              width={18}
              style={{ color: BRAND.red }}
            />
            <Text fw={500} size="sm">
              Confirm deletion
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
          <Paper
            p="md"
            radius="md"
            style={{
              background: BRAND.redLight,
              border: `0.5px solid ${BRAND.red}33`,
            }}
          >
            <Group gap={8} align="flex-start">
              <Icon
                icon="solar:info-circle-linear"
                width={15}
                style={{ color: BRAND.red, marginTop: 1, flexShrink: 0 }}
              />
              <Text size="sm" style={{ color: BRAND.redText }}>
                You are about to delete the tag{" "}
                <strong>"{deleteConfirmName}"</strong>. It will be removed from
                all tickets it is currently applied to. This cannot be undone.
              </Text>
            </Group>
          </Paper>

          <Group justify="flex-end" gap={8}>
            <Button
              variant="default"
              size="sm"
              onClick={() => setDeleteConfirmId(null)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              style={{ background: BRAND.red, border: "none" }}
              loading={deleteMutation.isPending}
              onClick={() => {
                if (deleteConfirmId !== null)
                  deleteMutation.mutate(deleteConfirmId);
              }}
            >
              Delete tag
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
}
