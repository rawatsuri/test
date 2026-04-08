import { redirect } from '@tanstack/react-router'
import type { AuthUser } from '@/stores/auth-store'

export type AppRole = 'SUPER_ADMIN' | 'OWNER' | 'ADMIN' | 'MEMBER'

export type RouterAuth = {
  accessToken: string
  isAuthenticated: boolean
  user: AuthUser | null
  primaryRole: AppRole | null
  tenantId: string | null
  isSuperAdmin: boolean
  isWorkspaceManager: boolean
  canEditConfig: boolean
  canManageTeam: boolean
  canManageCallers: boolean
}

function isAppRole(value: string | null | undefined): value is AppRole {
  return value === 'SUPER_ADMIN' || value === 'OWNER' || value === 'ADMIN' || value === 'MEMBER'
}

export function buildRouterAuth(user: AuthUser | null, accessToken: string): RouterAuth {
  const primaryRole = user?.role?.[0]
  const normalizedRole = isAppRole(primaryRole) ? primaryRole : null
  const isSuperAdmin = normalizedRole === 'SUPER_ADMIN'
  const isWorkspaceManager =
    normalizedRole === 'SUPER_ADMIN' || normalizedRole === 'OWNER' || normalizedRole === 'ADMIN'
  const tenantId = isSuperAdmin ? null : user?.accountNo ?? null

  return {
    accessToken,
    isAuthenticated: Boolean(accessToken && user),
    user,
    primaryRole: normalizedRole,
    tenantId,
    isSuperAdmin,
    isWorkspaceManager,
    canEditConfig: isWorkspaceManager,
    canManageTeam: isWorkspaceManager,
    canManageCallers: isWorkspaceManager,
  }
}

export function getPostLoginTarget(auth: RouterAuth): {
  to: '/super-admin/dashboard' | '/tenant/$tenantId/dashboard' | '/login'
  params?: { tenantId: string }
} {
  if (auth.isSuperAdmin) {
    return { to: '/super-admin/dashboard' }
  }

  if (auth.tenantId) {
    return {
      to: '/tenant/$tenantId/dashboard',
      params: { tenantId: auth.tenantId },
    }
  }

  return { to: '/login' }
}

export function getPostLoginPath(auth: RouterAuth): string {
  if (auth.isSuperAdmin) {
    return '/super-admin/dashboard'
  }

  if (auth.tenantId) {
    return `/tenant/${auth.tenantId}/dashboard`
  }

  return '/login'
}

export function requireAuthenticated(auth: RouterAuth, redirectTo: string) {
  if (auth.isAuthenticated) return

  throw redirect({
    to: '/login',
    search: { redirect: redirectTo },
  })
}

export function requireSuperAdmin(auth: RouterAuth, redirectTo: string) {
  requireAuthenticated(auth, redirectTo)

  if (auth.isSuperAdmin) return

  throw redirect({
    to: '/unauthorized',
    search: {
      redirect: redirectTo,
      reason: 'super_admin_required',
    },
  })
}

export function requireTenantAccess(auth: RouterAuth, tenantId: string, redirectTo: string) {
  requireAuthenticated(auth, redirectTo)

  if (auth.isSuperAdmin) return
  if (auth.tenantId === tenantId) return

  throw redirect({
    to: '/unauthorized',
    search: {
      redirect: redirectTo,
      reason: 'tenant_scope_mismatch',
    },
  })
}

export function requireWorkspaceManager(auth: RouterAuth, tenantId: string, redirectTo: string) {
  requireTenantAccess(auth, tenantId, redirectTo)

  if (auth.isWorkspaceManager) return

  throw redirect({
    to: '/unauthorized',
    search: {
      redirect: redirectTo,
      reason: 'workspace_manager_required',
    },
  })
}
