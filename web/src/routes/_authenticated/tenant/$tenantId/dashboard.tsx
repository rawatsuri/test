import type { ReactNode } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import {
  ArrowRight,
  BookOpenText,
  Clock3,
  Phone,
  PhoneCall,
  Users,
  Users2,
} from 'lucide-react'
import {
  useTenantCallers,
  useTenantCalls,
  useTenantPhoneNumbers,
} from '@/hooks/tenant/use-tenant-data'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export const Route = createFileRoute('/_authenticated/tenant/$tenantId/dashboard')({
  component: TenantDashboardPage,
})

function TenantDashboardPage() {
  const { tenantId } = Route.useParams()
  const callsQuery = useTenantCalls(tenantId, { limit: '200' })
  const callersQuery = useTenantCallers(tenantId, { limit: '200' })
  const numbersQuery = useTenantPhoneNumbers(tenantId)

  const calls = callsQuery.data?.data ?? []
  const callers = callersQuery.data?.data ?? []
  const phoneNumbers = numbersQuery.data ?? []
  const completedCalls = calls.filter((call) => call.status === 'COMPLETED').length
  const totalDuration = calls.reduce((sum, call) => sum + (call.durationSecs ?? 0), 0)
  const recentCalls = calls.slice(0, 5)

  return (
    <div className='space-y-6'>
      <section className='grid gap-4 xl:grid-cols-[1.45fr_0.85fr]'>
        <Card className='border-border/70 bg-gradient-to-br from-emerald-500/10 via-background to-background'>
          <CardHeader className='space-y-4'>
            <div className='space-y-2'>
              <p className='text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground'>
                Workspace operations
              </p>
              <CardTitle className='text-3xl tracking-tight'>
                Run the voice workflow from one calm surface
              </CardTitle>
              <CardDescription className='max-w-2xl text-sm leading-6'>
                Focus this workspace around calls, callers, knowledge, and phone lines. Everything
                else should stay secondary until it proves useful.
              </CardDescription>
            </div>

            <div className='flex flex-wrap gap-3'>
              <Button asChild>
                <Link to='/tenant/$tenantId/calls' params={{ tenantId }}>
                  Open Calls
                </Link>
              </Button>
              <Button asChild variant='outline'>
                <Link to='/tenant/$tenantId/callers' params={{ tenantId }}>
                  Review Callers
                </Link>
              </Button>
            </div>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className='text-base'>Current load</CardTitle>
            <CardDescription>Real counts from the live workspace APIs.</CardDescription>
          </CardHeader>
          <CardContent className='grid gap-3'>
            <MetricStrip label='Completed calls' value={String(completedCalls)} loading={callsQuery.isLoading} />
            <MetricStrip label='Active callers' value={String(callers.length)} loading={callersQuery.isLoading} />
            <MetricStrip label='Phone lines' value={String(phoneNumbers.length)} loading={numbersQuery.isLoading} />
          </CardContent>
        </Card>
      </section>

      <section className='grid gap-4 sm:grid-cols-2 xl:grid-cols-4'>
        <MetricCard
          title='Total calls'
          value={String(calls.length)}
          loading={callsQuery.isLoading}
          icon={<Phone className='size-4 text-primary' />}
        />
        <MetricCard
          title='Known callers'
          value={String(callers.length)}
          loading={callersQuery.isLoading}
          icon={<Users className='size-4 text-primary' />}
        />
        <MetricCard
          title='Phone lines'
          value={String(phoneNumbers.length)}
          loading={numbersQuery.isLoading}
          icon={<PhoneCall className='size-4 text-primary' />}
        />
        <MetricCard
          title='Talk time'
          value={`${Math.round(totalDuration / 60)} min`}
          loading={callsQuery.isLoading}
          icon={<Clock3 className='size-4 text-primary' />}
        />
      </section>

      <section className='grid gap-4 xl:grid-cols-[1.2fr_0.8fr]'>
        <Card>
          <CardHeader>
            <CardTitle>Recent calls</CardTitle>
            <CardDescription>Jump straight into the latest conversations and outcomes.</CardDescription>
          </CardHeader>
          <CardContent className='space-y-3'>
            {callsQuery.isLoading ? (
              <>
                <Skeleton className='h-16 w-full' />
                <Skeleton className='h-16 w-full' />
                <Skeleton className='h-16 w-full' />
              </>
            ) : recentCalls.length ? (
              recentCalls.map((call) => (
                <Link
                  key={call.id}
                  to='/tenant/$tenantId/calls/$callId'
                  params={{ tenantId, callId: call.id }}
                  className='grid gap-3 rounded-xl border border-border/70 px-4 py-4 transition-colors hover:border-primary/40 hover:bg-muted/20 md:grid-cols-[minmax(0,1fr)_auto]'
                >
                  <div className='min-w-0'>
                    <p className='truncate text-sm font-semibold'>
                      {call.caller?.name || call.caller?.phoneNumber || 'Unknown caller'}
                    </p>
                    <p className='text-xs text-muted-foreground'>
                      {new Date(call.startedAt).toLocaleString()} · {call.direction} ·{' '}
                      {call.durationSecs ?? 0}s
                    </p>
                  </div>
                  <div className='text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground'>
                    {call.status}
                  </div>
                </Link>
              ))
            ) : (
              <p className='rounded-xl border border-dashed p-6 text-sm text-muted-foreground'>
                No calls have been captured yet.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Core actions</CardTitle>
            <CardDescription>Stable workspace surfaces that should stay easy to manage.</CardDescription>
          </CardHeader>
          <CardContent className='space-y-3'>
            <ActionCard
              to='/tenant/$tenantId/callers'
              params={{ tenantId }}
              icon={<Users className='size-4 text-primary' />}
              title='Caller directory'
              description='Save important callers, review history, and keep customer memory usable.'
            />
            <ActionCard
              to='/tenant/$tenantId/config/knowledge'
              params={{ tenantId }}
              icon={<BookOpenText className='size-4 text-primary' />}
              title='Knowledge base'
              description='Update the facts and policies your agent should rely on in live calls.'
            />
            <ActionCard
              to='/tenant/$tenantId/config/phone-numbers'
              params={{ tenantId }}
              icon={<PhoneCall className='size-4 text-primary' />}
              title='Phone lines'
              description='Keep provider mapping and active inbound numbers under control.'
            />
            <ActionCard
              to='/tenant/$tenantId/team'
              params={{ tenantId }}
              icon={<Users2 className='size-4 text-primary' />}
              title='Team access'
              description='Manage operator roles and keep workspace permissions predictable.'
            />
          </CardContent>
        </Card>
      </section>
    </div>
  )
}

function MetricCard({
  title,
  value,
  loading,
  icon,
}: {
  title: string
  value: string
  loading: boolean
  icon: ReactNode
}) {
  return (
    <Card>
      <CardHeader className='flex flex-row items-start justify-between space-y-0 pb-3'>
        <div className='space-y-1'>
          <CardTitle className='text-sm font-medium text-muted-foreground'>{title}</CardTitle>
          {loading ? (
            <Skeleton className='h-8 w-20' />
          ) : (
            <p className='text-3xl font-semibold tracking-tight'>{value}</p>
          )}
        </div>
        <div className='rounded-lg border border-border/70 p-2'>{icon}</div>
      </CardHeader>
    </Card>
  )
}

function MetricStrip({
  label,
  value,
  loading,
}: {
  label: string
  value: string
  loading: boolean
}) {
  return (
    <div className='rounded-xl border border-border/70 bg-muted/20 px-4 py-3'>
      <p className='text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground'>{label}</p>
      {loading ? <Skeleton className='mt-2 h-7 w-16' /> : <p className='mt-2 text-2xl font-semibold tracking-tight'>{value}</p>}
    </div>
  )
}

function ActionCard({
  to,
  params,
  icon,
  title,
  description,
}: {
  to:
    | '/tenant/$tenantId/callers'
    | '/tenant/$tenantId/config/knowledge'
    | '/tenant/$tenantId/config/phone-numbers'
  | '/tenant/$tenantId/team'
  params: { tenantId: string }
  icon: ReactNode
  title: string
  description: string
}) {
  return (
    <Link
      to={to}
      params={params}
      className='flex items-start justify-between gap-3 rounded-xl border border-border/70 px-4 py-4 transition-colors hover:border-primary/40 hover:bg-muted/20'
    >
      <div className='flex min-w-0 gap-3'>
        <div className='rounded-lg border border-border/70 p-2'>{icon}</div>
        <div className='min-w-0'>
          <p className='text-sm font-medium'>{title}</p>
          <p className='text-xs text-muted-foreground'>{description}</p>
        </div>
      </div>
      <ArrowRight className='mt-0.5 size-4 shrink-0 text-muted-foreground' />
    </Link>
  )
}
