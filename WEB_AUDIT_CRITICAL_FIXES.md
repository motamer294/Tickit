# 🛠️ WEB CODEBASE - CRITICAL FIXES IMPLEMENTATION GUIDE

## Priority 1: Critical Fixes (Must Do Today)

---

## Fix #1: WebSocket Token Exposure

### Issue

Tokens are passed in WebSocket URL query parameters, exposing them in:

- Browser DevTools Network tab
- Server access logs
- Proxy servers
- Browser local storage

### Current Code

```typescript
// ❌ UNSAFE - src/hooks/useNotificationWebSocket.ts:36
const wsURL = import.meta.env.DEV
  ? `ws://localhost:8000/ws/notifications/?token=${accessToken}`
  : `${baseURL}/ws/notifications/?token=${accessToken}`;

wsRef.current = new WebSocket(wsURL);
```

### Fixed Code - Option A (Recommended): Send token after connection

```typescript
// ✅ SAFE - Token sent in message, not URL
const wsURL = import.meta.env.DEV
  ? `ws://localhost:8000/ws/notifications/`
  : `${baseURL}/ws/notifications/`;

wsRef.current = new WebSocket(wsURL);

wsRef.current.onopen = () => {
  console.log("✅ WebSocket connected");
  isConnectingRef.current = false;

  // Send authentication token after connection (NOT in URL)
  wsRef.current!.send(
    JSON.stringify({
      type: "authenticate",
      token: accessToken,
    }),
  );

  // Send keep-alive ping every 30 seconds
  const pingInterval = setInterval(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "ping" }));
    } else {
      clearInterval(pingInterval);
    }
  }, 30000);
};
```

### Backend Changes Required

```python
# Django Channels consumer
class NotificationConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        await self.accept()
        # DON'T authenticate yet, wait for auth message

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)

            if data['type'] == 'authenticate':
                # Validate token here
                token = data.get('token')
                user = validate_token(token)

                if user:
                    self.user = user
                    self.user_id = user.id
                    await self.channel_layer.group_add(
                        f'notifications_user_{user.id}',
                        self.channel_name
                    )
                else:
                    await self.close()

            elif data['type'] == 'ping':
                await self.send(json.dumps({'type': 'pong'}))
        except Exception as e:
            await self.close()
```

### Apply to Both Files

- [src/hooks/useNotificationWebSocket.ts](src/hooks/useNotificationWebSocket.ts#L36)
- [src/hooks/useRealtimeData.ts](src/hooks/useRealtimeData.ts#L29)

**Time Estimate**: 1-2 hours

---

## Fix #2: Remove Duplicate useLogin Hook

### Issue

Two implementations of `useLogin()`:

- [src/hooks/useAuth.ts](src/hooks/useAuth.ts#L43-L88) - Rich implementation ✅
- [src/hooks/useLogin.ts](src/hooks/useLogin.ts#L1-L20) - Duplicate stub ❌

### Step 1: Delete Unused File

```bash
rm src/hooks/useLogin.ts
```

### Step 2: Update Signup.tsx import

```typescript
// ❌ BEFORE - src/pages/auth/Signup.tsx:5
import { useSignup } from "@/hooks/useAuth";

// ✅ AFTER - already correct, no change needed
import { useSignup } from "@/hooks/useAuth";
```

### Step 3: Verify imports

```bash
# Check for any imports from useLogin.ts
grep -r "from '@/hooks/useLogin'" src/

# Should return nothing
```

**Time Estimate**: 15 minutes

---

## Fix #3: Implement Global Error Boundary

### Step 1: Create Error Boundary Component

```typescript
// NEW FILE: src/components/ErrorBoundary.tsx
import { Component, ReactNode } from 'react'
import { Container, Stack, Text, Button, Alert } from '@mantine/core'
import { Icon } from '@iconify-icon/react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('🚨 Error Boundary caught:', error, errorInfo)

    // Optional: Send to error tracking service (Sentry, etc.)
    // reportErrorToService(error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
    window.location.href = '/app'
  }

  render() {
    if (this.state.hasError) {
      return (
        <Container size="md" py="xl">
          <Stack gap="lg">
            <Alert
              icon={<Icon icon="solar:warning-circle-bold-duotone" width={20} />}
              title="Oops! Something went wrong"
              color="red"
            >
              We encountered an unexpected error. The team has been notified.
            </Alert>

            <details style={{ padding: '12px', background: '#f5f5f5', borderRadius: '8px' }}>
              <summary style={{ cursor: 'pointer', fontWeight: 600 }}>
                Error Details (for developers)
              </summary>
              <pre style={{ marginTop: '8px', fontSize: '12px', overflow: 'auto' }}>
                {this.state.error?.toString()}
                {'\n\n'}
                {this.state.error?.stack}
              </pre>
            </details>

            <Button
              onClick={this.handleReset}
              leftSection={<Icon icon="solar:home-bold-duotone" />}
            >
              Return to Dashboard
            </Button>
          </Stack>
        </Container>
      )
    }

    return this.props.children
  }
}
```

### Step 2: Wrap App with Error Boundary

```typescript
// MODIFIED: src/App.tsx
import RootRouter from '@/routes/RootRouter'
import { MantineProvider } from '@/providers/MantineProvider'
import ReactQueryProvider from '@/providers/ReactQueryProvider'
import { ErrorBoundary } from '@/components/ErrorBoundary'

export default function App() {
  return (
    <ErrorBoundary>
      <ReactQueryProvider>
        <MantineProvider>
          <RootRouter />
        </MantineProvider>
      </ReactQueryProvider>
    </ErrorBoundary>
  )
}
```

### Step 3: Optional - Add per-component boundaries

```typescript
// MODIFIED: src/pages/dashboard/Dashboard.tsx
import { ErrorBoundary } from '@/components/ErrorBoundary'

export default function Dashboard() {
  return (
    <ErrorBoundary>
      {/* Your existing dashboard content */}
    </ErrorBoundary>
  )
}
```

**Time Estimate**: 1-2 hours

---

## Priority 2: High Impact Fixes

---

## Fix #4: Add React.useMemo for Performance

### Issue

Dashboard stats and filtered data recalculated on every render

### BEFORE - src/pages/dashboard/Dashboard.tsx:100

```typescript
const stats = {
  total: tickets.length,
  open: tickets.filter((t: Ticket) => t.status === "OPEN").length,
  inProgress: tickets.filter((t: Ticket) => t.status === "IN_PROGRESS").length,
  resolved: tickets.filter((t: Ticket) => t.status === "RESOLVED").length,
  closed: tickets.filter((t: Ticket) => t.status === "CLOSED").length,
};

const priorityChartData = analytics
  ? Object.entries(analytics.tickets_by_priority || {}).map(
      ([name, value]) => ({
        name,
        value,
      }),
    )
  : [];
```

### AFTER - src/pages/dashboard/Dashboard.tsx:100

```typescript
import { useMemo } from "react";

// ... in component ...

const stats = useMemo(
  () => ({
    total: tickets.length,
    open: tickets.filter((t: Ticket) => t.status === "OPEN").length,
    inProgress: tickets.filter((t: Ticket) => t.status === "IN_PROGRESS")
      .length,
    resolved: tickets.filter((t: Ticket) => t.status === "RESOLVED").length,
    closed: tickets.filter((t: Ticket) => t.status === "CLOSED").length,
  }),
  [tickets],
);

const priorityChartData = useMemo(
  () =>
    analytics
      ? Object.entries(analytics.tickets_by_priority || {}).map(
          ([name, value]) => ({
            name,
            value,
          }),
        )
      : [],
  [analytics],
);

const categoryChartData = useMemo(
  () =>
    analytics
      ? Object.entries(analytics.tickets_by_category || {})
          .filter(
            ([name]) =>
              name !== "OPEN" &&
              name !== "IN_PROGRESS" &&
              name !== "RESOLVED" &&
              name !== "CLOSED",
          )
          .map(([name, value]) => ({ name, value }))
      : [],
  [analytics],
);

const sentimentChartData = useMemo(
  () =>
    analytics
      ? Object.entries(analytics.sentiment_analysis || {}).map(
          ([name, value]) => ({
            name,
            value,
          }),
        )
      : [],
  [analytics],
);

const recentTickets = useMemo(
  () =>
    tickets
      .sort(
        (a: Ticket, b: Ticket) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )
      .slice(0, 5),
  [tickets],
);
```

### Apply Similar Pattern to TicketsList.tsx:52

```typescript
import { useMemo } from "react";

const filteredTickets = useMemo(
  () =>
    (tickets || []).filter((ticket: Ticket) => {
      const matchesSearch =
        ticket.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = !statusFilter || ticket.status === statusFilter;
      return matchesSearch && matchesStatus;
    }),
  [tickets, searchQuery, statusFilter],
);
```

**Time Estimate**: 1 hour

---

## Fix #5: Merge WebSocket Connections

### Issue

Two independent WebSocket connections: notifications + realtime updates

### Current Architecture

```
ProtectedRoute
├─ useNotificationWebSocket() → ws://localhost:8000/ws/notifications/
└─ useRealtimeData() → ws://localhost:8000/ws/realtime/
```

### New Architecture

```
ProtectedRoute
└─ useWebSocket() → ws://localhost:8000/ws/unified/
   ├─ Handles notifications
   └─ Handles realtime updates
   └─ Single connection
```

### Step 1: Create Unified WebSocket Hook

```typescript
// NEW FILE: src/hooks/useWebSocket.ts
import { useEffect, useRef } from "react";
import { useAuth } from "./useAuth";
import { useNotificationStore } from "@/store/notification.store";
import { useQueryClient } from "@tanstack/react-query";
import type { Notification } from "@/types/notification";

interface WebSocketMessage {
  type: "authenticate" | "ping" | "pong" | "notification" | "data_update";
  token?: string;
  event?: string;
  ticketId?: number;
  id?: string;
  title?: string;
  message?: string;
  [key: string]: any;
}

export const useWebSocket = () => {
  const { accessToken, user } = useAuth();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const isConnectingRef = useRef(false);
  const addNotification = useNotificationStore(
    (state) => state.addNotification,
  );
  const queryClient = useQueryClient();

  const connectWebSocket = () => {
    if (!accessToken || !user || isConnectingRef.current) return;

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log("✅ WebSocket already connected");
      return;
    }

    isConnectingRef.current = true;

    try {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const host = window.location.hostname;
      const port = window.location.port ? `:${window.location.port}` : "";
      const baseURL = `${protocol}//${host}${port}`;

      const wsURL = import.meta.env.DEV
        ? `ws://localhost:8000/ws/unified/`
        : `${baseURL}/ws/unified/`;

      console.log("🔌 Connecting to unified WebSocket");

      wsRef.current = new WebSocket(wsURL);

      wsRef.current.onopen = () => {
        console.log("✅ WebSocket connected");
        isConnectingRef.current = false;

        // Send authentication token AFTER connection
        wsRef.current!.send(
          JSON.stringify({
            type: "authenticate",
            token: accessToken,
          }),
        );

        // Keep-alive ping every 30 seconds
        const pingInterval = setInterval(() => {
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: "ping" }));
          } else {
            clearInterval(pingInterval);
          }
        }, 30000);
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as WebSocketMessage;

          // Skip pong
          if (data.type === "pong") return;

          // Handle notifications
          if (data.type === "notification") {
            const notification: Notification = {
              id: data.id || `notif-${Date.now()}`,
              type: data.type,
              title: data.title,
              message: data.message,
              ticketId: data.ticketId,
              data: data.data || {},
              createdAt: new Date(data.timestamp || Date.now()),
              read: false,
              isGlobal: data.is_global || false,
              fromUser: data.fromUser,
            };
            console.log("📬 Received notification:", notification.title);
            addNotification(notification);
          }

          // Handle data updates
          if (data.type === "data_update") {
            console.log("🔄 Received data update:", data.event);

            switch (data.event) {
              case "ticket_created":
              case "ticket_updated":
              case "ticket_deleted":
                queryClient.invalidateQueries({ queryKey: ["tickets"] });
                queryClient.invalidateQueries({ queryKey: ["myTickets"] });
                queryClient.invalidateQueries({ queryKey: ["dashboard"] });
                if (data.ticketId) {
                  queryClient.invalidateQueries({
                    queryKey: ["ticket", data.ticketId],
                  });
                }
                break;

              case "comment_added":
                if (data.ticketId) {
                  queryClient.invalidateQueries({
                    queryKey: ["ticket-comments", data.ticketId],
                  });
                  queryClient.invalidateQueries({
                    queryKey: ["ticket", data.ticketId],
                  });
                }
                break;

              default:
                break;
            }
          }
        } catch (error) {
          console.error("❌ Error parsing WebSocket message:", error);
        }
      };

      wsRef.current.onerror = (event) => {
        console.error("❌ WebSocket error:", event);
        isConnectingRef.current = false;
      };

      wsRef.current.onclose = () => {
        console.log("❌ WebSocket disconnected");
        isConnectingRef.current = false;

        // Reconnect after 5 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log("🔄 Attempting to reconnect...");
          connectWebSocket();
        }, 5000);
      };
    } catch (error) {
      console.error("❌ Error creating WebSocket:", error);
      isConnectingRef.current = false;
    }
  };

  useEffect(() => {
    if (accessToken && user) {
      connectWebSocket();
    }

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }
    };
  }, [accessToken, user]);

  return {
    isConnected: wsRef.current?.readyState === WebSocket.OPEN,
    ws: wsRef.current,
  };
};
```

### Step 2: Update ProtectedRoute

```typescript
// MODIFIED: src/routes/ProtectedRoute.tsx
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useWebSocket } from '@/hooks/useWebSocket' // NEW - unified hook
import type { UserRole } from '@/types/ticket'
import type { JSX } from 'react'
import { hasAnyRole } from '@/utils/rbac'

interface ProtectedRouteProps {
  children: JSX.Element
  requiredRoles?: UserRole[]
  fallback?: JSX.Element
}

export default function ProtectedRoute({
  children,
  requiredRoles,
  fallback,
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, userRole } = useAuth()

  // Single unified WebSocket connection
  useWebSocket()

  if (isLoading) {
    return null
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (requiredRoles && !hasAnyRole(userRole, requiredRoles)) {
    if (fallback) {
      return fallback
    }
    return <Navigate to="/dashboard?error=forbidden" replace />
  }

  return children
}
```

### Step 3: Delete Old Hooks

```bash
rm src/hooks/useNotificationWebSocket.ts
rm src/hooks/useRealtimeData.ts
```

### Step 4: Update Imports

```typescript
// Any file that imported these hooks should now use:
// import { useWebSocket } from '@/hooks/useWebSocket'
```

**Time Estimate**: 2-3 hours

---

## Priority 3: Security & Validation Fixes

---

## Fix #6: Restrict Role Selection on Signup

### Issue

Any user can self-register as MANAGER or EMPLOYEE

### BEFORE - src/pages/auth/Signup.tsx:48

```typescript
<Select
  label="Account Type"
  placeholder="Select your role"
  data={[
    { value: 'CUSTOMER', label: 'Customer' },
    { value: 'EMPLOYEE', label: 'Employee' },
    { value: 'MANAGER', label: 'Manager' },
  ]}
/>
```

### AFTER - src/pages/auth/Signup.tsx:48

```typescript
<Select
  label="Account Type"
  placeholder="Select your role"
  data={[
    { value: 'CUSTOMER', label: 'Customer' }, // Only CUSTOMER available
  ]}
  disabled
  value="CUSTOMER"
  description="Employees and managers are created by system administrators"
/>
```

### Backend Validation (Django)

```python
# accounts/serializers.py
from rest_framework import serializers

class SignupSerializer(serializers.Serializer):
    username = serializers.CharField(min_length=3)
    password = serializers.CharField(min_length=6)
    role = serializers.ChoiceField(choices=['MANAGER', 'EMPLOYEE', 'CUSTOMER'])

    def validate_role(self, value):
        # Only allow CUSTOMER role for self-signup
        if value != 'CUSTOMER':
            raise serializers.ValidationError(
                "Only customers can self-register. Contact administrator for manager/employee accounts."
            )
        return value
```

**Time Estimate**: 30 minutes

---

## Fix #7: Enhance Password Validation

### BEFORE - src/pages/auth/Signup.tsx:24

```typescript
password: (val) => (val.length < 6 ? 'Password too short' : null),
```

### AFTER - src/pages/auth/Signup.tsx:24

```typescript
import { passwordStrength } from '@/utils/validation'

// In form validation:
password: (val) => {
  if (val.length < 8) return 'Minimum 8 characters required'
  if (!/[A-Z]/.test(val)) return 'Must contain uppercase letter'
  if (!/[0-9]/.test(val)) return 'Must contain number'
  if (!/[!@#$%^&*]/.test(val)) return 'Must contain special character (!@#$%^&*)'
  return null
},
```

### Create Validation Utility

```typescript
// NEW FILE: src/utils/password.ts
export function validatePassword(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 8) errors.push("Minimum 8 characters");
  if (!/[A-Z]/.test(password)) errors.push("At least one uppercase letter");
  if (!/[a-z]/.test(password)) errors.push("At least one lowercase letter");
  if (!/[0-9]/.test(password)) errors.push("At least one number");
  if (!/[!@#$%^&*]/.test(password))
    errors.push("At least one special character");

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function getPasswordStrength(
  password: string,
): "weak" | "fair" | "good" | "strong" {
  const errors = validatePassword(password).errors.length;

  if (errors >= 4) return "weak";
  if (errors >= 3) return "fair";
  if (errors >= 1) return "good";
  return "strong";
}
```

**Time Estimate**: 1 hour

---

## Fix #8: Remove Polling if WebSocket is Reliable

### Current Issue - src/pages/dashboard/Dashboard.tsx:80

```typescript
// Also polling every 30 seconds
refetchInterval: 30000,
refetchIntervalInBackground: true,
```

### Choose One Strategy

**Option A: Trust WebSocket (Recommended)**

```typescript
// REMOVE polling, rely only on WebSocket invalidation
const { data: tickets = [] } = useQuery({
  queryKey: ["tickets", accessToken],
  queryFn: () => fetchTickets(),
  enabled: !!accessToken,
  staleTime: Infinity, // Don't auto-refresh
  // Remove: refetchInterval
  // Remove: refetchIntervalInBackground
});
```

**Option B: Keep Polling without WebSocket**

```typescript
// Remove WebSocket, keep polling
const { data: tickets = [] } = useQuery({
  queryKey: ["tickets", accessToken],
  queryFn: () => fetchTickets(),
  enabled: !!accessToken,
  refetchInterval: 60000, // 60 seconds (less frequent)
  refetchIntervalInBackground: false, // Don't poll when minimized
});
```

**Recommendation**: Option A - WebSocket is more efficient and real-time

**Time Estimate**: 30 minutes

---

## Implementation Timeline

### Day 1 (Morning)

- [ ] Fix #1: WebSocket Token Exposure (2h)
- [ ] Fix #2: Remove Duplicate useLogin (15m)
- [ ] Fix #3: Error Boundary (1.5h)

### Day 1 (Afternoon)

- [ ] Fix #4: Add useMemo (1h)
- [ ] Fix #5: Merge WebSocket (3h)

### Day 2

- [ ] Fix #6: Restrict Signup Role (30m)
- [ ] Fix #7: Password Validation (1h)
- [ ] Fix #8: Choose Polling Strategy (30m)
- [ ] Testing & QA (2h)

### Total Effort: ~11 hours

---

## Testing Checklist After Fixes

- [ ] Error boundary catches component crashes
- [ ] WebSocket doesn't expose tokens in DevTools Network
- [ ] Single WebSocket connection visible in Network tab
- [ ] Notifications still arrive in real-time
- [ ] Realtime updates still work
- [ ] Dashboard doesn't lag with large datasets
- [ ] Can't select EMPLOYEE/MANAGER on signup
- [ ] Password meets complexity requirements
- [ ] Polling stops if WebSocket is chosen
- [ ] No console errors or warnings
- [ ] All existing tests pass

---

## Files to Modify/Create Summary

```
✅ Create:
  - src/components/ErrorBoundary.tsx
  - src/hooks/useWebSocket.ts
  - src/utils/password.ts

🔄 Modify:
  - src/App.tsx
  - src/api/config.ts
  - src/hooks/useNotificationWebSocket.ts (or delete)
  - src/hooks/useRealtimeData.ts (or delete)
  - src/routes/ProtectedRoute.tsx
  - src/pages/auth/Signup.tsx
  - src/pages/dashboard/Dashboard.tsx
  - src/pages/tickets/TicketsList.tsx

❌ Delete:
  - src/hooks/useLogin.ts (duplicate)
  - src/hooks/useNotificationWebSocket.ts (if merging)
  - src/hooks/useRealtimeData.ts (if merging)
```
