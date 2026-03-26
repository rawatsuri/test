import {
  BarChart3,
  Building2,
  Bot,
  CircleDashed,
  Headphones,
  LayoutDashboard,
  LibraryBig,
  MessageSquareText,
  Phone,
  Settings2,
  Users,
  Users2,
} from 'lucide-react'
import { type SidebarData } from '../types'

export function getSuperAdminSidebarData(): SidebarData {
  return {
    user: {
      name: 'Platform Owner',
      email: 'owner@aivoice.ai',
      avatar: '/avatars/admin.jpg',
    },
    teams: [
      {
        name: 'Omnichannel AI Platform',
        logo: Headphones,
        plan: 'Super Admin',
      },
    ],
    navGroups: [
      {
        title: 'Control Center',
        items: [
          {
            title: 'Dashboard',
            url: '/super-admin/dashboard',
            icon: LayoutDashboard,
          },
          {
            title: 'Tenants',
            url: '/super-admin/tenants',
            icon: Building2,
          },
          {
            title: 'Analytics',
            url: '/super-admin/analytics',
            icon: BarChart3,
          },
          {
            title: 'AI Setup',
            url: '/super-admin/ai-setup',
            icon: Settings2,
          },
        ],
      },
    ],
  }
}

export function getTenantSidebarData(tenantId: string): SidebarData {
  const base = `/tenant/${tenantId}`

  return {
    user: {
      name: 'Tenant Admin',
      email: 'admin@tenant.ai',
      avatar: '/avatars/user.jpg',
    },
    teams: [
      {
        name: 'Tenant Workspace',
        logo: Headphones,
        plan: 'Client Admin',
      },
    ],
    navGroups: [
      {
        title: 'Overview',
        items: [
          {
            title: 'Dashboard',
            url: `${base}/dashboard`,
            icon: LayoutDashboard,
          },
        ],
      },
      {
        title: 'Operations',
        items: [
          {
            title: 'Calls',
            url: `${base}/calls`,
            icon: Phone,
          },
          {
            title: 'Bookings / Orders',
            url: `${base}/bookings-orders`,
            icon: Building2,
          },
          {
            title: 'Callers',
            url: `${base}/callers`,
            icon: Users,
          },
        ],
      },
      {
        title: 'Omnichannel',
        items: [
          {
            title: 'Shared Inbox',
            url: `${base}/omnichannel/inbox`,
            icon: MessageSquareText,
          },
          {
            title: 'Channels',
            url: `${base}/omnichannel/channels`,
            icon: CircleDashed,
          },
          {
            title: 'Automations',
            url: `${base}/omnichannel/automations`,
            icon: Bot,
          },
        ],
      },
      {
        title: 'Configuration',
        items: [
          {
            title: 'Phone Numbers',
            url: `${base}/config/phone-numbers`,
            icon: Phone,
          },
          {
            title: 'Knowledge Base',
            url: `${base}/config/knowledge`,
            icon: LibraryBig,
          },
        ],
      },
      {
        title: 'Team',
        items: [
          {
            title: 'Sub Admins',
            url: `${base}/team`,
            icon: Users2,
          },
        ],
      },
    ],
  }
}
