import * as React from 'react'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'

type TeamSwitcherProps = {
  teams: {
    name: string
    logo: React.ElementType
    plan: string
  }[]
}

export function TeamSwitcher({ teams }: TeamSwitcherProps) {
  const activeTeam = teams[0]

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          size='lg'
          className='h-auto items-start rounded-[1.1rem] border border-sidebar-border/70 bg-[linear-gradient(135deg,color-mix(in_oklab,var(--sidebar-primary)_18%,white),color-mix(in_oklab,var(--sidebar-accent)_72%,white))] px-3 py-3 shadow-[0_18px_35px_-28px_color-mix(in_oklab,var(--sidebar-primary)_35%,transparent)]'
        >
          <div className='flex aspect-square size-9 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground shadow-sm'>
            <activeTeam.logo className='size-4' />
          </div>
          <div className='grid flex-1 text-start leading-tight'>
            <span className='truncate text-[10px] font-semibold uppercase tracking-[0.22em] text-sidebar-foreground/55'>
              {activeTeam.plan}
            </span>
            <span className='truncate text-sm font-semibold'>{activeTeam.name}</span>
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
