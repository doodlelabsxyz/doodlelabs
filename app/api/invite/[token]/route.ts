import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

// GET /api/invite/[token] — validate token and return public invite info
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const supabase  = createAdminClient()

  const { data: invite } = await supabase
    .from('invites')
    .select('id, email, role, org_id, expires_at, accepted_at')
    .eq('token', token)
    .maybeSingle()

  if (!invite) {
    return NextResponse.json({ error: 'Invite link not found.' }, { status: 404 })
  }

  if (invite.accepted_at) {
    return NextResponse.json({ error: 'This invite has already been used.' }, { status: 410 })
  }

  if (new Date(invite.expires_at) < new Date()) {
    return NextResponse.json({ error: 'This invite has expired. Ask your admin to send a new one.' }, { status: 410 })
  }

  const { data: org } = await supabase.from('organizations').select('name').eq('id', invite.org_id).single()

  return NextResponse.json({
    email:   invite.email,
    role:    invite.role,
    orgName: org?.name ?? 'Your agency',
  })
}
