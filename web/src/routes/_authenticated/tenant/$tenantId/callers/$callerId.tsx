import type { ReactNode } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { ArrowLeft, Mail, Phone, Star } from 'lucide-react'
import { useTenantCaller } from '@/hooks/tenant/use-tenant-data'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
      <section className='grid gap-4 xl:grid-cols-[1.3fr_0.8fr]'>
        <Card className='border-border/70 bg-gradient-to-br from-primary/5 via-background to-background'>
          <CardHeader className='space-y-4'>
            <div className='space-y-2'>
              <p className='text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground'>
                Caller profile
              </p>
              <CardTitle className='text-3xl tracking-tight'>
                {caller.name || caller.phoneNumber}
              </CardTitle>
              <CardDescription className='max-w-2xl text-sm leading-6'>
                Review identity, call history, and the customer details your operators may need to
                remember between conversations.
              </CardDescription>
            </div>
            <div className='flex flex-wrap gap-3'>
              <Button asChild variant='outline'>
                <Link to='/tenant/$tenantId/callers' params={{ tenantId }}>
                  <ArrowLeft className='mr-2 size-4' />
                  Back to Callers
                </Link>
              </Button>
            </div>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className='text-base'>Profile snapshot</CardTitle>
            <CardDescription>Core information retained for this caller.</CardDescription>
          </CardHeader>
          <CardContent className='space-y-3'>
            <SnapshotRow icon={<Phone className='size-4 text-primary' />} label='Phone' value={caller.phoneNumber} />
            <SnapshotRow icon={<Mail className='size-4 text-primary' />} label='Email' value={caller.email || 'Not provided'} />
            <SnapshotRow icon={<Star className='size-4 text-primary' />} label='Saved' value={caller.isSaved ? 'Saved' : 'Unsaved'} />
            <div className='rounded-xl border border-border/70 bg-muted/20 px-4 py-3 text-xs text-muted-foreground'>
              First call {new Date(caller.firstCallAt).toLocaleDateString()} · Last call{' '}
              {new Date(caller.lastCallAt).toLocaleDateString()} · {caller.totalCalls} total calls
            </div>
          </CardContent>
        </Card>
      </section>

      <section className='grid gap-4 xl:grid-cols-[1.1fr_0.9fr]'>
        <Card>
          <CardHeader>
            <CardTitle>Recent calls</CardTitle>
            <CardDescription>Conversation history linked to this caller.</CardDescription>
          </CardHeader>
          <CardContent className='space-y-3'>
            {callHistory.length ? (
              callHistory.map((call: Call) => (
                <Link
                  key={call.id}
                  to='/tenant/$tenantId/calls/$callId'
                  params={{ tenantId, callId: call.id }}
                  className='block rounded-xl border border-border/70 px-4 py-4 transition-colors hover:border-primary/40 hover:bg-muted/20'
                >
                  <div className='flex flex-wrap items-center justify-between gap-2'>
                    <p className='text-sm font-semibold'>{new Date(call.startedAt).toLocaleString()}</p>
                    <p className='text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground'>
                      {call.status}
                    </p>
                  </div>
                  <p className='mt-1 text-sm text-muted-foreground'>
                    {call.direction} · {call.durationSecs ?? 0}s
                    {call.summary ? ` · ${call.summary}` : ''}
                  </p>
                </Link>
              ))
            ) : (
              <p className='rounded-xl border border-dashed p-6 text-sm text-muted-foreground'>
                No previous calls found.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Stored context</CardTitle>
            <CardDescription>Free-form caller context retained by the system.</CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            <DataBlock
              title='Preferences'
              value={caller.preferences}
              emptyMessage='No preferences stored.'
            />
            <DataBlock
              title='Metadata'
              value={caller.metadata}
              emptyMessage='No metadata stored.'
            />
          </CardContent>
        </Card>
      </section>
    </div>
  )
}

function SnapshotRow({
  icon,
  label,
  value,
}: {
  icon: ReactNode
  label: string
  value: string
}) {
  return (
    <div className='flex items-center justify-between rounded-xl border border-border/70 px-4 py-3'>
      <div className='flex items-center gap-3'>
        <div className='rounded-lg border border-border/70 p-2'>{icon}</div>
        <p className='text-sm font-medium'>{label}</p>
      </div>
      <p className='max-w-[55%] text-right text-sm text-muted-foreground'>{value}</p>
    </div>
  )
}

function DataBlock({
  title,
  value,
  emptyMessage,
}: {
  title: string
  value: Record<string, unknown> | null
  emptyMessage: string
}) {
  return (
    <div className='rounded-xl border border-border/70 bg-muted/20 p-4'>
      <p className='mb-3 text-sm font-medium'>{title}</p>
      {value && Object.keys(value).length ? (
        <pre className='overflow-x-auto rounded-lg border bg-background p-3 text-xs'>
          {JSON.stringify(value, null, 2)}
        </pre>
      ) : (
        <p className='text-sm text-muted-foreground'>{emptyMessage}</p>
      )}
    </div>
  )
}
