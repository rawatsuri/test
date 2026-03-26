import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { platformService, unwrap } from '@/lib/platform-service'
import type { Plan, TenantStatus, CreateTenantRequest, UpdateTenantRequest } from '@/types'

const TENANTS_QUERY_KEY = 'tenants'

// Get all tenants
export function useTenants() {
  return useQuery({
    queryKey: [TENANTS_QUERY_KEY],
    queryFn: async () => {
      return unwrap(await platformService.getTenants())
    },
  })
}

// Get tenant by ID
export function useTenant(id: string) {
  return useQuery({
    queryKey: [TENANTS_QUERY_KEY, id],
    queryFn: async () => {
      return unwrap(await platformService.getTenant(id))
    },
    enabled: !!id,
  })
}

// Create tenant
export function useCreateTenant() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateTenantRequest) => {
      return unwrap(await platformService.createTenant(data))
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TENANTS_QUERY_KEY] })
    },
  })
}

// Update tenant
export function useUpdateTenant(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: UpdateTenantRequest) => {
      return unwrap(await platformService.updateTenant(id, data))
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TENANTS_QUERY_KEY] })
      queryClient.invalidateQueries({ queryKey: [TENANTS_QUERY_KEY, id] })
    },
  })
}

// Delete tenant
export function useDeleteTenant() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      await platformService.deleteTenant(id)
      return id
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TENANTS_QUERY_KEY] })
    },
  })
}

// Update tenant status
export function useUpdateTenantStatus(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (status: TenantStatus) => {
      return unwrap(await platformService.updateTenant(id, { status }))
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TENANTS_QUERY_KEY] })
      queryClient.invalidateQueries({ queryKey: [TENANTS_QUERY_KEY, id] })
    },
  })
}

// Update tenant plan
export function useUpdateTenantPlan(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (plan: Plan) => {
      return unwrap(await platformService.updateTenant(id, { plan }))
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TENANTS_QUERY_KEY] })
      queryClient.invalidateQueries({ queryKey: [TENANTS_QUERY_KEY, id] })
    },
  })
}
