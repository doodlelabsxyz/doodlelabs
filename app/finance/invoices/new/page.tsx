'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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
import { Textarea } from '@/components/ui/textarea'
import { InvoiceDocument } from '@/components/finance/invoice-document'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/supabase/useUser'
import { emptyLineItem, lineItemAmount, recentMonths, type LineItem } from '@/lib/finance'
import type { InvoiceStatus } from '@/lib/types'

const MONTHS = recentMonths(12)

type ClientOption = { id: string; name: string; contact_name: string | null; contact_email: string | null }

function NewInvoicePageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const editId = searchParams.get('id')

  const { user, loading: userLoading } = useUser()
  const [org, setOrg] = useState<{ name: string; logo_url: string | null } | null>(null)
  const [clients, setClients] = useState<ClientOption[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [lockedPaid, setLockedPaid] = useState(false)
  const [invoiceNumber, setInvoiceNumber] = useState('')

  const [clientId, setClientId] = useState('')
  const [billToName, setBillToName] = useState('')
  const [billToEmail, setBillToEmail] = useState('')
  const [billToAddress, setBillToAddress] = useState('')
  const [month, setMonth] = useState(MONTHS[0])
  const [issueDate, setIssueDate] = useState(() => new Date().toISOString().split('T')[0])
  const [dueDate, setDueDate] = useState('')
  const [status, setStatus] = useState<InvoiceStatus>('pending')
  const [lineItems, setLineItems] = useState<LineItem[]>([emptyLineItem()])
  const [taxRate, setTaxRate] = useState(0)
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (userLoading) return
    if (user && user.role !== 'admin') {
      router.replace('/dashboard')
      return
    }
    if (!user?.org_id) return

    async function load() {
      const supabase = createClient()
      const [orgRes, cliRes] = await Promise.all([
        supabase.from('organizations').select('name, logo_url').eq('id', user!.org_id!).single(),
        supabase.from('clients').select('id, name, contact_name, contact_email').order('name'),
      ])
      if (orgRes.data) setOrg(orgRes.data)
      const clientList = (cliRes.data || []) as ClientOption[]
      setClients(clientList)

      if (editId) {
        const { data: inv } = await supabase.from('invoices').select('*').eq('id', editId).single()
        if (inv) {
          if (inv.status === 'paid') {
            setLockedPaid(true)
          }
          setInvoiceNumber(inv.invoice_number || '')
          setClientId(inv.client_id)
          setBillToName(inv.bill_to_name || '')
          setBillToEmail(inv.bill_to_email || '')
          setBillToAddress(inv.bill_to_address || '')
          setMonth(inv.month)
          setDueDate(inv.due_date)
          setStatus(inv.status)
          setTaxRate(Number(inv.tax_rate) || 0)
          setNotes(inv.notes || '')
          const items = Array.isArray(inv.line_items) && inv.line_items.length > 0
            ? inv.line_items.map((it: Partial<LineItem>) => ({
                id: it.id || crypto.randomUUID(),
                description: it.description || '',
                qty: Number(it.qty) || 1,
                rate: Number(it.rate) || 0,
              }))
            : [{ id: crypto.randomUUID(), description: inv.description, qty: 1, rate: Number(inv.amount) }]
          setLineItems(items)
        }
      } else if (clientList[0]) {
        setClientId(clientList[0].id)
        setBillToName(clientList[0].contact_name || clientList[0].name)
        setBillToEmail(clientList[0].contact_email || '')
      }

      setLoading(false)
    }

    void load()
  }, [user, userLoading, router, editId])

  function handleClientChange(id: string) {
    setClientId(id)
    if (editId) return // don't clobber a manually-edited bill-to on an existing invoice
    const client = clients.find(c => c.id === id)
    if (client) {
      setBillToName(client.contact_name || client.name)
      setBillToEmail(client.contact_email || '')
    }
  }

  function updateLineItem(id: string, patch: Partial<LineItem>) {
    setLineItems(prev => prev.map(item => (item.id === id ? { ...item, ...patch } : item)))
  }

  function removeLineItem(id: string) {
    setLineItems(prev => (prev.length > 1 ? prev.filter(item => item.id !== id) : prev))
  }

  const validLineItems = lineItems.filter(item => item.description.trim() && item.rate > 0)
  const canSubmit = clientId && billToName.trim() && dueDate && validLineItems.length > 0 && !saving

  async function handleSubmit() {
    if (!canSubmit || !user?.org_id) return
    setSaving(true)
    setError('')

    const subtotal = lineItems.reduce((sum, item) => sum + lineItemAmount(item), 0)
    const taxAmount = Math.round(subtotal * (taxRate / 100) * 100) / 100
    const amount = subtotal + taxAmount
    const description = lineItems.length === 1
      ? lineItems[0].description
      : `${lineItems[0].description} + ${lineItems.length - 1} more item${lineItems.length > 2 ? 's' : ''}`

    const payload = {
      client_id: clientId,
      bill_to_name: billToName,
      bill_to_email: billToEmail || null,
      bill_to_address: billToAddress || null,
      month,
      due_date: dueDate,
      status,
      description,
      line_items: lineItems.map(item => ({ description: item.description, qty: item.qty, rate: item.rate })),
      subtotal,
      tax_rate: taxRate,
      tax_amount: taxAmount,
      amount,
      notes: notes || null,
      org_id: user.org_id,
    }

    const supabase = createClient()
    const { data, error: writeError } = editId
      ? await supabase.from('invoices').update(payload).eq('id', editId).select('id').single()
      : await supabase.from('invoices').insert(payload).select('id').single()

    setSaving(false)

    if (writeError || !data) {
      setError(writeError?.message || 'Could not save the invoice. Please try again.')
      return
    }

    router.push(`/finance/invoices/${data.id}`)
  }

  if (userLoading || loading) return null

  const selectedClient = clients.find(c => c.id === clientId)

  return (
    <main className="min-h-dvh bg-muted/40">
      <div className="flex items-center justify-between border-b border-border bg-background px-5 py-4">
        <div className="flex items-center gap-3">
          <Link href={editId ? `/finance/invoices/${editId}` : '/finance'}>
            <Button variant="outline" size="sm">← Cancel</Button>
          </Link>
          <h1 className="text-lg font-extrabold tracking-tight">{editId ? 'Edit invoice' : 'New invoice'}</h1>
        </div>
        <Button onClick={handleSubmit} disabled={!canSubmit} className="bg-primary text-primary-foreground hover:bg-primary/85">
          {saving ? 'Saving…' : editId ? 'Save changes' : 'Create invoice'}
        </Button>
      </div>

      {lockedPaid && (
        <div className="mx-5 mt-4 rounded-lg border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">
          This invoice is already marked paid and is locked from editing to protect the accounting record.{' '}
          <Link href={`/finance/invoices/${editId}`} className="font-semibold underline">View it instead</Link>.
        </div>
      )}

      {error && (
        <div className="mx-5 mt-4 rounded-lg border border-danger/20 bg-danger/5 px-4 py-3 text-sm font-medium text-danger">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 p-5 xl:grid-cols-[minmax(0,26rem)_1fr]">
        <div className="flex flex-col gap-4">
          <Card>
            <CardContent className="flex flex-col gap-4 py-5">
              <div className="flex flex-col gap-1.5">
                <Label>Client</Label>
                <Select value={clientId || undefined} onValueChange={value => value && handleClientChange(value)} disabled={lockedPaid}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select client">
                      {(value: string | null) => clients.find(c => c.id === value)?.name ?? 'Select client'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {clients.map(client => (
                        <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>Bill to (name)</Label>
                <Input value={billToName} onChange={e => setBillToName(e.target.value)} disabled={lockedPaid} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Bill to (email)</Label>
                <Input type="email" value={billToEmail} onChange={e => setBillToEmail(e.target.value)} disabled={lockedPaid} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Bill to (address)</Label>
                <Textarea rows={2} value={billToAddress} onChange={e => setBillToAddress(e.target.value)} disabled={lockedPaid} className="resize-none" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label>Issue date</Label>
                  <Input type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} disabled={lockedPaid} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Due date</Label>
                  <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} disabled={lockedPaid} />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>Billing month</Label>
                <Select value={month} onValueChange={value => value && setMonth(value)} disabled={lockedPaid}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {MONTHS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex flex-col gap-3 py-5">
              <div className="flex items-center justify-between">
                <Label>Line items</Label>
                <Button variant="outline" size="sm" onClick={() => setLineItems(prev => [...prev, emptyLineItem()])} disabled={lockedPaid}>
                  + Add item
                </Button>
              </div>

              {lineItems.map(item => (
                <div key={item.id} className="grid grid-cols-[1fr_3.5rem_5rem_auto] items-end gap-2">
                  <div className="flex flex-col gap-1">
                    <Label className="text-[0.65rem] text-muted-foreground">Description</Label>
                    <Input
                      value={item.description}
                      onChange={e => updateLineItem(item.id, { description: e.target.value })}
                      placeholder="Service or deliverable"
                      disabled={lockedPaid}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label className="text-[0.65rem] text-muted-foreground">Qty</Label>
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      value={item.qty}
                      onChange={e => updateLineItem(item.id, { qty: parseFloat(e.target.value) || 0 })}
                      disabled={lockedPaid}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label className="text-[0.65rem] text-muted-foreground">Rate</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.rate}
                      onChange={e => updateLineItem(item.id, { rate: parseFloat(e.target.value) || 0 })}
                      disabled={lockedPaid}
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => removeLineItem(item.id)}
                    disabled={lineItems.length === 1 || lockedPaid}
                    aria-label="Remove line item"
                  >
                    ✕
                  </Button>
                </div>
              ))}

              <div className="flex flex-col gap-1.5 pt-2">
                <Label>Tax rate (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={taxRate}
                  onChange={e => setTaxRate(parseFloat(e.target.value) || 0)}
                  className="max-w-32"
                  disabled={lockedPaid}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>Notes / terms</Label>
                <Textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Payment terms, thank-you note, bank details…" className="resize-none" disabled={lockedPaid} />
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <p className="mb-3 text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground">Live preview</p>
          <InvoiceDocument
            org={org}
            invoiceNumber={invoiceNumber || 'Assigned on save'}
            status={status}
            issueDate={issueDate}
            dueDate={dueDate}
            billTo={{ name: billToName || selectedClient?.name || '', email: billToEmail, address: billToAddress }}
            lineItems={lineItems}
            taxRate={taxRate}
            notes={notes}
          />
        </div>
      </div>
    </main>
  )
}

export default function NewInvoicePage() {
  return (
    <Suspense fallback={null}>
      <NewInvoicePageInner />
    </Suspense>
  )
}
