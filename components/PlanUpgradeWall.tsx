'use client'

import Link from 'next/link'
import type { OrgPlan } from '@/lib/types'

const PLAN_LABEL: Record<OrgPlan, string> = {
  starter: 'Starter',
  growth: 'Growth',
  pro: 'Pro',
}

export function PlanUpgradeWall({
  feature,
  requiredPlan,
}: {
  feature: string
  requiredPlan: OrgPlan
}) {
  return (
    <main className="page-main flex min-w-0 flex-1 flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-wash text-2xl">
        🔒
      </div>
      <div>
        <h1 className="text-lg font-extrabold text-foreground">
          {feature} is a {PLAN_LABEL[requiredPlan]} plan feature
        </h1>
        <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
          Upgrade your agency&apos;s plan to unlock {feature.toLowerCase()}.
        </p>
      </div>
      <Link
        href="/settings/billing"
        className="rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/85"
      >
        View plans
      </Link>
    </main>
  )
}
