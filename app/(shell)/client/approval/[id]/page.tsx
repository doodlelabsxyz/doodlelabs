'use client'

import { useState, useEffect, useRef } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/supabase/useUser'
import { getInitials, getAvatarColor } from '@/lib/utils'

gsap.registerPlugin(useGSAP)

type ContentRow = {
  id: string; title: string; type: string; status: string; caption: string | null
  notes: string | null; scheduled_date: string; platforms: string[]; assigned_to: string[]
  client_id: string
}
type ClientRow = { id: string; name: string; initials: string; brand_color: string }
type UserRow = { id: string; name: string; role: string }

const TYPE_CFG = {
  graphic:  { label: 'Graphic',  color: 'hsl(14,72%,62%)',  bg: 'hsl(14,72%,95%)' },
  video:    { label: 'Video',    color: 'hsl(40,95%,52%)',  bg: 'hsl(40,95%,93%)' },
  reel:     { label: 'Reel',     color: 'hsl(161,58%,44%)', bg: 'hsl(161,58%,92%)' },
  story:    { label: 'Story',    color: 'hsl(268,60%,68%)', bg: 'hsl(268,60%,93%)' },
}

const PLATFORM_ICONS: Record<string, string> = {
  instagram: 'IG', tiktok: 'TT', facebook: 'FB', linkedin: 'LI',
}

function formatDate(s: string) {
  return new Date(s + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

export default function ApprovalPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const supabase = createClient()
  const { user } = useUser()
  const containerRef = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)

  const [mounted,      setMounted]      = useState(false)
  const [cp,           setCp]           = useState<ContentRow | null>(null)
  const [client,       setClient]       = useState<ClientRow | null>(null)
  const [assignees,    setAssignees]    = useState<UserRow[]>([])
  const [decision,     setDecision]     = useState<null | 'approved' | 'revision'>(null)
  const [note,         setNote]         = useState('')
  const [showNoteBox,  setShowNoteBox]  = useState(false)
  const [submitted,    setSubmitted]    = useState(false)
  const [submitting,   setSubmitting]   = useState(false)

  useEffect(() => {
    setMounted(true)
    async function load() {
      const { data: piece } = await supabase
        .from('content_pieces')
        .select('id, title, type, status, caption, notes, scheduled_date, platforms, assigned_to, client_id')
        .eq('id', id)
        .single()
      if (!piece) return
      setCp(piece)

      const [clientRes, assigneesRes] = await Promise.all([
        supabase.from('clients').select('id, name, initials, brand_color').eq('id', piece.client_id).single(),
        piece.assigned_to?.length
          ? supabase.from('users').select('id, name, role').in('id', piece.assigned_to)
          : Promise.resolve({ data: [] }),
      ])
      if (clientRes.data) setClient(clientRes.data)
      if (assigneesRes.data) setAssignees(assigneesRes.data as UserRow[])
    }
    load()
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  useGSAP(() => {
    if (!mounted || !containerRef.current) return
    gsap.fromTo('.approval-section',
      { y: 16, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.3, stagger: 0.08, ease: 'power2.out', clearProps: 'all' }
    )
  }, { dependencies: [mounted, !!cp], scope: containerRef })

  useGSAP(() => {
    if (!submitted || !overlayRef.current) return
    gsap.fromTo(overlayRef.current,
      { opacity: 0, scale: 0.94 },
      { opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(1.3)' }
    )
  }, { dependencies: [submitted] })

  async function handleSubmit() {
    if (!decision || submitting) return
    setSubmitting(true)
    const { data: { user: authUser } } = await supabase.auth.getUser()

    if (decision === 'approved') {
      await supabase.from('content_pieces').update({ status: 'approved' }).eq('id', id)
    } else {
      await Promise.all([
        supabase.from('feedback_comments').insert({
          content_piece_id: id,
          author_id: authUser?.id,
          text: note,
          resolved: false,
          org_id: user?.org_id,
        }),
        supabase.from('content_pieces').update({ status: 'in-design' }).eq('id', id),
      ])
    }

    setSubmitted(true)
    setTimeout(() => router.push('/client'), 2200)
  }

  if (!mounted) return null

  const tc = cp ? (TYPE_CFG[cp.type as keyof typeof TYPE_CFG] ?? TYPE_CFG.graphic) : TYPE_CFG.graphic

  return (
    <main className="page-main" style={{ flex: 1, minWidth: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', background: 'hsl(42,30%,97%)', position: 'relative' }}>

      {/* Success overlay */}
      {submitted && (
        <div ref={overlayRef} style={{
          position: 'absolute', inset: 0, zIndex: 50,
          background: decision === 'approved' ? 'hsl(154,50%,97%)' : 'hsl(40,95%,97%)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: '16px', padding: '40px',
        }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: decision === 'approved' ? 'hsl(154,50%,40%)' : 'hsl(40,95%,52%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '2rem',
          }}>
            {decision === 'approved' ? '✓' : '✏️'}
          </div>
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'hsl(24,20%,11%)', marginBottom: '6px' }}>
              {decision === 'approved' ? 'Approved!' : 'Revision Requested'}
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'hsl(24,10%,44%)' }}>
              {decision === 'approved'
                ? 'Your team has been notified and will schedule this content.'
                : 'Your feedback has been sent to the team. They\'ll get back to you soon.'}
            </p>
          </div>
        </div>
      )}

      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <div style={{ background: '#0F1A14', padding: '14px 20px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button onClick={() => router.back()} style={{
          background: 'rgba(255,255,255,0.07)', border: 'none', cursor: 'pointer',
          width: 34, height: 34, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'hsl(140,7%,60%)', fontSize: '1rem', flexShrink: 0,
        }}>
          ←
        </button>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: '0.6rem', color: 'hsl(140,7%,48%)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Approval Request</p>
          <p style={{ fontSize: '0.95rem', fontWeight: 800, color: 'hsl(42,22%,88%)', lineHeight: 1.2 }}>{cp?.title ?? '…'}</p>
        </div>
        <div style={{
          width: 34, height: 34, borderRadius: '10px',
          background: client?.brand_color ?? 'hsl(25,82%,60%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 800, fontSize: '11px', color: '#fff', flexShrink: 0,
        }}>
          {client?.initials ?? '?'}
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────────────────────── */}
      {cp && (
        <div ref={containerRef} style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column', gap: '14px' }}>

          {/* Content preview card */}
          <div className="approval-section" style={{
            background: '#fff', borderRadius: '18px',
            border: '1px solid hsl(38,14%,90%)', overflow: 'hidden',
          }}>
            <div style={{ height: 4, background: tc.color }} />

            <div style={{
              height: 220,
              background: `linear-gradient(135deg, ${tc.color}22 0%, ${tc.color}08 100%)`,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              borderBottom: '1px solid hsl(38,14%,92%)',
            }}>
              <div style={{
                width: 72, height: 72, borderRadius: '18px',
                background: tc.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '2rem', marginBottom: '12px',
              }}>
                {cp.type === 'graphic' ? '🎨' : cp.type === 'video' ? '🎬' : cp.type === 'reel' ? '🎞️' : '📖'}
              </div>
              <p style={{ fontSize: '0.72rem', color: 'hsl(24,10%,52%)', fontWeight: 600 }}>{tc.label} Preview</p>
              <p style={{ fontSize: '0.62rem', color: 'hsl(24,10%,64%)' }}>Asset file would appear here</p>
            </div>

            <div style={{ padding: '14px' }}>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
                <span style={{ padding: '3px 9px', borderRadius: '99px', background: tc.bg, color: tc.color, fontSize: '0.65rem', fontWeight: 700 }}>
                  {tc.label}
                </span>
                {(cp.platforms ?? []).map(p => (
                  <span key={p} style={{ padding: '3px 9px', borderRadius: '99px', background: 'hsl(42,18%,93%)', color: 'hsl(24,10%,44%)', fontSize: '0.65rem', fontWeight: 700 }}>
                    {PLATFORM_ICONS[p] ?? p} {p.charAt(0).toUpperCase() + p.slice(1)}
                  </span>
                ))}
              </div>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'hsl(24,20%,11%)', lineHeight: 1.3, marginBottom: '4px' }}>{cp.title}</h2>
              <p style={{ fontSize: '0.7rem', color: 'hsl(24,10%,52%)' }}>Scheduled: {formatDate(cp.scheduled_date)}</p>
            </div>
          </div>

          {/* Caption */}
          {cp.caption && (
            <div className="approval-section" style={{
              background: '#fff', borderRadius: '16px', padding: '14px',
              border: '1px solid hsl(38,14%,90%)',
            }}>
              <p style={{ fontSize: '0.6rem', fontWeight: 700, color: 'hsl(24,8%,64%)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Caption</p>
              <p style={{ fontSize: '0.82rem', color: 'hsl(24,15%,20%)', lineHeight: 1.65 }}>{cp.caption}</p>
            </div>
          )}

          {/* Notes from team */}
          {cp.notes && (
            <div className="approval-section" style={{
              background: 'hsl(40,95%,97%)', borderRadius: '16px', padding: '12px 14px',
              border: '1px solid hsl(40,95%,86%)', display: 'flex', gap: '10px',
            }}>
              <span style={{ fontSize: '1rem', flexShrink: 0 }}>📝</span>
              <div>
                <p style={{ fontSize: '0.6rem', fontWeight: 700, color: 'hsl(35,50%,35%)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Team Note</p>
                <p style={{ fontSize: '0.78rem', color: 'hsl(35,30%,22%)', lineHeight: 1.5 }}>{cp.notes}</p>
              </div>
            </div>
          )}

          {/* Assigned team */}
          {assignees.length > 0 && (
            <div className="approval-section" style={{
              background: '#fff', borderRadius: '16px', padding: '12px 14px',
              border: '1px solid hsl(38,14%,90%)',
            }}>
              <p style={{ fontSize: '0.6rem', fontWeight: 700, color: 'hsl(24,8%,64%)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Created by</p>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {assignees.map(u => (
                  <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{
                      width: 26, height: 26, borderRadius: '50%', background: getAvatarColor(u.id),
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.56rem', fontWeight: 800, color: '#fff',
                    }}>
                      {getInitials(u.name)}
                    </div>
                    <div>
                      <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'hsl(24,15%,20%)' }}>{u.name}</p>
                      <p style={{ fontSize: '0.6rem', color: 'hsl(24,10%,52%)', textTransform: 'capitalize' }}>{u.role}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Decision section ─────────────────────────────────────────── */}
          <div className="approval-section" style={{
            background: '#fff', borderRadius: '16px', padding: '14px',
            border: '1px solid hsl(38,14%,90%)',
          }}>
            <p style={{ fontSize: '0.78rem', fontWeight: 800, color: 'hsl(24,20%,11%)', marginBottom: '12px' }}>Your decision</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
              <button
                onClick={() => { setDecision('approved'); setShowNoteBox(false) }}
                style={{
                  padding: '14px 12px', borderRadius: '14px', border: '2px solid',
                  borderColor: decision === 'approved' ? 'hsl(154,50%,40%)' : 'hsl(38,14%,88%)',
                  background: decision === 'approved' ? 'hsl(154,50%,96%)' : '#fff',
                  cursor: 'pointer', transition: 'all 0.15s cubic-bezier(0.34,1.56,0.64,1)',
                }}
              >
                <div style={{ fontSize: '1.4rem', marginBottom: '4px' }}>✓</div>
                <p style={{ fontSize: '0.78rem', fontWeight: 800, color: decision === 'approved' ? 'hsl(154,50%,30%)' : 'hsl(24,10%,44%)' }}>Approve</p>
                <p style={{ fontSize: '0.62rem', color: 'hsl(24,10%,56%)' }}>Looks great!</p>
              </button>
              <button
                onClick={() => { setDecision('revision'); setShowNoteBox(true) }}
                style={{
                  padding: '14px 12px', borderRadius: '14px', border: '2px solid',
                  borderColor: decision === 'revision' ? 'hsl(25,82%,55%)' : 'hsl(38,14%,88%)',
                  background: decision === 'revision' ? 'hsl(25,82%,97%)' : '#fff',
                  cursor: 'pointer', transition: 'all 0.15s cubic-bezier(0.34,1.56,0.64,1)',
                }}
              >
                <div style={{ fontSize: '1.4rem', marginBottom: '4px' }}>✏️</div>
                <p style={{ fontSize: '0.78rem', fontWeight: 800, color: decision === 'revision' ? 'hsl(25,50%,30%)' : 'hsl(24,10%,44%)' }}>Request Changes</p>
                <p style={{ fontSize: '0.62rem', color: 'hsl(24,10%,56%)' }}>Add feedback</p>
              </button>
            </div>

            {showNoteBox && (
              <div style={{ marginBottom: '12px' }}>
                <textarea
                  placeholder="What would you like changed? Be as specific as possible…"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  rows={3}
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: '10px',
                    border: '1.5px solid hsl(38,14%,85%)', background: 'hsl(42,25%,98%)',
                    fontSize: '0.8rem', color: 'hsl(24,15%,20%)', lineHeight: 1.6,
                    resize: 'none', fontFamily: 'inherit', outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={!decision || (decision === 'revision' && !note.trim()) || submitting}
              style={{
                width: '100%', padding: '14px', borderRadius: '12px', border: 'none', cursor: 'pointer',
                background: !decision ? 'hsl(38,14%,88%)' : decision === 'approved' ? 'hsl(154,50%,40%)' : 'hsl(25,82%,55%)',
                color: !decision ? 'hsl(24,10%,60%)' : '#fff',
                fontSize: '0.88rem', fontWeight: 800,
                transition: 'all 0.2s cubic-bezier(0.34,1.56,0.64,1)',
                opacity: (decision === 'revision' && !note.trim()) || submitting ? 0.5 : 1,
              }}
            >
              {!decision ? 'Select an option above' : decision === 'approved' ? 'Submit Approval ✓' : 'Send Feedback →'}
            </button>
          </div>

          <div style={{ height: 24 }} />
        </div>
      )}
    </main>
  )
}
