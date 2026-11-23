'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toaster'
import { UserAvatar } from '@/components/ui/user-avatar'
import { cn } from '@/lib/utils'
import { CONTENT_TYPE_STYLE } from '@/lib/color-map'
import { TypeIcon } from '@/components/ui/type-icon'
import { createClient } from '@/lib/supabase/client'
import type { TaskStatus, ContentType, ContentStatus, Role } from '@/lib/types'
import { isTaskOverdue } from '@/lib/overdue'

gsap.registerPlugin(useGSAP)

const STATUS_GROUPS: {
  key: TaskStatus
  label: string
  chipClass: string
  dotClass: string
}[] = [
  {
    key: 'overdue',
    label: 'Overdue',
    chipClass: 'bg-status-late text-status-late-fg',
    dotClass: 'bg-danger',
  },
  {
    key: 'in-progress',
    label: 'In Progress',
    chipClass: 'bg-status-active text-status-active-fg',
    dotClass: 'bg-primary',
  },
  {
    key: 'pending',
    label: 'To Do',
    chipClass: 'bg-status-neutral text-status-neutral-fg',
    dotClass: 'bg-muted-foreground',
  },
  {
    key: 'done',
    label: 'Done',
    chipClass: 'bg-status-done text-status-done-fg',
    dotClass: 'bg-success',
  },
]

/**
 * 'overdue' isn't a real, mutually-exclusive task status (a task is always
 * pending/in-progress/done — nothing ever sets status='overdue') — it's a
 * pending or in-progress task whose due_date has passed. Group membership
 * has to reflect that: the "Overdue" bucket pulls in overdue pending/
 * in-progress tasks, and the "To Do"/"In Progress" buckets exclude them so a
 * task doesn't render twice when viewing "All".
 */
function tasksInGroup<T extends { status: TaskStatus; due_date: string | null }>(tasks: T[], key: TaskStatus): T[] {
  if (key === 'overdue') return tasks.filter(isTaskOverdue)
  return tasks.filter(t => t.status === key && !isTaskOverdue(t))
}

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
  const { success, error: toastError } = useToast()
  const listRef = useRef<HTMLDivElement>(null)

  const [mounted, setMounted] = useState(false)
  const [role, setRole] = useState<Role>('admin')
  const [myName, setMyName] = useState('')
  const [tasks, setTasks] = useState<TaskRow[]>([])
  const [filter, setFilter] = useState<TaskStatus | 'all'>('all')
  const [loading, setLoading] = useState(true)
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set())
  const busyRef = useRef<Set<string>>(new Set())

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

  const filtered = filter === 'all' ? tasks : tasksInGroup(tasks, filter)

  const overdue = tasksInGroup(tasks, 'overdue').length
  const inProgress = tasksInGroup(tasks, 'in-progress').length
  const pending = tasksInGroup(tasks, 'pending').length
  const done = tasksInGroup(tasks, 'done').length
  const upNext = tasks
    .filter(t => t.status !== 'done')
    .sort((a, b) => a.due_date.localeCompare(b.due_date))
    .slice(0, 5)

  function setBusy(taskId: string, on: boolean) {
    if (on) busyRef.current.add(taskId)
    else busyRef.current.delete(taskId)
    setBusyIds(new Set(busyRef.current))
  }

  async function updateStatus(taskId: string, newStatus: TaskStatus) {
    if (busyRef.current.has(taskId)) return
    const task = tasks.find(t => t.id === taskId)
    if (!task) return
    const prevStatus = task.status
    setBusy(taskId, true)
    setTasks(prev => prev.map(t => (t.id === taskId ? { ...t, status: newStatus } : t)))

    try {
      const supabase = createClient()
      const { error } = await supabase.from('tasks').update({ status: newStatus }).eq('id', taskId)
      if (error) {
        setTasks(prev => prev.map(t => (t.id === taskId ? { ...t, status: prevStatus } : t)))
        toastError("Couldn't update task. Please try again.")
        return
      }

      let stageFailed = false
      if (newStatus === 'done') {
        const cp = task.content_pieces
        if (task.content_id && cp) {
          const targetStatus = ROLE_ADVANCES[task.role]
          if (targetStatus) {
            const currentIdx = STATUS_ORDER.indexOf(cp.status)
            const targetIdx = STATUS_ORDER.indexOf(targetStatus)
            if (currentIdx >= 0 && currentIdx < targetIdx) {
              const { error: stageError } = await supabase
                .from('content_pieces')
                .update({ status: targetStatus })
                .eq('id', task.content_id)
              if (stageError) stageFailed = true
            }
          }
        }
      }

      if (stageFailed) {
        toastError('Task marked done, but the content stage could not advance.')
      } else {
        success(
          newStatus === 'done' ? 'Marked done' : newStatus === 'in-progress' ? 'Task started' : 'Moved back to To Do'
        )
      }
    } catch {
      setTasks(prev => prev.map(t => (t.id === taskId ? { ...t, status: prevStatus } : t)))
      toastError("Couldn't update task. Please try again.")
    } finally {
      setBusy(taskId, false)
    }
  }

  function toggleDone(taskId: string) {
    const task = tasks.find(t => t.id === taskId)
    if (!task) return
    void updateStatus(taskId, task.status === 'done' ? 'pending' : 'done')
  }

  function advanceStatus(taskId: string) {
    const task = tasks.find(t => t.id === taskId)
    if (!task) return
    const flow: TaskStatus[] = ['pending', 'in-progress', 'done']
    const idx = flow.indexOf(task.status)
    if (idx >= 0 && idx < flow.length - 1) void updateStatus(taskId, flow[idx + 1])
  }

  return (
    <main className="page-main flex min-w-0 flex-1 flex-col overflow-y-auto">
      <section className="border-b border-white/4 bg-dark px-5 pt-[18px] pb-[14px] lg:px-6">
       <div className="mx-auto w-full max-w-6xl">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex-1">
            <p className="mb-px text-2xs uppercase tracking-[0.08em] text-dark-muted">
              {role === 'admin' ? 'All Team' : myName}
            </p>
            <h1 className="text-md font-extrabold leading-none text-dark-text">Tasks</h1>
          </div>

          <div className="flex items-center gap-3">
            {overdue > 0 && <StatChip value={overdue} label="overdue" valueClass="text-danger" />}
            <StatChip value={inProgress} label="active" valueClass="text-mint" />
            <StatChip value={pending} label="to do" valueClass="text-dark-text" />
            <StatChip value={done} label="done" valueClass="text-success" />
          </div>
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-0.5">
          <FilterPill
            label="All"
            active={filter === 'all'}
            colorClass="bg-mint text-dark"
            onClick={() => setFilter('all')}
          />
          {STATUS_GROUPS.map(g => {
            const count = tasksInGroup(tasks, g.key).length
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
       </div>
      </section>

      <div ref={listRef} className="flex-1 p-4 lg:p-6">
       <div className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0">
        {loading ? (
          <div className="flex flex-col gap-2" aria-busy="true" aria-label="Loading tasks">
            {[0, 1, 2, 3].map(i => (
              <Skeleton key={i} className="h-28 w-full rounded-xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="✅"
            title={
              filter === 'all'
                ? 'No tasks assigned'
                : `No ${STATUS_GROUPS.find(g => g.key === filter)?.label.toLowerCase()} tasks`
            }
          />
        ) : (
          STATUS_GROUPS.filter(g => filter === 'all' || filter === g.key).map(group => {
            const groupTasks = tasksInGroup(filtered, group.key)
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
                    const cfg = content ? CONTENT_TYPE_STYLE[content.type] : null
                    const isDone = task.status === 'done'
                    const isOverdue = isTaskOverdue(task)
                    const isBusy = busyIds.has(task.id)

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
                              disabled={isBusy}
                              aria-busy={isBusy}
                              className={cn(
                                isOverdue && !isDone && 'border-danger text-danger',
                                isDone && 'border-success bg-success text-success-foreground'
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
                                <Badge className={cn('gap-1 text-[0.55rem] font-bold', cfg.className)}>
                                  <TypeIcon name={cfg.icon} className="size-2" />
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
                                  disabled={isBusy}
                                  aria-busy={isBusy}
                                  className="min-h-11 px-4 md:min-h-0 md:px-2 bg-secondary text-muted-foreground hover:bg-primary hover:text-primary-foreground"
                                >
                                  {task.status === 'pending'
                                    ? 'Start'
                                    : task.status === 'in-progress'
                                      ? 'Complete'
                                      : 'Resume'}
                                </Button>
                              )}

                              {content && ['designer', 'videographer', 'editor'].includes(role) && (
                                <Button
                                  variant="outline"
                                  size="xs"
                                  onClick={() => router.push(`/assets?content=${content.id}`)}
                                  className="min-h-11 px-4 text-primary md:min-h-0 md:px-2"
                                >
                                  Upload
                                </Button>
                              )}

                              {content && (
                                <Button
                                  variant="outline"
                                  size="xs"
                                  onClick={() => router.push(`/brief/${content.id}`)}
                                  className="min-h-11 px-4 text-primary md:min-h-0 md:px-2"
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

        {!loading && (
          <aside className="hidden lg:block" aria-label="Task summary">
            <div className="sticky top-6 flex flex-col gap-4">
              <Card className="gap-0 border-border py-0 shadow-none">
                <CardContent className="py-5">
                  <p className="mb-3 text-sm font-bold text-foreground">Summary</p>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Overdue', value: overdue, cls: 'text-danger' },
                      { label: 'In progress', value: inProgress, cls: 'text-primary' },
                      { label: 'To do', value: pending, cls: 'text-foreground' },
                      { label: 'Done', value: done, cls: 'text-success' },
                    ].map(s => (
                      <div key={s.label} className="rounded-xl bg-secondary/60 px-3 py-2.5">
                        <p className={cn('text-xl leading-none font-extrabold', s.cls)}>{s.value}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{s.label}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="gap-0 border-border py-0 shadow-none">
                <CardContent className="py-5">
                  <p className="mb-3 text-sm font-bold text-foreground">Up next</p>
                  {upNext.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nothing due. You&apos;re all caught up.</p>
                  ) : (
                    <ul className="flex flex-col gap-1">
                      {upNext.map(t => {
                        const od = isTaskOverdue(t)
                        return (
                          <li key={t.id}>
                            <button
                              type="button"
                              disabled={!t.content_pieces}
                              onClick={() => t.content_pieces && router.push(`/brief/${t.content_pieces.id}`)}
                              className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-secondary/70 disabled:cursor-default disabled:hover:bg-transparent"
                            >
                              <span className={cn('size-2 shrink-0 rounded-full', od ? 'bg-danger' : 'bg-primary')} />
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-semibold text-foreground">{t.title}</span>
                                {t.clients && (
                                  <span className="block truncate text-xs text-muted-foreground">{t.clients.name}</span>
                                )}
                              </span>
                              <span className={cn('shrink-0 text-xs font-semibold', od ? 'text-danger' : 'text-ghost')}>
                                {relDate(t.due_date)}
                              </span>
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </div>
          </aside>
        )}
       </div>
      </div>
    </main>
  )
}
