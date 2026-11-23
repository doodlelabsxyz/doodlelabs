'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import type { OrgPlan } from '@/lib/types'

const PLAN_LABEL: Record<OrgPlan, string> = {
  starter: 'Starter',
  growth: 'Growth',
  pro: 'Pro',
}

export function PlanLimitDialog({
  open,
  onClose,
  resource,
  plan,
  limit,
}: {
  open: boolean
  onClose: () => void
  resource: 'clients' | 'team members'
  plan: OrgPlan
  /** -1, null or Infinity = unlimited (dialog should not normally open) */
  limit: number | null
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const unlimited = limit === null || limit < 0 || !Number.isFinite(limit)

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 p-4 sm:items-center"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="plan-limit-title"
        onClick={e => e.stopPropagation()}
        className="w-full max-w-sm rounded-3xl bg-background p-6 text-center shadow-xl"
      >
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-wash text-2xl">
          🚀
        </div>
        <h2 id="plan-limit-title" className="mt-4 text-lg font-extrabold text-foreground">
          You&apos;ve reached your {resource} limit
        </h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {unlimited
            ? `Your ${PLAN_LABEL[plan]} plan has no ${resource} limit.`
            : `Your ${PLAN_LABEL[plan]} plan includes up to ${limit} ${resource}. Upgrade to add more.`}
        </p>
        <span className="mt-3 inline-block rounded-full bg-wash px-3 py-1 text-xs font-bold text-foreground">
          {PLAN_LABEL[plan]} plan{unlimited ? '' : ` · ${limit} ${resource}`}
        </span>
        <div className="mt-5 flex flex-col gap-2">
          <Link
            href="/settings/billing"
            className="rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/85"
          >
            Upgrade plan
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-5 py-2.5 text-sm font-semibold text-muted-foreground hover:bg-muted"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  )
}
