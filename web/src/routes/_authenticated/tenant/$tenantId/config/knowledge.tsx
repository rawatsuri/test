import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/lib/api-error-message'
import { useWorkspaceRole } from '@/hooks/use-workspace-role'
import {
  useCreateTenantKnowledge,
  useDeleteTenantKnowledge,
  useTenantKnowledge,
  useUpdateTenantKnowledge,
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
import { Textarea } from '@/components/ui/textarea'

export const Route = createFileRoute('/_authenticated/tenant/$tenantId/config/knowledge')({
  component: KnowledgePage,
})

function KnowledgePage() {
  const { tenantId } = Route.useParams()
  const knowledgeQuery = useTenantKnowledge(tenantId)
  const createKnowledge = useCreateTenantKnowledge(tenantId)
  const deleteKnowledge = useDeleteTenantKnowledge(tenantId)
  const { canEditConfig, role } = useWorkspaceRole()

  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('')
  const [content, setContent] = useState('')

  const knowledgeItems = knowledgeQuery.data?.data ?? []

  const onSaveItem = () => {
    if (!canEditConfig) {
      toast.error(`Role ${role} cannot modify knowledge base`)
      return
    }
    if (!title.trim() || !content.trim()) {
      toast.error('Title and content are required')
      return
    }

    createKnowledge.mutate(
      {
        title,
        category,
        content,
      },
      {
        onSuccess: () => {
          toast.success('Knowledge item saved')
          setTitle('')
          setCategory('')
          setContent('')
        },
        onError: (error) => toast.error(getApiErrorMessage(error, 'Failed to save knowledge item')),
      },
    )
  }

  return (
    <div className='space-y-6'>
      <section>
        <h1 className='text-3xl font-semibold tracking-tight'>Knowledge Base</h1>
        <p className='text-sm text-muted-foreground'>Keep prompt context grounded in business-specific facts.</p>
      </section>

      {!canEditConfig ? (
        <p className='rounded-md border border-amber-500/40 bg-amber-50 p-3 text-sm text-amber-800'>
          Role {role} has read-only access to knowledge configuration.
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Add Knowledge Item</CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='grid gap-4 sm:grid-cols-2'>
            <div className='space-y-2'>
              <Label htmlFor='title'>Title</Label>
              <Input
                id='title'
                value={title}
                disabled={!canEditConfig}
                onChange={(event) => setTitle(event.target.value)}
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='category'>Category</Label>
              <Input
                id='category'
                value={category}
                disabled={!canEditConfig}
                onChange={(event) => setCategory(event.target.value)}
              />
            </div>
          </div>
          <div className='space-y-2'>
            <Label htmlFor='content'>Content</Label>
            <Textarea
              id='content'
              rows={6}
              value={content}
              disabled={!canEditConfig}
              onChange={(event) => setContent(event.target.value)}
            />
          </div>
          <Button disabled={!canEditConfig || createKnowledge.isPending} onClick={onSaveItem}>
            Save Item
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Knowledge Items</CardTitle>
          <CardDescription>Current indexed business context.</CardDescription>
        </CardHeader>
        <CardContent className='space-y-2'>
          {knowledgeQuery.isLoading ? <p className='text-sm text-muted-foreground'>Loading knowledge...</p> : null}
          {knowledgeQuery.isError ? (
            <p className='text-sm text-destructive'>Failed to load knowledge items.</p>
          ) : null}

          {knowledgeItems.map((item) => (
            <KnowledgeRow
              key={item.id}
              tenantId={tenantId}
              item={item}
              canEditConfig={canEditConfig}
              deleting={deleteKnowledge.isPending}
              onDelete={() =>
                deleteKnowledge.mutate(item.id, {
                  onSuccess: () => toast.success('Knowledge item removed'),
                  onError: (error) => toast.error(getApiErrorMessage(error, 'Failed to remove knowledge item')),
                })
              }
            />
          ))}

          {!knowledgeQuery.isLoading && !knowledgeQuery.isError && !knowledgeItems.length ? (
            <p className='text-sm text-muted-foreground'>No knowledge items added yet.</p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}

function KnowledgeRow({
  tenantId,
  item,
  canEditConfig,
  deleting,
  onDelete,
}: {
  tenantId: string
  item: { id: string; title: string; category: string | null; content: string }
  canEditConfig: boolean
  deleting: boolean
  onDelete: () => void
}) {
  const updateKnowledge = useUpdateTenantKnowledge(tenantId, item.id)
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState(item.title)
  const [category, setCategory] = useState(item.category ?? '')
  const [content, setContent] = useState(item.content)

  return (
    <div className='rounded-lg border p-3'>
      <div className='flex items-start justify-between gap-4'>
        <div className='min-w-0 space-y-1'>
          <p className='text-sm font-medium'>{item.title}</p>
          <p className='text-xs text-muted-foreground'>{item.category || 'General'}</p>
          <p className='line-clamp-3 text-sm text-muted-foreground'>{item.content}</p>
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Knowledge Item</DialogTitle>
            <DialogDescription>Update the facts and policies available to the voice agent.</DialogDescription>
          </DialogHeader>

          <div className='grid gap-4 sm:grid-cols-2'>
            <div className='space-y-2'>
              <Label>Title</Label>
              <Input value={title} onChange={(event) => setTitle(event.target.value)} />
            </div>
            <div className='space-y-2'>
              <Label>Category</Label>
              <Input value={category} onChange={(event) => setCategory(event.target.value)} />
            </div>
          </div>

          <div className='space-y-2'>
            <Label>Content</Label>
            <Textarea rows={6} value={content} onChange={(event) => setContent(event.target.value)} />
          </div>

          <DialogFooter>
            <Button variant='outline' onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={updateKnowledge.isPending}
              onClick={() =>
                updateKnowledge.mutate(
                  { title, category, content },
                  {
                    onSuccess: () => {
                      toast.success('Knowledge item updated')
                      setOpen(false)
                    },
                    onError: (error) => toast.error(getApiErrorMessage(error, 'Failed to update knowledge item')),
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
