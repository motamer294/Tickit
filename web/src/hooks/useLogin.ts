import { useMutation } from '@tanstack/react-query'
import { loginApi } from '@/api/auth.api'
import { useAuthStore } from '@/store/auth.store'

export function useLogin() {
  const loginSuccess = useAuthStore((s) => s.loginSuccess)
  return useMutation({
    mutationFn: loginApi,
    onSuccess: (data, variables) => {
      // access/refresh come from Django Ninja JWT
      loginSuccess(data.access, data.refresh, {
        id: 0,
        username: variables.username,
        role: 'CUSTOMER',
      })
    },
  })
}
