# ⚡ QUICK REFERENCE: Critical Issues & Fixes

## 🔴 CRITICAL (Fix This Week)

### 1. WebSocket Token Exposed in URL

**File**: `src/hooks/useNotificationWebSocket.ts:36` & `src/hooks/useRealtimeData.ts:29`

**Issue**: Token visible in browser DevTools and server logs

```typescript
// ❌ BAD
const wsURL = `ws://localhost:8000/ws/notifications/?token=${accessToken}`;

// ✅ GOOD
const wsURL = `ws://localhost:8000/ws/notifications/`;
ws.send(JSON.stringify({ type: "authenticate", token: accessToken }));
```

**Impact**: Token theft via network inspection
**Time**: 2 hours

---

### 2. Unrestricted Role Selection in Signup

**File**: `src/pages/auth/Signup.tsx:48`

**Issue**: Users can self-register as MANAGER

```typescript
// ❌ BAD
data={[
  { value: 'CUSTOMER', label: 'Customer' },
  { value: 'EMPLOYEE', label: 'Employee' },
  { value: 'MANAGER', label: 'Manager' },
]}

// ✅ GOOD - Frontend only shows CUSTOMER
data={[{ value: 'CUSTOMER', label: 'Customer' }]}
// Backend must validate role in signup endpoint
```

**Impact**: Privilege escalation
**Time**: 30 minutes

---

### 3. No Error Boundary

**Files**: Multiple crash scenarios

**Issue**: Single component error crashes entire app

```typescript
// ✅ ADD: src/components/ErrorBoundary.tsx
class ErrorBoundary extends React.Component {
  getDerivedStateFromError() { return { hasError: true } }
  render() {
    if (this.state.hasError) return <ErrorUI />
    return this.props.children
  }
}

// Wrap in src/App.tsx:
<ErrorBoundary>
  <ReactQueryProvider>...</ReactQueryProvider>
</ErrorBoundary>
```

**Impact**: Poor user experience on crashes
**Time**: 1.5 hours

---

## 🟡 HIGH (Fix This Sprint)

### 4. No Memoization (Performance)

**Files**: `src/pages/dashboard/Dashboard.tsx:100`, `src/pages/tickets/TicketsList.tsx:52`

**Issue**: Expensive calculations on every render

```typescript
// ❌ BAD - runs every render
const stats = { total: tickets.length, open: tickets.filter(...) }

// ✅ GOOD - only updates when tickets changes
const stats = useMemo(() => ({
  total: tickets.length,
  open: tickets.filter((t) => t.status === 'OPEN').length,
}), [tickets])
```

**Impact**: UI lag with large datasets
**Time**: 1 hour

---

### 5. Duplicate WebSocket Connections

**File**: `src/routes/ProtectedRoute.tsx:31`

**Issue**: Two separate WebSocket connections from same user

```typescript
// ❌ BAD - creates 2 connections
useNotificationWebSocket(); // → ws://localhost:8000/ws/notifications/
useRealtimeData(); // → ws://localhost:8000/ws/realtime/

// ✅ GOOD - single connection
useWebSocket(); // → ws://localhost:8000/ws/unified/
```

**Impact**: Doubled server load, wasted bandwidth
**Time**: 3 hours

---

### 6. Polling + WebSocket

**File**: `src/pages/dashboard/Dashboard.tsx:80`

**Issue**: Fetching same data every 30 seconds AND via WebSocket

```typescript
// Remove one:
// Option A: Remove polling if WebSocket reliable
// Option B: Remove WebSocket if polling sufficient
```

**Impact**: Redundant network traffic
**Time**: 30 minutes

---

## 🟠 MEDIUM (Address Soon)

### 7. Weak Password Validation

**File**: `src/pages/auth/Signup.tsx:24`

**Current**: Only checks length ≥ 6
**Required**: Uppercase + lowercase + number + special char

```typescript
password: (val) => {
  if (val.length < 8) return "Min 8 chars";
  if (!/[A-Z]/.test(val)) return "Need uppercase";
  if (!/[0-9]/.test(val)) return "Need number";
  if (!/[!@#$%^&*]/.test(val)) return "Need special char";
  return null;
};
```

**Time**: 1 hour

---

### 8. Duplicate useLogin Hooks

**Files**: `src/hooks/useAuth.ts` (good) vs `src/hooks/useLogin.ts` (delete)

**Fix**: Delete `src/hooks/useLogin.ts` and use only the one in `useAuth.ts`

**Time**: 15 minutes

---

### 9. Missing Retry UI

**Files**: All error states

**Current**: Shows error message only
**Better**: Add "Try Again" button

```typescript
if (error) {
  return (
    <>
      <Alert color="red">{error.message}</Alert>
      <Button onClick={() => refetch()}>Try Again</Button>
    </>
  )
}
```

**Time**: 1.5 hours

---

## ✅ Good Practices (Keep Doing)

- ✅ Type-safe TypeScript everywhere
- ✅ No XSS vulnerabilities (no innerHTML/dangerouslySetInnerHTML)
- ✅ No exposed credentials in code
- ✅ Proper error handling in API layer
- ✅ RBAC functions well-organized
- ✅ WebSocket cleanup on component unmount
- ✅ Query deduplication via React Query

---

## 📊 Priority Matrix

```
           Effort
        Low     High
Impact
  High  #7,#8   #1,#2,#3,#4,#5
  Low   #9      #6
```

**Do First**: #1, #2, #3 (security)
**Do Second**: #4, #5, #6 (performance)
**Do Third**: #7, #8, #9 (polish)

---

## 🎯 Success Criteria After Fixes

- [ ] 0 tokens in WebSocket URLs
- [ ] 0 ability to self-register as admin
- [ ] 0 app crashes on component errors
- [ ] 0 users can see 401 → auto-redirect working
- [ ] Password requires: length + uppercase + number + special char
- [ ] Single WebSocket connection per user
- [ ] No double-polling
- [ ] Dashboard renders smoothly with 500+ tickets
- [ ] "Retry" button on all error states
- [ ] Only 1 useLogin hook in codebase

---

## 📞 Need Help?

All detailed implementation code is in [WEB_AUDIT_CRITICAL_FIXES.md](WEB_AUDIT_CRITICAL_FIXES.md)

For specific file changes, see [WEB_CODEBASE_AUDIT_REPORT.md](WEB_CODEBASE_AUDIT_REPORT.md) - all issues have direct file:line references

---

**Last Updated**: April 13, 2026
**Status**: Ready for Implementation
**Estimated Total Time**: ~11 hours
