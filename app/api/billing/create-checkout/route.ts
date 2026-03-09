import { NextResponse } from 'next/server'

/**
 * POST /api/billing/create-checkout
 *
 * PLACEHOLDER — payment provider not yet chosen.
 * Replace this implementation with Stripe / LemonSqueezy / Paddle logic
 * once the provider is decided.
 *
 * Expected request body: { plan: 'starter' | 'growth' | 'pro', interval: 'monthly' | 'annual' }
 * Expected response:      { checkoutUrl: string }
 */
export async function POST() {
  return NextResponse.json(
    { error: 'Billing is not yet configured. Check back soon.', code: 'billing_not_implemented' },
    { status: 501 }
  )
}
