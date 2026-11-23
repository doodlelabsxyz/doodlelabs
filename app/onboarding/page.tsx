'use client'

import { useId, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Step = 1 | 2 | 3

const inputCls = 'min-h-11 w-full rounded-[10px] border-[1.5px] border-border bg-background px-3.5 py-3 text-sm font-medium text-foreground transition-colors placeholder:text-muted-foreground focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background'
const ringCls = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background'
const primaryBtn = `min-h-11 cursor-pointer rounded-full bg-primary text-sm font-bold text-primary-foreground shadow-lg shadow-primary/25 transition-all disabled:cursor-not-allowed disabled:bg-border disabled:text-muted-foreground disabled:shadow-none ${ringCls}`
const ghostBtn = `min-h-11 flex-1 cursor-pointer rounded-full border-[1.5px] border-border bg-transparent p-3 text-[0.82rem] font-semibold text-muted-foreground ${ringCls}`

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)
  const uid = useId()
  const clientNameId = `${uid}-client-name`
  const industryId = `${uid}-industry`
  const emailId = `${uid}-invite-email`
  const roleId = `${uid}-invite-role`
  const errorId = `${uid}-invite-error`

  // Step 2 — add first client
  const [clientName,   setClientName]   = useState('')
  const [clientIndustry, setClientIndustry] = useState('')
  const [clientSaving, setClientSaving] = useState(false)

  // Step 3 — invite team member
  const [inviteEmail, setInviteEmail]   = useState('')
  const [inviteRole,  setInviteRole]    = useState('writer')
  const [inviting,    setInviting]      = useState(false)
  const [inviteSent,  setInviteSent]    = useState(false)
  const [inviteError, setInviteError]   = useState('')

  async function handleAddClient() {
    if (!clientName || clientSaving) return
    setClientSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setClientSaving(false); return }

    const { data: profile } = await supabase.from('users').select('org_id').eq('id', user.id).single()
    if (!profile?.org_id) { setClientSaving(false); return }

    await supabase.from('clients').insert({
      name:     clientName,
      industry: clientIndustry || 'Other',
      initials: clientName.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2),
      org_id:   profile.org_id,
    })
    setClientSaving(false)
    setStep(3)
  }

  async function handleInvite() {
    if (!inviteEmail || inviting) return
    setInviting(true)
    setInviteError('')
    const res = await fetch('/api/invite/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
    })
    const json = await res.json()
    if (!res.ok) {
      setInviteError(json.error ?? 'Failed to send invite.')
      setInviting(false)
      return
    }
    setInviteSent(true)
    setInviting(false)
  }

  const steps = [
    { n: 1, label: 'Welcome' },
    { n: 2, label: 'First client' },
    { n: 3, label: 'Invite team' },
  ]

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-surface p-6">

      {/* Logo */}
      <div className="mb-9 flex items-center gap-2">
        <svg width="24" height="24" viewBox="0 0 30 30" fill="none" aria-hidden="true">
          <rect width="30" height="30" rx="9" className="fill-primary"/>
          <path d="M9 22L15 8l6 14M11.5 17.5h7" className="stroke-primary-foreground" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span className="text-base font-extrabold tracking-[-0.01em] text-foreground">
          Agency<span className="text-primary">OS</span>
        </span>
      </div>

      {/* Step indicator */}
      <div className="mb-8 flex items-center gap-2">
        {steps.map((s, i) => (
          <div key={s.n} className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <div className={`flex size-7 items-center justify-center rounded-full transition-colors ${step >= s.n ? 'bg-primary' : 'bg-border'}`}>
                {step > s.n ? (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" className="stroke-primary-foreground" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ) : (
                  <span className={`text-[0.65rem] font-extrabold ${step >= s.n ? 'text-primary-foreground' : 'text-muted-foreground'}`}>{s.n}</span>
                )}
              </div>
              <span className={`text-[0.72rem] ${step === s.n ? 'font-bold text-foreground' : 'font-medium text-muted-foreground'}`}>{s.label}</span>
            </div>
            {i < steps.length - 1 && (
              <div className={`h-px w-6 transition-colors ${step > s.n ? 'bg-primary' : 'bg-border'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Card */}
      <div className="w-full max-w-[440px] rounded-3xl border border-border bg-background p-8 shadow-sm">

        {/* ── Step 1: Welcome ────────────────────────────────────────────────── */}
        {step === 1 && (
          <div className="flex flex-col gap-5">
            <div className="text-center">
              <div className="mb-3 text-[2.5rem]">🎉</div>
              <h2 className="text-[1.3rem] font-extrabold leading-tight tracking-[-0.02em] text-foreground">
                Your workspace is ready!
              </h2>
              <p className="mt-2 text-[0.82rem] leading-relaxed text-muted-foreground">
                Let&apos;s set things up in 2 quick steps so your team can hit the ground running.
              </p>
            </div>
            <div className="flex flex-col gap-2.5">
              {[
                { icon:'👤', title:'Add your first client', desc:'Set up the brand you work with.' },
                { icon:'✉️', title:'Invite your team', desc:'Writers, designers, videographers.' },
              ].map(item => (
                <div key={item.title} className="flex items-center gap-3 rounded-xl border border-border bg-wash px-3.5 py-3">
                  <span className="text-[1.2rem]">{item.icon}</span>
                  <div>
                    <p className="text-[0.8rem] font-bold text-foreground">{item.title}</p>
                    <p className="text-[0.7rem] text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => setStep(2)}
              className={`${primaryBtn} p-3.5`}
            >
              Let&apos;s go
            </button>
          </div>
        )}

        {/* ── Step 2: Add first client ──────────────────────────────────────── */}
        {step === 2 && (
          <div className="flex flex-col gap-[18px]">
            <div>
              <h2 className="text-[1.15rem] font-extrabold tracking-[-0.02em] text-foreground">Add your first client</h2>
              <p className="mt-1 text-[0.78rem] text-muted-foreground">You can add more clients later from the Clients section.</p>
            </div>

            {[
              { id:clientNameId, label:'Client / brand name', value:clientName, set:setClientName, placeholder:'e.g. FitLife PK', autoComplete:'organization', required:true },
              { id:industryId,   label:'Industry',            value:clientIndustry, set:setClientIndustry, placeholder:'e.g. Fitness, F&B, Fashion…', autoComplete:'off', required:false },
            ].map(f => (
              <div key={f.id} className="flex flex-col gap-1.5">
                <label htmlFor={f.id} className="text-[0.72rem] font-semibold text-muted-foreground">{f.label}</label>
                <input
                  id={f.id}
                  type="text"
                  autoComplete={f.autoComplete}
                  required={f.required}
                  value={f.value}
                  onChange={e => f.set(e.target.value)}
                  placeholder={f.placeholder}
                  className={inputCls}
                />
              </div>
            ))}

            <div className="mt-1 flex gap-2.5">
              <button
                onClick={() => setStep(3)}
                className={ghostBtn}
              >
                Skip for now
              </button>
              <button
                onClick={handleAddClient}
                disabled={!clientName || clientSaving}
                className={`${primaryBtn} flex-[2] p-3`}
              >
                {clientSaving ? 'Saving…' : 'Add client'}
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Invite team ───────────────────────────────────────────── */}
        {step === 3 && (
          <div className="flex flex-col gap-[18px]">
            <div>
              <h2 className="text-[1.15rem] font-extrabold tracking-[-0.02em] text-foreground">Invite your team</h2>
              <p className="mt-1 text-[0.78rem] text-muted-foreground">They&apos;ll get an email to join your workspace.</p>
            </div>

            {!inviteSent ? (
              <>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor={emailId} className="text-[0.72rem] font-semibold text-muted-foreground">Email address</label>
                  <input
                    id={emailId}
                    type="email"
                    autoComplete="email"
                    required
                    aria-invalid={inviteError ? true : undefined}
                    aria-describedby={inviteError ? errorId : undefined}
                    value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                    placeholder="teammate@youragency.com"
                    className={inputCls}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor={roleId} className="text-[0.72rem] font-semibold text-muted-foreground">Role</label>
                  <select
                    id={roleId}
                    value={inviteRole}
                    onChange={e => setInviteRole(e.target.value)}
                    className={`${inputCls} cursor-pointer`}
                  >
                    {['writer','designer','videographer','editor','poster','admin','client'].map(r => (
                      <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                    ))}
                  </select>
                </div>

                {inviteError && <p id={errorId} role="alert" className="text-xs font-medium text-danger">{inviteError}</p>}

                <div className="flex gap-2.5">
                  <button
                    onClick={() => router.push('/dashboard')}
                    className={ghostBtn}
                  >
                    Skip for now
                  </button>
                  <button
                    onClick={handleInvite}
                    disabled={!inviteEmail || inviting}
                    className={`${primaryBtn} flex-[2] p-3`}
                  >
                    {inviting ? 'Sending…' : 'Send invite'}
                  </button>
                </div>
              </>
            ) : (
              <div className="py-5 text-center">
                <div className="mb-3 text-[2.5rem]">✅</div>
                <p className="text-[0.9rem] font-bold text-foreground">Invite sent to {inviteEmail}</p>
                <p className="mt-1.5 text-xs text-muted-foreground">They&apos;ll get an email to join your workspace.</p>
                <button
                  onClick={() => router.push('/dashboard')}
                  className={`${primaryBtn} mt-5 px-8 py-3`}
                >
                  Go to dashboard
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Skip all */}
      {step < 3 && (
        <button
          onClick={() => router.push('/dashboard')}
          className={`mt-4 inline-flex min-h-11 cursor-pointer items-center rounded-sm text-[0.72rem] text-muted-foreground underline underline-offset-4 ${ringCls}`}
        >
          Skip setup and go to dashboard
        </button>
      )}
    </div>
  )
}
