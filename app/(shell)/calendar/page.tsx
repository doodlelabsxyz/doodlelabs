'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import type { ContentType } from '@/lib/types'
import { isContentOverdue } from '@/lib/overdue'
import { useUser } from '@/lib/supabase/useUser'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { TypeIcon, StatusIcon } from '@/components/ui/type-icon'
import { CONTENT_TYPE_STYLE } from '@/lib/color-map'

gsap.registerPlugin(useGSAP)

type ViewMode = 'month' | 'week' | 'day'

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
  const { user } = useUser()
  const canCreate = user?.role === 'admin'
  const today   = new Date(); today.setHours(0,0,0,0)
  const bodyRef = useRef<HTMLDivElement>(null)

  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState(false)
  const [reloadKey,  setReloadKey]  = useState(0)
  const [view,       setView]       = useState<ViewMode>('month')
  const [content,    setContent]    = useState<ContentRow[]>([])
  const [clients,    setClients]    = useState<ClientRow[]>([])
  const [clientFil,  setClientFil]  = useState<string | null>(null)
  const [viewMonth,  setViewMonth]  = useState(today.getMonth())
  const [viewYear,   setViewYear]   = useState(today.getFullYear())
  const [weekStart,  setWeekStart]  = useState(() => getMondayOf(today))
  const [dayDate,    setDayDate]    = useState(new Date(today))

  useEffect(() => {
    let cancelled = false

    async function loadRange(from: string, to: string) {
      setLoading(true)
      setError(false)
      const supabase = createClient()
      let cRes, clRes
      try {
        ;[cRes, clRes] = await Promise.all([
          supabase.from('content_pieces')
            .select('id, title, type, status, scheduled_date, client_id, platforms')
            .gte('scheduled_date', from).lte('scheduled_date', to),
          supabase.from('clients').select('id, name, brand_color'),
        ])
      } catch {
        if (cancelled) return
        setError(true)
        setLoading(false)
        return
      }

      if (cancelled) return

      if (cRes.error || clRes.error) {
        setError(true)
        setLoading(false)
        return
      }

      setContent(cRes.data || [])
      setClients(clRes.data || [])
      setLoading(false)
    }

    if (view === 'month') {
      const cells = buildMonthGrid(viewYear, viewMonth)
      void loadRange(toStr(cells[0].date), toStr(cells[cells.length - 1].date))
    } else if (view === 'week') {
      const days = buildWeekDays(weekStart)
      void loadRange(toStr(days[0]), toStr(days[6]))
    } else {
      void loadRange(toStr(dayDate), toStr(dayDate))
    }

    return () => {
      cancelled = true
    }
  }, [view, viewMonth, viewYear, weekStart, dayDate, reloadKey])

  useGSAP(() => {
    if (loading || !bodyRef.current) return
    gsap.fromTo('[data-animate="cal-item"]',
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
  const statOverdue = statContent.filter(isContentOverdue).length

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
    <main className="page-main flex-1 min-w-0 flex flex-col bg-background overflow-hidden">

      {/* ── Sticky header ── */}
      <div className="bg-dark shrink-0 sticky top-0 z-20 border-b border-white/[0.05]">

        {/* Row 1: title + nav + today */}
        <div className="flex items-center gap-2 px-4 pt-[14px]">
          <div className="flex-1">
            <p className="text-[0.58rem] text-dark-muted tracking-[0.08em] uppercase mb-px">Content</p>
            <h1 className="text-[1.1rem] font-extrabold text-dark-text leading-none">Calendar</h1>
          </div>

          <div className="flex items-center gap-[5px]">
            <NavBtn onClick={() => navigate(-1)}>‹</NavBtn>
            <span className="text-[0.78rem] font-bold text-dark-text min-w-[104px] text-center whitespace-nowrap">
              {headLabel()}
            </span>
            <NavBtn onClick={() => navigate(1)}>›</NavBtn>
          </div>

          <button
            onClick={goToday}
            className="px-[10px] py-[5px] rounded-full border border-white/[0.14] bg-transparent text-dark-text/80 text-[0.68rem] font-semibold cursor-pointer whitespace-nowrap hover:bg-white/[0.07] transition-colors"
          >
            Today
          </button>
        </div>

        {/* Row 2: view toggle + stats */}
        <div className="flex items-center gap-[10px] px-4 pt-[10px]">
          <div className="flex bg-white/[0.07] rounded-[10px] p-[3px] gap-[2px]">
            {(['month','week','day'] as ViewMode[]).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  "px-[13px] py-[5px] rounded-[7px] text-[0.7rem] font-bold capitalize cursor-pointer transition-[background,color] duration-150 border-0",
                  view === v
                    ? "bg-mint text-dark"
                    : "bg-transparent text-dark-muted hover:bg-white/[0.07]"
                )}
              >
                {v}
              </button>
            ))}
          </div>

          <div className="flex-1" />

          <div className="flex gap-[10px] items-center">
            <StatChip n={statTotal}   label="total"  variant="total" />
            <StatChip n={statLive}    label="live"   variant="live" />
            {statOverdue > 0 && <StatChip n={statOverdue} label="late" variant="danger" />}
          </div>
        </div>

        {/* Row 3: client filters */}
        <div className="scrollbar-hide flex gap-[6px] overflow-x-auto px-4 py-[10px] pb-3">
          <button
            onClick={() => setClientFil(null)}
            className={cn(
              "px-[11px] py-1 rounded-full text-[0.72rem] font-semibold cursor-pointer whitespace-nowrap shrink-0 transition-colors border-0",
              !clientFil
                ? "bg-mint text-dark"
                : "bg-white/[0.07] text-dark-muted hover:bg-white/[0.1]"
            )}
          >
            All
          </button>
          {clients.map(c => (
            <button
              key={c.id}
              onClick={() => setClientFil(clientFil === c.id ? null : c.id)}
              className={cn(
                "px-[11px] py-1 rounded-full text-[0.72rem] font-semibold cursor-pointer whitespace-nowrap shrink-0 transition-colors border-0",
                clientFil === c.id
                  ? "bg-mint text-dark"
                  : "bg-white/[0.07] text-dark-muted hover:bg-white/[0.1]"
              )}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* ── Body ── */}
      <div
        ref={bodyRef}
        className={cn(
          "flex-1 overflow-x-hidden flex flex-col",
          view === 'week' ? "overflow-y-hidden" : "overflow-y-auto"
        )}
      >
        {loading ? (
          <CalendarSkeleton view={view} />
        ) : error ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-10 text-center" role="alert">
            <p className="text-[0.85rem] font-bold text-foreground">Couldn&apos;t load the calendar</p>
            <p className="text-[0.75rem] text-muted-foreground">Something went wrong while fetching your content.</p>
            <Button variant="outline" size="sm" onClick={() => setReloadKey(k => k + 1)}>Try again</Button>
          </div>
        ) : view === 'month' ? (
          <MonthView viewYear={viewYear} viewMonth={viewMonth} today={today} cmap={cmap} router={router} />
        ) : view === 'week' ? (
          <WeekView weekStart={weekStart} today={today} cmap={cmap} clients={clients} router={router} canCreate={canCreate}
            onDayClick={d => { setDayDate(d); setView('day') }} />
        ) : (
          <DayViewInline dayDate={dayDate} today={today} cmap={cmap} clients={clients} router={router} canCreate={canCreate} />
        )}
      </div>

      {/* FAB */}
      {canCreate && <button
        onClick={() => router.push(view === 'day' ? `/brief/new?date=${toStr(dayDate)}` : '/brief/new')}
        className="fixed bottom-[88px] right-5 w-[50px] h-[50px] rounded-full bg-primary border-0 cursor-pointer shadow-md flex items-center justify-center z-40 text-2xl text-primary-foreground leading-none transition-transform hover:scale-110"
      >+</button>}
    </main>
  )
}

// ─── Loading skeleton ──────────────────────────────────────────────────────────
function CalendarSkeleton({ view }: { view: ViewMode }) {
  if (view === 'month') {
    return (
      <div className="p-3 pb-[100px]" aria-busy="true" aria-label="Loading calendar">
        <div className="grid grid-cols-7 gap-1 mb-1">
          {DAYS_SHORT.map(d => (
            <div key={d} className="text-center text-[0.58rem] font-bold text-muted-foreground py-1 tracking-[0.06em] uppercase">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 35 }, (_, i) => (
            <Skeleton key={i} className="min-h-[82px] rounded-[10px]" />
          ))}
        </div>
      </div>
    )
  }
  if (view === 'week') {
    return (
      <div className="p-3 pb-[100px] grid grid-cols-7 gap-[6px] min-w-[700px]" aria-busy="true" aria-label="Loading calendar">
        {Array.from({ length: 7 }, (_, i) => (
          <Skeleton key={i} className="h-64 rounded-[12px]" />
        ))}
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-[10px] p-4 pb-[100px]" aria-busy="true" aria-label="Loading calendar">
      <Skeleton className="h-[88px] w-full rounded-2xl" />
      <Skeleton className="h-20 w-full rounded-[14px]" />
      <Skeleton className="h-20 w-full rounded-[14px]" />
    </div>
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
    <div className="p-3 pb-[100px]">
      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {DAYS_SHORT.map(d => (
          <div key={d} className="text-center text-[0.58rem] font-bold text-muted-foreground py-1 tracking-[0.06em] uppercase">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell, i) => {
          const key    = toStr(cell.date)
          const pieces = cmap.get(key) || []
          const isToday = key === todayStr
          const late   = pieces.some(isContentOverdue)
          const shown  = pieces.slice(0, 2)
          const more   = pieces.length - shown.length

          return (
            <div
              key={i}
              data-animate="cal-item"
              onClick={() => router.push(`/calendar/${key}`)}
              className={cn(
                "min-h-[82px] rounded-[10px] p-[6px_5px_4px] cursor-pointer relative overflow-hidden",
                "transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:shadow-md",
                cell.inMonth
                  ? pieces.length ? "bg-card" : "bg-background/50"
                  : "bg-wash",
                isToday
                  ? "border-2 border-primary"
                  : late
                    ? "border border-danger/50"
                    : "border border-border",
                !cell.inMonth && "opacity-[0.38]",
              )}
            >
              {late && <StatusIcon name="bang" className="absolute top-1 right-1 size-2.5 text-danger" />}
              {/* Date circle */}
              <div className={cn(
                "inline-flex items-center justify-center mb-1",
                isToday ? "w-5 h-5 rounded-full bg-primary" : "ml-px"
              )}>
                <span className={cn(
                  "text-[0.68rem] leading-none",
                  isToday ? "font-extrabold text-primary-foreground" : "font-medium text-foreground/80"
                )}>
                  {cell.date.getDate()}
                </span>
              </div>

              {/* Content pills */}
              <div className="flex flex-col gap-[2px]">
                {shown.map(cp => {
                  const cfg = CONTENT_TYPE_STYLE[cp.type]
                  return (
                    <div
                      key={cp.id}
                      className={cn(
                        "flex items-center gap-[3px] rounded-[3px] px-1 py-[1.5px]",
                        cfg.className
                      )}
                    >
                      <TypeIcon name={cfg.icon} className="size-2 shrink-0" />
                      <span className="text-[0.5rem] font-bold overflow-hidden text-ellipsis whitespace-nowrap leading-[1.4]">
                        {cp.title.slice(0, 11)}{cp.title.length > 11 ? '…' : ''}
                      </span>
                    </div>
                  )
                })}
                {more > 0 && (
                  <span className="text-[0.48rem] font-bold text-primary/80 pl-1">+{more}</span>
                )}
                {pieces.length === 0 && cell.inMonth && (
                  <div className="opacity-[0.18] mt-1 flex justify-center">
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                      <path d="M8 3v10M3 8h10" className="stroke-muted-foreground" strokeWidth="1.8" strokeLinecap="round"/>
                    </svg>
                  </div>
                )}
              </div>

              {/* Bottom accent bar */}
              {pieces.length > 0 && (
                <div className={cn(
                  "absolute bottom-0 left-0 right-0 h-[3px] opacity-65",
                  late ? "bg-danger" : "bg-primary/30"
                )} />
              )}
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex gap-3 flex-wrap mt-[14px] px-0.5">
        {(Object.entries(CONTENT_TYPE_STYLE) as [ContentType, typeof CONTENT_TYPE_STYLE[ContentType]][]).map(([t, cfg]) => (
          <span key={t} className={cn("inline-flex items-center gap-1 rounded-[3px] px-1.5 py-0.5 text-[0.6rem] font-semibold", cfg.className)}>
            <TypeIcon name={cfg.icon} className="size-2.5" />
            {cfg.label}
          </span>
        ))}
        <div className="flex items-center gap-1 text-danger">
          <StatusIcon name="bang" className="size-2.5" />
          <span className="text-[0.6rem] font-semibold">Overdue</span>
        </div>
      </div>
    </div>
  )
}

// ─── Week View ─────────────────────────────────────────────────────────────────
function WeekView({ weekStart, today, cmap, clients, router, canCreate, onDayClick }: {
  weekStart: Date; today: Date; cmap: Map<string, ContentRow[]>
  clients: ClientRow[]; router: ReturnType<typeof useRouter>; canCreate: boolean
  onDayClick: (d: Date) => void
}) {
  const days     = buildWeekDays(weekStart)
  const todayStr = toStr(today)

  return (
    <div className="scrollbar-hide flex-1 overflow-x-auto overflow-y-auto p-3 pb-[100px] flex flex-col">
      <div
        className="grid gap-[6px] min-w-[700px] flex-1"
        style={{ gridTemplateColumns: 'repeat(7, minmax(148px, 1fr))' }}
      >
        {days.map((day, di) => {
          const key     = toStr(day)
          const isToday = key === todayStr
          const isWknd  = di >= 5
          const pieces  = cmap.get(key) || []

          return (
            <div key={key} className="flex flex-col">
              {/* Day header — sticky */}
              <div className="sticky top-[-12px] z-10 bg-background">
                <button
                  onClick={() => onDayClick(day)}
                  className={cn(
                    "w-full px-2 py-[10px] rounded-t-[12px] text-center cursor-pointer",
                    "border border-b-0 transition-colors",
                    isToday
                      ? "bg-primary border-transparent"
                      : isWknd
                        ? "bg-wash border-border/70 hover:bg-wash/80"
                        : "bg-card border-border hover:bg-background/60"
                  )}
                >
                  <p className={cn(
                    "text-[0.58rem] font-bold uppercase tracking-[0.07em] mb-[3px]",
                    isToday ? "text-primary-foreground/75" : "text-muted-foreground"
                  )}>
                    {DAYS_SHORT[di]}
                  </p>
                  <p className={cn(
                    "text-[1.25rem] font-extrabold leading-none",
                    isToday ? "text-primary-foreground" : "text-foreground/90"
                  )}>
                    {day.getDate()}
                  </p>
                </button>
              </div>

              {/* Day content column */}
              <div className={cn(
                "flex flex-col gap-[5px] p-[6px] rounded-b-[12px] border border-t-0 flex-1 min-h-[80px]",
                isToday
                  ? "bg-primary/5 border-primary/40"
                  : isWknd
                    ? "bg-wash/60 border-border/70"
                    : "bg-background/30 border-border"
              )}>
                {pieces.length === 0 ? (
                  canCreate ? (
                    <button
                      onClick={() => router.push(`/brief/new?date=${key}`)}
                      className="flex-1 min-h-[60px] rounded-lg border border-dashed border-border bg-transparent cursor-pointer flex items-center justify-center text-muted-foreground text-lg transition-colors hover:bg-wash/50"
                    >+</button>
                  ) : <div className="flex-1 min-h-[60px]" />
                ) : (
                  pieces.map(cp => {
                    const cfg    = CONTENT_TYPE_STYLE[cp.type]
                    const client = clients.find(c => c.id === cp.client_id)
                    const late   = isContentOverdue(cp)
                    return (
                      <div
                        key={cp.id}
                        data-animate="cal-item"
                        onClick={() => router.push(`/brief/${cp.id}`)}
                        className={cn(
                          "rounded-[10px] bg-card overflow-hidden cursor-pointer",
                          "transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5",
                          late
                            ? "border border-danger/50 hover:shadow-md"
                            : "border border-border hover:shadow-md"
                        )}
                      >
                        {/* Thumbnail area */}
                        <div className={cn(
                          "h-16 bg-wash flex items-center justify-center border-b-2 border-b-border relative"
                        )}>
                          <TypeGlyph type={cp.type} />
                          {late && (
                            <div className="absolute top-[5px] right-[5px] w-4 h-4 rounded-full bg-danger flex items-center justify-center">
                              <StatusIcon name="bang" className="size-2.5 text-danger-foreground" />
                            </div>
                          )}
                        </div>
                        {/* Card body */}
                        <div className="p-[7px_8px_6px]">
                          <p className="text-[0.68rem] font-bold text-foreground/90 leading-[1.3] mb-[5px] line-clamp-2">
                            {cp.title}
                          </p>
                          <div className="flex items-center gap-1">
                            <span className={cn("inline-flex items-center gap-[3px] px-[5px] py-px rounded-[4px] text-[0.48rem] font-bold", cfg.className)}>
                              <TypeIcon name={cfg.icon} className="size-2" />
                              {cfg.label}
                            </span>
                            {client && (
                              <>
                                <div className="w-[5px] h-[5px] rounded-full shrink-0 bg-primary/50" />
                                <span className="text-[0.5rem] text-muted-foreground overflow-hidden text-ellipsis whitespace-nowrap flex-1">
                                  {client.name}
                                </span>
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
function DayViewInline({ dayDate, today, cmap, clients, router, canCreate }: {
  dayDate: Date; today: Date; cmap: Map<string, ContentRow[]>
  clients: ClientRow[]; router: ReturnType<typeof useRouter>; canCreate: boolean
}) {
  const dateStr = toStr(dayDate)
  const pieces  = cmap.get(dateStr) || []
  const isToday = toStr(dayDate) === toStr(today)
  const isPast  = dayDate < today && !isToday
  const late    = pieces.filter(isContentOverdue).length

  return (
    <div className="flex-1 overflow-y-auto p-4 pb-[100px]">
      {/* Date card */}
      <div className={cn(
        "flex items-center gap-[14px] mb-5 bg-card rounded-2xl p-4",
        isToday ? "border-2 border-primary" : "border border-border"
      )}>
        <div className={cn(
          "w-[54px] h-[54px] rounded-[14px] shrink-0 flex flex-col items-center justify-center",
          isToday ? "bg-primary" : isPast ? "bg-wash" : "bg-wash"
        )}>
          <p className={cn(
            "text-[0.5rem] font-bold uppercase tracking-[0.07em] leading-none",
            isToday ? "text-primary-foreground/75" : "text-muted-foreground"
          )}>
            {dayDate.toLocaleDateString('en-US', { weekday: 'short' })}
          </p>
          <p className={cn(
            "text-[1.5rem] font-extrabold leading-[1.1]",
            isToday ? "text-primary-foreground" : "text-foreground"
          )}>
            {dayDate.getDate()}
          </p>
        </div>

        <div className="flex-1">
          <p className="text-[0.95rem] font-extrabold text-foreground mb-[3px]">
            {dayDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
          <p className="text-[0.7rem] text-muted-foreground">
            {pieces.length} post{pieces.length !== 1 ? 's' : ''} scheduled
            {late > 0 ? ` · ${late} overdue` : isToday ? ' · Today' : isPast ? ' · Past' : ' · Upcoming'}
          </p>
        </div>

        {canCreate && <button
          onClick={() => router.push(`/brief/new?date=${dateStr}`)}
          className="px-[14px] py-2 rounded-[10px] bg-primary border-0 text-primary-foreground text-[0.72rem] font-bold shrink-0 shadow-md cursor-pointer hover:bg-primary/90 transition-colors"
        >
          + Add
        </button>}
      </div>

      {pieces.length === 0 ? (
        <div className="flex flex-col items-center p-10 gap-3">
          <div className="w-16 h-16 rounded-2xl bg-wash border border-dashed border-border flex items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="opacity-25">
              <rect x="3" y="5" width="18" height="17" rx="3" className="stroke-muted-foreground" strokeWidth="1.5"/>
              <path d="M3 10h18M8 3v4M16 3v4" className="stroke-muted-foreground" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <p className="text-[0.85rem] font-bold text-muted-foreground">Nothing scheduled</p>
          {canCreate && <button
            onClick={() => router.push(`/brief/new?date=${dateStr}`)}
            className="px-5 py-[9px] rounded-[10px] bg-primary border-0 text-primary-foreground font-bold text-[0.78rem] cursor-pointer shadow-md hover:bg-primary/90 transition-colors"
          >
            + Schedule Content
          </button>}
        </div>
      ) : (
        <div className="flex flex-col gap-[10px]">
          {pieces.map(cp => {
            const cfg    = CONTENT_TYPE_STYLE[cp.type]
            const client = clients.find(c => c.id === cp.client_id)
            const isLate = isContentOverdue(cp)
            return (
              <div
                key={cp.id}
                data-animate="cal-item"
                onClick={() => router.push(`/brief/${cp.id}`)}
                className={cn(
                  "bg-card rounded-[14px] overflow-hidden cursor-pointer",
                  "transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5",
                  isLate
                    ? "border border-danger/50 hover:shadow-md"
                    : "border border-border hover:shadow-md"
                )}
              >
                <div className="p-[14px_16px] flex gap-[14px] items-start">
                  <div className={cn("w-12 h-12 rounded-xl shrink-0 flex items-center justify-center bg-wash")}>
                    <TypeGlyph type={cp.type} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[0.9rem] font-extrabold text-foreground leading-[1.3] mb-[7px]">{cp.title}</p>
                    <div className="flex gap-[6px] items-center flex-wrap">
                      <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.6rem] font-bold", cfg.className)}>
                        <TypeIcon name={cfg.icon} className="size-2.5" />
                        {cfg.label}
                      </span>
                      {client && (
                        <div className="flex items-center gap-1">
                          <div className="w-[5px] h-[5px] rounded-full bg-primary/50" />
                          <span className="text-[0.65rem] text-muted-foreground">{client.name}</span>
                        </div>
                      )}
                      {cp.platforms.slice(0,2).map(p => (
                        <span key={p} className="px-[7px] py-0.5 rounded-full bg-wash text-[0.58rem] font-semibold text-muted-foreground capitalize">{p}</span>
                      ))}
                      {isLate && (
                        <span className="inline-flex items-center gap-0.5 px-[7px] py-0.5 rounded-full bg-danger/10 text-danger text-[0.58rem] font-bold"><StatusIcon name="bang" className="size-2.5" />Overdue</span>
                      )}
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

function TypeGlyph({ type, small }: { type: ContentType; small?: boolean }) {
  const s = small ? 18 : 24
  const cls = 'stroke-primary'
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" className="opacity-65">
      {type === 'graphic' ? (
        <><rect x="3" y="3" width="18" height="18" rx="4" className={cls} strokeWidth="1.6"/><circle cx="8.5" cy="8.5" r="2" className={cls} strokeWidth="1.4"/><path d="M3 16l5-4 4 3 3-2.5 6 5" className={cls} strokeWidth="1.4" strokeLinecap="round"/></>
      ) : type === 'video' ? (
        <><rect x="2" y="5" width="20" height="14" rx="4" className={cls} strokeWidth="1.6"/><path d="M10 9l6 3-6 3V9z" className={cn(cls, 'fill-primary/30')} /></>
      ) : type === 'reel' ? (
        <><circle cx="12" cy="12" r="9" className={cls} strokeWidth="1.6"/><circle cx="12" cy="12" r="3" className={cls} strokeWidth="1.4"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3" className={cls} strokeWidth="1.4" strokeLinecap="round"/></>
      ) : (
        <><rect x="6" y="2" width="12" height="20" rx="3" className={cls} strokeWidth="1.6"/><path d="M9 7h6M9 11h6M9 15h4" className={cls} strokeWidth="1.4" strokeLinecap="round"/></>
      )}
    </svg>
  )
}

function NavBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="w-7 h-7 rounded-full border border-white/[0.12] bg-white/[0.05] text-dark-text cursor-pointer text-[15px] leading-none flex items-center justify-center transition-colors hover:bg-white/[0.12]"
    >
      {children}
    </button>
  )
}

function StatChip({ n, label, variant }: { n: number; label: string; variant: 'total' | 'live' | 'danger' }) {
  const dot = { total: 'bg-mint', live: 'bg-success', danger: 'bg-danger' }[variant]
  return (
    <div className="flex items-center gap-1">
      <div className={cn("w-[7px] h-[7px] rounded-full", dot)} />
      <span className="text-[0.72rem] font-bold text-dark-text">{n}</span>
      <span className="text-[0.6rem] text-dark-muted">{label}</span>
    </div>
  )
}
