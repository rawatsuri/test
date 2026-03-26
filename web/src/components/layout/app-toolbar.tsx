import { Link, useLocation } from '@tanstack/react-router'
import { Bell } from 'lucide-react'
import { useWorkspaceRole } from '@/hooks/use-workspace-role'
import { getTenantIdFromPath, isSuperAdminPath } from '@/lib/navigation-context'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Header } from '@/components/layout/header'
import { ThemeSwitch } from '@/components/theme-switch'

export function AppToolbar() {
  const href = useLocation({ select: (location) => location.href })
  const tenantId = getTenantIdFromPath(href)
  const superAdminMode = isSuperAdminPath(href)
  const { role } = useWorkspaceRole()

  return (
    <Header fixed className='border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/70'>
      <div className='flex w-full items-center justify-between gap-4'>
        <div className='flex items-center gap-3'>
          <Link to='/' className='text-sm font-semibold tracking-wide text-primary'>
            Omnichannel AI Platform
          </Link>
          <Badge variant={superAdminMode ? 'default' : 'secondary'}>
            {superAdminMode ? 'Super Admin' : 'Client Workspace'}
          </Badge>
          {tenantId ? (
            <Badge variant='outline' className='hidden md:inline-flex'>
              Tenant: {tenantId}
            </Badge>
          ) : null}
        </div>

        <div className='flex items-center gap-2'>
          {!superAdminMode && role ? <Badge variant='outline'>{role}</Badge> : null}
          <ThemeSwitch />
          <Button variant='outline' size='icon' aria-label='Notifications'>
            <Bell className='size-4' />
          </Button>
        </div>
      </div>
    </Header>
  )
}
