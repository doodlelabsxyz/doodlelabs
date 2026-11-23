'use client'

import { useState, useRef, useId } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { createClient } from '@/lib/supabase/client'

gsap.registerPlugin(useGSAP)

function toSlug(name: string) {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export default function SignupPage() {
  const router = useRouter()
  const [fullName,     setFullName]     = useState('')
  const [email,        setEmail]        = useState('')
  const [password,     setPassword]     = useState('')
  const [agencyName,   setAgencyName]   = useState('')
  const [slug,         setSlug]         = useState('')
  const [slugEdited,   setSlugEdited]   = useState(false)
  const [submitting,   setSubmitting]   = useState(false)
  const [error,        setError]        = useState('')
  const uid = useId()
  const errId = `${uid}-error`
  const leftRef = useRef<HTMLDivElement>(null)
  const formRef = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    gsap.fromTo(leftRef.current, { x: -24, opacity: 0 }, { x: 0, opacity: 1, duration: 0.6, ease: 'back.out(1.2)' })
    gsap.fromTo(formRef.current, { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.55, ease: 'back.out(1.3)', delay: 0.1 })
  }, [])

  function handleAgencyNameChange(val: string) {
    setAgencyName(val)
    if (!slugEdited) setSlug(toSlug(val))
  }

  function handleSlugChange(val: string) {
    setSlugEdited(true)
    setSlug(toSlug(val))
  }

  async function handleSubmit() {
    if (submitting) return
    if (!fullName || !email || !password || !agencyName || !slug) {
      setError('Please fill in all fields.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: fullName, email, password, agencyName, slug }),
      })

      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? 'Something went wrong. Please try again.')
        setSubmitting(false)
        return
      }

      // Sign in immediately after account creation
      const supabase = createClient()
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInError) {
        setError('Account created — please sign in.')
        router.push('/login')
        return
      }

      await gsap.to(formRef.current, { y: -16, opacity: 0, scale: 0.97, duration: 0.22, ease: 'power2.in' })
      router.push('/onboarding')
    } catch (err) {
      setError('Network error. Please check your connection and try again.')
      setSubmitting(false)
      console.error('[signup]', err)
    }
  }

  const ringCls = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background'
  const inputCls = `w-full min-h-11 rounded-xl border-[1.5px] border-border bg-background px-[15px] py-[13px] text-sm font-medium text-foreground transition-colors placeholder:text-muted-foreground aria-invalid:border-danger focus-visible:border-primary ${ringCls}`
  const labelCls = 'text-[0.73rem] font-semibold text-muted-foreground'
  const canSubmit = !!(fullName && email && password && agencyName && slug)

  return (
    <div className="flex min-h-dvh flex-col md:flex-row">

      {/* ── LEFT: dark brand panel ──────────────────────────────────────── */}
      <div
        ref={leftRef}
        className="relative flex min-h-[320px] w-full flex-col justify-between bg-dark px-8 pt-10 pb-10 md:flex-1 md:px-12 md:pt-14 md:pb-14"
      >
        {/* Decorative blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
          <div className="absolute -top-[60px] -right-[60px] size-[280px] rounded-full bg-mint/10" />
          <div className="absolute -bottom-[50px] -left-[50px] size-[200px] rounded-full bg-mint/[0.07]" />
          <div className="absolute top-[40%] -left-5 size-[90px] rounded-full bg-mint/[0.05]" />
        </div>

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

        {/* Tagline */}
        <div className="relative z-10">
          <p className="text-[1.4rem] font-extrabold leading-[1.1] tracking-[-0.02em] text-dark-text">
            Set up your<br />agency workspace.
          </p>
          <p className="mt-2 text-sm leading-relaxed text-dark-muted">
            Your whole team. All your clients.<br />One place to plan and create.
          </p>

          {/* Plan highlights */}
          <div className="mt-7 flex flex-col gap-2.5">
            {[
              '14-day free trial — no credit card needed',
              'Unlimited content planning & pipelines',
              'Client portal + approval flows',
            ].map(txt => (
              <div key={txt} className="flex items-center gap-2.5">
                <div className="flex size-[18px] shrink-0 items-center justify-center rounded-full bg-mint/20">
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" className="stroke-mint" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <span className="text-[0.78rem] text-dark-muted">{txt}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 h-6" />
      </div>

      {/* ── RIGHT: form panel ─────────────────────────────────────────────── */}
      <div className="flex w-full flex-col items-center justify-center bg-surface px-8 py-12 md:flex-1 md:px-14 lg:px-20">
        <div ref={formRef} className="w-full max-w-[420px]">

          <div className="mb-7">
            <h1 className="text-2xl font-bold leading-[1.1] tracking-[-0.02em] text-foreground">
              Create your account
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link href="/login" className={`rounded-sm font-semibold text-primary underline-offset-4 hover:underline ${ringCls}`}>Sign in</Link>
            </p>
          </div>

          <div className="flex flex-col gap-3.5">

            {/* Section: You */}
            <p className="-mb-1 text-[0.62rem] font-bold uppercase tracking-[0.07em] text-muted-foreground">Your details</p>

            {[
              { label: 'Full name',       value: fullName,   set: setFullName,   type: 'text',     placeholder: 'Sarah Malik', auto: 'name', mode: undefined },
              { label: 'Email address',   value: email,      set: setEmail,      type: 'email',    placeholder: 'you@youragency.com', auto: 'email', mode: 'email' as const },
              { label: 'Password',        value: password,   set: setPassword,   type: 'password', placeholder: '8+ characters', auto: 'new-password', mode: undefined },
            ].map(f => (
              <div key={f.label} className="flex flex-col gap-1.5">
                <label htmlFor={`${uid}-${f.auto}`} className={labelCls}>{f.label}</label>
                <input
                  id={`${uid}-${f.auto}`}
                  type={f.type}
                  autoComplete={f.auto}
                  inputMode={f.mode}
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? errId : undefined}
                  value={f.value}
                  onChange={e => f.set(e.target.value)}
                  placeholder={f.placeholder}
                  className={inputCls}
                  onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }}
                />
              </div>
            ))}

            {/* Section: Agency */}
            <p className="-mb-1 mt-1.5 text-[0.62rem] font-bold uppercase tracking-[0.07em] text-muted-foreground">Your agency</p>

            <div className="flex flex-col gap-1.5">
              <label htmlFor={`${uid}-agency`} className={labelCls}>Agency name</label>
              <input
                id={`${uid}-agency`}
                type="text"
                autoComplete="organization"
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? errId : undefined}
                value={agencyName}
                onChange={e => handleAgencyNameChange(e.target.value)}
                placeholder="FreshMint Creative"
                className={inputCls}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor={`${uid}-slug`} className={labelCls}>Workspace URL</label>
              <div className="relative">
                <span className="pointer-events-none absolute left-[15px] top-1/2 -translate-y-1/2 text-[0.8rem] font-medium text-muted-foreground">
                  agencyos.app/
                </span>
                <input
                  id={`${uid}-slug`}
                  type="text"
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? errId : undefined}
                  value={slug}
                  onChange={e => handleSlugChange(e.target.value)}
                  placeholder="freshmint"
                  className={`${inputCls} !pl-[106px]`}
                />
              </div>
            </div>

            {error && (
              <p id={errId} role="alert" className="text-[0.78rem] font-medium text-danger">{error}</p>
            )}

            <button
              onClick={handleSubmit}
              disabled={submitting || !canSubmit}
              aria-busy={submitting}
              className={`mt-1 min-h-11 w-full cursor-pointer rounded-full bg-primary px-6 py-4 text-[0.9rem] font-bold tracking-[0.02em] text-primary-foreground shadow-lg shadow-primary/25 transition-all duration-200 hover:not-disabled:-translate-y-0.5 disabled:cursor-not-allowed disabled:bg-border disabled:text-muted-foreground disabled:shadow-none aria-busy:opacity-75 ${ringCls}`}
            >
              {submitting ? 'Creating workspace…' : 'Create workspace'}
            </button>
          </div>

          <p className="mt-5 text-center text-[0.7rem] leading-relaxed text-muted-foreground">
            By signing up you agree to our Terms of Service<br />and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  )
}
