import { useAuthStore } from '@/stores/auth-store'

export type WorkspaceRole = 'SUPER_ADMIN' | 'OWNER' | 'ADMIN' | 'MEMBER'

export function useWorkspaceRole() {
  const primaryAuthRole = useAuthStore((state) => state.auth.user?.role?.[0] ?? null)
  const role: WorkspaceRole =
    primaryAuthRole === 'SUPER_ADMIN'
      ? 'SUPER_ADMIN'
      : primaryAuthRole === 'OWNER'
      ? 'OWNER'
      : primaryAuthRole === 'ADMIN'
        ? 'ADMIN'
        : primaryAuthRole === 'MEMBER'
          ? 'MEMBER'
          : 'MEMBER'

  const canEditConfig = role === 'SUPER_ADMIN' || role === 'OWNER' || role === 'ADMIN'
  const canManageTeam = role === 'SUPER_ADMIN' || role === 'OWNER' || role === 'ADMIN'
  const canManageCallers = role === 'SUPER_ADMIN' || role === 'OWNER' || role === 'ADMIN'

  return {
    role,
    canEditConfig,
    canManageTeam,
    canManageCallers,
  }
}
