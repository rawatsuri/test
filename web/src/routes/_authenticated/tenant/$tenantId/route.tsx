import { Outlet, createFileRoute } from '@tanstack/react-router'
import { requireTenantAccess } from '@/lib/auth'

export const Route = createFileRoute('/_authenticated/tenant/$tenantId')({
  beforeLoad: ({ context, location, params }) => {
    requireTenantAccess(context.auth, params.tenantId, location.href)
  },
  component: TenantLayout,
})

function TenantLayout() {
  return <Outlet />
}
