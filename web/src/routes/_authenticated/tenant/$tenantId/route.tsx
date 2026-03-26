import { Outlet, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/tenant/$tenantId')({
  component: TenantLayout,
})

function TenantLayout() {
  return <Outlet />
}

