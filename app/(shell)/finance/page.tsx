'use client'

import Link from 'next/link'
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { FilterPill } from '@/components/ui/filter-pill'
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
import { useUser } from '@/lib/supabase/useUser'
import { effectiveInvoiceStatus, fmtMoney, recentMonths } from '@/lib/finance'
import type { ExpenseCategory, InvoiceStatus } from '@/lib/types'
import { cn } from '@/lib/utils'

gsap.registerPlugin(useGSAP)

type Tab = 'overview' | 'invoices' | 'payroll' | 'expenses'
type DrawerType = 'expense' | 'payroll' | null

type ClientRow = { id: string; name: string; brand_color: string; initials: string }
type UserRow = { id: string; name: string; role: string }

type InvoiceRow = {
  id: string
  invoice_number: string | null
  client_id: string
  month: string
  amount: number
  status: InvoiceStatus
  due_date: string
  paid_at: string | null
  description: string
  clients: ClientRow | ClientRow[] | null
}

type SalaryRow = {
  id: string
  user_id: string
  month: string
  amount: number
  paid: boolean
  paid_at: string | null
  notes: string | null
  users: UserRow | UserRow[] | null
}

type ExpenseRow = {
  id: string
  category: ExpenseCategory
  description: string
  amount: number
  date: string
  paid_by: string
  receipt_path: string | null
  paid_by_user: { id: string; name: string } | { id: string; name: string }[] | null
}

const EXPENSE_CAT_CFG: Record<ExpenseCategory, { label: string; icon: string; tone: string; softTone: string }> = {
  software: { label: 'Software', icon: '💻', tone: 'text-primary', softTone: 'bg-wash text-primary border-primary/30' },
  equipment: { label: 'Equipment', icon: '🎬', tone: 'text-primary', softTone: 'bg-wash text-primary border-primary/30' },
  freelance: { label: 'Freelance', icon: '🤝', tone: 'text-primary', softTone: 'bg-wash text-primary border-primary/30' },
  marketing: { label: 'Marketing', icon: '📢', tone: 'text-primary', softTone: 'bg-wash text-primary border-primary/30' },
  office: { label: 'Office', icon: '🏢', tone: 'text-primary', softTone: 'bg-wash text-primary border-primary/30' },
  other: { label: 'Other', icon: '📦', tone: 'text-muted-foreground', softTone: 'bg-muted text-muted-foreground border-border' },
}

const MONTHS = recentMonths(12)
const RECEIPT_MAX_BYTES = 8 * 1024 * 1024
const RECEIPT_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'application/pdf']

const INVOICE_STATUS_BADGE: Record<InvoiceStatus, { status: 'approved' | 'planned' | 'overdue'; label: string; dueSoon?: boolean }> = {
  paid: { status: 'approved', label: 'Paid' },
  pending: { status: 'planned', label: 'Pending', dueSoon: true },
  overdue: { status: 'overdue', label: 'Overdue' },
}

const DIALOG_META: Record<Exclude<DrawerType, null>, { title: string; editTitle: string; description: string; submitLabel: string }> = {
  expense: {
    title: 'Log expense',
    editTitle: 'Edit expense',
    description: 'Capture an operational expense and assign who paid it.',
    submitLabel: 'Log expense',
  },
  payroll: {
    title: 'Add payroll entry',
    editTitle: 'Edit payroll entry',
    description: 'Record a salary payout for a team member.',
    submitLabel: 'Add entry',
  },
}

function normalizeOne<T>(x: T | T[] | null): T | null {
  if (!x) return null
  return Array.isArray(x) ? (x[0] ?? null) : x
}

function fmtDate(s: string) {
  return new Date(`${s}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function expenseToMonth(dateStr: string) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

function paidAtLabel(paidAt: string | null) {
  if (!paidAt) return 'Paid'
  return new Date(paidAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
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
  return { '--bar-width': `${width}%` } as CSSProperties
}

function FieldBlock({
  label,
  htmlFor,
  children,
}: {
  label: string
  htmlFor?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={htmlFor} className="text-xs font-semibold text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  )
}

function FinanceEmpty({
  title,
  body,
  action,
}: {
  title: string
  body: string
  action?: React.ReactNode
}) {
  return (
    <EmptyState
      icon="🧾"
      title={title}
      body={body}
      action={action}
      className="border-border bg-card px-6 py-8"
    />
  )
}

type DeleteTarget = { type: 'expense' | 'payroll'; id: string; label: string } | null

export default function FinancePage() {
  const { user } = useUser()
  const heroRef = useRef<HTMLDivElement>(null)

  const [mounted, setMounted] = useState(false)
  const [tab, setTab] = useState<Tab>('overview')
  const [selectedMonth, setSelectedMonth] = useState(MONTHS[0])
  const [invoices, setInvoices] = useState<InvoiceRow[]>([])
  const [salaries, setSalaries] = useState<SalaryRow[]>([])
  const [expenses, setExpenses] = useState<ExpenseRow[]>([])
  const [clients, setClients] = useState<ClientRow[]>([])
  const [users, setUsers] = useState<UserRow[]>([])
  const [invFilter, setInvFilter] = useState<InvoiceStatus | 'all'>('all')
  const [expFilter, setExpFilter] = useState<ExpenseCategory | 'all'>('all')
  const [drawer, setDrawer] = useState<DrawerType>(null)
  const [saving, setSaving] = useState(false)
  const [dialogError, setDialogError] = useState('')
  const [actionError, setActionError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null)
  const [deleting, setDeleting] = useState(false)

  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null)
  const [originalReceiptPath, setOriginalReceiptPath] = useState<string | null>(null)
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [editingSalaryId, setEditingSalaryId] = useState<string | null>(null)

  const [newExp, setNewExp] = useState({
    category: 'software' as ExpenseCategory,
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    paid_by: '',
    receipt_path: null as string | null,
  })
  const [newSal, setNewSal] = useState({
    user_id: '',
    month: MONTHS[0],
    amount: '',
    notes: '',
  })

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

      const nextClients = (cliRes.data || []) as ClientRow[]
      const nextUsers = (usrRes.data || []) as UserRow[]

      setInvoices((invRes.data || []) as InvoiceRow[])
      setSalaries((salRes.data || []) as SalaryRow[])
      setExpenses((expRes.data || []) as ExpenseRow[])
      setClients(nextClients)
      setUsers(nextUsers)
      setNewExp(prev => (prev.paid_by || nextUsers.length === 0 ? prev : { ...prev, paid_by: nextUsers[0].id }))
      setNewSal(prev => {
        if (prev.user_id || nextUsers.length === 0) return prev
        const nonAdmin = nextUsers.find(candidate => candidate.role !== 'admin')
        return { ...prev, user_id: nonAdmin?.id || nextUsers[0].id }
      })
      setMounted(true)
    }

    load()
  }, [])

  useGSAP(
    () => {
      if (!mounted || !heroRef.current) return

      const els = heroRef.current.querySelectorAll<HTMLElement>('.fin-counter')
      els.forEach(el => {
        const target = parseInt(el.dataset.target || '0')
        gsap.fromTo(
          el,
          { textContent: 0 },
          {
            textContent: target,
            duration: 1.1,
            ease: 'power2.out',
            snap: { textContent: 1 },
            onUpdate() {
              el.textContent = `$${parseInt(el.textContent || '0').toLocaleString()}`
            },
          }
        )
      })
    },
    { dependencies: [mounted] }
  )

  if (!mounted) {
    return (
      <div className="flex min-w-0 flex-1 flex-col gap-3.5 px-4 py-5" aria-busy="true" aria-label="Loading finance">
        <Skeleton className="h-14 w-full rounded-2xl" />
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-10 w-2/3 rounded-full" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    )
  }

  const totalIncome = invoices.filter(invoice => invoice.status === 'paid').reduce((sum, invoice) => sum + Number(invoice.amount), 0)
  const totalPending = invoices.filter(invoice => effectiveInvoiceStatus(invoice) === 'pending').reduce((sum, invoice) => sum + Number(invoice.amount), 0)
  const totalOverdue = invoices.filter(invoice => effectiveInvoiceStatus(invoice) === 'overdue').reduce((sum, invoice) => sum + Number(invoice.amount), 0)
  const totalPayroll = salaries.filter(salary => salary.paid).reduce((sum, salary) => sum + Number(salary.amount), 0)
  const totalExpenses = expenses.reduce((sum, expense) => sum + Number(expense.amount), 0)
  const totalProfit = totalIncome - totalPayroll - totalExpenses

  const monthInvoices = invoices.filter(invoice => invoice.month === selectedMonth)
  const monthSalaries = salaries.filter(salary => salary.month === selectedMonth)
  const monthIncome = monthInvoices.filter(invoice => invoice.status === 'paid').reduce((sum, invoice) => sum + Number(invoice.amount), 0)
  const monthPayroll = monthSalaries.reduce((sum, salary) => sum + Number(salary.amount), 0)
  const monthExpenses = expenses.filter(expense => expenseToMonth(expense.date) === selectedMonth).reduce((sum, expense) => sum + Number(expense.amount), 0)
  const monthProfit = monthIncome - monthPayroll - monthExpenses

  function resetExpenseForm() {
    setEditingExpenseId(null)
    setOriginalReceiptPath(null)
    setReceiptFile(null)
    setNewExp({
      category: 'software',
      description: '',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      paid_by: users[0]?.id || '',
      receipt_path: null,
    })
  }

  function resetSalaryForm() {
    setEditingSalaryId(null)
    setNewSal({
      user_id: users.find(candidate => candidate.role !== 'admin')?.id || users[0]?.id || '',
      month: MONTHS[0],
      amount: '',
      notes: '',
    })
  }

  function openNewExpense() {
    resetExpenseForm()
    setDialogError('')
    setDrawer('expense')
  }

  function openEditExpense(expense: ExpenseRow) {
    setEditingExpenseId(expense.id)
    setOriginalReceiptPath(expense.receipt_path)
    setReceiptFile(null)
    setNewExp({
      category: expense.category,
      description: expense.description,
      amount: String(expense.amount),
      date: expense.date,
      paid_by: expense.paid_by,
      receipt_path: expense.receipt_path,
    })
    setDialogError('')
    setDrawer('expense')
  }

  function openNewPayroll() {
    resetSalaryForm()
    setDialogError('')
    setDrawer('payroll')
  }

  function openEditPayroll(salary: SalaryRow) {
    setEditingSalaryId(salary.id)
    setNewSal({
      user_id: salary.user_id,
      month: salary.month,
      amount: String(salary.amount),
      notes: salary.notes || '',
    })
    setDialogError('')
    setDrawer('payroll')
  }

  function closeDrawer() {
    setDrawer(null)
    resetExpenseForm()
    resetSalaryForm()
    setDialogError('')
  }

  async function markInvoicePaid(id: string) {
    setActionError('')
    const now = new Date().toISOString()
    const supabase = createClient()
    const { data, error } = await supabase
      .from('invoices')
      .update({ status: 'paid', paid_at: now })
      .eq('id', id)
      .select('status, paid_at')
      .single()

    if (error || !data) {
      setActionError('Could not mark that invoice paid. Please try again.')
      return
    }
    setInvoices(prev => prev.map(invoice => (invoice.id === id ? { ...invoice, status: 'paid' as InvoiceStatus, paid_at: data.paid_at } : invoice)))
  }

  async function markSalaryPaid(id: string) {
    setActionError('')
    const now = new Date().toISOString()
    const supabase = createClient()
    const { data, error } = await supabase
      .from('salary_records')
      .update({ paid: true, paid_at: now })
      .eq('id', id)
      .select('paid, paid_at')
      .single()

    if (error || !data) {
      setActionError('Could not mark that payroll entry paid. Please try again.')
      return
    }
    setSalaries(prev => prev.map(salary => (salary.id === id ? { ...salary, paid: true, paid_at: data.paid_at } : salary)))
  }

  async function uploadReceipt(file: File, orgId: string): Promise<string | null> {
    const supabase = createClient()
    const ext = file.name.split('.').pop() || 'bin'
    const path = `${orgId}/${crypto.randomUUID()}.${ext}`
    const { error } = await supabase.storage.from('receipts').upload(path, file, { upsert: false })
    return error ? null : path
  }

  function handleReceiptSelect(file: File | null) {
    setDialogError('')
    if (!file) { setReceiptFile(null); return }
    if (!RECEIPT_TYPES.includes(file.type)) {
      setDialogError('Receipts must be an image (PNG/JPEG/WebP) or a PDF.')
      return
    }
    if (file.size > RECEIPT_MAX_BYTES) {
      setDialogError('Receipt must be under 8MB.')
      return
    }
    setReceiptFile(file)
  }

  async function viewReceipt(path: string) {
    const supabase = createClient()
    const { data, error } = await supabase.storage.from('receipts').createSignedUrl(path, 60)
    if (error || !data) {
      setActionError('Could not open that receipt.')
      return
    }
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
  }

  async function submitExpense() {
    const amount = parseFloat(newExp.amount)
    if (!newExp.description.trim() || !Number.isFinite(amount) || amount <= 0 || !newExp.paid_by) return

    setSaving(true)
    setDialogError('')

    let receiptPath = newExp.receipt_path
    if (receiptFile) {
      const uploaded = await uploadReceipt(receiptFile, user!.org_id!)
      if (!uploaded) {
        setSaving(false)
        setDialogError('Could not upload the receipt. Please try again.')
        return
      }
      receiptPath = uploaded
    }

    const supabase = createClient()
    const payload = {
      category: newExp.category,
      description: newExp.description.trim(),
      amount,
      date: newExp.date,
      paid_by: newExp.paid_by,
      receipt_path: receiptPath,
      org_id: user?.org_id,
    }

    const { data, error } = editingExpenseId
      ? await supabase.from('expenses').update(payload).eq('id', editingExpenseId).select('*, paid_by_user:paid_by(id, name)').single()
      : await supabase.from('expenses').insert(payload).select('*, paid_by_user:paid_by(id, name)').single()

    setSaving(false)

    if (error || !data) {
      setDialogError(`Could not save this expense. ${error?.message || 'Please try again.'}`)
      return
    }

    if (originalReceiptPath && originalReceiptPath !== receiptPath) {
      await supabase.storage.from('receipts').remove([originalReceiptPath])
    }

    setExpenses(prev =>
      editingExpenseId ? prev.map(expense => (expense.id === data.id ? (data as ExpenseRow) : expense)) : [data as ExpenseRow, ...prev]
    )
    closeDrawer()
  }

  async function submitPayroll() {
    const amount = parseFloat(newSal.amount)
    if (!Number.isFinite(amount) || amount <= 0 || !newSal.user_id) return

    setSaving(true)
    setDialogError('')

    const supabase = createClient()
    const payload = {
      user_id: newSal.user_id,
      month: newSal.month,
      amount,
      notes: newSal.notes || null,
      org_id: user?.org_id,
    }

    const { data, error } = editingSalaryId
      ? await supabase.from('salary_records').update(payload).eq('id', editingSalaryId).select('*, users:user_id(id, name, role)').single()
      : await supabase.from('salary_records').insert({ ...payload, paid: false }).select('*, users:user_id(id, name, role)').single()

    setSaving(false)

    if (error || !data) {
      setDialogError(`Could not save this payroll entry. ${error?.message || 'Please try again.'}`)
      return
    }

    setSalaries(prev =>
      editingSalaryId ? prev.map(salary => (salary.id === data.id ? (data as SalaryRow) : salary)) : [data as SalaryRow, ...prev]
    )
    closeDrawer()
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    setActionError('')
    const supabase = createClient()

    if (deleteTarget.type === 'expense') {
      const expense = expenses.find(e => e.id === deleteTarget.id)
      const { data, error } = await supabase.from('expenses').delete().eq('id', deleteTarget.id).select('id').single()
      if (error || !data) {
        setActionError('Could not delete this expense. Please try again.')
      } else {
        if (expense?.receipt_path) await supabase.storage.from('receipts').remove([expense.receipt_path])
        setExpenses(prev => prev.filter(e => e.id !== deleteTarget.id))
      }
    } else {
      const { data, error } = await supabase.from('salary_records').delete().eq('id', deleteTarget.id).select('id').single()
      if (error || !data) {
        setActionError('Could not delete this payroll entry. Please try again.')
      } else {
        setSalaries(prev => prev.filter(s => s.id !== deleteTarget.id))
      }
    }

    setDeleting(false)
    setDeleteTarget(null)
  }

  const filteredInvoices = invoices.filter(invoice => invFilter === 'all' || effectiveInvoiceStatus(invoice) === invFilter)
  const filteredExpenses = expenses.filter(expense => expFilter === 'all' || expense.category === expFilter)
  const monthPayrollTotal = monthSalaries.reduce((sum, salary) => sum + Number(salary.amount), 0)
  const payrollPaidCount = monthSalaries.filter(salary => salary.paid).length
  const shownExpensesTotal = filteredExpenses.reduce((sum, expense) => sum + Number(expense.amount), 0)
  const dialogConfig = drawer ? DIALOG_META[drawer] : null
  const isEditing = drawer === 'expense' ? !!editingExpenseId : drawer === 'payroll' ? !!editingSalaryId : false

  const heroMetrics = [
    {
      label: 'Total Income',
      value: totalIncome,
      cardClass: 'bg-success/10',
      labelClass: 'text-success/80',
      valueClass: 'text-success',
    },
    {
      label: 'Payroll Paid',
      value: totalPayroll,
      cardClass: 'bg-secondary',
      labelClass: 'text-muted-foreground',
      valueClass: 'text-foreground',
    },
    {
      label: 'Expenses',
      value: totalExpenses,
      cardClass: 'bg-wash',
      labelClass: 'text-primary',
      valueClass: 'text-primary',
    },
    {
      label: 'Net Profit',
      value: totalProfit,
      cardClass: totalProfit >= 0 ? 'bg-success/10' : 'bg-danger/10',
      labelClass: totalProfit >= 0 ? 'text-success/80' : 'text-danger/80',
      valueClass: totalProfit >= 0 ? 'text-success' : 'text-danger',
    },
  ] as const

  const monthMetrics = [
    { label: 'Income Collected', value: monthIncome, shellClass: 'border-success/20 bg-success/5', textClass: 'text-success' },
    { label: 'Payroll', value: monthPayroll, shellClass: 'border-border bg-secondary', textClass: 'text-foreground' },
    { label: 'Expenses', value: monthExpenses, shellClass: 'border-primary/20 bg-wash', textClass: 'text-primary' },
    {
      label: 'Net Profit',
      value: monthProfit,
      shellClass: monthProfit >= 0 ? 'border-success/20 bg-success/5' : 'border-danger/20 bg-danger/5',
      textClass: monthProfit >= 0 ? 'text-success' : 'text-danger',
    },
  ] as const

  return (
    <main className="page-main flex min-w-0 flex-1 flex-col overflow-y-auto bg-background">
      <Tabs value={tab} onValueChange={value => setTab(value as Tab)} className="gap-0">
        <section ref={heroRef} className="flex flex-col gap-5 border-b border-border bg-card px-5 py-5 text-foreground">
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Admin</p>
              <h1 className="text-2xl font-extrabold tracking-tight">Finance</h1>
              <p className="text-sm text-muted-foreground">Track collections, payroll, and spend across the studio.</p>
            </div>

            {tab === 'invoices' && (
              <Link href="/finance/invoices/new">
                <Button className="bg-primary text-primary-foreground hover:bg-primary/85">New Invoice</Button>
              </Link>
            )}
            {tab === 'payroll' && (
              <Button onClick={openNewPayroll} className="bg-primary text-primary-foreground hover:bg-primary/85">
                Add Payroll
              </Button>
            )}
            {tab === 'expenses' && (
              <Button onClick={openNewExpense} className="bg-primary text-primary-foreground hover:bg-primary/85">
                Log Expense
              </Button>
            )}
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {heroMetrics.map(metric => (
              <Card key={metric.label} size="sm" className={cn('gap-3 border-none shadow-none ring-0', metric.cardClass)}>
                <CardContent className="flex flex-col gap-2 py-4">
                  <p className={cn('text-[0.65rem] font-bold uppercase tracking-[0.1em]', metric.labelClass)}>
                    {metric.label}
                  </p>
                  <p className={cn('fin-counter text-2xl font-extrabold tracking-tight', metric.valueClass)} data-target={metric.value}>
                    {fmtMoney(metric.value)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {(totalPending > 0 || totalOverdue > 0) && (
            <div className="flex flex-wrap items-center gap-2">
              {totalOverdue > 0 && (
                <Badge variant="outline" className="border-danger/30 bg-danger/10 px-3 py-1 text-danger">
                  {fmtMoney(totalOverdue)} overdue
                </Badge>
              )}
              {totalPending > 0 && (
                <Badge variant="outline" className="border-primary/30 bg-wash px-3 py-1 text-primary">
                  {fmtMoney(totalPending)} pending
                </Badge>
              )}
            </div>
          )}

          <TabsList variant="line" className="h-auto gap-1 rounded-none p-0">
            {(['overview', 'invoices', 'payroll', 'expenses'] as Tab[]).map(value => (
              <TabsTrigger
                key={value}
                value={value}
                className="rounded-none px-4 py-2 text-sm font-semibold capitalize text-muted-foreground hover:text-foreground data-active:text-foreground after:bg-primary"
              >
                {value}
              </TabsTrigger>
            ))}
          </TabsList>
        </section>

        <section className="flex flex-1 flex-col gap-5 px-4 py-5 md:px-5">
          {actionError && (
            <div className="rounded-lg border border-danger/20 bg-danger/5 px-4 py-3 text-sm font-medium text-danger">
              {actionError}
            </div>
          )}

          <TabsContent value="overview" className="flex flex-col gap-5">
            <Card className="gap-4">
              <CardHeader className="gap-3">
                <div className="flex flex-col gap-1">
                  <CardTitle>Monthly snapshot</CardTitle>
                  <CardDescription>Review the active month across revenue, payroll, and expenses.</CardDescription>
                </div>
                <CardAction className="w-full sm:w-auto">
                  <Select value={selectedMonth} onValueChange={value => value && setSelectedMonth(value)}>
                    <SelectTrigger className="w-full bg-background sm:min-w-52">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {MONTHS.map(month => (
                          <SelectItem key={month} value={month}>
                            {month}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </CardAction>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {monthMetrics.map(metric => (
                  <div key={metric.label} className={cn('rounded-xl border p-4', metric.shellClass)}>
                    <p className={cn('text-[0.7rem] font-bold uppercase tracking-[0.08em]', metric.textClass)}>
                      {metric.label}
                    </p>
                    <p className={cn('mt-2 text-2xl font-extrabold tracking-tight', metric.textClass)}>
                      {fmtMoney(metric.value)}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
              <Card>
                <CardHeader className="gap-1">
                  <CardTitle>Client income</CardTitle>
                  <CardDescription>{selectedMonth}</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  {clients.length === 0 ? (
                    <FinanceEmpty title="No clients yet" body="Add clients to start tracking invoice performance by account." />
                  ) : (
                    clients.map(client => {
                      const clientInvoices = monthInvoices.filter(invoice => invoice.client_id === client.id)
                      const total = clientInvoices.reduce((sum, invoice) => sum + Number(invoice.amount), 0)
                      const paid = clientInvoices.filter(invoice => invoice.status === 'paid').reduce((sum, invoice) => sum + Number(invoice.amount), 0)
                      const pct = total > 0 ? (paid / total) * 100 : 0

                      return (
                        <div key={client.id} className="flex flex-col gap-2">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5">
                              <div
                                className="size-2.5 rounded-full bg-[var(--client-color)]"
                                style={clientStyle(client.brand_color)}
                              />
                              <span className="text-sm font-semibold text-foreground">{client.name}</span>
                            </div>
                            <span className="text-sm font-semibold text-foreground">
                              {fmtMoney(paid)}
                              <span className="text-muted-foreground"> / {fmtMoney(total)}</span>
                            </span>
                          </div>
                          <div className="h-2 rounded-full bg-muted">
                            <div
                              className="h-full w-[var(--bar-width)] rounded-full bg-primary transition-[width] duration-700"
                              style={widthStyle(pct)}
                            />
                          </div>
                        </div>
                      )
                    })
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="gap-1">
                  <CardTitle>Expense breakdown</CardTitle>
                  <CardDescription>All-time spend by category</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  {(Object.entries(EXPENSE_CAT_CFG) as [ExpenseCategory, (typeof EXPENSE_CAT_CFG)[ExpenseCategory]][])
                    .map(([category, cfg]) => {
                      const categoryTotal = expenses
                        .filter(expense => expense.category === category)
                        .reduce((sum, expense) => sum + Number(expense.amount), 0)

                      if (!categoryTotal) return null

                      const pct = totalExpenses > 0 ? (categoryTotal / totalExpenses) * 100 : 0

                      return (
                        <div key={category} className="flex flex-col gap-2">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-sm font-medium text-foreground">
                              {cfg.icon} {cfg.label}
                            </span>
                            <span className={cn('text-sm font-semibold', cfg.tone)}>
                              {fmtMoney(categoryTotal)}
                              <span className="text-muted-foreground"> ({pct.toFixed(0)}%)</span>
                            </span>
                          </div>
                          <div className="h-2 rounded-full bg-muted">
                            <div
                              className={cn(
                                'h-full w-[var(--bar-width)] rounded-full transition-[width] duration-700',
                                cfg.tone.replace('text-', 'bg-')
                              )}
                              style={widthStyle(pct)}
                            />
                          </div>
                        </div>
                      )
                    })
                    .filter(Boolean)}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="invoices" className="flex flex-col gap-5">
            <Card>
              <CardHeader className="gap-3">
                <div className="flex flex-col gap-1">
                  <CardTitle>Invoices</CardTitle>
                  <CardDescription>Track collections and mark client invoices as paid.</CardDescription>
                </div>
                <CardAction className="flex flex-wrap gap-2">
                  {(['all', 'paid', 'pending', 'overdue'] as const).map(filter => (
                    <FilterPill
                      key={filter}
                      active={invFilter === filter}
                      onClick={() => setInvFilter(filter)}
                      className={cn(
                        invFilter === filter && filter === 'paid' && 'border-success bg-success text-success-foreground hover:bg-success',
                        invFilter === filter && filter === 'pending' && 'border-primary bg-wash text-primary hover:bg-wash',
                        invFilter === filter && filter === 'overdue' && 'border-danger bg-danger text-danger-foreground hover:bg-danger'
                      )}
                    >
                      {filter === 'all' ? `All (${invoices.length})` : filter}
                    </FilterPill>
                  ))}
                </CardAction>
              </CardHeader>
              <CardContent>
                {filteredInvoices.length === 0 ? (
                  <FinanceEmpty
                    title="No invoices match this view"
                    body="Create a new invoice or adjust the status filter."
                    action={
                      <Link href="/finance/invoices/new">
                        <Button className="bg-primary text-primary-foreground hover:bg-primary/85">New Invoice</Button>
                      </Link>
                    }
                  />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead>Client</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Month</TableHead>
                        <TableHead>Due</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredInvoices.map(invoice => {
                        const client = normalizeOne(invoice.clients)
                        const status = effectiveInvoiceStatus(invoice)
                        const badge = INVOICE_STATUS_BADGE[status]

                        return (
                          <TableRow key={invoice.id} className={cn(status === 'overdue' && 'bg-danger/5 hover:bg-danger/10')}>
                            <TableCell>
                              {client ? (
                                <div className="flex items-center gap-3">
                                  <div
                                    className={`flex size-9 items-center justify-center rounded-xl bg-[var(--client-color)] text-xs font-extrabold ${brandForeground(client.brand_color)}`}
                                    style={clientStyle(client.brand_color)}
                                  >
                                    {client.initials}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="truncate font-semibold text-foreground">{client.name}</p>
                                    {invoice.invoice_number && (
                                      <p className="truncate font-mono text-[0.65rem] text-muted-foreground">{invoice.invoice_number}</p>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-muted-foreground">Unknown client</span>
                              )}
                            </TableCell>
                            <TableCell className="max-w-72">
                              <div className="flex flex-col gap-1">
                                <span className="truncate font-medium text-foreground">{invoice.description}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground">{invoice.month}</TableCell>
                            <TableCell className="text-muted-foreground">{fmtDate(invoice.due_date)}</TableCell>
                            <TableCell>
                              <StatusBadge status={badge.status} dueSoon={badge.dueSoon}>{badge.label}</StatusBadge>
                            </TableCell>
                            <TableCell className="text-right text-sm font-extrabold text-foreground">
                              {fmtMoney(Number(invoice.amount))}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Link href={`/finance/invoices/${invoice.id}`}>
                                  <Button variant="outline" size="sm">View</Button>
                                </Link>
                                {invoice.status === 'paid' ? (
                                  <span className="text-xs font-semibold text-success">
                                    {paidAtLabel(invoice.paid_at)}
                                  </span>
                                ) : (
                                  <Button variant="outline" size="sm" onClick={() => markInvoicePaid(invoice.id)}>
                                    Mark paid
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payroll" className="flex flex-col gap-5">
            <Card>
              <CardHeader className="gap-3">
                <div className="flex flex-col gap-1">
                  <CardTitle>Payroll</CardTitle>
                  <CardDescription>Review salary entries and confirm completed payouts.</CardDescription>
                </div>
                <CardAction className="w-full sm:w-auto">
                  <Select value={selectedMonth} onValueChange={value => value && setSelectedMonth(value)}>
                    <SelectTrigger className="w-full bg-background sm:min-w-52">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {MONTHS.map(month => (
                          <SelectItem key={month} value={month}>
                            {month}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </CardAction>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-success/20 bg-success/5 px-4 py-3">
                  <div className="flex flex-col gap-1">
                    <p className="text-[0.7rem] font-bold uppercase tracking-[0.08em] text-success/80">
                      Total - {selectedMonth}
                    </p>
                    <p className="text-2xl font-extrabold tracking-tight text-success">{fmtMoney(monthPayrollTotal)}</p>
                  </div>
                  <Badge variant="outline" className="border-success/20 bg-background px-3 py-1 text-success">
                    {payrollPaidCount}/{monthSalaries.length} paid
                  </Badge>
                </div>

                {monthSalaries.length === 0 ? (
                  <FinanceEmpty
                    title="No payroll entries yet"
                    body="Add a payroll record for this month to track payouts."
                    action={
                      <Button onClick={openNewPayroll} className="bg-primary text-primary-foreground hover:bg-primary/85">
                        Add Payroll
                      </Button>
                    }
                  />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead>Employee</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Notes</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {monthSalaries.map(salary => {
                        const member = normalizeOne(salary.users)
                        if (!member) return null

                        return (
                          <TableRow key={salary.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <UserAvatar userId={member.id} name={member.name} />
                                <span className="font-semibold text-foreground">{member.name}</span>
                              </div>
                            </TableCell>
                            <TableCell className="capitalize text-muted-foreground">{member.role}</TableCell>
                            <TableCell className="max-w-60 truncate text-muted-foreground">{salary.notes || '-'}</TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={cn(
                                  salary.paid
                                    ? 'border-success/20 bg-success/10 text-success'
                                    : 'border-danger/20 bg-danger/10 text-danger'
                                )}
                              >
                                {salary.paid ? 'Paid' : 'Pending'}
                              </Badge>
                            </TableCell>
                            <TableCell className={cn('text-right text-sm font-extrabold', salary.paid ? 'text-success' : 'text-danger')}>
                              {fmtMoney(Number(salary.amount))}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {salary.paid ? (
                                  <span className="text-xs font-semibold text-success">{paidAtLabel(salary.paid_at)}</span>
                                ) : (
                                  <>
                                    <Button variant="ghost" size="sm" onClick={() => openEditPayroll(salary)}>Edit</Button>
                                    <Button variant="outline" size="sm" onClick={() => markSalaryPaid(salary.id)}>Mark paid</Button>
                                    <Button
                                      variant="ghost"
                                      size="icon-sm"
                                      className="text-danger hover:bg-danger/10"
                                      onClick={() => setDeleteTarget({ type: 'payroll', id: salary.id, label: `${member.name}'s ${salary.month} payroll entry` })}
                                      aria-label="Delete payroll entry"
                                    >
                                      🗑
                                    </Button>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="expenses" className="flex flex-col gap-5">
            <Card>
              <CardHeader className="gap-3">
                <div className="flex flex-col gap-1">
                  <CardTitle>Expenses</CardTitle>
                  <CardDescription>Log spend and monitor category-level burn.</CardDescription>
                </div>
                <CardAction className="flex flex-wrap gap-2">
                  <FilterPill active={expFilter === 'all'} onClick={() => setExpFilter('all')}>
                    All ({expenses.length})
                  </FilterPill>
                  {(Object.entries(EXPENSE_CAT_CFG) as [ExpenseCategory, (typeof EXPENSE_CAT_CFG)[ExpenseCategory]][]).map(([category, cfg]) => (
                    <FilterPill
                      key={category}
                      active={expFilter === category}
                      onClick={() => setExpFilter(category)}
                      className={cn(expFilter === category && cfg.softTone)}
                    >
                      {cfg.icon} {cfg.label}
                    </FilterPill>
                  ))}
                </CardAction>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="flex items-center justify-between rounded-xl border border-danger/15 bg-danger/5 px-4 py-3">
                  <span className="text-sm font-semibold text-foreground">Total shown</span>
                  <span className="text-xl font-extrabold tracking-tight text-danger">{fmtMoney(shownExpensesTotal)}</span>
                </div>

                {filteredExpenses.length === 0 ? (
                  <FinanceEmpty
                    title="No expenses match this filter"
                    body="Log a new expense or switch to another category."
                    action={
                      <Button onClick={openNewExpense} className="bg-primary text-primary-foreground hover:bg-primary/85">
                        Log Expense
                      </Button>
                    }
                  />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead>Category</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Paid by</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredExpenses.map(expense => {
                        const cfg = EXPENSE_CAT_CFG[expense.category]
                        const paidBy = normalizeOne(expense.paid_by_user)

                        return (
                          <TableRow key={expense.id}>
                            <TableCell>
                              <Badge variant="outline" className={cn('border px-2.5 py-1', cfg.softTone)}>
                                {cfg.icon} {cfg.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="max-w-80">
                              <span className="block truncate font-medium text-foreground">{expense.description}</span>
                            </TableCell>
                            <TableCell className="text-muted-foreground">{paidBy?.name || '-'}</TableCell>
                            <TableCell className="text-muted-foreground">{fmtDate(expense.date)}</TableCell>
                            <TableCell className="text-right text-sm font-extrabold text-danger">
                              {fmtMoney(Number(expense.amount))}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {expense.receipt_path && (
                                  <Button variant="ghost" size="sm" onClick={() => viewReceipt(expense.receipt_path!)}>
                                    📎 Receipt
                                  </Button>
                                )}
                                <Button variant="ghost" size="sm" onClick={() => openEditExpense(expense)}>Edit</Button>
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  className="text-danger hover:bg-danger/10"
                                  onClick={() => setDeleteTarget({ type: 'expense', id: expense.id, label: expense.description })}
                                  aria-label="Delete expense"
                                >
                                  🗑
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </section>
      </Tabs>

      <Dialog open={drawer !== null} onOpenChange={open => !open && closeDrawer()}>
        <DialogContent className="max-w-xl gap-4">
          {dialogConfig && (
            <>
              <DialogHeader className="gap-1">
                <DialogTitle>{isEditing ? dialogConfig.editTitle : dialogConfig.title}</DialogTitle>
                <DialogDescription>{dialogConfig.description}</DialogDescription>
              </DialogHeader>

              <Separator />

              {dialogError && (
                <div className="rounded-lg border border-danger/20 bg-danger/5 px-3 py-2 text-xs font-medium text-danger">
                  {dialogError}
                </div>
              )}

              {drawer === 'expense' && (
                <div className="flex flex-col gap-4">
                  <FieldBlock label="Category">
                    <div className="flex flex-wrap gap-2">
                      {(Object.entries(EXPENSE_CAT_CFG) as [ExpenseCategory, (typeof EXPENSE_CAT_CFG)[ExpenseCategory]][]).map(([category, cfg]) => (
                        <FilterPill
                          key={category}
                          active={newExp.category === category}
                          onClick={() => setNewExp(prev => ({ ...prev, category }))}
                          className={cn(newExp.category === category && cfg.softTone)}
                        >
                          {cfg.icon} {cfg.label}
                        </FilterPill>
                      ))}
                    </div>
                  </FieldBlock>

                  <FieldBlock label="Description" htmlFor="expense-description">
                    <Input
                      id="expense-description"
                      value={newExp.description}
                      onChange={e => setNewExp(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="What was purchased?"
                      className="bg-background"
                    />
                  </FieldBlock>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <FieldBlock label="Amount ($)" htmlFor="expense-amount">
                      <Input
                        id="expense-amount"
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={newExp.amount}
                        onChange={e => setNewExp(prev => ({ ...prev, amount: e.target.value }))}
                        placeholder="0.00"
                        className="bg-background"
                      />
                    </FieldBlock>

                    <FieldBlock label="Date" htmlFor="expense-date">
                      <Input
                        id="expense-date"
                        type="date"
                        value={newExp.date}
                        onChange={e => setNewExp(prev => ({ ...prev, date: e.target.value }))}
                        className="bg-background"
                      />
                    </FieldBlock>
                  </div>

                  <FieldBlock label="Paid by">
                      <Select value={newExp.paid_by || undefined} onValueChange={value => setNewExp(prev => ({ ...prev, paid_by: value ?? '' }))}>
                      <SelectTrigger className="w-full bg-background">
                        <SelectValue placeholder="Select team member">
                          {(value: string | null) => users.find(u => u.id === value)?.name ?? 'Select team member'}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {users.map(member => (
                            <SelectItem key={member.id} value={member.id}>
                              {member.name}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </FieldBlock>

                  <FieldBlock label="Receipt (optional)">
                    <Input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,application/pdf"
                      onChange={e => handleReceiptSelect(e.target.files?.[0] || null)}
                      className="bg-background"
                    />
                    {receiptFile && (
                      <p className="text-xs text-muted-foreground">Selected: {receiptFile.name}</p>
                    )}
                    {!receiptFile && newExp.receipt_path && (
                      <div className="flex items-center gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => viewReceipt(newExp.receipt_path!)}>
                          📎 View current receipt
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-danger"
                          onClick={() => setNewExp(prev => ({ ...prev, receipt_path: null }))}
                        >
                          Remove
                        </Button>
                      </div>
                    )}
                    <p className="text-[0.65rem] text-muted-foreground">Image or PDF, up to 8MB. Large expenses should always have one attached.</p>
                  </FieldBlock>

                  <DialogFooter>
                    <Button variant="outline" onClick={closeDrawer}>
                      Cancel
                    </Button>
                    <Button
                      onClick={submitExpense}
                      disabled={!newExp.description || !newExp.amount || saving}
                      className="bg-primary text-primary-foreground hover:bg-primary/85"
                    >
                      {saving ? 'Saving…' : dialogConfig.submitLabel}
                    </Button>
                  </DialogFooter>
                </div>
              )}

              {drawer === 'payroll' && (
                <div className="flex flex-col gap-4">
                  <FieldBlock label="Employee">
                      <Select value={newSal.user_id || undefined} onValueChange={value => setNewSal(prev => ({ ...prev, user_id: value ?? '' }))}>
                      <SelectTrigger className="w-full bg-background">
                        <SelectValue placeholder="Select employee">
                          {(value: string | null) => {
                            const member = users.find(u => u.id === value)
                            return member ? `${member.name} (${member.role})` : 'Select employee'
                          }}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {users
                            .filter(member => member.role !== 'admin')
                            .map(member => (
                              <SelectItem key={member.id} value={member.id}>
                                {member.name} ({member.role})
                              </SelectItem>
                            ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </FieldBlock>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <FieldBlock label="Amount ($)" htmlFor="salary-amount">
                      <Input
                        id="salary-amount"
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={newSal.amount}
                        onChange={e => setNewSal(prev => ({ ...prev, amount: e.target.value }))}
                        placeholder="0.00"
                        className="bg-background"
                      />
                    </FieldBlock>

                    <FieldBlock label="Month">
                      <Select value={newSal.month} onValueChange={value => setNewSal(prev => ({ ...prev, month: value ?? prev.month }))}>
                        <SelectTrigger className="w-full bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {MONTHS.map(month => (
                              <SelectItem key={month} value={month}>
                                {month}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </FieldBlock>
                  </div>

                  <FieldBlock label="Notes" htmlFor="salary-notes">
                    <Textarea
                      id="salary-notes"
                      value={newSal.notes}
                      onChange={e => setNewSal(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Bonus, contract work, advance, or other notes"
                      rows={3}
                      className="resize-none bg-background"
                    />
                  </FieldBlock>

                  <DialogFooter>
                    <Button variant="outline" onClick={closeDrawer}>
                      Cancel
                    </Button>
                    <Button
                      onClick={submitPayroll}
                      disabled={!newSal.amount || saving}
                      className="bg-primary text-primary-foreground hover:bg-primary/85"
                    >
                      {saving ? 'Saving…' : dialogConfig.submitLabel}
                    </Button>
                  </DialogFooter>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteTarget !== null} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this {deleteTarget?.type === 'expense' ? 'expense' : 'payroll entry'}?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.label ? `"${deleteTarget.label}" will be permanently removed. This can't be undone.` : "This can't be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={confirmDelete} disabled={deleting}>
              {deleting ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  )
}
