'use client'

import React, { useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTheme } from 'next-themes'
import type { NavItem } from '@/lib/types'
import { cn } from '@/lib/utils'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar'

function LogoMark() {
  return (
    <svg width="30" height="30" viewBox="0 0 30 30" fill="none" aria-hidden="true" className="shrink-0">
      <rect width="30" height="30" rx="9" fill="var(--color-primary)" />
      <path
        d="M9 22 L15 8 L21 22 M11.5 17.5 H18.5"
        stroke="var(--color-primary-foreground)"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function NavIcon({ name, active }: { name: NavItem['icon']; active: boolean }) {
  const col = active ? 'var(--color-sidebar-primary)' : 'var(--color-dark-muted)'

  const map: Record<NavItem['icon'], React.ReactElement> = {
    home: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M3 11.5L12 3l9 8.5V21a1 1 0 01-1 1H15v-5h-6v5H4a1 1 0 01-1-1V11.5z" stroke={col} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    calendar: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="5" width="18" height="17" rx="3" stroke={col} strokeWidth="1.9"/>
        <path d="M3 10h18M8 3v4M16 3v4" stroke={col} strokeWidth="1.9" strokeLinecap="round"/>
        <circle cx="8.5" cy="15" r="1.2" fill={col}/>
        <circle cx="12" cy="15" r="1.2" fill={col}/>
        <circle cx="15.5" cy="15" r="1.2" fill={col}/>
      </svg>
    ),
    planning: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <rect x="4" y="3" width="16" height="18" rx="3" stroke={col} strokeWidth="1.9"/>
        <path d="M9 3v3M15 3v3M8 10h3M8 14h8M8 18h5" stroke={col} strokeWidth="1.9" strokeLinecap="round"/>
      </svg>
    ),
    pipeline: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <rect x="2" y="5" width="5" height="15" rx="2" stroke={col} strokeWidth="1.9"/>
        <rect x="9.5" y="3" width="5" height="12" rx="2" stroke={col} strokeWidth="1.9"/>
        <rect x="17" y="7" width="5" height="10" rx="2" stroke={col} strokeWidth="1.9"/>
      </svg>
    ),
    team: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <circle cx="9" cy="8" r="3.5" stroke={col} strokeWidth="1.9"/>
        <path d="M2 20c0-4 3.6-6 7-6s7 2 7 6" stroke={col} strokeWidth="1.9" strokeLinecap="round"/>
        <circle cx="17.5" cy="8" r="2.5" stroke={col} strokeWidth="1.9"/>
        <path d="M21.5 20c0-2.761-1.79-4.5-4-5" stroke={col} strokeWidth="1.9" strokeLinecap="round"/>
      </svg>
    ),
    tasks: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="4" width="18" height="16" rx="3" stroke={col} strokeWidth="1.9"/>
        <path d="M9 12l2 2 4-4" stroke={col} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    upcoming: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="9" stroke={col} strokeWidth="1.9"/>
        <path d="M12 7v5l3 3" stroke={col} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    done: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="9" stroke={col} strokeWidth="1.9"/>
        <path d="M8 12l3 3 5-5" stroke={col} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    week: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="5" width="18" height="17" rx="3" stroke={col} strokeWidth="1.9"/>
        <path d="M3 10h18M8 3v4M16 3v4" stroke={col} strokeWidth="1.9" strokeLinecap="round"/>
      </svg>
    ),
    notes: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M12 21H5a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v7" stroke={col} strokeWidth="1.9" strokeLinecap="round"/>
        <path d="M16 19l2 2 4-4M8 9h8M8 13h5" stroke={col} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    notifications: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" stroke={col} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    ideas: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M9 18h6M10 21h4M12 2a7 7 0 017 7c0 2.5-1.3 4.7-3.3 6H8.3A6.99 6.99 0 015 9a7 7 0 017-7z" stroke={col} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    finance: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <rect x="2" y="6" width="20" height="14" rx="3" stroke={col} strokeWidth="1.9"/>
        <path d="M2 10h20M6 14h4M16 14h2" stroke={col} strokeWidth="1.9" strokeLinecap="round"/>
      </svg>
    ),
    clients: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <circle cx="9" cy="8" r="3" stroke={col} strokeWidth="1.9"/>
        <circle cx="17" cy="8" r="3" stroke={col} strokeWidth="1.9"/>
        <path d="M2 19c0-3.3 3.1-5 7-5M14 19c0-3.3 3.1-5 7-5" stroke={col} strokeWidth="1.9" strokeLinecap="round"/>
      </svg>
    ),
    audit: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke={col} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M9 12l2 2 4-4" stroke={col} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    analytics: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M18 20V10M12 20V4M6 20v-6" stroke={col} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    assets: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="3" width="18" height="18" rx="3" stroke={col} strokeWidth="1.9"/>
        <circle cx="8.5" cy="8.5" r="1.5" fill={col}/>
        <path d="M21 15l-5-5L5 21" stroke={col} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  }
  return map[name] ?? null
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  )
  const isDark = resolvedTheme === 'dark'

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[10px] text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {mounted && isDark ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M20.5 14.5A8.5 8.5 0 119.5 3.5 7 7 0 0020.5 14.5z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" />
          <path d="M12 2.5V5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M12 19v2.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M21.5 12H19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M5 12H2.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M18.72 5.28L17 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M7 17l-1.72 1.72" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M18.72 18.72L17 17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M7 7L5.28 5.28" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      )}
    </button>
  )
}

type Props = {
  items: NavItem[]
  userName: string
  userRole: string
  userInitials: string
  userColor: string
  notifCount: number
  onLogout: () => void
  orgName?: string
  orgPlan?: string
}

function UserMenu({ userName, userRole, userInitials, userColor, onLogout }: Omit<Props, 'items' | 'notifCount' | 'orgName' | 'orgPlan'>) {
  const [showMenu, setShowMenu] = useState(false)
  const { state } = useSidebar()
  const collapsed = state === 'collapsed'

  return (
    <div className="relative">
      {showMenu && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
          <div
            className={cn(
              'absolute bottom-full z-20 mb-1.5 overflow-hidden rounded-2xl border border-dark-text/[0.1] bg-dark-hover shadow-[0_-8px_24px_rgb(0_0_0/0.3)]',
              collapsed ? 'left-[68px] min-w-40' : 'left-3 right-3'
            )}
          >
            <Link
              href="/settings"
              onClick={() => setShowMenu(false)}
              className="flex items-center gap-2.5 px-3.5 py-3 no-underline text-dark-text text-[0.82rem] font-semibold hover:bg-dark-text/[0.08] transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="3" stroke="var(--color-dark-muted)" strokeWidth="1.8"/>
                <path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="var(--color-dark-muted)" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
              Settings
            </Link>
            <div className="h-px bg-dark-text/[0.08] mx-3" />
            <button
              onClick={() => { setShowMenu(false); onLogout() }}
              className="w-full flex items-center gap-2.5 px-3.5 py-3 bg-transparent border-none cursor-pointer text-[0.82rem] font-semibold text-left text-[color-mix(in_srgb,var(--color-danger)_60%,white)] hover:bg-dark-text/[0.08] transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Log Out
            </button>
          </div>
        </>
      )}
      <button
        onClick={() => setShowMenu(v => !v)}
        title={collapsed ? `${userName} (${userRole})` : undefined}
        className="w-full flex items-center h-[52px] bg-transparent border-none cursor-pointer border-t border-dark-text/[0.08] hover:bg-dark-text/[0.06] transition-colors overflow-hidden px-2"
      >
        <div
          style={{ '--avatar-color': userColor } as React.CSSProperties}
          className="mx-auto flex h-[32px] w-[32px] shrink-0 items-center justify-center rounded-full bg-[var(--avatar-color)] text-[0.6rem] font-extrabold text-dark-text"
        >
          {userInitials}
        </div>
        {!collapsed && (
          <div className="flex flex-col items-start justify-center flex-1 min-w-0 px-2">
            <p className="text-xs font-semibold text-dark-text truncate w-full text-left">{userName}</p>
            <p className="text-[0.6rem] text-dark-muted capitalize truncate w-full text-left">{userRole}</p>
          </div>
        )}
        {!collapsed && (
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            className={cn('shrink-0 pr-1 transition-transform duration-200', showMenu && 'rotate-180')}
          >
            <path d="M18 15l-6-6-6 6" stroke="var(--color-dark-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </button>
    </div>
  )
}

export function AppSidebar({ items, userName, userRole, userInitials, userColor, notifCount, onLogout, orgName, orgPlan }: Props) {
  const pathname = usePathname()
  const { state } = useSidebar()
  const collapsed = state === 'collapsed'

  return (
    <Sidebar
      collapsible="icon"
      className="hidden md:flex border-r border-sidebar-border"
    >
      {/* ── Header: Logo ── */}
      <SidebarHeader className="p-2 border-b border-sidebar-border/50">
        <div className="flex items-center h-[44px]">
          <div className="w-[32px] flex items-center justify-center shrink-0 mx-auto group-data-[collapsible=icon]:mx-auto">
            <LogoMark />
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0 ml-2 overflow-hidden">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-bold text-sm text-sidebar-foreground tracking-tight whitespace-nowrap">
                  Agency<span className="text-sidebar-primary">OS</span>
                </span>
                {orgPlan && (
                  <span className="rounded-full bg-sidebar-primary/20 px-1.5 py-0.5 text-[0.48rem] font-bold uppercase tracking-wide whitespace-nowrap text-sidebar-primary">
                    {orgPlan}
                  </span>
                )}
              </div>
              {orgName && (
                <p className="mt-0.5 truncate text-[0.6rem] leading-tight text-dark-ghost">
                  {orgName}
                </p>
              )}
            </div>
          )}
        </div>
      </SidebarHeader>

      {/* ── Nav items ── */}
      <SidebarContent className="px-2 py-2">
        <SidebarMenu className="gap-0.5">
          {items.map((item) => {
            const isActive = pathname === item.href
            return (
              <React.Fragment key={item.href}>
                {item.dividerBefore && (
                  <SidebarSeparator className="my-1.5 bg-sidebar-border/50" />
                )}
                <SidebarMenuItem>
                  <SidebarMenuButton
                    render={<Link href={item.href} />}
                    isActive={isActive}
                    tooltip={{ children: item.label, side: 'right' }}
                    className="h-[38px] rounded-[10px] relative"
                  >
                    {isActive && (
                      <div className="absolute left-0 top-[20%] h-[60%] w-[3px] rounded-r-[3px] bg-sidebar-primary" />
                    )}
                    <NavIcon name={item.icon} active={isActive} />
                    <span className="text-sm">
                      {item.label}
                    </span>
                    {item.icon === 'notifications' && notifCount > 0 && (
                      <span className="ml-auto flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-sidebar-primary px-1.5 text-[0.6rem] font-bold text-sidebar-primary-foreground">
                        {notifCount}
                      </span>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </React.Fragment>
            )
          })}
        </SidebarMenu>
      </SidebarContent>

      {/* ── Footer: collapse trigger + user ── */}
      <SidebarFooter className="gap-0 border-t border-sidebar-border/50 p-2">
        <div className="mb-1 flex items-center gap-1">
          <SidebarTrigger className="h-[38px] flex-1 rounded-[10px] px-2 text-sidebar-foreground/50 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground" />
          <ThemeToggle />
        </div>
        <UserMenu
          userName={userName}
          userRole={userRole}
          userInitials={userInitials}
          userColor={userColor}
          onLogout={onLogout}
        />
      </SidebarFooter>
    </Sidebar>
  )
}
