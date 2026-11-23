import type { InvoiceStatus } from '@/lib/types'

export type LineItem = {
  id: string
  description: string
  qty: number
  rate: number
}

export function lineItemAmount(item: Pick<LineItem, 'qty' | 'rate'>): number {
  return Math.round(item.qty * item.rate * 100) / 100
}

export function emptyLineItem(): LineItem {
  return { id: crypto.randomUUID(), description: '', qty: 1, rate: 0 }
}

/** Same set of month labels every finance screen filters/groups by — must stay
 *  in sync everywhere invoices are created or the invoice silently drops out
 *  of the Monthly snapshot / Client income views that string-match on it. */
export function recentMonths(count: number): string[] {
  const months: string[] = []
  const d = new Date()
  d.setDate(1)
  for (let i = 0; i < count; i++) {
    months.push(d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }))
    d.setMonth(d.getMonth() - 1)
  }
  return months
}

export function fmtMoney(n: number): string {
  return `$${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/** An invoice's stored `status` only ever moves forward to 'paid' — nothing
 *  flips 'pending' to 'overdue' on its own. Compute the effective status for
 *  display (and for hero/summary totals) instead of relying on a stale field. */
export function effectiveInvoiceStatus(invoice: { status: InvoiceStatus; due_date: string }): InvoiceStatus {
  if (invoice.status === 'pending' && new Date(invoice.due_date) < new Date(new Date().toDateString())) {
    return 'overdue'
  }
  return invoice.status
}
