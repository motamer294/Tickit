/**
 * Admin API Service
 * Handles admin operations: user management, SLA configuration, and audit logs
 */

import { getAxiosInstance, APIError } from './config'
import { AxiosError } from 'axios'

// ============================================
// Type Definitions
// ============================================

export interface User {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
  role: 'MANAGER' | 'EMPLOYEE' | 'CUSTOMER'
  is_active: boolean
  date_joined: string
}

export interface UserCreatePayload {
  username: string
  email: string
  password: string
  first_name: string
  last_name: string
  role: 'MANAGER' | 'EMPLOYEE' | 'CUSTOMER'
}

export interface UserUpdatePayload {
  email?: string
  first_name?: string
  last_name?: string
  role?: 'MANAGER' | 'EMPLOYEE' | 'CUSTOMER'
  is_active?: boolean
}

export interface SLA {
  id: number
  name: string
  description?: string
  priority: 'HIGH' | 'MEDIUM' | 'LOW'
  category_id: number
  category_name?: string
  response_time_hours: number
  resolution_time_hours: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface SLACreatePayload {
  name: string
  description?: string
  priority: 'HIGH' | 'MEDIUM' | 'LOW'
  category_id: number
  response_time_hours: number
  resolution_time_hours: number
}

export interface SLAUpdatePayload {
  name?: string
  description?: string
  priority?: 'HIGH' | 'MEDIUM' | 'LOW'
  category_id?: number
  response_time_hours?: number
  resolution_time_hours?: number
  is_active?: boolean
}

export interface AuditLog {
  id: number
  action_type: string
  performed_by_id: number
  performed_by_username: string
  ticket_id?: number
  user_id?: number
  description: string
  old_value?: string
  new_value?: string
  metadata?: Record<string, any>
  ip_address?: string
  created_at: string
}

// ============================================
// User Management APIs
// ============================================

/**
 * List all users with pagination
 */
export async function listUsers(limit = 100, offset = 0): Promise<User[]> {
  try {
    const client = getAxiosInstance()
    const response = await client.get<User[]>('/admin/users', {
      params: { limit, offset },
    })
    return response.data
   } catch (error) {
    if (error instanceof AxiosError) {
      throw new APIError(error.response?.status || 500, error.response?.data?.message || 'Failed to fetch users')
    }
    throw error
  }
}

/**
 * Create a new user
 */
export async function createUser(payload: UserCreatePayload): Promise<User> {
  try {
    const client = getAxiosInstance()
    const response = await client.post<User>('/admin/users', payload)
    return response.data
  } catch (error) {
    if (error instanceof AxiosError) {
      throw new APIError(error.response?.status || 500, error.response?.data?.message || 'Failed to create user')
    }
    throw error
  }
}

/**
 * Update a user
 */
export async function updateUser(userId: number, payload: UserUpdatePayload): Promise<User> {
  try {
    const client = getAxiosInstance()
    const response = await client.patch<User>(`/admin/users/${userId}`, payload)
    return response.data
  } catch (error) {
    if (error instanceof AxiosError) {
      throw new APIError(error.response?.status || 500, error.response?.data?.message || 'Failed to update user')
    }
    throw error
  }
}

/**
 * Deactivate a user
 */
export async function deactivateUser(userId: number): Promise<void> {
  try {
    const client = getAxiosInstance()
    await client.delete(`/admin/users/${userId}`)
  } catch (error) {
    if (error instanceof AxiosError) {
      throw new APIError(error.response?.status || 500, error.response?.data?.message || 'Failed to deactivate user')
    }
    throw error
  }
}

// ============================================
// SLA Management APIs
// ============================================

/**
 * List all SLAs with pagination
 */
export async function listSLAs(limit = 100, offset = 0): Promise<SLA[]> {
  try {
    const client = getAxiosInstance()
    const response = await client.get<SLA[]>('/admin/slas', {
      params: { limit, offset },
    })
    return response.data
  } catch (error) {
    if (error instanceof AxiosError) {
      throw new APIError(error.response?.status || 500, error.response?.data?.message || 'Failed to fetch SLAs')
    }
    throw error
  }
}

/**
 * Create a new SLA
 */
export async function createSLA(payload: SLACreatePayload): Promise<SLA> {
  try {
    const client = getAxiosInstance()
    const response = await client.post<SLA>('/admin/slas', payload)
    return response.data
  } catch (error) {
    if (error instanceof AxiosError) {
      throw new APIError(error.response?.status || 500, error.response?.data?.message || 'Failed to create SLA')
    }
    throw error
  }
}

/**
 * Update an SLA
 */
export async function updateSLA(slaId: number, payload: SLAUpdatePayload): Promise<SLA> {
  try {
    const client = getAxiosInstance()
    const response = await client.patch<SLA>(`/admin/slas/${slaId}`, payload)
    return response.data
  } catch (error) {
    if (error instanceof AxiosError) {
      throw new APIError(error.response?.status || 500, error.response?.data?.message || 'Failed to update SLA')
    }
    throw error
  }
}

/**
 * Delete an SLA
 */
export async function deleteSLA(slaId: number): Promise<void> {
  try {
    const client = getAxiosInstance()
    await client.delete(`/admin/slas/${slaId}`)
  } catch (error) {
    if (error instanceof AxiosError) {
      throw new APIError(error.response?.status || 500, error.response?.data?.message || 'Failed to delete SLA')
    }
    throw error
  }
}

// ============================================
// Audit Log APIs
// ============================================

/**
 * List audit logs with optional filters
 */
export async function listAuditLogs(
  ticketId?: number,
  actionType?: string,
  limit = 100,
  offset = 0
): Promise<AuditLog[]> {
  try {
    const client = getAxiosInstance()
    const response = await client.get<AuditLog[]>('/admin/audit-logs', {
      params: { ticket_id: ticketId, action_type: actionType, limit, offset },
    })
    return response.data
  } catch (error) {
    if (error instanceof AxiosError) {
      throw new APIError(error.response?.status || 500, error.response?.data?.message || 'Failed to fetch audit logs')
    }
    throw error
  }
}

/**
 * Get audit logs for a specific ticket
 */
export async function getTicketAuditLogs(ticketId: number, limit = 50, offset = 0): Promise<AuditLog[]> {
  try {
    const client = getAxiosInstance()
    const response = await client.get<AuditLog[]>(`/admin/audit-logs/ticket/${ticketId}`, {
      params: { limit, offset },
    })
    return response.data
  } catch (error) {
    if (error instanceof AxiosError) {
      throw new APIError(error.response?.status || 500, error.response?.data?.message || 'Failed to fetch ticket audit logs')
    }
    throw error
  }
}
