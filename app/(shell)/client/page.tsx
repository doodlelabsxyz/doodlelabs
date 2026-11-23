'use client'

import { useEffect, useRef, useState } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { FilterPill } from '@/components/ui/filter-pill'
import { StatusBadge } from '@/components/ui/status-badge'
import { TypeIcon } from '@/components/ui/type-icon'
import { UserAvatar } from '@/components/ui/user-avatar'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/supabase/useUser'
import { cn } from '@/lib/utils'
import { CONTENT_TYPE_STYLE } from '@/lib/color-map'
import { needsClientAction, type ContentStatus, type ContentType } from '@/lib/types'

gsap.registerPlugin(useGSAP)

type ClientRow = { id: string; name: string; initials: string; industry: string }
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

// Client-friendly wording only; colour/icon come from lib/color-map via <StatusBadge>.
const CLIENT_STATUS_LABEL: Record<string, string> = {
  'brief-ready': 'In progress',
  'in-design': 'In progress',
  'in-editing': 'In progress',
  'ready-for-review': 'Ready for review',
  'client-review': 'Awaiting your review',
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
          const { data: c } = await supabase.from('clients').select('id, name, initials, industry').eq('id', cu.client_id)
          if (c) setClients(c)
        }
      } else {
        const { data: c } = await supabase.from('clients').select('id, name, initials, industry').order('name')
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
        .from('content_pieces_client')
        .select('id, title, type, status, caption, scheduled_date, platforms, assigned_to, client_id')
        .eq('client_id', clientId)
        .order('scheduled_date'),
      // Plain `users` SELECT is locked to self+admin (protects salary/email/phone),
      // which silently returns nothing for a client account — go through the
      // safe org-wide name/role lookup instead. See get_org_users_safe().
      supabase.rpc('get_org_users_safe').neq('role', 'client'),
    ]).then(([contentRes, usersRes]) => {
      if (contentRes.data) setContent(contentRes.data)
      if (usersRes.data) setUsers(usersRes.data)
    })
  }, [clientId, supabase])

  const client = clients.find(c => c.id === clientId)
  const pendingApproval = content.filter(c => needsClientAction(c.status))
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
      <div className="bg-dark px-5 py-5 pb-4 text-dark-text md:px-8">
       <div className="mx-auto w-full max-w-4xl">
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
                  'shrink-0 border-dark-hover bg-dark-raised text-dark-muted hover:bg-dark-hover hover:text-dark-text',
                  clientId === c.id && 'border-mint bg-mint text-dark hover:bg-mint hover:text-dark'
                )}
              >
                {c.name}
              </Button>
            ))}
          </div>
        )}

        <div className="mb-4 flex items-center gap-3.5">
          <div
            className="flex size-[52px] shrink-0 items-center justify-center rounded-[14px] bg-mint text-base font-extrabold text-dark"
          >
            {client?.initials ?? '?'}
          </div>
          <div className="flex-1">
            <p className="mb-0.5 text-[0.6rem] uppercase tracking-[0.08em] text-dark-muted">Client Portal</p>
            <h1 className="text-[1.2rem] font-extrabold leading-none text-dark-text">{client?.name ?? '-'}</h1>
            <p className="mt-0.5 text-[0.68rem] text-dark-muted">{client?.industry ?? ''}</p>
          </div>
          {pendingApproval.length > 0 && (
            <div className="shrink-0 rounded-[10px] bg-mint px-3 py-1.5 text-center text-dark">
              <p className="text-[1.2rem] font-extrabold leading-none">{pendingApproval.length}</p>
              <p className="mt-px text-[0.58rem]">awaiting you</p>
            </div>
          )}
        </div>

        <div className="mb-4 grid grid-cols-4 gap-2">
          {[
            { n: content.length, label: 'This Month', color: 'text-mint' },
            { n: pendingApproval.length, label: 'Needs Review', color: 'text-mint' },
            { n: approved.length, label: 'Approved', color: 'text-mint' },
            { n: posted.length, label: 'Posted', color: 'text-mint' },
          ].map(stat => (
            <div key={stat.label} className="rounded-[10px] bg-dark-raised px-2 py-2 text-center">
              <p className={cn('text-[1.1rem] font-extrabold leading-none', stat.color)}>{stat.n}</p>
              <p className="mt-0.5 text-[0.56rem] text-dark-muted">{stat.label}</p>
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
                'shrink-0 border-dark-hover bg-dark-raised text-dark-muted hover:bg-dark-hover hover:text-dark-text',
                filter === item.key && 'border-mint bg-mint text-dark hover:bg-mint'
              )}
            >
              {item.label}
            </FilterPill>
          ))}
        </div>
       </div>
      </div>

      <div ref={containerRef} className="mx-auto w-full max-w-4xl flex-1 px-4 py-4 md:px-8 md:py-6">
        {filter === 'all' && pendingApproval.length > 0 && (
          <Card className="mb-3.5 border-primary bg-primary py-0 text-primary-foreground shadow-none md:mb-5">
            <CardContent className="flex items-center gap-2.5 px-3.5 py-3 md:px-5 md:py-4">
              <div className="size-2 shrink-0 rounded-full bg-primary-foreground" />
              <p className="flex-1 text-[0.82rem] font-bold">
                {pendingApproval.length} piece{pendingApproval.length > 1 ? 's' : ''} waiting for your approval
              </p>
              <Button
                size="sm"
                className="bg-primary-foreground font-bold text-primary hover:bg-primary-foreground/90"
                onClick={() => setFilter('pending')}
              >
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
          <div className="flex flex-col gap-2.5 md:grid md:grid-cols-2 md:items-start md:gap-4">
            {filtered.map(cp => {
              const ts = CONTENT_TYPE_STYLE[cp.type as ContentType] ?? CONTENT_TYPE_STYLE.graphic
              const isDone = cp.status === 'approved' || cp.status === 'scheduled' || cp.status === 'posted'
              const needsAction = needsClientAction(cp.status)
              const assignees = (cp.assigned_to ?? []).map(id => userMap.get(id)).filter(Boolean) as UserRow[]

              return (
                <Card
                  key={cp.id}
                  data-animate="portal-card"
                  onClick={() => needsAction && router.push(`/client/approval/${cp.id}`)}
                  className={cn(
                    'overflow-hidden py-0 transition-transform duration-150',
                    needsAction ? 'cursor-pointer border-primary shadow-sm hover:-translate-y-0.5' : isDone ? 'border-success/40 shadow-none' : 'shadow-none'
                  )}
                >
                  <CardContent className="px-3.5 py-3.5">
                    <div className="mb-2.5 flex items-start gap-2.5">
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex flex-wrap items-center gap-1.5">
                          <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-[3px] text-[0.65rem] font-semibold leading-none', ts.className)}>
                            <TypeIcon name={ts.icon} className="size-2.5" />
                            {ts.label}
                          </span>
                          <StatusBadge status={cp.status as ContentStatus}>
                            {CLIENT_STATUS_LABEL[cp.status]}
                          </StatusBadge>
                        </div>
                        <p className="text-[0.9rem] font-extrabold leading-[1.3] text-foreground">{cp.title}</p>
                      </div>
                      {needsAction && (
                        <div className="shrink-0 rounded-[10px] bg-primary px-2.5 py-1 text-[0.65rem] font-bold text-primary-foreground">
                          Review {'->'}
                        </div>
                      )}
                    </div>

                    {cp.caption && (
                      <p className="mb-2.5 line-clamp-2 rounded-lg bg-wash px-2 py-2 text-[0.72rem] leading-[1.5] text-muted-foreground">
                        {cp.caption}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[0.68rem] font-semibold text-muted-foreground">
                        📅 {formatDate(cp.scheduled_date)}
                      </span>

                      <div className="ml-auto flex gap-1">
                        {(cp.platforms ?? []).map(p => (
                          <span key={p} className="rounded px-1.5 py-0.5 text-[0.58rem] font-bold text-muted-foreground bg-wash">
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
