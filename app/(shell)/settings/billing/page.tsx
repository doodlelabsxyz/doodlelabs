'use client'

import { useToast } from '@/components/ui/toaster'
import { useOrg } from '@/lib/supabase/OrgContext'
import { PLAN_LIMITS, type OrgPlan } from '@/lib/types'

const PLANS: { key: OrgPlan; name: string; price: number }[] = [
  { key:'starter', name:'Starter', price:49 },
  { key:'growth',  name:'Growth',  price:99 },
  { key:'pro',     name:'Pro',     price:199 },
]

const FEATURES = [
  { label:'Team members',    keys: PLANS.map(p => PLAN_LIMITS[p.key].maxMembers === -1 ? 'Unlimited' : String(PLAN_LIMITS[p.key].maxMembers)) },
  { label:'Clients',         keys: PLANS.map(p => PLAN_LIMITS[p.key].maxClients === -1 ? 'Unlimited' : String(PLAN_LIMITS[p.key].maxClients)) },
  { label:'Asset storage',   keys: PLANS.map(p => `${PLAN_LIMITS[p.key].storageMb / 1024} GB`) },
  { label:'Analytics',       keys: PLANS.map(p => PLAN_LIMITS[p.key].hasAnalytics    ? '✓' : '—') },
  { label:'Audit log',       keys: PLANS.map(p => PLAN_LIMITS[p.key].hasAudit        ? '✓' : '—') },
  { label:'Client portal',   keys: PLANS.map(p => PLAN_LIMITS[p.key].hasClientPortal ? '✓' : '—') },
  { label:'Custom domain',   keys: PLANS.map(p => PLAN_LIMITS[p.key].hasCustomDomain ? '✓' : '—') },
]

export default function BillingPage() {
  const { org } = useOrg()
  const { info } = useToast()
  const currentPlan = org?.plan ?? 'starter'
  const planStatus  = org?.plan_status ?? 'trialing'

  const statusClass =
    planStatus === 'active'   ? 'bg-status-done text-status-done-fg' :
    planStatus === 'trialing' ? 'bg-status-active text-status-active-fg' :
    planStatus === 'past_due' ? 'bg-status-late text-status-late-fg' :
                                'bg-status-neutral text-status-neutral-fg'
  const currentIdx = PLANS.findIndex(p => p.key === currentPlan)

  return (
    <main className="page-main min-w-0 flex-1 overflow-y-auto bg-background">

      {/* Header */}
      <div className="shrink-0 bg-dark px-5 pt-[18px] pb-4">
        <p className="mb-px text-2xs uppercase tracking-[0.08em] text-dark-muted">Account</p>
        <h1 className="text-md font-extrabold leading-none text-dark-text">Billing</h1>
      </div>

      <div className="flex max-w-[600px] flex-col gap-3.5 p-4">

        {/* Current plan card */}
        <div className="overflow-hidden rounded-[18px] border border-border bg-card">
          <div className="border-b border-border px-5 py-[18px]">
            <p className="mb-2.5 text-[0.65rem] font-bold uppercase tracking-[0.06em] text-muted-foreground">Current plan</p>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[1.3rem] font-extrabold capitalize tracking-[-0.01em] text-foreground">
                  {currentPlan}
                  <span className={`ml-2.5 rounded-full px-2.5 py-[3px] align-middle text-[0.65rem] font-bold capitalize ${statusClass}`}>
                    {planStatus.replace('_', ' ')}
                  </span>
                </p>
                {org?.trial_ends_at && planStatus === 'trialing' && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Trial ends {new Date(org.trial_ends_at).toLocaleDateString('en-US', { month:'long', day:'numeric', year:'numeric' })}
                  </p>
                )}
              </div>
              <p className="text-[1.4rem] font-extrabold text-foreground">
                ${PLANS.find(p => p.key === currentPlan)?.price ?? 0}
                <span className="text-xs font-medium text-muted-foreground">/mo</span>
              </p>
            </div>
          </div>

          {/* Coming soon notice */}
          <div className="flex items-center gap-2.5 bg-wash px-5 py-3.5">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="shrink-0 text-primary">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.8"/>
              <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
            <p className="text-xs leading-normal text-primary">
              <strong>Billing is coming soon.</strong> You&apos;re on a free trial. We&apos;ll notify you before any charges occur.
            </p>
          </div>
        </div>

        {/* Plan comparison */}
        <div className="overflow-hidden rounded-[18px] border border-border bg-card">
          <p className="px-5 pt-3.5 pb-2.5 text-[0.65rem] font-bold uppercase tracking-[0.06em] text-muted-foreground">All plans</p>

          {/* Plan headers */}
          <div className="grid grid-cols-4 gap-1 border-b border-border px-5 pb-3">
            <div />
            {PLANS.map(plan => {
              const isCurrent = plan.key === currentPlan
              return (
                <div
                  key={plan.key}
                  className={`rounded-xl px-1 py-1.5 text-center ${isCurrent ? 'border-2 border-primary' : 'border-2 border-transparent'}`}
                >
                  <p className={`text-xs font-extrabold ${isCurrent ? 'text-primary' : 'text-foreground'}`}>{plan.name}</p>
                  {isCurrent && (
                    <span className="mt-0.5 inline-block rounded-full bg-wash px-1.5 py-0.5 text-[0.6rem] font-bold text-primary">Current</span>
                  )}
                  <p className="mt-0.5 text-[0.85rem] font-extrabold text-foreground">
                    ${plan.price}<span className="text-[0.65rem] font-medium text-muted-foreground">/mo</span>
                  </p>
                </div>
              )
            })}
          </div>

          {/* Feature rows */}
          {FEATURES.map((f, i) => (
            <div
              key={f.label}
              className={`grid grid-cols-4 items-center px-5 py-2.5 ${i < FEATURES.length - 1 ? 'border-b border-border' : ''}`}
            >
              <span className="text-xs font-medium text-muted-foreground">{f.label}</span>
              {f.keys.map((val, j) => (
                <span
                  key={j}
                  className={`text-center text-xs ${val === '✓' ? 'font-bold text-success' : val === '—' ? 'font-medium text-muted-foreground' : 'font-medium text-foreground'}`}
                >
                  {val === '✓' ? <><span aria-hidden="true">✓</span><span className="sr-only">Included</span></> : val === '—' ? <><span aria-hidden="true">—</span><span className="sr-only">Not included</span></> : val}
                </span>
              ))}
            </div>
          ))}

          {/* Upgrade buttons */}
          <div className="grid grid-cols-4 gap-2 border-t border-border px-5 py-3.5">
            <div />
            {PLANS.map((plan, idx) => (
              <div key={plan.key} className="flex justify-center">
                {plan.key === currentPlan ? (
                  <span className="text-[0.65rem] font-semibold text-muted-foreground">Current</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => info('Online billing is coming soon — contact us to change your plan')}
                    className="min-h-11 cursor-pointer rounded-full border border-primary/40 bg-wash px-3.5 text-[0.68rem] font-bold text-primary hover:bg-sage focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    {idx > currentIdx ? 'Upgrade' : 'Downgrade'}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Annual discount note */}
        <div className="flex items-center gap-2.5 rounded-[14px] border border-border bg-wash px-[18px] py-3.5">
          <p className="text-xs leading-normal text-primary">
            <strong>Save 20%</strong> with annual billing. Starter → $39/mo · Growth → $79/mo · Pro → $159/mo
          </p>
        </div>

        <div className="p-2 text-center text-[0.65rem] text-muted-foreground">
          Questions? Contact support@agencyos.app
        </div>
      </div>
    </main>
  )
}
