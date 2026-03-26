import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { toast } from 'sonner'
import { useWorkspaceRole } from '@/hooks/use-workspace-role'
import {
  useCreateTenantPhoneNumber,
  useDeleteTenantPhoneNumber,
  useTenantPhoneNumbers,
} from '@/hooks/tenant/use-tenant-data'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
        onError: () => toast.error('Failed to add phone number'),
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
            <div key={phone.id} className='flex items-center justify-between rounded-lg border p-3'>
              <div>
                <p className='text-sm font-medium'>{phone.number}</p>
                <p className='text-xs text-muted-foreground'>
                  {phone.provider} - {phone.label || 'No label'}
                </p>
              </div>
              <Button
                variant='outline'
                size='sm'
                disabled={!canEditConfig || deleteNumber.isPending}
                onClick={() =>
                  deleteNumber.mutate(phone.id, {
                    onSuccess: () => toast.success('Phone number removed'),
                    onError: () => toast.error('Failed to remove phone number'),
                  })
                }
              >
                Remove
              </Button>
            </div>
          ))}

          {!numbersQuery.isLoading && !numbersQuery.isError && !numbersQuery.data?.length ? (
            <p className='text-sm text-muted-foreground'>No phone numbers configured.</p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
