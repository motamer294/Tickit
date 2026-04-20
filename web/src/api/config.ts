/**
 * API Configuration & Axios Setup
 * Centralized API base URL, interceptors, and error handling
 *
 * NOTE: This module must be initialized in main.tsx:
 * import { createApiClient } from '@/api/config'
 * import { useAuthStore } from '@/store/auth.store'
 *
 * const store = useAuthStore.getState()
 * createApiClient(
 *   () => store.accessToken,
 *   () => store.logout()
 * )
 */

import axios, {
  type AxiosInstance,
  AxiosError,
  type InternalAxiosRequestConfig,
} from 'axios'

// Get API URL from environment or use smart defaults
const getApiUrl = () => {
  // Check if we should use HTTPS (for production behind Nginx)
  const useHttps = import.meta.env.VITE_USE_HTTPS === 'true'

  // Production HTTPS URLs (set when using Nginx reverse proxy)
  if (useHttps) {
    const httpsUrl = import.meta.env.VITE_API_URL_HTTPS
    if (httpsUrl) return httpsUrl

    // Fallback: use current domain with HTTPS
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname
      return `https://${hostname}/api`
    }
    // Server-side rendering with HTTPS
    return `https://localhost/api`
  }

  // Development mode (HTTP through Nginx reverse proxy or direct connection)

  // Try Vite environment variable first (highest priority)
  const viteUrl = import.meta.env.VITE_API_URL
  if (viteUrl) return viteUrl

  // For development: redirect dev server ports to backend
  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol
    const hostname = window.location.hostname
    const port = window.location.port

    // Get configured backend port/host from env
    const configuredApiPort = import.meta.env.VITE_API_PORT || '8000'
    const configuredApiHost = import.meta.env.VITE_API_HOST || hostname
    const devServerPorts = (import.meta.env.VITE_DEV_SERVER_PORTS || '5173,3000').split(',')

    // Dev server ports should redirect to configured backend
    if (devServerPorts.includes(port)) {
      return `${protocol}//${configuredApiHost}:${configuredApiPort}/api`
    }

    // Production or custom port
    if (port && port !== '80' && port !== '443') {
      return `${protocol}//${hostname}:${port}/api`
    }

    // No port specified (production on standard ports)
    return `${protocol}//${hostname}/api`
  }

  // Server-side rendering fallback (uses env var or localhost)
  const fallbackHost = import.meta.env.VITE_API_HOST || 'localhost'
  const fallbackPort = import.meta.env.VITE_API_PORT || '8000'
  return `http://${fallbackHost}:${fallbackPort}/api`
}

export const API_BASE_URL = getApiUrl()

// ============================================
// Error Types
// ============================================

export class APIError extends Error {
  constructor(statusCode: number, message: string, data?: unknown) {
    super(message)
    this.name = 'APIError'
    this.statusCode = statusCode
    this.data = data
  }

  statusCode: number
  data?: unknown
}

// ============================================
// Axios Instance Factory
// ============================================

let axiosInstance: AxiosInstance | null = null
let isRefreshing = false
let failedQueue: Array<{
  resolve: (token: string) => void
  reject: (err: unknown) => void
}> = []

const processQueue = (token: string, error?: unknown) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(token)
    }
  })
  failedQueue = []
}

export function createApiClient(
  getToken?: () => string | null,
  onUnauthorized?: () => void,
): AxiosInstance {
  if (axiosInstance) {
    return axiosInstance
  }

  axiosInstance = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,
    headers: {
      'Content-Type': 'application/json',
    },
  })

  // ============================================
  // Request Interceptor: Add Auth Token
  // ============================================
  axiosInstance.interceptors.request.use(
    (config) => {
      const token = getToken?.()
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
        // Debug: Log token being sent (first 20 chars + "...")
        if (import.meta.env.DEV) {
          console.log(
            `[API] Sending request with token: ${token.substring(0, 20)}...`,
          )
        }
      } else {
        if (import.meta.env.DEV) {
          console.warn('[API] No token available for request')
        }
      }
      return config
    },
    (error) => Promise.reject(error),
  )

  // ============================================
  // Response Interceptor: Handle Errors & Token Refresh
  // ============================================
  axiosInstance.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const originalRequest = error.config as
        | InternalAxiosRequestConfig
        | undefined

      // Don't retry if already retried
      if ((originalRequest as unknown as Record<string, unknown>)?._retry) {
        return Promise.reject(error)
      }

      // Handle 401 Unauthorized - Attempt Token Refresh
      if (error.response?.status === 401 && !isRefreshing) {
        isRefreshing = true
        if (originalRequest) {
          ;(originalRequest as unknown as Record<string, unknown>)._retry = true
        }

        try {
          // Immediately logout on 401
          onUnauthorized?.()
          isRefreshing = false
          processQueue('', error)

          // Redirect to login page
          if (typeof window !== 'undefined') {
            setTimeout(() => {
              window.location.href = '/auth/login'
            }, 500)
          }

          return Promise.reject(error)
        } catch (err) {
          isRefreshing = false
          processQueue('', err)
          onUnauthorized?.()
          return Promise.reject(err)
        }
      }

      // Queue other requests while refreshing
      if (error.response?.status === 401 && isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        })
          .then((token) => {
            if (originalRequest && originalRequest.headers) {
              ;(
                originalRequest.headers as unknown as Record<string, unknown>
              ).Authorization = `Bearer ${token}`
              return axiosInstance!(
                originalRequest as InternalAxiosRequestConfig,
              )
            }
            return Promise.reject(error)
          })
          .catch((err) => Promise.reject(err))
      }

      // Format error response
      const responseData = error.response?.data as
        | Record<string, unknown>
        | undefined
      const errorMessage =
        (responseData?.message as string) ||
        (responseData?.detail as string) ||
        error.message ||
        'An error occurred'

      return Promise.reject(
        new APIError(
          error.response?.status || 500,
          errorMessage,
          error.response?.data,
        ),
      )
    },
  )

  return axiosInstance
}

export function getAxiosInstance(): AxiosInstance {
  if (!axiosInstance) {
    throw new Error(
      'Axios instance not initialized. Call createApiClient first.',
    )
  }
  return axiosInstance
}

// ============================================
// Legacy Fetch-Based Client (Fallback)
// ============================================

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE'

const buildHeaders = (
  token?: string,
  hasBody = false,
): Record<string, string> => {
  const headers: Record<string, string> = {}

  if (hasBody) {
    headers['Content-Type'] = 'application/json'
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  return headers
}

const normalizeEndpoint = (endpoint: string): string => {
  let path = endpoint.trim().replace(/^\/+/, '') // remove leading "/"

  // If base already ends with "/api", drop leading "api/" from endpoint
  if (API_BASE_URL.endsWith('/api')) {
    path = path.replace(/^api\/?/, '')
  }

  return `${API_BASE_URL}/${path}`
}

const parseJsonSafely = async (response: Response): Promise<unknown | null> => {
  if (response.status === 204) {
    return null
  }

  const contentType = response.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) {
    const text = await response.text()
    return text ? text : null
  }

  const text = await response.text()
  return text ? JSON.parse(text) : null
}

const request = async (
  method: HttpMethod,
  endpoint: string,
  data?: unknown,
  token?: string,
) => {
  try {
    const hasBody =
      data !== undefined && method !== 'GET' && method !== 'DELETE'
    const response = await fetch(normalizeEndpoint(endpoint), {
      method,
      headers: buildHeaders(token, hasBody),
      ...(hasBody ? { body: JSON.stringify(data) } : {}),
    })

    if (!response.ok) {
      const errorData = (await parseJsonSafely(response)) as
        | { message?: string }
        | string
        | null
      const message =
        (typeof errorData === 'object' && errorData && 'message' in errorData
          ? errorData.message
          : undefined) ||
        (typeof errorData === 'string' ? errorData : undefined) ||
        `API Error: ${response.status} ${response.statusText}`

      throw new Error(message)
    }

    return parseJsonSafely(response)
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(`Connection failed. Check backend URL: ${API_BASE_URL}`)
    }
    throw error
  }
}

export const apiClient = {
  get: async (endpoint: string, token?: string) =>
    request('GET', endpoint, undefined, token),

  post: async (endpoint: string, data: unknown, token?: string) =>
    request('POST', endpoint, data, token),

  patch: async (endpoint: string, data: unknown, token?: string) =>
    request('PATCH', endpoint, data, token),

  delete: async (endpoint: string, token?: string) =>
    request('DELETE', endpoint, undefined, token),
}
