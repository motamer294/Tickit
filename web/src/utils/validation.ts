/**
 * Form Validation & Constants
 * Centralized validation rules and application constants
 */

// ============================================
// Ticket Constants
// ============================================

export const TICKET_STATUSES = [
  { label: 'Open', value: 'OPEN' },
  { label: 'In Progress', value: 'IN_PROGRESS' },
  { label: 'Resolved', value: 'RESOLVED' },
  { label: 'Closed', value: 'CLOSED' },
] as const

export const TICKET_PRIORITIES = [
  { label: 'High', value: 'HIGH' },
  { label: 'Medium', value: 'MEDIUM' },
  { label: 'Low', value: 'LOW' },
] as const

export const TICKET_SENTIMENTS = ['Positive', 'Neutral', 'Negative'] as const

// ============================================
// Validation Rules
// ============================================

export const VALIDATION_RULES = {
  username: {
    min: 3,
    max: 30,
    pattern: /^[a-zA-Z0-9_-]+$/,
    message: 'Username must be 3-30 characters, alphanumeric with _ or -',
  },
  password: {
    min: 6,
    max: 100,
    message: 'Password must be at least 6 characters',
  },
  ticketTitle: {
    min: 5,
    max: 255,
    message: 'Title must be 5-255 characters',
  },
  ticketDescription: {
    min: 10,
    max: 5000,
    message: 'Description must be 10-5000 characters',
  },
  comment: {
    min: 1,
    max: 2000,
    message: 'Comment must be 1-2000 characters',
  },
} as const

// ============================================
// Validation Functions
// ============================================

export function validateUsername(username: string): {
  valid: boolean
  error?: string
} {
  const rule = VALIDATION_RULES.username

  if (username.length < rule.min || username.length > rule.max) {
    return {
      valid: false,
      error: `Username must be ${rule.min}-${rule.max} characters`,
    }
  }

  if (!rule.pattern.test(username)) {
    return { valid: false, error: rule.message }
  }

  return { valid: true }
}

export function validatePassword(password: string): {
  valid: boolean
  error?: string
} {
  const rule = VALIDATION_RULES.password

  if (password.length < rule.min) {
    return {
      valid: false,
      error: rule.message,
    }
  }

  return { valid: true }
}

export function validateTicketTitle(title: string): {
  valid: boolean
  error?: string
} {
  const rule = VALIDATION_RULES.ticketTitle

  if (title.length < rule.min || title.length > rule.max) {
    return { valid: false, error: rule.message }
  }

  return { valid: true }
}

export function validateTicketDescription(desc: string): {
  valid: boolean
  error?: string
} {
  const rule = VALIDATION_RULES.ticketDescription

  if (desc.length < rule.min || desc.length > rule.max) {
    return { valid: false, error: rule.message }
  }

  return { valid: true }
}

export function validateComment(text: string): {
  valid: boolean
  error?: string
} {
  const rule = VALIDATION_RULES.comment

  if (text.length < rule.min || text.length > rule.max) {
    return { valid: false, error: rule.message }
  }

  return { valid: true }
}

// ============================================
// UI Constants
// ============================================

export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 10,
  MAX_PAGE_SIZE: 100,
}

export const TIMEOUTS = {
  NOTIFICATION: 5000, // ms
  MODAL: 300, // ms
  DEBOUNCE: 500, // ms
}

export const CACHE_TIMES = {
  STALE_TIME: 1000 * 60 * 5, // 5 minutes
  GC_TIME: 1000 * 60 * 10, // 10 minutes
  ANALYTICS_STALE_TIME: 1000 * 60 * 15, // 15 minutes
}

export const RETRY_CONFIG = {
  MAX_ATTEMPTS: 3,
  INITIAL_DELAY: 1000,
  MAX_DELAY: 10000,
  BACKOFF_MULTIPLIER: 2,
}

// ============================================
// Status Color Mapping (for UI)
// ============================================

export const STATUS_COLORS: Record<string, string> = {
  OPEN: 'blue',
  IN_PROGRESS: 'yellow',
  RESOLVED: 'green',
  CLOSED: 'gray',
}

export const PRIORITY_COLORS: Record<string, string> = {
  HIGH: 'red',
  MEDIUM: 'orange',
  LOW: 'green',
}

export const SENTIMENT_COLORS: Record<string, string> = {
  Positive: 'green',
  Neutral: 'gray',
  Negative: 'red',
}

export const ROLE_COLORS: Record<string, string> = {
  MANAGER: 'red',
  EMPLOYEE: 'blue',
  CUSTOMER: 'gray',
}

// ============================================
// Date Formatting
// ============================================

export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return 'N/A'

  try {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date)
  } catch {
    return dateString
  }
}

export function formatDateShort(dateString: string | null | undefined): string {
  if (!dateString) return 'N/A'

  try {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date)
  } catch {
    return dateString
  }
}

export function timeAgo(dateString: string | null | undefined): string {
  if (!dateString) return 'N/A'

  try {
    const date = new Date(dateString)
    const now = new Date()
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (seconds < 60) return 'just now'
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`

    return formatDateShort(dateString)
  } catch {
    return dateString
  }
}

// ============================================
// API Endpoints (for reference)
// ============================================

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/token/pair',
    SIGNUP: '/signup',
    VALIDATE: '/user/me',
  },
  TICKETS: {
    LIST: '/my-tickets',
    GET: '/tickets/:id',
    CREATE: '/tickets',
    UPDATE_STATUS: '/tickets/:id/status',
    ASSIGN: '/tickets/:id/assign/:employeeId',
  },
  COMMENTS: {
    CREATE: '/tickets/:id/comments',
    LIST: '/tickets/:id/comments',
  },
  EMPLOYEE: {
    TASKS: '/employee/tasks',
  },
  ANALYTICS: {
    DASHBOARD: '/analytics/dashboard',
  },
} as const

// ============================================
// Feature Flags (for future use)
// ============================================

export const FEATURES = {
  INTERNAL_NOTES: import.meta.env.VITE_FEATURE_INTERNAL_NOTES !== 'false',
  AI_SUGGESTIONS: import.meta.env.VITE_FEATURE_AI_SUGGESTIONS !== 'false',
  TICKET_CATEGORIES: import.meta.env.VITE_FEATURE_CATEGORIES !== 'false',
  REAL_TIME_UPDATES: import.meta.env.VITE_FEATURE_REAL_TIME !== 'false',
}

// ============================================
// Environment Configuration
// ============================================

export const CONFIG = {
  API_TIMEOUT: parseInt(import.meta.env.VITE_API_TIMEOUT || '10000'),
  LOG_LEVEL:
    (import.meta.env.VITE_LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error') ||
    'info',
  SENTRY_DSN: import.meta.env.VITE_SENTRY_DSN,
  ENABLE_MOCK_API: import.meta.env.VITE_MOCK_API === 'true',
}
