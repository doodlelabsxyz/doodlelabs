import { NextResponse } from 'next/server'

/**
 * POST /api/billing/portal
 *
 * PLACEHOLDER — opens the billing provider's customer portal.
 * Replace with Stripe Customer Portal / LemonSqueezy / Paddle equivalent.
 *
 * Expected response: { portalUrl: string }
 */
export async function POST() {
  return NextResponse.json(
    { error: 'Billing portal is not yet configured.', code: 'billing_not_implemented' },
    { status: 501 }
  )
}
