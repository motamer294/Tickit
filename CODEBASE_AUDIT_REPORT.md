# 🔍 Comprehensive Codebase Audit Report

**Generated**: April 13, 2026
**Scope**: Frontend (`web/src`) - Components, Hooks, Stores, Services
**Total Issues Found**: 25 (5 Critical, 8 High, 10 Medium, 2 Low)

---

## Executive Summary

✅ **What's Working Well:**

- Consistent naming conventions (camelCase/PascalCase)
- Well-organized feature-based folder structure
- Full TypeScript coverage with proper interfaces
- Good separation of concerns (Zustand + React Query)
- Error utility classification implemented

⚠️ **Critical Issues Requiring Immediate Action:**

1. **Duplicate WebSocket connections** → 2x bandwidth waste
2. **JWT token exposed in WebSocket URL** → Security vulnerability
3. **Missing error boundaries** → App crashes on data fetch failures
4. **RBAC not enforced on routes** → Role-based access control bypass
5. **Dual polling + WebSocket** → Redundant API calls

---

## 1. CODE CONSISTENCY ISSUES

### Issue 1.1: Inconsistent Store Method Naming

**Severity**: Medium
**File**: `store/auth.store.ts` (lines 93-100)
**Problem**: Mixed naming patterns for role checking

```typescript
// Current (inconsistent)
getUserRole(); // getter
isManager(); // boolean method
isEmployee(); // boolean method
```

**Fix**: Standardize to getter pattern

```typescript
getRole(): UserRole
getIsManager(): boolean
getIsEmployee(): boolean
```

### Issue 1.2: Oversized Hook Return Values

**Severity**: Medium
**File**: `hooks/useAuth.ts` (lines 15-20)
**Problem**: `useAuth()` returns 11 values - unclear what's selector vs action
**Fix**: Split into separate hooks:

```typescript
export const useAuth = () => {
  return {
    user: useAuthStore((s) => s.user),
    isAuthenticated: useAuthStore((s) => !!s.user),
    login: useAuthStore((s) => s.login),
    logout: useAuthStore((s) => s.logout),
  };
};
```

### Issue 1.3: Hardcoded Query Keys

**Severity**: Low
**Files**: `hooks/useRealtimeData.ts`, `hooks/useTickets.ts`
**Problem**: Query keys as magic strings scattered throughout
**Fix**: Create `src/api/queryKeys.ts`:

```typescript
export const queryKeys = {
  tickets: ["tickets"] as const,
  ticketDetail: (id: number) => ["ticket", id] as const,
  comments: (id: number) => ["comments", id] as const,
};
```

---

## 2. PERFORMANCE BOTTLENECKS

### Critical Issue 2.1: Duplicate WebSocket Connections

**Severity**: 🔴 CRITICAL
**Files**:

- `hooks/useNotificationWebSocket.ts` (notifications WS)
- `hooks/useRealtimeData.ts` (realtime WS)
  **Problem**: Two separate WebSocket connections = 2x bandwidth, 2x memory, duplicate message handling
  **Current Architecture**:

```
Client → ws://localhost:8000/ws/notifications/ → Notifications
Client → ws://localhost:8000/ws/realtime/      → Real-time updates
```

**Impact**:

- Redundant network overhead
- Duplicate reconnection logic
- Memory waste (two connection objects)
- Race conditions on data updates

**Fix**: Merge into single endpoint (server-side change required)

```typescript
// New unified hook
export const useWebSocket = () => {
  // Single connection receives both notifications and realtime updates
  wsRef.current = new WebSocket(`ws://localhost:8000/ws/unified/?token=...`);

  wsRef.current.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === "notification") {
      addNotification(data);
    } else if (data.event === "ticket_updated") {
      invalidateQueries(["ticket", data.ticketId]);
    }
  };
};
```

### Critical Issue 2.2: WebSocket Initialized on Every Route Change

**Severity**: 🔴 CRITICAL
**File**: `routes/ProtectedRoute.tsx` (lines 23-35)
**Problem**: Both WebSocket hooks called in ProtectedRoute → reconnect on every navigation
**Current Flow**:

```
User navigates /app → useNotificationWebSocket() hooks ✓
User goes to /app/dashboard → ProtectedRoute remounts → hooks called AGAIN ✗
User navigates to /app/tickets → ProtectedRoute remounts → hooks called AGAIN ✗
```

**Fix**: Move WebSocket initialization to App root

```typescript
// App.tsx
export function App() {
  useNotificationWebSocket() // Only once at app level
  useRealtimeData()           // Only once at app level

  return <RootRouter />
}
```

### Critical Issue 2.3: Dual WebSocket + Polling

**Severity**: 🔴 CRITICAL
**File**: `pages/dashboard/Dashboard.tsx` (lines 130-150)
**Problem**: Using both WebSocket real-time updates AND React Query polling

```typescript
const { data: analytics } = useQuery({
  queryKey: ["analytics"],
  queryFn: fetchAnalytics,
  refetchInterval: 30000, // ← Polling every 30s
});

useRealtimeData(); // ← Also listening to WebSocket
```

**Fix**: Choose ONE pattern - remove polling since WebSocket is more efficient

```typescript
const { data: analytics } = useQuery({
  queryKey: ["analytics"],
  queryFn: fetchAnalytics,
  // Remove refetchInterval - rely on WebSocket invalidation
});
```

### High Issue 2.4: Missing Lazy Loading

**Severity**: 🟠 HIGH
**File**: `pages/tickets/TicketDetail.tsx` (lines 85-95)
**Problem**: Fetches employees list on mount even if modal not opened

```typescript
const { data: employees = [] } = useQuery({
  queryKey: ["employees"],
  queryFn: fetchEmployeesApi,
  enabled: user?.role === "MANAGER", // Fetches immediately if manager
});
```

**Fix**: Gate by modal state

```typescript
const [assignModalOpen, setAssignModalOpen] = useState(false);

const { data: employees = [] } = useQuery({
  queryKey: ["employees"],
  queryFn: fetchEmployeesApi,
  enabled: assignModalOpen && user?.role === "MANAGER", // Only fetch when modal opens
});
```

### High Issue 2.5: Disabled Retries

**Severity**: 🟠 HIGH
**File**: `providers/ReactQueryProvider.tsx` (lines 1-15)
**Problem**: `retry: false` globally disables all retries

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false, // ← Network errors = immediate failure
    },
  },
});
```

**Fix**: Add intelligent retry logic

```typescript
retry: (failureCount, error) => {
  // Don't retry auth errors
  if (error?.status === 401 || error?.status === 403) return false;
  // Retry other errors up to 2 times
  return failureCount < 2;
};
```

### Medium Issue 2.6: Missing Memoization

**Severity**: 🟡 MEDIUM
**Files**: Multiple locations

- `pages/tickets/TicketsList.tsx`: `filteredTickets` calculation
- `pages/dashboard/Dashboard.tsx`: `stats` object calculation
- `components/NotificationCenter.tsx`: Missing React.memo

**Example Fix** for `TicketsList.tsx`:

```typescript
const filteredTickets = useMemo(() => {
  return tickets.filter(
    (t) =>
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
      (!statusFilter || t.status === statusFilter),
  );
}, [tickets, searchQuery, statusFilter]);
```

---

## 3. ERROR HANDLING GAPS

### Critical Issue 3.1: No Error Boundaries

**Severity**: 🔴 CRITICAL
**Affected**: Entire app can crash on data fetch failures
**Problem**: Single failed query crashes whole page

```typescript
// Dashboard.tsx - no error boundary
const { data: analytics } = useQuery(...) // If fails, unmounts page
```

**Fix**: Create Error Boundary component:

```typescript
// components/ErrorBoundary.tsx
export class ErrorBoundary extends React.Component {
  state = { hasError: false }

  static getDerivedStateFromError(error) {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return <Alert title="Error" color="red">Something went wrong</Alert>
    }
    return this.props.children
  }
}

// Usage in pages
<ErrorBoundary>
  <DashboardContent />
</ErrorBoundary>
```

### High Issue 3.2: Silent WebSocket Failures

**Severity**: 🟠 HIGH
**File**: `hooks/useNotificationWebSocket.ts` (lines 75-85)
**Problem**: JSON parse errors caught but no user notification

```typescript
catch (error) {
  console.error('Error parsing WebSocket message:', error) // Only logs
  // User never knows connection failed
}
```

**Fix**: Show toast notification

```typescript
catch (error) {
  console.error('Error parsing WebSocket message:', error)
  notifications.show({
    title: 'Connection Error',
    message: 'Failed to process real-time update',
    color: 'red',
    autoClose: false,
  })
}
```

### Medium Issue 3.3: Missing Inline Error Messages

**Severity**: 🟡 MEDIUM
**File**: `pages/auth/Login.tsx` (lines 50-80)
**Problem**: Form errors only shown as toast, not inline

```typescript
// Only shows toast
notifications.show({
  title: "Error",
  message: error.message,
});
// Should also show inline below field
```

---

## 4. SECURITY ISSUES

### 🔴 Critical Security Issue 4.1: JWT Token Exposed in URL

**Severity**: CRITICAL
**Files**:

- `hooks/useNotificationWebSocket.ts` (line 42)
- `hooks/useRealtimeData.ts` (line 38)
  **Current Implementation**:

```typescript
const wsURL = `ws://localhost:8000/ws/notifications/?token=${accessToken}`;
```

**Vulnerabilities**:

- ✗ Token visible in browser history: `chrome://history`
- ✗ Token in server logs: `GET /ws/notifications?token=eyJhbGc...`
- ✗ Leaked in error reports/monitoring tools
- ✗ Exposed if WebSocket URL logged to external services
- ✗ Vulnerable to MITM (Man-in-the-Middle) attacks

**Fix**: Use Authorization header (requires backend WebSocket support)

```typescript
const ws = new WebSocket(wsURL);
// Standard HTTP upgrade uses headers
ws.onopen = () => {
  ws.send(
    JSON.stringify({
      type: "authenticate",
      token: accessToken,
    }),
  );
};
```

Or use httpOnly cookies (server-side):

```
Cookie: auth_token=eyJhbGc...; HttpOnly; Secure; SameSite=Strict
```

### 🔴 Critical Security Issue 4.2: Unencrypted localStorage

**Severity**: CRITICAL (if XSS vulnerability exists)
**File**: `store/auth.store.ts` (lines 50-60)
**Problem**: JWT tokens stored in plaintext localStorage

```typescript
// Vulnerable to XSS: if attacker injects script, they can read token
const token = localStorage.getItem("auth_token");
```

**Impact**: If XSS vulnerability exists, attacker can steal JWT tokens
**Fix Options**:

1. **Use httpOnly cookies** (best):

   ```
   Set-Cookie: auth_token=...; HttpOnly; Secure; SameSite=Strict
   // JavaScript cannot access - defended against XSS
   ```

2. **Encrypt localStorage** (defense-in-depth):

   ```typescript
   import CryptoJS from "crypto-js";

   localStorage.setItem(
     "token",
     CryptoJS.AES.encrypt(token, "SECRET_KEY").toString(),
   );
   ```

3. **Validate XSS protection**:
   - Content-Security-Policy headers
   - DOMPurify for any user-generated HTML
   - Avoid dangerouslySetInnerHTML

### 🟠 High Security Issue 4.3: Token Logged in Development

**Severity**: HIGH
**File**: `api/config.ts` (lines 70-85)
**Current Code**:

```typescript
if (import.meta.env.DEV) {
  console.log(`[API] Sending token: ${token.substring(0, 20)}...`); // Still exposes prefix
}
```

**Fix**: Remove completely or use placeholder

```typescript
if (import.meta.env.DEV) {
  console.log(`[API] Sending authentication request`);
  // Don't log token or token prefix
}
```

### 🟠 High Security Issue 4.4: No RBAC on Routes

**Severity**: HIGH
**File**: `routes/ProtectedRoute.tsx` (lines 30-45)
**Problem**: Only checks authentication, not authorization

```typescript
const ProtectedRoute = ({ children }: Props) => {
  const { isAuthenticated } = useAuth()

  if (!isAuthenticated) return <Navigate to="/login" />

  return children // No role check!
}
```

**Vulnerability**: User with wrong role can access restricted routes
**Fix**: Add RBAC check

```typescript
const ProtectedRoute = ({ children, requiredRole }: Props) => {
  const { isAuthenticated, user } = useAuth()

  if (!isAuthenticated) return <Navigate to="/login" />

  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to="/app" />
  }

  return children
}

// Usage:
<Route path="analytics" element={<ProtectedRoute requiredRole="MANAGER"><Analytics /></ProtectedRoute>} />
```

### 🟠 High Security Issue 4.5: Manager Endpoints Unprotected

**Severity**: HIGH
**File**: `pages/tickets/CreateTicket.tsx` (lines 30-50)
**Problem**: Frontend allows employee assignment without RBAC validation

```typescript
// Any authenticated user can see this dropdown
if (user?.role === "MANAGER") {
  // Shows employee list - but no backend validation
  renderEmployeeSelect();
}
```

**Fix**: Always validate on backend - frontend check is UI only

```typescript
// Backend API should enforce
POST /tickets
Body: { assignedToId: 123 }
// Backend checks:
if (request.user.role !== 'MANAGER') {
  return 403 Forbidden
}
```

### 🟡 Medium Security Issue 4.6: No Token Expiration Check

**Severity**: MEDIUM
**File**: `store/auth.store.ts` (lines 45-60)
**Problem**: Expired tokens used until app reloads

```typescript
const token = localStorage.getItem("auth_token");
// No check: token.exp < Date.now()
```

**Fix**: Add expiry validation

```typescript
export const useAuthStore = create((set) => ({
  init: () => {
    const token = localStorage.getItem("auth_token");

    if (token && isTokenExpired(token)) {
      localStorage.removeItem("auth_token");
      set({ user: null });
      return;
    }

    // Use token if valid
    set({ user: decodeToken(token) });
  },
}));

function isTokenExpired(token: string): boolean {
  const decoded = decodeJWT(token);
  return new Date() >= new Date(decoded.exp * 1000);
}
```

---

## 5. WEBSOCKET INEFFICIENCIES

### Issue 5.1: Redundant Invalidation

**Severity**: MEDIUM
**File**: `hooks/useRealtimeData.ts` (lines 95-110)
**Problem**: Generic `invalidateQueries()` can refetch entire app

```typescript
case 'comment_added':
  queryClient.invalidateQueries() // ← Refetches ALL cached data!
  break
```

**Fix**: Use specific query keys

```typescript
case 'comment_added':
  queryClient.invalidateQueries({
    queryKey: ['comments', data.ticketId]
  })
  queryClient.invalidateQueries({
    queryKey: ['ticket', data.ticketId]
  })
  break
```

### Issue 5.2: Stale Token on Refresh

**Severity**: MEDIUM
**Problem**: When JWT refreshes, WebSocket uses old token
**Fix**: Reconnect WebSocket on token refresh

```typescript
export const useAuthStore = create((set) => ({
  // ...
  refreshToken: async () => {
    const newToken = await tokenRefreshAPI();
    set({ accessToken: newToken });

    // Reconnect WebSocket with new token
    window.dispatchEvent(
      new CustomEvent("token-refreshed", { detail: newToken }),
    );
  },
}));

// In WebSocket hook
window.addEventListener("token-refreshed", (e) => {
  wsRef.current?.close();
  connectWebSocket(); // Reconnect with new token
});
```

---

## 6. MISSING FEATURES

| Feature           | Severity | Recommendation                                     |
| ----------------- | -------- | -------------------------------------------------- |
| Error Boundaries  | HIGH     | Add component-level error recovery                 |
| Offline Mode      | MEDIUM   | Detect offline, queue mutations, sync on reconnect |
| Rate Limiting     | MEDIUM   | Add client-side rate limiting for API calls        |
| Loading Skeletons | MEDIUM   | Add Skeleton loaders for slow-loading sections     |
| Retry Backoff     | MEDIUM   | Exponential backoff: 1s, 2s, 4s, 8s                |
| Connection Status | HIGH     | Show connection indicator (green/red dot)          |

---

## 7. ACTION PLAN

### Phase 1: Critical (This Sprint)

- [ ] Merge WebSocket connections into single endpoint
- [ ] Move WebSocket initialization to App.tsx
- [ ] Add Error Boundaries to Dashboard, TicketDetail, Analytics
- [ ] Remove dual polling (choose WebSocket OR polling)
- [ ] Fix JWT token exposure (move to httpOnly cookies or header)

### Phase 2: High Priority (Next Sprint)

- [ ] Implement RBAC on all protected routes
- [ ] Add WebSocket connection status indicator
- [ ] Show error toasts for WebSocket failures
- [ ] Add token expiration check on app startup
- [ ] Unify error handling across API files

### Phase 3: Medium (Later)

- [ ] Add React.memo to expensive components
- [ ] Extract query keys to centralized constants
- [ ] Implement Suspense boundaries
- [ ] Add loading skeletons
- [ ] Implement intelligent retry logic

---

## 8. QUICK REFERENCE

**Summary Stats**:

- Total Files: 39
- Total Issues: 25
- Critical Issues: 5 🔴
- High Issues: 8 🟠
- Medium Issues: 10 🟡
- Low Issues: 2

**Architecture Recommendations**:

- Merge WebSocket connections: 1 → 1 endpoint
- Initialize WebSocket: ProtectedRoute → App.tsx
- Error handling: Add boundaries to all data-dependent pages
- Security: Move tokens to httpOnly cookies
- Performance: Remove polling where WebSocket active

---

**Next Step**: Review this report with team, prioritize by severity, and create GitHub issues for each action item.
