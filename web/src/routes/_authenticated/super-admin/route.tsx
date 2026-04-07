import { Outlet, createFileRoute } from '@tanstack/react-router'
import { requireSuperAdmin } from '@/lib/auth'

export const Route = createFileRoute('/_authenticated/super-admin')({
  beforeLoad: ({ context, location }) => {
    requireSuperAdmin(context.auth, location.href)
  },
  component: SuperAdminLayout,
})

function SuperAdminLayout() {
  return <Outlet />
}
