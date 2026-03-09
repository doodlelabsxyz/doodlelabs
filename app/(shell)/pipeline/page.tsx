'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { createClient } from '@/lib/supabase/client'
import type { ContentType, ContentStatus } from '@/lib/types'
import { getInitials, getAvatarColor } from '@/lib/utils'

gsap.registerPlugin(useGSAP)

const TYPE_CFG: Record<ContentType, { bg: string; text: string; label: string }> = {
  graphic: { bg: 'hsl(14,72%,62%)',  text: '#fff',    label: 'Graphic' },
  video:   { bg: 'hsl(40,95%,62%)',  text: '#3a2800', label: 'Video'   },
  reel:    { bg: 'hsl(161,58%,50%)', text: '#fff',    label: 'Reel'    },
  story:   { bg: 'hsl(268,60%,68%)', text: '#fff',    label: 'Story'   },
}

type Column = { status: ContentStatus; label: string; color: string; dotColor: string }

const COLUMNS: Column[] = [
  { status: 'planned',          label: 'Planned',     color: 'hsl(220,15%,93%)',  dotColor: 'hsl(220,15%,62%)' },
  { status: 'brief-ready',      label: 'Brief Ready', color: 'hsl(200,75%,92%)',  dotColor: 'hsl(200,82%,58%)' },
  { status: 'in-design',        label: 'In Design',   color: 'hsl(14,72%,93%)',   dotColor: 'hsl(14,72%,62%)'  },
  { status: 'in-editing',       label: 'In Editing',  color: 'hsl(40,90%,92%)',   dotColor: 'hsl(40,95%,62%)'  },
  { status: 'ready-for-review', label: 'Review',      color: 'hsl(268,55%,93%)',  dotColor: 'hsl(268,60%,68%)' },
  { status: 'approved',         label: 'Approved',    color: 'hsl(154,45%,90%)',  dotColor: 'hsl(154,50%,40%)' },
  { status: 'posted',           label: 'Posted',      color: 'hsl(154,30%,88%)',  dotColor: 'hsl(154,30%,42%)' },
]

type ContentRow = {
  id: string
  title: string
  type: ContentType
  status: ContentStatus
  platforms: string[]
  scheduled_date: string
  client_id: string
  assigned_to: string[]
  clients: { id: string; name: string; brand_color: string } | null
}

type UserSlim = { id: string; name: string; role: string }
type ClientTeamEntry = { client_id: string; role: string; user_id: string }

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  const today = new Date(); today.setHours(0,0,0,0)
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  if (diff === -1) return 'Yesterday'
  if (diff < -1) return `${Math.abs(diff)}d overdue`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function PipelinePage() {
  const router   = useRouter()
  const boardRef = useRef<HTMLDivElement>(null)

  const [mounted,        setMounted]        = useState(false)
  const [items,          setItems]          = useState<ContentRow[]>([])
  const [clients,        setClients]        = useState<{ id: string; name: string; brand_color: string }[]>([])
  const [userMap,        setUserMap]        = useState<Record<string, UserSlim>>({})
  const [clientTeamMap,  setClientTeamMap]  = useState<Record<string, Record<string, string>>>({})
  const [clientFil,      setClientFil]      = useState<string | null>(null)
  const [movePopup,      setMovePopup]      = useState<{ item: ContentRow; x: number; y: number } | null>(null)
  const [assignPopup,    setAssignPopup]    = useState<{ item: ContentRow; role: string; x: number; y: number } | null>(null)

  useEffect(() => {
    async function load() {
      const supabase = createClient()

      const [contentRes, clientsRes, usersRes, teamRes] = await Promise.all([
        supabase.from('content_pieces').select(`
          id, title, type, status, platforms, scheduled_date, client_id, assigned_to,
          clients (id, name, brand_color)
        `),
        supabase.from('clients').select('id, name, brand_color'),
        supabase.from('users').select('id, name, role'),
        supabase.from('client_team').select('client_id, role, user_id'),
      ])

      const mapped: ContentRow[] = (contentRes.data || []).map(c => ({
        ...c,
        clients: Array.isArray(c.clients) ? c.clients[0] ?? null : c.clients,
      }))

      setItems(mapped)
      setClients(clientsRes.data || [])

      const map: Record<string, UserSlim> = {}
      for (const u of usersRes.data || []) map[u.id] = { ...u, role: u.role || '' }
      setUserMap(map)

      // Build client_id → role → user_id lookup
      const ctMap: Record<string, Record<string, string>> = {}
      for (const t of (teamRes.data || []) as ClientTeamEntry[]) {
        if (!ctMap[t.client_id]) ctMap[t.client_id] = {}
        ctMap[t.client_id][t.role] = t.user_id
      }
      setClientTeamMap(ctMap)
      setMounted(true)
    }
    load()
  }, [])

  useGSAP(() => {
    if (!mounted || !boardRef.current) return
    gsap.fromTo('.pipe-card',
      { y: 12, opacity: 0, scale: 0.97 },
      { y: 0, opacity: 1, scale: 1, duration: 0.35, stagger: { amount: 0.3 }, ease: 'back.out(1.2)', clearProps: 'all' }
    )
  }, { dependencies: [mounted], scope: boardRef })

  const filtered = clientFil ? items.filter(c => c.client_id === clientFil) : items

  function itemsForColumn(status: ContentStatus) {
    return filtered.filter(c => c.status === status || (c.status === 'overdue' && status === 'planned'))
  }

  const moveItem = useCallback(async (item: ContentRow, newStatus: ContentStatus) => {
    setItems(prev => prev.map(c => c.id === item.id ? { ...c, status: newStatus } : c))
    setMovePopup(null)
    const supabase = createClient()
    await supabase.from('content_pieces').update({ status: newStatus }).eq('id', item.id)
  }, [])

  // Returns the role responsible for the current pipeline stage
  function stageRole(item: ContentRow): string {
    if (item.status === 'planned' || item.status === 'brief-ready') return 'writer'
    if (item.status === 'in-design') return item.type === 'video' || item.type === 'reel' ? 'videographer' : 'designer'
    if (item.status === 'in-editing') return 'editor'
    return 'poster'
  }

  function getStageUser(item: ContentRow): UserSlim | null {
    const role = stageRole(item)
    const uid  = clientTeamMap[item.client_id]?.[role]
    return uid ? (userMap[uid] ?? null) : null
  }

  const reassignStageUser = useCallback(async (item: ContentRow, newUserId: string) => {
    const role = stageRole(item)
    setClientTeamMap(prev => ({
      ...prev,
      [item.client_id]: { ...(prev[item.client_id] || {}), [role]: newUserId },
    }))
    setAssignPopup(null)
    const supabase = createClient()
    await supabase.from('client_team')
      .upsert({ client_id: item.client_id, role, user_id: newUserId }, { onConflict: 'client_id,role' })
  }, [clientTeamMap])

  const totalActive  = filtered.filter(c => c.status !== 'posted').length
  const overdueCount = filtered.filter(c => c.status === 'overdue').length

  if (!mounted) return null

  return (
    <main className="page-main" style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <div style={{ background: '#0F1A14', padding: '18px 20px 14px', flexShrink: 0, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '0.656rem', color: 'hsl(140,7%,48%)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '1px' }}>Content</p>
            <h1 style={{ fontSize: '1.167rem', fontWeight: 800, color: 'hsl(42,22%,84%)', lineHeight: 1 }}>Pipeline</h1>
          </div>
          <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '1rem', fontWeight: 800, color: 'hsl(25,82%,60%)', lineHeight: 1 }}>{totalActive}</p>
              <p style={{ fontSize: '0.6rem', color: 'hsl(140,7%,48%)', marginTop: '2px' }}>active</p>
            </div>
            {overdueCount > 0 && (
              <>
                <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.07)' }} />
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '1rem', fontWeight: 800, color: 'hsl(4,75%,56%)', lineHeight: 1 }}>{overdueCount}</p>
                  <p style={{ fontSize: '0.6rem', color: 'hsl(140,7%,48%)', marginTop: '2px' }}>overdue</p>
                </div>
              </>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px' }}>
          <FilterPill label="All Clients" active={!clientFil} color="hsl(25,82%,60%)" onClick={() => setClientFil(null)} />
          {clients.map(c => (
            <FilterPill key={c.id} label={c.name} active={clientFil === c.id} color={c.brand_color}
              onClick={() => setClientFil(clientFil === c.id ? null : c.id)} />
          ))}
        </div>
      </div>

      {/* ── Board ─────────────────────────────────────────────────────────── */}
      <div ref={boardRef} style={{ flex: 1, display: 'flex', gap: '8px', overflowX: 'auto', overflowY: 'hidden', padding: '12px', scrollSnapType: 'x mandatory' }}>
        {COLUMNS.map(col => {
          const colItems = itemsForColumn(col.status)
          return (
            <div key={col.status} style={{
              minWidth: '260px', maxWidth: '300px', flex: '1 0 260px',
              display: 'flex', flexDirection: 'column', borderRadius: '14px',
              background: 'hsl(42,20%,95%)', scrollSnapAlign: 'start', overflow: 'hidden',
            }}>
              <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: `2px solid ${col.dotColor}30`, flexShrink: 0 }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: col.dotColor }} />
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'hsl(24,20%,11%)', flex: 1 }}>{col.label}</span>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: '99px', background: col.color, color: col.dotColor }}>
                  {colItems.length}
                </span>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: '8px', paddingBottom: '100px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {colItems.map(cp => {
                  const cfg       = TYPE_CFG[cp.type]
                  const isOverdue = cp.status === 'overdue'
                  const stageUser = getStageUser(cp)
                  const sRole     = stageRole(cp)

                  return (
                    <div
                      key={cp.id}
                      className="pipe-card"
                      onClick={() => router.push(`/brief/${cp.id}`)}
                      style={{
                        background: 'hsl(42,25%,99%)', borderRadius: '12px',
                        border: isOverdue ? '1.5px solid hsl(4,75%,56%)' : '1px solid hsl(38,14%,90%)',
                        overflow: 'hidden', cursor: 'pointer',
                        transition: 'transform 0.15s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.15s ease',
                      }}
                      onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.transform = 'translateY(-2px)'; el.style.boxShadow = '0 6px 20px rgba(15,26,20,0.1)' }}
                      onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.transform = ''; el.style.boxShadow = '' }}
                    >
                      <div style={{ height: '3px', background: cfg.bg }} />
                      <div style={{ padding: '10px 12px' }}>
                        <p style={{ fontSize: '0.8rem', fontWeight: 700, color: 'hsl(24,20%,11%)', lineHeight: 1.3, marginBottom: '4px' }}>{cp.title}</p>
                        <p style={{ fontSize: '0.656rem', color: 'hsl(24,10%,54%)', marginBottom: '8px' }}>{cp.clients?.name}</p>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <span style={{ padding: '2px 6px', borderRadius: '4px', background: cfg.bg, color: cfg.text, fontSize: '0.58rem', fontWeight: 700 }}>
                            {cfg.label}
                          </span>
                          <span style={{ fontSize: '0.6rem', fontWeight: 600, color: isOverdue ? 'hsl(4,72%,45%)' : 'hsl(24,10%,54%)' }}>
                            {formatDate(cp.scheduled_date)}
                          </span>
                          <div style={{ flex: 1 }} />

                          {/* Stage-responsible person — click to reassign */}
                          <button
                            title={stageUser ? `${stageUser.name} (${sRole}) — click to reassign` : `No ${sRole} assigned — click to assign`}
                            onClick={e => {
                              e.stopPropagation()
                              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                              setAssignPopup({ item: cp, role: sRole, x: rect.left, y: rect.bottom + 4 })
                            }}
                            style={{
                              display: 'flex', alignItems: 'center', gap: '4px', padding: '2px 6px 2px 2px',
                              borderRadius: '8px', border: 'none', cursor: 'pointer',
                              background: stageUser ? `${getAvatarColor(stageUser.id)}18` : 'hsl(42,18%,93%)',
                              transition: 'background 0.1s',
                            }}
                            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'hsl(25,82%,93%)' }}
                            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = stageUser ? `${getAvatarColor(stageUser.id)}18` : 'hsl(42,18%,93%)' }}
                          >
                            <div style={{
                              width: '20px', height: '20px', borderRadius: '6px', flexShrink: 0,
                              background: stageUser ? getAvatarColor(stageUser.id) : 'hsl(38,14%,80%)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '0.46rem', fontWeight: 800, color: '#fff',
                            }}>
                              {stageUser ? getInitials(stageUser.name) : '?'}
                            </div>
                            <span style={{ fontSize: '0.56rem', fontWeight: 600, color: 'hsl(24,10%,44%)', whiteSpace: 'nowrap' }}>
                              {stageUser ? stageUser.name.split(' ')[0] : `+ ${sRole}`}
                            </span>
                          </button>

                          <button
                            onClick={e => { e.stopPropagation(); const rect = (e.currentTarget as HTMLElement).getBoundingClientRect(); setMovePopup({ item: cp, x: rect.left, y: rect.bottom + 4 }) }}
                            style={{ width: '22px', height: '22px', borderRadius: '6px', background: 'hsl(42,18%,93%)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: 'hsl(24,10%,44%)', transition: 'background 0.1s' }}
                            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'hsl(25,82%,60%)'; (e.currentTarget as HTMLButtonElement).style.color = '#fff' }}
                            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'hsl(42,18%,93%)'; (e.currentTarget as HTMLButtonElement).style.color = 'hsl(24,10%,44%)' }}
                          >→</button>
                        </div>

                        <div style={{ display: 'flex', gap: '4px', marginTop: '6px' }}>
                          {(cp.platforms || []).map(p => (
                            <span key={p} style={{ fontSize: '0.52rem', fontWeight: 600, padding: '1px 5px', borderRadius: '3px', background: 'hsl(42,18%,93%)', color: 'hsl(24,10%,54%)', textTransform: 'capitalize' }}>
                              {p}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )
                })}

                {colItems.length === 0 && (
                  <div style={{ padding: '24px 12px', textAlign: 'center', border: '1.5px dashed hsl(38,14%,85%)', borderRadius: '10px', background: 'hsl(42,22%,97%)' }}>
                    <p style={{ fontSize: '0.7rem', color: 'hsl(24,8%,64%)', fontWeight: 500 }}>No items</p>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Assign popup ───────────────────────────────────────────────────── */}
      {assignPopup && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 50 }} onClick={() => setAssignPopup(null)} />
          <div style={{
            position: 'fixed',
            left: Math.min(assignPopup.x, window.innerWidth - 220),
            top: Math.min(assignPopup.y, window.innerHeight - 260),
            zIndex: 51, background: 'hsl(42,25%,99%)', borderRadius: '14px',
            padding: '8px', width: '210px',
            boxShadow: '0 12px 40px rgba(15,26,20,0.2)', border: '1px solid hsl(38,14%,90%)',
          }}>
            <p style={{ fontSize: '0.7rem', fontWeight: 700, color: 'hsl(24,10%,44%)', padding: '4px 8px 6px', borderBottom: '1px solid hsl(38,14%,92%)', marginBottom: '4px', textTransform: 'capitalize' }}>
              Assign {assignPopup.role}
            </p>
            {(() => {
              const usersForRole = Object.values(userMap).filter(u => u.role === assignPopup.role)
              const currentUid   = clientTeamMap[assignPopup.item.client_id]?.[assignPopup.role]
              if (usersForRole.length === 0) return (
                <p style={{ fontSize: '0.7rem', color: 'hsl(24,10%,54%)', padding: '8px', textAlign: 'center' }}>
                  No {assignPopup.role}s in team
                </p>
              )
              return usersForRole.map(u => {
                const isCurrent = u.id === currentUid
                return (
                  <button key={u.id} onClick={() => reassignStageUser(assignPopup.item, u.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '8px', width: '100%',
                      padding: '7px 8px', borderRadius: '8px',
                      background: isCurrent ? 'hsl(42,18%,94%)' : 'transparent',
                      border: 'none', cursor: 'pointer', transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => { if (!isCurrent) (e.currentTarget as HTMLButtonElement).style.background = 'hsl(42,18%,94%)' }}
                    onMouseLeave={e => { if (!isCurrent) (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                  >
                    <div style={{ width: 24, height: 24, borderRadius: '7px', background: getAvatarColor(u.id), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.5rem', fontWeight: 800, color: '#fff', flexShrink: 0 }}>
                      {getInitials(u.name)}
                    </div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'hsl(24,20%,11%)', flex: 1, textAlign: 'left' }}>{u.name}</span>
                    {isCurrent && <span style={{ fontSize: '0.6rem', color: 'hsl(24,8%,64%)' }}>✓</span>}
                  </button>
                )
              })
            })()}
          </div>
        </>
      )}

      {/* ── Move popup ─────────────────────────────────────────────────────── */}
      {movePopup && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 50 }} onClick={() => setMovePopup(null)} />
          <div style={{
            position: 'fixed',
            left: Math.min(movePopup.x, window.innerWidth - 220),
            top: Math.min(movePopup.y, window.innerHeight - 300),
            zIndex: 51, background: 'hsl(42,25%,99%)', borderRadius: '14px',
            padding: '8px', width: '200px',
            boxShadow: '0 12px 40px rgba(15,26,20,0.2)', border: '1px solid hsl(38,14%,90%)',
          }}>
            <p style={{ fontSize: '0.7rem', fontWeight: 700, color: 'hsl(24,10%,44%)', padding: '4px 8px 6px', borderBottom: '1px solid hsl(38,14%,92%)', marginBottom: '4px' }}>
              Move to...
            </p>
            {COLUMNS.map(col => {
              const isCurrent = movePopup.item.status === col.status || (movePopup.item.status === 'overdue' && col.status === 'planned')
              return (
                <button key={col.status} disabled={isCurrent} onClick={() => moveItem(movePopup.item, col.status)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '7px 8px',
                    borderRadius: '8px', background: isCurrent ? 'hsl(42,18%,94%)' : 'transparent',
                    border: 'none', cursor: isCurrent ? 'default' : 'pointer', opacity: isCurrent ? 0.5 : 1,
                    transition: 'background 0.1s', textAlign: 'left',
                  }}
                  onMouseEnter={e => { if (!isCurrent) (e.currentTarget as HTMLButtonElement).style.background = 'hsl(42,18%,94%)' }}
                  onMouseLeave={e => { if (!isCurrent) (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                >
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: col.dotColor }} />
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'hsl(24,20%,11%)' }}>{col.label}</span>
                  {isCurrent && <span style={{ fontSize: '0.6rem', color: 'hsl(24,8%,64%)', marginLeft: 'auto' }}>current</span>}
                </button>
              )
            })}
          </div>
        </>
      )}
    </main>
  )
}

function FilterPill({ label, active, color, onClick }: { label: string; active: boolean; color: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      padding: '4px 11px', borderRadius: '9999px', border: 'none',
      background: active ? color : 'rgba(255,255,255,0.07)',
      color: active ? '#fff' : 'hsl(140,7%,48%)',
      fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'background 0.15s',
    }}>
      {label}
    </button>
  )
}
