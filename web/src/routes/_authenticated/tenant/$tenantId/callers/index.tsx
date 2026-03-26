import { Link, createFileRoute } from '@tanstack/react-router'
import { Search, Star } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { useWorkspaceRole } from '@/hooks/use-workspace-role'
import { useSaveCaller, useTenantCallers, useUnsaveCaller } from '@/hooks/tenant/use-tenant-data'
import { Badge } from '@/components/ui/badge'
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
      <section>
        <h1 className='text-3xl font-semibold tracking-tight'>Callers</h1>
        <p className='text-sm text-muted-foreground'>
          Persist customer memory and prioritize important callers.
        </p>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Caller Directory</CardTitle>
          <CardDescription>Search, filter by save-state, and manage caller memory.</CardDescription>
          <div className='mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-4'>
            <div className='relative sm:col-span-2 lg:col-span-3'>
              <Search className='absolute left-3 top-3 size-4 text-muted-foreground' />
              <Input
                placeholder='Search name, email, or phone'
                className='pl-9'
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <div className='space-y-1'>
              <Label>Saved State</Label>
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
        <CardContent className='space-y-2'>
          {callersQuery.isLoading ? <p className='text-sm text-muted-foreground'>Loading callers...</p> : null}
          {callersQuery.isError ? (
            <p className='text-sm text-destructive'>Failed to load callers. Please refresh.</p>
          ) : null}

          {callers.map((caller) => (
            <div
              key={caller.id}
              className='flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3'
            >
              <div>
                <Link
                  to='/tenant/$tenantId/callers/$callerId'
                  params={{ tenantId, callerId: caller.id }}
                  className='text-sm font-medium hover:text-primary'
                >
                  {caller.name || caller.phoneNumber}
                </Link>
                <p className='text-xs text-muted-foreground'>
                  {caller.phoneNumber} - {caller.totalCalls} calls
                </p>
              </div>
              <div className='flex items-center gap-2'>
                {caller.isSaved ? <Badge>Saved</Badge> : <Badge variant='outline'>Unsaved</Badge>}
                <Button
                  size='sm'
                  variant='outline'
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
            <p className='text-sm text-muted-foreground'>No callers found.</p>
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
