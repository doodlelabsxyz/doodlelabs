'use client'

import { useState, useEffect, useRef } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/supabase/useUser'
import type { ContentStatus } from '@/lib/types'
import { getInitials, getAvatarColor } from '@/lib/utils'

gsap.registerPlugin(useGSAP)

type ClientRow = { id: string; name: string; initials: string; brand_color: string; industry: string }
type ContentRow = {
  id: string; title: string; type: string; status: string; caption: string | null
  scheduled_date: string; platforms: string[]; assigned_to: string[]; client_id: string
}
type UserRow = { id: string; name: string }

const TYPE_CFG = {
  graphic:  { label: 'Graphic',  color: 'hsl(14,72%,62%)',  bg: 'hsl(14,72%,95%)' },
  video:    { label: 'Video',    color: 'hsl(40,95%,52%)',  bg: 'hsl(40,95%,93%)' },
  reel:     { label: 'Reel',     color: 'hsl(161,58%,44%)', bg: 'hsl(161,58%,92%)' },
  story:    { label: 'Story',    color: 'hsl(268,60%,68%)', bg: 'hsl(268,60%,93%)' },
}

const STATUS_CFG: Record<ContentStatus, { label: string; color: string; bg: string }> = {
  planned:            { label: 'Planned',              color: 'hsl(200,40%,52%)', bg: 'hsl(200,40%,93%)' },
  'brief-ready':      { label: 'In Progress',          color: 'hsl(200,70%,48%)', bg: 'hsl(200,70%,93%)' },
  'in-design':        { label: 'In Progress',          color: 'hsl(200,70%,48%)', bg: 'hsl(200,70%,93%)' },
  'in-editing':       { label: 'In Progress',          color: 'hsl(200,70%,48%)', bg: 'hsl(200,70%,93%)' },
  'ready-for-review': { label: 'Ready for Review',     color: 'hsl(40,92%,45%)',  bg: 'hsl(40,92%,93%)' },
  'client-review':    { label: 'Awaiting Your Review', color: 'hsl(25,82%,52%)',  bg: 'hsl(25,82%,93%)' },
  approved:           { label: 'Approved',             color: 'hsl(154,50%,38%)', bg: 'hsl(154,50%,90%)' },
  scheduled:          { label: 'Scheduled',            color: 'hsl(154,50%,38%)', bg: 'hsl(154,50%,90%)' },
  posted:             { label: 'Posted',               color: 'hsl(154,55%,32%)', bg: 'hsl(154,55%,88%)' },
  overdue:            { label: 'Overdue',              color: 'hsl(4,72%,50%)',   bg: 'hsl(4,72%,93%)' },
}

const PLATFORM_ICONS: Record<string, string> = {
  instagram: 'IG', tiktok: 'TT', facebook: 'FB', linkedin: 'LI',
}

function formatDate(s: string) {
  const d = new Date(s + 'T00:00:00')
  const today = new Date(); today.setHours(0,0,0,0)
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  if (diff === -1) return 'Yesterday'
  if (diff > 0 && diff < 7) return `In ${diff} days`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function ClientPortalPage() {
  const router = useRouter()
  const supabase = createClient()
  const { user } = useUser()
  const containerRef = useRef<HTMLDivElement>(null)

  const [mounted,     setMounted]     = useState(false)
  const [clients,     setClients]     = useState<ClientRow[]>([])
  const [clientId,    setClientId]    = useState('')
  const [content,     setContent]     = useState<ContentRow[]>([])
  const [users,       setUsers]       = useState<UserRow[]>([])
  const [filter,      setFilter]      = useState<'all' | 'pending' | 'approved' | 'posted'>('all')

  useEffect(() => {
    setMounted(true)
    if (!user) return

    async function init() {
      // Determine client identity
      if (user!.role === 'client') {
        const { data: cu } = await supabase
          .from('client_users').select('client_id').eq('user_id', user!.id).single()
        if (cu?.client_id) {
          setClientId(cu.client_id)
          const { data: c } = await supabase
            .from('clients').select('id, name, initials, brand_color, industry').eq('id', cu.client_id)
          if (c) setClients(c)
        }
      } else {
        // Admin/staff: load all clients for switcher
        const { data: c } = await supabase
          .from('clients').select('id, name, initials, brand_color, industry').order('name')
        if (c) {
          setClients(c)
          const stored = sessionStorage.getItem('clientId')
          setClientId(stored && c.find(x => x.id === stored) ? stored : (c[0]?.id ?? ''))
        }
      }
    }
    init()
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  // Load content + users when clientId changes
  useEffect(() => {
    if (!clientId) return
    Promise.all([
      supabase.from('content_pieces')
        .select('id, title, type, status, caption, scheduled_date, platforms, assigned_to, client_id')
        .eq('client_id', clientId)
        .order('scheduled_date'),
      supabase.from('users')
        .select('id, name')
        .neq('role', 'client'),
    ]).then(([contentRes, usersRes]) => {
      if (contentRes.data) setContent(contentRes.data)
      if (usersRes.data) setUsers(usersRes.data)
    })
  }, [clientId]) // eslint-disable-line react-hooks/exhaustive-deps

  useGSAP(() => {
    if (!mounted || !containerRef.current) return
    gsap.fromTo('.portal-card',
      { y: 18, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.35, stagger: 0.07, ease: 'back.out(1.2)', clearProps: 'all' }
    )
  }, { dependencies: [mounted, filter, clientId], scope: containerRef })

  if (!mounted) return null

  const client = clients.find(c => c.id === clientId)

  const pendingApproval = content.filter(c => c.status === 'client-review' || c.status === 'ready-for-review')
  const approved  = content.filter(c => c.status === 'approved' || c.status === 'scheduled')
  const posted    = content.filter(c => c.status === 'posted')

  const filtered =
    filter === 'pending'  ? pendingApproval :
    filter === 'approved' ? approved :
    filter === 'posted'   ? posted :
    content

  const userMap = new Map(users.map(u => [u.id, u]))

  return (
    <main style={{ flex: 1, minWidth: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', background: 'hsl(42,30%,97%)' }}>

      {/* ── Client hero ──────────────────────────────────────────────────── */}
      <div style={{ background: '#0F1A14', padding: '20px 20px 16px', flexShrink: 0 }}>
        {/* Client switcher (admin preview only) */}
        {user?.role !== 'client' && clients.length > 1 && (
          <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', overflowX: 'auto', paddingBottom: '2px' }}>
            {clients.map(c => (
              <button key={c.id} onClick={() => { setClientId(c.id); sessionStorage.setItem('clientId', c.id) }} style={{
                padding: '4px 12px', borderRadius: '99px', border: 'none', cursor: 'pointer',
                background: clientId === c.id ? c.brand_color : 'rgba(255,255,255,0.06)',
                color: clientId === c.id ? '#fff' : 'hsl(140,7%,52%)',
                fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap', transition: 'background 0.15s',
              }}>
                {c.name}
              </button>
            ))}
          </div>
        )}

        {/* Client info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '18px' }}>
          <div style={{
            width: 52, height: 52, borderRadius: '14px',
            background: client?.brand_color ?? 'hsl(25,82%,60%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, fontSize: '16px', color: '#fff', flexShrink: 0,
          }}>
            {client?.initials ?? '?'}
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '0.6rem', color: 'hsl(140,7%,48%)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '2px' }}>Client Portal</p>
            <h1 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'hsl(42,22%,88%)', lineHeight: 1 }}>{client?.name ?? '—'}</h1>
            <p style={{ fontSize: '0.68rem', color: 'hsl(140,7%,48%)', marginTop: '2px' }}>{client?.industry ?? ''}</p>
          </div>
          {pendingApproval.length > 0 && (
            <div style={{
              background: 'hsl(25,82%,60%)', color: '#fff',
              borderRadius: '10px', padding: '6px 12px', textAlign: 'center', flexShrink: 0,
            }}>
              <p style={{ fontSize: '1.2rem', fontWeight: 800, lineHeight: 1 }}>{pendingApproval.length}</p>
              <p style={{ fontSize: '0.58rem', marginTop: '1px' }}>awaiting you</p>
            </div>
          )}
        </div>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '8px', marginBottom: '16px' }}>
          {[
            { n: content.length,          label: 'This Month',  color: 'hsl(200,82%,65%)' },
            { n: pendingApproval.length,  label: 'Needs Review', color: 'hsl(25,82%,60%)' },
            { n: approved.length,         label: 'Approved',    color: 'hsl(154,55%,52%)' },
            { n: posted.length,           label: 'Posted',      color: 'hsl(161,58%,50%)' },
          ].map(s => (
            <div key={s.label} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '8px', textAlign: 'center' }}>
              <p style={{ fontSize: '1.1rem', fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.n}</p>
              <p style={{ fontSize: '0.56rem', color: 'hsl(140,7%,44%)', marginTop: '2px' }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filter pills */}
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px' }}>
          {([
            { key: 'all',      label: 'All Content' },
            { key: 'pending',  label: `Review (${pendingApproval.length})` },
            { key: 'approved', label: 'Approved' },
            { key: 'posted',   label: 'Posted' },
          ] as const).map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)} style={{
              padding: '4px 12px', borderRadius: '99px', border: 'none', cursor: 'pointer',
              background: filter === f.key ? (client?.brand_color ?? 'hsl(25,82%,60%)') : 'rgba(255,255,255,0.06)',
              color: filter === f.key ? '#fff' : 'hsl(140,7%,52%)',
              fontSize: '0.72rem', fontWeight: 600, whiteSpace: 'nowrap', transition: 'background 0.15s',
            }}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content list ─────────────────────────────────────────────────── */}
      <div ref={containerRef} style={{ padding: '16px', flex: 1 }}>

        {/* Attention banner */}
        {filter === 'all' && pendingApproval.length > 0 && (
          <div style={{
            background: 'hsl(25,82%,97%)', border: '1px solid hsl(25,82%,80%)',
            borderRadius: '14px', padding: '12px 14px', marginBottom: '14px',
            display: 'flex', alignItems: 'center', gap: '10px',
          }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'hsl(25,82%,55%)', flexShrink: 0 }} />
            <p style={{ fontSize: '0.78rem', color: 'hsl(25,45%,30%)', fontWeight: 600, flex: 1 }}>
              {pendingApproval.length} piece{pendingApproval.length > 1 ? 's' : ''} waiting for your approval
            </p>
            <button onClick={() => setFilter('pending')} style={{
              padding: '4px 10px', borderRadius: '99px', border: 'none', cursor: 'pointer',
              background: 'hsl(25,82%,55%)', color: '#fff', fontSize: '0.68rem', fontWeight: 700,
            }}>
              Review
            </button>
          </div>
        )}

        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 24px', color: 'hsl(24,10%,54%)' }}>
            <div style={{ fontSize: '2.4rem', marginBottom: '8px' }}>📭</div>
            <p style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '4px' }}>Nothing here yet</p>
            <p style={{ fontSize: '0.75rem' }}>Content will appear once your agency team creates it.</p>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filtered.map(cp => {
            const tc = TYPE_CFG[cp.type as keyof typeof TYPE_CFG] ?? TYPE_CFG.graphic
            const sc = STATUS_CFG[cp.status as ContentStatus] ?? STATUS_CFG.planned
            const needsAction = cp.status === 'client-review' || cp.status === 'ready-for-review'
            const assignees = (cp.assigned_to ?? []).map(id => userMap.get(id)).filter(Boolean) as UserRow[]

            return (
              <div
                key={cp.id}
                className="portal-card"
                onClick={() => needsAction && router.push(`/client/approval/${cp.id}`)}
                style={{
                  background: '#fff',
                  borderRadius: '16px',
                  border: needsAction ? `2px solid hsl(25,82%,70%)` : '1px solid hsl(38,14%,90%)',
                  overflow: 'hidden',
                  cursor: needsAction ? 'pointer' : 'default',
                  boxShadow: needsAction ? '0 4px 20px rgba(209,101,39,0.08)' : 'none',
                  transition: 'transform 0.15s cubic-bezier(0.34,1.56,0.64,1)',
                }}
                onMouseEnter={e => needsAction && ((e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)')}
                onMouseLeave={e => ((e.currentTarget as HTMLDivElement).style.transform = '')}
              >
                <div style={{ height: 4, background: tc.color }} />

                <div style={{ padding: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '10px' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', flexWrap: 'wrap' }}>
                        <span style={{ padding: '2px 8px', borderRadius: '99px', background: tc.bg, color: tc.color, fontSize: '0.6rem', fontWeight: 700 }}>
                          {tc.label}
                        </span>
                        <span style={{ padding: '2px 8px', borderRadius: '99px', background: sc.bg, color: sc.color, fontSize: '0.6rem', fontWeight: 700 }}>
                          {sc.label}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.9rem', fontWeight: 800, color: 'hsl(24,20%,11%)', lineHeight: 1.3 }}>{cp.title}</p>
                    </div>
                    {needsAction && (
                      <div style={{
                        background: 'hsl(25,82%,55%)', color: '#fff',
                        borderRadius: '10px', padding: '4px 10px', flexShrink: 0,
                        fontSize: '0.65rem', fontWeight: 700,
                      }}>
                        Review →
                      </div>
                    )}
                  </div>

                  {cp.caption && (
                    <p style={{
                      fontSize: '0.72rem', color: 'hsl(24,10%,44%)', lineHeight: 1.5,
                      overflow: 'hidden', display: '-webkit-box',
                      WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                      background: 'hsl(42,30%,97%)', borderRadius: '8px', padding: '8px',
                      marginBottom: '10px',
                    }}>
                      {cp.caption}
                    </p>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.68rem', color: 'hsl(24,10%,52%)', fontWeight: 600 }}>
                      📅 {formatDate(cp.scheduled_date)}
                    </span>
                    <div style={{ display: 'flex', gap: '4px', marginLeft: 'auto' }}>
                      {(cp.platforms ?? []).map(p => (
                        <span key={p} style={{
                          padding: '2px 6px', borderRadius: '4px',
                          background: 'hsl(42,18%,93%)', color: 'hsl(24,10%,44%)',
                          fontSize: '0.58rem', fontWeight: 700,
                        }}>
                          {PLATFORM_ICONS[p] ?? p}
                        </span>
                      ))}
                    </div>
                    {assignees.length > 0 && (
                      <div style={{ display: 'flex', marginLeft: '4px' }}>
                        {assignees.map((u, i) => (
                          <div key={u.id} title={u.name} style={{
                            width: 20, height: 20, borderRadius: '50%',
                            background: getAvatarColor(u.id),
                            border: '2px solid #fff',
                            marginLeft: i > 0 ? '-6px' : 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.48rem', fontWeight: 800, color: '#fff',
                          }}>
                            {getInitials(u.name)}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </main>
  )
}
