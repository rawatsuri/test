import { Outlet, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/tenant/$tenantId/config')({
  component: ConfigLayout,
})

function ConfigLayout() {
  return <Outlet />
}

