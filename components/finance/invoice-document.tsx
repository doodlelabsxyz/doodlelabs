import { fmtMoney, lineItemAmount, type LineItem } from '@/lib/finance'
import { cn } from '@/lib/utils'
import type { InvoiceStatus } from '@/lib/types'
import type { StatusIconName } from '@/lib/color-map'
import { StatusIcon } from '@/components/ui/type-icon'

export type InvoiceDocumentProps = {
  org: { name: string; logo_url?: string | null } | null
  invoiceNumber: string
  status: InvoiceStatus
  issueDate: string
  dueDate: string
  billTo: { name: string; email?: string; address?: string }
  lineItems: LineItem[]
  taxRate: number
  notes?: string
  className?: string
}

const PRINT_CHIP = 'print:border-black/40 print:bg-white print:text-black'
const STATUS_STYLE: Record<InvoiceStatus, { className: string; icon: StatusIconName }> = {
  paid: { className: 'border-status-done-fg/30 bg-status-done text-status-done-fg', icon: 'check' },
  pending: { className: 'border-status-active-fg/30 bg-status-active text-status-active-fg', icon: 'clock' },
  overdue: { className: 'border-status-late-fg/40 bg-status-late text-status-late-fg', icon: 'bang' },
}

function fmtDate(s: string) {
  if (!s) return '—'
  return new Date(`${s}T00:00:00`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

export function InvoiceDocument({
  org,
  invoiceNumber,
  status,
  issueDate,
  dueDate,
  billTo,
  lineItems,
  taxRate,
  notes,
  className,
}: InvoiceDocumentProps) {
  const subtotal = lineItems.reduce((sum, item) => sum + lineItemAmount(item), 0)
  const taxAmount = Math.round(subtotal * (taxRate / 100) * 100) / 100
  const total = subtotal + taxAmount

  return (
    <div className={cn('mx-auto w-full max-w-3xl border border-border bg-card p-8 text-foreground shadow-sm print:border-0 print:bg-white print:text-black sm:p-12 print:max-w-none print:p-0 print:shadow-none', className)}>
      <div className="flex flex-wrap items-start justify-between gap-6 border-b border-current/10 pb-8">
        <div className="flex items-center gap-3">
          {org?.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={org.logo_url} alt={org.name} className="h-12 w-12 rounded-lg object-cover" />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-lg font-extrabold text-primary-foreground print:border print:border-black print:bg-white print:text-black">
              {(org?.name || 'A').slice(0, 1).toUpperCase()}
            </div>
          )}
          <div>
            <p className="text-lg font-extrabold tracking-tight">{org?.name || 'Your Agency'}</p>
            <p className="text-xs text-current/50">Content &amp; growth partner</p>
          </div>
        </div>

        <div className="text-right">
          <h1 className="text-2xl font-extrabold tracking-tight text-current/90">INVOICE</h1>
          <p className="mt-1 font-mono text-sm text-current/60">{invoiceNumber || 'Draft'}</p>
          <span className={cn('mt-2 inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide', STATUS_STYLE[status].className, PRINT_CHIP)}>
            <StatusIcon name={STATUS_STYLE[status].icon} className="size-2.5" />
            {status}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 border-b border-current/10 py-8 sm:grid-cols-3">
        <div>
          <p className="text-[0.65rem] font-bold uppercase tracking-wider text-current/40">Bill to</p>
          <p className="mt-1.5 font-semibold text-current/90">{billTo.name || 'Select a client'}</p>
          {billTo.email && <p className="text-sm text-current/60">{billTo.email}</p>}
          {billTo.address && <p className="whitespace-pre-line text-sm text-current/60">{billTo.address}</p>}
        </div>
        <div>
          <p className="text-[0.65rem] font-bold uppercase tracking-wider text-current/40">Issue date</p>
          <p className="mt-1.5 text-sm font-medium text-current/80">{fmtDate(issueDate)}</p>
        </div>
        <div>
          <p className="text-[0.65rem] font-bold uppercase tracking-wider text-current/40">Due date</p>
          <p className="mt-1.5 text-sm font-medium text-current/80">{fmtDate(dueDate)}</p>
        </div>
      </div>

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-current/10 text-left text-[0.65rem] font-bold uppercase tracking-wider text-current/40">
            <th className="py-2.5">Description</th>
            <th className="py-2.5 text-right">Qty</th>
            <th className="py-2.5 text-right">Rate</th>
            <th className="py-2.5 text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {lineItems.length === 0 ? (
            <tr>
              <td colSpan={4} className="py-6 text-center text-current/40">No line items yet</td>
            </tr>
          ) : (
            lineItems.map((item, index) => (
              <tr key={item.id || index} className="border-b border-current/5">
                <td className="py-3 pr-4 text-current/80">{item.description || '—'}</td>
                <td className="py-3 text-right text-current/60">{item.qty}</td>
                <td className="py-3 text-right text-current/60">{fmtMoney(item.rate)}</td>
                <td className="py-3 text-right font-semibold text-current/90">{fmtMoney(lineItemAmount(item))}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <div className="flex justify-end pt-6">
        <div className="w-full max-w-56 space-y-2 text-sm">
          <div className="flex justify-between text-current/60">
            <span>Subtotal</span>
            <span>{fmtMoney(subtotal)}</span>
          </div>
          <div className="flex justify-between text-current/60">
            <span>Tax ({taxRate || 0}%)</span>
            <span>{fmtMoney(taxAmount)}</span>
          </div>
          <div className="flex justify-between border-t border-current/10 pt-2 text-base font-extrabold text-current/90">
            <span>Total</span>
            <span>{fmtMoney(total)}</span>
          </div>
        </div>
      </div>

      {notes && (
        <div className="mt-8 border-t border-current/10 pt-6">
          <p className="text-[0.65rem] font-bold uppercase tracking-wider text-current/40">Notes</p>
          <p className="mt-1.5 whitespace-pre-line text-sm text-current/60">{notes}</p>
        </div>
      )}
    </div>
  )
}
