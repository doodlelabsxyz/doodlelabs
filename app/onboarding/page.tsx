'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Step = 1 | 2 | 3

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)

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

  const brand = 'hsl(25,82%,60%)'

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
    <div style={{ minHeight:'100dvh', background:'hsl(42,30%,97%)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'24px' }}>

      {/* Logo */}
      <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'36px' }}>
        <svg width="24" height="24" viewBox="0 0 30 30" fill="none">
          <rect width="30" height="30" rx="9" fill={brand}/>
          <path d="M9 22L15 8l6 14M11.5 17.5h7" stroke="hsl(42,30%,99%)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span style={{ fontWeight:800, fontSize:'1rem', color:'hsl(24,20%,11%)', letterSpacing:'-0.01em' }}>
          Agency<span style={{ color: brand }}>OS</span>
        </span>
      </div>

      {/* Step indicator */}
      <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'32px' }}>
        {steps.map((s, i) => (
          <div key={s.n} style={{ display:'flex', alignItems:'center', gap:'8px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
              <div style={{
                width: 28, height: 28, borderRadius:'50%',
                background: step >= s.n ? brand : 'hsl(38,14%,88%)',
                display:'flex', alignItems:'center', justifyContent:'center',
                transition: 'background 0.2s',
              }}>
                {step > s.n ? (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ) : (
                  <span style={{ fontSize:'0.65rem', fontWeight:800, color: step >= s.n ? 'white' : 'hsl(24,8%,60%)' }}>{s.n}</span>
                )}
              </div>
              <span style={{ fontSize:'0.72rem', fontWeight: step === s.n ? 700 : 500, color: step === s.n ? 'hsl(24,20%,11%)' : 'hsl(24,8%,60%)' }}>{s.label}</span>
            </div>
            {i < steps.length - 1 && (
              <div style={{ width: 24, height: 1, background: step > s.n ? brand : 'hsl(38,14%,88%)', transition:'background 0.2s' }} />
            )}
          </div>
        ))}
      </div>

      {/* Card */}
      <div style={{ background:'#fff', borderRadius:'24px', border:'1px solid hsl(38,14%,90%)', padding:'32px', width:'100%', maxWidth:'440px', boxShadow:'0 4px 24px rgba(15,26,20,0.06)' }}>

        {/* ── Step 1: Welcome ────────────────────────────────────────────────── */}
        {step === 1 && (
          <div style={{ display:'flex', flexDirection:'column', gap:'20px' }}>
            <div style={{ textAlign:'center' }}>
              <div style={{ fontSize:'2.5rem', marginBottom:'12px' }}>🎉</div>
              <h2 style={{ fontSize:'1.3rem', fontWeight:800, color:'hsl(24,20%,11%)', letterSpacing:'-0.02em', lineHeight:1.2 }}>
                Your workspace is ready!
              </h2>
              <p style={{ fontSize:'0.82rem', color:'hsl(24,8%,52%)', marginTop:'8px', lineHeight:1.6 }}>
                Let&apos;s set things up in 2 quick steps so your team can hit the ground running.
              </p>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
              {[
                { icon:'👤', title:'Add your first client', desc:'Set up the brand you work with.' },
                { icon:'✉️', title:'Invite your team', desc:'Writers, designers, videographers.' },
              ].map(item => (
                <div key={item.title} style={{ display:'flex', alignItems:'center', gap:'12px', padding:'12px 14px', borderRadius:'12px', background:'hsl(42,30%,97%)', border:'1px solid hsl(38,14%,92%)' }}>
                  <span style={{ fontSize:'1.2rem' }}>{item.icon}</span>
                  <div>
                    <p style={{ fontSize:'0.8rem', fontWeight:700, color:'hsl(24,20%,11%)' }}>{item.title}</p>
                    <p style={{ fontSize:'0.7rem', color:'hsl(24,8%,55%)' }}>{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => setStep(2)}
              style={{ padding:'14px', borderRadius:'9999px', background:brand, color:'white', fontWeight:700, fontSize:'0.875rem', border:'none', cursor:'pointer', boxShadow:`0 6px 20px ${brand}40` }}
            >
              Let&apos;s go
            </button>
          </div>
        )}

        {/* ── Step 2: Add first client ──────────────────────────────────────── */}
        {step === 2 && (
          <div style={{ display:'flex', flexDirection:'column', gap:'18px' }}>
            <div>
              <h2 style={{ fontSize:'1.15rem', fontWeight:800, color:'hsl(24,20%,11%)', letterSpacing:'-0.02em' }}>Add your first client</h2>
              <p style={{ fontSize:'0.78rem', color:'hsl(24,8%,52%)', marginTop:'4px' }}>You can add more clients later from the Clients section.</p>
            </div>

            {[
              { label:'Client / brand name', value:clientName, set:setClientName, placeholder:'e.g. FitLife PK' },
              { label:'Industry',            value:clientIndustry, set:setClientIndustry, placeholder:'e.g. Fitness, F&B, Fashion…' },
            ].map(f => (
              <div key={f.label} style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
                <label style={{ fontSize:'0.72rem', fontWeight:600, color:'hsl(24,10%,44%)' }}>{f.label}</label>
                <input
                  type="text"
                  value={f.value}
                  onChange={e => f.set(e.target.value)}
                  placeholder={f.placeholder}
                  className="w-full outline-none"
                  style={{ padding:'12px 14px', borderRadius:'10px', background:'hsl(40,18%,95%)', border:'1.5px solid hsl(38,14%,88%)', fontSize:'0.875rem', color:'hsl(24,20%,11%)', fontWeight:500 }}
                  onFocus={e => { e.target.style.borderColor = brand }}
                  onBlur={e => { e.target.style.borderColor = 'hsl(38,14%,88%)' }}
                />
              </div>
            ))}

            <div style={{ display:'flex', gap:'10px', marginTop:'4px' }}>
              <button
                onClick={() => setStep(3)}
                style={{ flex:1, padding:'13px', borderRadius:'9999px', background:'transparent', color:'hsl(24,8%,55%)', fontWeight:600, fontSize:'0.82rem', border:'1.5px solid hsl(38,14%,88%)', cursor:'pointer' }}
              >
                Skip for now
              </button>
              <button
                onClick={handleAddClient}
                disabled={!clientName || clientSaving}
                style={{ flex:2, padding:'13px', borderRadius:'9999px', background:clientName ? brand : 'hsl(38,14%,85%)', color:'white', fontWeight:700, fontSize:'0.875rem', border:'none', cursor:clientName ? 'pointer' : 'not-allowed', boxShadow: clientName ? `0 6px 20px ${brand}40` : 'none' }}
              >
                {clientSaving ? 'Saving…' : 'Add client'}
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Invite team ───────────────────────────────────────────── */}
        {step === 3 && (
          <div style={{ display:'flex', flexDirection:'column', gap:'18px' }}>
            <div>
              <h2 style={{ fontSize:'1.15rem', fontWeight:800, color:'hsl(24,20%,11%)', letterSpacing:'-0.02em' }}>Invite your team</h2>
              <p style={{ fontSize:'0.78rem', color:'hsl(24,8%,52%)', marginTop:'4px' }}>They&apos;ll get an email to join your workspace.</p>
            </div>

            {!inviteSent ? (
              <>
                <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
                  <label style={{ fontSize:'0.72rem', fontWeight:600, color:'hsl(24,10%,44%)' }}>Email address</label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                    placeholder="teammate@youragency.com"
                    className="w-full outline-none"
                    style={{ padding:'12px 14px', borderRadius:'10px', background:'hsl(40,18%,95%)', border:'1.5px solid hsl(38,14%,88%)', fontSize:'0.875rem', color:'hsl(24,20%,11%)', fontWeight:500 }}
                    onFocus={e => { e.target.style.borderColor = brand }}
                    onBlur={e => { e.target.style.borderColor = 'hsl(38,14%,88%)' }}
                  />
                </div>

                <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
                  <label style={{ fontSize:'0.72rem', fontWeight:600, color:'hsl(24,10%,44%)' }}>Role</label>
                  <select
                    value={inviteRole}
                    onChange={e => setInviteRole(e.target.value)}
                    className="w-full outline-none"
                    style={{ padding:'12px 14px', borderRadius:'10px', background:'hsl(40,18%,95%)', border:'1.5px solid hsl(38,14%,88%)', fontSize:'0.875rem', color:'hsl(24,20%,11%)', fontWeight:500, cursor:'pointer' }}
                  >
                    {['writer','designer','videographer','editor','poster','admin','client'].map(r => (
                      <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                    ))}
                  </select>
                </div>

                {inviteError && <p style={{ fontSize:'0.75rem', color:'hsl(4,72%,50%)', fontWeight:500 }}>{inviteError}</p>}

                <div style={{ display:'flex', gap:'10px' }}>
                  <button
                    onClick={() => router.push('/dashboard')}
                    style={{ flex:1, padding:'13px', borderRadius:'9999px', background:'transparent', color:'hsl(24,8%,55%)', fontWeight:600, fontSize:'0.82rem', border:'1.5px solid hsl(38,14%,88%)', cursor:'pointer' }}
                  >
                    Skip for now
                  </button>
                  <button
                    onClick={handleInvite}
                    disabled={!inviteEmail || inviting}
                    style={{ flex:2, padding:'13px', borderRadius:'9999px', background:inviteEmail ? brand : 'hsl(38,14%,85%)', color:'white', fontWeight:700, fontSize:'0.875rem', border:'none', cursor:inviteEmail ? 'pointer' : 'not-allowed', boxShadow: inviteEmail ? `0 6px 20px ${brand}40` : 'none' }}
                  >
                    {inviting ? 'Sending…' : 'Send invite'}
                  </button>
                </div>
              </>
            ) : (
              <div style={{ textAlign:'center', padding:'20px 0' }}>
                <div style={{ fontSize:'2.5rem', marginBottom:'12px' }}>✅</div>
                <p style={{ fontSize:'0.9rem', fontWeight:700, color:'hsl(24,20%,11%)' }}>Invite sent to {inviteEmail}</p>
                <p style={{ fontSize:'0.75rem', color:'hsl(24,8%,52%)', marginTop:'6px' }}>They&apos;ll get an email to join your workspace.</p>
                <button
                  onClick={() => router.push('/dashboard')}
                  style={{ marginTop:'20px', padding:'13px 32px', borderRadius:'9999px', background:brand, color:'white', fontWeight:700, fontSize:'0.875rem', border:'none', cursor:'pointer', boxShadow:`0 6px 20px ${brand}40` }}
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
          style={{ marginTop:'16px', background:'none', border:'none', color:'hsl(24,8%,55%)', fontSize:'0.72rem', cursor:'pointer', textDecoration:'underline' }}
        >
          Skip setup and go to dashboard
        </button>
      )}
    </div>
  )
}
