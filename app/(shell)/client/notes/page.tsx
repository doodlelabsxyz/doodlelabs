'use client'

import { useState, useEffect, useRef } from 'react'
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
  content_id: string | null
  content: { id: string; title: string } | null
  author: { name: string } | null
}
type ReplyRow = {
  id: string
  text: string
  author_type: string
  created_at: string
  author: { name: string } | null
}
type ClientRow = { id: string; name: string }

const NOTE_TYPE_CFG = {
  open: {
    icon: '✏️',
    accentClass: 'text-primary',
    shellClass: 'border-primary/30 bg-wash',
    badgeClass: 'border-primary/30 bg-primary/10 text-primary',
    buttonClass: 'border-primary/30 bg-card text-primary hover:bg-wash',
  },
  resolved: {
    icon: '✅',
    accentClass: 'text-success',
    shellClass: 'border-border bg-card opacity-75',
    badgeClass: 'border-success/20 bg-success/10 text-success',
    buttonClass: 'border-success/30 bg-card text-success hover:bg-success/10',
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

export default function ClientNotesPage() {
  const router = useRouter()
  const supabase = createClient()
  const { user } = useUser()
  const containerRef = useRef<HTMLDivElement>(null)

  const [clients, setClients] = useState<ClientRow[]>([])
  const [clientId, setClientId] = useState('')
  const [notes, setNotes] = useState<NoteRow[]>([])
  const [repliesByNote, setRepliesByNote] = useState<Record<string, ReplyRow[]>>({})
  const [filter, setFilter] = useState<'all' | 'open' | 'resolved'>('all')
  const [replyId, setReplyId] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [replyError, setReplyError] = useState('')

  useEffect(() => {
    if (!user) return
    const currentUser = user

    async function init() {
      if (currentUser.role === 'client') {
        const { data: cu } = await supabase.from('client_users').select('client_id').eq('user_id', currentUser.id).single()
        if (cu?.client_id) {
          setClientId(cu.client_id)
          const { data: c } = await supabase.from('clients').select('id, name').eq('id', cu.client_id)
          if (c) setClients(c)
        }
      } else {
        const { data: c } = await supabase.from('clients').select('id, name').order('name')
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
      const { data: cpIds } = await supabase.from('content_pieces_client').select('id, title').eq('client_id', clientId)
      const ids = cpIds?.map(c => c.id) ?? []
      // Titles come from the client-safe view; an embedded join to content_pieces
      // would return null for clients (no base-table SELECT).
      const titleById = new Map((cpIds ?? []).map(c => [c.id, c.title as string]))
      if (ids.length === 0) {
        setNotes([])
        setRepliesByNote({})
        return
      }

      // Fetch top-level notes and their replies in one query — a client
      // previously could only ever see their own comments, never the team's
      // replies to them (the thread was a one-way black hole). Split client-
      // side into the top-level list and a parent_id-keyed replies map.
      const { data } = await supabase
        .from('feedback_comments')
        .select('id, text, resolved, created_at, content_id, parent_id, author_type, author:author_id(name)')
        .in('content_id', ids)
        .order('created_at', { ascending: true })

      if (data) {
        const topLevel = data.filter(row => !row.parent_id)
        setNotes(
          topLevel
            .map(row => ({
              ...row,
              content: { id: row.content_id, title: titleById.get(row.content_id) ?? '' },
              author: normalizeOne(row.author as { name: string } | { name: string }[] | null),
            }))
            .sort((a, b) => b.created_at.localeCompare(a.created_at))
        )

        const replies: Record<string, ReplyRow[]> = {}
        for (const row of data) {
          if (!row.parent_id) continue
          const list = replies[row.parent_id] ?? (replies[row.parent_id] = [])
          list.push({
            id: row.id,
            text: row.text,
            author_type: row.author_type,
            created_at: row.created_at,
            author: normalizeOne(row.author as { name: string } | { name: string }[] | null),
          })
        }
        setRepliesByNote(replies)
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
  const isClientViewer = user?.role === 'client'

  async function markResolved(id: string) {
    const previous = notes
    setNotes(prev => prev.map(note => (note.id === id ? { ...note, resolved: true } : note)))
    const { data, error } = await supabase.from('feedback_comments').update({ resolved: true }).eq('id', id).select('id').single()
    if (error || !data) {
      setNotes(previous)
      setReplyError('Could not update that note. Please try again.')
    }
  }

  async function sendReply(id: string) {
    if (!replyText.trim()) return
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    // This page is nav-linked to the `client` role only — a client replying
    // to their own feedback thread must be recorded as author_type 'client',
    // not hardcoded 'team', or the reply shows up mislabeled (wrong badge,
    // wrong styling) when the team views the same thread from /brief/[id].
    const authorType = isClientViewer ? 'client' : 'team'
    const { data, error } = await supabase.from('feedback_comments').insert({
      content_id: notes.find(note => note.id === id)?.content_id,
      author_id: authUser?.id,
      author_name: user?.name ?? (isClientViewer ? 'Client' : 'Team'),
      author_type: authorType,
      text: replyText,
      parent_id: id,
      resolved: false,
      org_id: user?.org_id,
    }).select('id, text, author_type, created_at').single()

    if (error || !data) {
      setReplyError('Could not send your reply. Please try again.')
      return
    }

    setRepliesByNote(prev => ({
      ...prev,
      [id]: [...(prev[id] ?? []), { ...data, author: { name: user?.name ?? (isClientViewer ? 'Client' : 'Team') } }],
    }))

    setReplyText('')
    setReplyId(null)
    setReplyError('')
    // A client's own follow-up shouldn't drop off the team's radar as
    // "resolved" — only auto-resolve when a team member is the one replying.
    if (!isClientViewer) await markResolved(id)
  }

  return (
    <main className="page-main flex min-w-0 flex-1 flex-col overflow-y-auto bg-background">
      <div className="bg-dark px-5 py-[18px] pb-[14px] text-dark-text">
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
                  'shrink-0 border-dark-hover bg-dark-raised text-dark-muted hover:bg-dark-hover hover:text-dark-text',
                  clientId === c.id && 'border-mint bg-mint text-dark hover:bg-mint'
                )}
              >
                {c.name}
              </FilterPill>
            ))}
          </div>
        )}

        <div className="mb-3.5 flex items-center gap-3">
          <div className="flex-1">
            <p className="mb-0.5 text-[0.6rem] uppercase tracking-[0.08em] text-dark-muted">Client Notes</p>
            <h1 className="text-[1.167rem] font-extrabold leading-none text-dark-text">{client?.name ?? '...'}</h1>
          </div>
          {openCount > 0 && (
            <div className="rounded-[10px] bg-mint px-3 py-1.5 text-center text-dark">
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
                'border-dark-hover bg-dark-raised text-dark-muted hover:bg-dark-hover hover:text-dark-text',
                filter === key && 'border-mint bg-mint text-dark hover:bg-mint'
              )}
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
            const noteReplies = repliesByNote[note.id] ?? []

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
                        note.resolved ? 'border-success/30 bg-success/10 text-success' : 'border-primary/20 bg-primary/10'
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
                      className="mb-2.5 flex w-full items-center gap-2 rounded-[10px] border border-border bg-card px-2.5 py-2 text-left"
                    >
                      <div className="size-[5px] shrink-0 rounded-full bg-primary" />
                      <p className="min-w-0 flex-1 truncate text-[0.7rem] font-semibold text-foreground">
                        {note.content.title}
                      </p>
                      <span className="text-[0.62rem] font-bold text-primary">Brief {'->'}</span>
                    </button>
                  )}

                  {noteReplies.length > 0 && (
                    <div className="mb-2.5 flex flex-col gap-2">
                      {noteReplies.map(reply => {
                        const fromClient = reply.author_type === 'client'
                        return (
                          <div
                            key={reply.id}
                            className={cn(
                              'flex flex-col gap-0.5 rounded-[10px] border px-3 py-2.5',
                              fromClient ? 'border-primary/30 bg-primary/10' : 'border-border bg-sage'
                            )}
                          >
                            <div className="flex items-center gap-1.5">
                              <span className="text-[0.68rem] font-bold text-foreground">
                                {reply.author?.name ?? (fromClient ? 'Client' : 'Team')}
                              </span>
                              <Badge
                                variant="outline"
                                className={fromClient ? 'border-primary/40 bg-card text-primary' : 'border-border bg-card text-foreground'}
                              >
                                {fromClient ? 'Client' : 'Team'}
                              </Badge>
                              <span className="text-[0.58rem] text-muted-foreground">{timeAgo(reply.created_at)}</span>
                            </div>
                            <p className="text-[0.76rem] leading-[1.5] text-foreground/85">{reply.text}</p>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {!note.resolved && (
                    <div className="flex gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setReplyId(isReplying ? null : note.id)
                          setReplyError('')
                        }}
                        className={cfg.buttonClass}
                      >
                        {isReplying ? 'Cancel' : 'Reply'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => markResolved(note.id)}
                        className="border-success/30 bg-card text-success hover:bg-success/10"
                      >
                        Mark resolved
                      </Button>
                    </div>
                  )}
                </CardContent>

                {isReplying && (
                  <div className="border-t border-border bg-wash px-3.5 py-3">
                    <Textarea
                      autoFocus
                      placeholder="Type your reply to the client..."
                      value={replyText}
                      onChange={e => setReplyText(e.target.value)}
                      rows={2}
                      className="mb-2 resize-none bg-card leading-6"
                    />
                    {replyError && (
                      <p className="mb-2 text-[0.72rem] font-semibold text-danger" role="alert">{replyError}</p>
                    )}
                    <Button
                      onClick={() => sendReply(note.id)}
                      disabled={!replyText.trim()}
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
