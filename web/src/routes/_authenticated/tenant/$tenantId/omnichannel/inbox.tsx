import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Search } from 'lucide-react'
import { toast } from 'sonner'
import { useOmnichannelConversations, useUpdateOmnichannelConversation } from '@/hooks/tenant/use-omnichannel-data'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export const Route = createFileRoute('/_authenticated/tenant/$tenantId/omnichannel/inbox')({
  component: OmnichannelInboxPage,
})

function OmnichannelInboxPage() {
  const { tenantId } = Route.useParams()
  const [search, setSearch] = useState('')
  const [channel, setChannel] = useState('ALL')
  const [status, setStatus] = useState('ALL')
  const [page, setPage] = useState(1)
  const limit = 12

  const conversationsQuery = useOmnichannelConversations(tenantId, {
    limit: String(limit),
    page: String(page),
    search,
    channel,
    status,
  })
  const updateConversation = useUpdateOmnichannelConversation(tenantId)
  const conversations = conversationsQuery.data?.data ?? []
  const pagination = conversationsQuery.data?.pagination

  const totalUnread = conversations.reduce((sum, item) => sum + item.unreadCount, 0)

  return (
    <div className='space-y-6'>
      <section className='flex flex-wrap items-end justify-between gap-3'>
        <div>
          <h1 className='text-3xl font-semibold tracking-tight'>Shared Inbox</h1>
          <p className='text-sm text-muted-foreground'>
            Unified conversation stream across voice and messaging channels.
          </p>
        </div>
        <Badge variant='secondary'>{totalUnread} unread in current view</Badge>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Conversation Queue</CardTitle>
          <CardDescription>Prioritize unresolved and escalated threads.</CardDescription>
          <div className='mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-4'>
            <div className='relative sm:col-span-2'>
              <Search className='absolute left-3 top-3 size-4 text-muted-foreground' />
              <Input
                placeholder='Search customer, contact, or summary'
                className='pl-9'
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <div className='space-y-1'>
              <Label>Channel</Label>
              <Select value={channel} onValueChange={setChannel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='ALL'>ALL</SelectItem>
                  <SelectItem value='VOICE'>VOICE</SelectItem>
                  <SelectItem value='WHATSAPP'>WHATSAPP</SelectItem>
                  <SelectItem value='WEB_CHAT'>WEB_CHAT</SelectItem>
                  <SelectItem value='EMAIL'>EMAIL</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className='space-y-1'>
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='ALL'>ALL</SelectItem>
                  <SelectItem value='OPEN'>OPEN</SelectItem>
                  <SelectItem value='PENDING'>PENDING</SelectItem>
                  <SelectItem value='AI_HANDLED'>AI_HANDLED</SelectItem>
                  <SelectItem value='ESCALATED'>ESCALATED</SelectItem>
                  <SelectItem value='RESOLVED'>RESOLVED</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className='space-y-2'>
          {conversationsQuery.isLoading ? (
            <p className='text-sm text-muted-foreground'>Loading conversations...</p>
          ) : null}
          {conversationsQuery.isError ? (
            <p className='text-sm text-destructive'>Failed to load conversations.</p>
          ) : null}

          {conversations.map((item) => (
            <div key={item.id} className='space-y-2 rounded-lg border p-3'>
              <div className='flex flex-wrap items-center justify-between gap-2'>
                <div>
                  <p className='text-sm font-medium'>{item.customerName}</p>
                  <p className='text-xs text-muted-foreground'>{item.customerContact}</p>
                </div>
                <div className='flex items-center gap-2'>
                  <Badge variant='outline'>{item.channel}</Badge>
                  <Badge variant={item.status === 'ESCALATED' ? 'destructive' : 'default'}>
                    {item.status}
                  </Badge>
                  <Badge variant='secondary'>Priority: {item.priority}</Badge>
                </div>
              </div>
              <p className='text-sm text-muted-foreground'>{item.summary}</p>
              <div className='flex flex-wrap items-center justify-between gap-2'>
                <p className='text-xs text-muted-foreground'>
                  Assigned to: {item.assignedTo ?? 'Unassigned'} | Unread: {item.unreadCount}
                </p>
                <div className='flex flex-wrap gap-2'>
                  <Button
                    size='sm'
                    variant='outline'
                    disabled={updateConversation.isPending}
                    onClick={() =>
                      updateConversation.mutate(
                        {
                          conversationId: item.id,
                          payload: { assignedTo: 'Current User', status: 'PENDING', unreadCount: 0 },
                        },
                        { onSuccess: () => toast.success('Conversation assigned') },
                      )
                    }
                  >
                    Assign Me
                  </Button>
                  <Button
                    size='sm'
                    variant='outline'
                    disabled={updateConversation.isPending}
                    onClick={() =>
                      updateConversation.mutate(
                        {
                          conversationId: item.id,
                          payload: { status: 'ESCALATED', unreadCount: 0 },
                        },
                        { onSuccess: () => toast.success('Conversation escalated') },
                      )
                    }
                  >
                    Escalate
                  </Button>
                  <Button
                    size='sm'
                    disabled={updateConversation.isPending}
                    onClick={() =>
                      updateConversation.mutate(
                        {
                          conversationId: item.id,
                          payload: { status: 'RESOLVED', unreadCount: 0 },
                        },
                        { onSuccess: () => toast.success('Conversation resolved') },
                      )
                    }
                  >
                    Resolve
                  </Button>
                </div>
              </div>
            </div>
          ))}

          {!conversationsQuery.isLoading && !conversationsQuery.isError && !conversations.length ? (
            <p className='text-sm text-muted-foreground'>No conversations found.</p>
          ) : null}

          <div className='mt-4 flex items-center justify-between border-t pt-3'>
            <p className='text-xs text-muted-foreground'>
              Page {pagination?.page ?? page}
              {pagination?.totalPages ? ` of ${pagination.totalPages}` : ''}
            </p>
            <div className='flex gap-2'>
              <Button
                size='sm'
                variant='outline'
                disabled={page <= 1 || conversationsQuery.isFetching}
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
