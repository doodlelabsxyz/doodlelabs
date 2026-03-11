'use client'

import { useEffect, useState, useRef } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { UserAvatar } from '@/components/ui/user-avatar'
import { TopBar } from '@/components/shell/TopBar'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import type { ContentType, ContentStatus } from '@/lib/types'

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

const TYPE: Record<ContentType, { label: string; badgeClass: string; surfaceClass: string }> = {
  graphic: {
    label: 'Graphic',
    badgeClass: 'bg-white/20 text-white',
    surfaceClass: 'bg-coral',
  },
  video: {
    label: 'Video',
    badgeClass: 'bg-white/20 text-white',
    surfaceClass: 'bg-lemon',
  },
  reel: {
    label: 'Reel',
    badgeClass: 'bg-white/20 text-white',
    surfaceClass: 'bg-mint',
  },
  story: {
    label: 'Story',
    badgeClass: 'bg-white/20 text-white',
    surfaceClass: 'bg-lavender',
  },
}

const STATUS: Record<ContentStatus, { label: string; badgeClass: string }> = {
  planned: { label: 'Planned', badgeClass: 'bg-secondary text-muted-foreground' },
  'brief-ready': { label: 'Brief Ready', badgeClass: 'bg-sky/15 text-sky' },
  'in-design': { label: 'In Design', badgeClass: 'bg-coral/15 text-coral' },
  'in-editing': { label: 'In Editing', badgeClass: 'bg-lemon/20 text-amber-700' },
  'ready-for-review': { label: 'Needs Review', badgeClass: 'bg-sky/20 text-sky' },
  'client-review': { label: 'Client Review', badgeClass: 'bg-lavender/15 text-lavender' },
  approved: { label: 'Approved', badgeClass: 'bg-success/15 text-success' },
  scheduled: { label: 'Scheduled', badgeClass: 'bg-success/20 text-success' },
  posted: { label: 'Posted', badgeClass: 'bg-success/20 text-success' },
  overdue: { label: 'Overdue', badgeClass: 'bg-danger/15 text-danger' },
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
  content_this_month: number
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
  accentClass,
}: {
  value: number
  label: string
  sub: string
  accentClass: string
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
    <Card className="h-full min-w-0 gap-0 border border-border py-0 shadow-none transition-all hover:-translate-y-1 hover:shadow-md">
      <CardContent className="flex min-h-[120px] flex-col justify-between py-5">
        <div className={cn('mb-3 h-1 w-8 rounded-full', accentClass)} />
        <div>
          <p className={cn('text-[42px] leading-none font-extrabold tracking-[-0.04em]', accentClass.replace('bg-', 'text-'))}>
            <span ref={numRef}>0</span>
          </p>
          <p className="mt-1.5 text-sm font-bold text-foreground">{label}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>
        </div>
      </CardContent>
    </Card>
  )
}

export default function DashboardPage() {
  const [userName, setUserName] = useState('...')
  const [mounted, setMounted] = useState(false)
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
      if (!user) return

      const [profileRes, contentRes, clientsRes, usersRes, notifRes] = await Promise.all([
        supabase.from('users').select('name').eq('id', user.id).single(),
        supabase
          .from('content_pieces')
          .select('id, title, type, status, scheduled_date, platforms, client_id'),
        supabase
          .from('clients')
          .select('id, name, initials, brand_color, content_this_month, pending_approvals'),
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

  if (!mounted) return null

  const todayStr = new Date().toISOString().split('T')[0]
  const todayContent = content.filter(c => c.scheduled_date === todayStr)
  const overdueItems = content.filter(c => c.status === 'overdue')
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
            <span className="text-coral">{userName}!</span>
          </h1>
        </div>
      </div>

      <div className="md:hidden">
        <TopBar greeting={getGreeting()} userName={userName} notifCount={unread} showClientSwitcher />
      </div>

      <main className="page-main flex-1 overflow-y-auto p-4 pb-[100px]">
        <div
          ref={metricsRef}
          className="mb-4 grid grid-cols-2 gap-3"
        >
          {[
            {
              value: needsReview.length + overdueItems.length,
              label: 'Needs Action',
              sub: 'Review or fix now',
              accentClass: 'bg-coral',
            },
            {
              value: todayContent.length,
              label: 'Live Today',
              sub: 'Posts scheduled',
              accentClass: 'bg-mint',
            },
            {
              value: inProd.length,
              label: 'In Production',
              sub: 'Active this week',
              accentClass: 'bg-sky',
            },
            {
              value: team.length,
              label: 'Team Active',
              sub: 'All hands on deck',
              accentClass: 'bg-lavender',
            },
          ].map(m => (
            <div key={m.label} className="metric-card">
              <MetricCard {...m} />
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-4">
          <Card className="border border-border py-0 shadow-none">
            <CardContent className="py-5">
              <SectionTitle title="Needs Your Attention" count={attentionItems.length} />
              <div className="flex flex-col gap-2.5">
                {attentionItems.map(item => {
                  const client = item.client_id ? clientMap[item.client_id] : undefined
                  const t = TYPE[item.type]
                  const s = STATUS[item.status]
                  return (
                    <div
                      key={item.id}
                      className={cn(
                        'overflow-hidden rounded-xl transition-transform hover:-translate-y-0.5',
                        t.surfaceClass
                      )}
                    >
                      <div className="flex px-4 py-3">
                        <div className="flex flex-1 flex-col gap-1.5">
                          <p className="text-sm leading-5 font-bold text-white/95">{item.title}</p>
                          <p className="text-xs text-white/65">{client?.name}</p>
                          <div className="flex flex-wrap gap-1.5">
                            <Badge className={cn('border-0 text-xs font-semibold', t.badgeClass)}>
                              {t.label}
                            </Badge>
                            <Badge className="border-0 bg-black/15 text-xs font-semibold text-white/85">
                              {s.label}
                            </Badge>
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

          <Card className="border border-border py-0 shadow-none">
            <CardContent className="py-5">
              <SectionTitle title="Client Health" />
              <div className="flex flex-col gap-2.5">
                {clients.map(client => {
                  const hasOverdue = content.some(c => c.client_id === client.id && c.status === 'overdue')
                  const statusLabel = hasOverdue
                    ? 'At Risk'
                    : client.pending_approvals > 2
                      ? 'Watch'
                      : 'On Track'
                  const statusClass = hasOverdue
                    ? 'bg-danger/10 text-danger'
                    : client.pending_approvals > 2
                      ? 'bg-warning/15 text-warning'
                      : 'bg-success/15 text-success'

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
                          {client.content_this_month} posts · {client.pending_approvals} pending
                        </p>
                      </div>
                      <Badge className={cn('border-0 text-xs font-bold', statusClass)}>
                        {statusLabel}
                      </Badge>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border py-0 shadow-none">
            <CardContent className="py-5">
              <SectionTitle title="Going Live Today" count={todayContent.length} />
              {todayContent.length === 0 ? (
                <p className="py-2 text-sm text-muted-foreground">Nothing scheduled for today.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {todayContent.map(item => {
                    const client = item.client_id ? clientMap[item.client_id] : undefined
                    const t = TYPE[item.type]
                    const s = STATUS[item.status]
                    return (
                      <div
                        key={item.id}
                        className={cn(
                          'flex items-center gap-3 rounded-xl border p-3',
                          item.type === 'graphic' && 'border-coral/30 bg-coral/10',
                          item.type === 'video' && 'border-lemon/30 bg-lemon/10',
                          item.type === 'reel' && 'border-mint/30 bg-mint/10',
                          item.type === 'story' && 'border-lavender/30 bg-lavender/10'
                        )}
                      >
                        <div className={cn('size-2.5 shrink-0 rounded-full', t.surfaceClass)} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-foreground">{item.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {client?.name} · {item.platforms?.join(', ')}
                          </p>
                        </div>
                        <Badge className={cn('border-0 text-xs font-semibold', s.badgeClass)}>
                          {s.label}
                        </Badge>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border border-border py-0 shadow-none">
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
      </main>
    </div>
  )
}
