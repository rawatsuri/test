import { Outlet, createFileRoute } from '@tanstack/react-router'
import { requireWorkspaceManager } from '@/lib/auth'

export const Route = createFileRoute('/_authenticated/tenant/$tenantId/config')({
  beforeLoad: ({ context, location, params }) => {
    requireWorkspaceManager(context.auth, params.tenantId, location.href)
  },
  component: ConfigLayout,
})

function ConfigLayout() {
  return <Outlet />
}
