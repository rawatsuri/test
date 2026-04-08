import { buildRouterAuth } from '@/lib/auth'
import { useAuthStore } from '@/stores/auth-store'

export function useAppSession() {
  const user = useAuthStore((state) => state.auth.user)
  const accessToken = useAuthStore((state) => state.auth.accessToken)

  return buildRouterAuth(user, accessToken)
}
