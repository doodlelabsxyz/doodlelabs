'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/supabase/useUser'
import type { ContentType, ContentStatus, Platform, Role, ContentScript, VideoScene, StoryFrame } from '@/lib/types'
import { getInitials, getAvatarColor } from '@/lib/utils'

gsap.registerPlugin(useGSAP)

type BriefTab = 'overview' | 'script' | 'feedback'

const TYPE_CFG: Record<ContentType, { bg: string; text: string; label: string; color: string }> = {
  graphic: { bg: 'hsl(14,72%,62%)',  text: '#fff',    label: 'Graphic', color: 'hsl(14,72%,62%)' },
  video:   { bg: 'hsl(40,95%,62%)',  text: '#3a2800', label: 'Video',   color: 'hsl(40,95%,52%)' },
  reel:    { bg: 'hsl(161,58%,50%)', text: '#fff',    label: 'Reel',    color: 'hsl(161,58%,44%)' },
  story:   { bg: 'hsl(268,60%,68%)', text: '#fff',    label: 'Story',   color: 'hsl(268,60%,68%)' },
}

const PLATFORMS: Platform[] = ['instagram', 'tiktok', 'facebook', 'linkedin']
const ASSIGNABLE_ROLES: Role[] = ['writer', 'designer', 'videographer', 'editor', 'poster']

const STATUS_OPTIONS: { value: ContentStatus; label: string }[] = [
  { value: 'planned',          label: 'Planned' },
  { value: 'brief-ready',      label: 'Brief Ready' },
  { value: 'in-design',        label: 'In Design' },
  { value: 'in-editing',       label: 'In Editing' },
  { value: 'ready-for-review', label: 'Ready for Review' },
  { value: 'approved',         label: 'Approved' },
  { value: 'scheduled',        label: 'Scheduled' },
]

type ClientRow = { id: string; name: string; brand_color: string; initials: string }
type UserRow   = { id: string; name: string; role: string }

type CommentLocal = {
  id: string; contentId: string; authorId: string; authorName: string; authorType: string
  text: string; createdAt: Date; resolved: boolean; parentId?: string
}

export default function BriefPage() {
  const router       = useRouter()
  const params       = useParams()
  const searchParams = useSearchParams()
  const formRef      = useRef<HTMLDivElement>(null)
  const overlayRef   = useRef<HTMLDivElement>(null)
  const { user }     = useUser()

  const id    = params.id as string
  const isNew = id === 'new'

  const qDate   = searchParams.get('date')   || ''
  const qClient = searchParams.get('client') || ''
  const qType   = (searchParams.get('type')  || 'graphic') as ContentType
  const qTitle  = searchParams.get('title')  || ''

  const [mounted,    setMounted]    = useState(false)
  const [tab,        setTab]        = useState<BriefTab>('overview')
  const [saved,      setSaved]      = useState(false)
  const [title,      setTitle]      = useState(isNew ? qTitle : '')
  const [type,       setType]       = useState<ContentType>(isNew ? qType : 'graphic')
  const [clientId,   setClientId]   = useState(isNew ? qClient : '')
  const [platforms,  setPlatforms]  = useState<Platform[]>(['instagram'])
  const [caption,    setCaption]    = useState('')
  const [brief,      setBrief]      = useState('')
  const [notes,      setNotes]      = useState('')
  const [status,     setStatus]     = useState<ContentStatus>('planned')
  const [assignedTo, setAssignedTo] = useState<string[]>([])
  const [schedDate,  setSchedDate]  = useState(isNew ? (qDate || new Date().toISOString().split('T')[0]) : '')
  const [script,     setScript]     = useState<ContentScript>({ contentId: id })
  const [scenes,     setScenes]     = useState<VideoScene[]>([])
  const [frames,     setFrames]     = useState<StoryFrame[]>([])
  const [comments,   setComments]   = useState<CommentLocal[]>([])
  const [newComment, setNewComment] = useState('')
  const [replyToId,  setReplyToId]  = useState<string | null>(null)
  const [replyText,  setReplyText]  = useState('')
  const [clients,    setClients]    = useState<ClientRow[]>([])
  const [users,      setUsers]      = useState<UserRow[]>([])

  useEffect(() => {
    async function load() {
      const supabase = createClient()

      if (isNew) {
        const [cliRes, usrRes] = await Promise.all([
          supabase.from('clients').select('id, name, brand_color, initials'),
          supabase.from('users').select('id, name, role').in('role', ASSIGNABLE_ROLES),
        ])
        const clis = cliRes.data || []
        setClients(clis)
        setUsers(usrRes.data || [])
        if (!qClient && clis.length > 0) setClientId(clis[0].id)
      } else {
        const [cpRes, scRes, fbRes, cliRes, usrRes] = await Promise.all([
          supabase.from('content_pieces').select('*').eq('id', id).single(),
          supabase.from('content_scripts').select('*').eq('content_id', id).maybeSingle(),
          supabase.from('feedback_comments').select('*').eq('content_id', id).order('created_at'),
          supabase.from('clients').select('id, name, brand_color, initials'),
          supabase.from('users').select('id, name, role').in('role', ASSIGNABLE_ROLES),
        ])

        if (cpRes.data) {
          const cp = cpRes.data
          setTitle(cp.title || '')
          setType(cp.type as ContentType)
          setClientId(cp.client_id || '')
          setPlatforms(cp.platforms || ['instagram'])
          setCaption(cp.caption || '')
          setBrief(cp.brief || '')
          setNotes(cp.notes || '')
          setStatus(cp.status as ContentStatus)
          setAssignedTo(cp.assigned_to || [])
          setSchedDate(cp.scheduled_date || '')
        }

        if (scRes.data) {
          const sc = scRes.data
          setScript({
            contentId: id,
            graphicCopy:      sc.graphic_copy      || undefined,
            hookLine:         sc.hook_line          || undefined,
            totalDuration:    sc.total_duration     || undefined,
            musicDirection:   sc.music_direction    || undefined,
            hashtagStrategy:  sc.hashtag_strategy   || undefined,
            altText:          sc.alt_text           || undefined,
            internalNotes:    sc.internal_notes     || undefined,
          })
          setScenes(sc.scenes || [])
          setFrames(sc.frames || [])
        }

        setComments((fbRes.data || []).map((f: Record<string, unknown>) => ({
          id: String(f.id), contentId: String(f.content_id),
          authorId: String(f.author_id), authorName: String(f.author_name),
          authorType: String(f.author_type), text: String(f.text),
          createdAt: new Date(String(f.created_at)), resolved: Boolean(f.resolved),
          parentId: f.parent_id ? String(f.parent_id) : undefined,
        })))

        setClients(cliRes.data || [])
        setUsers(usrRes.data || [])
      }
      setMounted(true)
    }
    load()
  }, [id, isNew]) // eslint-disable-line react-hooks/exhaustive-deps

  useGSAP(() => {
    if (!mounted || !formRef.current) return
    gsap.fromTo('.brief-section',
      { y: 12, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.35, stagger: 0.06, ease: 'power3.out', clearProps: 'all' }
    )
  }, { dependencies: [mounted, tab], scope: formRef })

  useGSAP(() => {
    if (!saved || !overlayRef.current) return
    gsap.fromTo(overlayRef.current,
      { opacity: 0, scale: 0.92 },
      { opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(1.4)' }
    )
  }, { dependencies: [saved] })

  if (!mounted) return null

  const client         = clients.find(c => c.id === clientId) || clients[0]
  const tc             = TYPE_CFG[type]
  const unreadFeedback = comments.filter(c => c.authorType === 'client' && !c.resolved).length

  function togglePlatform(p: Platform) {
    setPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])
  }
  function toggleAssign(uid: string) {
    setAssignedTo(prev => prev.includes(uid) ? prev.filter(x => x !== uid) : [...prev, uid])
  }

  async function handleSave() {
    const supabase = createClient()
    const orgId = user?.org_id
    const contentData = {
      client_id: clientId, title, type, platforms, caption, brief, notes,
      status, assigned_to: assignedTo, scheduled_date: schedDate,
      org_id: orgId,
    }
    const scriptData = {
      graphic_copy:     script.graphicCopy    || null,
      scenes:           scenes.length > 0     ? scenes  : null,
      frames:           frames.length > 0     ? frames  : null,
      hook_line:        script.hookLine       || null,
      total_duration:   script.totalDuration  || null,
      music_direction:  script.musicDirection || null,
      hashtag_strategy: script.hashtagStrategy || null,
      alt_text:         script.altText        || null,
      internal_notes:   script.internalNotes  || null,
    }

    if (isNew) {
      const { data: newContent, error: insertError } = await supabase
        .from('content_pieces').insert(contentData).select('id').single()
      if (insertError) { alert('Failed to save: ' + insertError.message); return }
      if (newContent) {
        await supabase.from('content_scripts').insert({ content_id: newContent.id, org_id: orgId, ...scriptData })

        // Auto-create tasks for every role assigned to this client
        const { data: team } = await supabase
          .from('client_team').select('role, user_id').eq('client_id', clientId)
        if (team && team.length > 0) {
          const ROLE_TASK: Record<string, string> = {
            writer:       `Write brief: ${title}`,
            designer:     `Design: ${title}`,
            videographer: `Film: ${title}`,
            editor:       `Edit: ${title}`,
            poster:       `Schedule & post: ${title}`,
          }
          await supabase.from('tasks').insert(
            team.map((t: { role: string; user_id: string }) => ({
              title:       ROLE_TASK[t.role] ?? `${t.role}: ${title}`,
              description: `Auto-generated task for "${title}"`,
              content_id:  newContent.id,
              client_id:   clientId,
              assigned_to: t.user_id,
              role:        t.role,
              due_date:    schedDate || new Date().toISOString().split('T')[0],
              status:      'pending',
              org_id:      orgId,
            }))
          )
        }
      }
    } else {
      await Promise.all([
        supabase.from('content_pieces').update(contentData).eq('id', id),
        supabase.from('content_scripts').upsert({ content_id: id, org_id: user?.org_id, ...scriptData }),
      ])
    }
    setSaved(true)
    setTimeout(() => { setSaved(false); router.back() }, 2000)
  }

  async function addComment() {
    if (!newComment.trim() || !user) return
    const supabase = createClient()
    const { data } = await supabase
      .from('feedback_comments')
      .insert({ content_id: id, author_id: user.id, author_name: user.name, author_type: 'team', text: newComment, resolved: false, org_id: user.org_id })
      .select('*')
      .single()
    if (data) {
      setComments(prev => [...prev, {
        id: data.id, contentId: data.content_id, authorId: data.author_id,
        authorName: data.author_name, authorType: data.author_type, text: data.text,
        createdAt: new Date(data.created_at), resolved: false,
      }])
    }
    setNewComment('')
  }

  async function addReply(parentId: string) {
    if (!replyText.trim() || !user) return
    const supabase = createClient()
    const { data } = await supabase
      .from('feedback_comments')
      .insert({ content_id: id, author_id: user.id, author_name: user.name, author_type: 'team', text: replyText, resolved: false, parent_id: parentId, org_id: user.org_id })
      .select('*')
      .single()
    if (data) {
      setComments(prev => [...prev, {
        id: data.id, contentId: data.content_id, authorId: data.author_id,
        authorName: data.author_name, authorType: data.author_type, text: data.text,
        createdAt: new Date(data.created_at), resolved: false, parentId,
      }])
    }
    setReplyText('')
    setReplyToId(null)
  }

  async function resolveComment(commentId: string) {
    setComments(prev => prev.map(c => c.id === commentId ? { ...c, resolved: true } : c))
    const supabase = createClient()
    await supabase.from('feedback_comments').update({ resolved: true }).eq('id', commentId)
  }

  function addScene() {
    setScenes(prev => [...prev, { sceneNumber: prev.length + 1, duration: '', visual: '', dialogue: '', text: '', music: '' }])
  }
  function updateScene(i: number, field: keyof VideoScene, val: string) {
    setScenes(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: val } : s))
  }
  function addFrame() {
    setFrames(prev => [...prev, { frameNumber: prev.length + 1, visual: '', text: '', cta: '' }])
  }
  function updateFrame(i: number, field: keyof StoryFrame, val: string) {
    setFrames(prev => prev.map((f, idx) => idx === i ? { ...f, [field]: val } : f))
  }

  const topLevelComments = comments.filter(c => !c.parentId)
  const getReplies = (parentId: string) => comments.filter(c => c.parentId === parentId)

  return (
    <main className="page-main" style={{ flex: 1, minWidth: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', background: 'hsl(42,30%,97%)', position: 'relative' }}>

      {saved && (
        <div ref={overlayRef} style={{
          position: 'fixed', inset: 0, zIndex: 100, background: 'hsl(154,50%,97%)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '14px',
        }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'hsl(154,50%,40%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', color: '#fff' }}>✓</div>
          <p style={{ fontSize: '1.2rem', fontWeight: 800, color: 'hsl(154,40%,20%)' }}>{isNew ? 'Brief created!' : 'Changes saved!'}</p>
          <p style={{ fontSize: '0.78rem', color: 'hsl(154,30%,40%)' }}>Returning to previous page…</p>
        </div>
      )}

      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <div style={{ background: '#0F1A14', padding: '12px 20px 0', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
          <button onClick={() => router.back()} style={{
            background: 'rgba(255,255,255,0.07)', border: 'none', cursor: 'pointer',
            width: 32, height: 32, borderRadius: '9px', color: 'hsl(140,7%,56%)', fontSize: '1rem',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>←</button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: '0.58rem', color: 'hsl(140,7%,46%)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {isNew ? 'New Content' : 'Content Brief'}
            </p>
            <p style={{ fontSize: '0.95rem', fontWeight: 800, color: 'hsl(42,22%,86%)', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {title || 'Untitled'}
            </p>
          </div>
          <div style={{ padding: '3px 10px', borderRadius: '99px', background: tc.bg + '30', border: `1px solid ${tc.bg}60` }}>
            <span style={{ fontSize: '0.65rem', fontWeight: 700, color: tc.bg }}>{tc.label}</span>
          </div>
        </div>

        <div style={{ display: 'flex' }}>
          {([
            { key: 'overview', label: 'Overview' },
            { key: 'script',   label: 'Script & Copy' },
            { key: 'feedback', label: `Feedback${unreadFeedback > 0 ? ` (${unreadFeedback})` : ''}` },
          ] as const).map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              padding: '9px 16px', border: 'none', background: 'transparent', cursor: 'pointer',
              fontSize: '0.75rem', fontWeight: tab === t.key ? 700 : 500,
              color: tab === t.key ? tc.color : 'hsl(140,7%,46%)',
              borderBottom: tab === t.key ? `2px solid ${tc.color}` : '2px solid transparent',
              transition: 'all 0.15s', marginBottom: '-1px',
            }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab content ──────────────────────────────────────────────────── */}
      <div ref={formRef} style={{ flex: 1, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>

        {/* ══ OVERVIEW TAB ═════════════════════════════════════════════════ */}
        {tab === 'overview' && (
          <>
            <div className="brief-section" style={sectionStyle}>
              <SectionLabel>Content Details</SectionLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div>
                  <FieldLabel>Client</FieldLabel>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {clients.map(c => (
                      <button key={c.id} onClick={() => setClientId(c.id)} style={{
                        padding: '5px 12px', borderRadius: '99px', border: '1.5px solid',
                        borderColor: clientId === c.id ? c.brand_color : 'hsl(38,14%,86%)',
                        background: clientId === c.id ? c.brand_color : '#fff',
                        color: clientId === c.id ? '#fff' : 'hsl(24,10%,44%)',
                        fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s',
                      }}>
                        {c.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <FieldLabel>Content Type</FieldLabel>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {(['graphic','video','reel','story'] as ContentType[]).map(t => {
                      const cfg = TYPE_CFG[t]
                      return (
                        <button key={t} onClick={() => setType(t)} style={{
                          padding: '5px 14px', borderRadius: '99px', border: '1.5px solid',
                          borderColor: type === t ? cfg.bg : 'hsl(38,14%,86%)',
                          background: type === t ? cfg.bg : '#fff',
                          color: type === t ? cfg.text : 'hsl(24,10%,44%)',
                          fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s',
                        }}>
                          {cfg.label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div>
                  <FieldLabel>Title</FieldLabel>
                  <input placeholder="Give this content piece a name…" value={title} onChange={e => setTitle(e.target.value)} style={inputStyle} />
                </div>

                <div>
                  <FieldLabel>Scheduled Date</FieldLabel>
                  <input type="date" value={schedDate} onChange={e => setSchedDate(e.target.value)} style={inputStyle} />
                </div>
              </div>
            </div>

            <div className="brief-section" style={sectionStyle}>
              <SectionLabel>Platforms</SectionLabel>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {PLATFORMS.map(p => (
                  <button key={p} onClick={() => togglePlatform(p)} style={{
                    padding: '5px 14px', borderRadius: '99px', border: '1.5px solid',
                    borderColor: platforms.includes(p) ? 'hsl(200,82%,55%)' : 'hsl(38,14%,86%)',
                    background: platforms.includes(p) ? 'hsl(200,82%,93%)' : '#fff',
                    color: platforms.includes(p) ? 'hsl(200,82%,36%)' : 'hsl(24,10%,44%)',
                    fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', textTransform: 'capitalize', transition: 'all 0.15s',
                  }}>
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div className="brief-section" style={sectionStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <SectionLabel noMargin>Caption</SectionLabel>
                <span style={{ fontSize: '0.6rem', color: caption.length > 2000 ? 'hsl(4,72%,50%)' : 'hsl(24,10%,54%)' }}>
                  {caption.length}/2200
                </span>
              </div>
              <textarea placeholder="Write the full post caption here — hooks, body, CTA, hashtags…" value={caption} onChange={e => setCaption(e.target.value)} rows={5} style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.65 }} />
            </div>

            <div className="brief-section" style={sectionStyle}>
              <SectionLabel>Creative Brief</SectionLabel>
              <textarea placeholder="Describe the concept, mood, visual direction, goals for this piece…" value={brief} onChange={e => setBrief(e.target.value)} rows={4} style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.65 }} />
            </div>

            <div className="brief-section" style={sectionStyle}>
              <SectionLabel>Internal Notes</SectionLabel>
              <textarea placeholder="Deadlines, client preferences, reference links, anything the team should know…" value={notes} onChange={e => setNotes(e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.65 }} />
            </div>

            <div className="brief-section" style={sectionStyle}>
              <SectionLabel>Assign Team</SectionLabel>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {users.map(u => {
                  const assigned = assignedTo.includes(u.id)
                  return (
                    <button key={u.id} onClick={() => toggleAssign(u.id)} style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      padding: '5px 10px 5px 5px', borderRadius: '99px', border: '1.5px solid',
                      borderColor: assigned ? getAvatarColor(u.id) : 'hsl(38,14%,86%)',
                      background: assigned ? getAvatarColor(u.id) + '18' : '#fff',
                      cursor: 'pointer', transition: 'all 0.15s',
                    }}>
                      <div style={{ width: 22, height: 22, borderRadius: '50%', background: getAvatarColor(u.id), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.52rem', fontWeight: 800, color: '#fff' }}>
                        {getInitials(u.name)}
                      </div>
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, color: assigned ? getAvatarColor(u.id) : 'hsl(24,10%,44%)' }}>
                        {u.name.split(' ')[0]}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="brief-section" style={sectionStyle}>
              <SectionLabel>Status</SectionLabel>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {STATUS_OPTIONS.map(opt => (
                  <button key={opt.value} onClick={() => setStatus(opt.value)} style={{
                    padding: '5px 12px', borderRadius: '99px', border: '1.5px solid',
                    borderColor: status === opt.value ? 'hsl(25,82%,58%)' : 'hsl(38,14%,86%)',
                    background: status === opt.value ? 'hsl(25,82%,94%)' : '#fff',
                    color: status === opt.value ? 'hsl(25,60%,36%)' : 'hsl(24,10%,44%)',
                    fontSize: '0.7rem', fontWeight: status === opt.value ? 700 : 500, cursor: 'pointer', transition: 'all 0.12s',
                  }}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ height: 80 }} />
          </>
        )}

        {/* ══ SCRIPT & COPY TAB ════════════════════════════════════════════ */}
        {tab === 'script' && (
          <>
            {type === 'graphic' && (
              <>
                <div className="brief-section" style={sectionStyle}>
                  <SectionLabel>Copy & Headlines</SectionLabel>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div>
                      <FieldLabel>Headline *</FieldLabel>
                      <input placeholder="The main headline — big, bold, immediate" value={script.graphicCopy?.headline || ''} onChange={e => setScript(s => ({ ...s, graphicCopy: { ...s.graphicCopy, headline: e.target.value, bodyText: s.graphicCopy?.bodyText || '', cta: s.graphicCopy?.cta || '', visualDirection: s.graphicCopy?.visualDirection || '' } }))} style={inputStyle} />
                    </div>
                    <div>
                      <FieldLabel>Subheadline</FieldLabel>
                      <input placeholder="Supporting line under the headline" value={script.graphicCopy?.subheadline || ''} onChange={e => setScript(s => ({ ...s, graphicCopy: { ...s.graphicCopy!, subheadline: e.target.value } }))} style={inputStyle} />
                    </div>
                    <div>
                      <FieldLabel>Body Text *</FieldLabel>
                      <textarea placeholder="Full body copy that appears on the graphic — if any" value={script.graphicCopy?.bodyText || ''} onChange={e => setScript(s => ({ ...s, graphicCopy: { ...s.graphicCopy!, bodyText: e.target.value } }))} rows={3} style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.65 }} />
                    </div>
                    <div>
                      <FieldLabel>Call to Action</FieldLabel>
                      <input placeholder="e.g. Shop now → / Link in bio / Swipe" value={script.graphicCopy?.cta || ''} onChange={e => setScript(s => ({ ...s, graphicCopy: { ...s.graphicCopy!, cta: e.target.value } }))} style={inputStyle} />
                    </div>
                  </div>
                </div>

                <div className="brief-section" style={sectionStyle}>
                  <SectionLabel>Visual Direction</SectionLabel>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div>
                      <FieldLabel>Visual Description *</FieldLabel>
                      <textarea placeholder="Describe exactly what the graphic should look like — layout, imagery, composition, style…" value={script.graphicCopy?.visualDirection || ''} onChange={e => setScript(s => ({ ...s, graphicCopy: { ...s.graphicCopy!, visualDirection: e.target.value } }))} rows={4} style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.65 }} />
                    </div>
                    <div>
                      <FieldLabel>Color Notes</FieldLabel>
                      <input placeholder="Background color, text color, brand palette guidance…" value={script.graphicCopy?.colorNotes || ''} onChange={e => setScript(s => ({ ...s, graphicCopy: { ...s.graphicCopy!, colorNotes: e.target.value } }))} style={inputStyle} />
                    </div>
                    <div>
                      <FieldLabel>Mood / Reference</FieldLabel>
                      <input placeholder="Reference brands, links, image style to aim for…" value={script.graphicCopy?.moodRef || ''} onChange={e => setScript(s => ({ ...s, graphicCopy: { ...s.graphicCopy!, moodRef: e.target.value } }))} style={inputStyle} />
                    </div>
                  </div>
                </div>
              </>
            )}

            {(type === 'video' || type === 'reel') && (
              <>
                <div className="brief-section" style={sectionStyle}>
                  <SectionLabel>Video Overview</SectionLabel>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div>
                      <FieldLabel>Hook Line *</FieldLabel>
                      <input placeholder="The first sentence / text that stops the scroll — must hook in 1s" value={script.hookLine || ''} onChange={e => setScript(s => ({ ...s, hookLine: e.target.value }))} style={inputStyle} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <div>
                        <FieldLabel>Total Duration</FieldLabel>
                        <input placeholder="e.g. 0:28" value={script.totalDuration || ''} onChange={e => setScript(s => ({ ...s, totalDuration: e.target.value }))} style={inputStyle} />
                      </div>
                      <div>
                        <FieldLabel>Music Direction</FieldLabel>
                        <input placeholder="Mood, BPM, reference track…" value={script.musicDirection || ''} onChange={e => setScript(s => ({ ...s, musicDirection: e.target.value }))} style={inputStyle} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="brief-section" style={sectionStyle}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <SectionLabel noMargin>Scene Breakdown</SectionLabel>
                    <button onClick={addScene} style={{ padding: '4px 10px', borderRadius: '7px', border: 'none', background: tc.bg + '30', color: tc.color, fontSize: '0.68rem', fontWeight: 700, cursor: 'pointer' }}>
                      + Add Scene
                    </button>
                  </div>
                  {scenes.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '24px', color: 'hsl(24,10%,56%)', fontSize: '0.75rem' }}>
                      No scenes yet — click "Add Scene" to build your script
                    </div>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {scenes.map((scene, i) => (
                      <div key={i} style={{ background: 'hsl(42,30%,97%)', borderRadius: '12px', padding: '12px', border: '1px solid hsl(38,14%,88%)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                          <div style={{ width: 24, height: 24, borderRadius: '6px', background: tc.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 800, color: tc.text, flexShrink: 0 }}>
                            {i + 1}
                          </div>
                          <input placeholder="Duration (e.g. 0:00–0:03)" value={scene.duration} onChange={e => updateScene(i, 'duration', e.target.value)} style={{ ...inputStyle, flex: 1, padding: '4px 8px', fontSize: '0.7rem' }} />
                          <button onClick={() => setScenes(prev => prev.filter((_, idx) => idx !== i))} style={{ width: 24, height: 24, borderRadius: '6px', border: 'none', background: 'hsl(4,72%,92%)', color: 'hsl(4,72%,46%)', cursor: 'pointer', fontSize: '0.75rem', flexShrink: 0 }}>×</button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <div>
                            <FieldLabel>Visual (what camera shows)</FieldLabel>
                            <textarea placeholder="Describe what's on screen…" value={scene.visual} onChange={e => updateScene(i, 'visual', e.target.value)} rows={2} style={{ ...inputStyle, resize: 'none', fontSize: '0.75rem', lineHeight: 1.5 }} />
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                            <div>
                              <FieldLabel>Dialogue / Voiceover</FieldLabel>
                              <input placeholder="Spoken words…" value={scene.dialogue || ''} onChange={e => updateScene(i, 'dialogue', e.target.value)} style={{ ...inputStyle, fontSize: '0.72rem' }} />
                            </div>
                            <div>
                              <FieldLabel>On-screen text</FieldLabel>
                              <input placeholder="Text overlay…" value={scene.text || ''} onChange={e => updateScene(i, 'text', e.target.value)} style={{ ...inputStyle, fontSize: '0.72rem' }} />
                            </div>
                          </div>
                          <div>
                            <FieldLabel>Music cue</FieldLabel>
                            <input placeholder="e.g. Drop, build, quiet, upbeat…" value={scene.music || ''} onChange={e => updateScene(i, 'music', e.target.value)} style={{ ...inputStyle, fontSize: '0.72rem' }} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {type === 'story' && (
              <div className="brief-section" style={sectionStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <SectionLabel noMargin>Story Frames</SectionLabel>
                  <button onClick={addFrame} style={{ padding: '4px 10px', borderRadius: '7px', border: 'none', background: tc.bg + '30', color: tc.color, fontSize: '0.68rem', fontWeight: 700, cursor: 'pointer' }}>
                    + Add Frame
                  </button>
                </div>
                {frames.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '24px', color: 'hsl(24,10%,56%)', fontSize: '0.75rem' }}>
                    No frames yet — stories are frame-by-frame sequences
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {frames.map((frame, i) => (
                    <div key={i} style={{ background: 'hsl(42,30%,97%)', borderRadius: '12px', padding: '12px', border: '1px solid hsl(38,14%,88%)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <div style={{ width: 24, height: 24, borderRadius: '6px', background: tc.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 800, color: tc.text, flexShrink: 0 }}>
                          {i + 1}
                        </div>
                        <span style={{ fontSize: '0.68rem', fontWeight: 600, color: 'hsl(24,10%,44%)' }}>Frame {i + 1} of {frames.length}</span>
                        <button onClick={() => setFrames(prev => prev.filter((_, idx) => idx !== i))} style={{ width: 22, height: 22, marginLeft: 'auto', borderRadius: '5px', border: 'none', background: 'hsl(4,72%,92%)', color: 'hsl(4,72%,46%)', cursor: 'pointer', fontSize: '0.75rem', flexShrink: 0 }}>×</button>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div>
                          <FieldLabel>Visual</FieldLabel>
                          <textarea placeholder="What does this frame look like?" value={frame.visual} onChange={e => updateFrame(i, 'visual', e.target.value)} rows={2} style={{ ...inputStyle, resize: 'none', fontSize: '0.75rem', lineHeight: 1.5 }} />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                          <div>
                            <FieldLabel>Text on frame</FieldLabel>
                            <input placeholder="Overlay text…" value={frame.text || ''} onChange={e => updateFrame(i, 'text', e.target.value)} style={{ ...inputStyle, fontSize: '0.72rem' }} />
                          </div>
                          <div>
                            <FieldLabel>CTA / Swipe</FieldLabel>
                            <input placeholder="e.g. Swipe up, tap link" value={frame.cta || ''} onChange={e => updateFrame(i, 'cta', e.target.value)} style={{ ...inputStyle, fontSize: '0.72rem' }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="brief-section" style={sectionStyle}>
              <SectionLabel>Distribution</SectionLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div>
                  <FieldLabel>Hashtag Strategy</FieldLabel>
                  <textarea placeholder="#brandhashtag #niche1 #niche2 #broad — aim for 20–30 for Instagram, 3–5 for TikTok" value={script.hashtagStrategy || ''} onChange={e => setScript(s => ({ ...s, hashtagStrategy: e.target.value }))} rows={2} style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }} />
                </div>
                <div>
                  <FieldLabel>Alt Text (accessibility)</FieldLabel>
                  <input placeholder="Describe the image/video for visually impaired users" value={script.altText || ''} onChange={e => setScript(s => ({ ...s, altText: e.target.value }))} style={inputStyle} />
                </div>
                <div>
                  <FieldLabel>Script Notes</FieldLabel>
                  <textarea placeholder="Any additional notes for the script or copy team…" value={script.internalNotes || ''} onChange={e => setScript(s => ({ ...s, internalNotes: e.target.value }))} rows={2} style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }} />
                </div>
              </div>
            </div>

            <div style={{ height: 80 }} />
          </>
        )}

        {/* ══ FEEDBACK TAB ═════════════════════════════════════════════════ */}
        {tab === 'feedback' && (
          <>
            <div className="brief-section" style={sectionStyle}>
              <SectionLabel>Add Note</SectionLabel>
              <textarea placeholder="Leave a note for the team or response to client feedback…" value={newComment} onChange={e => setNewComment(e.target.value)} rows={3} style={{ ...inputStyle, resize: 'none', lineHeight: 1.6, marginBottom: '8px' }} />
              <button onClick={addComment} disabled={!newComment.trim()} style={{
                padding: '7px 14px', borderRadius: '9px', border: 'none', cursor: newComment.trim() ? 'pointer' : 'default',
                background: newComment.trim() ? 'hsl(200,82%,44%)' : 'hsl(42,18%,88%)',
                color: newComment.trim() ? '#fff' : 'hsl(24,10%,58%)',
                fontSize: '0.75rem', fontWeight: 700, transition: 'background 0.15s',
              }}>
                Post note →
              </button>
            </div>

            {topLevelComments.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 24px', color: 'hsl(24,10%,54%)' }}>
                <div style={{ fontSize: '1.8rem', marginBottom: '8px' }}>💬</div>
                <p style={{ fontWeight: 700, fontSize: '0.88rem', marginBottom: '4px' }}>No feedback yet</p>
                <p style={{ fontSize: '0.72rem' }}>Client feedback and team notes will appear here.</p>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {topLevelComments.map(comment => {
                const isClient  = comment.authorType === 'client'
                const replies   = getReplies(comment.id)
                const isReplying = replyToId === comment.id

                return (
                  <div key={comment.id} className="brief-section" style={{
                    background: comment.resolved ? '#fff' : isClient ? 'hsl(25,82%,98%)' : 'hsl(200,82%,98%)',
                    borderRadius: '14px', border: `1.5px solid ${comment.resolved ? 'hsl(38,14%,90%)' : isClient ? 'hsl(25,82%,80%)' : 'hsl(200,82%,80%)'}`,
                    overflow: 'hidden', opacity: comment.resolved ? 0.7 : 1,
                  }}>
                    <div style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '8px' }}>
                        <div style={{
                          width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                          background: isClient ? (client?.brand_color || 'hsl(25,82%,60%)') : 'hsl(200,88%,65%)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 800, color: '#fff',
                        }}>
                          {comment.authorName.split(' ').map(w => w[0]).join('').slice(0,2)}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '1px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'hsl(24,15%,15%)' }}>{comment.authorName}</span>
                            <span style={{ padding: '1px 6px', borderRadius: '99px', fontSize: '0.56rem', fontWeight: 700, background: isClient ? 'hsl(25,82%,90%)' : 'hsl(200,82%,90%)', color: isClient ? 'hsl(25,60%,36%)' : 'hsl(200,82%,36%)' }}>
                              {isClient ? 'Client' : 'Team'}
                            </span>
                            {comment.resolved && <span style={{ fontSize: '0.56rem', color: 'hsl(154,50%,40%)', fontWeight: 700 }}>✓ Resolved</span>}
                          </div>
                          <span style={{ fontSize: '0.6rem', color: 'hsl(24,10%,54%)' }}>
                            {comment.createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                      </div>
                      <p style={{ fontSize: '0.8rem', color: 'hsl(24,10%,18%)', lineHeight: 1.65, marginBottom: '8px' }}>{comment.text}</p>

                      {!comment.resolved && (
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button onClick={() => setReplyToId(isReplying ? null : comment.id)} style={{
                            padding: '3px 9px', borderRadius: '6px', border: `1px solid ${isClient ? 'hsl(25,82%,78%)' : 'hsl(200,82%,78%)'}`,
                            background: 'rgba(255,255,255,0.7)', color: isClient ? 'hsl(25,60%,38%)' : 'hsl(200,82%,38%)',
                            fontSize: '0.65rem', fontWeight: 700, cursor: 'pointer',
                          }}>
                            ↩ Reply
                          </button>
                          <button onClick={() => resolveComment(comment.id)} style={{
                            padding: '3px 9px', borderRadius: '6px', border: '1px solid hsl(154,50%,72%)',
                            background: 'rgba(255,255,255,0.7)', color: 'hsl(154,50%,36%)',
                            fontSize: '0.65rem', fontWeight: 700, cursor: 'pointer',
                          }}>
                            ✓ Resolve
                          </button>
                        </div>
                      )}
                    </div>

                    {replies.length > 0 && (
                      <div style={{ borderTop: '1px solid hsl(38,14%,90%)', padding: '10px 14px', background: 'rgba(255,255,255,0.5)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {replies.map(r => (
                          <div key={r.id} style={{ display: 'flex', gap: '8px' }}>
                            <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'hsl(200,88%,65%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.5rem', fontWeight: 800, color: '#fff', flexShrink: 0 }}>
                              {r.authorName.split(' ').map(w => w[0]).join('').slice(0,2)}
                            </div>
                            <div>
                              <p style={{ fontSize: '0.68rem', fontWeight: 700, color: 'hsl(24,15%,22%)', marginBottom: '2px' }}>{r.authorName}</p>
                              <p style={{ fontSize: '0.75rem', color: 'hsl(24,10%,22%)', lineHeight: 1.6 }}>{r.text}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {isReplying && (
                      <div style={{ borderTop: '1px solid hsl(38,14%,90%)', padding: '10px 14px', background: 'rgba(255,255,255,0.6)' }}>
                        <textarea autoFocus placeholder="Write a reply…" value={replyText} onChange={e => setReplyText(e.target.value)} rows={2} style={{ ...inputStyle, resize: 'none', fontSize: '0.75rem', lineHeight: 1.5, marginBottom: '6px' }} />
                        <button onClick={() => addReply(comment.id)} disabled={!replyText.trim()} style={{
                          padding: '5px 12px', borderRadius: '7px', border: 'none', cursor: 'pointer',
                          background: replyText.trim() ? 'hsl(200,82%,44%)' : 'hsl(42,18%,88%)',
                          color: replyText.trim() ? '#fff' : 'hsl(24,10%,58%)',
                          fontSize: '0.68rem', fontWeight: 700,
                        }}>
                          Send →
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <div style={{ height: 40 }} />
          </>
        )}
      </div>

      {tab !== 'feedback' && (
        <div style={{
          position: 'sticky', bottom: 0, left: 0, right: 0,
          background: 'linear-gradient(to top, hsl(42,30%,97%) 70%, transparent)',
          padding: '16px 20px 20px', flexShrink: 0,
        }}>
          <button onClick={handleSave} style={{
            width: '100%', padding: '14px', borderRadius: '14px', border: 'none', cursor: 'pointer',
            background: 'hsl(25,82%,58%)', color: '#fff', fontSize: '0.9rem', fontWeight: 800,
            boxShadow: '0 4px 20px hsl(25,82%,58%)40',
            transition: 'transform 0.15s cubic-bezier(0.34,1.56,0.64,1)',
          }}
            onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.02)')}
            onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.transform = '')}
          >
            {isNew ? '✓ Create Brief' : '✓ Save Changes'}
          </button>
        </div>
      )}
    </main>
  )
}

// ── Style helpers ──────────────────────────────────────────────────────────────

const sectionStyle: React.CSSProperties = {
  background: '#fff', borderRadius: '16px', border: '1px solid hsl(38,14%,90%)', padding: '14px',
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', borderRadius: '10px',
  border: '1.5px solid hsl(38,14%,86%)', background: 'hsl(42,30%,99%)',
  fontSize: '0.82rem', color: 'hsl(24,15%,18%)', fontFamily: 'inherit',
  outline: 'none', boxSizing: 'border-box',
}

function SectionLabel({ children, noMargin }: { children: React.ReactNode; noMargin?: boolean }) {
  return (
    <p style={{ fontSize: '0.65rem', fontWeight: 800, color: 'hsl(24,8%,44%)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: noMargin ? 0 : '10px' }}>
      {children}
    </p>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: '0.6rem', fontWeight: 700, color: 'hsl(24,10%,52%)', marginBottom: '4px' }}>
      {children}
    </p>
  )
}
