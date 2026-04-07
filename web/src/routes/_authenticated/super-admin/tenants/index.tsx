import { useMemo, useState, type FormEvent } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { ArrowRight, Plus, Search } from 'lucide-react'
import { useCreateTenant, useTenants, useUpdateTenantStatus } from '@/hooks/tenants/use-tenants'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Industry, TenantStatus } from '@/types'

export const Route = createFileRoute('/_authenticated/super-admin/tenants/')({
  component: TenantsPage,
})

function TenantsPage() {
  const { data: tenants, isLoading } = useTenants()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    if (!tenants) return []
    if (!query.trim()) return tenants
    const value = query.toLowerCase()
    return tenants.filter(
      (tenant) =>
        tenant.name.toLowerCase().includes(value) || tenant.slug.toLowerCase().includes(value),
    )
  }, [query, tenants])

  const activeCount = filtered.filter((tenant) => tenant.status === TenantStatus.ACTIVE).length
  const suspendedCount = filtered.filter((tenant) => tenant.status === TenantStatus.SUSPENDED).length

  return (
    <div className='space-y-6'>
      <section className='grid gap-4 xl:grid-cols-[1.4fr_0.9fr]'>
        <Card className='border-border/70 bg-gradient-to-br from-primary/5 via-background to-background'>
          <CardHeader className='space-y-4'>
            <div className='space-y-2'>
              <p className='text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground'>
                Workspace registry
              </p>
              <CardTitle className='text-3xl tracking-tight'>Provision and govern client workspaces</CardTitle>
              <CardDescription className='max-w-2xl text-sm leading-6'>
                Keep setup, lifecycle status, and operator handoff in one list. The primary action
                here is simple: find the workspace and move to the next decision quickly.
              </CardDescription>
            </div>
            <div className='flex flex-wrap gap-3'>
              <Button onClick={() => setOpen(true)}>
                <Plus className='mr-2 size-4' />
                Create Workspace
              </Button>
            </div>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className='text-base'>Current view</CardTitle>
            <CardDescription>Live counts for the filtered workspace list.</CardDescription>
          </CardHeader>
          <CardContent className='grid gap-3 sm:grid-cols-3 xl:grid-cols-1'>
            <RegistryStat label='Visible workspaces' value={String(filtered.length)} />
            <RegistryStat label='Active' value={String(activeCount)} />
            <RegistryStat label='Suspended' value={String(suspendedCount)} />
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader className='space-y-4'>
          <div>
            <CardTitle>Workspace list</CardTitle>
            <CardDescription>Search by name or slug, then open setup or tenant operations.</CardDescription>
          </div>
          <div className='relative max-w-xl'>
            <Search className='absolute left-3 top-3 size-4 text-muted-foreground' />
            <Input
              placeholder='Search workspace name or slug'
              className='pl-9'
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className='space-y-3'>
          <div className='hidden grid-cols-[minmax(0,1.2fr)_120px_140px_150px_220px] gap-3 border-b pb-3 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground md:grid'>
            <span>Workspace</span>
            <span>Industry</span>
            <span>Status</span>
            <span>Retention</span>
            <span>Actions</span>
          </div>

          {isLoading ? <p className='text-sm text-muted-foreground'>Loading workspaces...</p> : null}

          {!isLoading && !filtered.length ? (
            <p className='rounded-xl border border-dashed p-6 text-sm text-muted-foreground'>
              No workspaces match this filter.
            </p>
          ) : null}

          {filtered.map((tenant) => (
            <div
              key={tenant.id}
              className='grid gap-3 rounded-xl border border-border/70 px-4 py-4 md:grid-cols-[minmax(0,1.2fr)_120px_140px_150px_220px] md:items-center'
            >
              <div className='min-w-0 space-y-1'>
                <Link
                  to='/super-admin/tenants/$tenantId'
                  params={{ tenantId: tenant.id }}
                  className='block truncate text-sm font-semibold hover:text-primary'
                >
                  {tenant.name}
                </Link>
                <p className='truncate text-xs text-muted-foreground'>{tenant.slug}</p>
              </div>

              <div className='text-sm text-muted-foreground'>{tenant.industry}</div>

              <div>
                <Badge variant={tenant.status === TenantStatus.ACTIVE ? 'default' : 'secondary'}>
                  {tenant.status}
                </Badge>
              </div>

              <div className='text-sm text-muted-foreground'>
                {tenant.dataRetentionDays} days
              </div>

              <div className='flex flex-wrap items-center gap-2'>
                <Button asChild size='sm' variant='outline'>
                  <Link to='/super-admin/tenants/$tenantId' params={{ tenantId: tenant.id }}>
                    Configure
                  </Link>
                </Button>
                <Button asChild size='sm'>
                  <Link to='/tenant/$tenantId/dashboard' params={{ tenantId: tenant.id }}>
                    Open
                  </Link>
                </Button>
                <StatusToggle tenantId={tenant.id} status={tenant.status} />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <CreateTenantDialog open={open} onOpenChange={setOpen} />
    </div>
  )
}

function RegistryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className='rounded-xl border border-border/70 bg-muted/20 px-4 py-3'>
      <p className='text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground'>{label}</p>
      <p className='mt-2 text-2xl font-semibold tracking-tight'>{value}</p>
    </div>
  )
}

function StatusToggle({
  tenantId,
  status,
}: {
  tenantId: string
  status: 'ACTIVE' | 'SUSPENDED' | 'TRIAL'
}) {
  const updateStatus = useUpdateTenantStatus(tenantId)
  const nextStatus =
    status === TenantStatus.ACTIVE ? TenantStatus.SUSPENDED : TenantStatus.ACTIVE

  return (
    <Button
      size='sm'
      variant='ghost'
      className='text-muted-foreground'
      onClick={() => updateStatus.mutate(nextStatus)}
      disabled={updateStatus.isPending}
    >
      {status === TenantStatus.ACTIVE ? 'Suspend' : 'Activate'}
      <ArrowRight className='ml-1 size-3.5' />
    </Button>
  )
}

function CreateTenantDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (value: boolean) => void
}) {
  const createTenant = useCreateTenant()
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [industry, setIndustry] = useState<Industry>(Industry.HEALTHCARE)
  const [dataRetentionDays, setDataRetentionDays] = useState(15)
  const [saveCallRecordings, setSaveCallRecordings] = useState(false)

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await createTenant.mutateAsync({
      name,
      slug,
      industry,
      dataRetentionDays,
      saveCallRecordings,
    })
    onOpenChange(false)
    setName('')
    setSlug('')
    setDataRetentionDays(15)
    setSaveCallRecordings(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form className='space-y-4' onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>Create workspace</DialogTitle>
            <DialogDescription>Onboard a new client workspace with its default retention policy.</DialogDescription>
          </DialogHeader>

          <div className='space-y-2'>
            <Label htmlFor='tenant-name'>Name</Label>
            <Input
              id='tenant-name'
              value={name}
              onChange={(event) => {
                const value = event.target.value
                setName(value)
                setSlug(
                  value
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/(^-|-$)/g, ''),
                )
              }}
              required
            />
          </div>

          <div className='space-y-2'>
            <Label htmlFor='tenant-slug'>Slug</Label>
            <Input
              id='tenant-slug'
              value={slug}
              onChange={(event) => setSlug(event.target.value)}
              required
            />
          </div>

          <div className='space-y-2'>
            <Label>Industry</Label>
            <Select value={industry} onValueChange={(value) => setIndustry(value as Industry)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='HEALTHCARE'>Healthcare</SelectItem>
                <SelectItem value='RESTAURANT'>Restaurant</SelectItem>
                <SelectItem value='SERVICES'>Services</SelectItem>
                <SelectItem value='RETAIL'>Retail</SelectItem>
                <SelectItem value='OTHER'>Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className='grid gap-4 sm:grid-cols-2'>
            <div className='space-y-2'>
              <Label htmlFor='retention-days'>Data retention (days)</Label>
              <Input
                id='retention-days'
                type='number'
                min={1}
                max={365}
                value={dataRetentionDays}
                onChange={(event) => setDataRetentionDays(Number(event.target.value))}
              />
            </div>
            <div className='flex items-center justify-between rounded-md border p-3'>
              <div className='space-y-0.5'>
                <p className='text-sm font-medium'>Save call recordings</p>
                <p className='text-xs text-muted-foreground'>Enable tenant-level recording storage.</p>
              </div>
              <Switch checked={saveCallRecordings} onCheckedChange={setSaveCallRecordings} />
            </div>
          </div>

          <DialogFooter>
            <Button type='submit' disabled={createTenant.isPending}>
              {createTenant.isPending ? 'Creating...' : 'Create Workspace'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
