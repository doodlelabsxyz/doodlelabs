'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { useRouter } from 'next/navigation'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/supabase/useUser'

gsap.registerPlugin(useGSAP)

type NotifType =
  | 'task-assigned'
  | 'task-overdue'
  | 'approval-needed'
  | 'client-note'
  | 'plan-reminder'
  | 'content-approved'

const TYPE_CFG: Record<
  NotifType,
  {
    icon: string
    label: string
    accentClass: string
    iconClass: string
    badgeClass: string
    readBorderClass: string
    unreadBorderClass: string
  }
> = {
  'task-assigned': {
    icon: '📋',
    label: 'Assigned',
    accentClass: 'text-primary',
    iconClass: 'bg-wash text-primary',
    badgeClass: 'bg-wash text-primary',
    readBorderClass: 'border-border',
    unreadBorderClass: 'border-primary/30',
  },
  'task-overdue': {
    icon: '⚠️',
    label: 'Overdue',
    accentClass: 'text-danger',
    iconClass: 'bg-status-late text-status-late-fg',
    badgeClass: 'bg-status-late text-status-late-fg',
    readBorderClass: 'border-border',
    unreadBorderClass: 'border-danger/30',
  },
  'approval-needed': {
    icon: '👀',
    label: 'Review',
    accentClass: 'text-primary',
    iconClass: 'bg-wash text-primary',
    badgeClass: 'bg-wash text-primary',
    readBorderClass: 'border-border',
    unreadBorderClass: 'border-primary/30',
  },
  'client-note': {
    icon: '💬',
    label: 'Client',
    accentClass: 'text-muted-foreground',
    iconClass: 'bg-sage text-foreground',
    badgeClass: 'bg-sage text-foreground',
    readBorderClass: 'border-border',
    unreadBorderClass: 'border-border',
  },
  'plan-reminder': {
    icon: '🗓',
    label: 'Reminder',
    accentClass: 'text-primary',
    iconClass: 'bg-sage text-foreground',
    badgeClass: 'bg-sage text-foreground',
    readBorderClass: 'border-border',
    unreadBorderClass: 'border-primary/30',
  },
  'content-approved': {
    icon: '✅',
    label: 'Approved',
    accentClass: 'text-success',
    iconClass: 'bg-status-done text-status-done-fg',
    badgeClass: 'bg-status-done text-status-done-fg',
    readBorderClass: 'border-border',
    unreadBorderClass: 'border-success/30',
  },
}

type NotifRow = {
  id: string
  type: NotifType
  title: string
  body: string
  read: boolean
  created_at: string
  content_id: string | null
  for_roles: string[]
  for_user_id: string | null
}

function timeAgo(s: string): string {
  const d = new Date(s)
  const now = new Date()
  const diff = Math.round(
    (new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() -
      new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()) /
      86400000
  )
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  if (diff < 7) return `${diff}d ago`
  return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function FilterChip({
  active,
  highlight,
  children,
  onClick,
}: {
  active: boolean
  highlight?: boolean
  children: React.ReactNode
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap transition-colors',
        active && highlight && 'bg-danger text-danger-foreground',
        active && !highlight && 'bg-mint text-dark',
        !active && highlight && 'bg-white/7 text-danger',
        !active && !highlight && 'bg-white/7 text-dark-muted'
      )}
    >
      {children}
    </button>
  )
}

export default function NotificationsPage() {
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)
  useUser()

  const [notifs, setNotifs] = useState<NotifRow[]>([])
  const [filter, setFilter] = useState<'all' | 'unread' | NotifType>('all')
  const [mounted, setMounted] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function showToast(msg: string) {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast(msg)
    toastTimer.current = setTimeout(() => setToast(null), 3500)
  }

  useEffect(() => {
    const supabase = createClient()

    async function load() {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) console.error('notifications load failed', error)
      setNotifs(data || [])
      setMounted(true)
    }
    load()

    const channel = supabase
      .channel('notif-page')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, payload => {
        const n = payload.new as NotifRow
        setNotifs(prev => [n, ...prev])
        showToast(n.title)
      })
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [])

  useGSAP(() => {
    if (!mounted || !containerRef.current) return
    gsap.fromTo(
      '[data-animate="notif-item"]',
      { x: -12, opacity: 0 },
      { x: 0, opacity: 1, duration: 0.3, stagger: 0.05, ease: 'power2.out', clearProps: 'all' }
    )
  }, { dependencies: [mounted, filter], scope: containerRef })

  const markRead = useCallback(async (id: string) => {
    setNotifs(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)))
    const supabase = createClient()
    const { error } = await supabase.from('notifications').update({ read: true }).eq('id', id)
    if (error) setNotifs(prev => prev.map(n => (n.id === id ? { ...n, read: false } : n)))
  }, [])

  const markAllRead = useCallback(async () => {
    setNotifs(prev => prev.map(n => ({ ...n, read: true })))
    const supabase = createClient()
    await supabase.from('notifications').update({ read: true }).eq('read', false)
  }, [])

  if (!mounted) {
    return (
      <main aria-busy="true" aria-label="Loading notifications" className="page-main relative flex min-w-0 flex-1 flex-col overflow-y-auto">
        <section className="bg-dark px-5 pt-[18px] pb-4">
          <Skeleton className="mb-2 h-2.5 w-14 bg-white/10" />
          <Skeleton className="h-5 w-32 bg-white/10" />
        </section>
        <div className="space-y-3 p-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      </main>
    )
  }

  const unreadCount = notifs.filter(n => !n.read).length

  const displayed = notifs.filter(n => {
    if (filter === 'unread') return !n.read
    if (filter !== 'all') return n.type === filter
    return true
  })

  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  const todayStr = today.toDateString()
  const yesterdayStr = yesterday.toDateString()
  const groups: { label: string; items: NotifRow[] }[] = [
    { label: 'Today', items: displayed.filter(n => new Date(n.created_at).toDateString() === todayStr) },
    { label: 'Yesterday', items: displayed.filter(n => new Date(n.created_at).toDateString() === yesterdayStr) },
    {
      label: 'Earlier',
      items: displayed.filter(n => {
        const date = new Date(n.created_at).toDateString()
        return date !== todayStr && date !== yesterdayStr
      }),
    },
  ].filter(g => g.items.length > 0)

  const filterTypes: (NotifType | 'all' | 'unread')[] = [
    'all',
    'unread',
    'task-assigned',
    'task-overdue',
    'approval-needed',
    'client-note',
    'plan-reminder',
    'content-approved',
  ]

  return (
    <main className="page-main relative flex min-w-0 flex-1 flex-col overflow-y-auto">
      {toast && (
        <div className="fixed top-4 left-1/2 z-[999] flex -translate-x-1/2 items-center gap-2 rounded-full bg-dark px-4 py-2 text-sm font-semibold text-dark-text shadow-lg">
          <span className="inline-block size-2 rounded-full bg-mint" />
          {toast}
        </div>
      )}

      <section className="border-b border-white/4 bg-dark px-5 pt-[18px] pb-[14px]">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex-1">
            <p className="mb-px text-2xs uppercase tracking-[0.08em] text-dark-muted">Inbox</p>
            <h1 className="text-md font-extrabold leading-none text-dark-text">Notifications</h1>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={markAllRead}
              className="rounded-full border-white/12 bg-transparent text-dark-text hover:bg-white/6 hover:text-dark-text"
            >
              Mark all read
            </Button>
          )}
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-0.5">
          {filterTypes.map(f => {
            const isUnread = f === 'unread'
            const label = f === 'all' ? 'All' : isUnread ? `Unread (${unreadCount})` : TYPE_CFG[f as NotifType]?.label || f
            return (
              <FilterChip
                key={f}
                active={filter === f}
                highlight={isUnread && unreadCount > 0}
                onClick={() => setFilter(f as typeof filter)}
              >
                {label}
              </FilterChip>
            )
          })}
        </div>
      </section>

      <div ref={containerRef} className="flex flex-1 flex-col gap-5 p-4">
        {groups.length === 0 ? (
          <Card className="border border-dashed border-border bg-card shadow-none">
            <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
              <div className="flex size-16 items-center justify-center rounded-lg border border-dashed border-border bg-secondary text-2xl">
                🔔
              </div>
              <p className="text-sm font-semibold text-muted-foreground">All caught up</p>
            </CardContent>
          </Card>
        ) : (
          groups.map(group => (
            <section key={group.label} className="flex flex-col gap-2">
              <p className="pl-0.5 text-xs font-bold uppercase tracking-[0.06em] text-muted-foreground">
                {group.label}
              </p>
              <div className="flex flex-col gap-2">
                {group.items.map(n => {
                  const cfg = TYPE_CFG[n.type]
                  const clickable = Boolean(n.content_id)

                  return (
                    <Card
                      key={n.id}
                      data-animate="notif-item"
                      className={cn(
                        'group shadow-none transition-all hover:-translate-y-px hover:shadow-sm',
                        n.read ? 'bg-card' : 'bg-background',
                        n.read ? cfg.readBorderClass : cfg.unreadBorderClass
                      )}
                    >
                      <CardContent className="flex items-start gap-3 py-4">
                        <div className={cn('flex size-9 shrink-0 items-center justify-center rounded-[10px] text-base', cfg.iconClass)}>
                          {cfg.icon}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="mb-1 flex items-start justify-between gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                if (n.content_id) router.push(`/brief/${n.content_id}`)
                              }}
                              className={cn(
                                'min-w-0 text-left text-sm leading-[1.3] text-foreground',
                                n.read ? 'font-semibold' : 'font-bold',
                                clickable && 'cursor-pointer hover:text-primary'
                              )}
                            >
                              {n.title}
                            </button>
                            {!n.read && (
                              <Button
                                variant="outline"
                                size="icon-xs"
                                onClick={e => {
                                  e.stopPropagation()
                                  markRead(n.id)
                                }}
                                title="Mark as read"
                                className={cn('rounded-full bg-transparent', cfg.accentClass)}
                              >
                                ✓
                              </Button>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              if (n.content_id) router.push(`/brief/${n.content_id}`)
                            }}
                            className={cn(
                              'mb-1.5 block text-left text-xs leading-5 text-muted-foreground',
                              clickable && 'cursor-pointer hover:text-foreground'
                            )}
                          >
                            {n.body}
                          </button>

                          <div className="flex items-center gap-2">
                            <Badge className={cn('border-0 text-[0.62rem] font-bold', cfg.badgeClass)}>
                              {cfg.label}
                            </Badge>
                            <span className="text-2xs text-ghost">{timeAgo(n.created_at)}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </section>
          ))
        )}
      </div>
    </main>
  )
}
