import type { ReactNode } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { Bot, Clock3, MessageSquareText, Phone, Users } from 'lucide-react'
import { useTenantCallers, useTenantCalls, useTenantPhoneNumbers } from '@/hooks/tenant/use-tenant-data'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  const totalDuration = calls.reduce((sum, call) => sum + (call.durationSecs ?? 0), 0)

  return (
    <div className='space-y-6'>
      <section className='rounded-2xl border bg-gradient-to-br from-emerald-500/10 via-background to-background p-6'>
        <Badge className='mb-3'>Omnichannel AI Workspace</Badge>
        <h1 className='text-3xl font-semibold tracking-tight'>Tenant Operations</h1>
        <p className='mt-1 text-sm text-muted-foreground'>
          Voice + messaging channels unified for AI-first customer operations.
        </p>
      </section>

      <section className='grid gap-4 sm:grid-cols-2 xl:grid-cols-4'>
        <MetricCard title='Total Calls' value={String(calls.length)} loading={callsQuery.isLoading} icon={<Phone className='size-4 text-primary' />} />
        <MetricCard
          title='Active Callers'
          value={String(callers.length)}
          loading={callersQuery.isLoading}
          icon={<Users className='size-4 text-primary' />}
        />
        <MetricCard
          title='Phone Numbers'
          value={String(phoneNumbers.length)}
          loading={numbersQuery.isLoading}
          icon={<Phone className='size-4 text-primary' />}
        />
        <MetricCard
          title='Duration'
          value={`${Math.round(totalDuration / 60)} min`}
          loading={callsQuery.isLoading}
          icon={<Clock3 className='size-4 text-primary' />}
        />
      </section>

      <section className='grid gap-4 lg:grid-cols-3'>
        <QuickLinkCard
          to='/tenant/$tenantId/omnichannel/inbox'
          params={{ tenantId }}
          title='Shared Inbox'
          desc='Central stream for WhatsApp, web chat, and future channels.'
          icon={<MessageSquareText className='size-4 text-primary' />}
        />
        <QuickLinkCard
          to='/tenant/$tenantId/omnichannel/channels'
          params={{ tenantId }}
          title='Channels'
          desc='Monitor health and routing state across connected channels.'
          icon={<Phone className='size-4 text-primary' />}
        />
        <QuickLinkCard
          to='/tenant/$tenantId/omnichannel/automations'
          params={{ tenantId }}
          title='Automations'
          desc='Run AI workflows for intake, follow-up, and escalations.'
          icon={<Bot className='size-4 text-primary' />}
        />
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
      <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
        <CardTitle className='text-sm font-medium'>{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>{loading ? <Skeleton className='h-8 w-20' /> : <p className='text-2xl font-semibold'>{value}</p>}</CardContent>
    </Card>
  )
}

function QuickLinkCard({
  to,
  params,
  title,
  desc,
  icon,
}: {
  to: '/tenant/$tenantId/omnichannel/inbox' | '/tenant/$tenantId/omnichannel/channels' | '/tenant/$tenantId/omnichannel/automations'
  params: { tenantId: string }
  title: string
  desc: string
  icon: ReactNode
}) {
  return (
    <Link to={to} params={params} className='block rounded-xl border bg-card p-4 transition hover:border-primary/40 hover:shadow-sm'>
      <div className='mb-2 flex items-center justify-between'>
        <p className='text-sm font-semibold'>{title}</p>
        {icon}
      </div>
      <p className='text-xs text-muted-foreground'>{desc}</p>
    </Link>
  )
}
