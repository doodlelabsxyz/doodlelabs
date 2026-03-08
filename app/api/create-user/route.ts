import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { email, password, name, role, clientId, phone } = await request.json()

    if (!email || !password || !name || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = await createAdminClient()

    // 1. Create auth user — email_confirm: true skips verification, sets immediately active
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role }, // stored in auth.users so middleware can read it without a DB call
    })

    if (authError || !authData.user) {
      return NextResponse.json({ error: authError?.message ?? 'Failed to create auth user' }, { status: 400 })
    }

    const userId = authData.user.id

    // 2. Insert into public.users
    const { error: profileError } = await supabase.from('users').insert({
      id: userId,
      name,
      email,
      role,
      phone: phone || null,
      active: true,
    })

    if (profileError) {
      // Rollback: delete auth user if profile insert fails
      await supabase.auth.admin.deleteUser(userId)
      return NextResponse.json({ error: profileError.message }, { status: 500 })
    }

    // 3. If clientId provided, link user to that client
    if (clientId) {
      const { error: linkError } = await supabase.from('client_users').insert({
        user_id: userId,
        client_id: clientId,
      })
      if (linkError) {
        return NextResponse.json({ error: linkError.message }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true, userId })
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
