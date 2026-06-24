import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Container,
  Stack,
  Group,
  Text,
  Button,
  Modal,
  TextInput,
  NumberInput,
  Select,
  Textarea,
  LoadingOverlay,
  Center,
  Skeleton,
  ActionIcon,
  Tooltip,
  Switch,
  Box,
  Divider,
  Paper,
  SimpleGrid,
} from "@mantine/core";
import { Icon } from "@iconify-icon/react";
import { useMediaQuery } from "@mantine/hooks";
import { notifications } from "@/utils/customNotifications";
import { fetchCategoriesApi } from "@/api/tickets.api";
import {
  listSLAs,
  createSLA,
  updateSLA,
  deleteSLA,
  type SLA,
  type SLACreatePayload,
  type SLAUpdatePayload,
} from "@/api/admin.api";
import type { Category } from "@/types/ticket";

//  Brand palette 

const B = {
  purple: "#7F77DD",
  purpleDark: "#534AB7",
  purpleLight: "#EEEDFE",
  purpleDeep: "#3C3489",
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

const PRIORITY_META: Record<string, { bg: string; text: string; dot: string }> =
  {
    HIGH: { bg: B.redLight, text: B.redText, dot: B.red },
    MEDIUM: { bg: B.amberLight, text: B.amberText, dot: B.amber },
    LOW: { bg: B.greenLight, text: B.greenText, dot: B.green },
  };

//  Shared micro-components 

function SLabel({ children }: { children: React.ReactNode }) {
  return (
    <Text
      size="xs"
      tt="uppercase"
      fw={500}
      c="dimmed"
      style={{ letterSpacing: "0.05em" }}
    >
      {children}
    </Text>
  );
}

function DotBadge({
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
        padding: "3px 9px",
        borderRadius: 20,
        background: bg,
        color: text,
        whiteSpace: "nowrap",
      }}
    >
      <span
        style={{
          width: 5,
          height: 5,
          borderRadius: "50%",
          background: dot,
          flexShrink: 0,
        }}
      />
      {label}
    </span>
  );
}

function StatCard({
  label,
  value,
  icon,
  accentColor,
}: {
  label: string;
  value: number | string;
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
      }}
    >
      <Group justify="space-between" mb={8}>
        <Text
          size="xs"
          c="dimmed"
          fw={500}
          tt="uppercase"
          style={{ letterSpacing: "0.05em" }}
        >
          {label}
        </Text>
        <Icon
          icon={icon}
          width={14}
          style={{ color: accentColor, opacity: 0.75 }}
        />
      </Group>
      <Text fw={500} style={{ fontSize: 26, lineHeight: 1 }}>
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

const TH_STYLE: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 500,
  color: "var(--mantine-color-dimmed)",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  paddingBottom: 10,
  whiteSpace: "nowrap",
};

const mStyles = {
  header: {
    borderBottom: "0.5px solid var(--mantine-color-default-border)",
    paddingBottom: 12,
  },
  body: { paddingTop: 16 },
};

//  Default form 

type FormData = {
  name: string;
  description: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
  category_id: number | null;
  response_time_hours: number;
  resolution_time_hours: number;
  is_active: boolean;
};

const DEFAULT_FORM: FormData = {
  name: "",
  description: "",
  priority: "MEDIUM",
  category_id: null,
  response_time_hours: 4,
  resolution_time_hours: 24,
  is_active: true,
};

//  Skeleton 

function SLAListSkeleton() {
  return (
    <Container size="lg" py="lg">
      <Stack gap="lg">
        <Group justify="space-between" wrap="wrap" gap={12}>
          <Box>
            <Skeleton height={22} width={160} mb={6} radius="sm" />
            <Skeleton height={13} width={280} radius="sm" />
          </Box>
          <Skeleton height={34} width={100} radius="sm" />
        </Group>
        <SimpleGrid cols={{ base: 2, sm: 4 }} spacing={10}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} height={90} radius="md" />
          ))}
        </SimpleGrid>
        <Paper
          radius="md"
          style={{ border: "0.5px solid var(--mantine-color-default-border)", overflow: "hidden" }}
        >
          <Box px="md" py="sm" style={{ borderBottom: "0.5px solid var(--mantine-color-default-border)" }}>
            <Group justify="space-between">
              <Skeleton height={34} width={240} radius="sm" />
              <Skeleton height={13} width={80} radius="sm" />
            </Group>
          </Box>
          <Stack gap={0}>
            {Array.from({ length: 7 }).map((_, i) => (
              <Box
                key={i}
                style={{ padding: "11px 16px", borderBottom: i < 6 ? "0.5px solid var(--mantine-color-default-border)" : "none", display: "flex", gap: 16, alignItems: "center" }}
              >
                <Box style={{ flex: 2 }}>
                  <Skeleton height={14} mb={4} radius="sm" />
                  <Skeleton height={11} width="60%" radius="sm" />
                </Box>
                <Skeleton height={20} width={80} radius="xl" />
                <Skeleton height={20} width={60} radius="xl" />
                <Skeleton height={13} width={32} radius="sm" />
                <Skeleton height={13} width={32} radius="sm" />
                <Skeleton height={20} width={55} radius="xl" />
                <Skeleton height={28} width={56} radius="sm" />
              </Box>
            ))}
          </Stack>
        </Paper>
      </Stack>
    </Container>
  );
}

function SLAMobileCard({
  sla,
  cat,
  prioMeta,
  onEdit,
  onDelete,
}: {
  sla: SLA;
  cat: Category | undefined;
  prioMeta: { bg: string; text: string; dot: string };
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <Box p="sm" style={{ borderBottom: "0.5px solid var(--mantine-color-default-border)" }}>
      <Group justify="space-between" mb={6} wrap="nowrap">
        <Text size="sm" fw={500} lineClamp={1} style={{ flex: 1, minWidth: 0 }}>
          {sla.name}
        </Text>
        <DotBadge
          label={sla.is_active ? "Active" : "Inactive"}
          bg={sla.is_active ? B.greenLight : B.grayLight}
          text={sla.is_active ? B.greenText : B.grayText}
          dot={sla.is_active ? B.green : B.gray}
        />
      </Group>
      {sla.description && (
        <Text size="xs" c="dimmed" mb={6} lineClamp={1}>{sla.description}</Text>
      )}
      <Group gap={6} mb={8} wrap="wrap">
        {cat && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 500, padding: "3px 9px", borderRadius: 20, background: (cat.color || B.gray) + "22", color: cat.color || B.gray, whiteSpace: "nowrap" }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: cat.color || B.gray }} />
            {cat.name}
          </span>
        )}
        <DotBadge label={sla.priority.charAt(0) + sla.priority.slice(1).toLowerCase()} {...prioMeta} />
      </Group>
      <Group justify="space-between" wrap="nowrap">
        <Group gap={12} wrap="nowrap">
          <Group gap={4} wrap="nowrap">
            <Icon icon="solar:clock-circle-linear" width={12} style={{ color: "var(--mantine-color-dimmed)" }} />
            <Text size="xs" c="dimmed">{sla.response_time_hours}h response</Text>
          </Group>
          <Group gap={4} wrap="nowrap">
            <Icon icon="solar:hourglass-linear" width={12} style={{ color: "var(--mantine-color-dimmed)" }} />
            <Text size="xs" c="dimmed">{sla.resolution_time_hours}h resolution</Text>
          </Group>
        </Group>
        <Group gap={4} wrap="nowrap">
          <ActionIcon variant="subtle" size="sm" style={{ color: B.purpleDark }} onClick={onEdit}>
            <Icon icon="solar:pen-2-linear" width={14} />
          </ActionIcon>
          <ActionIcon variant="subtle" size="sm" style={{ color: B.red }} onClick={onDelete}>
            <Icon icon="solar:trash-bin-2-linear" width={14} />
          </ActionIcon>
        </Group>
      </Group>
    </Box>
  );
}

//  Main Component 

export default function SLAManagement() {
  const queryClient = useQueryClient();
  const [opened, setOpened] = useState(false);
  const [editingSLA, setEditingSLA] = useState<SLA | null>(null);
  const [formData, setFormData] = useState<FormData>(DEFAULT_FORM);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");

  const isMobile = useMediaQuery("(max-width: 640px)");

  //  Queries 
  const {
    data: slas = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["admin-slas"],
    queryFn: () => listSLAs(1000, 0),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategoriesApi,
  });

  //  Mutations 
  const createMutation = useMutation({
    mutationFn: (payload: SLACreatePayload) => createSLA(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-slas"] });
      notifications.show({
        title: "SLA created",
        message: "New SLA has been created successfully",
        color: "green",
      });
      closeModal();
    },
    onError: (err) =>
      notifications.show({
        title: "Error",
        message: err instanceof Error ? err.message : "Failed to create SLA",
        color: "red",
      }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ slaId, data }: { slaId: number; data: SLAUpdatePayload }) =>
      updateSLA(slaId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-slas"] });
      notifications.show({
        title: "SLA updated",
        message: "SLA has been updated successfully",
        color: "green",
      });
      closeModal();
    },
    onError: (err) =>
      notifications.show({
        title: "Error",
        message: err instanceof Error ? err.message : "Failed to update SLA",
        color: "red",
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSLA,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-slas"] });
      notifications.show({
        title: "SLA deleted",
        message: "SLA has been deleted",
        color: "green",
      });
      setDeleteConfirmId(null);
    },
    onError: (err) =>
      notifications.show({
        title: "Error",
        message: err instanceof Error ? err.message : "Failed to delete SLA",
        color: "red",
      }),
  });

  //  Handlers 
  const closeModal = () => {
    setOpened(false);
    setEditingSLA(null);
    setFormData(DEFAULT_FORM);
  };

  const openCreate = () => {
    setEditingSLA(null);
    setFormData(DEFAULT_FORM);
    setOpened(true);
  };

  const openEdit = (sla: SLA) => {
    setEditingSLA(sla);
    setFormData({
      name: sla.name,
      description: sla.description || "",
      priority: sla.priority,
      category_id: sla.category_id,
      response_time_hours: sla.response_time_hours,
      resolution_time_hours: sla.resolution_time_hours,
      is_active: sla.is_active,
    });
    setOpened(true);
  };

  const handleSubmit = () => {
    if (!formData.name.trim() || !formData.category_id) {
      notifications.show({
        title: "Validation error",
        message: "Name and category are required",
        color: "yellow",
      });
      return;
    }
    if (
      formData.response_time_hours <= 0 ||
      formData.resolution_time_hours <= 0
    ) {
      notifications.show({
        title: "Validation error",
        message: "Time values must be greater than 0",
        color: "yellow",
      });
      return;
    }

    const payload = {
      name: formData.name,
      description: formData.description,
      priority: formData.priority,
      category_id: formData.category_id,
      response_time_hours: formData.response_time_hours,
      resolution_time_hours: formData.resolution_time_hours,
    };

    if (editingSLA) {
      updateMutation.mutate({
        slaId: editingSLA.id,
        data: { ...payload, is_active: formData.is_active },
      });
    } else {
      createMutation.mutate(payload);
    }
  };

  //  Derived data 
  const categoryMap = useMemo(
    () => Object.fromEntries((categories as Category[]).map((c) => [c.id, c])),
    [categories],
  );

  const displaySLAs = useMemo(() => {
    if (!searchQuery.trim()) return slas;
    const q = searchQuery.toLowerCase();
    return slas.filter(
      (s: SLA) =>
        s.name.toLowerCase().includes(q) ||
        (categoryMap[s.category_id]?.name ?? "").toLowerCase().includes(q),
    );
  }, [slas, searchQuery, categoryMap]);

  const activeSLAs = slas.filter((s: SLA) => s.is_active).length;
  const inactiveSLAs = slas.length - activeSLAs;

  if (isLoading) return <SLAListSkeleton />;

  return (
    <Container size="lg" py="lg">
      <Stack gap="lg">
        {/*  Header  */}
        <Group justify="space-between" align="flex-end" wrap="wrap" gap={12}>
          <Box>
            <Text fw={500} style={{ fontSize: 22, lineHeight: 1.2 }}>
              SLA Management
            </Text>
            <Text size="sm" c="dimmed" mt={2}>
              Define service level agreements for ticket priorities and
              categories
            </Text>
          </Box>
          <Button
            size="sm"
            leftSection={
              <Icon icon="solar:add-circle-bold-duotone" width={15} />
            }
            style={{ background: B.purpleDark, border: "none" }}
            onClick={openCreate}
          >
            Add SLA
          </Button>
        </Group>

        {/*  Stat cards  */}
        <SimpleGrid cols={{ base: 2, sm: 4 }} spacing={10}>
          <StatCard
            label="Total SLAs"
            value={slas.length}
            icon="solar:document-text-linear"
            accentColor={B.purple}
          />
          <StatCard
            label="Active"
            value={activeSLAs}
            icon="solar:check-circle-linear"
            accentColor={B.green}
          />
          <StatCard
            label="Inactive"
            value={inactiveSLAs}
            icon="solar:close-circle-linear"
            accentColor={B.gray}
          />
          <StatCard
            label="Categories"
            value={(categories as Category[]).length}
            icon="solar:folder-2-linear"
            accentColor={B.blue}
          />
        </SimpleGrid>

        {/*  Error  */}
        {error && (
          <Box
            p="md"
            style={{
              borderRadius: 10,
              background: B.redLight,
              border: `0.5px solid ${B.red}33`,
            }}
          >
            <Group justify="space-between">
              <Group gap={8}>
                <Icon
                  icon="solar:danger-triangle-linear"
                  width={14}
                  style={{ color: B.red }}
                />
                <Text size="sm" style={{ color: B.redText }}>
                  Error loading SLAs. Please try again.
                </Text>
              </Group>
              <ActionIcon
                variant="subtle"
                color="red"
                size="sm"
                onClick={() => window.location.reload()}
              >
                <Icon icon="solar:refresh-linear" width={14} />
              </ActionIcon>
            </Group>
          </Box>
        )}

        {/*  Table card  */}
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
                placeholder="Search SLAs…"
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
                style={{ width: 240 }}
                styles={{ input: { fontSize: 13, height: 34 } }}
              />
              <Text size="xs" c="dimmed">
                {displaySLAs.length} of {slas.length} SLAs
              </Text>
            </Group>
          </Box>

          {/* Table */}
          {isMobile ? (
            displaySLAs.length === 0 ? (
              <Center py={80}>
                <Stack align="center" gap="sm">
                  <Icon icon="solar:stopwatch-linear" width={36} style={{ color: "var(--mantine-color-dimmed)", opacity: 0.4 }} />
                  <Text size="sm" c="dimmed">
                    {searchQuery ? "No SLAs match your search" : "No SLAs configured yet"}
                  </Text>
                  {!searchQuery && (
                    <Button size="xs" style={{ color: B.purpleDark }} variant="subtle" onClick={openCreate}>
                      Create your first SLA
                    </Button>
                  )}
                </Stack>
              </Center>
            ) : (
              <Stack gap={0}>
                {displaySLAs.map((sla: SLA) => {
                  const cat = categoryMap[sla.category_id];
                  const prioMeta = PRIORITY_META[sla.priority] ?? PRIORITY_META.MEDIUM;
                  return (
                    <SLAMobileCard
                      key={sla.id}
                      sla={sla}
                      cat={cat}
                      prioMeta={prioMeta}
                      onEdit={() => openEdit(sla)}
                      onDelete={() => { setDeleteConfirmId(sla.id); setDeleteConfirmName(sla.name); }}
                    />
                  );
                })}
              </Stack>
            )
          ) : (
            <>
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
                      <th style={{ ...TH_STYLE, padding: "10px 16px" }}>
                        Name
                      </th>
                      <th style={{ ...TH_STYLE, padding: "10px 16px" }}>
                        Category
                      </th>
                      <th style={{ ...TH_STYLE, padding: "10px 16px" }}>
                        Priority
                      </th>
                      <th style={{ ...TH_STYLE, padding: "10px 16px" }}>
                        Response
                      </th>
                      <th style={{ ...TH_STYLE, padding: "10px 16px" }}>
                        Resolution
                      </th>
                      <th style={{ ...TH_STYLE, padding: "10px 16px" }}>
                        Status
                      </th>
                      <th style={{ ...TH_STYLE, padding: "10px 16px" }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {displaySLAs.length > 0 ? (
                      displaySLAs.map((sla: SLA, idx: number) => {
                        const cat = categoryMap[sla.category_id];
                        const prioMeta =
                          PRIORITY_META[sla.priority] ?? PRIORITY_META.MEDIUM;
                        return (
                          <tr
                            key={sla.id}
                            style={{
                              borderBottom:
                                idx < displaySLAs.length - 1
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
                            {/* Name */}
                            <td style={{ padding: "11px 16px" }}>
                              <Text size="sm" fw={500}>
                                {sla.name}
                              </Text>
                              {sla.description && (
                                <Text
                                  size="xs"
                                  c="dimmed"
                                  truncate
                                  style={{ maxWidth: 200 }}
                                >
                                  {sla.description}
                                </Text>
                              )}
                            </td>

                            {/* Category */}
                            <td style={{ padding: "11px 16px" }}>
                              {cat ? (
                                <span
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 5,
                                    fontSize: 11,
                                    fontWeight: 500,
                                    padding: "3px 9px",
                                    borderRadius: 20,
                                    background: (cat.color || B.gray) + "22",
                                    color: cat.color || B.gray,
                                  }}
                                >
                                  <span
                                    style={{
                                      width: 5,
                                      height: 5,
                                      borderRadius: "50%",
                                      background: cat.color || B.gray,
                                    }}
                                  />
                                  {cat.name}
                                </span>
                              ) : (
                                <Text size="xs" c="dimmed">
                                  —
                                </Text>
                              )}
                            </td>

                            {/* Priority */}
                            <td style={{ padding: "11px 16px" }}>
                              <DotBadge
                                label={
                                  sla.priority.charAt(0) +
                                  sla.priority.slice(1).toLowerCase()
                                }
                                {...prioMeta}
                              />
                            </td>

                            {/* Response time */}
                            <td style={{ padding: "11px 16px" }}>
                              <Group gap={5} wrap="nowrap">
                                <Icon
                                  icon="solar:clock-circle-linear"
                                  width={13}
                                  style={{
                                    color: "var(--mantine-color-dimmed)",
                                  }}
                                />
                                <Text size="sm" fw={500}>
                                  {sla.response_time_hours}h
                                </Text>
                              </Group>
                            </td>

                            {/* Resolution time */}
                            <td style={{ padding: "11px 16px" }}>
                              <Group gap={5} wrap="nowrap">
                                <Icon
                                  icon="solar:hourglass-linear"
                                  width={13}
                                  style={{
                                    color: "var(--mantine-color-dimmed)",
                                  }}
                                />
                                <Text size="sm" fw={500}>
                                  {sla.resolution_time_hours}h
                                </Text>
                              </Group>
                            </td>

                            {/* Status */}
                            <td style={{ padding: "11px 16px" }}>
                              <DotBadge
                                label={sla.is_active ? "Active" : "Inactive"}
                                bg={sla.is_active ? B.greenLight : B.grayLight}
                                text={sla.is_active ? B.greenText : B.grayText}
                                dot={sla.is_active ? B.green : B.gray}
                              />
                            </td>

                            {/* Actions */}
                            <td style={{ padding: "11px 16px" }}>
                              <Group gap={4} justify="flex-end" wrap="nowrap">
                                <Tooltip
                                  label="Edit SLA"
                                  withArrow
                                  fz={11}
                                  position="top"
                                >
                                  <ActionIcon
                                    variant="subtle"
                                    size="sm"
                                    style={{ color: B.purpleDark }}
                                    onClick={() => openEdit(sla)}
                                  >
                                    <Icon
                                      icon="solar:pen-2-linear"
                                      width={15}
                                    />
                                  </ActionIcon>
                                </Tooltip>
                                <Tooltip
                                  label="Delete SLA"
                                  withArrow
                                  fz={11}
                                  position="top"
                                >
                                  <ActionIcon
                                    variant="subtle"
                                    size="sm"
                                    style={{ color: B.red }}
                                    onClick={() => {
                                      setDeleteConfirmId(sla.id);
                                      setDeleteConfirmName(sla.name);
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
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={7}>
                          <Center py={80}>
                            <Stack align="center" gap="sm">
                              <Icon
                                icon="solar:stopwatch-linear"
                                width={36}
                                style={{
                                  color: "var(--mantine-color-dimmed)",
                                  opacity: 0.4,
                                }}
                              />
                              <Text size="sm" c="dimmed">
                                {searchQuery
                                  ? "No SLAs match your search"
                                  : "No SLAs configured yet"}
                              </Text>
                              {!searchQuery && (
                                <Button
                                  size="xs"
                                  style={{ color: B.purpleDark }}
                                  variant="subtle"
                                  onClick={openCreate}
                                >
                                  Create your first SLA
                                </Button>
                              )}
                            </Stack>
                          </Center>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </Box>

              {/* Table footer */}
              {displaySLAs.length > 0 && (
                <Box
                  px="md"
                  py="sm"
                  style={{
                    borderTop:
                      "0.5px solid var(--mantine-color-default-border)",
                  }}
                >
                  <Text size="xs" c="dimmed">
                    Showing{" "}
                    <span
                      style={{
                        fontWeight: 500,
                        color: "var(--mantine-color-text)",
                      }}
                    >
                      {displaySLAs.length}
                    </span>{" "}
                    of{" "}
                    <span
                      style={{
                        fontWeight: 500,
                        color: "var(--mantine-color-text)",
                      }}
                    >
                      {slas.length}
                    </span>{" "}
                    SLAs{searchQuery && " · filtered"}
                  </Text>
                </Box>
              )}
            </>
          )}
        </Paper>
      </Stack>

      {/*  Create / Edit Modal  */}
      <Modal
        opened={opened}
        onClose={closeModal}
        title={
          <Group gap={8}>
            <Icon
              icon={
                editingSLA
                  ? "solar:pen-2-bold-duotone"
                  : "solar:stopwatch-bold-duotone"
              }
              width={18}
              style={{ color: B.purple }}
            />
            <Text fw={500} size="sm">
              {editingSLA ? "Edit SLA" : "New SLA"}
            </Text>
          </Group>
        }
        size="md"
        centered
        radius="md"
        styles={mStyles}
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
                SLA name
              </Text>
            }
            placeholder="e.g. High Priority — Billing"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            styles={{ input: { fontSize: 13 } }}
          />

          {/* Description */}
          <Textarea
            label={
              <Text size="xs" fw={500} mb={4}>
                Description{" "}
                <Text span size="xs" c="dimmed">
                  (optional)
                </Text>
              </Text>
            }
            placeholder="Briefly describe when this SLA applies…"
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            minRows={2}
            styles={{ input: { fontSize: 13 } }}
          />

          {/* Priority + Category */}
          <Group grow gap="md">
            <Select
              label={
                <Text size="xs" fw={500} mb={4}>
                  Priority
                </Text>
              }
              data={[
                { value: "HIGH", label: "High" },
                { value: "MEDIUM", label: "Medium" },
                { value: "LOW", label: "Low" },
              ]}
              value={formData.priority}
              onChange={(val) =>
                setFormData({
                  ...formData,
                  priority: (val as "HIGH" | "MEDIUM" | "LOW") || "MEDIUM",
                })
              }
              required
              styles={{ input: { fontSize: 13 } }}
            />
            <Select
              label={
                <Text size="xs" fw={500} mb={4}>
                  Category
                </Text>
              }
              placeholder="Select category"
              data={(categories as Category[]).map((c) => ({
                value: c.id.toString(),
                label: c.name,
              }))}
              value={formData.category_id?.toString() || ""}
              onChange={(val) =>
                setFormData({
                  ...formData,
                  category_id: val ? parseInt(val) : null,
                })
              }
              required
              searchable
              styles={{ input: { fontSize: 13 } }}
            />
          </Group>

          {/* Time targets */}
          <Box
            p="md"
            style={{
              borderRadius: 8,
              background: "var(--mantine-color-default-hover)",
              border: "0.5px solid var(--mantine-color-default-border)",
            }}
          >
            <Group gap={6} mb="sm">
              <Icon
                icon="solar:clock-circle-linear"
                width={13}
                style={{ color: B.purple }}
              />
              <SLabel>Time targets</SLabel>
            </Group>
            <Group grow gap="md">
              <NumberInput
                label={
                  <Text size="xs" fw={500} mb={4}>
                    First response (hours)
                  </Text>
                }
                placeholder="e.g. 4"
                min={1}
                value={formData.response_time_hours}
                onChange={(val) =>
                  setFormData({
                    ...formData,
                    response_time_hours: typeof val === "number" ? val : 4,
                  })
                }
                required
                leftSection={
                  <Icon
                    icon="solar:bell-linear"
                    width={13}
                    style={{ color: "var(--mantine-color-dimmed)" }}
                  />
                }
                styles={{ input: { fontSize: 13 } }}
              />
              <NumberInput
                label={
                  <Text size="xs" fw={500} mb={4}>
                    Resolution (hours)
                  </Text>
                }
                placeholder="e.g. 24"
                min={1}
                value={formData.resolution_time_hours}
                onChange={(val) =>
                  setFormData({
                    ...formData,
                    resolution_time_hours: typeof val === "number" ? val : 24,
                  })
                }
                required
                leftSection={
                  <Icon
                    icon="solar:hourglass-linear"
                    width={13}
                    style={{ color: "var(--mantine-color-dimmed)" }}
                  />
                }
                styles={{ input: { fontSize: 13 } }}
              />
            </Group>
          </Box>

          {/* Active toggle (edit only) */}
          {editingSLA && (
            <Group
              justify="space-between"
              px="md"
              py="sm"
              style={{
                borderRadius: 8,
                background: "var(--mantine-color-default-hover)",
                border: "0.5px solid var(--mantine-color-default-border)",
              }}
            >
              <Box>
                <Text size="sm" fw={500}>
                  Active
                </Text>
                <Text size="xs" c="dimmed">
                  Disable to pause this SLA without deleting it
                </Text>
              </Box>
              <Switch
                checked={formData.is_active}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    is_active: e.currentTarget.checked,
                  })
                }
                color={B.purple}
              />
            </Group>
          )}

          <Divider />

          <Group justify="flex-end" gap={8}>
            <Button variant="default" size="sm" onClick={closeModal}>
              Cancel
            </Button>
            <Button
              size="sm"
              style={{ background: B.purpleDark, border: "none" }}
              loading={createMutation.isPending || updateMutation.isPending}
              onClick={handleSubmit}
            >
              {editingSLA ? "Save changes" : "Create SLA"}
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/*  Delete Confirm Modal  */}
      <Modal
        opened={deleteConfirmId !== null}
        onClose={() => setDeleteConfirmId(null)}
        title={
          <Group gap={8}>
            <Icon
              icon="solar:danger-triangle-bold-duotone"
              width={18}
              style={{ color: B.red }}
            />
            <Text fw={500} size="sm">
              Delete SLA
            </Text>
          </Group>
        }
        size="sm"
        centered
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
                style={{ color: B.red, marginTop: 1, flexShrink: 0 }}
              />
              <Text size="sm" style={{ color: B.redText }}>
                You are about to delete the SLA{" "}
                <strong>"{deleteConfirmName}"</strong>. Tickets using this SLA
                will no longer have response or resolution targets applied. This
                cannot be undone.
              </Text>
            </Group>
          </Box>
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
              style={{ background: B.red, border: "none" }}
              loading={deleteMutation.isPending}
              onClick={() => {
                if (deleteConfirmId !== null)
                  deleteMutation.mutate(deleteConfirmId);
              }}
            >
              Delete SLA
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
}
