import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import type { UserRole } from '@/types/ticket'
import type { JSX } from 'react'
import { hasAnyRole } from '@/utils/rbac'
import { Center, Loader } from '@mantine/core'

interface ProtectedRouteProps {
  children: JSX.Element
  requiredRoles?: UserRole[]
  fallback?: JSX.Element
}

/**
 * ProtectedRoute: Checks authentication and authorization
 * Redirects to login if not authenticated
 * Redirects to dashboard if authenticated but lacking permission
 *
 * WebSocket is now initialized by WebSocketProvider in App.tsx
 */
export default function ProtectedRoute({
  children,
  requiredRoles,
  fallback,
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, userRole } = useAuth()

  // Show loading spinner while checking auth state (e.g., validating tokens after page refresh)
  if (isLoading) {
    return (
      <Center style={{ height: '100vh' }}>
        <Loader size="lg" />
      </Center>
    )
  }

  // Not authenticated -> redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  // Authenticated but lacking permission -> show fallback or redirect
  if (requiredRoles && !hasAnyRole(userRole, requiredRoles)) {
    if (fallback) {
      return fallback
    }
    // Redirect to dashboard with 403 hint
    return <Navigate to="/dashboard?error=forbidden" replace />
  }

  // All checks passed
  return children
}
