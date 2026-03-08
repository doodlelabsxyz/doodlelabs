'use client'

import { useEffect, useState, useRef } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { createClient } from '@/lib/supabase/client'
import { TopBar } from '@/components/shell/TopBar'
import type { ContentType, ContentStatus } from '@/lib/types'
import { getInitials, getAvatarColor } from '@/lib/utils'

gsap.registerPlugin(useGSAP)

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function formatDate() {
  return new Date().toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' })
}

const TYPE: Record<ContentType, { bg: string; text: string; label: string }> = {
  graphic: { bg:'hsl(14,72%,62%)',  text:'hsl(14,55%,18%)',  label:'Graphic' },
  video:   { bg:'hsl(40,95%,62%)',  text:'hsl(40,60%,16%)',  label:'Video'   },
  reel:    { bg:'hsl(161,58%,50%)', text:'hsl(161,45%,14%)', label:'Reel'    },
  story:   { bg:'hsl(268,60%,68%)', text:'hsl(268,40%,18%)', label:'Story'   },
}

const STATUS: Record<ContentStatus, { bg: string; text: string; label: string }> = {
  'planned':          { bg:'hsl(220,15%,93%)',   text:'hsl(220,12%,42%)',  label:'Planned'       },
  'brief-ready':      { bg:'hsl(200,75%,92%)',   text:'hsl(200,60%,32%)',  label:'Brief Ready'   },
  'in-design':        { bg:'hsl(14,72%,93%)',    text:'hsl(14,55%,38%)',   label:'In Design'     },
  'in-editing':       { bg:'hsl(40,90%,92%)',    text:'hsl(40,60%,32%)',   label:'In Editing'    },
  'ready-for-review': { bg:'hsl(200,80%,90%)',   text:'hsl(200,70%,28%)',  label:'Needs Review'  },
  'client-review':    { bg:'hsl(268,55%,93%)',   text:'hsl(268,40%,35%)',  label:'Client Review' },
  'approved':         { bg:'hsl(154,45%,90%)',   text:'hsl(154,45%,25%)',  label:'Approved'      },
  'scheduled':        { bg:'hsl(154,40%,87%)',   text:'hsl(154,40%,22%)',  label:'Scheduled'     },
  'posted':           { bg:'hsl(154,30%,88%)',   text:'hsl(154,30%,24%)',  label:'Posted'        },
  'overdue':          { bg:'hsl(4,78%,93%)',     text:'hsl(4,72%,38%)',    label:'Overdue'       },
}

function Tag({ label, bg, text }: { label: string; bg: string; text: string }) {
  return (
    <span style={{ padding:'3px 9px', borderRadius:'9999px', background:bg, color:text, fontSize:'0.72rem', fontWeight:600, whiteSpace:'nowrap' }}>
      {label}
    </span>
  )
}

function MetricCard({ value, label, sub, accent }: { value: number; label: string; sub: string; accent: string }) {
  const numRef = useRef<HTMLSpanElement>(null)
  useGSAP(() => {
    if (!numRef.current) return
    gsap.fromTo({ val: 0 }, { val: value }, {
      duration: 1.1, ease: 'power3.out', delay: Math.random() * 0.3,
      onUpdate: function() {
        if (numRef.current) numRef.current.textContent = String(Math.round(this.targets()[0].val))
      },
    })
  }, [value])

  return (
    <div
      className="flex-1 flex flex-col justify-between relative"
      style={{
        background: 'hsl(42,25%,99%)', borderRadius: '20px', padding: '20px',
        minHeight: '120px', minWidth: 0, border: '1px solid hsl(38,14%,90%)',
        boxShadow: '0 1px 3px rgba(24,20,12,0.04)', cursor: 'default',
        transition: 'transform 200ms cubic-bezier(0.87,0,0.13,1), box-shadow 200ms ease', overflow: 'hidden',
      }}
      onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.transform = 'translateY(-4px)'; el.style.boxShadow = `0 12px 32px ${accent}28, 0 2px 8px rgba(24,20,12,0.06)` }}
      onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.transform = 'translateY(0)'; el.style.boxShadow = '0 1px 3px rgba(24,20,12,0.04)' }}
    >
      <div style={{ width: '32px', height: '4px', borderRadius: '99px', background: accent, marginBottom: '14px' }} />
      <div>
        <p style={{ fontSize: '42px', fontWeight: 800, color: accent, lineHeight: 1, letterSpacing: '-0.04em' }}>
          <span ref={numRef}>0</span>
        </p>
        <p style={{ fontSize: '13px', fontWeight: 700, color: 'hsl(24,20%,11%)', marginTop: '6px' }}>{label}</p>
        <p style={{ fontSize: '11px', color: 'hsl(24,10%,54%)', marginTop: '2px' }}>{sub}</p>
      </div>
    </div>
  )
}

function SectionTitle({ title, count, action }: { title: string; count?: number; action?: string }) {
  return (
    <div className="flex items-center justify-between" style={{ marginBottom:'12px' }}>
      <div className="flex items-center" style={{ gap:'8px' }}>
        <p style={{ fontSize:'0.875rem', fontWeight:700, color:'hsl(24,20%,11%)' }}>{title}</p>
        {count !== undefined && (
          <span style={{ padding:'2px 8px', borderRadius:'9999px', background:'hsl(42,18%,93%)', color:'hsl(24,10%,44%)', fontSize:'0.72rem', fontWeight:700 }}>
            {count}
          </span>
        )}
      </div>
      {action && <button style={{ fontSize:'0.75rem', color:'hsl(200,82%,50%)', fontWeight:700 }}>{action} →</button>}
    </div>
  )
}

export default function DashboardPage() {
  const [userName,   setUserName]   = useState('...')
  const [mounted,    setMounted]    = useState(false)
  const [content,    setContent]    = useState<any[]>([])
  const [clients,    setClients]    = useState<any[]>([])
  const [team,       setTeam]       = useState<any[]>([])
  const [unread,     setUnread]     = useState(0)
  const metricsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [profileRes, contentRes, clientsRes, usersRes, notifRes] = await Promise.all([
        supabase.from('users').select('name').eq('id', user.id).single(),
        supabase.from('content_pieces').select('id, title, type, status, scheduled_date, platforms, client_id'),
        supabase.from('clients').select('id, name, initials, brand_color, content_this_month, pending_approvals'),
        supabase.from('users').select('id, name, role, tasks_today, tasks_total').neq('role', 'client').neq('role', 'admin'),
        supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('read', false),
      ])

      setUserName(profileRes.data?.name?.split(' ')[0] || 'Admin')
      setContent(contentRes.data || [])
      setClients(clientsRes.data || [])
      setTeam(usersRes.data || [])
      setUnread(notifRes.count ?? 0)
      setMounted(true)
    }
    load()
  }, [])

  useGSAP(() => {
    if (!metricsRef.current || !mounted) return
    gsap.fromTo(metricsRef.current.querySelectorAll('.metric-card'),
      { y: 28, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.5, ease: 'back.out(1.4)', stagger: 0.08 }
    )
  }, { dependencies: [mounted], scope: metricsRef })

  if (!mounted) return null

  const todayStr     = new Date().toISOString().split('T')[0]
  const todayContent = content.filter(c => c.scheduled_date === todayStr)
  const overdueItems = content.filter(c => c.status === 'overdue')
  const needsReview  = content.filter(c => c.status === 'ready-for-review')
  const inProd       = content.filter(c => !['posted','planned','overdue'].includes(c.status))
  const attentionItems = [...needsReview, ...overdueItems].slice(0, 6)

  const clientMap = Object.fromEntries(clients.map(c => [c.id, c]))

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <div style={{ background: 'white', padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexShrink: 0 }}>
        <div>
          <p style={{ fontSize: '11px', color: 'hsl(24,10%,54%)', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            {formatDate()}
          </p>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: 'hsl(24,20%,11%)', lineHeight: 1.15, letterSpacing: '-0.02em', marginTop: '4px' }}>
            {getGreeting()}, <span style={{ color: 'hsl(25,82%,60%)' }}>{userName}!</span>
          </h1>
        </div>
      </div>

      <div className="md:hidden">
        <TopBar greeting={getGreeting()} userName={userName} notifCount={unread} showClientSwitcher />
      </div>

      {/* ── Scrollable content ─────────────────────────────────────────────── */}
      <main style={{ padding:'16px', paddingBottom:'100px', flex:1, overflowY:'auto' }}>

        {/* Metrics */}
        <div ref={metricsRef} className="grid" style={{ gridTemplateColumns:'repeat(2,1fr)', gap:'12px', marginBottom:'16px' }}>
          {[
            { value: needsReview.length + overdueItems.length, label:'Needs Action',  sub:'Review or fix now',  accent:'hsl(14,72%,62%)' },
            { value: todayContent.length,                       label:'Live Today',    sub:'Posts scheduled',    accent:'hsl(161,58%,50%)' },
            { value: inProd.length,                             label:'In Production', sub:'Active this week',   accent:'hsl(200,82%,58%)' },
            { value: team.length,                               label:'Team Active',   sub:'All hands on deck',  accent:'hsl(268,60%,62%)' },
          ].map(m => (
            <div key={m.label} className="metric-card"><MetricCard {...m} /></div>
          ))}
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>

          {/* Needs Attention */}
          <div style={{ background:'hsl(42,25%,99%)', borderRadius:'20px', padding:'20px', border:'1px solid hsl(38,14%,90%)' }}>
            <SectionTitle title="Needs Your Attention" count={attentionItems.length} />
            <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
              {attentionItems.map(item => {
                const client = clientMap[item.client_id]
                const t = TYPE[item.type as ContentType]
                const s = STATUS[item.status as ContentStatus]
                return (
                  <div key={item.id} style={{
                    borderRadius:'14px', overflow:'hidden', background:t.bg,
                    cursor:'pointer', display:'flex',
                    transition:'transform 0.15s ease',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)' }}
                  >
                    <div style={{ width:'6px', flexShrink:0 }} />
                    <div style={{ flex:1, padding:'12px 14px', display:'flex', flexDirection:'column', gap:'6px' }}>
                      <p style={{ fontSize:'0.85rem', fontWeight:700, color:'rgba(255,255,255,0.95)', lineHeight:1.3 }}>{item.title}</p>
                      <p style={{ fontSize:'0.72rem', color:'rgba(255,255,255,0.65)' }}>{client?.name}</p>
                      <div style={{ display:'flex', gap:'6px' }}>
                        <Tag label={t.label} bg="rgba(255,255,255,0.2)" text="rgba(255,255,255,0.9)" />
                        <Tag label={s.label} bg="rgba(0,0,0,0.15)" text="rgba(255,255,255,0.85)" />
                      </div>
                    </div>
                  </div>
                )
              })}
              {attentionItems.length === 0 && (
                <p style={{ fontSize:'0.875rem', color:'hsl(24,10%,54%)', padding:'8px 0' }}>All clear — nothing needs attention.</p>
              )}
            </div>
          </div>

          {/* Client Health */}
          <div style={{ background:'hsl(42,25%,99%)', borderRadius:'20px', padding:'20px', border:'1px solid hsl(38,14%,90%)' }}>
            <SectionTitle title="Client Health" />
            <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
              {clients.map(client => {
                const hasOverdue = content.some(c => c.client_id === client.id && c.status === 'overdue')
                const statusColor = hasOverdue ? 'hsl(4,75%,56%)' : client.pending_approvals > 2 ? 'hsl(35,92%,52%)' : 'hsl(154,50%,40%)'
                const statusLabel = hasOverdue ? 'At Risk' : client.pending_approvals > 2 ? 'Watch' : 'On Track'
                return (
                  <div key={client.id} className="flex items-center" style={{
                    gap:'12px', padding:'12px', borderRadius:'14px',
                    background:'hsl(42,20%,96%)', border:'1px solid hsl(38,14%,90%)',
                    cursor:'pointer',
                    transition:'transform 0.15s ease',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)' }}
                  >
                    <div style={{
                      width:'42px', height:'42px', borderRadius:'12px', background:client.brand_color,
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontWeight:800, fontSize:'0.75rem', color:'hsl(42,30%,99%)', flexShrink:0,
                    }}>
                      {client.initials}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ fontSize:'0.875rem', fontWeight:700, color:'hsl(24,20%,11%)' }}>{client.name}</p>
                      <p style={{ fontSize:'0.72rem', color:'hsl(24,10%,54%)', marginTop:'2px' }}>
                        {client.content_this_month} posts · {client.pending_approvals} pending
                      </p>
                    </div>
                    <div style={{
                      display:'flex', alignItems:'center', gap:'5px', flexShrink:0,
                      padding:'4px 10px', borderRadius:'9999px',
                      background:`${statusColor}16`, color:statusColor,
                      fontSize:'0.72rem', fontWeight:700,
                    }}>
                      <div style={{ width:'6px', height:'6px', borderRadius:'50%', background:statusColor }} />
                      {statusLabel}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Today */}
          <div style={{ background:'hsl(42,25%,99%)', borderRadius:'20px', padding:'20px', border:'1px solid hsl(38,14%,90%)' }}>
            <SectionTitle title="Going Live Today" count={todayContent.length} />
            {todayContent.length === 0 ? (
              <p style={{ fontSize:'0.875rem', color:'hsl(24,10%,54%)', padding:'8px 0' }}>Nothing scheduled for today.</p>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
                {todayContent.map(item => {
                  const client = clientMap[item.client_id]
                  const t = TYPE[item.type as ContentType]
                  const s = STATUS[item.status as ContentStatus]
                  return (
                    <div key={item.id} style={{
                      display:'flex', alignItems:'center', gap:'12px', padding:'12px',
                      borderRadius:'12px', background:`${t.bg}14`, border:`1px solid ${t.bg}30`,
                    }}>
                      <div style={{ width:'10px', height:'10px', borderRadius:'50%', background:t.bg, flexShrink:0 }} />
                      <div style={{ flex:1, minWidth:0 }}>
                        <p style={{ fontSize:'0.875rem', fontWeight:600, color:'hsl(24,20%,11%)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.title}</p>
                        <p style={{ fontSize:'0.72rem', color:'hsl(24,10%,54%)' }}>{client?.name} · {item.platforms?.join(', ')}</p>
                      </div>
                      <Tag label={s.label} bg={s.bg} text={s.text} />
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Team Workload */}
          <div style={{ background:'hsl(42,25%,99%)', borderRadius:'20px', padding:'20px', border:'1px solid hsl(38,14%,90%)' }}>
            <SectionTitle title="Team Workload" />
            <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
              {team.map(u => {
                const pct = u.tasks_total > 0 ? Math.round((u.tasks_today / u.tasks_total) * 100) : 0
                const barColor = pct >= 80 ? 'hsl(4,75%,56%)' : pct >= 50 ? 'hsl(35,92%,52%)' : 'hsl(154,50%,40%)'
                return (
                  <div key={u.id} className="flex items-center" style={{ gap:'12px' }}>
                    <div style={{
                      width:'36px', height:'36px', borderRadius:'10px', background:getAvatarColor(u.id),
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontWeight:800, fontSize:'0.65rem', color:'hsl(42,30%,99%)', flexShrink:0,
                    }}>
                      {getInitials(u.name)}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'5px' }}>
                        <p style={{ fontSize:'0.8rem', fontWeight:600, color:'hsl(24,20%,11%)' }}>{u.name}</p>
                        <p style={{ fontSize:'0.72rem', color:'hsl(24,10%,54%)' }}>{u.tasks_today}/{u.tasks_total}</p>
                      </div>
                      <div style={{ height:'5px', borderRadius:'9999px', background:'hsl(42,18%,93%)', overflow:'hidden' }}>
                        <div style={{ height:'100%', width:`${pct}%`, background:barColor, borderRadius:'9999px', transition:'width 0.9s ease' }} />
                      </div>
                    </div>
                    <p style={{ fontSize:'0.75rem', color:'hsl(24,10%,54%)', flexShrink:0, minWidth:'64px', textAlign:'right', textTransform:'capitalize' }}>
                      {u.role}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
