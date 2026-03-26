import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { platformService, unwrap } from '@/lib/platform-service'
import type { BookingOrder } from '@/types'

export function useBookingOrders(tenantId: string, filters?: Record<string, string>) {
  return useQuery({
    queryKey: ['booking-orders', tenantId, filters],
    queryFn: async () => platformService.getBookingOrders(tenantId, filters),
    enabled: !!tenantId,
  })
}

export function useUpdateBookingOrder(tenantId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      bookingOrderId,
      payload,
    }: {
      bookingOrderId: string
      payload: Partial<BookingOrder>
    }) => unwrap(await platformService.updateBookingOrder(tenantId, bookingOrderId, payload)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking-orders', tenantId] })
    },
  })
}
