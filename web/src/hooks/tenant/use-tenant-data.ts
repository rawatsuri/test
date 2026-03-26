import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { platformService, unwrap } from '@/lib/platform-service'
import type {
  CreateKnowledgeRequest,
  CreatePhoneNumberRequest,
  CreateUserRequest,
  UpdateAgentConfigRequest,
  UpdateUserRequest,
} from '@/types'

export function useTenantCalls(tenantId: string, filters?: Record<string, string>) {
  return useQuery({
    queryKey: ['tenant-calls', tenantId, filters],
    queryFn: async () => {
      return platformService.getTenantCalls(tenantId, filters)
    },
    enabled: !!tenantId,
  })
}

export function useTenantCall(tenantId: string, callId: string) {
  return useQuery({
    queryKey: ['tenant-call', tenantId, callId],
    queryFn: async () => {
      return unwrap(await platformService.getTenantCall(tenantId, callId))
    },
    enabled: !!tenantId && !!callId,
  })
}

export function useTenantCallers(tenantId: string, filters?: Record<string, string>) {
  return useQuery({
    queryKey: ['tenant-callers', tenantId, filters],
    queryFn: async () => {
      return platformService.getTenantCallers(tenantId, filters)
    },
    enabled: !!tenantId,
  })
}

export function useTenantCaller(tenantId: string, callerId: string) {
  return useQuery({
    queryKey: ['tenant-caller', tenantId, callerId],
    queryFn: async () => {
      return unwrap(await platformService.getTenantCaller(tenantId, callerId))
    },
    enabled: !!tenantId && !!callerId,
  })
}

export function useSaveCaller(tenantId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (callerId: string) => {
      return unwrap(await platformService.saveCaller(tenantId, callerId))
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-callers', tenantId] })
    },
  })
}

export function useUnsaveCaller(tenantId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (callerId: string) => {
      return unwrap(await platformService.unsaveCaller(tenantId, callerId))
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-callers', tenantId] })
    },
  })
}

export function useTenantAgentConfig(tenantId: string) {
  return useQuery({
    queryKey: ['tenant-agent-config', tenantId],
    queryFn: async () => {
      return unwrap(await platformService.getAgentConfig(tenantId))
    },
    enabled: !!tenantId,
  })
}

export function useUpdateTenantAgentConfig(tenantId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: UpdateAgentConfigRequest) => {
      return unwrap(await platformService.updateAgentConfig(tenantId, payload))
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-agent-config', tenantId] })
    },
  })
}

export function useTenantPhoneNumbers(tenantId: string) {
  return useQuery({
    queryKey: ['tenant-phone-numbers', tenantId],
    queryFn: async () => {
      return unwrap(await platformService.getPhoneNumbers(tenantId))
    },
    enabled: !!tenantId,
  })
}

export function useCreateTenantPhoneNumber(tenantId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CreatePhoneNumberRequest) => {
      return unwrap(await platformService.createPhoneNumber(tenantId, payload))
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-phone-numbers', tenantId] })
    },
  })
}

export function useDeleteTenantPhoneNumber(tenantId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (phoneNumberId: string) => {
      await platformService.deletePhoneNumber(tenantId, phoneNumberId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-phone-numbers', tenantId] })
    },
  })
}

export function useTenantKnowledge(tenantId: string) {
  return useQuery({
    queryKey: ['tenant-knowledge', tenantId],
    queryFn: async () => {
      return platformService.getKnowledge(tenantId)
    },
    enabled: !!tenantId,
  })
}

export function useCreateTenantKnowledge(tenantId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CreateKnowledgeRequest) => {
      return unwrap(await platformService.createKnowledge(tenantId, payload))
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-knowledge', tenantId] })
    },
  })
}

export function useDeleteTenantKnowledge(tenantId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (knowledgeId: string) => {
      await platformService.deleteKnowledge(tenantId, knowledgeId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-knowledge', tenantId] })
    },
  })
}

export function useTenantUsers(tenantId: string) {
  return useQuery({
    queryKey: ['tenant-users', tenantId],
    queryFn: async () => {
      return unwrap(await platformService.getUsers(tenantId))
    },
    enabled: !!tenantId,
  })
}

export function useCreateTenantUser(tenantId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CreateUserRequest) => {
      return unwrap(await platformService.createUser(tenantId, payload))
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-users', tenantId] })
    },
  })
}

export function useUpdateTenantUser(tenantId: string, userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: UpdateUserRequest) => {
      return unwrap(await platformService.updateUser(tenantId, userId, payload))
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-users', tenantId] })
    },
  })
}

export function useDeleteTenantUser(tenantId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (userId: string) => {
      await platformService.deleteUser(tenantId, userId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-users', tenantId] })
    },
  })
}
