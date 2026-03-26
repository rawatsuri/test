import { createFileRoute } from '@tanstack/react-router'
import { toast } from 'sonner'
import { useOmnichannelChannels, useUpdateOmnichannelChannel } from '@/hooks/tenant/use-omnichannel-data'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'

export const Route = createFileRoute('/_authenticated/tenant/$tenantId/omnichannel/channels')({
  component: OmnichannelChannelsPage,
})

function OmnichannelChannelsPage() {
  const { tenantId } = Route.useParams()
  const channelsQuery = useOmnichannelChannels(tenantId)
  const updateChannel = useUpdateOmnichannelChannel(tenantId)
  const channels = channelsQuery.data ?? []

  return (
    <div className='space-y-6'>
      <section>
        <h1 className='text-3xl font-semibold tracking-tight'>Channels</h1>
        <p className='text-sm text-muted-foreground'>
          Track connectivity, AI routing, and fallback behavior per channel.
        </p>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Channel Health</CardTitle>
          <CardDescription>Enable or disable channels for AI handling.</CardDescription>
        </CardHeader>
        <CardContent className='space-y-2'>
          {channelsQuery.isLoading ? <p className='text-sm text-muted-foreground'>Loading channels...</p> : null}
          {channelsQuery.isError ? <p className='text-sm text-destructive'>Failed to load channels.</p> : null}

          {channels.map((channel) => (
            <div key={channel.id} className='space-y-3 rounded-lg border p-3'>
              <div className='flex flex-wrap items-center justify-between gap-3'>
                <div className='space-y-1'>
                  <p className='text-sm font-medium'>{channel.type}</p>
                  <p className='text-xs text-muted-foreground'>{channel.provider}</p>
                </div>
                <div className='flex flex-wrap items-center gap-2'>
                  <Badge variant={channel.health === 'HEALTHY' ? 'default' : 'secondary'}>
                    {channel.health}
                  </Badge>
                  <Badge variant={channel.isActive ? 'default' : 'outline'}>
                    {channel.isActive ? 'ACTIVE' : 'INACTIVE'}
                  </Badge>
                </div>
              </div>

              <div className='grid gap-3 sm:grid-cols-4'>
                <ToggleBlock
                  label='Channel Active'
                  checked={channel.isActive}
                  onChange={(checked) =>
                    updateChannel.mutate(
                      { channelId: channel.id, payload: { isActive: checked } },
                      { onSuccess: () => toast.success('Channel status updated') },
                    )
                  }
                  disabled={updateChannel.isPending}
                />
                <ToggleBlock
                  label='AI Handling'
                  checked={channel.aiEnabled}
                  onChange={(checked) =>
                    updateChannel.mutate(
                      { channelId: channel.id, payload: { aiEnabled: checked } },
                      { onSuccess: () => toast.success('AI setting updated') },
                    )
                  }
                  disabled={updateChannel.isPending}
                />
                <ToggleBlock
                  label='Human Fallback'
                  checked={channel.humanFallback}
                  onChange={(checked) =>
                    updateChannel.mutate(
                      { channelId: channel.id, payload: { humanFallback: checked } },
                      { onSuccess: () => toast.success('Fallback setting updated') },
                    )
                  }
                  disabled={updateChannel.isPending}
                />
                <div className='space-y-1'>
                  <p className='text-xs text-muted-foreground'>SLA Target (mins)</p>
                  <Input
                    type='number'
                    min={1}
                    max={120}
                    value={channel.slaTargetMins}
                    onChange={(event) =>
                      updateChannel.mutate(
                        {
                          channelId: channel.id,
                          payload: { slaTargetMins: Number(event.target.value) || channel.slaTargetMins },
                        },
                        { onSuccess: () => toast.success('SLA target updated') },
                      )
                    }
                    disabled={updateChannel.isPending}
                  />
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

function ToggleBlock({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string
  checked: boolean
  onChange: (value: boolean) => void
  disabled: boolean
}) {
  return (
    <div className='flex items-center justify-between rounded-md border p-2.5'>
      <p className='text-xs text-muted-foreground'>{label}</p>
      <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} />
    </div>
  )
}
