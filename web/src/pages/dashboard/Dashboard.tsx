import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useMantineColorScheme } from '@mantine/core'
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
  ThemeIcon,
  Tabs,
} from '@mantine/core'
import { Icon } from '@iconify-icon/react'
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  LineChart,
  Line,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { useAuth } from '@/hooks/useAuth'
import { fetchTickets, fetchAnalyticsDashboard, fetchDashboardTrends, fetchTeamWorkload } from '@/api/tickets.api'
import { notificationService } from '@/hooks/useNotifications'
import { DashboardErrorAlert } from '@/components/DashboardErrorAlert'
import type { Ticket, TicketStatus } from '@/types/ticket'

const statusColors: Record<TicketStatus, string> = {
  OPEN: 'red',
  PENDING: 'blue',
  IN_PROGRESS: 'yellow',
  RESOLVED: 'green',
  CLOSED: 'gray',
}

const statusLabels: Record<TicketStatus, string> = {
  OPEN: 'Open',
  PENDING: 'Pending',
  IN_PROGRESS: 'In Progress',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
}

// Chart colors - Theme aware
const COLORS_LIGHT = ['#FF6B6B', '#FFA500', '#51CF66', '#748FFC', '#808080']
const COLORS_DARK = ['#FF8787', '#FFB74D', '#69DB7C', '#9197F7', '#A6A7AB']
const STATUS_COLORS_LIGHT: Record<string, string> = {
  OPEN: '#FF6B6B',
  IN_PROGRESS: '#FFA500',
  RESOLVED: '#51CF66',
  CLOSED: '#808080',
}
const STATUS_COLORS_DARK: Record<string, string> = {
  OPEN: '#FF8787',
  IN_PROGRESS: '#FFB74D',
  RESOLVED: '#69DB7C',
  CLOSED: '#A6A7AB',
}
const PRIORITY_COLORS_LIGHT: Record<string, string> = {
  HIGH: '#FF6B6B',
  MEDIUM: '#FFA500',
  LOW: '#51CF66',
}
const PRIORITY_COLORS_DARK: Record<string, string> = {
  HIGH: '#FF8787',
  MEDIUM: '#FFB74D',
  LOW: '#69DB7C',
}
const SENTIMENT_COLORS_LIGHT: Record<string, string> = {
  Positive: '#51CF66',
  Neutral: '#4DABF7',
  Negative: '#FF6B6B',
}
const SENTIMENT_COLORS_DARK: Record<string, string> = {
  Positive: '#69DB7C',
  Neutral: '#74C0FC',
  Negative: '#FF8787',
}

const Dashboard = () => {
  const navigate = useNavigate()
  const { accessToken, user } = useAuth()
  const { colorScheme } = useMantineColorScheme()
  const isDark = colorScheme === 'dark'

  // Real-time updates are initialized in ProtectedRoute via useWebSocket()

  // Select colors based on theme
  const COLORS = isDark ? COLORS_DARK : COLORS_LIGHT
  const STATUS_COLORS = isDark ? STATUS_COLORS_DARK : STATUS_COLORS_LIGHT
  const PRIORITY_COLORS = isDark ? PRIORITY_COLORS_DARK : PRIORITY_COLORS_LIGHT
  const SENTIMENT_COLORS = isDark ? SENTIMENT_COLORS_DARK : SENTIMENT_COLORS_LIGHT

  // Chart text color for dark mode
  const chartTextColor = isDark ? '#C1C2C5' : '#333333'
  const chartGridColor = isDark ? '#373A40' : '#f0f0f0'

  const {
    data: tickets = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['tickets'],  // ✅ Match WebSocket invalidation - no accessToken
    queryFn: () => fetchTickets(),
    enabled: !!accessToken,
    staleTime: 5 * 60 * 1000,  // 5 minute fallback in case WebSocket fails
  })

  // Fetch analytics for managers only
  const {
    data: analytics,
    isLoading: analyticsLoading,
  } = useQuery({
    queryKey: ['analytics-dashboard'],
    queryFn: () => fetchAnalyticsDashboard(),
    enabled: !!accessToken && user?.role === 'MANAGER',
    staleTime: 5 * 60 * 1000,  // 5 minute fallback in case WebSocket fails
  })

  // Fetch trends data for managers only
  const {
    data: trends = [],
    isLoading: trendsLoading,
  } = useQuery({
    queryKey: ['analytics-trends'],
    queryFn: () => fetchDashboardTrends(),
    enabled: !!accessToken && user?.role === 'MANAGER',
    staleTime: 5 * 60 * 1000,
  })

  // Fetch team workload data for managers only
  const {
    data: teamWorkload = [],
    isLoading: workloadLoading,
  } = useQuery({
    queryKey: ['analytics-team-workload'],
    queryFn: () => fetchTeamWorkload(),
    enabled: !!accessToken && user?.role === 'MANAGER',
    staleTime: 5 * 60 * 1000,
  })

  // Calculate stats with memoization to prevent unnecessary recalculation
  const stats = useMemo(
    () => {
      // Defensive check: ensure tickets is an array
      const ticketList = Array.isArray(tickets) ? tickets : []
      return {
        total: ticketList.length,
        open: ticketList.filter((t: Ticket) => t.status === 'OPEN').length,
        inProgress: ticketList.filter((t: Ticket) => t.status === 'IN_PROGRESS')
          .length,
        resolved: ticketList.filter((t: Ticket) => t.status === 'RESOLVED')
          .length,
        closed: ticketList.filter((t: Ticket) => t.status === 'CLOSED').length,
      }
    },
    [tickets],
  )

  // Prepare chart data from analytics with memoization
  const priorityChartData = useMemo(
    () =>
      analytics
        ? Object.entries(analytics.tickets_by_priority || {}).map(([name, value]) => ({
            name,
            value,
          }))
        : [],
    [analytics],
  )

  const categoryChartData = useMemo(
    () =>
      analytics
        ? Object.entries(analytics.tickets_by_category || {})
            .filter(
              ([name]) =>
                name !== 'OPEN' &&
                name !== 'IN_PROGRESS' &&
                name !== 'RESOLVED' &&
                name !== 'CLOSED',
            )
            .map(([name, value]) => ({
              name,
              value,
            }))
        : [],
    [analytics],
  )

  const sentimentChartData = useMemo(
    () =>
      analytics
        ? Object.entries(analytics.sentiment_analysis || {}).map(([name, value]) => ({
            name,
            value,
          }))
        : [],
    [analytics],
  )

  // Recent tickets (last 5) with memoization
  const recentTickets = useMemo(
    () => {
      // Defensive check: ensure tickets is an array
      const ticketList = Array.isArray(tickets) ? tickets : []
      return ticketList
        .sort(
          (a: Ticket, b: Ticket) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        )
        .slice(0, 5)
    },
    [tickets],
  )

  if (isLoading) {
    return (
      <Center h={400}>
        <Loader />
      </Center>
    )
  }

  if (error) {
    return (
      <Container py="lg">
        <Text c="red">Error loading dashboard: {error.message}</Text>
      </Container>
    )
  }

  return (
    <Container size="xl" py="lg">
      <Stack gap="lg">
        {/* Show error alert if query param indicates an error */}
        <DashboardErrorAlert />

        {/* Welcome Header */}
        <Group justify="space-between" align="center">
          <div>
            <Text size="xl" fw={700}>
              Dashboard
            </Text>
            <Text size="sm" c="dimmed">
              Welcome back, {user?.username}
            </Text>
          </div>
          <Group gap="xs">
            <Button
              leftSection={<Icon icon="solar:add-circle-bold-duotone" />}
              onClick={() => navigate('/app/tickets/create')}
            >
              Create Ticket
            </Button>
            <Button
              variant="light"
              leftSection={<Icon icon="mdi:bell-ring" />}
              onClick={() => {
                notificationService.ticketAssigned(1, 'Login issue on customer portal')
                notificationService.ticketUpdated(2, 'Database connection timeout', 'Status changed to IN_PROGRESS')
                notificationService.commentAdded(3, 'Password reset failure', 'John Doe')
                notificationService.ticketResolved(4, 'API response time high')
              }}
            >
              Demo Notifications
            </Button>
          </Group>
        </Group>

        {/* Stats Cards */}
        <SimpleGrid cols={{ base: 1, sm: 2, md: 5 }} spacing="md">
          {/* Total Tickets */}
          <Paper p="md" radius="md" withBorder>
            <Group justify="space-between" mb="sm">
              <Text size="sm" fw={500} c="dimmed">
                Total Tickets
              </Text>
              <Icon
                icon="solar:chart-2-linear"
                width={20}
                style={{ color: 'var(--mantine-color-blue-6)' }}
              />
            </Group>
            <Text size="lg" fw={700}>
              {stats.total}
            </Text>
          </Paper>

          {/* Open Tickets */}
          <Paper p="md" radius="md" withBorder>
            <Group justify="space-between" mb="sm">
              <Text size="sm" fw={500} c="dimmed">
                Open
              </Text>
              <Icon
                icon="solar:bell-linear"
                width={20}
                style={{ color: 'var(--mantine-color-red-6)' }}
              />
            </Group>
            <Text size="lg" fw={700}>
              {stats.open}
            </Text>
          </Paper>

          {/* In Progress */}
          <Paper p="md" radius="md" withBorder>
            <Group justify="space-between" mb="sm">
              <Text size="sm" fw={500} c="dimmed">
                In Progress
              </Text>
              <Icon
                icon="solar:hourglass-linear"
                width={20}
                style={{ color: 'var(--mantine-color-yellow-6)' }}
              />
            </Group>
            <Text size="lg" fw={700}>
              {stats.inProgress}
            </Text>
          </Paper>

          {/* Resolved */}
          <Paper p="md" radius="md" withBorder>
            <Group justify="space-between" mb="sm">
              <Text size="sm" fw={500} c="dimmed">
                Resolved
              </Text>
              <Icon
                icon="solar:check-circle-linear"
                width={20}
                style={{ color: 'var(--mantine-color-green-6)' }}
              />
            </Group>
            <Text size="lg" fw={700}>
              {stats.resolved}
            </Text>
          </Paper>

          {/* Closed */}
          <Paper p="md" radius="md" withBorder>
            <Group justify="space-between" mb="sm">
              <Text size="sm" fw={500} c="dimmed">
                Closed
              </Text>
              <Icon
                icon="solar:archive-check-linear"
                width={20}
                style={{ color: 'var(--mantine-color-gray-6)' }}
              />
            </Group>
            <Text size="lg" fw={700}>
              {stats.closed}
            </Text>
          </Paper>
        </SimpleGrid>

        {/* Analytics Section (Manager Only) */}
        {user?.role === 'MANAGER' && (
          <Paper p="lg" radius="md" withBorder>
            <Stack gap="lg">
              <Group justify="space-between" align="center">
                <Group gap="xs">
                  <Icon icon="solar:cpu-bolt-bold-duotone" width={24} />
                  <Text size="lg" fw={700}>
                    Analytics & Insights
                  </Text>
                </Group>
                <Badge variant="light">
                  {analyticsLoading ? 'Loading...' : 'Live'}
                </Badge>
              </Group>

              {analyticsLoading ? (
                <Center h={300}>
                  <Loader />
                </Center>
              ) : analytics ? (
                <Tabs defaultValue="status" keepMounted={false}>
                  <Tabs.List>
                    <Tabs.Tab value="status" leftSection={<Icon icon="solar:chart-linear" width={16} />}>
                      Status Distribution
                    </Tabs.Tab>
                    <Tabs.Tab value="priority" leftSection={<Icon icon="solar:bolt-bold-duotone" width={16} />}>
                      Priority Breakdown
                    </Tabs.Tab>
                    <Tabs.Tab value="category" leftSection={<Icon icon="solar:tag-bold-duotone" width={16} />}>
                      Categories
                    </Tabs.Tab>
                    <Tabs.Tab value="sentiment" leftSection={<Icon icon="solar:smile-circle-bold-duotone" width={16} />}>
                      Sentiment
                    </Tabs.Tab>
                    <Tabs.Tab value="metrics" leftSection={<Icon icon="solar:graph-up-linear" width={16} />}>
                      Metrics
                    </Tabs.Tab>
                    <Tabs.Tab value="trends" leftSection={<Icon icon="solar:chart-2-linear" width={16} />}>
                      Trends
                    </Tabs.Tab>
                    <Tabs.Tab value="workload" leftSection={<Icon icon="solar:users-group-two-rounded-bold-duotone" width={16} />}>
                      Team Workload
                    </Tabs.Tab>
                  </Tabs.List>

                  <Tabs.Panel value="status" pt="lg">
                    <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
                      {/* Status Pie Chart */}
                      <Paper p="md" radius="md" withBorder>
                        <Stack gap="sm">
                          <Text fw={600} size="sm">
                            Ticket Status Distribution
                          </Text>
                          <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                              <Pie
                                data={[
                                  {
                                    name: 'Open',
                                    value: analytics.open_tickets,
                                  },
                                  {
                                    name: 'In Progress',
                                    value:
                                      stats.inProgress ||
                                      (stats.total -
                                        analytics.open_tickets -
                                        analytics.resolved_tickets -
                                        stats.closed),
                                  },
                                  {
                                    name: 'Resolved',
                                    value: analytics.resolved_tickets,
                                  },
                                  {
                                    name: 'Closed',
                                    value: stats.closed,
                                  },
                                ].filter((d) => d.value > 0)}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, value }) =>
                                  `${name}: ${value}`
                                }
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                              >
                                {[
                                  STATUS_COLORS.OPEN,
                                  STATUS_COLORS.IN_PROGRESS,
                                  STATUS_COLORS.RESOLVED,
                                  STATUS_COLORS.CLOSED,
                                ].map((color, index) => (
                                  <Cell key={`cell-${index}`} fill={color} />
                                ))}
                              </Pie>
                              <Tooltip
                                formatter={(value) => `${value} tickets`}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                        </Stack>
                      </Paper>

                      {/* Status Stats */}
                      <Stack gap="md">
                        <Paper p="md" radius="md" withBorder bg={isDark ? 'rgba(255, 107, 107, 0.1)' : 'rgba(255, 107, 107, 0.05)'}>
                          <Group justify="space-between">
                            <div>
                              <Text size="sm" c="dimmed">
                                Open Tickets
                              </Text>
                              <Text size="xl" fw={700} c="red">
                                {analytics.open_tickets}
                              </Text>
                            </div>
                            <ThemeIcon size="lg" radius="md" variant="light" color="red">
                              <Icon icon="solar:bell-linear" width={24} />
                            </ThemeIcon>
                          </Group>
                        </Paper>

                        <Paper p="md" radius="md" withBorder bg={isDark ? 'rgba(255, 165, 0, 0.1)' : 'rgba(255, 165, 0, 0.05)'}>
                          <Group justify="space-between">
                            <div>
                              <Text size="sm" c="dimmed">
                                In Progress
                              </Text>
                              <Text size="xl" fw={700} c="orange">
                                {stats.inProgress ||
                                  (stats.total -
                                    analytics.open_tickets -
                                    analytics.resolved_tickets)}
                              </Text>
                            </div>
                            <ThemeIcon size="lg" radius="md" variant="light" color="orange">
                              <Icon
                                icon="solar:hourglass-linear"
                                width={24}
                              />
                            </ThemeIcon>
                          </Group>
                        </Paper>

                        <Paper p="md" radius="md" withBorder bg={isDark ? 'rgba(81, 207, 102, 0.1)' : 'rgba(81, 207, 102, 0.05)'}>
                          <Group justify="space-between">
                            <div>
                              <Text size="sm" c="dimmed">
                                Resolved Tickets
                              </Text>
                              <Text size="xl" fw={700} c="green">
                                {analytics.resolved_tickets}
                              </Text>
                            </div>
                            <ThemeIcon size="lg" radius="md" variant="light" color="green">
                              <Icon
                                icon="solar:check-circle-linear"
                                width={24}
                              />
                            </ThemeIcon>
                          </Group>
                        </Paper>
                      </Stack>
                    </SimpleGrid>
                  </Tabs.Panel>

                  <Tabs.Panel value="priority" pt="lg">
                    <Paper p="md" radius="md" withBorder>
                      <Stack gap="sm">
                        <Text fw={600} size="sm">
                          Tickets by Priority Level
                        </Text>
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={priorityChartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
                            <XAxis dataKey="name" tick={{ fill: chartTextColor }} />
                            <YAxis tick={{ fill: chartTextColor }} />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: isDark ? '#25262B' : '#fff',
                                border: `1px solid ${isDark ? '#373A40' : '#ddd'}`,
                                borderRadius: '4px',
                                color: isDark ? '#C1C2C5' : '#333',
                              }}
                            />
                            <Legend wrapperStyle={{ color: chartTextColor }} />
                            <Bar
                              dataKey="value"
                              fill="#8884d8"
                              name="Number of Tickets"
                              radius={[8, 8, 0, 0]}
                            >
                              {priorityChartData.map((entry, index) => (
                                <Cell
                                  key={`cell-${index}`}
                                  fill={
                                    PRIORITY_COLORS[entry.name] ||
                                    COLORS[index % COLORS.length]
                                  }
                                />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </Stack>
                    </Paper>
                  </Tabs.Panel>

                  <Tabs.Panel value="category" pt="lg">
                    <Paper p="md" radius="md" withBorder>
                      <Stack gap="sm">
                        <Text fw={600} size="sm">
                          Tickets by Category
                        </Text>
                        {categoryChartData.length > 0 ? (
                          <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={categoryChartData}>
                              <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
                              <XAxis
                                dataKey="name"
                                angle={-45}
                                textAnchor="end"
                                height={80}
                                tick={{ fill: chartTextColor }}
                              />
                              <YAxis tick={{ fill: chartTextColor }} />
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: isDark ? '#25262B' : '#fff',
                                  border: `1px solid ${isDark ? '#373A40' : '#ddd'}`,
                                  borderRadius: '4px',
                                  color: isDark ? '#C1C2C5' : '#333',
                                }}
                              />
                              <Legend wrapperStyle={{ color: chartTextColor }} />
                              <Bar
                                dataKey="value"
                                fill="#8884d8"
                                name="Number of Tickets"
                                radius={[8, 8, 0, 0]}
                              >
                                {categoryChartData.map((_, index) => (
                                  <Cell
                                    key={`cell-${index}`}
                                    fill={
                                      COLORS[index % COLORS.length]
                                    }
                                  />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        ) : (
                          <Center h={300}>
                            <Text c="dimmed">No category data available</Text>
                          </Center>
                        )}
                      </Stack>
                    </Paper>
                  </Tabs.Panel>

                  <Tabs.Panel value="sentiment" pt="lg">
                    <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
                      {/* Sentiment Pie Chart */}
                      <Paper p="md" radius="md" withBorder>
                        <Stack gap="sm">
                          <Text fw={600} size="sm">
                            Customer Sentiment Analysis
                          </Text>
                          <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                              <Pie
                                data={sentimentChartData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, value }) =>
                                  `${name}: ${value}`
                                }
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                              >
                                {sentimentChartData.map((entry, index) => (
                                  <Cell
                                    key={`cell-${index}`}
                                    fill={
                                      SENTIMENT_COLORS[entry.name] ||
                                      COLORS[index % COLORS.length]
                                    }
                                  />
                                ))}
                              </Pie>
                              <Tooltip
                                formatter={(value) => `${value} tickets`}
                                contentStyle={{
                                  backgroundColor: isDark ? '#25262B' : '#fff',
                                  border: `1px solid ${isDark ? '#373A40' : '#ddd'}`,
                                  borderRadius: '4px',
                                  color: isDark ? '#C1C2C5' : '#333',
                                }}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                        </Stack>
                      </Paper>

                      {/* Sentiment Stats */}
                      <Stack gap="md">
                        {sentimentChartData.map((sentiment) => (
                          <Paper
                            key={sentiment.name}
                            p="md"
                            radius="md"
                            withBorder
                            bg={
                              sentiment.name === 'Positive'
                                ? isDark ? 'rgba(81, 207, 102, 0.1)' : 'rgba(81, 207, 102, 0.05)'
                                : sentiment.name === 'Negative'
                                  ? isDark ? 'rgba(255, 107, 107, 0.1)' : 'rgba(255, 107, 107, 0.05)'
                                  : isDark ? 'rgba(74, 144, 226, 0.1)' : 'rgba(74, 144, 226, 0.05)'
                            }
                          >
                            <Group justify="space-between">
                              <div>
                                <Text size="sm" c="dimmed">
                                  {sentiment.name} Sentiment
                                </Text>
                                <Text size="xl" fw={700}>
                                  {sentiment.value}
                                </Text>
                              </div>
                              <ThemeIcon
                                size="lg"
                                radius="md"
                                variant="light"
                                color={
                                  sentiment.name === 'Positive'
                                    ? 'green'
                                    : sentiment.name === 'Negative'
                                      ? 'red'
                                      : 'blue'
                                }
                              >
                                <Icon
                                  icon={
                                    sentiment.name === 'Positive'
                                      ? 'solar:smile-circle-bold-duotone'
                                      : sentiment.name === 'Negative'
                                        ? 'solar:sad-circle-bold-duotone'
                                        : 'solar:face-id-bold-duotone'
                                  }
                                  width={24}
                                />
                              </ThemeIcon>
                            </Group>
                          </Paper>
                        ))}
                      </Stack>
                    </SimpleGrid>
                  </Tabs.Panel>

                  <Tabs.Panel value="metrics" pt="lg">
                    <SimpleGrid cols={{ base: 1, md: 2, lg: 3 }} spacing="lg">
                      {/* Average Resolution Time */}
                      <Paper p="lg" radius="md" withBorder bg={isDark ? 'rgba(74, 144, 226, 0.1)' : 'rgba(74, 144, 226, 0.05)'}>
                        <Stack gap="xs" align="flex-start">
                          <Group justify="space-between" w="100%">
                            <Text size="sm" fw={500} c="dimmed">
                              Avg Resolution Time
                            </Text>
                            <Icon
                              icon="solar:hourglass-linear"
                              width={20}
                              color="var(--mantine-color-blue-6)"
                            />
                          </Group>
                          <Text size="lg" fw={700}>
                            {analytics?.avg_resolution_time_hours?.toFixed(2) ?? '0.00'}h
                          </Text>
                          <Text size="xs" c="dimmed">
                            Per ticket
                          </Text>
                        </Stack>
                      </Paper>

                      {/* Resolution Rate */}
                      <Paper p="lg" radius="md" withBorder bg={isDark ? 'rgba(81, 207, 102, 0.1)' : 'rgba(81, 207, 102, 0.05)'}>
                        <Stack gap="xs" align="flex-start">
                          <Group justify="space-between" w="100%">
                            <Text size="sm" fw={500} c="dimmed">
                              Resolution Rate
                            </Text>
                            <Icon
                              icon="solar:check-circle-linear"
                              width={20}
                              color="var(--mantine-color-green-6)"
                            />
                          </Group>
                          <Text size="lg" fw={700}>
                            {stats.total > 0
                              ? (
                                  (analytics.resolved_tickets / stats.total) *
                                  100
                                ).toFixed(1)
                              : 0}
                            %
                          </Text>
                          <Text size="xs" c="dimmed">
                            {analytics.resolved_tickets} of {stats.total}
                          </Text>
                        </Stack>
                      </Paper>

                      {/* Pending Tickets */}
                      <Paper p="lg" radius="md" withBorder bg={isDark ? 'rgba(255, 165, 0, 0.1)' : 'rgba(255, 165, 0, 0.05)'}>
                        <Stack gap="xs" align="flex-start">
                          <Group justify="space-between" w="100%">
                            <Text size="sm" fw={500} c="dimmed">
                              Pending Tickets
                            </Text>
                            <Icon
                              icon="solar:bell-linear"
                              width={20}
                              color="var(--mantine-color-orange-6)"
                            />
                          </Group>
                          <Text size="lg" fw={700}>
                            {analytics.open_tickets +
                              (stats.inProgress ||
                                (stats.total -
                                  analytics.open_tickets -
                                  analytics.resolved_tickets))}
                          </Text>
                          <Text size="xs" c="dimmed">
                            Awaiting action
                          </Text>
                        </Stack>
                      </Paper>
                    </SimpleGrid>
                  </Tabs.Panel>

                  <Tabs.Panel value="trends" pt="lg">
                    <Paper p="md" radius="md" withBorder>
                      <Stack gap="sm">
                        <Group justify="space-between" align="center">
                          <div>
                            <Text fw={600} size="sm">
                              Ticket Creation Trends (Last 30 Days)
                            </Text>
                            <Text size="xs" c="dimmed">
                              Daily ticket volume over time
                            </Text>
                          </div>
                          {trendsLoading && <Loader size="sm" />}
                        </Group>
                        {trends.length > 0 ? (
                          <ResponsiveContainer width="100%" height={350}>
                            <LineChart
                              data={trends}
                              margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
                              <XAxis
                                dataKey="date"
                                tick={{ fill: chartTextColor, fontSize: 12 }}
                                angle={-45}
                                textAnchor="end"
                                height={80}
                              />
                              <YAxis tick={{ fill: chartTextColor }} />
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: isDark ? '#25262B' : '#fff',
                                  border: `1px solid ${isDark ? '#373A40' : '#ddd'}`,
                                  borderRadius: '4px',
                                  color: isDark ? '#C1C2C5' : '#333',
                                }}
                                formatter={(value: any) => `${value} tickets`}
                              />
                              <Legend wrapperStyle={{ color: chartTextColor }} />
                              <Line
                                type="monotone"
                                dataKey="count"
                                stroke="var(--mantine-color-blue-6)"
                                strokeWidth={2}
                                dot={{ fill: 'var(--mantine-color-blue-6)', r: 4 }}
                                activeDot={{ r: 6 }}
                                name="Tickets Created"
                                isAnimationActive={true}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        ) : (
                          <Center h={300}>
                            <Text c="dimmed">No trend data available</Text>
                          </Center>
                        )}
                      </Stack>
                    </Paper>
                  </Tabs.Panel>

                  <Tabs.Panel value="workload" pt="lg">
                    <Paper p="md" radius="md" withBorder>
                      <Stack gap="md">
                        <Group justify="space-between" align="center">
                          <div>
                            <Text fw={600} size="sm">
                              Team Workload Distribution
                            </Text>
                            <Text size="xs" c="dimmed">
                              Ticket assignments and performance by team member
                            </Text>
                          </div>
                          {workloadLoading && <Loader size="sm" />}
                        </Group>

                        {teamWorkload.length > 0 ? (
                          <>
                            {/* Workload Bar Chart */}
                            <ResponsiveContainer width="100%" height={300}>
                              <BarChart data={teamWorkload}>
                                <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
                                <XAxis
                                  dataKey="employee_name"
                                  tick={{ fill: chartTextColor, fontSize: 12 }}
                                  angle={-45}
                                  textAnchor="end"
                                  height={80}
                                />
                                <YAxis tick={{ fill: chartTextColor }} />
                                <Tooltip
                                  contentStyle={{
                                    backgroundColor: isDark ? '#25262B' : '#fff',
                                    border: `1px solid ${isDark ? '#373A40' : '#ddd'}`,
                                    borderRadius: '4px',
                                    color: isDark ? '#C1C2C5' : '#333',
                                  }}
                                />
                                <Legend wrapperStyle={{ color: chartTextColor }} />
                                <Bar
                                  dataKey="open_tickets"
                                  fill="var(--mantine-color-red-6)"
                                  name="Open Tickets"
                                  radius={[8, 8, 0, 0]}
                                />
                                <Bar
                                  dataKey="resolved_tickets"
                                  fill="var(--mantine-color-green-6)"
                                  name="Resolved Tickets"
                                  radius={[8, 8, 0, 0]}
                                />
                              </BarChart>
                            </ResponsiveContainer>

                            {/* Detailed Table */}
                            <div style={{ overflowX: 'auto', marginTop: '1rem' }}>
                              <Table striped highlightOnHover>
                                <Table.Thead>
                                  <Table.Tr>
                                    <Table.Th>Team Member</Table.Th>
                                    <Table.Th>Open</Table.Th>
                                    <Table.Th>Resolved</Table.Th>
                                    <Table.Th>Total</Table.Th>
                                    <Table.Th>Avg Resolution Time</Table.Th>
                                  </Table.Tr>
                                </Table.Thead>
                                <Table.Tbody>
                                  {teamWorkload.map((member) => (
                                    <Table.Tr key={member.employee_id}>
                                      <Table.Td fw={500}>{member.employee_name}</Table.Td>
                                      <Table.Td>
                                        <Badge color="red" variant="light">
                                          {member.open_tickets}
                                        </Badge>
                                      </Table.Td>
                                      <Table.Td>
                                        <Badge color="green" variant="light">
                                          {member.resolved_tickets}
                                        </Badge>
                                      </Table.Td>
                                      <Table.Td fw={600}>{member.total_tickets}</Table.Td>
                                      <Table.Td>
                                        {member.avg_resolution_hours.toFixed(2)}h
                                      </Table.Td>
                                    </Table.Tr>
                                  ))}
                                </Table.Tbody>
                              </Table>
                            </div>
                          </>
                        ) : (
                          <Center h={300}>
                            <Text c="dimmed">No team workload data available</Text>
                          </Center>
                        )}
                      </Stack>
                    </Paper>
                  </Tabs.Panel>
                </Tabs>
              ) : (
                <Center h={300}>
                  <Stack align="center" gap="sm">
                    <Icon
                      icon="solar:chart-2-linear"
                      width={40}
                      style={{ opacity: 0.5 }}
                    />
                    <Text c="dimmed">No analytics data available</Text>
                  </Stack>
                </Center>
              )}
            </Stack>
          </Paper>
        )}

        {/* Recent Tickets */}
        <Paper p="md" radius="md" withBorder>
          <Stack gap="md">
            <Group justify="space-between" align="center">
              <Text size="lg" fw={700}>
                Recent Tickets
              </Text>
              <Button variant="subtle" onClick={() => navigate('/app/tickets')}>
                View All
              </Button>
            </Group>

            {recentTickets.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <Table striped highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>ID</Table.Th>
                      <Table.Th>Title</Table.Th>
                      <Table.Th>Status</Table.Th>
                      <Table.Th>Created By</Table.Th>
                      <Table.Th>Assigned To</Table.Th>
                      <Table.Th>Action</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {recentTickets.map((ticket: Ticket) => (
                      <Table.Tr key={ticket.id}>
                        <Table.Td>#{ticket.id}</Table.Td>
                        <Table.Td fw={500}>{ticket.title}</Table.Td>
                        <Table.Td>
                          <Badge
                            color={statusColors[ticket.status]}
                            variant="light"
                          >
                            {statusLabels[ticket.status]}
                          </Badge>
                        </Table.Td>
                        <Table.Td>{ticket.creator_username}</Table.Td>
                        <Table.Td>
                          {ticket.assigned_to_username === 'Unassigned' ? (
                            <Text c="dimmed" size="sm">
                              Unassigned
                            </Text>
                          ) : (
                            <Text size="sm">{ticket.assigned_to_username}</Text>
                          )}
                        </Table.Td>
                        <Table.Td>
                          <Button
                            variant="subtle"
                            size="xs"
                            onClick={() =>
                              navigate(`/app/tickets/${ticket.id}`)
                            }
                          >
                            View
                          </Button>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </div>
            ) : (
              <Center h={200}>
                <Stack align="center" gap="sm">
                  <Icon
                    icon="solar:document-linear"
                    width={40}
                    style={{ opacity: 0.5 }}
                  />
                  <Text c="dimmed">No tickets yet</Text>
                  <Button
                    onClick={() => navigate('/app/tickets/create')}
                    variant="subtle"
                  >
                    Create your first ticket
                  </Button>
                </Stack>
              </Center>
            )}
          </Stack>
        </Paper>
      </Stack>
    </Container>
  )
}

export default Dashboard
