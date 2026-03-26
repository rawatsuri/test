import { Link, createFileRoute } from '@tanstack/react-router'
import { Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTenantCalls } from '@/hooks/tenant/use-tenant-data'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export const Route = createFileRoute('/_authenticated/tenant/$tenantId/calls/')({
  component: CallsListPage,
})

function CallsListPage() {
  const { tenantId } = Route.useParams()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<string>('ALL')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(1)
  const limit = 20

  const callsQuery = useTenantCalls(tenantId, {
    limit: String(limit),
    page: String(page),
    ...(status !== 'ALL' ? { status } : {}),
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
  })
  const callsData = callsQuery.data?.data
  const pagination = callsQuery.data?.pagination

  const filtered = useMemo(() => {
    const calls = callsData ?? []
    return calls.filter((call) => {
      const phone = call.caller?.phoneNumber ?? ''
      const name = call.caller?.name ?? ''
      const value = search.toLowerCase()
      return phone.includes(search) || name.toLowerCase().includes(value)
    })
  }, [callsData, search])

  return (
    <div className='space-y-6'>
      <section>
        <h1 className='text-3xl font-semibold tracking-tight'>Calls</h1>
        <p className='text-sm text-muted-foreground'>Review conversations and call outcomes.</p>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Call History</CardTitle>
          <CardDescription>Filter by status/date and search by caller.</CardDescription>
          <div className='mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-5'>
            <div className='relative sm:col-span-2 lg:col-span-2'>
              <Search className='absolute left-3 top-3 size-4 text-muted-foreground' />
              <Input
                placeholder='Search caller phone or name'
                className='pl-9'
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <div className='space-y-1'>
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='ALL'>ALL</SelectItem>
                  <SelectItem value='RINGING'>RINGING</SelectItem>
                  <SelectItem value='CONNECTING'>CONNECTING</SelectItem>
                  <SelectItem value='IN_PROGRESS'>IN_PROGRESS</SelectItem>
                  <SelectItem value='COMPLETED'>COMPLETED</SelectItem>
                  <SelectItem value='FAILED'>FAILED</SelectItem>
                  <SelectItem value='NO_ANSWER'>NO_ANSWER</SelectItem>
                  <SelectItem value='TRANSFERRED'>TRANSFERRED</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className='space-y-1'>
              <Label>From</Label>
              <Input type='date' value={from} onChange={(event) => setFrom(event.target.value)} />
            </div>
            <div className='space-y-1'>
              <Label>To</Label>
              <Input type='date' value={to} onChange={(event) => setTo(event.target.value)} />
            </div>
          </div>
        </CardHeader>
        <CardContent className='space-y-2'>
          {callsQuery.isLoading ? <p className='text-sm text-muted-foreground'>Loading calls...</p> : null}
          {callsQuery.isError ? (
            <p className='text-sm text-destructive'>Failed to load calls. Please refresh.</p>
          ) : null}

          {filtered.map((call) => (
            <Link
              key={call.id}
              to='/tenant/$tenantId/calls/$callId'
              params={{ tenantId, callId: call.id }}
              className='flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 transition hover:border-primary/40'
            >
              <div>
                <p className='text-sm font-medium'>
                  {call.caller?.name || call.caller?.phoneNumber || 'Unknown Caller'}
                </p>
                <p className='text-xs text-muted-foreground'>
                  {new Date(call.startedAt).toLocaleString()} - {call.durationSecs ?? 0}s
                </p>
              </div>
              <div className='flex items-center gap-2'>
                <Badge variant='outline'>{call.direction}</Badge>
                <Badge>{call.status}</Badge>
              </div>
            </Link>
          ))}

          {!callsQuery.isLoading && !callsQuery.isError && !filtered.length ? (
            <p className='text-sm text-muted-foreground'>No calls found.</p>
          ) : null}

          <div className='mt-4 flex items-center justify-between border-t pt-3'>
            <p className='text-xs text-muted-foreground'>
              Page {pagination?.page ?? page}
              {pagination?.totalPages ? ` of ${pagination.totalPages}` : ''}
            </p>
            <div className='flex items-center gap-2'>
              <Button
                size='sm'
                variant='outline'
                disabled={page <= 1 || callsQuery.isFetching}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                Previous
              </Button>
              <Button
                size='sm'
                variant='outline'
                disabled={!!pagination && page >= pagination.totalPages}
                onClick={() => setPage((current) => current + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
