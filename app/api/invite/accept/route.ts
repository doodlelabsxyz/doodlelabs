import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  const { token, name, password } = await request.json()

  if (!token || !name || !password) {
    return NextResponse.json({ error: 'All fields are required.' }, { status: 400 })
  }

  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // 1. Validate invite
  const { data: invite } = await supabase
    .from('invites')
    .select('id, email, role, org_id, expires_at, accepted_at')
    .eq('token', token)
    .maybeSingle()

  if (!invite) return NextResponse.json({ error: 'Invite not found.' }, { status: 404 })
  if (invite.accepted_at) return NextResponse.json({ error: 'This invite has already been used.' }, { status: 410 })
  if (new Date(invite.expires_at) < new Date()) return NextResponse.json({ error: 'Invite has expired.' }, { status: 410 })

  // 2. Create Supabase auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email:         invite.email,
    password,
    email_confirm: true,
  })

  if (authError || !authData.user) {
    return NextResponse.json({ error: authError?.message ?? 'Could not create account.' }, { status: 400 })
  }

  // 3. Create user profile in the same org
  const { error: userError } = await supabase.from('users').insert({
    id:     authData.user.id,
    name,
    role:   invite.role,
    email:  invite.email,
    org_id: invite.org_id,
  })

  if (userError) {
    await supabase.auth.admin.deleteUser(authData.user.id)
    return NextResponse.json({ error: userError.message }, { status: 400 })
  }

  // 4. Mark invite as accepted
  await supabase.from('invites').update({ accepted_at: new Date().toISOString() }).eq('id', invite.id)

  return NextResponse.json({ success: true })
}
