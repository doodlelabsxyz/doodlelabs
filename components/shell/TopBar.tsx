'use client'

import Link from 'next/link'
import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'

gsap.registerPlugin(useGSAP)

// ─── Bell with liquid droplet badge ──────────────────────────────────────────

function Bell({ count }: { count: number }) {
  const dropletRef = useRef<SVGCircleElement>(null)

  useGSAP(() => {
    if (!dropletRef.current || count === 0) return
    // Droplet grows in from the bell tip
    gsap.fromTo(dropletRef.current,
      { scale: 0, transformOrigin: '50% 50%' },
      { scale: 1, duration: 0.5, ease: 'back.out(2)', delay: 0.3 }
    )
    // Pulse once after appearing
    gsap.to(dropletRef.current, {
      scale: 1.2,
      duration: 0.18,
      ease: 'power2.out',
      delay: 0.85,
      yoyo: true,
      repeat: 1,
    })
  }, [count])

  return (
    <Link
      href="/notifications"
      className="relative flex items-center justify-center"
      style={{ width: '40px', height: '40px' }}
      aria-label={`Notifications${count > 0 ? `, ${count} unread` : ''}`}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path
          d="M12 3a7 7 0 00-7 7v4l-1.5 2.5A1 1 0 004.5 18h15a1 1 0 00.86-1.5L19 14v-4a7 7 0 00-7-7z"
          stroke="hsl(24, 18%, 12%)"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M10 19a2 2 0 004 0" stroke="hsl(24, 18%, 12%)" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
      {count > 0 && (
        <svg
          className="absolute"
          style={{ top: '4px', right: '4px' }}
          width="16"
          height="16"
          viewBox="0 0 16 16"
          overflow="visible"
        >
          <circle ref={dropletRef} cx="8" cy="8" r="8" fill="var(--color-danger)" />
          <text
            x="8" y="8"
            dominantBaseline="central"
            textAnchor="middle"
            fontSize="9"
            fontWeight="700"
            fill="hsl(42, 30%, 99%)"
            fontFamily="var(--font-sans)"
          >
            {count > 9 ? '9+' : count}
          </text>
        </svg>
      )}
    </Link>
  )
}

// ─── Client switcher badge ────────────────────────────────────────────────────

function ClientBadge({ clientName }: { clientName: string | null }) {
  return (
    <button
      className="flex items-center font-medium"
      style={{
        gap: '6px',
        padding: '7px 12px',
        borderRadius: 'var(--radius-full)',
        backgroundColor: 'hsl(42, 25%, 93%)',
        border: '1px solid hsl(40, 18%, 88%)',
        fontSize: 'var(--text-xs)',
        color: 'var(--color-ink)',
        transition: `background-color var(--dur-fast) var(--spring-snap)`,
        cursor: 'pointer',
      }}
      onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'hsl(42, 22%, 90%)')}
      onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'hsl(42, 25%, 93%)')}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
        <path d="M3 6h18M3 12h18M3 18h18" stroke="hsl(24, 18%, 12%)" strokeWidth="2" strokeLinecap="round" />
      </svg>
      {clientName ?? 'All Clients'}
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
        <path d="M6 9l6 6 6-6" stroke="hsl(24, 10%, 44%)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  )
}

// ─── TopBar ───────────────────────────────────────────────────────────────────

interface TopBarProps {
  greeting: string
  userName: string
  notifCount: number
  activeClient?: string | null
  showClientSwitcher?: boolean
}

export function TopBar({
  greeting,
  userName,
  notifCount,
  activeClient = null,
  showClientSwitcher = false,
}: TopBarProps) {
  return (
    <header
      className="flex items-center justify-between w-full"
      style={{
        padding: 'var(--s3) var(--s3) 0',
        background: 'white',
        marginBottom: 'var(--s3)',
      }}
    >
      <div>
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-muted)', fontWeight: 500 }}>
          {greeting}
        </p>
        <p
          className="font-bold"
          style={{ fontSize: 'var(--text-md)', color: 'var(--color-brand)', lineHeight: 1.2 }}
        >
          {userName}
        </p>
      </div>

      <div className="flex items-center" style={{ gap: 'var(--s2)' }}>
        {showClientSwitcher && <ClientBadge clientName={activeClient} />}
        <Bell count={notifCount} />
      </div>
    </header>
  )
}
