'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { createClient } from '@/lib/supabase/client'

gsap.registerPlugin(useGSAP)

// ─── Floating decoration ───────────────────────────────────────────────────────

function FloatingDots() {
  const c = 'hsl(25,82%,60%)'
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      <div style={{ position:'absolute', top:'-60px', right:'-60px', width:'280px', height:'280px', borderRadius:'50%', background:`${c}20` }} />
      <div style={{ position:'absolute', bottom:'-50px', left:'-50px', width:'200px', height:'200px', borderRadius:'50%', background:`${c}14` }} />
      <div style={{ position:'absolute', top:'40%', left:'-20px', width:'90px', height:'90px', borderRadius:'50%', background:`${c}10` }} />
      <div style={{ position:'absolute', top:'16%', right:'20%', width:'10px', height:'10px', borderRadius:'50%', background:`${c}70` }} />
      <div style={{ position:'absolute', top:'30%', left:'24%', width:'7px', height:'7px', borderRadius:'50%', background:`${c}55` }} />
      <div style={{ position:'absolute', bottom:'28%', right:'28%', width:'12px', height:'12px', borderRadius:'50%', background:`${c}50` }} />
      <div style={{ position:'absolute', bottom:'20%', left:'34%', width:'8px', height:'8px', borderRadius:'50%', background:`${c}60` }} />
      <svg style={{ position:'absolute', top:'22%', right:'14%', opacity:0.22 }} width="16" height="16" viewBox="0 0 16 16">
        <path d="M8 2v12M2 8h12" stroke={c} strokeWidth="2" strokeLinecap="round"/>
      </svg>
      <svg style={{ position:'absolute', bottom:'35%', left:'15%', opacity:0.16 }} width="12" height="12" viewBox="0 0 16 16">
        <path d="M8 2v12M2 8h12" stroke={c} strokeWidth="2" strokeLinecap="round"/>
      </svg>
    </div>
  )
}

// ─── Login ────────────────────────────────────────────────────────────────────

export default function LoginPage() {
  const router = useRouter()
  const [email,      setEmail]      = useState('')
  const [password,   setPassword]   = useState('')
  const [authError,  setAuthError]  = useState('')
  const [isEntering, setIsEntering] = useState(false)
  const leftRef = useRef<HTMLDivElement>(null)
  const formRef = useRef<HTMLDivElement>(null)

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

  const brand = 'hsl(25,82%,60%)'

  return (
    <div className="flex min-h-dvh flex-col md:flex-row">

      {/* ── LEFT: dark brand panel ──────────────────────────────────────────── */}
      <div
        ref={leftRef}
        className="relative flex flex-col justify-between w-full md:flex-1 pt-10 pb-10 px-8 md:pt-14 md:pb-14 md:px-12"
        style={{ background: '#0F1A14', minHeight: '360px' }}
      >
        <FloatingDots />

        {/* Logo */}
        <div className="relative z-10 flex items-center" style={{ gap: '10px' }}>
          <svg width="28" height="28" viewBox="0 0 30 30" fill="none">
            <rect width="30" height="30" rx="9" fill={brand}/>
            <path d="M9 22L15 8l6 14M11.5 17.5h7" stroke="hsl(42,30%,99%)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="font-bold" style={{ fontSize: '1rem', color: 'hsl(42,22%,84%)', letterSpacing: '-0.01em' }}>
            Agency<span style={{ color: brand }}>OS</span>
          </span>
        </div>

        {/* Center illustration */}
        <div className="relative z-10 flex flex-col" style={{ gap: '24px' }}>

          {/* Illustration card */}
          <div style={{
            width: '100%', aspectRatio: '4/3', maxHeight: '260px',
            borderRadius: '20px',
            background: `linear-gradient(145deg, ${brand}18 0%, ${brand}08 100%)`,
            border: `1.5px dashed ${brand}40`,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: '14px', position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ position:'absolute', inset:0, background:`radial-gradient(ellipse at 50% 30%, ${brand}14 0%, transparent 70%)` }} />
            {/* Character SVG */}
            <svg width="72" height="88" viewBox="0 0 72 88" fill="none" style={{ position:'relative', zIndex:1, opacity:0.4 }}>
              <circle cx="36" cy="22" r="16" stroke="hsl(42,22%,84%)" strokeWidth="1.5" fill="rgba(255,255,255,0.04)"/>
              <path d="M8 80c0-15 12.5-24 28-24s28 9 28 24" stroke="hsl(42,22%,84%)" strokeWidth="1.5" strokeLinecap="round" fill="rgba(255,255,255,0.04)"/>
              <path d="M16 58 Q8 48 6 38" stroke="hsl(42,22%,84%)" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M56 58 Q64 48 66 38" stroke="hsl(42,22%,84%)" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <div style={{ position:'relative', zIndex:1, textAlign:'center' }}>
              <p style={{ fontSize:'0.72rem', color:'rgba(213,207,191,0.4)', fontWeight:600 }}>Character Illustration</p>
              <p style={{ fontSize:'0.65rem', color:'rgba(213,207,191,0.25)', marginTop:'3px' }}>Drop asset here</p>
            </div>
          </div>

          {/* Tagline */}
          <div>
            <p style={{ fontSize:'1.4rem', fontWeight:800, color:'hsl(42,22%,84%)', lineHeight:1.1, letterSpacing:'-0.02em' }}>
              Your agency,<br/>fully in control.
            </p>
            <p style={{ fontSize:'0.875rem', color:'hsl(140,7%,48%)', marginTop:'8px', lineHeight:1.6 }}>
              Plan, create, review and publish — all in one place.
            </p>
          </div>
        </div>

        {/* Bottom spacer for balance */}
        <div className="relative z-10" style={{ height: '24px' }} />
      </div>

      {/* ── RIGHT: form panel ────────────────────────────────────────────────── */}
      <div
        className="flex flex-col justify-center items-center w-full md:flex-1 px-8 py-12 md:px-14 lg:px-20"
        style={{ background: 'hsl(42,30%,97%)' }}
      >
        <div ref={formRef} className="w-full" style={{ maxWidth: '400px' }}>

          {/* Heading */}
          <div style={{ marginBottom: '32px' }}>
            <h1 className="font-bold" style={{ fontSize:'1.5rem', color:'hsl(24,20%,11%)', lineHeight:1.1, letterSpacing:'-0.02em' }}>
              Welcome back
            </h1>
            <p style={{ fontSize:'0.875rem', color:'hsl(24,10%,44%)', marginTop:'8px', lineHeight:1.6 }}>
              Sign in to your AgencyOS workspace.
            </p>
          </div>

          {/* Fields */}
          <div className="flex flex-col" style={{ gap: '16px' }}>
            <div className="flex flex-col" style={{ gap: '7px' }}>
              <label className="font-semibold" style={{ fontSize:'0.75rem', color:'hsl(24,10%,44%)' }}>
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@agencyos.app"
                autoComplete="email"
                className="w-full outline-none font-medium"
                style={{
                  padding:'14px 16px', borderRadius:'12px',
                  background:'hsl(40,18%,94%)', border:'1.5px solid hsl(38,14%,88%)',
                  fontSize:'0.9rem', color:'hsl(24,20%,11%)',
                  transition:'border-color 0.15s ease',
                }}
                onFocus={e => { e.target.style.borderColor = brand }}
                onBlur={e => { e.target.style.borderColor = 'hsl(38,14%,88%)' }}
              />
            </div>

            <div className="flex flex-col" style={{ gap: '7px' }}>
              <label className="font-semibold" style={{ fontSize:'0.75rem', color:'hsl(24,10%,44%)' }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                className="w-full outline-none font-medium"
                style={{
                  padding:'14px 16px', borderRadius:'12px',
                  background:'hsl(40,18%,94%)', border:'1.5px solid hsl(38,14%,88%)',
                  fontSize:'0.9rem', color:'hsl(24,20%,11%)',
                  transition:'border-color 0.15s ease',
                }}
                onFocus={e => { e.target.style.borderColor = brand }}
                onBlur={e => { e.target.style.borderColor = 'hsl(38,14%,88%)' }}
                onKeyDown={e => { if (e.key === 'Enter') handleEnter() }}
              />
            </div>

            {authError && (
              <p style={{ fontSize:'0.78rem', color:'hsl(4,72%,50%)', fontWeight:500 }}>
                {authError}
              </p>
            )}

            <button
              onClick={handleEnter}
              disabled={isEntering || !email || !password}
              className="w-full font-bold"
              style={{
                marginTop:'4px', padding:'16px 24px',
                borderRadius:'9999px',
                background: (!email || !password) ? 'hsl(38,14%,82%)' : brand,
                color: 'hsl(42,30%,99%)',
                fontSize:'0.9rem', letterSpacing:'0.02em',
                boxShadow: (!email || !password) ? 'none' : `0 6px 24px ${brand}45`,
                transition:'background 0.2s ease, box-shadow 0.2s ease, transform 0.1s ease, opacity 0.1s ease',
                opacity: isEntering ? 0.75 : 1,
                cursor: (!email || !password) ? 'not-allowed' : 'pointer',
              }}
              onMouseEnter={e => { if (email && password && !isEntering) (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)' }}
              onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0) scale(0.98)' }}
              onMouseUp={e => { if (email && password) (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px) scale(1)' }}
            >
              {isEntering ? 'Signing in...' : 'Sign in'}
            </button>
          </div>

          <p className="text-center" style={{ marginTop:'24px', fontSize:'0.75rem', color:'hsl(24,8%,58%)' }}>
            Use your AgencyOS credentials to sign in.
          </p>
        </div>
      </div>
    </div>
  )
}
