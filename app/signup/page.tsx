'use client'

import { useState, useRef } from 'react'
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

  const brand = 'hsl(25,82%,60%)'
  const canSubmit = fullName && email && password && agencyName && slug

  return (
    <div className="flex min-h-dvh flex-col md:flex-row">

      {/* ── LEFT: dark brand panel ──────────────────────────────────────── */}
      <div
        ref={leftRef}
        className="relative flex flex-col justify-between w-full md:flex-1 pt-10 pb-10 px-8 md:pt-14 md:pb-14 md:px-12"
        style={{ background: '#0F1A14', minHeight: '320px' }}
      >
        {/* Decorative blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
          <div style={{ position:'absolute', top:'-60px', right:'-60px', width:'280px', height:'280px', borderRadius:'50%', background:`${brand}18` }} />
          <div style={{ position:'absolute', bottom:'-50px', left:'-50px', width:'200px', height:'200px', borderRadius:'50%', background:`${brand}12` }} />
          <div style={{ position:'absolute', top:'40%', left:'-20px', width:'90px', height:'90px', borderRadius:'50%', background:`${brand}0e` }} />
        </div>

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-2.5">
          <svg width="28" height="28" viewBox="0 0 30 30" fill="none">
            <rect width="30" height="30" rx="9" fill={brand}/>
            <path d="M9 22L15 8l6 14M11.5 17.5h7" stroke="hsl(42,30%,99%)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="font-bold text-base" style={{ color: 'hsl(42,22%,84%)', letterSpacing: '-0.01em' }}>
            Agency<span style={{ color: brand }}>OS</span>
          </span>
        </div>

        {/* Tagline */}
        <div className="relative z-10">
          <p style={{ fontSize:'1.4rem', fontWeight:800, color:'hsl(42,22%,84%)', lineHeight:1.1, letterSpacing:'-0.02em' }}>
            Set up your<br />agency workspace.
          </p>
          <p style={{ fontSize:'0.875rem', color:'hsl(140,7%,48%)', marginTop:'8px', lineHeight:1.6 }}>
            Your whole team. All your clients.<br />One place to plan and create.
          </p>

          {/* Plan highlights */}
          <div style={{ marginTop: '28px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              '14-day free trial — no credit card needed',
              'Unlimited content planning & pipelines',
              'Client portal + approval flows',
            ].map(txt => (
              <div key={txt} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: 18, height: 18, borderRadius: '50%', background: `${brand}30`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink: 0 }}>
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke={brand} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <span style={{ fontSize:'0.78rem', color:'hsl(140,7%,55%)' }}>{txt}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 h-6" />
      </div>

      {/* ── RIGHT: form panel ─────────────────────────────────────────────── */}
      <div
        className="flex flex-col justify-center items-center w-full md:flex-1 px-8 py-12 md:px-14 lg:px-20"
        style={{ background: 'hsl(42,30%,97%)' }}
      >
        <div ref={formRef} className="w-full" style={{ maxWidth: '420px' }}>

          <div style={{ marginBottom: '28px' }}>
            <h1 className="font-bold" style={{ fontSize:'1.5rem', color:'hsl(24,20%,11%)', lineHeight:1.1, letterSpacing:'-0.02em' }}>
              Create your account
            </h1>
            <p style={{ fontSize:'0.875rem', color:'hsl(24,10%,44%)', marginTop:'8px' }}>
              Already have an account?{' '}
              <Link href="/login" style={{ color: brand, fontWeight: 600, textDecoration: 'none' }}>Sign in</Link>
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

            {/* Section: You */}
            <p style={{ fontSize:'0.62rem', fontWeight:700, color:'hsl(24,8%,55%)', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:'-4px' }}>Your details</p>

            {[
              { label: 'Full name',       value: fullName,   set: setFullName,   type: 'text',     placeholder: 'Sarah Malik' },
              { label: 'Email address',   value: email,      set: setEmail,      type: 'email',    placeholder: 'you@youragency.com' },
              { label: 'Password',        value: password,   set: setPassword,   type: 'password', placeholder: '8+ characters' },
            ].map(f => (
              <div key={f.label} style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
                <label style={{ fontSize:'0.73rem', fontWeight:600, color:'hsl(24,10%,44%)' }}>{f.label}</label>
                <input
                  type={f.type}
                  value={f.value}
                  onChange={e => f.set(e.target.value)}
                  placeholder={f.placeholder}
                  className="w-full outline-none font-medium"
                  style={{ padding:'13px 15px', borderRadius:'12px', background:'hsl(40,18%,94%)', border:'1.5px solid hsl(38,14%,88%)', fontSize:'0.875rem', color:'hsl(24,20%,11%)', transition:'border-color 0.15s' }}
                  onFocus={e => { e.target.style.borderColor = brand }}
                  onBlur={e => { e.target.style.borderColor = 'hsl(38,14%,88%)' }}
                  onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }}
                />
              </div>
            ))}

            {/* Section: Agency */}
            <p style={{ fontSize:'0.62rem', fontWeight:700, color:'hsl(24,8%,55%)', textTransform:'uppercase', letterSpacing:'0.07em', marginTop:'6px', marginBottom:'-4px' }}>Your agency</p>

            <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
              <label style={{ fontSize:'0.73rem', fontWeight:600, color:'hsl(24,10%,44%)' }}>Agency name</label>
              <input
                type="text"
                value={agencyName}
                onChange={e => handleAgencyNameChange(e.target.value)}
                placeholder="FreshMint Creative"
                className="w-full outline-none font-medium"
                style={{ padding:'13px 15px', borderRadius:'12px', background:'hsl(40,18%,94%)', border:'1.5px solid hsl(38,14%,88%)', fontSize:'0.875rem', color:'hsl(24,20%,11%)', transition:'border-color 0.15s' }}
                onFocus={e => { e.target.style.borderColor = brand }}
                onBlur={e => { e.target.style.borderColor = 'hsl(38,14%,88%)' }}
              />
            </div>

            <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
              <label style={{ fontSize:'0.73rem', fontWeight:600, color:'hsl(24,10%,44%)' }}>Workspace URL</label>
              <div style={{ position:'relative' }}>
                <span style={{ position:'absolute', left:'15px', top:'50%', transform:'translateY(-50%)', fontSize:'0.8rem', color:'hsl(24,8%,55%)', fontWeight:500, pointerEvents:'none' }}>
                  agencyos.app/
                </span>
                <input
                  type="text"
                  value={slug}
                  onChange={e => handleSlugChange(e.target.value)}
                  placeholder="freshmint"
                  className="w-full outline-none font-medium"
                  style={{ padding:'13px 15px 13px 106px', borderRadius:'12px', background:'hsl(40,18%,94%)', border:'1.5px solid hsl(38,14%,88%)', fontSize:'0.875rem', color:'hsl(24,20%,11%)', transition:'border-color 0.15s' }}
                  onFocus={e => { e.target.style.borderColor = brand }}
                  onBlur={e => { e.target.style.borderColor = 'hsl(38,14%,88%)' }}
                />
              </div>
            </div>

            {error && (
              <p style={{ fontSize:'0.78rem', color:'hsl(4,72%,50%)', fontWeight:500 }}>{error}</p>
            )}

            <button
              onClick={handleSubmit}
              disabled={submitting || !canSubmit}
              className="w-full font-bold"
              style={{
                marginTop:'4px', padding:'16px 24px', borderRadius:'9999px',
                background: !canSubmit ? 'hsl(38,14%,82%)' : brand,
                color: 'hsl(42,30%,99%)', fontSize:'0.9rem', letterSpacing:'0.02em',
                boxShadow: !canSubmit ? 'none' : `0 6px 24px ${brand}45`,
                transition:'background 0.2s, box-shadow 0.2s, transform 0.1s, opacity 0.1s',
                opacity: submitting ? 0.75 : 1,
                cursor: !canSubmit ? 'not-allowed' : 'pointer',
              }}
              onMouseEnter={e => { if (canSubmit && !submitting) (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)' }}
            >
              {submitting ? 'Creating workspace…' : 'Create workspace'}
            </button>
          </div>

          <p className="text-center" style={{ marginTop:'20px', fontSize:'0.7rem', color:'hsl(24,8%,58%)', lineHeight:1.6 }}>
            By signing up you agree to our Terms of Service<br />and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  )
}
