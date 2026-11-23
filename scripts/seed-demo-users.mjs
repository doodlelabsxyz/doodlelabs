// Sets a known password on the demo accounts so testers can sign in.
//
// Usage (PowerShell or bash, from the project root):
//   DEMO_PASSWORD='choose-something-10+chars' node --env-file=.env.local scripts/seed-demo-users.mjs
// PowerShell:
//   $env:DEMO_PASSWORD='choose-something-10+chars'; node --env-file=.env.local scripts/seed-demo-users.mjs
//
// What it touches (nothing else):
//   - existing users whose email ends in @agencyos.app inside the demo org
//   - one new admin: demo.admin@agencyos.app (created if missing)
// It never touches real people's accounts (any other email domain).
// Uses the service role key from .env.local; the key never leaves your machine.

import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
const password = process.env.DEMO_PASSWORD
const orgName = process.env.DEMO_ORG || 'Sputnik Labs'
const ADMIN_EMAIL = 'demo.admin@agencyos.app'

if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Run with: node --env-file=.env.local scripts/seed-demo-users.mjs')
  process.exit(1)
}
if (!password || password.length < 10) {
  console.error('Set DEMO_PASSWORD to a password of at least 10 characters.')
  process.exit(1)
}

const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })

const { data: org, error: orgErr } = await supabase.from('organizations').select('id,name').eq('name', orgName).maybeSingle()
if (orgErr || !org) {
  console.error(`Organization "${orgName}" not found.`, orgErr?.message ?? '')
  process.exit(1)
}

// 1) Ensure the demo admin exists
const { data: existingAdmin } = await supabase.from('users').select('id').eq('email', ADMIN_EMAIL).maybeSingle()
if (!existingAdmin) {
  const { data: created, error } = await supabase.auth.admin.createUser({
    email: ADMIN_EMAIL, password, email_confirm: true, user_metadata: { name: 'Demo Admin' },
  })
  if (error) { console.error('Could not create demo admin:', error.message); process.exit(1) }
  const { error: insErr } = await supabase.from('users').upsert({
    id: created.user.id, name: 'Demo Admin', role: 'admin', email: ADMIN_EMAIL, org_id: org.id, active: true,
  })
  if (insErr) { console.error('Created auth user but could not create profile row:', insErr.message); process.exit(1) }
  console.log('Created', ADMIN_EMAIL)
}

// 2) Set the password on every @agencyos.app user in the demo org
const { data: users, error: uErr } = await supabase
  .from('users').select('id,email,role').eq('org_id', org.id).ilike('email', '%@agencyos.app').order('role')
if (uErr) { console.error(uErr.message); process.exit(1) }

const rows = []
for (const u of users) {
  const { error } = await supabase.auth.admin.updateUserById(u.id, { password, email_confirm: true })
  rows.push({ role: u.role, email: u.email, result: error ? `FAILED: ${error.message}` : 'password set' })
}
console.table(rows)
console.log(`\nDone for org "${org.name}". Sign in with any email above and the password you set in DEMO_PASSWORD.`)
