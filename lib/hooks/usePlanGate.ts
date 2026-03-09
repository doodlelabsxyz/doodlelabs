'use client'

import { useOrg } from '@/lib/supabase/OrgContext'
import { PLAN_LIMITS, type OrgPlan, type PlanFeature } from '@/lib/types'

const PLAN_ORDER: OrgPlan[] = ['starter', 'growth', 'pro']

export function usePlanGate(feature: PlanFeature) {
  const { org } = useOrg()
  const plan = (org?.plan ?? 'starter') as OrgPlan
  const limits = PLAN_LIMITS[plan]
  const allowed = limits[feature] as boolean

  // Find the cheapest plan that includes this feature
  const requiredPlan = PLAN_ORDER.find(p => PLAN_LIMITS[p][feature]) ?? 'pro'

  return { allowed, requiredPlan, plan }
}
