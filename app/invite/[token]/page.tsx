'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type InviteInfo = { email: string; role: string; orgName: string }

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

  const brand = 'hsl(25,82%,60%)'

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
    if (!fullName) { setSubmitError('Please enter your name.'); return }
    if (password.length < 8) { setSubmitError('Password must be at least 8 characters.'); return }
    if (password !== confirm) { setSubmitError('Passwords do not match.'); return }

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
    <div style={{ minHeight:'100dvh', background:'hsl(42,30%,97%)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'24px' }}>

      {/* Logo */}
      <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'32px' }}>
        <svg width="24" height="24" viewBox="0 0 30 30" fill="none">
          <rect width="30" height="30" rx="9" fill={brand}/>
          <path d="M9 22L15 8l6 14M11.5 17.5h7" stroke="hsl(42,30%,99%)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span style={{ fontWeight:800, fontSize:'1rem', color:'hsl(24,20%,11%)' }}>
          Agency<span style={{ color: brand }}>OS</span>
        </span>
      </div>

      <div style={{ background:'#fff', borderRadius:'24px', border:'1px solid hsl(38,14%,90%)', padding:'32px', width:'100%', maxWidth:'420px', boxShadow:'0 4px 24px rgba(15,26,20,0.06)' }}>

        {loading && (
          <div style={{ textAlign:'center', padding:'24px 0', color:'hsl(24,8%,55%)', fontSize:'0.85rem' }}>
            Validating invite…
          </div>
        )}

        {!loading && loadError && (
          <div style={{ textAlign:'center', padding:'16px 0' }}>
            <div style={{ fontSize:'2.5rem', marginBottom:'12px' }}>⚠️</div>
            <h2 style={{ fontSize:'1rem', fontWeight:800, color:'hsl(24,20%,11%)' }}>Invite not valid</h2>
            <p style={{ fontSize:'0.78rem', color:'hsl(24,8%,52%)', marginTop:'8px', lineHeight:1.6 }}>{loadError}</p>
            <p style={{ fontSize:'0.75rem', color:'hsl(24,8%,55%)', marginTop:'12px' }}>
              Ask your admin to send a new invite.
            </p>
          </div>
        )}

        {!loading && invite && (
          <div style={{ display:'flex', flexDirection:'column', gap:'18px' }}>

            {/* Header */}
            <div style={{ textAlign:'center' }}>
              <div style={{ display:'inline-flex', alignItems:'center', gap:'6px', padding:'6px 14px', borderRadius:'9999px', background:`${brand}18`, marginBottom:'12px' }}>
                <span style={{ fontSize:'0.7rem', fontWeight:700, color:brand }}>{invite.orgName}</span>
              </div>
              <h2 style={{ fontSize:'1.2rem', fontWeight:800, color:'hsl(24,20%,11%)', lineHeight:1.2, letterSpacing:'-0.02em' }}>
                You&apos;ve been invited
              </h2>
              <p style={{ fontSize:'0.78rem', color:'hsl(24,8%,52%)', marginTop:'6px' }}>
                Joining as <strong style={{ color:'hsl(24,15%,20%)', textTransform:'capitalize' }}>{invite.role}</strong> · {invite.email}
              </p>
            </div>

            {/* Form */}
            {[
              { label:'Your name',   value:fullName,  set:setFullName,  type:'text',     placeholder:'Full name' },
              { label:'Password',    value:password,  set:setPassword,  type:'password', placeholder:'8+ characters' },
              { label:'Confirm',     value:confirm,   set:setConfirm,   type:'password', placeholder:'Repeat password' },
            ].map(f => (
              <div key={f.label} style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
                <label style={{ fontSize:'0.72rem', fontWeight:600, color:'hsl(24,10%,44%)' }}>{f.label}</label>
                <input
                  type={f.type}
                  value={f.value}
                  onChange={e => f.set(e.target.value)}
                  placeholder={f.placeholder}
                  className="w-full outline-none"
                  style={{ padding:'12px 14px', borderRadius:'10px', background:'hsl(40,18%,95%)', border:'1.5px solid hsl(38,14%,88%)', fontSize:'0.875rem', color:'hsl(24,20%,11%)', fontWeight:500 }}
                  onFocus={e => { e.target.style.borderColor = brand }}
                  onBlur={e => { e.target.style.borderColor = 'hsl(38,14%,88%)' }}
                  onKeyDown={e => { if (e.key === 'Enter') handleAccept() }}
                />
              </div>
            ))}

            {submitError && (
              <p style={{ fontSize:'0.75rem', color:'hsl(4,72%,50%)', fontWeight:500 }}>{submitError}</p>
            )}

            <button
              onClick={handleAccept}
              disabled={submitting}
              style={{ padding:'14px', borderRadius:'9999px', background:brand, color:'white', fontWeight:700, fontSize:'0.875rem', border:'none', cursor:submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.75 : 1, boxShadow:`0 6px 20px ${brand}40` }}
            >
              {submitting ? 'Joining…' : 'Accept & join workspace'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
