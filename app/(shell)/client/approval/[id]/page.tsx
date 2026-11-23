'use client'

import { useState, useEffect, useRef } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { useRouter, useParams } from 'next/navigation'

import { CelebrateCharacter } from '@/components/illustrations'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { StatusIcon, TypeIcon } from '@/components/ui/type-icon'
import { UserAvatar } from '@/components/ui/user-avatar'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/supabase/useUser'
import { cn } from '@/lib/utils'
import { CONTENT_TYPE_STYLE } from '@/lib/color-map'
import { needsClientAction, type ContentType } from '@/lib/types'

gsap.registerPlugin(useGSAP)

type ContentRow = {
  id: string
  title: string
  type: string
  status: string
  caption: string | null
  scheduled_date: string
  platforms: string[]
  assigned_to: string[]
  client_id: string
}
type ClientRow = { id: string; name: string; initials: string }
type UserRow = { id: string; name: string; role: string }

const PLATFORM_ICONS: Record<string, string> = {
  instagram: 'IG',
  tiktok: 'TT',
  facebook: 'FB',
  linkedin: 'LI',
}

function formatDate(s: string) {
  return new Date(`${s}T00:00:00`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
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
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data: piece } = await supabase
        .from('content_pieces_client')
        .select('id, title, type, status, caption, scheduled_date, platforms, assigned_to, client_id')
        .eq('id', id)
        .single()
      if (!piece) return
      setCp(piece)

      const [clientRes, orgUsersRes] = await Promise.all([
        supabase.from('clients').select('id, name, initials').eq('id', piece.client_id).single(),
        // Plain `users` SELECT is locked to self+admin (protects salary/email/phone),
        // which silently returns nothing for a client account — go through the
        // safe org-wide name/role lookup instead. See get_org_users_safe().
        supabase.rpc('get_org_users_safe'),
      ])
      if (clientRes.data) setClient(clientRes.data)
      const assignedIds = new Set(piece.assigned_to ?? [])
      if (orgUsersRes.data) setAssignees((orgUsersRes.data as UserRow[]).filter(u => assignedIds.has(u.id)))
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
    setSubmitError(null)
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    let hadError = false

    if (decision === 'approved') {
      const { data, error } = await supabase.rpc('client_review_content', { p_id: id, p_action: 'approve' })
      hadError = Boolean(error) || !data
    } else {
      const [feedbackRes, statusRes] = await Promise.all([
        supabase.from('feedback_comments').insert({
          content_id: id,
          author_id: authUser?.id,
          author_name: user?.name ?? 'Client',
          author_type: 'client',
          text: note,
          resolved: false,
          org_id: user?.org_id,
        }),
        supabase.rpc('client_review_content', { p_id: id, p_action: 'changes' }),
      ])
      hadError = Boolean(feedbackRes.error) || Boolean(statusRes.error) || !statusRes.data
    }

    setSubmitting(false)
    if (hadError) {
      setSubmitError('Something went wrong sending your feedback. Please try again.')
      return
    }

    setSubmitted(true)
    setTimeout(() => router.push('/client'), 2200)
  }

  if (!cp) return null

  const tc = CONTENT_TYPE_STYLE[cp.type as ContentType] ?? CONTENT_TYPE_STYLE.graphic
  const isActionable = needsClientAction(cp.status)

  return (
    <main className="page-main relative flex min-w-0 flex-1 flex-col overflow-y-auto bg-background">
      {submitted && (
        <div
          ref={overlayRef}
          className={cn(
            'absolute inset-0 z-50 flex flex-col items-center justify-center gap-4 px-10 text-center',
            decision === 'approved' ? 'bg-success/5' : 'bg-wash'
          )}
        >
          <CelebrateCharacter
            className="size-32"
            title={decision === 'approved' ? 'Celebrating your approval' : 'Feedback sent'}
          />
          <div>
            <h2 className="mb-1.5 text-[1.3rem] font-extrabold text-foreground">
              {decision === 'approved' ? 'Approved, nice one!' : 'Thanks, feedback sent!'}
            </h2>
            <p className="text-[0.8rem] text-muted-foreground">
              {decision === 'approved'
                ? 'Your team has been notified and will schedule this content.'
                : "Your feedback has been sent to the team. They'll get back to you soon."}
            </p>
          </div>
        </div>
      )}

      <div className="flex shrink-0 items-center gap-3 bg-dark px-5 py-[14px] text-dark-text">
        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => router.back()}
          className="border-dark-hover bg-dark-raised text-dark-muted hover:bg-dark-hover hover:text-dark-text"
        >
          ←
        </Button>
        <div className="flex-1">
          <p className="text-[0.6rem] uppercase tracking-[0.08em] text-dark-muted">Approval Request</p>
          <p className="text-[0.95rem] font-extrabold leading-[1.2] text-dark-text">{cp.title}</p>
        </div>
        <div
          className="flex size-[34px] shrink-0 items-center justify-center rounded-[10px] bg-mint text-[11px] font-extrabold text-dark"
        >
          {client?.initials ?? '?'}
        </div>
      </div>

      <div ref={containerRef} className="flex flex-1 flex-col gap-3.5 px-4 py-4">
        <Card data-animate="approval-section" className="overflow-hidden py-0 shadow-none">
          <div className="flex h-[220px] flex-col items-center justify-center border-b border-border bg-wash">
            <div className="mb-3 flex size-[72px] items-center justify-center rounded-[18px] bg-primary text-primary-foreground">
              <TypeIcon name={tc.icon} className="size-8" />
            </div>
            <p className="text-[0.72rem] font-semibold text-muted-foreground">{tc.label} Preview</p>
            <p className="text-[0.62rem] text-muted-foreground">Asset file would appear here</p>
          </div>

          <CardContent className="px-3.5 py-3.5">
            <div className="mb-2.5 flex flex-wrap gap-1.5">
              <Badge variant="outline" className={cn('gap-1', tc.className)}>
                <TypeIcon name={tc.icon} className="size-2.5" />
                {tc.label}
              </Badge>
              {(cp.platforms ?? []).map(platform => (
                <Badge key={platform} variant="outline" className="bg-wash text-muted-foreground">
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

        {!isActionable ? (
          <Card data-animate="approval-section" className="border-success/30 bg-success/5 shadow-none">
            <CardContent className="flex items-center gap-3 py-4">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-success text-success-foreground">
                {cp.status === 'approved' || cp.status === 'scheduled' || cp.status === 'posted' ? (
                  <StatusIcon name="check" className="size-4" />
                ) : (
                  <StatusIcon name="clock" className="size-4" />
                )}
              </span>
              <div>
                <p className="text-[0.82rem] font-extrabold text-foreground">
                  {cp.status === 'approved' || cp.status === 'scheduled' || cp.status === 'posted'
                    ? 'Already approved'
                    : 'Not ready for review yet'}
                </p>
                <p className="text-[0.72rem] text-muted-foreground">
                  {cp.status === 'approved' || cp.status === 'scheduled' || cp.status === 'posted'
                    ? "You've already reviewed this piece — no action needed."
                    : "Your team is still working on this — check back once it's ready."}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
        <Card data-animate="approval-section" className="shadow-none">
          <CardContent className="py-3.5">
            <p className="mb-3 text-[0.78rem] font-extrabold text-foreground">Your decision</p>

            <div className="mb-3 grid grid-cols-2 gap-2">
              <Button
                type="button"
                aria-pressed={decision === 'approved'}
                onClick={() => {
                  setDecision('approved')
                  setShowNoteBox(false)
                }}
                className={cn(
                  'h-auto min-h-11 flex-col gap-0.5 rounded-[14px] px-3 py-3.5 transition-all',
                  decision === 'approved' && 'ring-2 ring-primary ring-offset-2 ring-offset-card'
                )}
              >
                <span className="flex items-center gap-1.5 text-[0.82rem] font-extrabold">
                  <StatusIcon name="check" className="size-4" />
                  Approve
                </span>
                <span className="text-[0.62rem] font-medium opacity-80">Looks great!</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                aria-pressed={decision === 'revision'}
                onClick={() => {
                  setDecision('revision')
                  setShowNoteBox(true)
                }}
                className={cn(
                  'h-auto min-h-11 flex-col gap-0.5 rounded-[14px] border-2 px-3 py-3.5 transition-all',
                  decision === 'revision' ? 'border-primary bg-wash text-primary' : 'border-border text-muted-foreground'
                )}
              >
                <span className="text-[0.82rem] font-extrabold">Request changes</span>
                <span className="text-[0.62rem] font-medium">Add feedback</span>
              </Button>
            </div>

            {showNoteBox && (
              <div className="mb-3">
                <Textarea
                  placeholder="What would you like changed? Be as specific as possible..."
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  rows={3}
                  className="resize-none bg-card leading-[1.6]"
                />
              </div>
            )}

            {submitError && (
              <p className="mb-2 text-[0.72rem] font-semibold text-danger" role="alert">{submitError}</p>
            )}

            <Button
              onClick={handleSubmit}
              disabled={!decision || (decision === 'revision' && !note.trim()) || submitting}
              className="w-full text-[0.88rem] font-extrabold"
            >
              {submitting ? 'Sending…' : !decision ? 'Select an option above' : decision === 'approved' ? 'Submit approval' : 'Send feedback'}
            </Button>
          </CardContent>
        </Card>
        )}

        <div className="h-6" />
      </div>
    </main>
  )
}
