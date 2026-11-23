import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'

type OrgRow = {
  id: string
  name: string
  slug: string
  plan: string
  plan_status: string
  created_at: string
  member_count: number
  client_count: number
}

async function getOrgStats(): Promise<OrgRow[]> {
  const supabase = createAdminClient()

  const { data: orgs } = await supabase
    .from('organizations')
    .select('id, name, slug, plan, plan_status, created_at')
    .order('created_at', { ascending: false })

  if (!orgs) return []

  const rows: OrgRow[] = await Promise.all(
    orgs.map(async org => {
      const [{ count: members }, { count: clients }] = await Promise.all([
        supabase.from('users').select('id', { count: 'exact', head: true }).eq('org_id', org.id),
        supabase.from('clients').select('id', { count: 'exact', head: true }).eq('org_id', org.id),
      ])
      return { ...org, member_count: members ?? 0, client_count: clients ?? 0 }
    })
  )
  return rows
}

export default async function SuperAdminPage() {
  // Auth + email gate (belt-and-suspenders on top of proxy.ts)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const superAdminEmails = (process.env.SUPER_ADMIN_EMAILS ?? '')
    .split(',').map(e => e.trim()).filter(Boolean)
  if (!superAdminEmails.includes(user.email ?? '')) redirect('/dashboard')

  const orgs = await getOrgStats()

  const planCounts = orgs.reduce<Record<string, number>>((acc, o) => {
    acc[o.plan] = (acc[o.plan] ?? 0) + 1
    return acc
  }, {})

  const planBadge: Record<string, string> = {
    starter: 'bg-sage text-lemon-ink',
    growth:  'bg-wash text-mint-ink',
    pro:     'bg-primary text-primary-foreground',
  }
  const planText: Record<string, string> = {
    starter: 'text-lemon-ink',
    growth:  'text-mint-ink',
    pro:     'text-primary',
  }

  const stats = [
    { label: 'Total agencies', value: orgs.length,                                            cls: 'text-primary' },
    { label: 'Starter',        value: planCounts.starter ?? 0,                                cls: planText.starter },
    { label: 'Growth',         value: planCounts.growth  ?? 0,                                cls: planText.growth },
    { label: 'Pro',            value: planCounts.pro     ?? 0,                                cls: planText.pro },
    { label: 'Trialing',       value: orgs.filter(o => o.plan_status === 'trialing').length,  cls: 'text-lemon-ink' },
    { label: 'Active',         value: orgs.filter(o => o.plan_status === 'active').length,    cls: 'text-success' },
    { label: 'Past due',       value: orgs.filter(o => o.plan_status === 'past_due').length,  cls: 'text-danger' },
    { label: 'Canceled',       value: orgs.filter(o => o.plan_status === 'canceled').length,  cls: 'text-muted-foreground' },
  ]

  return (
    <div className="min-h-dvh bg-background px-6 py-8 font-[inherit] text-foreground">

      {/* Header */}
      <div className="mx-auto max-w-[960px]">
        <div className="mb-2 flex items-center gap-2.5">
          <svg width="24" height="24" viewBox="0 0 30 30" fill="none">
            <rect width="30" height="30" rx="9" className="fill-primary"/>
            <path d="M9 22L15 8l6 14M11.5 17.5h7" className="stroke-primary-foreground" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="text-base font-extrabold text-foreground">
            Agency<span className="text-primary">OS</span>
          </span>
          <span className="rounded-full border border-primary/30 bg-wash px-2.5 py-[3px] text-[0.6rem] font-extrabold uppercase tracking-[0.06em] text-mint-ink">
            Super Admin
          </span>
        </div>
        <h1 className="mb-8 text-[1.6rem] font-extrabold tracking-[-0.02em] text-foreground">
          Platform Overview
        </h1>

        {/* Stats row */}
        <div className="mb-8 grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3">
          {stats.map(s => (
            <div key={s.label} className="rounded-[14px] border border-border bg-surface p-4">
              <p className={`text-[1.6rem] font-extrabold leading-none ${s.cls}`}>{s.value}</p>
              <p className="mt-1 text-[0.65rem] font-semibold uppercase tracking-[0.06em] text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Org table */}
        <div className="overflow-hidden rounded-2xl border border-border bg-surface">
          <div className="border-b border-border px-5 py-4">
            <h2 className="text-sm font-bold text-foreground">All Agencies ({orgs.length})</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-border">
                  {['Agency', 'Slug', 'Plan', 'Status', 'Members', 'Clients', 'Joined'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-[0.6rem] font-bold uppercase tracking-[0.07em] text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orgs.map(org => (
                  <tr key={org.id} className="border-b border-border last:border-b-0">
                    <td className="px-4 py-3 text-[0.82rem] font-semibold text-foreground">{org.name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{org.slug}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-[3px] text-[0.62rem] font-bold uppercase tracking-[0.04em] ${planBadge[org.plan] ?? 'bg-sage text-lemon-ink'}`}>
                        {org.plan}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[0.72rem] font-semibold ${org.plan_status === 'active' ? 'text-success' : org.plan_status === 'trialing' ? 'text-lemon-ink' : 'text-danger'}`}>
                        {org.plan_status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-[0.8rem] text-foreground">{org.member_count}</td>
                    <td className="px-4 py-3 text-center text-[0.8rem] text-foreground">{org.client_count}</td>
                    <td className="px-4 py-3 text-[0.72rem] text-muted-foreground">
                      {new Date(org.created_at).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' })}
                    </td>
                  </tr>
                ))}
                {orgs.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-[0.82rem] text-muted-foreground">
                      No agencies yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
