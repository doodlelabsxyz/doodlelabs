import { NextResponse, type NextRequest } from 'next/server'

/**
 * POST /api/billing/webhook
 *
 * PLACEHOLDER — receives billing provider webhook events.
 * Replace with Stripe / LemonSqueezy / Paddle signature verification + handlers.
 *
 * Events to handle when wiring up:
 *   - subscription.created  → set org.plan_status = 'active'
 *   - subscription.updated  → update org.plan + org.plan_status
 *   - subscription.deleted  → set org.plan_status = 'canceled'
 *   - invoice.payment_failed → set org.plan_status = 'past_due', send email
 *   - customer.created       → store stripe_customer_id on org
 */
export async function POST(request: NextRequest) {
  // ── Signature verification (replace with your provider's method) ─────────────
  // This is the ONLY security gate for this route — session auth doesn't apply
  // because webhooks come from the payment provider's servers, not a browser.
  //
  // Stripe example (uncomment when provider is chosen):
  // const signature = request.headers.get('stripe-signature') ?? ''
  // const body = await request.text()
  // try {
  //   const event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!)
  // } catch {
  //   return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  // }
  //
  // Until the provider is wired up, reject all incoming requests so the
  // endpoint cannot be abused even though it is publicly routable.
  const webhookSecret = process.env.BILLING_WEBHOOK_SECRET

  if (!webhookSecret) {
    // No secret configured yet — block everything
    return NextResponse.json({ error: 'Webhook not configured.' }, { status: 503 })
  }

  const signature = request.headers.get('x-webhook-signature') ?? ''
  if (signature !== webhookSecret) {
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 401 })
  }

  console.log('[billing/webhook] received — handler not yet implemented')
  return NextResponse.json({ received: true })
}
