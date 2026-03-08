'use client'

import { useState, useRef, useEffect } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { createClient } from '@/lib/supabase/client'
import type { ContentType, ContentStatus } from '@/lib/types'
import { getInitials, getAvatarColor } from '@/lib/utils'

gsap.registerPlugin(useGSAP)

const TYPE_CFG: Record<ContentType, { bg: string; label: string }> = {
  graphic: { bg: 'hsl(14,72%,62%)',  label: 'Graphic' },
  video:   { bg: 'hsl(40,95%,62%)',  label: 'Video'   },
  reel:    { bg: 'hsl(161,58%,50%)', label: 'Reel'    },
  story:   { bg: 'hsl(268,60%,68%)', label: 'Story'   },
}

type ContentRow = { id: string; client_id: string; type: ContentType; status: ContentStatus; scheduled_date: string }
type ClientRow  = { id: string; name: string; brand_color: string; initials: string }
type UserRow    = { id: string; name: string; role: string }
type TaskRow    = { id: string; assigned_to: string; status: string }

export default function AnalyticsPage() {
  const metricsRef = useRef<HTMLDivElement>(null)
  const [mounted,  setMounted]  = useState(false)
  const [period,   setPeriod]   = useState<'week' | 'month' | 'all'>('month')
  const [content,  setContent]  = useState<ContentRow[]>([])
  const [clients,  setClients]  = useState<ClientRow[]>([])
  const [users,    setUsers]    = useState<UserRow[]>([])
  const [tasks,    setTasks]    = useState<TaskRow[]>([])

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [cntRes, cliRes, usrRes, tskRes] = await Promise.all([
        supabase.from('content_pieces').select('id, client_id, type, status, scheduled_date'),
        supabase.from('clients').select('id, name, brand_color, initials'),
        supabase.from('users').select('id, name, role').neq('role', 'client'),
        supabase.from('tasks').select('id, assigned_to, status'),
      ])

      setContent((cntRes.data || []) as ContentRow[])
      setClients((cliRes.data || []) as ClientRow[])
      setUsers((usrRes.data || []) as UserRow[])
      setTasks((tskRes.data || []) as TaskRow[])
      setMounted(true)
    }
    load()
  }, [])

  useGSAP(() => {
    if (!mounted || !metricsRef.current) return
    gsap.fromTo('.analytics-card',
      { y: 16, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.4, stagger: 0.06, ease: 'back.out(1.3)', clearProps: 'all' }
    )
  }, { dependencies: [mounted], scope: metricsRef })

  if (!mounted) return null

  // Filter content by period
  const now     = new Date()
  const filtered = content.filter(c => {
    if (period === 'all') return true
    const d = new Date(c.scheduled_date + 'T00:00:00')
    if (period === 'week') {
      const weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate() - 6); weekAgo.setHours(0,0,0,0)
      return d >= weekAgo
    }
    // month
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
  })

  const total   = filtered.length
  const posted  = filtered.filter(c => c.status === 'posted' || c.status === 'approved').length
  const overdue = filtered.filter(c => c.status === 'overdue').length
  const inProd  = filtered.filter(c => ['in-design','in-editing','ready-for-review','brief-ready'].includes(c.status)).length
  const planned = filtered.filter(c => c.status === 'planned').length

  const typeCounts: Record<ContentType, number> = { graphic: 0, video: 0, reel: 0, story: 0 }
  filtered.forEach(c => { typeCounts[c.type]++ })

  const clientStats = clients.map(client => {
    const cc = filtered.filter(c => c.client_id === client.id)
    return {
      client,
      total:   cc.length,
      posted:  cc.filter(c => c.status === 'posted' || c.status === 'approved').length,
      overdue: cc.filter(c => c.status === 'overdue').length,
    }
  }).filter(s => s.total > 0)

  const statusCounts: { status: ContentStatus; label: string; count: number; color: string }[] = [
    { status: 'planned',          label: 'Planned',  count: filtered.filter(c => c.status === 'planned').length,          color: 'hsl(220,15%,62%)' },
    { status: 'brief-ready',      label: 'Brief',    count: filtered.filter(c => c.status === 'brief-ready').length,      color: 'hsl(200,82%,58%)' },
    { status: 'in-design',        label: 'Design',   count: filtered.filter(c => c.status === 'in-design').length,        color: 'hsl(14,72%,62%)' },
    { status: 'in-editing',       label: 'Editing',  count: filtered.filter(c => c.status === 'in-editing').length,       color: 'hsl(40,95%,62%)' },
    { status: 'ready-for-review', label: 'Review',   count: filtered.filter(c => c.status === 'ready-for-review').length, color: 'hsl(268,60%,68%)' },
    { status: 'approved',         label: 'Approved', count: filtered.filter(c => c.status === 'approved').length,         color: 'hsl(154,50%,40%)' },
    { status: 'overdue',          label: 'Overdue',  count: overdue,                                                       color: 'hsl(4,75%,56%)' },
  ]
  const maxStatusCount = Math.max(...statusCounts.map(s => s.count), 1)

  const teamStats = users.filter(u => u.role !== 'admin').map(u => {
    const ut = tasks.filter(t => t.assigned_to === u.id)
    return {
      user: u,
      total:   ut.length,
      done:    ut.filter(t => t.status === 'done').length,
      overdue: ut.filter(t => t.status === 'overdue').length,
    }
  })

  return (
    <main style={{ flex: 1, minWidth: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>

      <div style={{ background: '#0F1A14', padding: '18px 20px 14px', flexShrink: 0, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '0.656rem', color: 'hsl(140,7%,48%)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '1px' }}>Admin</p>
            <h1 style={{ fontSize: '1.167rem', fontWeight: 800, color: 'hsl(42,22%,84%)', lineHeight: 1 }}>Analytics</h1>
          </div>
          <div style={{ display: 'flex', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
            {(['week', 'month', 'all'] as const).map(p => (
              <button key={p} onClick={() => setPeriod(p)} style={{
                padding: '5px 12px', border: 'none', cursor: 'pointer',
                background: period === p ? 'hsl(25,82%,60%)' : 'transparent',
                color: period === p ? '#fff' : 'hsl(140,7%,48%)',
                fontSize: '0.7rem', fontWeight: 600, textTransform: 'capitalize',
              }}>
                {p === 'all' ? 'All Time' : p === 'week' ? 'This Week' : 'This Month'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div ref={metricsRef} style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

        <div className="analytics-card" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
          {[
            { value: total,   label: 'Total Content',    color: 'hsl(25,82%,60%)' },
            { value: posted,  label: 'Posted / Approved', color: 'hsl(154,50%,40%)' },
            { value: inProd,  label: 'In Production',    color: 'hsl(200,82%,58%)' },
            { value: planned, label: 'Planned',          color: 'hsl(40,95%,55%)' },
            { value: overdue, label: 'Overdue',          color: 'hsl(4,75%,56%)' },
          ].map(m => (
            <MetricBox key={m.label} {...m} />
          ))}
        </div>

        <div className="analytics-grid" style={{ display: 'grid', gap: '16px', gridTemplateColumns: '1fr' }}>
          <style>{`@media(min-width:768px){.analytics-grid{grid-template-columns:1fr 1fr !important}}`}</style>

          {/* Content Mix */}
          <div className="analytics-card" style={{ background: 'hsl(42,25%,99%)', borderRadius: '16px', border: '1px solid hsl(38,14%,90%)', padding: '18px' }}>
            <p style={{ fontSize: '0.85rem', fontWeight: 700, color: 'hsl(24,20%,11%)', marginBottom: '14px' }}>Content Mix</p>
            {total === 0 ? (
              <p style={{ fontSize: '0.78rem', color: 'hsl(24,10%,54%)' }}>No content in this period.</p>
            ) : (
              <>
                <div style={{ display: 'flex', height: '10px', borderRadius: '99px', overflow: 'hidden', marginBottom: '14px' }}>
                  {(Object.entries(typeCounts) as [ContentType, number][]).map(([t, n]) =>
                    n > 0 ? <div key={t} style={{ flex: n, background: TYPE_CFG[t].bg, transition: 'flex 0.5s ease' }} /> : null
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {(Object.entries(typeCounts) as [ContentType, number][]).map(([t, n]) => (
                    <div key={t} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: TYPE_CFG[t].bg, flexShrink: 0 }} />
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'hsl(24,20%,11%)', flex: 1 }}>{TYPE_CFG[t].label}</span>
                      <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'hsl(24,20%,11%)' }}>{n}</span>
                      <span style={{ fontSize: '0.7rem', color: 'hsl(24,8%,64%)', minWidth: '36px', textAlign: 'right' }}>
                        {total > 0 ? Math.round((n / total) * 100) : 0}%
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Pipeline Status */}
          <div className="analytics-card" style={{ background: 'hsl(42,25%,99%)', borderRadius: '16px', border: '1px solid hsl(38,14%,90%)', padding: '18px' }}>
            <p style={{ fontSize: '0.85rem', fontWeight: 700, color: 'hsl(24,20%,11%)', marginBottom: '14px' }}>Pipeline Status</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {statusCounts.map(s => (
                <div key={s.status} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'hsl(24,20%,11%)', minWidth: '56px' }}>{s.label}</span>
                  <div style={{ flex: 1, height: '8px', borderRadius: '99px', background: 'hsl(42,18%,93%)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${(s.count / maxStatusCount) * 100}%`, borderRadius: '99px', background: s.color, transition: 'width 0.6s cubic-bezier(0.34,1.56,0.64,1)' }} />
                  </div>
                  <span style={{ fontSize: '0.8rem', fontWeight: 800, color: s.color, minWidth: '20px', textAlign: 'right' }}>{s.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Client Performance */}
          {clientStats.length > 0 && (
            <div className="analytics-card" style={{ background: 'hsl(42,25%,99%)', borderRadius: '16px', border: '1px solid hsl(38,14%,90%)', padding: '18px' }}>
              <p style={{ fontSize: '0.85rem', fontWeight: 700, color: 'hsl(24,20%,11%)', marginBottom: '14px' }}>Client Performance</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {clientStats.map(({ client, total: ct, posted: cp, overdue: co }) => {
                  const pct = ct > 0 ? Math.round((cp / ct) * 100) : 0
                  return (
                    <div key={client.id}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                        <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: client.brand_color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '10px', color: '#fff', flexShrink: 0 }}>
                          {client.initials}
                        </div>
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'hsl(24,20%,11%)', flex: 1 }}>{client.name}</span>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: client.brand_color }}>{pct}%</span>
                      </div>
                      <div style={{ display: 'flex', gap: '4px', height: '6px', borderRadius: '99px', overflow: 'hidden' }}>
                        <div style={{ flex: cp, background: 'hsl(154,50%,40%)', borderRadius: '99px 0 0 99px', transition: 'flex 0.5s ease' }} />
                        <div style={{ flex: Math.max(ct - cp - co, 0), background: 'hsl(200,82%,58%)', transition: 'flex 0.5s ease' }} />
                        {co > 0 && <div style={{ flex: co, background: 'hsl(4,75%,56%)', borderRadius: '0 99px 99px 0', transition: 'flex 0.5s ease' }} />}
                      </div>
                      <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
                        <span style={{ fontSize: '0.6rem', color: 'hsl(24,8%,64%)' }}>{cp} posted</span>
                        <span style={{ fontSize: '0.6rem', color: 'hsl(24,8%,64%)' }}>{Math.max(ct - cp - co, 0)} in progress</span>
                        {co > 0 && <span style={{ fontSize: '0.6rem', color: 'hsl(4,72%,50%)' }}>{co} overdue</span>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Team Performance */}
          {teamStats.length > 0 && (
            <div className="analytics-card" style={{ background: 'hsl(42,25%,99%)', borderRadius: '16px', border: '1px solid hsl(38,14%,90%)', padding: '18px' }}>
              <p style={{ fontSize: '0.85rem', fontWeight: 700, color: 'hsl(24,20%,11%)', marginBottom: '14px' }}>Team Performance</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {teamStats.map(({ user, total: tt, done: td, overdue: to }) => {
                  const pct = tt > 0 ? Math.round((td / tt) * 100) : 0
                  return (
                    <div key={user.id} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: getAvatarColor(user.id), display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '9px', color: '#fff', flexShrink: 0 }}>
                        {getInitials(user.name)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'hsl(24,20%,11%)' }}>{user.name}</span>
                          <span style={{ fontSize: '0.656rem', color: 'hsl(24,8%,64%)' }}>{td}/{tt}</span>
                        </div>
                        <div style={{ height: '5px', borderRadius: '99px', background: 'hsl(42,18%,93%)', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, borderRadius: '99px', background: to > 0 ? 'hsl(4,75%,56%)' : pct >= 80 ? 'hsl(154,50%,40%)' : getAvatarColor(user.id), transition: 'width 0.6s cubic-bezier(0.34,1.56,0.64,1)' }} />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}

function MetricBox({ value, label, color }: { value: number; label: string; color: string }) {
  const numRef = useRef<HTMLSpanElement>(null)
  useGSAP(() => {
    if (!numRef.current) return
    gsap.fromTo({ v: 0 }, { v: value }, {
      duration: 1, ease: 'power3.out', delay: Math.random() * 0.2,
      onUpdate() { if (numRef.current) numRef.current.textContent = String(Math.round(this.targets()[0].v)) },
    })
  }, [value])

  return (
    <div style={{ background: 'hsl(42,25%,99%)', borderRadius: '14px', padding: '16px', border: '1px solid hsl(38,14%,90%)' }}>
      <div style={{ width: '24px', height: '3px', borderRadius: '99px', background: color, marginBottom: '10px' }} />
      <p style={{ fontSize: '1.5rem', fontWeight: 800, color, lineHeight: 1, letterSpacing: '-0.03em' }}>
        <span ref={numRef}>0</span>
      </p>
      <p style={{ fontSize: '0.7rem', color: 'hsl(24,10%,54%)', marginTop: '4px' }}>{label}</p>
    </div>
  )
}
