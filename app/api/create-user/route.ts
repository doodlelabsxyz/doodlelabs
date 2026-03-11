import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { email, password, name, role, clientId, phone } = await request.json()

    if (!email || !password || !name || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // ── Get calling admin's org_id from their session ─────────────────────────
    const userSupabase = await createClient()
    const { data: { user: adminUser } } = await userSupabase.auth.getUser()
    if (!adminUser) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

    const { data: adminProfile } = await userSupabase
      .from('users')
      .select('org_id, role')
      .eq('id', adminUser.id)
      .single()

    if (!adminProfile?.org_id) {
      return NextResponse.json({ error: 'No workspace found.' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // ── 1. Create auth user ───────────────────────────────────────────────────
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role },
    })

    if (authError || !authData.user) {
      return NextResponse.json({ error: authError?.message ?? 'Failed to create auth user' }, { status: 400 })
    }

    const userId = authData.user.id

    // ── 2. Insert into public.users with org_id ───────────────────────────────
    const { error: profileError } = await supabase.from('users').insert({
      id:     userId,
      name,
      email,
      role,
      org_id: adminProfile.org_id,
      phone:  phone || null,
      active: true,
    })

    if (profileError) {
      await supabase.auth.admin.deleteUser(userId)
      return NextResponse.json({ error: profileError.message }, { status: 500 })
    }

    // ── 3. Link to client if provided ─────────────────────────────────────────
    if (clientId) {
      const { error: linkError } = await supabase.from('client_users').insert({
        user_id:   userId,
        client_id: clientId,
      })
      if (linkError) {
        return NextResponse.json({ error: linkError.message }, { status: 500 })
      }
    }

    // ── 4. Send welcome email via Resend ──────────────────────────────────────
    const resendKey  = process.env.RESEND_API_KEY
    const fromEmail  = process.env.RESEND_FROM_EMAIL
    const appUrl     = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

    if (resendKey && fromEmail) {
      const { data: org } = await supabase
        .from('organizations')
        .select('name')
        .eq('id', adminProfile.org_id)
        .single()

      const emailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${resendKey}` },
        body: JSON.stringify({
          from:    `AgencyOS <${fromEmail}>`,
          to:      email,
          subject: `Your ${org?.name ?? 'AgencyOS'} account is ready`,
          html: `
            <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px">
              <h2 style="margin:0 0 8px">Welcome to ${org?.name ?? 'AgencyOS'}, ${name}!</h2>
              <p style="color:#555;margin:0 0 24px">Your account has been set up. Use the credentials below to sign in.</p>
              <div style="background:#f9f6f1;border-radius:12px;padding:20px;margin-bottom:24px;font-size:14px">
                <p style="margin:0 0 8px"><strong>Email:</strong> ${email}</p>
                <p style="margin:0"><strong>Password:</strong> ${password}</p>
              </div>
              <a href="${appUrl}/login" style="display:inline-block;padding:14px 28px;background:#f98e4c;color:#fff;border-radius:9999px;font-weight:700;text-decoration:none">
                Sign in now
              </a>
              <p style="color:#aaa;font-size:12px;margin-top:24px">Please change your password after signing in for the first time.</p>
            </div>
          `,
        }),
      })

      if (!emailRes.ok) {
        const emailErr = await emailRes.json().catch(() => ({}))
        console.error('[create-user] Resend error:', emailErr)
        // Don't fail the request — account is created, email is best-effort
      }
    }

    return NextResponse.json({ success: true, userId })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
