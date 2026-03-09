'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { createClient } from '@/lib/supabase/client'
import type { ContentType } from '@/lib/types'

gsap.registerPlugin(useGSAP)

type ClientRow = { id: string; name: string; initials: string; brand_color: string; content_this_month: number }
type ContentRow = { id: string; title: string; type: string; status: string; client_id: string; scheduled_date: string }

const TYPE_CFG: Record<ContentType, { bg: string; text: string; label: string }> = {
  graphic: { bg: 'hsl(14,72%,62%)',  text: '#fff',    label: 'Graphic' },
  video:   { bg: 'hsl(40,95%,62%)',  text: '#3a2800', label: 'Video'   },
  reel:    { bg: 'hsl(161,58%,50%)', text: '#fff',    label: 'Reel'    },
  story:   { bg: 'hsl(268,60%,68%)', text: '#fff',    label: 'Story'   },
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DAYS = ['M','T','W','T','F','S','S']

function buildMiniGrid(year: number, month: number) {
  const firstDow = new Date(year, month, 1).getDay()
  const startPad = firstDow === 0 ? 6 : firstDow - 1
  const daysInMo = new Date(year, month + 1, 0).getDate()
  const cells: { day: number; inMonth: boolean }[] = []
  for (let i = 0; i < startPad; i++) cells.push({ day: 0, inMonth: false })
  for (let d = 1; d <= daysInMo; d++) cells.push({ day: d, inMonth: true })
  const tail = cells.length % 7
  if (tail > 0) for (let i = 0; i < 7 - tail; i++) cells.push({ day: 0, inMonth: false })
  return cells
}

function dkey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function monthRange(year: number, month: number) {
  const mm = String(month + 1).padStart(2, '0')
  const last = new Date(year, month + 1, 0).getDate()
  return { start: `${year}-${mm}-01`, end: `${year}-${mm}-${String(last).padStart(2,'0')}` }
}

export default function PlanningPage() {
  const router = useRouter()
  const supabase = createClient()
  const today  = new Date()
  const quotaRef = useRef<HTMLDivElement>(null)

  const [mounted,     setMounted]     = useState(false)
  const [clients,     setClients]     = useState<ClientRow[]>([])
  const [contentPieces, setContentPieces] = useState<ContentRow[]>([])
  const [viewMonth,   setViewMonth]   = useState(today.getMonth())
  const [viewYear,    setViewYear]    = useState(today.getFullYear())
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [addClient,   setAddClient]   = useState('')
  const [addType,     setAddType]     = useState<ContentType>('graphic')
  const [addTitle,    setAddTitle]    = useState('')

  // Load clients once
  useEffect(() => {
    supabase.from('clients').select('id, name, initials, brand_color, content_this_month').order('name')
      .then(({ data }) => {
        if (data) {
          setClients(data)
          if (data[0] && !addClient) setAddClient(data[0].id)
        }
      })
    setMounted(true)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Load content for current month
  useEffect(() => {
    const { start, end } = monthRange(viewYear, viewMonth)
    supabase.from('content_pieces')
      .select('id, title, type, status, client_id, scheduled_date')
      .gte('scheduled_date', start)
      .lte('scheduled_date', end)
      .then(({ data }) => { if (data) setContentPieces(data) })
  }, [viewYear, viewMonth]) // eslint-disable-line react-hooks/exhaustive-deps

  useGSAP(() => {
    if (!mounted || !quotaRef.current) return
    gsap.fromTo('.quota-card',
      { y: 20, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.4, stagger: 0.08, ease: 'back.out(1.3)', clearProps: 'all' }
    )
  }, { dependencies: [mounted, clients.length], scope: quotaRef })

  const miniCells = buildMiniGrid(viewYear, viewMonth)

  // Per-client quota stats for this month
  const clientQuotas = clients.map(client => {
    const monthContent = contentPieces.filter(c => c.client_id === client.id)
    const byType: Record<ContentType, number> = { graphic: 0, video: 0, reel: 0, story: 0 }
    monthContent.forEach(c => { byType[c.type as ContentType]++ })
    return { client, target: client.content_this_month, planned: monthContent.length, byType }
  })

  // Content dots per day
  const contentByDay = new Map<number, ContentRow[]>()
  contentPieces.forEach(c => {
    const day = parseInt(c.scheduled_date.slice(8, 10), 10)
    if (!contentByDay.has(day)) contentByDay.set(day, [])
    contentByDay.get(day)!.push(c)
  })

  // Selected day content
  const dayContent = selectedDay
    ? contentPieces.filter(c => c.scheduled_date === dkey(selectedDay))
    : []

  function navigate(dir: number) {
    const d = new Date(viewYear, viewMonth + dir)
    setViewMonth(d.getMonth())
    setViewYear(d.getFullYear())
    setSelectedDay(null)
  }

  function selectDay(day: number) {
    if (day <= 0) return
    setSelectedDay(new Date(viewYear, viewMonth, day))
    setShowAddForm(false)
  }

  function goToBrief(contentId?: string) {
    if (contentId) {
      router.push(`/brief/${contentId}`)
    } else if (selectedDay) {
      const dateStr = dkey(selectedDay)
      router.push(`/brief/new?date=${dateStr}&client=${addClient}&type=${addType}&title=${encodeURIComponent(addTitle)}`)
    }
  }

  if (!mounted) return null

  const totalPlanned = clientQuotas.reduce((a, q) => a + q.planned, 0)
  const totalTarget  = clientQuotas.reduce((a, q) => a + q.target, 0)

  return (
    <main className="page-main" style={{ flex: 1, minWidth: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <div style={{ background: '#0F1A14', padding: '18px 20px 16px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '0.656rem', color: 'hsl(140,7%,48%)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '1px' }}>Content</p>
            <h1 style={{ fontSize: '1.167rem', fontWeight: 800, color: 'hsl(42,22%,84%)', lineHeight: 1 }}>Planning</h1>
          </div>

          {/* Progress ring */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <ProgressRing value={totalPlanned} total={totalTarget} />
            <div>
              <p style={{ fontSize: '1rem', fontWeight: 800, color: 'hsl(25,82%,60%)', lineHeight: 1 }}>{totalPlanned}/{totalTarget}</p>
              <p style={{ fontSize: '0.6rem', color: 'hsl(140,7%,48%)', marginTop: '2px' }}>posts planned</p>
            </div>
          </div>

          {/* Month nav */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <NavBtn onClick={() => navigate(-1)}>‹</NavBtn>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'hsl(42,22%,84%)', minWidth: '100px', textAlign: 'center' }}>
              {MONTHS[viewMonth].slice(0, 3)} {viewYear}
            </span>
            <NavBtn onClick={() => navigate(1)}>›</NavBtn>
          </div>
        </div>
      </div>

      {/* ── Main content ──────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0' }}>
        <div className="planning-layout" style={{ display: 'flex', flex: 1, minHeight: 0 }}>
          <style>{`
            .planning-layout { flex-direction: column; }
            @media(min-width:768px) { .planning-layout { flex-direction: row !important; } }
          `}</style>

          {/* ── Left: Client Quotas ────────────────────────────────────────── */}
          <div
            ref={quotaRef}
            style={{ padding: '16px', overflowY: 'auto', flex: '0 0 auto' }}
            className="quota-panel"
          >
            <style>{`
              .quota-panel { max-height: 260px; }
              @media(min-width:768px) { .quota-panel { width: 300px; max-height: none !important; border-right: 1px solid hsl(38,14%,90%); } }
            `}</style>
            <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'hsl(24,20%,11%)', marginBottom: '10px' }}>Client Quotas</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {clientQuotas.map(({ client, target, planned, byType }) => {
                const pct = target > 0 ? Math.round((planned / target) * 100) : 0
                const isFull = planned >= target
                return (
                  <div
                    key={client.id}
                    className="quota-card"
                    style={{
                      background: 'hsl(42,25%,99%)',
                      borderRadius: '14px',
                      padding: '14px',
                      border: `1px solid ${isFull ? 'hsl(154,45%,80%)' : 'hsl(38,14%,90%)'}`,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                      <div style={{
                        width: '32px', height: '32px', borderRadius: '8px',
                        background: client.brand_color,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 800, fontSize: '11px', color: '#fff', flexShrink: 0,
                      }}>
                        {client.initials}
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: '0.8rem', fontWeight: 700, color: 'hsl(24,20%,11%)', lineHeight: 1.2 }}>{client.name}</p>
                        <p style={{ fontSize: '0.656rem', color: 'hsl(24,10%,54%)' }}>{planned} of {target} planned</p>
                      </div>
                      <span style={{
                        fontSize: '0.75rem', fontWeight: 800,
                        color: isFull ? 'hsl(154,50%,40%)' : pct > 50 ? 'hsl(25,82%,60%)' : 'hsl(24,10%,44%)',
                      }}>
                        {pct}%
                      </span>
                    </div>

                    <div style={{ height: '6px', borderRadius: '99px', background: 'hsl(42,18%,93%)', overflow: 'hidden', marginBottom: '8px' }}>
                      <div style={{
                        height: '100%', width: `${Math.min(pct, 100)}%`,
                        borderRadius: '99px',
                        background: isFull ? 'hsl(154,50%,40%)' : client.brand_color,
                        transition: 'width 0.6s cubic-bezier(0.34,1.56,0.64,1)',
                      }} />
                    </div>

                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {(Object.entries(byType) as [ContentType, number][]).map(([t, n]) => (
                        <div key={t} style={{
                          display: 'flex', alignItems: 'center', gap: '4px',
                          padding: '2px 7px', borderRadius: '99px',
                          background: n > 0 ? `${TYPE_CFG[t].bg}20` : 'hsl(42,15%,94%)',
                        }}>
                          <div style={{ width: '6px', height: '6px', borderRadius: '2px', background: TYPE_CFG[t].bg }} />
                          <span style={{ fontSize: '0.6rem', fontWeight: 600, color: n > 0 ? 'hsl(24,20%,11%)' : 'hsl(24,8%,64%)' }}>
                            {n}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* ── Right: Mini Calendar + Day Drawer ──────────────────────────── */}
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'auto', padding: '16px' }}>

            {/* Mini Calendar */}
            <div style={{ marginBottom: '16px', maxWidth: '320px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginBottom: '4px' }}>
                {DAYS.map((d, i) => (
                  <div key={i} style={{ textAlign: 'center', fontSize: '0.6rem', fontWeight: 700, color: 'hsl(24,10%,44%)', padding: '4px 0' }}>{d}</div>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
                {miniCells.map((cell, i) => {
                  if (!cell.inMonth) return <div key={i} style={{ aspectRatio: '1', borderRadius: '8px', maxHeight: '40px' }} />
                  const isToday = cell.day === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear()
                  const isSelected = selectedDay?.getDate() === cell.day && selectedDay?.getMonth() === viewMonth
                  const dayPieces = contentByDay.get(cell.day) || []
                  const isPast = new Date(viewYear, viewMonth, cell.day) < today && !isToday

                  return (
                    <button
                      key={i}
                      onClick={() => selectDay(cell.day)}
                      style={{
                        aspectRatio: '1',
                        maxHeight: '40px',
                        borderRadius: '8px',
                        border: isSelected ? '2px solid hsl(25,82%,60%)' : isToday ? '2px solid hsl(200,82%,58%)' : '2px solid transparent',
                        background: isSelected ? 'rgba(209,101,39,0.1)' : 'hsl(42,25%,99%)',
                        cursor: 'pointer',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px',
                        opacity: isPast ? 0.45 : 1,
                        transition: 'border-color 0.12s, background 0.12s',
                      }}
                    >
                      <span style={{
                        fontSize: '0.7rem',
                        fontWeight: isToday || isSelected ? 800 : 500,
                        color: isSelected ? 'hsl(25,82%,60%)' : isToday ? 'hsl(200,82%,58%)' : 'hsl(24,20%,11%)',
                        lineHeight: 1,
                      }}>
                        {cell.day}
                      </span>
                      {dayPieces.length > 0 && (
                        <div style={{ display: 'flex', gap: '2px' }}>
                          {dayPieces.slice(0, 3).map((cp, j) => (
                            <div key={j} style={{ width: '4px', height: '4px', borderRadius: '50%', background: TYPE_CFG[cp.type as ContentType]?.bg ?? 'hsl(24,10%,60%)' }} />
                          ))}
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* ── Day Drawer ─────────────────────────────────────────────────── */}
            {selectedDay ? (
              <div style={{
                flex: 1,
                background: 'hsl(42,25%,99%)',
                borderRadius: '16px',
                border: '1px solid hsl(38,14%,90%)',
                padding: '16px',
                display: 'flex', flexDirection: 'column',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div>
                    <p style={{ fontSize: '1rem', fontWeight: 800, color: 'hsl(24,20%,11%)', lineHeight: 1.2 }}>
                      {selectedDay.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                    </p>
                    <p style={{ fontSize: '0.75rem', color: 'hsl(24,10%,54%)', marginTop: '2px' }}>
                      {dayContent.length} post{dayContent.length !== 1 ? 's' : ''} planned
                    </p>
                  </div>
                  <button
                    onClick={() => router.push(`/calendar/${dkey(selectedDay)}`)}
                    style={{
                      padding: '5px 10px', borderRadius: '8px',
                      background: 'hsl(42,18%,93%)', border: 'none',
                      fontSize: '0.75rem', fontWeight: 600, color: 'hsl(24,10%,44%)', cursor: 'pointer',
                    }}
                  >
                    Day View →
                  </button>
                </div>

                {dayContent.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
                    {dayContent.map(cp => {
                      const client = clients.find(c => c.id === cp.client_id)
                      const cfg = TYPE_CFG[cp.type as ContentType] ?? TYPE_CFG.graphic
                      return (
                        <div
                          key={cp.id}
                          onClick={() => goToBrief(cp.id)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '10px',
                            padding: '10px 12px', borderRadius: '10px',
                            background: `${cfg.bg}12`,
                            border: `1px solid ${cfg.bg}30`,
                            cursor: 'pointer',
                            transition: 'transform 0.12s ease',
                          }}
                          onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateX(4px)' }}
                          onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = '' }}
                        >
                          <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: cfg.bg, flexShrink: 0 }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'hsl(24,20%,11%)', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cp.title}</p>
                            <p style={{ fontSize: '0.656rem', color: 'hsl(24,10%,54%)' }}>{client?.name} · {cfg.label}</p>
                          </div>
                          <span style={{
                            fontSize: '0.6rem', fontWeight: 600,
                            padding: '2px 7px', borderRadius: '99px',
                            background: cp.status === 'overdue' ? 'hsl(4,78%,93%)' : 'hsl(42,18%,93%)',
                            color: cp.status === 'overdue' ? 'hsl(4,72%,38%)' : 'hsl(24,10%,44%)',
                            textTransform: 'capitalize', whiteSpace: 'nowrap',
                          }}>
                            {cp.status.replace(/-/g, ' ')}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Add content section */}
                {!showAddForm ? (
                  <button
                    onClick={() => setShowAddForm(true)}
                    style={{
                      padding: '12px', borderRadius: '10px',
                      border: '1.5px dashed rgba(209,101,39,0.4)',
                      background: 'rgba(209,101,39,0.04)',
                      cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                      transition: 'border-color 0.15s, background 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'hsl(25,82%,60%)'; e.currentTarget.style.background = 'rgba(209,101,39,0.08)' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(209,101,39,0.4)'; e.currentTarget.style.background = 'rgba(209,101,39,0.04)' }}
                  >
                    <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'hsl(25,82%,60%)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 700 }}>+</span>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'hsl(25,82%,60%)' }}>Add Content</span>
                  </button>
                ) : (
                  <div style={{
                    padding: '14px', borderRadius: '12px',
                    background: 'hsl(42,18%,96%)',
                    border: '1px solid hsl(38,14%,90%)',
                    display: 'flex', flexDirection: 'column', gap: '12px',
                  }}>
                    {/* Client */}
                    <div>
                      <p style={{ fontSize: '0.7rem', fontWeight: 700, color: 'hsl(24,20%,11%)', marginBottom: '6px' }}>Client</p>
                      <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                        {clients.map(c => (
                          <button key={c.id} onClick={() => setAddClient(c.id)} style={{
                            padding: '5px 10px', borderRadius: '99px', border: 'none', cursor: 'pointer',
                            background: addClient === c.id ? c.brand_color : 'hsl(42,25%,99%)',
                            color: addClient === c.id ? '#fff' : 'hsl(24,20%,11%)',
                            fontSize: '0.7rem', fontWeight: 600, transition: 'background 0.12s',
                          }}>
                            {c.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Type */}
                    <div>
                      <p style={{ fontSize: '0.7rem', fontWeight: 700, color: 'hsl(24,20%,11%)', marginBottom: '6px' }}>Type</p>
                      <div style={{ display: 'flex', gap: '5px' }}>
                        {(Object.entries(TYPE_CFG) as [ContentType, typeof TYPE_CFG[ContentType]][]).map(([t, cfg]) => (
                          <button key={t} onClick={() => setAddType(t)} style={{
                            padding: '5px 10px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                            background: addType === t ? cfg.bg : 'hsl(42,25%,99%)',
                            color: addType === t ? cfg.text : 'hsl(24,20%,11%)',
                            fontSize: '0.7rem', fontWeight: 700, transition: 'background 0.12s',
                          }}>
                            {cfg.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Title */}
                    <div>
                      <p style={{ fontSize: '0.7rem', fontWeight: 700, color: 'hsl(24,20%,11%)', marginBottom: '6px' }}>Title (optional)</p>
                      <input
                        value={addTitle}
                        onChange={e => setAddTitle(e.target.value)}
                        placeholder="e.g., Morning Ritual Series"
                        style={{
                          width: '100%', padding: '9px 12px', borderRadius: '8px',
                          background: 'hsl(42,25%,99%)', border: '1px solid hsl(38,14%,90%)',
                          fontSize: '0.8rem', color: 'hsl(24,20%,11%)', outline: 'none',
                          boxSizing: 'border-box',
                        }}
                        onFocus={e => { e.target.style.borderColor = 'hsl(200,82%,65%)' }}
                        onBlur={e => { e.target.style.borderColor = 'hsl(38,14%,90%)' }}
                      />
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => { setShowAddForm(false); setAddTitle('') }} style={{
                        flex: 1, padding: '10px', borderRadius: '8px',
                        background: 'hsl(42,25%,99%)', border: '1px solid hsl(38,14%,90%)',
                        fontSize: '0.8rem', fontWeight: 600, color: 'hsl(24,10%,44%)', cursor: 'pointer',
                      }}>
                        Cancel
                      </button>
                      <button onClick={() => goToBrief()} style={{
                        flex: 2, padding: '10px', borderRadius: '8px',
                        background: 'hsl(25,82%,60%)', border: 'none',
                        fontSize: '0.8rem', fontWeight: 700, color: '#fff', cursor: 'pointer',
                        boxShadow: '0 4px 12px hsla(25,82%,60%,0.3)',
                      }}>
                        Create Brief →
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: '12px',
                padding: '40px 20px',
              }}>
                <div style={{
                  width: '80px', height: '80px', borderRadius: '20px',
                  background: 'hsl(42,18%,94%)',
                  border: '1.5px dashed hsl(38,14%,85%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.3 }}>
                    <rect x="4" y="3" width="16" height="18" rx="3" stroke="hsl(24,10%,44%)" strokeWidth="1.5"/>
                    <path d="M9 3v3M15 3v3M8 10h3M8 14h8" stroke="hsl(24,10%,44%)" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </div>
                <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'hsl(24,10%,44%)' }}>Select a day to plan</p>
                <p style={{ fontSize: '0.75rem', color: 'hsl(24,8%,64%)', textAlign: 'center', maxWidth: '240px' }}>
                  Click on any date in the calendar above to view existing content or add new posts.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}

function ProgressRing({ value, total }: { value: number; total: number }) {
  const size = 40
  const r = 15
  const circ = 2 * Math.PI * r
  const pct = total > 0 ? value / total : 0
  const dash = pct * circ
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4"/>
      <circle cx={size/2} cy={size/2} r={r} fill="none"
        stroke="hsl(25,82%,60%)" strokeWidth="4"
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`}
        style={{ transition: 'stroke-dasharray 0.8s cubic-bezier(0.34,1.56,0.64,1)' }}
      />
    </svg>
  )
}

function NavBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{
      width: '28px', height: '28px', borderRadius: '50%',
      border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)',
      color: 'hsl(42,22%,84%)', cursor: 'pointer', fontSize: '16px',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {children}
    </button>
  )
}
