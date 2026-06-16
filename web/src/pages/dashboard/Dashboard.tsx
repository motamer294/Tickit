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
  Skeleton,
  Center,
  Table,
  ScrollArea,
  Badge,
  Button,
  SimpleGrid,
  Avatar,
  Progress,
  Box,
  Divider,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { Icon } from "@iconify-icon/react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
  BarChart, Bar, Legend,
} from "recharts";
import { useAuth } from "@/hooks/useAuth";
import {
  fetchTickets,
  fetchAnalyticsDashboard,
  fetchDashboardTrends,
  fetchTeamWorkload,
} from "@/api/tickets.api";
import { DashboardErrorAlert } from "@/components/DashboardErrorAlert";
import { CustomAlert } from "@/components/CustomAlert";
import UserAvatar from "@/components/UserAvatar";
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
  OPEN: { label: "Open", dot: BRAND.red, bg: BRAND.redLight, text: BRAND.redText },
  PENDING: { label: "Pending", dot: BRAND.blue, bg: BRAND.blueLight, text: BRAND.blueText },
  IN_PROGRESS: { label: "In Progress", dot: BRAND.amber, bg: BRAND.amberLight, text: BRAND.amberText },
  RESOLVED: { label: "Resolved", dot: BRAND.green, bg: BRAND.greenLight, text: BRAND.greenText },
  CLOSED: { label: "Closed", dot: BRAND.gray, bg: BRAND.grayLight, text: BRAND.grayText },
};

const PRIORITY_META: Record<string, { bg: string; text: string; bar: string }> = {
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
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

const FALLBACK_TEAM_MEMBERS = [
  { name: "Sara Ahmed", tickets: 27 },
  { name: "Karim M.", tickets: 22 },
  { name: "Layla N.", tickets: 18 },
  { name: "Omar A.", tickets: 14 },
  { name: "Nour R.", tickets: 10 },
];

const TICKET_TABLE_HEADERS = ["ID", "Title", "Status", "Priority", "Created by", "Assigned to", ""];

// ─── Chart helpers ─────────────────────────────────────────────────────────────

function chartColors(isDark: boolean) {
  return {
    text: isDark ? "#A6A7AB" : "#888780",
    textPrimary: isDark ? "#C1C2C5" : "#343A40",
    grid: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
    tooltipBg: isDark ? "#1A1B1E" : "#FFFFFF",
    tooltipBorder: isDark ? "#373A40" : "#DEE2E6",
  };
}

// ─── Recharts chart components ─────────────────────────────────────────────────

function TrendChart({ trends, isDark }: { trends: { date: string; count: number }[]; isDark: boolean }) {
  const c = chartColors(isDark);
  const tipStyle = { background: c.tooltipBg, border: `1px solid ${c.tooltipBorder}`, color: c.textPrimary, fontSize: 12 };
  return (
    <ResponsiveContainer width="100%" height={180}>
      <AreaChart data={trends} margin={{ top: 12, right: 12, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={BRAND.purple} stopOpacity={isDark ? 0.28 : 0.18} />
            <stop offset="100%" stopColor={BRAND.purple} stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="date" tick={{ fill: c.text, fontSize: 10 }} tickLine={false} axisLine={{ stroke: c.grid }} interval={4} />
        <YAxis tick={{ fill: c.text, fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} width={28} />
        <Tooltip contentStyle={tipStyle} />
        <Area type="monotone" dataKey="count" stroke={BRAND.purple} strokeWidth={2.5} fill="url(#trendGrad)" dot={false} activeDot={{ r: 4, fill: BRAND.purple }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function DonutChart({ data, isDark, total }: { data: { name: string; value: number; color: string }[]; isDark: boolean; total: number }) {
  const c = chartColors(isDark);
  return (
    <Box style={{ position: "relative", width: 120, height: 120, flexShrink: 0 }}>
      <PieChart width={120} height={120}>
        <Pie data={data} cx={55} cy={55} innerRadius={40} outerRadius={53} dataKey="value" paddingAngle={2} startAngle={90} endAngle={-270}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.color} stroke={isDark ? "#141517" : "#FFFFFF"} strokeWidth={isDark ? 3 : 2} />
          ))}
        </Pie>
        <Tooltip contentStyle={{ background: c.tooltipBg, border: `1px solid ${c.tooltipBorder}`, fontSize: 12 }} />
      </PieChart>
      <Box style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", textAlign: "center", pointerEvents: "none" }}>
        <Text fw={500} style={{ fontSize: 18, lineHeight: 1 }}>{total}</Text>
        <Text size="xs" c="dimmed">total</Text>
      </Box>
    </Box>
  );
}

function PriorityChart({ data, isDark }: { data: { name: string; value: number; color: string }[]; isDark: boolean }) {
  const c = chartColors(isDark);
  return (
    <ResponsiveContainer width="100%" height={110}>
      <BarChart data={data} layout="vertical" margin={{ top: 8, right: 32, bottom: 8, left: 0 }}>
        <XAxis type="number" tick={{ fill: c.text, fontSize: 10 }} tickLine={false} axisLine={false} />
        <YAxis type="category" dataKey="name" tick={{ fill: c.textPrimary, fontSize: 12, fontWeight: "500" }} tickLine={false} axisLine={false} width={56} />
        <Tooltip contentStyle={{ background: c.tooltipBg, border: `1px solid ${c.tooltipBorder}`, fontSize: 12 }} formatter={(v) => [`${v} tickets`]} />
        <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={28} label={{ position: "right", fill: c.textPrimary, fontSize: 11, fontWeight: 500 }}>
          {data.map((d, i) => <Cell key={i} fill={d.color} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function WorkloadChart({ workload, isDark }: {
  workload: { employee_name: string; open_tickets: number; resolved_tickets: number }[];
  isDark: boolean;
}) {
  const c = chartColors(isDark);
  const data = workload.map((m) => ({
    name: m.employee_name.split(" ")[0],
    Open: m.open_tickets,
    Resolved: m.resolved_tickets,
  }));
  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 40, left: 0 }}>
        <XAxis dataKey="name" tick={{ fill: c.textPrimary, fontSize: 11 }} tickLine={false} axisLine={{ stroke: c.grid }} />
        <YAxis tick={{ fill: c.text, fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} width={24} />
        <Tooltip contentStyle={{ background: c.tooltipBg, border: `1px solid ${c.tooltipBorder}`, fontSize: 12 }} />
        <Legend wrapperStyle={{ color: c.text, fontSize: 11 }} iconSize={10} />
        <Bar dataKey="Open" stackId="total" fill={BRAND.red} maxBarSize={40} />
        <Bar dataKey="Resolved" stackId="total" fill={BRAND.green} maxBarSize={40} radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function StatCard({
  label, value, icon, accentColor, delta, deltaUp,
}: {
  label: string;
  value: number | string;
  icon: string;
  accentColor: string;
  delta?: string;
  deltaUp?: boolean;
}) {
  const deltaColor = deltaUp === undefined ? "var(--mantine-color-dimmed)" : deltaUp ? BRAND.green : BRAND.red;
  const deltaIcon = deltaUp === undefined ? "solar:minus-linear" : deltaUp ? "solar:trending-up-linear" : "solar:trending-down-linear";

  return (
    <Paper
      radius="md"
      p="md"
      style={{ border: "0.5px solid var(--mantine-color-default-border)", position: "relative", overflow: "hidden" }}
    >
      <Group justify="space-between" mb={8}>
        <Text size="xs" c="dimmed" tt="uppercase" fw={500} style={{ letterSpacing: "0.05em" }}>
          {label}
        </Text>
        <Icon icon={icon} width={15} style={{ color: accentColor, opacity: 0.75 }} />
      </Group>
      <Text fw={500} style={{ fontSize: 26, lineHeight: 1 }}>{value}</Text>
      {delta && (
        <Group gap={4} mt={6}>
          <Icon icon={deltaIcon} width={12} style={{ color: deltaColor }} />
          <Text size="xs" style={{ color: deltaColor }}>{delta}</Text>
        </Group>
      )}
      <Box style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 3, background: accentColor }} />
    </Paper>
  );
}

function StatusBadge({ status }: { status: TicketStatus }) {
  const m = STATUS_META[status];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 500, padding: "3px 9px", borderRadius: 20, background: m.bg, color: m.text, whiteSpace: "nowrap" }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: m.dot, flexShrink: 0, display: "inline-block" }} />
      {m.label}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const m = PRIORITY_META[priority] ?? PRIORITY_META.LOW;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", fontSize: 11, fontWeight: 500, padding: "3px 9px", borderRadius: 20, background: m.bg, color: m.text }}>
      {priority.charAt(0) + priority.slice(1).toLowerCase()}
    </span>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Text size="xs" tt="uppercase" fw={500} c="dimmed" mb="md" style={{ letterSpacing: "0.05em" }}>
      {children}
    </Text>
  );
}

function HBar({ label, value, max, barColor, valueLabel }: { label: string; value: number; max: number; barColor: string; valueLabel: string }) {
  return (
    <Box>
      <Group justify="space-between" mb={4}>
        <Text size="xs" c="dimmed">{label}</Text>
        <Text size="xs" fw={500} style={{ color: barColor }}>{valueLabel}</Text>
      </Group>
      <Progress value={max > 0 ? (value / max) * 100 : 0} size={6} radius="xl" styles={{ section: { background: barColor }, root: { background: "var(--mantine-color-default-hover)" } }} />
    </Box>
  );
}

function MetricRow({ icon, label, value, valueColor }: { icon: string; label: string; value: string; valueColor?: string }) {
  return (
    <Group justify="space-between" px="sm" py={9} style={{ background: "var(--mantine-color-default-hover)", borderRadius: "var(--mantine-radius-md)" }}>
      <Group gap={8}>
        <Icon icon={icon} width={14} style={{ color: "var(--mantine-color-dimmed)" }} />
        <Text size="xs" c="dimmed">{label}</Text>
      </Group>
      <Text size="sm" fw={500} style={valueColor ? { color: valueColor } : undefined}>{value}</Text>
    </Group>
  );
}

// Skeleton placeholder for the full analytics section while loading
function AnalyticsSkeleton() {
  return (
    <Stack gap={10}>
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing={10}>
        <Paper radius="md" p="md" style={{ border: "0.5px solid var(--mantine-color-default-border)" }}>
          <Skeleton height={12} width={100} mb={16} radius="sm" />
          <Skeleton height={180} radius="sm" />
        </Paper>
        <Paper radius="md" p="md" style={{ border: "0.5px solid var(--mantine-color-default-border)" }}>
          <Skeleton height={12} width={120} mb={16} radius="sm" />
          <Group gap="md">
            <Skeleton height={120} width={120} radius="50%" />
            <Stack gap={8} style={{ flex: 1 }}>
              {[...Array(4)].map((_, i) => <Skeleton key={i} height={10} radius="sm" />)}
            </Stack>
          </Group>
        </Paper>
      </SimpleGrid>
      <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing={10}>
        {[...Array(3)].map((_, i) => (
          <Paper key={i} radius="md" p="md" style={{ border: "0.5px solid var(--mantine-color-default-border)" }}>
            <Skeleton height={12} width={90} mb={16} radius="sm" />
            {[...Array(4)].map((_, j) => <Skeleton key={j} height={32} radius="md" mb={6} />)}
          </Paper>
        ))}
      </SimpleGrid>
    </Stack>
  );
}

// Mobile ticket card — shown instead of table rows on small screens
function TicketCard({ ticket, onView }: { ticket: Ticket; onView: () => void }) {
  return (
    <Box
      p="sm"
      style={{ borderBottom: "0.5px solid var(--mantine-color-default-border)", cursor: "pointer" }}
      onClick={onView}
    >
      <Group justify="space-between" mb={6} wrap="nowrap">
        <Text size="xs" c="dimmed" style={{ flexShrink: 0 }}>#{ticket.id}</Text>
        <StatusBadge status={ticket.status} />
      </Group>
      <Text size="sm" fw={500} lineClamp={1} mb={6}>{ticket.title}</Text>
      <Group justify="space-between" wrap="nowrap">
        {ticket.priority ? <PriorityBadge priority={ticket.priority} /> : <span />}
        <Text size="xs" c="dimmed">{ticket.assigned_to_username === "Unassigned" ? "Unassigned" : ticket.assigned_to_username}</Text>
      </Group>
    </Box>
  );
}

// ─── Dashboard ─────────────────────────────────────────────────────────────────

const Dashboard = () => {
  const navigate = useNavigate();
  const { accessToken, user } = useAuth();
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === "dark";
  const isManager = user?.role === "MANAGER";
  const isMobile = useMediaQuery("(max-width: 640px)");

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
      .sort((a: Ticket, b: Ticket) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 8);
  }, [tickets]);

  const donutData = useMemo(
    () => [
      { name: "Open", value: analytics?.open_tickets ?? stats.open, color: BRAND.red },
      { name: "In Progress", value: stats.inProgress, color: BRAND.amber },
      { name: "Resolved", value: analytics?.resolved_tickets ?? stats.resolved, color: BRAND.green },
      { name: "Closed", value: stats.closed, color: BRAND.gray },
    ].filter((d) => d.value > 0),
    [analytics, stats],
  );

  const priorityData = useMemo(
    () => analytics
      ? Object.entries(analytics.tickets_by_priority || {}).map(([name, value]) => ({
          name: name.charAt(0) + name.slice(1).toLowerCase(),
          value: value as number,
          color: PRIORITY_META[name]?.bar ?? BRAND.purple,
        }))
      : [],
    [analytics],
  );

  const sentimentData = useMemo(
    () => analytics
      ? Object.entries(analytics.sentiment_analysis || {}).map(([key, value]) => {
          const k = String(key).toUpperCase();
          return {
            label: k.charAt(0) + k.slice(1).toLowerCase(),
            value: value as number,
            barColor: k === "POSITIVE" ? BRAND.green : k === "NEGATIVE" ? BRAND.red : BRAND.blue,
          };
        })
      : [],
    [analytics],
  );

  const resolutionRate = stats.total > 0 && analytics
    ? Math.round((analytics.resolved_tickets / stats.total) * 100)
    : 0;
  const avgResolution = analytics?.avg_resolution_time_hours?.toFixed(1) ?? "—";
  const pendingCount = analytics ? analytics.open_tickets + stats.inProgress : stats.open + stats.inProgress;

  // ── Loading / Error guards ──
  if (isLoading) {
    return (
      <Container size="xl" py="lg">
        <Stack gap="lg">
          <Group justify="space-between">
            <Stack gap={4}><Skeleton height={22} width={120} /><Skeleton height={14} width={180} /></Stack>
            <Skeleton height={32} width={120} radius="md" />
          </Group>
          <SimpleGrid cols={{ base: 2, sm: 3, md: 5 }} spacing={10}>
            {[...Array(5)].map((_, i) => <Skeleton key={i} height={90} radius="md" />)}
          </SimpleGrid>
          <Skeleton height={300} radius="md" />
        </Stack>
      </Container>
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
        <Group justify="space-between" align="flex-end" wrap="wrap" gap={12}>
          <Box>
            <Text fw={600} style={{ fontSize: isMobile ? 18 : 22, lineHeight: 1.2 }}>
              Dashboard
            </Text>
            <Text size="sm" c="dimmed" mt={2}>
              Welcome back, {user?.username}
            </Text>
          </Box>
          <Button
            size="sm"
            leftSection={<Icon icon="solar:add-circle-bold-duotone" width={15} />}
            style={{ background: BRAND.purpleDark, border: "none" }}
            onClick={() => navigate("/app/tickets/create")}
          >
            Create ticket
          </Button>
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
          analyticsLoading ? (
            <AnalyticsSkeleton />
          ) : (
            <>
              {/* Row 1: Trend + Donut */}
              <SimpleGrid cols={{ base: 1, md: 2 }} spacing={10}>
                {/* Trend */}
                <Paper radius="md" p="md" style={{ border: "0.5px solid var(--mantine-color-default-border)" }}>
                  <Group justify="space-between" mb="md">
                    <Box>
                      <SectionLabel>Ticket volume</SectionLabel>
                      <Text size="xs" c="dimmed" mt={-12}>Last 30 days</Text>
                    </Box>
                    <Badge variant="dot" color="green" size="sm">Live</Badge>
                  </Group>
                  {trends.length > 0 ? (
                    <TrendChart trends={trends} isDark={isDark} />
                  ) : (
                    <Center h={180}>
                      <Text size="sm" c="dimmed">No trend data</Text>
                    </Center>
                  )}
                </Paper>

                {/* Donut */}
                <Paper radius="md" p="md" style={{ border: "0.5px solid var(--mantine-color-default-border)" }}>
                  <SectionLabel>Status distribution</SectionLabel>
                  {donutData.length > 0 ? (
                    <Group gap="lg" align="flex-start" justify="center" wrap="wrap">
                      <DonutChart data={donutData} isDark={isDark} total={stats.total} />
                      <Stack gap={6} style={{ flex: "1 1 140px", minWidth: 0 }}>
                        {donutData.map((d) => (
                          <Group key={d.name} justify="space-between" wrap="nowrap" style={{ minWidth: 0 }}>
                            <Group gap={6} wrap="nowrap" style={{ minWidth: 0 }}>
                              <Box style={{ width: 8, height: 8, borderRadius: "50%", background: d.color, flexShrink: 0 }} />
                              <Text size="xs" c="dimmed" truncate>{d.name}</Text>
                            </Group>
                            <Text size="xs" fw={500} style={{ flexShrink: 0 }}>{d.value}</Text>
                          </Group>
                        ))}
                      </Stack>
                    </Group>
                  ) : (
                    <Center h={120}><Text size="sm" c="dimmed">No data yet</Text></Center>
                  )}
                </Paper>
              </SimpleGrid>

              {/* Row 2: Priority+Sentiment · Metrics · Team workload */}
              <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing={10}>
                {/* Priority + Sentiment */}
                <Paper radius="md" p="md" style={{ border: "0.5px solid var(--mantine-color-default-border)" }}>
                  <SectionLabel>Priority breakdown</SectionLabel>
                  {priorityData.length > 0 ? (
                    <PriorityChart data={priorityData} isDark={isDark} />
                  ) : (
                    <Stack gap={8}>
                      <HBar label="High" value={72} max={120} barColor={BRAND.red} valueLabel="72" />
                      <HBar label="Medium" value={118} max={120} barColor={BRAND.amber} valueLabel="118" />
                      <HBar label="Low" value={94} max={120} barColor={BRAND.green} valueLabel="94" />
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
                          max={Math.max(...sentimentData.map((x) => x.value), 1)}
                          barColor={s.barColor}
                          valueLabel={String(s.value)}
                        />
                      ))}
                    </Stack>
                  ) : (
                    <Stack gap={8}>
                      <HBar label="Positive" value={44} max={100} barColor={BRAND.green} valueLabel="44%" />
                      <HBar label="Neutral" value={35} max={100} barColor={BRAND.blue} valueLabel="35%" />
                      <HBar label="Negative" value={21} max={100} barColor={BRAND.red} valueLabel="21%" />
                    </Stack>
                  )}
                </Paper>

                {/* Key Metrics */}
                <Paper radius="md" p="md" style={{ border: "0.5px solid var(--mantine-color-default-border)" }}>
                  <SectionLabel>Key metrics</SectionLabel>
                  <Stack gap={8}>
                    <MetricRow icon="solar:hourglass-linear" label="Avg resolution time" value={`${avgResolution}h`} />
                    <MetricRow icon="solar:check-circle-linear" label="Resolution rate" value={`${resolutionRate}%`} valueColor={resolutionRate >= 70 ? BRAND.green : BRAND.amber} />
                    <MetricRow icon="solar:bell-linear" label="Pending action" value={String(pendingCount)} valueColor={pendingCount > 80 ? BRAND.red : BRAND.amber} />
                    <MetricRow icon="solar:star-linear" label="Avg CSAT score" value="4.1 / 5" valueColor={BRAND.green} />
                    <MetricRow icon="solar:bolt-linear" label="First response avg" value="38 min" />
                  </Stack>
                </Paper>

                {/* Team workload */}
                <Paper radius="md" p="md" style={{ border: "0.5px solid var(--mantine-color-default-border)" }}>
                  <SectionLabel>Team workload</SectionLabel>
                  {teamWorkload.length > 0 ? (
                    <Stack gap="sm">
                      <WorkloadChart workload={teamWorkload} isDark={isDark} />
                      <Divider />
                      <Stack gap={6}>
                        {teamWorkload.slice(0, 5).map((member) => {
                          return (
                            <Group key={member.employee_id} gap={8} justify="space-between" wrap="nowrap">
                              <Group gap={8} wrap="nowrap" style={{ minWidth: 0 }}>
                                <UserAvatar userId={member.employee_id} name={member.employee_name} size={24} radius="xl" style={{ fontSize: 9, fontWeight: 500, flexShrink: 0 }} />
                                <Text size="xs" truncate style={{ minWidth: 0 }}>
                                  {member.employee_name.split(" ")[0]}
                                </Text>
                              </Group>
                              <Group gap={4} wrap="nowrap">
                                <Badge size="xs" color="red" variant="light">{member.open_tickets}</Badge>
                                <Badge size="xs" color="green" variant="light">{member.resolved_tickets}</Badge>
                              </Group>
                            </Group>
                          );
                        })}
                      </Stack>
                      <Text size="xs" c="dimmed">
                        {teamWorkload.reduce((s, m) => s + m.total_tickets, 0)} total assigned
                      </Text>
                    </Stack>
                  ) : (
                    <Stack gap={8}>
                      {FALLBACK_TEAM_MEMBERS.map((m, i) => {
                        const pal = AVATAR_PALETTES[i % AVATAR_PALETTES.length];
                        return (
                          <Group key={m.name} gap={8} wrap="nowrap">
                            <Avatar size={24} radius="xl" style={{ background: pal.bg, color: pal.color, fontSize: 9, fontWeight: 500, flexShrink: 0 }}>
                              {getInitials(m.name)}
                            </Avatar>
                            <Text size="xs" style={{ flex: 1, minWidth: 0 }} truncate>{m.name}</Text>
                            <Box style={{ width: 64 }}>
                              <Progress value={(m.tickets / 27) * 100} size={5} radius="xl" styles={{ section: { background: BRAND.purple }, root: { background: "var(--mantine-color-default-hover)" } }} />
                            </Box>
                            <Text size="xs" c="dimmed" style={{ minWidth: 20, textAlign: "right" }}>{m.tickets}</Text>
                          </Group>
                        );
                      })}
                      <Divider mt={4} />
                      <Group justify="space-between">
                        <Text size="xs" c="dimmed">91 total assigned</Text>
                        <Button variant="subtle" size="xs" style={{ color: BRAND.purpleDark, padding: "0 4px", height: "auto" }} onClick={() => navigate("/app/analytics")}>
                          Full report ↗
                        </Button>
                      </Group>
                    </Stack>
                  )}
                </Paper>
              </SimpleGrid>
            </>
          )
        )}

        {/* ── Recent Tickets ──────────────────────────────────────────── */}
        <Paper radius="md" style={{ border: "0.5px solid var(--mantine-color-default-border)", overflow: "hidden" }}>
          <Group justify="space-between" align="center" p="md" pb={0}>
            <SectionLabel>Recent tickets</SectionLabel>
            <Button
              variant="subtle"
              size="xs"
              style={{ color: BRAND.purpleDark, padding: "0 4px", height: "auto" }}
              onClick={() => navigate("/app/tickets")}
            >
              View all ↗
            </Button>
          </Group>

          {recentTickets.length > 0 ? (
            isMobile ? (
              /* Mobile: card list */
              <Stack gap={0} mt="md">
                {recentTickets.map((ticket: Ticket) => (
                  <TicketCard
                    key={ticket.id}
                    ticket={ticket}
                    onView={() => navigate(`/app/tickets/${ticket.id}`)}
                  />
                ))}
              </Stack>
            ) : (
              /* Desktop: scrollable table */
              <ScrollArea>
                <Table highlightOnHover mt="md">
                  <Table.Thead>
                    <Table.Tr>
                      {TICKET_TABLE_HEADERS.map((h) => (
                        <Table.Th
                          key={h}
                          style={{ fontSize: 11, fontWeight: 500, color: "var(--mantine-color-dimmed)", textTransform: "uppercase", letterSpacing: "0.05em", paddingBottom: 8, whiteSpace: "nowrap" }}
                        >
                          {h}
                        </Table.Th>
                      ))}
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {recentTickets.map((ticket: Ticket) => (
                      <Table.Tr key={ticket.id}>
                        <Table.Td style={{ color: "var(--mantine-color-dimmed)", fontSize: 12 }}>
                          #{ticket.id}
                        </Table.Td>
                        <Table.Td style={{ maxWidth: 240 }}>
                          <Text size="sm" fw={500} lineClamp={1}>{ticket.title}</Text>
                        </Table.Td>
                        <Table.Td><StatusBadge status={ticket.status} /></Table.Td>
                        <Table.Td>
                          {ticket.priority ? (
                            <PriorityBadge priority={ticket.priority} />
                          ) : (
                            <Text size="xs" c="dimmed">—</Text>
                          )}
                        </Table.Td>
                        <Table.Td><Text size="sm">{ticket.creator_username}</Text></Table.Td>
                        <Table.Td>
                          {ticket.assigned_to_username === "Unassigned" ? (
                            <Text size="sm" c="dimmed">Unassigned</Text>
                          ) : (
                            <Text size="sm">{ticket.assigned_to_username}</Text>
                          )}
                        </Table.Td>
                        <Table.Td>
                          <Button
                            variant="default"
                            size="xs"
                            style={{ fontSize: 11, padding: "4px 10px", height: "auto" }}
                            onClick={() => navigate(`/app/tickets/${ticket.id}`)}
                          >
                            View
                          </Button>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </ScrollArea>
            )
          ) : (
            <Center h={180}>
              <Stack align="center" gap="sm">
                <Icon icon="solar:document-linear" width={36} style={{ color: "var(--mantine-color-dimmed)", opacity: 0.45 }} />
                <Text size="sm" c="dimmed">No tickets yet</Text>
                <Button variant="subtle" size="sm" style={{ color: BRAND.purpleDark }} onClick={() => navigate("/app/tickets/create")}>
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
