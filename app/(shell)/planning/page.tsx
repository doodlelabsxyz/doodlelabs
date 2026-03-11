'use client'

import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { useRouter } from 'next/navigation'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'
import type { ContentType } from '@/lib/types'
import { cn } from '@/lib/utils'

gsap.registerPlugin(useGSAP)

type ClientRow = { id: string; name: string; initials: string; brand_color: string; content_this_month: number }
type ContentRow = { id: string; title: string; type: string; status: string; client_id: string; scheduled_date: string }

const TYPE_CFG: Record<ContentType, { bg: string; text: string; label: string; chip: string }> = {
  graphic: { bg: 'hsl(14 72% 62%)', text: '#fff', label: 'Graphic', chip: 'bg-coral/12 text-coral' },
  video: { bg: 'hsl(40 95% 62%)', text: '#3a2800', label: 'Video', chip: 'bg-lemon/20 text-foreground' },
  reel: { bg: 'hsl(161 58% 50%)', text: '#fff', label: 'Reel', chip: 'bg-mint/12 text-mint' },
  story: { bg: 'hsl(268 60% 68%)', text: '#fff', label: 'Story', chip: 'bg-lavender/14 text-lavender' },
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

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
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function monthRange(year: number, month: number) {
  const mm = String(month + 1).padStart(2, '0')
  const last = new Date(year, month + 1, 0).getDate()
  return { start: `${year}-${mm}-01`, end: `${year}-${mm}-${String(last).padStart(2, '0')}` }
}

function styleVars(vars: Record<string, string | number>): CSSProperties {
  return vars as CSSProperties
}

export default function PlanningPage() {
  const router = useRouter()
  const supabase = createClient()
  const today = new Date()
  const quotaRef = useRef<HTMLDivElement>(null)

  const [clients, setClients] = useState<ClientRow[]>([])
  const [contentPieces, setContentPieces] = useState<ContentRow[]>([])
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [addClient, setAddClient] = useState('')
  const [addType, setAddType] = useState<ContentType>('graphic')
  const [addTitle, setAddTitle] = useState('')

  useEffect(() => {
    supabase
      .from('clients')
      .select('id, name, initials, brand_color, content_this_month')
      .order('name')
      .then(({ data }) => {
        if (data) {
          setClients(data)
          if (data[0] && !addClient) setAddClient(data[0].id)
        }
      })
  }, [addClient, supabase])

  useEffect(() => {
    const { start, end } = monthRange(viewYear, viewMonth)
    supabase
      .from('content_pieces')
      .select('id, title, type, status, client_id, scheduled_date')
      .gte('scheduled_date', start)
      .lte('scheduled_date', end)
      .then(({ data }) => {
        if (data) setContentPieces(data)
      })
  }, [supabase, viewYear, viewMonth])

  useGSAP(
    () => {
      if (!quotaRef.current) return
      gsap.fromTo(
        '[data-animate="quota-card"]',
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.4, stagger: 0.08, ease: 'back.out(1.3)', clearProps: 'all' }
      )
    },
    { dependencies: [clients.length], scope: quotaRef }
  )

  const miniCells = buildMiniGrid(viewYear, viewMonth)

  const clientQuotas = clients.map(client => {
    const monthContent = contentPieces.filter(c => c.client_id === client.id)
    const byType: Record<ContentType, number> = { graphic: 0, video: 0, reel: 0, story: 0 }
    monthContent.forEach(c => {
      byType[c.type as ContentType]++
    })
    return { client, target: client.content_this_month, planned: monthContent.length, byType }
  })

  const contentByDay = new Map<number, ContentRow[]>()
  contentPieces.forEach(c => {
    const day = parseInt(c.scheduled_date.slice(8, 10), 10)
    if (!contentByDay.has(day)) contentByDay.set(day, [])
    contentByDay.get(day)!.push(c)
  })

  const dayContent = selectedDay ? contentPieces.filter(c => c.scheduled_date === dkey(selectedDay)) : []

  function navigate(dir: number) {
    const d = new Date(viewYear, viewMonth + dir)
    setViewMonth(d.getMonth())
    setViewYear(d.getFullYear())
    setSelectedDay(null)
    setShowAddForm(false)
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
      router.push(`/brief/new?date=${dkey(selectedDay)}&client=${addClient}&type=${addType}&title=${encodeURIComponent(addTitle)}`)
    }
  }

  const totalPlanned = clientQuotas.reduce((a, q) => a + q.planned, 0)
  const totalTarget = clientQuotas.reduce((a, q) => a + q.target, 0)

  return (
    <main className="page-main flex min-w-0 flex-1 flex-col overflow-y-auto bg-background">
      <div className="bg-foreground px-5 py-[18px] pb-4 text-background">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <p className="mb-px text-[0.656rem] uppercase tracking-[0.08em] text-background/50">Content</p>
            <h1 className="text-[1.167rem] font-extrabold leading-none">Planning</h1>
          </div>

          <div className="flex items-center gap-3">
            <ProgressRing value={totalPlanned} total={totalTarget} />
            <div>
              <p className="text-base font-extrabold leading-none text-coral">{totalPlanned}/{totalTarget}</p>
              <p className="mt-0.5 text-[0.6rem] text-background/50">posts planned</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <NavBtn onClick={() => navigate(-1)}>‹</NavBtn>
            <span className="min-w-25 text-center text-[0.8rem] font-bold text-background">
              {MONTHS[viewMonth].slice(0, 3)} {viewYear}
            </span>
            <NavBtn onClick={() => navigate(1)}>›</NavBtn>
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col md:flex-row">
        <div
          ref={quotaRef}
          className="max-h-65 flex-[0_0_auto] overflow-y-auto border-b border-border p-4 md:max-h-none md:w-[300px] md:border-r md:border-b-0"
        >
          <p className="mb-2.5 text-[0.75rem] font-bold text-foreground">Client Quotas</p>

          <div className="flex flex-col gap-2.5">
            {clientQuotas.map(({ client, target, planned, byType }) => {
              const pct = target > 0 ? Math.round((planned / target) * 100) : 0
              const isFull = planned >= target
              return (
                <Card
                  key={client.id}
                  data-animate="quota-card"
                  className={cn('bg-amber-50/40 py-0 shadow-none', isFull ? 'border-success/30' : 'border-border')}
                  style={styleVars({ '--client-color': client.brand_color, '--quota-width': `${Math.min(pct, 100)}%` })}
                >
                  <CardContent className="px-3.5 py-3.5">
                    <div className="mb-2.5 flex items-center gap-2.5">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[var(--client-color)] text-[11px] font-extrabold text-white">
                        {client.initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[0.8rem] font-bold leading-tight text-foreground">{client.name}</p>
                        <p className="text-[0.656rem] text-muted-foreground">{planned} of {target} planned</p>
                      </div>
                      <span className={cn('text-[0.75rem] font-extrabold', isFull ? 'text-success' : 'text-foreground')}>{pct}%</span>
                    </div>

                    <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div className={cn('h-full w-[var(--quota-width)] rounded-full transition-[width] duration-500', isFull ? 'bg-success' : 'bg-[var(--client-color)]')} />
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {(Object.entries(byType) as [ContentType, number][]).map(([t, n]) => (
                        <span key={t} className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.6rem] font-semibold', n > 0 ? TYPE_CFG[t].chip : 'bg-muted text-muted-foreground')}>
                          <span className="size-1.5 rounded-[2px] bg-[color:var(--type-color)]" style={styleVars({ '--type-color': TYPE_CFG[t].bg })} />
                          {n}
                        </span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col overflow-auto p-4">
          <div className="mb-4 max-w-[320px]">
            <div className="mb-1 grid grid-cols-7 gap-0.5">
              {DAYS.map((d, i) => (
                <div key={`${d}-${i}`} className="py-1 text-center text-[0.6rem] font-bold text-muted-foreground">
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-0.5">
              {miniCells.map((cell, i) => {
                if (!cell.inMonth) return <div key={i} className="aspect-square max-h-10 rounded-lg" />
                const isToday = cell.day === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear()
                const isSelected = selectedDay?.getDate() === cell.day && selectedDay?.getMonth() === viewMonth && selectedDay?.getFullYear() === viewYear
                const dayPieces = contentByDay.get(cell.day) || []
                const dayDate = new Date(viewYear, viewMonth, cell.day)
                const isPast = dayDate < new Date(today.getFullYear(), today.getMonth(), today.getDate()) && !isToday

                return (
                  <button
                    key={i}
                    onClick={() => selectDay(cell.day)}
                    className={cn(
                      'flex aspect-square max-h-10 flex-col items-center justify-center gap-0.5 rounded-lg border-2 bg-amber-50/40 transition-colors',
                      isSelected ? 'border-coral bg-coral/10' : isToday ? 'border-sky' : 'border-transparent',
                      isPast && 'opacity-45'
                    )}
                  >
                    <span className={cn('text-[0.7rem] leading-none', isSelected || isToday ? 'font-extrabold' : 'font-medium', isSelected ? 'text-coral' : isToday ? 'text-sky' : 'text-foreground')}>
                      {cell.day}
                    </span>
                    {dayPieces.length > 0 && (
                      <div className="flex gap-0.5">
                        {dayPieces.slice(0, 3).map((cp, j) => (
                          <div key={j} className="size-1 rounded-full bg-[color:var(--dot-color)]" style={styleVars({ '--dot-color': TYPE_CFG[cp.type as ContentType]?.bg ?? 'hsl(24 10% 60%)' })} />
                        ))}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {selectedDay ? (
            <Card className="flex flex-1 flex-col py-0 shadow-none">
              <CardContent className="flex flex-1 flex-col px-4 py-4">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <p className="text-base font-extrabold leading-tight text-foreground">
                      {selectedDay.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                    </p>
                    <p className="mt-0.5 text-[0.75rem] text-muted-foreground">
                      {dayContent.length} post{dayContent.length !== 1 ? 's' : ''} planned
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => router.push(`/calendar/${dkey(selectedDay)}`)}>
                    Day View
                  </Button>
                </div>

                {dayContent.length > 0 && (
                  <div className="mb-3 flex flex-col gap-1.5">
                    {dayContent.map(cp => {
                      const client = clients.find(c => c.id === cp.client_id)
                      const cfg = TYPE_CFG[cp.type as ContentType] ?? TYPE_CFG.graphic
                      return (
                        <button
                          key={cp.id}
                          onClick={() => goToBrief(cp.id)}
                          className="flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-transform hover:translate-x-1"
                          style={styleVars({ '--type-color': cfg.bg })}
                        >
                          <div className="size-2 shrink-0 rounded-[2px] bg-[var(--type-color)]" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[0.8rem] font-semibold leading-tight text-foreground">{cp.title}</p>
                            <p className="text-[0.656rem] text-muted-foreground">{client?.name} · {cfg.label}</p>
                          </div>
                          <Badge variant="outline" className="capitalize">
                            {cp.status.replace(/-/g, ' ')}
                          </Badge>
                        </button>
                      )
                    })}
                  </div>
                )}

                {!showAddForm ? (
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-coral/40 bg-coral/5 px-3 py-3 text-coral transition-colors hover:bg-coral/10"
                  >
                    <span className="flex size-5 items-center justify-center rounded-full bg-coral text-sm font-bold text-white">+</span>
                    <span className="text-[0.8rem] font-semibold">Add Content</span>
                  </button>
                ) : (
                  <Card className="bg-muted/30 py-0 shadow-none">
                    <CardContent className="flex flex-col gap-3 px-3.5 py-3.5">
                      <div>
                        <p className="mb-1.5 text-[0.7rem] font-bold text-foreground">Client</p>
                        <div className="flex flex-wrap gap-1.5">
                          {clients.map(c => (
                            <button
                              key={c.id}
                              onClick={() => setAddClient(c.id)}
                              className={cn(
                                'rounded-full px-2.5 py-1 text-[0.7rem] font-semibold transition-colors',
                                addClient === c.id ? 'text-white' : 'bg-card text-foreground'
                              )}
                              style={addClient === c.id ? styleVars({ '--client-color': c.brand_color, background: 'var(--client-color)' }) : undefined}
                            >
                              {c.name}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <p className="mb-1.5 text-[0.7rem] font-bold text-foreground">Type</p>
                        <div className="flex gap-1.5">
                          {(Object.entries(TYPE_CFG) as [ContentType, (typeof TYPE_CFG)[ContentType]][]).map(([t, cfg]) => (
                            <button
                              key={t}
                              onClick={() => setAddType(t)}
                              className={cn(
                                'rounded-lg px-2.5 py-1 text-[0.7rem] font-bold transition-colors',
                                addType === t ? '' : 'bg-card text-foreground'
                              )}
                              style={addType === t ? { background: cfg.bg, color: cfg.text } : undefined}
                            >
                              {cfg.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <p className="mb-1.5 text-[0.7rem] font-bold text-foreground">Title (optional)</p>
                        <Input
                          value={addTitle}
                          onChange={e => setAddTitle(e.target.value)}
                          placeholder="e.g., Morning Ritual Series"
                          className="bg-card"
                        />
                      </div>

                      <div className="flex gap-2">
                        <Button variant="outline" className="flex-1" onClick={() => { setShowAddForm(false); setAddTitle('') }}>
                          Cancel
                        </Button>
                        <Button className="flex-[2] bg-coral text-white hover:bg-coral/85" onClick={() => goToBrief()}>
                          Create Brief
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 px-5 py-10 text-center">
              <div className="flex size-20 items-center justify-center rounded-[20px] border border-dashed border-border bg-muted">
                <span className="text-3xl text-muted-foreground">📅</span>
              </div>
              <p className="text-[0.875rem] font-semibold text-foreground">Select a day to plan</p>
              <p className="max-w-60 text-[0.75rem] text-muted-foreground">
                Click on any date in the calendar above to view existing content or add new posts.
              </p>
            </div>
          )}
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
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="hsl(25 82% 60%)"
        strokeWidth="4"
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dasharray 0.8s cubic-bezier(0.34,1.56,0.64,1)' }}
      />
    </svg>
  )
}

function NavBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="flex size-7 items-center justify-center rounded-full border border-white/10 bg-white/5 text-base text-background transition-colors hover:bg-white/10"
    >
      {children}
    </button>
  )
}
