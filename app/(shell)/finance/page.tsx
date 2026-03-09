'use client'

import { useState, useRef, useEffect } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/supabase/useUser'
import type { InvoiceStatus, ExpenseCategory } from '@/lib/types'
import { getInitials, getAvatarColor } from '@/lib/utils'

gsap.registerPlugin(useGSAP)

type Tab = 'overview' | 'invoices' | 'payroll' | 'expenses'

const EXPENSE_CAT_CFG: Record<ExpenseCategory, { label: string; color: string; bg: string; icon: string }> = {
  software:  { label: 'Software',  color: 'hsl(200,82%,44%)', bg: 'hsl(200,82%,93%)', icon: '💻' },
  equipment: { label: 'Equipment', color: 'hsl(268,60%,58%)', bg: 'hsl(268,60%,93%)', icon: '🎬' },
  freelance: { label: 'Freelance', color: 'hsl(25,82%,52%)',  bg: 'hsl(25,82%,94%)',  icon: '🤝' },
  marketing: { label: 'Marketing', color: 'hsl(40,92%,44%)',  bg: 'hsl(40,92%,94%)',  icon: '📢' },
  office:    { label: 'Office',    color: 'hsl(161,58%,40%)', bg: 'hsl(161,58%,92%)', icon: '🏢' },
  other:     { label: 'Other',     color: 'hsl(24,10%,48%)',  bg: 'hsl(42,18%,92%)',  icon: '📦' },
}

const INV_STATUS_CFG: Record<InvoiceStatus, { label: string; color: string; bg: string }> = {
  paid:    { label: 'Paid',    color: 'hsl(154,50%,36%)', bg: 'hsl(154,50%,90%)' },
  pending: { label: 'Pending', color: 'hsl(40,92%,40%)',  bg: 'hsl(40,92%,93%)' },
  overdue: { label: 'Overdue', color: 'hsl(4,72%,50%)',   bg: 'hsl(4,72%,93%)' },
}

const MONTHS = ['March 2026', 'February 2026', 'January 2026', 'December 2025']

function fmt(n: number) { return `$${n.toLocaleString()}` }

type DrawerType = 'invoice' | 'expense' | 'payroll' | null

type ClientRow = { id: string; name: string; brand_color: string; initials: string }
type UserRow   = { id: string; name: string; role: string }

type InvoiceRow = {
  id: string; client_id: string; month: string; amount: number; status: InvoiceStatus
  due_date: string; paid_at: string | null; description: string
  clients: ClientRow | ClientRow[] | null
}
type SalaryRow = {
  id: string; user_id: string; month: string; amount: number; paid: boolean
  paid_at: string | null; notes: string | null
  users: UserRow | UserRow[] | null
}
type ExpenseRow = {
  id: string; category: ExpenseCategory; description: string; amount: number
  date: string; paid_by: string
  paid_by_user: { id: string; name: string } | { id: string; name: string }[] | null
}

function normalizeOne<T>(x: T | T[] | null): T | null {
  if (!x) return null
  return Array.isArray(x) ? (x[0] ?? null) : x
}

function fmtDate(s: string) {
  return new Date(s + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function expenseToMonth(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

export default function FinancePage() {
  const { user }  = useUser()
  const heroRef   = useRef<HTMLDivElement>(null)
  const drawerRef = useRef<HTMLDivElement>(null)
  const [mounted,   setMounted]   = useState(false)
  const [tab,       setTab]       = useState<Tab>('overview')
  const [selectedMonth, setSelectedMonth] = useState('March 2026')
  const [invoices,  setInvoices]  = useState<InvoiceRow[]>([])
  const [salaries,  setSalaries]  = useState<SalaryRow[]>([])
  const [expenses,  setExpenses]  = useState<ExpenseRow[]>([])
  const [clients,   setClients]   = useState<ClientRow[]>([])
  const [users,     setUsers]     = useState<UserRow[]>([])
  const [invFilter, setInvFilter] = useState<InvoiceStatus | 'all'>('all')
  const [expFilter, setExpFilter] = useState<ExpenseCategory | 'all'>('all')
  const [drawer,    setDrawer]    = useState<DrawerType>(null)

  const [newInv, setNewInv] = useState({ client_id: '', description: '', amount: '', month: 'March 2026', due_date: '', status: 'pending' as InvoiceStatus })
  const [newExp, setNewExp] = useState({ category: 'software' as ExpenseCategory, description: '', amount: '', date: new Date().toISOString().split('T')[0], paid_by: '' })
  const [newSal, setNewSal] = useState({ user_id: '', month: 'March 2026', amount: '', notes: '' })

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const [invRes, salRes, expRes, cliRes, usrRes] = await Promise.all([
        supabase.from('invoices').select('*, clients:client_id(id, name, brand_color, initials)').order('created_at', { ascending: false }),
        supabase.from('salary_records').select('*, users:user_id(id, name, role)').order('created_at', { ascending: false }),
        supabase.from('expenses').select('*, paid_by_user:paid_by(id, name)').order('date', { ascending: false }),
        supabase.from('clients').select('id, name, brand_color, initials'),
        supabase.from('users').select('id, name, role').neq('role', 'client').order('name'),
      ])
      setInvoices((invRes.data || []) as InvoiceRow[])
      setSalaries((salRes.data || []) as SalaryRow[])
      setExpenses((expRes.data || []) as ExpenseRow[])
      setClients(cliRes.data || [])
      setUsers(usrRes.data || [])
      setMounted(true)
    }
    load()
  }, [])

  // Set form defaults once data loads
  useEffect(() => {
    if (clients.length > 0) setNewInv(p => p.client_id ? p : { ...p, client_id: clients[0].id })
    if (users.length > 0) {
      const nonAdmin = users.find(u => u.role !== 'admin')
      setNewExp(p => p.paid_by ? p : { ...p, paid_by: users[0].id })
      setNewSal(p => p.user_id ? p : { ...p, user_id: nonAdmin?.id || users[0].id })
    }
  }, [clients, users])

  useGSAP(() => {
    if (!mounted || !heroRef.current) return
    const els = heroRef.current.querySelectorAll<HTMLElement>('.fin-counter')
    els.forEach(el => {
      const target = parseInt(el.dataset.target || '0')
      gsap.fromTo(el, { textContent: 0 }, {
        textContent: target, duration: 1.1, ease: 'power2.out', snap: { textContent: 1 },
        onUpdate() { el.textContent = `$${parseInt(el.textContent || '0').toLocaleString()}` },
      })
    })
  }, { dependencies: [mounted] })

  useGSAP(() => {
    if (!drawerRef.current) return
    if (drawer) {
      gsap.fromTo(drawerRef.current, { y: '100%', opacity: 0 }, { y: '0%', opacity: 1, duration: 0.35, ease: 'power3.out' })
    }
  }, { dependencies: [drawer] })

  if (!mounted) return null

  const totalIncome   = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + Number(i.amount), 0)
  const totalPending  = invoices.filter(i => i.status === 'pending').reduce((s, i) => s + Number(i.amount), 0)
  const totalOverdue  = invoices.filter(i => i.status === 'overdue').reduce((s, i) => s + Number(i.amount), 0)
  const totalPayroll  = salaries.filter(s => s.paid).reduce((s, r) => s + Number(r.amount), 0)
  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0)
  const totalProfit   = totalIncome - totalPayroll - totalExpenses

  const monthInvoices = invoices.filter(i => i.month === selectedMonth)
  const monthSalaries = salaries.filter(s => s.month === selectedMonth)
  const monthIncome   = monthInvoices.filter(i => i.status === 'paid').reduce((s, i) => s + Number(i.amount), 0)
  const monthPayroll  = monthSalaries.reduce((s, r) => s + Number(r.amount), 0)
  const monthExpenses = expenses.filter(e => expenseToMonth(e.date) === selectedMonth).reduce((s, e) => s + Number(e.amount), 0)
  const monthProfit   = monthIncome - monthPayroll - monthExpenses

  async function markInvoicePaid(id: string) {
    const now = new Date().toISOString()
    setInvoices(prev => prev.map(i => i.id === id ? { ...i, status: 'paid' as InvoiceStatus, paid_at: now } : i))
    const supabase = createClient()
    await supabase.from('invoices').update({ status: 'paid', paid_at: now }).eq('id', id)
  }

  async function markSalaryPaid(id: string) {
    const now = new Date().toISOString()
    setSalaries(prev => prev.map(s => s.id === id ? { ...s, paid: true, paid_at: now } : s))
    const supabase = createClient()
    await supabase.from('salary_records').update({ paid: true, paid_at: now }).eq('id', id)
  }

  async function submitInvoice() {
    if (!newInv.description || !newInv.amount || !newInv.due_date || !newInv.client_id) return
    const supabase = createClient()
    const { data } = await supabase
      .from('invoices')
      .insert({ client_id: newInv.client_id, description: newInv.description, amount: parseInt(newInv.amount), status: newInv.status, month: newInv.month, due_date: newInv.due_date, org_id: user?.org_id })
      .select('*, clients:client_id(id, name, brand_color, initials)')
      .single()
    if (data) setInvoices(prev => [data as InvoiceRow, ...prev])
    setNewInv({ client_id: clients[0]?.id || '', description: '', amount: '', month: 'March 2026', due_date: '', status: 'pending' })
    setDrawer(null)
  }

  async function submitExpense() {
    if (!newExp.description || !newExp.amount) return
    const supabase = createClient()
    const { data } = await supabase
      .from('expenses')
      .insert({ category: newExp.category, description: newExp.description, amount: parseInt(newExp.amount), date: newExp.date, paid_by: newExp.paid_by, org_id: user?.org_id })
      .select('*, paid_by_user:paid_by(id, name)')
      .single()
    if (data) setExpenses(prev => [data as ExpenseRow, ...prev])
    setNewExp({ category: 'software', description: '', amount: '', date: new Date().toISOString().split('T')[0], paid_by: users[0]?.id || '' })
    setDrawer(null)
  }

  async function submitPayroll() {
    if (!newSal.amount) return
    const supabase = createClient()
    const { data } = await supabase
      .from('salary_records')
      .insert({ user_id: newSal.user_id, month: newSal.month, amount: parseInt(newSal.amount), paid: false, notes: newSal.notes || null, org_id: user?.org_id })
      .select('*, users:user_id(id, name, role)')
      .single()
    if (data) setSalaries(prev => [data as SalaryRow, ...prev])
    setNewSal({ user_id: users.find(u => u.role !== 'admin')?.id || users[0]?.id || '', month: 'March 2026', amount: '', notes: '' })
    setDrawer(null)
  }

  const filteredInvoices = invoices.filter(i => invFilter === 'all' || i.status === invFilter)
  const filteredExpenses = expenses.filter(e => expFilter === 'all' || e.category === expFilter)

  const addButtonLabel: Record<Tab, string> = {
    overview: '', invoices: '+ New Invoice', payroll: '+ Add Payroll', expenses: '+ Log Expense',
  }
  const addDrawerType: Record<Tab, DrawerType> = {
    overview: null, invoices: 'invoice', payroll: 'payroll', expenses: 'expense',
  }

  return (
    <main className="page-main" style={{ flex: 1, minWidth: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', background: 'hsl(42,30%,97%)', position: 'relative' }}>

      {drawer && (
        <div onClick={() => setDrawer(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,26,20,0.5)', zIndex: 40, backdropFilter: 'blur(2px)' }} />
      )}

      {drawer && (
        <div ref={drawerRef} onClick={e => e.stopPropagation()} style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
          background: '#fff', borderRadius: '20px 20px 0 0',
          padding: '20px 20px 32px', boxShadow: '0 -8px 40px rgba(0,0,0,0.14)',
          maxHeight: '85vh', overflowY: 'auto',
        }}>
          <div style={{ width: 36, height: 4, borderRadius: '99px', background: 'hsl(38,14%,86%)', margin: '0 auto 16px' }} />

          {drawer === 'invoice' && (
            <>
              <h3 style={drawerTitle}>New Invoice</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div>
                  <FL>Client</FL>
                  <select value={newInv.client_id} onChange={e => setNewInv(p => ({ ...p, client_id: e.target.value }))} style={sel}>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <FL>Description</FL>
                  <input placeholder="e.g. Monthly retainer — March 2026" value={newInv.description} onChange={e => setNewInv(p => ({ ...p, description: e.target.value }))} style={inp} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <FL>Amount ($)</FL>
                    <input type="number" placeholder="0" value={newInv.amount} onChange={e => setNewInv(p => ({ ...p, amount: e.target.value }))} style={inp} />
                  </div>
                  <div>
                    <FL>Status</FL>
                    <select value={newInv.status} onChange={e => setNewInv(p => ({ ...p, status: e.target.value as InvoiceStatus }))} style={sel}>
                      <option value="pending">Pending</option>
                      <option value="paid">Paid</option>
                      <option value="overdue">Overdue</option>
                    </select>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <FL>Month</FL>
                    <select value={newInv.month} onChange={e => setNewInv(p => ({ ...p, month: e.target.value }))} style={sel}>
                      {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <FL>Due Date</FL>
                    <input type="date" value={newInv.due_date} onChange={e => setNewInv(p => ({ ...p, due_date: e.target.value }))} style={inp} />
                  </div>
                </div>
                <DrawerActions onCancel={() => setDrawer(null)} onSubmit={submitInvoice} disabled={!newInv.description || !newInv.amount || !newInv.due_date || !newInv.client_id} label="Create Invoice" color="hsl(154,50%,38%)" />
              </div>
            </>
          )}

          {drawer === 'expense' && (
            <>
              <h3 style={drawerTitle}>Log Expense</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div>
                  <FL>Category</FL>
                  <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                    {(Object.keys(EXPENSE_CAT_CFG) as ExpenseCategory[]).map(cat => {
                      const cfg = EXPENSE_CAT_CFG[cat]
                      return (
                        <button key={cat} onClick={() => setNewExp(p => ({ ...p, category: cat }))} style={{
                          padding: '4px 10px', borderRadius: '8px', border: '1.5px solid',
                          borderColor: newExp.category === cat ? cfg.color : 'hsl(38,14%,86%)',
                          background: newExp.category === cat ? cfg.bg : '#fff',
                          color: newExp.category === cat ? cfg.color : 'hsl(24,10%,44%)',
                          fontSize: '0.68rem', fontWeight: 700, cursor: 'pointer',
                        }}>
                          {cfg.icon} {cfg.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
                <div>
                  <FL>Description</FL>
                  <input placeholder="What was purchased?" value={newExp.description} onChange={e => setNewExp(p => ({ ...p, description: e.target.value }))} style={inp} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <FL>Amount ($)</FL>
                    <input type="number" placeholder="0" value={newExp.amount} onChange={e => setNewExp(p => ({ ...p, amount: e.target.value }))} style={inp} />
                  </div>
                  <div>
                    <FL>Date</FL>
                    <input type="date" value={newExp.date} onChange={e => setNewExp(p => ({ ...p, date: e.target.value }))} style={inp} />
                  </div>
                </div>
                <div>
                  <FL>Paid by</FL>
                  <select value={newExp.paid_by} onChange={e => setNewExp(p => ({ ...p, paid_by: e.target.value }))} style={sel}>
                    {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
                <DrawerActions onCancel={() => setDrawer(null)} onSubmit={submitExpense} disabled={!newExp.description || !newExp.amount} label="Log Expense" color="hsl(4,72%,46%)" />
              </div>
            </>
          )}

          {drawer === 'payroll' && (
            <>
              <h3 style={drawerTitle}>Add Payroll Entry</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div>
                  <FL>Employee</FL>
                  <select value={newSal.user_id} onChange={e => setNewSal(p => ({ ...p, user_id: e.target.value }))} style={sel}>
                    {users.filter(u => u.role !== 'admin').map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <FL>Amount ($)</FL>
                    <input type="number" placeholder="0" value={newSal.amount} onChange={e => setNewSal(p => ({ ...p, amount: e.target.value }))} style={inp} />
                  </div>
                  <div>
                    <FL>Month</FL>
                    <select value={newSal.month} onChange={e => setNewSal(p => ({ ...p, month: e.target.value }))} style={sel}>
                      {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <FL>Notes (optional)</FL>
                  <input placeholder="e.g. Bonus, contract work, advance…" value={newSal.notes} onChange={e => setNewSal(p => ({ ...p, notes: e.target.value }))} style={inp} />
                </div>
                <DrawerActions onCancel={() => setDrawer(null)} onSubmit={submitPayroll} disabled={!newSal.amount} label="Add Entry" color="hsl(268,60%,52%)" />
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div ref={heroRef} style={{ background: '#0F1A14', padding: '18px 20px 0', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '0.6rem', color: 'hsl(140,7%,48%)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '2px' }}>Admin</p>
            <h1 style={{ fontSize: '1.167rem', fontWeight: 800, color: 'hsl(42,22%,84%)', lineHeight: 1 }}>Finance</h1>
          </div>
          {tab !== 'overview' && (
            <button onClick={() => setDrawer(addDrawerType[tab])} style={{
              padding: '7px 14px', borderRadius: '10px', border: 'none', cursor: 'pointer',
              background: 'hsl(25,82%,58%)', color: '#fff', fontSize: '0.75rem', fontWeight: 700,
            }}>
              {addButtonLabel[tab]}
            </button>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '14px' }}>
          {[
            { label: 'Total Income', val: totalIncome,   color: 'hsl(154,55%,52%)', dark: 'hsl(154,40%,18%)' },
            { label: 'Payroll Paid', val: totalPayroll,  color: 'hsl(4,72%,60%)',   dark: 'hsl(4,40%,14%)' },
            { label: 'Expenses',     val: totalExpenses, color: 'hsl(40,92%,58%)',  dark: 'hsl(40,40%,16%)' },
            { label: 'Net Profit',   val: totalProfit,   color: totalProfit >= 0 ? 'hsl(154,55%,52%)' : 'hsl(4,72%,60%)', dark: totalProfit >= 0 ? 'hsl(154,40%,18%)' : 'hsl(4,40%,14%)' },
          ].map(c => (
            <div key={c.label} style={{ background: c.dark, borderRadius: '12px', padding: '10px 12px' }}>
              <p style={{ fontSize: '0.54rem', color: 'hsl(140,7%,44%)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{c.label}</p>
              <p className="fin-counter" data-target={c.val} style={{ fontSize: '1rem', fontWeight: 800, color: c.color, lineHeight: 1 }}>
                {fmt(c.val)}
              </p>
            </div>
          ))}
        </div>

        {(totalPending > 0 || totalOverdue > 0) && (
          <div style={{ display: 'flex', gap: '6px', marginBottom: '14px', flexWrap: 'wrap' }}>
            {totalOverdue > 0 && <AlertPill color="hsl(4,72%,55%)" dark="hsl(4,72%,18%)" label={`${fmt(totalOverdue)} overdue`} />}
            {totalPending > 0 && <AlertPill color="hsl(40,92%,55%)" dark="hsl(40,60%,18%)" label={`${fmt(totalPending)} pending`} />}
          </div>
        )}

        <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          {(['overview', 'invoices', 'payroll', 'expenses'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '10px 16px', border: 'none', background: 'transparent', cursor: 'pointer',
              fontSize: '0.75rem', fontWeight: tab === t ? 700 : 500, textTransform: 'capitalize',
              color: tab === t ? 'hsl(25,82%,60%)' : 'hsl(140,7%,46%)',
              borderBottom: tab === t ? '2px solid hsl(25,82%,60%)' : '2px solid transparent',
              transition: 'all 0.15s', marginBottom: '-1px',
            }}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab Content ──────────────────────────────────────────────────── */}
      <div style={{ padding: '16px', flex: 1 }}>

        {tab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {MONTHS.map(m => (
                <button key={m} onClick={() => setSelectedMonth(m)} style={{
                  padding: '5px 12px', borderRadius: '99px', border: '1px solid hsl(38,14%,88%)',
                  cursor: 'pointer', background: selectedMonth === m ? 'hsl(25,82%,58%)' : '#fff',
                  color: selectedMonth === m ? '#fff' : 'hsl(24,10%,44%)',
                  fontSize: '0.72rem', fontWeight: 600, transition: 'all 0.15s',
                }}>
                  {m}
                </button>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '10px' }}>
              {[
                { label: 'Income Collected', val: monthIncome,   color: 'hsl(154,50%,38%)', bg: 'hsl(154,50%,94%)' },
                { label: 'Payroll',          val: monthPayroll,  color: 'hsl(4,72%,46%)',   bg: 'hsl(4,72%,95%)' },
                { label: 'Expenses',         val: monthExpenses, color: 'hsl(40,92%,40%)',  bg: 'hsl(40,92%,95%)' },
                { label: 'Net Profit',       val: monthProfit,   color: monthProfit >= 0 ? 'hsl(154,50%,38%)' : 'hsl(4,72%,46%)', bg: monthProfit >= 0 ? 'hsl(154,50%,94%)' : 'hsl(4,72%,95%)' },
              ].map(c => (
                <div key={c.label} style={{ background: c.bg, borderRadius: '14px', padding: '14px' }}>
                  <p style={{ fontSize: '0.6rem', color: c.color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>{c.label}</p>
                  <p style={{ fontSize: '1.3rem', fontWeight: 800, color: c.color }}>{fmt(c.val)}</p>
                </div>
              ))}
            </div>

            {/* Client revenue bars */}
            <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid hsl(38,14%,90%)', padding: '14px' }}>
              <p style={{ fontSize: '0.68rem', fontWeight: 800, color: 'hsl(24,10%,30%)', marginBottom: '12px' }}>Client Income — {selectedMonth}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {clients.map(c => {
                  const cInv  = monthInvoices.filter(i => i.client_id === c.id)
                  const total = cInv.reduce((s, i) => s + Number(i.amount), 0)
                  const paid  = cInv.filter(i => i.status === 'paid').reduce((s, i) => s + Number(i.amount), 0)
                  const pct   = total > 0 ? (paid / total) * 100 : 0
                  return (
                    <div key={c.id}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: c.brand_color }} />
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'hsl(24,15%,20%)' }}>{c.name}</span>
                        </div>
                        <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'hsl(154,50%,38%)' }}>{fmt(paid)}<span style={{ color: 'hsl(24,10%,54%)', fontWeight: 400 }}> / {fmt(total)}</span></span>
                      </div>
                      <div style={{ height: 6, borderRadius: '99px', background: 'hsl(42,18%,92%)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, borderRadius: '99px', background: c.brand_color, transition: 'width 0.8s cubic-bezier(0.34,1.56,0.64,1)' }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Expense breakdown */}
            <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid hsl(38,14%,90%)', padding: '14px' }}>
              <p style={{ fontSize: '0.68rem', fontWeight: 800, color: 'hsl(24,10%,30%)', marginBottom: '12px' }}>Expense Breakdown (all time)</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {(Object.entries(EXPENSE_CAT_CFG) as [ExpenseCategory, typeof EXPENSE_CAT_CFG[ExpenseCategory]][]).map(([cat, cfg]) => {
                  const catTotal = expenses.filter(e => e.category === cat).reduce((s, e) => s + Number(e.amount), 0)
                  if (!catTotal) return null
                  const pct = totalExpenses > 0 ? (catTotal / totalExpenses) * 100 : 0
                  return (
                    <div key={cat}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontSize: '0.72rem', color: 'hsl(24,15%,28%)' }}>{cfg.icon} {cfg.label}</span>
                        <span style={{ fontSize: '0.68rem', fontWeight: 700, color: cfg.color }}>{fmt(catTotal)}<span style={{ color: 'hsl(24,10%,56%)', fontWeight: 400 }}> ({pct.toFixed(0)}%)</span></span>
                      </div>
                      <div style={{ height: 5, borderRadius: '99px', background: 'hsl(42,18%,92%)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, borderRadius: '99px', background: cfg.color }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {tab === 'invoices' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', gap: '6px', marginBottom: '6px', flexWrap: 'wrap' }}>
              {(['all', 'paid', 'pending', 'overdue'] as const).map(f => (
                <button key={f} onClick={() => setInvFilter(f)} style={{
                  padding: '5px 12px', borderRadius: '99px', border: '1px solid hsl(38,14%,88%)', cursor: 'pointer', textTransform: 'capitalize',
                  background: invFilter === f ? (f === 'overdue' ? 'hsl(4,72%,50%)' : f === 'paid' ? 'hsl(154,50%,38%)' : f === 'pending' ? 'hsl(40,92%,48%)' : 'hsl(25,82%,58%)') : '#fff',
                  color: invFilter === f ? '#fff' : 'hsl(24,10%,44%)', fontSize: '0.72rem', fontWeight: 600,
                }}>
                  {f === 'all' ? `All (${invoices.length})` : f}
                </button>
              ))}
            </div>
            {filteredInvoices.map(inv => {
              const client = normalizeOne(inv.clients)
              const sc = INV_STATUS_CFG[inv.status]
              return (
                <div key={inv.id} style={{ background: '#fff', borderRadius: '14px', border: inv.status === 'overdue' ? '1.5px solid hsl(4,72%,72%)' : '1px solid hsl(38,14%,90%)', padding: '12px 14px', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <div style={{ width: 36, height: 36, borderRadius: '10px', background: client?.brand_color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '11px', color: '#fff', flexShrink: 0 }}>
                    {client?.initials}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px', flexWrap: 'wrap' }}>
                      <p style={{ fontSize: '0.82rem', fontWeight: 800, color: 'hsl(24,20%,11%)' }}>{client?.name}</p>
                      <span style={{ padding: '1px 7px', borderRadius: '99px', background: sc.bg, color: sc.color, fontSize: '0.58rem', fontWeight: 700 }}>{sc.label}</span>
                    </div>
                    <p style={{ fontSize: '0.68rem', color: 'hsl(24,10%,48%)' }}>{inv.description}</p>
                    <p style={{ fontSize: '0.6rem', color: 'hsl(24,10%,56%)', marginTop: '2px' }}>{inv.month} · Due {fmtDate(inv.due_date)}</p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ fontSize: '1rem', fontWeight: 800, color: sc.color }}>{fmt(Number(inv.amount))}</p>
                    {inv.status !== 'paid' ? (
                      <button onClick={() => markInvoicePaid(inv.id)} style={{ marginTop: '4px', padding: '3px 9px', borderRadius: '7px', border: 'none', background: 'hsl(154,50%,90%)', color: 'hsl(154,50%,36%)', fontSize: '0.62rem', fontWeight: 700, cursor: 'pointer' }}>Mark paid</button>
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

        {tab === 'payroll' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', gap: '6px', marginBottom: '6px', flexWrap: 'wrap' }}>
              {MONTHS.map(m => (
                <button key={m} onClick={() => setSelectedMonth(m)} style={{
                  padding: '5px 12px', borderRadius: '99px', border: '1px solid hsl(38,14%,88%)', cursor: 'pointer',
                  background: selectedMonth === m ? 'hsl(25,82%,58%)' : '#fff',
                  color: selectedMonth === m ? '#fff' : 'hsl(24,10%,44%)',
                  fontSize: '0.72rem', fontWeight: 600, transition: 'all 0.15s',
                }}>
                  {m}
                </button>
              ))}
            </div>
            <div style={{ background: 'hsl(154,50%,95%)', borderRadius: '14px', padding: '12px 14px', border: '1px solid hsl(154,50%,82%)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontSize: '0.6rem', color: 'hsl(154,40%,36%)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total — {selectedMonth}</p>
                <p style={{ fontSize: '1.4rem', fontWeight: 800, color: 'hsl(154,50%,30%)' }}>{fmt(monthSalaries.reduce((s, r) => s + Number(r.amount), 0))}</p>
              </div>
              <p style={{ fontSize: '0.68rem', color: 'hsl(154,40%,36%)' }}>{monthSalaries.filter(s => s.paid).length}/{monthSalaries.length} paid</p>
            </div>
            {monthSalaries.map(sal => {
              const u = normalizeOne(sal.users)
              if (!u) return null
              return (
                <div key={sal.id} style={{ background: '#fff', borderRadius: '14px', border: '1px solid hsl(38,14%,90%)', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: 38, height: 38, borderRadius: '11px', background: getAvatarColor(u.id), display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '12px', color: '#fff', flexShrink: 0 }}>
                    {getInitials(u.name)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '0.82rem', fontWeight: 800, color: 'hsl(24,20%,11%)', marginBottom: '2px' }}>{u.name}</p>
                    <p style={{ fontSize: '0.62rem', color: 'hsl(24,10%,52%)', textTransform: 'capitalize' }}>{u.role}{sal.notes ? ` · ${sal.notes}` : ''}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '0.95rem', fontWeight: 800, color: sal.paid ? 'hsl(154,50%,36%)' : 'hsl(4,72%,46%)' }}>{fmt(Number(sal.amount))}</p>
                    {sal.paid ? (
                      <p style={{ fontSize: '0.6rem', color: 'hsl(154,50%,44%)', marginTop: '2px' }}>
                        {sal.paid_at ? `✓ ${new Date(sal.paid_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : '✓ Paid'}
                      </p>
                    ) : (
                      <button onClick={() => markSalaryPaid(sal.id)} style={{ marginTop: '4px', padding: '3px 9px', borderRadius: '7px', border: 'none', background: 'hsl(154,50%,90%)', color: 'hsl(154,50%,36%)', fontSize: '0.62rem', fontWeight: 700, cursor: 'pointer' }}>Mark paid</button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {tab === 'expenses' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', gap: '6px', marginBottom: '6px', overflowX: 'auto', paddingBottom: '2px' }}>
              <button onClick={() => setExpFilter('all')} style={{ padding: '5px 12px', borderRadius: '99px', border: '1px solid hsl(38,14%,88%)', cursor: 'pointer', background: expFilter === 'all' ? 'hsl(25,82%,58%)' : '#fff', color: expFilter === 'all' ? '#fff' : 'hsl(24,10%,44%)', fontSize: '0.72rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
                All ({expenses.length})
              </button>
              {(Object.entries(EXPENSE_CAT_CFG) as [ExpenseCategory, typeof EXPENSE_CAT_CFG[ExpenseCategory]][]).map(([cat, cfg]) => (
                <button key={cat} onClick={() => setExpFilter(cat)} style={{ padding: '5px 12px', borderRadius: '99px', border: '1px solid hsl(38,14%,88%)', cursor: 'pointer', background: expFilter === cat ? cfg.color : '#fff', color: expFilter === cat ? '#fff' : 'hsl(24,10%,44%)', fontSize: '0.72rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
                  {cfg.icon} {cfg.label}
                </button>
              ))}
            </div>
            <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid hsl(38,14%,90%)', padding: '10px 14px', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'hsl(24,15%,28%)' }}>Total shown</span>
              <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'hsl(4,72%,46%)' }}>{fmt(filteredExpenses.reduce((s, e) => s + Number(e.amount), 0))}</span>
            </div>
            {filteredExpenses.map(exp => {
              const cfg = EXPENSE_CAT_CFG[exp.category]
              const paidByUser = normalizeOne(exp.paid_by_user)
              return (
                <div key={exp.id} style={{ background: '#fff', borderRadius: '14px', border: '1px solid hsl(38,14%,90%)', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: 36, height: 36, borderRadius: '10px', background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0 }}>
                    {cfg.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '0.78rem', fontWeight: 700, color: 'hsl(24,20%,15%)', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{exp.description}</p>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <span style={{ padding: '1px 6px', borderRadius: '99px', background: cfg.bg, color: cfg.color, fontSize: '0.58rem', fontWeight: 700 }}>{cfg.label}</span>
                      <span style={{ fontSize: '0.6rem', color: 'hsl(24,10%,54%)' }}>{fmtDate(exp.date)}{paidByUser ? ` · ${paidByUser.name}` : ''}</span>
                    </div>
                  </div>
                  <p style={{ fontSize: '0.9rem', fontWeight: 800, color: 'hsl(4,72%,44%)', flexShrink: 0 }}>{fmt(Number(exp.amount))}</p>
                </div>
              )
            })}
          </div>
        )}

        <div style={{ height: 24 }} />
      </div>
    </main>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function AlertPill({ color, dark, label }: { color: string; dark: string; label: string }) {
  return (
    <div style={{ background: dark, borderRadius: '8px', padding: '5px 10px', display: 'flex', gap: '6px', alignItems: 'center' }}>
      <div style={{ width: 6, height: 6, borderRadius: '50%', background: color }} />
      <span style={{ fontSize: '0.65rem', color, fontWeight: 700 }}>{label}</span>
    </div>
  )
}

function DrawerActions({ onCancel, onSubmit, disabled, label, color }: { onCancel: () => void; onSubmit: () => void; disabled: boolean; label: string; color: string }) {
  return (
    <div style={{ display: 'flex', gap: '8px', paddingTop: '4px' }}>
      <button onClick={onCancel} style={{ padding: '10px 16px', borderRadius: '10px', border: '1px solid hsl(38,14%,86%)', background: '#fff', color: 'hsl(24,10%,44%)', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', flex: 1 }}>
        Cancel
      </button>
      <button onClick={onSubmit} disabled={disabled} style={{ padding: '10px 20px', borderRadius: '10px', border: 'none', background: disabled ? 'hsl(38,14%,86%)' : color, color: disabled ? 'hsl(24,10%,58%)' : '#fff', fontSize: '0.78rem', fontWeight: 800, cursor: disabled ? 'default' : 'pointer', flex: 2, transition: 'background 0.15s' }}>
        {label}
      </button>
    </div>
  )
}

const drawerTitle: React.CSSProperties = { fontSize: '1rem', fontWeight: 800, color: 'hsl(24,20%,11%)', marginBottom: '16px' }
const inp: React.CSSProperties = { width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1.5px solid hsl(38,14%,86%)', background: '#fff', fontSize: '0.82rem', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }
const sel: React.CSSProperties = { ...inp, cursor: 'pointer' }
function FL({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: '0.62rem', fontWeight: 700, color: 'hsl(24,10%,48%)', marginBottom: '5px' }}>{children}</p>
}
