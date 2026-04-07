import type { ReactNode } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import {
  ArrowRight,
  Building2,
  CircleCheckBig,
  Clock3,
  Settings2,
  ShieldAlert,
  Sparkles,
} from 'lucide-react'
import { useTenants } from '@/hooks/tenants/use-tenants'
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
  const recentTenants = tenants?.slice(0, 5) ?? []

  return (
    <div className='space-y-6'>
      <section className='grid gap-4 xl:grid-cols-[1.5fr_0.9fr]'>
        <Card className='border-border/70 bg-gradient-to-br from-primary/5 via-background to-background'>
          <CardHeader className='space-y-4'>
            <div className='space-y-2'>
              <p className='text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground'>
                Platform operations
              </p>
              <div className='space-y-2'>
                <CardTitle className='text-3xl tracking-tight'>Keep workspace rollout under control</CardTitle>
                <CardDescription className='max-w-2xl text-sm leading-6'>
                  Provision tenants, verify lifecycle status, and move directly into the workspace
                  that needs attention. This is the operational front door, not a vanity dashboard.
                </CardDescription>
              </div>
            </div>

            <div className='flex flex-wrap gap-3'>
              <Button asChild>
                <Link to='/super-admin/tenants'>Open Workspace Registry</Link>
              </Button>
              <Button asChild variant='outline'>
                <Link to='/super-admin/ai-setup'>Review Provider Setup</Link>
              </Button>
              {firstTenantId ? (
                <Button asChild variant='secondary'>
                  <Link to='/tenant/$tenantId/dashboard' params={{ tenantId: firstTenantId }}>
                    Jump Into First Workspace
                  </Link>
                </Button>
              ) : null}
            </div>
          </CardHeader>
        </Card>

        <Card className='border-border/70'>
          <CardHeader>
            <CardTitle className='text-base'>Control surfaces</CardTitle>
            <CardDescription>Primary places super admin work actually happens.</CardDescription>
          </CardHeader>
          <CardContent className='space-y-3'>
            <ActionRow
              icon={<Building2 className='size-4 text-primary' />}
              title='Workspace registry'
              description='Create tenants, suspend access, and open workspaces.'
              to='/super-admin/tenants'
              cta='Open'
            />
            <ActionRow
              icon={<Settings2 className='size-4 text-primary' />}
              title='Provider setup'
              description='Review platform defaults for telephony and model stack.'
              to='/super-admin/ai-setup'
              cta='Review'
            />
          </CardContent>
        </Card>
      </section>

      <section className='grid gap-4 sm:grid-cols-2 xl:grid-cols-4'>
        <KpiCard
          title='Total workspaces'
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

      <section className='grid gap-4 xl:grid-cols-[1.4fr_0.9fr]'>
        <Card>
          <CardHeader>
            <CardTitle>Recent workspaces</CardTitle>
            <CardDescription>Newest onboarded tenants and their current operating state.</CardDescription>
          </CardHeader>
          <CardContent className='space-y-3'>
            {isLoading ? (
              <>
                <Skeleton className='h-16 w-full' />
                <Skeleton className='h-16 w-full' />
                <Skeleton className='h-16 w-full' />
              </>
            ) : (
              recentTenants.map((tenant) => (
                <div
                  key={tenant.id}
                  className='grid gap-3 rounded-xl border border-border/70 px-4 py-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center'
                >
                  <div className='min-w-0 space-y-1'>
                    <div className='flex flex-wrap items-center gap-x-3 gap-y-1'>
                      <p className='truncate text-sm font-semibold'>{tenant.name}</p>
                      <span className='text-xs uppercase tracking-[0.16em] text-muted-foreground'>
                        {tenant.status}
                      </span>
                    </div>
                    <p className='truncate text-xs text-muted-foreground'>{tenant.slug}</p>
                    <p className='text-xs text-muted-foreground'>
                      {tenant.industry} · Retention {tenant.dataRetentionDays} days ·{' '}
                      {tenant.saveCallRecordings ? 'recordings on' : 'recordings off'}
                    </p>
                  </div>
                  <div className='flex flex-wrap items-center gap-2'>
                    <Button asChild size='sm' variant='outline'>
                      <Link to='/super-admin/tenants/$tenantId' params={{ tenantId: tenant.id }}>
                        Configure
                      </Link>
                    </Button>
                    <Button asChild size='sm'>
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

        <Card>
          <CardHeader>
            <CardTitle>Operator notes</CardTitle>
            <CardDescription>Keep the platform surface narrow and intentional.</CardDescription>
          </CardHeader>
          <CardContent className='space-y-3 text-sm text-muted-foreground'>
            <div className='rounded-xl border border-border/70 bg-muted/20 p-4'>
              <div className='mb-2 flex items-center gap-2 text-foreground'>
                <Sparkles className='size-4 text-primary' />
                <p className='font-medium'>Prefer workspace-first triage</p>
              </div>
              <p>
                Use the tenant registry for status and routing decisions. Drop into a workspace only
                when you need operational detail.
              </p>
            </div>
            <div className='rounded-xl border border-border/70 bg-muted/20 p-4'>
              <p className='font-medium text-foreground'>Keep labs out of the main path</p>
              <p className='mt-2'>
                Stable flows should read as calls, callers, knowledge, phone lines, and team. Let
                experiments stay secondary.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>
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
      <CardHeader className='flex flex-row items-start justify-between space-y-0 pb-3'>
        <div className='space-y-1'>
          <CardTitle className='text-sm font-medium text-muted-foreground'>{title}</CardTitle>
          {loading ? <Skeleton className='h-8 w-16' /> : <div className='text-3xl font-semibold tracking-tight'>{value}</div>}
        </div>
        <div className='rounded-lg border border-border/70 p-2'>{icon}</div>
      </CardHeader>
    </Card>
  )
}

function ActionRow({
  icon,
  title,
  description,
  to,
  cta,
}: {
  icon: ReactNode
  title: string
  description: string
  to: '/super-admin/tenants' | '/super-admin/ai-setup'
  cta: string
}) {
  return (
    <Link
      to={to}
      className='flex items-start justify-between gap-3 rounded-xl border border-border/70 px-4 py-3 transition-colors hover:border-primary/40 hover:bg-muted/20'
    >
      <div className='flex min-w-0 gap-3'>
        <div className='mt-0.5 rounded-lg border border-border/70 p-2'>{icon}</div>
        <div className='min-w-0'>
          <p className='text-sm font-medium'>{title}</p>
          <p className='text-xs text-muted-foreground'>{description}</p>
        </div>
      </div>
      <span className='flex shrink-0 items-center gap-1 text-xs font-medium text-muted-foreground'>
        {cta}
        <ArrowRight className='size-3.5' />
      </span>
    </Link>
  )
}
