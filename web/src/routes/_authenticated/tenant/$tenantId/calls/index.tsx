import { Link, createFileRoute } from '@tanstack/react-router'
import { Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTenantCalls } from '@/hooks/tenant/use-tenant-data'
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
  const callsData = callsQuery.data?.data ?? []
  const pagination = callsQuery.data?.pagination

  const filtered = useMemo(() => {
    return callsData.filter((call) => {
      const phone = call.caller?.phoneNumber ?? ''
      const name = call.caller?.name ?? ''
      const value = search.toLowerCase()
      return phone.includes(search) || name.toLowerCase().includes(value)
    })
  }, [callsData, search])

  const completedCount = callsData.filter((call) => call.status === 'COMPLETED').length
  const failedCount = callsData.filter((call) => ['FAILED', 'NO_ANSWER'].includes(call.status)).length

  return (
    <div className='space-y-6'>
      <section className='grid gap-4 xl:grid-cols-[1.4fr_0.8fr]'>
        <Card className='border-border/70 bg-gradient-to-br from-primary/5 via-background to-background'>
          <CardHeader className='space-y-3'>
            <div className='space-y-2'>
              <p className='text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground'>
                Call operations
              </p>
              <CardTitle className='text-3xl tracking-tight'>Review conversations without fighting the UI</CardTitle>
              <CardDescription className='max-w-2xl text-sm leading-6'>
                Search callers, constrain the date window, and move directly from queue to detail.
              </CardDescription>
            </div>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className='text-base'>Current page</CardTitle>
            <CardDescription>Counts based on the loaded call slice.</CardDescription>
          </CardHeader>
          <CardContent className='grid gap-3 sm:grid-cols-3 xl:grid-cols-1'>
            <ListStat label='Loaded calls' value={String(callsData.length)} />
            <ListStat label='Completed' value={String(completedCount)} />
            <ListStat label='Failed or missed' value={String(failedCount)} />
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader className='space-y-4'>
          <div>
            <CardTitle>Conversation list</CardTitle>
            <CardDescription>Filter by status or date, then search by caller name or phone.</CardDescription>
          </div>
          <div className='grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_180px_170px_170px]'>
            <div className='relative'>
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
        <CardContent className='space-y-3'>
          {callsQuery.isLoading ? <p className='text-sm text-muted-foreground'>Loading calls...</p> : null}
          {callsQuery.isError ? (
            <p className='text-sm text-destructive'>Failed to load calls. Please refresh.</p>
          ) : null}

          <div className='hidden grid-cols-[minmax(0,1.1fr)_120px_120px_170px_70px] gap-3 border-b pb-3 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground md:grid'>
            <span>Caller</span>
            <span>Status</span>
            <span>Direction</span>
            <span>Started</span>
            <span>Time</span>
          </div>

          {filtered.map((call) => (
            <Link
              key={call.id}
              to='/tenant/$tenantId/calls/$callId'
              params={{ tenantId, callId: call.id }}
              className='grid gap-3 rounded-xl border border-border/70 px-4 py-4 transition-colors hover:border-primary/40 hover:bg-muted/20 md:grid-cols-[minmax(0,1.1fr)_120px_120px_170px_70px] md:items-center'
            >
              <div className='min-w-0'>
                <p className='truncate text-sm font-semibold'>
                  {call.caller?.name || call.caller?.phoneNumber || 'Unknown caller'}
                </p>
                <p className='truncate text-xs text-muted-foreground'>
                  {call.caller?.phoneNumber || 'No phone number'} {call.summary ? `· ${call.summary}` : ''}
                </p>
              </div>
              <div className='text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground'>
                {call.status}
              </div>
              <div className='text-sm text-muted-foreground'>{call.direction}</div>
              <div className='text-sm text-muted-foreground'>
                {new Date(call.startedAt).toLocaleString()}
              </div>
              <div className='text-sm font-medium'>{call.durationSecs ?? 0}s</div>
            </Link>
          ))}

          {!callsQuery.isLoading && !callsQuery.isError && !filtered.length ? (
            <p className='rounded-xl border border-dashed p-6 text-sm text-muted-foreground'>
              No calls found for this filter.
            </p>
          ) : null}

          <div className='flex items-center justify-between border-t pt-4'>
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

function ListStat({ label, value }: { label: string; value: string }) {
  return (
    <div className='rounded-xl border border-border/70 bg-muted/20 px-4 py-3'>
      <p className='text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground'>{label}</p>
      <p className='mt-2 text-2xl font-semibold tracking-tight'>{value}</p>
    </div>
  )
}
