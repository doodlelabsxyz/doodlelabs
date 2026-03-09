'use client'

import { useEffect, useState, useRef } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { createClient } from '@/lib/supabase/client'
import CreateUserModal from '@/components/CreateUserModal'
import AddClientModal from '@/components/AddClientModal'
import { getInitials, getAvatarColor } from '@/lib/utils'

gsap.registerPlugin(useGSAP)

type DetailTab = 'overview' | 'invoices' | 'content' | 'feedback' | 'team' | 'edit'
type InvoiceStatus = 'paid' | 'pending' | 'overdue'

const INV_STATUS_CFG = {
  paid:    { label: 'Paid',    color: 'hsl(154,50%,36%)', bg: 'hsl(154,50%,90%)' },
  pending: { label: 'Pending', color: 'hsl(40,92%,40%)',  bg: 'hsl(40,92%,93%)' },
  overdue: { label: 'Overdue', color: 'hsl(4,72%,50%)',   bg: 'hsl(4,72%,93%)' },
}

const ASSIGNABLE_ROLES = ['writer', 'designer', 'videographer', 'editor', 'poster'] as const
type AssignableRole = typeof ASSIGNABLE_ROLES[number]

const ROLE_LABELS: Record<AssignableRole, string> = {
  writer: 'Content Writer', designer: 'Designer',
  videographer: 'Videographer', editor: 'Video Editor', poster: 'Poster',
}

function fmt(n: number) { return `$${n.toLocaleString()}` }

function relDate(s: string) {
  const d = new Date(s + 'T00:00:00')
  const today = new Date(); today.setHours(0,0,0,0)
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  if (diff < 0) return `${Math.abs(diff)}d ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

type ClientRow = {
  id: string; name: string; industry: string; brand_color: string; platforms: string[]
  requires_client_approval: boolean; initials: string
  pending_approvals: number; monthly_retainer: number | null
  contact_name: string | null; contact_email: string | null
  contract_start: string | null; notes: string | null
  content_this_month: number
}
type InvoiceRow = {
  id: string; client_id: string; month: string; amount: number; status: InvoiceStatus
  due_date: string; paid_at: string | null; description: string
}
type ContentRow = {
  id: string; client_id: string; title: string; type: string; status: string; scheduled_date: string
}
type FeedbackRow = {
  id: string; content_id: string; author_name: string; author_type: string
  text: string; created_at: string; resolved: boolean; parent_id: string | null
}
type ClientTeamRow = { id: string; client_id: string; role: string; user_id: string }
type UserSlim = { id: string; name: string; role: string }

export default function ClientsPage() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [mounted,       setMounted]       = useState(false)
  const [selectedId,    setSelectedId]    = useState<string | null>(null)
  const [detailTab,     setDetailTab]     = useState<DetailTab>('overview')
  const [clients,       setClients]       = useState<ClientRow[]>([])
  const [invoices,      setInvoices]      = useState<InvoiceRow[]>([])
  const [content,       setContent]       = useState<ContentRow[]>([])
  const [feedback,      setFeedback]      = useState<FeedbackRow[]>([])
  const [teamRows,      setTeamRows]      = useState<ClientTeamRow[]>([])
  const [allUsers,      setAllUsers]      = useState<UserSlim[]>([])
  const [draft,         setDraft]         = useState<Partial<ClientRow>>({})
  const [showAddClient, setShowAddClient] = useState(false)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const [cliRes, invRes, cntRes, fbRes, teamRes, usrRes] = await Promise.all([
        supabase.from('clients').select('id, name, industry, brand_color, platforms, requires_client_approval, initials, pending_approvals, monthly_retainer, contact_name, contact_email, contract_start, notes, content_this_month'),
        supabase.from('invoices').select('id, client_id, month, amount, status, due_date, paid_at, description').order('created_at', { ascending: false }),
        supabase.from('content_pieces').select('id, client_id, title, type, status, scheduled_date').order('scheduled_date'),
        supabase.from('feedback_comments').select('id, content_id, author_name, author_type, text, created_at, resolved, parent_id').order('created_at'),
        supabase.from('client_team').select('id, client_id, role, user_id'),
        supabase.from('users').select('id, name, role').neq('role', 'client'),
      ])
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

  useGSAP(() => {
    if (!mounted || !containerRef.current) return
    gsap.fromTo('.client-card',
      { y: 16, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.35, stagger: 0.07, ease: 'back.out(1.2)', clearProps: 'all' }
    )
  }, { dependencies: [mounted], scope: containerRef })

  if (!mounted) return null

  const selected = selectedId ? clients.find(c => c.id === selectedId) ?? null : null

  function selectClient(id: string) {
    setSelectedId(prev => prev === id ? null : id)
    setDetailTab('overview')
    setDraft({})
  }

  async function markInvoicePaid(invId: string) {
    const now = new Date().toISOString()
    setInvoices(prev => prev.map(i => i.id === invId ? { ...i, status: 'paid' as InvoiceStatus, paid_at: now } : i))
    const supabase = createClient()
    await supabase.from('invoices').update({ status: 'paid', paid_at: now }).eq('id', invId)
  }

  async function saveEdit() {
    if (!selected) return
    setClients(prev => prev.map(c => c.id === selected.id ? { ...c, ...draft } : c))
    setDraft({})
    setDetailTab('overview')
    const supabase = createClient()
    await supabase.from('clients').update(draft).eq('id', selected.id)
  }

  async function saveTeamAssignment(clientId: string, role: string, userId: string | null) {
    const supabase = createClient()
    if (userId) {
      await supabase.from('client_team')
        .upsert({ client_id: clientId, role, user_id: userId }, { onConflict: 'client_id,role' })
      setTeamRows(prev => {
        const filtered = prev.filter(t => !(t.client_id === clientId && t.role === role))
        return [...filtered, { id: crypto.randomUUID(), client_id: clientId, role, user_id: userId }]
      })
    } else {
      await supabase.from('client_team').delete().eq('client_id', clientId).eq('role', role)
      setTeamRows(prev => prev.filter(t => !(t.client_id === clientId && t.role === role)))
    }
  }

  const totalContent = content.length
  const totalPending = clients.reduce((s, c) => s + (c.pending_approvals || 0), 0)
  const totalRevenue = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + Number(i.amount), 0)
  const overdueInv   = invoices.filter(i => i.status === 'overdue').reduce((s, i) => s + Number(i.amount), 0)

  return (
    <main className="page-main" style={{ flex: 1, minWidth: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div className={`clients-layout${selectedId ? ' has-detail' : ''}`} style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* ── Left: client list ─────────────────────────────────────────────── */}
        <div className="clients-list-panel" style={{
          width: selectedId ? 280 : '100%', flexShrink: 0, overflowY: 'auto',
          display: 'flex', flexDirection: 'column',
          background: selectedId ? '#0F1A14' : 'hsl(42,30%,97%)',
          borderRight: selectedId ? '1px solid rgba(255,255,255,0.05)' : 'none',
          transition: 'width 0.3s cubic-bezier(0.4,0,0.2,1)',
        }}>
          <div style={{ background: '#0F1A14', padding: '18px 20px 14px', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '0.6rem', color: 'hsl(140,7%,48%)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '1px' }}>Admin</p>
                <h1 style={{ fontSize: '1.167rem', fontWeight: 800, color: 'hsl(42,22%,84%)', lineHeight: 1 }}>Clients</h1>
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <StatChip val={clients.length} label="clients" color="hsl(200,82%,62%)" />
                <div style={{ width: 1, height: 28, background: 'rgba(255,255,255,0.06)' }} />
                <StatChip val={fmt(totalRevenue)} label="collected" color="hsl(154,55%,52%)" />
                {overdueInv > 0 && <>
                  <div style={{ width: 1, height: 28, background: 'rgba(255,255,255,0.06)' }} />
                  <StatChip val={fmt(overdueInv)} label="overdue" color="hsl(4,72%,56%)" />
                </>}
                <div style={{ width: 1, height: 28, background: 'rgba(255,255,255,0.06)' }} />
                <button
                  onClick={() => setShowAddClient(true)}
                  style={{ padding: '7px 13px', borderRadius: '10px', border: 'none', cursor: 'pointer', background: 'hsl(25,82%,60%)', color: '#fff', fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap' }}
                >
                  + Add Client
                </button>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <Pill label={`${totalContent} pieces this month`} />
              {totalPending > 0 && <Pill label={`${totalPending} awaiting approval`} accent />}
            </div>
          </div>

          <div ref={containerRef} style={{ padding: '16px', flex: 1 }}>
            {!selectedId && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '12px' }}>
                {clients.map(c => (
                  <ClientOverviewCard
                    key={c.id} client={c}
                    invoices={invoices.filter(i => i.client_id === c.id)}
                    content={content.filter(cp => cp.client_id === c.id)}
                    teamCount={teamRows.filter(t => t.client_id === c.id).length}
                    onSelect={() => selectClient(c.id)}
                  />
                ))}
              </div>
            )}

            {selectedId && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {clients.map(c => {
                  const isActive   = c.id === selectedId
                  const hasOverdue = invoices.filter(i => i.client_id === c.id).some(i => i.status === 'overdue')
                  return (
                    <div
                      key={c.id}
                      className="client-card"
                      onClick={() => selectClient(c.id)}
                      style={{
                        padding: '10px 12px', borderRadius: '12px', cursor: 'pointer',
                        background: isActive ? 'rgba(255,255,255,0.09)' : 'transparent',
                        display: 'flex', alignItems: 'center', gap: '10px', transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => !isActive && ((e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.04)')}
                      onMouseLeave={e => !isActive && ((e.currentTarget as HTMLDivElement).style.background = 'transparent')}
                    >
                      <div style={{ width: 32, height: 32, borderRadius: '9px', background: c.brand_color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '10px', color: '#fff', flexShrink: 0 }}>
                        {c.initials}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: '0.78rem', fontWeight: 700, color: 'hsl(42,22%,82%)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</p>
                        <p style={{ fontSize: '0.6rem', color: 'hsl(140,7%,42%)' }}>{c.industry}</p>
                      </div>
                      {hasOverdue && <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'hsl(4,72%,55%)', flexShrink: 0 }} />}
                      {c.pending_approvals > 0 && !hasOverdue && <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'hsl(40,92%,55%)', flexShrink: 0 }} />}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Right: client detail ──────────────────────────────────────────── */}
        {selected && (
          <ClientDetail
            client={selected}
            invoices={invoices.filter(i => i.client_id === selected.id)}
            content={content.filter(cp => cp.client_id === selected.id)}
            feedback={feedback.filter(f => {
              const cp = content.find(c => c.id === f.content_id)
              return cp?.client_id === selected.id
            })}
            teamRows={teamRows.filter(t => t.client_id === selected.id)}
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

      {showAddClient && (
        <AddClientModal
          onClose={() => setShowAddClient(false)}
          onCreated={() => {
            const supabase = createClient()
            supabase.from('clients').select('id, name, industry, brand_color, platforms, requires_client_approval, initials, pending_approvals, monthly_retainer, contact_name, contact_email, contract_start, notes, content_this_month')
              .then(({ data }) => { if (data) setClients(data as ClientRow[]) })
          }}
        />
      )}
    </main>
  )
}

// ── Client overview card ───────────────────────────────────────────────────────

function ClientOverviewCard({ client, invoices, content, teamCount, onSelect }: {
  client: ClientRow; invoices: InvoiceRow[]; content: ContentRow[]
  teamCount: number; onSelect: () => void
}) {
  const totalBilled = invoices.reduce((s, i) => s + Number(i.amount), 0)
  const collected   = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + Number(i.amount), 0)
  const hasOverdue  = invoices.some(i => i.status === 'overdue')
  const pct         = totalBilled > 0 ? Math.round((collected / totalBilled) * 100) : 0
  const posted      = content.filter(c => c.status === 'posted').length
  const upcoming    = content.filter(c => ['planned','brief-ready','in-design','in-editing'].includes(c.status)).length

  return (
    <div
      className="client-card"
      onClick={onSelect}
      style={{
        background: '#fff', borderRadius: '18px',
        border: hasOverdue ? '1.5px solid hsl(4,72%,76%)' : '1px solid hsl(38,14%,90%)',
        overflow: 'hidden', cursor: 'pointer',
        transition: 'transform 0.15s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.15s ease',
      }}
      onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.transform = 'translateY(-3px)'; el.style.boxShadow = `0 12px 28px ${client.brand_color}22` }}
      onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.transform = ''; el.style.boxShadow = '' }}
    >
      <div style={{ height: 4, background: client.brand_color }} />
      <div style={{ padding: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
          <div style={{ width: 46, height: 46, borderRadius: '13px', background: client.brand_color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '14px', color: '#fff', flexShrink: 0 }}>
            {client.initials}
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '0.95rem', fontWeight: 800, color: 'hsl(24,20%,11%)' }}>{client.name}</p>
            <p style={{ fontSize: '0.65rem', color: 'hsl(24,10%,52%)' }}>{client.industry}</p>
          </div>
          {hasOverdue && <span style={{ padding: '3px 8px', borderRadius: '99px', background: 'hsl(4,72%,93%)', color: 'hsl(4,72%,46%)', fontSize: '0.6rem', fontWeight: 700 }}>Overdue</span>}
          {client.pending_approvals > 0 && <span style={{ padding: '3px 8px', borderRadius: '99px', background: 'hsl(25,82%,93%)', color: 'hsl(25,60%,38%)', fontSize: '0.6rem', fontWeight: 700 }}>{client.pending_approvals} pending</span>}
        </div>

        <div style={{ marginBottom: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
            <span style={{ fontSize: '0.6rem', color: 'hsl(24,10%,52%)' }}>Revenue collected</span>
            <span style={{ fontSize: '0.6rem', fontWeight: 700, color: 'hsl(24,20%,11%)' }}>{fmt(collected)} / {fmt(totalBilled)}</span>
          </div>
          <div style={{ height: 6, borderRadius: '99px', background: 'hsl(42,18%,92%)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, borderRadius: '99px', background: hasOverdue ? 'hsl(4,72%,52%)' : client.brand_color, transition: 'width 0.8s cubic-bezier(0.34,1.56,0.64,1)' }} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {[
            { n: content.length,             label: 'Total',    color: 'hsl(200,82%,54%)' },
            { n: client.content_this_month,  label: 'Quota',    color: 'hsl(25,82%,52%)' },
            { n: upcoming,                   label: 'Upcoming', color: 'hsl(40,92%,48%)' },
            { n: posted,                     label: 'Posted',   color: 'hsl(154,50%,40%)' },
          ].map(s => (
            <div key={s.label} style={{ flex: 1, background: `${s.color}10`, borderRadius: '8px', padding: '6px 4px', textAlign: 'center' }}>
              <p style={{ fontSize: '0.88rem', fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.n}</p>
              <p style={{ fontSize: '0.56rem', color: 'hsl(24,10%,52%)', marginTop: '2px' }}>{s.label}</p>
            </div>
          ))}
        </div>

        <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            {client.platforms.map(p => (
              <span key={p} style={{ padding: '2px 7px', borderRadius: '99px', background: 'hsl(42,18%,92%)', color: 'hsl(24,10%,44%)', fontSize: '0.58rem', fontWeight: 700, textTransform: 'capitalize' }}>{p}</span>
            ))}
            {teamCount > 0 && (
              <span style={{ padding: '2px 7px', borderRadius: '99px', background: 'hsl(154,50%,90%)', color: 'hsl(154,50%,36%)', fontSize: '0.58rem', fontWeight: 700 }}>
                {teamCount} assigned
              </span>
            )}
          </div>
          <span style={{ fontSize: '0.65rem', color: client.brand_color, fontWeight: 700 }}>Manage →</span>
        </div>
      </div>
    </div>
  )
}

// ── Client detail panel ────────────────────────────────────────────────────────

function ClientDetail({
  client, invoices, content, feedback, teamRows, allUsers, tab, draft,
  onTabChange, onClose, onMarkPaid, onDraftChange, onSaveEdit, onTeamSave,
}: {
  client: ClientRow; invoices: InvoiceRow[]; content: ContentRow[]; feedback: FeedbackRow[]
  teamRows: ClientTeamRow[]; allUsers: UserSlim[]
  tab: DetailTab; draft: Partial<ClientRow>
  onTabChange: (t: DetailTab) => void; onClose: () => void
  onMarkPaid: (id: string) => void
  onDraftChange: (d: Partial<ClientRow>) => void; onSaveEdit: () => void
  onTeamSave: (role: string, userId: string | null) => void
}) {
  const [showLoginModal, setShowLoginModal] = useState(false)
  const totalBilled  = invoices.reduce((s, i) => s + Number(i.amount), 0)
  const collected    = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + Number(i.amount), 0)
  const overdueAmt   = invoices.filter(i => i.status === 'overdue').reduce((s, i) => s + Number(i.amount), 0)
  const openFeedback = feedback.filter(f => !f.resolved).length
  const teamCount    = teamRows.length

  return (
    <div className="clients-detail-panel" style={{ flex: 1, minWidth: 0, overflowY: 'auto', background: 'hsl(42,30%,97%)', display: 'flex', flexDirection: 'column', paddingBottom: '100px' }}>

      <div style={{ background: '#fff', borderBottom: '1px solid hsl(38,14%,90%)', padding: '16px 20px 0', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
          <div style={{ width: 44, height: 44, borderRadius: '13px', background: client.brand_color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '13px', color: '#fff', flexShrink: 0 }}>
            {client.initials}
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'hsl(24,20%,11%)', lineHeight: 1.2 }}>{client.name}</h2>
            <p style={{ fontSize: '0.65rem', color: 'hsl(24,10%,48%)' }}>{client.industry} · {client.contact_name || '—'}</p>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {overdueAmt > 0 && <span style={{ padding: '4px 9px', borderRadius: '8px', background: 'hsl(4,72%,93%)', color: 'hsl(4,72%,46%)', fontSize: '0.68rem', fontWeight: 800 }}>{fmt(overdueAmt)} overdue</span>}
            <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: '8px', border: 'none', background: 'hsl(42,18%,92%)', color: 'hsl(24,10%,44%)', cursor: 'pointer', fontSize: '1rem' }}>×</button>
          </div>
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', overflowX: 'auto' }}>
          {([
            { key: 'overview', label: 'Overview' },
            { key: 'team',     label: `Team (${teamCount})` },
            { key: 'invoices', label: 'Invoices' },
            { key: 'content',  label: `Content (${content.length})` },
            { key: 'feedback', label: `Feedback${openFeedback > 0 ? ` (${openFeedback})` : ''}` },
            { key: 'edit',     label: 'Edit' },
          ] as const).map(t => (
            <button key={t.key} onClick={() => onTabChange(t.key)} style={{
              padding: '8px 14px', border: 'none', background: 'transparent', cursor: 'pointer',
              fontSize: '0.72rem', fontWeight: tab === t.key ? 700 : 500,
              color: tab === t.key ? client.brand_color : 'hsl(24,10%,52%)',
              borderBottom: tab === t.key ? `2px solid ${client.brand_color}` : '2px solid transparent',
              transition: 'all 0.15s', marginBottom: '-1px', whiteSpace: 'nowrap',
            }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: '16px 20px', flex: 1 }}>

        {/* ── Overview ── */}
        {tab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: 560 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
              {[
                { label: 'Monthly Retainer', val: client.monthly_retainer ? fmt(Number(client.monthly_retainer)) : '—', color: client.brand_color },
                { label: 'Collected',        val: fmt(collected),                  color: 'hsl(154,50%,38%)' },
                { label: 'Outstanding',      val: fmt(totalBilled - collected),    color: overdueAmt > 0 ? 'hsl(4,72%,46%)' : 'hsl(40,92%,40%)' },
              ].map(s => (
                <div key={s.label} style={{ background: '#fff', borderRadius: '12px', border: '1px solid hsl(38,14%,90%)', padding: '10px 12px' }}>
                  <p style={{ fontSize: '0.58rem', color: 'hsl(24,10%,52%)', marginBottom: '3px' }}>{s.label}</p>
                  <p style={{ fontSize: '1rem', fontWeight: 800, color: s.color }}>{s.val}</p>
                </div>
              ))}
            </div>

            {/* Monthly quota */}
            <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid hsl(38,14%,90%)', padding: '12px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <p style={{ fontSize: '0.7rem', fontWeight: 700, color: 'hsl(24,20%,11%)' }}>Monthly Content Quota</p>
                <span style={{ fontSize: '1rem', fontWeight: 800, color: client.brand_color }}>
                  {content.length} / {client.content_this_month}
                </span>
              </div>
              <div style={{ height: 8, borderRadius: '99px', background: 'hsl(42,18%,92%)', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: '99px',
                  width: `${client.content_this_month > 0 ? Math.min((content.length / client.content_this_month) * 100, 100) : 0}%`,
                  background: client.brand_color,
                  transition: 'width 0.8s cubic-bezier(0.34,1.56,0.64,1)',
                }} />
              </div>
              <p style={{ fontSize: '0.6rem', color: 'hsl(24,10%,54%)', marginTop: '6px' }}>
                pieces planned this month · target: {client.content_this_month}
              </p>
            </div>

            <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid hsl(38,14%,90%)', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { label: 'Contact',           val: client.contact_name || '—' },
                { label: 'Email',             val: client.contact_email || '—' },
                { label: 'Contract Start',    val: client.contract_start ? new Date(client.contract_start + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '—' },
                { label: 'Approval Required', val: client.requires_client_approval ? 'Yes' : 'No' },
              ].map(f => (
                <div key={f.label} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid hsl(38,14%,93%)', paddingBottom: '6px' }}>
                  <span style={{ fontSize: '0.7rem', color: 'hsl(24,10%,52%)' }}>{f.label}</span>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'hsl(24,15%,18%)' }}>{f.val}</span>
                </div>
              ))}
            </div>

            {client.notes && (
              <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid hsl(38,14%,90%)', padding: '12px 14px' }}>
                <p style={{ fontSize: '0.6rem', fontWeight: 700, color: 'hsl(24,8%,50%)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>Notes</p>
                <p style={{ fontSize: '0.78rem', color: 'hsl(24,10%,28%)', lineHeight: 1.65 }}>{client.notes}</p>
              </div>
            )}

            <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid hsl(38,14%,90%)', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '0.7rem', fontWeight: 700, color: 'hsl(24,20%,11%)', marginBottom: '2px' }}>Client Portal Access</p>
                <p style={{ fontSize: '0.65rem', color: 'hsl(24,10%,50%)' }}>Create login credentials for the client to access their portal.</p>
              </div>
              <button
                onClick={() => setShowLoginModal(true)}
                style={{ padding: '8px 14px', borderRadius: '10px', border: 'none', cursor: 'pointer', background: 'hsl(25,82%,60%)', color: '#fff', fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0 }}
              >
                Create Login
              </button>
            </div>
          </div>
        )}

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

        {/* ── Team ── */}
        {tab === 'team' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: 520 }}>
            <div style={{ background: 'hsl(200,82%,97%)', border: '1px solid hsl(200,82%,84%)', borderRadius: '12px', padding: '10px 14px', marginBottom: '4px' }}>
              <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'hsl(200,82%,32%)', marginBottom: '2px' }}>Assigned Team</p>
              <p style={{ fontSize: '0.65rem', color: 'hsl(200,60%,40%)' }}>
                These people will be auto-assigned tasks when new content is created for {client.name}.
              </p>
            </div>

            {ASSIGNABLE_ROLES.map(role => {
              const assignment = teamRows.find(t => t.role === role)
              const assignedUser = assignment ? allUsers.find(u => u.id === assignment.user_id) : null
              const usersForRole = allUsers.filter(u => u.role === role)

              return (
                <div key={role} style={{
                  background: '#fff', borderRadius: '14px',
                  border: assignedUser ? `1.5px solid ${client.brand_color}40` : '1px solid hsl(38,14%,90%)',
                  padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '14px',
                }}>
                  {/* Role avatar / placeholder */}
                  {assignedUser ? (
                    <div style={{
                      width: 40, height: 40, borderRadius: '12px', flexShrink: 0,
                      background: getAvatarColor(assignedUser.id),
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.65rem', fontWeight: 800, color: '#fff',
                      border: `2px solid ${client.brand_color}`,
                    }}>
                      {getInitials(assignedUser.name)}
                    </div>
                  ) : (
                    <div style={{
                      width: 40, height: 40, borderRadius: '12px', flexShrink: 0,
                      background: 'hsl(42,18%,93%)', border: '1.5px dashed hsl(38,14%,78%)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '1rem', color: 'hsl(24,8%,70%)',
                    }}>
                      ?
                    </div>
                  )}

                  {/* Name + role label */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '0.6rem', fontWeight: 700, color: 'hsl(24,10%,52%)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '2px' }}>
                      {ROLE_LABELS[role]}
                    </p>
                    <p style={{ fontSize: '0.82rem', fontWeight: 700, color: assignedUser ? 'hsl(24,20%,11%)' : 'hsl(24,8%,64%)' }}>
                      {assignedUser ? assignedUser.name : 'Not assigned'}
                    </p>
                  </div>

                  {/* Picker */}
                  <select
                    value={assignment?.user_id || ''}
                    onChange={e => onTeamSave(role, e.target.value || null)}
                    style={{
                      padding: '6px 10px', borderRadius: '8px',
                      border: '1px solid hsl(38,14%,86%)', background: '#fff',
                      fontSize: '0.72rem', color: 'hsl(24,15%,18%)', cursor: 'pointer',
                      fontFamily: 'inherit', outline: 'none', flexShrink: 0,
                    }}
                  >
                    <option value="">— None —</option>
                    {usersForRole.map(u => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                    {usersForRole.length === 0 && (
                      <option disabled>No {role}s in team</option>
                    )}
                  </select>
                </div>
              )
            })}
          </div>
        )}

        {/* ── Invoices ── */}
        {tab === 'invoices' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: 560 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px', marginBottom: '4px' }}>
              {[
                { label: 'Total Billed', val: fmt(totalBilled),           color: 'hsl(200,82%,40%)' },
                { label: 'Collected',    val: fmt(collected),              color: 'hsl(154,50%,36%)' },
                { label: 'Outstanding', val: fmt(totalBilled - collected), color: overdueAmt > 0 ? 'hsl(4,72%,46%)' : 'hsl(40,92%,40%)' },
              ].map(c => (
                <div key={c.label} style={{ background: '#fff', borderRadius: '10px', border: '1px solid hsl(38,14%,90%)', padding: '10px 12px' }}>
                  <p style={{ fontSize: '0.56rem', color: 'hsl(24,10%,52%)', marginBottom: '2px' }}>{c.label}</p>
                  <p style={{ fontSize: '0.95rem', fontWeight: 800, color: c.color }}>{c.val}</p>
                </div>
              ))}
            </div>
            {invoices.map(inv => {
              const sc = INV_STATUS_CFG[inv.status]
              return (
                <div key={inv.id} style={{ background: '#fff', borderRadius: '12px', border: inv.status === 'overdue' ? '1.5px solid hsl(4,72%,75%)' : '1px solid hsl(38,14%,90%)', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '2px' }}>
                      <p style={{ fontSize: '0.82rem', fontWeight: 700, color: 'hsl(24,20%,11%)' }}>{inv.month}</p>
                      <span style={{ padding: '1px 7px', borderRadius: '99px', background: sc.bg, color: sc.color, fontSize: '0.58rem', fontWeight: 700 }}>{sc.label}</span>
                    </div>
                    <p style={{ fontSize: '0.65rem', color: 'hsl(24,10%,50%)' }}>{inv.description}</p>
                    <p style={{ fontSize: '0.6rem', color: 'hsl(24,10%,58%)', marginTop: '1px' }}>Due {relDate(inv.due_date)}</p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ fontSize: '1rem', fontWeight: 800, color: sc.color }}>{fmt(Number(inv.amount))}</p>
                    {inv.status !== 'paid' ? (
                      <button onClick={() => onMarkPaid(inv.id)} style={{ marginTop: '4px', padding: '3px 9px', borderRadius: '7px', border: 'none', background: 'hsl(154,50%,90%)', color: 'hsl(154,50%,36%)', fontSize: '0.62rem', fontWeight: 700, cursor: 'pointer' }}>
                        Mark paid
                      </button>
                    ) : (
                      <p style={{ fontSize: '0.6rem', color: 'hsl(154,50%,44%)', marginTop: '2px' }}>
                        {inv.paid_at ? `✓ ${new Date(inv.paid_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : '✓ Paid'}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ── Content ── */}
        {tab === 'content' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: 560 }}>
            {[...content].sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date)).map(cp => (
              <div key={cp.id} style={{ background: '#fff', borderRadius: '12px', border: '1px solid hsl(38,14%,90%)', padding: '11px 14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: client.brand_color, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '0.8rem', fontWeight: 700, color: 'hsl(24,15%,15%)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cp.title}</p>
                  <p style={{ fontSize: '0.62rem', color: 'hsl(24,10%,52%)', marginTop: '2px', textTransform: 'capitalize' }}>{cp.type} · {cp.status.replace(/-/g, ' ')}</p>
                </div>
                <p style={{ fontSize: '0.65rem', color: 'hsl(24,10%,54%)', flexShrink: 0 }}>{relDate(cp.scheduled_date)}</p>
              </div>
            ))}
          </div>
        )}

        {/* ── Feedback ── */}
        {tab === 'feedback' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: 560 }}>
            {feedback.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px', color: 'hsl(24,10%,54%)' }}>
                <p style={{ fontSize: '1.5rem', marginBottom: '8px' }}>💬</p>
                <p style={{ fontWeight: 700, fontSize: '0.88rem' }}>No feedback yet</p>
              </div>
            )}
            {feedback.map(fb => {
              const cp = content.find(c => c.id === fb.content_id)
              return (
                <div key={fb.id} style={{ background: fb.resolved ? '#fff' : 'hsl(25,82%,98%)', borderRadius: '12px', padding: '12px 14px', border: fb.resolved ? '1px solid hsl(38,14%,90%)' : '1.5px solid hsl(25,82%,80%)', opacity: fb.resolved ? 0.7 : 1 }}>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.6rem', fontWeight: 700, color: fb.author_type === 'client' ? 'hsl(25,60%,38%)' : 'hsl(200,82%,38%)', padding: '1px 6px', borderRadius: '4px', background: fb.author_type === 'client' ? 'hsl(25,82%,92%)' : 'hsl(200,82%,92%)' }}>
                      {fb.author_type === 'client' ? 'Client' : 'Team'}
                    </span>
                    <p style={{ fontSize: '0.7rem', fontWeight: 700, color: 'hsl(24,15%,20%)' }}>{fb.author_name}</p>
                    {fb.resolved && <span style={{ marginLeft: 'auto', fontSize: '0.58rem', color: 'hsl(154,50%,36%)' }}>✓ Resolved</span>}
                  </div>
                  <p style={{ fontSize: '0.78rem', color: 'hsl(24,10%,22%)', lineHeight: 1.65, marginBottom: '6px' }}>{fb.text}</p>
                  {cp && <p style={{ fontSize: '0.62rem', color: 'hsl(24,10%,52%)', fontStyle: 'italic' }}>On: {cp.title}</p>}
                </div>
              )
            })}
          </div>
        )}

        {/* ── Edit ── */}
        {tab === 'edit' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: 480 }}>
            {[
              { label: 'Contact Name',            key: 'contact_name'        as const, type: 'text'   },
              { label: 'Contact Email',           key: 'contact_email'       as const, type: 'email'  },
              { label: 'Monthly Retainer ($)',    key: 'monthly_retainer'    as const, type: 'number' },
              { label: 'Monthly Content Quota',  key: 'content_this_month'  as const, type: 'number' },
            ].map(f => (
              <div key={f.key}>
                <p style={{ fontSize: '0.62rem', fontWeight: 700, color: 'hsl(24,10%,48%)', marginBottom: '4px' }}>{f.label}</p>
                <input
                  type={f.type}
                  defaultValue={String(client[f.key] ?? '')}
                  onChange={e => onDraftChange({ ...draft, [f.key]: f.type === 'number' ? parseInt(e.target.value) || 0 : e.target.value })}
                  style={inputStyle}
                />
              </div>
            ))}
            <div>
              <p style={{ fontSize: '0.62rem', fontWeight: 700, color: 'hsl(24,10%,48%)', marginBottom: '4px' }}>Notes</p>
              <textarea
                defaultValue={client.notes ?? ''}
                onChange={e => onDraftChange({ ...draft, notes: e.target.value })}
                rows={4}
                style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.65 }}
              />
            </div>
            <button onClick={onSaveEdit} style={{ padding: '10px 20px', borderRadius: '10px', border: 'none', background: 'hsl(154,50%,38%)', color: '#fff', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer', alignSelf: 'flex-start' }}>
              Save changes
            </button>
          </div>
        )}

        <div style={{ height: 24 }} />
      </div>
    </div>
  )
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', borderRadius: '10px',
  border: '1.5px solid hsl(38,14%,86%)', background: '#fff',
  fontSize: '0.82rem', color: 'hsl(24,15%,18%)', fontFamily: 'inherit',
  outline: 'none', boxSizing: 'border-box',
}

function StatChip({ val, label, color }: { val: string | number; label: string; color: string }) {
  return (
    <div style={{ textAlign: 'right' }}>
      <p style={{ fontSize: '0.95rem', fontWeight: 800, color, lineHeight: 1 }}>{val}</p>
      <p style={{ fontSize: '0.56rem', color: 'hsl(140,7%,44%)', marginTop: '2px' }}>{label}</p>
    </div>
  )
}

function Pill({ label, accent }: { label: string; accent?: boolean }) {
  return (
    <span style={{
      padding: '3px 10px', borderRadius: '99px', fontSize: '0.65rem', fontWeight: 600,
      background: accent ? 'hsl(25,82%,55%)' : 'rgba(255,255,255,0.06)',
      color: accent ? '#fff' : 'hsl(140,7%,48%)',
    }}>
      {label}
    </span>
  )
}
