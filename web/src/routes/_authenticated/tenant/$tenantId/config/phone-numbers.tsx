import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/lib/api-error-message'
import { useWorkspaceRole } from '@/hooks/use-workspace-role'
import {
  useCreateTenantPhoneNumber,
  useDeleteTenantPhoneNumber,
  useTenantPhoneNumbers,
  useUpdateTenantPhoneNumber,
} from '@/hooks/tenant/use-tenant-data'
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
import { Provider } from '@/types'

export const Route = createFileRoute('/_authenticated/tenant/$tenantId/config/phone-numbers')({
  component: PhoneNumbersPage,
})

function PhoneNumbersPage() {
  const { tenantId } = Route.useParams()
  const numbersQuery = useTenantPhoneNumbers(tenantId)
  const createNumber = useCreateTenantPhoneNumber(tenantId)
  const deleteNumber = useDeleteTenantPhoneNumber(tenantId)
  const { canEditConfig, role } = useWorkspaceRole()

  const [number, setNumber] = useState('')
  const [label, setLabel] = useState('')
  const [provider, setProvider] = useState<Provider>(Provider.EXOTEL)

  const onAddNumber = () => {
    if (!canEditConfig) {
      toast.error(`Role ${role} cannot add phone numbers`)
      return
    }
    if (!number.trim()) {
      toast.error('Phone number is required')
      return
    }

    createNumber.mutate(
      {
        number,
        label,
        provider,
      },
      {
        onSuccess: () => {
          toast.success('Phone number added')
          setNumber('')
          setLabel('')
        },
        onError: (error) => toast.error(getApiErrorMessage(error, 'Failed to add phone number')),
      },
    )
  }

  return (
    <div className='space-y-6'>
      <section>
        <h1 className='text-3xl font-semibold tracking-tight'>Phone Numbers</h1>
        <p className='text-sm text-muted-foreground'>Attach and manage telephony lines for this tenant.</p>
      </section>

      {!canEditConfig ? (
        <p className='rounded-md border border-amber-500/40 bg-amber-50 p-3 text-sm text-amber-800'>
          Role {role} has read-only access to phone number configuration.
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Add Number</CardTitle>
        </CardHeader>
        <CardContent className='grid gap-4 sm:grid-cols-4'>
          <div className='sm:col-span-2'>
            <Label htmlFor='number'>Number</Label>
            <Input
              id='number'
              value={number}
              disabled={!canEditConfig}
              onChange={(event) => setNumber(event.target.value)}
            />
          </div>
          <div>
            <Label htmlFor='label'>Label</Label>
            <Input
              id='label'
              value={label}
              disabled={!canEditConfig}
              onChange={(event) => setLabel(event.target.value)}
            />
          </div>
          <div>
            <Label>Provider</Label>
            <Select
              value={provider}
              disabled={!canEditConfig}
              onValueChange={(value) => setProvider(value as Provider)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='EXOTEL'>EXOTEL</SelectItem>
                <SelectItem value='PLIVO'>PLIVO</SelectItem>
                <SelectItem value='TWILIO'>TWILIO</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            className='sm:col-span-4 sm:w-fit'
            disabled={!canEditConfig || createNumber.isPending}
            onClick={onAddNumber}
          >
            Add Number
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Configured Numbers</CardTitle>
          <CardDescription>Remove lines that should no longer receive calls.</CardDescription>
        </CardHeader>
        <CardContent className='space-y-2'>
          {numbersQuery.isLoading ? <p className='text-sm text-muted-foreground'>Loading numbers...</p> : null}
          {numbersQuery.isError ? (
            <p className='text-sm text-destructive'>Failed to load numbers.</p>
          ) : null}

          {numbersQuery.data?.map((phone) => (
            <PhoneNumberRow
              key={phone.id}
              phone={phone}
              canEditConfig={canEditConfig}
              deleting={deleteNumber.isPending}
              tenantId={tenantId}
              onDelete={() =>
                deleteNumber.mutate(phone.id, {
                  onSuccess: () => toast.success('Phone number removed'),
                  onError: (error) => toast.error(getApiErrorMessage(error, 'Failed to remove phone number')),
                })
              }
            />
          ))}

          {!numbersQuery.isLoading && !numbersQuery.isError && !numbersQuery.data?.length ? (
            <p className='text-sm text-muted-foreground'>No phone numbers configured.</p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}

function PhoneNumberRow({
  tenantId,
  phone,
  canEditConfig,
  deleting,
  onDelete,
}: {
  tenantId: string
  phone: { id: string; number: string; provider: Provider; label: string | null; isActive: boolean }
  canEditConfig: boolean
  deleting: boolean
  onDelete: () => void
}) {
  const updateNumber = useUpdateTenantPhoneNumber(tenantId, phone.id)
  const [open, setOpen] = useState(false)
  const [label, setLabel] = useState(phone.label ?? '')

  return (
    <div className='flex flex-col gap-3 rounded-lg border p-3'>
      <div className='flex items-center justify-between gap-4'>
        <div>
          <p className='text-sm font-medium'>{phone.number}</p>
          <p className='text-xs text-muted-foreground'>
            {phone.provider} · {phone.isActive ? 'Active' : 'Inactive'}
          </p>
        </div>
        <div className='flex items-center gap-2'>
          {canEditConfig ? (
            <Button variant='outline' size='sm' onClick={() => setOpen(true)}>
              Edit
            </Button>
          ) : null}
          <Button variant='outline' size='sm' disabled={!canEditConfig || deleting} onClick={onDelete}>
            Remove
          </Button>
        </div>
      </div>
      <p className='text-sm text-muted-foreground'>Label: {phone.label || 'Unlabeled'}</p>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Phone Line</DialogTitle>
            <DialogDescription>Update the internal label used to identify this number.</DialogDescription>
          </DialogHeader>

          <div className='space-y-2'>
            <Label>Number</Label>
            <Input value={phone.number} disabled />
          </div>

          <div className='space-y-2'>
            <Label>Provider</Label>
            <Input value={phone.provider} disabled />
          </div>

          <div className='space-y-2'>
            <Label>Label</Label>
            <Input value={label} onChange={(event) => setLabel(event.target.value)} />
          </div>

          <DialogFooter>
            <Button variant='outline' onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={updateNumber.isPending}
              onClick={() =>
                updateNumber.mutate(
                  { label },
                  {
                    onSuccess: () => {
                      toast.success('Phone number updated')
                      setOpen(false)
                    },
                    onError: (error) => toast.error(getApiErrorMessage(error, 'Failed to update phone number')),
                  },
                )
              }
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
