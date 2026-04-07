import { Link, createFileRoute } from '@tanstack/react-router'
import { Search, Star } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useWorkspaceRole } from '@/hooks/use-workspace-role'
import {
  useSaveCaller,
  useTenantCallers,
  useUnsaveCaller,
} from '@/hooks/tenant/use-tenant-data'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export const Route = createFileRoute('/_authenticated/tenant/$tenantId/callers/')({
  component: CallersListPage,
})

function CallersListPage() {
  const { tenantId } = Route.useParams()
  const [search, setSearch] = useState('')
  const [isSavedFilter, setIsSavedFilter] = useState('ALL')
  const [page, setPage] = useState(1)
  const limit = 20
  const { canManageCallers, role } = useWorkspaceRole()

  const callersQuery = useTenantCallers(tenantId, {
    limit: String(limit),
    page: String(page),
    search,
    ...(isSavedFilter === 'SAVED' ? { isSaved: 'true' } : {}),
    ...(isSavedFilter === 'UNSAVED' ? { isSaved: 'false' } : {}),
  })
  const saveCaller = useSaveCaller(tenantId)
  const unsaveCaller = useUnsaveCaller(tenantId)
  const callers = callersQuery.data?.data ?? []
  const pagination = callersQuery.data?.pagination

  const savedCount = useMemo(
    () => callers.filter((caller) => caller.isSaved).length,
    [callers],
  )

  const onToggleSave = (callerId: string, isSaved: boolean) => {
    if (!canManageCallers) {
      toast.error(`Role ${role} cannot modify caller save state`)
      return
    }

    if (isSaved) {
      unsaveCaller.mutate(callerId, {
        onSuccess: () => toast.success('Caller unsaved'),
        onError: () => toast.error('Failed to unsave caller'),
      })
    } else {
      saveCaller.mutate(callerId, {
        onSuccess: () => toast.success('Caller saved'),
        onError: () => toast.error('Failed to save caller'),
      })
    }
  }

  return (
    <div className='space-y-6'>
      <section className='grid gap-4 xl:grid-cols-[1.4fr_0.8fr]'>
        <Card className='border-border/70 bg-gradient-to-br from-primary/5 via-background to-background'>
          <CardHeader className='space-y-3'>
            <div className='space-y-2'>
              <p className='text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground'>
                Caller directory
              </p>
              <CardTitle className='text-3xl tracking-tight'>Keep customer memory useful</CardTitle>
              <CardDescription className='max-w-2xl text-sm leading-6'>
                This list should make it obvious who matters, what they called about, and whether
                the workspace wants to keep that caller around.
              </CardDescription>
            </div>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className='text-base'>Current page</CardTitle>
            <CardDescription>Counts for the currently loaded caller slice.</CardDescription>
          </CardHeader>
          <CardContent className='grid gap-3 sm:grid-cols-2 xl:grid-cols-1'>
            <ListStat label='Loaded callers' value={String(callers.length)} />
            <ListStat label='Saved callers' value={String(savedCount)} />
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader className='space-y-4'>
          <div>
            <CardTitle>Caller list</CardTitle>
            <CardDescription>Search by phone, name, or email and manage saved state inline.</CardDescription>
          </div>
          <div className='grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px]'>
            <div className='relative'>
              <Search className='absolute left-3 top-3 size-4 text-muted-foreground' />
              <Input
                placeholder='Search name, email, or phone'
                className='pl-9'
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <div className='space-y-1'>
              <Label>Saved state</Label>
              <Select value={isSavedFilter} onValueChange={setIsSavedFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='ALL'>ALL</SelectItem>
                  <SelectItem value='SAVED'>SAVED</SelectItem>
                  <SelectItem value='UNSAVED'>UNSAVED</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className='space-y-3'>
          {callersQuery.isLoading ? <p className='text-sm text-muted-foreground'>Loading callers...</p> : null}
          {callersQuery.isError ? (
            <p className='text-sm text-destructive'>Failed to load callers. Please refresh.</p>
          ) : null}

          <div className='hidden grid-cols-[minmax(0,1.1fr)_100px_140px_170px_130px] gap-3 border-b pb-3 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground md:grid'>
            <span>Caller</span>
            <span>Saved</span>
            <span>Total calls</span>
            <span>Last call</span>
            <span>Action</span>
          </div>

          {callers.map((caller) => (
            <div
              key={caller.id}
              className='grid gap-3 rounded-xl border border-border/70 px-4 py-4 md:grid-cols-[minmax(0,1.1fr)_100px_140px_170px_130px] md:items-center'
            >
              <div className='min-w-0'>
                <Link
                  to='/tenant/$tenantId/callers/$callerId'
                  params={{ tenantId, callerId: caller.id }}
                  className='block truncate text-sm font-semibold hover:text-primary'
                >
                  {caller.name || caller.phoneNumber}
                </Link>
                <p className='truncate text-xs text-muted-foreground'>
                  {caller.phoneNumber}
                  {caller.email ? ` · ${caller.email}` : ''}
                </p>
              </div>
              <div className='text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground'>
                {caller.isSaved ? 'Saved' : 'Unsaved'}
              </div>
              <div className='text-sm text-muted-foreground'>{caller.totalCalls} calls</div>
              <div className='text-sm text-muted-foreground'>
                {new Date(caller.lastCallAt).toLocaleDateString()}
              </div>
              <div>
                <Button
                  size='sm'
                  variant={caller.isSaved ? 'secondary' : 'outline'}
                  disabled={!canManageCallers || saveCaller.isPending || unsaveCaller.isPending}
                  onClick={() => onToggleSave(caller.id, caller.isSaved)}
                >
                  <Star className='mr-2 size-4' />
                  {caller.isSaved ? 'Unsave' : 'Save'}
                </Button>
              </div>
            </div>
          ))}

          {!callersQuery.isLoading && !callersQuery.isError && !callers.length ? (
            <p className='rounded-xl border border-dashed p-6 text-sm text-muted-foreground'>
              No callers found for this filter.
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
                disabled={page <= 1 || callersQuery.isFetching}
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
