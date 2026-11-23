'use client'

import { useOrg } from '@/lib/supabase/OrgContext'
import { PLAN_LIMITS, type OrgPlan, type PlanFeature } from '@/lib/types'

const PLAN_ORDER: OrgPlan[] = ['starter', 'growth', 'pro']

export function usePlanGate(feature: PlanFeature) {
  const { org, loading } = useOrg()
  const plan = (org?.plan ?? 'starter') as OrgPlan
  const limits = PLAN_LIMITS[plan]
  const allowed = limits[feature] as boolean

  // Find the cheapest plan that includes this feature
  const requiredPlan = PLAN_ORDER.find(p => PLAN_LIMITS[p][feature]) ?? 'pro'

  // While org is loading, `plan` falls back to 'starter' — callers must check
  // `loading` before treating `allowed` as final, otherwise a pro-plan user
  // sees a flash of the upgrade wall on every page load.
  return { allowed, requiredPlan, plan, loading }
}
