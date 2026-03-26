import { useState } from 'react'
import { useAuthStore } from '@/stores/auth-store'

export type WorkspaceRole = 'OWNER' | 'ADMIN' | 'MEMBER'

const STORAGE_KEY = 'workspace_role'

export function useWorkspaceRole() {
  const primaryAuthRole = useAuthStore((state) => state.auth.user?.role?.[0] ?? null)
  const [storedRole, setRoleState] = useState<WorkspaceRole>(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY) as WorkspaceRole | null
    if (stored && ['OWNER', 'ADMIN', 'MEMBER'].includes(stored)) return stored
    return 'ADMIN'
  })

  const role: WorkspaceRole =
    primaryAuthRole === 'OWNER'
      ? 'OWNER'
      : primaryAuthRole === 'ADMIN'
        ? 'ADMIN'
        : primaryAuthRole === 'MEMBER'
          ? 'MEMBER'
          : storedRole

  const setRole = (nextRole: WorkspaceRole) => {
    setRoleState(nextRole)
    window.localStorage.setItem(STORAGE_KEY, nextRole)
  }

  const canEditConfig = role !== 'MEMBER'
  const canManageTeam = role === 'OWNER' || role === 'ADMIN'
  const canManageCallers = role !== 'MEMBER'

  return {
    role,
    setRole,
    canEditConfig,
    canManageTeam,
    canManageCallers,
  }
}
