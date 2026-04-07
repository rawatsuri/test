import { Link, useLocation } from '@tanstack/react-router'
import { ArrowLeft, Bell } from 'lucide-react'
import { buildRouterAuth } from '@/lib/auth'
import { getTenantIdFromPath, isSuperAdminPath } from '@/lib/navigation-context'
import { useAuthStore } from '@/stores/auth-store'
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
  const user = useAuthStore((state) => state.auth.user)
  const accessToken = useAuthStore((state) => state.auth.accessToken)
  const auth = buildRouterAuth(user, accessToken)
  const meta = getToolbarMeta(href, tenantId, auth.primaryRole)
  const canExitToWorkspaces = !superAdminMode && auth.isSuperAdmin

  return (
    <Header fixed className='border-b border-border/70 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/78'>
      <div className='flex w-full flex-col gap-3 md:flex-row md:items-start md:justify-between md:gap-6'>
        <div className='min-w-0 flex-1'>
          <div className='inline-flex max-w-full rounded-full border border-border/70 bg-secondary/70 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-secondary-foreground'>
            {meta.eyebrow}
          </div>
          <div className='mt-2 flex flex-wrap items-center gap-x-3 gap-y-2'>
            <h1 className='max-w-full text-xl font-semibold tracking-tight text-foreground sm:text-2xl'>
              {meta.title}
            </h1>
            {!superAdminMode && auth.primaryRole ? (
              <span className='rounded-full border border-border/70 bg-card/80 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground'>
                {auth.primaryRole}
              </span>
            ) : null}
          </div>
          <p className='mt-2 max-w-3xl text-sm leading-5 text-muted-foreground'>
            {meta.description}
          </p>
        </div>

        <div className='flex shrink-0 flex-wrap items-center gap-2 self-start md:justify-end'>
          {canExitToWorkspaces ? (
            <Button asChild variant='outline' className='sm:inline-flex'>
              <Link to='/super-admin/tenants'>
                <ArrowLeft className='size-4' />
                Back to Workspaces
              </Link>
            </Button>
          ) : null}
          <ThemeSwitch />
          <Button variant='outline' size='icon' aria-label='Notifications' className='rounded-full'>
            <Bell className='size-4' />
          </Button>
          <Button asChild className='sm:inline-flex'>
            <Link
              to={superAdminMode ? '/super-admin/tenants' : '/tenant/$tenantId/calls'}
              params={tenantId ? { tenantId } : (undefined as never)}
            >
              {superAdminMode ? 'Open Workspaces' : 'Open Calls'}
            </Link>
          </Button>
        </div>
      </div>
    </Header>
  )
}
