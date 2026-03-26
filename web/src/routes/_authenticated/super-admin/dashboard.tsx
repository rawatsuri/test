import type { ReactNode } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { ArrowRight, Building2, CircleCheckBig, Clock3, ShieldAlert } from 'lucide-react'
import { useTenants } from '@/hooks/tenants/use-tenants'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export const Route = createFileRoute('/_authenticated/super-admin/dashboard')({
  component: SuperAdminDashboardPage,
})

function SuperAdminDashboardPage() {
  const { data: tenants, isLoading } = useTenants()
  const firstTenantId = tenants?.[0]?.id

  const total = tenants?.length ?? 0
  const active = tenants?.filter((tenant) => tenant.status === 'ACTIVE').length ?? 0
  const trial = tenants?.filter((tenant) => tenant.status === 'TRIAL').length ?? 0
  const suspended = tenants?.filter((tenant) => tenant.status === 'SUSPENDED').length ?? 0

  return (
    <div className='space-y-6'>
      <section className='rounded-2xl border bg-gradient-to-br from-primary/5 via-background to-background p-6'>
        <div className='flex flex-wrap items-start justify-between gap-4'>
          <div className='space-y-3'>
            <Badge>Super Admin Control Center</Badge>
            <h1 className='text-3xl font-semibold tracking-tight'>Platform Command</h1>
            <p className='max-w-2xl text-sm text-muted-foreground'>
              Create and govern client workspaces, monitor activity health, and keep the call stack
              operational with minimal overhead.
            </p>
          </div>
          <div className='flex items-center gap-2'>
            <Button asChild variant='secondary'>
              <Link to='/super-admin/ai-setup'>AI Setup</Link>
            </Button>
            {firstTenantId ? (
              <Button asChild variant='outline'>
                <Link to='/tenant/$tenantId/dashboard' params={{ tenantId: firstTenantId }}>
                  Open First Workspace
                </Link>
              </Button>
            ) : null}
            <Button asChild>
              <Link to='/super-admin/tenants'>
                Manage Tenants <ArrowRight className='ml-2 size-4' />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className='grid gap-4 sm:grid-cols-2 xl:grid-cols-4'>
        <KpiCard
          title='Total Tenants'
          value={total}
          loading={isLoading}
          icon={<Building2 className='size-4 text-primary' />}
        />
        <KpiCard
          title='Active'
          value={active}
          loading={isLoading}
          icon={<CircleCheckBig className='size-4 text-emerald-500' />}
        />
        <KpiCard
          title='Trial'
          value={trial}
          loading={isLoading}
          icon={<Clock3 className='size-4 text-amber-500' />}
        />
        <KpiCard
          title='Suspended'
          value={suspended}
          loading={isLoading}
          icon={<ShieldAlert className='size-4 text-rose-500' />}
        />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Recent Tenants</CardTitle>
          <CardDescription>Newest workspace onboardings.</CardDescription>
        </CardHeader>
        <CardContent className='space-y-3'>
          {isLoading ? (
            <>
              <Skeleton className='h-12 w-full' />
              <Skeleton className='h-12 w-full' />
              <Skeleton className='h-12 w-full' />
            </>
          ) : (
            tenants?.slice(0, 6).map((tenant) => (
              <div key={tenant.id} className='flex items-center justify-between rounded-lg border px-4 py-3'>
                <div>
                  <p className='text-sm font-medium'>{tenant.name}</p>
                  <p className='text-xs text-muted-foreground'>{tenant.slug}</p>
                </div>
                <div className='flex items-center gap-2'>
                  <Badge variant='outline'>{tenant.industry}</Badge>
                  <Badge>{tenant.status}</Badge>
                  <Button asChild size='sm' variant='outline'>
                    <Link to='/tenant/$tenantId/dashboard' params={{ tenantId: tenant.id }}>
                      Open Workspace
                    </Link>
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function KpiCard({
  title,
  value,
  loading,
  icon,
}: {
  title: string
  value: number
  loading: boolean
  icon: ReactNode
}) {
  return (
    <Card>
      <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
        <CardTitle className='text-sm font-medium'>{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        {loading ? <Skeleton className='h-8 w-16' /> : <div className='text-2xl font-semibold'>{value}</div>}
      </CardContent>
    </Card>
  )
}
