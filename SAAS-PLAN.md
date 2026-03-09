# AgencyOS → Full-Scale SaaS: Complete Analysis

**Date:** 2026-03-08
**Purpose:** Plan for converting AgencyOS from a single-agency internal tool into a multi-tenant SaaS product sold to multiple agencies on a monthly subscription basis.

---

## Multi-Tenant vs Single-Tenant

**Verdict: Multi-Tenant with Supabase RLS**

| Factor | Single-Tenant | Multi-Tenant (RLS) |
|---|---|---|
| Each agency gets own DB | Yes | No — shared DB, isolated by `org_id` |
| Infra cost | Scales linearly (1 DB per agency) | Flat — 1 DB for all |
| Code complexity | Low per agency, high to manage many | Medium upfront, then simple |
| Data isolation | Perfect | Excellent via RLS (Supabase built for this) |
| Compliance (GDPR etc.) | Easier | Fine for marketing agencies |
| Deploy a new agency | Provision new Supabase project | Insert one row in `organizations` |
| Maintenance | Patch N deployments | Patch 1 codebase |

**Multi-tenant wins for this model.** Digital marketing agencies don't have HIPAA/financial compliance requirements. Supabase RLS was literally designed for this. Single-tenant only makes sense when charging enterprise prices ($1k+/month) and needing dedicated infrastructure per client.

---

## Architecture Changes Required

### 1. Database — Core Multi-Tenancy Layer

**New tables needed:**

```sql
-- The agency that subscribes to the SaaS
organizations (
  id UUID,
  name TEXT,           -- "FreshMint Agency"
  slug TEXT UNIQUE,    -- "freshmint" → freshmint.agencyos.app
  logo_url TEXT,
  plan TEXT,           -- 'starter' | 'growth' | 'pro'
  plan_status TEXT,    -- 'active' | 'trialing' | 'past_due' | 'canceled'
  trial_ends_at TIMESTAMPTZ,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  created_at TIMESTAMPTZ
)

-- The owner/admin of each agency account
organization_members (
  id UUID,
  org_id UUID → organizations.id,
  user_id UUID → auth.users.id,
  role TEXT,           -- 'owner' | 'admin' | 'member'
  invited_by UUID,
  joined_at TIMESTAMPTZ
)

-- Pending invites (email-based onboarding)
invites (
  id UUID,
  org_id UUID,
  email TEXT,
  role TEXT,           -- writer, designer, videographer, editor, poster, client
  token TEXT UNIQUE,   -- secure random token in invite link
  expires_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ
)
```

**Add `org_id` to every existing table:**
```
users, clients, content_pieces, tasks, assets, content_scripts,
ideas, feedback_comments, invoices, salary_records, expenses,
notifications, audit_log, client_team
```

**Update all RLS policies:**
```sql
-- Example: content_pieces
CREATE POLICY "tenant_isolation" ON content_pieces
  USING (org_id = (SELECT org_id FROM users WHERE id = auth.uid()));
```

---

### 2. Auth & Onboarding Flow (New Screens to Build)

| Screen | What it does |
|---|---|
| **Landing page** | Marketing page, pricing, CTA |
| **Sign Up / Create Agency** | Name, agency name, slug → creates `organizations` row |
| **Onboarding wizard** | Add clients → invite team members → done |
| **Accept Invite** | `/invite/[token]` → set password → joins org |
| **Billing / Subscription** | View plan, upgrade, cancel, payment history |
| **Super Admin Dashboard** | Owner's personal view of all agencies, MRR, churn |

---

### 3. Frontend Changes

**Add org context to the app:**
- `useOrg()` hook — reads current org from session
- All Supabase queries pass `org_id` filter (currently none do)
- Subdomain routing: `[slug].agencyos.app` OR `/org/[slug]/` path routing
- Feature gates: check `org.plan` before showing premium screens

**Invite flow:**
- Settings page → "Invite Team Member" → enter email + role → sends invite email
- `/invite/[token]` page → accepts invite → creates Supabase auth user + `users` row

---

### 4. Billing — Stripe Integration

**New Next.js API routes needed:**
```
/api/billing/create-checkout     → creates Stripe checkout session
/api/billing/portal              → opens Stripe customer portal (manage subscription)
/api/billing/webhook             → handles Stripe events:
                                   - subscription.created
                                   - subscription.updated
                                   - subscription.deleted
                                   - invoice.payment_failed
```

**Feature gates per plan:**

| Feature | Starter | Growth | Pro |
|---|---|---|---|
| Team members | 5 | 15 | Unlimited |
| Clients | 3 | 15 | Unlimited |
| Asset storage | 5GB | 25GB | 100GB |
| Analytics | Basic | Full | Full + Export |
| Audit log | No | Yes | Yes |
| Client portal | No | Yes | Yes |
| Custom domain | No | No | Yes |

---

### 5. Infrastructure for Production

| Service | Purpose | Cost |
|---|---|---|
| **Vercel Pro** | Hosting + subdomain wildcards (`*.agencyos.app`) | $20/mo |
| **Supabase Pro** | Enough DB, storage, auth for multi-tenant | $25/mo |
| **Stripe** | Subscriptions + billing | 2.9% + 30¢/txn |
| **Resend** | Invite emails, notifications | $0 (free tier covers ~100/day) |
| **Cloudflare** | Domain + DNS + DDoS protection | $0–10/mo |
| **Sentry** | Error tracking | $0 (free tier) |

**Total infra cost: ~$45–60/month** regardless of how many agencies (up to ~50 agencies on these tiers). Scales gracefully after that.

---

## Suggested SaaS Pricing Plans

### Starter — $49/month
- 1 agency, 5 team members, 3 clients
- Content calendar, pipeline, tasks
- Basic notifications
- Email support
- *Target: solo freelancers, micro agencies*

### Growth — $99/month
- 15 team members, 15 clients
- Full analytics + audit log
- Client portal + approval flow
- Priority email support
- *Target: small/mid agencies (5–20 person teams)*

### Agency Pro — $199/month
- Unlimited team members + clients
- 100GB asset storage
- Custom subdomain
- White-label client portal
- Phone/chat support
- *Target: established agencies, 20+ clients*

### Annual discount: 20% off
- Starter → $39/mo ($468/yr)
- Growth → $79/mo ($948/yr)
- Pro → $159/mo ($1,908/yr)

---

## Break-Even Analysis

| Customers | Plan | Monthly Revenue | Infra Cost | Profit |
|---|---|---|---|---|
| 1 | Growth | $99 | $55 | $44 |
| 5 | Growth | $495 | $55 | $440 |
| 10 | Mix | ~$1,200 | $55 | ~$1,145 |
| 25 | Mix | ~$3,500 | $80 | ~$3,420 |

Break-even at **1 Growth customer.**

---

## Prioritized Build Order

### Phase 1 — Make it sellable (4–6 weeks)
1. Add `organizations` table + `org_id` to all existing tables
2. Update all RLS policies for tenant isolation
3. Sign-up flow + agency creation wizard
4. Invite team members flow (email via Resend)
5. Stripe billing + webhook handler
6. Plan feature gates (enforce member/client limits)

### Phase 2 — Growth features (2–3 weeks)
7. Landing / marketing page
8. Subdomain routing per agency (`[slug].agencyos.app`)
9. Super admin dashboard (view of all customers, MRR, plan breakdown)
10. Billing settings page inside the app

### Phase 3 — Retention & Expansion (ongoing)
11. In-app usage analytics (show agencies their own productivity stats)
12. Automated onboarding emails (Day 1, Day 3, Day 7 sequences)
13. Social media API integration (Instagram, TikTok publish)
14. AI caption/brief suggestions (Claude API)
15. White-label client portal (custom agency branding)

---

## What Does NOT Need to Change

The current codebase is ~80% ready for a single-agency deployment. The core app logic, UI, and pipeline are solid and fully reusable across all tenants. The missing 20% for SaaS is additive, not a rewrite:

- All 15 screens stay as-is
- All Supabase queries just need an `org_id` filter added
- All RLS policies need a tenant clause added
- No UI redesign required

---

## Summary

Convert to **multi-tenant** using Supabase RLS. Add `org_id` to all tables. Build sign-up, invite, and Stripe billing flows. Gate features per plan. Launch at **$49 / $99 / $199** tiers. Infrastructure costs ~$55/month — break-even at 1 paying customer.
