import { createFileRoute } from '@tanstack/react-router'
import { useTenantCaller } from '@/hooks/tenant/use-tenant-data'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Call } from '@/types'

export const Route = createFileRoute('/_authenticated/tenant/$tenantId/callers/$callerId')({
  component: CallerDetailPage,
})

function CallerDetailPage() {
  const { tenantId, callerId } = Route.useParams()
  const { data: caller, isLoading, isError } = useTenantCaller(tenantId, callerId)

  if (isLoading) {
    return <p className='text-sm text-muted-foreground'>Loading caller...</p>
  }

  if (isError || !caller) {
    return <p className='text-sm text-destructive'>Failed to load caller details.</p>
  }

  const callHistory = caller.calls ?? []

  return (
    <div className='space-y-6'>
      <section className='space-y-1'>
        <h1 className='text-3xl font-semibold tracking-tight'>{caller.name || caller.phoneNumber}</h1>
        <p className='text-sm text-muted-foreground'>{caller.phoneNumber}</p>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className='flex flex-wrap items-center gap-2'>
          {caller.email ? <Badge variant='outline'>{caller.email}</Badge> : null}
          <Badge>{caller.totalCalls} calls</Badge>
          <Badge variant='secondary'>{caller.isSaved ? 'Saved' : 'Unsaved'}</Badge>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Calls</CardTitle>
        </CardHeader>
        <CardContent className='space-y-2'>
          {callHistory.length ? (
            callHistory.map((call: Call) => (
              <div key={call.id} className='rounded-lg border p-3 text-sm'>
                <p className='font-medium'>{new Date(call.startedAt).toLocaleString()}</p>
                <p className='text-muted-foreground'>
                  {call.status} - {call.durationSecs ?? 0}s
                </p>
              </div>
            ))
          ) : (
            <p className='text-sm text-muted-foreground'>No previous calls found.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
