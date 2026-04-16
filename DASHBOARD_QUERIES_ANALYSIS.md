# Frontend Dashboard - Queries & Real-Time Updates Analysis

## 📍 Main Dashboard Location
**File:** [web/src/pages/dashboard/Dashboard.tsx](web/src/pages/dashboard/Dashboard.tsx)

**Layout:** [web/src/layouts/DashboardLayout.tsx](web/src/layouts/DashboardLayout.tsx)

**Route:** `/app/dashboard`

---

## 🔑 Query Keys Used

### Dashboard Query Keys (from queryKeys.ts)
```typescript
// File: web/src/api/queryKeys.ts
export const queryKeys = {
  dashboard: {
    all: ['dashboard'] as const,
    analytics: () => [...queryKeys.dashboard.all, 'analytics'] as const,  // ['dashboard', 'analytics']
    stats: () => [...queryKeys.dashboard.all, 'stats'] as const,          // ['dashboard', 'stats']
  },
  
  tickets: {
    all: ['tickets'] as const,
    lists: () => [...queryKeys.tickets.all, 'list'] as const,
    list: (filters?: string) => [...queryKeys.tickets.lists(), { filters }] as const,
    details: () => [...queryKeys.tickets.all, 'detail'] as const,
    detail: (id: number) => [...queryKeys.tickets.details(), id] as const,
    analytics: () => [...queryKeys.tickets.all, 'analytics'] as const,
  },
}
```

---

## 📊 Queries Used in Dashboard Component

### Query 1: Tickets List (All Users)
```typescript
// File: web/src/pages/dashboard/Dashboard.tsx (Lines 113-120)
const {
  data: tickets = [],
  isLoading,
  error,
} = useQuery({
  queryKey: ['tickets', accessToken],  // ⚠️ NOTE: Using inline key, not queryKeys factory
  queryFn: () => fetchTickets(),
  enabled: !!accessToken,
  staleTime: Infinity,  // Don't auto-refresh; rely on WebSocket invalidation
})
```

**API Call:**
```typescript
// File: web/src/api/tickets.api.ts (Lines 63-77)
export async function fetchTickets(): Promise<Ticket[]> {
  try {
    const client = getAxiosInstance()
    const response = await client.get<Ticket[]>('/my-tickets')
    // Ensure response.data is always an array
    const data = response.data
    if (!Array.isArray(data)) {
      console.warn('[API] fetchTickets returned non-array data:', data)
      return []
    }
    return data
  } catch (error) {
    if (error instanceof APIError && error.statusCode === 401) {
      throw new Error('Session expired. Please login again.')
    }
    throw error
  }
}
```

**Data Returned:** `Ticket[]`
- Returns tickets visible to current user (filtered by role: CUSTOMER→own, EMPLOYEE→all, MANAGER→all)

---

### Query 2: Analytics Dashboard (MANAGER ONLY)
```typescript
// File: web/src/pages/dashboard/Dashboard.tsx (Lines 122-130)
const {
  data: analytics,
  isLoading: analyticsLoading,
} = useQuery({
  queryKey: ['analytics-dashboard'],  // ⚠️ NOTE: Using inline key, not queryKeys factory
  queryFn: () => fetchAnalyticsDashboard(),
  enabled: !!accessToken && user?.role === 'MANAGER',
  staleTime: Infinity,  // Don't auto-refresh; rely on WebSocket invalidation
})
```

**API Call:**
```typescript
// File: web/src/api/tickets.api.ts (Lines 340-352)
export async function fetchAnalyticsDashboard(): Promise<DashboardStats> {
  try {
    const client = getAxiosInstance()
    const response = await client.get<DashboardStats>('/analytics/dashboard')
    return response.data
  } catch (error) {
    if (error instanceof APIError) {
      if (error.statusCode === 403) {
        throw new Error('Only managers can view analytics')
      }
    }
    throw error
  }
}
```

**Data Returned:** `DashboardStats`
```typescript
// Type definition from tickets.api.ts (Lines 43-51)
export interface DashboardStats {
  total_tickets: number
  open_tickets: number
  resolved_tickets: number
  avg_resolution_time_hours: number
  tickets_by_category: Record<string, number>      // e.g., { 'SOFTWARE': 5, 'HARDWARE': 3 }
  tickets_by_priority: Record<string, number>      // e.g., { 'HIGH': 2, 'MEDIUM': 4, 'LOW': 2 }
  sentiment_analysis: Record<string, number>       // e.g., { 'Positive': 10, 'Neutral': 5, 'Negative': 1 }
}
```

---

## 📈 Data Displayed on Dashboard

### 1. **Stats Cards (For All Users)**
- **Total Tickets:** `stats.total`
- **Open Tickets:** `stats.open`
- **In Progress:** `stats.inProgress`
- **Resolved:** `stats.resolved`
- **Closed:** `stats.closed`

**Calculated from:** `tickets` array via memoized `stats` object

```typescript
// Lines 132-145
const stats = useMemo(
  () => {
    const ticketList = Array.isArray(tickets) ? tickets : []
    return {
      total: ticketList.length,
      open: ticketList.filter((t: Ticket) => t.status === 'OPEN').length,
      inProgress: ticketList.filter((t: Ticket) => t.status === 'IN_PROGRESS').length,
      resolved: ticketList.filter((t: Ticket) => t.status === 'RESOLVED').length,
      closed: ticketList.filter((t: Ticket) => t.status === 'CLOSED').length,
    }
  },
  [tickets],
)
```

### 2. **Analytics Section (Manager Only)**
Displayed in tabs:

#### Status Distribution Tab
- **Pie Chart:** Open, In Progress, Resolved, Closed
- **Status Cards:** Individual counts with colors

#### Priority Breakdown Tab
- **Bar Chart:** Tickets by Priority Level (HIGH, MEDIUM, LOW)

```typescript
// Lines 160-166
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
```

#### Categories Tab
- **Bar Chart:** Tickets by category (filtered excluding status fields)

```typescript
// Lines 168-182
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
```

#### Sentiment Analysis Tab
- **Pie Chart:** Positive, Neutral, Negative sentiment counts
- **Sentiment Cards:** Individual sentiment statistics

```typescript
// Lines 184-191
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
```

#### Key Metrics Tab
- **Average Resolution Time:** `analytics.avg_resolution_time_hours`
- **Resolution Rate:** `(analytics.resolved_tickets / stats.total) * 100`
- **Pending Tickets:** `analytics.open_tickets + stats.inProgress`

### 3. **Recent Tickets Table**
- Last 5 tickets, sorted by `created_at` (newest first)

```typescript
// Lines 207-225
const recentTickets = useMemo(
  () => {
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
```

**Table Columns:**
- ID
- Title
- Status (with badge color)
- Created By
- Assigned To
- Action (View button)

---

## 🔄 Real-Time Updates Handling

### Current Implementation

**Comment from code (Line 96):**
```typescript
// Real-time updates are initialized in ProtectedRoute via useWebSocket()
```

**Query Configuration:**
```typescript
staleTime: Infinity, // Don't auto-refresh; rely on WebSocket invalidation
```

### WebSocket Connection Flow

**Location:** [web/src/providers/WebSocketProvider.tsx](web/src/providers/WebSocketProvider.tsx)

**Endpoint:** `ws://localhost:8000/ws/unified/` (or `wss://` for production)

**Authentication:**
```typescript
// Sent after connection established
{
  type: 'authenticate',
  token: '<JWT_TOKEN>'
}
```

### Real-Time Query Invalidation

Pattern used in WebSocketProvider:
```typescript
// File: web/src/providers/WebSocketProvider.tsx (Lines 119-149)

// When TICKET_CREATED event received:
if (data.type === 'TICKET_CREATED' || data.type === 'TICKET_UPDATED' || ...) {
  console.log('🔔 Notification received:', data.type)
  addNotification({...})
  
  // Invalidate query for this ticket if available
  if (data.ticket_id) {
    queryClient.invalidateQueries({
      queryKey: ['ticket', data.ticket_id],
    })
  }
}

// When data_changed event received (real-time updates):
if (data.type === 'data_changed') {
  // Invalidate all ticket queries to reflect changes
  queryClient.invalidateQueries({ queryKey: ['my-tickets'] })
  queryClient.invalidateQueries({ queryKey: ['employee/tasks'] })
  if (data.ticketId) {
    queryClient.invalidateQueries({
      queryKey: ['ticket', data.ticketId],
    })
    // Special handling for comments
    if (data.event === 'comment_added') {
      queryClient.invalidateQueries({
        queryKey: ['ticket-comments', data.ticketId],
      })
    }
  }
}
```

### WebSocket Events Handled for Dashboard Updates

All these events trigger query invalidation to refresh dashboard data:

1. **TICKET_CREATED** - New ticket added
2. **TICKET_UPDATED** - Ticket status/details changed
3. **TICKET_ASSIGNED** - Ticket reassigned
4. **TICKET_RESOLVED** - Ticket resolved
5. **TICKET_DELETED** - Ticket deleted
6. **COMMENT_ADDED** - Comment added to ticket
7. **data_changed** - Generic data change trigger

---

## ⚠️ Issues & Inconsistencies Found

### 1. **Query Keys Not Using Factory Pattern**
```typescript
// ❌ CURRENT (Inline keys)
queryKey: ['tickets', accessToken]
queryKey: ['analytics-dashboard']

// ✅ SHOULD BE (Using factory)
queryKey: queryKeys.tickets.all
queryKey: queryKeys.dashboard.analytics()
```

**Impact:** Makes invalidation patterns inconsistent across components

### 2. **Missing Query Key Invalidation for Dashboard Queries**

When WebSocket receives updates, these queries should be invalidated:
```typescript
// Currently MISSING:
queryClient.invalidateQueries({ queryKey: ['tickets', accessToken] })
queryClient.invalidateQueries({ queryKey: ['analytics-dashboard'] })

// Found in real-time consumer but NOT connected to Dashboard queries:
queryClient.invalidateQueries({ queryKey: ['my-tickets'] })
queryClient.invalidateQueries({ queryKey: ['employee/tasks'] })
queryClient.invalidateQueries({ queryKey: ['dashboard'] })
```

### 3. **Analytics Query Only Available for MANAGERS**
- Regular employees don't see analytics section
- No fallback state shown for employees viewing other manager dashboards

---

## 📋 Summary Table

| Feature | Query Key | API Endpoint | Cache | Real-Time | Role |
|---------|-----------|--------------|-------|-----------|------|
| All Tickets | `['tickets', accessToken]` | `GET /my-tickets` | Infinity | ✅ WebSocket | All |
| Analytics | `['analytics-dashboard']` | `GET /analytics/dashboard` | Infinity | ✅ WebSocket | Manager |
| Stats (Calculated) | N/A (memoized) | N/A | N/A | ✅ Inherited from tickets |  All |
| Priority Chart | N/A (memoized) | N/A (from analytics) | N/A | ✅ On analytics update | Manager |
| Category Chart | N/A (memoized) | N/A (from analytics) | N/A | ✅ On analytics update | Manager |
| Sentiment Chart | N/A (memoized) | N/A (from analytics) | N/A | ✅ On analytics update | Manager |
| Recent Tickets | N/A (memoized) | N/A (from tickets) | N/A | ✅ On tickets update | All |

---

## 🔗 Related Files

- **Type Definitions:** [web/src/types/ticket.ts](web/src/types/ticket.ts)
- **Query Key Factory:** [web/src/api/queryKeys.ts](web/src/api/queryKeys.ts)
- **Tickets API:** [web/src/api/tickets.api.ts](web/src/api/tickets.api.ts)
- **WebSocket Provider:** [web/src/providers/WebSocketProvider.tsx](web/src/providers/WebSocketProvider.tsx)
- **Routes:** [web/src/routes/RootRouter.tsx](web/src/routes/RootRouter.tsx)
