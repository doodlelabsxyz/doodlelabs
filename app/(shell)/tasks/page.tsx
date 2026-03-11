'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { UserAvatar } from '@/components/ui/user-avatar'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import type { TaskStatus, ContentType, ContentStatus, Role } from '@/lib/types'

gsap.registerPlugin(useGSAP)

const TYPE_CFG: Record<ContentType, { label: string; badgeClass: string }> = {
  graphic: { label: 'Graphic', badgeClass: 'bg-coral text-white' },
  video: { label: 'Video', badgeClass: 'bg-lemon text-amber-950' },
  reel: { label: 'Reel', badgeClass: 'bg-mint text-white' },
  story: { label: 'Story', badgeClass: 'bg-lavender text-white' },
}

const STATUS_GROUPS: {
  key: TaskStatus
  label: string
  chipClass: string
  dotClass: string
}[] = [
  {
    key: 'overdue',
    label: 'Overdue',
    chipClass: 'bg-danger/15 text-danger',
    dotClass: 'bg-danger',
  },
  {
    key: 'in-progress',
    label: 'In Progress',
    chipClass: 'bg-sky/15 text-sky',
    dotClass: 'bg-sky',
  },
  {
    key: 'pending',
    label: 'To Do',
    chipClass: 'bg-lemon/20 text-amber-700',
    dotClass: 'bg-lemon',
  },
  {
    key: 'done',
    label: 'Done',
    chipClass: 'bg-success/15 text-success',
    dotClass: 'bg-success',
  },
]

const ROLE_ADVANCES: Partial<Record<string, ContentStatus>> = {
  writer: 'brief-ready',
  designer: 'in-editing',
  videographer: 'in-editing',
  editor: 'ready-for-review',
  poster: 'posted',
}

const STATUS_ORDER: ContentStatus[] = [
  'planned',
  'brief-ready',
  'in-design',
  'in-editing',
  'ready-for-review',
  'client-review',
  'approved',
  'scheduled',
  'posted',
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
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  if (diff < 0) return `${Math.abs(diff)}d overdue`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function FilterPill({
  label,
  active,
  colorClass,
  onClick,
}: {
  label: string
  active: boolean
  colorClass: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap transition-colors',
        active ? colorClass : 'bg-white/7 text-dark-muted hover:bg-white/10 hover:text-dark-text'
      )}
    >
      {label}
    </button>
  )
}

function StatChip({
  value,
  label,
  valueClass,
}: {
  value: number
  label: string
  valueClass: string
}) {
  return (
    <div className="text-center">
      <p className={cn('text-[0.95rem] leading-none font-extrabold', valueClass)}>{value}</p>
      <p className="mt-0.5 text-[0.55rem] text-dark-muted">{label}</p>
    </div>
  )
}

export default function TasksPage() {
  const router = useRouter()
  const listRef = useRef<HTMLDivElement>(null)

  const [mounted, setMounted] = useState(false)
  const [role, setRole] = useState<Role>('admin')
  const [myName, setMyName] = useState('')
  const [tasks, setTasks] = useState<TaskRow[]>([])
  const [filter, setFilter] = useState<TaskStatus | 'all'>('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
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

      if (!rawTasks) {
        setLoading(false)
        setMounted(true)
        return
      }

      let assigneeMap: Record<string, TaskRow['assignee']> = {}
      if (userRole === 'admin') {
        const assigneeIds = [...new Set(rawTasks.map(t => t.assigned_to))]
        const { data: assignees } = await supabase.from('users').select('id, name').in('id', assigneeIds)
        if (assignees) assigneeMap = Object.fromEntries(assignees.map(a => [a.id, a]))
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

    void load()
  }, [])

  useGSAP(() => {
    if (!mounted || !listRef.current) return
    gsap.fromTo(
      '[data-animate="task-card"]',
      { x: -12, opacity: 0 },
      { x: 0, opacity: 1, duration: 0.35, stagger: 0.05, ease: 'power3.out', clearProps: 'all' }
    )
  }, { dependencies: [mounted, filter], scope: listRef })

  const filtered = filter === 'all' ? tasks : tasks.filter(t => t.status === filter)

  const overdue = tasks.filter(t => t.status === 'overdue').length
  const inProgress = tasks.filter(t => t.status === 'in-progress').length
  const pending = tasks.filter(t => t.status === 'pending').length
  const done = tasks.filter(t => t.status === 'done').length

  const updateStatus = useCallback(
    async (taskId: string, newStatus: TaskStatus) => {
      setTasks(prev => prev.map(t => (t.id === taskId ? { ...t, status: newStatus } : t)))

      const supabase = createClient()
      await supabase.from('tasks').update({ status: newStatus }).eq('id', taskId)

      if (newStatus === 'done') {
        const task = tasks.find(t => t.id === taskId)
        const cp = task?.content_pieces
        if (task?.content_id && cp) {
          const targetStatus = ROLE_ADVANCES[task.role]
          if (targetStatus) {
            const currentIdx = STATUS_ORDER.indexOf(cp.status)
            const targetIdx = STATUS_ORDER.indexOf(targetStatus)
            if (currentIdx >= 0 && currentIdx < targetIdx) {
              await supabase.from('content_pieces').update({ status: targetStatus }).eq('id', task.content_id)
            }
          }
        }
      }
    },
    [tasks]
  )

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
    <main className="page-main flex min-w-0 flex-1 flex-col overflow-y-auto">
      <section className="border-b border-white/4 bg-dark px-5 pt-[18px] pb-[14px]">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex-1">
            <p className="mb-px text-2xs uppercase tracking-[0.08em] text-dark-muted">
              {role === 'admin' ? 'All Team' : myName}
            </p>
            <h1 className="text-md font-extrabold leading-none text-dark-text">Tasks</h1>
          </div>

          <div className="flex items-center gap-3">
            {overdue > 0 && <StatChip value={overdue} label="overdue" valueClass="text-danger" />}
            <StatChip value={inProgress} label="active" valueClass="text-sky" />
            <StatChip value={pending} label="to do" valueClass="text-lemon" />
            <StatChip value={done} label="done" valueClass="text-success" />
          </div>
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-0.5">
          <FilterPill
            label="All"
            active={filter === 'all'}
            colorClass="bg-coral text-white"
            onClick={() => setFilter('all')}
          />
          {STATUS_GROUPS.map(g => {
            const count = tasks.filter(t => t.status === g.key).length
            return (
              <FilterPill
                key={g.key}
                label={`${g.label} (${count})`}
                active={filter === g.key}
                colorClass={g.chipClass}
                onClick={() => setFilter(filter === g.key ? 'all' : g.key)}
              />
            )
          })}
        </div>
      </section>

      <div ref={listRef} className="flex-1 p-4">
        {loading ? (
          <div className="flex justify-center px-5 py-15">
            <p className="text-sm text-muted-foreground">Loading tasks...</p>
          </div>
        ) : filtered.length === 0 ? (
          <Card className="border border-dashed border-border bg-card shadow-none">
            <CardContent className="flex flex-col items-center justify-center gap-3 py-15 text-center">
              <div className="flex size-[72px] items-center justify-center rounded-[18px] border border-dashed border-border bg-secondary">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="opacity-30">
                  <rect x="3" y="4" width="18" height="16" rx="3" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-muted-foreground">
                {filter === 'all'
                  ? 'No tasks assigned'
                  : `No ${STATUS_GROUPS.find(g => g.key === filter)?.label.toLowerCase()} tasks`}
              </p>
            </CardContent>
          </Card>
        ) : (
          STATUS_GROUPS.filter(g => filter === 'all' || filter === g.key).map(group => {
            const groupTasks = filtered.filter(t => t.status === group.key)
            if (groupTasks.length === 0) return null

            return (
              <section key={group.key} className="mb-5">
                {filter === 'all' && (
                  <div className="mb-2 flex items-center gap-2 px-1">
                    <div className={cn('size-2 rounded-full', group.dotClass)} />
                    <span className="text-sm font-bold text-foreground">{group.label}</span>
                    <Badge className={cn('border-0 text-[0.656rem] font-bold', group.chipClass)}>
                      {groupTasks.length}
                    </Badge>
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  {groupTasks.map(task => {
                    const content = task.content_pieces
                    const client = task.clients
                    const cfg = content ? TYPE_CFG[content.type] : null
                    const isDone = task.status === 'done'
                    const isOverdue = task.status === 'overdue'

                    return (
                      <Card
                        key={task.id}
                        data-animate="task-card"
                        className={cn(
                          'group gap-0 overflow-hidden py-0 shadow-none transition-all hover:-translate-y-0.5 hover:shadow-md',
                          isOverdue ? 'border-danger/40' : 'border-border',
                          isDone && 'opacity-60'
                        )}
                      >
                        <div className="flex items-stretch">
                          <div className="flex w-12 shrink-0 items-center justify-center border-r border-border/80">
                            <Checkbox
                              checked={isDone}
                              onCheckedChange={() => toggleDone(task.id)}
                              className={cn(
                                isOverdue && !isDone && 'border-danger text-danger',
                                isDone && 'border-success bg-success text-white'
                              )}
                            />
                          </div>

                          <CardContent className="min-w-0 flex-1 py-4">
                            <div className="mb-1.5 flex items-start gap-2">
                              <p
                                className={cn(
                                  'flex-1 text-sm leading-5 font-bold text-foreground',
                                  isDone && 'line-through'
                                )}
                              >
                                {task.title}
                              </p>
                              {cfg && (
                                <Badge className={cn('border-0 text-[0.55rem] font-bold', cfg.badgeClass)}>
                                  {cfg.label}
                                </Badge>
                              )}
                            </div>

                            <p className="mb-2 line-clamp-2 text-xs leading-5 text-muted-foreground">
                              {task.description}
                            </p>

                            <div className="flex flex-wrap items-center gap-2">
                              {client && (
                                <div
                                  style={{ '--client-color': client.brand_color } as React.CSSProperties}
                                  className="flex items-center gap-1"
                                >
                                  <div className="size-1.5 rounded-[2px] bg-[var(--client-color)]" />
                                  <span className="text-2xs font-semibold text-muted-foreground">
                                    {client.name}
                                  </span>
                                </div>
                              )}

                              <span
                                className={cn(
                                  'text-2xs font-semibold',
                                  isOverdue ? 'text-danger' : 'text-ghost'
                                )}
                              >
                                {relDate(task.due_date)}
                              </span>

                              <div className="flex-1" />

                              {task.assignee && role === 'admin' && (
                                <div className="flex items-center gap-1">
                                  <UserAvatar userId={task.assignee.id} name={task.assignee.name} size="sm" />
                                  <span className="text-2xs text-muted-foreground">
                                    {task.assignee.name.split(' ')[0]}
                                  </span>
                                </div>
                              )}

                              {!isDone && (
                                <Button
                                  variant="secondary"
                                  size="xs"
                                  onClick={() => advanceStatus(task.id)}
                                  className="bg-secondary text-muted-foreground hover:bg-coral hover:text-white"
                                >
                                  {task.status === 'pending'
                                    ? 'Start'
                                    : task.status === 'in-progress'
                                      ? 'Complete'
                                      : 'Resume'}
                                </Button>
                              )}

                              {content && (
                                <Button
                                  variant="outline"
                                  size="xs"
                                  onClick={() => router.push(`/brief/${content.id}`)}
                                  className="text-sky"
                                >
                                  Brief
                                </Button>
                              )}
                            </div>
                          </CardContent>
                        </div>
                      </Card>
                    )
                  })}
                </div>
              </section>
            )
          })
        )}
      </div>
    </main>
  )
}
