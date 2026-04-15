/**
 * Logging utility with environment-based control
 * Enables/disables console output based on VITE_LOG_LEVEL
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
} as const

const currentLevel: LogLevel = (import.meta.env.VITE_LOG_LEVEL as LogLevel) || 'info'
const currentLevelValue = LOG_LEVELS[currentLevel]

/**
 * Should log the message based on environment level
 */
const shouldLog = (level: LogLevel): boolean => {
  return LOG_LEVELS[level] >= currentLevelValue
}

/**
 * Debug-level logging (lowest priority)
 */
export const debug = (message: string, ...data: unknown[]): void => {
  if (shouldLog('debug') && import.meta.env.DEV) {
    console.log(`[DEBUG] ${message}`, ...data)
  }
}

/**
 * Info-level logging
 */
export const info = (message: string, ...data: unknown[]): void => {
  if (shouldLog('info') && import.meta.env.DEV) {
    console.log(`[INFO] ${message}`, ...data)
  }
}

/**
 * Warning-level logging
 */
export const warn = (message: string, ...data: unknown[]): void => {
  if (shouldLog('warn')) {
    console.warn(`[WARN] ${message}`, ...data)
  }
}

/**
 * Error-level logging (always shown)
 */
export const error = (message: string, ...data: unknown[]): void => {
  if (shouldLog('error')) {
    console.error(`[ERROR] ${message}`, ...data)
  }
}

export const logger = {
  debug,
  info,
  warn,
  error,
}
