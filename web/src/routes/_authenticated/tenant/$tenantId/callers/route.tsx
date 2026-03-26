import { Outlet, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/tenant/$tenantId/callers')({
  component: CallersLayout,
})

function CallersLayout() {
  return <Outlet />
}

