'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useRef, useEffect, useState, useCallback } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import type { NavItem } from '@/lib/types'
import { cn } from '@/lib/utils'

gsap.registerPlugin(useGSAP)

// ─── Logo mark ────────────────────────────────────────────────────────────────

function LogoMark() {
  return (
    <svg width="30" height="30" viewBox="0 0 30 30" fill="none" aria-hidden="true" className="shrink-0">
      <rect width="30" height="30" rx="9" fill="var(--color-brand)" />
      <path
        d="M9 22 L15 8 L21 22 M11.5 17.5 H18.5"
        stroke="hsl(42, 30%, 99%)"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// ─── Nav icons ────────────────────────────────────────────────────────────────

function NavIcon({ name, active }: { name: NavItem['icon']; active: boolean }) {
  const col = active ? 'var(--color-cream)' : 'var(--color-dark-muted)'

  const map: Record<NavItem['icon'], React.ReactElement> = {
    home: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M3 11.5L12 3l9 8.5V21a1 1 0 01-1 1H15v-5h-6v5H4a1 1 0 01-1-1V11.5z" stroke={col} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    calendar: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="5" width="18" height="17" rx="3" stroke={col} strokeWidth="1.9"/>
        <path d="M3 10h18M8 3v4M16 3v4" stroke={col} strokeWidth="1.9" strokeLinecap="round"/>
        <circle cx="8.5" cy="15" r="1.2" fill={col}/>
        <circle cx="12" cy="15" r="1.2" fill={col}/>
        <circle cx="15.5" cy="15" r="1.2" fill={col}/>
      </svg>
    ),
    planning: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <rect x="4" y="3" width="16" height="18" rx="3" stroke={col} strokeWidth="1.9"/>
        <path d="M9 3v3M15 3v3M8 10h3M8 14h8M8 18h5" stroke={col} strokeWidth="1.9" strokeLinecap="round"/>
      </svg>
    ),
    pipeline: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <rect x="2" y="5" width="5" height="15" rx="2" stroke={col} strokeWidth="1.9"/>
        <rect x="9.5" y="3" width="5" height="12" rx="2" stroke={col} strokeWidth="1.9"/>
        <rect x="17" y="7" width="5" height="10" rx="2" stroke={col} strokeWidth="1.9"/>
      </svg>
    ),
    team: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <circle cx="9" cy="8" r="3.5" stroke={col} strokeWidth="1.9"/>
        <path d="M2 20c0-4 3.6-6 7-6s7 2 7 6" stroke={col} strokeWidth="1.9" strokeLinecap="round"/>
        <circle cx="17.5" cy="8" r="2.5" stroke={col} strokeWidth="1.9"/>
        <path d="M21.5 20c0-2.761-1.79-4.5-4-5" stroke={col} strokeWidth="1.9" strokeLinecap="round"/>
      </svg>
    ),
    tasks: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="4" width="18" height="16" rx="3" stroke={col} strokeWidth="1.9"/>
        <path d="M9 12l2 2 4-4" stroke={col} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    upcoming: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="9" stroke={col} strokeWidth="1.9"/>
        <path d="M12 7v5l3 3" stroke={col} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    done: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="9" stroke={col} strokeWidth="1.9"/>
        <path d="M8 12l3 3 5-5" stroke={col} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    week: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="5" width="18" height="17" rx="3" stroke={col} strokeWidth="1.9"/>
        <path d="M3 10h18M8 3v4M16 3v4" stroke={col} strokeWidth="1.9" strokeLinecap="round"/>
      </svg>
    ),
    notes: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M12 21H5a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v7" stroke={col} strokeWidth="1.9" strokeLinecap="round"/>
        <path d="M16 19l2 2 4-4M8 9h8M8 13h5" stroke={col} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    notifications: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" stroke={col} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    ideas: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M9 18h6M10 21h4M12 2a7 7 0 017 7c0 2.5-1.3 4.7-3.3 6H8.3A6.99 6.99 0 015 9a7 7 0 017-7z" stroke={col} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    finance: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <rect x="2" y="6" width="20" height="14" rx="3" stroke={col} strokeWidth="1.9"/>
        <path d="M2 10h20M6 14h4M16 14h2" stroke={col} strokeWidth="1.9" strokeLinecap="round"/>
      </svg>
    ),
    clients: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <circle cx="9" cy="8" r="3" stroke={col} strokeWidth="1.9"/>
        <circle cx="17" cy="8" r="3" stroke={col} strokeWidth="1.9"/>
        <path d="M2 19c0-3.3 3.1-5 7-5M14 19c0-3.3 3.1-5 7-5" stroke={col} strokeWidth="1.9" strokeLinecap="round"/>
      </svg>
    ),
    audit: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke={col} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M9 12l2 2 4-4" stroke={col} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    analytics: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M18 20V10M12 20V4M6 20v-6" stroke={col} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  }
  return map[name] ?? null
}

// ─── Mobile More Drawer ───────────────────────────────────────────────────────

function MoreDrawer({ items, onClose }: { items: NavItem[]; onClose: () => void }) {
  const pathname = usePathname()
  const sheetRef = useRef<HTMLDivElement>(null)
  const backdropRef = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    gsap.fromTo(backdropRef.current, { opacity: 0 }, { opacity: 1, duration: 0.22, ease: 'power2.out' })
    gsap.fromTo(sheetRef.current, { y: '100%', opacity: 0 }, { y: '0%', opacity: 1, duration: 0.38, ease: 'expo.out' })
  }, [])

  const close = useCallback(() => {
    gsap.to(sheetRef.current, { y: '100%', opacity: 0, duration: 0.28, ease: 'expo.in' })
    gsap.to(backdropRef.current, { opacity: 0, duration: 0.25, ease: 'power2.in', onComplete: onClose })
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[100]">
      <div ref={backdropRef} onClick={close} className="absolute inset-0 bg-black/55 backdrop-blur-sm" />
      <div
        ref={sheetRef}
        className="absolute bottom-0 left-0 right-0 bg-dark border border-white/[0.07] border-b-0 rounded-t-[20px] px-3 pb-8 pt-2 shadow-2xl"
      >
        {/* Handle */}
        <div className="flex justify-center py-3">
          <div className="w-9 h-1 rounded-full bg-white/15" />
        </div>
        <p className="text-[0.6rem] font-bold tracking-widest text-dark-ghost uppercase px-1 mb-2.5">More</p>
        <div className="grid grid-cols-4 gap-1.5">
          {items.map(item => {
            const isActive = item.href === pathname
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={close}
                className={cn(
                  'flex flex-col items-center gap-1.5 rounded-2xl px-2 py-3.5 no-underline transition-colors',
                  isActive ? 'bg-brand' : 'bg-white/[0.04] active:bg-white/[0.08]'
                )}
              >
                <NavIcon name={item.icon} active={isActive} />
                <span
                  className={cn(
                    'text-center text-[0.6rem] leading-none',
                    isActive ? 'font-bold text-cream' : 'font-medium text-dark-muted'
                  )}
                >
                  {item.label}
                </span>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Mobile Pill Nav ──────────────────────────────────────────────────────────

const PRIMARY_COUNT = 4

export function MobilePillNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname()
  const [showMore, setShowMore] = useState(false)

  const needsMore = items.length > PRIMARY_COUNT

  let primaryItems: NavItem[]
  let overflowItems: NavItem[]

  if (!needsMore) {
    primaryItems = items
    overflowItems = []
  } else {
    const base = items.slice(0, PRIMARY_COUNT - 1)
    const rest = items.slice(PRIMARY_COUNT - 1)
    const activeOverflow = rest.find(i => i.href === pathname)
    if (activeOverflow && !base.find(i => i.href === activeOverflow.href)) {
      primaryItems = [...base, activeOverflow]
      overflowItems = rest.filter(i => i.href !== activeOverflow.href)
    } else {
      primaryItems = [...base, items[PRIMARY_COUNT - 1]]
      overflowItems = items.slice(PRIMARY_COUNT)
    }
  }

  const activeIndex = primaryItems.findIndex(i => i.href === pathname)
  const isMoreActive = needsMore && activeIndex < 0
  const blobRef = useRef<HTMLDivElement>(null)
  const prevIndex = useRef(activeIndex)
  const itemRefs = useRef<(HTMLAnchorElement | HTMLButtonElement | null)[]>([])

  useEffect(() => {
    const activeEl = itemRefs.current[activeIndex] as HTMLElement | null
    const blob = blobRef.current
    if (!activeEl || !blob || activeIndex < 0) return
    prevIndex.current = activeIndex
    gsap.to(blob, {
      x: activeEl.offsetLeft,
      width: activeEl.offsetWidth * 1.3,
      duration: 0.16,
      ease: 'power3.in',
      onComplete: () => { gsap.to(blob, { width: activeEl.offsetWidth, duration: 0.3, ease: 'back.out(1.8)' }) },
    })
  }, [activeIndex])

  useGSAP(() => {
    const el = itemRefs.current[activeIndex] as HTMLElement | null
    const blob = blobRef.current
    if (el && blob && activeIndex >= 0) gsap.set(blob, { x: el.offsetLeft, width: el.offsetWidth })
  }, [])

  return (
    <>
      <nav className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 bg-dark rounded-full p-[6px] border border-white/[0.07] shadow-[0_8px_32px_rgba(15,26,20,0.35),0_2px_8px_rgba(15,26,20,0.2)]">
        <div className="relative flex items-center">
          <div
            ref={blobRef}
            className={cn(
              'pointer-events-none absolute top-0 h-full rounded-full',
              !isMoreActive && 'bg-brand'
            )}
          />
          {primaryItems.map((item, i) => {
            const isActive = item.href === pathname
            return (
              <Link
                key={item.href}
                href={item.href}
                ref={el => { itemRefs.current[i] = el }}
                className="relative z-10 flex flex-col items-center justify-center gap-1 px-5 py-[10px] min-w-[68px]"
              >
                <NavIcon name={item.icon} active={isActive} />
                <span
                  className={cn(
                    'text-[0.6rem] leading-none',
                    isActive ? 'font-bold text-cream' : 'font-medium text-dark-muted'
                  )}
                >
                  {item.label}
                </span>
              </Link>
            )
          })}
          {needsMore && (
            <button
              ref={el => { itemRefs.current[primaryItems.length] = el }}
              onClick={() => setShowMore(true)}
              className="relative z-10 flex flex-col items-center justify-center gap-1 bg-transparent border-none cursor-pointer px-5 py-[10px] min-w-[68px]"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <circle cx="5" cy="12" r="1.8" fill={isMoreActive ? 'var(--color-cream)' : 'var(--color-dark-muted)'}/>
                <circle cx="12" cy="12" r="1.8" fill={isMoreActive ? 'var(--color-cream)' : 'var(--color-dark-muted)'}/>
                <circle cx="19" cy="12" r="1.8" fill={isMoreActive ? 'var(--color-cream)' : 'var(--color-dark-muted)'}/>
              </svg>
              <span
                className={cn(
                  'text-[0.6rem] leading-none',
                  isMoreActive ? 'font-bold text-cream' : 'font-medium text-dark-muted'
                )}
              >
                More
              </span>
            </button>
          )}
        </div>
      </nav>
      {showMore && <MoreDrawer items={overflowItems} onClose={() => setShowMore(false)} />}
    </>
  )
}

// ─── Desktop Sidebar ──────────────────────────────────────────────────────────

export function DesktopSidebar({
  items,
  userName,
  userRole,
  userInitials,
  userColor,
  notifCount,
  onLogout,
  collapsed,
  onToggle,
  orgName,
  orgPlan,
}: {
  items: NavItem[]
  userName: string
  userRole: string
  userInitials: string
  userColor: string
  notifCount: number
  onLogout: () => void
  collapsed: boolean
  onToggle: () => void
  orgName?: string
  orgPlan?: string
}) {
  const pathname = usePathname()
  const [showMenu, setShowMenu] = useState(false)

  const sidebarRef = useRef<HTMLElement>(null)
  const toggleIconRef = useRef<SVGSVGElement>(null)

  // ── Animation ────────────────────────────────────────────────────────────────
  // GSAP ONLY animates the sidebar width and toggle arrow rotation. Let flexbox do the rest.
  useGSAP(() => {
    if (!sidebarRef.current) return
    gsap.set(sidebarRef.current, { width: collapsed ? 64 : 260 })
    if (collapsed) gsap.set(toggleIconRef.current, { rotation: 180 })
  }, [])

  useEffect(() => {
    const sidebar = sidebarRef.current
    if (!sidebar) return

    if (collapsed) {
      gsap.to(sidebar, { width: 64, duration: 0.45, ease: 'power3.inOut' })
      gsap.to(toggleIconRef.current, { rotation: 180, duration: 0.45, ease: 'power3.inOut' })
    } else {
      gsap.to(sidebar, { width: 260, duration: 0.45, ease: 'power3.inOut' })
      gsap.to(toggleIconRef.current, { rotation: 0, duration: 0.45, ease: 'power3.inOut' })
    }
  }, [collapsed])

  // Tailwind handles the opacity fade seamlessly
  const textOpacity = collapsed ? 'opacity-0 delay-0' : 'opacity-100 delay-150'

  return (
    <aside
      ref={sidebarRef}
      className="hidden md:flex flex-col shrink-0 bg-dark border-r border-dark-hover sticky top-0 h-dvh overflow-x-hidden"
    >
      {/* ── Logo ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center min-h-[60px] px-2 py-2 shrink-0">
        <div className="w-[48px] flex items-center justify-center shrink-0 self-center">
          <LogoMark />
        </div>
        <div className={`overflow-hidden transition-opacity duration-200 flex-1 min-w-0 ${textOpacity}`}>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-bold text-sm text-dark-text tracking-tight whitespace-nowrap ml-1">
              Agency<span className="text-brand">OS</span>
            </span>
            {orgPlan && (
              <span className="text-[0.48rem] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-brand/20 text-brand whitespace-nowrap">
                {orgPlan}
              </span>
            )}
          </div>
          {orgName && (
            <p className="text-[0.6rem] text-dark-ghost truncate ml-1 leading-tight mt-0.5">
              {orgName}
            </p>
          )}
        </div>
      </div>

      {/* ── Nav ──────────────────────────────────────────────────────────── */}
      <nav className="flex flex-col px-2 gap-0.5 relative">
        {items.map((item) => {
          const isActive = pathname === item.href
          return (
            <React.Fragment key={item.href}>
              {/* Divider */}
              {item.dividerBefore && (
                <div
                  className={`h-px mx-1 my-2 transition-opacity duration-200 ${collapsed ? 'opacity-0' : 'opacity-100'}`}
                  style={{ background: 'rgba(255,255,255,0.06)' }}
                />
              )}
              {/* FIXED HEIGHT h-[38px] guarantees 0px vertical layout shift during collapse */}
              <Link
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={`group flex items-center h-[38px] rounded-[10px] overflow-hidden transition-colors relative shrink-0
                  ${isActive ? 'bg-brand' : 'hover:bg-dark-hover'}`}
              >
                {/* Active left bar */}
                {isActive && (
                  <div className="absolute left-1 top-[20%] h-[60%] w-[3px] rounded-r-[3px] bg-cream" />
                )}

                {/* EXACTLY 48px wide to lock the icon dead center in a 64px sidebar */}
                <div className="w-[48px] h-full flex items-center justify-center shrink-0">
                  <NavIcon name={item.icon} active={isActive} />
                </div>

                <span
                  className={`text-sm whitespace-nowrap transition-opacity duration-200 ${textOpacity} ${isActive ? 'font-bold text-cream' : 'font-medium text-dark-muted'}`}
                >
                  {item.label}
                </span>

                {item.icon === 'notifications' && notifCount > 0 && (
                  <div className={`ml-auto pr-3 shrink-0 flex items-center transition-opacity duration-200 ${textOpacity}`}>
                    <span className="min-w-5 h-5 rounded-full bg-cream text-brand text-[0.6rem] font-bold flex items-center justify-center px-1.5">
                      {notifCount}
                    </span>
                  </div>
                )}
              </Link>
            </React.Fragment>
          )
        })}
      </nav>

      <div className="flex-1 min-h-[25px]" />

      {/* ── Collapse toggle ───────────────────────────────────────────────── */}
      <div className="px-2 pb-2 shrink-0">
        <button
          onClick={onToggle}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="w-full flex items-center h-[38px] rounded-[10px] bg-transparent border-none cursor-pointer hover:bg-dark-hover transition-colors overflow-hidden shrink-0 relative"
        >
          <div className="w-[48px] h-full flex items-center justify-center shrink-0">
            <svg ref={toggleIconRef} width="18" height="18" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="4" height="18" rx="1.5" fill="var(--color-dark-ghost)"/>
              <path d="M14 8l-4 4 4 4" stroke="var(--color-dark-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className={`text-[0.7rem] font-semibold text-dark-ghost whitespace-nowrap transition-opacity duration-200 ${textOpacity}`}>
            Collapse
          </span>
        </button>
      </div>

      {/* ── User profile + menu ───────────────────────────────────────────── */}
      <div className="relative shrink-0">
        {showMenu && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
            <div
              className="absolute bottom-full bg-[#1a2e22] rounded-2xl overflow-hidden border border-white/[0.08] z-20 mb-1.5 shadow-[0_-8px_24px_rgba(0,0,0,0.3)]"
              style={{
                left: collapsed ? '68px' : '12px',
                right: collapsed ? 'auto' : '12px',
                minWidth: collapsed ? '160px' : 'auto',
              }}
            >
              <Link
                href="/settings"
                onClick={() => setShowMenu(false)}
                className="flex items-center gap-2.5 px-3.5 py-3 no-underline text-dark-text text-[0.82rem] font-semibold hover:bg-white/[0.06] transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="3" stroke="var(--color-dark-muted)" strokeWidth="1.8"/>
                  <path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="var(--color-dark-muted)" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
                Settings
              </Link>
              <div className="h-px bg-white/[0.06] mx-3" />
              <button
                onClick={() => { setShowMenu(false); onLogout() }}
                className="w-full flex items-center gap-2.5 px-3.5 py-3 bg-transparent border-none cursor-pointer text-coral text-[0.82rem] font-semibold text-left hover:bg-white/[0.06] transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" stroke="var(--color-coral)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Log Out
              </button>
            </div>
          </>
        )}

        <button
          onClick={() => setShowMenu(v => !v)}
          title={collapsed ? `${userName} (${userRole})` : undefined}
          className={`w-full flex items-center h-[56px] bg-transparent border-none cursor-pointer border-t border-white/[0.06] hover:bg-white/[0.05] transition-colors relative overflow-hidden px-2 shrink-0
            ${showMenu ? 'bg-white/[0.05]' : ''}`}
        >
          <div className="w-[48px] h-full flex items-center justify-center shrink-0">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-[0.6rem] font-extrabold text-white"
              style={{ background: userColor }}
            >
              {userInitials}
            </div>
          </div>
          
          <div className={`flex flex-col items-start justify-center flex-1 min-w-0 pr-2 transition-opacity duration-200 ${textOpacity}`}>
            <p className="text-xs font-semibold text-dark-text truncate w-full text-left">{userName}</p>
            <p className="text-[0.6rem] text-dark-muted capitalize truncate w-full text-left">{userRole}</p>
          </div>

          <div className={`shrink-0 flex items-center transition-opacity duration-200 pr-2 ${textOpacity}`}>
            <svg
              width="16" height="16" viewBox="0 0 24 24" fill="none"
              className="transition-transform"
              style={{ transform: showMenu ? 'rotate(180deg)' : 'none' }}
            >
              <path d="M18 15l-6-6-6 6" stroke="var(--color-dark-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </button>
      </div>
    </aside>
  )
}

