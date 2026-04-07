import {
  BarChart3,
  Bot,
  Building2,
  CircleDashed,
  Headphones,
  LayoutDashboard,
  LibraryBig,
  MessageSquareText,
  Phone,
  Settings2,
  Sparkles,
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
        name: 'Voice Ops',
        logo: Headphones,
        plan: 'Platform',
      },
    ],
    navGroups: [
      {
        title: 'Platform',
        items: [
          {
            title: 'Overview',
            url: '/super-admin/dashboard',
            icon: LayoutDashboard,
          },
          {
            title: 'Workspaces',
            url: '/super-admin/tenants',
            icon: Building2,
          },
        ],
      },
      {
        title: 'Systems',
        items: [
          {
            title: 'Provider Setup',
            url: '/super-admin/ai-setup',
            icon: Settings2,
          },
          {
            title: 'Platform Analytics',
            url: '/super-admin/analytics',
            icon: BarChart3,
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
        name: 'Workspace',
        logo: Headphones,
        plan: 'Operations',
      },
    ],
    navGroups: [
      {
        title: 'Workspace',
        items: [
          {
            title: 'Overview',
            url: `${base}/dashboard`,
            icon: LayoutDashboard,
          },
          {
            title: 'Calls',
            url: `${base}/calls`,
            icon: Phone,
          },
          {
            title: 'Callers',
            url: `${base}/callers`,
            icon: Users,
          },
        ],
      },
      {
        title: 'Setup',
        items: [
          {
            title: 'Knowledge Base',
            url: `${base}/config/knowledge`,
            icon: LibraryBig,
          },
          {
            title: 'Phone Lines',
            url: `${base}/config/phone-numbers`,
            icon: Phone,
          },
          {
            title: 'Team',
            url: `${base}/team`,
            icon: Users2,
          },
        ],
      },
      {
        title: 'Labs',
        items: [
          {
            title: 'Bookings / Orders',
            url: `${base}/bookings-orders`,
            icon: Building2,
          },
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
          {
            title: 'Agent Rules',
            url: `${base}/config/agent`,
            icon: Sparkles,
          },
        ],
      },
    ],
  }
}
