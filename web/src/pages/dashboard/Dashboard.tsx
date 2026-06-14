import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useMantineColorScheme } from "@mantine/core";
import {
  Container,
  Stack,
  Group,
  Text,
  Paper,
  Loader,
  Center,
  Table,
  Badge,
  Button,
  SimpleGrid,
  Avatar,
  Progress,
  Box,
  Divider,
} from "@mantine/core";
import { Icon } from "@iconify-icon/react";
import ReactECharts from "echarts-for-react";
import { useAuth } from "@/hooks/useAuth";
import {
  fetchTickets,
  fetchAnalyticsDashboard,
  fetchDashboardTrends,
  fetchTeamWorkload,
} from "@/api/tickets.api";
import { notificationService } from "@/hooks/useNotifications";
import { DashboardErrorAlert } from "@/components/DashboardErrorAlert";
import { CustomAlert } from "@/components/CustomAlert";
import type { Ticket, TicketStatus } from "@/types/ticket";

// ─── Brand palette ─────────────────────────────────────────────────────────────

const BRAND = {
  purple: "#7F77DD",
  purpleDark: "#534AB7",
  purpleDeep: "#3C3489",
  purpleLight: "#EEEDFE",
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

// ─── Status / Priority metadata ────────────────────────────────────────────────

const STATUS_META: Record<
  TicketStatus,
  { label: string; dot: string; bg: string; text: string }
> = {
  OPEN: {
    label: "Open",
    dot: BRAND.red,
    bg: BRAND.redLight,
    text: BRAND.redText,
  },
  PENDING: {
    label: "Pending",
    dot: BRAND.blue,
    bg: BRAND.blueLight,
    text: BRAND.blueText,
  },
  IN_PROGRESS: {
    label: "In Progress",
    dot: BRAND.amber,
    bg: BRAND.amberLight,
    text: BRAND.amberText,
  },
  RESOLVED: {
    label: "Resolved",
    dot: BRAND.green,
    bg: BRAND.greenLight,
    text: BRAND.greenText,
  },
  CLOSED: {
    label: "Closed",
    dot: BRAND.gray,
    bg: BRAND.grayLight,
    text: BRAND.grayText,
  },
};

const PRIORITY_META: Record<string, { bg: string; text: string; bar: string }> =
  {
    HIGH: { bg: BRAND.redLight, text: BRAND.redText, bar: BRAND.red },
    MEDIUM: { bg: BRAND.amberLight, text: BRAND.amberText, bar: BRAND.amber },
    LOW: { bg: BRAND.greenLight, text: BRAND.greenText, bar: BRAND.green },
  };

const AVATAR_PALETTES = [
  { bg: "#EEEDFE", color: "#3C3489" },
  { bg: "#E1F5EE", color: "#085041" },
  { bg: "#FAEEDA", color: "#633806" },
  { bg: "#FAECE7", color: "#712B13" },
  { bg: "#E6F1FB", color: "#0C447C" },
  { bg: "#FBEAF0", color: "#72243E" },
];

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const FALLBACK_TEAM_MEMBERS = [
  { name: "Sara Ahmed", tickets: 27 },
  { name: "Karim M.", tickets: 22 },
  { name: "Layla N.", tickets: 18 },
  { name: "Omar A.", tickets: 14 },
  { name: "Nour R.", tickets: 10 },
];

const TICKET_TABLE_HEADERS = ["ID", "Title", "Status", "Priority", "Created by", "Assigned to", ""];

// ─── ECharts theme helpers ─────────────────────────────────────────────────────

function chartTheme(isDark: boolean) {
  return {
    text: isDark ? "#A6A7AB" : "#888780",
    textPrimary: isDark ? "#C1C2C5" : "#343A40",
    grid: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
    tooltipBg: isDark ? "#1A1B1E" : "#FFFFFF",
    tooltipBorder: isDark ? "#373A40" : "#DEE2E6",
  };
}

// ─── Chart option builders ─────────────────────────────────────────────────────

function trendOption(
  trends: { date: string; count: number }[],
  isDark: boolean,
) {
  const t = chartTheme(isDark);
  const gradStops = isDark
    ? [
        { offset: 0, color: "rgba(127,119,221,0.28)" },
        { offset: 1, color: "rgba(127,119,221,0)" },
      ]
    : [
        { offset: 0, color: "rgba(127,119,221,0.18)" },
        { offset: 1, color: "rgba(127,119,221,0)" },
      ];

  return {
    backgroundColor: "transparent",
    grid: { top: 12, right: 12, bottom: 36, left: 40 },
    tooltip: {
      trigger: "axis",
      backgroundColor: t.tooltipBg,
      borderColor: t.tooltipBorder,
      textStyle: { color: t.textPrimary, fontSize: 12 },
      formatter: (p: any[]) =>
        `<span style="color:${t.text};font-size:11px">${p[0].axisValue}</span><br/><b>${p[0].value} tickets</b>`,
      axisPointer: {
        lineStyle: { color: BRAND.purple, width: 1, type: "dashed" },
      },
    },
    xAxis: {
      type: "category",
      data: trends.map((d) => d.date),
      boundaryGap: false,
      axisLabel: { color: t.text, fontSize: 10, interval: 4 },
      axisLine: { lineStyle: { color: t.grid } },
      axisTick: { show: false },
    },
    yAxis: {
      type: "value",
      axisLabel: { color: t.text, fontSize: 10 },
      splitLine: { lineStyle: { color: t.grid } },
      axisLine: { show: false },
      axisTick: { show: false },
      minInterval: 1,
    },
    series: [
      {
        type: "line",
        data: trends.map((d) => d.count),
        smooth: 0.45,
        symbol: "circle",
        symbolSize: 5,
        showSymbol: false,
        lineStyle: { color: BRAND.purple, width: 2.5 },
        itemStyle: { color: BRAND.purple },
        areaStyle: {
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: gradStops,
          },
        },
        animationDuration: 1000,
        animationEasing: "cubicOut",
      },
    ],
  };
}

function donutOption(
  data: { name: string; value: number; color: string }[],
  isDark: boolean,
) {
  const t = chartTheme(isDark);
  return {
    backgroundColor: "transparent",
    tooltip: {
      trigger: "item",
      backgroundColor: t.tooltipBg,
      borderColor: t.tooltipBorder,
      textStyle: { color: t.textPrimary, fontSize: 12 },
      formatter: "{b}: <b>{c}</b> ({d}%)",
    },
    series: [
      {
        type: "pie",
        radius: ["68%", "88%"],
        center: ["50%", "50%"],
        avoidLabelOverlap: false,
        label: { show: false },
        itemStyle: {
          borderRadius: 5,
          borderWidth: isDark ? 3 : 2,
          borderColor: isDark ? "#141517" : "#FFFFFF",
        },
        emphasis: {
          scale: true,
          scaleSize: 5,
          itemStyle: { shadowBlur: 12, shadowColor: "rgba(0,0,0,0.2)" },
        },
        data: data.map((d) => ({
          name: d.name,
          value: d.value,
          itemStyle: { color: d.color },
        })),
        animationType: "expansion",
        animationDuration: 700,
        animationEasing: "cubicOut",
      },
    ],
  };
}

function priorityOption(
  data: { name: string; value: number; color: string }[],
  isDark: boolean,
) {
  const t = chartTheme(isDark);
  return {
    backgroundColor: "transparent",
    grid: { top: 8, right: 32, bottom: 8, left: 64 },
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "none" },
      backgroundColor: t.tooltipBg,
      borderColor: t.tooltipBorder,
      textStyle: { color: t.textPrimary, fontSize: 12 },
      formatter: (p: any[]) => `${p[0].name}: <b>${p[0].value} tickets</b>`,
    },
    xAxis: {
      type: "value",
      axisLabel: { color: t.text, fontSize: 10 },
      splitLine: { lineStyle: { color: t.grid } },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    yAxis: {
      type: "category",
      data: data.map((d) => d.name),
      axisLabel: { color: t.textPrimary, fontSize: 12, fontWeight: 500 },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    series: [
      {
        type: "bar",
        data: data.map((d) => ({
          value: d.value,
          itemStyle: { color: d.color, borderRadius: [0, 6, 6, 0] },
        })),
        barMaxWidth: 28,
        emphasis: {
          itemStyle: { shadowBlur: 8, shadowColor: "rgba(0,0,0,0.2)" },
        },
        label: {
          show: true,
          position: "right",
          color: t.textPrimary,
          fontSize: 11,
          fontWeight: 500,
        },
        animationDuration: 700,
        animationEasing: "elasticOut",
        animationDelay: (idx: number) => idx * 80,
      },
    ],
  };
}

function workloadOption(
  workload: {
    employee_name: string;
    open_tickets: number;
    resolved_tickets: number;
  }[],
  isDark: boolean,
) {
  const t = chartTheme(isDark);
  return {
    backgroundColor: "transparent",
    grid: { top: 12, right: 24, bottom: 60, left: 16 },
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      backgroundColor: t.tooltipBg,
      borderColor: t.tooltipBorder,
      textStyle: { color: t.textPrimary, fontSize: 12 },
    },
    legend: {
      bottom: 0,
      textStyle: { color: t.text, fontSize: 11 },
      itemWidth: 10,
      itemHeight: 10,
    },
    xAxis: {
      type: "category",
      data: workload.map((m) => m.employee_name.split(" ")[0]),
      axisLabel: { color: t.textPrimary, fontSize: 11 },
      axisLine: { lineStyle: { color: t.grid } },
      axisTick: { show: false },
    },
    yAxis: {
      type: "value",
      axisLabel: { color: t.text, fontSize: 10 },
      splitLine: { lineStyle: { color: t.grid } },
      axisLine: { show: false },
      axisTick: { show: false },
      minInterval: 1,
    },
    series: [
      {
        name: "Open",
        type: "bar",
        stack: "total",
        barMaxWidth: 40,
        itemStyle: { color: BRAND.red },
        data: workload.map((m) => m.open_tickets),
        animationDuration: 700,
        animationEasing: "elasticOut",
      },
      {
        name: "Resolved",
        type: "bar",
        stack: "total",
        barMaxWidth: 40,
        itemStyle: { color: BRAND.green, borderRadius: [6, 6, 0, 0] },
        data: workload.map((m) => m.resolved_tickets),
        animationDuration: 700,
        animationEasing: "elasticOut",
        animationDelay: (idx: number) => idx * 50,
      },
    ],
  };
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon,
  accentColor,
  delta,
  deltaUp,
}: {
  label: string;
  value: number | string;
  icon: string;
  accentColor: string;
  delta?: string;
  deltaUp?: boolean;
}) {
  const deltaColor =
    deltaUp === undefined
      ? "var(--mantine-color-dimmed)"
      : deltaUp
        ? BRAND.green
        : BRAND.red;

  const deltaIcon =
    deltaUp === undefined
      ? "solar:minus-linear"
      : deltaUp
        ? "solar:trending-up-linear"
        : "solar:trending-down-linear";

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

      {delta && (
        <Group gap={4} mt={6}>
          <Icon icon={deltaIcon} width={12} style={{ color: deltaColor }} />
          <Text size="xs" style={{ color: deltaColor }}>
            {delta}
          </Text>
        </Group>
      )}

      {/* Accent bottom bar */}
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

function StatusBadge({ status }: { status: TicketStatus }) {
  const m = STATUS_META[status];
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
        background: m.bg,
        color: m.text,
        whiteSpace: "nowrap",
      }}
    >
      <span
        style={{
          width: 5,
          height: 5,
          borderRadius: "50%",
          background: m.dot,
          flexShrink: 0,
          display: "inline-block",
        }}
      />
      {m.label}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const m = PRIORITY_META[priority] ?? PRIORITY_META.LOW;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        fontSize: 11,
        fontWeight: 500,
        padding: "3px 9px",
        borderRadius: 20,
        background: m.bg,
        color: m.text,
      }}
    >
      {priority.charAt(0) + priority.slice(1).toLowerCase()}
    </span>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Text
      size="xs"
      tt="uppercase"
      fw={500}
      c="dimmed"
      mb="md"
      style={{ letterSpacing: "0.05em" }}
    >
      {children}
    </Text>
  );
}

function HBar({
  label,
  value,
  max,
  barColor,
  valueLabel,
}: {
  label: string;
  value: number;
  max: number;
  barColor: string;
  valueLabel: string;
}) {
  return (
    <Box>
      <Group justify="space-between" mb={4}>
        <Text size="xs" c="dimmed">
          {label}
        </Text>
        <Text size="xs" fw={500} style={{ color: barColor }}>
          {valueLabel}
        </Text>
      </Group>
      <Progress
        value={max > 0 ? (value / max) * 100 : 0}
        size={6}
        radius="xl"
        styles={{
          section: { background: barColor },
          root: { background: "var(--mantine-color-default-hover)" },
        }}
      />
    </Box>
  );
}

function MetricRow({
  icon,
  label,
  value,
  valueColor,
}: {
  icon: string;
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <Group
      justify="space-between"
      px="sm"
      py={9}
      style={{
        background: "var(--mantine-color-default-hover)",
        borderRadius: "var(--mantine-radius-md)",
      }}
    >
      <Group gap={8}>
        <Icon
          icon={icon}
          width={14}
          style={{ color: "var(--mantine-color-dimmed)" }}
        />
        <Text size="xs" c="dimmed">
          {label}
        </Text>
      </Group>
      <Text
        size="sm"
        fw={500}
        style={valueColor ? { color: valueColor } : undefined}
      >
        {value}
      </Text>
    </Group>
  );
}

// ─── Dashboard ─────────────────────────────────────────────────────────────────

const Dashboard = () => {
  const navigate = useNavigate();
  const { accessToken, user } = useAuth();
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === "dark";
  const isManager = user?.role === "MANAGER";

  const {
    data: tickets = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["tickets"],
    queryFn: () => fetchTickets(),
    enabled: !!accessToken,
    staleTime: 5 * 60 * 1000,
  });

  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ["analytics-dashboard"],
    queryFn: () => fetchAnalyticsDashboard(),
    enabled: !!accessToken && isManager,
    staleTime: 5 * 60 * 1000,
  });

  const { data: trends = [] } = useQuery({
    queryKey: ["analytics-trends"],
    queryFn: () => fetchDashboardTrends(),
    enabled: !!accessToken && isManager,
    staleTime: 5 * 60 * 1000,
  });

  const { data: teamWorkload = [] } = useQuery({
    queryKey: ["analytics-team-workload"],
    queryFn: () => fetchTeamWorkload(),
    enabled: !!accessToken && isManager,
    staleTime: 5 * 60 * 1000,
  });

  const stats = useMemo(() => {
    const list = Array.isArray(tickets) ? tickets : [];
    return {
      total: list.length,
      open: list.filter((t: Ticket) => t.status === "OPEN").length,
      inProgress: list.filter((t: Ticket) => t.status === "IN_PROGRESS").length,
      resolved: list.filter((t: Ticket) => t.status === "RESOLVED").length,
      closed: list.filter((t: Ticket) => t.status === "CLOSED").length,
    };
  }, [tickets]);

  const recentTickets = useMemo(() => {
    const list = Array.isArray(tickets) ? tickets : [];
    return list
      .sort(
        (a: Ticket, b: Ticket) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )
      .slice(0, 5);
  }, [tickets]);

  // Donut chart data
  const donutData = useMemo(
    () =>
      [
        {
          name: "Open",
          value: analytics?.open_tickets ?? stats.open,
          color: BRAND.red,
        },
        { name: "In Progress", value: stats.inProgress, color: BRAND.amber },
        {
          name: "Resolved",
          value: analytics?.resolved_tickets ?? stats.resolved,
          color: BRAND.green,
        },
        { name: "Closed", value: stats.closed, color: BRAND.gray },
      ].filter((d) => d.value > 0),
    [analytics, stats],
  );

  // Priority bar data
  const priorityData = useMemo(
    () =>
      analytics
        ? Object.entries(analytics.tickets_by_priority || {}).map(
            ([name, value]) => ({
              name: name.charAt(0) + name.slice(1).toLowerCase(),
              value: value as number,
              color: PRIORITY_META[name]?.bar ?? BRAND.purple,
            }),
          )
        : [],
    [analytics],
  );

  // Sentiment bars
  const sentimentData = useMemo(
    () =>
      analytics
        ? Object.entries(analytics.sentiment_analysis || {}).map(
            ([key, value]) => {
              const k = String(key).toUpperCase();
              return {
                label: k.charAt(0) + k.slice(1).toLowerCase(),
                value: value as number,
                barColor:
                  k === "POSITIVE"
                    ? BRAND.green
                    : k === "NEGATIVE"
                      ? BRAND.red
                      : BRAND.blue,
              };
            },
          )
        : [],
    [analytics],
  );

  const resolutionRate =
    stats.total > 0 && analytics
      ? Math.round((analytics.resolved_tickets / stats.total) * 100)
      : 0;

  const avgResolution = analytics?.avg_resolution_time_hours?.toFixed(1) ?? "—";
  const pendingCount = analytics
    ? analytics.open_tickets + stats.inProgress
    : stats.open + stats.inProgress;

  // ── Loading / Error guards ──
  if (isLoading) {
    return (
      <Center h={400}>
        <Loader color={BRAND.purple} />
      </Center>
    );
  }

  if (error) {
    return (
      <Container py="lg">
        <CustomAlert variant="error" title="Failed to Load Dashboard">
          {(error as Error).message || "Please try again later"}
        </CustomAlert>
      </Container>
    );
  }

  return (
    <Container size="xl" py="lg">
      <Stack gap="lg">
        <DashboardErrorAlert />

        {/* ── Header ─────────────────────────────────────────────────── */}
        <Group justify="space-between" align="flex-end">
          <Box>
            <Text fw={500} style={{ fontSize: 22, lineHeight: 1.2 }}>
              Dashboard
            </Text>
            <Text size="sm" c="dimmed" mt={2}>
              Welcome back, {user?.username}
            </Text>
          </Box>
          <Group gap={8}>
            <Button
              variant="default"
              size="sm"
              leftSection={<Icon icon="solar:bell-linear" width={15} />}
              onClick={() => {
                notificationService.ticketAssigned(
                  1,
                  "Login issue on customer portal",
                );
                notificationService.ticketUpdated(
                  2,
                  "Database connection timeout",
                  "Status changed to IN_PROGRESS",
                );
                notificationService.commentAdded(
                  3,
                  "Password reset failure",
                  "John Doe",
                );
                notificationService.ticketResolved(4, "API response time high");
              }}
            >
              Notifications
            </Button>
            <Button
              size="sm"
              leftSection={
                <Icon icon="solar:add-circle-bold-duotone" width={15} />
              }
              style={{ background: BRAND.purpleDark, border: "none" }}
              onClick={() => navigate("/app/tickets/create")}
            >
              Create ticket
            </Button>
          </Group>
        </Group>

        {/* ── Stat cards ─────────────────────────────────────────────── */}
        <SimpleGrid cols={{ base: 2, sm: 3, md: 5 }} spacing={10}>
          <StatCard
            label="Total tickets"
            value={stats.total}
            icon="solar:chart-2-linear"
            accentColor={BRAND.purple}
            delta="+12 this week"
            deltaUp={true}
          />
          <StatCard
            label="Open"
            value={stats.open}
            icon="solar:bell-linear"
            accentColor={BRAND.red}
            delta="+4 since yesterday"
            deltaUp={false}
          />
          <StatCard
            label="In progress"
            value={stats.inProgress}
            icon="solar:hourglass-linear"
            accentColor={BRAND.amber}
            delta="No change"
          />
          <StatCard
            label="Resolved"
            value={stats.resolved}
            icon="solar:check-circle-linear"
            accentColor={BRAND.green}
            delta="+18 this week"
            deltaUp={true}
          />
          <StatCard
            label="Closed"
            value={stats.closed}
            icon="solar:archive-check-linear"
            accentColor={BRAND.gray}
            delta="-2 this week"
            deltaUp={false}
          />
        </SimpleGrid>

        {/* ── Manager analytics ───────────────────────────────────────── */}
        {isManager && (
          <>
            {analyticsLoading ? (
              <Center h={180}>
                <Loader color={BRAND.purple} />
              </Center>
            ) : (
              <>
                {/* Row 1: Trend + Donut */}
                <SimpleGrid
                  cols={{ base: 1, md: 2 }}
                  spacing={10}
                  style={{
                    gridTemplateColumns: "minmax(0,1.2fr) minmax(0,1fr)",
                  }}
                >
                  {/* Trend */}
                  <Paper
                    radius="md"
                    p="md"
                    style={{
                      border: "0.5px solid var(--mantine-color-default-border)",
                    }}
                  >
                    <Group justify="space-between" mb="md">
                      <Box>
                        <SectionLabel>Ticket volume</SectionLabel>
                        <Text size="xs" c="dimmed" mt={-12}>
                          Last 30 days
                        </Text>
                      </Box>
                      <Badge variant="dot" color="green" size="sm">
                        Live
                      </Badge>
                    </Group>
                    {trends.length > 0 ? (
                      <ReactECharts
                        option={trendOption(trends, isDark)}
                        style={{ height: 180 }}
                        opts={{ renderer: "svg" }}
                      />
                    ) : (
                      <Center h={180}>
                        <Text size="sm" c="dimmed">
                          No trend data
                        </Text>
                      </Center>
                    )}
                  </Paper>

                  {/* Donut */}
                  <Paper
                    radius="md"
                    p="md"
                    style={{
                      border: "0.5px solid var(--mantine-color-default-border)",
                    }}
                  >
                    <SectionLabel>Status distribution</SectionLabel>
                    <Stack gap="md" w="100%">
                      <Group
                        gap="md"
                        align="flex-start"
                        justify="center"
                        wrap="wrap"
                        w="100%"
                      >
                        <Box
                          style={{
                            position: "relative",
                            width: 120,
                            height: 120,
                            flexShrink: 0,
                          }}
                        >
                          <ReactECharts
                            option={donutOption(donutData, isDark)}
                            style={{ height: 120, width: 120 }}
                            opts={{ renderer: "svg" }}
                          />
                          <Box
                            style={{
                              position: "absolute",
                              top: "50%",
                              left: "50%",
                              transform: "translate(-50%,-50%)",
                              textAlign: "center",
                              pointerEvents: "none",
                            }}
                          >
                            <Text
                              fw={500}
                              style={{ fontSize: 18, lineHeight: 1 }}
                            >
                              {stats.total}
                            </Text>
                            <Text size="xs" c="dimmed">
                              total
                            </Text>
                          </Box>
                        </Box>
                        <Stack
                          gap={6}
                          style={{ flex: "1 1 auto", minWidth: 180 }}
                        >
                          {donutData.map((d) => (
                            <Group
                              key={d.name}
                              justify="space-around"
                              wrap="nowrap"
                              style={{ minWidth: 0 }}
                            >
                              <Group
                                gap={3}
                                wrap="nowrap"
                                style={{ minWidth: 0 }}
                              >
                                <Box
                                  style={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: "50%",
                                    background: d.color,
                                    flexShrink: 0,
                                  }}
                                />
                                <Text
                                  size="xs"
                                  c="dimmed"
                                  style={{
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {d.name}
                                </Text>
                              </Group>
                              <Text
                                size="xs"
                                fw={500}
                                style={{ flexShrink: 0 }}
                              >
                                {d.value}
                              </Text>
                            </Group>
                          ))}
                        </Stack>
                      </Group>
                    </Stack>
                  </Paper>
                </SimpleGrid>

                {/* Row 2: Priority+Sentiment · Metrics · Team workload */}
                <SimpleGrid cols={{ base: 1, md: 3 }} spacing={10}>
                  {/* Priority + Sentiment */}
                  <Paper
                    radius="md"
                    p="md"
                    style={{
                      border: "0.5px solid var(--mantine-color-default-border)",
                    }}
                  >
                    <SectionLabel>Priority breakdown</SectionLabel>
                    {priorityData.length > 0 ? (
                      <ReactECharts
                        option={priorityOption(priorityData, isDark)}
                        style={{ height: 110 }}
                        opts={{ renderer: "svg" }}
                      />
                    ) : (
                      <Stack gap={8}>
                        <HBar
                          label="High"
                          value={72}
                          max={120}
                          barColor={BRAND.red}
                          valueLabel="72"
                        />
                        <HBar
                          label="Medium"
                          value={118}
                          max={120}
                          barColor={BRAND.amber}
                          valueLabel="118"
                        />
                        <HBar
                          label="Low"
                          value={94}
                          max={120}
                          barColor={BRAND.green}
                          valueLabel="94"
                        />
                      </Stack>
                    )}

                    <Divider my="md" />

                    <SectionLabel>Sentiment</SectionLabel>
                    {sentimentData.length > 0 ? (
                      <Stack gap={8}>
                        {sentimentData.map((s) => (
                          <HBar
                            key={s.label}
                            label={s.label}
                            value={s.value}
                            max={Math.max(
                              ...sentimentData.map((x) => x.value),
                              1,
                            )}
                            barColor={s.barColor}
                            valueLabel={String(s.value)}
                          />
                        ))}
                      </Stack>
                    ) : (
                      <Stack gap={8}>
                        <HBar
                          label="Positive"
                          value={44}
                          max={100}
                          barColor={BRAND.green}
                          valueLabel="44%"
                        />
                        <HBar
                          label="Neutral"
                          value={35}
                          max={100}
                          barColor={BRAND.blue}
                          valueLabel="35%"
                        />
                        <HBar
                          label="Negative"
                          value={21}
                          max={100}
                          barColor={BRAND.red}
                          valueLabel="21%"
                        />
                      </Stack>
                    )}
                  </Paper>

                  {/* Key Metrics */}
                  <Paper
                    radius="md"
                    p="md"
                    style={{
                      border: "0.5px solid var(--mantine-color-default-border)",
                    }}
                  >
                    <SectionLabel>Key metrics</SectionLabel>
                    <Stack gap={8}>
                      <MetricRow
                        icon="solar:hourglass-linear"
                        label="Avg resolution time"
                        value={`${avgResolution}h`}
                      />
                      <MetricRow
                        icon="solar:check-circle-linear"
                        label="Resolution rate"
                        value={`${resolutionRate}%`}
                        valueColor={
                          resolutionRate >= 70 ? BRAND.green : BRAND.amber
                        }
                      />
                      <MetricRow
                        icon="solar:bell-linear"
                        label="Pending action"
                        value={String(pendingCount)}
                        valueColor={pendingCount > 80 ? BRAND.red : BRAND.amber}
                      />
                      <MetricRow
                        icon="solar:star-linear"
                        label="Avg CSAT score"
                        value="4.1 / 5"
                        valueColor={BRAND.green}
                      />
                      <MetricRow
                        icon="solar:bolt-linear"
                        label="First response avg"
                        value="38 min"
                      />
                    </Stack>
                  </Paper>

                  {/* Team workload */}
                  <Paper
                    radius="md"
                    p="md"
                    style={{
                      border: "0.5px solid var(--mantine-color-default-border)",
                    }}
                  >
                    <SectionLabel>Team workload</SectionLabel>
                    {teamWorkload.length > 0 ? (
                      <Stack gap="sm">
                        <ReactECharts
                          option={workloadOption(teamWorkload, isDark)}
                          style={{ height: 180 }}
                          opts={{ renderer: "svg" }}
                        />
                        <Divider />
                        <Stack gap={6}>
                          {teamWorkload.slice(0, 5).map((member, i) => {
                            const pal =
                              AVATAR_PALETTES[i % AVATAR_PALETTES.length];
                            return (
                              <Group
                                key={member.employee_id}
                                gap={8}
                                justify="space-between"
                                wrap="nowrap"
                              >
                                <Group
                                  gap={8}
                                  wrap="nowrap"
                                  style={{ minWidth: 0 }}
                                >
                                  <Avatar
                                    size={24}
                                    radius="xl"
                                    style={{
                                      background: pal.bg,
                                      color: pal.color,
                                      fontSize: 9,
                                      fontWeight: 500,
                                      flexShrink: 0,
                                    }}
                                  >
                                    {getInitials(member.employee_name)}
                                  </Avatar>
                                  <Text
                                    size="xs"
                                    style={{
                                      minWidth: 0,
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      whiteSpace: "nowrap",
                                    }}
                                  >
                                    {member.employee_name.split(" ")[0]}
                                  </Text>
                                </Group>
                                <Group gap={4} wrap="nowrap">
                                  <Badge size="xs" color="red" variant="light">
                                    {member.open_tickets}
                                  </Badge>
                                  <Badge
                                    size="xs"
                                    color="green"
                                    variant="light"
                                  >
                                    {member.resolved_tickets}
                                  </Badge>
                                </Group>
                              </Group>
                            );
                          })}
                        </Stack>
                        <Group justify="space-between" mt={4}>
                          <Text size="xs" c="dimmed">
                            {teamWorkload.reduce(
                              (s, m) => s + m.total_tickets,
                              0,
                            )}{" "}
                            total assigned
                          </Text>
                        </Group>
                      </Stack>
                    ) : (
                      /* Fallback static team */
                      <Stack gap={8}>
                        {FALLBACK_TEAM_MEMBERS.map((m, i) => {
                          const pal =
                            AVATAR_PALETTES[i % AVATAR_PALETTES.length];
                          return (
                            <Group key={m.name} gap={8} wrap="nowrap">
                              <Avatar
                                size={24}
                                radius="xl"
                                style={{
                                  background: pal.bg,
                                  color: pal.color,
                                  fontSize: 9,
                                  fontWeight: 500,
                                  flexShrink: 0,
                                }}
                              >
                                {getInitials(m.name)}
                              </Avatar>
                              <Text
                                size="xs"
                                style={{
                                  flex: 1,
                                  minWidth: 0,
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {m.name}
                              </Text>
                              <Box style={{ width: 64 }}>
                                <Progress
                                  value={(m.tickets / 27) * 100}
                                  size={5}
                                  radius="xl"
                                  styles={{
                                    section: { background: BRAND.purple },
                                    root: {
                                      background:
                                        "var(--mantine-color-default-hover)",
                                    },
                                  }}
                                />
                              </Box>
                              <Text
                                size="xs"
                                c="dimmed"
                                style={{ minWidth: 20, textAlign: "right" }}
                              >
                                {m.tickets}
                              </Text>
                            </Group>
                          );
                        })}
                        <Divider mt={4} />
                        <Group justify="space-between">
                          <Text size="xs" c="dimmed">
                            91 total assigned
                          </Text>
                          <Button
                            variant="subtle"
                            size="xs"
                            style={{
                              color: BRAND.purpleDark,
                              padding: "0 4px",
                              height: "auto",
                            }}
                            onClick={() => navigate("/app/analytics")}
                          >
                            Full report ↗
                          </Button>
                        </Group>
                      </Stack>
                    )}
                  </Paper>
                </SimpleGrid>
              </>
            )}
          </>
        )}

        {/* ── Recent Tickets ──────────────────────────────────────────── */}
        <Paper
          radius="md"
          p="md"
          style={{ border: "0.5px solid var(--mantine-color-default-border)" }}
        >
          <Group justify="space-between" align="center" mb="md">
            <SectionLabel>Recent tickets</SectionLabel>
            <Button
              variant="subtle"
              size="xs"
              style={{
                color: BRAND.purpleDark,
                padding: "0 4px",
                height: "auto",
              }}
              onClick={() => navigate("/app/tickets")}
            >
              View all ↗
            </Button>
          </Group>

          {recentTickets.length > 0 ? (
            <Box style={{ overflowX: "auto" }}>
              <Table highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    {TICKET_TABLE_HEADERS.map((h) => (
                      <Table.Th
                        key={h}
                        style={{
                          fontSize: 11,
                          fontWeight: 500,
                          color: "var(--mantine-color-dimmed)",
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                          paddingBottom: 8,
                        }}
                      >
                        {h}
                      </Table.Th>
                    ))}
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {recentTickets.map((ticket: Ticket) => (
                    <Table.Tr key={ticket.id}>
                      <Table.Td
                        style={{
                          color: "var(--mantine-color-dimmed)",
                          fontSize: 12,
                        }}
                      >
                        #{ticket.id}
                      </Table.Td>
                      <Table.Td style={{ maxWidth: 240 }}>
                        <Text size="sm" fw={500} lineClamp={1}>
                          {ticket.title}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <StatusBadge status={ticket.status} />
                      </Table.Td>
                      <Table.Td>
                        {ticket.priority ? (
                          <PriorityBadge priority={ticket.priority} />
                        ) : (
                          <Text size="xs" c="dimmed">
                            —
                          </Text>
                        )}
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{ticket.creator_username}</Text>
                      </Table.Td>
                      <Table.Td>
                        {ticket.assigned_to_username === "Unassigned" ? (
                          <Text size="sm" c="dimmed">
                            Unassigned
                          </Text>
                        ) : (
                          <Text size="sm">{ticket.assigned_to_username}</Text>
                        )}
                      </Table.Td>
                      <Table.Td>
                        <Button
                          variant="default"
                          size="xs"
                          style={{
                            fontSize: 11,
                            padding: "4px 10px",
                            height: "auto",
                          }}
                          onClick={() => navigate(`/app/tickets/${ticket.id}`)}
                        >
                          View
                        </Button>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Box>
          ) : (
            <Center h={180}>
              <Stack align="center" gap="sm">
                <Icon
                  icon="solar:document-linear"
                  width={36}
                  style={{
                    color: "var(--mantine-color-dimmed)",
                    opacity: 0.45,
                  }}
                />
                <Text size="sm" c="dimmed">
                  No tickets yet
                </Text>
                <Button
                  variant="subtle"
                  size="sm"
                  style={{ color: BRAND.purpleDark }}
                  onClick={() => navigate("/app/tickets/create")}
                >
                  Create your first ticket
                </Button>
              </Stack>
            </Center>
          )}
        </Paper>
      </Stack>
    </Container>
  );
};

export default Dashboard;
