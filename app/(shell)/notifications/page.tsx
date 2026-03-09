'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/supabase/useUser'
import type { Role } from '@/lib/types'

gsap.registerPlugin(useGSAP)

type NotifType = 'task-assigned' | 'task-overdue' | 'approval-needed' | 'client-note' | 'plan-reminder' | 'content-approved'

const TYPE_CFG: Record<NotifType, { icon: string; color: string; bg: string; label: string }> = {
  'task-assigned':    { icon: '📋', color: 'hsl(200,82%,48%)', bg: 'hsl(200,82%,93%)', label: 'Assigned' },
  'task-overdue':     { icon: '⚠️', color: 'hsl(4,72%,50%)',   bg: 'hsl(4,72%,93%)',   label: 'Overdue'  },
  'approval-needed':  { icon: '👀', color: 'hsl(25,82%,52%)',  bg: 'hsl(25,82%,93%)',  label: 'Review'   },
  'client-note':      { icon: '💬', color: 'hsl(268,60%,60%)', bg: 'hsl(268,60%,93%)', label: 'Client'   },
  'plan-reminder':    { icon: '📅', color: 'hsl(161,58%,40%)', bg: 'hsl(161,58%,92%)', label: 'Reminder' },
  'content-approved': { icon: '✅', color: 'hsl(154,55%,38%)', bg: 'hsl(154,55%,90%)', label: 'Approved' },
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
  const diff = Math.round((Date.now() - new Date(s).getTime()) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  if (diff < 7) return `${diff}d ago`
  return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function NotificationsPage() {
  const router       = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)
  const { user }     = useUser()

  const [notifs,   setNotifs]   = useState<NotifRow[]>([])
  const [filter,   setFilter]   = useState<'all' | 'unread' | NotifType>('all')
  const [mounted,  setMounted]  = useState(false)
  const [toast,    setToast]    = useState<string | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function showToast(msg: string) {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast(msg)
    toastTimer.current = setTimeout(() => setToast(null), 3500)
  }

  useEffect(() => {
    const supabase = createClient()

    async function load() {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
      setNotifs(data || [])
      setMounted(true)
    }
    load()

    // Realtime: prepend new notifications as they arrive
    const channel = supabase
      .channel('notif-page')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload) => {
        const n = payload.new as NotifRow
        setNotifs(prev => [n, ...prev])
        showToast(n.title)
      })
      .subscribe()

    return () => { channel.unsubscribe() }
  }, [])

  useGSAP(() => {
    if (!mounted || !containerRef.current) return
    gsap.fromTo('.notif-item',
      { x: -12, opacity: 0 },
      { x: 0, opacity: 1, duration: 0.3, stagger: 0.05, ease: 'power2.out', clearProps: 'all' }
    )
  }, { dependencies: [mounted, filter], scope: containerRef })

  const markRead = useCallback(async (id: string) => {
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    const supabase = createClient()
    await supabase.from('notifications').update({ read: true }).eq('id', id)
  }, [])

  const markAllRead = useCallback(async () => {
    setNotifs(prev => prev.map(n => ({ ...n, read: true })))
    const supabase = createClient()
    await supabase.from('notifications').update({ read: true }).eq('read', false)
  }, [])

  if (!mounted) return null

  const unreadCount = notifs.filter(n => !n.read).length

  const displayed = notifs.filter(n => {
    if (filter === 'unread') return !n.read
    if (filter !== 'all') return n.type === filter
    return true
  })

  // Group by date
  const todayStr     = new Date().toDateString()
  const yesterdayStr = new Date(Date.now() - 86400000).toDateString()
  const groups: { label: string; items: NotifRow[] }[] = [
    { label: 'Today',     items: displayed.filter(n => new Date(n.created_at).toDateString() === todayStr) },
    { label: 'Yesterday', items: displayed.filter(n => new Date(n.created_at).toDateString() === yesterdayStr) },
    { label: 'Earlier',   items: displayed.filter(n => new Date(n.created_at).toDateString() !== todayStr && new Date(n.created_at).toDateString() !== yesterdayStr) },
  ].filter(g => g.items.length > 0)

  const filterTypes: (NotifType | 'all' | 'unread')[] = ['all', 'unread', 'task-assigned', 'task-overdue', 'approval-needed', 'client-note', 'plan-reminder', 'content-approved']

  return (
    <main className="page-main" style={{ flex: 1, minWidth: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', position: 'relative' }}>

      {/* Live toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)',
          zIndex: 999, background: '#0F1A14', color: 'hsl(42,22%,88%)',
          padding: '10px 18px', borderRadius: '9999px', fontSize: '0.8rem', fontWeight: 600,
          boxShadow: '0 4px 20px rgba(15,26,20,0.4)', whiteSpace: 'nowrap',
          display: 'flex', alignItems: 'center', gap: '8px',
        }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'hsl(25,82%,60%)', display: 'inline-block' }} />
          {toast}
        </div>
      )}

      <div style={{ background: '#0F1A14', padding: '18px 20px 14px', flexShrink: 0, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '0.656rem', color: 'hsl(140,7%,48%)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '1px' }}>Inbox</p>
            <h1 style={{ fontSize: '1.167rem', fontWeight: 800, color: 'hsl(42,22%,84%)', lineHeight: 1 }}>Notifications</h1>
          </div>
          {unreadCount > 0 && (
            <button onClick={markAllRead} style={{ padding: '5px 12px', borderRadius: '9999px', border: '1px solid rgba(255,255,255,0.12)', background: 'transparent', color: 'hsl(42,22%,84%)', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer' }}>
              Mark all read
            </button>
          )}
        </div>

        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px' }}>
          {filterTypes.map(f => {
            const isUnread = f === 'unread'
            const label = f === 'all' ? 'All' : isUnread ? `Unread (${unreadCount})` : TYPE_CFG[f as NotifType]?.label || f
            const active = filter === f
            const highlight = isUnread && unreadCount > 0
            return (
              <button key={f} onClick={() => setFilter(f as typeof filter)} style={{
                padding: '4px 11px', borderRadius: '9999px', border: 'none', cursor: 'pointer',
                background: active ? (highlight ? 'hsl(4,72%,50%)' : 'hsl(25,82%,60%)') : 'rgba(255,255,255,0.07)',
                color: active ? '#fff' : highlight ? 'hsl(4,72%,65%)' : 'hsl(140,7%,48%)',
                fontSize: '0.72rem', fontWeight: 600, whiteSpace: 'nowrap', transition: 'background 0.15s',
              }}>
                {label}
              </button>
            )
          })}
        </div>
      </div>

      <div ref={containerRef} style={{ flex: 1, padding: '16px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {groups.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 20px', gap: '12px' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '18px', background: 'hsl(42,18%,94%)', border: '1.5px dashed hsl(38,14%,85%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>🔔</div>
            <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'hsl(24,10%,44%)' }}>All caught up</p>
          </div>
        ) : groups.map(group => (
          <div key={group.label}>
            <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'hsl(24,10%,44%)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '8px', paddingLeft: '2px' }}>
              {group.label}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {group.items.map(n => {
                const cfg = TYPE_CFG[n.type]
                return (
                  <div key={n.id} className="notif-item"
                    style={{
                      display: 'flex', gap: '12px', padding: '13px 14px', borderRadius: '14px',
                      background: n.read ? 'hsl(42,25%,99%)' : 'hsl(42,30%,97%)',
                      border: n.read ? '1px solid hsl(38,14%,90%)' : `1.5px solid ${cfg.color}30`,
                      transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                    }}
                    onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.transform = 'translateY(-1px)'; el.style.boxShadow = '0 4px 14px rgba(15,26,20,0.07)' }}
                    onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.transform = ''; el.style.boxShadow = '' }}
                  >
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>
                      {cfg.icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '3px' }}>
                        <p
                          onClick={() => { if (n.content_id) router.push(`/brief/${n.content_id}`) }}
                          style={{ fontSize: '0.85rem', fontWeight: n.read ? 600 : 700, color: 'hsl(24,20%,11%)', lineHeight: 1.3, cursor: n.content_id ? 'pointer' : 'default' }}
                        >{n.title}</p>
                        {!n.read && (
                          <button
                            onClick={e => { e.stopPropagation(); markRead(n.id) }}
                            title="Mark as read"
                            style={{
                              width: '22px', height: '22px', borderRadius: '50%', border: `1.5px solid ${cfg.color}`,
                              background: 'transparent', cursor: 'pointer', flexShrink: 0,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              color: cfg.color, fontSize: '11px', fontWeight: 800, lineHeight: 1,
                            }}
                          >✓</button>
                        )}
                      </div>
                      <p
                        onClick={() => { if (n.content_id) router.push(`/brief/${n.content_id}`) }}
                        style={{ fontSize: '0.75rem', color: 'hsl(24,10%,54%)', lineHeight: 1.4, marginBottom: '6px', cursor: n.content_id ? 'pointer' : 'default' }}
                      >{n.body}</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ padding: '2px 7px', borderRadius: '9999px', background: cfg.bg, color: cfg.color, fontSize: '0.62rem', fontWeight: 700 }}>{cfg.label}</span>
                        <span style={{ fontSize: '0.656rem', color: 'hsl(24,8%,64%)' }}>{timeAgo(n.created_at)}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}
