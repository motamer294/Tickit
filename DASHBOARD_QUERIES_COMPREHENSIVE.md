# Dashboard - Complete Query Keys Analysis

## Summary

Dashboard components use 2 direct queries + multiple hooks that provide related data fetching capabilities.

---

## 1. DASHBOARD COMPONENT QUERIES (Dashboard.tsx)

### Query 1: Tickets List

```typescript
// Location: web/src/pages/dashboard/Dashboard.tsx (lines 108-118)
const {
  data: tickets = [],
  isLoading,
  error,
} = useQuery({
  queryKey: ["tickets"], // ✅ Match WebSocket invalidation
  queryFn: () => fetchTickets(),
  enabled: !!accessToken,
  staleTime: 5 * 60 * 1000, // 5 minutes
});
```

- **Query Key**: `['tickets']`
- **API Endpoint**: `/my-tickets` (from fetchTickets)
- **Fetch Function**: `fetchTickets()`
- **Scope**: All users (filtered by role on backend)
  - CUSTOMER: sees own tickets
  - EMPLOYEE: sees all (backend filtered)
  - MANAGER: sees all
- **Enabled**: When `accessToken` exists
- **staleTime**: 5 minutes
- **gcTime**: Not specified (default)
- **retry**: Not specified (default)
- **Data Type**: Ticket[]

### Query 2: Analytics Dashboard

```typescript
// Location: web/src/pages/dashboard/Dashboard.tsx (lines 120-128)
const { data: analytics, isLoading: analyticsLoading } = useQuery({
  queryKey: ["analytics-dashboard"],
  queryFn: () => fetchAnalyticsDashboard(),
  enabled: !!accessToken && user?.role === "MANAGER",
  staleTime: 5 * 60 * 1000, // 5 minutes
});
```

- **Query Key**: `['analytics-dashboard']`
- **API Endpoint**: `/analytics/dashboard`
- **Fetch Function**: `fetchAnalyticsDashboard()`
- **Scope**: MANAGER role only
- **Enabled**: When `accessToken` exists AND `user.role === 'MANAGER'`
- **staleTime**: 5 minutes
- **gcTime**: Not specified (default)
- **retry**: Not specified (default)
- **Data Type**: DashboardStats

### DashboardStats Type

```typescript
interface DashboardStats {
  total_tickets: number;
  open_tickets: number;
  resolved_tickets: number;
  avg_resolution_time_hours: number;
  tickets_by_category: Record<string, number>;
  tickets_by_priority: Record<string, number>;
  sentiment_analysis: Record<string, number>;
}
```

---

## 2. HOOK-BASED QUERIES (useTickets.ts)

These hooks use centralized query keys and are alternatives/complements to direct queries:

### Hook 1: useTickets()

```typescript
// Location: web/src/hooks/useTickets.ts (lines 43-51)
export function useTickets() {
  return useQuery({
    queryKey: ticketKeys.lists(),
    queryFn: () => fetchTickets(),
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    retry: 2,
  });
}
```

- **Query Key**: `queryKeys.tickets.lists()` = `['tickets', 'list']`
- **API Endpoint**: `/my-tickets`
- **staleTime**: 5 minutes
- **gcTime**: 10 minutes
- **retry**: 2 attempts
- **Data Type**: Ticket[]

### Hook 2: useTicket(ticketId)

```typescript
// Location: web/src/hooks/useTickets.ts (lines 56-67)
export function useTicket(ticketId: number | undefined | null) {
  return useQuery({
    queryKey: ticketId ? ticketKeys.detail(ticketId) : [],
    queryFn: () => fetchTicketById(ticketId!),
    enabled: isAuthenticated && !!ticketId,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    retry: 2,
  });
}
```

- **Query Key**: `queryKeys.tickets.detail(id)` = `['tickets', 'detail', id]`
- **API Endpoint**: `/tickets/:id`
- **Parameters**: `ticketId` (number)
- **staleTime**: 5 minutes
- **gcTime**: 10 minutes
- **retry**: 2 attempts
- **Data Type**: Ticket

### Hook 3: useEmployeeTasks()

```typescript
// Location: web/src/hooks/useTickets.ts (lines 240-249)
export function useEmployeeTasks() {
  const { isAuthenticated, isEmployee } = useAuth();
  return useQuery({
    queryKey: ticketKeys.tasks(),
    queryFn: () => fetchEmployeeTasks(),
    enabled: isAuthenticated && isEmployee,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    retry: 2,
  });
}
```

- **Query Key**: `queryKeys.tickets.tasks()` = `['tickets', 'tasks']`
- **API Endpoint**: `/employee/tasks`
- **Scope**: EMPLOYEE role only
- **Enabled**: When `isAuthenticated` AND `isEmployee === true`
- **staleTime**: 5 minutes
- **gcTime**: 10 minutes
- **retry**: 2 attempts
- **Data Type**: Ticket[]

### Hook 4: useAnalyticsDashboard()

```typescript
// Location: web/src/hooks/useTickets.ts (lines 256-265)
export function useAnalyticsDashboard() {
  const { isAuthenticated, isManager } = useAuth();
  return useQuery({
    queryKey: ticketKeys.analytics(),
    queryFn: () => fetchAnalyticsDashboard(),
    enabled: isAuthenticated && isManager,
    staleTime: 1000 * 60 * 15, // 15 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
    retry: 1, // Single retry for analytics
  });
}
```

- **Query Key**: `queryKeys.tickets.analytics()` = `['tickets', 'analytics']`
- **API Endpoint**: `/analytics/dashboard`
- **Scope**: MANAGER role only
- **Enabled**: When `isAuthenticated` AND `isManager === true`
- **staleTime**: 15 minutes (less frequent updates)
- **gcTime**: 30 minutes
- **retry**: 1 attempt
- **Data Type**: DashboardStats

### Hook 5: useTicketComments(ticketId)

```typescript
// Location: web/src/hooks/useTickets.ts (lines 226-236)
export function useTicketComments(ticketId: number | undefined | null) {
  return useQuery({
    queryKey: ticketId ? commentKeys.list(ticketId) : [],
    queryFn: () => fetchTicketComments(ticketId!),
    enabled: isAuthenticated && !!ticketId,
    staleTime: 1000 * 30, // 30 seconds
    gcTime: 1000 * 60 * 5, // 5 minutes
    retry: 2,
  });
}
```

- **Query Key**: `queryKeys.comments.list(ticketId)` = `['comments', 'list', ticketId]`
- **API Endpoint**: `/tickets/:id/comments`
- **staleTime**: 30 seconds (most aggressive refresh)
- **gcTime**: 5 minutes
- **retry**: 2 attempts
- **Data Type**: Comment[]

---

## 3. QUERY KEY FACTORY (queryKeys.ts)

### Centralized Query Keys Definition

```typescript
export const queryKeys = {
  // Tickets namespace
  tickets: {
    all: ["tickets"],
    lists: () => ["tickets", "list"],
    list: (filters?: string) => ["tickets", "list", { filters }],
    details: () => ["tickets", "detail"],
    detail: (id: number) => ["tickets", "detail", id],
    tasks: () => ["tickets", "tasks"],
    myTickets: () => ["tickets", "my"],
    analytics: () => ["tickets", "analytics"],
  },

  // Comments namespace
  comments: {
    all: ["comments"],
    lists: () => ["comments", "list"],
    list: (ticketId: number) => ["comments", "list", ticketId],
    details: () => ["comments", "detail"],
    detail: (id: number) => ["comments", "detail", id],
  },

  // Dashboard namespace (defined but NOT USED IN DASHBOARD COMPONENT)
  dashboard: {
    all: ["dashboard"],
    analytics: () => ["dashboard", "analytics"],
    stats: () => ["dashboard", "stats"],
  },

  // ... other namespaces (auth, users, notifications, realtime)
};
```

---

## 4. STAT CARDS ANALYSIS

### Result: NO CHILD COMPONENTS WITH QUERIES

The dashboard uses **inline stat cards** (not separate StatCard components):

- Total Tickets - calculated from `tickets` array
- Open Tickets - calculated from `tickets` array
- In Progress - calculated from `tickets` array
- Resolved - calculated from `tickets` array
- Closed - calculated from `tickets` array

**All stat calculations are done via `useMemo` on the main Dashboard component**, not in separate queries.

---

## 5. MY-TICKETS vs TICKETS QUERY DIFFERENCES

### Query Key Discrepancy Found ⚠️

```
Location: Dashboard.tsx
Direct useQuery: queryKey: ['tickets']
API Endpoint: /my-tickets

Hook (useTickets):
QueryKey: ['tickets', 'list']
API Endpoint: /my-tickets (same)
```

**Finding**: Dashboard component uses simplified key `['tickets']` while the hook uses `['tickets', 'list']`. Both hit the same `/my-tickets` endpoint.

### Unused Query Key

- `queryKeys.tickets.myTickets()` = `['tickets', 'my']` - **NOT USED ANYWHERE**

---

## 6. WEBSOCKET INVALIDATION

Found in [WebSocketProvider.tsx](web/src/providers/WebSocketProvider.tsx):

```typescript
// Lines 145, 160-161
queryClient.invalidateQueries({ queryKey: ["my-tickets"] });
queryClient.invalidateQueries({ queryKey: ["my-tickets"] });
queryClient.invalidateQueries({ queryKey: ["employee/tasks"] });
```

⚠️ **Issue**: WebSocket invalidates `['my-tickets']` but queries use `['tickets']`

---

## 7. EMPLOYEE TASKS QUERIES

### Query Configuration

- **Direct API**: `/employee/tasks`
- **Hook Query Key**: `['tickets', 'tasks']`
- **Role**: EMPLOYEE only
- **Used in**: `useEmployeeTasks()` hook
- **staleTime**: 5 minutes
- **retry**: 2 attempts

---

## COMPLETE DASHBOARD QUERY KEYS LIST

| Component               | Query Key                        | API Endpoint            | Role     | Enabled                      | staleTime | gcTime  | retry   |
| ----------------------- | -------------------------------- | ----------------------- | -------- | ---------------------------- | --------- | ------- | ------- |
| Dashboard.tsx           | `['tickets']`                    | `/my-tickets`           | All      | accessToken                  | 5 min     | default | default |
| Dashboard.tsx           | `['analytics-dashboard']`        | `/analytics/dashboard`  | MANAGER  | accessToken + MANAGER        | 5 min     | default | default |
| useTickets()            | `['tickets', 'list']`            | `/my-tickets`           | All      | isAuthenticated              | 5 min     | 10 min  | 2       |
| useTicket()             | `['tickets', 'detail', id]`      | `/tickets/:id`          | All      | isAuthenticated + id         | 5 min     | 10 min  | 2       |
| useTicketComments()     | `['comments', 'list', ticketId]` | `/tickets/:id/comments` | All      | isAuthenticated + ticketId   | 30 sec    | 5 min   | 2       |
| useEmployeeTasks()      | `['tickets', 'tasks']`           | `/employee/tasks`       | EMPLOYEE | isAuthenticated + isEmployee | 5 min     | 10 min  | 2       |
| useAnalyticsDashboard() | `['tickets', 'analytics']`       | `/analytics/dashboard`  | MANAGER  | isAuthenticated + isManager  | 15 min    | 30 min  | 1       |

---

## SUMMARY FINDINGS

✅ **Used in Dashboard:**

1. `['tickets']` - Direct query for ticket list
2. `['analytics-dashboard']` - Direct query for manager analytics
3. Calculated stats from tickets (no separate queries)
4. Charts data computed from analytics data

⚠️ **Issues Found:**

1. Dashboard uses `['tickets']` but centralized hooks use `['tickets', 'list']`
2. WebSocket invalidates `['my-tickets']` but queries use `['tickets']`
3. Unused query key: `queryKeys.tickets.myTickets()` = `['tickets', 'my']`
4. Dashboard namespace keys are defined but NOT used in Dashboard.tsx

✅ **No Child Components:**

- No StatCard or other child components with their own queries
- All calculations done inline with useMemo()

✅ **Employee Tasks Queries:**

- Separate from dashboard, available via `useEmployeeTasks()`
- Query key: `['tickets', 'tasks']`
- Endpoint: `/employee/tasks`
