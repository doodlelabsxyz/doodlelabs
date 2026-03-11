'use client'

import { useOrg } from '@/lib/supabase/OrgContext'
import { PLAN_LIMITS, type OrgPlan } from '@/lib/types'

const PLANS: { key: OrgPlan; name: string; price: number; color: string }[] = [
  { key:'starter', name:'Starter', price:49,  color:'hsl(200,72%,50%)' },
  { key:'growth',  name:'Growth',  price:99,  color:'hsl(25,82%,60%)'  },
  { key:'pro',     name:'Pro',     price:199, color:'hsl(270,72%,60%)' },
]

const FEATURES = [
  { label:'Team members',    keys: PLANS.map(p => PLAN_LIMITS[p.key].maxMembers === -1 ? 'Unlimited' : String(PLAN_LIMITS[p.key].maxMembers)) },
  { label:'Clients',         keys: PLANS.map(p => PLAN_LIMITS[p.key].maxClients === -1 ? 'Unlimited' : String(PLAN_LIMITS[p.key].maxClients)) },
  { label:'Asset storage',   keys: PLANS.map(p => `${PLAN_LIMITS[p.key].storageMb / 1024} GB`) },
  { label:'Analytics',       keys: PLANS.map(p => PLAN_LIMITS[p.key].hasAnalytics    ? '✓' : '—') },
  { label:'Audit log',       keys: PLANS.map(p => PLAN_LIMITS[p.key].hasAudit        ? '✓' : '—') },
  { label:'Client portal',   keys: PLANS.map(p => PLAN_LIMITS[p.key].hasClientPortal ? '✓' : '—') },
  { label:'Custom domain',   keys: PLANS.map(p => PLAN_LIMITS[p.key].hasCustomDomain ? '✓' : '—') },
]

export default function BillingPage() {
  const { org } = useOrg()
  const currentPlan = org?.plan ?? 'starter'
  const planStatus  = org?.plan_status ?? 'trialing'

  const statusColor = planStatus === 'active'   ? 'hsl(140,60%,40%)' :
                      planStatus === 'trialing'  ? 'hsl(50,72%,40%)'  :
                      planStatus === 'past_due'  ? 'hsl(4,72%,50%)'   :
                                                   'hsl(24,8%,50%)'

  return (
    <main className="page-main" style={{ flex:1, minWidth:0, overflowY:'auto', background:'hsl(42,30%,97%)' }}>

      {/* Header */}
      <div style={{ background:'#0F1A14', padding:'18px 20px 16px', flexShrink:0 }}>
        <p style={{ fontSize:'0.656rem', color:'hsl(140,7%,48%)', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:'1px' }}>Account</p>
        <h1 style={{ fontSize:'1.167rem', fontWeight:800, color:'hsl(42,22%,84%)', lineHeight:1 }}>Billing</h1>
      </div>

      <div style={{ padding:'16px', display:'flex', flexDirection:'column', gap:'14px', maxWidth:'600px' }}>

        {/* Current plan card */}
        <div style={{ background:'#fff', borderRadius:'18px', border:'1px solid hsl(38,14%,90%)', overflow:'hidden' }}>
          <div style={{ padding:'18px 20px', borderBottom:'1px solid hsl(38,14%,92%)' }}>
            <p style={{ fontSize:'0.6rem', fontWeight:700, color:'hsl(24,8%,60%)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'10px' }}>Current plan</p>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div>
                <p style={{ fontSize:'1.3rem', fontWeight:800, color:'hsl(24,20%,11%)', textTransform:'capitalize', letterSpacing:'-0.01em' }}>
                  {currentPlan}
                  <span style={{ marginLeft:'10px', fontSize:'0.65rem', padding:'3px 10px', borderRadius:'9999px', background: `${statusColor}18`, color:statusColor, fontWeight:700, textTransform:'capitalize', verticalAlign:'middle' }}>
                    {planStatus.replace('_', ' ')}
                  </span>
                </p>
                {org?.trial_ends_at && planStatus === 'trialing' && (
                  <p style={{ fontSize:'0.72rem', color:'hsl(24,8%,52%)', marginTop:'4px' }}>
                    Trial ends {new Date(org.trial_ends_at).toLocaleDateString('en-US', { month:'long', day:'numeric', year:'numeric' })}
                  </p>
                )}
              </div>
              <p style={{ fontSize:'1.4rem', fontWeight:800, color:'hsl(24,20%,11%)' }}>
                ${PLANS.find(p => p.key === currentPlan)?.price ?? 0}
                <span style={{ fontSize:'0.7rem', fontWeight:500, color:'hsl(24,8%,55%)' }}>/mo</span>
              </p>
            </div>
          </div>

          {/* Coming soon notice */}
          <div style={{ padding:'14px 20px', background:'hsl(200,60%,97%)', display:'flex', alignItems:'center', gap:'10px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink:0 }}>
              <circle cx="12" cy="12" r="10" stroke="hsl(200,72%,50%)" strokeWidth="1.8"/>
              <path d="M12 8v4M12 16h.01" stroke="hsl(200,72%,50%)" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
            <p style={{ fontSize:'0.75rem', color:'hsl(200,40%,40%)', lineHeight:1.5 }}>
              <strong>Billing is coming soon.</strong> You&apos;re on a free trial. We&apos;ll notify you before any charges occur.
            </p>
          </div>
        </div>

        {/* Plan comparison */}
        <div style={{ background:'#fff', borderRadius:'18px', border:'1px solid hsl(38,14%,90%)', overflow:'hidden' }}>
          <p style={{ padding:'14px 20px 10px', fontSize:'0.6rem', fontWeight:700, color:'hsl(24,8%,60%)', textTransform:'uppercase', letterSpacing:'0.06em' }}>All plans</p>

          {/* Plan headers */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', borderBottom:'1px solid hsl(38,14%,92%)', padding:'0 20px 12px' }}>
            <div />
            {PLANS.map(plan => (
              <div key={plan.key} style={{ textAlign:'center' }}>
                <p style={{ fontSize:'0.75rem', fontWeight:800, color: plan.key === currentPlan ? plan.color : 'hsl(24,20%,20%)' }}>
                  {plan.name}
                  {plan.key === currentPlan && (
                    <span style={{ marginLeft:'4px', fontSize:'0.55rem', padding:'2px 6px', borderRadius:'9999px', background:`${plan.color}20`, color:plan.color }}>
                      Current
                    </span>
                  )}
                </p>
                <p style={{ fontSize:'0.85rem', fontWeight:800, color:'hsl(24,20%,11%)', marginTop:'2px' }}>
                  ${plan.price}<span style={{ fontSize:'0.6rem', fontWeight:500, color:'hsl(24,8%,55%)' }}>/mo</span>
                </p>
              </div>
            ))}
          </div>

          {/* Feature rows */}
          {FEATURES.map((f, i) => (
            <div key={f.label} style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', padding:'10px 20px', borderBottom: i < FEATURES.length - 1 ? '1px solid hsl(38,14%,94%)' : 'none', alignItems:'center' }}>
              <span style={{ fontSize:'0.72rem', color:'hsl(24,10%,44%)', fontWeight:500 }}>{f.label}</span>
              {f.keys.map((val, j) => (
                <span key={j} style={{ textAlign:'center', fontSize:'0.75rem', fontWeight: val === '✓' ? 700 : 500, color: val === '✓' ? 'hsl(140,60%,40%)' : val === '—' ? 'hsl(24,8%,70%)' : 'hsl(24,20%,20%)' }}>
                  {val}
                </span>
              ))}
            </div>
          ))}

          {/* Upgrade buttons */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', padding:'14px 20px', borderTop:'1px solid hsl(38,14%,92%)', gap:'8px' }}>
            <div />
            {PLANS.map(plan => (
              <div key={plan.key} style={{ display:'flex', justifyContent:'center' }}>
                {plan.key === currentPlan ? (
                  <span style={{ fontSize:'0.65rem', color:'hsl(24,8%,60%)', fontWeight:600 }}>Current</span>
                ) : (
                  <button
                    onClick={() => alert('Billing integration coming soon!')}
                    style={{ padding:'7px 14px', borderRadius:'9999px', background:`${plan.color}18`, color:plan.color, fontWeight:700, fontSize:'0.68rem', border:`1px solid ${plan.color}40`, cursor:'pointer' }}
                  >
                    {PLANS.indexOf(plan) > PLANS.findIndex(p => p.key === currentPlan) ? 'Upgrade' : 'Downgrade'}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Annual discount note */}
        <div style={{ background:'hsl(140,40%,96%)', borderRadius:'14px', border:'1px solid hsl(140,30%,88%)', padding:'14px 18px', display:'flex', alignItems:'center', gap:'10px' }}>
          <span style={{ fontSize:'1.2rem' }}>💰</span>
          <p style={{ fontSize:'0.75rem', color:'hsl(140,30%,30%)', lineHeight:1.5 }}>
            <strong>Save 20%</strong> with annual billing. Starter → $39/mo · Growth → $79/mo · Pro → $159/mo
          </p>
        </div>

        <div style={{ textAlign:'center', padding:'8px', color:'hsl(24,8%,64%)', fontSize:'0.65rem' }}>
          Questions? Contact support@agencyos.app
        </div>
      </div>
    </main>
  )
}
