import { Link, useLocation } from '@tanstack/react-router'
import { Bell } from 'lucide-react'
import { useWorkspaceRole } from '@/hooks/use-workspace-role'
import { getTenantIdFromPath, isSuperAdminPath } from '@/lib/navigation-context'
import { Button } from '@/components/ui/button'
import { Header } from '@/components/layout/header'
import { ThemeSwitch } from '@/components/theme-switch'

type ToolbarMeta = {
  eyebrow: string
  title: string
  description: string
}

function getToolbarMeta(href: string, tenantId: string | null, role: string | null): ToolbarMeta {
  if (isSuperAdminPath(href)) {
    if (href.includes('/super-admin/tenants/')) {
      return {
        eyebrow: 'Workspace Admin',
        title: 'Tenant Setup',
        description: 'Adjust lifecycle, retention, and AI provider configuration for this client workspace.',
      }
    }

    if (href.includes('/super-admin/tenants')) {
      return {
        eyebrow: 'Platform',
        title: 'Workspace Registry',
        description: 'Provision, review, and open client workspaces from one operational list.',
      }
    }

    if (href.includes('/super-admin/ai-setup')) {
      return {
        eyebrow: 'Platform',
        title: 'Provider Setup',
        description: 'Review platform-wide model and provider defaults before rolling them out to workspaces.',
      }
    }

    return {
      eyebrow: 'Platform',
      title: 'Operations Overview',
      description: 'Monitor workspace health and keep onboarding and AI setup under control.',
    }
  }

  const workspaceLabel = tenantId ? `Workspace ${tenantId.slice(0, 8)}` : 'Workspace'

  if (href.includes('/calls/')) {
    return {
      eyebrow: workspaceLabel,
      title: 'Conversation Review',
      description: 'Inspect call outcome, transcript, and extraction quality without leaving the workspace flow.',
    }
  }

  if (href.includes('/calls')) {
    return {
      eyebrow: workspaceLabel,
      title: 'Call Operations',
      description: 'Search recent conversations, filter outcomes, and move quickly from queue to detail.',
    }
  }

  if (href.includes('/callers/')) {
    return {
      eyebrow: workspaceLabel,
      title: 'Caller Profile',
      description: 'Review customer history and recent interactions in one place.',
    }
  }

  if (href.includes('/callers')) {
    return {
      eyebrow: workspaceLabel,
      title: 'Caller Directory',
      description: 'Track memory-worthy customers and keep caller management lightweight for operators.',
    }
  }

  if (href.includes('/config/knowledge')) {
    return {
      eyebrow: workspaceLabel,
      title: 'Knowledge Base',
      description: 'Maintain the facts and policies the agent should rely on during conversations.',
    }
  }

  if (href.includes('/config/phone-numbers')) {
    return {
      eyebrow: workspaceLabel,
      title: 'Phone Lines',
      description: 'Manage inbound numbers and keep provider mapping clean and predictable.',
    }
  }

  if (href.includes('/team')) {
    return {
      eyebrow: workspaceLabel,
      title: 'Team Access',
      description: `Keep role-based access clear for ${role?.toLowerCase() ?? 'workspace'} operators.`,
    }
  }

  return {
    eyebrow: workspaceLabel,
    title: 'Workspace Overview',
    description: 'See current workload, key setup surfaces, and where operators should go next.',
  }
}

export function AppToolbar() {
  const href = useLocation({ select: (location) => location.href })
  const tenantId = getTenantIdFromPath(href)
  const superAdminMode = isSuperAdminPath(href)
  const { role } = useWorkspaceRole()
  const meta = getToolbarMeta(href, tenantId, role)

  return (
    <Header fixed className='border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80'>
      <div className='flex w-full items-center justify-between gap-6'>
        <div className='min-w-0'>
          <div className='text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground'>
            {meta.eyebrow}
          </div>
          <div className='mt-1 flex flex-wrap items-center gap-x-3 gap-y-1'>
            <h1 className='text-lg font-semibold tracking-tight'>{meta.title}</h1>
            {!superAdminMode && role ? (
              <span className='text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground'>
                {role}
              </span>
            ) : null}
          </div>
          <p className='mt-1 hidden max-w-3xl text-sm text-muted-foreground md:block'>
            {meta.description}
          </p>
        </div>

        <div className='flex shrink-0 items-center gap-2'>
          <ThemeSwitch />
          <Button variant='outline' size='icon' aria-label='Notifications'>
            <Bell className='size-4' />
          </Button>
          <Button asChild className='hidden sm:inline-flex'>
            <Link to={superAdminMode ? '/super-admin/tenants' : '/tenant/$tenantId/calls'} params={tenantId ? { tenantId } : undefined as never}>
              {superAdminMode ? 'Open Workspaces' : 'Open Calls'}
            </Link>
          </Button>
        </div>
      </div>
    </Header>
  )
}
