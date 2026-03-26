import { Outlet, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/tenant/$tenantId/calls')({
  component: CallsLayout,
})

function CallsLayout() {
  return <Outlet />
}

