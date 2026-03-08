'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useRef, useEffect } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import type { NavItem } from '@/lib/types'
import Image from 'next/image'

gsap.registerPlugin(useGSAP)

// ─── Logo mark ────────────────────────────────────────────────────────────────

function LogoMark() {
  return (
    <svg width="30" height="30" viewBox="0 0 30 30" fill="none" aria-hidden="true">
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
  const col = active ? 'var(--color-cream)' : 'hsl(140,7%,48%)'

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
  }
  return map[name] ?? null
}

// ─── Mobile Pill Nav ──────────────────────────────────────────────────────────

export function MobilePillNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname()
  const activeIndex = items.findIndex(i => i.href === pathname) ?? 0
  const blobRef = useRef<HTMLDivElement>(null)
  const prevIndex = useRef(activeIndex)
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([])

  useEffect(() => {
    const activeEl = itemRefs.current[activeIndex]
    const blob = blobRef.current
    if (!activeEl || !blob) return
    const dir = activeIndex > prevIndex.current ? 1 : -1
    prevIndex.current = activeIndex
    gsap.to(blob, {
      x: activeEl.offsetLeft,
      width: activeEl.offsetWidth * 1.3,
      duration: 0.16,
      ease: 'power3.in',
      onComplete: () => {
        gsap.to(blob, { width: activeEl.offsetWidth, duration: 0.3, ease: 'back.out(1.8)' })
      },
    })
  }, [activeIndex])

  useGSAP(() => {
    const el = itemRefs.current[activeIndex]
    const blob = blobRef.current
    if (el && blob) gsap.set(blob, { x: el.offsetLeft, width: el.offsetWidth })
  }, [])

  return (
    <nav
      className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50"
      style={{
        background: '#0F1A14',
        borderRadius: '9999px',
        padding: '6px',
        boxShadow: '0 8px 32px rgba(15,26,20,0.35), 0 2px 8px rgba(15,26,20,0.2)',
        border: '1px solid rgba(255,255,255,0.07)',
      }}
    >
      <div className="relative flex items-center">
        <div
          ref={blobRef}
          className="absolute top-0 h-full"
          style={{
            background: 'var(--color-brand)',
            borderRadius: 'var(--radius-full)',
            pointerEvents: 'none',
          }}
        />
        {items.map((item, i) => {
          const isActive = item.href === pathname
          return (
            <Link
              key={item.href}
              href={item.href}
              ref={el => { itemRefs.current[i] = el }}
              className="relative z-10 flex flex-col items-center justify-center"
              style={{ padding: '10px 20px', gap: '4px', minWidth: '68px' }}
            >
              <NavIcon name={item.icon} active={isActive} />
              <span style={{
                fontSize: 'var(--text-2xs)',
                fontWeight: isActive ? 700 : 500,
                color: isActive ? 'var(--color-cream)' : 'hsl(140,7%,48%)',
                lineHeight: 1,
                transition: 'color var(--dur-base) var(--spring-gentle)',
              }}>
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
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
}: {
  items: NavItem[]
  userName: string
  userRole: string
  userInitials: string
  userColor: string
  notifCount: number
  onLogout: () => void
}) {
  const pathname = usePathname()
  const [showMenu, setShowMenu] = React.useState(false)

  return (
    <aside
      className="hidden md:flex flex-col shrink-0"
      style={{
        width: '260px',
        height: '100dvh',
        background: 'var(--color-dark)',
        borderRight: '1px solid var(--color-dark-hover)',
        position: 'sticky',
        top: 0,
        overflowY: 'auto',
        flexShrink: 0,
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center"
        style={{ gap: 'var(--s2)', padding: 'var(--s4) var(--s3) var(--s3)' }}
      >
        <LogoMark />
        <span
          className="font-bold"
          style={{ fontSize: 'var(--text-base)', color: 'var(--color-dark-text)', letterSpacing: '-0.01em' }}
        >
          Agency<span style={{ color: 'var(--color-brand)' }}>OS</span>
        </span>
      </div>

      {/* Nav */}
      <nav className="flex flex-col px-3" style={{ gap: '2px', marginTop: 'var(--s1)' }}>
        {items.map(item => {
          const isActive = pathname === item.href
          return (
            <React.Fragment key={item.href}>
            {item.dividerBefore && (
              <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '8px 4px 6px' }} />
            )}
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center group"
              style={{
                gap: '12px',
                padding: '11px 14px',
                borderRadius: 'var(--radius-md)',
                background: isActive ? 'var(--color-brand)' : 'transparent',
                transition: 'background var(--dur-fast) var(--spring-snap)',
                position: 'relative',
              }}
              onMouseEnter={e => {
                if (!isActive) {
                  (e.currentTarget as HTMLAnchorElement).style.background = 'var(--color-dark-hover)'
                }
              }}
              onMouseLeave={e => {
                if (!isActive) {
                  (e.currentTarget as HTMLAnchorElement).style.background = 'transparent'
                }
              }}
            >
              {/* Active left bar */}
              {isActive && (
                <div style={{
                  position: 'absolute', left: 4, top: '20%', height: '60%',
                  width: '3px', borderRadius: '0 3px 3px 0',
                  background: 'var(--color-cream)',
                }} />
              )}
              <NavIcon name={item.icon} active={isActive} />
              <span style={{
                fontSize: 'var(--text-sm)',
                fontWeight: isActive ? 700 : 500,
                color: isActive ? 'var(--color-cream)' : 'var(--color-dark-muted)',
                transition: 'color var(--dur-fast) ease',
                flex: 1,
              }}>
                {item.label}
              </span>
              {/* Notif badge on Alerts */}
              {item.icon === 'notifications' && notifCount > 0 && (
                <span style={{
                  minWidth: '20px', height: '20px',
                  borderRadius: 'var(--radius-full)',
                  background: 'var(--color-cream)',
                  color: 'var(--color-brand)',
                  fontSize: 'var(--text-2xs)',
                  fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '0 5px',
                }}>
                  {notifCount}
                </span>
              )}
            </Link>
            </React.Fragment>
          )
        })}
      </nav>

      <div className="flex-1" />

      {/* ── Illustration placeholder ─────────────────────────────────────── */}   
          {/* Person silhouette */}
          

      {/* User profile + menu */}
      <div style={{ position: 'relative' }}>
        {/* Dropdown menu */}
        {showMenu && (
          <>
            {/* Backdrop */}
            <div
              style={{ position: 'fixed', inset: 0, zIndex: 10 }}
              onClick={() => setShowMenu(false)}
            />
            <div style={{
              position: 'absolute', bottom: '100%', left: '12px', right: '12px',
              background: '#1a2e22', borderRadius: '14px', overflow: 'hidden',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 -8px 24px rgba(0,0,0,0.3)',
              zIndex: 20, marginBottom: '6px',
            }}>
              <Link
                href="/settings"
                onClick={() => setShowMenu(false)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '12px 14px', textDecoration: 'none',
                  color: 'hsl(42,22%,80%)', fontSize: '0.82rem', fontWeight: 600,
                  transition: 'background 0.12s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="3" stroke="hsl(140,7%,52%)" strokeWidth="1.8"/>
                  <path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="hsl(140,7%,52%)" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
                Settings
              </Link>
              <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '0 12px' }} />
              <button
                onClick={() => { setShowMenu(false); onLogout() }}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '12px 14px', background: 'transparent', border: 'none', cursor: 'pointer',
                  color: 'hsl(4,72%,62%)', fontSize: '0.82rem', fontWeight: 600, textAlign: 'left',
                  transition: 'background 0.12s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" stroke="hsl(4,72%,62%)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Log Out
              </button>
            </div>
          </>
        )}

        {/* Profile row */}
        <button
          onClick={() => setShowMenu(v => !v)}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
            padding: '14px 16px', background: showMenu ? 'rgba(255,255,255,0.05)' : 'transparent',
            border: 'none', cursor: 'pointer', textAlign: 'left',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            transition: 'background 0.12s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
          onMouseLeave={e => { if (!showMenu) e.currentTarget.style.background = 'transparent' }}
        >
          <div style={{
            width: 36, height: 36, borderRadius: '50%', background: userColor, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.65rem', fontWeight: 800, color: '#fff',
          }}>
            {userInitials}
          </div>
          <div style={{ overflow: 'hidden', flex: 1 }}>
            <p style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'hsl(42,22%,84%)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {userName}
            </p>
            <p style={{ fontSize: 'var(--text-2xs)', color: 'hsl(140,7%,48%)', textTransform: 'capitalize' }}>
              {userRole}
            </p>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, transition: 'transform 0.15s', transform: showMenu ? 'rotate(180deg)' : 'none' }}>
            <path d="M18 15l-6-6-6 6" stroke="hsl(140,7%,48%)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
    </aside>
  )
}
