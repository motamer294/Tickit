/**
 * Type Definitions for Help Desk Frontend
 * Ensures type safety across the application
 */

// ============================================
// Category & Tag Types
// ============================================

export interface Category {
  id: number
  name: string
  description: string
  color: string
}

export interface Tag {
  id: number
  name: string
  color: string
}

// ============================================
// User Types
// ============================================

export type UserRole = 'MANAGER' | 'EMPLOYEE' | 'CUSTOMER'

export interface User {
  id: number
  username: string
  role: UserRole
}

// ============================================
// Attachment Types
// ============================================

export interface Attachment {
  id: number
  filename: string
  file_size: number  // bytes
  uploaded_by_username: string
  uploaded_at: string  // ISO 8601
  file_url?: string
}

// ============================================
// Ticket Types
// ============================================

export type TicketStatus = 'OPEN' | 'PENDING' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED'

export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

export type TicketSentiment = 'Positive' | 'Neutral' | 'Negative'

export type AiStatus = 'PENDING' | 'PROCESSING' | 'DONE' | 'FAILED'

export interface Ticket {
  id: number
  title: string
  description: string
  status: TicketStatus

  // Category & Priority
  category: Category | null
  priority: TicketPriority
  tags: Tag[]
  attachments?: Attachment[]

  // AI triage status
  ai_status?: AiStatus

  // Sentiment (from AI, if available)
  sentiment?: string
  ai_suggested_solution?: string

  // People involved
  created_by?: User | string
  created_by_id?: number
  creator_id?: number
  creator_username: string

  assigned_to?: User | string
  assigned_to_id?: number | null
  assigned_to_username: string | 'Unassigned'

  // Timestamps
  created_at: string // ISO 8601
  updated_at?: string
  resolved_at?: string | null

  // Status transitions
  available_transitions?: Array<{ status: TicketStatus; label: string }>
}

export interface TicketCreatePayload {
  title: string
  description: string
  priority?: TicketPriority
  category_id?: number | null
  tag_ids?: number[]
}

export interface TicketStatusUpdatePayload {
  status: TicketStatus
}

// ============================================
// Comment Types
// ============================================

export interface Comment {
  id: number
  ticket_id: number
  text: string
  author: User | string
  author_id?: number
  author_username: string
  is_internal: boolean // Only visible to EMPLOYEE + MANAGER
  created_at: string
}

export interface CommentCreatePayload {
  text: string
}

// ============================================
// Chat Types
// ============================================

export interface ChatMessage {
  id: number
  ticket_id: number
  message: string
  sender_id: number
  sender_username: string
  timestamp: string
}

export interface ChatMessagePayload {
  ticket_id: number
  message: string
}

// ============================================
// Analytics Types
// ============================================

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
// API Response Types
// ============================================

export interface LoginResponse {
  access: string
  refresh: string
  id?: number
  username?: string
  role?: UserRole
}

export interface SignupResponse {
  id: number
  username: string
  role: UserRole
  access: string
  refresh: string
}

// ============================================
// Filter & Pagination Types (for future use)
// ============================================

export interface TicketFilter {
  status?: TicketStatus
  category?: string
  priority?: TicketPriority
  assigned_to_id?: number | null
  created_by_id?: number
  created_after?: string
  created_before?: string
}

export interface PaginationParams {
  page: number
  pageSize: number
}

export interface PaginatedResponse<T> {
  items: T[]
  totalCount: number
  page: number
  pageSize: number
  totalPages: number
}
