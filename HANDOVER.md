# AgencyOS — Developer Handover

**Last updated:** 2026-03-09
**Status:** Multi-tenant SaaS foundation complete. Billing stubs in place. Ready for Stripe wiring + deployment.

---

## Project Summary

AgencyOS is a **multi-tenant SaaS** content planning and workflow management app for digital marketing agencies. Multiple agencies can sign up independently — each gets a fully isolated workspace.

- **UI:** 100% complete (15 screens + extras)
- **Backend:** Supabase (auth + PostgreSQL + RLS + Realtime) — all pages on real data
- **Multi-tenancy:** Complete — `org_id` on all tables, RLS scoped per org, signup/invite/onboarding flows built
- **Billing:** Stubs in place — needs Stripe wired up
- **Email:** Resend integrated for invite + welcome emails

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 16 App Router |
| Styling | Inline `style={}` (existing pages) + Tailwind CSS (new components) |
| Language | TypeScript (strict) |
| Backend | Supabase (Auth + PostgreSQL + RLS + Realtime) |
| Email | Resend (`/api/invite/send`, `/api/create-user`) |
| Animations | GSAP + @gsap/react |
| Deployment | Vercel (not yet deployed) |

> **Next.js 16 note:** Middleware is named `proxy.ts` (not `middleware.ts`) and exports a named function `proxy` (not `middleware`).

---

## Supabase Project

- **URL:** `https://ajjrhoimjyorhikggzic.supabase.co`
- **Keys:** In `.env.local` — never commit this file
- **DB password:** `9XDjZAvVIczIR6Zr`

### SQL Files — Run Order

| File | Status | Notes |
|------|--------|-------|
| `supabase/schema.sql` | ✅ Run | Full schema + RLS |
| `supabase/seed.sql` | ✅ Run | Demo data |
| `supabase/client-team.sql` | ✅ Run | `client_team` table |
| `supabase/notifications-and-audit.sql` | ⚠️ PENDING | Audit log + triggers + Realtime — run this before testing notifications |
| `supabase/multi-tenant.sql` | ✅ Run | Adds `organizations` + `invites` tables, adds `org_id` to all tables, updates all RLS policies, adds `get_my_org_id()` function, backfills demo data |

### Demo Org
- **Name:** Demo Agency | **Slug:** `demo-agency` | **Plan:** `pro`
- **UUID:** `00000000-0000-0000-0000-000000000001`

### Demo Auth Accounts (password: `AgencyOS2026!`)

| Email | Name | Role |
|-------|------|------|
| admin@agencyos.app | Sarah Malik | admin |
| writer@agencyos.app | Omar Farooq | writer |
| designer@agencyos.app | Zara Ahmed | designer |
| videographer@agencyos.app | Bilal Chaudhry | videographer |
| editor@agencyos.app | Nadia Khan | editor |
| poster@agencyos.app | Hamza Siddiqui | poster |
| client@agencyos.app | Fitness First PK | client |

---

## Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://ajjrhoimjyorhikggzic.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
DATABASE_URL=postgresql://...

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000   # change to https://yourdomain.com in prod

# Super admin (comma-separated emails that can access /superadmin)
SUPER_ADMIN_EMAILS=you@yourdomain.com

# Resend email
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=noreply@yourdomain.com    # must be on a Resend-verified domain

# Billing (add when Stripe is wired)
# STRIPE_SECRET_KEY=sk_...
# STRIPE_WEBHOOK_SECRET=whsec_...
# BILLING_WEBHOOK_SECRET=...
```

---

## Database Schema

### All Tables

```
organizations     — each agency's account (plan, billing, slug)
invites           — pending invite tokens (email-based onboarding)
users             — team members + clients (linked to auth.users by id)
clients           — client accounts within an org
client_users      — maps client-role users to their client
content_pieces    — content items (briefs, posts, reels, stories)
tasks             — individual tasks assigned to team members
assets            — file/media assets
content_scripts   — scripts linked to content pieces
ideas             — ideas board
feedback_comments — client feedback on content
invoices          — client invoices
salary_records    — team payroll
expenses          — agency expenses
notifications     — in-app notification queue
audit_log         — immutable audit trail (triggers write here)
client_team       — default assignee per role per client
```

All tables (except `organizations` and `invites`) have an `org_id UUID` column. All RLS policies scope queries to the authenticated user's org via `get_my_org_id()`.

### Key Column Conventions

- `clients.id` → `TEXT` (not UUID) — important for joins
- `users.id` → `UUID`
- `content_pieces.id` → `TEXT`
- `tasks.assigned_to` → `UUID` (single user)
- `content_pieces.assigned_to` → `TEXT[]` (array of user IDs as strings)
- `client_team`: `client_id TEXT`, `role TEXT`, `user_id UUID`
- DATE columns return `"YYYY-MM-DD"` strings → use `new Date(s + 'T00:00:00')` to avoid timezone shift

### Important SQL Functions

```sql
-- Returns the org_id of the currently authenticated user (SECURITY DEFINER — bypasses RLS)
get_my_org_id() → UUID
```

Used in all RLS policies. Never remove.

---

## File Structure

```
app/
  (shell)/                  # Authenticated shell (requires login)
    layout.tsx              # OrgProvider + user profile + realtime badge + PillNav
    dashboard/              # Admin dashboard
    calendar/               # Content calendar (month/week/day)
    planning/               # Monthly planning + quota view
    pipeline/               # Kanban pipeline
    tasks/                  # Task board (done → advances pipeline)
    tasks/upcoming/         # Upcoming tasks
    tasks/done/             # Completed tasks
    ideas/                  # Ideas board
    finance/                # Invoices + payroll + expenses
    team/                   # Team management + workload
    clients/                # Client management (master-detail, Team tab)
    brief/[id]/             # Content brief editor
    notifications/          # Notification center (Realtime)
    audit/                  # Audit log viewer (admin only)
    assets/                 # Asset library
    analytics/              # Analytics
    settings/               # 4 tabs: Profile | Organisation | Team | Billing
    settings/billing/       # Plan comparison + upgrade placeholders
    client/                 # Client portal (role-aware)
    client/calendar/        # Client calendar
    client/notes/           # Client feedback notes
    client/approval/[id]/   # Content approval screen

  api/
    auth/signup/            # POST — create org + admin user (public route)
    auth/callback/          # Supabase auth callback
    create-user/            # POST — create team/client user directly (sets org_id, sends welcome email)
    invite/send/            # POST — create invite row + send Resend email
    invite/[token]/         # GET  — validate token, return public invite info
    invite/accept/          # POST — create auth user + users row from invite token
    billing/create-checkout/ # POST — STUB (501) — wire Stripe here
    billing/portal/         # POST — STUB (501) — wire Stripe here
    billing/webhook/        # POST — STUB — verifies BILLING_WEBHOOK_SECRET, logs event

  signup/                   # Agency signup page (public)
  onboarding/               # 3-step wizard after signup (public)
  invite/[token]/           # Accept invite page (public)
  login/                    # Login page (public)
  superadmin/               # Super admin platform overview (server component, outside shell)
  page.tsx                  # Root redirect → /dashboard

components/
  shell/
    PillNav.tsx             # MobilePillNav + DesktopSidebar (org name + plan badge)
    TopBar.tsx              # Page top bar
  CreateUserModal.tsx       # Create login for team member or client (sends welcome email)
  AddClientModal.tsx        # Add new client (sets org_id from useOrg())

lib/
  supabase/
    client.ts               # Browser Supabase client
    server.ts               # createClient() (SSR) + createAdminClient() (service role, NOT SSR)
    useUser.ts              # Hook: auth user → public.users profile (includes org_id)
    OrgContext.tsx          # OrgProvider + useOrg() hook
  hooks/
    usePlanGate.ts          # usePlanGate(feature) → { allowed, requiredPlan, plan }
  types.ts                  # All shared types (OrgPlan, Organization, Invite, PLAN_LIMITS, etc.)
  utils.ts                  # getInitials, getAvatarColor, etc.

proxy.ts                    # Next.js 16 middleware (auth guard + superadmin gate)
supabase/
  schema.sql                # Full DB schema
  seed.sql                  # Demo data
  client-team.sql           # client_team table
  notifications-and-audit.sql  # Audit log + triggers + Realtime (⚠️ PENDING RUN)
  multi-tenant.sql          # Multi-tenancy migration (✅ run)
  reset.sql                 # Wipe all data (for testing — includes organizations + invites)
```

---

## Multi-Tenancy Architecture

### How isolation works

Every table has `org_id UUID`. All RLS policies follow this pattern:

```sql
CREATE POLICY "org_isolation" ON some_table
  USING (org_id = get_my_org_id());
```

`get_my_org_id()` is a `SECURITY DEFINER` function that reads `org_id` from `public.users` for the current `auth.uid()`. It bypasses RLS itself to avoid circular dependency.

### OrgContext in React

```tsx
// In any shell page:
import { useOrg } from '@/lib/supabase/OrgContext'

const { org } = useOrg()
// org.id, org.name, org.slug, org.plan, org.plan_status
```

`OrgProvider` wraps the entire shell in `app/(shell)/layout.tsx`.

### Plan gating

```tsx
import { usePlanGate } from '@/lib/hooks/usePlanGate'

const { allowed, requiredPlan } = usePlanGate('audit_log')
// PLAN_LIMITS defined in lib/types.ts
```

### Important: createAdminClient

`createAdminClient()` in `lib/supabase/server.ts` uses `createClient` from `@supabase/supabase-js` (NOT `@supabase/ssr`). This is required for `auth.admin.*` operations. It is **synchronous** — do not `await` it.

```ts
const supabase = createAdminClient()           // ✅ correct
const supabase = await createAdminClient()     // ❌ wrong — no await needed
```

---

## User Flows

### New agency signup
1. `/signup` → fills name, email, password, agency name, slug
2. `POST /api/auth/signup` → creates `organizations` row + auth user + `users` row (role: admin)
3. Signs in immediately → redirects to `/onboarding`
4. `/onboarding` → 3 steps: Welcome → Add first client → Invite first team member

### Invite team member
1. Admin goes to `/settings` → Team tab → clicks "Invite"
2. Modal sends `POST /api/invite/send` → creates `invites` row → Resend email with link
3. Invitee clicks link → `/invite/[token]` → fills name + password → `POST /api/invite/accept`
4. Creates auth user + `users` row (with correct `org_id`)

### Create user directly (Team page / Clients page)
1. Admin clicks "+ Add Member" or "Create Login" on a client
2. `CreateUserModal` → `POST /api/create-user`
3. Creates auth user + `users` row with `org_id` from admin's session
4. Sends Resend welcome email with credentials

### Super admin
- Visit `/superadmin` while signed in with an email in `SUPER_ADMIN_EMAILS`
- Server component — reads all orgs via `createAdminClient()`
- Shows all agencies, member counts, plan status

---

## Proxy (Middleware)

`proxy.ts` runs on every request. Key rules:

| Path | Auth required? |
|------|---------------|
| `/`, `/login`, `/signup`, `/onboarding` | No |
| `/invite/*` | No |
| `/api/auth/*` | No |
| `/api/invite/*` | No |
| `/api/billing/webhook` | No (verified by signature) |
| Everything else | Yes → redirects to `/login` |
| `/superadmin` | Yes + email must be in `SUPER_ADMIN_EMAILS` |
| `/login`, `/signup` while logged in | Redirects to `/dashboard` |

---

## Email (Resend)

Two routes send email:

| Route | Trigger | Template |
|-------|---------|----------|
| `POST /api/invite/send` | Admin invites someone | Invite link with token |
| `POST /api/create-user` | Admin creates user directly | Welcome email with credentials |

**Requirements:**
- `RESEND_API_KEY` must be set
- `RESEND_FROM_EMAIL` must be an address on a **Resend-verified domain** (not Gmail)
- If Resend fails in `/api/create-user`, the user is still created (email is best-effort)
- If Resend fails in `/api/invite/send`, the route returns 502 (no invite sent)

---

## Billing (Stubs — Needs Stripe)

Three routes exist as stubs:

| Route | Status | What to implement |
|-------|--------|-------------------|
| `POST /api/billing/create-checkout` | 501 stub | Create Stripe Checkout session → return URL |
| `POST /api/billing/portal` | 501 stub | Create Stripe Customer Portal session → return URL |
| `POST /api/billing/webhook` | Placeholder | Handle `subscription.*`, `invoice.payment_failed`, `customer.created` |

When Stripe is wired:
1. Add `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` to env
2. Replace stubs in `/api/billing/create-checkout` and `/api/billing/portal`
3. Add signature verification + event handlers in `/api/billing/webhook`
4. Update `organizations.plan`, `plan_status`, `stripe_customer_id`, `stripe_subscription_id` from webhook events

---

## Mobile UI Notes

- Pill nav is `fixed bottom-5` — all scroll containers have `paddingBottom: 100px` (mobile only via `.page-main` CSS class in `globals.css`)
- `clients/page.tsx` — master-detail layout: on mobile (`< 768px`) the list panel hides completely when a client is selected (CSS classes `clients-layout`, `has-detail`, `clients-list-panel`, `clients-detail-panel`)
- `pipeline/page.tsx` — horizontal snap scroll on mobile, each column has `paddingBottom: 100px`

---

## Shell Navigation

```
admin:   Home, Calendar, Planning, Pipeline, Ideas | Team, Clients | Finance, Alerts | Audit
staff:   Today, Upcoming, Done | Calendar, Ideas, Alerts
client:  This Week, Calendar, Notes, Alerts
```

`NAV_BY_ROLE` is defined in `lib/types.ts`. To add a new nav item:
1. Add the icon name to the union in `lib/types.ts`
2. Add the SVG case in `components/shell/PillNav.tsx` (`NavIcon` component)

---

## Key Coding Patterns

```ts
// All shell pages are 'use client' — use browser client
import { createClient } from '@/lib/supabase/client'

// Server-side / API routes — session-aware client
import { createClient } from '@/lib/supabase/server'   // await createClient()

// Admin operations (auth.admin.*, bypasses RLS)
import { createAdminClient } from '@/lib/supabase/server'
const supabase = createAdminClient()  // no await

// Normalize nested Supabase join (may return object or single-item array)
const obj = Array.isArray(r.client) ? r.client[0] ?? null : r.client

// Optimistic update pattern
setState(prev => prev.map(i => i.id === id ? { ...i, status: 'done' } : i))
await supabase.from('tasks').update({ status: 'done' }).eq('id', id)

// DATE string → local Date (no timezone shift)
new Date(row.due_date + 'T00:00:00')

// Realtime cleanup
const channel = supabase.channel('name').on('postgres_changes', {...}, handler).subscribe()
return () => { channel.unsubscribe() }

// Never use CSS custom properties in style={{}} — use literal HSL/hex
style={{ color: 'hsl(25,82%,60%)' }}   // ✅
style={{ color: 'var(--color-brand)' }} // ❌ won't work in React inline styles
```

---

## What's Done

- [x] All 15 screens + extras (UI complete)
- [x] All pages wired to Supabase (real data)
- [x] Notification system (Realtime live badge + toast + per-item mark-read)
- [x] Audit log (`/audit` page, SECURITY DEFINER triggers)
- [x] Pipeline auto-advancement (task done → content status advances)
- [x] Client team assignments (default assignee per role per client)
- [x] Multi-tenancy foundation (`org_id` on all tables, RLS updated)
- [x] Signup + onboarding flow
- [x] Invite flow (token-based, Resend email)
- [x] `/superadmin` platform overview
- [x] Settings page (Profile / Organisation / Team / Billing tabs)
- [x] `usePlanGate` feature gating hook
- [x] `/api/create-user` sets `org_id` + sends welcome email
- [x] Mobile pill nav clearance (100px padding on all scroll containers)
- [x] Mobile clients master-detail (list hides when detail opens)

---

## What's Left

### Before launch (required)
- [ ] **Run `supabase/notifications-and-audit.sql`** in Supabase SQL Editor
- [ ] **Wire Stripe billing** — replace stubs in `/api/billing/` routes
- [ ] **Deploy to Vercel** — push to GitHub, add all env vars
- [ ] **Fix any `org_id = null` users** from before multi-tenancy was added:
  ```sql
  UPDATE users SET org_id = (SELECT id FROM organizations LIMIT 1) WHERE org_id IS NULL;
  ```

### High priority
- [ ] **Enforce plan limits** — use `usePlanGate` on team/client creation (show upgrade modal when limit hit)
- [ ] **Subdomain routing** — `[slug].agencyos.app` per agency (Vercel wildcard domain)

### Medium priority
- [ ] **Google Drive integration** — asset upload/storage
- [ ] **Automated onboarding emails** — Day 1 / Day 3 / Day 7 sequence via Resend

### Future
- [ ] AI caption/brief generator (Claude API)
- [ ] Social media posting (Instagram, TikTok APIs)
- [ ] White-label client portal (custom agency branding)

---

## Known Gotchas

- **Supabase free tier pauses** after ~1 week inactivity — restore from dashboard if you get `ENOTFOUND` errors
- **`notifications-and-audit.sql` must be run** for the notification/audit features to work
- `content_pieces.assigned_to` is `TEXT[]` not UUID[] — use `.includes(userId)` not `.eq()`
- Nested Supabase joins may return object or array — always normalize (see pattern above)
- `createAdminClient()` is synchronous — never `await` it
- Resend `RESEND_FROM_EMAIL` must be on a verified domain — Gmail addresses won't work
- In Next.js 16, middleware is `proxy.ts` exporting a named `proxy` function — not `middleware.ts`
