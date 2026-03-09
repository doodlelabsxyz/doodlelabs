-- ============================================================
-- AgencyOS — Dummy Data: Extra Team Members + Clients
-- Run this in Supabase SQL Editor (service role required for auth.users)
-- Run AFTER schema.sql and seed.sql
-- ============================================================
-- All dummy accounts use password: AgencyOS2026!
-- ============================================================

-- ─── FIXED UUIDs for easy cleanup ─────────────────────────────────────────────
-- Writers  : aa000001-0000-0000-0000-00000000000{1,2,3}
-- Designers: aa000002-0000-0000-0000-00000000000{1,2}
-- Videographers: aa000003-0000-0000-0000-00000000000{1,2}
-- Editors  : aa000004-0000-0000-0000-00000000000{1,2}
-- Posters  : aa000005-0000-0000-0000-00000000000{1,2}
-- Clients (portal users): aa000006-0000-0000-0000-00000000000{1,2,3}
-- Client companies: cl-4 through cl-8
-- ──────────────────────────────────────────────────────────────────────────────


-- ============================================================
-- SECTION 1: AUTH USERS
-- Inserts directly into auth.users (requires service role / SQL editor)
-- ============================================================

INSERT INTO auth.users (
  id, instance_id, aud, role,
  email, encrypted_password,
  email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new
)
VALUES

  -- ── Writers ────────────────────────────────────────────────────────────────
  ('aa000001-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated',
   'writer2@agencyos.app', crypt('AgencyOS2026!', gen_salt('bf')),
   NOW(), '{"provider":"email","providers":["email"]}', '{}',
   NOW(), NOW(), '', '', ''),

  ('aa000001-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated',
   'writer3@agencyos.app', crypt('AgencyOS2026!', gen_salt('bf')),
   NOW(), '{"provider":"email","providers":["email"]}', '{}',
   NOW(), NOW(), '', '', ''),

  ('aa000001-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated',
   'writer4@agencyos.app', crypt('AgencyOS2026!', gen_salt('bf')),
   NOW(), '{"provider":"email","providers":["email"]}', '{}',
   NOW(), NOW(), '', '', ''),

  -- ── Designers ──────────────────────────────────────────────────────────────
  ('aa000002-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated',
   'designer2@agencyos.app', crypt('AgencyOS2026!', gen_salt('bf')),
   NOW(), '{"provider":"email","providers":["email"]}', '{}',
   NOW(), NOW(), '', '', ''),

  ('aa000002-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated',
   'designer3@agencyos.app', crypt('AgencyOS2026!', gen_salt('bf')),
   NOW(), '{"provider":"email","providers":["email"]}', '{}',
   NOW(), NOW(), '', '', ''),

  -- ── Videographers ──────────────────────────────────────────────────────────
  ('aa000003-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated',
   'videographer2@agencyos.app', crypt('AgencyOS2026!', gen_salt('bf')),
   NOW(), '{"provider":"email","providers":["email"]}', '{}',
   NOW(), NOW(), '', '', ''),

  ('aa000003-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated',
   'videographer3@agencyos.app', crypt('AgencyOS2026!', gen_salt('bf')),
   NOW(), '{"provider":"email","providers":["email"]}', '{}',
   NOW(), NOW(), '', '', ''),

  -- ── Editors ────────────────────────────────────────────────────────────────
  ('aa000004-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated',
   'editor2@agencyos.app', crypt('AgencyOS2026!', gen_salt('bf')),
   NOW(), '{"provider":"email","providers":["email"]}', '{}',
   NOW(), NOW(), '', '', ''),

  ('aa000004-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated',
   'editor3@agencyos.app', crypt('AgencyOS2026!', gen_salt('bf')),
   NOW(), '{"provider":"email","providers":["email"]}', '{}',
   NOW(), NOW(), '', '', ''),

  -- ── Posters ────────────────────────────────────────────────────────────────
  ('aa000005-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated',
   'poster2@agencyos.app', crypt('AgencyOS2026!', gen_salt('bf')),
   NOW(), '{"provider":"email","providers":["email"]}', '{}',
   NOW(), NOW(), '', '', ''),

  ('aa000005-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated',
   'poster3@agencyos.app', crypt('AgencyOS2026!', gen_salt('bf')),
   NOW(), '{"provider":"email","providers":["email"]}', '{}',
   NOW(), NOW(), '', '', ''),

  -- ── Client portal users ─────────────────────────────────────────────────────
  ('aa000006-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated',
   'client2@agencyos.app', crypt('AgencyOS2026!', gen_salt('bf')),
   NOW(), '{"provider":"email","providers":["email"]}', '{}',
   NOW(), NOW(), '', '', ''),

  ('aa000006-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated',
   'client3@agencyos.app', crypt('AgencyOS2026!', gen_salt('bf')),
   NOW(), '{"provider":"email","providers":["email"]}', '{}',
   NOW(), NOW(), '', '', ''),

  ('aa000006-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated',
   'client4@agencyos.app', crypt('AgencyOS2026!', gen_salt('bf')),
   NOW(), '{"provider":"email","providers":["email"]}', '{}',
   NOW(), NOW(), '', '', '')

ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- SECTION 2: PUBLIC USER PROFILES
-- ============================================================

INSERT INTO public.users (id, name, role, tasks_today, tasks_total, salary, email, phone, joined_at, active)
VALUES

  -- ── Writers ────────────────────────────────────────────────────────────────
  ('aa000001-0000-0000-0000-000000000001', 'Layla Hassan',     'writer',       2, 8,  80000, 'writer2@agencyos.app',       '+92 311 1000001', '2025-01-10', TRUE),
  ('aa000001-0000-0000-0000-000000000002', 'Sana Mirza',       'writer',       1, 5,  78000, 'writer3@agencyos.app',       '+92 311 1000002', '2025-03-05', TRUE),
  ('aa000001-0000-0000-0000-000000000003', 'Usman Qadir',      'writer',       3, 11, 82000, 'writer4@agencyos.app',       '+92 311 1000003', '2025-05-20', TRUE),

  -- ── Designers ──────────────────────────────────────────────────────────────
  ('aa000002-0000-0000-0000-000000000001', 'Aisha Nawaz',      'designer',     2, 7,  92000, 'designer2@agencyos.app',     '+92 312 2000001', '2025-02-14', TRUE),
  ('aa000002-0000-0000-0000-000000000002', 'Faisal Rehman',    'designer',     1, 4,  89000, 'designer3@agencyos.app',     '+92 312 2000002', '2025-06-01', TRUE),

  -- ── Videographers ──────────────────────────────────────────────────────────
  ('aa000003-0000-0000-0000-000000000001', 'Tariq Mehmood',    'videographer', 1, 6,  87000, 'videographer2@agencyos.app', '+92 313 3000001', '2025-03-18', TRUE),
  ('aa000003-0000-0000-0000-000000000002', 'Rabia Yousuf',     'videographer', 0, 3,  84000, 'videographer3@agencyos.app', '+92 313 3000002', '2025-07-12', TRUE),

  -- ── Editors ────────────────────────────────────────────────────────────────
  ('aa000004-0000-0000-0000-000000000001', 'Danish Malik',     'editor',       2, 9,  86000, 'editor2@agencyos.app',       '+92 314 4000001', '2025-04-01', TRUE),
  ('aa000004-0000-0000-0000-000000000002', 'Hira Baig',        'editor',       1, 5,  83000, 'editor3@agencyos.app',       '+92 314 4000002', '2025-08-08', TRUE),

  -- ── Posters ────────────────────────────────────────────────────────────────
  ('aa000005-0000-0000-0000-000000000001', 'Kamil Javed',      'poster',       3, 13, 72000, 'poster2@agencyos.app',       '+92 315 5000001', '2025-04-20', TRUE),
  ('aa000005-0000-0000-0000-000000000002', 'Maryam Iqbal',     'poster',       2, 7,  70000, 'poster3@agencyos.app',       '+92 315 5000002', '2025-09-01', TRUE),

  -- ── Client portal users ─────────────────────────────────────────────────────
  ('aa000006-0000-0000-0000-000000000001', 'Urban Eats PK',    'client',       0, 0,  NULL,  'client2@agencyos.app',       NULL,              '2025-05-01', TRUE),
  ('aa000006-0000-0000-0000-000000000002', 'Nova Tech Co',     'client',       0, 0,  NULL,  'client3@agencyos.app',       NULL,              '2025-07-15', TRUE),
  ('aa000006-0000-0000-0000-000000000003', 'Glow Beauty PK',   'client',       0, 0,  NULL,  'client4@agencyos.app',       NULL,              '2025-10-01', TRUE)

ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- SECTION 3: CLIENT COMPANIES
-- ============================================================

INSERT INTO public.clients (
  id, name, industry, brand_color, platforms,
  requires_client_approval, initials,
  content_this_month, monthly_retainer,
  contact_name, contact_email, contract_start, notes
)
VALUES
  ('cl-4', 'Urban Eats PK',        'Food & Beverage',   'hsl(14,90%,55%)',   ARRAY['instagram','facebook','tiktok'],  TRUE,  'UE', 18, 95000,  'Sadia Butt',    'sadia@urbaneats.pk',       '2025-05-01', 'Street food & restaurant chain. Heavy focus on reels & stories.'),
  ('cl-5', 'Nova Tech Co',         'Technology',        'hsl(230,72%,52%)',  ARRAY['linkedin','instagram'],           TRUE,  'NT', 12, 140000, 'Zaid Chaudhry', 'zaid@novatech.io',         '2025-07-15', 'B2B SaaS product. Thought-leadership posts on LinkedIn primarily.'),
  ('cl-6', 'Glow Beauty PK',       'Beauty & Skincare', 'hsl(330,70%,65%)',  ARRAY['instagram','tiktok'],             TRUE,  'GB', 25, 110000, 'Nadia Rashid',  'nadia@glowbeauty.pk',      '2025-10-01', 'Skincare + makeup brand. UGC-style reels perform best.'),
  ('cl-7', 'PeakRun Sports',       'Sports & Fitness',  'hsl(200,80%,45%)',  ARRAY['instagram','tiktok','youtube'],   FALSE, 'PR', 20, 105000, 'Ahmer Rao',     'ahmer@peakrun.pk',         '2025-11-01', 'Running gear brand. Event coverage + product launches.'),
  ('cl-8', 'Mint Home Décor',      'Home & Lifestyle',  'hsl(160,55%,48%)',  ARRAY['instagram','pinterest'],          FALSE, 'MH', 15, 80000,  'Fatima Awan',   'fatima@minthome.pk',       '2026-01-10', 'Interior & home styling brand. Aesthetic grid, carousel posts.')

ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- SECTION 4: LINK CLIENT PORTAL USERS TO CLIENT COMPANIES
-- ============================================================

INSERT INTO public.client_users (user_id, client_id)
VALUES
  ('aa000006-0000-0000-0000-000000000001', 'cl-4'),  -- Urban Eats PK
  ('aa000006-0000-0000-0000-000000000002', 'cl-5'),  -- Nova Tech Co
  ('aa000006-0000-0000-0000-000000000003', 'cl-6')   -- Glow Beauty PK

ON CONFLICT DO NOTHING;


-- ============================================================
-- SECTION 5: SALARY RECORDS (current month for all new staff)
-- ============================================================

INSERT INTO public.salary_records (user_id, month, amount, paid, notes)
VALUES
  ('aa000001-0000-0000-0000-000000000001', '2026-03', 80000, FALSE, NULL),
  ('aa000001-0000-0000-0000-000000000002', '2026-03', 78000, FALSE, NULL),
  ('aa000001-0000-0000-0000-000000000003', '2026-03', 82000, FALSE, NULL),
  ('aa000002-0000-0000-0000-000000000001', '2026-03', 92000, FALSE, NULL),
  ('aa000002-0000-0000-0000-000000000002', '2026-03', 89000, FALSE, NULL),
  ('aa000003-0000-0000-0000-000000000001', '2026-03', 87000, FALSE, NULL),
  ('aa000003-0000-0000-0000-000000000002', '2026-03', 84000, FALSE, NULL),
  ('aa000004-0000-0000-0000-000000000001', '2026-03', 86000, FALSE, NULL),
  ('aa000004-0000-0000-0000-000000000002', '2026-03', 83000, FALSE, NULL),
  ('aa000005-0000-0000-0000-000000000001', '2026-03', 72000, FALSE, NULL),
  ('aa000005-0000-0000-0000-000000000002', '2026-03', 70000, FALSE, NULL);


-- ============================================================
-- SUMMARY OF ACCOUNTS CREATED
-- ============================================================
-- Role         | Email                        | Name
-- -------------|------------------------------|------------------
-- writer       | writer2@agencyos.app         | Layla Hassan
-- writer       | writer3@agencyos.app         | Sana Mirza
-- writer       | writer4@agencyos.app         | Usman Qadir
-- designer     | designer2@agencyos.app       | Aisha Nawaz
-- designer     | designer3@agencyos.app       | Faisal Rehman
-- videographer | videographer2@agencyos.app   | Tariq Mehmood
-- videographer | videographer3@agencyos.app   | Rabia Yousuf
-- editor       | editor2@agencyos.app         | Danish Malik
-- editor       | editor3@agencyos.app         | Hira Baig
-- poster       | poster2@agencyos.app         | Kamil Javed
-- poster       | poster3@agencyos.app         | Maryam Iqbal
-- client       | client2@agencyos.app         | Urban Eats PK
-- client       | client3@agencyos.app         | Nova Tech Co
-- client       | client4@agencyos.app         | Glow Beauty PK
-- ----------------------------------------------------------------
-- All passwords: AgencyOS2026!
-- New client companies: cl-4 Urban Eats PK, cl-5 Nova Tech Co,
--   cl-6 Glow Beauty PK, cl-7 PeakRun Sports, cl-8 Mint Home Décor
-- ============================================================




-- ============================================================
-- ██████████████████████████████████████████████████████████
--                  CLEANUP / REMOVAL SCRIPT
--  Run this block to completely remove all dummy data above.
--  Safe to run multiple times (DELETE is idempotent).
-- ██████████████████████████████████████████████████████████
-- ============================================================

/*  ── PASTE AND RUN THIS BLOCK SEPARATELY TO CLEAN UP ──────────

-- Step 1: Remove salary records for dummy users
DELETE FROM public.salary_records
WHERE user_id IN (
  'aa000001-0000-0000-0000-000000000001',
  'aa000001-0000-0000-0000-000000000002',
  'aa000001-0000-0000-0000-000000000003',
  'aa000002-0000-0000-0000-000000000001',
  'aa000002-0000-0000-0000-000000000002',
  'aa000003-0000-0000-0000-000000000001',
  'aa000003-0000-0000-0000-000000000002',
  'aa000004-0000-0000-0000-000000000001',
  'aa000004-0000-0000-0000-000000000002',
  'aa000005-0000-0000-0000-000000000001',
  'aa000005-0000-0000-0000-000000000002'
);

-- Step 2: Remove client_users links for dummy client portal users
DELETE FROM public.client_users
WHERE user_id IN (
  'aa000006-0000-0000-0000-000000000001',
  'aa000006-0000-0000-0000-000000000002',
  'aa000006-0000-0000-0000-000000000003'
);

-- Step 3: Remove public user profiles (cascades tasks, notifications, etc.)
DELETE FROM public.users
WHERE id IN (
  'aa000001-0000-0000-0000-000000000001',
  'aa000001-0000-0000-0000-000000000002',
  'aa000001-0000-0000-0000-000000000003',
  'aa000002-0000-0000-0000-000000000001',
  'aa000002-0000-0000-0000-000000000002',
  'aa000003-0000-0000-0000-000000000001',
  'aa000003-0000-0000-0000-000000000002',
  'aa000004-0000-0000-0000-000000000001',
  'aa000004-0000-0000-0000-000000000002',
  'aa000005-0000-0000-0000-000000000001',
  'aa000005-0000-0000-0000-000000000002',
  'aa000006-0000-0000-0000-000000000001',
  'aa000006-0000-0000-0000-000000000002',
  'aa000006-0000-0000-0000-000000000003'
);

-- Step 4: Remove auth users (cascades public.users via FK)
DELETE FROM auth.users
WHERE id IN (
  'aa000001-0000-0000-0000-000000000001',
  'aa000001-0000-0000-0000-000000000002',
  'aa000001-0000-0000-0000-000000000003',
  'aa000002-0000-0000-0000-000000000001',
  'aa000002-0000-0000-0000-000000000002',
  'aa000003-0000-0000-0000-000000000001',
  'aa000003-0000-0000-0000-000000000002',
  'aa000004-0000-0000-0000-000000000001',
  'aa000004-0000-0000-0000-000000000002',
  'aa000005-0000-0000-0000-000000000001',
  'aa000005-0000-0000-0000-000000000002',
  'aa000006-0000-0000-0000-000000000001',
  'aa000006-0000-0000-0000-000000000002',
  'aa000006-0000-0000-0000-000000000003'
);

-- Step 5: Remove client companies (cascades content_pieces, tasks, invoices, etc.)
DELETE FROM public.clients
WHERE id IN ('cl-4', 'cl-5', 'cl-6', 'cl-7', 'cl-8');

──────────────────────────────────────────────────────────── */
