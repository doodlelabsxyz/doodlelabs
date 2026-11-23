'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import type { ContentType, ContentStatus } from '@/lib/types'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/ui/status-badge'
import { TypeIcon, StatusIcon } from '@/components/ui/type-icon'
import { CONTENT_TYPE_STYLE } from '@/lib/color-map'
import { isContentOverdue, isTaskOverdue } from '@/lib/overdue'

gsap.registerPlugin(useGSAP)

type ContentRow = {
  id: string; title: string; type: ContentType; status: ContentStatus
  caption: string | null; platforms: string[]; scheduled_date: string
  clients: { id: string; name: string; industry: string; brand_color: string } | null
}
type ContentQueryRow = Omit<ContentRow, 'clients'> & {
  clients: ContentRow['clients'] | ContentRow['clients'][]
}
type TaskRow = { id: string; title: string; status: string; content_id: string; due_date: string }

function dateToStr(dt: Date) {
  return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`
}

export default function DayViewPage() {
  const router  = useRouter()
  const params  = useParams()
  const listRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)
  const [content, setContent] = useState<ContentRow[]>([])
  const [tasks,   setTasks]   = useState<TaskRow[]>([])

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
          .select('id, title, status, content_id, due_date')
          .order('due_date'),
      ])

      const pieces = ((contentRes.data || []) as ContentQueryRow[]).map(cp => ({
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
    gsap.fromTo('[data-animate="day-card"]',
      { y: 16, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.4, stagger: 0.08, ease: 'back.out(1.3)', clearProps: 'all' }
    )
  }, { dependencies: [mounted, dateStr], scope: listRef })

  if (!mounted) {
    return (
      <div className="flex min-w-0 flex-1 flex-col gap-3.5 px-4 py-5" aria-busy="true" aria-label="Loading day">
        <Skeleton className="h-14 w-full rounded-2xl" />
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-28 w-full rounded-2xl" />
      </div>
    )
  }

  return (
    <main className="page-main flex-1 min-w-0 overflow-y-auto flex flex-col">

      {/* ── Dark header ── */}
      <div className="bg-dark px-5 pt-[18px] pb-4 shrink-0 border-b border-white/[0.04]">
        <div className="flex items-center gap-3">
          {/* Back button */}
          <button
            onClick={() => router.push('/calendar')}
            className="w-8 h-8 rounded-lg bg-white/[0.06] border-0 text-dark-text cursor-pointer text-base flex items-center justify-center hover:bg-white/[0.1] transition-colors"
          >←</button>

          <div className="flex-1">
            <p className="text-[0.656rem] text-dark-muted tracking-[0.08em] uppercase mb-px">
              {isToday ? 'Today' : isPast ? 'Past' : 'Upcoming'}
            </p>
            <h1 className="text-[1.167rem] font-extrabold text-dark-text leading-none">
              {viewDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </h1>
          </div>

          {/* Prev / Next day */}
          <div className="flex gap-[6px]">
            <button
              onClick={() => router.push(`/calendar/${dateToStr(prevDate)}`)}
              className="w-[30px] h-[30px] rounded-full border border-white/[0.1] bg-white/[0.04] text-dark-text cursor-pointer text-sm flex items-center justify-center hover:bg-white/[0.08] transition-colors"
            >‹</button>
            <button
              onClick={() => router.push(`/calendar/${dateToStr(nextDate)}`)}
              className="w-[30px] h-[30px] rounded-full border border-white/[0.1] bg-white/[0.04] text-dark-text cursor-pointer text-sm flex items-center justify-center hover:bg-white/[0.08] transition-colors"
            >›</button>
          </div>
        </div>

        {/* Stats row */}
        <div className="flex gap-2 mt-3">
          <div className="px-3 py-[5px] rounded-full bg-white/[0.07] flex items-center gap-[6px]">
            <span className="text-[0.875rem] font-extrabold text-mint">{content.length}</span>
            <span className="text-[0.656rem] text-dark-muted">posts</span>
          </div>
          {content.some(isContentOverdue) && (
            <div className="px-3 py-[5px] rounded-full bg-danger/15 flex items-center gap-[6px]">
              <span className="text-[0.875rem] font-extrabold text-danger">
                {content.filter(isContentOverdue).length}
              </span>
              <span className="text-[0.656rem] text-danger/70">overdue</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Content list ── */}
      <div ref={listRef} className="p-4 flex-1">
        {content.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-[60px] px-5">
            <div className="w-[72px] h-[72px] rounded-[18px] bg-wash border border-dashed border-border flex items-center justify-center">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="opacity-30">
                <rect x="3" y="5" width="18" height="17" rx="3" className="stroke-muted-foreground" strokeWidth="1.5"/>
                <path d="M3 10h18M8 3v4M16 3v4" className="stroke-muted-foreground" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <p className="text-[0.875rem] font-semibold text-muted-foreground">No content scheduled</p>
            <button
              onClick={() => router.push(`/brief/new?date=${dateStr}`)}
              className="px-5 py-[10px] rounded-[10px] bg-primary border-0 text-primary-foreground font-bold text-[0.8rem] cursor-pointer shadow-md hover:bg-primary/90 transition-colors"
            >
              + Create Content
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-[10px]">
            {content.map(cp => {
              const cfg     = CONTENT_TYPE_STYLE[cp.type]
              const cpTasks = tasks.filter(t => t.content_id === cp.id)

              return (
                <div
                  key={cp.id}
                  data-animate="day-card"
                  onClick={() => router.push(`/brief/${cp.id}`)}
                  className={cn(
                    "bg-card rounded-2xl border border-border overflow-hidden cursor-pointer",
                    "transition-[transform,box-shadow] duration-150 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
                    "hover:-translate-y-[3px] hover:shadow-md"
                  )}
                >
                  <div className="p-4">
                    {/* Title row */}
                    <div className="flex items-start justify-between gap-3 mb-[10px]">
                      <div className="flex-1 min-w-0">
                        <p className="text-[0.95rem] font-extrabold text-foreground leading-[1.3]">{cp.title}</p>
                        {cp.clients && (
                          <p className="text-[0.75rem] text-muted-foreground mt-[3px]">
                            {cp.clients.name} · {cp.clients.industry}
                          </p>
                        )}
                      </div>
                      <StatusBadge status={cp.status} size="sm" className="shrink-0 mt-0.5">
                        {cp.status.replace(/-/g, ' ')}
                      </StatusBadge>
                    </div>

                    {/* Caption preview */}
                    {cp.caption && (
                      <p className="text-[0.8rem] text-muted-foreground leading-[1.5] mb-3 line-clamp-2">
                        {cp.caption}
                      </p>
                    )}

                    {/* Tags row */}
                    <div className="flex items-center gap-[10px] flex-wrap">
                      <span className={cn("inline-flex items-center gap-1 px-2 py-[3px] rounded-[6px] text-[0.656rem] font-bold", cfg.className)}>
                        <TypeIcon name={cfg.icon} className="size-2.5" />
                        {cfg.label}
                      </span>
                      <div className="flex gap-1">
                        {cp.platforms.map(p => (
                          <span key={p} className="px-2 py-[3px] rounded-[6px] bg-wash text-[0.656rem] font-semibold text-muted-foreground capitalize">
                            {p}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Tasks */}
                    {cpTasks.length > 0 && (
                      <div className="mt-3 border-t border-border pt-[10px]">
                        <p className="text-[0.656rem] font-bold text-muted-foreground mb-[6px]">
                          Tasks ({cpTasks.length})
                        </p>
                        <div className="flex flex-col gap-1">
                          {cpTasks.map(t => {
                            const overdue = isTaskOverdue(t)
                            return (
                            <div key={t.id} className="flex items-center gap-2">
                              {/* Checkbox */}
                              <div className={cn(
                                "w-[14px] h-[14px] rounded-[4px] border-[1.5px] flex items-center justify-center shrink-0",
                                t.status === 'done'
                                  ? "border-success bg-success"
                                  : overdue
                                    ? "border-danger bg-transparent"
                                    : "border-border bg-transparent"
                              )}>
                                {t.status === 'done' && (
                                  <StatusIcon name="check" className="size-2 text-success-foreground" />
                                )}
                              </div>
                              <span className={cn(
                                "text-[0.75rem] text-muted-foreground flex-1",
                                t.status === 'done' && "line-through"
                              )}>
                                {t.title}
                              </span>
                              <span className={cn(
                                "inline-flex items-center gap-0.5 text-[0.6rem] font-semibold capitalize",
                                overdue ? "text-danger" : "text-muted-foreground"
                              )}>
                                {overdue && <StatusIcon name="bang" className="size-2.5" />}
                                {overdue ? 'overdue' : t.status.replace('-', ' ')}
                              </span>
                            </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}

            {/* Add more button */}
            <button
              onClick={() => router.push(`/brief/new?date=${dateStr}`)}
              className="p-[14px] rounded-xl border border-dashed border-primary/40 bg-primary/[0.04] cursor-pointer flex items-center justify-center gap-2 mt-1 hover:bg-primary/[0.07] transition-colors"
            >
              <span className="text-[0.85rem] font-semibold text-primary">+ Add Content</span>
            </button>
          </div>
        )}
      </div>
    </main>
  )
}
