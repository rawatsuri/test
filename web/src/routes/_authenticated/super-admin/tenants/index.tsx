import { useMemo, useState, type FormEvent } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { Plus, Search } from 'lucide-react'
import { useCreateTenant, useTenants, useUpdateTenantStatus } from '@/hooks/tenants/use-tenants'
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
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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

  return (
    <div className='space-y-6'>
      <section className='flex flex-wrap items-end justify-between gap-3'>
        <div>
          <h1 className='text-3xl font-semibold tracking-tight'>Tenants</h1>
          <p className='text-sm text-muted-foreground'>
            Provision workspaces and keep lifecycle status under control.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className='mr-2 size-4' />
          Create Tenant
        </Button>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Tenant Registry</CardTitle>
          <CardDescription>Search and open tenant workspaces.</CardDescription>
          <div className='relative mt-2 max-w-md'>
            <Search className='absolute left-3 top-3 size-4 text-muted-foreground' />
            <Input
              placeholder='Search by name or slug'
              className='pl-9'
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className='space-y-2'>
            {isLoading ? (
              <p className='text-sm text-muted-foreground'>Loading tenants...</p>
            ) : (
              filtered.map((tenant) => (
                <div key={tenant.id} className='flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3'>
                  <div className='space-y-1'>
                    <Link
                      to='/super-admin/tenants/$tenantId'
                      params={{ tenantId: tenant.id }}
                      className='text-sm font-medium hover:text-primary'
                    >
                      {tenant.name}
                    </Link>
                    <p className='text-xs text-muted-foreground'>{tenant.slug}</p>
                  </div>
                  <div className='flex flex-wrap items-center gap-2'>
                    <Badge variant='outline'>{tenant.industry}</Badge>
                    <Badge>{tenant.status}</Badge>
                    <Button asChild size='sm'>
                      <Link to='/super-admin/tenants/$tenantId' params={{ tenantId: tenant.id }}>
                        Configure AI
                      </Link>
                    </Button>
                    <Button asChild size='sm' variant='secondary'>
                      <Link to='/tenant/$tenantId/dashboard' params={{ tenantId: tenant.id }}>
                        Open Workspace
                      </Link>
                    </Button>
                    <StatusToggle tenantId={tenant.id} status={tenant.status} />
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <CreateTenantDialog open={open} onOpenChange={setOpen} />
    </div>
  )
}

function StatusToggle({ tenantId, status }: { tenantId: string; status: 'ACTIVE' | 'SUSPENDED' | 'TRIAL' }) {
  const updateStatus = useUpdateTenantStatus(tenantId)
  const nextStatus =
    status === TenantStatus.ACTIVE ? TenantStatus.SUSPENDED : TenantStatus.ACTIVE
  return (
    <Button
      size='sm'
      variant='outline'
      onClick={() => updateStatus.mutate(nextStatus)}
      disabled={updateStatus.isPending}
    >
      {status === 'ACTIVE' ? 'Suspend' : 'Activate'}
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
            <DialogTitle>Create Tenant</DialogTitle>
            <DialogDescription>Onboard a new client workspace.</DialogDescription>
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
              <Label htmlFor='retention-days'>Data Retention (Days)</Label>
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
                <p className='text-sm font-medium'>Save Call Recordings</p>
                <p className='text-xs text-muted-foreground'>Enable tenant-level recording storage.</p>
              </div>
              <Switch checked={saveCallRecordings} onCheckedChange={setSaveCallRecordings} />
            </div>
          </div>

          <DialogFooter>
            <Button type='submit' disabled={createTenant.isPending}>
              {createTenant.isPending ? 'Creating...' : 'Create Tenant'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
