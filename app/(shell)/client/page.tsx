'use client'

import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { useRouter } from 'next/navigation'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { FilterPill } from '@/components/ui/filter-pill'
import { UserAvatar } from '@/components/ui/user-avatar'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/supabase/useUser'
import { cn } from '@/lib/utils'
import type { ContentStatus } from '@/lib/types'

gsap.registerPlugin(useGSAP)

type ClientRow = { id: string; name: string; initials: string; brand_color: string; industry: string }
type ContentRow = {
  id: string
  title: string
  type: string
  status: string
  caption: string | null
  scheduled_date: string
  platforms: string[]
  assigned_to: string[]
  client_id: string
}
type UserRow = { id: string; name: string }

const TYPE_CFG = {
  graphic: { label: 'Graphic', color: 'hsl(14 72% 62%)', chipClass: 'border-coral/25 bg-coral/10 text-coral' },
  video: { label: 'Video', color: 'hsl(40 95% 52%)', chipClass: 'border-lemon/30 bg-lemon/15 text-foreground' },
  reel: { label: 'Reel', color: 'hsl(161 58% 44%)', chipClass: 'border-mint/25 bg-mint/10 text-mint' },
  story: { label: 'Story', color: 'hsl(268 60% 68%)', chipClass: 'border-lavender/25 bg-lavender/10 text-lavender' },
}

const STATUS_CFG: Record<ContentStatus, { label: string; chipClass: string }> = {
  planned: { label: 'Planned', chipClass: 'border-sky/20 bg-sky-tint text-sky' },
  'brief-ready': { label: 'In Progress', chipClass: 'border-sky/20 bg-sky-tint text-sky' },
  'in-design': { label: 'In Progress', chipClass: 'border-sky/20 bg-sky-tint text-sky' },
  'in-editing': { label: 'In Progress', chipClass: 'border-sky/20 bg-sky-tint text-sky' },
  'ready-for-review': { label: 'Ready for Review', chipClass: 'border-lemon/25 bg-lemon/10 text-lemon' },
  'client-review': { label: 'Awaiting Your Review', chipClass: 'border-coral/25 bg-coral/10 text-coral' },
  approved: { label: 'Approved', chipClass: 'border-success/20 bg-success/10 text-success' },
  scheduled: { label: 'Scheduled', chipClass: 'border-success/20 bg-success/10 text-success' },
  posted: { label: 'Posted', chipClass: 'border-mint/20 bg-mint/10 text-mint' },
  overdue: { label: 'Overdue', chipClass: 'border-danger/20 bg-danger/10 text-danger' },
}

const PLATFORM_ICONS: Record<string, string> = {
  instagram: 'IG',
  tiktok: 'TT',
  facebook: 'FB',
  linkedin: 'LI',
}

function formatDate(s: string) {
  const d = new Date(`${s}T00:00:00`)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  if (diff === -1) return 'Yesterday'
  if (diff > 0 && diff < 7) return `In ${diff} days`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function brandStyle(color?: string): CSSProperties | undefined {
  return color ? ({ '--brand-color': color } as CSSProperties) : undefined
}

export default function ClientPortalPage() {
  const router = useRouter()
  const supabase = createClient()
  const { user } = useUser()
  const containerRef = useRef<HTMLDivElement>(null)

  const [clients, setClients] = useState<ClientRow[]>([])
  const [clientId, setClientId] = useState('')
  const [content, setContent] = useState<ContentRow[]>([])
  const [users, setUsers] = useState<UserRow[]>([])
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'posted'>('all')

  useEffect(() => {
    if (!user) return
    const currentUser = user

    async function init() {
      if (currentUser.role === 'client') {
        const { data: cu } = await supabase.from('client_users').select('client_id').eq('user_id', currentUser.id).single()
        if (cu?.client_id) {
          setClientId(cu.client_id)
          const { data: c } = await supabase.from('clients').select('id, name, initials, brand_color, industry').eq('id', cu.client_id)
          if (c) setClients(c)
        }
      } else {
        const { data: c } = await supabase.from('clients').select('id, name, initials, brand_color, industry').order('name')
        if (c) {
          setClients(c)
          const stored = sessionStorage.getItem('clientId')
          setClientId(stored && c.find(x => x.id === stored) ? stored : (c[0]?.id ?? ''))
        }
      }
    }

    init()
  }, [supabase, user])

  useEffect(() => {
    if (!clientId) return
    Promise.all([
      supabase
        .from('content_pieces')
        .select('id, title, type, status, caption, scheduled_date, platforms, assigned_to, client_id')
        .eq('client_id', clientId)
        .order('scheduled_date'),
      supabase.from('users').select('id, name').neq('role', 'client'),
    ]).then(([contentRes, usersRes]) => {
      if (contentRes.data) setContent(contentRes.data)
      if (usersRes.data) setUsers(usersRes.data)
    })
  }, [clientId, supabase])

  const client = clients.find(c => c.id === clientId)
  const pendingApproval = content.filter(c => c.status === 'client-review' || c.status === 'ready-for-review')
  const approved = content.filter(c => c.status === 'approved' || c.status === 'scheduled')
  const posted = content.filter(c => c.status === 'posted')

  const filtered =
    filter === 'pending' ? pendingApproval :
    filter === 'approved' ? approved :
    filter === 'posted' ? posted :
    content

  useGSAP(
    () => {
      if (!containerRef.current) return
      gsap.fromTo(
        '[data-animate="portal-card"]',
        { y: 18, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.35, stagger: 0.07, ease: 'back.out(1.2)', clearProps: 'all' }
      )
    },
    { dependencies: [filter, clientId, filtered.length], scope: containerRef }
  )

  const userMap = new Map(users.map(u => [u.id, u]))

  return (
    <main className="page-main flex min-w-0 flex-1 flex-col overflow-y-auto bg-background">
      <div className="bg-foreground px-5 py-5 pb-4 text-background">
        {user?.role !== 'client' && clients.length > 1 && (
          <div className="mb-4 flex gap-1.5 overflow-x-auto pb-0.5">
            {clients.map(c => (
              <Button
                key={c.id}
                variant="outline"
                size="sm"
                onClick={() => {
                  setClientId(c.id)
                  sessionStorage.setItem('clientId', c.id)
                }}
                className={cn(
                  'shrink-0 border-white/10 bg-white/5 text-background/70 hover:bg-white/10 hover:text-background',
                  clientId === c.id && 'border-[var(--brand-color)] bg-[var(--brand-color)] text-white hover:bg-[var(--brand-color)] hover:text-white'
                )}
                style={clientId === c.id ? brandStyle(c.brand_color) : undefined}
              >
                {c.name}
              </Button>
            ))}
          </div>
        )}

        <div className="mb-4 flex items-center gap-3.5">
          <div
            className="flex size-[52px] shrink-0 items-center justify-center rounded-[14px] bg-[var(--brand-color)] text-base font-extrabold text-white"
            style={brandStyle(client?.brand_color ?? 'hsl(25 82% 60%)')}
          >
            {client?.initials ?? '?'}
          </div>
          <div className="flex-1">
            <p className="mb-0.5 text-[0.6rem] uppercase tracking-[0.08em] text-background/50">Client Portal</p>
            <h1 className="text-[1.2rem] font-extrabold leading-none text-background">{client?.name ?? '-'}</h1>
            <p className="mt-0.5 text-[0.68rem] text-background/50">{client?.industry ?? ''}</p>
          </div>
          {pendingApproval.length > 0 && (
            <div className="shrink-0 rounded-[10px] bg-coral px-3 py-1.5 text-center text-white">
              <p className="text-[1.2rem] font-extrabold leading-none">{pendingApproval.length}</p>
              <p className="mt-px text-[0.58rem]">awaiting you</p>
            </div>
          )}
        </div>

        <div className="mb-4 grid grid-cols-4 gap-2">
          {[
            { n: content.length, label: 'This Month', color: 'text-sky' },
            { n: pendingApproval.length, label: 'Needs Review', color: 'text-coral' },
            { n: approved.length, label: 'Approved', color: 'text-success' },
            { n: posted.length, label: 'Posted', color: 'text-mint' },
          ].map(stat => (
            <div key={stat.label} className="rounded-[10px] bg-white/5 px-2 py-2 text-center">
              <p className={cn('text-[1.1rem] font-extrabold leading-none', stat.color)}>{stat.n}</p>
              <p className="mt-0.5 text-[0.56rem] text-background/45">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-0.5">
          {([
            { key: 'all', label: 'All Content' },
            { key: 'pending', label: `Review (${pendingApproval.length})` },
            { key: 'approved', label: 'Approved' },
            { key: 'posted', label: 'Posted' },
          ] as const).map(item => (
            <FilterPill
              key={item.key}
              active={filter === item.key}
              onClick={() => setFilter(item.key)}
              className={cn(
                'shrink-0 border-white/10 bg-white/5 text-background/65 hover:bg-white/10 hover:text-background',
                filter === item.key && 'border-[var(--brand-color)] bg-[var(--brand-color)] text-white hover:bg-[var(--brand-color)]'
              )}
              style={filter === item.key ? brandStyle(client?.brand_color ?? 'hsl(25 82% 60%)') : undefined}
            >
              {item.label}
            </FilterPill>
          ))}
        </div>
      </div>

      <div ref={containerRef} className="flex-1 px-4 py-4">
        {filter === 'all' && pendingApproval.length > 0 && (
          <Card className="mb-3.5 border-coral/25 bg-coral/5 py-0 shadow-none">
            <CardContent className="flex items-center gap-2.5 px-3.5 py-3">
              <div className="size-2 shrink-0 rounded-full bg-coral" />
              <p className="flex-1 text-[0.78rem] font-semibold text-coral/90">
                {pendingApproval.length} piece{pendingApproval.length > 1 ? 's' : ''} waiting for your approval
              </p>
              <Button size="sm" className="bg-coral text-white hover:bg-coral/85" onClick={() => setFilter('pending')}>
                Review
              </Button>
            </CardContent>
          </Card>
        )}

        {filtered.length === 0 ? (
          <EmptyState
            icon="📝"
            title="Nothing here yet"
            body="Content will appear once your agency team creates it."
            className="border-border bg-card py-12"
          />
        ) : (
          <div className="flex flex-col gap-2.5">
            {filtered.map(cp => {
              const tc = TYPE_CFG[cp.type as keyof typeof TYPE_CFG] ?? TYPE_CFG.graphic
              const sc = STATUS_CFG[cp.status as ContentStatus] ?? STATUS_CFG.planned
              const needsAction = cp.status === 'client-review' || cp.status === 'ready-for-review'
              const assignees = (cp.assigned_to ?? []).map(id => userMap.get(id)).filter(Boolean) as UserRow[]

              return (
                <Card
                  key={cp.id}
                  data-animate="portal-card"
                  onClick={() => needsAction && router.push(`/client/approval/${cp.id}`)}
                  className={cn(
                    'overflow-hidden py-0 transition-transform duration-150',
                    needsAction ? 'cursor-pointer border-coral/40 shadow-sm hover:-translate-y-0.5' : 'shadow-none'
                  )}
                >
                  <div className="h-1 bg-[var(--type-color)]" style={{ '--type-color': tc.color } as CSSProperties} />
                  <CardContent className="px-3.5 py-3.5">
                    <div className="mb-2.5 flex items-start gap-2.5">
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex flex-wrap items-center gap-1.5">
                          <Badge variant="outline" className={tc.chipClass}>
                            {tc.label}
                          </Badge>
                          <Badge variant="outline" className={sc.chipClass}>
                            {sc.label}
                          </Badge>
                        </div>
                        <p className="text-[0.9rem] font-extrabold leading-[1.3] text-foreground">{cp.title}</p>
                      </div>
                      {needsAction && (
                        <div className="shrink-0 rounded-[10px] bg-coral px-2.5 py-1 text-[0.65rem] font-bold text-white">
                          Review {'->'}
                        </div>
                      )}
                    </div>

                    {cp.caption && (
                      <p className="mb-2.5 line-clamp-2 rounded-lg bg-background px-2 py-2 text-[0.72rem] leading-[1.5] text-muted-foreground">
                        {cp.caption}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[0.68rem] font-semibold text-muted-foreground">
                        📅 {formatDate(cp.scheduled_date)}
                      </span>

                      <div className="ml-auto flex gap-1">
                        {(cp.platforms ?? []).map(p => (
                          <span key={p} className="rounded px-1.5 py-0.5 text-[0.58rem] font-bold text-muted-foreground bg-muted">
                            {PLATFORM_ICONS[p] ?? p}
                          </span>
                        ))}
                      </div>

                      {assignees.length > 0 && (
                        <div className="ml-1 flex">
                          {assignees.map((u, i) => (
                            <div key={u.id} className={cn(i > 0 && '-ml-1.5')}>
                              <UserAvatar userId={u.id} name={u.name} size="sm" className="border-2 border-card" />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
