import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  const { name, email, password, agencyName, slug } = await request.json()

  if (!name || !email || !password || !agencyName || !slug) {
    return NextResponse.json({ error: 'All fields are required.' }, { status: 400 })
  }

  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // 1. Check slug uniqueness
  const { data: existing } = await supabase.from('organizations').select('id').eq('slug', slug).maybeSingle()
  if (existing) {
    return NextResponse.json({ error: 'That workspace URL is already taken. Try another.' }, { status: 409 })
  }

  // 2. Create Supabase auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // skip verification email for now
  })

  if (authError || !authData.user) {
    return NextResponse.json({ error: authError?.message ?? 'Could not create account.' }, { status: 400 })
  }

  // 3. Create organization
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .insert({ name: agencyName, slug })
    .select()
    .single()

  if (orgError || !org) {
    await supabase.auth.admin.deleteUser(authData.user.id)
    return NextResponse.json({ error: orgError?.message ?? 'Could not create workspace.' }, { status: 400 })
  }

  // 4. Create user profile
  const { error: userError } = await supabase.from('users').insert({
    id:     authData.user.id,
    name,
    role:   'admin',
    email,
    org_id: org.id,
  })

  if (userError) {
    await supabase.auth.admin.deleteUser(authData.user.id)
    await supabase.from('organizations').delete().eq('id', org.id)
    return NextResponse.json({ error: userError.message }, { status: 400 })
  }

  return NextResponse.json({ success: true, orgId: org.id })
}
