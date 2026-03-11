'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import type { ContentType } from '@/lib/types'

gsap.registerPlugin(useGSAP)

const TYPE_CFG: Record<ContentType, { label: string; badgeClass: string }> = {
  graphic: { label: 'Graphic', badgeClass: 'bg-coral/15 text-coral' },
  video: { label: 'Video', badgeClass: 'bg-lemon/20 text-amber-700' },
  reel: { label: 'Reel', badgeClass: 'bg-mint/15 text-mint' },
  story: { label: 'Story', badgeClass: 'bg-lavender/15 text-lavender' },
}

type TaskRow = {
  id: string
  title: string
  due_date: string
  status: string
  content_pieces: { id: string; type: ContentType } | null
  clients: { id: string; name: string; brand_color: string } | null
}

type TaskFetchRow = Omit<TaskRow, 'content_pieces' | 'clients'> & {
  content_pieces: TaskRow['content_pieces'] | TaskRow['content_pieces'][]
  clients: TaskRow['clients'] | TaskRow['clients'][]
}

export default function DoneTasksPage() {
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

      let query = supabase
        .from('tasks')
        .select('id, title, due_date, status, content_pieces(id, type), clients(id, name, brand_color)')
        .eq('status', 'done')
        .order('due_date', { ascending: false })

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
      '[data-animate="done-card"]',
      { y: 8, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.3, stagger: 0.04, ease: 'power2.out', clearProps: 'all' }
    )
  }, { dependencies: [mounted], scope: listRef })

  if (!mounted) return null

  return (
    <main className="page-main flex min-w-0 flex-1 flex-col overflow-y-auto bg-background">
      <section className="border-b border-white/4 bg-dark px-5 pt-[18px] pb-4">
        <div className="flex items-center gap-2.5">
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
            <h1 className="text-md font-extrabold leading-none text-dark-text">Completed</h1>
          </div>
          <Badge className="ml-auto border-0 bg-success/25 px-3 py-1 text-xs font-extrabold text-success">
            {tasks.length} done
          </Badge>
        </div>
      </section>

      <div ref={listRef} className="flex-1 p-4">
        {tasks.length === 0 && (
          <Card className="border border-dashed border-border bg-card shadow-none">
            <CardContent className="py-15 text-center text-muted-foreground">
              <div className="mb-2 text-4xl">📋</div>
              <p className="mb-1 text-sm font-bold text-foreground">Nothing completed yet</p>
              <p className="text-xs">Finished tasks will appear here.</p>
            </CardContent>
          </Card>
        )}

        {tasks.length > 0 && (
          <Card className="mb-4 border border-success/25 bg-success/10 shadow-none">
            <CardContent className="flex items-center gap-3 py-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-success text-xl text-white">
                ✓
              </div>
              <div>
                <p className="text-sm font-extrabold text-success">
                  {tasks.length} task{tasks.length !== 1 ? 's' : ''} completed
                </p>
                <p className="text-xs text-success/80">Great work. Keep the momentum going.</p>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex flex-col gap-2">
          {tasks.map(task => {
            const cp = task.content_pieces
            const client = task.clients
            const tc = cp ? TYPE_CFG[cp.type] : TYPE_CFG.graphic

            return (
              <Card
                key={task.id}
                data-animate="done-card"
                onClick={() => cp && router.push(`/brief/${cp.id}`)}
                className={cn(
                  'gap-0 border border-border py-0 opacity-85 shadow-none transition-all',
                  cp && 'cursor-pointer hover:-translate-y-0.5 hover:shadow-sm'
                )}
              >
                <CardContent className="flex items-center gap-3 py-4">
                  <div className="flex size-[26px] shrink-0 items-center justify-center rounded-full border border-success/50 bg-success/10 text-[0.75rem] font-extrabold text-success">
                    ✓
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="mb-1 text-sm font-semibold leading-5 text-muted-foreground line-through">
                      {task.title}
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {client && (
                        <div
                          style={{ '--client-color': client.brand_color } as React.CSSProperties}
                          className="flex items-center gap-1"
                        >
                          <div className="size-1.5 rounded-full bg-[var(--client-color)]" />
                          <span className="text-[0.6rem] text-muted-foreground">{client.name}</span>
                        </div>
                      )}
                      {cp && (
                        <Badge className={cn('border-0 text-[0.58rem] font-bold', tc.badgeClass)}>
                          {tc.label}
                        </Badge>
                      )}
                      <span className="ml-auto text-[0.6rem] font-semibold text-success">
                        {new Date(`${task.due_date}T00:00:00`).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </main>
  )
}
