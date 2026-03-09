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

  const planColors: Record<string, string> = {
    starter: 'hsl(200,72%,50%)',
    growth:  'hsl(25,82%,60%)',
    pro:     'hsl(270,72%,60%)',
  }

  return (
    <div style={{ minHeight:'100dvh', background:'#0F1A14', padding:'32px 24px', fontFamily:'inherit' }}>

      {/* Header */}
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'8px' }}>
          <svg width="24" height="24" viewBox="0 0 30 30" fill="none">
            <rect width="30" height="30" rx="9" fill="hsl(25,82%,60%)"/>
            <path d="M9 22L15 8l6 14M11.5 17.5h7" stroke="hsl(42,30%,99%)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span style={{ fontWeight:800, fontSize:'1rem', color:'hsl(42,22%,84%)' }}>
            Agency<span style={{ color:'hsl(25,82%,60%)' }}>OS</span>
          </span>
          <span style={{ padding:'3px 10px', borderRadius:'9999px', background:'hsl(270,72%,30%)', color:'hsl(270,72%,80%)', fontSize:'0.6rem', fontWeight:800, letterSpacing:'0.06em', textTransform:'uppercase' }}>
            Super Admin
          </span>
        </div>
        <h1 style={{ fontSize:'1.6rem', fontWeight:800, color:'hsl(42,22%,84%)', letterSpacing:'-0.02em', marginBottom:'32px' }}>
          Platform Overview
        </h1>

        {/* Stats row */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(160px, 1fr))', gap:'12px', marginBottom:'32px' }}>
          {[
            { label:'Total agencies', value: orgs.length, color:'hsl(140,60%,50%)' },
            { label:'Starter',        value: planCounts.starter ?? 0, color: planColors.starter },
            { label:'Growth',         value: planCounts.growth  ?? 0, color: planColors.growth  },
            { label:'Pro',            value: planCounts.pro     ?? 0, color: planColors.pro     },
            { label:'Trialing',       value: orgs.filter(o => o.plan_status === 'trialing').length,  color:'hsl(50,90%,60%)' },
            { label:'Active',         value: orgs.filter(o => o.plan_status === 'active').length,    color:'hsl(140,60%,50%)' },
            { label:'Past due',       value: orgs.filter(o => o.plan_status === 'past_due').length,  color:'hsl(4,72%,55%)'   },
            { label:'Canceled',       value: orgs.filter(o => o.plan_status === 'canceled').length,  color:'hsl(24,8%,45%)'   },
          ].map(s => (
            <div key={s.label} style={{ background:'rgba(255,255,255,0.04)', borderRadius:'14px', border:'1px solid rgba(255,255,255,0.06)', padding:'16px' }}>
              <p style={{ fontSize:'1.6rem', fontWeight:800, color: s.color, lineHeight:1 }}>{s.value}</p>
              <p style={{ fontSize:'0.65rem', color:'hsl(140,7%,48%)', marginTop:'4px', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em' }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Org table */}
        <div style={{ background:'rgba(255,255,255,0.03)', borderRadius:'16px', border:'1px solid rgba(255,255,255,0.06)', overflow:'hidden' }}>
          <div style={{ padding:'16px 20px', borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
            <h2 style={{ fontSize:'0.875rem', fontWeight:700, color:'hsl(42,22%,72%)' }}>All Agencies ({orgs.length})</h2>
          </div>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
                  {['Agency', 'Slug', 'Plan', 'Status', 'Members', 'Clients', 'Joined'].map(h => (
                    <th key={h} style={{ padding:'10px 16px', textAlign:'left', fontSize:'0.6rem', fontWeight:700, color:'hsl(140,7%,45%)', textTransform:'uppercase', letterSpacing:'0.07em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orgs.map((org, i) => (
                  <tr key={org.id} style={{ borderBottom: i < orgs.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                    <td style={{ padding:'12px 16px', fontSize:'0.82rem', fontWeight:600, color:'hsl(42,22%,80%)' }}>{org.name}</td>
                    <td style={{ padding:'12px 16px', fontSize:'0.75rem', color:'hsl(140,7%,50%)', fontFamily:'monospace' }}>{org.slug}</td>
                    <td style={{ padding:'12px 16px' }}>
                      <span style={{ padding:'3px 10px', borderRadius:'9999px', background:`${planColors[org.plan]}20`, color: planColors[org.plan], fontSize:'0.62rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.04em' }}>
                        {org.plan}
                      </span>
                    </td>
                    <td style={{ padding:'12px 16px' }}>
                      <span style={{ fontSize:'0.72rem', color: org.plan_status === 'active' ? 'hsl(140,60%,50%)' : org.plan_status === 'trialing' ? 'hsl(50,90%,60%)' : 'hsl(4,72%,55%)', fontWeight:600 }}>
                        {org.plan_status.replace('_', ' ')}
                      </span>
                    </td>
                    <td style={{ padding:'12px 16px', fontSize:'0.8rem', color:'hsl(42,22%,65%)', textAlign:'center' }}>{org.member_count}</td>
                    <td style={{ padding:'12px 16px', fontSize:'0.8rem', color:'hsl(42,22%,65%)', textAlign:'center' }}>{org.client_count}</td>
                    <td style={{ padding:'12px 16px', fontSize:'0.72rem', color:'hsl(140,7%,48%)' }}>
                      {new Date(org.created_at).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' })}
                    </td>
                  </tr>
                ))}
                {orgs.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ padding:'32px', textAlign:'center', color:'hsl(140,7%,40%)', fontSize:'0.82rem' }}>
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
