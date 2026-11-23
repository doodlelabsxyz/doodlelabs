'use client'

import { useState, useRef, useEffect } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { PlanUpgradeWall } from '@/components/PlanUpgradeWall'
import { usePlanGate } from '@/lib/hooks/usePlanGate'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { UserAvatar } from '@/components/ui/user-avatar'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import type { ContentType, ContentStatus } from '@/lib/types'
import { CONTENT_TYPE_STYLE } from '@/lib/color-map'
import { TypeIcon } from '@/components/ui/type-icon'
import { isContentOverdue, isTaskOverdue } from '@/lib/overdue'

gsap.registerPlugin(useGSAP)

const TYPE_LABEL: Record<ContentType, string> = {
  graphic: 'Graphic',
  video: 'Video',
  reel: 'Reel',
  story: 'Story',
}

type ContentRow = {
  id: string
  client_id: string
  type: ContentType
  status: ContentStatus
  scheduled_date: string
}

type ClientRow = {
  id: string
  name: string
  brand_color: string
  initials: string
}

type UserRow = {
  id: string
  name: string
  role: string
}

type TaskRow = {
  id: string
  assigned_to: string
  status: string
  due_date: string
}

type StatusSummary = {
  status: ContentStatus
  label: string
  count: number
  className: string
  dotClass: string
  progressClass: string
}

function MetricBox({
  value,
  label,
  accentClass,
}: {
  value: number
  label: string
  accentClass: string
}) {
  const numRef = useRef<HTMLSpanElement>(null)

  useGSAP(() => {
    if (!numRef.current) return
    gsap.fromTo(
      { v: 0 },
      { v: value },
      {
        duration: 1,
        ease: 'power3.out',
        delay: Math.random() * 0.2,
        onUpdate() {
          if (numRef.current) numRef.current.textContent = String(Math.round(this.targets()[0].v))
        },
      }
    )
  }, [value])

  return (
    <Card className="border border-border py-0 shadow-none">
      <CardContent className="py-4">
        <div className={cn('mb-2 h-[3px] w-6 rounded-full', accentClass)} />
        <p className={cn('text-2xl leading-none font-extrabold tracking-[-0.03em]', accentClass.replace('bg-', 'text-'))}>
          <span ref={numRef}>0</span>
        </p>
        <p className="mt-1 text-xs text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  )
}

function AnalyticsSkeleton() {
  return (
    <main className="page-main flex min-w-0 flex-1 flex-col overflow-y-auto" aria-busy="true" aria-label="Loading analytics">
      <section className="border-b border-border bg-background px-5 pt-[18px] pb-[14px]">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <p className="mb-px text-2xs uppercase tracking-[0.08em] text-muted-foreground">Admin</p>
            <h1 className="text-md font-extrabold leading-none text-foreground">Analytics</h1>
          </div>
          <Skeleton className="h-8 w-56 rounded-md" />
        </div>
      </section>
      <div className="flex flex-col gap-4 p-4">
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-[86px] rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-52 rounded-xl" />
          ))}
        </div>
      </div>
    </main>
  )
}

export default function AnalyticsPage() {
  const metricsRef = useRef<HTMLDivElement>(null)
  const { allowed: analyticsAllowed, requiredPlan, loading: gateLoading } = usePlanGate('hasAnalytics')
  const [mounted, setMounted] = useState(false)
  const [error, setError] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [period, setPeriod] = useState<'week' | 'month' | 'all'>('month')
  const [content, setContent] = useState<ContentRow[]>([])
  const [clients, setClients] = useState<ClientRow[]>([])
  const [users, setUsers] = useState<UserRow[]>([])
  const [tasks, setTasks] = useState<TaskRow[]>([])

  useEffect(() => {
    let ignore = false

    async function load() {
      setError(false)
      setMounted(false)
      const supabase = createClient()
      let cntRes, cliRes, usrRes, tskRes
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (ignore) return
        if (!user) {
          setMounted(true)
          return
        }

        ;[cntRes, cliRes, usrRes, tskRes] = await Promise.all([
          supabase.from('content_pieces').select('id, client_id, type, status, scheduled_date'),
          supabase.from('clients').select('id, name, brand_color, initials'),
          supabase.from('users').select('id, name, role').neq('role', 'client'),
          supabase.from('tasks').select('id, assigned_to, status, due_date'),
        ])
      } catch {
        if (ignore) return
        setError(true)
        setMounted(true)
        return
      }

      if (ignore) return
      if (cntRes.error || cliRes.error || usrRes.error || tskRes.error) {
        setError(true)
        setMounted(true)
        return
      }

      setContent((cntRes.data || []) as ContentRow[])
      setClients((cliRes.data || []) as ClientRow[])
      setUsers((usrRes.data || []) as UserRow[])
      setTasks((tskRes.data || []) as TaskRow[])
      setMounted(true)
    }

    void load()

    return () => {
      ignore = true
    }
  }, [reloadKey])

  useGSAP(() => {
    if (!mounted || !metricsRef.current) return
    gsap.fromTo(
      '[data-animate="analytics-card"]',
      { y: 16, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.4, stagger: 0.06, ease: 'back.out(1.3)', clearProps: 'all' }
    )
  }, { dependencies: [mounted, period], scope: metricsRef })

  if (!gateLoading && !analyticsAllowed) {
    return <PlanUpgradeWall feature="Analytics" requiredPlan={requiredPlan} />
  }
  if (gateLoading || !mounted) return <AnalyticsSkeleton />

  if (error) {
    return (
      <main className="page-main flex min-w-0 flex-1 flex-col items-center justify-center gap-3 p-10 text-center" role="alert">
        <p className="text-sm font-bold text-foreground">Couldn&apos;t load analytics</p>
        <p className="text-xs text-muted-foreground">Something went wrong while fetching your data.</p>
        <Button variant="outline" size="sm" onClick={() => setReloadKey(k => k + 1)}>Try again</Button>
      </main>
    )
  }

  const now = new Date()
  const filtered = content.filter(c => {
    if (period === 'all') return true
    const d = new Date(`${c.scheduled_date}T00:00:00`)
    if (period === 'week') {
      const weekAgo = new Date(now)
      weekAgo.setDate(weekAgo.getDate() - 6)
      weekAgo.setHours(0, 0, 0, 0)
      return d >= weekAgo
    }
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
  })

  const total = filtered.length
  const posted = filtered.filter(c => c.status === 'posted' || c.status === 'approved').length
  const overdue = filtered.filter(isContentOverdue).length
  const inProd = filtered.filter(c =>
    ['in-design', 'in-editing', 'ready-for-review', 'brief-ready'].includes(c.status)
  ).length
  const planned = filtered.filter(c => c.status === 'planned').length

  const typeCounts: Record<ContentType, number> = { graphic: 0, video: 0, reel: 0, story: 0 }
  filtered.forEach(c => {
    typeCounts[c.type]++
  })

  const clientStats = clients
    .map(client => {
      const clientContent = filtered.filter(c => c.client_id === client.id)
      return {
        client,
        total: clientContent.length,
        posted: clientContent.filter(c => c.status === 'posted' || c.status === 'approved').length,
        overdue: clientContent.filter(isContentOverdue).length,
      }
    })
    .filter(s => s.total > 0)

  const statusCounts: StatusSummary[] = [
    { status: 'planned', label: 'Planned', count: filtered.filter(c => c.status === 'planned').length, className: 'text-muted', dotClass: 'bg-muted', progressClass: '[&_[data-slot=progress-indicator]]:bg-muted' },
    { status: 'brief-ready', label: 'Brief', count: filtered.filter(c => c.status === 'brief-ready').length, className: 'text-primary', dotClass: 'bg-primary/60', progressClass: '[&_[data-slot=progress-indicator]]:bg-primary/60' },
    { status: 'in-design', label: 'Design', count: filtered.filter(c => c.status === 'in-design').length, className: 'text-primary', dotClass: 'bg-primary/80', progressClass: '[&_[data-slot=progress-indicator]]:bg-primary/80' },
    { status: 'in-editing', label: 'Editing', count: filtered.filter(c => c.status === 'in-editing').length, className: 'text-primary', dotClass: 'bg-primary', progressClass: '[&_[data-slot=progress-indicator]]:bg-primary' },
    { status: 'ready-for-review', label: 'Review', count: filtered.filter(c => c.status === 'ready-for-review').length, className: 'text-sage-ink', dotClass: 'bg-sage-ink', progressClass: '[&_[data-slot=progress-indicator]]:bg-sage-ink' },
    { status: 'approved', label: 'Approved', count: filtered.filter(c => c.status === 'approved').length, className: 'text-success', dotClass: 'bg-success', progressClass: '[&_[data-slot=progress-indicator]]:bg-success' },
    { status: 'overdue', label: 'Overdue', count: overdue, className: 'text-danger', dotClass: 'bg-danger', progressClass: '[&_[data-slot=progress-indicator]]:bg-danger' },
  ]
  const maxStatusCount = Math.max(...statusCounts.map(s => s.count), 1)

  const teamStats = users
    .filter(u => u.role !== 'admin')
    .map(u => {
      const userTasks = tasks.filter(t => t.assigned_to === u.id)
      return {
        user: u,
        total: userTasks.length,
        done: userTasks.filter(t => t.status === 'done').length,
        overdue: userTasks.filter(isTaskOverdue).length,
      }
    })

  return (
    <main className="page-main flex min-w-0 flex-1 flex-col overflow-y-auto">
      <section className="border-b border-border bg-background px-5 pt-[18px] pb-[14px]">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <p className="mb-px text-2xs uppercase tracking-[0.08em] text-muted-foreground">Admin</p>
            <h1 className="text-md font-extrabold leading-none text-foreground">Analytics</h1>
          </div>
          <div className="flex rounded-md border border-border bg-card p-0.5">
            {(['week', 'month', 'all'] as const).map(p => (
              <Button
                key={p}
                variant={period === p ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setPeriod(p)}
                className={cn(period === p && 'bg-primary text-primary-foreground hover:bg-primary/85')}
              >
                {p === 'all' ? 'All Time' : p === 'week' ? 'This Week' : 'This Month'}
              </Button>
            ))}
          </div>
        </div>
      </section>

      <div ref={metricsRef} className="flex flex-col gap-4 p-4">
        <div
          className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5"
          data-animate="analytics-card"
        >
          {[
            { value: total, label: 'Total Content', accentClass: 'bg-primary' },
            { value: posted, label: 'Posted / Approved', accentClass: 'bg-success' },
            { value: inProd, label: 'In Production', accentClass: 'bg-primary/60' },
            { value: planned, label: 'Planned', accentClass: 'bg-sage' },
            { value: overdue, label: 'Overdue', accentClass: 'bg-danger' },
          ].map(m => (
            <MetricBox key={m.label} {...m} />
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card className="border border-border py-0 shadow-none" data-animate="analytics-card">
            <CardContent className="py-5">
              <p className="mb-3.5 text-sm font-bold text-foreground">Content Mix</p>
              {total === 0 ? (
                <p className="text-sm text-muted-foreground">No content in this period.</p>
              ) : (
                <>
                  <div className="mb-3.5 flex h-3 gap-0.5 overflow-hidden rounded-full">
                    {(Object.entries(typeCounts) as [ContentType, number][]).map(([t, n]) =>
                      n > 0 ? <div key={t} className={cn('h-full', CONTENT_TYPE_STYLE[t].className)} style={{ flex: n }} /> : null
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    {(Object.entries(typeCounts) as [ContentType, number][]).map(([t, n]) => (
                      <div key={t} className="flex items-center gap-2.5">
                        <span className={cn('flex size-5 shrink-0 items-center justify-center rounded-md', CONTENT_TYPE_STYLE[t].className)}>
                          <TypeIcon name={CONTENT_TYPE_STYLE[t].icon} className="size-2.5" />
                        </span>
                        <span className="flex-1 text-sm font-semibold text-foreground">{TYPE_LABEL[t]}</span>
                        <span className="text-sm font-extrabold text-foreground">{n}</span>
                        <span className="min-w-9 text-right text-xs text-ghost">
                          {total > 0 ? Math.round((n / total) * 100) : 0}%
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="border border-border py-0 shadow-none" data-animate="analytics-card">
            <CardContent className="py-5">
              <p className="mb-3.5 text-sm font-bold text-foreground">Pipeline Status</p>
              <div className="flex flex-col gap-2">
                {statusCounts.map(s => (
                  <div key={s.status} className="flex items-center gap-2.5">
                    <div className={cn('size-2 rounded-full shrink-0', s.dotClass)} />
                    <span className="min-w-14 text-xs font-semibold text-foreground">{s.label}</span>
                    <Progress
                      value={(s.count / maxStatusCount) * 100}
                      className={cn('min-w-0 flex-1 gap-0', s.progressClass)}
                    />
                    <span className={cn('min-w-5 text-right text-sm font-extrabold', s.className)}>
                      {s.count}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {clientStats.length > 0 && (
            <Card className="border border-border py-0 shadow-none" data-animate="analytics-card">
              <CardContent className="py-5">
                <p className="mb-3.5 text-sm font-bold text-foreground">Client Performance</p>
                <div className="flex flex-col gap-3">
                  {clientStats.map(({ client, total: ct, posted: cp, overdue: co }) => {
                    const pct = ct > 0 ? Math.round((cp / ct) * 100) : 0
                    return (
                      <div key={client.id}>
                        <div className="mb-1.5 flex items-center gap-2.5">
                          <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary text-[10px] font-extrabold text-primary-foreground">
                            {client.initials}
                          </div>
                          <span className="flex-1 text-sm font-bold text-foreground">{client.name}</span>
                          <span className="text-sm font-bold text-primary">
                            {pct}%
                          </span>
                        </div>
                        <div className="flex h-1.5 gap-1 overflow-hidden rounded-full">
                          <div className="bg-primary" style={{ flex: cp }} />
                          <div className="bg-mint" style={{ flex: Math.max(ct - cp - co, 0) }} />
                          {co > 0 && <div className="bg-danger" style={{ flex: co }} />}
                        </div>
                        <div className="mt-1 flex gap-3 text-[0.6rem] text-ghost">
                          <span>{cp} posted</span>
                          <span>{Math.max(ct - cp - co, 0)} in progress</span>
                          {co > 0 && <span className="text-danger">{co} overdue</span>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {teamStats.length > 0 && (
            <Card className="border border-border py-0 shadow-none" data-animate="analytics-card">
              <CardContent className="py-5">
                <p className="mb-3.5 text-sm font-bold text-foreground">Team Performance</p>
                <div className="flex flex-col gap-3">
                  {teamStats.map(({ user, total: tt, done: td, overdue: to }) => {
                    const pct = tt > 0 ? Math.round((td / tt) * 100) : 0
                    const progressClass = to > 0
                      ? '[&_[data-slot=progress-indicator]]:bg-danger'
                      : pct >= 80
                        ? '[&_[data-slot=progress-indicator]]:bg-success'
                        : '[&_[data-slot=progress-indicator]]:bg-primary'

                    return (
                      <div key={user.id} className="flex items-center gap-2.5">
                        <UserAvatar userId={user.id} name={user.name} size="sm" />
                        <div className="min-w-0 flex-1">
                          <div className="mb-1 flex items-center justify-between gap-2">
                            <span className="truncate text-xs font-semibold text-foreground">{user.name}</span>
                            <span className="text-2xs text-ghost">{td}/{tt}</span>
                          </div>
                          <Progress value={pct} className={cn('gap-0', progressClass)} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </main>
  )
}
