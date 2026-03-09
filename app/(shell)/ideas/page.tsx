'use client'

import { useState, useRef, useEffect } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/supabase/useUser'
import type { ContentType, IdeaStatus } from '@/lib/types'
import { getInitials, getAvatarColor } from '@/lib/utils'

gsap.registerPlugin(useGSAP)

const TYPE_CFG: Record<ContentType, { label: string; color: string; bg: string }> = {
  graphic: { label: 'Graphic', color: 'hsl(14,72%,62%)',  bg: 'hsl(14,72%,95%)' },
  video:   { label: 'Video',   color: 'hsl(40,95%,52%)',  bg: 'hsl(40,95%,93%)' },
  reel:    { label: 'Reel',    color: 'hsl(161,58%,44%)', bg: 'hsl(161,58%,92%)' },
  story:   { label: 'Story',   color: 'hsl(268,60%,68%)', bg: 'hsl(268,60%,93%)' },
}

const STATUS_CFG: Record<IdeaStatus, { label: string; color: string; bg: string; dot: string }> = {
  raw:        { label: 'Raw',        color: 'hsl(24,10%,44%)',  bg: 'hsl(42,18%,93%)',  dot: 'hsl(24,10%,60%)' },
  shortlisted:{ label: 'Shortlisted',color: 'hsl(40,92%,40%)',  bg: 'hsl(40,92%,94%)',  dot: 'hsl(40,92%,52%)' },
  converted:  { label: 'Converted',  color: 'hsl(154,50%,36%)', bg: 'hsl(154,50%,92%)', dot: 'hsl(154,50%,44%)' },
}

type ClientRow = { id: string; name: string; brand_color: string }
type AuthorRow = { id: string; name: string }

type IdeaRow = {
  id: string
  title: string
  type: ContentType | null
  client_id: string | null
  body: string
  status: IdeaStatus
  tags: string[] | null
  created_at: string
  created_by: string
  clients: ClientRow | ClientRow[] | null
  author: AuthorRow | AuthorRow[] | null
}

function normalize<T>(x: T | T[] | null): T | null {
  if (!x) return null
  return Array.isArray(x) ? (x[0] ?? null) : x
}

function timeAgo(s: string): string {
  const diff = Math.round((Date.now() - new Date(s).getTime()) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  return `${diff}d ago`
}

const EMPTY_FORM = { title: '', type: '' as ContentType | '', client_id: '', body: '', tags: [] as string[] }

export default function IdeasPage() {
  const router  = useRouter()
  const gridRef = useRef<HTMLDivElement>(null)
  const { user } = useUser()

  const [mounted,      setMounted]      = useState(false)
  const [ideas,        setIdeas]        = useState<IdeaRow[]>([])
  const [clients,      setClients]      = useState<ClientRow[]>([])
  const [statusFilter, setStatusFilter] = useState<IdeaStatus | 'all'>('all')
  const [clientFilter, setClientFilter] = useState<string>('all')
  const [showForm,     setShowForm]     = useState(false)
  const [form,         setForm]         = useState({ ...EMPTY_FORM })
  const [tagInput,     setTagInput]     = useState('')

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const [ideasRes, clientsRes] = await Promise.all([
        supabase
          .from('ideas')
          .select('*, clients:client_id(id, name, brand_color), author:created_by(id, name)')
          .order('created_at', { ascending: false }),
        supabase.from('clients').select('id, name, brand_color'),
      ])
      setIdeas((ideasRes.data || []) as IdeaRow[])
      setClients(clientsRes.data || [])
      setMounted(true)
    }
    load()
  }, [])

  useGSAP(() => {
    if (!mounted || !gridRef.current) return
    gsap.fromTo('.idea-card',
      { y: 16, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.35, stagger: 0.06, ease: 'back.out(1.2)', clearProps: 'all' }
    )
  }, { dependencies: [mounted, statusFilter, clientFilter], scope: gridRef })

  if (!mounted) return null

  const filtered = ideas
    .filter(i => statusFilter === 'all' || i.status === statusFilter)
    .filter(i => clientFilter === 'all' || i.client_id === clientFilter)

  const counts = {
    raw:        ideas.filter(i => i.status === 'raw').length,
    shortlisted: ideas.filter(i => i.status === 'shortlisted').length,
    converted:  ideas.filter(i => i.status === 'converted').length,
  }

  async function addIdea() {
    if (!form.title.trim() || !form.body.trim() || !user) return
    const supabase = createClient()
    const { data } = await supabase
      .from('ideas')
      .insert({
        title:     form.title.trim(),
        body:      form.body.trim(),
        type:      form.type || null,
        client_id: form.client_id || null,
        tags:      form.tags,
        status:    'raw',
        created_by: user.id,
      })
      .select('*, clients:client_id(id, name, brand_color), author:created_by(id, name)')
      .single()
    if (data) setIdeas(prev => [data as IdeaRow, ...prev])
    setForm({ ...EMPTY_FORM })
    setTagInput('')
    setShowForm(false)
  }

  async function updateStatus(id: string, status: IdeaStatus) {
    setIdeas(prev => prev.map(i => i.id === id ? { ...i, status } : i))
    const supabase = createClient()
    await supabase.from('ideas').update({ status }).eq('id', id)
  }

  async function convertToBrief(idea: IdeaRow) {
    await updateStatus(idea.id, 'converted')
    const params = new URLSearchParams()
    if (idea.client_id) params.set('client', idea.client_id)
    if (idea.type) params.set('type', idea.type)
    params.set('title', idea.title)
    router.push(`/brief/new?${params.toString()}`)
  }

  function addTag() {
    const tag = tagInput.trim().replace(/^#/, '').toLowerCase()
    if (!tag || form.tags.includes(tag)) return
    setForm(prev => ({ ...prev, tags: [...prev.tags, tag] }))
    setTagInput('')
  }

  return (
    <main className="page-main" style={{ flex: 1, minWidth: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', background: 'hsl(42,30%,97%)' }}>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div style={{ background: '#0F1A14', padding: '18px 20px 14px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '0.6rem', color: 'hsl(140,7%,48%)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '1px' }}>
              Content Strategy
            </p>
            <h1 style={{ fontSize: '1.167rem', fontWeight: 800, color: 'hsl(42,22%,84%)', lineHeight: 1 }}>Idea Dump</h1>
          </div>
          <button
            onClick={() => setShowForm(f => !f)}
            style={{
              padding: '8px 16px', borderRadius: '10px', border: 'none', cursor: 'pointer',
              background: showForm ? 'rgba(255,255,255,0.08)' : 'hsl(25,82%,58%)',
              color: showForm ? 'hsl(140,7%,52%)' : '#fff',
              fontSize: '0.78rem', fontWeight: 700, transition: 'all 0.15s',
            }}
          >
            {showForm ? '✕ Cancel' : '+ New Idea'}
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '14px' }}>
          {(['raw', 'shortlisted', 'converted'] as IdeaStatus[]).map(s => {
            const sc = STATUS_CFG[s]
            return (
              <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: sc.dot }} />
                <span style={{ fontSize: '0.68rem', color: 'hsl(140,7%,48%)' }}>{counts[s]} {sc.label}</span>
              </div>
            )
          })}
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px' }}>
          <FilterPill label="All" active={statusFilter === 'all'} onClick={() => setStatusFilter('all')} />
          {(['raw', 'shortlisted', 'converted'] as IdeaStatus[]).map(s => (
            <FilterPill key={s} label={STATUS_CFG[s].label} active={statusFilter === s} onClick={() => setStatusFilter(s)} />
          ))}
          <div style={{ width: '1px', background: 'rgba(255,255,255,0.07)', flexShrink: 0, margin: '0 2px' }} />
          <FilterPill label="All Clients" active={clientFilter === 'all'} onClick={() => setClientFilter('all')} />
          {clients.map(c => (
            <FilterPill key={c.id} label={c.name} active={clientFilter === c.id} onClick={() => setClientFilter(c.id)} color={c.brand_color} />
          ))}
        </div>
      </div>

      {/* ── New Idea Form ─────────────────────────────────────────────────── */}
      {showForm && (
        <div style={{
          background: 'hsl(42,38%,98%)', borderBottom: '1px solid hsl(38,14%,88%)',
          padding: '16px 20px', flexShrink: 0,
        }}>
          <p style={{ fontSize: '0.72rem', fontWeight: 800, color: 'hsl(24,20%,22%)', marginBottom: '12px' }}>New Idea</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

            <input
              placeholder="Idea title *"
              value={form.title}
              onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              style={inputStyle}
            />

            <textarea
              placeholder="Describe the idea — concept, angle, why it'll work, inspiration… *"
              value={form.body}
              onChange={e => setForm(p => ({ ...p, body: e.target.value }))}
              rows={3}
              style={{ ...inputStyle, resize: 'none', lineHeight: 1.6 }}
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value as ContentType | '' }))} style={inputStyle}>
                <option value="">Content type (optional)</option>
                <option value="graphic">Graphic</option>
                <option value="video">Video</option>
                <option value="reel">Reel</option>
                <option value="story">Story</option>
              </select>
              <select value={form.client_id} onChange={e => setForm(p => ({ ...p, client_id: e.target.value }))} style={inputStyle}>
                <option value="">Client (optional)</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            {/* Tags */}
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
              {form.tags.map(tag => (
                <span key={tag} style={{
                  padding: '2px 8px', borderRadius: '99px', background: 'hsl(200,82%,92%)',
                  color: 'hsl(200,82%,38%)', fontSize: '0.65rem', fontWeight: 700, cursor: 'pointer',
                }} onClick={() => setForm(p => ({ ...p, tags: p.tags.filter(t => t !== tag) }))}>
                  #{tag} ×
                </span>
              ))}
              <div style={{ display: 'flex', gap: '4px' }}>
                <input
                  placeholder="Add tag…"
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  style={{ ...inputStyle, width: 100, padding: '4px 8px', fontSize: '0.68rem' }}
                />
                <button onClick={addTag} style={{ padding: '4px 8px', borderRadius: '6px', border: 'none', background: 'hsl(200,82%,88%)', color: 'hsl(200,82%,38%)', fontSize: '0.68rem', cursor: 'pointer', fontWeight: 700 }}>+</button>
              </div>
            </div>

            <button
              onClick={addIdea}
              disabled={!form.title.trim() || !form.body.trim()}
              style={{
                padding: '10px 20px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                background: form.title.trim() && form.body.trim() ? 'hsl(25,82%,58%)' : 'hsl(38,14%,86%)',
                color: form.title.trim() && form.body.trim() ? '#fff' : 'hsl(24,10%,60%)',
                fontSize: '0.82rem', fontWeight: 800, alignSelf: 'flex-start',
                transition: 'background 0.15s',
              }}
            >
              Dump it →
            </button>
          </div>
        </div>
      )}

      {/* ── Ideas Grid ───────────────────────────────────────────────────── */}
      <div ref={gridRef} style={{ padding: '16px', flex: 1 }}>
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 24px', color: 'hsl(24,10%,54%)' }}>
            <div style={{ fontSize: '2.4rem', marginBottom: '10px' }}>💡</div>
            <p style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '4px' }}>No ideas yet</p>
            <p style={{ fontSize: '0.75rem' }}>Hit "New Idea" and dump whatever's in your head. No filters, no judgment.</p>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '12px' }}>
          {filtered.map(idea => {
            const sc     = STATUS_CFG[idea.status]
            const tc     = idea.type ? TYPE_CFG[idea.type] : null
            const client = normalize(idea.clients)
            const author = normalize(idea.author)

            return (
              <div
                key={idea.id}
                className="idea-card"
                style={{
                  background: '#fff', borderRadius: '16px',
                  border: '1px solid hsl(38,14%,90%)', overflow: 'hidden',
                  transition: 'transform 0.15s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.15s ease',
                }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.transform = 'translateY(-3px)'; el.style.boxShadow = '0 10px 28px rgba(0,0,0,0.07)' }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.transform = ''; el.style.boxShadow = '' }}
              >
                {/* Status bar */}
                <div style={{ height: 4, background: sc.dot }} />

                <div style={{ padding: '14px' }}>
                  {/* Header chips */}
                  <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginBottom: '8px', alignItems: 'center' }}>
                    <span style={{ padding: '2px 8px', borderRadius: '99px', background: sc.bg, color: sc.color, fontSize: '0.6rem', fontWeight: 700 }}>
                      {sc.label}
                    </span>
                    {tc && (
                      <span style={{ padding: '2px 8px', borderRadius: '99px', background: tc.bg, color: tc.color, fontSize: '0.6rem', fontWeight: 700 }}>
                        {tc.label}
                      </span>
                    )}
                    {client && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: 'auto' }}>
                        <div style={{ width: 7, height: 7, borderRadius: '50%', background: client.brand_color }} />
                        <span style={{ fontSize: '0.6rem', color: 'hsl(24,10%,44%)', fontWeight: 600 }}>{client.name}</span>
                      </div>
                    )}
                  </div>

                  <h3 style={{ fontSize: '0.92rem', fontWeight: 800, color: 'hsl(24,20%,11%)', lineHeight: 1.3, marginBottom: '8px' }}>
                    {idea.title}
                  </h3>

                  <p style={{
                    fontSize: '0.75rem', color: 'hsl(24,10%,40%)', lineHeight: 1.6, marginBottom: '10px',
                    overflow: 'hidden', display: '-webkit-box',
                    WebkitLineClamp: 3, WebkitBoxOrient: 'vertical',
                  }}>
                    {idea.body}
                  </p>

                  {/* Tags */}
                  {idea.tags && idea.tags.length > 0 && (
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '10px' }}>
                      {idea.tags.map(tag => (
                        <span key={tag} style={{
                          padding: '1px 6px', borderRadius: '99px',
                          background: 'hsl(200,82%,93%)', color: 'hsl(200,82%,38%)',
                          fontSize: '0.58rem', fontWeight: 700,
                        }}>
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Footer */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '8px', borderTop: '1px solid hsl(38,14%,92%)' }}>
                    {author && (
                      <div style={{
                        width: 20, height: 20, borderRadius: '50%', background: getAvatarColor(author.id),
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.5rem', fontWeight: 800, color: '#fff', flexShrink: 0,
                      }}>
                        {getInitials(author.name)}
                      </div>
                    )}
                    <span style={{ fontSize: '0.6rem', color: 'hsl(24,10%,56%)' }}>{timeAgo(idea.created_at)}</span>

                    <div style={{ display: 'flex', gap: '4px', marginLeft: 'auto' }}>
                      {idea.status === 'raw' && (
                        <button onClick={() => updateStatus(idea.id, 'shortlisted')} style={actionBtnStyle('hsl(40,92%,52%)', 'hsl(40,92%,94%)')}>
                          ★ Shortlist
                        </button>
                      )}
                      {idea.status !== 'converted' && (
                        <button onClick={() => convertToBrief(idea)} style={actionBtnStyle('hsl(154,50%,38%)', 'hsl(154,50%,92%)')}>
                          → Brief
                        </button>
                      )}
                      {idea.status === 'converted' && (
                        <span style={{ fontSize: '0.62rem', color: 'hsl(154,50%,38%)', fontWeight: 700 }}>✓ In pipeline</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </main>
  )
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', borderRadius: '10px',
  border: '1.5px solid hsl(38,14%,86%)', background: '#fff',
  fontSize: '0.8rem', color: 'hsl(24,15%,18%)', fontFamily: 'inherit',
  outline: 'none', boxSizing: 'border-box',
}

function actionBtnStyle(color: string, bg: string): React.CSSProperties {
  return {
    padding: '3px 9px', borderRadius: '7px', border: 'none', cursor: 'pointer',
    background: bg, color, fontSize: '0.62rem', fontWeight: 700, transition: 'opacity 0.1s',
  }
}

function FilterPill({ label, active, onClick, color }: { label: string; active: boolean; onClick: () => void; color?: string }) {
  return (
    <button onClick={onClick} style={{
      padding: '4px 11px', borderRadius: '9999px', border: 'none', cursor: 'pointer',
      background: active ? (color || 'hsl(25,82%,60%)') : 'rgba(255,255,255,0.07)',
      color: active ? '#fff' : 'hsl(140,7%,48%)',
      fontSize: '0.72rem', fontWeight: 600, whiteSpace: 'nowrap', transition: 'background 0.15s',
    }}>
      {label}
    </button>
  )
}
