/**
 * Role-Based Access Control (RBAC) Utilities
 * Centralized permission checks and guards
 */

import type { UserRole } from '@/types/ticket'
import type { Ticket } from '@/types/ticket'

// ============================================
// Role Constants
// ============================================

export const Role = {
  MANAGER: 'MANAGER',
  EMPLOYEE: 'EMPLOYEE',
  CUSTOMER: 'CUSTOMER',
} as const

export type RoleValue = (typeof Role)[keyof typeof Role]

// ============================================
// Role Hierarchy & Checks
// ============================================

/**
 * Check if user has a specific role
 */
export function hasRole(
  userRole: UserRole | null,
  requiredRole: (typeof Role)[keyof typeof Role],
): boolean {
  return userRole === requiredRole
}

/**
 * Check if user has any of the specified roles
 */
export function hasAnyRole(
  userRole: UserRole | null,
  roles: RoleValue[],
): boolean {
  return roles.includes(userRole as RoleValue)
}

/**
 * Check if user role is at least the specified level
 * Manager > Employee > Customer
 */
export function isRoleAtLeast(
  userRole: UserRole | null,
  minRole: RoleValue,
): boolean {
  const hierarchy: Record<RoleValue, number> = {
    [Role.MANAGER]: 3,
    [Role.EMPLOYEE]: 2,
    [Role.CUSTOMER]: 1,
  }

  return (hierarchy[userRole as RoleValue] || 0) >= hierarchy[minRole]
}

// ============================================
// Feature Permissions
// ============================================

/**
 * Can user create a ticket?
 * CUSTOMER, EMPLOYEE, MANAGER can create
 */
export function canCreateTicket(userRole: UserRole | null): boolean {
  return hasAnyRole(userRole, [Role.CUSTOMER, Role.EMPLOYEE, Role.MANAGER])
}

/**
 * Can user view a specific ticket?
 * - MANAGER: can view all
 * - EMPLOYEE: can view all (filtered on backend)
 * - CUSTOMER: can view only own tickets
 */
export function canViewTicket(
  userRole: UserRole | null,
  userId: number | null,
  ticket: Ticket | null,
): boolean {
  if (!userRole || !userId || !ticket) return false

  // Manager can view all
  if (hasRole(userRole, Role.MANAGER)) return true

  // Employee can view all (backend enforces filtering)
  if (hasRole(userRole, Role.EMPLOYEE)) return true

  // Customer can only view own tickets
  if (hasRole(userRole, Role.CUSTOMER)) {
    const creatorId =
      typeof ticket.created_by === 'object'
        ? ticket.created_by.id
        : ticket.created_by_id
    return creatorId === userId
  }

  return false
}

/**
 * Can user comment on a ticket?
 * - MANAGER: can comment on any
 * - EMPLOYEE: can comment on assigned
 * - CUSTOMER: can comment on own
 */
export function canCommentOnTicket(
  userRole: UserRole | null,
  userId: number | null,
  ticket: Ticket | null,
): boolean {
  if (!userRole || !userId || !ticket) return false

  // Manager can comment on any
  if (hasRole(userRole, Role.MANAGER)) return true

  // Employee can comment on assigned tickets
  if (hasRole(userRole, Role.EMPLOYEE)) {
    const assigneeId =
      typeof ticket.assigned_to === 'object'
        ? ticket.assigned_to.id
        : ticket.assigned_to_id
    return assigneeId === userId
  }

  // Customer can comment on own tickets
  if (hasRole(userRole, Role.CUSTOMER)) {
    const creatorId =
      typeof ticket.created_by === 'object'
        ? ticket.created_by.id
        : ticket.created_by_id
    return creatorId === userId
  }

  return false
}

/**
 * Can user update ticket status?
 * - MANAGER: can update any
 * - EMPLOYEE: can update assigned
 * - CUSTOMER: cannot update
 */
export function canUpdateTicketStatus(
  userRole: UserRole | null,
  userId: number | null,
  ticket: Ticket | null,
): boolean {
  if (!userRole || !userId || !ticket) return false

  // Manager can update any
  if (hasRole(userRole, Role.MANAGER)) return true

  // Employee can update assigned
  if (hasRole(userRole, Role.EMPLOYEE)) {
    const assigneeId =
      typeof ticket.assigned_to === 'object'
        ? ticket.assigned_to.id
        : ticket.assigned_to_id
    return assigneeId === userId
  }

  return false
}

/**
 * Can user assign a ticket?
 * Only MANAGER can assign
 */
export function canAssignTicket(userRole: UserRole | null): boolean {
  return hasRole(userRole, Role.MANAGER)
}

/**
 * Can user view analytics dashboard?
 * Only MANAGER can view analytics
 */
export function canViewAnalytics(userRole: UserRole | null): boolean {
  return hasRole(userRole, Role.MANAGER)
}

/**
 * Can user view employee tasks list?
 * Only EMPLOYEE can view own tasks
 */
export function canViewEmployeeTasks(userRole: UserRole | null): boolean {
  return hasRole(userRole, Role.EMPLOYEE)
}

// ============================================
// Route Protection
// ============================================

/**
 * Get accessible routes for a user role
 * Used for route protection and navigation visibility
 */
export function getAccessibleRoutes(userRole: UserRole | null): string[] {
  const baseRoutes = ['/login', '/signup'] // Always accessible
  if (!userRole) return baseRoutes

  if (hasRole(userRole, Role.MANAGER)) {
    return [
      ...baseRoutes,
      '/dashboard',
      '/tickets',
      '/tickets/:id',
      '/analytics',
      '/teams', // employees management
    ]
  }

  if (hasRole(userRole, Role.EMPLOYEE)) {
    return [
      ...baseRoutes,
      '/dashboard',
      '/tickets',
      '/tickets/:id',
      '/tasks', // assigned tasks
    ]
  }

  if (hasRole(userRole, Role.CUSTOMER)) {
    return [
      ...baseRoutes,
      '/dashboard',
      '/tickets',
      '/tickets/:id',
      '/create-ticket',
    ]
  }

  return baseRoutes
}

/**
 * Get user-friendly role display name
 */
export function getRoleDisplayName(role: UserRole | null): string {
  const names: Record<RoleValue, string> = {
    [Role.MANAGER]: 'Manager',
    [Role.EMPLOYEE]: 'Support Agent',
    [Role.CUSTOMER]: 'Customer',
  }
  return names[role as RoleValue] || 'Unknown'
}

/**
 * Get role color for UI applications
 */
export function getRoleColor(role: UserRole | null): string {
  const colors: Record<RoleValue, string> = {
    [Role.MANAGER]: 'red',
    [Role.EMPLOYEE]: 'blue',
    [Role.CUSTOMER]: 'gray',
  }
  return colors[role as RoleValue] || 'gray'
}

// ============================================
// Permission Check Utilities
// ============================================

/**
 * Get all permissions for a role
 * Useful for detailed permission info
 */
export function getRolePermissions(
  role: UserRole | null,
): Record<string, boolean> {
  return {
    canCreateTicket: canCreateTicket(role),
    canAssignTicket: canAssignTicket(role),
    canViewAnalytics: canViewAnalytics(role),
    canViewEmployeeTasks: canViewEmployeeTasks(role),
    isManager: hasRole(role, Role.MANAGER),
    isEmployee: hasRole(role, Role.EMPLOYEE),
    isCustomer: hasRole(role, Role.CUSTOMER),
  }
}
