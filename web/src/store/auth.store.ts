/**
 * Authentication Store
 * Manages user authentication state, tokens, and user info using Zustand
 * Persists to localStorage for session continuation
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { UserRole } from '@/types/ticket'
import { logger } from '@/utils/logger'

// ============================================
// Type Definitions
// ============================================

export interface User {
  id: number
  username: string
  role: UserRole
}

export interface AuthState {
  // State
  accessToken: string | null
  refreshToken: string | null
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null

  // Selectors & Queries
  getUserRole: () => UserRole | null
  isManager: () => boolean
  isEmployee: () => boolean
  isCustomer: () => boolean
  hasToken: () => boolean
  isSessionValid: () => boolean

  // Actions
  loginSuccess: (accessToken: string, refreshToken: string, user: User) => void
  logout: () => void
  setUser: (user: User) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clearError: () => void
  updateToken: (accessToken: string, refreshToken?: string) => void
}

// ============================================
// Store Implementation
// ============================================

/**
 * Create the authentication store
 * Uses zustand persist middleware to save to localStorage
 * Storage key: 'auth-storage'
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      accessToken: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
      isLoading: true,
      error: null,

      // ========================================
      // Selectors / Queries (Read-only methods)
      // ========================================

      /**
       * Get the current user's role
       */
      getUserRole: () => {
        const { user } = get()
        return user?.role ?? null
      },

      /**
       * Check if user is a manager
       */
      isManager: () => {
        const { user } = get()
        return user?.role === 'MANAGER'
      },

      /**
       * Check if user is an employee
       */
      isEmployee: () => {
        const { user } = get()
        return user?.role === 'EMPLOYEE'
      },

      /**
       * Check if user is a customer
       */
      isCustomer: () => {
        const { user } = get()
        return user?.role === 'CUSTOMER'
      },

      /**
       * Check if access token exists and is not expired
       */
      hasToken: () => {
        const { accessToken } = get()
        return accessToken !== null && accessToken !== ''
      },

      /**
       * Check if session is still valid
       * In production, should decode JWT and check expiry
       */
      isSessionValid: () => {
        const { accessToken, user } = get()
        return !!accessToken && !!user
      },

      // ========================================
      // Actions (State mutations)
      // ========================================

      /**
       * Called after successful login
       * Sets all auth state and marks as authenticated
       */
      loginSuccess: (accessToken, refreshToken, user) => {
        logger.debug('[auth.store] loginSuccess called for user:', user?.username)
        set({
          accessToken,
          refreshToken,
          user,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        })
      },

      /**
       * Clear all authentication state
       * Called on logout or session expiry
       */
      logout: () =>
        set({
          accessToken: null,
          refreshToken: null,
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        }),

      /**
       * Update user profile information
       */
      setUser: (user) => set({ user }),

      /**
       * Set loading state
       */
      setLoading: (isLoading) => set({ isLoading }),

      /**
       * Set error message
       */
      setError: (error) => set({ error }),

      /**
       * Clear error message
       */
      clearError: () => set({ error: null }),

      /**
       * Update tokens (for token refresh logic)
       */
      updateToken: (accessToken, refreshToken) =>
        set({
          accessToken,
          ...(refreshToken && { refreshToken }),
        }),
    }),
    {
      name: 'auth-storage', // localStorage key
      version: 1, // Schema version for migrations

      // Whitelist specific fields to persist
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),

      // Called when rehydration finishes
      onRehydrateStorage: () => (state) => {
        if (state) {
          // ✅ Keep isLoading=true if there's a token to validate
          // This prevents the router from rendering too early
          // initializeAuth() will set isLoading=false after validation completes
          if (!state.accessToken) {
            // No token found - safe to render login page
            state.isLoading = false
          }
          // If token exists, keep isLoading=true so initializeAuth can handle it
        }
      },
    },
  ),
)

// ============================================
// Derived Hooks & Selectors
// ============================================

/**
 * Hook to get current user
 */
export const useCurrentUser = () => useAuthStore((state) => state.user)

/**
 * Hook to get access token
 */
export const useAccessToken = () => useAuthStore((state) => state.accessToken)

/**
 * Hook to get authentication status
 */
export const useIsAuthenticated = () =>
  useAuthStore((state) => state.isAuthenticated)

/**
 * Hook to get loading status
 */
export const useAuthLoading = () => useAuthStore((state) => state.isLoading)

/**
 * Hook to get user role
 */
export const useUserRole = () => useAuthStore((state) => state.getUserRole())

/**
 * Hook to get auth error
 */
export const useAuthError = () => useAuthStore((state) => state.error)
