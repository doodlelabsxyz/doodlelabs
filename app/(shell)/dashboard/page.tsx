'use client'

import { useEffect, useState, useRef } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'

import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { UserAvatar } from '@/components/ui/user-avatar'
import { TopBar } from '@/components/shell/TopBar'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { CONTENT_TYPE_STYLE, DUE_SOON_STYLE } from '@/lib/color-map'
import { TypeIcon, StatusIcon } from '@/components/ui/type-icon'
import { StatusBadge } from '@/components/ui/status-badge'
import { needsClientAction, type ContentType, type ContentStatus } from '@/lib/types'
import { isContentOverdue } from '@/lib/overdue'

gsap.registerPlugin(useGSAP)

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function formatDate() {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

type ContentRow = {
  id: string
  title: string
  type: ContentType
  status: ContentStatus
  scheduled_date: string | null
  platforms: string[] | null
  client_id: string | null
}

type ClientRow = {
  id: string
  name: string
  initials: string
  brand_color: string
  content_quota: number
  pending_approvals: number
}

type TeamRow = {
  id: string
  name: string
  role: string
  tasks_today: number
  tasks_total: number
}

function SectionTitle({
  title,
  count,
}: {
  title: string
  count?: number
}) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <p className="text-sm font-bold text-foreground">{title}</p>
      {count !== undefined && (
        <Badge className="border-0 bg-secondary text-xs font-bold text-muted-foreground">
          {count}
        </Badge>
      )}
    </div>
  )
}

function MetricCard({
  value,
  label,
  sub,
  tileClass,
  barClass,
}: {
  value: number
  label: string
  sub: string
  tileClass: string
  barClass: string
}) {
  const numRef = useRef<HTMLSpanElement>(null)

  useGSAP(() => {
    if (!numRef.current) return
    gsap.fromTo(
      { val: 0 },
      { val: value },
      {
        duration: 1.1,
        ease: 'power3.out',
        delay: Math.random() * 0.3,
        onUpdate() {
          if (numRef.current) {
            numRef.current.textContent = String(Math.round(this.targets()[0].val))
          }
        },
      }
    )
  }, [value])

  return (
    <Card className={cn('h-full min-w-0 gap-0 border border-border py-0 shadow-none transition-all hover:-translate-y-1 hover:shadow-md', tileClass)}>
      <CardContent className="flex min-h-[120px] flex-col justify-between py-5">
        <div className={cn('mb-3 h-1 w-8 rounded-full', barClass)} />
        <div>
          <p className="text-[42px] leading-none font-extrabold tracking-[-0.04em]">
            <span ref={numRef}>0</span>
          </p>
          <p className="mt-1.5 text-sm font-bold">{label}</p>
          <p className="mt-0.5 text-xs opacity-80">{sub}</p>
        </div>
      </CardContent>
    </Card>
  )
}

export default function DashboardPage() {
  const [userName, setUserName] = useState('...')
  const [mounted, setMounted] = useState(false)
  const [loadFailed, setLoadFailed] = useState(false)
  const [content, setContent] = useState<ContentRow[]>([])
  const [clients, setClients] = useState<ClientRow[]>([])
  const [team, setTeam] = useState<TeamRow[]>([])
  const [unread, setUnread] = useState(0)
  const metricsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) { setLoadFailed(true); return }

      const [profileRes, contentRes, clientsRes, usersRes, notifRes] = await Promise.all([
        supabase.from('users').select('name').eq('id', user.id).single(),
        supabase
          .from('content_pieces')
          .select('id, title, type, status, scheduled_date, platforms, client_id'),
        supabase
          .from('clients')
          .select('id, name, initials, brand_color, content_quota, pending_approvals'),
        supabase
          .from('users')
          .select('id, name, role, tasks_today, tasks_total')
          .neq('role', 'client')
          .neq('role', 'admin'),
        supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('read', false),
      ])

      setUserName(profileRes.data?.name?.split(' ')[0] || 'Admin')
      setContent((contentRes.data || []) as ContentRow[])
      setClients((clientsRes.data || []) as ClientRow[])
      setTeam((usersRes.data || []) as TeamRow[])
      setUnread(notifRes.count ?? 0)
      setMounted(true)
    }

    void load()
  }, [])

  useGSAP(() => {
    if (!metricsRef.current || !mounted) return
    gsap.fromTo(
      metricsRef.current.querySelectorAll('.metric-card'),
      { y: 28, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.5, ease: 'back.out(1.4)', stagger: 0.08 }
    )
  }, { dependencies: [mounted], scope: metricsRef })

  if (!mounted && loadFailed) {
    return (
      <div className="flex min-w-0 flex-1 flex-col items-center gap-3 px-4 py-16 text-center" role="alert">
        <p className="text-sm font-bold text-foreground">We couldn&apos;t load your dashboard.</p>
        <p className="text-sm text-muted-foreground">Your session may have expired.</p>
        <Button size="sm" onClick={() => window.location.reload()}>Try again</Button>
      </div>
    )
  }

  if (!mounted) {
    return (
      <div className="flex min-w-0 flex-1 flex-col gap-3.5 px-4 py-5" aria-busy="true" aria-label="Loading dashboard">
        <Skeleton className="h-14 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    )
  }

  const todayStr = new Date().toISOString().split('T')[0]
  const todayContent = content.filter(c => c.scheduled_date === todayStr)
  const overdueItems = content.filter(isContentOverdue)
  const needsReview = content.filter(c => c.status === 'ready-for-review')
  const inProd = content.filter(c => !['posted', 'planned', 'overdue'].includes(c.status))
  const attentionItems = [...needsReview, ...overdueItems].slice(0, 6)

  const clientMap = Object.fromEntries(clients.map(c => [c.id, c]))

  return (
    <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
      <div className="hidden shrink-0 items-center justify-between gap-4 bg-card px-6 py-5 md:flex">
        <div>
          <p className="text-[11px] font-medium tracking-[0.06em] text-muted-foreground uppercase">
            {formatDate()}
          </p>
          <h1 className="mt-1 text-[26px] leading-[1.15] font-extrabold tracking-[-0.02em] text-foreground">
            {getGreeting()},{' '}
            <span className="text-primary">{userName}!</span>
          </h1>
        </div>
      </div>

      <div className="md:hidden">
        <TopBar greeting={getGreeting()} userName={userName} notifCount={unread} showClientSwitcher />
      </div>

      <main className="page-main flex-1 overflow-y-auto p-4 pb-[100px] md:p-6 md:pb-8">
       <div className="mx-auto w-full max-w-6xl">
        <div
          ref={metricsRef}
          className="mb-4 grid grid-cols-2 gap-3 md:mb-6 md:grid-cols-4 md:gap-4"
        >
          {[
            {
              value: needsReview.length + overdueItems.length,
              label: 'Needs Action',
              sub: 'Review or fix now',
              tileClass: 'bg-wash text-foreground',
              barClass: overdueItems.length > 0 ? 'bg-danger' : 'bg-primary',
            },
            {
              value: todayContent.length,
              label: 'Live Today',
              sub: 'Posts scheduled',
              tileClass: 'bg-sage text-foreground',
              barClass: 'bg-primary',
            },
            {
              value: inProd.length,
              label: 'In Production',
              sub: 'Active this week',
              tileClass: 'bg-primary text-primary-foreground',
              barClass: 'bg-primary-foreground/60',
            },
            {
              value: team.length,
              label: 'Team Active',
              sub: 'All hands on deck',
              tileClass: 'bg-card text-foreground',
              barClass: 'bg-primary',
            },
          ].map(m => (
            <div key={m.label} className="metric-card">
              <MetricCard {...m} />
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-4 lg:grid lg:grid-cols-3 lg:items-start lg:gap-6">
          <Card className="border border-border py-0 shadow-none lg:col-span-2 lg:col-start-1 lg:row-start-1">
            <CardContent className="py-5">
              <SectionTitle title="Needs Your Attention" count={attentionItems.length} />
              <div className="flex flex-col gap-2.5">
                {attentionItems.map(item => {
                  const client = item.client_id ? clientMap[item.client_id] : undefined
                  const t = CONTENT_TYPE_STYLE[item.type]
                  const late = isContentOverdue(item)
                  return (
                    <div
                      key={item.id}
                      className={cn(
                        'overflow-hidden rounded-xl transition-transform hover:-translate-y-0.5',
                        t.className,
                        late && 'border-danger'
                      )}
                    >
                      <div className="flex px-4 py-3">
                        <div className="flex flex-1 flex-col gap-1.5">
                          <p className="text-sm leading-5 font-bold">{item.title}</p>
                          <p className="text-xs opacity-80">{client?.name}</p>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Badge className="gap-1 border border-current/40 bg-transparent text-xs font-semibold text-current">
                              <TypeIcon name={t.icon} className="size-2.5" />
                              {t.label}
                            </Badge>
                            <StatusBadge status={late ? 'overdue' : item.status} />
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
                {attentionItems.length === 0 && (
                  <p className="py-2 text-sm text-muted-foreground">
                    All clear. Nothing needs attention.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border py-0 shadow-none lg:col-start-3 lg:row-start-1">
            <CardContent className="py-5">
              <SectionTitle title="Client Health" />
              <div className="flex flex-col gap-2.5">
                {clients.map(client => {
                  const hasOverdue = content.some(c => c.client_id === client.id && isContentOverdue(c))
                  const pendingCount = content.filter(c => c.client_id === client.id && needsClientAction(c.status)).length
                  const statusLabel = hasOverdue
                    ? 'At Risk'
                    : pendingCount > 2
                      ? 'Watch'
                      : 'On Track'
                  const statusClass = hasOverdue
                    ? 'bg-status-late text-status-late-fg'
                    : pendingCount > 2
                      ? DUE_SOON_STYLE.className
                      : 'bg-status-done text-status-done-fg'

                  return (
                    <div
                      key={client.id}
                      style={{ '--client-color': client.brand_color } as React.CSSProperties}
                      className="flex items-center gap-3 rounded-xl border border-border bg-secondary/40 p-3 transition-transform hover:-translate-y-0.5"
                    >
                      <div className="flex size-[42px] shrink-0 items-center justify-center rounded-xl bg-[var(--client-color)] text-xs font-extrabold text-white">
                        {client.initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-foreground">{client.name}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {client.content_quota} posts · {pendingCount} pending
                        </p>
                      </div>
                      <Badge className={cn('gap-1 text-xs font-bold', statusClass)}>
                        {hasOverdue ? <StatusIcon name="bang" className="size-2.5" /> : pendingCount > 2 ? <StatusIcon name="clock" className="size-2.5" /> : <StatusIcon name="check" className="size-2.5" />}
                        {statusLabel}
                      </Badge>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border py-0 shadow-none lg:col-span-2 lg:col-start-1 lg:row-start-2">
            <CardContent className="py-5">
              <SectionTitle title="Going Live Today" count={todayContent.length} />
              {todayContent.length === 0 ? (
                <p className="py-2 text-sm text-muted-foreground">Nothing scheduled for today.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {todayContent.map(item => {
                    const client = item.client_id ? clientMap[item.client_id] : undefined
                    const t = CONTENT_TYPE_STYLE[item.type]
                    return (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 rounded-xl border border-border bg-secondary/40 p-3"
                      >
                        <TypeIcon name={t.icon} className="size-3 text-primary" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-foreground">{item.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {client?.name} · {item.platforms?.join(', ')}
                          </p>
                        </div>
                        <StatusBadge status={item.status} />
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border border-border py-0 shadow-none lg:col-start-3 lg:row-start-2">
            <CardContent className="py-5">
              <SectionTitle title="Team Workload" />
              <div className="flex flex-col gap-4">
                {team.map(u => {
                  const pct = u.tasks_total > 0 ? Math.round((u.tasks_today / u.tasks_total) * 100) : 0
                  const indicatorClass =
                    pct >= 80 ? '[&_[data-slot=progress-indicator]]:bg-danger'
                    : pct >= 50 ? '[&_[data-slot=progress-indicator]]:bg-warning'
                    : '[&_[data-slot=progress-indicator]]:bg-success'

                  return (
                    <div key={u.id} className="flex items-center gap-3">
                      <UserAvatar userId={u.id} name={u.name} />
                      <div className="min-w-0 flex-1">
                        <div className="mb-1.5 flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-semibold text-foreground">{u.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {u.tasks_today}/{u.tasks_total}
                          </p>
                        </div>
                        <Progress value={pct} className={cn('gap-0', indicatorClass)} />
                      </div>
                      <p className="min-w-16 shrink-0 text-right text-xs text-muted-foreground capitalize">
                        {u.role}
                      </p>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>
       </div>
      </main>
    </div>
  )
}
