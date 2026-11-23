'use client'

import { useState, useRef, useId } from 'react'
import Link from 'next/link'
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

// ─── Forgot Password ────────────────────────────────────────────────────────────

export default function ForgotPasswordPage() {
  const [email,     setEmail]     = useState('')
  const [error,     setError]     = useState('')
  const [sending,   setSending]   = useState(false)
  const [sent,      setSent]      = useState(false)
  const uid = useId()
  const emailId = `${uid}-email`, errId = `${uid}-error`
  const leftRef = useRef<HTMLDivElement>(null)
  const formRef = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    gsap.fromTo(leftRef.current,  { x: -24, opacity: 0 }, { x: 0, opacity: 1, duration: 0.6, ease: 'back.out(1.2)' })
    gsap.fromTo(formRef.current,  { y: 24,  opacity: 0 }, { y: 0,  opacity: 1, duration: 0.55, ease: 'back.out(1.3)', delay: 0.1 })
  }, [])

  const handleSend = async () => {
    if (sending || !email) return
    setSending(true)
    setError('')

    const supabase = createClient()
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    })

    setSending(false)

    // Always show the success state — never reveal whether an account exists.
    if (err) {
      setError('Something went wrong sending the reset link. Please try again.')
      return
    }
    setSent(true)
  }

  const ringCls = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background'
  const inputCls = `w-full min-h-11 rounded-xl border-[1.5px] border-border bg-background px-4 py-3.5 text-[0.9rem] font-medium text-foreground transition-colors placeholder:text-muted-foreground aria-invalid:border-danger focus-visible:border-primary ${ringCls}`

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
          <div className="relative flex aspect-[4/3] max-h-[260px] w-full flex-col items-center justify-center gap-3.5 overflow-hidden rounded-[20px] border-[1.5px] border-dashed border-mint/25 bg-gradient-to-br from-mint/10 to-mint/5">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_30%,var(--color-mint)_0%,transparent_70%)] opacity-10" />
            <svg width="64" height="64" viewBox="0 0 64 64" fill="none" className="relative z-[1] stroke-dark-text opacity-40">
              <rect x="14" y="28" width="36" height="26" rx="6" strokeWidth="1.5" className="fill-dark-text/5"/>
              <path d="M22 28v-8a10 10 0 0 1 20 0v8" strokeWidth="1.5" strokeLinecap="round"/>
              <circle cx="32" cy="40" r="3" className="fill-dark-text stroke-none"/>
            </svg>
            <div className="relative z-[1] text-center">
              <p className="text-[0.72rem] font-semibold text-dark-muted">Character Illustration</p>
              <p className="mt-[3px] text-[0.65rem] text-dark-ghost">Drop asset here</p>
            </div>
          </div>

          <div>
            <p className="text-[1.4rem] font-extrabold leading-[1.1] tracking-[-0.02em] text-dark-text">
              Forgot your<br/>password?
            </p>
            <p className="mt-2 text-sm leading-relaxed text-dark-muted">
              No worries — we&apos;ll send you a reset link.
            </p>
          </div>
        </div>

        <div className="relative z-10 h-6" />
      </div>

      {/* ── RIGHT: form panel ────────────────────────────────────────────────── */}
      <div className="flex w-full flex-col items-center justify-center bg-surface px-8 py-12 md:flex-1 md:px-14 lg:px-20">
        <div ref={formRef} className="w-full max-w-[400px]">

          {sent ? (
            <>
              <div className="mb-6">
                <div className="mb-4 flex size-12 items-center justify-center rounded-[14px] bg-wash text-[1.4rem]">
                  ✉️
                </div>
                <h1 className="text-2xl font-bold leading-[1.1] tracking-[-0.02em] text-foreground">
                  Check your email
                </h1>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  If an account exists for <strong>{email}</strong>, we&apos;ve sent a link to reset your password.
                </p>
              </div>
              <Link
                href="/login"
                className={`flex min-h-11 w-full items-center justify-center rounded-full bg-primary px-6 py-4 text-[0.9rem] font-bold tracking-[0.02em] text-primary-foreground shadow-lg shadow-primary/25 ${ringCls}`}
              >
                Back to sign in
              </Link>
            </>
          ) : (
            <>
              {/* Heading */}
              <div className="mb-8">
                <h1 className="text-2xl font-bold leading-[1.1] tracking-[-0.02em] text-foreground">
                  Reset your password
                </h1>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Enter your email and we&apos;ll send you a link to get back in.
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
                    aria-invalid={error ? true : undefined}
                    aria-describedby={error ? errId : undefined}
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@agencyos.app"
                    autoComplete="email"
                    className={inputCls}
                    onKeyDown={e => { if (e.key === 'Enter') handleSend() }}
                  />
                </div>

                {error && (
                  <p id={errId} role="alert" className="text-[0.78rem] font-medium text-danger">
                    {error}
                  </p>
                )}

                <button
                  onClick={handleSend}
                  disabled={sending || !email}
                  aria-busy={sending}
                  className={`mt-1 min-h-11 w-full cursor-pointer rounded-full bg-primary px-6 py-4 text-[0.9rem] font-bold tracking-[0.02em] text-primary-foreground shadow-lg shadow-primary/25 transition-all duration-200 disabled:cursor-not-allowed disabled:bg-border disabled:text-muted-foreground disabled:shadow-none aria-busy:opacity-75 ${ringCls}`}
                >
                  {sending ? 'Sending...' : 'Send reset link'}
                </button>
              </div>

              <p className="mt-6 text-center text-[0.8rem] text-muted-foreground">
                <Link href="/login" className={`inline-flex min-h-11 items-center rounded-sm font-semibold text-primary underline-offset-4 hover:underline ${ringCls}`}>
                  Back to sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
