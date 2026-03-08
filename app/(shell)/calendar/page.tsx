'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { createClient } from '@/lib/supabase/client'
import type { ContentType } from '@/lib/types'

gsap.registerPlugin(useGSAP)

type ViewMode = 'month' | 'week' | 'day'

const TYPE_CFG: Record<ContentType, { bg: string; light: string; text: string; label: string }> = {
  graphic: { bg: 'hsl(14,72%,62%)',  light: 'hsl(14,72%,94%)',  text: '#fff',    label: 'Graphic' },
  video:   { bg: 'hsl(40,95%,55%)',  light: 'hsl(40,95%,92%)',  text: '#3a2800', label: 'Video'   },
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

type ContentRow = { id: string; title: string; type: ContentType; status: string; scheduled_date: string; client_id: string; platforms: string[] }
type ClientRow  = { id: string; name: string; brand_color: string }

// ─────────────────────────────────────────────────────────
export default function CalendarPage() {
  const router  = useRouter()
  const today   = new Date(); today.setHours(0,0,0,0)
  const bodyRef = useRef<HTMLDivElement>(null)

  const [mounted,    setMounted]    = useState(false)
  const [loading,    setLoading]    = useState(true)
  const [view,       setView]       = useState<ViewMode>('month')
  const [content,    setContent]    = useState<ContentRow[]>([])
  const [clients,    setClients]    = useState<ClientRow[]>([])
  const [clientFil,  setClientFil]  = useState<string | null>(null)
  const [viewMonth,  setViewMonth]  = useState(today.getMonth())
  const [viewYear,   setViewYear]   = useState(today.getFullYear())
  const [weekStart,  setWeekStart]  = useState(() => getMondayOf(today))
  const [dayDate,    setDayDate]    = useState(new Date(today))

  const fetchRange = useCallback(async (from: string, to: string) => {
    setLoading(true)
    const supabase = createClient()
    const [cRes, clRes] = await Promise.all([
      supabase.from('content_pieces')
        .select('id, title, type, status, scheduled_date, client_id, platforms')
        .gte('scheduled_date', from).lte('scheduled_date', to),
      supabase.from('clients').select('id, name, brand_color'),
    ])
    setContent(cRes.data || [])
    setClients(clRes.data || [])
    setLoading(false)
    setMounted(true)
  }, [])

  useEffect(() => {
    if (view === 'month') {
      const cells = buildMonthGrid(viewYear, viewMonth)
      fetchRange(toStr(cells[0].date), toStr(cells[cells.length-1].date))
    } else if (view === 'week') {
      const days = buildWeekDays(weekStart)
      fetchRange(toStr(days[0]), toStr(days[6]))
    } else {
      fetchRange(toStr(dayDate), toStr(dayDate))
    }
  }, [view, viewMonth, viewYear, weekStart, dayDate, fetchRange])

  useGSAP(() => {
    if (loading || !bodyRef.current) return
    gsap.fromTo('.c-item',
      { opacity: 0, y: 8 },
      { opacity: 1, y: 0, duration: 0.28, stagger: { amount: 0.18 }, ease: 'power2.out', clearProps: 'opacity,transform' }
    )
  }, { dependencies: [loading, view], scope: bodyRef })

  const filtered = clientFil ? content.filter(c => c.client_id === clientFil) : content
  const cmap = new Map<string, ContentRow[]>()
  filtered.forEach(cp => {
    if (!cmap.has(cp.scheduled_date)) cmap.set(cp.scheduled_date, [])
    cmap.get(cp.scheduled_date)!.push(cp)
  })

  const statContent = view === 'month'
    ? content.filter(c => c.scheduled_date.startsWith(`${viewYear}-${String(viewMonth+1).padStart(2,'0')}`))
    : filtered
  const statTotal   = statContent.length
  const statLive    = statContent.filter(c => c.status === 'posted' || c.status === 'approved').length
  const statOverdue = statContent.filter(c => c.status === 'overdue').length

  function navigate(dir: number) {
    if (view === 'month') {
      const d = new Date(viewYear, viewMonth + dir)
      setViewMonth(d.getMonth()); setViewYear(d.getFullYear())
    } else if (view === 'week') {
      const n = new Date(weekStart); n.setDate(n.getDate() + dir * 7); setWeekStart(n)
    } else {
      const n = new Date(dayDate); n.setDate(n.getDate() + dir); setDayDate(n)
    }
  }

  function goToday() {
    setViewMonth(today.getMonth()); setViewYear(today.getFullYear())
    setWeekStart(getMondayOf(today)); setDayDate(new Date(today))
  }

  function headLabel() {
    if (view === 'month') return `${MONTHS[viewMonth]} ${viewYear}`
    if (view === 'week') {
      const days = buildWeekDays(weekStart)
      const end  = days[6]
      if (days[0].getMonth() === end.getMonth())
        return `${MONTHS[days[0].getMonth()]} ${days[0].getFullYear()}`
      return `${MONTHS[days[0].getMonth()].slice(0,3)} – ${MONTHS[end.getMonth()].slice(0,3)} ${end.getFullYear()}`
    }
    return dayDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  return (
    <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', background: 'hsl(42,30%,97%)', overflow: 'hidden' }}>
      <style>{`
        .no-scroll::-webkit-scrollbar{display:none}
        .no-scroll{-ms-overflow-style:none;scrollbar-width:none}
        @keyframes spin{to{transform:rotate(360deg)}}
      `}</style>

      {/* ── Sticky header ── */}
      <div style={{ background: '#0F1A14', flexShrink: 0, position: 'sticky', top: 0, zIndex: 20, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        {/* Row 1 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '14px 16px 0' }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '0.58rem', color: 'hsl(140,7%,48%)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '1px' }}>Content</p>
            <h1 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'hsl(42,22%,84%)', lineHeight: 1 }}>Calendar</h1>
          </div>
          {/* Nav */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <NavBtn onClick={() => navigate(-1)}>‹</NavBtn>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'hsl(42,22%,84%)', minWidth: '104px', textAlign: 'center', whiteSpace: 'nowrap' }}>
              {headLabel()}
            </span>
            <NavBtn onClick={() => navigate(1)}>›</NavBtn>
          </div>
          <button onClick={goToday} style={{ padding: '5px 10px', borderRadius: '99px', border: '1px solid rgba(255,255,255,0.14)', background: 'transparent', color: 'hsl(42,22%,76%)', fontSize: '0.68rem', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
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
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <Chip n={statTotal}   label="total"  color="hsl(25,82%,60%)" />
            <Chip n={statLive}    label="live"   color="hsl(161,58%,44%)" />
            {statOverdue > 0 && <Chip n={statOverdue} label="late" color="hsl(4,75%,56%)" />}
          </div>
        </div>

        {/* Row 3: client filters */}
        <div className="no-scroll" style={{ display: 'flex', gap: '6px', overflowX: 'auto', padding: '10px 16px 12px' }}>
          <FPill label="All" active={!clientFil} color="hsl(25,82%,60%)" onClick={() => setClientFil(null)} />
          {clients.map(c => (
            <FPill key={c.id} label={c.name} active={clientFil === c.id} color={c.brand_color}
              onClick={() => setClientFil(clientFil === c.id ? null : c.id)} />
          ))}
        </div>
      </div>

      {/* ── Body ── */}
      <div ref={bodyRef} style={{ flex: 1, overflowY: view === 'week' ? 'hidden' : 'auto', overflowX: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {loading ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', border: '3px solid hsl(25,82%,60%)', borderTopColor: 'transparent', animation: 'spin 0.7s linear infinite' }} />
            <span style={{ fontSize: '0.8rem', color: 'hsl(24,10%,54%)' }}>Loading…</span>
          </div>
        ) : view === 'month' ? (
          <MonthView viewYear={viewYear} viewMonth={viewMonth} today={today} cmap={cmap} router={router} />
        ) : view === 'week' ? (
          <WeekView weekStart={weekStart} today={today} cmap={cmap} clients={clients} router={router}
            onDayClick={d => { setDayDate(d); setView('day') }} />
        ) : (
          <DayViewInline dayDate={dayDate} today={today} cmap={cmap} clients={clients} router={router} />
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => router.push(view === 'day' ? `/brief/new?date=${toStr(dayDate)}` : '/brief/new')}
        style={{ position: 'fixed', bottom: '88px', right: '20px', width: '50px', height: '50px', borderRadius: '50%', background: 'hsl(25,82%,60%)', border: 'none', cursor: 'pointer', boxShadow: '0 4px 20px hsla(25,82%,60%,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 40, fontSize: '24px', color: '#fff', lineHeight: 1, transition: 'transform 0.2s cubic-bezier(0.34,1.56,0.64,1)' }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.12)' }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = '' }}
      >+</button>
    </main>
  )
}

// ─── Month View ────────────────────────────────────────────────────────────────
function MonthView({ viewYear, viewMonth, today, cmap, router }: {
  viewYear: number; viewMonth: number; today: Date
  cmap: Map<string, ContentRow[]>; router: ReturnType<typeof useRouter>
}) {
  const cells    = buildMonthGrid(viewYear, viewMonth)
  const todayStr = toStr(today)

  return (
    <div style={{ padding: '12px 12px 100px' }}>
      {/* Day headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '4px' }}>
        {DAYS_SHORT.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: '0.58rem', fontWeight: 700, color: 'hsl(24,10%,52%)', padding: '4px 0', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid — fixed minHeight, no flex rows */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
        {cells.map((cell, i) => {
          const key     = toStr(cell.date)
          const pieces  = cmap.get(key) || []
          const isToday = key === todayStr
          const late    = pieces.some(p => p.status === 'overdue')
          const shown   = pieces.slice(0, 2)
          const more    = pieces.length - shown.length

          return (
            <div
              key={i}
              className="c-item"
              onClick={() => router.push(`/calendar/${key}`)}
              style={{
                minHeight: '82px', background: cell.inMonth ? (pieces.length ? '#fff' : 'hsl(42,22%,98%)') : 'hsl(42,14%,94%)',
                borderRadius: '10px',
                border: isToday ? '2px solid hsl(25,82%,58%)' : late ? '1.5px solid hsl(4,72%,74%)' : '1.5px solid hsl(38,14%,89%)',
                padding: '6px 5px 4px', cursor: 'pointer',
                opacity: cell.inMonth ? 1 : 0.38,
                transition: 'transform 0.15s, box-shadow 0.15s',
                position: 'relative', overflow: 'hidden',
              }}
              onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.transform = 'translateY(-2px)'; el.style.boxShadow = '0 6px 16px rgba(0,0,0,0.09)' }}
              onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.transform = ''; el.style.boxShadow = '' }}
            >
              {/* Date circle */}
              <div style={{ display: 'inline-flex', width: isToday ? '20px' : 'auto', height: isToday ? '20px' : 'auto', borderRadius: '50%', background: isToday ? 'hsl(25,82%,60%)' : 'transparent', alignItems: 'center', justifyContent: 'center', marginBottom: '4px', marginLeft: isToday ? '0' : '1px' }}>
                <span style={{ fontSize: '0.68rem', fontWeight: isToday ? 800 : 500, color: isToday ? '#fff' : 'hsl(24,20%,22%)', lineHeight: 1 }}>
                  {cell.date.getDate()}
                </span>
              </div>

              {/* Pills */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {shown.map(cp => {
                  const cfg = TYPE_CFG[cp.type]
                  return (
                    <div key={cp.id} style={{ display: 'flex', alignItems: 'center', gap: '3px', borderLeft: `2.5px solid ${cfg.bg}`, background: cfg.light, borderRadius: '0 3px 3px 0', padding: '1.5px 4px' }}>
                      <span style={{ fontSize: '0.5rem', fontWeight: 700, color: 'hsl(24,20%,18%)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.4 }}>
                        {cp.title.slice(0, 11)}{cp.title.length > 11 ? '…' : ''}
                      </span>
                    </div>
                  )
                })}
                {more > 0 && <span style={{ fontSize: '0.48rem', fontWeight: 700, color: 'hsl(25,60%,50%)', paddingLeft: '4px' }}>+{more}</span>}
                {pieces.length === 0 && cell.inMonth && (
                  <div style={{ opacity: 0.18, marginTop: '4px', display: 'flex', justifyContent: 'center' }}>
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M8 3v10M3 8h10" stroke="hsl(24,10%,44%)" strokeWidth="1.8" strokeLinecap="round"/></svg>
                  </div>
                )}
              </div>

              {/* Bottom accent bar */}
              {pieces.length > 0 && (
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '3px', background: late ? 'hsl(4,75%,56%)' : pieces.length >= 3 ? 'hsl(25,82%,60%)' : TYPE_CFG[pieces[0].type].bg, opacity: 0.65 }} />
              )}
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '14px', padding: '0 2px' }}>
        {(Object.entries(TYPE_CFG) as [ContentType, typeof TYPE_CFG[ContentType]][]).map(([t, cfg]) => (
          <div key={t} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: cfg.bg }} />
            <span style={{ fontSize: '0.6rem', fontWeight: 600, color: 'hsl(24,10%,44%)' }}>{cfg.label}</span>
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '2px', border: '1.5px solid hsl(4,75%,56%)' }} />
          <span style={{ fontSize: '0.6rem', fontWeight: 600, color: 'hsl(24,10%,44%)' }}>Overdue</span>
        </div>
      </div>
    </div>
  )
}

// ─── Week View ─────────────────────────────────────────────────────────────────
function WeekView({ weekStart, today, cmap, clients, router, onDayClick }: {
  weekStart: Date; today: Date; cmap: Map<string, ContentRow[]>
  clients: ClientRow[]; router: ReturnType<typeof useRouter>
  onDayClick: (d: Date) => void
}) {
  const days     = buildWeekDays(weekStart)
  const todayStr = toStr(today)

  return (
    <div className="no-scroll" style={{ flex: 1, overflowX: 'auto', overflowY: 'auto', padding: '12px 12px 100px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(148px, 1fr))', gap: '6px', minWidth: '700px', flex: 1 }}>
        {days.map((day, di) => {
          const key     = toStr(day)
          const isToday = key === todayStr
          const isWknd  = di >= 5
          const pieces  = cmap.get(key) || []

          return (
            <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
              {/* Day header */}
              <div style={{ position: 'sticky', top: '-12px', zIndex: 10, background: 'hsl(42,30%,97%)', paddingBottom: '0' }}>
                <button
                  onClick={() => onDayClick(day)}
                  style={{
                    padding: '10px 8px', borderRadius: '12px 12px 0 0',
                    background: isToday ? 'hsl(25,82%,60%)' : isWknd ? 'hsl(42,14%,90%)' : '#fff',
                    border: isToday ? 'none' : `1.5px solid hsl(38,14%,${isWknd ? '84' : '90'}%)`,
                    borderBottom: 'none', cursor: 'pointer', textAlign: 'center', width: '100%',
                    display: 'block'
                  }}>
                <p style={{ fontSize: '0.58rem', fontWeight: 700, color: isToday ? 'rgba(255,255,255,0.75)' : 'hsl(24,10%,52%)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '3px' }}>
                  {DAYS_SHORT[di]}
                </p>
                <p style={{ fontSize: '1.25rem', fontWeight: 800, color: isToday ? '#fff' : 'hsl(24,20%,14%)', lineHeight: 1 }}>
                  {day.getDate()}
                </p>
              </button>
              </div>

              {/* Day Content */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', padding: '6px', background: isToday ? 'hsl(25,82%,98%)' : isWknd ? 'hsl(42,14%,95%)' : 'hsl(42,22%,97%)', borderRadius: '0 0 12px 12px', border: isToday ? '1.5px solid hsl(25,82%,78%)' : `1.5px solid hsl(38,14%,${isWknd ? '84' : '90'}%)`, borderTop: 'none', flex: 1, minHeight: '80px' }}>
                {pieces.length === 0 ? (
                  <button
                    onClick={() => router.push(`/brief/new?date=${key}`)}
                    style={{ flex: 1, minHeight: '60px', borderRadius: '8px', border: '1.5px dashed hsl(38,14%,82%)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'hsl(24,10%,62%)', fontSize: '1.1rem', transition: 'background 0.12s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'hsl(38,14%,93%)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                  >+</button>
                ) : (
                  pieces.map(cp => {
                    const cfg    = TYPE_CFG[cp.type]
                    const client = clients.find(c => c.id === cp.client_id)
                    const late   = cp.status === 'overdue'
                    return (
                      <div
                        key={cp.id}
                        className="c-item"
                        onClick={() => router.push(`/brief/${cp.id}`)}
                        style={{ borderRadius: '10px', background: '#fff', border: late ? '1.5px solid hsl(4,72%,74%)' : '1.5px solid hsl(38,14%,90%)', overflow: 'hidden', cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s' }}
                        onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.transform = 'translateY(-2px)'; el.style.boxShadow = `0 6px 18px ${cfg.bg}28` }}
                        onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.transform = ''; el.style.boxShadow = '' }}
                      >
                        {/* Thumbnail area */}
                        <div style={{ height: '64px', background: `linear-gradient(135deg, ${cfg.light} 0%, ${cfg.bg}18 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: `2px solid ${cfg.bg}30`, position: 'relative' }}>
                          <TypeGlyph type={cp.type} color={cfg.bg} />
                          {late && (
                            <div style={{ position: 'absolute', top: '5px', right: '5px', width: '16px', height: '16px', borderRadius: '50%', background: 'hsl(4,75%,56%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <span style={{ fontSize: '0.55rem', color: '#fff', fontWeight: 900 }}>!</span>
                            </div>
                          )}
                        </div>
                        <div style={{ padding: '7px 8px 6px' }}>
                          <p style={{ fontSize: '0.68rem', fontWeight: 700, color: 'hsl(24,20%,14%)', lineHeight: 1.3, marginBottom: '5px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                            {cp.title}
                          </p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ padding: '1px 5px', borderRadius: '4px', background: cfg.bg, color: cfg.text, fontSize: '0.48rem', fontWeight: 700 }}>{cfg.label}</span>
                            {client && (
                              <>
                                <div style={{ width: 5, height: 5, borderRadius: '50%', background: client.brand_color, flexShrink: 0 }} />
                                <span style={{ fontSize: '0.5rem', color: 'hsl(24,10%,52%)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{client.name}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Day View (inline) ─────────────────────────────────────────────────────────
function DayViewInline({ dayDate, today, cmap, clients, router }: {
  dayDate: Date; today: Date; cmap: Map<string, ContentRow[]>
  clients: ClientRow[]; router: ReturnType<typeof useRouter>
}) {
  const dateStr = toStr(dayDate)
  const pieces  = cmap.get(dateStr) || []
  const isToday = toStr(dayDate) === toStr(today)
  const isPast  = dayDate < today && !isToday
  const late    = pieces.filter(p => p.status === 'overdue').length

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '16px', paddingBottom: '100px' }}>
      {/* Date card */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px', background: '#fff', borderRadius: '16px', padding: '16px', border: isToday ? '2px solid hsl(25,82%,60%)' : '1.5px solid hsl(38,14%,90%)' }}>
        <div style={{ width: '54px', height: '54px', borderRadius: '14px', background: isToday ? 'hsl(25,82%,60%)' : isPast ? 'hsl(42,18%,88%)' : 'hsl(200,82%,92%)', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ fontSize: '0.5rem', fontWeight: 700, color: isToday ? 'rgba(255,255,255,0.75)' : 'hsl(24,10%,48%)', textTransform: 'uppercase', letterSpacing: '0.07em', lineHeight: 1 }}>
            {dayDate.toLocaleDateString('en-US', { weekday: 'short' })}
          </p>
          <p style={{ fontSize: '1.5rem', fontWeight: 800, color: isToday ? '#fff' : 'hsl(24,20%,16%)', lineHeight: 1.1 }}>
            {dayDate.getDate()}
          </p>
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: '0.95rem', fontWeight: 800, color: 'hsl(24,20%,11%)', marginBottom: '3px' }}>
            {dayDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
          <p style={{ fontSize: '0.7rem', color: 'hsl(24,10%,52%)' }}>
            {pieces.length} post{pieces.length !== 1 ? 's' : ''} scheduled
            {late > 0 ? ` · ${late} overdue` : isToday ? ' · Today' : isPast ? ' · Past' : ' · Upcoming'}
          </p>
        </div>
        <button
          onClick={() => router.push(`/brief/new?date=${dateStr}`)}
          style={{ padding: '8px 14px', borderRadius: '10px', background: 'hsl(25,82%,60%)', border: 'none', color: '#fff', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', flexShrink: 0, boxShadow: '0 3px 10px hsla(25,82%,60%,0.35)' }}
        >+ Add</button>
      </div>

      {pieces.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 20px', gap: '12px' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: 'hsl(42,18%,94%)', border: '1.5px dashed hsl(38,14%,85%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.25 }}>
              <rect x="3" y="5" width="18" height="17" rx="3" stroke="hsl(24,10%,44%)" strokeWidth="1.5"/>
              <path d="M3 10h18M8 3v4M16 3v4" stroke="hsl(24,10%,44%)" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <p style={{ fontSize: '0.85rem', fontWeight: 700, color: 'hsl(24,10%,44%)' }}>Nothing scheduled</p>
          <button onClick={() => router.push(`/brief/new?date=${dateStr}`)} style={{ padding: '9px 20px', borderRadius: '10px', background: 'hsl(25,82%,60%)', border: 'none', color: '#fff', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', boxShadow: '0 4px 12px hsla(25,82%,60%,0.3)' }}>
            + Schedule Content
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {pieces.map(cp => {
            const cfg    = TYPE_CFG[cp.type]
            const client = clients.find(c => c.id === cp.client_id)
            const isLate = cp.status === 'overdue'
            return (
              <div
                key={cp.id}
                className="c-item"
                onClick={() => router.push(`/brief/${cp.id}`)}
                style={{ background: '#fff', borderRadius: '14px', border: isLate ? '1.5px solid hsl(4,72%,74%)' : '1.5px solid hsl(38,14%,90%)', overflow: 'hidden', cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s' }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.transform = 'translateY(-2px)'; el.style.boxShadow = `0 8px 24px ${cfg.bg}22` }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.transform = ''; el.style.boxShadow = '' }}
              >
                <div style={{ height: '5px', background: cfg.bg }} />
                <div style={{ padding: '14px 16px', display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: cfg.light, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <TypeGlyph type={cp.type} color={cfg.bg} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '0.9rem', fontWeight: 800, color: 'hsl(24,20%,11%)', lineHeight: 1.3, marginBottom: '7px' }}>{cp.title}</p>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <span style={{ padding: '2px 8px', borderRadius: '99px', background: cfg.bg, color: cfg.text, fontSize: '0.6rem', fontWeight: 700 }}>{cfg.label}</span>
                      {client && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <div style={{ width: 5, height: 5, borderRadius: '50%', background: client.brand_color }} />
                          <span style={{ fontSize: '0.65rem', color: 'hsl(24,10%,52%)' }}>{client.name}</span>
                        </div>
                      )}
                      {cp.platforms.slice(0,2).map(p => (
                        <span key={p} style={{ padding: '2px 7px', borderRadius: '99px', background: 'hsl(42,18%,92%)', fontSize: '0.58rem', fontWeight: 600, color: 'hsl(24,10%,44%)', textTransform: 'capitalize' }}>{p}</span>
                      ))}
                      {isLate && <span style={{ padding: '2px 7px', borderRadius: '99px', background: 'hsl(4,72%,93%)', color: 'hsl(4,72%,42%)', fontSize: '0.58rem', fontWeight: 700 }}>Overdue</span>}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Shared helpers ────────────────────────────────────────────────────────────

function TypeGlyph({ type, color, small }: { type: ContentType; color: string; small?: boolean }) {
  const s = small ? 18 : 24
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" style={{ opacity: 0.65 }}>
      {type === 'graphic' ? (
        <><rect x="3" y="3" width="18" height="18" rx="4" stroke={color} strokeWidth="1.6"/><circle cx="8.5" cy="8.5" r="2" stroke={color} strokeWidth="1.4"/><path d="M3 16l5-4 4 3 3-2.5 6 5" stroke={color} strokeWidth="1.4" strokeLinecap="round"/></>
      ) : type === 'video' ? (
        <><rect x="2" y="5" width="20" height="14" rx="4" stroke={color} strokeWidth="1.6"/><path d="M10 9l6 3-6 3V9z" fill={color} opacity="0.6"/></>
      ) : type === 'reel' ? (
        <><circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.6"/><circle cx="12" cy="12" r="3" stroke={color} strokeWidth="1.4"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3" stroke={color} strokeWidth="1.4" strokeLinecap="round"/></>
      ) : (
        <><rect x="6" y="2" width="12" height="20" rx="3" stroke={color} strokeWidth="1.6"/><path d="M9 7h6M9 11h6M9 15h4" stroke={color} strokeWidth="1.4" strokeLinecap="round"/></>
      )}
    </svg>
  )
}

function NavBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{ width: '28px', height: '28px', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', color: 'hsl(42,22%,80%)', cursor: 'pointer', fontSize: '15px', lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.12s' }}
      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.12)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)' }}>
      {children}
    </button>
  )
}

function Chip({ n, label, color }: { n: number; label: string; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
      <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: color }} />
      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'hsl(42,22%,80%)' }}>{n}</span>
      <span style={{ fontSize: '0.6rem', color: 'hsl(140,7%,44%)' }}>{label}</span>
    </div>
  )
}

function FPill({ label, active, color, onClick }: { label: string; active: boolean; color: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ padding: '4px 11px', borderRadius: '99px', border: 'none', background: active ? color : 'rgba(255,255,255,0.07)', color: active ? '#fff' : 'hsl(140,7%,48%)', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'background 0.12s', boxShadow: active ? `0 2px 8px ${color}44` : 'none' }}>
      {label}
    </button>
  )
}
