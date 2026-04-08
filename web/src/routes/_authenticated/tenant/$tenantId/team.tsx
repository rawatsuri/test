import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/lib/api-error-message'
import { requireWorkspaceManager } from '@/lib/auth'
import { useWorkspaceRole } from '@/hooks/use-workspace-role'
import {
  useCreateTenantUser,
  useDeleteTenantUser,
  useTenantUsers,
  useUpdateTenantUser,
} from '@/hooks/tenant/use-tenant-data'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { UserRole } from '@/types'

export const Route = createFileRoute('/_authenticated/tenant/$tenantId/team')({
  beforeLoad: ({ context, location, params }) => {
    requireWorkspaceManager(context.auth, params.tenantId, location.href)
  },
  component: TeamPage,
})

function TeamPage() {
  const { tenantId } = Route.useParams()
  const usersQuery = useTenantUsers(tenantId)
  const createUser = useCreateTenantUser(tenantId)
  const deleteUser = useDeleteTenantUser(tenantId)
  const { canManageTeam, role: workspaceRole } = useWorkspaceRole()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<UserRole>(UserRole.ADMIN)

  const onCreateMember = () => {
    if (!canManageTeam) {
      toast.error(`Role ${workspaceRole} cannot add team members`)
      return
    }
    if (!email.trim()) {
      toast.error('Email is required')
      return
    }

    createUser.mutate(
      {
        name,
        email,
        role,
      },
      {
        onSuccess: () => {
          toast.success('Member added')
          setName('')
          setEmail('')
        },
        onError: (error) => toast.error(getApiErrorMessage(error, 'Failed to add member')),
      },
    )
  }

  return (
    <div className='space-y-6'>
      <section>
        <h1 className='text-3xl font-semibold tracking-tight'>Team & Sub Admins</h1>
        <p className='text-sm text-muted-foreground'>Add 2-3 operational sub-admins and assign roles.</p>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Add Member</CardTitle>
        </CardHeader>
        <CardContent className='grid gap-4 sm:grid-cols-4'>
          <div className='sm:col-span-1'>
            <Label>Name</Label>
            <Input value={name} onChange={(event) => setName(event.target.value)} disabled={!canManageTeam} />
          </div>
          <div className='sm:col-span-2'>
            <Label>Email</Label>
            <Input value={email} onChange={(event) => setEmail(event.target.value)} disabled={!canManageTeam} />
          </div>
          <div>
            <Label>Role</Label>
            <Select value={role} onValueChange={(value) => setRole(value as UserRole)} disabled={!canManageTeam}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={UserRole.ADMIN}>ADMIN</SelectItem>
                <SelectItem value={UserRole.MEMBER}>MEMBER</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            className='sm:col-span-4 sm:w-fit'
            disabled={!canManageTeam || createUser.isPending}
            onClick={onCreateMember}
          >
            Add Member
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current Team</CardTitle>
          <CardDescription>Role-based operations for this tenant.</CardDescription>
        </CardHeader>
        <CardContent className='space-y-2'>
          {usersQuery.isLoading ? <p className='text-sm text-muted-foreground'>Loading team...</p> : null}
          {usersQuery.isError ? (
            <p className='text-sm text-destructive'>Failed to load team members.</p>
          ) : null}
          {usersQuery.data?.map((user) => (
            <TeamRow
              key={user.id}
              tenantId={tenantId}
              user={user}
              canManageTeam={canManageTeam}
              onDelete={() =>
                deleteUser.mutate(user.id, {
                  onSuccess: () => toast.success('Member removed'),
                  onError: (error) => toast.error(getApiErrorMessage(error, 'Failed to remove member')),
                })
              }
            />
          ))}
          {!usersQuery.isLoading && !usersQuery.isError && !usersQuery.data?.length ? (
            <p className='text-sm text-muted-foreground'>No team members yet.</p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}

function TeamRow({
  tenantId,
  user,
  onDelete,
  canManageTeam,
}: {
  tenantId: string
  user: { id: string; name: string | null; email: string; role: UserRole }
  onDelete: () => void
  canManageTeam: boolean
}) {
  const updateRole = useUpdateTenantUser(tenantId, user.id)

  return (
    <div className='flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3'>
      <div>
        <p className='text-sm font-medium'>{user.name || 'Unnamed User'}</p>
        <p className='text-xs text-muted-foreground'>{user.email}</p>
      </div>
      <div className='flex items-center gap-2'>
        <Badge variant='outline'>{user.role}</Badge>
        <Button
          size='sm'
          variant='outline'
          disabled={!canManageTeam || updateRole.isPending}
          onClick={() =>
            updateRole.mutate(
              {
                role: user.role === UserRole.ADMIN ? UserRole.MEMBER : UserRole.ADMIN,
              },
              {
                onSuccess: () => toast.success('Role updated'),
                onError: (error) => toast.error(getApiErrorMessage(error, 'Failed to update role')),
              },
            )
          }
        >
          Toggle Role
        </Button>
        <Button size='sm' variant='outline' disabled={!canManageTeam} onClick={onDelete}>
          Remove
        </Button>
      </div>
    </div>
  )
}
