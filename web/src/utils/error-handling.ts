/**
 * Error Handling Utilities
 * Centralized error parsing, user-friendly messages, and recovery strategies
 */

import { APIError } from '@/api/config'
import { logger } from '@/utils/logger'

// ============================================
// Error Types
// ============================================

export const ErrorType = {
  NETWORK: 'NETWORK',
  AUTH: 'AUTH',
  PERMISSION: 'PERMISSION',
  VALIDATION: 'VALIDATION',
  NOT_FOUND: 'NOT_FOUND',
  SERVER: 'SERVER',
  UNKNOWN: 'UNKNOWN',
} as const

export type ErrorTypeValue = typeof ErrorType[keyof typeof ErrorType]

export interface ErrorInfo {
  type: ErrorTypeValue
  message: string
  userMessage: string
  statusCode?: number
  data?: unknown
  isRecoverable: boolean
  suggestedAction?: string
}

// ============================================
// Error Parsing & Classification
// ============================================

/**
 * Parse any error into a standardized ErrorInfo object
 * Provides both technical details and user-friendly messages
 */
export function parseError(error: unknown): ErrorInfo {
  // Handle APIError from axios/config
  if (error instanceof APIError) {
    return parseAPIError(error)
  }

  // Handle native Error objects
  if (error instanceof Error) {
    return parseNativeError(error)
  }

  // Handle unknown errors
  return {
    type: ErrorType.UNKNOWN,
    message: String(error),
    userMessage: 'An unexpected error occurred. Please try again.',
    isRecoverable: true,
    suggestedAction: 'Try refreshing the page',
  }
}

/**
 * Parse APIError from HTTP responses
 */
function parseAPIError(error: APIError): ErrorInfo {
  const { statusCode, message, data } = error

  // Network errors
  if (statusCode === 0 || statusCode === undefined) {
    return {
      type: ErrorType.NETWORK,
      message: message,
      userMessage: 'Connection failed. Check your internet connection.',
      statusCode,
      isRecoverable: true,
      suggestedAction: 'Check your connection and try again',
    }
  }

  // Authentication errors
  if (statusCode === 401) {
    return {
      type: ErrorType.AUTH,
      message: message,
      userMessage: 'Your session has expired. Please login again.',
      statusCode,
      isRecoverable: true,
      suggestedAction: 'Redirect to login',
    }
  }

  // Permission errors
  if (statusCode === 403) {
    return {
      type: ErrorType.PERMISSION,
      message: message,
      userMessage: 'You do not have permission to perform this action.',
      statusCode,
      isRecoverable: false,
      suggestedAction: 'Contact your administrator',
    }
  }

  // Validation errors
  if (statusCode === 400) {
    return {
      type: ErrorType.VALIDATION,
      message: message,
      userMessage: message || 'Please check your input and try again.',
      statusCode,
      data,
      isRecoverable: true,
      suggestedAction: 'Review the form and correct any errors',
    }
  }

  // Not found
  if (statusCode === 404) {
    return {
      type: ErrorType.NOT_FOUND,
      message: message,
      userMessage: 'The requested resource was not found.',
      statusCode,
      isRecoverable: false,
      suggestedAction: 'Go back and try a different item',
    }
  }

  // Server errors (5xx)
  if (statusCode >= 500) {
    return {
      type: ErrorType.SERVER,
      message: message,
      userMessage:
        'Server error. Our team has been notified. Please try again later.',
      statusCode,
      isRecoverable: true,
      suggestedAction: 'Retry in a few moments',
    }
  }

  // Default/unknown status code
  return {
    type: ErrorType.UNKNOWN,
    message: message,
    userMessage: message || 'An error occurred. Please try again.',
    statusCode,
    isRecoverable: true,
  }
}

/**
 * Parse native JavaScript errors
 */
function parseNativeError(error: Error): ErrorInfo {
  const message = error.message

  // Network timeout
  if (message.includes('timeout')) {
    return {
      type: ErrorType.NETWORK,
      message,
      userMessage: 'The request timed out. Please try again.',
      isRecoverable: true,
      suggestedAction: 'Check your connection and retry',
    }
  }

  // Parse network error
  if (message.includes('Connection') || message.includes('fetch')) {
    return {
      type: ErrorType.NETWORK,
      message,
      userMessage: 'Connection failed. Check your internet connection.',
      isRecoverable: true,
      suggestedAction: 'Check your connection and try again',
    }
  }

  // Validation error
  if (message.includes('Invalid')) {
    return {
      type: ErrorType.VALIDATION,
      message,
      userMessage: message,
      isRecoverable: true,
    }
  }

  // Generic error
  return {
    type: ErrorType.UNKNOWN,
    message,
    userMessage: 'An unexpected error occurred. Please try again.',
    isRecoverable: true,
  }
}

// ============================================
// Error Recovery & Retry Logic
// ============================================

export interface RetryConfig {
  maxAttempts: number
  initialDelayMs: number
  maxDelayMs: number
  backoffMultiplier: number
  retryableStatusCodes: number[]
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
  retryableStatusCodes: [408, 429, 500, 502, 503, 504],
}

/**
 * Check if an error should be retried
 */
export function isRetryableError(
  error: ErrorInfo,
  config = DEFAULT_RETRY_CONFIG,
): boolean {
  if (!error.isRecoverable) return false

  // Retry network errors
  if (error.type === ErrorType.NETWORK) return true

  // Retry specific status codes
  if (
    error.statusCode &&
    config.retryableStatusCodes.includes(error.statusCode)
  ) {
    return true
  }

  return false
}

/**
 * Calculate delay for exponential backoff
 */
export function calculateBackoffDelay(
  attempt: number,
  config = DEFAULT_RETRY_CONFIG,
): number {
  const exponentialDelay =
    config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt - 1)
  const capped = Math.min(exponentialDelay, config.maxDelayMs)
  // Add jitter to prevent thundering herd
  const jitter = capped * 0.1 * Math.random()
  return capped + jitter
}

/**
 * Create a retry wrapper for async functions
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config = DEFAULT_RETRY_CONFIG,
): Promise<T> {
  let lastError: ErrorInfo | null = null

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      const errorInfo = parseError(error)
      lastError = errorInfo

      if (
        !isRetryableError(errorInfo, config) ||
        attempt === config.maxAttempts
      ) {
        throw error
      }

      // Wait before retry
      const delay = calculateBackoffDelay(attempt, config)
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  throw lastError
}

// ============================================
// Error Display & Logging
// ============================================

/**
 * Convert error to notification payload
 * Compatible with Mantine notifications API
 */
export function toNotificationPayload(error: ErrorInfo): {
  title: string
  message: string
  color: string
  autoClose: number | false
} {
  return {
    title: getErrorTitle(error.type),
    message: error.userMessage,
    color: getErrorColor(error.type),
    autoClose: error.isRecoverable ? 5000 : false,
  }
}

/**
 * Get human-readable error title
 */
function getErrorTitle(type: ErrorTypeValue): string {
  const titles: Record<ErrorTypeValue, string> = {
    [ErrorType.NETWORK]: 'Connection Error',
    [ErrorType.AUTH]: 'Authentication Failed',
    [ErrorType.PERMISSION]: 'Access Denied',
    [ErrorType.VALIDATION]: 'Invalid Input',
    [ErrorType.NOT_FOUND]: 'Not Found',
    [ErrorType.SERVER]: 'Server Error',
    [ErrorType.UNKNOWN]: 'Error',
  }
  return titles[type]
}

/**
 * Get error color for UI
 */
function getErrorColor(type: ErrorTypeValue): string {
  const colors: Record<ErrorTypeValue, string> = {
    [ErrorType.NETWORK]: 'yellow',
    [ErrorType.AUTH]: 'blue',
    [ErrorType.PERMISSION]: 'orange',
    [ErrorType.VALIDATION]: 'cyan',
    [ErrorType.NOT_FOUND]: 'gray',
    [ErrorType.SERVER]: 'red',
    [ErrorType.UNKNOWN]: 'red',
  }
  return colors[type]
}

/**
 * Log error for debugging/monitoring
 * In production, send to error tracking service (Sentry, LogRocket, etc.)
 */
export function logError(
  error: ErrorInfo,
  context?: Record<string, unknown>,
): void {
  const timestamp = new Date().toISOString()
  const logData = {
    timestamp,
    type: error.type,
    statusCode: error.statusCode,
    message: error.message,
    context,
  }

  logger.error('[API Error]', logData)

  // In production, send to error tracking service
  if (import.meta.env.PROD) {
    // Example: window.Sentry?.captureException(error)
    // Or: fetch('/api/errors', { method: 'POST', body: JSON.stringify(logData) })
  }
}
