import { useLayout } from '@/context/layout-provider'
import { useAppNavigation } from '@/hooks/use-app-navigation'
import { useAppSession } from '@/hooks/use-app-session'
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
  const { tenantId, superAdminMode } = useAppNavigation()
  const auth = useAppSession()
  const authUser = auth.user
  const scopedTenantId = tenantId ?? auth.tenantId ?? 'workspace'
  const baseSidebarData = superAdminMode
    ? getSuperAdminSidebarData()
    : getTenantSidebarData(scopedTenantId, { isWorkspaceManager: auth.isWorkspaceManager })
  const sidebarData = {
    ...baseSidebarData,
    user: {
      ...baseSidebarData.user,
      name: authUser?.email ? authUser.email.split('@')[0] : baseSidebarData.user.name,
      email: authUser?.email ?? baseSidebarData.user.email,
    },
  }
  const exitLink = superAdminMode
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
