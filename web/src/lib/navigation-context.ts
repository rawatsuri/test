export type NavigationContext = {
  pathname: string
  tenantId: string | null
  superAdminMode: boolean
  tenantMode: boolean
}

export function isSuperAdminPath(pathname: string): boolean {
  return pathname.startsWith('/super-admin')
}

export function getTenantIdFromPath(pathname: string): string | null {
  const match = pathname.match(/\/tenant\/([^/?#]+)/)
  return match?.[1] ?? null
}

export function getNavigationContext(pathname: string): NavigationContext {
  const tenantId = getTenantIdFromPath(pathname)
  const superAdminMode = isSuperAdminPath(pathname)

  return {
    pathname,
    tenantId,
    superAdminMode,
    tenantMode: tenantId !== null,
  }
}
