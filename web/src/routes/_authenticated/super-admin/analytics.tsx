import { createFileRoute } from '@tanstack/react-router'
import { BarChart3, Building2, Clock3, ShieldCheck } from 'lucide-react'
import { useTenants } from '@/hooks/tenants/use-tenants'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export const Route = createFileRoute('/_authenticated/super-admin/analytics')({
  component: SuperAdminAnalyticsPage,
})

function SuperAdminAnalyticsPage() {
  const { data: tenants, isLoading } = useTenants()

  const tenantList = tenants ?? []
  const total = tenantList.length
  const active = tenantList.filter((tenant) => tenant.status === 'ACTIVE').length
  const suspended = tenantList.filter((tenant) => tenant.status === 'SUSPENDED').length
  const byIndustry = aggregateBy(tenantList, (tenant) => tenant.industry)

  return (
    <div className='space-y-6'>
      <section className='rounded-2xl border bg-gradient-to-br from-sky-500/10 via-background to-background p-6'>
        <div className='space-y-3'>
          <Badge>Super Admin Analytics</Badge>
          <h1 className='text-3xl font-semibold tracking-tight'>Platform Snapshot</h1>
          <p className='text-sm text-muted-foreground'>
            Operational metrics focused on tenant health and distribution.
          </p>
        </div>
      </section>

      <section className='grid gap-4 sm:grid-cols-2 xl:grid-cols-4'>
        <MetricCard
          title='Total Tenants'
          value={String(total)}
          loading={isLoading}
          icon={<Building2 className='size-4 text-primary' />}
        />
        <MetricCard
          title='Active'
          value={String(active)}
          loading={isLoading}
          icon={<ShieldCheck className='size-4 text-emerald-500' />}
        />
        <MetricCard
          title='Suspended'
          value={String(suspended)}
          loading={isLoading}
          icon={<Clock3 className='size-4 text-rose-500' />}
        />
        <MetricCard
          title='Industry Buckets'
          value={String(byIndustry.length)}
          loading={isLoading}
          icon={<BarChart3 className='size-4 text-amber-500' />}
        />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Tenant Distribution by Industry</CardTitle>
          <CardDescription>Relative concentration of client verticals.</CardDescription>
        </CardHeader>
        <CardContent className='space-y-3'>
          {isLoading ? (
            <>
              <Skeleton className='h-12 w-full' />
              <Skeleton className='h-12 w-full' />
              <Skeleton className='h-12 w-full' />
            </>
          ) : (
            byIndustry.map((row) => {
              const percentage = total === 0 ? 0 : Math.round((row.count / total) * 100)
              return (
                <div key={row.key} className='space-y-1'>
                  <div className='flex items-center justify-between text-sm'>
                    <span className='font-medium'>{row.key}</span>
                    <span className='text-muted-foreground'>
                      {row.count} ({percentage}%)
                    </span>
                  </div>
                  <div className='h-2 rounded-full bg-muted'>
                    <div className='h-2 rounded-full bg-primary' style={{ width: `${percentage}%` }} />
                  </div>
                </div>
              )
            })
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function aggregateBy<T>(items: T[], selector: (item: T) => string) {
  const map = new Map<string, number>()
  items.forEach((item) => {
    const key = selector(item)
    map.set(key, (map.get(key) ?? 0) + 1)
  })
  return [...map.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((left, right) => right.count - left.count)
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
  icon: React.ReactNode
}) {
  return (
    <Card>
      <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
        <CardTitle className='text-sm font-medium'>{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        {loading ? <Skeleton className='h-8 w-20' /> : <p className='text-2xl font-semibold'>{value}</p>}
      </CardContent>
    </Card>
  )
}
