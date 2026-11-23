'use client'

import { useState, useEffect, useId } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type InviteInfo = { email: string; role: string; orgName: string }

const inputCls = 'min-h-11 w-full rounded-[10px] border-[1.5px] border-border bg-background px-3.5 py-3 text-sm font-medium text-foreground transition-colors placeholder:text-muted-foreground focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background'

export default function AcceptInvitePage() {
  const params    = useParams()
  const router    = useRouter()
  const token     = params.token as string

  const [invite,      setInvite]      = useState<InviteInfo | null>(null)
  const [loadError,   setLoadError]   = useState('')
  const [loading,     setLoading]     = useState(true)

  const [fullName,    setFullName]    = useState('')
  const [password,    setPassword]    = useState('')
  const [confirm,     setConfirm]     = useState('')
  const [submitting,  setSubmitting]  = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [errorField, setErrorField] = useState<'name' | 'password' | 'confirm' | null>(null)
  const uid = useId()
  const errorId = `${uid}-error`

  useEffect(() => {
    async function loadInvite() {
      const res = await fetch(`/api/invite/${token}`)
      const json = await res.json()
      if (!res.ok) { setLoadError(json.error ?? 'Invalid or expired invite link.'); setLoading(false); return }
      setInvite(json)
      setLoading(false)
    }
    loadInvite()
  }, [token])

  async function handleAccept() {
    if (submitting || !invite) return
    setErrorField(null)
    if (!fullName) { setErrorField('name'); setSubmitError('Please enter your name.'); return }
    if (password.length < 8) { setErrorField('password'); setSubmitError('Password must be at least 8 characters.'); return }
    if (password !== confirm) { setErrorField('confirm'); setSubmitError('Passwords do not match.'); return }

    setSubmitting(true)
    setSubmitError('')

    const res = await fetch('/api/invite/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, name: fullName, password }),
    })
    const json = await res.json()
    if (!res.ok) {
      setSubmitError(json.error ?? 'Something went wrong.')
      setSubmitting(false)
      return
    }

    // Sign in with the new credentials
    const supabase = createClient()
    await supabase.auth.signInWithPassword({ email: invite.email, password })
    router.push('/dashboard')
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-surface p-6">

      {/* Logo */}
      <div className="mb-8 flex items-center gap-2">
        <svg width="24" height="24" viewBox="0 0 30 30" fill="none" aria-hidden="true">
          <rect width="30" height="30" rx="9" className="fill-primary"/>
          <path d="M9 22L15 8l6 14M11.5 17.5h7" className="stroke-primary-foreground" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span className="text-base font-extrabold text-foreground">
          Agency<span className="text-primary">OS</span>
        </span>
      </div>

      <div className="w-full max-w-[420px] rounded-3xl border border-border bg-background p-8 shadow-sm">

        {loading && (
          <div className="py-6 text-center text-[0.85rem] text-muted-foreground">
            Validating invite…
          </div>
        )}

        {!loading && loadError && (
          <div className="py-4 text-center">
            <div className="mb-3 text-[2.5rem]">⚠️</div>
            <h2 className="text-base font-extrabold text-foreground">Invite not valid</h2>
            <p role="alert" className="mt-2 text-[0.78rem] leading-relaxed text-muted-foreground">{loadError}</p>
            <p className="mt-3 text-xs text-muted-foreground">
              Ask your admin to send a new invite.
            </p>
          </div>
        )}

        {!loading && invite && (
          <div className="flex flex-col gap-[18px]">

            {/* Header */}
            <div className="text-center">
              <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-wash px-3.5 py-1.5">
                <span className="text-[0.7rem] font-bold text-primary">{invite.orgName}</span>
              </div>
              <h2 className="text-xl font-extrabold leading-tight tracking-[-0.02em] text-foreground">
                You&apos;ve been invited
              </h2>
              <p className="mt-1.5 text-[0.78rem] text-muted-foreground">
                Joining as <strong className="capitalize text-foreground">{invite.role}</strong> · {invite.email}
              </p>
            </div>

            {/* Form */}
            {[
              { key:'name' as const,     label:'Your name',   value:fullName,  set:setFullName,  type:'text',     placeholder:'Full name',        autoComplete:'name' },
              { key:'password' as const, label:'Password',    value:password,  set:setPassword,  type:'password', placeholder:'8+ characters',    autoComplete:'new-password' },
              { key:'confirm' as const,  label:'Confirm',     value:confirm,   set:setConfirm,   type:'password', placeholder:'Repeat password',  autoComplete:'new-password' },
            ].map(f => (
              <div key={f.key} className="flex flex-col gap-1.5">
                <label htmlFor={`${uid}-${f.key}`} className="text-[0.72rem] font-semibold text-muted-foreground">{f.label}</label>
                <input
                  id={`${uid}-${f.key}`}
                  type={f.type}
                  autoComplete={f.autoComplete}
                  required
                  aria-invalid={errorField === f.key ? true : undefined}
                  aria-describedby={errorField === f.key && submitError ? errorId : undefined}
                  value={f.value}
                  onChange={e => f.set(e.target.value)}
                  placeholder={f.placeholder}
                  className={inputCls}
                  onKeyDown={e => { if (e.key === 'Enter') handleAccept() }}
                />
              </div>
            ))}

            {submitError && (
              <p id={errorId} role="alert" className="text-xs font-medium text-danger">{submitError}</p>
            )}

            <button
              onClick={handleAccept}
              disabled={submitting}
              className="min-h-11 cursor-pointer rounded-full bg-primary p-3.5 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/25 transition-all disabled:cursor-not-allowed disabled:opacity-75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              {submitting ? 'Joining…' : 'Accept & join workspace'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
