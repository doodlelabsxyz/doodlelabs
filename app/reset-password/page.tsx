'use client'

import { useState, useRef, useEffect, useId } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
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

type Status = 'checking' | 'ready' | 'invalid' | 'success'

// ─── Reset Password ────────────────────────────────────────────────────────────

export default function ResetPasswordPage() {
  const router = useRouter()
  const [status,    setStatus]    = useState<Status>('checking')
  const [password,  setPassword]  = useState('')
  const [confirm,   setConfirm]   = useState('')
  const [error,     setError]     = useState('')
  const [saving,    setSaving]    = useState(false)
  const uid = useId()
  const passId = `${uid}-password`, confirmId = `${uid}-confirm`, errId = `${uid}-error`
  const leftRef = useRef<HTMLDivElement>(null)
  const formRef = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    gsap.fromTo(leftRef.current,  { x: -24, opacity: 0 }, { x: 0, opacity: 1, duration: 0.6, ease: 'back.out(1.2)' })
    gsap.fromTo(formRef.current,  { y: 24,  opacity: 0 }, { y: 0,  opacity: 1, duration: 0.55, ease: 'back.out(1.3)', delay: 0.1 })
  }, [status])

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      setStatus(session ? 'ready' : 'invalid')
    })
  }, [])

  const handleSave = async () => {
    if (saving) return
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (password !== confirm) { setError('Passwords do not match.'); return }

    setSaving(true)
    setError('')

    const supabase = createClient()
    const { error: err } = await supabase.auth.updateUser({ password })

    if (err) {
      setSaving(false)
      setError(err.message)
      return
    }

    setStatus('success')

    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = user
      ? await supabase.from('users').select('role').eq('id', user.id).single()
      : { data: null }

    await gsap.to(formRef.current, { y: -16, opacity: 0, scale: 0.97, duration: 0.22, ease: 'power2.in' })

    const route = profile?.role === 'client' ? '/client' : '/dashboard'
    router.push(route)
    router.refresh()
  }

  const ringCls = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background'
  const inputCls = `w-full min-h-11 rounded-xl border-[1.5px] border-border bg-background px-4 py-3.5 text-[0.9rem] font-medium text-foreground transition-colors placeholder:text-muted-foreground aria-invalid:border-danger focus-visible:border-primary ${ringCls}`
  const canSave = !!password && !!confirm

  return (
    <div className="flex min-h-dvh flex-col md:flex-row">

      {/* ── LEFT: dark brand panel ──────────────────────────────────────────── */}
      <div
        ref={leftRef}
        className="relative flex min-h-[360px] w-full flex-col justify-between bg-dark px-8 pt-10 pb-10 md:flex-1 md:px-12 md:pt-14 md:pb-14"
      >
        <FloatingDots />

        <div className="relative z-10 flex items-center gap-2.5">
          <svg width="28" height="28" viewBox="0 0 30 30" fill="none">
            <rect width="30" height="30" rx="9" className="fill-mint"/>
            <path d="M9 22L15 8l6 14M11.5 17.5h7" className="stroke-dark" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="text-base font-bold tracking-[-0.01em] text-dark-text">
            Agency<span className="text-mint">OS</span>
          </span>
        </div>

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
              Set a new<br/>password.
            </p>
            <p className="mt-2 text-sm leading-relaxed text-dark-muted">
              Choose something secure you haven&apos;t used before.
            </p>
          </div>
        </div>

        <div className="relative z-10 h-6" />
      </div>

      {/* ── RIGHT: form panel ────────────────────────────────────────────────── */}
      <div className="flex w-full flex-col items-center justify-center bg-surface px-8 py-12 md:flex-1 md:px-14 lg:px-20">
        <div ref={formRef} className="w-full max-w-[400px]">

          {status === 'checking' && (
            <p role="status" className="text-sm text-muted-foreground">Verifying your reset link...</p>
          )}

          {status === 'invalid' && (
            <>
              <div className="mb-6">
                <h1 className="text-2xl font-bold leading-[1.1] tracking-[-0.02em] text-foreground">
                  Link expired
                </h1>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  This password reset link is invalid or has expired. Request a new one to continue.
                </p>
              </div>
              <Link
                href="/forgot-password"
                className={`flex min-h-11 w-full items-center justify-center rounded-full bg-primary px-6 py-4 text-[0.9rem] font-bold tracking-[0.02em] text-primary-foreground shadow-lg shadow-primary/25 ${ringCls}`}
              >
                Request new link
              </Link>
            </>
          )}

          {(status === 'ready' || status === 'success') && (
            <>
              <div className="mb-8">
                <h1 className="text-2xl font-bold leading-[1.1] tracking-[-0.02em] text-foreground">
                  Set a new password
                </h1>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Choose a strong password for your AgencyOS account.
                </p>
              </div>

              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-[7px]">
                  <label htmlFor={passId} className="text-xs font-semibold text-muted-foreground">
                    New password
                  </label>
                  <input
                    id={passId}
                    type="password"
                    aria-invalid={error ? true : undefined}
                    aria-describedby={error ? errId : undefined}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Min. 8 characters"
                    autoComplete="new-password"
                    className={inputCls}
                  />
                </div>

                <div className="flex flex-col gap-[7px]">
                  <label htmlFor={confirmId} className="text-xs font-semibold text-muted-foreground">
                    Confirm password
                  </label>
                  <input
                    id={confirmId}
                    type="password"
                    aria-invalid={error ? true : undefined}
                    aria-describedby={error ? errId : undefined}
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    placeholder="Re-enter password"
                    autoComplete="new-password"
                    className={inputCls}
                    onKeyDown={e => { if (e.key === 'Enter') handleSave() }}
                  />
                </div>

                {error && (
                  <p id={errId} role="alert" className="text-[0.78rem] font-medium text-danger">
                    {error}
                  </p>
                )}

                <button
                  onClick={handleSave}
                  disabled={saving || !canSave}
                  aria-busy={saving}
                  className={`mt-1 min-h-11 w-full cursor-pointer rounded-full bg-primary px-6 py-4 text-[0.9rem] font-bold tracking-[0.02em] text-primary-foreground shadow-lg shadow-primary/25 transition-all duration-200 disabled:cursor-not-allowed disabled:bg-border disabled:text-muted-foreground disabled:shadow-none aria-busy:opacity-75 ${ringCls}`}
                >
                  {saving ? 'Saving...' : status === 'success' ? 'Redirecting...' : 'Save new password'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
