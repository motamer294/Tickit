import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useWebSocket } from '@/hooks/useWebSocket'
import type { UserRole } from '@/types/ticket'
import type { JSX } from 'react'
import { hasAnyRole } from '@/utils/rbac'

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
 * Also initializes unified WebSocket for notifications + real-time data
 */
export default function ProtectedRoute({
  children,
  requiredRoles,
  fallback,
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, userRole } = useAuth()

  // Initialize single unified WebSocket for both notifications AND real-time updates
  useWebSocket()

  // Show nothing while checking auth state
  if (isLoading) {
    return null
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
