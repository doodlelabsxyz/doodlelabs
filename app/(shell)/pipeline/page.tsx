'use client'

import { useState, useRef, useEffect, type CSSProperties } from 'react'
import { useRouter } from 'next/navigation'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/supabase/useUser'
import { cn } from '@/lib/utils'
import type { ContentType, ContentStatus } from '@/lib/types'
import { getInitials, getAvatarColor } from '@/lib/utils'

gsap.registerPlugin(useGSAP)

// Full Tailwind class strings — must be complete for JIT scanning
const TYPE_CELL: Record<ContentType, { bg: string; text: string; label: string; accentBar: string }> = {
  graphic: { bg: 'bg-coral',    text: 'text-white',     label: 'Graphic', accentBar: 'bg-coral'    },
  video:   { bg: 'bg-lemon',    text: 'text-amber-900', label: 'Video',   accentBar: 'bg-lemon'    },
  reel:    { bg: 'bg-mint',     text: 'text-white',     label: 'Reel',    accentBar: 'bg-mint'     },
  story:   { bg: 'bg-lavender', text: 'text-white',     label: 'Story',   accentBar: 'bg-lavender' },
}

type ColumnCfg = {
  status: ContentStatus
  label: string
  dotCls: string
  countBgCls: string
  countTextCls: string
  borderCls: string
}

const COLUMNS: ColumnCfg[] = [
  { status: 'planned',          label: 'Planned',     dotCls: 'bg-[hsl(220,15%,62%)]',   countBgCls: 'bg-[hsl(220,15%,93%)]',   countTextCls: 'text-[hsl(220,15%,42%)]', borderCls: 'border-b-2 border-b-[hsl(220,15%,62%)]/25' },
  { status: 'brief-ready',      label: 'Brief Ready', dotCls: 'bg-sky',                   countBgCls: 'bg-sky-tint',              countTextCls: 'text-sky',                borderCls: 'border-b-2 border-b-sky/25'                },
  { status: 'in-design',        label: 'In Design',   dotCls: 'bg-coral',                 countBgCls: 'bg-coral-tint',            countTextCls: 'text-coral',              borderCls: 'border-b-2 border-b-coral/25'              },
  { status: 'in-editing',       label: 'In Editing',  dotCls: 'bg-lemon',                 countBgCls: 'bg-lemon-tint',            countTextCls: 'text-[hsl(40,60%,32%)]', borderCls: 'border-b-2 border-b-lemon/30'              },
  { status: 'ready-for-review', label: 'Review',      dotCls: 'bg-lavender',              countBgCls: 'bg-lavender-tint',         countTextCls: 'text-lavender',           borderCls: 'border-b-2 border-b-lavender/25'           },
  { status: 'approved',         label: 'Approved',    dotCls: 'bg-success',               countBgCls: 'bg-mint-tint',             countTextCls: 'text-success',            borderCls: 'border-b-2 border-b-success/25'            },
  { status: 'posted',           label: 'Posted',      dotCls: 'bg-success/60',            countBgCls: 'bg-mint-tint/60',          countTextCls: 'text-success/70',         borderCls: 'border-b-2 border-b-success/20'            },
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
  const { user } = useUser()
  const router   = useRouter()
  const boardRef = useRef<HTMLDivElement>(null)

  const [mounted,       setMounted]       = useState(false)
  const [items,         setItems]         = useState<ContentRow[]>([])
  const [clients,       setClients]       = useState<{ id: string; name: string; brand_color: string }[]>([])
  const [userMap,       setUserMap]       = useState<Record<string, UserSlim>>({})
  const [clientTeamMap, setClientTeamMap] = useState<Record<string, Record<string, string>>>({})
  const [clientFil,     setClientFil]     = useState<string | null>(null)
  const [movePopup,     setMovePopup]     = useState<{ item: ContentRow; x: number; y: number } | null>(null)
  const [assignPopup,   setAssignPopup]   = useState<{ item: ContentRow; role: string; x: number; y: number } | null>(null)

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
    gsap.fromTo('[data-animate="pipe-card"]',
      { y: 12, opacity: 0, scale: 0.97 },
      { y: 0, opacity: 1, scale: 1, duration: 0.35, stagger: { amount: 0.3 }, ease: 'back.out(1.2)', clearProps: 'all' }
    )
  }, { dependencies: [mounted], scope: boardRef })

  const filtered = clientFil ? items.filter(c => c.client_id === clientFil) : items

  function itemsForColumn(status: ContentStatus) {
    return filtered.filter(c => c.status === status || (c.status === 'overdue' && status === 'planned'))
  }

  async function moveItem(item: ContentRow, newStatus: ContentStatus) {
    setItems(prev => prev.map(c => c.id === item.id ? { ...c, status: newStatus } : c))
    setMovePopup(null)
    const supabase = createClient()
    await supabase.from('content_pieces').update({ status: newStatus }).eq('id', item.id)
  }

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

  async function reassignStageUser(item: ContentRow, newUserId: string) {
    const role = stageRole(item)
    setClientTeamMap(prev => ({
      ...prev,
      [item.client_id]: { ...(prev[item.client_id] || {}), [role]: newUserId },
    }))
    setAssignPopup(null)
    const supabase = createClient()
    await supabase.from('client_team')
      .upsert({ client_id: item.client_id, role, user_id: newUserId, org_id: user?.org_id }, { onConflict: 'client_id,role' })
  }

  const totalActive  = filtered.filter(c => c.status !== 'posted').length
  const overdueCount = filtered.filter(c => c.status === 'overdue').length

  if (!mounted) return null

  return (
    <main className="page-main flex-1 min-w-0 flex flex-col overflow-hidden">

      {/* ── Hero ── */}
      <div className="bg-dark px-5 pt-[18px] pb-[14px] shrink-0 border-b border-white/[0.04]">
        <div className="flex items-center gap-3 mb-[10px]">
          <div className="flex-1">
            <p className="text-[0.656rem] text-dark-muted tracking-[0.08em] uppercase mb-px">Content</p>
            <h1 className="text-[1.167rem] font-extrabold text-dark-text leading-none">Pipeline</h1>
          </div>

          <div className="flex gap-[14px] items-center">
            <div className="text-right">
              <p className="text-[1rem] font-extrabold text-coral leading-none">{totalActive}</p>
              <p className="text-[0.6rem] text-dark-muted mt-[2px]">active</p>
            </div>
            {overdueCount > 0 && (
              <>
                <div className="w-px h-6 bg-white/[0.07]" />
                <div className="text-right">
                  <p className="text-[1rem] font-extrabold text-danger leading-none">{overdueCount}</p>
                  <p className="text-[0.6rem] text-dark-muted mt-[2px]">overdue</p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Client filter pills */}
        <div className="scrollbar-hide flex gap-[6px] overflow-x-auto pb-[2px]">
          <PipeFilterPill label="All Clients" active={!clientFil} onClick={() => setClientFil(null)} />
          {clients.map(c => (
            <PipeFilterPill
              key={c.id}
              label={c.name}
              active={clientFil === c.id}
              color={c.brand_color}
              onClick={() => setClientFil(clientFil === c.id ? null : c.id)}
            />
          ))}
        </div>
      </div>

      {/* ── Kanban Board ── */}
      <div
        ref={boardRef}
        className="flex-1 flex gap-2 overflow-x-auto overflow-y-hidden p-3 snap-x snap-mandatory"
      >
        {COLUMNS.map(col => {
          const colItems = itemsForColumn(col.status)
          return (
            <div
              key={col.status}
              className="min-w-[260px] max-w-[300px] flex-[1_0_260px] flex flex-col rounded-[14px] bg-island-2 snap-start overflow-hidden"
            >
              {/* Column header */}
              <div className={cn("px-[14px] py-3 flex items-center gap-2 shrink-0", col.borderCls)}>
                <div className={cn("w-2 h-2 rounded-full shrink-0", col.dotCls)} />
                <span className="text-[0.8rem] font-bold text-ink flex-1">{col.label}</span>
                <span className={cn("text-[0.7rem] font-bold px-2 py-0.5 rounded-full", col.countBgCls, col.countTextCls)}>
                  {colItems.length}
                </span>
              </div>

              {/* Card list */}
              <div className="flex-1 overflow-y-auto p-2 pb-[100px] flex flex-col gap-[6px]">
                {colItems.map(cp => {
                  const cfg       = TYPE_CELL[cp.type]
                  const isOverdue = cp.status === 'overdue'
                  const stageUser = getStageUser(cp)
                  const sRole     = stageRole(cp)

                  return (
                    <div
                      key={cp.id}
                      data-animate="pipe-card"
                      onClick={() => router.push(`/brief/${cp.id}`)}
                      className={cn(
                        "bg-island rounded-xl overflow-hidden cursor-pointer",
                        "transition-[transform,box-shadow] duration-150 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
                        "hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(15,26,20,0.1)]",
                        isOverdue
                          ? "border border-danger/70"
                          : "border border-border"
                      )}
                    >
                      {/* Type accent bar */}
                      <div className={cn("h-[3px]", cfg.accentBar)} />

                      <div className="px-3 py-[10px]">
                        <p className="text-[0.8rem] font-bold text-ink leading-[1.3] mb-1">{cp.title}</p>
                        <p className="text-[0.656rem] text-muted mb-2">{cp.clients?.name}</p>

                        <div className="flex items-center gap-[6px] flex-wrap">
                          {/* Type badge */}
                          <span className={cn("px-[6px] py-0.5 rounded-[4px] text-[0.58rem] font-bold", cfg.bg, cfg.text)}>
                            {cfg.label}
                          </span>

                          {/* Date */}
                          <span className={cn(
                            "text-[0.6rem] font-semibold",
                            isOverdue ? "text-danger" : "text-muted"
                          )}>
                            {formatDate(cp.scheduled_date)}
                          </span>

                          <div className="flex-1" />

                          {/* Stage-responsible person */}
                          <button
                            title={stageUser
                              ? `${stageUser.name} (${sRole}) — click to reassign`
                              : `No ${sRole} assigned — click to assign`
                            }
                            onClick={e => {
                              e.stopPropagation()
                              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                              setAssignPopup({ item: cp, role: sRole, x: rect.left, y: rect.bottom + 4 })
                            }}
                            style={stageUser
                              ? { background: `${getAvatarColor(stageUser.id)}18` } as CSSProperties
                              : undefined
                            }
                            className={cn(
                              "flex items-center gap-1 pl-0.5 pr-[6px] py-[2px] rounded-lg border-0 cursor-pointer",
                              "transition-colors hover:bg-coral/10",
                              !stageUser && "bg-island-2"
                            )}
                          >
                            <div
                              className="w-5 h-5 rounded-[6px] shrink-0 flex items-center justify-center text-[0.46rem] font-extrabold text-white"
                              style={{ background: stageUser ? getAvatarColor(stageUser.id) : 'hsl(38,14%,80%)' }}
                            >
                              {stageUser ? getInitials(stageUser.name) : '?'}
                            </div>
                            <span className="text-[0.56rem] font-semibold text-muted whitespace-nowrap">
                              {stageUser ? stageUser.name.split(' ')[0] : `+ ${sRole}`}
                            </span>
                          </button>

                          {/* Move button */}
                          <button
                            onClick={e => {
                              e.stopPropagation()
                              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                              setMovePopup({ item: cp, x: rect.left, y: rect.bottom + 4 })
                            }}
                            className="w-[22px] h-[22px] rounded-[6px] bg-island-2 border-0 cursor-pointer flex items-center justify-center text-[10px] text-muted transition-colors hover:bg-coral hover:text-white"
                          >→</button>
                        </div>

                        {/* Platforms */}
                        {(cp.platforms || []).length > 0 && (
                          <div className="flex gap-1 mt-[6px]">
                            {cp.platforms.map(p => (
                              <span
                                key={p}
                                className="text-[0.52rem] font-semibold px-[5px] py-px rounded-[3px] bg-island-2 text-muted capitalize"
                              >
                                {p}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}

                {colItems.length === 0 && (
                  <div className="px-3 py-6 text-center border border-dashed border-border rounded-[10px] bg-cream/50">
                    <p className="text-[0.7rem] text-ghost font-medium">No items</p>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Assign popup ── */}
      {assignPopup && (
        <>
          <div className="fixed inset-0 z-50" onClick={() => setAssignPopup(null)} />
          <div
            className="fixed z-[51] bg-island rounded-[14px] p-2 w-[210px] shadow-[0_12px_40px_rgba(15,26,20,0.2)] border border-border"
            style={{
              left: Math.min(assignPopup.x, window.innerWidth - 220),
              top:  Math.min(assignPopup.y, window.innerHeight - 260),
            }}
          >
            <p className="text-[0.7rem] font-bold text-muted px-2 py-1 pb-[6px] border-b border-border mb-1 capitalize">
              Assign {assignPopup.role}
            </p>
            {(() => {
              const usersForRole = Object.values(userMap).filter(u => u.role === assignPopup.role)
              const currentUid   = clientTeamMap[assignPopup.item.client_id]?.[assignPopup.role]
              if (usersForRole.length === 0) return (
                <p className="text-[0.7rem] text-muted px-2 py-2 text-center">
                  No {assignPopup.role}s in team
                </p>
              )
              return usersForRole.map(u => {
                const isCurrent = u.id === currentUid
                return (
                  <button
                    key={u.id}
                    onClick={() => reassignStageUser(assignPopup.item, u.id)}
                    className={cn(
                      "flex items-center gap-2 w-full px-2 py-[7px] rounded-lg border-0 cursor-pointer text-left transition-colors",
                      isCurrent ? "bg-island-2" : "bg-transparent hover:bg-island-2"
                    )}
                  >
                    <div
                      className="w-6 h-6 rounded-[7px] shrink-0 flex items-center justify-center text-[0.5rem] font-extrabold text-white"
                      style={{ background: getAvatarColor(u.id) }}
                    >
                      {getInitials(u.name)}
                    </div>
                    <span className="text-[0.75rem] font-semibold text-ink flex-1">{u.name}</span>
                    {isCurrent && <span className="text-[0.6rem] text-ghost">✓</span>}
                  </button>
                )
              })
            })()}
          </div>
        </>
      )}

      {/* ── Move popup ── */}
      {movePopup && (
        <>
          <div className="fixed inset-0 z-50" onClick={() => setMovePopup(null)} />
          <div
            className="fixed z-[51] bg-island rounded-[14px] p-2 w-[200px] shadow-[0_12px_40px_rgba(15,26,20,0.2)] border border-border"
            style={{
              left: Math.min(movePopup.x, window.innerWidth - 220),
              top:  Math.min(movePopup.y, window.innerHeight - 300),
            }}
          >
            <p className="text-[0.7rem] font-bold text-muted px-2 py-1 pb-[6px] border-b border-border mb-1">
              Move to…
            </p>
            {COLUMNS.map(col => {
              const isCurrent = movePopup.item.status === col.status ||
                (movePopup.item.status === 'overdue' && col.status === 'planned')
              return (
                <button
                  key={col.status}
                  disabled={isCurrent}
                  onClick={() => moveItem(movePopup.item, col.status)}
                  className={cn(
                    "flex items-center gap-2 w-full px-2 py-[7px] rounded-lg border-0 text-left transition-colors",
                    isCurrent
                      ? "bg-island-2 opacity-50 cursor-default"
                      : "bg-transparent cursor-pointer hover:bg-island-2"
                  )}
                >
                  <div className={cn("w-[6px] h-[6px] rounded-full shrink-0", col.dotCls)} />
                  <span className="text-[0.75rem] font-semibold text-ink">{col.label}</span>
                  {isCurrent && (
                    <span className="text-[0.6rem] text-ghost ml-auto">current</span>
                  )}
                </button>
              )
            })}
          </div>
        </>
      )}
    </main>
  )
}

// ─── Filter pill (dark header variant) ────────────────────────────────────────
function PipeFilterPill({
  label, active, color, onClick,
}: {
  label: string; active: boolean; color?: string; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={active && color ? { '--pill-color': color } as CSSProperties : undefined}
      className={cn(
        "px-[11px] py-1 rounded-full text-[0.75rem] font-semibold cursor-pointer whitespace-nowrap shrink-0 border-0 transition-colors",
        active
          ? color
            ? "bg-[var(--pill-color)] text-white"
            : "bg-coral text-white shadow-[0_2px_8px_hsla(14,72%,62%,0.4)]"
          : "bg-white/[0.07] text-dark-muted hover:bg-white/[0.1]"
      )}
    >
      {label}
    </button>
  )
}
