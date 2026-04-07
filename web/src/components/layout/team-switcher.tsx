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
          className='h-auto items-start rounded-xl border border-sidebar-border/60 bg-sidebar-accent/30 px-3 py-3'
        >
          <div className='flex aspect-square size-9 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground shadow-sm'>
            <activeTeam.logo className='size-4' />
          </div>
          <div className='grid flex-1 text-start leading-tight'>
            <span className='truncate text-[11px] font-medium uppercase tracking-[0.18em] text-sidebar-foreground/55'>
              {activeTeam.plan}
            </span>
            <span className='truncate text-sm font-semibold'>{activeTeam.name}</span>
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
