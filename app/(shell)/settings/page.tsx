'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { getInitials, getAvatarColor } from '@/lib/utils'
import { useOrg } from '@/lib/supabase/OrgContext'
import type { Role } from '@/lib/types'

type Profile  = { id: string; name: string; email: string; role: string; phone: string | null; joined_at: string | null }
type Member   = { id: string; name: string; email: string; role: string; active: boolean }
type Tab      = 'profile' | 'organisation' | 'team' | 'billing'

// ─── Invite modal ─────────────────────────────────────────────────────────────

function InviteModal({ onClose }: { onClose: () => void }) {
  const [email,   setEmail]   = useState('')
  const [role,    setRole]    = useState<Role>('writer')
  const [sending, setSending] = useState(false)
  const [sent,    setSent]    = useState(false)
  const [error,   setError]   = useState('')
  const brand = 'hsl(25,82%,60%)'

  async function handleSend() {
    if (!email || sending) return
    setSending(true)
    setError('')
    const res = await fetch('/api/invite/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, role }),
    })
    const json = await res.json()
    if (!res.ok) { setError(json.error ?? 'Failed to send invite.'); setSending(false); return }
    setSent(true)
    setSending(false)
  }

  return (
    <div style={{ position:'fixed', inset:0, zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:'16px' }}>
      <div onClick={onClose} style={{ position:'absolute', inset:0, background:'rgba(15,26,20,0.6)', backdropFilter:'blur(4px)' }} />
      <div style={{ position:'relative', background:'#fff', borderRadius:'20px', padding:'28px', width:'100%', maxWidth:'380px', boxShadow:'0 8px 40px rgba(0,0,0,0.18)' }}>
        <h3 style={{ fontSize:'1rem', fontWeight:800, color:'hsl(24,20%,11%)', marginBottom:'20px' }}>Invite team member</h3>

        {!sent ? (
          <div style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
            <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
              <label style={{ fontSize:'0.72rem', fontWeight:600, color:'hsl(24,10%,44%)' }}>Email</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="teammate@agency.com"
                className="w-full outline-none"
                style={{ padding:'11px 13px', borderRadius:'10px', background:'hsl(40,18%,95%)', border:'1.5px solid hsl(38,14%,88%)', fontSize:'0.85rem', color:'hsl(24,20%,11%)', fontWeight:500 }}
                onFocus={e => { e.target.style.borderColor = brand }}
                onBlur={e => { e.target.style.borderColor = 'hsl(38,14%,88%)' }}
              />
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
              <label style={{ fontSize:'0.72rem', fontWeight:600, color:'hsl(24,10%,44%)' }}>Role</label>
              <select
                value={role} onChange={e => setRole(e.target.value as Role)}
                className="w-full outline-none"
                style={{ padding:'11px 13px', borderRadius:'10px', background:'hsl(40,18%,95%)', border:'1.5px solid hsl(38,14%,88%)', fontSize:'0.85rem', color:'hsl(24,20%,11%)', fontWeight:500, cursor:'pointer' }}
              >
                {(['writer','designer','videographer','editor','poster','admin','client'] as Role[]).map(r => (
                  <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                ))}
              </select>
            </div>
            {error && <p style={{ fontSize:'0.73rem', color:'hsl(4,72%,50%)', fontWeight:500 }}>{error}</p>}
            <div style={{ display:'flex', gap:'8px', marginTop:'4px' }}>
              <button onClick={onClose} style={{ flex:1, padding:'11px', borderRadius:'9999px', background:'transparent', border:'1.5px solid hsl(38,14%,88%)', color:'hsl(24,8%,55%)', fontWeight:600, fontSize:'0.8rem', cursor:'pointer' }}>Cancel</button>
              <button onClick={handleSend} disabled={!email || sending}
                style={{ flex:2, padding:'11px', borderRadius:'9999px', background:email ? brand : 'hsl(38,14%,85%)', color:'white', fontWeight:700, fontSize:'0.82rem', border:'none', cursor:email ? 'pointer' : 'not-allowed', boxShadow: email ? `0 5px 18px ${brand}40` : 'none' }}>
                {sending ? 'Sending…' : 'Send invite'}
              </button>
            </div>
          </div>
        ) : (
          <div style={{ textAlign:'center', padding:'12px 0' }}>
            <div style={{ fontSize:'2rem', marginBottom:'10px' }}>✅</div>
            <p style={{ fontSize:'0.85rem', fontWeight:700, color:'hsl(24,20%,11%)' }}>Invite sent to {email}</p>
            <button onClick={onClose} style={{ marginTop:'18px', padding:'10px 28px', borderRadius:'9999px', background:brand, color:'white', fontWeight:700, fontSize:'0.82rem', border:'none', cursor:'pointer' }}>Done</button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main settings page ────────────────────────────────────────────────────────

export default function SettingsPage() {
  const router  = useRouter()
  const supabase = createClient()
  const { org, refreshOrg } = useOrg()

  const [activeTab,  setActiveTab]  = useState<Tab>('profile')
  const [profile,    setProfile]    = useState<Profile | null>(null)
  const [members,    setMembers]    = useState<Member[]>([])
  const [loggingOut, setLoggingOut] = useState(false)
  const [showInvite, setShowInvite] = useState(false)
  const [isAdmin,    setIsAdmin]    = useState(false)

  // Org edit state
  const [orgName,    setOrgName]    = useState('')
  const [orgSlug,    setOrgSlug]    = useState('')
  const [orgSaving,  setOrgSaving]  = useState(false)
  const [orgMsg,     setOrgMsg]     = useState('')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data } = await supabase.from('users').select('id, name, role, email, phone, joined_at').eq('id', user.id).single()
      if (data) {
        setProfile({ ...data, email: user.email ?? '' })
        setIsAdmin(data.role === 'admin')
      }
    }
    load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Load members when Team tab opens
  useEffect(() => {
    if (activeTab !== 'team' || !isAdmin) return
    async function loadMembers() {
      const { data } = await supabase.from('users').select('id, name, email, role, active').order('name')
      if (data) setMembers(data as Member[])
    }
    loadMembers()
  }, [activeTab, isAdmin]) // eslint-disable-line react-hooks/exhaustive-deps

  // Sync org form when org loads
  useEffect(() => {
    if (org) { setOrgName(org.name); setOrgSlug(org.slug) }
  }, [org])

  async function handleLogout() {
    setLoggingOut(true)
    await supabase.auth.signOut()
  }

  async function handleSaveOrg() {
    if (!org || orgSaving) return
    setOrgSaving(true)
    setOrgMsg('')
    const { error } = await supabase.from('organizations').update({ name: orgName, slug: orgSlug }).eq('id', org.id)
    if (error) { setOrgMsg('Failed to save: ' + error.message); setOrgSaving(false); return }
    await refreshOrg()
    setOrgMsg('Saved.')
    setOrgSaving(false)
    setTimeout(() => setOrgMsg(''), 2500)
  }

  const TABS: { key: Tab; label: string; adminOnly?: boolean }[] = [
    { key:'profile',      label:'Profile' },
    { key:'organisation', label:'Organisation', adminOnly:true },
    { key:'team',         label:'Team',         adminOnly:true },
    { key:'billing',      label:'Billing',      adminOnly:true },
  ]

  const visibleTabs = TABS.filter(t => !t.adminOnly || isAdmin)

  return (
    <main className="page-main" style={{ flex:1, minWidth:0, overflowY:'auto', background:'hsl(42,30%,97%)' }}>
      {showInvite && <InviteModal onClose={() => setShowInvite(false)} />}

      {/* Header */}
      <div style={{ background:'#0F1A14', padding:'18px 20px 16px', flexShrink:0 }}>
        <p style={{ fontSize:'0.656rem', color:'hsl(140,7%,48%)', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:'1px' }}>Account</p>
        <h1 style={{ fontSize:'1.167rem', fontWeight:800, color:'hsl(42,22%,84%)', lineHeight:1 }}>Settings</h1>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:'4px', padding:'12px 16px 0', borderBottom:'1px solid hsl(38,14%,90%)', background:'#fff' }}>
        {visibleTabs.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            style={{
              padding:'8px 14px', borderRadius:'8px 8px 0 0', border:'none', background:'transparent', cursor:'pointer',
              fontSize:'0.75rem', fontWeight: activeTab === t.key ? 700 : 500,
              color:  activeTab === t.key ? 'hsl(24,20%,11%)' : 'hsl(24,8%,55%)',
              borderBottom: activeTab === t.key ? '2px solid hsl(25,82%,60%)' : '2px solid transparent',
              transition:'color 0.15s, border-color 0.15s',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ padding:'16px', display:'flex', flexDirection:'column', gap:'12px', maxWidth:'480px' }}>

        {/* ── Profile tab ─────────────────────────────────────────────────── */}
        {activeTab === 'profile' && profile && (
          <>
            <div style={{ background:'#fff', borderRadius:'18px', border:'1px solid hsl(38,14%,90%)', overflow:'hidden' }}>
              <div style={{ padding:'20px', display:'flex', alignItems:'center', gap:'16px', borderBottom:'1px solid hsl(38,14%,92%)' }}>
                <div style={{ width:56, height:56, borderRadius:'50%', background:getAvatarColor(profile.id), flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1rem', fontWeight:800, color:'#fff' }}>
                  {getInitials(profile.name)}
                </div>
                <div>
                  <p style={{ fontSize:'1.05rem', fontWeight:800, color:'hsl(24,20%,11%)', lineHeight:1.2 }}>{profile.name}</p>
                  <p style={{ fontSize:'0.72rem', color:'hsl(24,10%,52%)', marginTop:'2px', textTransform:'capitalize' }}>{profile.role}</p>
                </div>
              </div>
              <div style={{ padding:'14px 20px', display:'flex', flexDirection:'column', gap:'10px' }}>
                {[
                  { label:'Email',  value: profile.email },
                  { label:'Phone',  value: profile.phone ?? '—' },
                  { label:'Joined', value: profile.joined_at ? new Date(profile.joined_at + 'T00:00:00').toLocaleDateString('en-US', { month:'long', year:'numeric' }) : '—' },
                ].map(row => (
                  <div key={row.label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <span style={{ fontSize:'0.72rem', color:'hsl(24,10%,52%)', fontWeight:600 }}>{row.label}</span>
                    <span style={{ fontSize:'0.78rem', color:'hsl(24,20%,18%)', fontWeight:500 }}>{row.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background:'#fff', borderRadius:'18px', border:'1px solid hsl(38,14%,90%)', overflow:'hidden' }}>
              <p style={{ padding:'12px 16px 8px', fontSize:'0.6rem', fontWeight:700, color:'hsl(24,8%,60%)', textTransform:'uppercase', letterSpacing:'0.06em' }}>Account</p>
              <button
                onClick={handleLogout} disabled={loggingOut}
                style={{ width:'100%', display:'flex', alignItems:'center', gap:'12px', padding:'14px 16px', background:'transparent', border:'none', cursor:'pointer', borderTop:'1px solid hsl(38,14%,92%)', transition:'background 0.12s' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'hsl(4,72%,97%)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <div style={{ width:34, height:34, borderRadius:'10px', background:'hsl(4,72%,95%)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" stroke="hsl(4,72%,52%)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div style={{ flex:1, textAlign:'left' }}>
                  <p style={{ fontSize:'0.82rem', fontWeight:700, color:'hsl(4,72%,40%)' }}>{loggingOut ? 'Signing out…' : 'Log Out'}</p>
                  <p style={{ fontSize:'0.68rem', color:'hsl(24,10%,52%)' }}>Sign out of your account</p>
                </div>
              </button>
            </div>
          </>
        )}

        {/* ── Organisation tab ─────────────────────────────────────────────── */}
        {activeTab === 'organisation' && (
          <div style={{ background:'#fff', borderRadius:'18px', border:'1px solid hsl(38,14%,90%)', overflow:'hidden' }}>
            <p style={{ padding:'14px 20px 10px', fontSize:'0.6rem', fontWeight:700, color:'hsl(24,8%,60%)', textTransform:'uppercase', letterSpacing:'0.06em' }}>Agency details</p>
            <div style={{ padding:'0 20px 20px', display:'flex', flexDirection:'column', gap:'14px' }}>

              {/* Logo placeholder */}
              <div style={{ display:'flex', alignItems:'center', gap:'16px' }}>
                <div style={{ width:56, height:56, borderRadius:'14px', background:'hsl(38,14%,92%)', display:'flex', alignItems:'center', justifyContent:'center', border:'1.5px dashed hsl(38,14%,82%)' }}>
                  {org?.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={org.logo_url} alt="logo" style={{ width:'100%', height:'100%', objectFit:'cover', borderRadius:'12px' }} />
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <rect x="3" y="3" width="18" height="18" rx="4" stroke="hsl(24,8%,65%)" strokeWidth="1.5"/>
                      <circle cx="8.5" cy="8.5" r="1.5" fill="hsl(24,8%,65%)"/>
                      <path d="M21 15l-5-5L5 21" stroke="hsl(24,8%,65%)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
                <div>
                  <p style={{ fontSize:'0.8rem', fontWeight:700, color:'hsl(24,20%,18%)' }}>Agency logo</p>
                  <p style={{ fontSize:'0.68rem', color:'hsl(24,8%,55%)', marginTop:'2px' }}>Logo upload coming soon</p>
                </div>
              </div>

              {[
                { label:'Agency name',    value:orgName,   set:setOrgName,   type:'text',   placeholder:'Your agency name' },
                { label:'Workspace slug', value:orgSlug,   set:setOrgSlug,   type:'text',   placeholder:'your-agency' },
              ].map(f => (
                <div key={f.label} style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
                  <label style={{ fontSize:'0.72rem', fontWeight:600, color:'hsl(24,10%,44%)' }}>{f.label}</label>
                  <input
                    type={f.type} value={f.value} onChange={e => f.set(e.target.value)} placeholder={f.placeholder}
                    className="w-full outline-none"
                    style={{ padding:'11px 13px', borderRadius:'10px', background:'hsl(40,18%,95%)', border:'1.5px solid hsl(38,14%,88%)', fontSize:'0.85rem', color:'hsl(24,20%,11%)', fontWeight:500 }}
                    onFocus={e => { e.target.style.borderColor = 'hsl(25,82%,60%)' }}
                    onBlur={e => { e.target.style.borderColor = 'hsl(38,14%,88%)' }}
                  />
                </div>
              ))}

              {orgMsg && (
                <p style={{ fontSize:'0.73rem', color: orgMsg.startsWith('Failed') ? 'hsl(4,72%,50%)' : 'hsl(140,60%,40%)', fontWeight:600 }}>{orgMsg}</p>
              )}

              <button
                onClick={handleSaveOrg} disabled={orgSaving}
                style={{ padding:'12px', borderRadius:'9999px', background:'hsl(25,82%,60%)', color:'white', fontWeight:700, fontSize:'0.85rem', border:'none', cursor:orgSaving ? 'not-allowed' : 'pointer', opacity: orgSaving ? 0.75 : 1, boxShadow:'0 5px 18px hsl(25,82%,60%, 0.35)' }}
              >
                {orgSaving ? 'Saving…' : 'Save changes'}
              </button>

              {/* Plan info */}
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 14px', borderRadius:'12px', background:'hsl(42,30%,97%)', border:'1px solid hsl(38,14%,92%)' }}>
                <div>
                  <p style={{ fontSize:'0.72rem', fontWeight:600, color:'hsl(24,8%,55%)' }}>Current plan</p>
                  <p style={{ fontSize:'0.85rem', fontWeight:800, color:'hsl(24,20%,11%)', textTransform:'capitalize' }}>{org?.plan ?? '—'}</p>
                </div>
                <Link href="/settings/billing" style={{ padding:'7px 14px', borderRadius:'9999px', background:'hsl(25,82%,60%)', color:'white', fontWeight:700, fontSize:'0.7rem', textDecoration:'none' }}>
                  Manage billing
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* ── Team tab ─────────────────────────────────────────────────────── */}
        {activeTab === 'team' && (
          <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <p style={{ fontSize:'0.72rem', color:'hsl(24,8%,52%)', fontWeight:500 }}>{members.length} member{members.length !== 1 ? 's' : ''}</p>
              <button
                onClick={() => setShowInvite(true)}
                style={{ display:'flex', alignItems:'center', gap:'6px', padding:'8px 14px', borderRadius:'9999px', background:'hsl(25,82%,60%)', color:'white', fontWeight:700, fontSize:'0.72rem', border:'none', cursor:'pointer', boxShadow:'0 4px 14px hsl(25,82%,60%, 0.35)' }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="white" strokeWidth="2.5" strokeLinecap="round"/></svg>
                Invite member
              </button>
            </div>

            <div style={{ background:'#fff', borderRadius:'18px', border:'1px solid hsl(38,14%,90%)', overflow:'hidden' }}>
              {members.length === 0 ? (
                <div style={{ padding:'32px', textAlign:'center', color:'hsl(24,8%,55%)', fontSize:'0.82rem' }}>
                  No team members yet. Invite your first teammate!
                </div>
              ) : (
                members.map((m, i) => (
                  <div key={m.id} style={{ display:'flex', alignItems:'center', gap:'12px', padding:'14px 16px', borderBottom: i < members.length - 1 ? '1px solid hsl(38,14%,92%)' : 'none' }}>
                    <div style={{ width:36, height:36, borderRadius:'50%', background:getAvatarColor(m.id), flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.6rem', fontWeight:800, color:'#fff' }}>
                      {getInitials(m.name)}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ fontSize:'0.82rem', fontWeight:700, color:'hsl(24,20%,11%)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{m.name}</p>
                      <p style={{ fontSize:'0.68rem', color:'hsl(24,8%,52%)' }}>{m.email}</p>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:'8px', flexShrink:0 }}>
                      <span style={{ padding:'3px 10px', borderRadius:'9999px', background:'hsl(42,30%,94%)', color:'hsl(24,15%,35%)', fontSize:'0.62rem', fontWeight:700, textTransform:'capitalize' }}>
                        {m.role}
                      </span>
                      {!m.active && (
                        <span style={{ padding:'3px 8px', borderRadius:'9999px', background:'hsl(4,60%,95%)', color:'hsl(4,60%,45%)', fontSize:'0.58rem', fontWeight:700 }}>
                          Inactive
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ── Billing tab ──────────────────────────────────────────────────── */}
        {activeTab === 'billing' && (
          <div style={{ background:'#fff', borderRadius:'18px', border:'1px solid hsl(38,14%,90%)', padding:'24px', display:'flex', flexDirection:'column', gap:'16px', alignItems:'center', textAlign:'center' }}>
            <div style={{ width:56, height:56, borderRadius:'16px', background:'hsl(200,60%,94%)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <rect x="2" y="6" width="20" height="14" rx="3" stroke="hsl(200,72%,50%)" strokeWidth="1.8"/>
                <path d="M2 10h20M6 14h4M16 14h2" stroke="hsl(200,72%,50%)" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
            </div>
            <div>
              <p style={{ fontSize:'0.9rem', fontWeight:800, color:'hsl(24,20%,11%)' }}>Billing & Plans</p>
              <p style={{ fontSize:'0.75rem', color:'hsl(24,8%,52%)', marginTop:'4px', lineHeight:1.6 }}>
                View your current plan, compare features,<br/>and manage your subscription.
              </p>
            </div>
            <Link
              href="/settings/billing"
              style={{ padding:'12px 28px', borderRadius:'9999px', background:'hsl(25,82%,60%)', color:'white', fontWeight:700, fontSize:'0.82rem', textDecoration:'none', boxShadow:'0 5px 18px hsl(25,82%,60%, 0.35)' }}
            >
              Go to Billing
            </Link>
          </div>
        )}

        <div style={{ textAlign:'center', padding:'8px', color:'hsl(24,8%,64%)', fontSize:'0.65rem' }}>
          AgencyOS · v2.0
        </div>
      </div>
    </main>
  )
}
