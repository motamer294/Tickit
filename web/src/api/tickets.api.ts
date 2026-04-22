/**
 * Tickets API Service
 * Handles ticket CRUD operations, status updates, comments, and analytics
 */

import { getAxiosInstance, APIError } from './config'
import type { Ticket, TicketCreatePayload, TicketStatus, Category, Tag } from '@/types/ticket'

// ============================================
// Type Definitions
// ============================================

export interface TicketCreateRequest {
  title: string
  description: string
  priority?: string
  category_id?: number | null
  tag_ids?: number[]
  assigned_to_id?: number
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
// Category & Tag Operations
// ============================================

/**
 * Fetch all ticket categories
 */
export async function fetchCategoriesApi(): Promise<Category[]> {
  try {
    const client = getAxiosInstance()
    const response = await client.get<Category[]>('/categories')
    return response.data || []
  } catch (error) {
    console.error('Failed to fetch categories:', error)
    return []
  }
}

/**
 * Fetch all tags
 */
export async function fetchTagsApi(): Promise<Tag[]> {
  try {
    const client = getAxiosInstance()
    const response = await client.get<Tag[]>('/tags')
    return response.data || []
  } catch (error) {
    console.error('Failed to fetch tags:', error)
    return []
  }
}

// ============================================
// Ticket Operations
// ============================================

/**
 * Fetch all tickets visible to current user
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
 * Create a new ticket with category, priority, and tags
 */
export async function createTicketApi(
  data: TicketCreatePayload & { assignedToId?: number },
): Promise<Ticket> {
  try {
    const client = getAxiosInstance()
    const payload: TicketCreateRequest = {
      title: data.title,
      description: data.description,
      priority: data.priority,
      category_id: data.category_id || undefined,
      tag_ids: data.tag_ids || [],
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
  timestamp: string
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

// ============================================
// Attachment Operations
// ============================================

/**
 * Upload a file to a ticket
 */
export async function uploadAttachmentApi(ticketId: number, file: File): Promise<any> {
  try {
    const client = getAxiosInstance()
    const formData = new FormData()
    formData.append('file', file)

    const response = await client.post(
      `/tickets/${ticketId}/attachments`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    )
    return response.data
  } catch (error) {
    console.error('❌ Failed to upload attachment:', error)
    throw error
  }
}

/**
 * Delete an attachment
 */
export async function deleteAttachmentApi(attachmentId: number): Promise<any> {
  try {
    const client = getAxiosInstance()
    const response = await client.delete(`/attachments/${attachmentId}`)
    return response.data
  } catch (error) {
    console.error('❌ Failed to delete attachment:', error)
    throw error
  }
}

/**
 * Download attachment as blob (preserves authentication)
 */
export async function downloadAttachmentBlob(attachmentId: number): Promise<Blob> {
  try {
    const client = getAxiosInstance()
    const response = await client.get(`/attachments/${attachmentId}/download`, {
      responseType: 'blob',
    })
    return response.data
  } catch (error) {
    console.error('❌ Failed to download attachment:', error)
    throw error
  }
}

// ============================================
// Search & Filter Operations
// ============================================

export interface SearchFilters {
  query?: string
  status?: string
  priority?: string
  category_id?: number
  tag_ids?: string // comma-separated
  assigned_to_id?: number
  created_from?: string // ISO date
  created_to?: string // ISO date
}

/**
 * Search tickets with filters
 */
export async function searchTicketsApi(filters: SearchFilters): Promise<Ticket[]> {
  try {
    const client = getAxiosInstance()
    const params = {
      ...(filters.query && { query: filters.query }),
      ...(filters.status && { status: filters.status }),
      ...(filters.priority && { priority: filters.priority }),
      ...(filters.category_id && { category_id: filters.category_id }),
      ...(filters.tag_ids && { tag_ids: filters.tag_ids }),
      ...(filters.assigned_to_id && { assigned_to_id: filters.assigned_to_id }),
      ...(filters.created_from && { created_from: filters.created_from }),
      ...(filters.created_to && { created_to: filters.created_to }),
    }

    console.log('🔍 Searching with params:', params)
    const response = await client.get<Ticket[]>('/search/tickets', { params })
    const data = response.data
    console.log('✅ Search results:', data)
    return Array.isArray(data) ? data : []
  } catch (error: any) {
    console.error('❌ Failed to search tickets:')
    console.error('   Error:', error.message)
    console.error('   Status:', error.response?.status)
    console.error('   Response:', error.response?.data)
    console.error('   Full error:', error)
    return []
  }
}
