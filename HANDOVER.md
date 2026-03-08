# AgencyOS — Developer Handover

**Last updated:** 2026-03-08
**Purpose:** Full project context for resuming in a new chat session.

---

## Project Summary

AgencyOS is a mobile-first content planning and workflow management app for digital marketing agencies. Built with Next.js App Router + Tailwind CSS + TypeScript + Supabase.

- **UI:** 100% complete (15 screens + extras)
- **Backend:** Supabase (auth + DB + RLS) — fully wired to all main pages
- **Status:** Feature-complete for v1.0. Notification system + audit log built. Ready to deploy.

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 14 App Router |
| Styling | Inline `style={}` (existing pages) + Tailwind CSS (new components) |
| Language | TypeScript (strict) |
| Backend | Supabase (Auth + PostgreSQL + RLS + Realtime) |
| Animations | GSAP + @gsap/react |
| Deployment | Vercel (not yet deployed) |

---

## Supabase Project

- **URL:** `https://ajjrhoimjyorhikggzic.supabase.co`
- **Keys:** In `.env.local` (never commit this file)
- **DB password:** `9XDjZAvVIczIR6Zr`
- **Schema:** `supabase/schema.sql` — already run
- **Seed:** `supabase/seed.sql` — already run (demo data)

### SQL Files (run order matters)

| File | Status | Notes |
|------|--------|-------|
| `supabase/schema.sql` | ✅ Run | Full schema + RLS |
| `supabase/seed.sql` | ✅ Run | Demo data |
| `supabase/client-team.sql` | ✅ Run | `client_team` table (client↔role↔user mapping) |
| `supabase/notifications-and-audit.sql` | ⚠️ NEEDS TO BE RUN | Audit log + all triggers + Realtime enable |

> **IMPORTANT:** Run `supabase/notifications-and-audit.sql` in Supabase SQL Editor before testing notifications.

### Demo Auth Accounts (password: `AgencyOS2026!`)

| Email | Name | Role | UUID |
|-------|------|------|------|
| admin@agencyos.app | Sarah Malik | admin | 48f5c1f8-7eaa-4a2d-bfdf-00cb85f33bf3 |
| writer@agencyos.app | Omar Farooq | writer | bea5f187-a3e1-4926-9ff4-b7d19ab6f157 |
| designer@agencyos.app | Zara Ahmed | designer | d792d016-1f2d-45ab-a6ac-3452399a344a |
| videographer@agencyos.app | Bilal Chaudhry | videographer | 5b909891-35a8-4cbf-bd53-c2df8c311aed |
| editor@agencyos.app | Nadia Khan | editor | 2025a9cc-256b-4886-ac54-6f31a82df451 |
| poster@agencyos.app | Hamza Siddiqui | poster | d266274a-a556-4991-9c17-ae9fe5b6b471 |
| client@agencyos.app | Fitness First PK | client | 17682a3a-b0fb-424f-8553-8334a88baf29 |

---

## DB Tables

```
users, clients, client_users, content_pieces, tasks, assets,
content_scripts, ideas, feedback_comments, invoices,
salary_records, expenses, notifications, audit_log, client_team
```

### Key column conventions
- All snake_case: `due_date`, `client_id`, `assigned_to`, `brand_color`, `avatar_color`
- `content_pieces.assigned_to` → `TEXT[]` (array of user IDs as strings)
- `tasks.assigned_to` → `UUID` (single user)
- `clients.id` → `TEXT` (not UUID — important for joins)
- `users.id` → `UUID`
- DATE columns return `"YYYY-MM-DD"` strings — use `new Date(s + 'T00:00:00')` to avoid timezone shift
- TIMESTAMPTZ returns ISO string — use `new Date(isoString)` directly

### client_team table
```sql
-- Maps one default assignee per role per client
client_id TEXT REFERENCES clients(id)
role      TEXT  -- writer | designer | videographer | editor | poster
user_id   UUID REFERENCES users(id)
UNIQUE(client_id, role)
```
Used by: `/clients` (Team tab), `/pipeline` (stage-responsible person), `/brief/[id]` (auto-task creation), DB triggers (smart notifications)

---

## Project File Structure

```
app/
  (shell)/              # Authenticated shell layout
    layout.tsx          # Shell layout — reads user profile, mounts nav, Realtime badge
    dashboard/          # Admin dashboard
    calendar/           # Content calendar (month/week/day views)
    planning/           # Monthly planning + quota view
    pipeline/           # Kanban pipeline (stage-responsible person, reassign)
    tasks/              # Employee task board (marks done → advances pipeline status)
    ideas/              # Ideas board
    finance/            # Invoices + payroll + expenses
    team/               # Team management + workload
    clients/            # Client management (Team tab, content quota, edit)
    brief/[id]/         # Content brief (create → auto-tasks from client_team)
    notifications/      # Notification center (Realtime live updates + toast + mark-read)
    audit/              # Audit log viewer (admin only) — NEW
    assets/             # Asset library
    analytics/          # Analytics
    settings/           # Account settings + logout
    client/             # Client portal (role-aware)
      page.tsx          # Client portal home
      calendar/         # Client calendar (month/week/day views) — improved
      notes/            # Client feedback notes
      approval/[id]/    # Content approval screen
  api/
    create-user/        # POST — create auth user + public.users + client_users
  auth/
    callback/           # Supabase auth callback handler
  login/                # Login page
  page.tsx              # Root redirect → /dashboard

components/
  shell/
    PillNav.tsx         # MobilePillNav + DesktopSidebar (audit icon added)
  CreateUserModal.tsx   # Reusable modal: create login for client or team member
  AddClientModal.tsx    # Modal: add new client to DB

lib/
  supabase/
    client.ts           # Browser Supabase client
    server.ts           # Server client + createAdminClient() (service role)
    useUser.ts          # Hook: auth.getUser() → public.users profile
  types.ts              # All shared types — NavItem icon union now includes 'audit'
  mock/
    data.ts             # Unused — all pages now on real data

middleware.ts           # Auth session refresh + role-aware redirect
supabase/
  schema.sql            # Full DB schema (run once)
  seed.sql              # Demo data with real UUIDs (run once)
  client-team.sql       # client_team table (run once, after schema.sql)
  notifications-and-audit.sql  # Audit log + triggers + Realtime (PENDING RUN)
```

---

## Pages Wired to Supabase (Real Data)

| Page | Data Sources | Mutations |
|------|-------------|-----------|
| `/dashboard` | content_pieces, clients, users, notifications | — |
| `/tasks` | tasks + content + client joins | status update → advances content pipeline |
| `/pipeline` | content_pieces + client + client_team | card move, stage-person reassign |
| `/calendar` | content_pieces by date range | — |
| `/planning` | clients (quotas) + content_pieces by month | navigates to /brief/new |
| `/ideas` | ideas + client + author joins | insert, shortlist, convert |
| `/finance` | invoices, salary_records, expenses, clients, users | mark paid, insert invoice/expense/payroll |
| `/team` | users, tasks, content_pieces, clients | role/salary/active update, add member |
| `/clients` | clients, invoices, content_pieces, feedback_comments, client_team, users | mark paid, edit client, quota, team assign |
| `/brief/[id]` | content_pieces, content_scripts, feedback_comments | full save, auto-task creation, comments |
| `/notifications` | notifications | mark read (per-item ✓ button + mark all), Realtime live |
| `/audit` | audit_log + actor join | filter by table/action, paginated, diff view |
| `/client` | content_pieces for client | role-aware client lookup |
| `/client/approval/[id]` | content_piece + client + users | approve or revision |
| `/client/calendar` | content_pieces by month/week/day | role-aware, 3-view tabs |
| `/client/notes` | feedback_comments via content_pieces | markResolved, sendReply |
| `/settings` | users profile | logout |
| `/assets` | assets + client + user joins | filter by type/client, grid/list |
| `/analytics` | content_pieces, clients, users, tasks | period filter |

---

## Notification System (built, SQL pending)

### How it works
- **Delivery:** Supabase Realtime streams DB inserts to subscribed clients via websocket
- **Generation:** PostgreSQL SECURITY DEFINER triggers insert notification rows on events
- **RLS:** Users only receive notifications matching `for_user_id = auth.uid()` OR `get_my_role() = ANY(for_roles)`

### Trigger → Notification map

| Trigger | Event | Who gets notified |
|---------|-------|-------------------|
| `trg_task_inserted` | Task assigned | Assigned user (`for_user_id`) |
| `trg_content_updated` | Status → `client-review` | All client_users for that client |
| `trg_content_updated` | Status → `approved` | Admin role broadcast |
| `trg_content_updated` | Status → `brief-ready` | Writer from client_team |
| `trg_content_updated` | Status → `in-design` | Designer or Videographer from client_team |
| `trg_content_updated` | Status → `in-editing` | Editor from client_team |
| `trg_content_updated` | Status → `ready-for-review` | Poster from client_team |
| `trg_feedback_inserted` | Client posts feedback | Admin role broadcast |

### Audit log
- Every INSERT/UPDATE on content_pieces, tasks, invoices, feedback_comments → row in `audit_log`
- Stores: table_name, record_id, action, actor_id, old_data (JSONB), new_data (JSONB), created_at
- Viewable at `/audit` (admin only) — filterable by table + action, paginated, click to see diff

### Realtime in code
```ts
// layout.tsx — badge updates live
supabase.channel('notif-badge')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => fetchNotifCount())
  .subscribe()

// notifications/page.tsx — live prepend + toast
supabase.channel('notif-page')
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload) => {
    setNotifs(prev => [payload.new, ...prev])
    showToast(payload.new.title)
  })
  .subscribe()
```

---

## Pipeline Advancement (auto)

When a team member marks a task `done`, the linked content piece's status advances:

| Task role | Content status advances to |
|-----------|--------------------------|
| writer | `brief-ready` |
| designer | `in-editing` |
| videographer | `in-editing` |
| editor | `ready-for-review` |
| poster | `posted` |

Logic in `app/(shell)/tasks/page.tsx` → `updateStatus()`. Only advances forward (no regression).

---

## Auth & User Flow

### Login flow
1. User enters email + password on `/login`
2. `supabase.auth.signInWithPassword()`
3. Middleware reads `user.user_metadata.role`:
   - `'client'` → redirect to `/client`
   - Everyone else → redirect to `/dashboard`
4. Shell layout reads `public.users` for name, initials, role, avatar_color

### Creating new users (Admin only)

**Via the app:** Team page → "+ Add Member" or Clients page → client → Overview → "Create Login"

**`POST /api/create-user` body:**
```json
{
  "email": "user@example.com",
  "password": "Password123!",
  "name": "Full Name",
  "role": "writer",
  "clientId": "optional-for-client-role"
}
```

**Via SQL (manual fallback):**
```sql
SELECT id FROM auth.users WHERE email = 'x@example.com';
INSERT INTO users (id, name, initials, role, email, avatar_color, active)
VALUES ('UUID', 'Name', 'NN', 'writer', 'email', 'hsl(25,82%,60%)', true);
-- For client role also:
INSERT INTO client_users (user_id, client_id) VALUES ('UUID', 'CLIENT-UUID');
```

---

## Key Patterns

```ts
// All pages are 'use client' — use browser client
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/supabase/useUser'

// Normalize nested join (may be object or array)
const obj = Array.isArray(r.client) ? r.client[0] ?? null : r.client

// Optimistic update pattern
setState(prev => prev.map(i => i.id === id ? { ...i, status: 'done' } : i))
await supabase.from('tasks').update({ status: 'done' }).eq('id', id)

// DATE string → local Date (no timezone shift)
new Date(row.due_date + 'T00:00:00')

// Supabase Realtime cleanup pattern
const channel = supabase.channel('name').on('postgres_changes', {...}, handler).subscribe()
return () => { channel.unsubscribe() }
```

---

## Shell Navigation

```
admin:   Home, Calendar, Planning, Pipeline, Ideas | Team, Clients | Finance, Alerts | Audit
staff:   Today, Upcoming, Done | Calendar, Ideas, Alerts
client:  This Week, Calendar, Notes, Alerts
```

**NavItem icon union** (add new icons to both `lib/types.ts` AND `components/shell/PillNav.tsx`):
```
'home'|'calendar'|'planning'|'pipeline'|'team'|'tasks'|'upcoming'|
'done'|'week'|'notes'|'notifications'|'ideas'|'finance'|'clients'|'audit'
```

---

## Design System

| Token | Value |
|-------|-------|
| Background | `hsl(42,30%,97%)` warm cream |
| Brand accent | `hsl(25,82%,60%)` warm amber |
| Dark sidebar | `#0F1A14` |
| Success | `hsl(154,50%,40%)` |
| Error/Overdue | `hsl(4,72%,50%)` |
| Font | Plus Jakarta Sans |

**Content type colors:**
| Type | Color |
|------|-------|
| Graphic | `hsl(14,72%,62%)` coral |
| Video | `hsl(40,95%,52%)` yellow |
| Reel | `hsl(161,58%,44%)` mint |
| Story | `hsl(268,60%,68%)` lavender |

**Rules:**
- Never use CSS custom properties in `style={}` — literal HSL/hex only
- Run `npx tsc --noEmit` after every change
- Mobile-first: 375px base, `md:` breakpoint for desktop

---

## Deployment (Not Done Yet)

**Steps:**
1. Push repo to GitHub
2. Import on vercel.com → select repo
3. Add env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
4. Deploy

---

## What's Left To Build (Priority Order)

### Must do before launch
- [ ] **Run `supabase/notifications-and-audit.sql`** in Supabase SQL Editor
- [ ] **Deploy to Vercel** — push to GitHub, connect Vercel, add env vars
- [ ] **Wipe seed data** — delete demo records, enter real client/team data

### High Priority
- [ ] **Wire `/assets` page** to real Supabase data (file upload + Drive integration)
- [ ] **Wire `/analytics` page** to real Supabase data

### Medium Priority
- [ ] **Google Drive integration** — asset upload/storage
- [ ] **Resend email** — invite emails on user creation, approval notifications

### Low Priority / Future
- [ ] **AI caption generator** — Claude API to generate captions from brief
- [ ] **Social media API posting** — direct post to Instagram/TikTok
- [ ] **Analytics auto-pull** — pull real engagement data from platform APIs
- [ ] **Billing / subscription** — for selling AgencyOS to other agencies

---

## Known Issues / Notes

- `notifications-and-audit.sql` must be run before the notification/audit features work end-to-end
- `content_pieces.assigned_to` is `TEXT[]` not UUID[] — use `.includes(userId)` not `.eq()`
- Nested Supabase joins may return object or array — always normalize
- Supabase free tier projects **pause after ~1 week of inactivity** — restore from dashboard if you get `ENOTFOUND` errors
- Mobile floating avatar in `layout.tsx` is commented out — mobile settings need a different UX approach
- `client_team` RLS: no policy yet — add one if you get permission errors querying it from client pages
