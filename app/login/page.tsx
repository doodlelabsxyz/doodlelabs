'use client'

import { useState, useRef, useId, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { createClient } from '@/lib/supabase/client'

gsap.registerPlugin(useGSAP)

// ─── Floating decoration ───────────────────────────────────────────────────────

function FloatingDots() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      <div className="absolute -top-[60px] -right-[60px] size-[280px] rounded-full bg-mint/10" />
      <div className="absolute -bottom-[50px] -left-[50px] size-[200px] rounded-full bg-mint/[0.08]" />
      <div className="absolute top-[40%] -left-5 size-[90px] rounded-full bg-mint/[0.06]" />
      <div className="absolute top-[16%] right-[20%] size-2.5 rounded-full bg-mint/40" />
      <div className="absolute top-[30%] left-[24%] size-[7px] rounded-full bg-mint/30" />
      <div className="absolute bottom-[28%] right-[28%] size-3 rounded-full bg-mint/30" />
      <div className="absolute bottom-[20%] left-[34%] size-2 rounded-full bg-mint/35" />
      <svg className="absolute top-[22%] right-[14%] opacity-20 stroke-mint" width="16" height="16" viewBox="0 0 16 16">
        <path d="M8 2v12M2 8h12" strokeWidth="2" strokeLinecap="round"/>
      </svg>
      <svg className="absolute bottom-[35%] left-[15%] opacity-15 stroke-mint" width="12" height="12" viewBox="0 0 16 16">
        <path d="M8 2v12M2 8h12" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    </div>
  )
}

// ─── Login ────────────────────────────────────────────────────────────────────

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email,      setEmail]      = useState('')
  const [password,   setPassword]   = useState('')
  // null = no submit error yet; the URL error below shows until a sign-in attempt sets this.
  const [submitError, setAuthError] = useState<string | null>(null)
  const [isEntering, setIsEntering] = useState(false)
  const uid = useId()
  const emailId = `${uid}-email`, passId = `${uid}-password`, errId = `${uid}-error`
  const leftRef = useRef<HTMLDivElement>(null)
  const formRef = useRef<HTMLDivElement>(null)

  const urlError = searchParams.get('error') === 'auth_callback_failed'
    ? 'That link is invalid or has expired. Please try again.'
    : ''
  const authError = submitError ?? urlError

  useGSAP(() => {
    gsap.fromTo(leftRef.current,  { x: -24, opacity: 0 }, { x: 0, opacity: 1, duration: 0.6, ease: 'back.out(1.2)' })
    gsap.fromTo(formRef.current,  { y: 24,  opacity: 0 }, { y: 0,  opacity: 1, duration: 0.55, ease: 'back.out(1.3)', delay: 0.1 })
  }, [])

  const handleEnter = async () => {
    if (isEntering || !email || !password) return
    setIsEntering(true)
    setAuthError('')

    const supabase = createClient()
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setAuthError(error.message)
      setIsEntering(false)
      return
    }

    // Read role from public.users to decide where to redirect
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', data.user.id)
      .single()

    await gsap.to(formRef.current, { y: -16, opacity: 0, scale: 0.97, duration: 0.22, ease: 'power2.in' })

    const route = profile?.role === 'client' ? '/client' : '/dashboard'
    router.push(route)
    router.refresh()
  }

  const inputCls = 'w-full min-h-11 rounded-xl border-[1.5px] border-border bg-background px-4 py-3.5 text-[0.9rem] font-medium text-foreground transition-colors placeholder:text-muted-foreground aria-invalid:border-danger focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background'
  const canSubmit = !!email && !!password

  return (
    <div className="flex min-h-dvh flex-col md:flex-row">

      {/* ── LEFT: dark brand panel ──────────────────────────────────────────── */}
      <div
        ref={leftRef}
        className="relative flex min-h-[360px] w-full flex-col justify-between bg-dark px-8 pt-10 pb-10 md:flex-1 md:px-12 md:pt-14 md:pb-14"
      >
        <FloatingDots />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-2.5">
          <svg width="28" height="28" viewBox="0 0 30 30" fill="none">
            <rect width="30" height="30" rx="9" className="fill-mint"/>
            <path d="M9 22L15 8l6 14M11.5 17.5h7" className="stroke-dark" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="text-base font-bold tracking-[-0.01em] text-dark-text">
            Agency<span className="text-mint">OS</span>
          </span>
        </div>

        {/* Center illustration */}
        <div className="relative z-10 flex flex-col gap-6">

          {/* Illustration card */}
          <div className="relative flex aspect-[4/3] max-h-[260px] w-full flex-col items-center justify-center gap-3.5 overflow-hidden rounded-[20px] border-[1.5px] border-dashed border-mint/25 bg-gradient-to-br from-mint/10 to-mint/5">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_30%,var(--color-mint)_0%,transparent_70%)] opacity-10" />
            {/* Character SVG */}
            <svg width="72" height="88" viewBox="0 0 72 88" fill="none" className="relative z-[1] stroke-dark-text opacity-40">
              <circle cx="36" cy="22" r="16" strokeWidth="1.5" className="fill-dark-text/5"/>
              <path d="M8 80c0-15 12.5-24 28-24s28 9 28 24" strokeWidth="1.5" strokeLinecap="round" className="fill-dark-text/5"/>
              <path d="M16 58 Q8 48 6 38" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M56 58 Q64 48 66 38" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <div className="relative z-[1] text-center">
              <p className="text-[0.72rem] font-semibold text-dark-muted">Character Illustration</p>
              <p className="mt-[3px] text-[0.65rem] text-dark-ghost">Drop asset here</p>
            </div>
          </div>

          {/* Tagline */}
          <div>
            <p className="text-[1.4rem] font-extrabold leading-[1.1] tracking-[-0.02em] text-dark-text">
              Your agency,<br/>fully in control.
            </p>
            <p className="mt-2 text-sm leading-relaxed text-dark-muted">
              Plan, create, review and publish — all in one place.
            </p>
          </div>
        </div>

        {/* Bottom spacer for balance */}
        <div className="relative z-10 h-6" />
      </div>

      {/* ── RIGHT: form panel ────────────────────────────────────────────────── */}
      <div className="flex w-full flex-col items-center justify-center bg-surface px-8 py-12 md:flex-1 md:px-14 lg:px-20">
        <div ref={formRef} className="w-full max-w-[400px]">

          {/* Heading */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold leading-[1.1] tracking-[-0.02em] text-foreground">
              Welcome back
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Sign in to your AgencyOS workspace.
            </p>
          </div>

          {/* Fields */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-[7px]">
              <label htmlFor={emailId} className="text-xs font-semibold text-muted-foreground">
                Email address
              </label>
              <input
                id={emailId}
                type="email"
                inputMode="email"
                aria-invalid={authError ? true : undefined}
                aria-describedby={authError ? errId : undefined}
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@agencyos.app"
                autoComplete="email"
                className={inputCls}
              />
            </div>

            <div className="flex flex-col gap-[7px]">
              <div className="flex items-center justify-between">
                <label htmlFor={passId} className="text-xs font-semibold text-muted-foreground">
                  Password
                </label>
                <Link href="/forgot-password" className="inline-flex min-h-11 items-center rounded-sm text-xs font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background">
                  Forgot password?
                </Link>
              </div>
              <input
                id={passId}
                type="password"
                aria-invalid={authError ? true : undefined}
                aria-describedby={authError ? errId : undefined}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                className={inputCls}
                onKeyDown={e => { if (e.key === 'Enter') handleEnter() }}
              />
            </div>

            {authError && (
              <p id={errId} role="alert" className="text-[0.78rem] font-medium text-danger">
                {authError}
              </p>
            )}

            <button
              onClick={handleEnter}
              disabled={isEntering || !canSubmit}
              aria-busy={isEntering}
              className="mt-1 min-h-11 w-full cursor-pointer rounded-full bg-primary px-6 py-4 text-[0.9rem] font-bold tracking-[0.02em] text-primary-foreground shadow-lg shadow-primary/25 transition-all duration-200 hover:not-disabled:-translate-y-0.5 active:not-disabled:scale-[0.98] disabled:cursor-not-allowed disabled:bg-border disabled:text-muted-foreground disabled:shadow-none aria-busy:opacity-75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              {isEntering ? 'Signing in...' : 'Sign in'}
            </button>
          </div>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Use your AgencyOS credentials to sign in.
          </p>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  )
}
