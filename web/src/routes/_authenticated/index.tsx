import { Navigate, createFileRoute } from '@tanstack/react-router'
import { getPostLoginTarget } from '@/lib/auth'

export const Route = createFileRoute('/_authenticated/')({
  component: AuthenticatedIndexRedirect,
})

function AuthenticatedIndexRedirect() {
  const { auth } = Route.useRouteContext()
  const target = getPostLoginTarget(auth)

  return <Navigate to={target.to} params={target.params as never} />
}
