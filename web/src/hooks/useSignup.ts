import { useMutation } from '@tanstack/react-query'
import { signupApi } from '@/api/auth.api'
import { useAuthStore } from '@/store/auth.store'
import type { User } from '@/store/auth.store'

export function useSignup() {
  const loginSuccess = useAuthStore((s) => s.loginSuccess)

  return useMutation({
    mutationFn: signupApi,
    onSuccess: (data) => {
      const user: User = {
        id: data.id,
        username: data.username,
        role: data.role as any,
      }
      loginSuccess(data.access, data.refresh, user)
    },
  })
}
