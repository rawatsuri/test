import { createFileRoute } from '@tanstack/react-router'
import { useTenantCall } from '@/hooks/tenant/use-tenant-data'
import { Badge } from '@/components/ui/badge'
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
      <section className='space-y-1'>
        <h1 className='text-2xl font-semibold tracking-tight'>Call Detail</h1>
        <p className='text-sm text-muted-foreground'>Call ID: {call.id}</p>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Metadata</CardTitle>
          <CardDescription>Core details and call status.</CardDescription>
        </CardHeader>
        <CardContent className='flex flex-wrap items-center gap-2'>
          <Badge>{call.status}</Badge>
          <Badge variant='outline'>{call.direction}</Badge>
          <Badge variant='secondary'>{call.durationSecs ?? 0}s</Badge>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Transcript</CardTitle>
          <CardDescription>Conversation timeline.</CardDescription>
        </CardHeader>
        <CardContent className='space-y-3'>
          {call.transcripts?.length ? (
            call.transcripts.map((line) => (
              <div key={line.id} className='rounded-lg border p-3'>
                <p className='mb-1 text-xs uppercase text-muted-foreground'>{line.role}</p>
                <p className='text-sm'>{line.content}</p>
              </div>
            ))
          ) : (
            <p className='text-sm text-muted-foreground'>No transcript captured yet.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Structured Extractions</CardTitle>
        </CardHeader>
        <CardContent className='space-y-3'>
          {call.extractions?.length ? (
            call.extractions.map((extraction) => (
              <pre key={extraction.id} className='overflow-x-auto rounded-md border bg-muted/30 p-3 text-xs'>
                {JSON.stringify(extraction.data, null, 2)}
              </pre>
            ))
          ) : (
            <p className='text-sm text-muted-foreground'>No extractions available.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
