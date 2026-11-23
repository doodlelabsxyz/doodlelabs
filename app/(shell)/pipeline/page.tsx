'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/supabase/useUser'
import { cn } from '@/lib/utils'
import { FilterPill } from '@/components/ui/filter-pill'
import { Skeleton } from '@/components/ui/skeleton'
import { UserAvatar } from '@/components/ui/user-avatar'
import { PlatformBadge } from '@/components/ui/platform-badge'
import { TypeIcon, StatusIcon } from '@/components/ui/type-icon'
import { CONTENT_TYPE_STYLE, STATUS_STYLE, type StatusIconName } from '@/lib/color-map'
import type { ContentType, ContentStatus, Platform } from '@/lib/types'
import { isContentOverdue } from '@/lib/overdue'

gsap.registerPlugin(useGSAP)

// Dark-header overrides for the shared FilterPill (header panel is always dark)
const PIPE_PILL_BASE   = 'shrink-0 whitespace-nowrap border-transparent px-[11px] text-[0.75rem]'
const PIPE_PILL_ACTIVE = 'bg-mint text-dark'
const PIPE_PILL_IDLE   = 'bg-white/[0.07] text-dark-muted hover:bg-white/[0.1]'

type ColumnCfg = {
  status: ContentStatus
  icon: StatusIconName
  headerCls: string
  borderCls: string
}

// Neutral headers; stage index maps to a deeper green tint (planned -> posted).
const COLUMNS: ColumnCfg[] = [
  { status: 'planned',          icon: 'circle', headerCls: 'bg-primary/[0.03]', borderCls: 'border-b-2 border-b-primary/10' },
  { status: 'brief-ready',      icon: 'dot',    headerCls: 'bg-primary/[0.06]', borderCls: 'border-b-2 border-b-primary/20' },
  { status: 'in-design',        icon: 'dot',    headerCls: 'bg-primary/10',     borderCls: 'border-b-2 border-b-primary/30' },
  { status: 'in-editing',       icon: 'dot',    headerCls: 'bg-primary/[0.14]', borderCls: 'border-b-2 border-b-primary/40' },
  { status: 'ready-for-review', icon: 'clock',  headerCls: 'bg-primary/[0.18]', borderCls: 'border-b-2 border-b-primary/55' },
  { status: 'approved',         icon: 'check',  headerCls: 'bg-primary/[0.22]', borderCls: 'border-b-2 border-b-primary/70' },
  { status: 'posted',           icon: 'check',  headerCls: 'bg-primary/[0.28]', borderCls: 'border-b-2 border-b-primary/90' },
]

type ContentRow = {
  id: string
  title: string
  type: ContentType
  status: ContentStatus
  platforms: Platform[]
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
  const [actionError,   setActionError]   = useState('')

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

      if (contentRes.error || clientsRes.error || usersRes.error || teamRes.error) {
        setActionError('Could not load the pipeline. Try refreshing the page.')
      }

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
    // Overdue is a computed flag on whatever real column the piece is in
    // (see isContentOverdue), not a stored status — nothing ever writes
    // status='overdue', so a piece never actually needs folding into 'planned'.
    return filtered.filter(c => c.status === status)
  }

  async function moveItem(item: ContentRow, newStatus: ContentStatus) {
    const previousRole = stageRole(item)

    setItems(prev => prev.map(c => c.id === item.id ? { ...c, status: newStatus } : c))
    setMovePopup(null)
    const supabase = createClient()
    setActionError('')
    const { data, error } = await supabase.from('content_pieces').update({ status: newStatus }).eq('id', item.id).select('id').single()
    if (error || !data) {
      setItems(prev => prev.map(c => c.id === item.id ? { ...c, status: item.status } : c))
      setActionError('Could not move that card. Please try again.')
      return
    }

    // Close out only the task for the stage being LEFT, scoped by role — not
    // every pending task on this content piece. Brief creation front-loads a
    // task for every type-relevant role at once (writer + designer/poster,
    // say), so a blind "close everything pending" here would mark the
    // designer's and poster's tasks done before they'd done anything.
    await supabase.from('tasks').update({ status: 'done' }).eq('content_id', item.id).eq('role', previousRole).neq('status', 'done')

    const role = stageRoleForStatus(newStatus, item.type)
    const assigneeId = role ? clientTeamMap[item.client_id]?.[role] : undefined
    if (role && assigneeId) {
      // Brief creation may have already front-loaded a pending task for this
      // role — don't create a second one for the same content piece.
      const { data: existingTask } = await supabase
        .from('tasks')
        .select('id')
        .eq('content_id', item.id)
        .eq('role', role)
        .neq('status', 'done')
        .maybeSingle()

      if (existingTask) {
        await supabase.from('tasks').update({ assigned_to: assigneeId, status: 'pending' }).eq('id', existingTask.id)
      } else {
        await supabase.from('tasks').insert({
          title: roleTaskTitle(role, item.title),
          description: `Auto-generated task for "${item.title}"`,
          content_id: item.id,
          client_id: item.client_id,
          assigned_to: assigneeId,
          role,
          due_date: item.scheduled_date || new Date().toISOString().split('T')[0],
          status: 'pending',
          org_id: user?.org_id,
        })
      }
    }
  }

  function stageRole(item: ContentRow): string {
    if (item.status === 'planned' || item.status === 'brief-ready') return 'writer'
    if (item.status === 'in-design') return item.type === 'video' || item.type === 'reel' ? 'videographer' : 'designer'
    if (item.status === 'in-editing') return 'editor'
    return 'poster'
  }

  function stageRoleForStatus(status: ContentStatus, type: ContentType): string | null {
    if (status === 'planned' || status === 'brief-ready') return 'writer'
    if (status === 'in-design') return type === 'video' || type === 'reel' ? 'videographer' : 'designer'
    if (status === 'in-editing') return 'editor'
    if (status === 'ready-for-review') return 'poster'
    return null
  }

  function roleTaskTitle(role: string, title: string): string {
    const map: Record<string, string> = {
      writer: `Write brief: ${title}`,
      designer: `Design: ${title}`,
      videographer: `Film: ${title}`,
      editor: `Edit: ${title}`,
      poster: `Schedule & post: ${title}`,
    }
    return map[role] ?? `${role}: ${title}`
  }

  function getStageUser(item: ContentRow): UserSlim | null {
    const role = stageRole(item)
    const uid  = clientTeamMap[item.client_id]?.[role]
    return uid ? (userMap[uid] ?? null) : null
  }

  async function reassignStageUser(item: ContentRow, newUserId: string) {
    const role = stageRole(item)
    const previousUserId = clientTeamMap[item.client_id]?.[role]
    setClientTeamMap(prev => ({
      ...prev,
      [item.client_id]: { ...(prev[item.client_id] || {}), [role]: newUserId },
    }))
    setAssignPopup(null)
    setActionError('')
    const supabase = createClient()
    const { data, error } = await supabase.from('client_team')
      .upsert({ client_id: item.client_id, role, user_id: newUserId, org_id: user?.org_id }, { onConflict: 'client_id,role' })
      .select('id')
      .single()

    if (error || !data) {
      setClientTeamMap(prev => ({
        ...prev,
        [item.client_id]: { ...(prev[item.client_id] || {}), [role]: previousUserId ?? '' },
      }))
      setActionError('Could not reassign that role. Please try again.')
      return
    }

    // Move this piece's current-stage task over to whoever was just assigned
    const { data: existing } = await supabase
      .from('tasks')
      .select('id')
      .eq('content_id', item.id)
      .eq('role', role)
      .neq('status', 'done')
      .maybeSingle()

    if (existing) {
      await supabase.from('tasks').update({ assigned_to: newUserId }).eq('id', existing.id)
    } else {
      await supabase.from('tasks').insert({
        title: roleTaskTitle(role, item.title),
        description: `Auto-generated task for "${item.title}"`,
        content_id: item.id,
        client_id: item.client_id,
        assigned_to: newUserId,
        role,
        due_date: item.scheduled_date || new Date().toISOString().split('T')[0],
        status: 'pending',
        org_id: user?.org_id,
      })
    }
  }

  const totalActive  = filtered.filter(c => c.status !== 'posted').length
  const overdueCount = filtered.filter(isContentOverdue).length

  if (!mounted) {
    return (
      <main aria-busy="true" aria-label="Loading pipeline" className="page-main flex-1 min-w-0 flex flex-col overflow-hidden">
        <div className="bg-dark px-5 pt-[18px] pb-[14px] shrink-0">
          <Skeleton className="mb-2 h-2.5 w-14 bg-white/10" />
          <Skeleton className="h-5 w-32 bg-white/10" />
        </div>
        <div className="flex flex-1 gap-3 overflow-hidden p-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="w-64 shrink-0 space-y-3">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-24 w-full rounded-xl" />
              <Skeleton className="h-24 w-full rounded-xl" />
            </div>
          ))}
        </div>
      </main>
    )
  }

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
              <p className="text-[1rem] font-extrabold text-primary leading-none">{totalActive}</p>
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
            <button
              onClick={() => router.push('/brief/new')}
              className="shrink-0 rounded-full bg-mint px-3 py-1.5 text-[0.72rem] font-bold text-dark hover:bg-mint/85 pointer-coarse:min-h-11"
            >
              + New
            </button>
          </div>
        </div>

        {/* Client filter pills */}
        <div className="scrollbar-hide flex gap-[6px] overflow-x-auto pb-[2px]">
          <FilterPill
            active={!clientFil}
            onClick={() => setClientFil(null)}
            className={cn(PIPE_PILL_BASE, !clientFil ? PIPE_PILL_ACTIVE : PIPE_PILL_IDLE)}
          >
            All Clients
          </FilterPill>
          {clients.map(c => {
            const active = clientFil === c.id
            return (
              <FilterPill
                key={c.id}
                active={active}
                onClick={() => setClientFil(active ? null : c.id)}
                className={cn(PIPE_PILL_BASE, active ? PIPE_PILL_ACTIVE : PIPE_PILL_IDLE)}
              >
                {c.name}
              </FilterPill>
            )
          })}
        </div>
      </div>

      {actionError && (
        <div className="mx-3 mt-2 rounded-lg border border-danger/20 bg-danger/5 px-3 py-2 text-xs font-medium text-danger">
          {actionError}
        </div>
      )}

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
              className="min-w-[260px] max-w-[300px] flex-[1_0_260px] flex flex-col rounded-[14px] bg-wash snap-start overflow-hidden"
            >
              {/* Column header */}
              <div className={cn("px-[14px] py-3 flex items-center gap-2 shrink-0", col.headerCls, col.borderCls)}>
                <StatusIcon name={col.icon} className="size-3 text-primary" />
                <span className="text-[0.8rem] font-bold text-foreground flex-1">{STATUS_STYLE[col.status].label}</span>
                <span className="text-[0.7rem] font-bold px-2 py-0.5 rounded-full bg-card text-foreground border border-border">
                  {colItems.length}
                </span>
              </div>

              {/* Card list */}
              <div className="flex-1 overflow-y-auto p-2 pb-[100px] flex flex-col gap-[6px]">
                {colItems.map(cp => {
                  const cfg       = CONTENT_TYPE_STYLE[cp.type]
                  const isOverdue = isContentOverdue(cp)
                  const stageUser = getStageUser(cp)
                  const sRole     = stageRole(cp)

                  return (
                    <div
                      key={cp.id}
                      data-animate="pipe-card"
                      onClick={() => router.push(`/brief/${cp.id}`)}
                      className={cn(
                        "bg-card rounded-xl overflow-hidden cursor-pointer",
                        "transition-[transform,box-shadow] duration-150 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
                        "hover:-translate-y-0.5 hover:shadow-md",
                        isOverdue
                          ? "border border-danger/70"
                          : "border border-border"
                      )}
                    >
                      <div className="px-3 py-[10px]">
                        <p className="text-[0.8rem] font-bold text-foreground leading-[1.3] mb-1">{cp.title}</p>
                        <p className="text-[0.656rem] text-muted-foreground mb-2">{cp.clients?.name}</p>

                        <div className="flex items-center gap-[6px] flex-wrap">
                          {/* Type badge */}
                          <span className={cn("inline-flex items-center gap-1 px-[6px] py-0.5 rounded-[4px] text-[0.58rem] font-bold", cfg.className)}>
                            <TypeIcon name={cfg.icon} className="size-2.5" />
                            {cfg.label}
                          </span>

                          {/* Date */}
                          <span className={cn(
                            "inline-flex items-center gap-0.5 text-[0.6rem] font-semibold",
                            isOverdue ? "text-danger" : "text-muted-foreground"
                          )}>
                            {isOverdue && <StatusIcon name="bang" className="size-2.5" />}
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
                            className={cn(
                              "relative flex items-center gap-1 pl-0.5 pr-[6px] py-[2px] rounded-lg border-0 cursor-pointer",
                              "before:absolute before:-inset-2 before:content-['']",
                              "transition-colors hover:bg-primary/10",
                              stageUser ? "bg-wash" : "bg-sage"
                            )}
                          >
                            {stageUser ? (
                              <UserAvatar
                                userId={stageUser.id}
                                name={stageUser.name}
                                className="w-5 h-5 rounded-[6px] text-[0.46rem]"
                              />
                            ) : (
                              <div
                                className="w-5 h-5 rounded-[6px] shrink-0 flex items-center justify-center text-[0.46rem] font-extrabold bg-sage text-foreground"
                              >
                                ?
                              </div>
                            )}
                            <span className="text-[0.56rem] font-semibold text-muted-foreground whitespace-nowrap">
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
                            aria-label="Move card" className="relative before:absolute before:-inset-[11px] before:content-[''] w-[22px] h-[22px] rounded-[6px] bg-wash border-0 cursor-pointer flex items-center justify-center text-[10px] text-muted-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
                          >→</button>
                        </div>

                        {/* Platforms */}
                        {(cp.platforms || []).length > 0 && (
                          <div className="flex gap-1 mt-[6px]">
                            {cp.platforms.map(p => (
                              <PlatformBadge key={p} platform={p} subtle className="text-[0.52rem] px-[5px] py-px" />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}

                {colItems.length === 0 && (
                  <div className="px-3 py-6 text-center border border-dashed border-border rounded-[10px] bg-background/50">
                    <p className="text-[0.7rem] text-muted-foreground font-medium">No items</p>
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
            className="fixed z-[51] bg-card rounded-[14px] p-2 w-[210px] shadow-md border border-border"
            style={{
              left: Math.min(assignPopup.x, window.innerWidth - 220),
              top:  Math.min(assignPopup.y, window.innerHeight - 260),
            }}
          >
            <p className="text-[0.7rem] font-bold text-muted-foreground px-2 py-1 pb-[6px] border-b border-border mb-1 capitalize">
              Assign {assignPopup.role}
            </p>
            {(() => {
              const usersForRole = Object.values(userMap).filter(u => u.role === assignPopup.role)
              const currentUid   = clientTeamMap[assignPopup.item.client_id]?.[assignPopup.role]
              if (usersForRole.length === 0) return (
                <p className="text-[0.7rem] text-muted-foreground px-2 py-2 text-center">
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
                      "flex items-center gap-2 w-full px-2 py-[7px] min-h-11 rounded-lg border-0 cursor-pointer text-left transition-colors",
                      isCurrent ? "bg-wash" : "bg-transparent hover:bg-wash"
                    )}
                  >
                    <UserAvatar userId={u.id} name={u.name} size="sm" className="rounded-[7px] text-[0.5rem]" />
                    <span className="text-[0.75rem] font-semibold text-foreground flex-1">{u.name}</span>
                    {isCurrent && <span className="text-[0.6rem] text-muted-foreground">✓</span>}
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
            className="fixed z-[51] bg-card rounded-[14px] p-2 w-[200px] shadow-md border border-border"
            style={{
              left: Math.min(movePopup.x, window.innerWidth - 220),
              top:  Math.min(movePopup.y, window.innerHeight - 300),
            }}
          >
            <p className="text-[0.7rem] font-bold text-muted-foreground px-2 py-1 pb-[6px] border-b border-border mb-1">
              Move to…
            </p>
            {COLUMNS.map(col => {
              const isCurrent = movePopup.item.status === col.status
              return (
                <button
                  key={col.status}
                  disabled={isCurrent}
                  onClick={() => moveItem(movePopup.item, col.status)}
                  className={cn(
                    "flex items-center gap-2 w-full px-2 py-[7px] min-h-11 rounded-lg border-0 text-left transition-colors",
                    isCurrent
                      ? "bg-wash opacity-50 cursor-default"
                      : "bg-transparent cursor-pointer hover:bg-wash"
                  )}
                >
                  <StatusIcon name={col.icon} className="size-2.5 text-primary" />
                  <span className="text-[0.75rem] font-semibold text-foreground">{STATUS_STYLE[col.status].label}</span>
                  {isCurrent && (
                    <span className="text-[0.6rem] text-muted-foreground ml-auto">current</span>
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
