import { useMutation } from '@tanstack/react-query'
import { signupApi } from '@/api/auth.api'
import { useAuthStore } from '@/store/auth.store'
import type { User } from '@/store/auth.store'
import { useCallback } from 'react'
import { logger } from '@/utils/logger'

export function useSignup() {
  const loginSuccess = useAuthStore((s) => s.loginSuccess)

  const mutation = useMutation({
    mutationFn: signupApi,
    onSuccess: (data) => {
      const user: User = {
        id: data.id,
        username: data.username,
        role: data.role,
      }
      loginSuccess(data.access, data.refresh, user)
    },
    onError: (error: unknown) => {
      const err = error as { message?: string; data?: { message?: string } }
      logger.error('Signup failed:', err?.message || err?.data?.message)
    },
  })

  const getErrorMessage = useCallback(() => {
    if (!mutation.error) return null
    const err = mutation.error as { message?: string; data?: { message?: string } }
    return err?.data?.message || err?.message || 'Signup failed. Please try again.'
  }, [mutation.error])

  return {
    ...mutation,
    getErrorMessage,
  }
}
