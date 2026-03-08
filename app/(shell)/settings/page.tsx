'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getInitials, getAvatarColor } from '@/lib/utils'

type Profile = { id: string; name: string; email: string; role: string; phone: string | null; joined_at: string | null }

export default function SettingsPage() {
  const router = useRouter()
  const supabase = createClient()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loggingOut, setLoggingOut] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data } = await supabase
        .from('users')
        .select('id, name, role, email, phone, joined_at')
        .eq('id', user.id)
        .single()
      if (data) setProfile({ ...data, email: user.email ?? '' })
    }
    load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleLogout() {
    setLoggingOut(true)
    await supabase.auth.signOut()
  }

  return (
    <main style={{ flex: 1, minWidth: 0, overflowY: 'auto', background: 'hsl(42,30%,97%)' }}>

      {/* Header */}
      <div style={{ background: '#0F1A14', padding: '18px 20px 16px', flexShrink: 0 }}>
        <p style={{ fontSize: '0.656rem', color: 'hsl(140,7%,48%)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '1px' }}>Account</p>
        <h1 style={{ fontSize: '1.167rem', fontWeight: 800, color: 'hsl(42,22%,84%)', lineHeight: 1 }}>Settings</h1>
      </div>

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '480px' }}>

        {/* Profile card */}
        {profile && (
          <div style={{ background: '#fff', borderRadius: '18px', border: '1px solid hsl(38,14%,90%)', overflow: 'hidden' }}>
            <div style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', borderBottom: '1px solid hsl(38,14%,92%)' }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%', background: getAvatarColor(profile.id), flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1rem', fontWeight: 800, color: '#fff',
              }}>
                {getInitials(profile.name)}
              </div>
              <div>
                <p style={{ fontSize: '1.05rem', fontWeight: 800, color: 'hsl(24,20%,11%)', lineHeight: 1.2 }}>{profile.name}</p>
                <p style={{ fontSize: '0.72rem', color: 'hsl(24,10%,52%)', marginTop: '2px', textTransform: 'capitalize' }}>{profile.role}</p>
              </div>
            </div>
            <div style={{ padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { label: 'Email', value: profile.email },
                { label: 'Phone', value: profile.phone ?? '—' },
                { label: 'Joined', value: profile.joined_at ? new Date(profile.joined_at + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '—' },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.72rem', color: 'hsl(24,10%,52%)', fontWeight: 600 }}>{row.label}</span>
                  <span style={{ fontSize: '0.78rem', color: 'hsl(24,20%,18%)', fontWeight: 500 }}>{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{ background: '#fff', borderRadius: '18px', border: '1px solid hsl(38,14%,90%)', overflow: 'hidden' }}>
          <p style={{ padding: '12px 16px 8px', fontSize: '0.6rem', fontWeight: 700, color: 'hsl(24,8%,60%)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Account</p>

          <button
            onClick={handleLogout}
            disabled={loggingOut}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: '12px',
              padding: '14px 16px', background: 'transparent', border: 'none', cursor: 'pointer',
              borderTop: '1px solid hsl(38,14%,92%)',
              transition: 'background 0.12s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'hsl(4,72%,97%)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <div style={{
              width: 34, height: 34, borderRadius: '10px', background: 'hsl(4,72%,95%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" stroke="hsl(4,72%,52%)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div style={{ flex: 1, textAlign: 'left' }}>
              <p style={{ fontSize: '0.82rem', fontWeight: 700, color: 'hsl(4,72%,40%)' }}>
                {loggingOut ? 'Signing out…' : 'Log Out'}
              </p>
              <p style={{ fontSize: '0.68rem', color: 'hsl(24,10%,52%)' }}>Sign out of your account</p>
            </div>
          </button>
        </div>

        {/* App info */}
        <div style={{ textAlign: 'center', padding: '8px', color: 'hsl(24,8%,64%)', fontSize: '0.65rem' }}>
          AgencyOS · v1.0
        </div>
      </div>
    </main>
  )
}
