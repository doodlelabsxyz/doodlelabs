'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { CONTENT_TYPE_STYLE } from '@/lib/color-map'
import { TypeIcon } from '@/components/ui/type-icon'
import { createClient } from '@/lib/supabase/client'
import type { ContentType } from '@/lib/types'

gsap.registerPlugin(useGSAP)

function relDate(dateStr: string) {
  const d = new Date(`${dateStr}T00:00:00`)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000)
  if (diff === 1) return 'Tomorrow'
  if (diff < 7) return `In ${diff} days`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

type TaskRow = {
  id: string
  title: string
  description: string
  due_date: string
  status: string
  content_pieces: { id: string; title: string; type: ContentType } | null
  clients: { id: string; name: string; brand_color: string } | null
}

type TaskFetchRow = Omit<TaskRow, 'content_pieces' | 'clients'> & {
  content_pieces: TaskRow['content_pieces'] | TaskRow['content_pieces'][]
  clients: TaskRow['clients'] | TaskRow['clients'][]
}

function groupByDay(tasks: TaskRow[]) {
  const groups = new Map<string, { label: string; tasks: TaskRow[] }>()
  tasks.forEach(t => {
    if (!groups.has(t.due_date)) {
      const label = new Date(`${t.due_date}T00:00:00`).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      })
      groups.set(t.due_date, { label, tasks: [] })
    }
    groups.get(t.due_date)!.tasks.push(t)
  })
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b))
}

export default function UpcomingTasksPage() {
  const router = useRouter()
  const listRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)
  const [tasks, setTasks] = useState<TaskRow[]>([])

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
      const isAdmin = profile?.role === 'admin'

      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const todayStr = today.toISOString().split('T')[0]

      let query = supabase
        .from('tasks')
        .select('id, title, description, due_date, status, content_pieces(id, title, type), clients(id, name, brand_color)')
        .gt('due_date', todayStr)
        .neq('status', 'done')
        .order('due_date')

      if (!isAdmin) {
        query = query.eq('assigned_to', user.id)
      }

      const { data } = await query
      setTasks(
        ((data || []) as TaskFetchRow[]).map(t => ({
          ...t,
          content_pieces: Array.isArray(t.content_pieces) ? (t.content_pieces[0] ?? null) : t.content_pieces,
          clients: Array.isArray(t.clients) ? (t.clients[0] ?? null) : t.clients,
        }))
      )
      setMounted(true)
    }

    void load()
  }, [router])

  useGSAP(() => {
    if (!mounted || !listRef.current) return
    gsap.fromTo(
      '[data-animate="task-card"]',
      { x: -10, opacity: 0 },
      { x: 0, opacity: 1, duration: 0.3, stagger: 0.04, ease: 'power2.out', clearProps: 'all' }
    )
  }, { dependencies: [mounted], scope: listRef })

  if (!mounted) {
    return (
      <main aria-busy="true" aria-label="Loading upcoming tasks" className="page-main flex min-w-0 flex-1 flex-col overflow-y-auto bg-background">
        <section className="border-b border-white/4 bg-dark px-5 pt-[18px] pb-4">
          <Skeleton className="mb-2 h-2.5 w-14 bg-white/10" />
          <Skeleton className="h-5 w-32 bg-white/10" />
        </section>
        <div className="flex-1 space-y-3 p-4">
          <Skeleton className="h-4 w-40" />
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      </main>
    )
  }

  const grouped = groupByDay(tasks)

  return (
    <main className="page-main flex min-w-0 flex-1 flex-col overflow-y-auto bg-background">
      <section className="border-b border-white/4 bg-dark px-5 pt-[18px] pb-4">
        <div className="mb-1 flex items-center gap-2.5">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => router.push('/tasks')}
            className="bg-white/6 text-dark-muted hover:bg-white/10 hover:text-dark-text"
          >
            ←
          </Button>
          <div>
            <p className="text-[0.6rem] uppercase tracking-[0.08em] text-dark-muted">Tasks</p>
            <h1 className="text-md font-extrabold leading-none text-dark-text">Upcoming</h1>
          </div>
          <Badge className="ml-auto border-0 bg-mint px-3 py-1 text-xs font-extrabold text-dark">
            {tasks.length} tasks
          </Badge>
        </div>
      </section>

      <div ref={listRef} className="flex-1 p-4">
        {tasks.length === 0 && (
          <Card className="border border-dashed border-border bg-card shadow-none">
            <CardContent className="py-15 text-center text-muted-foreground">
              <div className="mb-2 text-4xl">🎉</div>
              <p className="mb-1 text-sm font-bold text-foreground">Nothing upcoming</p>
              <p className="text-xs">All future tasks will appear here.</p>
            </CardContent>
          </Card>
        )}

        {grouped.map(([dateKey, { label: dayLabel, tasks: dayTasks }]) => (
          <section key={dateKey} className="mb-5">
            <div className="mb-2 flex items-center gap-2">
              <p className="text-xs font-bold uppercase tracking-[0.06em] text-muted-foreground">
                {dayLabel}
              </p>
              <div className="h-px flex-1 bg-border" />
              <span className="text-[0.6rem] font-semibold text-ghost">{relDate(dateKey)}</span>
            </div>

            <div className="flex flex-col gap-2">
              {dayTasks.map(task => {
                const cp = task.content_pieces
                const client = task.clients
                const tc = cp ? CONTENT_TYPE_STYLE[cp.type] : CONTENT_TYPE_STYLE.graphic

                return (
                  <Card
                    key={task.id}
                    data-animate="task-card"
                    onClick={() => cp && router.push(`/brief/${cp.id}`)}
                    className={cn(
                      'group gap-0 border border-border py-0 shadow-none transition-all',
                      cp && 'cursor-pointer hover:translate-x-1 hover:shadow-sm'
                    )}
                  >
                    <CardContent className="flex items-start gap-3 py-4">
                      <TypeIcon name={tc.icon} className="mt-1 size-2.5 text-primary" />

                      <div className="min-w-0 flex-1">
                        <p className="mb-1 text-sm font-bold leading-5 text-foreground">
                          {task.title}
                        </p>
                        <p className="mb-2 text-xs leading-5 text-muted-foreground">
                          {task.description}
                        </p>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {client && (
                            <div
                              style={{ '--client-color': client.brand_color } as React.CSSProperties}
                              className="flex items-center gap-1"
                            >
                              <div className="size-1.5 rounded-full bg-[var(--client-color)]" />
                              <span className="text-[0.62rem] text-muted-foreground">{client.name}</span>
                            </div>
                          )}
                          {cp && (
                            <Badge className={cn('gap-1 text-[0.58rem] font-bold', tc.className)}>
                              <TypeIcon name={tc.icon} className="size-2" />
                              {tc.label}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {cp && (
                        <span className="shrink-0 text-[0.62rem] font-bold text-primary">
                          Brief →
                        </span>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </section>
        ))}
      </div>
    </main>
  )
}
