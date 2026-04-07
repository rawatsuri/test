import { Link, createFileRoute } from '@tanstack/react-router'
import { ShieldAlert } from 'lucide-react'
import { getPostLoginTarget } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const reasonCopy: Record<string, string> = {
  super_admin_required: 'This area is only available to the platform super admin.',
  tenant_scope_mismatch: 'You cannot access another workspace from your current account.',
  workspace_manager_required: 'This page is limited to workspace managers.',
}

export const Route = createFileRoute('/unauthorized')({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: typeof search.redirect === 'string' ? search.redirect : '/',
    reason: typeof search.reason === 'string' ? search.reason : 'default',
  }),
  component: UnauthorizedPage,
})

function UnauthorizedPage() {
  const { auth } = Route.useRouteContext()
  const search = Route.useSearch()
  const homeTarget = getPostLoginTarget(auth)
  const message =
    reasonCopy[search.reason] ?? 'You do not have permission to access this page.'

  return (
    <div className='mx-auto flex min-h-svh w-full max-w-lg items-center px-6 py-10'>
      <Card className='w-full'>
        <CardHeader className='space-y-3'>
          <div className='flex size-12 items-center justify-center rounded-2xl border border-border/70 bg-muted/40'>
            <ShieldAlert className='size-5 text-primary' />
          </div>
          <div className='space-y-2'>
            <CardTitle>Access restricted</CardTitle>
            <CardDescription>{message}</CardDescription>
          </div>
        </CardHeader>
        <CardContent className='flex flex-wrap gap-3'>
          <Button asChild>
            <Link to={homeTarget.to} params={homeTarget.params as never}>
              Go to allowed home
            </Link>
          </Button>
          <Button asChild variant='outline'>
            <Link to='/login' search={{ redirect: '/' }}>
              Back to Login
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
