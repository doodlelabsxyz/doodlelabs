import { createAdminClient, createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  const { email, role } = await request.json()

  if (!email || !role) {
    return NextResponse.json({ error: 'Email and role are required.' }, { status: 400 })
  }

  // Identify the calling user and their org
  const userSupabase = await createClient()
  const { data: { user } } = await userSupabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

  const { data: profile } = await userSupabase.from('users').select('org_id, role').eq('id', user.id).single()
  if (!profile?.org_id) return NextResponse.json({ error: 'No workspace found.' }, { status: 400 })
  if (profile.role !== 'admin') return NextResponse.json({ error: 'Only admins can invite team members.' }, { status: 403 })

  const supabase = createAdminClient()

  // Check if this email already has an account in this org
  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .eq('org_id', profile.org_id)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: 'This person is already a member of your workspace.' }, { status: 409 })
  }

  // Check for existing pending invite
  const { data: existingInvite } = await supabase
    .from('invites')
    .select('id')
    .eq('email', email)
    .eq('org_id', profile.org_id)
    .is('accepted_at', null)
    .gte('expires_at', new Date().toISOString())
    .maybeSingle()

  if (existingInvite) {
    return NextResponse.json({ error: 'An invite has already been sent to this email.' }, { status: 409 })
  }

  // Create invite row
  const { data: invite, error: inviteError } = await supabase
    .from('invites')
    .insert({ org_id: profile.org_id, email, role, invited_by: user.id })
    .select('token')
    .single()

  if (inviteError || !invite) {
    return NextResponse.json({ error: inviteError?.message ?? 'Could not create invite.' }, { status: 400 })
  }

  // Get org name for the email
  const { data: org } = await supabase.from('organizations').select('name').eq('id', profile.org_id).single()

  // ── Send invite email via Resend ─────────────────────────────────────────
  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/invite/${invite.token}`
  const resendKey = process.env.RESEND_API_KEY
  const fromEmail = process.env.RESEND_FROM_EMAIL ?? 'labs.sputnik@gmail.com'

  if (!resendKey) {
    return NextResponse.json({ error: 'Email service not configured.' }, { status: 503 })
  }

  const emailRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${resendKey}` },
    body: JSON.stringify({
      from:    `AgencyOS <${fromEmail}>`,
      to:      email,
      subject: `You've been invited to ${org?.name ?? 'AgencyOS'}`,
      html:    `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px">
          <h2 style="margin:0 0 12px">You're invited to join ${org?.name ?? 'AgencyOS'}</h2>
          <p style="color:#555;margin:0 0 24px">You've been invited as a <strong>${role}</strong>. Click the button below to set up your account.</p>
          <a href="${inviteUrl}" style="display:inline-block;padding:14px 28px;background:#f98e4c;color:#fff;border-radius:9999px;font-weight:700;text-decoration:none">
            Accept invite
          </a>
          <p style="color:#aaa;font-size:12px;margin-top:24px">Link expires in 7 days. If you didn't expect this, ignore this email.</p>
        </div>
      `,
    }),
  })

  if (!emailRes.ok) {
    const emailErr = await emailRes.json().catch(() => ({}))
    console.error('[invite/send] Resend error:', emailErr)
    return NextResponse.json({ error: 'Failed to send invite email.' }, { status: 502 })
  }

  return NextResponse.json({ success: true })
}
