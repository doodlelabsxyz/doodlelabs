'use client'

import { useState, useEffect, useRef } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/supabase/useUser'

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
  open:     { icon: '✏️', color: 'hsl(25,82%,52%)',  bg: 'hsl(25,82%,96%)',  label: 'Feedback',  border: 'hsl(25,82%,80%)' },
  resolved: { icon: '✅', color: 'hsl(154,50%,38%)',  bg: 'hsl(154,50%,96%)', label: 'Resolved',  border: 'hsl(154,50%,78%)' },
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

  const [mounted,    setMounted]    = useState(false)
  const [clients,    setClients]    = useState<ClientRow[]>([])
  const [clientId,   setClientId]   = useState('')
  const [notes,      setNotes]      = useState<NoteRow[]>([])
  const [filter,     setFilter]     = useState<'all' | 'open' | 'resolved'>('all')
  const [replyId,    setReplyId]    = useState<string | null>(null)
  const [replyText,  setReplyText]  = useState('')

  // Identify client on mount
  useEffect(() => {
    setMounted(true)
    if (!user) return
    async function init() {
      if (user!.role === 'client') {
        const { data: cu } = await supabase
          .from('client_users').select('client_id').eq('user_id', user!.id).single()
        if (cu?.client_id) {
          setClientId(cu.client_id)
          const { data: c } = await supabase
            .from('clients').select('id, name, brand_color').eq('id', cu.client_id)
          if (c) setClients(c)
        }
      } else {
        const { data: c } = await supabase
          .from('clients').select('id, name, brand_color').order('name')
        if (c) {
          setClients(c)
          const stored = sessionStorage.getItem('clientId')
          setClientId(stored && c.find(x => x.id === stored) ? stored : (c[0]?.id ?? ''))
        }
      }
    }
    init()
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  // Load notes for client
  useEffect(() => {
    if (!clientId) return
    async function load() {
      // First get content piece IDs for this client
      const { data: cpIds } = await supabase
        .from('content_pieces').select('id').eq('client_id', clientId)
      const ids = cpIds?.map(c => c.id) ?? []
      if (ids.length === 0) { setNotes([]); return }

      const { data } = await supabase
        .from('feedback_comments')
        .select('id, text, resolved, created_at, content_piece_id, content:content_piece_id(id, title), author:author_id(name)')
        .in('content_piece_id', ids)
        .is('parent_comment_id', null)
        .order('created_at', { ascending: false })

      if (data) {
        setNotes(data.map(row => ({
          ...row,
          content: normalizeOne(row.content as { id: string; title: string } | { id: string; title: string }[] | null),
          author: normalizeOne(row.author as { name: string } | { name: string }[] | null),
        })))
      }
    }
    load()
  }, [clientId]) // eslint-disable-line react-hooks/exhaustive-deps

  useGSAP(() => {
    if (!mounted || !containerRef.current) return
    gsap.fromTo('.note-card',
      { y: 10, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.3, stagger: 0.06, ease: 'power2.out', clearProps: 'all' }
    )
  }, { dependencies: [mounted, filter, clientId], scope: containerRef })

  if (!mounted) return null

  const client = clients.find(c => c.id === clientId)

  const filtered = notes
    .filter(n => filter === 'all' ? true : filter === 'open' ? !n.resolved : n.resolved)

  const openCount = notes.filter(n => !n.resolved).length

  async function markResolved(id: string) {
    setNotes(prev => prev.map(n => n.id === id ? { ...n, resolved: true } : n))
    await supabase.from('feedback_comments').update({ resolved: true }).eq('id', id)
  }

  async function sendReply(id: string) {
    if (!replyText.trim()) return
    const { data: { user: authUser } } = await supabase.auth.getUser()
    // Insert reply as a child comment
    await supabase.from('feedback_comments').insert({
      content_piece_id: notes.find(n => n.id === id)?.content_piece_id,
      author_id: authUser?.id,
      text: replyText,
      parent_comment_id: id,
      resolved: false,
    })
    setReplyText('')
    setReplyId(null)
    await markResolved(id)
  }

  return (
    <main className="page-main" style={{ flex: 1, minWidth: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', background: 'hsl(42,30%,97%)' }}>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div style={{ background: '#0F1A14', padding: '18px 20px 14px', flexShrink: 0 }}>
        {/* Client switcher (admin only) */}
        {user?.role !== 'client' && clients.length > 1 && (
          <div style={{ display: 'flex', gap: '6px', marginBottom: '14px', overflowX: 'auto', paddingBottom: '2px' }}>
            {clients.map(c => (
              <button key={c.id} onClick={() => { setClientId(c.id); sessionStorage.setItem('clientId', c.id) }} style={{
                padding: '4px 12px', borderRadius: '99px', border: 'none', cursor: 'pointer',
                background: clientId === c.id ? c.brand_color : 'rgba(255,255,255,0.06)',
                color: clientId === c.id ? '#fff' : 'hsl(140,7%,52%)',
                fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap', transition: 'background 0.15s',
              }}>
                {c.name}
              </button>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '0.6rem', color: 'hsl(140,7%,48%)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '2px' }}>Client Notes</p>
            <h1 style={{ fontSize: '1.167rem', fontWeight: 800, color: 'hsl(42,22%,84%)', lineHeight: 1 }}>{client?.name ?? '…'}</h1>
          </div>
          {openCount > 0 && (
            <div style={{ background: 'hsl(25,82%,55%)', color: '#fff', borderRadius: '10px', padding: '6px 12px', textAlign: 'center' }}>
              <p style={{ fontSize: '1.1rem', fontWeight: 800, lineHeight: 1 }}>{openCount}</p>
              <p style={{ fontSize: '0.58rem', marginTop: '1px' }}>open</p>
            </div>
          )}
        </div>

        {/* Filter pills */}
        <div style={{ display: 'flex', gap: '6px' }}>
          {([['all', 'All'], ['open', `Open (${openCount})`], ['resolved', 'Resolved']] as const).map(([key, label]) => (
            <button key={key} onClick={() => setFilter(key)} style={{
              padding: '4px 12px', borderRadius: '99px', border: 'none', cursor: 'pointer',
              background: filter === key ? (client?.brand_color ?? 'hsl(25,82%,60%)') : 'rgba(255,255,255,0.06)',
              color: filter === key ? '#fff' : 'hsl(140,7%,52%)',
              fontSize: '0.72rem', fontWeight: 600, transition: 'background 0.15s',
            }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Notes ────────────────────────────────────────────────────────── */}
      <div ref={containerRef} style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>

        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 24px', color: 'hsl(24,10%,54%)' }}>
            <div style={{ fontSize: '2.4rem', marginBottom: '10px' }}>💬</div>
            <p style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '4px' }}>No notes here</p>
            <p style={{ fontSize: '0.75rem' }}>Client feedback and messages will appear here.</p>
          </div>
        )}

        {filtered.map(note => {
          const tc = note.resolved ? NOTE_TYPE_CFG.resolved : NOTE_TYPE_CFG.open
          const isReplying = replyId === note.id

          return (
            <div key={note.id} className="note-card" style={{
              background: note.resolved ? '#fff' : tc.bg,
              borderRadius: '16px',
              border: `1.5px solid ${note.resolved ? 'hsl(38,14%,90%)' : tc.border}`,
              overflow: 'hidden',
              opacity: note.resolved ? 0.75 : 1,
            }}>
              <div style={{ padding: '14px' }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '10px' }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: '10px', flexShrink: 0,
                    background: note.resolved ? 'hsl(42,18%,92%)' : tc.bg,
                    border: `1px solid ${note.resolved ? 'hsl(38,14%,88%)' : tc.border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem',
                  }}>
                    {note.resolved ? '✓' : tc.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '2px' }}>
                      <span style={{
                        fontSize: '0.6rem', fontWeight: 700, padding: '1px 7px', borderRadius: '99px',
                        background: note.resolved ? 'hsl(42,18%,90%)' : `${tc.color}20`,
                        color: note.resolved ? 'hsl(24,10%,52%)' : tc.color,
                      }}>
                        {note.resolved ? 'Resolved' : tc.label}
                      </span>
                      <span style={{ fontSize: '0.6rem', color: 'hsl(24,10%,56%)' }}>{timeAgo(note.created_at)}</span>
                    </div>
                    <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'hsl(24,20%,22%)' }}>
                      {note.author?.name ?? 'Client'}
                    </p>
                  </div>
                </div>

                {/* Note text */}
                <p style={{
                  fontSize: '0.8rem', color: 'hsl(24,10%,22%)', lineHeight: 1.6,
                  marginBottom: note.content || !note.resolved ? '10px' : 0,
                }}>
                  {note.text}
                </p>

                {/* Linked content */}
                {note.content && (
                  <div
                    onClick={() => router.push(`/brief/${note.content!.id}`)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      background: 'rgba(255,255,255,0.6)', borderRadius: '10px', padding: '8px 10px',
                      cursor: 'pointer', marginBottom: '10px',
                      border: '1px solid rgba(255,255,255,0.8)',
                    }}
                  >
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: client?.brand_color ?? 'hsl(25,82%,60%)', flexShrink: 0 }} />
                    <p style={{ fontSize: '0.7rem', fontWeight: 600, color: 'hsl(24,15%,22%)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {note.content.title}
                    </p>
                    <span style={{ fontSize: '0.62rem', color: 'hsl(200,82%,48%)', fontWeight: 700, flexShrink: 0 }}>Brief →</span>
                  </div>
                )}

                {/* Actions */}
                {!note.resolved && (
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      onClick={() => setReplyId(isReplying ? null : note.id)}
                      style={{
                        padding: '5px 12px', borderRadius: '8px', border: `1px solid ${tc.border}`,
                        background: 'rgba(255,255,255,0.7)', color: tc.color,
                        fontSize: '0.68rem', fontWeight: 700, cursor: 'pointer',
                      }}
                    >
                      {isReplying ? 'Cancel' : '↩ Reply'}
                    </button>
                    <button
                      onClick={() => markResolved(note.id)}
                      style={{
                        padding: '5px 12px', borderRadius: '8px', border: '1px solid hsl(154,50%,72%)',
                        background: 'rgba(255,255,255,0.7)', color: 'hsl(154,50%,36%)',
                        fontSize: '0.68rem', fontWeight: 700, cursor: 'pointer',
                      }}
                    >
                      ✓ Mark resolved
                    </button>
                  </div>
                )}
              </div>

              {/* Reply box */}
              {isReplying && (
                <div style={{ borderTop: `1px solid ${tc.border}`, padding: '12px 14px', background: 'rgba(255,255,255,0.5)' }}>
                  <textarea
                    autoFocus
                    placeholder="Type your reply to the client…"
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    rows={2}
                    style={{
                      width: '100%', padding: '8px 10px', borderRadius: '8px',
                      border: `1.5px solid ${tc.border}`, background: '#fff',
                      fontSize: '0.78rem', color: 'hsl(24,15%,20%)', lineHeight: 1.5,
                      resize: 'none', fontFamily: 'inherit', outline: 'none',
                      boxSizing: 'border-box', marginBottom: '8px',
                    }}
                  />
                  <button
                    onClick={() => sendReply(note.id)}
                    disabled={!replyText.trim()}
                    style={{
                      padding: '7px 16px', borderRadius: '8px', border: 'none',
                      background: replyText.trim() ? tc.color : 'hsl(38,14%,86%)',
                      color: replyText.trim() ? '#fff' : 'hsl(24,10%,60%)',
                      fontSize: '0.72rem', fontWeight: 700, cursor: replyText.trim() ? 'pointer' : 'default',
                      transition: 'background 0.15s',
                    }}
                  >
                    Send Reply →
                  </button>
                </div>
              )}
            </div>
          )
        })}

        <div style={{ height: 24 }} />
      </div>
    </main>
  )
}
