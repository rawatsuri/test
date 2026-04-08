import { useAppSession } from '@/hooks/use-app-session'

export type WorkspaceRole = 'SUPER_ADMIN' | 'OWNER' | 'ADMIN' | 'MEMBER'

export function useWorkspaceRole() {
  const auth = useAppSession()
  const role: WorkspaceRole = auth.primaryRole ?? 'MEMBER'

  return {
    role,
    canEditConfig: auth.canEditConfig,
    canManageTeam: auth.canManageTeam,
    canManageCallers: auth.canManageCallers,
  }
}
