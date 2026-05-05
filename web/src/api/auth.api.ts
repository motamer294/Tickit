/**
 * Authentication API Service
 * Handles user login, signup, and token management
 */

import { getAxiosInstance, APIError } from './config'

// ============================================
// Type Definitions
// ============================================

export interface LoginPayload {
  username: string
  password: string
}

export interface SignupPayload {
  username: string
  password: string
  role?: 'MANAGER' | 'EMPLOYEE' | 'CUSTOMER'
}

export interface AuthResponse {
  access: string
  refresh: string
}

export interface SignupResponse {
  id: number
  username: string
  role: 'MANAGER' | 'EMPLOYEE' | 'CUSTOMER'
}

// ============================================
// Authentication API Functions
// ============================================

/**
 * Login with username and password
 * Returns JWT access and refresh tokens (with role field included)
 *
 * @throws APIError on authentication failure
 */
export async function loginApi(payload: LoginPayload): Promise<AuthResponse> {
  try {
    console.log('[loginApi] Starting login for:', payload.username)
    const client = getAxiosInstance()

    // Use custom /login endpoint that includes role in JWT
    const response = await client.post<AuthResponse>('/login', {
      username: payload.username,
      password: payload.password,
    })

    console.log('[loginApi] ✅ Response received:')
    console.log('  - Status:', response.status)
    console.log('  - Has access token:', !!response.data.access)
    console.log('  - Has refresh token:', !!response.data.refresh)
    console.log('  - Has user:', !!response.data.user)
    console.log('  - Response keys:', Object.keys(response.data))
    console.log('  - Full data:', response.data)

    return response.data
  } catch (error) {
    console.error('[loginApi] ❌ Login failed')

    if (error instanceof APIError) {
      console.error('[loginApi] APIError:', {
        statusCode: error.statusCode,
        message: error.message,
        data: error.data,
      })
      // Translate common API errors to user-friendly messages
      if (error.statusCode === 401) {
        throw new Error('Invalid username or password')
      }
    }

    console.error('[loginApi] Error object:', error)
    throw error
  }
}

/**
 * Register a new user account
 * Returns user info and tokens
 *
 * @throws APIError on registration failure (duplicate username, validation error)
 */
export async function signupApi(
  payload: SignupPayload,
): Promise<AuthResponse & SignupResponse> {
  try {
    const client = getAxiosInstance()
    const response = await client.post<AuthResponse & SignupResponse>(
      '/signup',
      {
        username: payload.username,
        password: payload.password,
        role: payload.role || 'CUSTOMER',
      },
    )
    return response.data
  } catch (error) {
    if (error instanceof APIError) {
      if (error.statusCode === 400) {
        // Check for specific error from backend
        const data = error.data as any
        if (data?.message?.includes('already taken')) {
          throw new Error('Username already taken')
        }
      }
    }
    throw error
  }
}

/**
 * Validate current authentication token
 * Used for session persistence on app startup
 *
 * @throws APIError if token is invalid
 */
export async function validateTokenApi(
  token: string,
): Promise<{ valid: boolean }> {
  try {
    const client = getAxiosInstance()
    // Call /user/me endpoint to validate token
    // This endpoint requires valid JWT and returns current user
    const response = await client.get('/user/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
    console.log('[AUTH] Token validation successful:', response.data)
    return { valid: !!response.data }
  } catch (error) {
    console.warn('[AUTH] Token validation failed:', error)
    if (error instanceof APIError && error.statusCode === 401) {
      console.log('[AUTH] Token expired or invalid')
      return { valid: false }
    }
    // Any other error, treat as invalid
    return { valid: false }
  }
}
