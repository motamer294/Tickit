/**
 * ProtectedRoute Component
 * Guards routes from unauthorized access
 * Supports role-based and permission-based access control
 *
 * Example Usage:
 * <ProtectedRoute requiredRoles={['MANAGER']}>
 *   <UserManagement />
 * </ProtectedRoute>
 */

import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useNotificationWebSocket } from '@/hooks/useNotificationWebSocket'
import { useRealtimeData } from '@/hooks/useRealtimeData'
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
 */
export default function ProtectedRoute({
  children,
  requiredRoles,
  fallback,
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, userRole } = useAuth()

  // Initialize WebSocket for real-time notifications
  useNotificationWebSocket()

  // Initialize WebSocket for real-time data updates
  useRealtimeData()

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
