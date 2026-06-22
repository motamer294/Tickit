import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Container,
  TextInput,
  Textarea,
  Button,
  Stack,
  Group,
  Paper,
  Text,
  Center,
  Loader,
  Divider,
  SimpleGrid,
  Select,
  MultiSelect,
  Box,
  Avatar,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { Icon } from "@iconify-icon/react";
import { notifications } from "@/utils/customNotifications";
import {
  createTicketApi,
  fetchCategoriesApi,
  fetchTagsApi,
  fetchTicketById,
} from "@/api/tickets.api";
import {
  fetchEmployeesWithTeamApi,
  groupEmployeesByTeamOnly,
} from "@/api/departments.api";
import { useAuth } from "@/hooks/useAuth";
import { ThinkingDots, TypedText, dedupeAiSolution } from "@/components/AiTyping";
import type { Ticket } from "@/types/ticket";
import { useState, useEffect } from "react";

// ─── Brand palette ─────────────────────────────────────────────────────────────

const BRAND = {
  purple: "#7F77DD",
  purpleDark: "#534AB7",
  purpleLight: "#EEEDFE",
  purpleText: "#3C3489",
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

// ─── Priority / Sentiment metadata ────────────────────────────────────────────

const PRIORITY_META: Record<
  string,
  { bg: string; text: string; dot: string; icon: string }
> = {
  URGENT: {
    bg: BRAND.redLight,
    text: BRAND.redText,
    dot: BRAND.red,
    icon: "solar:fire-bold-duotone",
  },
  HIGH: {
    bg: BRAND.redLight,
    text: BRAND.redText,
    dot: BRAND.red,
    icon: "solar:bolt-bold-duotone",
  },
  MEDIUM: {
    bg: BRAND.amberLight,
    text: BRAND.amberText,
    dot: BRAND.amber,
    icon: "solar:bolt-bold-duotone",
  },
  LOW: {
    bg: BRAND.greenLight,
    text: BRAND.greenText,
    dot: BRAND.green,
    icon: "solar:bolt-bold-duotone",
  },
};

const SENTIMENT_META: Record<
  string,
  { bg: string; text: string; dot: string; icon: string }
> = {
  Positive: {
    bg: BRAND.greenLight,
    text: BRAND.greenText,
    dot: BRAND.green,
    icon: "solar:smile-circle-bold-duotone",
  },
  Neutral: {
    bg: BRAND.blueLight,
    text: BRAND.blueText,
    dot: BRAND.blue,
    icon: "solar:face-id-bold-duotone",
  },
  Negative: {
    bg: BRAND.redLight,
    text: BRAND.redText,
    dot: BRAND.red,
    icon: "solar:sad-circle-bold-duotone",
  },
};

const STATUS_META: Record<string, { bg: string; text: string; dot: string }> = {
  OPEN: { bg: BRAND.redLight, text: BRAND.redText, dot: BRAND.red },
  IN_PROGRESS: {
    bg: BRAND.amberLight,
    text: BRAND.amberText,
    dot: BRAND.amber,
  },
  RESOLVED: { bg: BRAND.greenLight, text: BRAND.greenText, dot: BRAND.green },
  CLOSED: { bg: BRAND.grayLight, text: BRAND.grayText, dot: BRAND.gray },
  PENDING: { bg: BRAND.blueLight, text: BRAND.blueText, dot: BRAND.blue },
};

// ─── Shared sub-components ─────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
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

function InfoPill({
  label,
  value,
  bg,
  text,
  dot,
  icon,
}: {
  label: string;
  value: string;
  bg: string;
  text: string;
  dot: string;
  icon?: string;
}) {
  return (
    <Paper
      p="md"
      radius="md"
      style={{ border: "0.5px solid var(--mantine-color-default-border)" }}
    >
      <Group justify="space-between" mb={8}>
        <Text size="xs" c="dimmed" fw={500}>
          {label}
        </Text>
        {icon && (
          <Icon icon={icon} width={14} style={{ color: dot, opacity: 0.8 }} />
        )}
      </Group>
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          fontSize: 13,
          fontWeight: 600,
          padding: "4px 10px",
          borderRadius: 20,
          background: bg,
          color: text,
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
        {value}
      </span>
    </Paper>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function CreateTicket() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [createdTicket, setCreatedTicket] = useState<Ticket | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(
    null,
  );

  const { data: employees = [], isLoading: employeesLoading } = useQuery({
    queryKey: ["employees-with-team"],
    queryFn: () => fetchEmployeesWithTeamApi(),
    enabled: user?.role === "MANAGER",
  });

  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategoriesApi,
  });

  const { data: tags = [], isLoading: tagsLoading } = useQuery({
    queryKey: ["tags"],
    queryFn: fetchTagsApi,
  });

  const isAiPending =
    createdTicket?.ai_status === "PENDING" ||
    createdTicket?.ai_status === "PROCESSING";

  const { data: polledTicket } = useQuery({
    queryKey: ["ticket-poll", createdTicket?.id],
    queryFn: () => fetchTicketById(createdTicket!.id),
    enabled: !!createdTicket?.id && isAiPending,
    refetchInterval: 2000,
  });

  useEffect(() => {
    if (
      polledTicket &&
      (polledTicket.ai_status === "DONE" || polledTicket.ai_status === "FAILED")
    ) {
      setCreatedTicket(polledTicket as Ticket);
    }
  }, [polledTicket]);

  const form = useForm({
    initialValues: {
      title: "",
      description: "",
      priority: "MEDIUM",
      category_id: null as number | null,
      tag_ids: [] as number[],
    },
    validate: {
      title: (val) =>
        val.length < 3 ? "Title must be at least 3 characters" : null,
      description: (val) =>
        val.length < 10 ? "Description must be at least 10 characters" : null,
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof form.values) => {
      const payload: any = {
        title: data.title,
        description: data.description,
        priority: data.priority,
        category_id: data.category_id,
        tag_ids: data.tag_ids,
      };
      if (user?.role === "MANAGER" && selectedEmployeeId) {
        payload.assignedToId = Number(selectedEmployeeId);
      }
      return createTicketApi(payload);
    },
    onSuccess: (data) => {
      setCreatedTicket(data);
      const assignmentText =
        data.assigned_to_username && data.assigned_to_username !== "Unassigned"
          ? ` · Assigned to ${data.assigned_to_username}`
          : "";
      notifications.show({
        title: "Ticket created",
        message: `Ticket #${data.id} · ${data.priority} priority${assignmentText}`,
        color: "green",
      });
    },
    onError: (error: any) => {
      notifications.show({
        title: "Error",
        message: error.message || "Failed to create ticket",
        color: "red",
      });
    },
  });

  // ── Success / AI analysis screen ──────────────────────────────────────────────

  if (createdTicket) {
    const priorityM =
      PRIORITY_META[createdTicket.priority ?? "MEDIUM"] ?? PRIORITY_META.MEDIUM;
    const sentimentM =
      SENTIMENT_META[createdTicket.sentiment ?? "Neutral"] ??
      SENTIMENT_META.Neutral;
    const statusM = STATUS_META[createdTicket.status] ?? STATUS_META.OPEN;

    return (
      <Container size="md" py="lg">
        <Stack gap="lg">
          {/* ── Success header ── */}
          <Paper
            p="lg"
            radius="md"
            style={{
              border: `0.5px solid ${BRAND.green}44`,
              background: BRAND.greenLight,
            }}
          >
            <Group gap={12}>
              <Box
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  background: BRAND.green,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Icon
                  icon="solar:check-circle-bold-duotone"
                  width={22}
                  style={{ color: "#fff" }}
                />
              </Box>
              <Box>
                <Text
                  fw={600}
                  style={{ color: BRAND.greenText, lineHeight: 1.2 }}
                >
                  Ticket created successfully
                </Text>
                <Text
                  size="xs"
                  style={{ color: BRAND.greenText, opacity: 0.75 }}
                >
                  #{createdTicket.id} · {createdTicket.title}
                </Text>
              </Box>
            </Group>
          </Paper>

          {/* ── AI Analysis Results ── */}
          <Paper
            p="lg"
            radius="md"
            style={{
              border: "0.5px solid var(--mantine-color-default-border)",
            }}
          >
            <Group justify="space-between" align="center" mb="md">
              <Group gap={8}>
                <Icon
                  icon="solar:cpu-bolt-bold-duotone"
                  width={18}
                  style={{ color: BRAND.purple }}
                />
                <Text fw={600} size="sm">
                  AI analysis results
                </Text>
              </Group>
              {(createdTicket.ai_status === "PENDING" ||
                createdTicket.ai_status === "PROCESSING") ? (
                <Group gap={6}>
                  <Loader size={12} color={BRAND.purple} type="dots" />
                  <Text size="xs" fw={500} style={{ color: BRAND.purpleText }}>
                    Analysing…
                  </Text>
                </Group>
              ) : (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    padding: "2px 8px",
                    borderRadius: 20,
                    background: BRAND.purpleLight,
                    color: BRAND.purpleText,
                  }}
                >
                  Auto-categorized
                </span>
              )}
            </Group>

            <Divider mb="md" />

            {/* ── While AI is still running ── */}
            {(createdTicket.ai_status === "PENDING" ||
              createdTicket.ai_status === "PROCESSING") && (
              <Box
                p="lg"
                mb="md"
                style={{
                  borderRadius: 10,
                  background: BRAND.purpleLight,
                  border: `0.5px solid ${BRAND.purple}22`,
                  textAlign: "center",
                }}
              >
                <ThinkingDots />
                <Text
                  size="xs"
                  fw={500}
                  style={{ color: BRAND.purpleText }}
                  mt={10}
                >
                  Thinking…
                </Text>
              </Box>
            )}

            {/* ── Normal stat cards (shown once AI is done / for old tickets) ── */}
            {(!createdTicket.ai_status ||
              createdTicket.ai_status === "DONE" ||
              createdTicket.ai_status === "FAILED") && (
              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing={10} mb="md">
                {/* Category */}
                <Paper
                  p="md"
                  radius="md"
                  style={{
                    border: "0.5px solid var(--mantine-color-default-border)",
                  }}
                >
                  <Group justify="space-between" mb={8}>
                    <Text size="xs" c="dimmed" fw={500}>Category</Text>
                    <Icon icon="solar:folder-bold-duotone" width={14} style={{ color: "var(--mantine-color-dimmed)" }} />
                  </Group>
                  {createdTicket.category ? (
                    <Group gap={8}>
                      <Box style={{ width: 10, height: 10, borderRadius: "50%", background: createdTicket.category.color || BRAND.gray, flexShrink: 0, boxShadow: `0 0 0 2px ${createdTicket.category.color || BRAND.gray}33` }} />
                      <Text fw={600} size="sm">{createdTicket.category.name}</Text>
                    </Group>
                  ) : (
                    <Text fw={500} size="sm" c="dimmed">Uncategorized</Text>
                  )}
                </Paper>

                <InfoPill label="Priority" value={createdTicket.priority ?? "MEDIUM"} {...priorityM} />
                <InfoPill label="Sentiment" value={createdTicket.sentiment ?? "—"} {...sentimentM} />
                <InfoPill label="Status" value={createdTicket.status} icon="solar:clipboard-list-bold-duotone" {...statusM} />
              </SimpleGrid>
            )}

            {/* Tags */}
            {createdTicket.tags && createdTicket.tags.length > 0 && (
              <>
                <Divider mb="md" />
                <Box mb="md">
                  <SectionLabel>Tags</SectionLabel>
                  <Group gap={6} mt={8}>
                    {createdTicket.tags.map((tag) => (
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
                          background: (tag.color || BRAND.gray) + "22",
                          color: tag.color || BRAND.gray,
                        }}
                      >
                        <span style={{ width: 5, height: 5, borderRadius: "50%", background: tag.color || BRAND.gray }} />
                        #{tag.name}
                      </span>
                    ))}
                  </Group>
                </Box>
              </>
            )}

            {/* Assignment */}
            {createdTicket.assigned_to_username &&
              createdTicket.assigned_to_username !== "Unassigned" && (
                <>
                  <Divider mb="md" />
                  <Box mb="md">
                    <SectionLabel>Assigned to</SectionLabel>
                    <Group gap={8} mt={8}>
                      <Avatar size={26} radius="xl" style={{ background: BRAND.purpleLight, color: BRAND.purpleText, fontSize: 9, fontWeight: 700 }}>
                        {createdTicket.assigned_to_username.slice(0, 2).toUpperCase()}
                      </Avatar>
                      <Text size="sm" fw={500}>{createdTicket.assigned_to_username}</Text>
                    </Group>
                  </Box>
                </>
              )}

            {/* AI Suggested Solution — only when DONE */}
            {(!createdTicket.ai_status || createdTicket.ai_status === "DONE") &&
              createdTicket.ai_suggested_solution && (
                <>
                  <Divider mb="md" />
                  <Box p="md" style={{ borderRadius: "var(--mantine-radius-md)", background: BRAND.purpleLight, border: `0.5px solid ${BRAND.purple}33` }}>
                    <Group gap={8} mb={8}>
                      <Icon icon="solar:lightbulb-bold-duotone" width={15} style={{ color: BRAND.purple }} />
                      <Text size="xs" fw={600} style={{ color: BRAND.purpleText }}>AI suggested solution</Text>
                    </Group>
                    <TypedText text={dedupeAiSolution(createdTicket.ai_suggested_solution)} />
                  </Box>
                </>
              )}
          </Paper>

          {/* ── Action buttons ── */}
          <Group justify="flex-end" gap={8}>
            <Button
              variant="default"
              size="sm"
              onClick={() => {
                setCreatedTicket(null);
                setSelectedEmployeeId(null);
                form.reset();
              }}
            >
              Create another
            </Button>
            <Button
              size="sm"
              style={{ background: BRAND.purpleDark, border: "none" }}
              leftSection={
                <Icon icon="solar:arrow-right-bold-duotone" width={15} />
              }
              onClick={() => navigate(`../${createdTicket.id}`)}
            >
              View ticket
            </Button>
          </Group>
        </Stack>
      </Container>
    );
  }

  // ── Create form ───────────────────────────────────────────────────────────────

  return (
    <Container size="md" py="lg">
      <Stack gap="lg">
        {/* ── Header ── */}
        <Group justify="space-between" align="flex-end">
          <Box>
            <Text fw={500} style={{ fontSize: 22, lineHeight: 1.2 }}>
              Create ticket
            </Text>
            <Text size="sm" c="dimmed" mt={2}>
              Submit a support request — AI will analyze and categorize it
              automatically
            </Text>
          </Box>
          <Button variant="default" size="sm" onClick={() => navigate("..")}>
            Cancel
          </Button>
        </Group>

        {/* ── AI info banner ── */}
        <Paper
          p="md"
          radius="md"
          style={{
            border: `0.5px solid ${BRAND.purple}33`,
            background: BRAND.purpleLight,
          }}
        >
          <Group gap={10}>
            <Box
              style={{
                width: 32,
                height: 32,
                borderRadius: 9,
                background: BRAND.purpleDark,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Icon
                icon="solar:cpu-bolt-bold-duotone"
                width={16}
                style={{ color: "#fff" }}
              />
            </Box>
            <Box>
              <Text
                size="sm"
                fw={600}
                style={{ color: BRAND.purpleText, lineHeight: 1.2 }}
              >
                AI-Powered Analysis
              </Text>
              <Text
                size="xs"
                style={{ color: BRAND.purpleText, opacity: 0.75 }}
              >
                Our AI engine will automatically categorize your ticket, assess
                priority, and suggest a solution.
              </Text>
            </Box>
          </Group>
        </Paper>

        {/* ── Form ── */}
        <Paper
          radius="md"
          style={{
            border: "0.5px solid var(--mantine-color-default-border)",
            overflow: "hidden",
          }}
        >
          {createMutation.isPending ? (
            <Center py={80}>
              <Stack gap={10} align="center">
                <ThinkingDots />
                <Box ta="center">
                  <Text fw={500} size="sm" mt={4}>
                    Thinking…
                  </Text>
                  <Text size="xs" c="dimmed">
                    AI is analyzing your request
                  </Text>
                </Box>
              </Stack>
            </Center>
          ) : (
            <form
              onSubmit={form.onSubmit((values) =>
                createMutation.mutate(values),
              )}
            >
              <Stack gap={0}>
                {/* Title */}
                <Box px="lg" pt="lg" pb="md">
                  <SectionLabel>Issue details</SectionLabel>
                  <Stack gap="md" mt="sm">
                    <TextInput
                      required
                      label={
                        <Text size="xs" fw={500} mb={4}>
                          Title
                        </Text>
                      }
                      placeholder="e.g. Cannot login to my account"
                      description="Brief, specific summary of your issue"
                      leftSection={
                        <Icon
                          icon="solar:clipboard-list-linear"
                          width={14}
                          style={{ color: "var(--mantine-color-dimmed)" }}
                        />
                      }
                      styles={{
                        input: { fontSize: 13 },
                        description: { fontSize: 11 },
                      }}
                      {...form.getInputProps("title")}
                    />

                    <Textarea
                      required
                      label={
                        <Text size="xs" fw={500} mb={4}>
                          Description
                        </Text>
                      }
                      placeholder="Describe your issue in detail — include any error messages, steps to reproduce, and what you've already tried."
                      description="The more detail you provide, the better we can help"
                      minRows={7}
                      maxRows={14}
                      autosize
                      styles={{
                        input: { fontSize: 13 },
                        description: { fontSize: 11 },
                      }}
                      {...form.getInputProps("description")}
                    />
                  </Stack>
                </Box>

                <Divider />

                {/* Priority, Category, Tags */}
                <Box px="lg" py="md">
                  <SectionLabel>Classification</SectionLabel>
                  <Stack gap="md" mt="sm">
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
                        leftSection={
                          <Icon
                            icon="solar:bolt-linear"
                            width={14}
                            style={{ color: "var(--mantine-color-dimmed)" }}
                          />
                        }
                        styles={{ input: { fontSize: 13 } }}
                        {...form.getInputProps("priority")}
                        searchable
                      />

                      <Select
                        label={
                          <Text size="xs" fw={500} mb={4}>
                            Category{" "}
                            <Text span size="xs" c="dimmed">
                              (optional)
                            </Text>
                          </Text>
                        }
                        placeholder="Any category"
                        data={categories.map((c) => ({
                          value: c.id.toString(),
                          label: c.name,
                        }))}
                        leftSection={
                          <Icon
                            icon="solar:folder-linear"
                            width={14}
                            style={{ color: "var(--mantine-color-dimmed)" }}
                          />
                        }
                        searchable
                        clearable
                        disabled={categoriesLoading}
                        styles={{ input: { fontSize: 13 } }}
                        {...form.getInputProps("category_id")}
                      />
                    </Group>

                    <MultiSelect
                      label={
                        <Text size="xs" fw={500} mb={4}>
                          Tags{" "}
                          <Text span size="xs" c="dimmed">
                            (optional)
                          </Text>
                        </Text>
                      }
                      placeholder="Add tags…"
                      data={tags.map((t) => ({
                        value: t.id.toString(),
                        label: `#${t.name}`,
                      }))}
                      leftSection={
                        <Icon
                          icon="solar:tag-linear"
                          width={14}
                          style={{ color: "var(--mantine-color-dimmed)" }}
                        />
                      }
                      searchable
                      clearable
                      disabled={tagsLoading}
                      styles={{ input: { fontSize: 13 } }}
                      {...form.getInputProps("tag_ids")}
                    />
                  </Stack>
                </Box>

                <Divider />

                {/* Assignment (manager only) */}
                {user?.role === "MANAGER" && (
                  <>
                    <Box px="lg" py="md">
                      <SectionLabel>Assignment</SectionLabel>
                      <Stack gap="md" mt="sm">
                        <Select
                          label={
                            <Text size="xs" fw={500} mb={4}>
                              Assign to employee{" "}
                              <Text span size="xs" c="dimmed">
                                (optional)
                              </Text>
                            </Text>
                          }
                          placeholder={
                            employeesLoading
                              ? "Loading employees…"
                              : "Auto-assign or choose an employee"
                          }
                          data={groupEmployeesByTeamOnly(employees)}
                          value={selectedEmployeeId}
                          onChange={setSelectedEmployeeId}
                          disabled={employeesLoading || employees.length === 0}
                          searchable
                          clearable
                          leftSection={
                            <Icon
                              icon="solar:user-check-linear"
                              width={14}
                              style={{ color: "var(--mantine-color-dimmed)" }}
                            />
                          }
                          styles={{ input: { fontSize: 13 } }}
                        />
                        {!selectedEmployeeId && (
                          <Group gap={6}>
                            <Icon
                              icon="solar:info-circle-linear"
                              width={12}
                              style={{ color: "var(--mantine-color-dimmed)" }}
                            />
                            <Text size="xs" c="dimmed">
                              Leave blank to auto-assign to the employee with
                              the lowest workload
                            </Text>
                          </Group>
                        )}
                      </Stack>
                    </Box>
                    <Divider />
                  </>
                )}

                {/* Auto-assign info (non-managers) */}
                {user?.role !== "MANAGER" && (
                  <>
                    <Box px="lg" py="md">
                      <Group
                        gap={8}
                        px="sm"
                        py="sm"
                        style={{
                          borderRadius: 8,
                          background: BRAND.blueLight,
                          border: `0.5px solid ${BRAND.blue}33`,
                        }}
                      >
                        <Icon
                          icon="solar:info-circle-linear"
                          width={13}
                          style={{ color: BRAND.blue, flexShrink: 0 }}
                        />
                        <Text size="xs" style={{ color: BRAND.blueText }}>
                          This ticket will be automatically assigned to the
                          available employee with the lowest current workload.
                        </Text>
                      </Group>
                    </Box>
                    <Divider />
                  </>
                )}

                {/* Submit */}
                <Box px="lg" py="md">
                  <Group justify="flex-end" gap={8}>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => navigate("..")}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      style={{ background: BRAND.purpleDark, border: "none" }}
                      disabled={createMutation.isPending}
                      leftSection={
                        <Icon
                          icon="solar:check-circle-bold-duotone"
                          width={15}
                        />
                      }
                    >
                      Submit ticket
                    </Button>
                  </Group>
                </Box>
              </Stack>
            </form>
          )}
        </Paper>

        {/* ── Tips card ── */}
        <Paper
          p="md"
          radius="md"
          style={{ border: "0.5px solid var(--mantine-color-default-border)" }}
        >
          <Group gap={8} mb="sm">
            <Icon
              icon="solar:lightbulb-bold-duotone"
              width={15}
              style={{ color: BRAND.amber }}
            />
            <Text
              size="xs"
              fw={600}
              tt="uppercase"
              style={{ letterSpacing: "0.05em" }}
            >
              Tips for faster resolution
            </Text>
          </Group>
          <Stack gap={4}>
            {[
              "Be specific and detailed — vague reports take longer to resolve",
              "Include any error messages, codes, or screenshots if applicable",
              "Describe what you already tried so we don't repeat steps",
              "Our AI auto-assigns priority and category — you'll see it instantly after submission",
            ].map((tip, i) => (
              <Group key={i} gap={6} wrap="nowrap" align="flex-start">
                <Box
                  style={{
                    width: 4,
                    height: 4,
                    borderRadius: "50%",
                    background: BRAND.amber,
                    flexShrink: 0,
                    marginTop: 6,
                  }}
                />
                <Text size="xs" c="dimmed">
                  {tip}
                </Text>
              </Group>
            ))}
          </Stack>
        </Paper>
      </Stack>
    </Container>
  );
}
