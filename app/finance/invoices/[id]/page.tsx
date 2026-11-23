'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

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
import { Button } from '@/components/ui/button'
import { InvoiceDocument } from '@/components/finance/invoice-document'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/supabase/useUser'
import { effectiveInvoiceStatus, type LineItem } from '@/lib/finance'
import type { InvoiceStatus } from '@/lib/types'

type InvoiceDetail = {
  id: string
  invoice_number: string | null
  status: InvoiceStatus
  due_date: string
  created_at: string
  bill_to_name: string | null
  bill_to_email: string | null
  bill_to_address: string | null
  line_items: LineItem[]
  tax_rate: number
  notes: string | null
  clients: { name: string } | { name: string }[] | null
}

export default function InvoiceViewPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { user, loading: userLoading } = useUser()

  const [org, setOrg] = useState<{ name: string; logo_url: string | null } | null>(null)
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState('')
  const [marking, setMarking] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (userLoading) return
    if (user && user.role !== 'admin') {
      router.replace('/dashboard')
      return
    }
    if (!user?.org_id) return

    async function load() {
      const supabase = createClient()
      const [orgRes, invRes] = await Promise.all([
        supabase.from('organizations').select('name, logo_url').eq('id', user!.org_id!).single(),
        supabase
          .from('invoices')
          .select('id, invoice_number, status, due_date, created_at, bill_to_name, bill_to_email, bill_to_address, line_items, tax_rate, notes, clients:client_id(name)')
          .eq('id', params.id)
          .single(),
      ])
      if (orgRes.data) setOrg(orgRes.data)
      if (!invRes.data) {
        setNotFound(true)
      } else {
        setInvoice(invRes.data as InvoiceDetail)
      }
      setLoading(false)
    }

    void load()
  }, [user, userLoading, router, params.id])

  async function markPaid() {
    if (!invoice) return
    setMarking(true)
    setError('')
    const supabase = createClient()
    const now = new Date().toISOString()
    const { data, error: writeError } = await supabase
      .from('invoices')
      .update({ status: 'paid', paid_at: now })
      .eq('id', invoice.id)
      .select('status')
      .single()
    setMarking(false)
    if (writeError || !data) {
      setError('Could not mark this invoice paid. Please try again.')
      return
    }
    setInvoice(prev => (prev ? { ...prev, status: 'paid' } : prev))
  }

  async function handleDelete() {
    if (!invoice) return
    setDeleting(true)
    setError('')
    const supabase = createClient()
    const { data, error: writeError } = await supabase
      .from('invoices')
      .delete()
      .eq('id', invoice.id)
      .select('id')
      .single()
    setDeleting(false)
    setConfirmDelete(false)
    if (writeError || !data) {
      setError('Could not delete this invoice. Please try again.')
      return
    }
    router.push('/finance')
  }

  if (userLoading || loading) return null

  if (notFound || !invoice) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-muted/40 text-center">
        <p className="text-lg font-semibold">Invoice not found</p>
        <Link href="/finance"><Button variant="outline">Back to Finance</Button></Link>
      </main>
    )
  }

  const client = Array.isArray(invoice.clients) ? invoice.clients[0] : invoice.clients
  const status = effectiveInvoiceStatus(invoice)
  const isPaid = invoice.status === 'paid'

  return (
    <main className="min-h-dvh bg-muted/40 print:bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-background px-5 py-4 print:hidden">
        <div className="flex items-center gap-3">
          <Link href="/finance"><Button variant="outline" size="sm">← Finance</Button></Link>
          <h1 className="text-lg font-extrabold tracking-tight">{invoice.invoice_number}</h1>
        </div>
        <div className="flex items-center gap-2">
          {!isPaid && (
            <Button variant="outline" size="sm" onClick={markPaid} disabled={marking}>
              {marking ? 'Marking…' : 'Mark as paid'}
            </Button>
          )}
          {isPaid ? (
            <span className="text-xs text-muted-foreground">Paid invoices are locked</span>
          ) : (
            <Link href={`/finance/invoices/new?id=${invoice.id}`}>
              <Button variant="outline" size="sm">Edit</Button>
            </Link>
          )}
          {!isPaid && (
            <Button variant="destructive" size="sm" onClick={() => setConfirmDelete(true)}>
              Delete
            </Button>
          )}
          <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/85" onClick={() => window.print()}>
            Print / Download PDF
          </Button>
        </div>
      </div>

      {error && (
        <div className="mx-5 mt-4 rounded-lg border border-danger/20 bg-danger/5 px-4 py-3 text-sm font-medium text-danger print:hidden">
          {error}
        </div>
      )}

      <div className="py-8">
        <InvoiceDocument
          org={org}
          invoiceNumber={invoice.invoice_number || ''}
          status={status}
          issueDate={invoice.created_at.split('T')[0]}
          dueDate={invoice.due_date}
          billTo={{
            name: invoice.bill_to_name || client?.name || '',
            email: invoice.bill_to_email || undefined,
            address: invoice.bill_to_address || undefined,
          }}
          lineItems={invoice.line_items || []}
          taxRate={Number(invoice.tax_rate) || 0}
          notes={invoice.notes || undefined}
        />
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this invoice?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes {invoice.invoice_number}. This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  )
}
