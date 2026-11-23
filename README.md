# AgencyOS

A mobile-first content planning and workflow app for digital marketing agencies. Agencies plan content calendars, brief and create posts, move work through a pipeline, assign tasks by role, collect client approvals, and track invoices and analytics, all from one place.

Roles: Admin, Content Writer, Designer, Videographer, Video Editor, Poster, Client. Each role sees only the screens it needs.

## Stack

- Next.js 16 (App Router) and TypeScript
- Tailwind CSS 4 with shadcn/ui components
- Supabase (Postgres, Auth, row-level security)
- Resend (transactional email)

Billing is stubbed: the billing routes under `app/api/billing/` and the settings billing screen are placeholders, not wired to a payment provider.

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create the env file and fill in the values:

   ```bash
   cp .env.example .env.local
   ```

   See [Environment variables](#environment-variables).

3. Set up the database. In the Supabase SQL editor, run the files in `supabase/` in this order:

   1. `schema.sql`
   2. `seed.sql` (optional, demo data)
   3. `multi-tenant.sql`
   4. `client-team.sql`
   5. `notifications-and-audit.sql`

4. Start the dev server and open http://localhost:3000:

   ```bash
   npm run dev
   ```

## Environment variables

| Name | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (public) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (public) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server only) |
| `DATABASE_URL` | Direct Postgres connection string (server only) |
| `NEXT_PUBLIC_APP_URL` | Public base URL of the app, used in email links |
| `SUPER_ADMIN_EMAILS` | Comma-separated emails with super admin access |
| `RESEND_API_KEY` | Resend API key |
| `RESEND_FROM_EMAIL` | Sender address for outgoing email |

## Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Start the Next.js dev server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | Run ESLint |

## Project layout

- `app/`: routes and screens (App Router)
- `components/`: shared UI components
- `lib/`: Supabase clients, hooks, types, and helpers
- `supabase/`: SQL schema, migrations, and seed data
- `proxy.ts`: auth and route gating

## Deploying (Vercel)

1. Import the repo in Vercel (or `vercel link` then `vercel --prod`).
2. Add every variable from `.env.example` to the Production environment. Set `NEXT_PUBLIC_APP_URL` to the deployed URL. For a demo or staging deployment also set `NEXT_PUBLIC_NOINDEX=true`.
3. Supabase dashboard, Authentication, URL Configuration: set the Site URL to the deployed URL and add `https://<your-domain>/**` to the redirect URLs.
4. Supabase dashboard, Authentication: turn on "Prevent use of leaked passwords".
5. Apply the SQL files in `supabase/` in the order listed above, then `client-privacy.sql`, `client-feedback-fix.sql`, `assets-storage.sql`, `org-logo.sql`, `client-assets-visibility.sql` and `security-hardening.sql`.
6. Verify a Resend sending domain so invite and welcome emails are delivered.

### Demo accounts

`DEMO_PASSWORD='...' node --env-file=.env.local scripts/seed-demo-users.mjs` sets a known password on the demo org's `@agencyos.app` users and creates `demo.admin@agencyos.app`.

### Before every release

`npm run typecheck && npm run lint && npm run build`
