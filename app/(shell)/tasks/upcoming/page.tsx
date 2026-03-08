'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { createClient } from '@/lib/supabase/client'
import type { ContentType } from '@/lib/types'

gsap.registerPlugin(useGSAP)

const TYPE_CFG: Record<ContentType, { bg: string; text: string; label: string }> = {
  graphic: { bg: 'hsl(14,72%,62%)',  text: '#fff',    label: 'Graphic' },
  video:   { bg: 'hsl(40,95%,62%)',  text: '#3a2800', label: 'Video'   },
  reel:    { bg: 'hsl(161,58%,50%)', text: '#fff',    label: 'Reel'    },
  story:   { bg: 'hsl(268,60%,68%)', text: '#fff',    label: 'Story'   },
}

function relDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  const today = new Date(); today.setHours(0,0,0,0)
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000)
  if (diff === 1) return 'Tomorrow'
  if (diff < 7) return `In ${diff} days`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

type TaskRow = {
  id: string; title: string; description: string; due_date: string; status: string
  content_pieces: { id: string; title: string; type: ContentType } | null
  clients: { id: string; name: string; brand_color: string } | null
}

function groupByDay(tasks: TaskRow[]) {
  const groups = new Map<string, { label: string; tasks: TaskRow[] }>()
  tasks.forEach(t => {
    if (!groups.has(t.due_date)) {
      const label = new Date(t.due_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
      groups.set(t.due_date, { label, tasks: [] })
    }
    groups.get(t.due_date)!.tasks.push(t)
  })
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b))
}

export default function UpcomingTasksPage() {
  const router  = useRouter()
  const listRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)
  const [tasks,   setTasks]   = useState<TaskRow[]>([])

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

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
        .neq('status', 'overdue')
        .order('due_date')

      if (!isAdmin) {
        query = (query as any).eq('assigned_to', user.id)
      }

      const { data } = await query
      setTasks(
        ((data || []) as any[]).map(t => ({
          ...t,
          content_pieces: Array.isArray(t.content_pieces) ? (t.content_pieces[0] ?? null) : t.content_pieces,
          clients:         Array.isArray(t.clients)        ? (t.clients[0]        ?? null) : t.clients,
        }))
      )
      setMounted(true)
    }
    load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useGSAP(() => {
    if (!mounted || !listRef.current) return
    gsap.fromTo('.task-card',
      { x: -10, opacity: 0 },
      { x: 0, opacity: 1, duration: 0.3, stagger: 0.04, ease: 'power2.out', clearProps: 'all' }
    )
  }, { dependencies: [mounted], scope: listRef })

  if (!mounted) return null

  const grouped = groupByDay(tasks)

  return (
    <main style={{ flex: 1, minWidth: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', background: 'hsl(42,30%,97%)' }}>

      <div style={{ background: '#0F1A14', padding: '18px 20px 16px', flexShrink: 0, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
          <button onClick={() => router.push('/tasks')} style={{
            background: 'rgba(255,255,255,0.06)', border: 'none', cursor: 'pointer',
            width: 30, height: 30, borderRadius: '8px', color: 'hsl(140,7%,52%)', fontSize: '0.9rem',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>←</button>
          <div>
            <p style={{ fontSize: '0.6rem', color: 'hsl(140,7%,48%)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Tasks</p>
            <h1 style={{ fontSize: '1.167rem', fontWeight: 800, color: 'hsl(42,22%,84%)', lineHeight: 1 }}>Upcoming</h1>
          </div>
          <div style={{ marginLeft: 'auto', background: 'hsl(200,82%,30%)', borderRadius: '99px', padding: '3px 10px' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'hsl(200,82%,75%)' }}>{tasks.length} tasks</span>
          </div>
        </div>
      </div>

      <div ref={listRef} style={{ padding: '16px', flex: 1 }}>
        {tasks.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 24px', color: 'hsl(24,10%,54%)' }}>
            <div style={{ fontSize: '2.4rem', marginBottom: '10px' }}>🎉</div>
            <p style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '4px' }}>Nothing upcoming</p>
            <p style={{ fontSize: '0.75rem' }}>All future tasks will appear here.</p>
          </div>
        )}

        {grouped.map(([dateKey, { label: dayLabel, tasks: dayTasks }]) => (
          <div key={dateKey} style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <p style={{ fontSize: '0.68rem', fontWeight: 700, color: 'hsl(24,10%,44%)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {dayLabel}
              </p>
              <div style={{ flex: 1, height: '1px', background: 'hsl(38,14%,88%)' }} />
              <span style={{ fontSize: '0.6rem', color: 'hsl(24,10%,60%)', fontWeight: 600 }}>
                {relDate(dateKey)}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
              {dayTasks.map(task => {
                const cp     = task.content_pieces
                const client = task.clients
                const tc     = cp ? TYPE_CFG[cp.type] : TYPE_CFG.graphic

                return (
                  <div
                    key={task.id}
                    className="task-card"
                    onClick={() => cp && router.push(`/brief/${cp.id}`)}
                    style={{
                      background: '#fff', borderRadius: '14px',
                      border: '1px solid hsl(38,14%,90%)', padding: '12px 14px',
                      display: 'flex', alignItems: 'flex-start', gap: '10px',
                      cursor: cp ? 'pointer' : 'default',
                      transition: 'transform 0.15s cubic-bezier(0.34,1.56,0.64,1)',
                    }}
                    onMouseEnter={e => cp && ((e.currentTarget as HTMLDivElement).style.transform = 'translateX(3px)')}
                    onMouseLeave={e => ((e.currentTarget as HTMLDivElement).style.transform = '')}
                  >
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: tc.bg, marginTop: 5, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '0.82rem', fontWeight: 700, color: 'hsl(24,20%,11%)', lineHeight: 1.3, marginBottom: '4px' }}>
                        {task.title}
                      </p>
                      <p style={{ fontSize: '0.68rem', color: 'hsl(24,10%,52%)', lineHeight: 1.4, marginBottom: '6px' }}>
                        {task.description}
                      </p>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                        {client && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <div style={{ width: 6, height: 6, borderRadius: '50%', background: client.brand_color }} />
                            <span style={{ fontSize: '0.62rem', color: 'hsl(24,10%,52%)' }}>{client.name}</span>
                          </div>
                        )}
                        {cp && (
                          <span style={{ padding: '1px 7px', borderRadius: '99px', background: `${tc.bg}22`, color: tc.bg, fontSize: '0.58rem', fontWeight: 700 }}>
                            {tc.label}
                          </span>
                        )}
                      </div>
                    </div>
                    {cp && <span style={{ fontSize: '0.62rem', color: 'hsl(200,82%,48%)', fontWeight: 700, flexShrink: 0 }}>Brief →</span>}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}
