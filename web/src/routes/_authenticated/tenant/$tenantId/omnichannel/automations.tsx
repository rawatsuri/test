import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { toast } from 'sonner'
import {
  useCreateOmnichannelAutomation,
  useDeleteOmnichannelAutomation,
  useOmnichannelAutomations,
  useUpdateOmnichannelAutomation,
} from '@/hooks/tenant/use-omnichannel-data'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

export const Route = createFileRoute('/_authenticated/tenant/$tenantId/omnichannel/automations')({
  component: OmnichannelAutomationsPage,
})

function OmnichannelAutomationsPage() {
  const { tenantId } = Route.useParams()
  const automationsQuery = useOmnichannelAutomations(tenantId)
  const createAutomation = useCreateOmnichannelAutomation(tenantId)
  const updateAutomation = useUpdateOmnichannelAutomation(tenantId)
  const deleteAutomation = useDeleteOmnichannelAutomation(tenantId)
  const automations = automationsQuery.data ?? []

  const [name, setName] = useState('')
  const [trigger, setTrigger] = useState('')
  const [description, setDescription] = useState('')

  const onCreate = () => {
    if (!name.trim() || !trigger.trim() || !description.trim()) {
      toast.error('Name, trigger, and description are required')
      return
    }
    createAutomation.mutate(
      { name, trigger, description },
      {
        onSuccess: () => {
          setName('')
          setTrigger('')
          setDescription('')
          toast.success('Automation created')
        },
      },
    )
  }

  return (
    <div className='space-y-6'>
      <section>
        <h1 className='text-3xl font-semibold tracking-tight'>Automations</h1>
        <p className='text-sm text-muted-foreground'>
          Configure AI workflows for intake, follow-ups, and escalations.
        </p>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Create Automation</CardTitle>
          <CardDescription>Design a workflow with trigger and execution notes.</CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='grid gap-4 sm:grid-cols-2'>
            <div className='space-y-1'>
              <Label>Name</Label>
              <Input value={name} onChange={(event) => setName(event.target.value)} />
            </div>
            <div className='space-y-1'>
              <Label>Trigger</Label>
              <Input value={trigger} onChange={(event) => setTrigger(event.target.value)} />
            </div>
          </div>
          <div className='space-y-1'>
            <Label>Description</Label>
            <Textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} />
          </div>
          <Button onClick={onCreate} disabled={createAutomation.isPending}>
            Create Workflow
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Workflow Library</CardTitle>
          <CardDescription>Template-driven automations for omnichannel operations.</CardDescription>
        </CardHeader>
        <CardContent className='space-y-2'>
          {automationsQuery.isLoading ? <p className='text-sm text-muted-foreground'>Loading automations...</p> : null}
          {automationsQuery.isError ? <p className='text-sm text-destructive'>Failed to load automations.</p> : null}

          {automations.map((flow) => (
            <div key={flow.id} className='space-y-2 rounded-lg border p-3'>
              <div className='flex flex-wrap items-center justify-between gap-2'>
                <div className='space-y-1'>
                  <p className='text-sm font-medium'>{flow.name}</p>
                  <p className='text-xs text-muted-foreground'>Trigger: {flow.trigger}</p>
                </div>
                <div className='flex flex-wrap items-center gap-2'>
                  <Badge variant={flow.status === 'ACTIVE' ? 'default' : 'outline'}>{flow.status}</Badge>
                  <Badge variant='secondary'>Runs: {flow.runCount}</Badge>
                </div>
              </div>
              <p className='text-sm text-muted-foreground'>{flow.description}</p>
              <div className='flex flex-wrap gap-2'>
                <Button
                  size='sm'
                  variant='outline'
                  disabled={updateAutomation.isPending}
                  onClick={() =>
                    updateAutomation.mutate(
                      {
                        automationId: flow.id,
                        payload: { status: flow.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE' },
                      },
                      { onSuccess: () => toast.success('Workflow status updated') },
                    )
                  }
                >
                  {flow.status === 'ACTIVE' ? 'Pause' : 'Activate'}
                </Button>
                <Button
                  size='sm'
                  variant='outline'
                  disabled={updateAutomation.isPending}
                  onClick={() =>
                    updateAutomation.mutate(
                      {
                        automationId: flow.id,
                        payload: { description: `${flow.description} (edited)` },
                      },
                      { onSuccess: () => toast.success('Workflow updated') },
                    )
                  }
                >
                  Quick Edit
                </Button>
                <Button
                  size='sm'
                  variant='destructive'
                  disabled={deleteAutomation.isPending}
                  onClick={() =>
                    deleteAutomation.mutate(flow.id, {
                      onSuccess: () => toast.success('Workflow deleted'),
                    })
                  }
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
