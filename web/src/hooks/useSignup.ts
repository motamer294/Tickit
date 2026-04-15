import { useMutation } from '@tanstack/react-query'
import { signupApi } from '@/api/auth.api'
import { useAuthStore } from '@/store/auth.store'
import type { User } from '@/store/auth.store'
import { useCallback } from 'react'

export function useSignup() {
  const loginSuccess = useAuthStore((s) => s.loginSuccess)

  const mutation = useMutation({
    mutationFn: signupApi,
    onSuccess: (data) => {
      const user: User = {
        id: data.id,
        username: data.username,
        role: data.role as any,
      }
      loginSuccess(data.access, data.refresh, user)
    },
    onError: (error: any) => {
      // Error is automatically available in mutation.error
      // Components can display mutation.error?.message
      console.error('Signup failed:', error?.message || error?.data?.message)
    },
  })

  // Helper to get user-friendly error message
  const getErrorMessage = useCallback(() => {
    if (!mutation.error) return null
    const err = mutation.error as any
    return err?.data?.message || err?.message || 'Signup failed. Please try again.'
  }, [mutation.error])

  return {
    ...mutation,
    getErrorMessage,
  }
}
