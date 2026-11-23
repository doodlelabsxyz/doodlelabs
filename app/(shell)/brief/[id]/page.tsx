'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'

import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { StatusBadge } from '@/components/ui/status-badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { UserAvatar } from '@/components/ui/user-avatar'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/supabase/useUser'
import type {
  ContentScript,
  ContentStatus,
  ContentType,
  Platform,
  Role,
  StoryFrame,
  VideoScene,
} from '@/lib/types'
import { cn } from '@/lib/utils'
import { TypeIcon } from '@/components/ui/type-icon'
import { CONTENT_TYPE_STYLE } from '@/lib/color-map'

gsap.registerPlugin(useGSAP)

type BriefTab = 'overview' | 'script' | 'feedback'

const PLATFORMS: Platform[] = ['instagram', 'tiktok', 'facebook', 'linkedin']
const ASSIGNABLE_ROLES: Role[] = ['writer', 'designer', 'videographer', 'editor', 'poster']

const STATUS_OPTIONS: { value: ContentStatus; label: string }[] = [
  { value: 'planned', label: 'Planned' },
  { value: 'brief-ready', label: 'Brief Ready' },
  { value: 'in-design', label: 'In Design' },
  { value: 'in-editing', label: 'In Editing' },
  { value: 'ready-for-review', label: 'Ready for Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'scheduled', label: 'Scheduled' },
]

type ClientRow = { id: string; name: string; brand_color: string; initials: string }
type UserRow = { id: string; name: string; role: string }
type DeliverableRow = { id: string; file_name: string; file_size: string | null; storage_path: string | null; url?: string }

const UPLOAD_ROLES = ['admin', 'designer', 'videographer', 'editor']
const isImage = (name: string) => /\.(png|jpe?g|webp|gif|svg)$/i.test(name)

type CommentLocal = {
  id: string
  contentId: string
  authorId: string
  authorName: string
  authorType: string
  text: string
  createdAt: Date
  resolved: boolean
  parentId?: string
}

function FieldBlock({
  label,
  action,
  children,
}: {
  label: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <Label className="text-xs font-semibold text-muted-foreground">{label}</Label>
        {action}
      </div>
      {children}
    </div>
  )
}

function SectionShell({
  title,
  description,
  action,
  children,
}: {
  title: string
  description?: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <Card data-animate="brief-section">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
        {action && <CardAction>{action}</CardAction>}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">{children}</CardContent>
    </Card>
  )
}

export default function BriefPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const formRef = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const { user } = useUser()

  const id = params.id as string
  const isNew = id === 'new'

  // This is the internal editor (script notes, task assignment, full brief) — not
  // client-safe. A client's RLS grants SELECT on their own content_pieces at any
  // status, so nothing stops them loading this route directly by URL; it's only
  // absent from their nav. Redirect to the client-safe approval view instead.
  useEffect(() => {
    if (user?.role === 'client') router.replace(isNew ? '/client' : `/client/approval/${id}`)
  }, [user, router, id, isNew])

  const qDate = searchParams.get('date') || ''
  const qClient = searchParams.get('client') || ''
  const qType = (searchParams.get('type') || 'graphic') as ContentType
  const qTitle = searchParams.get('title') || ''

  const [mounted, setMounted] = useState(false)
  const [tab, setTab] = useState<BriefTab>('overview')
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saving, setSaving] = useState(false)
  const [title, setTitle] = useState(isNew ? qTitle : '')
  const [type, setType] = useState<ContentType>(isNew ? qType : 'graphic')
  const [clientId, setClientId] = useState(isNew ? qClient : '')
  const [platforms, setPlatforms] = useState<Platform[]>(['instagram'])
  const [caption, setCaption] = useState('')
  const [brief, setBrief] = useState('')
  const [notes, setNotes] = useState('')
  const [status, setStatus] = useState<ContentStatus>('planned')
  const [assignedTo, setAssignedTo] = useState<string[]>([])
  const [schedDate, setSchedDate] = useState(isNew ? qDate || new Date().toISOString().split('T')[0] : '')
  const [script, setScript] = useState<ContentScript>({ contentId: id })
  const [scenes, setScenes] = useState<VideoScene[]>([])
  const [frames, setFrames] = useState<StoryFrame[]>([])
  const [comments, setComments] = useState<CommentLocal[]>([])
  const [newComment, setNewComment] = useState('')
  const [replyToId, setReplyToId] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [clients, setClients] = useState<ClientRow[]>([])
  const [users, setUsers] = useState<UserRow[]>([])
  const [deliverables, setDeliverables] = useState<DeliverableRow[]>([])

  useEffect(() => {
    async function load() {
      const supabase = createClient()

      if (isNew) {
        const [cliRes, usrRes] = await Promise.all([
          supabase.from('clients').select('id, name, brand_color, initials'),
          // Plain `users` SELECT is locked to self+admin (protects salary/email/phone),
          // which silently returns nothing for a non-admin creator/editor (writer,
          // designer, etc.) — the assignee picker would render empty. Go through the
          // safe org-wide name/role lookup instead. See get_org_users_safe().
          supabase.rpc('get_org_users_safe').in('role', ASSIGNABLE_ROLES),
        ])
        const nextClients = cliRes.data || []
        setClients(nextClients)
        setUsers(usrRes.data || [])
        if (!qClient && nextClients.length > 0) setClientId(nextClients[0].id)
      } else {
        const [cpRes, scRes, fbRes, cliRes, usrRes] = await Promise.all([
          supabase.from('content_pieces').select('*').eq('id', id).single(),
          supabase.from('content_scripts').select('*').eq('content_id', id).maybeSingle(),
          supabase.from('feedback_comments').select('*').eq('content_id', id).order('created_at'),
          supabase.from('clients').select('id, name, brand_color, initials'),
          // Plain `users` SELECT is locked to self+admin (protects salary/email/phone),
          // which silently returns nothing for a non-admin creator/editor (writer,
          // designer, etc.) — the assignee picker would render empty. Go through the
          // safe org-wide name/role lookup instead. See get_org_users_safe().
          supabase.rpc('get_org_users_safe').in('role', ASSIGNABLE_ROLES),
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
            graphicCopy: sc.graphic_copy || undefined,
            hookLine: sc.hook_line || undefined,
            totalDuration: sc.total_duration || undefined,
            musicDirection: sc.music_direction || undefined,
            hashtagStrategy: sc.hashtag_strategy || undefined,
            altText: sc.alt_text || undefined,
            internalNotes: sc.internal_notes || undefined,
          })
          setScenes(sc.scenes || [])
          setFrames(sc.frames || [])
        }

        setComments(
          (fbRes.data || []).map((f: Record<string, unknown>) => ({
            id: String(f.id),
            contentId: String(f.content_id),
            authorId: String(f.author_id),
            authorName: String(f.author_name),
            authorType: String(f.author_type),
            text: String(f.text),
            createdAt: new Date(String(f.created_at)),
            resolved: Boolean(f.resolved),
            parentId: f.parent_id ? String(f.parent_id) : undefined,
          }))
        )

        setClients(cliRes.data || [])
        setUsers(usrRes.data || [])
      }

      setMounted(true)
    }

    load()
  }, [id, isNew, qClient])

  useEffect(() => {
    if (isNew) return
    let cancelled = false
    async function loadDeliverables() {
      const supabase = createClient()
      const { data } = await supabase
        .from('assets')
        .select('id, file_name, file_size, storage_path')
        .eq('content_id', id)
        .order('uploaded_at', { ascending: false })
      const rows = (data || []) as DeliverableRow[]
      const paths = rows.map(a => a.storage_path).filter((p): p is string => !!p)
      const urls: Record<string, string> = {}
      if (paths.length) {
        const { data: signed } = await supabase.storage.from('assets').createSignedUrls(paths, 3600)
        signed?.forEach(sg => {
          if (sg.path && sg.signedUrl) urls[sg.path] = sg.signedUrl
        })
      }
      if (!cancelled) {
        setDeliverables(rows.map(a => ({ ...a, url: a.storage_path ? urls[a.storage_path] : undefined })))
      }
    }
    void loadDeliverables()
    return () => {
      cancelled = true
    }
  }, [id, isNew])

  useGSAP(
    () => {
      if (!mounted || !formRef.current) return
      gsap.fromTo(
        '[data-animate="brief-section"]',
        { y: 12, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.35, stagger: 0.06, ease: 'power3.out', clearProps: 'all' }
      )
    },
    { dependencies: [mounted, tab], scope: formRef }
  )

  useGSAP(
    () => {
      if (!saved || !overlayRef.current) return
      gsap.fromTo(overlayRef.current, { opacity: 0, scale: 0.92 }, { opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(1.4)' })
    },
    { dependencies: [saved] }
  )

  if (!mounted) {
    return (
      <div className="flex min-w-0 flex-1 flex-col gap-3.5 px-4 py-5" aria-busy="true" aria-label="Loading brief">
        <Skeleton className="h-14 w-full rounded-2xl" />
        <Skeleton className="h-10 w-1/2 rounded-full" />
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    )
  }

  const client = clients.find(item => item.id === clientId) || clients[0]
  const typeConfig = CONTENT_TYPE_STYLE[type]
  const unreadFeedback = comments.filter(comment => comment.authorType === 'client' && !comment.resolved).length

  function togglePlatform(platform: Platform) {
    setPlatforms(prev => (prev.includes(platform) ? prev.filter(item => item !== platform) : [...prev, platform]))
  }

  function toggleAssign(userId: string) {
    setAssignedTo(prev => (prev.includes(userId) ? prev.filter(item => item !== userId) : [...prev, userId]))
  }

  async function handleSave() {
    if (saving) return
    if (!clientId) {
      setSaveError(
        clients.length === 0
          ? 'Add a client before creating content — there are none in this workspace yet.'
          : 'Please select a client.'
      )
      return
    }
    setSaving(true)
    setSaveError('')
    let partialFailure = false
    let createdId: string | null = null

    const supabase = createClient()
    const orgId = user?.org_id
    const contentData = {
      client_id: clientId,
      title,
      type,
      platforms,
      caption,
      brief,
      notes,
      status,
      assigned_to: assignedTo,
      scheduled_date: schedDate,
      org_id: orgId,
    }
    const scriptData = {
      graphic_copy: script.graphicCopy || null,
      scenes: scenes.length > 0 ? scenes : null,
      frames: frames.length > 0 ? frames : null,
      hook_line: script.hookLine || null,
      total_duration: script.totalDuration || null,
      music_direction: script.musicDirection || null,
      hashtag_strategy: script.hashtagStrategy || null,
      alt_text: script.altText || null,
      internal_notes: script.internalNotes || null,
    }

    if (isNew) {
      const { data: newContent, error: insertError } = await supabase.from('content_pieces').insert(contentData).select('id').single()
      if (insertError) {
        setSaveError('Something went wrong saving this brief. Please try again.')
        setSaving(false)
        return
      }

      if (newContent) {
        createdId = newContent.id
        const { error: scriptError } = await supabase.from('content_scripts').insert({ content_id: newContent.id, org_id: orgId, ...scriptData })
        if (scriptError) {
          partialFailure = true
          setSaveError('Brief was created, but the script/copy details failed to save. You can re-open it and try again.')
        }

        const { data: team } = await supabase.from('client_team').select('role, user_id').eq('client_id', clientId)
        if (team && team.length > 0) {
          const roleTask: Record<string, string> = {
            writer: `Write brief: ${title}`,
            designer: `Design: ${title}`,
            videographer: `Film: ${title}`,
            editor: `Edit: ${title}`,
            poster: `Schedule & post: ${title}`,
          }
          // Only the roles this content type actually needs — a videographer
          // has nothing to film for a static graphic, a designer has nothing
          // to design for a video. Writer/poster apply to every type.
          const relevantRoles: Role[] =
            type === 'video' || type === 'reel'
              ? ['writer', 'videographer', 'editor', 'poster']
              : ['writer', 'designer', 'poster']
          const relevantTeam = team.filter((entry: { role: string; user_id: string }) => relevantRoles.includes(entry.role as Role))

          if (relevantTeam.length > 0) {
            const { error: taskError } = await supabase.from('tasks').insert(
              relevantTeam.map((entry: { role: string; user_id: string }) => ({
                title: roleTask[entry.role] ?? `${entry.role}: ${title}`,
                description: `Auto-generated task for "${title}"`,
                content_id: newContent.id,
                client_id: clientId,
                assigned_to: entry.user_id,
                role: entry.role,
                due_date: schedDate || new Date().toISOString().split('T')[0],
                status: 'pending',
                org_id: orgId,
              }))
            )
            if (taskError) {
              partialFailure = true
              setSaveError('Brief was created, but team tasks failed to generate. You can assign them manually.')
            }
          }
        }
      }
    } else {
      const results = await Promise.all([
        supabase.from('content_pieces').update(contentData).eq('id', id),
        supabase.from('content_scripts').upsert({ content_id: id, org_id: user?.org_id, ...scriptData }),
      ])
      if (results.some(r => r.error)) {
        setSaveError('Something went wrong saving your changes. Please try again.')
        setSaving(false)
        return
      }
    }

    setSaving(false)

    // A partial failure (script or auto-task generation) means the content
    // piece itself was already created — send them to its real edit URL so
    // a retry goes through the update/upsert path instead of the isNew
    // insert path, which would otherwise create a duplicate content_pieces
    // row on the next "Create Brief" click.
    if (partialFailure) {
      if (isNew && createdId) router.replace(`/brief/${createdId}`)
      return
    }

    if (isNew && createdId) {
      router.replace(`/brief/${createdId}`)
      return
    }

    setSaved(true)
    setTimeout(() => {
      setSaved(false)
      router.back()
    }, 2000)
  }

  async function addComment() {
    if (!newComment.trim() || !user) return
    const supabase = createClient()
    const { data } = await supabase
      .from('feedback_comments')
      .insert({
        content_id: id,
        author_id: user.id,
        author_name: user.name,
        author_type: 'team',
        text: newComment,
        resolved: false,
        org_id: user.org_id,
      })
      .select('*')
      .single()

    if (data) {
      setComments(prev => [
        ...prev,
        {
          id: data.id,
          contentId: data.content_id,
          authorId: data.author_id,
          authorName: data.author_name,
          authorType: data.author_type,
          text: data.text,
          createdAt: new Date(data.created_at),
          resolved: false,
        },
      ])
    }
    setNewComment('')
  }

  async function addReply(parentId: string) {
    if (!replyText.trim() || !user) return
    const supabase = createClient()
    const { data } = await supabase
      .from('feedback_comments')
      .insert({
        content_id: id,
        author_id: user.id,
        author_name: user.name,
        author_type: 'team',
        text: replyText,
        resolved: false,
        parent_id: parentId,
        org_id: user.org_id,
      })
      .select('*')
      .single()

    if (data) {
      setComments(prev => [
        ...prev,
        {
          id: data.id,
          contentId: data.content_id,
          authorId: data.author_id,
          authorName: data.author_name,
          authorType: data.author_type,
          text: data.text,
          createdAt: new Date(data.created_at),
          resolved: false,
          parentId,
        },
      ])
    }
    setReplyText('')
    setReplyToId(null)
  }

  async function resolveComment(commentId: string) {
    setComments(prev => prev.map(comment => (comment.id === commentId ? { ...comment, resolved: true } : comment)))
    const supabase = createClient()
    await supabase.from('feedback_comments').update({ resolved: true }).eq('id', commentId)
  }

  function addScene() {
    setScenes(prev => [...prev, { sceneNumber: prev.length + 1, duration: '', visual: '', dialogue: '', text: '', music: '' }])
  }

  function updateScene(index: number, field: keyof VideoScene, value: string) {
    setScenes(prev => prev.map((scene, idx) => (idx === index ? { ...scene, [field]: value } : scene)))
  }

  function addFrame() {
    setFrames(prev => [...prev, { frameNumber: prev.length + 1, visual: '', text: '', cta: '' }])
  }

  function updateFrame(index: number, field: keyof StoryFrame, value: string) {
    setFrames(prev => prev.map((frame, idx) => (idx === index ? { ...frame, [field]: value } : frame)))
  }

  const topLevelComments = comments.filter(comment => !comment.parentId)
  const getReplies = (parentId: string) => comments.filter(comment => comment.parentId === parentId)

  return (
    <main className="page-main relative flex min-w-0 flex-1 flex-col overflow-y-auto bg-background">
      {saved && (
        <div ref={overlayRef} className="fixed inset-0 z-100 flex flex-col items-center justify-center gap-4 bg-success/5">
          <div className="flex size-16 items-center justify-center rounded-full bg-success text-3xl font-extrabold text-success-foreground">
            ✓
          </div>
          <p className="text-xl font-extrabold text-success">{isNew ? 'Brief created!' : 'Changes saved!'}</p>
          <p className="text-sm text-success/80">Returning to previous page...</p>
        </div>
      )}

      <div className="flex flex-col gap-4 border-b border-border bg-dark px-5 py-4 text-dark-text">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon-sm" onClick={() => router.back()} className="border-white/10 bg-white/5 text-dark-text hover:bg-white/10 hover:text-dark-text">
            ←
          </Button>
          <div className="min-w-0 flex-1">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-dark-muted">
              {isNew ? 'New Content' : 'Content Brief'}
            </p>
            <p className="truncate text-lg font-extrabold text-dark-text">{title || 'Untitled'}</p>
          </div>
          <Badge variant="outline" className={cn('px-3 py-1', typeConfig.className)}>
            <TypeIcon name={typeConfig.icon} className="size-3" />
            {typeConfig.label}
          </Badge>
        </div>

        <Tabs value={tab} onValueChange={value => setTab(value as BriefTab)} className="gap-0">
          <TabsList variant="line" className="h-auto gap-1 rounded-none p-0">
            {([
              { key: 'overview', label: 'Overview' },
              { key: 'script', label: 'Script & Copy' },
              { key: 'feedback', label: `Feedback${unreadFeedback > 0 ? ` (${unreadFeedback})` : ''}` },
            ] as const).map(item => (
              <TabsTrigger
                key={item.key}
                value={item.key}
                className={cn(
                  'rounded-none px-4 py-2 text-sm font-semibold text-dark-muted hover:text-dark-text data-active:text-dark-text',
                  'after:bg-current'
                )}
              >
                {item.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <div ref={formRef} className="flex flex-col gap-4 px-0 py-5">
            <TabsContent value="overview" className="flex flex-col gap-4">
              {!isNew && (
                <SectionShell
                  title="Deliverables"
                  description="Files uploaded for this piece"
                  action={
                    user && UPLOAD_ROLES.includes(user.role) ? (
                      <Button
                        size="sm"
                        onClick={() => router.push(`/assets?content=${id}`)}
                        className="min-h-11 bg-primary text-primary-foreground hover:bg-primary/85 md:min-h-0"
                      >
                        Upload deliverable
                      </Button>
                    ) : undefined
                  }
                >
                  {deliverables.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No deliverables uploaded yet.</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {deliverables.map(file => (
                        <a
                          key={file.id}
                          href={file.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex min-h-11 flex-col overflow-hidden rounded-lg border border-border bg-background text-xs hover:border-primary/40"
                        >
                          {file.url && isImage(file.file_name) && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={file.url} alt={file.file_name} className="h-24 w-full object-cover" />
                          )}
                          <span className="truncate px-2 py-2 font-semibold text-foreground">{file.file_name}</span>
                        </a>
                      ))}
                    </div>
                  )}
                </SectionShell>
              )}

              <SectionShell title="Content Details">
                <FieldBlock label="Client">
                  {clients.length === 0 ? (
                    <div className="flex flex-col gap-2 rounded-lg border border-dashed border-border bg-secondary/40 px-3 py-3">
                      <p className="text-xs text-muted-foreground">
                        You don&apos;t have any clients yet — add one before creating content.
                      </p>
                      <Link href="/clients" className="w-fit text-xs font-semibold text-primary hover:underline">
                        Go to Clients →
                      </Link>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {clients.map(item => (
                        <Button
                          key={item.id}
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setClientId(item.id)
                            setSaveError('')
                          }}
                          className={cn(
                            clientId === item.id && 'border-primary bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground'
                          )}
                        >
                          {item.name}
                        </Button>
                      ))}
                    </div>
                  )}
                </FieldBlock>

                <FieldBlock label="Content Type">
                  <div className="flex flex-wrap gap-2">
                    {(['graphic', 'video', 'reel', 'story'] as ContentType[]).map(item => {
                      const cfg = CONTENT_TYPE_STYLE[item]
                      const active = type === item
                      return (
                        <Button
                          key={item}
                          variant="outline"
                          size="sm"
                          onClick={() => setType(item)}
                          className={cn(active && cfg.className)}
                        >
                          <TypeIcon name={cfg.icon} className="size-3" />
                          {cfg.label}
                        </Button>
                      )
                    })}
                  </div>
                </FieldBlock>

                <FieldBlock label="Title">
                  <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Give this content piece a name..." className="bg-background" />
                </FieldBlock>

                <FieldBlock label="Scheduled Date">
                  <Input type="date" value={schedDate} onChange={e => setSchedDate(e.target.value)} className="bg-background" />
                </FieldBlock>
              </SectionShell>

              <SectionShell title="Platforms">
                <div className="flex flex-wrap gap-2">
                  {PLATFORMS.map(platform => (
                    <Button
                      key={platform}
                      variant="outline"
                      size="sm"
                      onClick={() => togglePlatform(platform)}
                      className={cn(platforms.includes(platform) && 'border-primary bg-wash text-primary hover:bg-wash')}
                    >
                      {platform}
                    </Button>
                  ))}
                </div>
              </SectionShell>

              <SectionShell
                title="Caption"
                action={
                  <span className={cn('text-xs', caption.length > 2000 ? 'text-danger' : 'text-muted-foreground')}>
                    {caption.length}/2200
                  </span>
                }
              >
                <Textarea
                  value={caption}
                  onChange={e => setCaption(e.target.value)}
                  rows={5}
                  className="resize-y bg-background leading-7"
                  placeholder="Write the full post caption here - hooks, body, CTA, hashtags..."
                />
              </SectionShell>

              <SectionShell title="Creative Brief">
                <Textarea
                  value={brief}
                  onChange={e => setBrief(e.target.value)}
                  rows={4}
                  className="resize-y bg-background leading-7"
                  placeholder="Describe the concept, mood, visual direction, goals for this piece..."
                />
              </SectionShell>

              <SectionShell title="Internal Notes">
                <Textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={3}
                  className="resize-y bg-background leading-7"
                  placeholder="Deadlines, client preferences, reference links, anything the team should know..."
                />
              </SectionShell>

              <SectionShell title="Assign Team">
                <div className="flex flex-wrap gap-2">
                  {users.map(member => {
                    const assigned = assignedTo.includes(member.id)
                    return (
                      <Button
                        key={member.id}
                        variant="outline"
                        size="sm"
                        onClick={() => toggleAssign(member.id)}
                        className={cn(
                          'h-auto rounded-full px-2 py-1',
                          assigned && 'border-primary bg-wash text-primary'
                        )}
                      >
                        <UserAvatar userId={member.id} name={member.name} size="sm" />
                        {member.name.split(' ')[0]}
                      </Button>
                    )
                  })}
                </div>
              </SectionShell>

              <SectionShell title="Status">
                <div className="flex flex-wrap gap-2">
                  {STATUS_OPTIONS.map(option => (
                    <Button
                      key={option.value}
                      variant="outline"
                      size="sm"
                      onClick={() => setStatus(option.value)}
                      className={cn(status === option.value && 'border-primary bg-primary/10 text-primary hover:bg-primary/10')}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
                {status && (
                  <div>
                    <StatusBadge status={status}>{STATUS_OPTIONS.find(option => option.value === status)?.label}</StatusBadge>
                  </div>
                )}
              </SectionShell>
            </TabsContent>

            <TabsContent value="script" className="flex flex-col gap-4">
              {type === 'graphic' && (
                <>
                  <SectionShell title="Copy & Headlines">
                    <FieldBlock label="Headline *">
                      <Input
                        value={script.graphicCopy?.headline || ''}
                        onChange={e =>
                          setScript(current => ({
                            ...current,
                            graphicCopy: {
                              ...current.graphicCopy,
                              headline: e.target.value,
                              bodyText: current.graphicCopy?.bodyText || '',
                              cta: current.graphicCopy?.cta || '',
                              visualDirection: current.graphicCopy?.visualDirection || '',
                            },
                          }))
                        }
                        className="bg-background"
                        placeholder="The main headline - big, bold, immediate"
                      />
                    </FieldBlock>
                    <FieldBlock label="Subheadline">
                      <Input
                        value={script.graphicCopy?.subheadline || ''}
                        onChange={e => setScript(current => ({ ...current, graphicCopy: { ...current.graphicCopy!, subheadline: e.target.value } }))}
                        className="bg-background"
                        placeholder="Supporting line under the headline"
                      />
                    </FieldBlock>
                    <FieldBlock label="Body Text *">
                      <Textarea
                        value={script.graphicCopy?.bodyText || ''}
                        onChange={e => setScript(current => ({ ...current, graphicCopy: { ...current.graphicCopy!, bodyText: e.target.value } }))}
                        rows={3}
                        className="resize-y bg-background leading-7"
                        placeholder="Full body copy that appears on the graphic - if any"
                      />
                    </FieldBlock>
                    <FieldBlock label="Call to Action">
                      <Input
                        value={script.graphicCopy?.cta || ''}
                        onChange={e => setScript(current => ({ ...current, graphicCopy: { ...current.graphicCopy!, cta: e.target.value } }))}
                        className="bg-background"
                        placeholder="e.g. Shop now / Link in bio / Swipe"
                      />
                    </FieldBlock>
                  </SectionShell>

                  <SectionShell title="Visual Direction">
                    <FieldBlock label="Visual Description *">
                      <Textarea
                        value={script.graphicCopy?.visualDirection || ''}
                        onChange={e => setScript(current => ({ ...current, graphicCopy: { ...current.graphicCopy!, visualDirection: e.target.value } }))}
                        rows={4}
                        className="resize-y bg-background leading-7"
                        placeholder="Describe exactly what the graphic should look like - layout, imagery, composition, style..."
                      />
                    </FieldBlock>
                    <FieldBlock label="Color Notes">
                      <Input
                        value={script.graphicCopy?.colorNotes || ''}
                        onChange={e => setScript(current => ({ ...current, graphicCopy: { ...current.graphicCopy!, colorNotes: e.target.value } }))}
                        className="bg-background"
                        placeholder="Background color, text color, brand palette guidance..."
                      />
                    </FieldBlock>
                    <FieldBlock label="Mood / Reference">
                      <Input
                        value={script.graphicCopy?.moodRef || ''}
                        onChange={e => setScript(current => ({ ...current, graphicCopy: { ...current.graphicCopy!, moodRef: e.target.value } }))}
                        className="bg-background"
                        placeholder="Reference brands, links, image style to aim for..."
                      />
                    </FieldBlock>
                  </SectionShell>
                </>
              )}

              {(type === 'video' || type === 'reel') && (
                <>
                  <SectionShell title="Video Overview">
                    <FieldBlock label="Hook Line *">
                      <Input value={script.hookLine || ''} onChange={e => setScript(current => ({ ...current, hookLine: e.target.value }))} className="bg-background" placeholder="The first sentence or text that stops the scroll" />
                    </FieldBlock>
                    <div className="grid gap-4 md:grid-cols-2">
                      <FieldBlock label="Total Duration">
                        <Input value={script.totalDuration || ''} onChange={e => setScript(current => ({ ...current, totalDuration: e.target.value }))} className="bg-background" placeholder="e.g. 0:28" />
                      </FieldBlock>
                      <FieldBlock label="Music Direction">
                        <Input value={script.musicDirection || ''} onChange={e => setScript(current => ({ ...current, musicDirection: e.target.value }))} className="bg-background" placeholder="Mood, BPM, reference track..." />
                      </FieldBlock>
                    </div>
                  </SectionShell>

                  <SectionShell
                    title="Scene Breakdown"
                    action={
                      <Button variant="outline" size="sm" onClick={addScene} className="border-border bg-wash">
                        Add Scene
                      </Button>
                    }
                  >
                    {scenes.length === 0 ? (
                      <EmptyState title="No scenes yet" body="Add scenes to build your script beat by beat." className="border-border bg-background" />
                    ) : (
                      scenes.map((scene, index) => (
                        <Card key={index} size="sm" className="border-border bg-background">
                          <CardContent className="flex flex-col gap-4 py-4">
                            <div className="flex items-center gap-3">
                              <div className={cn('flex size-7 items-center justify-center rounded-md text-xs font-extrabold', typeConfig.className)}>
                                {index + 1}
                              </div>
                              <Input
                                value={scene.duration}
                                onChange={e => updateScene(index, 'duration', e.target.value)}
                                className="bg-card"
                                placeholder="Duration (e.g. 0:00-0:03)"
                              />
                              <Button variant="outline" size="icon-xs" onClick={() => setScenes(prev => prev.filter((_, idx) => idx !== index))}>
                                ×
                              </Button>
                            </div>
                            <FieldBlock label="Visual (what camera shows)">
                              <Textarea value={scene.visual} onChange={e => updateScene(index, 'visual', e.target.value)} rows={2} className="resize-none bg-card leading-6" placeholder="Describe what's on screen..." />
                            </FieldBlock>
                            <div className="grid gap-4 md:grid-cols-2">
                              <FieldBlock label="Dialogue / Voiceover">
                                <Input value={scene.dialogue || ''} onChange={e => updateScene(index, 'dialogue', e.target.value)} className="bg-card" placeholder="Spoken words..." />
                              </FieldBlock>
                              <FieldBlock label="On-screen text">
                                <Input value={scene.text || ''} onChange={e => updateScene(index, 'text', e.target.value)} className="bg-card" placeholder="Text overlay..." />
                              </FieldBlock>
                            </div>
                            <FieldBlock label="Music cue">
                              <Input value={scene.music || ''} onChange={e => updateScene(index, 'music', e.target.value)} className="bg-card" placeholder="Drop, build, quiet, upbeat..." />
                            </FieldBlock>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </SectionShell>
                </>
              )}

              {type === 'story' && (
                <SectionShell
                  title="Story Frames"
                  action={
                    <Button variant="outline" size="sm" onClick={addFrame} className="border-border bg-wash">
                      Add Frame
                    </Button>
                  }
                >
                  {frames.length === 0 ? (
                    <EmptyState title="No frames yet" body="Stories are frame-by-frame sequences. Add frames to build the sequence." className="border-border bg-background" />
                  ) : (
                    frames.map((frame, index) => (
                      <Card key={index} size="sm" className="border-border bg-background">
                        <CardContent className="flex flex-col gap-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className={cn('flex size-7 items-center justify-center rounded-md text-xs font-extrabold', typeConfig.className)}>
                              {index + 1}
                            </div>
                            <span className="text-xs font-semibold text-muted-foreground">Frame {index + 1} of {frames.length}</span>
                            <Button variant="outline" size="icon-xs" onClick={() => setFrames(prev => prev.filter((_, idx) => idx !== index))} className="ml-auto">
                              ×
                            </Button>
                          </div>
                          <FieldBlock label="Visual">
                            <Textarea value={frame.visual} onChange={e => updateFrame(index, 'visual', e.target.value)} rows={2} className="resize-none bg-card leading-6" placeholder="What does this frame look like?" />
                          </FieldBlock>
                          <div className="grid gap-4 md:grid-cols-2">
                            <FieldBlock label="Text on frame">
                              <Input value={frame.text || ''} onChange={e => updateFrame(index, 'text', e.target.value)} className="bg-card" placeholder="Overlay text..." />
                            </FieldBlock>
                            <FieldBlock label="CTA / Swipe">
                              <Input value={frame.cta || ''} onChange={e => updateFrame(index, 'cta', e.target.value)} className="bg-card" placeholder="e.g. Swipe up, tap link" />
                            </FieldBlock>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </SectionShell>
              )}

              <SectionShell title="Distribution">
                <FieldBlock label="Hashtag Strategy">
                  <Textarea value={script.hashtagStrategy || ''} onChange={e => setScript(current => ({ ...current, hashtagStrategy: e.target.value }))} rows={2} className="resize-y bg-background leading-7" placeholder="#brandhashtag #niche1 #niche2 #broad" />
                </FieldBlock>
                <FieldBlock label="Alt Text (accessibility)">
                  <Input value={script.altText || ''} onChange={e => setScript(current => ({ ...current, altText: e.target.value }))} className="bg-background" placeholder="Describe the image or video for visually impaired users" />
                </FieldBlock>
                <FieldBlock label="Script Notes">
                  <Textarea value={script.internalNotes || ''} onChange={e => setScript(current => ({ ...current, internalNotes: e.target.value }))} rows={2} className="resize-y bg-background leading-7" placeholder="Any additional notes for the script or copy team..." />
                </FieldBlock>
              </SectionShell>
            </TabsContent>

            <TabsContent value="feedback" className="flex flex-col gap-4">
              <SectionShell title="Add Note">
                <Textarea value={newComment} onChange={e => setNewComment(e.target.value)} rows={3} className="resize-none bg-background leading-7" placeholder="Leave a note for the team or response to client feedback..." />
                <Button onClick={addComment} disabled={!newComment.trim()} className="w-fit bg-primary text-primary-foreground hover:bg-primary/85">
                  Post note
                </Button>
              </SectionShell>

              {topLevelComments.length === 0 ? (
                <EmptyState title="No feedback yet" body="Client feedback and team notes will appear here." icon="💬" className="border-border bg-card" />
              ) : (
                <div className="flex flex-col gap-3">
                  {topLevelComments.map(comment => {
                    const isClient = comment.authorType === 'client'
                    const replies = getReplies(comment.id)
                    const isReplying = replyToId === comment.id

                    return (
                      <Card
                        key={comment.id}
                        data-animate="brief-section"
                        className={cn(
                          comment.resolved && 'opacity-80',
                          !comment.resolved && isClient && 'border-primary/35 bg-primary/5',
                          !comment.resolved && !isClient && 'border-primary/35 bg-primary/5'
                        )}
                      >
                        <CardContent className="flex flex-col gap-4 py-4">
                          <div className="flex items-start gap-3">
                            {isClient && client ? (
                              <ClientFeedbackAvatar initials={comment.authorName.split(' ').map(word => word[0]).join('').slice(0, 2)} />
                            ) : (
                              <UserAvatar userId={comment.authorId} name={comment.authorName} size="sm" />
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-sm font-semibold text-foreground">{comment.authorName}</span>
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    isClient ? 'border-primary/25 bg-primary/10 text-primary' : 'border-primary/25 bg-wash text-primary'
                                  )}
                                >
                                  {isClient ? 'Client' : 'Team'}
                                </Badge>
                                {comment.resolved && <span className="text-xs font-semibold text-success">Resolved</span>}
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {comment.createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </span>
                            </div>
                          </div>

                          <p className="text-sm leading-7 text-foreground/85">{comment.text}</p>

                          {!comment.resolved && (
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm" onClick={() => setReplyToId(isReplying ? null : comment.id)}>
                                Reply
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => resolveComment(comment.id)} className="border-success/25 bg-success/5 text-success hover:bg-success/10">
                                Resolve
                              </Button>
                            </div>
                          )}

                          {replies.length > 0 && (
                            <div className="flex flex-col gap-3 rounded-xl border border-border bg-background px-4 py-4">
                              {replies.map(reply => (
                                <div key={reply.id} className="flex gap-3">
                                  <UserAvatar userId={reply.authorId} name={reply.authorName} size="sm" />
                                  <div>
                                    <p className="text-sm font-semibold text-foreground">{reply.authorName}</p>
                                    <p className="text-sm leading-7 text-foreground/85">{reply.text}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {isReplying && (
                            <div className="rounded-xl border border-border bg-background px-4 py-4">
                              <Textarea autoFocus value={replyText} onChange={e => setReplyText(e.target.value)} rows={2} className="mb-3 resize-none bg-card leading-7" placeholder="Write a reply..." />
                              <Button onClick={() => addReply(comment.id)} disabled={!replyText.trim()} className="w-fit bg-primary text-primary-foreground hover:bg-primary/85">
                                Send
                              </Button>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}
            </TabsContent>
          </div>
        </Tabs>
      </div>

      {tab !== 'feedback' && (
        <div className="sticky bottom-0 left-0 right-0 bg-gradient-to-t from-background via-background/95 to-transparent px-5 pb-5 pt-4">
          {saveError && (
            <p className="mb-2 text-center text-xs font-semibold text-danger">{saveError}</p>
          )}
          <Button
            onClick={handleSave}
            size="lg"
            disabled={saving || (isNew && clients.length === 0)}
            className="w-full bg-primary text-primary-foreground shadow-md hover:bg-primary/85 disabled:opacity-50"
          >
            {saving ? 'Saving…' : isNew ? 'Create Brief' : 'Save Changes'}
          </Button>
        </div>
      )}
    </main>
  )
}

function ClientFeedbackAvatar({ initials }: { initials: string }) {
  return (
    <div className="flex size-8 items-center justify-center rounded-full bg-primary text-[0.6rem] font-extrabold text-primary-foreground">
      {initials}
    </div>
  )
}
