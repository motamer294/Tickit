/**
 * Tickets API Service
 * Handles ticket CRUD operations, status updates, comments, and analytics
 */

import { getAxiosInstance, APIError } from './config'
import type { Ticket, TicketCreatePayload, TicketStatus } from '@/types/ticket'

// ============================================
// Type Definitions
// ============================================

export interface TicketCreateRequest {
  title: string
  description: string
  assigned_to_id?: number // Option A: Manual assignment
  auto_assign?: boolean // Option C: Auto-assign by workload
}

export interface TicketStatusUpdateRequest {
  status: TicketStatus
}

export interface CommentPayload {
  text: string
}

export interface Employee {
  id: number
  username: string
}

export interface Comment {
  id: number
  ticket_id: number
  text: string
  author_id: number
  author_username: string
  is_internal: boolean
  created_at: string
}

export interface DashboardStats {
  total_tickets: number
  open_tickets: number
  resolved_tickets: number
  avg_resolution_time_hours: number
  tickets_by_category: Record<string, number>
  tickets_by_priority: Record<string, number>
  sentiment_analysis: Record<string, number>
}

// ============================================
// Ticket Operations
// ============================================

/**
 * Fetch all tickets visible to current user
 * - CUSTOMER: sees own tickets
 * - EMPLOYEE: sees all (filtered on backend)
 * - MANAGER: sees all
 */
export async function fetchTickets(): Promise<Ticket[]> {
  try {
    const client = getAxiosInstance()
    const response = await client.get<Ticket[]>('/my-tickets')
    // Ensure response.data is always an array
    const data = response.data
    if (!Array.isArray(data)) {
      console.warn('[API] fetchTickets returned non-array data:', data)
      return []
    }
    return data
  } catch (error) {
    if (error instanceof APIError && error.statusCode === 401) {
      throw new Error('Session expired. Please login again.')
    }
    throw error
  }
}

/**
 * Fetch all employees for assignment dropdown
 * MANAGER ONLY - Returns list of employees for Option A
 */
export async function fetchEmployeesApi(): Promise<Employee[]> {
  try {
    const client = getAxiosInstance()
    const response = await client.get<Employee[]>('/employees')
    return response.data
  } catch (error) {
    if (error instanceof APIError && error.statusCode === 403) {
      throw new Error('Only managers can view employees')
    }
    throw error
  }
}

/**
 * Fetch a single ticket by ID
 * User must have permission to view (creator, assignee, or manager)
 */
export async function fetchTicketById(ticketId: number): Promise<Ticket> {
  try {
    const client = getAxiosInstance()
    const response = await client.get<Ticket>(`/tickets/${ticketId}`)
    return response.data
  } catch (error) {
    if (error instanceof APIError) {
      if (error.statusCode === 404) {
        throw new Error('Ticket not found')
      } else if (error.statusCode === 403) {
        throw new Error('You do not have permission to view this ticket')
      }
    }
    throw error
  }
}

/**
 * Create a new ticket
 * Calls AI service to analyze and categorize
 * Only CUSTOMER and EMPLOYEE can create
 *
 * @param autoAssign - Option C: Auto-assign to employee with lowest workload
 * @param assignedToId - Option A: Manually assign to specific employee
 */
export async function createTicketApi(
  data: TicketCreatePayload & { autoAssign?: boolean; assignedToId?: number },
): Promise<Ticket> {
  try {
    const client = getAxiosInstance()
    const payload: TicketCreateRequest = {
      title: data.title,
      description: data.description,
      auto_assign: data.autoAssign || false,
      assigned_to_id: data.assignedToId,
    }
    const response = await client.post<Ticket>('/tickets', payload)
    return response.data
  } catch (error) {
    if (error instanceof APIError) {
      if (error.statusCode === 400) {
        throw new Error('Invalid ticket data. Check title and description.')
      }
    }
    throw error
  }
}

/**
 * Update ticket status
 * Only assigned employee or manager can update
 * Valid statuses: OPEN, IN_PROGRESS, RESOLVED, CLOSED
 */
export async function updateTicketStatusApi(
  ticketId: number,
  status: TicketStatus,
): Promise<Ticket> {
  try {
    const client = getAxiosInstance()
    const payload: TicketStatusUpdateRequest = { status }
    const response = await client.patch<Ticket>(
      `/tickets/${ticketId}/status`,
      payload,
    )
    return response.data
  } catch (error) {
    if (error instanceof APIError) {
      if (error.statusCode === 403) {
        throw new Error('You do not have permission to update this ticket')
      } else if (error.statusCode === 400) {
        throw new Error('Invalid status value')
      }
    }
    throw error
  }
}

/**
 * Assign a ticket to an employee
 * MANAGER ONLY operation
 * Automatically transitions ticket to IN_PROGRESS
 */
export async function assignTicketApi(
  ticketId: number,
  employeeId: number,
): Promise<Ticket> {
  try {
    const client = getAxiosInstance()
    const response = await client.patch<Ticket>(
      `/tickets/${ticketId}/assign/${employeeId}`,
      {},
    )
    return response.data
  } catch (error) {
    if (error instanceof APIError) {
      if (error.statusCode === 403) {
        throw new Error('Only managers can assign tickets')
      } else if (error.statusCode === 404) {
        throw new Error('Ticket or employee not found')
      }
    }
    throw error
  }
}

// ============================================
// Comment Operations
// ============================================

/**
 * Add a comment to a ticket
 * Can be added by: creator, assignee, or manager
 */
export async function addCommentApi(
  ticketId: number,
  text: string,
): Promise<Comment> {
  try {
    const client = getAxiosInstance()
    const payload: CommentPayload = { text }
    const response = await client.post<Comment>(
      `/tickets/${ticketId}/comments`,
      payload,
    )
    return response.data
  } catch (error) {
    if (error instanceof APIError) {
      if (error.statusCode === 403) {
        throw new Error('You do not have permission to comment on this ticket')
      } else if (error.statusCode === 404) {
        throw new Error('Ticket not found')
      }
    }
    throw error
  }
}

/**
 * Fetch all comments for a ticket
 * User must have permission to view ticket
 */
export async function fetchTicketComments(
  ticketId: number,
): Promise<Comment[]> {
  try {
    const client = getAxiosInstance()
    const response = await client.get<Comment[]>(
      `/tickets/${ticketId}/comments`,
    )
    return response.data
  } catch (error) {
    if (error instanceof APIError && error.statusCode === 404) {
      // Return empty array instead of throwing - ticket might not have comments
      return []
    }
    throw error
  }
}

// ============================================
// Employee Operations (EMPLOYEE ROLE)
// ============================================

/**
 * List all assigned tasks for current employee
 * Only EMPLOYEE role can call this
 */
export async function fetchEmployeeTasks(): Promise<Ticket[]> {
  try {
    const client = getAxiosInstance()
    const response = await client.get<Ticket[]>('/employee/tasks')
    return response.data
  } catch (error) {
    if (error instanceof APIError) {
      if (error.statusCode === 403) {
        throw new Error('Only employees can view tasks')
      }
    }
    throw error
  }
}

/**
 * Delete a ticket
 * MANAGER ONLY operation
 */
export async function deleteTicketApi(ticketId: number): Promise<void> {
  try {
    const client = getAxiosInstance()
    await client.delete(`/tickets/${ticketId}`)
  } catch (error) {
    if (error instanceof APIError) {
      if (error.statusCode === 403) {
        throw new Error('Only managers can delete tickets')
      } else if (error.statusCode === 404) {
        throw new Error('Ticket not found')
      }
    }
    throw error
  }
}

/**
 * Update ticket details (title, description)
 * MANAGER ONLY operation
 */
export async function updateTicketApi(
  ticketId: number,
  data: { title: string; description: string },
): Promise<Ticket> {
  try {
    const client = getAxiosInstance()
    const response = await client.patch<Ticket>(`/tickets/${ticketId}`, data)
    return response.data
  } catch (error) {
    if (error instanceof APIError) {
      if (error.statusCode === 403) {
        throw new Error('Only managers can edit tickets')
      } else if (error.statusCode === 404) {
        throw new Error('Ticket not found')
      } else if (error.statusCode === 400) {
        throw new Error('Invalid ticket data')
      }
    }
    throw error
  }
}

// ============================================
// Analytics Operations (MANAGER ROLE)
// ============================================

/**
 * Fetch dashboard analytics and statistics
 * MANAGER ONLY operation
 * Includes: total tickets, resolution times, category breakdown, sentiment analysis
 */
export async function fetchAnalyticsDashboard(): Promise<DashboardStats> {
  try {
    const client = getAxiosInstance()
    const response = await client.get<DashboardStats>('/analytics/dashboard')
    return response.data
  } catch (error) {
    if (error instanceof APIError) {
      if (error.statusCode === 403) {
        throw new Error('Only managers can view analytics')
      }
    }
    throw error
  }
}

// ============================================
// Chat Operations
// ============================================

export interface ChatMessage {
  id: number
  ticket_id: number
  sender_id: number
  sender_username: string
  message: string
  created_at: string
}

/**
 * Fetch chat messages for a ticket
 * User must have permission to view ticket
 */
export async function fetchChatMessages(ticketId: number): Promise<ChatMessage[]> {
  try {
    const client = getAxiosInstance()
    const response = await client.get<ChatMessage[]>(
      `/tickets/${ticketId}/chat`,
    )
    return response.data
  } catch (error) {
    if (error instanceof APIError) {
      if (error.statusCode === 404) {
        return []
      } else if (error.statusCode === 403) {
        throw new Error('You do not have permission to view this ticket')
      }
    }
    throw error
  }
}

// ============================================
// Notifications Operations
// ============================================

export interface NotificationData {
  id: number
  type: string
  title: string
  message: string
  ticket_id?: number
  read: boolean
  created_at: string
}

/**
 * Fetch user's notifications
 * Loads recent notification history
 */
export async function fetchNotifications(limit: number = 20): Promise<NotificationData[]> {
  try {
    const client = getAxiosInstance()
    const response = await client.get<NotificationData[]>(
      `/notifications/?limit=${limit}`,
    )
    return Array.isArray(response.data) ? response.data : []
  } catch (error) {
    if (error instanceof APIError) {
      if (error.statusCode === 404) {
        return []
      }
    }
    console.warn('Failed to fetch notifications:', error)
    return []
  }
}
