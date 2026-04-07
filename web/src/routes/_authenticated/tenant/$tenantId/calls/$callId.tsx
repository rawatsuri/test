import type { ReactNode } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { ArrowLeft, Clock3, Phone, PhoneCall, Sparkles } from 'lucide-react'
import { useTenantCall } from '@/hooks/tenant/use-tenant-data'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export const Route = createFileRoute('/_authenticated/tenant/$tenantId/calls/$callId')({
  component: CallDetailPage,
})

function CallDetailPage() {
  const { tenantId, callId } = Route.useParams()
  const { data: call, isLoading, isError } = useTenantCall(tenantId, callId)

  if (isLoading) {
    return <p className='text-sm text-muted-foreground'>Loading call...</p>
  }

  if (isError || !call) {
    return <p className='text-sm text-destructive'>Failed to load call details.</p>
  }

  return (
    <div className='space-y-6'>
      <section className='grid gap-4 xl:grid-cols-[1.35fr_0.85fr]'>
        <Card className='border-border/70 bg-gradient-to-br from-primary/5 via-background to-background'>
          <CardHeader className='space-y-4'>
            <div className='space-y-2'>
              <p className='text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground'>
                Conversation review
              </p>
              <CardTitle className='text-3xl tracking-tight'>
                {call.caller?.name || call.caller?.phoneNumber || 'Unknown caller'}
              </CardTitle>
              <CardDescription className='max-w-2xl text-sm leading-6'>
                Review the call outcome, transcript quality, and any structured extraction before
                operators act on the result.
              </CardDescription>
            </div>
            <div className='flex flex-wrap gap-3'>
              <Button asChild variant='outline'>
                <Link to='/tenant/$tenantId/calls' params={{ tenantId }}>
                  <ArrowLeft className='mr-2 size-4' />
                  Back to Calls
                </Link>
              </Button>
              {call.caller?.id ? (
                <Button asChild>
                  <Link to='/tenant/$tenantId/callers/$callerId' params={{ tenantId, callerId: call.caller.id }}>
                    Open Caller
                  </Link>
                </Button>
              ) : null}
            </div>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className='text-base'>Call snapshot</CardTitle>
            <CardDescription>Operational metadata for this conversation.</CardDescription>
          </CardHeader>
          <CardContent className='space-y-3'>
            <SnapshotRow icon={<Phone className='size-4 text-primary' />} label='Status' value={call.status} />
            <SnapshotRow icon={<PhoneCall className='size-4 text-primary' />} label='Direction' value={call.direction} />
            <SnapshotRow icon={<Clock3 className='size-4 text-primary' />} label='Duration' value={`${call.durationSecs ?? 0}s`} />
            <div className='rounded-xl border border-border/70 bg-muted/20 px-4 py-3 text-xs text-muted-foreground'>
              Started {new Date(call.startedAt).toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className='grid gap-4 xl:grid-cols-[1.2fr_0.8fr]'>
        <Card>
          <CardHeader>
            <CardTitle>Transcript</CardTitle>
            <CardDescription>Conversation timeline in speaker order.</CardDescription>
          </CardHeader>
          <CardContent className='space-y-3'>
            {call.transcripts?.length ? (
              call.transcripts.map((line) => (
                <div
                  key={line.id}
                  className={`rounded-xl border px-4 py-3 ${
                    line.role === 'AGENT'
                      ? 'border-primary/20 bg-primary/5'
                      : 'border-border/70 bg-background'
                  }`}
                >
                  <div className='mb-1 flex items-center justify-between gap-3'>
                    <p className='text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground'>
                      {line.role}
                    </p>
                    <p className='text-xs text-muted-foreground'>
                      {new Date(line.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                  <p className='text-sm leading-6'>{line.content}</p>
                </div>
              ))
            ) : (
              <p className='rounded-xl border border-dashed p-6 text-sm text-muted-foreground'>
                No transcript captured yet.
              </p>
            )}
          </CardContent>
        </Card>

        <div className='space-y-4'>
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
              <CardDescription>Short call-level outcome, if available.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className='text-sm leading-6 text-muted-foreground'>
                {call.summary || 'No summary has been generated for this call yet.'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Structured extractions</CardTitle>
              <CardDescription>Machine-readable outcomes from the conversation.</CardDescription>
            </CardHeader>
            <CardContent className='space-y-3'>
              {call.extractions?.length ? (
                call.extractions.map((extraction) => (
                  <div key={extraction.id} className='rounded-xl border border-border/70 bg-muted/20 p-4'>
                    <div className='mb-3 flex items-center gap-2'>
                      <Sparkles className='size-4 text-primary' />
                      <p className='text-sm font-medium'>{extraction.type}</p>
                    </div>
                    <pre className='overflow-x-auto rounded-lg border bg-background p-3 text-xs'>
                      {JSON.stringify(extraction.data, null, 2)}
                    </pre>
                  </div>
                ))
              ) : (
                <p className='text-sm text-muted-foreground'>No extractions available.</p>
              )}
            </CardContent>
          </Card>
        </div>
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
      <p className='text-sm text-muted-foreground'>{value}</p>
    </div>
  )
}
