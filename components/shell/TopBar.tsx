'use client'

import Link from 'next/link'
import { useRef, useSyncExternalStore } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { useTheme } from 'next-themes'

import { WavingCharacter } from '@/components/illustrations'
import { Button } from '@/components/ui/button'

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
      className="relative flex size-10 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted"
      aria-label={`Notifications${count > 0 ? `, ${count} unread` : ''}`}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path
          d="M12 3a7 7 0 00-7 7v4l-1.5 2.5A1 1 0 004.5 18h15a1 1 0 00.86-1.5L19 14v-4a7 7 0 00-7-7z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M10 19a2 2 0 004 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
      {count > 0 && (
        <svg
          className="absolute top-1 right-1"
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
            fill="var(--color-danger-foreground)"
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
      className="flex items-center gap-1.5 rounded-full border border-border bg-secondary px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
        <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
      {clientName ?? 'All Clients'}
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
        <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  )
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
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
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
    </Button>
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
    <header className="mb-s3 flex w-full items-center justify-between bg-card px-s3 pt-s3">
      <div className="flex items-center gap-s2">
        <WavingCharacter className="hidden size-10 shrink-0 sm:block" />
        <div>
          <p className="text-xs font-medium text-muted-foreground">{greeting}</p>
          <p className="text-md leading-tight font-bold text-primary">{userName}</p>
        </div>
      </div>

      <div className="flex items-center gap-s2">
        {showClientSwitcher && <ClientBadge clientName={activeClient} />}
        <ThemeToggle />
        <Bell count={notifCount} />
      </div>
    </header>
  )
}
