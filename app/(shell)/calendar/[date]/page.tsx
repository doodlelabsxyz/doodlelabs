'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { createClient } from '@/lib/supabase/client'
import type { ContentType, ContentStatus } from '@/lib/types'

gsap.registerPlugin(useGSAP)

const TYPE_CFG: Record<ContentType, { bg: string; text: string; label: string }> = {
  graphic: { bg: 'hsl(14,72%,62%)',  text: '#fff',    label: 'Graphic' },
  video:   { bg: 'hsl(40,95%,62%)',  text: '#3a2800', label: 'Video'   },
  reel:    { bg: 'hsl(161,58%,50%)', text: '#fff',    label: 'Reel'    },
  story:   { bg: 'hsl(268,60%,68%)', text: '#fff',    label: 'Story'   },
}

const STATUS_CFG: Record<ContentStatus, { bg: string; text: string; label: string }> = {
  'planned':          { bg: 'hsl(220,15%,93%)',   text: 'hsl(220,12%,42%)',  label: 'Planned' },
  'brief-ready':      { bg: 'hsl(200,75%,92%)',   text: 'hsl(200,60%,32%)',  label: 'Brief Ready' },
  'in-design':        { bg: 'hsl(14,72%,93%)',    text: 'hsl(14,55%,38%)',   label: 'In Design' },
  'in-editing':       { bg: 'hsl(40,90%,92%)',    text: 'hsl(40,60%,32%)',   label: 'In Editing' },
  'ready-for-review': { bg: 'hsl(200,80%,90%)',   text: 'hsl(200,70%,28%)',  label: 'Needs Review' },
  'client-review':    { bg: 'hsl(268,55%,93%)',   text: 'hsl(268,40%,35%)',  label: 'Client Review' },
  'approved':         { bg: 'hsl(154,45%,90%)',   text: 'hsl(154,45%,25%)',  label: 'Approved' },
  'scheduled':        { bg: 'hsl(154,40%,87%)',   text: 'hsl(154,40%,22%)',  label: 'Scheduled' },
  'posted':           { bg: 'hsl(154,30%,88%)',   text: 'hsl(154,30%,24%)',  label: 'Posted' },
  'overdue':          { bg: 'hsl(4,78%,93%)',     text: 'hsl(4,72%,38%)',    label: 'Overdue' },
}

type ContentRow = {
  id: string; title: string; type: ContentType; status: ContentStatus
  caption: string | null; platforms: string[]; scheduled_date: string
  clients: { id: string; name: string; industry: string; brand_color: string } | null
}
type TaskRow = { id: string; title: string; status: string; content_id: string }

function dateToStr(dt: Date) {
  return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`
}

export default function DayViewPage() {
  const router  = useRouter()
  const params  = useParams()
  const listRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted]   = useState(false)
  const [content, setContent]   = useState<ContentRow[]>([])
  const [tasks,   setTasks]     = useState<TaskRow[]>([])

  const dateStr = params.date as string
  const [y, m, d] = dateStr.split('-').map(Number)
  const viewDate = new Date(y, m - 1, d)
  const today    = new Date()
  const isToday  = viewDate.toDateString() === today.toDateString()
  const isPast   = viewDate < today && !isToday

  const prevDate = new Date(viewDate); prevDate.setDate(prevDate.getDate() - 1)
  const nextDate = new Date(viewDate); nextDate.setDate(nextDate.getDate() + 1)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const [contentRes, tasksRes] = await Promise.all([
        supabase
          .from('content_pieces')
          .select('id, title, type, status, caption, platforms, scheduled_date, clients(id, name, industry, brand_color)')
          .eq('scheduled_date', dateStr)
          .order('created_at'),
        supabase
          .from('tasks')
          .select('id, title, status, content_id')
          .order('due_date'),
      ])

      const pieces = ((contentRes.data || []) as any[]).map(cp => ({
        ...cp,
        clients: Array.isArray(cp.clients) ? (cp.clients[0] ?? null) : cp.clients,
      }))

      setContent(pieces)
      setTasks((tasksRes.data || []) as TaskRow[])
      setMounted(true)
    }
    load()
  }, [dateStr]) // eslint-disable-line react-hooks/exhaustive-deps

  useGSAP(() => {
    if (!mounted || !listRef.current) return
    gsap.fromTo('.day-card',
      { y: 16, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.4, stagger: 0.08, ease: 'back.out(1.3)', clearProps: 'all' }
    )
  }, { dependencies: [mounted, dateStr], scope: listRef })

  if (!mounted) return null

  return (
    <main className="page-main" style={{ flex: 1, minWidth: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>

      <div style={{ background: '#0F1A14', padding: '18px 20px 16px', flexShrink: 0, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={() => router.push('/calendar')} style={{
            width: '32px', height: '32px', borderRadius: '8px',
            background: 'rgba(255,255,255,0.06)', border: 'none',
            color: 'hsl(42,22%,84%)', cursor: 'pointer', fontSize: '16px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>←</button>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '0.656rem', color: 'hsl(140,7%,48%)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '1px' }}>
              {isToday ? 'Today' : isPast ? 'Past' : 'Upcoming'}
            </p>
            <h1 style={{ fontSize: '1.167rem', fontWeight: 800, color: 'hsl(42,22%,84%)', lineHeight: 1 }}>
              {viewDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </h1>
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button onClick={() => router.push(`/calendar/${dateToStr(prevDate)}`)} style={{ width: '30px', height: '30px', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: 'hsl(42,22%,84%)', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</button>
            <button onClick={() => router.push(`/calendar/${dateToStr(nextDate)}`)} style={{ width: '30px', height: '30px', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: 'hsl(42,22%,84%)', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>›</button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
          <div style={{ padding: '5px 12px', borderRadius: '99px', background: 'rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 800, color: 'hsl(25,82%,60%)' }}>{content.length}</span>
            <span style={{ fontSize: '0.656rem', color: 'hsl(140,7%,48%)' }}>posts</span>
          </div>
          {content.some(c => c.status === 'overdue') && (
            <div style={{ padding: '5px 12px', borderRadius: '99px', background: 'rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 800, color: 'hsl(4,75%,56%)' }}>
                {content.filter(c => c.status === 'overdue').length}
              </span>
              <span style={{ fontSize: '0.656rem', color: 'hsl(4,75%,60%)' }}>overdue</span>
            </div>
          )}
        </div>
      </div>

      <div ref={listRef} style={{ padding: '16px', flex: 1 }}>
        {content.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '60px 20px' }}>
            <div style={{ width: '72px', height: '72px', borderRadius: '18px', background: 'hsl(42,18%,94%)', border: '1.5px dashed hsl(38,14%,85%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.3 }}>
                <rect x="3" y="5" width="18" height="17" rx="3" stroke="hsl(24,10%,44%)" strokeWidth="1.5"/>
                <path d="M3 10h18M8 3v4M16 3v4" stroke="hsl(24,10%,44%)" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'hsl(24,10%,44%)' }}>No content scheduled</p>
            <button
              onClick={() => router.push(`/brief/new?date=${dateStr}`)}
              style={{ padding: '10px 20px', borderRadius: '10px', background: 'hsl(25,82%,60%)', border: 'none', color: '#fff', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', boxShadow: '0 4px 12px hsla(25,82%,60%,0.3)' }}
            >
              + Create Content
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {content.map(cp => {
              const cfg   = TYPE_CFG[cp.type]
              const sCfg  = STATUS_CFG[cp.status] ?? STATUS_CFG['planned']
              const cpTasks = tasks.filter(t => t.content_id === cp.id)

              return (
                <div
                  key={cp.id}
                  className="day-card"
                  onClick={() => router.push(`/brief/${cp.id}`)}
                  style={{ background: 'hsl(42,25%,99%)', borderRadius: '16px', border: '1px solid hsl(38,14%,90%)', overflow: 'hidden', cursor: 'pointer', transition: 'transform 0.15s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.15s ease' }}
                  onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.transform = 'translateY(-3px)'; el.style.boxShadow = `0 12px 32px ${cfg.bg}20` }}
                  onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.transform = ''; el.style.boxShadow = '' }}
                >
                  <div style={{ height: '4px', background: cfg.bg }} />
                  <div style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '10px' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: '0.95rem', fontWeight: 800, color: 'hsl(24,20%,11%)', lineHeight: 1.3 }}>{cp.title}</p>
                        {cp.clients && (
                          <p style={{ fontSize: '0.75rem', color: 'hsl(24,10%,54%)', marginTop: '3px' }}>{cp.clients.name} · {cp.clients.industry}</p>
                        )}
                      </div>
                      <span style={{ padding: '4px 10px', borderRadius: '99px', background: sCfg.bg, color: sCfg.text, fontSize: '0.656rem', fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0 }}>
                        {sCfg.label}
                      </span>
                    </div>

                    {cp.caption && (
                      <p style={{ fontSize: '0.8rem', color: 'hsl(24,10%,44%)', lineHeight: 1.5, marginBottom: '12px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                        {cp.caption}
                      </p>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <span style={{ padding: '3px 8px', borderRadius: '6px', background: cfg.bg, color: cfg.text, fontSize: '0.656rem', fontWeight: 700 }}>
                        {cfg.label}
                      </span>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {cp.platforms.map(p => (
                          <span key={p} style={{ padding: '3px 8px', borderRadius: '6px', background: 'hsl(42,18%,93%)', fontSize: '0.656rem', fontWeight: 600, color: 'hsl(24,10%,44%)', textTransform: 'capitalize' }}>
                            {p}
                          </span>
                        ))}
                      </div>
                    </div>

                    {cpTasks.length > 0 && (
                      <div style={{ marginTop: '12px', borderTop: '1px solid hsl(38,14%,92%)', paddingTop: '10px' }}>
                        <p style={{ fontSize: '0.656rem', fontWeight: 700, color: 'hsl(24,10%,44%)', marginBottom: '6px' }}>
                          Tasks ({cpTasks.length})
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {cpTasks.map(t => (
                            <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{ width: '14px', height: '14px', borderRadius: '4px', border: `1.5px solid ${t.status === 'done' ? 'hsl(154,50%,40%)' : t.status === 'overdue' ? 'hsl(4,75%,56%)' : 'hsl(38,14%,82%)'}`, background: t.status === 'done' ? 'hsl(154,50%,40%)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {t.status === 'done' && <svg width="8" height="8" viewBox="0 0 12 12" fill="none"><path d="M3 6l2 2 4-4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                              </div>
                              <span style={{ fontSize: '0.75rem', color: 'hsl(24,10%,44%)', flex: 1, textDecoration: t.status === 'done' ? 'line-through' : 'none' }}>
                                {t.title}
                              </span>
                              <span style={{ fontSize: '0.6rem', fontWeight: 600, color: t.status === 'overdue' ? 'hsl(4,72%,38%)' : 'hsl(24,8%,64%)', textTransform: 'capitalize' }}>
                                {t.status.replace('-', ' ')}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}

            <button
              onClick={() => router.push(`/brief/new?date=${dateStr}`)}
              style={{ padding: '14px', borderRadius: '12px', border: '1.5px dashed hsla(25,82%,60%,0.4)', background: 'hsla(25,82%,60%,0.04)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '4px' }}
            >
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'hsl(25,82%,60%)' }}>+ Add Content</span>
            </button>
          </div>
        )}
      </div>
    </main>
  )
}
