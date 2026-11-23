'use client'

import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'

import AddClientModal from '@/components/AddClientModal'
import CreateUserModal from '@/components/CreateUserModal'
import { PlanLimitDialog } from '@/components/PlanLimitDialog'
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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { PlatformBadge } from '@/components/ui/platform-badge'
import { StatusBadge } from '@/components/ui/status-badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { UserAvatar } from '@/components/ui/user-avatar'
import { createClient } from '@/lib/supabase/client'
import { useOrg } from '@/lib/supabase/OrgContext'
import { useUser } from '@/lib/supabase/useUser'
import { PLAN_LIMITS, needsClientAction, type OrgPlan, type Platform } from '@/lib/types'
import { cn } from '@/lib/utils'
import { effectiveInvoiceStatus } from '@/lib/finance'

gsap.registerPlugin(useGSAP)

type DetailTab = 'overview' | 'invoices' | 'content' | 'feedback' | 'team' | 'edit'
type InvoiceStatus = 'paid' | 'pending' | 'overdue'

const ASSIGNABLE_ROLES = ['writer', 'designer', 'videographer', 'editor', 'poster'] as const
type AssignableRole = typeof ASSIGNABLE_ROLES[number]

const ROLE_LABELS: Record<AssignableRole, string> = {
  writer: 'Content Writer',
  designer: 'Designer',
  videographer: 'Videographer',
  editor: 'Video Editor',
  poster: 'Poster',
}

const INVOICE_BADGE: Record<InvoiceStatus, { status: 'approved' | 'planned' | 'overdue'; label: string; dueSoon?: boolean }> = {
  paid: { status: 'approved', label: 'Paid' },
  pending: { status: 'planned', label: 'Pending', dueSoon: true },
  overdue: { status: 'overdue', label: 'Overdue' },
}

type ClientRow = {
  id: string
  name: string
  industry: string
  brand_color: string
  platforms: Platform[]
  requires_client_approval: boolean
  initials: string
  pending_approvals: number
  monthly_retainer: number | null
  contact_name: string | null
  contact_email: string | null
  contract_start: string | null
  notes: string | null
  content_quota: number
}

type InvoiceRow = {
  id: string
  client_id: string
  month: string
  amount: number
  status: InvoiceStatus
  due_date: string
  paid_at: string | null
  description: string
}

type ContentRow = {
  id: string
  client_id: string
  title: string
  type: string
  status: string
  scheduled_date: string
}

type FeedbackRow = {
  id: string
  content_id: string
  author_name: string
  author_type: string
  text: string
  created_at: string
  resolved: boolean
  parent_id: string | null
}

type ClientTeamRow = { id: string; client_id: string; role: string; user_id: string }
type UserSlim = { id: string; name: string; role: string }

function fmt(n: number) {
  return `$${n.toLocaleString()}`
}

function relDate(s: string) {
  const d = new Date(`${s}T00:00:00`)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  if (diff < 0) return `${Math.abs(diff)}d ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function paidAtLabel(date: string | null) {
  if (!date) return 'Paid'
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/** Token-based readable foreground for a client's own brand color (hex or hsl). */
function brandForeground(color: string): string {
  let lightness = 0.4
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color.trim())
  const hsl = /^hsl\(\s*[\d.]+\s*,\s*[\d.]+%\s*,\s*([\d.]+)%/i.exec(color.trim())
  if (hsl) lightness = Number(hsl[1]) / 100
  else if (hex) {
    const h = hex[1].length === 3 ? hex[1].replace(/./g, c => c + c) : hex[1]
    const [r, g, b] = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16) / 255)
    lightness = 0.2126 * r + 0.7152 * g + 0.0722 * b
  }
  return lightness > 0.55 ? 'text-dark' : 'text-dark-text'
}

function clientStyle(color: string): CSSProperties {
  return { '--client-color': color } as CSSProperties
}

function widthStyle(width: number): CSSProperties {
  return { '--fill-width': `${width}%` } as CSSProperties
}

function ClientAvatar({ initials, color, size = 'md' }: { initials: string; color: string; size?: 'sm' | 'md' | 'lg' }) {
  const dimension = size === 'sm' ? 'size-8 rounded-lg text-[0.65rem]' : size === 'lg' ? 'size-12 rounded-2xl text-sm' : 'size-11 rounded-xl text-xs'
  return (
    <div
      className={cn('flex items-center justify-center bg-[var(--client-color)] font-extrabold', brandForeground(color), dimension)}
      style={clientStyle(color)}
    >
      {initials}
    </div>
  )
}

function MetricPill({ value, label, valueClass }: { value: string | number; label: string; valueClass: string }) {
  return (
    <div className="flex flex-col items-end gap-0.5 text-right">
      <p className={cn('text-base font-extrabold tracking-tight', valueClass)}>{value}</p>
      <p className="text-[0.65rem] text-muted-foreground">{label}</p>
    </div>
  )
}

function FieldBlock({ label, htmlFor, children }: { label: string; htmlFor?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={htmlFor} className="text-xs font-semibold text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  )
}

function ClientsEmpty({ title, body }: { title: string; body: string }) {
  return <EmptyState icon="📁" title={title} body={body} className="border-border bg-card px-6 py-10" />
}

export default function ClientsPage() {
  const { user } = useUser()
  const containerRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detailTab, setDetailTab] = useState<DetailTab>('overview')
  const [clients, setClients] = useState<ClientRow[]>([])
  const [invoices, setInvoices] = useState<InvoiceRow[]>([])
  const [content, setContent] = useState<ContentRow[]>([])
  const [feedback, setFeedback] = useState<FeedbackRow[]>([])
  const [teamRows, setTeamRows] = useState<ClientTeamRow[]>([])
  const [allUsers, setAllUsers] = useState<UserSlim[]>([])
  const [draft, setDraft] = useState<Partial<ClientRow>>({})
  const [showAddClient, setShowAddClient] = useState(false)
  const [showLimit, setShowLimit] = useState(false)
  const [pageError, setPageError] = useState('')

  const { org, loading: orgLoading } = useOrg()
  const planLimits = org ? PLAN_LIMITS[org.plan as OrgPlan] : null
  const clientCapReached = !orgLoading && !!planLimits && planLimits.maxClients !== -1 && clients.length >= planLimits.maxClients

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const [cliRes, invRes, cntRes, fbRes, teamRes, usrRes] = await Promise.all([
        supabase.from('clients').select('id, name, industry, brand_color, platforms, requires_client_approval, initials, pending_approvals, monthly_retainer, contact_name, contact_email, contract_start, notes, content_quota').order('name'),
        supabase.from('invoices').select('id, client_id, month, amount, status, due_date, paid_at, description').order('created_at', { ascending: false }),
        supabase.from('content_pieces').select('id, client_id, title, type, status, scheduled_date').order('scheduled_date'),
        supabase.from('feedback_comments').select('id, content_id, author_name, author_type, text, created_at, resolved, parent_id').order('created_at'),
        supabase.from('client_team').select('id, client_id, role, user_id'),
        supabase.from('users').select('id, name, role').neq('role', 'client'),
      ])

      if (cliRes.error || invRes.error || cntRes.error || fbRes.error || teamRes.error || usrRes.error) {
        setPageError('Could not load client data. Try refreshing the page.')
      }

      setClients((cliRes.data || []) as ClientRow[])
      setInvoices((invRes.data || []) as InvoiceRow[])
      setContent(cntRes.data || [])
      setFeedback(fbRes.data || [])
      setTeamRows(teamRes.data || [])
      setAllUsers(usrRes.data || [])
      setMounted(true)
    }

    load()
  }, [])

  useGSAP(
    () => {
      if (!mounted || !containerRef.current) return
      gsap.fromTo(
        '[data-animate="client-card"]',
        { y: 16, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.35, stagger: 0.07, ease: 'back.out(1.2)', clearProps: 'all' }
      )
    },
    { dependencies: [mounted], scope: containerRef }
  )

  if (!mounted) {
    return (
      <div className="flex min-w-0 flex-1 flex-col gap-3.5 px-4 py-5" aria-busy="true" aria-label="Loading clients">
        <Skeleton className="h-14 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
      </div>
    )
  }

  const selected = selectedId ? clients.find(client => client.id === selectedId) ?? null : null

  function selectClient(id: string) {
    setSelectedId(prev => (prev === id ? null : id))
    setDetailTab('overview')
    setDraft({})
  }

  async function markInvoicePaid(invId: string) {
    const now = new Date().toISOString()
    setPageError('')
    setInvoices(prev => prev.map(invoice => (invoice.id === invId ? { ...invoice, status: 'paid', paid_at: now } : invoice)))
    const supabase = createClient()
    const { data, error } = await supabase.from('invoices').update({ status: 'paid', paid_at: now }).eq('id', invId).select('id').single()
    if (error || !data) {
      setInvoices(prev => prev.map(invoice => (invoice.id === invId ? { ...invoice, status: 'pending', paid_at: null } : invoice)))
      setPageError('Could not mark that invoice paid. Please try again.')
    }
  }

  async function saveEdit() {
    if (!selected) return
    const previous = selected
    setPageError('')
    setClients(prev => prev.map(client => (client.id === selected.id ? { ...client, ...draft } : client)))
    setDraft({})
    setDetailTab('overview')
    const supabase = createClient()
    const { data, error } = await supabase.from('clients').update(draft).eq('id', selected.id).select('id').single()
    if (error || !data) {
      setClients(prev => prev.map(client => (client.id === previous.id ? previous : client)))
      setPageError('Could not save those changes. Please try again.')
    }
  }

  async function saveTeamAssignment(clientId: string, role: string, userId: string | null) {
    const supabase = createClient()
    setPageError('')
    if (userId) {
      const { data, error } = await supabase
        .from('client_team')
        .upsert({ client_id: clientId, role, user_id: userId, org_id: user?.org_id }, { onConflict: 'client_id,role' })
        .select('id')
        .single()

      if (error || !data) {
        setPageError('Could not save that assignment. Please try again.')
        return
      }

      setTeamRows(prev => {
        const filtered = prev.filter(row => !(row.client_id === clientId && row.role === role))
        return [...filtered, { id: crypto.randomUUID(), client_id: clientId, role, user_id: userId }]
      })
      return
    }

    const { error: deleteError } = await supabase.from('client_team').delete().eq('client_id', clientId).eq('role', role)
    if (deleteError) {
      setPageError('Could not remove that assignment. Please try again.')
      return
    }
    setTeamRows(prev => prev.filter(row => !(row.client_id === clientId && row.role === role)))
  }

  const totalContent = content.length
  const totalPending = content.filter(piece => needsClientAction(piece.status)).length
  const totalRevenue = invoices.filter(invoice => invoice.status === 'paid').reduce((sum, invoice) => sum + Number(invoice.amount), 0)
  const overdueInv = invoices.filter(invoice => effectiveInvoiceStatus(invoice) === 'overdue').reduce((sum, invoice) => sum + Number(invoice.amount), 0)

  return (
    <main className="page-main flex min-w-0 flex-1 overflow-hidden bg-background">
      <div className={cn('flex flex-1 overflow-hidden', selected && 'gap-5 px-4 py-4 md:px-5')}>
        <section
          className={cn(
            'flex h-full flex-col overflow-hidden border-border bg-card text-foreground transition-all duration-300',
            selected ? 'w-[320px] rounded-2xl border' : 'flex-1'
          )}
        >
          <div className="flex flex-col gap-4 border-b border-border px-5 py-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-col gap-1">
                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Admin</p>
                <h1 className="text-2xl font-extrabold tracking-tight">Clients</h1>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-3">
                <MetricPill value={clients.length} label="clients" valueClass="text-primary" />
                <Separator orientation="vertical" className="hidden h-7 bg-foreground/10 sm:block" />
                <MetricPill value={fmt(totalRevenue)} label="collected" valueClass="text-success" />
                {overdueInv > 0 && (
                  <>
                    <Separator orientation="vertical" className="hidden h-7 bg-foreground/10 sm:block" />
                    <MetricPill value={fmt(overdueInv)} label="overdue" valueClass="text-danger" />
                  </>
                )}
                <Button
                  onClick={() => (clientCapReached ? setShowLimit(true) : setShowAddClient(true))}
                  className="bg-primary text-primary-foreground hover:bg-primary/85"
                >
                  Add Client
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="border-border bg-foreground/5 px-3 py-1 text-muted-foreground">
                {totalContent} pieces this month
              </Badge>
              {totalPending > 0 && (
                <Badge variant="outline" className="border-primary/30 bg-wash px-3 py-1 text-primary">
                  {totalPending} awaiting approval
                </Badge>
              )}
            </div>
          </div>

          {pageError && (
            <div className="mx-4 mt-3 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs font-medium text-danger">
              {pageError}
            </div>
          )}

          <div ref={containerRef} className={cn('flex-1 overflow-y-auto p-4', !selected && 'bg-background text-foreground')}>
            {!selected ? (
              clients.length === 0 ? (
                <ClientsEmpty title="No clients yet" body="Create a client to start tracking revenue, content, and team assignments." />
              ) : (
                <div className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-3">
                  {clients.map(client => (
                    <ClientOverviewCard
                      key={client.id}
                      client={client}
                      invoices={invoices.filter(invoice => invoice.client_id === client.id)}
                      content={content.filter(piece => piece.client_id === client.id)}
                      teamCount={teamRows.filter(row => row.client_id === client.id).length}
                      onSelect={() => selectClient(client.id)}
                    />
                  ))}
                </div>
              )
            ) : (
              <div className="flex flex-col gap-1.5">
                {clients.map(client => {
                  const active = client.id === selectedId
                  const hasOverdue = invoices.some(invoice => invoice.client_id === client.id && effectiveInvoiceStatus(invoice) === 'overdue')
                  const pendingCount = content.filter(piece => piece.client_id === client.id && needsClientAction(piece.status)).length

                  return (
                    <button
                      key={client.id}
                      type="button"
                      data-animate="client-card"
                      onClick={() => selectClient(client.id)}
                      className={cn(
                        'flex items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors',
                        active ? 'bg-foreground/10' : 'hover:bg-foreground/5'
                      )}
                    >
                      <ClientAvatar initials={client.initials} color={client.brand_color} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-foreground">{client.name}</p>
                        <p className="text-[0.7rem] text-muted-foreground">{client.industry}</p>
                      </div>
                      {hasOverdue && <div className="size-2 rounded-full bg-danger" />}
                      {!hasOverdue && pendingCount > 0 && <div className="size-2 rounded-full bg-primary" />}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </section>

        {selected && (
          <ClientDetail
            client={selected}
            invoices={invoices.filter(invoice => invoice.client_id === selected.id)}
            content={content.filter(piece => piece.client_id === selected.id)}
            feedback={feedback.filter(item => {
              const piece = content.find(contentPiece => contentPiece.id === item.content_id)
              return piece?.client_id === selected.id
            })}
            teamRows={teamRows.filter(row => row.client_id === selected.id)}
            allUsers={allUsers}
            tab={detailTab}
            draft={draft}
            onTabChange={setDetailTab}
            onClose={() => setSelectedId(null)}
            onMarkPaid={markInvoicePaid}
            onDraftChange={setDraft}
            onSaveEdit={saveEdit}
            onTeamSave={(role, userId) => saveTeamAssignment(selected.id, role, userId)}
          />
        )}
      </div>

      {planLimits && (
        <PlanLimitDialog
          open={showLimit}
          onClose={() => setShowLimit(false)}
          resource="clients"
          plan={org!.plan as OrgPlan}
          limit={planLimits.maxClients}
        />
      )}

      {showAddClient && (
        <AddClientModal
          onClose={() => setShowAddClient(false)}
          onCreated={() => {
            const supabase = createClient()
            supabase
              .from('clients')
              .select('id, name, industry, brand_color, platforms, requires_client_approval, initials, pending_approvals, monthly_retainer, contact_name, contact_email, contract_start, notes, content_quota')
              .order('name')
              .then(({ data, error }) => {
                if (error) { setPageError('Client was created, but the list failed to refresh. Try reloading the page.'); return }
                if (data) setClients(data as ClientRow[])
              })
          }}
        />
      )}
    </main>
  )
}

function ClientOverviewCard({
  client,
  invoices,
  content,
  teamCount,
  onSelect,
}: {
  client: ClientRow
  invoices: InvoiceRow[]
  content: ContentRow[]
  teamCount: number
  onSelect: () => void
}) {
  const totalBilled = invoices.reduce((sum, invoice) => sum + Number(invoice.amount), 0)
  const collected = invoices.filter(invoice => invoice.status === 'paid').reduce((sum, invoice) => sum + Number(invoice.amount), 0)
  const hasOverdue = invoices.some(invoice => effectiveInvoiceStatus(invoice) === 'overdue')
  const pct = totalBilled > 0 ? Math.round((collected / totalBilled) * 100) : 0
  const posted = content.filter(piece => piece.status === 'posted').length
  const upcoming = content.filter(piece => ['planned', 'brief-ready', 'in-design', 'in-editing'].includes(piece.status)).length
  const pendingCount = content.filter(piece => needsClientAction(piece.status)).length

  return (
    <Card
      data-animate="client-card"
      className={cn(
        'cursor-pointer gap-4 overflow-hidden border-border transition-transform duration-150 hover:-translate-y-0.5',
        hasOverdue && 'border-danger/40'
      )}
      onClick={onSelect}
    >
      <div className="h-1 bg-[var(--client-color)]" style={clientStyle(client.brand_color)} />
      <CardContent className="flex flex-col gap-4 py-0 pb-6">
        <div className="flex items-start gap-3 pt-4">
          <ClientAvatar initials={client.initials} color={client.brand_color} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-extrabold text-foreground">{client.name}</p>
            <p className="text-xs text-muted-foreground">{client.industry}</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            {hasOverdue && (
              <Badge variant="outline" className="border-danger/25 bg-danger/10 text-danger">
                Overdue
              </Badge>
            )}
            {pendingCount > 0 && (
              <Badge variant="outline" className="border-primary/30 bg-wash text-primary">
                {pendingCount} pending
              </Badge>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="text-muted-foreground">Revenue collected</span>
            <span className="font-semibold text-foreground">
              {fmt(collected)} / {fmt(totalBilled)}
            </span>
          </div>
          <div className="h-2 rounded-full bg-wash">
            <div
              className={cn(
                'h-full w-[var(--fill-width)] rounded-full transition-[width] duration-700',
                hasOverdue ? 'bg-danger' : 'bg-primary'
              )}
              style={widthStyle(pct)}
            />
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {[
            { value: content.length, label: 'Total', shell: 'bg-wash text-primary' },
            { value: client.content_quota, label: 'Quota', shell: 'bg-secondary text-foreground' },
            { value: upcoming, label: 'Upcoming', shell: 'bg-sage text-sage-ink' },
            { value: posted, label: 'Posted', shell: 'bg-success/10 text-success' },
          ].map(metric => (
            <div key={metric.label} className={cn('rounded-lg px-2 py-2 text-center', metric.shell)}>
              <p className="text-sm font-extrabold leading-none">{metric.value}</p>
              <p className="mt-1 text-[0.65rem] text-muted-foreground">{metric.label}</p>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            {client.platforms.map(platform => (
              <PlatformBadge key={platform} platform={platform} subtle />
            ))}
            {teamCount > 0 && (
              <Badge variant="outline" className="border-success/20 bg-success/10 text-success">
                {teamCount} assigned
              </Badge>
            )}
          </div>
          <span className="text-xs font-semibold text-primary">
            Manage {'->'}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

function ClientDetail({
  client,
  invoices,
  content,
  feedback,
  teamRows,
  allUsers,
  tab,
  draft,
  onTabChange,
  onClose,
  onMarkPaid,
  onDraftChange,
  onSaveEdit,
  onTeamSave,
}: {
  client: ClientRow
  invoices: InvoiceRow[]
  content: ContentRow[]
  feedback: FeedbackRow[]
  teamRows: ClientTeamRow[]
  allUsers: UserSlim[]
  tab: DetailTab
  draft: Partial<ClientRow>
  onTabChange: (t: DetailTab) => void
  onClose: () => void
  onMarkPaid: (id: string) => void
  onDraftChange: (d: Partial<ClientRow>) => void
  onSaveEdit: () => void
  onTeamSave: (role: string, userId: string | null) => void
}) {
  const [showLoginModal, setShowLoginModal] = useState(false)
  const totalBilled = invoices.reduce((sum, invoice) => sum + Number(invoice.amount), 0)
  const collected = invoices.filter(invoice => invoice.status === 'paid').reduce((sum, invoice) => sum + Number(invoice.amount), 0)
  const overdueAmt = invoices.filter(invoice => effectiveInvoiceStatus(invoice) === 'overdue').reduce((sum, invoice) => sum + Number(invoice.amount), 0)
  const openFeedback = feedback.filter(item => !item.resolved).length
  const teamCount = teamRows.length
  const quotaPct = client.content_quota > 0 ? Math.min((content.length / client.content_quota) * 100, 100) : 0

  return (
    <section className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-background">
      <Tabs value={tab} onValueChange={value => onTabChange(value as DetailTab)} className="flex h-full flex-col gap-0">
        <div className="flex flex-col gap-4 border-b border-border bg-card px-5 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <ClientAvatar initials={client.initials} color={client.brand_color} />
              <div className="flex flex-col gap-0.5">
                <h2 className="text-xl font-extrabold tracking-tight text-foreground">{client.name}</h2>
                <p className="text-sm text-muted-foreground">
                  {client.industry} · {client.contact_name || '-'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {overdueAmt > 0 && (
                <Badge variant="outline" className="border-danger/25 bg-danger/10 text-danger">
                  {fmt(overdueAmt)} overdue
                </Badge>
              )}
              <Button variant="outline" size="icon-sm" onClick={onClose}>
                ×
              </Button>
            </div>
          </div>

          <TabsList variant="line" className="h-auto gap-1 rounded-none p-0">
            {([
              { key: 'overview', label: 'Overview' },
              { key: 'team', label: `Team (${teamCount})` },
              { key: 'invoices', label: 'Invoices' },
              { key: 'content', label: `Content (${content.length})` },
              { key: 'feedback', label: `Feedback${openFeedback > 0 ? ` (${openFeedback})` : ''}` },
              { key: 'edit', label: 'Edit' },
            ] as const).map(item => (
              <TabsTrigger
                key={item.key}
                value={item.key}
                className="rounded-none px-4 py-2 pointer-coarse:min-h-11 text-sm font-semibold text-muted-foreground data-active:text-primary after:bg-primary"
              >
                {item.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          <TabsContent value="overview" className="max-w-5xl">
            <div className="flex flex-col gap-4">
              <div className="grid gap-3 md:grid-cols-3">
                {[
                  {
                    label: 'Monthly Retainer',
                    value: client.monthly_retainer ? fmt(Number(client.monthly_retainer)) : '-',
                    valueClass: 'text-primary',
                  },
                  { label: 'Collected', value: fmt(collected), valueClass: 'text-success' },
                  {
                    label: 'Outstanding',
                    value: fmt(totalBilled - collected),
                    valueClass: overdueAmt > 0 ? 'text-danger' : 'text-foreground',
                  },
                ].map(metric => (
                  <Card key={metric.label} size="sm">
                    <CardContent className="flex flex-col gap-1 py-4">
                      <p className="text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                        {metric.label}
                      </p>
                      <p
                        className={cn('text-xl font-extrabold tracking-tight', metric.valueClass)}
                      >
                        {metric.value}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card>
                <CardHeader className="gap-1">
                  <CardTitle>Monthly content quota</CardTitle>
                  <CardDescription>Pieces planned this month against the target for this client.</CardDescription>
                  <CardAction className="text-xl font-extrabold text-primary">
                    {content.length} / {client.content_quota}
                  </CardAction>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <div className="h-2 rounded-full bg-wash">
                    <div
                      className="h-full w-[var(--fill-width)] rounded-full bg-primary transition-[width] duration-700"
                      style={widthStyle(quotaPct)}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    pieces planned this month · target: {client.content_quota}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Client details</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-2">
                  {[
                    { label: 'Contact', value: client.contact_name || '-' },
                    { label: 'Email', value: client.contact_email || '-' },
                    {
                      label: 'Contract Start',
                      value: client.contract_start
                        ? new Date(`${client.contract_start}T00:00:00`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                        : '-',
                    },
                    { label: 'Approval Required', value: client.requires_client_approval ? 'Yes' : 'No' },
                  ].map(field => (
                    <div key={field.label} className="flex items-center justify-between gap-4 rounded-lg border border-border px-4 py-3">
                      <span className="text-sm text-muted-foreground">{field.label}</span>
                      <span className="text-sm font-semibold text-foreground">{field.value}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {client.notes && (
                <Card>
                  <CardHeader>
                    <CardTitle>Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm leading-7 text-foreground/85">{client.notes}</p>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardContent className="flex flex-wrap items-center gap-4 py-6">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">Client Portal Access</p>
                    <p className="text-sm text-muted-foreground">
                      Create login credentials for the client to access their portal.
                    </p>
                  </div>
                  <Button onClick={() => setShowLoginModal(true)} className="bg-primary text-primary-foreground hover:bg-primary/85">
                    Create Login
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="team" className="max-w-3xl">
            <div className="flex flex-col gap-4">
              <Card className="border-border bg-wash">
                <CardContent className="py-4">
                  <p className="text-sm font-semibold text-primary">Assigned Team</p>
                  <p className="text-sm text-muted-foreground">
                    These people will be auto-assigned tasks when new content is created for {client.name}.
                  </p>
                </CardContent>
              </Card>

              {ASSIGNABLE_ROLES.map(role => {
                const assignment = teamRows.find(row => row.role === role)
                const assignedUser = assignment ? allUsers.find(user => user.id === assignment.user_id) : null
                const usersForRole = allUsers.filter(user => user.role === role)

                return (
                  <Card key={role} className={cn(assignedUser && 'border-primary/30')}>
                    <CardContent className="flex flex-wrap items-center gap-4 py-5">
                      {assignedUser ? (
                        <div className="rounded-xl border-2 border-primary p-0.5">
                          <UserAvatar userId={assignedUser.id} name={assignedUser.name} />
                        </div>
                      ) : (
                        <div className="flex size-10 items-center justify-center rounded-xl border border-dashed border-border bg-muted text-muted-foreground">
                          ?
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">{ROLE_LABELS[role]}</p>
                        <p className={cn('text-sm font-semibold', assignedUser ? 'text-foreground' : 'text-muted-foreground')}>
                          {assignedUser ? assignedUser.name : 'Not assigned'}
                        </p>
                      </div>

                      <div className="w-full sm:w-52">
                        <Select value={assignment?.user_id || ''} onValueChange={value => onTeamSave(role, value || null)}>
                          <SelectTrigger className="w-full bg-background">
                            <SelectValue placeholder="None" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              <SelectItem value="">None</SelectItem>
                              {usersForRole.map(user => (
                                <SelectItem key={user.id} value={user.id}>
                                  {user.name}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </TabsContent>

          <TabsContent value="invoices" className="max-w-5xl">
            <div className="flex flex-col gap-4">
              <div className="grid gap-3 md:grid-cols-3">
                {[
                  { label: 'Total Billed', value: fmt(totalBilled), valueClass: 'text-primary' },
                  { label: 'Collected', value: fmt(collected), valueClass: 'text-success' },
                  {
                    label: 'Outstanding',
                    value: fmt(totalBilled - collected),
                    valueClass: overdueAmt > 0 ? 'text-danger' : 'text-foreground',
                  },
                ].map(metric => (
                  <Card key={metric.label} size="sm">
                    <CardContent className="flex flex-col gap-1 py-4">
                      <p className="text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{metric.label}</p>
                      <p className={cn('text-xl font-extrabold tracking-tight', metric.valueClass)}>{metric.value}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {invoices.length === 0 ? (
                <ClientsEmpty title="No invoices yet" body="Invoices for this client will appear here once they are created." />
              ) : (
                <Card>
                  <CardContent className="py-4">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead>Month</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Due</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invoices.map(invoice => {
                          const status = effectiveInvoiceStatus(invoice)
                          const badge = INVOICE_BADGE[status]
                          return (
                            <TableRow key={invoice.id} className={cn(status === 'overdue' && 'bg-danger/5 hover:bg-danger/10')}>
                              <TableCell className="font-semibold text-foreground">{invoice.month}</TableCell>
                              <TableCell className="max-w-72 truncate text-muted-foreground">{invoice.description}</TableCell>
                              <TableCell className="text-muted-foreground">Due {relDate(invoice.due_date)}</TableCell>
                              <TableCell>
                                <StatusBadge status={badge.status} dueSoon={badge.dueSoon}>{badge.label}</StatusBadge>
                              </TableCell>
                              <TableCell className="text-right text-sm font-extrabold text-foreground">
                                {fmt(Number(invoice.amount))}
                              </TableCell>
                              <TableCell className="text-right">
                                {invoice.status !== 'paid' ? (
                                  <Button variant="outline" size="sm" onClick={() => onMarkPaid(invoice.id)}>
                                    Mark paid
                                  </Button>
                                ) : (
                                  <span className="text-xs font-semibold text-success">{paidAtLabel(invoice.paid_at)}</span>
                                )}
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="content" className="max-w-4xl">
            {content.length === 0 ? (
              <ClientsEmpty title="No content yet" body="Planned and published content for this client will appear here." />
            ) : (
              <div className="flex flex-col gap-3">
                {[...content].sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date)).map(piece => (
                  <Card key={piece.id} size="sm">
                    <CardContent className="flex items-center gap-3 py-4">
                      <div className="size-2 rounded-full bg-primary" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-foreground">{piece.title}</p>
                        <p className="text-xs capitalize text-muted-foreground">
                          {piece.type} · {piece.status.replace(/-/g, ' ')}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground">{relDate(piece.scheduled_date)}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="feedback" className="max-w-4xl">
            {feedback.length === 0 ? (
              <ClientsEmpty title="No feedback yet" body="Client and team comments will appear here once feedback is added." />
            ) : (
              <div className="flex flex-col gap-3">
                {feedback.map(item => {
                  const piece = content.find(contentPiece => contentPiece.id === item.content_id)
                  return (
                    <Card
                      key={item.id}
                      className={cn(item.resolved ? 'opacity-80' : 'border-primary/35 bg-wash')}
                    >
                      <CardContent className="flex flex-col gap-3 py-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge
                            variant="outline"
                            className={cn(
                              item.author_type === 'client'
                                ? 'border-primary/30 bg-wash text-primary'
                                : 'border-border bg-secondary text-secondary-foreground'
                            )}
                          >
                            {item.author_type === 'client' ? 'Client' : 'Team'}
                          </Badge>
                          <p className="text-sm font-semibold text-foreground">{item.author_name}</p>
                          {item.resolved && <span className="ml-auto text-xs font-semibold text-success">Resolved</span>}
                        </div>
                        <p className="text-sm leading-7 text-foreground/85">{item.text}</p>
                        {piece && <p className="text-xs italic text-muted-foreground">On: {piece.title}</p>}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="edit" className="max-w-2xl">
            <Card>
              <CardHeader>
                <CardTitle>Edit Client</CardTitle>
                <CardDescription>Update client contact information, retainer values, and notes.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                {[
                  { label: 'Contact Name', key: 'contact_name' as const, type: 'text' },
                  { label: 'Contact Email', key: 'contact_email' as const, type: 'email' },
                  { label: 'Monthly Retainer ($)', key: 'monthly_retainer' as const, type: 'number' },
                  { label: 'Monthly Content Quota', key: 'content_quota' as const, type: 'number' },
                ].map(field => (
                  <FieldBlock key={field.key} label={field.label} htmlFor={field.key}>
                    <Input
                      id={field.key}
                      type={field.type}
                      defaultValue={String(client[field.key] ?? '')}
                      onChange={e =>
                        onDraftChange({
                          ...draft,
                          [field.key]: field.type === 'number' ? parseInt(e.target.value) || 0 : e.target.value,
                        })
                      }
                      className="bg-background"
                    />
                  </FieldBlock>
                ))}

                <FieldBlock label="Notes" htmlFor="client-notes">
                  <Textarea
                    id="client-notes"
                    defaultValue={client.notes ?? ''}
                    onChange={e => onDraftChange({ ...draft, notes: e.target.value })}
                    rows={4}
                    className="resize-y bg-background"
                  />
                </FieldBlock>

                <Button onClick={onSaveEdit} className="w-fit bg-success text-success-foreground hover:bg-success/85">
                  Save changes
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {showLoginModal && (
            <CreateUserModal
              mode="client"
              clientId={client.id}
              clientName={client.contact_name || client.name}
              defaultEmail={client.contact_email || ''}
              onClose={() => setShowLoginModal(false)}
              onSuccess={() => setShowLoginModal(false)}
            />
          )}
        </div>
      </Tabs>
    </section>
  )
}
