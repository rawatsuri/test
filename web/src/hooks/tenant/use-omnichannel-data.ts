import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { platformService, unwrap } from '@/lib/platform-service'
import type {
  OmnichannelAutomation,
  OmnichannelChannel,
  OmnichannelConversation,
} from '@/types'

export function useOmnichannelConversations(tenantId: string, filters?: Record<string, string>) {
  return useQuery({
    queryKey: ['omnichannel-conversations', tenantId, filters],
    queryFn: async () => platformService.getConversations(tenantId, filters),
    enabled: !!tenantId,
  })
}

export function useUpdateOmnichannelConversation(tenantId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      conversationId,
      payload,
    }: {
      conversationId: string
      payload: Partial<OmnichannelConversation>
    }) => unwrap(await platformService.updateConversation(tenantId, conversationId, payload)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['omnichannel-conversations', tenantId] })
    },
  })
}

export function useOmnichannelChannels(tenantId: string) {
  return useQuery({
    queryKey: ['omnichannel-channels', tenantId],
    queryFn: async () => unwrap(await platformService.getChannels(tenantId)),
    enabled: !!tenantId,
  })
}

export function useUpdateOmnichannelChannel(tenantId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      channelId,
      payload,
    }: {
      channelId: string
      payload: Partial<OmnichannelChannel>
    }) => unwrap(await platformService.updateChannel(tenantId, channelId, payload)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['omnichannel-channels', tenantId] })
    },
  })
}

export function useOmnichannelAutomations(tenantId: string) {
  return useQuery({
    queryKey: ['omnichannel-automations', tenantId],
    queryFn: async () => unwrap(await platformService.getAutomations(tenantId)),
    enabled: !!tenantId,
  })
}

export function useCreateOmnichannelAutomation(tenantId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: Pick<OmnichannelAutomation, 'name' | 'trigger' | 'description'>) =>
      unwrap(await platformService.createAutomation(tenantId, payload)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['omnichannel-automations', tenantId] })
    },
  })
}

export function useUpdateOmnichannelAutomation(tenantId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      automationId,
      payload,
    }: {
      automationId: string
      payload: Partial<
        Pick<OmnichannelAutomation, 'name' | 'trigger' | 'description' | 'status'>
      >
    }) => unwrap(await platformService.updateAutomation(tenantId, automationId, payload)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['omnichannel-automations', tenantId] })
    },
  })
}

export function useDeleteOmnichannelAutomation(tenantId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (automationId: string) => {
      await platformService.deleteAutomation(tenantId, automationId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['omnichannel-automations', tenantId] })
    },
  })
}
