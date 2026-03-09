'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { createClient } from '@/lib/supabase/client'
import type { ContentType } from '@/lib/types'

gsap.registerPlugin(useGSAP)

const TYPE_CFG: Record<ContentType, { bg: string; label: string }> = {
  graphic: { bg: 'hsl(14,72%,62%)',  label: 'Graphic' },
  video:   { bg: 'hsl(40,95%,62%)',  label: 'Video'   },
  reel:    { bg: 'hsl(161,58%,50%)', label: 'Reel'    },
  story:   { bg: 'hsl(268,60%,68%)', label: 'Story'   },
}

type TaskRow = {
  id: string; title: string; due_date: string; status: string
  content_pieces: { id: string; type: ContentType } | null
  clients: { id: string; name: string; brand_color: string } | null
}

export default function DoneTasksPage() {
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

      let query = supabase
        .from('tasks')
        .select('id, title, due_date, status, content_pieces(id, type), clients(id, name, brand_color)')
        .eq('status', 'done')
        .order('due_date', { ascending: false })

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
    gsap.fromTo('.done-card',
      { y: 8, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.3, stagger: 0.04, ease: 'power2.out', clearProps: 'all' }
    )
  }, { dependencies: [mounted], scope: listRef })

  if (!mounted) return null

  return (
    <main className="page-main" style={{ flex: 1, minWidth: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', background: 'hsl(42,30%,97%)' }}>

      <div style={{ background: '#0F1A14', padding: '18px 20px 16px', flexShrink: 0, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button onClick={() => router.push('/tasks')} style={{
            background: 'rgba(255,255,255,0.06)', border: 'none', cursor: 'pointer',
            width: 30, height: 30, borderRadius: '8px', color: 'hsl(140,7%,52%)', fontSize: '0.9rem',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>←</button>
          <div>
            <p style={{ fontSize: '0.6rem', color: 'hsl(140,7%,48%)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Tasks</p>
            <h1 style={{ fontSize: '1.167rem', fontWeight: 800, color: 'hsl(42,22%,84%)', lineHeight: 1 }}>Completed</h1>
          </div>
          <div style={{ marginLeft: 'auto', background: 'hsl(154,40%,20%)', borderRadius: '99px', padding: '3px 10px' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'hsl(154,58%,60%)' }}>{tasks.length} done</span>
          </div>
        </div>
      </div>

      <div ref={listRef} style={{ padding: '16px', flex: 1 }}>
        {tasks.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 24px', color: 'hsl(24,10%,54%)' }}>
            <div style={{ fontSize: '2.4rem', marginBottom: '10px' }}>📋</div>
            <p style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '4px' }}>Nothing completed yet</p>
            <p style={{ fontSize: '0.75rem' }}>Finished tasks will appear here.</p>
          </div>
        )}

        {tasks.length > 0 && (
          <div style={{
            background: 'hsl(154,50%,96%)', border: '1px solid hsl(154,50%,84%)',
            borderRadius: '14px', padding: '12px 14px', marginBottom: '16px',
            display: 'flex', alignItems: 'center', gap: '12px',
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: '50%', background: 'hsl(154,50%,40%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.2rem', flexShrink: 0, color: '#fff',
            }}>✓</div>
            <div>
              <p style={{ fontSize: '0.82rem', fontWeight: 800, color: 'hsl(154,40%,20%)' }}>
                {tasks.length} task{tasks.length !== 1 ? 's' : ''} completed
              </p>
              <p style={{ fontSize: '0.68rem', color: 'hsl(154,30%,40%)' }}>
                Great work — keep the momentum going.
              </p>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
          {tasks.map(task => {
            const cp     = task.content_pieces
            const client = task.clients
            const tc     = cp ? TYPE_CFG[cp.type] : TYPE_CFG.graphic

            return (
              <div
                key={task.id}
                className="done-card"
                onClick={() => cp && router.push(`/brief/${cp.id}`)}
                style={{
                  background: '#fff', borderRadius: '14px',
                  border: '1px solid hsl(38,14%,90%)', padding: '12px 14px',
                  display: 'flex', alignItems: 'center', gap: '10px',
                  cursor: cp ? 'pointer' : 'default', opacity: 0.85,
                }}
              >
                <div style={{
                  width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                  background: 'hsl(154,50%,90%)', border: '1.5px solid hsl(154,50%,60%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.75rem', color: 'hsl(154,50%,38%)', fontWeight: 800,
                }}>✓</div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    fontSize: '0.82rem', fontWeight: 600, color: 'hsl(24,10%,44%)',
                    lineHeight: 1.3, marginBottom: '3px',
                    textDecoration: 'line-through', textDecorationColor: 'hsl(24,10%,70%)',
                  }}>
                    {task.title}
                  </p>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    {client && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <div style={{ width: 5, height: 5, borderRadius: '50%', background: client.brand_color }} />
                        <span style={{ fontSize: '0.6rem', color: 'hsl(24,10%,56%)' }}>{client.name}</span>
                      </div>
                    )}
                    {cp && <span style={{ fontSize: '0.58rem', color: tc.bg, fontWeight: 700 }}>{tc.label}</span>}
                    <span style={{ fontSize: '0.6rem', color: 'hsl(154,50%,40%)', marginLeft: 'auto', fontWeight: 600 }}>
                      {new Date(task.due_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
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
