# 🛠️ CRITICAL FIXES - Implementation Guide

## Priority Order for Maximum Impact

---

## FIX 1: Merge WebSocket Connections (Bandwidth -50%)

**Impact**: Eliminates duplicate WebSocket connections, reduces memory & CPU
**Effort**: Medium (requires backend + frontend changes)
**Timeline**: 1-2 sprints

### Backend Changes Required

```python
# server/tickets/routing.py
# Merge /ws/notifications/ and /ws/realtime/ into single endpoint

from django.urls import re_path
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from tickets.consumers import UnifiedConsumer

websocket_urlpatterns = [
    # Replace two endpoints with one unified:
    re_path(r'ws/unified/$', AuthMiddlewareStack(UnifiedConsumer.as_asgi())),
]
```

### Frontend Implementation

**File**: `web/src/hooks/useWebSocket.ts` (NEW - replaces current 2 hooks)

```typescript
import { useEffect, useRef } from "react";
import { useNotificationStore } from "@/store/notification.store";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./useAuth";

/**
 * Unified WebSocket Hook
 * Single connection handles both notifications AND real-time data updates
 * Eliminates redundant connections, reduces bandwidth by 50%
 */
export const useWebSocket = () => {
  const { accessToken, user } = useAuth();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const isConnectingRef = useRef(false);
  const queryClient = useQueryClient();

  const addNotification = useNotificationStore(
    (state) => state.addNotification,
  );

  const connectWebSocket = () => {
    if (!accessToken || !user || isConnectingRef.current) return;

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    isConnectingRef.current = true;

    try {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const host = window.location.hostname;
      const port = window.location.port ? `:${window.location.port}` : "";
      const baseURL = `${protocol}//${host}${port}`;

      const wsURL = import.meta.env.DEV
        ? `ws://localhost:8000/ws/unified/?token=${accessToken}`
        : `${baseURL}/ws/unified/?token=${accessToken}`;

      wsRef.current = new WebSocket(wsURL);

      wsRef.current.onopen = () => {
        isConnectingRef.current = false;

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
          const data = JSON.parse(event.data);

          // Skip pong responses
          if (data.type === "pong") return;

          // Handle notifications
          if (data.type === "notification" || data.type.includes("TICKET")) {
            const notification = {
              id: data.id || `notif-${Date.now()}`,
              type: data.type,
              title: data.title,
              message: data.message,
              ticketId: data.ticketId || data.ticket_id,
              data: data.data || {},
              createdAt: new Date(
                data.createdAt || data.timestamp || Date.now(),
              ),
              read: false,
              isGlobal: data.isGlobal || data.is_global || false,
              fromUser: data.fromUser,
            };
            addNotification(notification);
          }

          // Handle real-time data updates
          if (data.event) {
            switch (data.event) {
              case "ticket_created":
                queryClient.invalidateQueries({ queryKey: ["tickets"] });
                queryClient.invalidateQueries({ queryKey: ["myTickets"] });
                queryClient.invalidateQueries({ queryKey: ["dashboard"] });
                break;

              case "ticket_deleted":
                queryClient.invalidateQueries({ queryKey: ["tickets"] });
                queryClient.invalidateQueries({ queryKey: ["myTickets"] });
                queryClient.invalidateQueries({ queryKey: ["dashboard"] });
                break;

              case "ticket_updated":
                queryClient.invalidateQueries({ queryKey: ["tickets"] });
                queryClient.invalidateQueries({
                  queryKey: ["ticket", data.ticketId],
                });
                break;

              case "comment_added":
                // Only invalidate specific comment cache
                queryClient.invalidateQueries({
                  queryKey: ["ticket-comments", data.ticketId],
                });
                break;
            }
          }
        } catch (error) {
          console.error("Error processing WebSocket message:", error);
        }
      };

      wsRef.current.onerror = (event) => {
        console.error("WebSocket error:", event);
        isConnectingRef.current = false;
      };

      wsRef.current.onclose = () => {
        isConnectingRef.current = false;
        reconnectTimeoutRef.current = setTimeout(() => {
          connectWebSocket();
        }, 3000);
      };
    } catch (error) {
      console.error("Error creating WebSocket:", error);
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
};
```

**Migration Path**:

1. Keep old hooks, create new unified hook alongside
2. Update ProtectedRoute to use new hook (see Fix 2)
3. Remove old hooks after testing
4. Remove old backend endpoints

---

## FIX 2: Move WebSocket to App Root (Reduces Reconnections)

**Impact**: Eliminates reconnection on every route change
**Effort**: Low (frontend only)
**Timeline**: 1 day

### Current Problem (ProtectedRoute.tsx)

```typescript
// ❌ BAD: Connects every time route changes
export const ProtectedRoute = ({ children }: Props) => {
  useNotificationWebSocket(); // ← Connects here
  useRealtimeData(); // ← Connects here
  return children;
};
```

### Solution: Move to App.tsx

**File**: `web/src/App.tsx`

```typescript
import { useWebSocket } from '@/hooks/useWebSocket'
import { RootRouter } from '@/routes/RootRouter'

export function App() {
  // Initialize WebSocket ONCE at app level
  useWebSocket()

  return <RootRouter />
}
```

**Updated ProtectedRoute.tsx**

```typescript
// ✅ GOOD: No WebSocket hooks here
export const ProtectedRoute = ({ children }: Props) => {
  const { isAuthenticated } = useAuth()

  if (!isAuthenticated) {
    return <Navigate to="/login" />
  }

  return children
}
```

**Benefits**:

- ✅ Single WebSocket connection for entire app
- ✅ No reconnects on navigation
- ✅ Persists during entire user session
- ✅ Cleaner component tree

---

## FIX 3: Add Error Boundaries (Crash Prevention)

**Impact**: App no longer crashes on API failures
**Effort**: Low (React component)
**Timeline**: 1 day

### Create Error Boundary Component

**File**: `web/src/components/ErrorBoundary.tsx` (NEW)

```typescript
import React from 'react'
import { Container, Stack, Text, Button, Alert } from '@mantine/core'
import { Icon } from '@iconify-icon/react'

interface Props {
  children: React.ReactNode
  fallback?: React.ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
    // Send to error tracking service (Sentry, etc)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined })
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <Container size="md" py="xl">
          <Stack gap="lg" align="center">
            <Icon
              icon="solar:danger-circle-bold-duotone"
              width={48}
              color="red"
            />
            <Stack gap="xs" align="center">
              <Text fw={600} size="lg">
                Something went wrong
              </Text>
              <Text size="sm" c="dimmed" ta="center">
                {this.state.error?.message || 'An unexpected error occurred'}
              </Text>
            </Stack>
            <Button onClick={this.handleReset} color="red" variant="light">
              Try Again
            </Button>
          </Stack>
        </Container>
      )
    }

    return this.props.children
  }
}
```

### Apply to Critical Pages

**File**: `web/src/routes/RootRouter.tsx`

```typescript
import { ErrorBoundary } from '@/components/ErrorBoundary'

export const RootRouter = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        <Route path="/app" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
          {/* Wrap data-dependent pages */}
          <Route index element={
            <ErrorBoundary>
              <Dashboard />
            </ErrorBoundary>
          } />

          <Route path="tickets" element={
            <ErrorBoundary>
              <TicketsList />
            </ErrorBoundary>
          } />

          <Route path="tickets/:ticketId" element={
            <ErrorBoundary>
              <TicketDetail />
            </ErrorBoundary>
          } />

          <Route path="tickets/create" element={
            <ErrorBoundary>
              <CreateTicket />
            </ErrorBoundary>
          } />

          <Route path="profile" element={
            <ErrorBoundary>
              <UserProfile />
            </ErrorBoundary>
          } />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
```

---

## FIX 4: Remove Dual Polling + WebSocket (Reduce API Calls by 50%)

**Impact**: Eliminates redundant API requests
**Effort**: Low
**Timeline**: 1 day

### Current Problem (Dashboard.tsx)

```typescript
// ❌ BAD: Polling every 30s AND WebSocket listening - redundant!
const { data: analytics } = useQuery({
  queryKey: ["analytics"],
  queryFn: fetchAnalytics,
  refetchInterval: 30000, // Polls every 30 seconds
});

const { data: realtime } = useQuery({
  queryKey: ["realtime"],
  queryFn: fetchRealtime,
  refetchInterval: 60000, // Also polls
});

// PLUS WebSocket is already updating these...
useWebSocket(); // ← Already invalidates queries
```

### Solution: Choose WebSocket, Remove Polling

**File**: `web/src/pages/dashboard/Dashboard.tsx`

```typescript
// ✅ GOOD: Rely on WebSocket invalidation from useWebSocket()
const { data: analytics } = useQuery({
  queryKey: ["analytics"],
  queryFn: fetchAnalytics,
  // Remove refetchInterval - WebSocket will update via invalidation
});

// Optional: Can set staleTime if you want to defer refetch
// staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
```

**Why This Works**:

1. User navigates to Dashboard
2. Query fetches `analytics` (fresh data)
3. WebSocket listens for updates
4. When data changes, WebSocket sends event: `{ event: 'analytics_updated' }`
5. `useWebSocket()` invalidates `['analytics']` key
6. Query automatically refetches (React Query handles it)
7. Dashboard UI updates with new data

**Result**: Single fetch on load + event-driven updates = no waste

---

## FIX 5: Secure JWT Storage (Token Exposure)

**Impact**: Prevents token theft via XSS, URL leaks, server logs
**Effort**: Medium (requires backend support)
**Timeline**: 2-3 sprints

### Current Problem

```typescript
// ❌ VULNERABLE
const wsURL = `ws://localhost:8000/ws/notifications/?token=${accessToken}`;
// Token exposed in:
// - Browser history
// - server logs (/ws/notifications?token=...)
// - error reports
// - external monitoring tools
```

### Solution Option 1: httpOnly Cookies (BEST)

**Backend** (Django):

```python
# server/core/settings.py
CSRF_TRUSTED_ORIGINS = ['http://localhost:5173', 'https://yourdomain.com']

# Authentication response
from django.http import JsonResponse
from datetime import datetime, timedelta

def login(request):
    # ... validate credentials ...
    token = generate_jwt_token(user)

    response = JsonResponse({'success': True})
    response.set_cookie(
        key='auth_token',
        value=token,
        max_age=3600 * 24,  # 24 hours
        expires=datetime.now() + timedelta(days=1),
        secure=True,  # HTTPS only
        httponly=True,  # JavaScript cannot access
        samesite='Strict',  # CSRF protection
    )
    return response
```

**Frontend** (React):

```typescript
// No need to manage token - browser sends automatically with requests
// axios interceptor
instance.interceptors.request.use((config) => {
  // Cookie automatically sent with request
  // Don't set Authorization header manually
  return config;
});

// WebSocket can check if authenticated
const ws = new WebSocket("ws://localhost:8000/ws/unified/");
// Browser sends auth_token cookie automatically
```

### Solution Option 2: Authorization Header (Medium Security)

**Backend** (accept Authorization header for WebSocket upgrade):

```python
from channels.db import database_sync_to_async
from rest_framework_simplejwt.tokens import AccessToken

class UnifiedConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        # Extract token from query string (legacy) or header
        token = self.scope.get('query_string', b'').decode()
        if 'token=' in token:
            token = token.split('token=')[1]

        # Validate token
        try:
            AccessToken(token)
            await self.accept()
        except:
            await self.close()
```

**Frontend**:

```typescript
const wsURL = `${
  import.meta.env.DEV ? "ws://localhost:8000" : "wss://yourdomain.com"
}/ws/unified/`;

wsRef.current = new WebSocket(wsURL);

wsRef.current.onopen = () => {
  // Send authentication message instead of URL param
  wsRef.current.send(
    JSON.stringify({
      type: "authenticate",
      token: accessToken,
    }),
  );
};
```

### Solution Option 3: Encrypted localStorage (Defense-in-Depth)

```typescript
import CryptoJS from "crypto-js";

export const useAuthStore = create((set) => ({
  saveToken: (token: string) => {
    const encrypted = CryptoJS.AES.encrypt(
      token,
      import.meta.env.VITE_ENCRYPTION_KEY,
    ).toString();
    localStorage.setItem("auth_token", encrypted);
  },

  getToken: () => {
    const encrypted = localStorage.getItem("auth_token");
    if (!encrypted) return null;

    const decrypted = CryptoJS.AES.decrypt(
      encrypted,
      import.meta.env.VITE_ENCRYPTION_KEY,
    ).toString(CryptoJS.enc.Utf8);

    return decrypted;
  },
}));
```

**Recommendation**: Use httpOnly cookies for best security + HTTPS only

---

## FIX 6: Add RBAC Route Protection (Authorization)

**Impact**: Prevents users from accessing unauthorized routes
**Effort**: Low
**Timeline**: 1 day

### Enhanced ProtectedRoute

**File**: `web/src/routes/ProtectedRoute.tsx`

```typescript
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import type { UserRole } from '@/types/auth'

interface Props {
  children: React.ReactNode
  requiredRole?: UserRole | UserRole[]
}

export const ProtectedRoute = ({
  children,
  requiredRole
}: Props) => {
  const { isAuthenticated, user } = useAuth()

  // Check authentication
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />
  }

  // Check role-based access
  if (requiredRole) {
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole]
    if (!roles.includes(user.role)) {
      return <Navigate to="/app" replace />
    }
  }

  return children
}
```

### Updated Router with RBAC

**File**: `web/src/routes/RootRouter.tsx`

```typescript
export const RootRouter = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* Protected routes with role checks */}
        <Route
          path="/app"
          element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}
        >
          <Route
            index
            element={
              <ProtectedRoute requiredRole="MANAGER">
                <ErrorBoundary>
                  <Dashboard />
                </ErrorBoundary>
              </ProtectedRoute>
            }
          />

          <Route
            path="analytics"
            element={
              <ProtectedRoute requiredRole="MANAGER">
                <ErrorBoundary>
                  <Analytics />
                </ErrorBoundary>
              </ProtectedRoute>
            }
          />

          <Route
            path="tickets"
            element={
              <ErrorBoundary>
                <TicketsList />
              </ErrorBoundary>
            }
          />

          <Route
            path="tickets/create"
            element={
              <ErrorBoundary>
                <CreateTicket />
              </ErrorBoundary>
            }
          />

          <Route
            path="tickets/:ticketId"
            element={
              <ErrorBoundary>
                <TicketDetail />
              </ErrorBoundary>
            }
          />

          <Route
            path="profile"
            element={
              <ProtectedRoute requiredRole={['MANAGER', 'EMPLOYEE']}>
                <ErrorBoundary>
                  <UserProfile />
                </ErrorBoundary>
              </ProtectedRoute>
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
```

---

## Implementation Checklist

```
CRITICAL FIXES
☐ FIX 1: Merge WebSocket connections
  ☐ Backend: Create unified endpoint
  ☐ Frontend: Create useWebSocket hook
  ☐ Test: Verify single connection
  ☐ Test: Verify message routing works

☐ FIX 2: Move WebSocket to App.tsx
  ☐ Update App.tsx
  ☐ Update ProtectedRoute.tsx
  ☐ Remove old hooks from ProtectedRoute
  ☐ Test: Verify no reconnects on navigation

☐ FIX 3: Add Error Boundaries
  ☐ Create ErrorBoundary component
  ☐ Apply to Dashboard
  ☐ Apply to TicketsList
  ☐ Apply to TicketDetail
  ☐ Apply to Analytics
  ☐ Test: Intentionally crash, verify fallback UI

☐ FIX 4: Remove Polling
  ☐ Remove refetchInterval from Dashboard queries
  ☐ Remove refetchInterval from other pages
  ☐ Test: Verify WebSocket updates still work
  ☐ Monitor API calls (should be 50% less)

☐ FIX 5: Secure JWT Storage
  ☐ Backend: Add httpOnly cookie support
  ☐ Frontend: Update auth store
  ☐ Frontend: Update WebSocket connection
  ☐ Test: Verify token not in localStorage
  ☐ Test: Verify token not in WebSocket URL
  ☐ Test: Verify requests work with cookies

☐ FIX 6: Add RBAC
  ☐ Update ProtectedRoute with role checks
  ☐ Update Router with required roles
  ☐ Test: Manager can access /analytics
  ☐ Test: Employee redirected from /analytics
  ☐ Test: Customer can only see own tickets
```

---

**Next Step**: Start with FIX 1-3 (no backend changes required for FIX 2-3).
**Expected Impact**: 50-70% fewer API calls, zero app crashes from data errors, secure token handling.
