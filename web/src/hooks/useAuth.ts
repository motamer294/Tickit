// @/hooks/useAuth.ts
import { useMutation } from '@tanstack/react-query'
import { loginApi, signupApi } from '@/api/auth.api'
import { useAuthStore } from '@/store/auth.store'
import { notifications } from '@/utils/customNotifications'
import { parseError, toNotificationPayload } from '@/utils/error-handling'
import { decodeJWT, getUserIdFromToken } from '@/utils/jwt'
import { logger } from '@/utils/logger'

/**
 *  useAuth: Access current authentication state and user info
 *
 * Example:
 * const { user, isAuthenticated, isManager, logout } = useAuth()
 */
export const useAuth = () => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const accessToken = useAuthStore((s) => s.accessToken)
  const isLoading = useAuthStore((s) => s.isLoading)
  const error = useAuthStore((s) => s.error)

  // Role checks
  const isManager = useAuthStore((s) => s.isManager())
  const isEmployee = useAuthStore((s) => s.isEmployee())
  const isCustomer = useAuthStore((s) => s.isCustomer())
  const userRole = useAuthStore((s) => s.getUserRole())

  return {
    isAuthenticated,
    user,
    logout,
    accessToken,
    isLoading,
    error,
    isManager,
    isEmployee,
    isCustomer,
    userRole,
  }
}

/**
 *  useLogin: Handles the login process with enhanced error handling
 *
 * Example:
 * const { mutate, isPending, error } = useLogin()
 * mutate({ username: 'john', password: 'secret123' })
 */
export function useLogin() {
  const loginSuccess = useAuthStore((s) => s.loginSuccess)
  const setError = useAuthStore((s) => s.setError)

  return useMutation({
    mutationFn: loginApi,
    onSuccess: (data: any, variables) => {
      const decoded = decodeJWT(data.access)
      const userId = getUserIdFromToken(data.access) || 1
      const userRole = (decoded?.role || 'CUSTOMER') as 'MANAGER' | 'EMPLOYEE' | 'CUSTOMER'

      logger.debug('[useLogin] Login successful, role:', userRole)

      loginSuccess(data.access, data.refresh, {
        id: userId,
        username: variables.username,
        role: userRole,
      })

      setError(null)

      notifications.show({
        title: 'Welcome back!',
        message: `Successfully logged in as ${variables.username}`,
        color: 'green',
        autoClose: 3000,
      })
    },
    onError: (error: any) => {
      logger.error('[useLogin] Login error:', error)
      const errorInfo = parseError(error)
      setError(errorInfo.message)

      notifications.show(toNotificationPayload(errorInfo))
    },
  })
}

/**
 *  useSignup: Handles the signup process with enhanced error handling
 *
 * Example:
 * const { mutate, isPending } = useSignup()
 * mutate({ username: 'jane', password: 'secret123', role: 'CUSTOMER' })
 */
export function useSignup() {
  const loginSuccess = useAuthStore((s) => s.loginSuccess)
  const setError = useAuthStore((s) => s.setError)

  return useMutation({
    mutationFn: signupApi,
    onSuccess: (data: any) => {
      // Use the role from backend response (most reliable source)
      const userRole = (data.role || 'CUSTOMER') as
        | 'MANAGER'
        | 'EMPLOYEE'
        | 'CUSTOMER'

      loginSuccess(data.access, data.refresh, {
        id: data.id || 0,
        username: data.username,
        role: userRole,
      })

      setError(null)

      notifications.show({
        title: 'Account created!',
        message: `Welcome, ${data.username}! Your account type is: ${userRole}`,
        color: 'green',
        autoClose: 3000,
      })
    },
    onError: (error: any) => {
      const errorInfo = parseError(error)
      setError(errorInfo.message)

      notifications.show(toNotificationPayload(errorInfo))
    },
  })
}
