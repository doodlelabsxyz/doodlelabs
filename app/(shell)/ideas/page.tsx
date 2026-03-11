'use client'

import { useState, useRef, useEffect } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { useRouter } from 'next/navigation'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { UserAvatar } from '@/components/ui/user-avatar'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/supabase/useUser'
import { cn } from '@/lib/utils'
import type { ContentType, IdeaStatus } from '@/lib/types'

gsap.registerPlugin(useGSAP)

const TYPE_CFG: Record<ContentType, { label: string; badgeClass: string }> = {
  graphic: { label: 'Graphic', badgeClass: 'bg-coral/15 text-coral' },
  video: { label: 'Video', badgeClass: 'bg-lemon/20 text-amber-700' },
  reel: { label: 'Reel', badgeClass: 'bg-mint/15 text-mint' },
  story: { label: 'Story', badgeClass: 'bg-lavender/15 text-lavender' },
}

const STATUS_CFG: Record<
  IdeaStatus,
  { label: string; badgeClass: string; dotClass: string; actionClass?: string }
> = {
  raw: {
    label: 'Raw',
    badgeClass: 'bg-secondary text-muted-foreground',
    dotClass: 'bg-muted-foreground',
    actionClass: 'bg-lemon/20 text-amber-700 hover:bg-lemon/30',
  },
  shortlisted: {
    label: 'Shortlisted',
    badgeClass: 'bg-lemon/20 text-amber-700',
    dotClass: 'bg-lemon',
    actionClass: 'bg-success/15 text-success hover:bg-success/25',
  },
  converted: {
    label: 'Converted',
    badgeClass: 'bg-success/15 text-success',
    dotClass: 'bg-success',
  },
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
  const now = new Date()
  const created = new Date(s)
  const diff = Math.round((now.getTime() - created.getTime()) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  return `${diff}d ago`
}

const EMPTY_FORM = {
  title: '',
  type: '' as ContentType | '',
  client_id: '',
  body: '',
  tags: [] as string[],
}

function FilterPill({
  label,
  active,
  onClick,
  color,
}: {
  label: string
  active: boolean
  onClick: () => void
  color?: string
}) {
  return (
    <button
      onClick={onClick}
      style={color ? ({ '--pill-color': color } as React.CSSProperties) : undefined}
      className={cn(
        'rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap transition-colors',
        active && color && 'bg-[var(--pill-color)] text-white',
        active && !color && 'bg-coral text-white',
        !active && 'bg-white/7 text-dark-muted hover:bg-white/10 hover:text-dark-text'
      )}
    >
      {label}
    </button>
  )
}

export default function IdeasPage() {
  const router = useRouter()
  const gridRef = useRef<HTMLDivElement>(null)
  const { user } = useUser()

  const [mounted, setMounted] = useState(false)
  const [ideas, setIdeas] = useState<IdeaRow[]>([])
  const [clients, setClients] = useState<ClientRow[]>([])
  const [statusFilter, setStatusFilter] = useState<IdeaStatus | 'all'>('all')
  const [clientFilter, setClientFilter] = useState<string>('all')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [tagInput, setTagInput] = useState('')

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
    void load()
  }, [])

  useGSAP(() => {
    if (!mounted || !gridRef.current) return
    gsap.fromTo(
      '[data-animate="idea-card"]',
      { y: 16, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.35, stagger: 0.06, ease: 'back.out(1.2)', clearProps: 'all' }
    )
  }, { dependencies: [mounted, statusFilter, clientFilter], scope: gridRef })

  if (!mounted) return null

  const filtered = ideas
    .filter(i => statusFilter === 'all' || i.status === statusFilter)
    .filter(i => clientFilter === 'all' || i.client_id === clientFilter)

  const counts = {
    raw: ideas.filter(i => i.status === 'raw').length,
    shortlisted: ideas.filter(i => i.status === 'shortlisted').length,
    converted: ideas.filter(i => i.status === 'converted').length,
  }

  async function addIdea() {
    if (!form.title.trim() || !form.body.trim() || !user) return
    const supabase = createClient()
    const { data } = await supabase
      .from('ideas')
      .insert({
        title: form.title.trim(),
        body: form.body.trim(),
        type: form.type || null,
        client_id: form.client_id || null,
        tags: form.tags,
        status: 'raw',
        created_by: user.id,
        org_id: user.org_id,
      })
      .select('*, clients:client_id(id, name, brand_color), author:created_by(id, name)')
      .single()
    if (data) setIdeas(prev => [data as IdeaRow, ...prev])
    setForm({ ...EMPTY_FORM })
    setTagInput('')
    setShowForm(false)
  }

  async function updateStatus(id: string, status: IdeaStatus) {
    setIdeas(prev => prev.map(i => (i.id === id ? { ...i, status } : i)))
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
    <main className="page-main flex min-w-0 flex-1 flex-col overflow-y-auto bg-background">
      <section className="bg-dark px-5 pt-[18px] pb-[14px]">
        <div className="mb-3.5 flex items-center gap-3">
          <div className="flex-1">
            <p className="mb-px text-2xs uppercase tracking-[0.08em] text-dark-muted">
              Content Strategy
            </p>
            <h1 className="text-md font-extrabold leading-none text-dark-text">Idea Dump</h1>
          </div>
          <Button
            onClick={() => setShowForm(f => !f)}
            className={cn(
              showForm
                ? 'bg-white/8 text-dark-text hover:bg-white/12'
                : 'bg-coral text-white hover:bg-coral/85'
            )}
          >
            {showForm ? 'Cancel' : 'New Idea'}
          </Button>
        </div>

        <div className="mb-3.5 flex flex-wrap gap-3">
          {(['raw', 'shortlisted', 'converted'] as IdeaStatus[]).map(s => {
            const sc = STATUS_CFG[s]
            return (
              <div key={s} className="flex items-center gap-1.5">
                <div className={cn('size-1.5 rounded-full', sc.dotClass)} />
                <span className="text-xs text-dark-muted">
                  {counts[s]} {sc.label}
                </span>
              </div>
            )
          })}
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-0.5">
          <FilterPill label="All" active={statusFilter === 'all'} onClick={() => setStatusFilter('all')} />
          {(['raw', 'shortlisted', 'converted'] as IdeaStatus[]).map(s => (
            <FilterPill
              key={s}
              label={STATUS_CFG[s].label}
              active={statusFilter === s}
              onClick={() => setStatusFilter(s)}
            />
          ))}
          <div className="mx-0.5 w-px shrink-0 bg-white/7" />
          <FilterPill
            label="All Clients"
            active={clientFilter === 'all'}
            onClick={() => setClientFilter('all')}
          />
          {clients.map(c => (
            <FilterPill
              key={c.id}
              label={c.name}
              active={clientFilter === c.id}
              onClick={() => setClientFilter(c.id)}
              color={c.brand_color}
            />
          ))}
        </div>
      </section>

      {showForm && (
        <section className="border-b border-border bg-card px-5 py-4">
          <Card className="gap-4 border border-border bg-card shadow-none">
            <CardContent className="flex flex-col gap-3 py-4">
              <p className="text-xs font-extrabold uppercase tracking-[0.06em] text-foreground">
                New Idea
              </p>

              <Input
                placeholder="Idea title *"
                value={form.title}
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                className="bg-background"
              />

              <Textarea
                placeholder="Describe the idea: concept, angle, why it'll work, inspiration..."
                value={form.body}
                onChange={e => setForm(p => ({ ...p, body: e.target.value }))}
                rows={4}
                className="resize-none bg-background"
              />

              <div className="grid gap-2 sm:grid-cols-2">
                <Select
                  value={form.type || undefined}
                  onValueChange={value => setForm(p => ({ ...p, type: value as ContentType | '' }))}
                >
                  <SelectTrigger className="w-full bg-background">
                    <SelectValue placeholder="Content type (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="graphic">Graphic</SelectItem>
                      <SelectItem value="video">Video</SelectItem>
                      <SelectItem value="reel">Reel</SelectItem>
                      <SelectItem value="story">Story</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>

                <Select
                  value={form.client_id || undefined}
                  onValueChange={value => setForm(p => ({ ...p, client_id: value ?? '' }))}
                >
                  <SelectTrigger className="w-full bg-background">
                    <SelectValue placeholder="Client (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {clients.map(c => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {form.tags.map(tag => (
                  <button
                    key={tag}
                    onClick={() =>
                      setForm(p => ({ ...p, tags: p.tags.filter(t => t !== tag) }))
                    }
                    className="rounded-full bg-sky/15 px-2 py-1 text-[0.65rem] font-bold text-sky"
                  >
                    #{tag} ×
                  </button>
                ))}

                <div className="flex items-center gap-1.5">
                  <Input
                    placeholder="Add tag..."
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    className="h-8 w-28 bg-background text-xs"
                  />
                  <Button
                    variant="secondary"
                    size="xs"
                    onClick={addTag}
                    className="bg-sky/15 text-sky hover:bg-sky/25"
                  >
                    +
                  </Button>
                </div>
              </div>

              <Button
                onClick={addIdea}
                disabled={!form.title.trim() || !form.body.trim()}
                className="self-start bg-coral text-white hover:bg-coral/85"
              >
                Dump it
              </Button>
            </CardContent>
          </Card>
        </section>
      )}

      <div ref={gridRef} className="flex-1 p-4">
        {filtered.length === 0 ? (
          <Card className="border border-dashed border-border bg-card shadow-none">
            <CardContent className="py-14 text-center">
              <div className="mb-2 text-4xl">💡</div>
              <p className="mb-1 text-sm font-bold text-foreground">No ideas yet</p>
              <p className="text-xs text-muted-foreground">
                Hit &quot;New Idea&quot; and dump whatever&apos;s in your head.
              </p>
            </CardContent>
          </Card>
        ) : null}

        <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-3">
          {filtered.map(idea => {
            const sc = STATUS_CFG[idea.status]
            const tc = idea.type ? TYPE_CFG[idea.type] : null
            const client = normalize(idea.clients)
            const author = normalize(idea.author)

            return (
              <Card
                key={idea.id}
                data-animate="idea-card"
                className="group gap-0 overflow-hidden border border-border py-0 shadow-none transition-all hover:-translate-y-1 hover:shadow-md"
              >
                <div className={cn('h-1 w-full', sc.dotClass)} />

                <CardContent className="flex flex-col gap-3 py-4">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge className={cn('border-0 text-[0.6rem] font-bold', sc.badgeClass)}>
                      {sc.label}
                    </Badge>
                    {tc && (
                      <Badge className={cn('border-0 text-[0.6rem] font-bold', tc.badgeClass)}>
                        {tc.label}
                      </Badge>
                    )}
                    {client && (
                      <div
                        style={{ '--client-color': client.brand_color } as React.CSSProperties}
                        className="ml-auto flex items-center gap-1"
                      >
                        <div className="size-1.5 rounded-full bg-[var(--client-color)]" />
                        <span className="text-[0.6rem] font-semibold text-muted-foreground">
                          {client.name}
                        </span>
                      </div>
                    )}
                  </div>

                  <div>
                    <h3 className="mb-2 text-sm font-extrabold leading-5 text-foreground">
                      {idea.title}
                    </h3>
                    <p className="line-clamp-3 text-xs leading-6 text-muted-foreground">
                      {idea.body}
                    </p>
                  </div>

                  {idea.tags && idea.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {idea.tags.map(tag => (
                        <Badge
                          key={tag}
                          className="border-0 bg-sky/15 text-[0.58rem] font-bold text-sky"
                        >
                          #{tag}
                        </Badge>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-2 border-t border-border pt-2">
                    {author ? <UserAvatar userId={author.id} name={author.name} size="sm" /> : null}
                    <span className="text-[0.6rem] text-muted-foreground">
                      {timeAgo(idea.created_at)}
                    </span>

                    <div className="ml-auto flex items-center gap-1">
                      {idea.status === 'raw' && (
                        <Button
                          variant="secondary"
                          size="xs"
                          onClick={() => updateStatus(idea.id, 'shortlisted')}
                          className={sc.actionClass}
                        >
                          Shortlist
                        </Button>
                      )}
                      {idea.status !== 'converted' && (
                        <Button
                          variant="secondary"
                          size="xs"
                          onClick={() => convertToBrief(idea)}
                          className="bg-success/15 text-success hover:bg-success/25"
                        >
                          Brief
                        </Button>
                      )}
                      {idea.status === 'converted' && (
                        <span className="text-[0.62rem] font-bold text-success">In pipeline</span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </main>
  )
}
