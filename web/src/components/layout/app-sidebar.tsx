import { useLayout } from '@/context/layout-provider'
import { useLocation } from '@tanstack/react-router'
import { getTenantIdFromPath, isSuperAdminPath } from '@/lib/navigation-context'
import { buildRouterAuth } from '@/lib/auth'
import { useAuthStore } from '@/stores/auth-store'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from '@/components/ui/sidebar'
// import { AppTitle } from './app-title'
import { getSuperAdminSidebarData, getTenantSidebarData } from './data/sidebar-data'
import { NavGroup } from './nav-group'
import { NavUser } from './nav-user'
import { TeamSwitcher } from './team-switcher'

export function AppSidebar() {
  const { collapsible, variant } = useLayout()
  const href = useLocation({ select: (location) => location.href })
  const authUser = useAuthStore((state) => state.auth.user)
  const accessToken = useAuthStore((state) => state.auth.accessToken)
  const auth = buildRouterAuth(authUser, accessToken)
  const tenantId = getTenantIdFromPath(href) ?? 'workspace'
  const baseSidebarData = isSuperAdminPath(href)
    ? getSuperAdminSidebarData()
    : getTenantSidebarData(tenantId, { isWorkspaceManager: auth.isWorkspaceManager })
  const sidebarData = {
    ...baseSidebarData,
    user: {
      ...baseSidebarData.user,
      name: authUser?.email ? authUser.email.split('@')[0] : baseSidebarData.user.name,
      email: authUser?.email ?? baseSidebarData.user.email,
    },
  }
  const exitLink = isSuperAdminPath(href)
    ? undefined
    : auth.isSuperAdmin
      ? {
          label: 'Back to Workspaces',
          to: '/super-admin/tenants' as const,
        }
      : undefined

  return (
    <Sidebar collapsible={collapsible} variant={variant}>
      <SidebarHeader>
        <TeamSwitcher teams={sidebarData.teams} exitLink={exitLink} />

        {/* Replace <TeamSwitch /> with the following <AppTitle />
         /* if you want to use the normal app title instead of TeamSwitch dropdown */}
        {/* <AppTitle /> */}
      </SidebarHeader>
      <SidebarContent>
        {sidebarData.navGroups.map((props) => (
          <NavGroup key={props.title} {...props} />
        ))}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={sidebarData.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
