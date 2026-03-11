'use client'

import { useState, useEffect, useRef, type CSSProperties } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { useRouter } from 'next/navigation'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { FilterPill } from '@/components/ui/filter-pill'
import { Textarea } from '@/components/ui/textarea'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/supabase/useUser'
import { cn } from '@/lib/utils'

gsap.registerPlugin(useGSAP)

type NoteRow = {
  id: string
  text: string
  resolved: boolean
  created_at: string
  content_piece_id: string | null
  content: { id: string; title: string } | null
  author: { name: string } | null
}
type ClientRow = { id: string; name: string; brand_color: string }

const NOTE_TYPE_CFG = {
  open: {
    icon: '✏️',
    accentClass: 'text-coral',
    shellClass: 'border-coral/25 bg-coral/5',
    badgeClass: 'border-coral/20 bg-coral/10 text-coral',
    buttonClass: 'border-coral/25 bg-background text-coral hover:bg-coral/10',
  },
  resolved: {
    icon: '✅',
    accentClass: 'text-success',
    shellClass: 'border-border bg-card opacity-75',
    badgeClass: 'border-success/20 bg-success/10 text-success',
    buttonClass: 'border-success/25 bg-background text-success hover:bg-success/10',
  },
}

function timeAgo(s: string) {
  const diff = Math.round((Date.now() - new Date(s).getTime()) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  return `${diff}d ago`
}

function normalizeOne<T>(x: T | T[] | null): T | null {
  if (!x) return null
  return Array.isArray(x) ? (x[0] ?? null) : x
}

function brandStyle(color?: string): CSSProperties | undefined {
  return color ? ({ '--brand-color': color } as CSSProperties) : undefined
}

export default function ClientNotesPage() {
  const router = useRouter()
  const supabase = createClient()
  const { user } = useUser()
  const containerRef = useRef<HTMLDivElement>(null)

  const [clients, setClients] = useState<ClientRow[]>([])
  const [clientId, setClientId] = useState('')
  const [notes, setNotes] = useState<NoteRow[]>([])
  const [filter, setFilter] = useState<'all' | 'open' | 'resolved'>('all')
  const [replyId, setReplyId] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')

  useEffect(() => {
    if (!user) return
    const currentUser = user

    async function init() {
      if (currentUser.role === 'client') {
        const { data: cu } = await supabase.from('client_users').select('client_id').eq('user_id', currentUser.id).single()
        if (cu?.client_id) {
          setClientId(cu.client_id)
          const { data: c } = await supabase.from('clients').select('id, name, brand_color').eq('id', cu.client_id)
          if (c) setClients(c)
        }
      } else {
        const { data: c } = await supabase.from('clients').select('id, name, brand_color').order('name')
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

    async function load() {
      const { data: cpIds } = await supabase.from('content_pieces').select('id').eq('client_id', clientId)
      const ids = cpIds?.map(c => c.id) ?? []
      if (ids.length === 0) {
        setNotes([])
        return
      }

      const { data } = await supabase
        .from('feedback_comments')
        .select('id, text, resolved, created_at, content_piece_id, content:content_piece_id(id, title), author:author_id(name)')
        .in('content_piece_id', ids)
        .is('parent_comment_id', null)
        .order('created_at', { ascending: false })

      if (data) {
        setNotes(
          data.map(row => ({
            ...row,
            content: normalizeOne(row.content as { id: string; title: string } | { id: string; title: string }[] | null),
            author: normalizeOne(row.author as { name: string } | { name: string }[] | null),
          }))
        )
      }
    }

    load()
  }, [clientId, supabase])

  useGSAP(
    () => {
      if (!containerRef.current) return
      gsap.fromTo(
        '[data-animate="note-card"]',
        { y: 10, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.3, stagger: 0.06, ease: 'power2.out', clearProps: 'all' }
      )
    },
    { dependencies: [filter, clientId, notes.length], scope: containerRef }
  )

  const client = clients.find(c => c.id === clientId)
  const filtered = notes.filter(note => (filter === 'all' ? true : filter === 'open' ? !note.resolved : note.resolved))
  const openCount = notes.filter(note => !note.resolved).length

  async function markResolved(id: string) {
    setNotes(prev => prev.map(note => (note.id === id ? { ...note, resolved: true } : note)))
    await supabase.from('feedback_comments').update({ resolved: true }).eq('id', id)
  }

  async function sendReply(id: string) {
    if (!replyText.trim()) return
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    await supabase.from('feedback_comments').insert({
      content_piece_id: notes.find(note => note.id === id)?.content_piece_id,
      author_id: authUser?.id,
      text: replyText,
      parent_comment_id: id,
      resolved: false,
      org_id: user?.org_id,
    })

    setReplyText('')
    setReplyId(null)
    await markResolved(id)
  }

  return (
    <main className="page-main flex min-w-0 flex-1 flex-col overflow-y-auto bg-background">
      <div className="bg-foreground px-5 py-[18px] pb-[14px] text-background">
        {user?.role !== 'client' && clients.length > 1 && (
          <div className="mb-3.5 flex gap-1.5 overflow-x-auto pb-0.5">
            {clients.map(c => (
              <FilterPill
                key={c.id}
                active={clientId === c.id}
                onClick={() => {
                  setClientId(c.id)
                  sessionStorage.setItem('clientId', c.id)
                }}
                className={cn(
                  'shrink-0 border-white/10 bg-white/5 text-background/65 hover:bg-white/10 hover:text-background',
                  clientId === c.id && 'border-[var(--brand-color)] bg-[var(--brand-color)] text-white hover:bg-[var(--brand-color)]'
                )}
                style={clientId === c.id ? brandStyle(c.brand_color) : undefined}
              >
                {c.name}
              </FilterPill>
            ))}
          </div>
        )}

        <div className="mb-3.5 flex items-center gap-3">
          <div className="flex-1">
            <p className="mb-0.5 text-[0.6rem] uppercase tracking-[0.08em] text-background/50">Client Notes</p>
            <h1 className="text-[1.167rem] font-extrabold leading-none text-background">{client?.name ?? '...'}</h1>
          </div>
          {openCount > 0 && (
            <div className="rounded-[10px] bg-coral px-3 py-1.5 text-center text-white">
              <p className="text-[1.1rem] font-extrabold leading-none">{openCount}</p>
              <p className="mt-px text-[0.58rem]">open</p>
            </div>
          )}
        </div>

        <div className="flex gap-1.5">
          {([
            ['all', 'All'],
            ['open', `Open (${openCount})`],
            ['resolved', 'Resolved'],
          ] as const).map(([key, label]) => (
            <FilterPill
              key={key}
              active={filter === key}
              onClick={() => setFilter(key)}
              className={cn(
                'border-white/10 bg-white/5 text-background/65 hover:bg-white/10 hover:text-background',
                filter === key && 'border-[var(--brand-color)] bg-[var(--brand-color)] text-white hover:bg-[var(--brand-color)]'
              )}
              style={filter === key ? brandStyle(client?.brand_color ?? 'hsl(25 82% 60%)') : undefined}
            >
              {label}
            </FilterPill>
          ))}
        </div>
      </div>

      <div ref={containerRef} className="flex flex-1 flex-col gap-2.5 px-4 py-4">
        {filtered.length === 0 ? (
          <EmptyState
            icon="💬"
            title="No notes here"
            body="Client feedback and messages will appear here."
            className="border-border bg-card py-14"
          />
        ) : (
          filtered.map(note => {
            const cfg = note.resolved ? NOTE_TYPE_CFG.resolved : NOTE_TYPE_CFG.open
            const isReplying = replyId === note.id

            return (
              <Card
                key={note.id}
                data-animate="note-card"
                className={cn('overflow-hidden py-0 shadow-none', cfg.shellClass)}
              >
                <CardContent className="px-3.5 py-3.5">
                  <div className="mb-2.5 flex items-start gap-2.5">
                    <div
                      className={cn(
                        'flex size-[34px] shrink-0 items-center justify-center rounded-[10px] border text-base',
                        note.resolved ? 'border-border bg-muted' : 'border-coral/20 bg-coral/10'
                      )}
                    >
                      {note.resolved ? '✓' : cfg.icon}
                    </div>
                    <div className="flex-1">
                      <div className="mb-0.5 flex flex-wrap items-center gap-1.5">
                        <Badge variant="outline" className={cfg.badgeClass}>
                          {note.resolved ? 'Resolved' : 'Feedback'}
                        </Badge>
                        <span className="text-[0.6rem] text-muted-foreground">{timeAgo(note.created_at)}</span>
                      </div>
                      <p className="text-[0.72rem] font-bold text-foreground">
                        {note.author?.name ?? 'Client'}
                      </p>
                    </div>
                  </div>

                  <p className={cn('text-[0.8rem] leading-[1.6] text-foreground/85', (note.content || !note.resolved) && 'mb-2.5')}>
                    {note.text}
                  </p>

                  {note.content && (
                    <button
                      onClick={() => router.push(`/brief/${note.content!.id}`)}
                      className="mb-2.5 flex w-full items-center gap-2 rounded-[10px] border border-white/80 bg-white/60 px-2.5 py-2 text-left"
                    >
                      <div
                        className="size-[5px] shrink-0 rounded-full bg-[var(--brand-color)]"
                        style={brandStyle(client?.brand_color ?? 'hsl(25 82% 60%)')}
                      />
                      <p className="min-w-0 flex-1 truncate text-[0.7rem] font-semibold text-foreground">
                        {note.content.title}
                      </p>
                      <span className="text-[0.62rem] font-bold text-sky">Brief {'->'}</span>
                    </button>
                  )}

                  {!note.resolved && (
                    <div className="flex gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setReplyId(isReplying ? null : note.id)}
                        className={cfg.buttonClass}
                      >
                        {isReplying ? 'Cancel' : 'Reply'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => markResolved(note.id)}
                        className="border-success/25 bg-background text-success hover:bg-success/10"
                      >
                        Mark resolved
                      </Button>
                    </div>
                  )}
                </CardContent>

                {isReplying && (
                  <div className="border-t border-coral/20 bg-white/50 px-3.5 py-3">
                    <Textarea
                      autoFocus
                      placeholder="Type your reply to the client..."
                      value={replyText}
                      onChange={e => setReplyText(e.target.value)}
                      rows={2}
                      className="mb-2 resize-none bg-card leading-6"
                    />
                    <Button
                      onClick={() => sendReply(note.id)}
                      disabled={!replyText.trim()}
                      className={cn('bg-coral text-white hover:bg-coral/85', !replyText.trim() && 'bg-muted text-muted-foreground hover:bg-muted')}
                    >
                      Send Reply {'->'}
                    </Button>
                  </div>
                )}
              </Card>
            )
          })
        )}

        <div className="h-6" />
      </div>
    </main>
  )
}
