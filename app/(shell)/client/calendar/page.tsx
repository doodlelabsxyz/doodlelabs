'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'

import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { FilterPill } from '@/components/ui/filter-pill'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/ui/status-badge'
import { TypeIcon } from '@/components/ui/type-icon'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/supabase/useUser'
import { cn } from '@/lib/utils'
import { CONTENT_TYPE_STYLE } from '@/lib/color-map'
import { needsClientAction, type ContentType } from '@/lib/types'

gsap.registerPlugin(useGSAP)

type ViewMode = 'month' | 'week' | 'day'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const DAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

type ContentRow = {
  id: string
  title: string
  type: ContentType
  status: string
  scheduled_date: string
  client_id: string
}

type ClientRow = { id: string; name: string }

function toStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getMondayOf(d: Date) {
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(d)
  monday.setDate(d.getDate() + diff)
  monday.setHours(0, 0, 0, 0)
  return monday
}

function buildMonthGrid(year: number, month: number) {
  const firstDow = new Date(year, month, 1).getDay()
  const startPad = firstDow === 0 ? 6 : firstDow - 1
  const daysInMo = new Date(year, month + 1, 0).getDate()
  const daysInPrev = new Date(year, month, 0).getDate()
  const cells: { date: Date; inMonth: boolean }[] = []
  for (let i = startPad - 1; i >= 0; i--) {
    cells.push({ date: new Date(year, month - 1, daysInPrev - i), inMonth: false })
  }
  for (let d = 1; d <= daysInMo; d++) {
    cells.push({ date: new Date(year, month, d), inMonth: true })
  }
  const tail = cells.length % 7
  if (tail > 0) {
    for (let d = 1; d <= 7 - tail; d++) {
      cells.push({ date: new Date(year, month + 1, d), inMonth: false })
    }
  }
  return cells
}

function buildWeekDays(monday: Date) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

export default function ClientCalendarPage() {
  const router = useRouter()
  const { user } = useUser()
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const bodyRef = useRef<HTMLDivElement>(null)

  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [view, setView] = useState<ViewMode>('month')
  const [content, setContent] = useState<ContentRow[]>([])
  const [clients, setClients] = useState<ClientRow[]>([])
  const [clientId, setClientId] = useState('')
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [weekStart, setWeekStart] = useState(() => getMondayOf(today))
  const [dayDate, setDayDate] = useState(new Date(today))

  useEffect(() => {
    if (!user) return
    const currentUser = user

    async function init() {
      setError(false)
      try {
        const supabase = createClient()
        if (currentUser.role === 'client') {
          const { data: cu, error: cuErr } = await supabase.from('client_users').select('client_id').eq('user_id', currentUser.id).single()
          if (cuErr) throw cuErr
          if (cu?.client_id) {
            setClientId(cu.client_id)
            const { data: c, error: cErr } = await supabase.from('clients').select('id, name').eq('id', cu.client_id)
            if (cErr) throw cErr
            if (c) setClients(c)
          }
        } else {
          const { data: c, error: cErr } = await supabase.from('clients').select('id, name').order('name')
          if (cErr) throw cErr
          if (c) {
            setClients(c)
            const stored = sessionStorage.getItem('clientId')
            setClientId(stored && c.find(x => x.id === stored) ? stored : (c[0]?.id ?? ''))
          }
        }
      } catch {
        setError(true)
      }
      setMounted(true)
    }

    void init()
  }, [user, reloadKey])

  useEffect(() => {
    if (!clientId) return
    async function run() {
      let from = ''
      let to = ''

      if (view === 'month') {
        const cells = buildMonthGrid(viewYear, viewMonth)
        from = toStr(cells[0].date)
        to = toStr(cells[cells.length - 1].date)
      } else if (view === 'week') {
        const days = buildWeekDays(weekStart)
        from = toStr(days[0])
        to = toStr(days[6])
      } else {
        from = toStr(dayDate)
        to = toStr(dayDate)
      }

      setLoading(true)
      setError(false)
      try {
        const supabase = createClient()
        const { data, error: qErr } = await supabase
          .from('content_pieces_client')
          .select('id, title, type, status, scheduled_date, client_id')
          .eq('client_id', clientId)
          .gte('scheduled_date', from)
          .lte('scheduled_date', to)
        if (qErr) throw qErr
        if (data) setContent(data as ContentRow[])
      } catch {
        setError(true)
      }
      setLoading(false)
    }

    void run()
  }, [view, viewMonth, viewYear, weekStart, dayDate, clientId, reloadKey])

  useGSAP(() => {
    if (!mounted || !bodyRef.current || loading) return
    gsap.fromTo(
      '[data-animate="client-cal-item"]',
      { opacity: 0, y: 8 },
      { opacity: 1, y: 0, duration: 0.28, stagger: { amount: 0.18 }, ease: 'power2.out', clearProps: 'opacity,transform' }
    )
  }, { dependencies: [mounted, loading, view, viewMonth, viewYear, clientId], scope: bodyRef })

  const showLoading = !mounted || (loading && !!clientId)

  const cmap = new Map<string, ContentRow[]>()
  content.forEach(cp => {
    if (!cmap.has(cp.scheduled_date)) cmap.set(cp.scheduled_date, [])
    cmap.get(cp.scheduled_date)!.push(cp)
  })

  const statApproved = content.filter(c => ['approved', 'posted'].includes(c.status)).length
  const statReview = content.filter(c => needsClientAction(c.status)).length
  const statPlanned = content.filter(c => !['approved', 'posted', 'client-review', 'ready-for-review'].includes(c.status)).length

  function navigate(dir: number) {
    if (view === 'month') {
      const d = new Date(viewYear, viewMonth + dir)
      setViewMonth(d.getMonth())
      setViewYear(d.getFullYear())
    } else if (view === 'week') {
      const n = new Date(weekStart)
      n.setDate(n.getDate() + dir * 7)
      setWeekStart(n)
    } else {
      const n = new Date(dayDate)
      n.setDate(n.getDate() + dir)
      setDayDate(n)
    }
  }

  function goToday() {
    const t = new Date()
    t.setHours(0, 0, 0, 0)
    setViewMonth(t.getMonth())
    setViewYear(t.getFullYear())
    setWeekStart(getMondayOf(t))
    setDayDate(t)
  }

  function headLabel() {
    if (view === 'month') return `${MONTHS[viewMonth].slice(0, 3)} ${viewYear}`
    if (view === 'week') {
      const end = new Date(weekStart)
      end.setDate(weekStart.getDate() + 6)
      return `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
    }
    return dayDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  const client = clients.find(c => c.id === clientId)

  return (
    <main className={cn('page-main flex min-w-0 flex-1 flex-col bg-background', view === 'week' ? 'overflow-hidden' : 'overflow-y-auto')}>
      <div className="sticky top-0 z-20 shrink-0 border-b border-dark-hover bg-dark text-dark-text">
        {user?.role !== 'client' && clients.length > 1 && (
          <div className="flex gap-1.5 overflow-x-auto px-4 pt-3">
            {clients.map(c => (
              <FilterPill
                key={c.id}
                active={clientId === c.id}
                onClick={() => {
                  setClientId(c.id)
                  sessionStorage.setItem('clientId', c.id)
                }}
                className={cn(
                  'shrink-0 border-dark-hover bg-dark-raised text-dark-muted hover:bg-dark-hover hover:text-dark-text',
                  clientId === c.id && 'border-mint bg-mint text-dark hover:bg-mint'
                )}
              >
                {c.name}
              </FilterPill>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2 px-4 pt-[14px]">
          <div className="flex-1">
            <p className="mb-px text-[0.58rem] uppercase tracking-[0.08em] text-dark-muted">
              {client?.name ?? 'Content'} · Calendar
            </p>
            <h1 className="text-[1rem] font-extrabold leading-none text-dark-text">Content Schedule</h1>
          </div>

          <div className="flex items-center gap-[5px]">
            <NavBtn onClick={() => navigate(-1)}>‹</NavBtn>
            <span className="min-w-24 whitespace-nowrap text-center text-[0.75rem] font-bold text-dark-text">
              {headLabel()}
            </span>
            <NavBtn onClick={() => navigate(1)}>›</NavBtn>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={goToday}
            className="border-dark-hover bg-transparent text-dark-muted hover:bg-dark-hover hover:text-dark-text"
          >
            Today
          </Button>
        </div>

        <div className="flex items-center gap-[10px] px-4 pt-[10px]">
          <div className="flex gap-[2px] rounded-[10px] bg-dark-raised p-[3px]">
            {(['month', 'week', 'day'] as ViewMode[]).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  'rounded-[7px] border-0 px-[13px] py-[5px] text-[0.7rem] font-bold capitalize transition-colors',
                  view === v
                    ? 'bg-mint text-dark shadow-sm'
                    : 'bg-transparent text-dark-muted hover:bg-dark-hover'
                )}
              >
                {v}
              </button>
            ))}
          </div>

          <div className="flex-1" />

          <div className="flex items-center gap-[10px]">
            <StatChip n={content.length} label="total" variant="mint" />
            <StatChip n={statApproved} label="approved" variant="mint" />
            {statReview > 0 && <StatChip n={statReview} label="review" variant="mint" />}
            {statPlanned > 0 && <StatChip n={statPlanned} label="planned" variant="muted" />}
          </div>
        </div>

        {view === 'month' && (
          <div className="px-3 pb-[10px] pt-[10px]">
            <div className="grid grid-cols-7 gap-1">
              {DAYS_SHORT.map(d => (
                <div
                  key={d}
                  className="py-[2px] text-center text-[0.56rem] font-bold uppercase tracking-[0.06em] text-dark-ghost"
                >
                  {d}
                </div>
              ))}
            </div>
          </div>
        )}
        {view !== 'month' && <div className="h-3" />}
      </div>

      <div
        ref={bodyRef}
        className={cn(
          'flex flex-1 flex-col overflow-x-hidden',
          view === 'week' ? 'overflow-y-hidden' : 'overflow-y-auto'
        )}
      >
        {showLoading ? (
          <ClientCalendarSkeleton view={view} />
        ) : error ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-10 text-center" role="alert">
            <p className="text-[0.85rem] font-bold text-foreground">Couldn&apos;t load the schedule</p>
            <p className="text-[0.75rem] text-muted-foreground">Something went wrong while fetching content.</p>
            <Button variant="outline" size="sm" onClick={() => setReloadKey(k => k + 1)}>Try again</Button>
          </div>
        ) : view === 'month' ? (
          <MonthView
            viewYear={viewYear}
            viewMonth={viewMonth}
            today={today}
            cmap={cmap}
            router={router}
            onDayClick={date => {
              setDayDate(date)
              setView('day')
            }}
          />
        ) : view === 'week' ? (
          <WeekView
            weekStart={weekStart}
            today={today}
            cmap={cmap}
            router={router}
            onDayClick={date => {
              setDayDate(date)
              setView('day')
            }}
          />
        ) : (
          <DayView dayDate={dayDate} today={today} cmap={cmap} router={router} />
        )}
      </div>
    </main>
  )
}

function ClientCalendarSkeleton({ view }: { view: ViewMode }) {
  if (view === 'month') {
    return (
      <div className="px-3 pb-[100px]" aria-busy="true" aria-label="Loading calendar">
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
      <div className="grid min-w-max grid-cols-[repeat(7,minmax(148px,1fr))] gap-1.5 px-3 pb-[100px]" aria-busy="true" aria-label="Loading calendar">
        {Array.from({ length: 7 }, (_, i) => (
          <Skeleton key={i} className="h-48 rounded-xl" />
        ))}
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-3 px-4 py-3 pb-[100px]" aria-busy="true" aria-label="Loading calendar">
      <Skeleton className="h-24 w-full rounded-2xl" />
      <Skeleton className="h-20 w-full rounded-[14px]" />
      <Skeleton className="h-20 w-full rounded-[14px]" />
    </div>
  )
}

function MonthView({
  viewYear,
  viewMonth,
  today,
  cmap,
  router,
  onDayClick,
}: {
  viewYear: number
  viewMonth: number
  today: Date
  cmap: Map<string, ContentRow[]>
  router: ReturnType<typeof useRouter>
  onDayClick: (d: Date) => void
}) {
  const cells = buildMonthGrid(viewYear, viewMonth)
  const todayStr = toStr(today)

  return (
    <div className="px-3 pb-[100px]">
      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell, i) => {
          const key = toStr(cell.date)
          const pieces = cmap.get(key) || []
          const isToday = key === todayStr
          const hasReview = pieces.some(piece => needsClientAction(piece.status))
          const shown = pieces.slice(0, 2)
          const more = pieces.length - shown.length

          return (
            <div
              key={i}
              data-animate="client-cal-item"
              onClick={() => {
                if (pieces.length === 0) return
                if (pieces.length === 1) router.push(`/client/approval/${pieces[0].id}`)
                else onDayClick(cell.date)
              }}
              className={cn(
                'relative overflow-hidden rounded-[10px] p-[6px_5px_4px] transition-[transform,box-shadow] duration-150',
                pieces.length > 0 && 'cursor-pointer hover:-translate-y-0.5 hover:shadow-md',
                cell.inMonth ? (pieces.length ? 'bg-card' : 'bg-surface/50') : 'bg-wash',
                isToday ? 'border-2 border-primary' : hasReview ? 'border border-primary/50' : 'border border-border',
                !cell.inMonth && 'opacity-[0.38]'
              )}
              style={{ minHeight: 82 }}
            >
              <div className={cn('mb-1 inline-flex items-center justify-center', isToday ? 'size-5 rounded-md bg-primary' : 'ml-px')}>
                <span className={cn('text-[0.68rem] leading-none', isToday ? 'font-extrabold text-primary-foreground' : 'font-medium text-foreground/80')}>
                  {cell.date.getDate()}
                </span>
              </div>

              <div className="flex flex-col gap-[2px]">
                {shown.map(piece => {
                  const cfg = CONTENT_TYPE_STYLE[piece.type] ?? CONTENT_TYPE_STYLE.graphic
                  return (
                    <div
                      key={piece.id}
                      className={cn(
                        'flex items-center gap-[3px] rounded-r-[3px] border-l-[2.5px] px-1 py-[1.5px]',
                        needsClientAction(piece.status) ? 'border-l-primary bg-primary/15' : piece.status === 'approved' || piece.status === 'posted' ? 'border-l-success bg-success/10' : 'border-l-primary/40 bg-wash'
                      )}
                    >
                      <TypeIcon name={cfg.icon} className="size-2 text-primary" />
                      <span className="truncate text-[0.5rem] font-bold leading-[1.4] text-foreground/80">
                        {piece.title.slice(0, 11)}{piece.title.length > 11 ? '…' : ''}
                      </span>
                    </div>
                  )
                })}
                {more > 0 && <span className="pl-1 text-[0.48rem] font-bold text-primary">+{more}</span>}
              </div>

              {hasReview && <div className="absolute inset-x-0 bottom-0 h-[3px] bg-primary" />}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function WeekView({
  weekStart,
  today,
  cmap,
  router,
  onDayClick,
}: {
  weekStart: Date
  today: Date
  cmap: Map<string, ContentRow[]>
  router: ReturnType<typeof useRouter>
  onDayClick: (d: Date) => void
}) {
  const days = buildWeekDays(weekStart)
  const todayStr = toStr(today)

  return (
    <div className="flex-1 overflow-auto px-3 pb-[100px]">
      <div className="grid min-w-max grid-cols-[repeat(7,minmax(148px,1fr))] gap-1.5">
        {days.map((day, i) => {
          const key = toStr(day)
          const pieces = cmap.get(key) || []
          const isToday = key === todayStr
          const isPast = day < today && !isToday
          const hasReview = pieces.some(piece => needsClientAction(piece.status))

          return (
            <div
              key={i}
              className={cn(
                'overflow-hidden rounded-xl border bg-card',
                isToday ? 'border-primary' : hasReview ? 'border-primary/50' : 'border-border',
                isPast && 'opacity-70'
              )}
            >
              <button
                onClick={() => onDayClick(day)}
                className={cn(
                  'flex w-full items-center justify-between border-0 border-b border-border px-3 py-2 text-left',
                  isToday ? 'bg-primary text-primary-foreground' : 'bg-wash'
                )}
              >
                <div>
                  <p className={cn('text-[0.56rem] font-semibold uppercase tracking-[0.06em]', isToday ? 'text-primary-foreground/80' : 'text-muted-foreground')}>
                    {day.toLocaleDateString('en-US', { weekday: 'short' })}
                  </p>
                  <p className={cn('mt-0.5 text-base font-extrabold leading-none', isToday ? 'text-primary-foreground' : 'text-foreground')}>
                    {day.getDate()}
                  </p>
                </div>
                {pieces.length > 0 && (
                  <span className={cn(
                    'rounded-full px-2 py-0.5 text-[0.6rem] font-extrabold',
                    isToday ? 'bg-primary-foreground/25 text-primary-foreground' : hasReview ? 'bg-primary/15 text-primary' : 'bg-wash text-muted-foreground'
                  )}>
                    {pieces.length}
                  </span>
                )}
              </button>

              <div className="flex min-h-[100px] flex-col gap-1.5 p-2">
                {pieces.length === 0 ? (
                  <div className="flex flex-1 items-center justify-center py-4">
                    <span className="text-[0.6rem] text-muted-foreground">No posts</span>
                  </div>
                ) : (
                  pieces.map(piece => {
                    const cfg = CONTENT_TYPE_STYLE[piece.type] ?? CONTENT_TYPE_STYLE.graphic
                    const review = needsClientAction(piece.status)
                    const approved = piece.status === 'approved' || piece.status === 'posted'
                    return (
                      <button
                        key={piece.id}
                        onClick={() => router.push(`/client/approval/${piece.id}`)}
                        className={cn(
                          'overflow-hidden rounded-lg border text-left transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:shadow-md',
                          review ? 'border-primary/50' : approved ? 'border-success/40' : 'border-border'
                        )}
                      >
                        <div className={cn('h-1', review ? 'bg-primary' : approved ? 'bg-success' : 'bg-sage')} />
                        <div className={cn('px-2.5 py-2', review ? 'bg-wash' : 'bg-card')}>
                          <div className="mb-1 flex items-center gap-1">
                            {review || approved ? (
                              <StatusBadge status={piece.status as 'client-review' | 'approved'} size="sm">
                                {review ? 'Needs review' : 'Approved'}
                              </StatusBadge>
                            ) : (
                              <span className={cn('inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[0.52rem] font-bold', cfg.className)}>
                                <TypeIcon name={cfg.icon} className="size-2" />
                                {cfg.label}
                              </span>
                            )}
                          </div>
                          <p className="truncate text-[0.72rem] font-bold text-foreground">{piece.title}</p>
                          <p className="mt-0.5 text-[0.58rem] capitalize text-muted-foreground">{piece.status.replace(/-/g, ' ')}</p>
                        </div>
                      </button>
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

function DayView({
  dayDate,
  today,
  cmap,
  router,
}: {
  dayDate: Date
  today: Date
  cmap: Map<string, ContentRow[]>
  router: ReturnType<typeof useRouter>
}) {
  const key = toStr(dayDate)
  const pieces = cmap.get(key) || []
  const isToday = key === toStr(today)
  const isPast = dayDate < today && !isToday
  const hasReview = pieces.some(piece => needsClientAction(piece.status))

  return (
    <div className="flex flex-col gap-3 px-4 py-3 pb-[100px]">
      <div
        className={cn(
          'flex items-center gap-4 rounded-2xl border px-5 py-[18px]',
          isToday ? 'border-primary bg-dark text-dark-text' : hasReview ? 'border-primary/50 bg-card' : 'border-border bg-card'
        )}
      >
        <div className="shrink-0 text-center">
          <p className={cn('mb-1 text-[0.6rem] font-bold uppercase tracking-[0.08em]', isToday ? 'text-dark-muted' : 'text-muted-foreground')}>
            {dayDate.toLocaleDateString('en-US', { weekday: 'short' })}
          </p>
          <p className={cn('text-[2.2rem] font-extrabold leading-none', isToday ? 'text-dark-text' : 'text-foreground')}>
            {dayDate.getDate()}
          </p>
          <p className={cn('mt-0.5 text-[0.6rem]', isToday ? 'text-dark-muted' : 'text-muted-foreground')}>
            {dayDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
          </p>
        </div>

        <div className="flex-1">
          <p className={cn('mb-1 text-[1.1rem] font-extrabold leading-none', isToday ? 'text-dark-text' : 'text-foreground')}>
            {pieces.length} post{pieces.length !== 1 ? 's' : ''} scheduled
          </p>
          {hasReview ? (
            <p className="text-[0.72rem] font-semibold text-primary">
              {pieces.filter(piece => needsClientAction(piece.status)).length} waiting for your review
            </p>
          ) : isPast ? (
            <p className="text-[0.72rem] text-muted-foreground">Past date</p>
          ) : isToday ? (
            <p className="text-[0.72rem] text-success">Today</p>
          ) : (
            <p className="text-[0.72rem] text-muted-foreground">Upcoming</p>
          )}
        </div>
      </div>

      {pieces.length === 0 ? (
        <EmptyState
          icon="🗓️"
          title="No content scheduled"
          body="Nothing is planned for this day."
          className="border-border bg-card py-12"
        />
      ) : (
        pieces.map(piece => {
          const cfg = CONTENT_TYPE_STYLE[piece.type] ?? CONTENT_TYPE_STYLE.graphic
          const review = needsClientAction(piece.status)
          const approved = piece.status === 'approved' || piece.status === 'posted'

          return (
            <div
              key={piece.id}
              data-animate="client-cal-item"
              onClick={() => router.push(`/client/approval/${piece.id}`)}
              className={cn(
                'cursor-pointer overflow-hidden rounded-[14px] border bg-card transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5',
                review ? 'border-primary/50 shadow-sm hover:shadow-md' : approved ? 'border-success/40 hover:shadow-md' : 'border-border hover:shadow-md'
              )}
            >
              <div className={cn('h-[5px]', review ? 'bg-primary' : approved ? 'bg-success' : 'bg-sage')} />
              <div className={cn('px-4 py-3.5', review ? 'bg-wash' : 'bg-card')}>
                <div className="flex items-start gap-3">
                  <div className={cn('flex size-11 shrink-0 items-center justify-center rounded-[10px] bg-wash')}>
                    <TypeGlyph type={piece.type} colorClass="text-primary" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="mb-1 text-[0.9rem] font-bold leading-[1.3] text-foreground">{piece.title}</p>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <StatusBadge status={piece.status as 'planned'} size="sm">
                        {review ? 'Needs review' : approved ? 'Approved' : undefined}
                      </StatusBadge>
                      <span className="inline-flex items-center gap-1 text-[0.6rem] text-muted-foreground">
                        <TypeIcon name={cfg.icon} className="size-2.5" />
                        {cfg.label}
                      </span>
                    </div>
                  </div>

                  <div className={cn('shrink-0 self-center text-base', review ? 'text-primary' : 'text-muted-foreground')}>›</div>
                </div>

                {review && (
                  <div className="mt-3 rounded-lg border border-primary/30 bg-wash px-3 py-2">
                    <span className="text-[0.7rem] font-bold text-primary">Tap to review and approve this content</span>
                  </div>
                )}
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}

function TypeGlyph({ type, colorClass }: { type: ContentType; colorClass: string }) {
  if (type === 'video') {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className={colorClass}>
        <rect x="2" y="5" width="15" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M17 9l5-3v12l-5-3V9z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    )
  }
  if (type === 'reel') {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className={colorClass}>
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" />
        <path d="M12 3v3M21 12h-3M12 21v-3M3 12h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    )
  }
  if (type === 'story') {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className={colorClass}>
        <rect x="6" y="2" width="12" height="20" rx="3" stroke="currentColor" strokeWidth="1.5" />
        <path d="M9 7h6M9 11h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    )
  }
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className={colorClass}>
      <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="8.5" cy="8.5" r="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3 16l5-5 4 4 3-3 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function NavBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="flex size-7 items-center justify-center rounded-full border border-dark-hover bg-dark-raised text-base text-dark-text transition-colors hover:bg-dark-hover"
    >
      {children}
    </button>
  )
}

function StatChip({
  n,
  label,
  variant,
}: {
  n: number
  label: string
  variant: 'mint' | 'muted'
}) {
  const tone = variant === 'mint' ? 'text-mint' : 'text-dark-muted'

  return (
    <div className="text-right">
      <p className={cn('text-[0.95rem] font-extrabold leading-none', tone)}>{n}</p>
      <p className="mt-0.5 text-[0.56rem] text-dark-muted">{label}</p>
    </div>
  )
}
