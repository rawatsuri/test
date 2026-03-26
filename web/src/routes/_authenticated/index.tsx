import { Navigate, createFileRoute } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/auth-store'

export const Route = createFileRoute('/_authenticated/')({
  component: AuthenticatedIndexRedirect,
})

function AuthenticatedIndexRedirect() {
  const user = useAuthStore((state) => state.auth.user)

  if (user?.role.includes('SUPER_ADMIN')) {
    return <Navigate to='/super-admin/dashboard' />
  }

  if (user?.accountNo) {
    return <Navigate to='/tenant/$tenantId/dashboard' params={{ tenantId: user.accountNo }} />
  }

  return <Navigate to='/login' />
}
