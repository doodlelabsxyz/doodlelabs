'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { createClient } from '@/lib/supabase/client'
import type { TaskStatus, ContentType, ContentStatus, Role } from '@/lib/types'
import { getInitials, getAvatarColor } from '@/lib/utils'

gsap.registerPlugin(useGSAP)

const TYPE_CFG: Record<ContentType, { bg: string; text: string; label: string }> = {
  graphic: { bg: 'hsl(14,72%,62%)',  text: '#fff',    label: 'Graphic' },
  video:   { bg: 'hsl(40,95%,62%)',  text: '#3a2800', label: 'Video'   },
  reel:    { bg: 'hsl(161,58%,50%)', text: '#fff',    label: 'Reel'    },
  story:   { bg: 'hsl(268,60%,68%)', text: '#fff',    label: 'Story'   },
}

const STATUS_GROUPS: { key: TaskStatus; label: string; color: string; dotColor: string }[] = [
  { key: 'overdue',     label: 'Overdue',     color: 'hsl(4,78%,93%)',   dotColor: 'hsl(4,75%,56%)'   },
  { key: 'in-progress', label: 'In Progress', color: 'hsl(200,75%,92%)', dotColor: 'hsl(200,82%,58%)' },
  { key: 'pending',     label: 'To Do',       color: 'hsl(40,90%,92%)',  dotColor: 'hsl(40,95%,55%)'  },
  { key: 'done',        label: 'Done',        color: 'hsl(154,45%,90%)', dotColor: 'hsl(154,50%,40%)' },
]

// Pipeline advancement: when a task is marked done, which content status should be set?
const ROLE_ADVANCES: Partial<Record<string, ContentStatus>> = {
  writer:       'brief-ready',
  designer:     'in-editing',
  videographer: 'in-editing',
  editor:       'ready-for-review',
  poster:       'posted',
}

// Ordered pipeline stages — used to prevent regression
const STATUS_ORDER: ContentStatus[] = [
  'planned', 'brief-ready', 'in-design', 'in-editing',
  'ready-for-review', 'client-review', 'approved', 'scheduled', 'posted',
]

type TaskRow = {
  id: string
  title: string
  description: string
  due_date: string
  status: TaskStatus
  role: string
  content_id: string
  client_id: string
  assigned_to: string
  content_pieces: { id: string; title: string; type: ContentType; status: ContentStatus } | null
  clients: { id: string; name: string; brand_color: string } | null
  assignee: { id: string; name: string } | null
}

function relDate(dateStr: string) {
  const d = new Date(dateStr)
  const today = new Date(); today.setHours(0,0,0,0)
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  if (diff < 0) return `${Math.abs(diff)}d overdue`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function TasksPage() {
  const router  = useRouter()
  const listRef = useRef<HTMLDivElement>(null)

  const [mounted,  setMounted]  = useState(false)
  const [role,     setRole]     = useState<Role>('admin')
  const [myName,   setMyName]   = useState('')
  const [tasks,    setTasks]    = useState<TaskRow[]>([])
  const [filter,   setFilter]   = useState<TaskStatus | 'all'>('all')
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('users')
        .select('name, role')
        .eq('id', user.id)
        .single()

      const userRole = (profile?.role as Role) || 'admin'
      setRole(userRole)
      setMyName(profile?.name || '')

      const { data: rawTasks } = await supabase
        .from('tasks')
        .select(`
          id, title, description, due_date, status, role, content_id, client_id, assigned_to,
          content_pieces (id, title, type, status),
          clients (id, name, brand_color)
        `)
        .order('due_date', { ascending: true })

      if (!rawTasks) { setLoading(false); setMounted(true); return }

      let assigneeMap: Record<string, TaskRow['assignee']> = {}
      if (userRole === 'admin') {
        const assigneeIds = [...new Set(rawTasks.map(t => t.assigned_to))]
        const { data: assignees } = await supabase
          .from('users')
          .select('id, name')
          .in('id', assigneeIds)
        if (assignees) {
          assigneeMap = Object.fromEntries(assignees.map(a => [a.id, a]))
        }
      }

      const mapped: TaskRow[] = rawTasks.map(t => ({
        ...t,
        content_pieces: Array.isArray(t.content_pieces) ? t.content_pieces[0] ?? null : t.content_pieces,
        clients: Array.isArray(t.clients) ? t.clients[0] ?? null : t.clients,
        assignee: assigneeMap[t.assigned_to] ?? null,
      }))

      setTasks(mapped)
      setLoading(false)
      setMounted(true)
    }
    load()
  }, [])

  useGSAP(() => {
    if (!mounted || !listRef.current) return
    gsap.fromTo('.task-card',
      { x: -12, opacity: 0 },
      { x: 0, opacity: 1, duration: 0.35, stagger: 0.05, ease: 'power3.out', clearProps: 'all' }
    )
  }, { dependencies: [mounted, filter], scope: listRef })

  const filtered = filter === 'all' ? tasks : tasks.filter(t => t.status === filter)

  const overdue    = tasks.filter(t => t.status === 'overdue').length
  const inProgress = tasks.filter(t => t.status === 'in-progress').length
  const pending    = tasks.filter(t => t.status === 'pending').length
  const done       = tasks.filter(t => t.status === 'done').length

  const updateStatus = useCallback(async (taskId: string, newStatus: TaskStatus) => {
    // Optimistic update
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t))

    const supabase = createClient()
    await supabase.from('tasks').update({ status: newStatus }).eq('id', taskId)

    // When a task is marked done, advance the linked content piece in the pipeline
    if (newStatus === 'done') {
      const task = tasks.find(t => t.id === taskId)
      const cp = task?.content_pieces
      if (task?.content_id && cp) {
        const targetStatus = ROLE_ADVANCES[task.role]
        if (targetStatus) {
          const currentIdx = STATUS_ORDER.indexOf(cp.status)
          const targetIdx  = STATUS_ORDER.indexOf(targetStatus)
          // Only advance forward, never regress
          if (currentIdx >= 0 && currentIdx < targetIdx) {
            await supabase
              .from('content_pieces')
              .update({ status: targetStatus })
              .eq('id', task.content_id)
          }
        }
      }
    }
  }, [tasks])

  function toggleDone(taskId: string) {
    const task = tasks.find(t => t.id === taskId)
    if (!task) return
    updateStatus(taskId, task.status === 'done' ? 'pending' : 'done')
  }

  function advanceStatus(taskId: string) {
    const task = tasks.find(t => t.id === taskId)
    if (!task) return
    const flow: TaskStatus[] = ['pending', 'in-progress', 'done']
    const idx = flow.indexOf(task.status)
    if (idx >= 0 && idx < flow.length - 1) updateStatus(taskId, flow[idx + 1])
    else if (task.status === 'overdue') updateStatus(taskId, 'in-progress')
  }

  if (!mounted) return null

  return (
    <main style={{ flex: 1, minWidth: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <div style={{
        background: '#0F1A14', padding: '18px 20px 14px', flexShrink: 0,
        borderBottom: '1px solid rgba(255,255,255,0.04)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '0.656rem', color: 'hsl(140,7%,48%)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '1px' }}>
              {role === 'admin' ? 'All Team' : myName}
            </p>
            <h1 style={{ fontSize: '1.167rem', fontWeight: 800, color: 'hsl(42,22%,84%)', lineHeight: 1 }}>Tasks</h1>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {overdue > 0 && <StatChip value={overdue} label="overdue" color="hsl(4,75%,56%)" />}
            <StatChip value={inProgress} label="active" color="hsl(200,82%,58%)" />
            <StatChip value={pending} label="to do" color="hsl(40,95%,55%)" />
            <StatChip value={done} label="done" color="hsl(154,50%,40%)" />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px' }}>
          <FilterPill label="All" active={filter === 'all'} color="hsl(25,82%,60%)" onClick={() => setFilter('all')} />
          {STATUS_GROUPS.map(g => {
            const count = tasks.filter(t => t.status === g.key).length
            return (
              <FilterPill
                key={g.key}
                label={`${g.label} (${count})`}
                active={filter === g.key}
                color={g.dotColor}
                onClick={() => setFilter(filter === g.key ? 'all' : g.key)}
              />
            )
          })}
        </div>
      </div>

      {/* ── Task list ─────────────────────────────────────────────────────── */}
      <div ref={listRef} style={{ padding: '16px', flex: 1 }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 20px' }}>
            <p style={{ fontSize: '0.875rem', color: 'hsl(24,10%,54%)' }}>Loading tasks…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '60px 20px' }}>
            <div style={{
              width: '72px', height: '72px', borderRadius: '18px',
              background: 'hsl(42,18%,94%)', border: '1.5px dashed hsl(38,14%,85%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.3 }}>
                <rect x="3" y="4" width="18" height="16" rx="3" stroke="hsl(24,10%,44%)" strokeWidth="1.5"/>
                <path d="M9 12l2 2 4-4" stroke="hsl(24,10%,44%)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'hsl(24,10%,44%)' }}>
              {filter === 'all' ? 'No tasks assigned' : `No ${STATUS_GROUPS.find(g => g.key === filter)?.label.toLowerCase()} tasks`}
            </p>
          </div>
        ) : (
          STATUS_GROUPS.filter(g => filter === 'all' || filter === g.key).map(group => {
            const groupTasks = filtered.filter(t => t.status === group.key)
            if (groupTasks.length === 0) return null
            return (
              <div key={group.key} style={{ marginBottom: '20px' }}>
                {filter === 'all' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', padding: '0 4px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: group.dotColor }} />
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'hsl(24,20%,11%)' }}>{group.label}</span>
                    <span style={{
                      fontSize: '0.656rem', fontWeight: 700,
                      padding: '2px 7px', borderRadius: '99px',
                      background: group.color, color: group.dotColor,
                    }}>
                      {groupTasks.length}
                    </span>
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {groupTasks.map(task => {
                    const content = task.content_pieces
                    const client  = task.clients
                    const cfg     = content ? TYPE_CFG[content.type] : null
                    const isDone  = task.status === 'done'
                    const isOverdue = task.status === 'overdue'

                    return (
                      <div
                        key={task.id}
                        className="task-card"
                        style={{
                          background: 'hsl(42,25%,99%)',
                          borderRadius: '14px',
                          border: isOverdue ? '1.5px solid hsl(4,75%,56%)' : '1px solid hsl(38,14%,90%)',
                          overflow: 'hidden',
                          opacity: isDone ? 0.6 : 1,
                          transition: 'transform 0.15s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.15s ease, opacity 0.3s ease',
                        }}
                        onMouseEnter={e => {
                          const el = e.currentTarget as HTMLDivElement
                          el.style.transform = 'translateY(-2px)'
                          el.style.boxShadow = '0 6px 20px rgba(15,26,20,0.08)'
                        }}
                        onMouseLeave={e => {
                          const el = e.currentTarget as HTMLDivElement
                          el.style.transform = ''
                          el.style.boxShadow = ''
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'stretch' }}>
                          {/* Checkbox */}
                          <button
                            onClick={() => toggleDone(task.id)}
                            style={{
                              width: '48px', flexShrink: 0,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              background: isDone ? 'hsl(154,45%,92%)' : 'transparent',
                              border: 'none', cursor: 'pointer',
                              borderRight: '1px solid hsl(38,14%,92%)',
                            }}
                          >
                            <div style={{
                              width: '22px', height: '22px', borderRadius: '6px',
                              border: `2px solid ${isDone ? 'hsl(154,50%,40%)' : isOverdue ? 'hsl(4,75%,56%)' : 'hsl(38,14%,82%)'}`,
                              background: isDone ? 'hsl(154,50%,40%)' : 'transparent',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              transition: 'background 0.2s, border-color 0.2s',
                            }}>
                              {isDone && (
                                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                  <path d="M3 6l2 2 4-4" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              )}
                            </div>
                          </button>

                          {/* Content */}
                          <div style={{ flex: 1, padding: '12px 14px', minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '6px' }}>
                              <p style={{
                                flex: 1, fontSize: '0.85rem', fontWeight: 700,
                                color: 'hsl(24,20%,11%)', lineHeight: 1.3,
                                textDecoration: isDone ? 'line-through' : 'none',
                              }}>
                                {task.title}
                              </p>
                              {cfg && (
                                <span style={{
                                  padding: '2px 6px', borderRadius: '4px',
                                  background: cfg.bg, color: cfg.text,
                                  fontSize: '0.55rem', fontWeight: 700, flexShrink: 0,
                                }}>
                                  {cfg.label}
                                </span>
                              )}
                            </div>

                            <p style={{
                              fontSize: '0.75rem', color: 'hsl(24,10%,54%)', lineHeight: 1.4,
                              marginBottom: '8px',
                              overflow: 'hidden', display: '-webkit-box',
                              WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                            }}>
                              {task.description}
                            </p>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              {client && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <div style={{ width: '6px', height: '6px', borderRadius: '2px', background: client.brand_color }} />
                                  <span style={{ fontSize: '0.656rem', fontWeight: 600, color: 'hsl(24,10%,44%)' }}>{client.name}</span>
                                </div>
                              )}

                              <span style={{
                                fontSize: '0.656rem', fontWeight: 600,
                                color: isOverdue ? 'hsl(4,72%,45%)' : 'hsl(24,8%,64%)',
                              }}>
                                {relDate(task.due_date)}
                              </span>

                              <div style={{ flex: 1 }} />

                              {task.assignee && role === 'admin' && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                  <div style={{
                                    width: '20px', height: '20px', borderRadius: '6px',
                                    background: getAvatarColor(task.assignee.id),
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '0.48rem', fontWeight: 800, color: '#fff',
                                  }}>
                                    {getInitials(task.assignee.name)}
                                  </div>
                                  <span style={{ fontSize: '0.656rem', color: 'hsl(24,10%,54%)' }}>{task.assignee.name.split(' ')[0]}</span>
                                </div>
                              )}

                              {!isDone && (
                                <button
                                  onClick={() => advanceStatus(task.id)}
                                  style={{
                                    padding: '3px 8px', borderRadius: '6px',
                                    background: 'hsl(42,18%,93%)', border: 'none',
                                    fontSize: '0.6rem', fontWeight: 700, color: 'hsl(24,10%,44%)',
                                    cursor: 'pointer', transition: 'background 0.1s, color 0.1s',
                                  }}
                                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'hsl(25,82%,60%)'; (e.currentTarget as HTMLButtonElement).style.color = '#fff' }}
                                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'hsl(42,18%,93%)'; (e.currentTarget as HTMLButtonElement).style.color = 'hsl(24,10%,44%)' }}
                                >
                                  {task.status === 'pending' ? 'Start →' : task.status === 'in-progress' ? 'Complete →' : 'Resume →'}
                                </button>
                              )}

                              {content && (
                                <button
                                  onClick={() => router.push(`/brief/${content.id}`)}
                                  style={{
                                    padding: '3px 8px', borderRadius: '6px',
                                    background: 'transparent', border: '1px solid hsl(38,14%,88%)',
                                    fontSize: '0.6rem', fontWeight: 600, color: 'hsl(200,82%,50%)',
                                    cursor: 'pointer',
                                  }}
                                >
                                  Brief
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })
        )}
      </div>
    </main>
  )
}

function StatChip({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <p style={{ fontSize: '0.95rem', fontWeight: 800, color, lineHeight: 1 }}>{value}</p>
      <p style={{ fontSize: '0.55rem', color: 'hsl(140,7%,48%)', marginTop: '2px' }}>{label}</p>
    </div>
  )
}

function FilterPill({ label, active, color, onClick }: { label: string; active: boolean; color: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      padding: '4px 11px', borderRadius: '9999px', border: 'none',
      background: active ? color : 'rgba(255,255,255,0.07)',
      color: active ? '#fff' : 'hsl(140,7%,48%)',
      fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
      transition: 'background 0.15s',
    }}>
      {label}
    </button>
  )
}
