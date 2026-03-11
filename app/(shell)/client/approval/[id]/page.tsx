'use client'

import { useState, useEffect, useRef, type CSSProperties } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { useRouter, useParams } from 'next/navigation'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { UserAvatar } from '@/components/ui/user-avatar'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/supabase/useUser'
import { cn } from '@/lib/utils'

gsap.registerPlugin(useGSAP)

type ContentRow = {
  id: string
  title: string
  type: string
  status: string
  caption: string | null
  notes: string | null
  scheduled_date: string
  platforms: string[]
  assigned_to: string[]
  client_id: string
}
type ClientRow = { id: string; name: string; initials: string; brand_color: string }
type UserRow = { id: string; name: string; role: string }

const TYPE_CFG = {
  graphic: { label: 'Graphic', color: 'hsl(14 72% 62%)', chipClass: 'border-coral/25 bg-coral/10 text-coral', icon: '🎨' },
  video: { label: 'Video', color: 'hsl(40 95% 52%)', chipClass: 'border-lemon/25 bg-lemon/10 text-lemon', icon: '🎬' },
  reel: { label: 'Reel', color: 'hsl(161 58% 44%)', chipClass: 'border-mint/25 bg-mint/10 text-mint', icon: '🎞️' },
  story: { label: 'Story', color: 'hsl(268 60% 68%)', chipClass: 'border-lavender/25 bg-lavender/10 text-lavender', icon: '📖' },
}

const PLATFORM_ICONS: Record<string, string> = {
  instagram: 'IG',
  tiktok: 'TT',
  facebook: 'FB',
  linkedin: 'LI',
}

function formatDate(s: string) {
  return new Date(`${s}T00:00:00`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

function brandStyle(color?: string): CSSProperties | undefined {
  return color ? ({ '--brand-color': color } as CSSProperties) : undefined
}

export default function ApprovalPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const supabase = createClient()
  const { user } = useUser()
  const containerRef = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)

  const [cp, setCp] = useState<ContentRow | null>(null)
  const [client, setClient] = useState<ClientRow | null>(null)
  const [assignees, setAssignees] = useState<UserRow[]>([])
  const [decision, setDecision] = useState<null | 'approved' | 'revision'>(null)
  const [note, setNote] = useState('')
  const [showNoteBox, setShowNoteBox] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
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
  }, [id, supabase])

  useGSAP(
    () => {
      if (!containerRef.current || !cp) return
      gsap.fromTo(
        '[data-animate="approval-section"]',
        { y: 16, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.3, stagger: 0.08, ease: 'power2.out', clearProps: 'all' }
      )
    },
    { dependencies: [!!cp], scope: containerRef }
  )

  useGSAP(
    () => {
      if (!submitted || !overlayRef.current) return
      gsap.fromTo(overlayRef.current, { opacity: 0, scale: 0.94 }, { opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(1.3)' })
    },
    { dependencies: [submitted] }
  )

  async function handleSubmit() {
    if (!decision || submitting) return
    setSubmitting(true)
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

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

  if (!cp) return null

  const tc = TYPE_CFG[cp.type as keyof typeof TYPE_CFG] ?? TYPE_CFG.graphic

  return (
    <main className="page-main relative flex min-w-0 flex-1 flex-col overflow-y-auto bg-background">
      {submitted && (
        <div
          ref={overlayRef}
          className={cn(
            'absolute inset-0 z-50 flex flex-col items-center justify-center gap-4 px-10 text-center',
            decision === 'approved' ? 'bg-success/5' : 'bg-lemon/10'
          )}
        >
          <div
            className={cn(
              'flex size-[72px] items-center justify-center rounded-full text-[2rem]',
              decision === 'approved' ? 'bg-success text-white' : 'bg-lemon text-foreground'
            )}
          >
            {decision === 'approved' ? '✓' : '✏️'}
          </div>
          <div>
            <h2 className="mb-1.5 text-[1.3rem] font-extrabold text-foreground">
              {decision === 'approved' ? 'Approved!' : 'Revision Requested'}
            </h2>
            <p className="text-[0.8rem] text-muted-foreground">
              {decision === 'approved'
                ? 'Your team has been notified and will schedule this content.'
                : "Your feedback has been sent to the team. They'll get back to you soon."}
            </p>
          </div>
        </div>
      )}

      <div className="flex shrink-0 items-center gap-3 bg-foreground px-5 py-[14px] text-background">
        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => router.back()}
          className="border-white/10 bg-white/5 text-background/70 hover:bg-white/10 hover:text-background"
        >
          ←
        </Button>
        <div className="flex-1">
          <p className="text-[0.6rem] uppercase tracking-[0.08em] text-background/50">Approval Request</p>
          <p className="text-[0.95rem] font-extrabold leading-[1.2] text-background">{cp.title}</p>
        </div>
        <div
          className="flex size-[34px] shrink-0 items-center justify-center rounded-[10px] bg-[var(--brand-color)] text-[11px] font-extrabold text-white"
          style={brandStyle(client?.brand_color ?? 'hsl(25 82% 60%)')}
        >
          {client?.initials ?? '?'}
        </div>
      </div>

      <div ref={containerRef} className="flex flex-1 flex-col gap-3.5 px-4 py-4">
        <Card data-animate="approval-section" className="overflow-hidden py-0 shadow-none">
          <div className="h-1 bg-[var(--type-color)]" style={{ '--type-color': tc.color } as CSSProperties} />

          <div
            className="flex h-[220px] flex-col items-center justify-center border-b border-border bg-[linear-gradient(135deg,var(--type-color)_0%,transparent_100%)]/10"
            style={{ '--type-color': tc.color } as CSSProperties}
          >
            <div
              className="mb-3 flex size-[72px] items-center justify-center rounded-[18px] bg-[var(--type-color)] text-[2rem]"
              style={{ '--type-color': tc.color } as CSSProperties}
            >
              {tc.icon}
            </div>
            <p className="text-[0.72rem] font-semibold text-muted-foreground">{tc.label} Preview</p>
            <p className="text-[0.62rem] text-muted-foreground">Asset file would appear here</p>
          </div>

          <CardContent className="px-3.5 py-3.5">
            <div className="mb-2.5 flex flex-wrap gap-1.5">
              <Badge variant="outline" className={tc.chipClass}>
                {tc.label}
              </Badge>
              {(cp.platforms ?? []).map(platform => (
                <Badge key={platform} variant="outline" className="bg-muted text-muted-foreground">
                  {PLATFORM_ICONS[platform] ?? platform} {platform.charAt(0).toUpperCase() + platform.slice(1)}
                </Badge>
              ))}
            </div>
            <h2 className="mb-1 text-[1.05rem] font-extrabold leading-[1.3] text-foreground">{cp.title}</h2>
            <p className="text-[0.7rem] text-muted-foreground">Scheduled: {formatDate(cp.scheduled_date)}</p>
          </CardContent>
        </Card>

        {cp.caption && (
          <Card data-animate="approval-section" className="shadow-none">
            <CardHeader className="pb-0">
              <CardTitle className="text-[0.75rem] uppercase tracking-[0.06em] text-muted-foreground">Caption</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-[0.82rem] leading-[1.65] text-foreground/85">{cp.caption}</p>
            </CardContent>
          </Card>
        )}

        {cp.notes && (
          <Card data-animate="approval-section" className="border-lemon/25 bg-lemon/10 shadow-none">
            <CardContent className="flex gap-2.5 py-3.5">
              <span className="shrink-0 text-base">📝</span>
              <div>
                <p className="mb-1 text-[0.6rem] font-bold uppercase tracking-[0.04em] text-lemon">Team Note</p>
                <p className="text-[0.78rem] leading-[1.5] text-foreground/85">{cp.notes}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {assignees.length > 0 && (
          <Card data-animate="approval-section" className="shadow-none">
            <CardHeader className="pb-0">
              <CardTitle className="text-[0.75rem] uppercase tracking-[0.06em] text-muted-foreground">Created by</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {assignees.map(assignee => (
                  <div key={assignee.id} className="flex items-center gap-2">
                    <UserAvatar userId={assignee.id} name={assignee.name} size="sm" />
                    <div>
                      <p className="text-[0.72rem] font-bold text-foreground">{assignee.name}</p>
                      <p className="text-[0.6rem] capitalize text-muted-foreground">{assignee.role}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card data-animate="approval-section" className="shadow-none">
          <CardContent className="py-3.5">
            <p className="mb-3 text-[0.78rem] font-extrabold text-foreground">Your decision</p>

            <div className="mb-3 grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  setDecision('approved')
                  setShowNoteBox(false)
                }}
                className={cn(
                  'rounded-[14px] border-2 px-3 py-3.5 text-center transition-all',
                  decision === 'approved' ? 'border-success bg-success/5' : 'border-border bg-card'
                )}
              >
                <div className="mb-1 text-[1.4rem]">✓</div>
                <p className={cn('text-[0.78rem] font-extrabold', decision === 'approved' ? 'text-success' : 'text-muted-foreground')}>Approve</p>
                <p className="text-[0.62rem] text-muted-foreground">Looks great!</p>
              </button>

              <button
                onClick={() => {
                  setDecision('revision')
                  setShowNoteBox(true)
                }}
                className={cn(
                  'rounded-[14px] border-2 px-3 py-3.5 text-center transition-all',
                  decision === 'revision' ? 'border-coral bg-coral/5' : 'border-border bg-card'
                )}
              >
                <div className="mb-1 text-[1.4rem]">✏️</div>
                <p className={cn('text-[0.78rem] font-extrabold', decision === 'revision' ? 'text-coral' : 'text-muted-foreground')}>Request Changes</p>
                <p className="text-[0.62rem] text-muted-foreground">Add feedback</p>
              </button>
            </div>

            {showNoteBox && (
              <div className="mb-3">
                <Textarea
                  placeholder="What would you like changed? Be as specific as possible..."
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  rows={3}
                  className="resize-none bg-background leading-[1.6]"
                />
              </div>
            )}

            <Button
              onClick={handleSubmit}
              disabled={!decision || (decision === 'revision' && !note.trim()) || submitting}
              className={cn(
                'w-full text-[0.88rem] font-extrabold',
                !decision && 'bg-muted text-muted-foreground hover:bg-muted',
                decision === 'approved' && 'bg-success text-white hover:bg-success/85',
                decision === 'revision' && 'bg-coral text-white hover:bg-coral/85',
                ((decision === 'revision' && !note.trim()) || submitting) && 'opacity-50'
              )}
            >
              {!decision ? 'Select an option above' : decision === 'approved' ? 'Submit Approval ✓' : 'Send Feedback ->'}
            </Button>
          </CardContent>
        </Card>

        <div className="h-6" />
      </div>
    </main>
  )
}
