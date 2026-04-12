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
    const client = getAxiosInstance()
    // Use custom /login endpoint that includes role in JWT
    const response = await client.post<AuthResponse>('/login', {
      username: payload.username,
      password: payload.password,
    })
    return response.data
  } catch (error) {
    if (error instanceof APIError) {
      // Translate common API errors to user-friendly messages
      if (error.statusCode === 401) {
        throw new Error('Invalid username or password')
      }
    }
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
    // This endpoint should exist on backend for token validation
    // For now, we'll use a simple GET to a protected endpoint
    const response = await client.get<{ id: number }>('/user/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
    return { valid: !!response.data }
  } catch (error) {
    if (error instanceof APIError && error.statusCode === 401) {
      return { valid: false }
    }
    throw error
  }
}
