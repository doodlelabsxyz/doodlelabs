'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/supabase/useUser'
import type { ContentType } from '@/lib/types'

gsap.registerPlugin(useGSAP)

type ViewMode = 'month' | 'week' | 'day'

type ContentRow = {
  id: string; title: string; type: ContentType; status: string
  scheduled_date: string; client_id: string
}
type ClientRow = { id: string; name: string; brand_color: string }

const TYPE_CFG: Record<ContentType, { bg: string; light: string; text: string; label: string }> = {
  graphic: { bg: 'hsl(14,72%,62%)',  light: 'hsl(14,72%,94%)',  text: '#fff',    label: 'Graphic' },
  video:   { bg: 'hsl(40,95%,52%)',  light: 'hsl(40,95%,92%)',  text: '#3a2800', label: 'Video'   },
  reel:    { bg: 'hsl(161,58%,44%)', light: 'hsl(161,58%,92%)', text: '#fff',    label: 'Reel'    },
  story:   { bg: 'hsl(268,60%,62%)', light: 'hsl(268,60%,94%)', text: '#fff',    label: 'Story'   },
}

const MONTHS     = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DAYS_SHORT = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']

function toStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function getMondayOf(d: Date) {
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const m = new Date(d); m.setDate(d.getDate() + diff); m.setHours(0,0,0,0)
  return m
}

function buildMonthGrid(year: number, month: number) {
  const firstDow   = new Date(year, month, 1).getDay()
  const startPad   = firstDow === 0 ? 6 : firstDow - 1
  const daysInMo   = new Date(year, month + 1, 0).getDate()
  const daysInPrev = new Date(year, month, 0).getDate()
  const cells: { date: Date; inMonth: boolean }[] = []
  for (let i = startPad - 1; i >= 0; i--)
    cells.push({ date: new Date(year, month - 1, daysInPrev - i), inMonth: false })
  for (let d = 1; d <= daysInMo; d++)
    cells.push({ date: new Date(year, month, d), inMonth: true })
  const tail = cells.length % 7
  if (tail > 0)
    for (let d = 1; d <= 7 - tail; d++)
      cells.push({ date: new Date(year, month + 1, d), inMonth: false })
  return cells
}

function buildWeekDays(monday: Date) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday); d.setDate(monday.getDate() + i); return d
  })
}

function isReviewStatus(status: string) {
  return status === 'client-review' || status === 'ready-for-review'
}

// ─────────────────────────────────────────────────────────────────────────────
export default function ClientCalendarPage() {
  const router  = useRouter()
  const { user } = useUser()
  const today   = new Date(); today.setHours(0,0,0,0)
  const bodyRef = useRef<HTMLDivElement>(null)

  const [mounted,   setMounted]   = useState(false)
  const [loading,   setLoading]   = useState(true)
  const [view,      setView]      = useState<ViewMode>('month')
  const [content,   setContent]   = useState<ContentRow[]>([])
  const [clients,   setClients]   = useState<ClientRow[]>([])
  const [clientId,  setClientId]  = useState('')
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [viewYear,  setViewYear]  = useState(today.getFullYear())
  const [weekStart, setWeekStart] = useState(() => getMondayOf(today))
  const [dayDate,   setDayDate]   = useState(new Date(today))

  // Identify client on mount
  useEffect(() => {
    if (!user) return
    async function init() {
      const supabase = createClient()
      if (user!.role === 'client') {
        const { data: cu } = await supabase
          .from('client_users').select('client_id').eq('user_id', user!.id).single()
        if (cu?.client_id) {
          setClientId(cu.client_id)
          const { data: c } = await supabase
            .from('clients').select('id, name, brand_color').eq('id', cu.client_id)
          if (c) setClients(c)
        }
      } else {
        const { data: c } = await supabase
          .from('clients').select('id, name, brand_color').order('name')
        if (c) {
          setClients(c)
          const stored = sessionStorage.getItem('clientId')
          setClientId(stored && c.find((x: ClientRow) => x.id === stored) ? stored : (c[0]?.id ?? ''))
        }
      }
      setMounted(true)
    }
    init()
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch content for date range
  const fetchRange = useCallback(async (from: string, to: string) => {
    if (!clientId) return
    setLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('content_pieces')
      .select('id, title, type, status, scheduled_date, client_id')
      .eq('client_id', clientId)
      .gte('scheduled_date', from)
      .lte('scheduled_date', to)
    if (data) setContent(data as ContentRow[])
    setLoading(false)
  }, [clientId])

  useEffect(() => {
    if (!clientId) return
    if (view === 'month') {
      const mm   = String(viewMonth + 1).padStart(2, '0')
      const last = new Date(viewYear, viewMonth + 1, 0).getDate()
      fetchRange(`${viewYear}-${mm}-01`, `${viewYear}-${mm}-${String(last).padStart(2,'0')}`)
    } else if (view === 'week') {
      const end = new Date(weekStart); end.setDate(weekStart.getDate() + 6)
      fetchRange(toStr(weekStart), toStr(end))
    } else {
      fetchRange(toStr(dayDate), toStr(dayDate))
    }
  }, [view, viewMonth, viewYear, weekStart, dayDate, clientId, fetchRange])

  useGSAP(() => {
    if (!mounted || !bodyRef.current) return
    gsap.fromTo('.c-cell',
      { opacity: 0, y: 6 },
      { opacity: 1, y: 0, duration: 0.25, stagger: 0.006, ease: 'power2.out', clearProps: 'opacity,transform' }
    )
  }, { dependencies: [mounted, view, viewMonth, viewYear, clientId], scope: bodyRef })

  // Build content map keyed by date string
  const cmap = new Map<string, ContentRow[]>()
  content.forEach(cp => {
    if (!cmap.has(cp.scheduled_date)) cmap.set(cp.scheduled_date, [])
    cmap.get(cp.scheduled_date)!.push(cp)
  })

  // Stats
  const statApproved = content.filter(c => ['approved','posted'].includes(c.status)).length
  const statReview   = content.filter(c => isReviewStatus(c.status)).length
  const statPlanned  = content.filter(c => !['approved','posted','client-review','ready-for-review'].includes(c.status)).length

  // Navigation
  function navigate(dir: number) {
    if (view === 'month') {
      const d = new Date(viewYear, viewMonth + dir, 1)
      setViewMonth(d.getMonth()); setViewYear(d.getFullYear())
    } else if (view === 'week') {
      const s = new Date(weekStart); s.setDate(weekStart.getDate() + dir * 7); setWeekStart(s)
    } else {
      const d = new Date(dayDate); d.setDate(dayDate.getDate() + dir); setDayDate(d)
    }
  }

  function goToday() {
    const t = new Date(); t.setHours(0,0,0,0)
    setViewMonth(t.getMonth()); setViewYear(t.getFullYear())
    setWeekStart(getMondayOf(t)); setDayDate(t)
  }

  function headLabel() {
    if (view === 'month') return `${MONTHS[viewMonth].slice(0,3)} ${viewYear}`
    if (view === 'week') {
      const end = new Date(weekStart); end.setDate(weekStart.getDate() + 6)
      return `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
    }
    return dayDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  const client = clients.find(c => c.id === clientId)

  if (!mounted) return null

  return (
    <main style={{ flex: 1, minWidth: 0, overflowY: view === 'week' ? 'hidden' : 'auto', display: 'flex', flexDirection: 'column', background: 'hsl(42,30%,97%)' }}>

      {/* Global styles */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        .no-scroll::-webkit-scrollbar { display: none }
        .no-scroll { -ms-overflow-style: none; scrollbar-width: none }
        /* Fixed cell width on mobile — immune to sibling layout changes */
        .cl-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; }
        @media (max-width: 767px) {
          .cl-grid { grid-template-columns: repeat(7, calc((100vw - 56px) / 7)); }
        }
      `}</style>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{ background: '#0F1A14', flexShrink: 0, position: 'sticky', top: 0, zIndex: 20 }}>

        {/* Admin client switcher */}
        {user?.role !== 'client' && clients.length > 1 && (
          <div className="no-scroll" style={{ display: 'flex', gap: '6px', overflowX: 'auto', padding: '12px 16px 0' }}>
            {clients.map(c => (
              <button key={c.id}
                onClick={() => { setClientId(c.id); sessionStorage.setItem('clientId', c.id) }}
                style={{
                  padding: '4px 12px', borderRadius: '99px', border: 'none', cursor: 'pointer',
                  background: clientId === c.id ? c.brand_color : 'rgba(255,255,255,0.06)',
                  color: clientId === c.id ? '#fff' : 'hsl(140,7%,52%)',
                  fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0,
                  transition: 'background 0.15s',
                }}
              >
                {c.name}
              </button>
            ))}
          </div>
        )}

        {/* Row 1: title + nav + today */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '14px 16px 0' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: '0.58rem', color: 'hsl(140,7%,44%)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '1px' }}>
              {client?.name ?? 'Content'} · Calendar
            </p>
            <h1 style={{ fontSize: '1rem', fontWeight: 800, color: 'hsl(42,22%,84%)', lineHeight: 1 }}>Content Schedule</h1>
          </div>
          <NavBtn onClick={() => navigate(-1)}>‹</NavBtn>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'hsl(42,22%,84%)', minWidth: '96px', textAlign: 'center', whiteSpace: 'nowrap' }}>
            {headLabel()}
          </span>
          <NavBtn onClick={() => navigate(1)}>›</NavBtn>
          <button onClick={goToday} style={{
            padding: '4px 9px', borderRadius: '99px',
            border: '1px solid rgba(255,255,255,0.14)', background: 'transparent',
            color: 'hsl(42,22%,76%)', fontSize: '0.65rem', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
          }}>
            Today
          </button>
        </div>

        {/* Row 2: view tabs + stats */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 16px 0' }}>
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.07)', borderRadius: '10px', padding: '3px', gap: '2px' }}>
            {(['month','week','day'] as ViewMode[]).map(v => (
              <button key={v} onClick={() => setView(v)} style={{
                padding: '5px 13px', borderRadius: '7px', border: 'none', cursor: 'pointer',
                background: view === v ? 'hsl(25,82%,60%)' : 'transparent',
                color: view === v ? '#fff' : 'hsl(140,7%,48%)',
                fontSize: '0.7rem', fontWeight: 700, textTransform: 'capitalize',
                transition: 'background 0.15s, color 0.15s',
                boxShadow: view === v ? '0 2px 8px hsla(25,82%,60%,0.4)' : 'none',
              }}>
                {v}
              </button>
            ))}
          </div>
          <div style={{ flex: 1 }} />
          <Chip n={content.length} label="total"    color="hsl(25,82%,60%)" />
          <Chip n={statApproved}   label="approved" color="hsl(154,55%,50%)" />
          {statReview > 0 && <Chip n={statReview} label="review" color="hsl(40,95%,52%)" />}
          {statPlanned > 0 && <Chip n={statPlanned} label="planned" color="hsl(140,7%,48%)" />}
        </div>

        {/* Row 3: day headers (month view only) */}
        {view === 'month' && (
          <div style={{ padding: '10px 12px 10px' }}>
            <div className="cl-grid">
              {DAYS_SHORT.map(d => (
                <div key={d} style={{
                  textAlign: 'center', fontSize: '0.56rem', fontWeight: 700,
                  color: 'hsl(140,7%,40%)', letterSpacing: '0.06em', textTransform: 'uppercase', padding: '2px 0',
                }}>
                  {d}
                </div>
              ))}
            </div>
          </div>
        )}
        {view !== 'month' && <div style={{ height: '12px' }} />}
      </div>

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      <div ref={bodyRef} style={{ flex: 1, overflow: view === 'week' ? 'hidden' : 'auto', display: 'flex', flexDirection: 'column' }}>
        {loading ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', border: '3px solid hsl(25,82%,60%)', borderTopColor: 'transparent', animation: 'spin 0.7s linear infinite' }} />
            <span style={{ fontSize: '0.8rem', color: 'hsl(24,10%,54%)' }}>Loading…</span>
          </div>
        ) : view === 'month' ? (
          <MonthView viewYear={viewYear} viewMonth={viewMonth} today={today} cmap={cmap} router={router} />
        ) : view === 'week' ? (
          <WeekView
            weekStart={weekStart} today={today} cmap={cmap} router={router}
            onDayClick={d => { setDayDate(d); setView('day') }}
          />
        ) : (
          <DayView dayDate={dayDate} today={today} cmap={cmap} router={router} />
        )}
      </div>
    </main>
  )
}

// ─── Month View ───────────────────────────────────────────────────────────────
function MonthView({ viewYear, viewMonth, today, cmap, router }: {
  viewYear: number; viewMonth: number; today: Date
  cmap: Map<string, ContentRow[]>; router: ReturnType<typeof useRouter>
}) {
  const cells    = buildMonthGrid(viewYear, viewMonth)
  const todayStr = toStr(today)

  return (
    <div style={{ padding: '0 12px 100px' }}>
      <div className="cl-grid">
        {cells.map((cell, i) => {
          const key      = toStr(cell.date)
          const pieces   = cmap.get(key) || []
          const isToday  = key === todayStr
          const hasReview = pieces.some(p => isReviewStatus(p.status))
          const shown    = pieces.slice(0, 2)
          const more     = pieces.length - shown.length

          return (
            <div
              key={i}
              className="c-cell"
              onClick={() => pieces.length > 0 && router.push(`/client/approval/${pieces[0].id}`)}
              style={{
                minHeight: '82px',
                background: cell.inMonth ? (pieces.length ? '#fff' : 'hsl(42,22%,98%)') : 'hsl(42,14%,94%)',
                borderRadius: '10px',
                border: isToday
                  ? '2px solid hsl(25,82%,58%)'
                  : hasReview
                    ? '1.5px solid hsl(40,95%,60%)'
                    : '1.5px solid hsl(38,14%,89%)',
                padding: '6px 5px 4px',
                cursor: pieces.length > 0 ? 'pointer' : 'default',
                opacity: cell.inMonth ? 1 : 0.35,
                position: 'relative', overflow: 'hidden',
                transition: 'transform 0.12s, box-shadow 0.12s',
              }}
              onMouseEnter={e => {
                if (pieces.length > 0) {
                  const el = e.currentTarget as HTMLDivElement
                  el.style.transform = 'translateY(-2px)'
                  el.style.boxShadow = '0 6px 16px rgba(0,0,0,0.09)'
                }
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLDivElement
                el.style.transform = ''; el.style.boxShadow = ''
              }}
            >
              {/* Date circle */}
              <div style={{
                width: '20px', height: '20px', borderRadius: '6px', marginBottom: '4px',
                background: isToday ? 'hsl(25,82%,60%)' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{
                  fontSize: '0.65rem',
                  fontWeight: isToday ? 800 : 600,
                  color: isToday ? '#fff' : 'hsl(24,15%,22%)',
                  lineHeight: 1,
                }}>
                  {cell.date.getDate()}
                </span>
              </div>

              {/* Content pills */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {shown.map(cp => {
                  const tc      = TYPE_CFG[cp.type] ?? TYPE_CFG.graphic
                  const review  = isReviewStatus(cp.status)
                  const approved = cp.status === 'approved' || cp.status === 'posted'
                  return (
                    <div key={cp.id} style={{
                      display: 'flex', alignItems: 'center', gap: '2px',
                      padding: '2px 4px', borderRadius: '4px',
                      background: review ? 'hsl(40,95%,92%)' : approved ? 'hsl(154,50%,90%)' : tc.light,
                      borderLeft: `2.5px solid ${review ? 'hsl(40,95%,52%)' : approved ? 'hsl(154,50%,44%)' : tc.bg}`,
                    }}>
                      <span style={{
                        fontSize: '0.46rem', fontWeight: 800, flexShrink: 0,
                        color: review ? 'hsl(40,72%,38%)' : approved ? 'hsl(154,50%,36%)' : tc.bg,
                      }}>
                        {review ? '!' : approved ? '✓' : tc.label.slice(0,1)}
                      </span>
                      <span style={{
                        fontSize: '0.46rem',
                        color: review ? 'hsl(40,60%,32%)' : approved ? 'hsl(154,40%,32%)' : tc.bg,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {cp.title}
                      </span>
                    </div>
                  )
                })}
                {more > 0 && (
                  <p style={{ fontSize: '0.44rem', color: 'hsl(24,10%,54%)', paddingLeft: '4px' }}>+{more} more</p>
                )}
              </div>

              {/* Review indicator bar at bottom */}
              {hasReview && (
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0, height: '3px',
                  background: 'hsl(40,95%,60%)',
                }} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Week View ────────────────────────────────────────────────────────────────
function WeekView({ weekStart, today, cmap, router, onDayClick }: {
  weekStart: Date; today: Date
  cmap: Map<string, ContentRow[]>; router: ReturnType<typeof useRouter>
  onDayClick: (d: Date) => void
}) {
  const days     = buildWeekDays(weekStart)
  const todayStr = toStr(today)

  return (
    <div className="no-scroll" style={{ flex: 1, overflowX: 'auto', overflowY: 'auto', padding: '0 12px 100px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(148px, 1fr))', gap: '6px', minWidth: 'max-content', width: '100%' }}>
        {days.map((day, i) => {
          const key      = toStr(day)
          const pieces   = cmap.get(key) || []
          const isToday  = key === todayStr
          const isPast   = day < today && !isToday
          const hasReview = pieces.some(p => isReviewStatus(p.status))

          return (
            <div key={i} style={{
              background: isToday ? 'hsl(42,90%,98%)' : '#fff',
              borderRadius: '12px',
              border: isToday
                ? '2px solid hsl(25,82%,58%)'
                : hasReview
                  ? '1.5px solid hsl(40,95%,62%)'
                  : '1px solid hsl(38,14%,90%)',
              overflow: 'hidden',
              opacity: isPast ? 0.7 : 1,
            }}>
              {/* Day header */}
              <button
                onClick={() => onDayClick(day)}
                style={{
                  width: '100%', padding: '10px 12px', background: isToday ? 'hsl(25,82%,60%)' : 'hsl(42,16%,96%)',
                  border: 'none', cursor: 'pointer', textAlign: 'left',
                  borderBottom: '1px solid hsl(38,14%,90%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}
              >
                <div>
                  <p style={{ fontSize: '0.56rem', fontWeight: 600, color: isToday ? 'rgba(255,255,255,0.8)' : 'hsl(24,10%,54%)', textTransform: 'uppercase', letterSpacing: '0.06em', lineHeight: 1 }}>
                    {day.toLocaleDateString('en-US', { weekday: 'short' })}
                  </p>
                  <p style={{ fontSize: '1rem', fontWeight: 800, color: isToday ? '#fff' : 'hsl(24,20%,11%)', lineHeight: 1, marginTop: '2px' }}>
                    {day.getDate()}
                  </p>
                </div>
                {pieces.length > 0 && (
                  <span style={{
                    fontSize: '0.6rem', fontWeight: 800, padding: '2px 7px', borderRadius: '99px',
                    background: isToday ? 'rgba(255,255,255,0.25)' : hasReview ? 'hsl(40,95%,88%)' : 'hsl(42,18%,90%)',
                    color: isToday ? '#fff' : hasReview ? 'hsl(40,72%,38%)' : 'hsl(24,10%,44%)',
                  }}>
                    {pieces.length}
                  </span>
                )}
              </button>

              {/* Content cards */}
              <div style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: '6px', minHeight: '100px' }}>
                {pieces.length === 0 ? (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px 0' }}>
                    <span style={{ fontSize: '0.6rem', color: 'hsl(24,8%,72%)' }}>No posts</span>
                  </div>
                ) : pieces.map(cp => {
                  const tc      = TYPE_CFG[cp.type] ?? TYPE_CFG.graphic
                  const review  = isReviewStatus(cp.status)
                  const approved = cp.status === 'approved' || cp.status === 'posted'

                  return (
                    <div
                      key={cp.id}
                      onClick={() => router.push(`/client/approval/${cp.id}`)}
                      style={{
                        borderRadius: '8px', overflow: 'hidden', cursor: 'pointer',
                        border: review ? '1.5px solid hsl(40,95%,62%)' : '1px solid hsl(38,14%,90%)',
                        transition: 'transform 0.12s ease, box-shadow 0.12s ease',
                      }}
                      onMouseEnter={e => {
                        const el = e.currentTarget as HTMLDivElement
                        el.style.transform = 'translateY(-2px)'
                        el.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'
                      }}
                      onMouseLeave={e => {
                        const el = e.currentTarget as HTMLDivElement
                        el.style.transform = ''; el.style.boxShadow = ''
                      }}
                    >
                      {/* Color bar */}
                      <div style={{ height: '4px', background: review ? 'hsl(40,95%,56%)' : approved ? 'hsl(154,50%,44%)' : tc.bg }} />
                      <div style={{ padding: '8px 10px', background: review ? 'hsl(40,95%,97%)' : '#fff' }}>
                        {/* Status badge */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '5px' }}>
                          <span style={{
                            fontSize: '0.52rem', fontWeight: 700, padding: '1px 6px', borderRadius: '99px',
                            background: review ? 'hsl(40,95%,88%)' : approved ? 'hsl(154,50%,88%)' : tc.light,
                            color: review ? 'hsl(40,72%,38%)' : approved ? 'hsl(154,50%,36%)' : tc.bg,
                          }}>
                            {review ? '⚡ Needs review' : approved ? '✓ Approved' : tc.label}
                          </span>
                        </div>
                        <p style={{
                          fontSize: '0.72rem', fontWeight: 700, color: 'hsl(24,20%,11%)',
                          lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {cp.title}
                        </p>
                        <p style={{
                          fontSize: '0.58rem', color: 'hsl(24,10%,54%)', marginTop: '2px',
                          textTransform: 'capitalize',
                        }}>
                          {cp.status.replace(/-/g, ' ')}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Day View ─────────────────────────────────────────────────────────────────
function DayView({ dayDate, today, cmap, router }: {
  dayDate: Date; today: Date
  cmap: Map<string, ContentRow[]>; router: ReturnType<typeof useRouter>
}) {
  const key      = toStr(dayDate)
  const pieces   = cmap.get(key) || []
  const isToday  = key === toStr(today)
  const isPast   = dayDate < today && !isToday
  const hasReview = pieces.some(p => isReviewStatus(p.status))

  return (
    <div style={{ padding: '12px 16px 100px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

      {/* Date card */}
      <div style={{
        background: isToday ? '#0F1A14' : '#fff',
        borderRadius: '16px',
        border: hasReview ? '2px solid hsl(40,95%,62%)' : isToday ? '2px solid hsl(25,82%,58%)' : '1px solid hsl(38,14%,90%)',
        padding: '18px 20px',
        display: 'flex', alignItems: 'center', gap: '16px',
      }}>
        <div style={{ textAlign: 'center', flexShrink: 0 }}>
          <p style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: isToday ? 'hsl(140,7%,48%)' : 'hsl(24,10%,54%)', lineHeight: 1, marginBottom: '4px' }}>
            {dayDate.toLocaleDateString('en-US', { weekday: 'short' })}
          </p>
          <p style={{ fontSize: '2.2rem', fontWeight: 800, color: isToday ? 'hsl(42,22%,84%)' : 'hsl(24,20%,11%)', lineHeight: 1 }}>
            {dayDate.getDate()}
          </p>
          <p style={{ fontSize: '0.6rem', color: isToday ? 'hsl(140,7%,44%)' : 'hsl(24,8%,60%)', marginTop: '2px' }}>
            {dayDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
          </p>
        </div>

        <div style={{ flex: 1 }}>
          <p style={{ fontSize: '1.1rem', fontWeight: 800, color: isToday ? 'hsl(42,22%,84%)' : 'hsl(24,20%,11%)', lineHeight: 1, marginBottom: '6px' }}>
            {pieces.length} post{pieces.length !== 1 ? 's' : ''} scheduled
          </p>
          {hasReview ? (
            <p style={{ fontSize: '0.72rem', color: 'hsl(40,72%,48%)', fontWeight: 600 }}>
              ⚡ {pieces.filter(p => isReviewStatus(p.status)).length} waiting for your review
            </p>
          ) : isPast ? (
            <p style={{ fontSize: '0.72rem', color: 'hsl(24,10%,54%)' }}>Past date</p>
          ) : isToday ? (
            <p style={{ fontSize: '0.72rem', color: 'hsl(154,50%,50%)' }}>Today</p>
          ) : (
            <p style={{ fontSize: '0.72rem', color: 'hsl(24,10%,54%)' }}>Upcoming</p>
          )}
        </div>
      </div>

      {/* Content cards */}
      {pieces.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 24px', gap: '10px' }}>
          <div style={{
            width: '72px', height: '72px', borderRadius: '18px',
            background: 'hsl(42,18%,94%)', border: '1.5px dashed hsl(38,14%,85%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.3 }}>
              <rect x="3" y="4" width="18" height="16" rx="3" stroke="hsl(24,10%,44%)" strokeWidth="1.5"/>
              <path d="M8 10h8M8 14h5" stroke="hsl(24,10%,44%)" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'hsl(24,10%,44%)' }}>No content scheduled</p>
          <p style={{ fontSize: '0.75rem', color: 'hsl(24,8%,64%)', textAlign: 'center' }}>Nothing is planned for this day.</p>
        </div>
      ) : pieces.map(cp => {
        const tc      = TYPE_CFG[cp.type] ?? TYPE_CFG.graphic
        const review  = isReviewStatus(cp.status)
        const approved = cp.status === 'approved' || cp.status === 'posted'

        return (
          <div
            key={cp.id}
            onClick={() => router.push(`/client/approval/${cp.id}`)}
            className="c-cell"
            style={{
              background: '#fff', borderRadius: '14px', overflow: 'hidden', cursor: 'pointer',
              border: review ? '2px solid hsl(40,95%,62%)' : approved ? '1.5px solid hsl(154,50%,70%)' : '1px solid hsl(38,14%,90%)',
              boxShadow: review ? '0 4px 16px hsla(40,95%,60%,0.15)' : 'none',
              transition: 'transform 0.15s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.15s',
            }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLDivElement
              el.style.transform = 'translateY(-3px)'
              el.style.boxShadow = review ? '0 8px 24px hsla(40,95%,60%,0.2)' : '0 8px 24px rgba(0,0,0,0.08)'
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLDivElement
              el.style.transform = ''
              el.style.boxShadow = review ? '0 4px 16px hsla(40,95%,60%,0.15)' : 'none'
            }}
          >
            {/* Top color bar */}
            <div style={{ height: '5px', background: review ? 'hsl(40,95%,56%)' : approved ? 'hsl(154,50%,44%)' : tc.bg }} />

            <div style={{ padding: '14px 16px', background: review ? 'hsl(40,95%,98%)' : '#fff' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                {/* Type glyph */}
                <div style={{
                  width: '44px', height: '44px', borderRadius: '10px', flexShrink: 0,
                  background: review ? 'hsl(40,95%,88%)' : tc.light,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <TypeGlyph type={cp.type} color={review ? 'hsl(40,72%,48%)' : tc.bg} />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '0.9rem', fontWeight: 700, color: 'hsl(24,20%,11%)', lineHeight: 1.3, marginBottom: '5px' }}>
                    {cp.title}
                  </p>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{
                      fontSize: '0.6rem', fontWeight: 700, padding: '2px 8px', borderRadius: '99px',
                      background: review ? 'hsl(40,95%,88%)' : approved ? 'hsl(154,50%,88%)' : tc.light,
                      color: review ? 'hsl(40,72%,38%)' : approved ? 'hsl(154,50%,36%)' : tc.bg,
                    }}>
                      {review ? '⚡ Needs review' : approved ? '✓ Approved' : cp.status.replace(/-/g, ' ')}
                    </span>
                    <span style={{ fontSize: '0.6rem', color: 'hsl(24,10%,54%)', textTransform: 'capitalize' }}>
                      {tc.label}
                    </span>
                  </div>
                </div>

                {/* Arrow */}
                <div style={{ flexShrink: 0, color: review ? 'hsl(40,72%,48%)' : 'hsl(24,10%,64%)', fontSize: '1rem', alignSelf: 'center' }}>›</div>
              </div>

              {review && (
                <div style={{
                  marginTop: '12px', padding: '10px 12px', borderRadius: '8px',
                  background: 'hsl(40,95%,92%)', border: '1px solid hsl(40,95%,78%)',
                  display: 'flex', alignItems: 'center', gap: '8px',
                }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'hsl(40,62%,32%)' }}>
                    Tap to review and approve this content
                  </span>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── SVG type glyphs ──────────────────────────────────────────────────────────
function TypeGlyph({ type, color }: { type: ContentType; color: string }) {
  if (type === 'video') return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <rect x="2" y="5" width="15" height="14" rx="2.5" stroke={color} strokeWidth="1.5"/>
      <path d="M17 9l5-3v12l-5-3V9z" stroke={color} strokeWidth="1.5" strokeLinejoin="round"/>
    </svg>
  )
  if (type === 'reel') return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.5"/>
      <circle cx="12" cy="12" r="3" stroke={color} strokeWidth="1.5"/>
      <path d="M12 3v3M21 12h-3M12 21v-3M3 12h3" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
  if (type === 'story') return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <rect x="6" y="2" width="12" height="20" rx="3" stroke={color} strokeWidth="1.5"/>
      <path d="M9 7h6M9 11h4" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
  // graphic
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="3" width="18" height="18" rx="3" stroke={color} strokeWidth="1.5"/>
      <circle cx="8.5" cy="8.5" r="2" stroke={color} strokeWidth="1.5"/>
      <path d="M3 16l5-5 4 4 3-3 6 6" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

// ─── Small helpers ────────────────────────────────────────────────────────────
function Chip({ n, label, color }: { n: number; label: string; color: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <p style={{ fontSize: '0.9rem', fontWeight: 800, color, lineHeight: 1 }}>{n}</p>
      <p style={{ fontSize: '0.52rem', color: 'hsl(140,7%,44%)', marginTop: '1px' }}>{label}</p>
    </div>
  )
}

function NavBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{
      width: '28px', height: '28px', borderRadius: '8px', flexShrink: 0,
      border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)',
      color: 'hsl(42,22%,76%)', cursor: 'pointer', fontSize: '16px',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {children}
    </button>
  )
}
