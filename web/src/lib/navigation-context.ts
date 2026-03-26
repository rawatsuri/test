export function isSuperAdminPath(pathname: string): boolean {
  return pathname.includes('/super-admin');
}

export function getTenantIdFromPath(pathname: string): string | null {
  const match = pathname.match(/\/tenant\/([^/?#]+)/);
  return match?.[1] ?? null;
}

