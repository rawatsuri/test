import { Outlet, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/tenant/$tenantId/omnichannel')({
  component: OmnichannelLayout,
})

function OmnichannelLayout() {
  return <Outlet />
}

