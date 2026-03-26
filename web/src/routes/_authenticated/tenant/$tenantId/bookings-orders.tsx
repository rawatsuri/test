import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Search } from 'lucide-react'
import { toast } from 'sonner'
import { useBookingOrders, useUpdateBookingOrder } from '@/hooks/tenant/use-booking-orders'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export const Route = createFileRoute('/_authenticated/tenant/$tenantId/bookings-orders')({
  component: BookingsOrdersPage,
})

function BookingsOrdersPage() {
  const { tenantId } = Route.useParams()
  const [search, setSearch] = useState('')
  const [type, setType] = useState('ALL')
  const [status, setStatus] = useState('ALL')
  const [page, setPage] = useState(1)
  const limit = 20

  const bookingsOrdersQuery = useBookingOrders(tenantId, {
    search,
    type,
    status,
    page: String(page),
    limit: String(limit),
  })
  const updateBookingOrder = useUpdateBookingOrder(tenantId)
  const rows = bookingsOrdersQuery.data?.data ?? []
  const pagination = bookingsOrdersQuery.data?.pagination

  const bookingsCount = rows.filter((row) => row.type === 'BOOKING').length
  const ordersCount = rows.filter((row) => row.type === 'ORDER').length
  const pendingCount = rows.filter((row) => ['NEW', 'CONFIRMED', 'IN_PROGRESS'].includes(row.status)).length

  return (
    <div className='space-y-6'>
      <section>
        <h1 className='text-3xl font-semibold tracking-tight'>Bookings / Orders</h1>
        <p className='text-sm text-muted-foreground'>
          Track service bookings and customer orders from all channels.
        </p>
      </section>

      <section className='grid gap-4 sm:grid-cols-3'>
        <Metric title='Bookings' value={bookingsCount} />
        <Metric title='Orders' value={ordersCount} />
        <Metric title='Pending Actions' value={pendingCount} />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Queue</CardTitle>
          <CardDescription>Review, confirm, progress, and complete workflows.</CardDescription>
          <div className='mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-4'>
            <div className='relative sm:col-span-2'>
              <Search className='absolute left-3 top-3 size-4 text-muted-foreground' />
              <Input
                placeholder='Search customer, phone, or item'
                className='pl-9'
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <div className='space-y-1'>
              <Label>Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value='ALL'>ALL</SelectItem>
                  <SelectItem value='BOOKING'>BOOKING</SelectItem>
                  <SelectItem value='ORDER'>ORDER</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className='space-y-1'>
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value='ALL'>ALL</SelectItem>
                  <SelectItem value='NEW'>NEW</SelectItem>
                  <SelectItem value='CONFIRMED'>CONFIRMED</SelectItem>
                  <SelectItem value='IN_PROGRESS'>IN_PROGRESS</SelectItem>
                  <SelectItem value='COMPLETED'>COMPLETED</SelectItem>
                  <SelectItem value='CANCELLED'>CANCELLED</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className='space-y-2'>
          {bookingsOrdersQuery.isLoading ? <p className='text-sm text-muted-foreground'>Loading queue...</p> : null}
          {bookingsOrdersQuery.isError ? <p className='text-sm text-destructive'>Failed to load queue.</p> : null}

          {rows.map((row) => (
            <div key={row.id} className='space-y-2 rounded-lg border p-3'>
              <div className='flex flex-wrap items-center justify-between gap-2'>
                <div>
                  <p className='text-sm font-medium'>{row.customerName}</p>
                  <p className='text-xs text-muted-foreground'>{row.customerPhone}</p>
                </div>
                <div className='flex flex-wrap items-center gap-2'>
                  <Badge variant='outline'>{row.type}</Badge>
                  <Badge variant='secondary'>{row.channel}</Badge>
                  <Badge>{row.status}</Badge>
                </div>
              </div>
              <p className='text-sm text-muted-foreground'>{row.itemSummary}</p>
              <div className='flex flex-wrap items-center justify-between gap-2'>
                <p className='text-xs text-muted-foreground'>
                  Created: {new Date(row.createdAt).toLocaleString()}
                  {row.scheduledAt ? ` | Scheduled: ${new Date(row.scheduledAt).toLocaleString()}` : ''}
                  {row.amount !== null ? ` | Amount: ₹${row.amount}` : ''}
                </p>
                <div className='flex flex-wrap gap-2'>
                  <Button
                    size='sm'
                    variant='outline'
                    disabled={updateBookingOrder.isPending || row.status === 'CONFIRMED'}
                    onClick={() =>
                      updateBookingOrder.mutate(
                        {
                          bookingOrderId: row.id,
                          payload: { status: 'CONFIRMED' },
                        },
                        { onSuccess: () => toast.success('Marked as confirmed') },
                      )
                    }
                  >
                    Confirm
                  </Button>
                  <Button
                    size='sm'
                    variant='outline'
                    disabled={updateBookingOrder.isPending || row.status === 'IN_PROGRESS'}
                    onClick={() =>
                      updateBookingOrder.mutate(
                        {
                          bookingOrderId: row.id,
                          payload: { status: 'IN_PROGRESS' },
                        },
                        { onSuccess: () => toast.success('Marked in progress') },
                      )
                    }
                  >
                    In Progress
                  </Button>
                  <Button
                    size='sm'
                    disabled={updateBookingOrder.isPending || row.status === 'COMPLETED'}
                    onClick={() =>
                      updateBookingOrder.mutate(
                        {
                          bookingOrderId: row.id,
                          payload: { status: 'COMPLETED' },
                        },
                        { onSuccess: () => toast.success('Marked as completed') },
                      )
                    }
                  >
                    Complete
                  </Button>
                </div>
              </div>
            </div>
          ))}

          {!bookingsOrdersQuery.isLoading && !bookingsOrdersQuery.isError && !rows.length ? (
            <p className='text-sm text-muted-foreground'>No bookings or orders found.</p>
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
                disabled={page <= 1 || bookingsOrdersQuery.isFetching}
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

function Metric({ title, value }: { title: string; value: number }) {
  return (
    <Card>
      <CardHeader className='pb-2'>
        <CardTitle className='text-sm'>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className='text-2xl font-semibold'>{value}</p>
      </CardContent>
    </Card>
  )
}
