-- ============================================================
-- AgencyOS — Seed Data
-- Run AFTER schema.sql
-- IMPORTANT: First create auth users via Supabase Dashboard or
-- run the auth.users inserts below using service role.
-- ============================================================

-- ─── Step 1: Create auth users ───────────────────────────────────────────────
-- Go to Supabase Dashboard → Authentication → Users → Add user
-- OR use the Supabase JS admin client in a one-time script.
--
-- Demo accounts to create (email / password):
--   admin@agencyos.app       / AgencyOS2026!
--   writer@agencyos.app      / AgencyOS2026!
--   designer@agencyos.app    / AgencyOS2026!
--   videographer@agencyos.app/ AgencyOS2026!
--   editor@agencyos.app      / AgencyOS2026!
--   poster@agencyos.app      / AgencyOS2026!
--   client@agencyos.app      / AgencyOS2026!
--
-- After creating them, copy their UUIDs and replace the placeholders below.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── Step 2: Insert user profiles ────────────────────────────────────────────
-- Replace each UUID with the actual UUID from Supabase Auth → Users

INSERT INTO public.users (id, name, role, tasks_today, tasks_total, salary, email, phone, joined_at, active)
VALUES
  -- Replace UUIDs with real ones from your Supabase Auth dashboard
  ('48f5c1f8-7eaa-4a2d-bfdf-00cb85f33bf3', 'Sarah Malik',      'admin',        0,  0,  NULL,  'admin@agencyos.app',        '+92 300 1234567', '2024-01-15', TRUE),
  ('bea5f187-a3e1-4926-9ff4-b7d19ab6f157', 'Omar Farooq',      'writer',       3,  12, 85000, 'writer@agencyos.app',       '+92 301 2345678', '2024-02-01', TRUE),
  ('d792d016-1f2d-45ab-a6ac-3452399a344a', 'Zara Ahmed',       'designer',     2,  9,  95000, 'designer@agencyos.app',     '+92 302 3456789', '2024-02-15', TRUE),
  ('5b909891-35a8-4cbf-bd53-c2df8c311aed', 'Bilal Chaudhry',   'videographer', 1,  5,  90000, 'videographer@agencyos.app', '+92 303 4567890', '2024-03-01', TRUE),
  ('2025a9cc-256b-4886-ac54-6f31a82df451', 'Nadia Khan',       'editor',       2,  8,  88000, 'editor@agencyos.app',       '+92 304 5678901', '2024-03-15', TRUE),
  ('d266274a-a556-4991-9c17-ae9fe5b6b471', 'Hamza Siddiqui',   'poster',       4,  14, 75000, 'poster@agencyos.app',       '+92 305 6789012', '2024-04-01', TRUE),
  ('17682a3a-b0fb-424f-8553-8334a88baf29', 'Fitness First PK', 'client',       0,  0,  NULL,  'client@agencyos.app',       NULL,              '2024-06-01', TRUE)
ON CONFLICT (id) DO NOTHING;

-- ─── Step 3: Clients ─────────────────────────────────────────────────────────

INSERT INTO public.clients (id, name, industry, brand_color, platforms, requires_client_approval, initials, monthly_retainer, contact_name, contact_email, contract_start, notes)
VALUES
  ('cl-1', 'Fitness First PK', 'Health & Fitness', 'hsl(161,72%,42%)', ARRAY['instagram','tiktok'],           TRUE,  'FF', 120000, 'Ahsan Raza',   'ahsan@fitnessfirstpk.com', '2024-06-01', 'Focus on motivational content. Approve all posts before scheduling.'),
  ('cl-2', 'Brew & Bean',      'Food & Beverage',  'hsl(30,75%,48%)',  ARRAY['instagram','facebook'],          FALSE, 'BB', 85000,  'Maria Taha',   'maria@brewandbean.pk',     '2024-08-01', 'Aesthetic café content. Monthly campaign themes.'),
  ('cl-3', 'TechNova Solutions','Technology',       'hsl(220,75%,55%)', ARRAY['linkedin','instagram','tiktok'], TRUE,  'TN', 150000, 'Kamran Baig',  'kamran@technova.io',       '2024-09-15', 'B2B focused. LinkedIn is primary, keep content professional.')
ON CONFLICT (id) DO NOTHING;

-- ─── Link client user to client ──────────────────────────────────────────────
-- Replace with real UUID of client auth user
INSERT INTO public.client_users (user_id, client_id)
VALUES ('17682a3a-b0fb-424f-8553-8334a88baf29', 'cl-1')
ON CONFLICT DO NOTHING;

-- ─── Step 4: Content Pieces ──────────────────────────────────────────────────

INSERT INTO public.content_pieces (id, client_id, title, type, platforms, scheduled_date, status, caption, assigned_to, asset_ids)
VALUES
  ('cp-1',  'cl-1', 'Morning Workout Motivation',    'reel',    ARRAY['instagram','tiktok'],  '2026-03-10', 'in-editing',      'Start your day right 💪', ARRAY['5b909891-35a8-4cbf-bd53-c2df8c311aed'], '{}'),
  ('cp-2',  'cl-1', 'Protein Shake Recipe',          'graphic', ARRAY['instagram'],           '2026-03-12', 'brief-ready',     'Fuel your gains 🥤',      ARRAY['d792d016-1f2d-45ab-a6ac-3452399a344a'], '{}'),
  ('cp-3',  'cl-1', 'Member Transformation Story',   'reel',    ARRAY['instagram','tiktok'],  '2026-03-15', 'planned',         NULL,                      ARRAY['5b909891-35a8-4cbf-bd53-c2df8c311aed'], '{}'),
  ('cp-4',  'cl-1', 'Weekly Schedule Graphic',       'graphic', ARRAY['instagram','facebook'],'2026-03-17', 'client-review',   'Plan your week 📅',       ARRAY['d792d016-1f2d-45ab-a6ac-3452399a344a'], '{}'),
  ('cp-5',  'cl-2', 'New Seasonal Menu Launch',      'reel',    ARRAY['instagram'],           '2026-03-11', 'ready-for-review','Spring is here ☕',        ARRAY['5b909891-35a8-4cbf-bd53-c2df8c311aed'], '{}'),
  ('cp-6',  'cl-2', 'Behind the Scenes - Roasting',  'story',   ARRAY['instagram'],           '2026-03-13', 'in-design',       NULL,                      ARRAY['d792d016-1f2d-45ab-a6ac-3452399a344a'], '{}'),
  ('cp-7',  'cl-2', 'Weekend Brunch Special',        'graphic', ARRAY['instagram','facebook'],'2026-03-16', 'approved',        'Brunch like never before',ARRAY['d792d016-1f2d-45ab-a6ac-3452399a344a'], '{}'),
  ('cp-8',  'cl-3', 'Product Launch Announcement',   'graphic', ARRAY['linkedin','instagram'],'2026-03-09', 'posted',          'Innovation redefined.',   ARRAY['bea5f187-a3e1-4926-9ff4-b7d19ab6f157'], '{}'),
  ('cp-9',  'cl-3', 'Team Culture Spotlight',        'video',   ARRAY['linkedin'],            '2026-03-14', 'in-editing',      'People behind the tech.', ARRAY['5b909891-35a8-4cbf-bd53-c2df8c311aed'], '{}'),
  ('cp-10', 'cl-3', 'Case Study Carousel',           'graphic', ARRAY['linkedin'],            '2026-03-18', 'brief-ready',     NULL,                      ARRAY['bea5f187-a3e1-4926-9ff4-b7d19ab6f157'], '{}')
ON CONFLICT (id) DO NOTHING;

-- ─── Step 5: Tasks ───────────────────────────────────────────────────────────
-- Replace assigned_to UUIDs with real ones

INSERT INTO public.tasks (id, content_id, client_id, assigned_to, role, title, description, due_date, status)
VALUES
  ('t-1',  'cp-1',  'cl-1', '2025a9cc-256b-4886-ac54-6f31a82df451', 'editor',       'Edit morning workout reel',    'Cut footage, add music & captions',          '2026-03-09', 'in-progress'),
  ('t-2',  'cp-2',  'cl-1', 'd792d016-1f2d-45ab-a6ac-3452399a344a', 'designer',     'Design protein shake graphic', 'Use brand colors, include recipe overlay',   '2026-03-11', 'pending'),
  ('t-3',  'cp-3',  'cl-1', '5b909891-35a8-4cbf-bd53-c2df8c311aed', 'videographer', 'Shoot transformation reel',    'Interview + before/after footage',           '2026-03-14', 'pending'),
  ('t-4',  'cp-4',  'cl-1', 'd792d016-1f2d-45ab-a6ac-3452399a344a', 'designer',     'Design weekly schedule',       'Infographic style, brand palette',           '2026-03-08', 'done'),
  ('t-5',  'cp-5',  'cl-2', '2025a9cc-256b-4886-ac54-6f31a82df451', 'editor',       'Edit seasonal menu reel',      'Fast cuts, warm color grade',                '2026-03-10', 'in-progress'),
  ('t-6',  'cp-6',  'cl-2', 'd792d016-1f2d-45ab-a6ac-3452399a344a', 'designer',     'Design BTS story frames',      '5 frame story sequence',                     '2026-03-12', 'pending'),
  ('t-7',  'cp-8',  'cl-3', 'bea5f187-a3e1-4926-9ff4-b7d19ab6f157', 'writer',       'Write product launch caption', 'LinkedIn-optimized, 150 words max',          '2026-03-07', 'done'),
  ('t-8',  'cp-9',  'cl-3', '2025a9cc-256b-4886-ac54-6f31a82df451', 'editor',       'Edit team culture video',      'Interview cuts, b-roll, lower thirds',       '2026-03-13', 'in-progress'),
  ('t-9',  'cp-10', 'cl-3', 'bea5f187-a3e1-4926-9ff4-b7d19ab6f157', 'writer',       'Write case study copy',        '4-slide carousel copy, results-focused',     '2026-03-11', 'pending'),
  ('t-10', 'cp-1',  'cl-1', 'd266274a-a556-4991-9c17-ae9fe5b6b471', 'poster',       'Schedule workout reel',        'Post at 7AM on march 10',                    '2026-03-10', 'pending')
ON CONFLICT (id) DO NOTHING;

-- ─── Step 6: Invoices ────────────────────────────────────────────────────────

INSERT INTO public.invoices (id, client_id, month, amount, status, due_date, description)
VALUES
  ('inv-1',  'cl-1', 'January 2026',  120000, 'paid',    '2026-01-31', 'Monthly retainer — January 2026'),
  ('inv-2',  'cl-1', 'February 2026', 120000, 'paid',    '2026-02-28', 'Monthly retainer — February 2026'),
  ('inv-3',  'cl-1', 'March 2026',    120000, 'pending', '2026-03-31', 'Monthly retainer — March 2026'),
  ('inv-4',  'cl-2', 'January 2026',  85000,  'paid',    '2026-01-31', 'Monthly retainer — January 2026'),
  ('inv-5',  'cl-2', 'February 2026', 85000,  'paid',    '2026-02-28', 'Monthly retainer — February 2026'),
  ('inv-6',  'cl-2', 'March 2026',    85000,  'pending', '2026-03-31', 'Monthly retainer — March 2026'),
  ('inv-7',  'cl-3', 'January 2026',  150000, 'paid',    '2026-01-31', 'Monthly retainer — January 2026'),
  ('inv-8',  'cl-3', 'February 2026', 150000, 'overdue', '2026-02-28', 'Monthly retainer — February 2026'),
  ('inv-9',  'cl-3', 'March 2026',    150000, 'pending', '2026-03-31', 'Monthly retainer — March 2026'),
  ('inv-10', 'cl-1', 'March 2026',    35000,  'pending', '2026-03-20', 'Extra campaign — Ramadan series')
ON CONFLICT (id) DO NOTHING;

-- ─── Step 7: Salary Records ──────────────────────────────────────────────────

INSERT INTO public.salary_records (id, user_id, month, amount, paid, paid_at)
VALUES
  ('sal-1',  'bea5f187-a3e1-4926-9ff4-b7d19ab6f157', 'January 2026',  85000, TRUE,  '2026-01-31'),
  ('sal-2',  'd792d016-1f2d-45ab-a6ac-3452399a344a', 'January 2026',  95000, TRUE,  '2026-01-31'),
  ('sal-3',  '5b909891-35a8-4cbf-bd53-c2df8c311aed', 'January 2026',  90000, TRUE,  '2026-01-31'),
  ('sal-4',  '2025a9cc-256b-4886-ac54-6f31a82df451', 'January 2026',  88000, TRUE,  '2026-01-31'),
  ('sal-5',  'd266274a-a556-4991-9c17-ae9fe5b6b471', 'January 2026',  75000, TRUE,  '2026-01-31'),
  ('sal-6',  'bea5f187-a3e1-4926-9ff4-b7d19ab6f157', 'February 2026', 85000, TRUE,  '2026-02-28'),
  ('sal-7',  'd792d016-1f2d-45ab-a6ac-3452399a344a', 'February 2026', 95000, TRUE,  '2026-02-28'),
  ('sal-8',  '5b909891-35a8-4cbf-bd53-c2df8c311aed', 'February 2026', 90000, TRUE,  '2026-02-28'),
  ('sal-9',  '2025a9cc-256b-4886-ac54-6f31a82df451', 'February 2026', 88000, TRUE,  '2026-02-28'),
  ('sal-10', 'd266274a-a556-4991-9c17-ae9fe5b6b471', 'February 2026', 75000, TRUE,  '2026-02-28'),
  ('sal-11', 'bea5f187-a3e1-4926-9ff4-b7d19ab6f157', 'March 2026',    85000, FALSE, NULL),
  ('sal-12', 'd792d016-1f2d-45ab-a6ac-3452399a344a', 'March 2026',    95000, FALSE, NULL),
  ('sal-13', '5b909891-35a8-4cbf-bd53-c2df8c311aed', 'March 2026',    90000, FALSE, NULL),
  ('sal-14', '2025a9cc-256b-4886-ac54-6f31a82df451', 'March 2026',    88000, FALSE, NULL),
  ('sal-15', 'd266274a-a556-4991-9c17-ae9fe5b6b471', 'March 2026',    75000, FALSE, NULL)
ON CONFLICT (id) DO NOTHING;

-- ─── Step 8: Expenses ────────────────────────────────────────────────────────

INSERT INTO public.expenses (id, category, description, amount, date, paid_by)
VALUES
  ('exp-1',  'software',   'Adobe Creative Cloud (annual)',   25000, '2026-01-05', '48f5c1f8-7eaa-4a2d-bfdf-00cb85f33bf3'),
  ('exp-2',  'software',   'CapCut Pro subscription',         3500,  '2026-01-05', '48f5c1f8-7eaa-4a2d-bfdf-00cb85f33bf3'),
  ('exp-3',  'equipment',  'Ring light for studio',           18000, '2026-01-12', '48f5c1f8-7eaa-4a2d-bfdf-00cb85f33bf3'),
  ('exp-4',  'freelance',  'Freelance motion designer',       45000, '2026-02-01', '48f5c1f8-7eaa-4a2d-bfdf-00cb85f33bf3'),
  ('exp-5',  'software',   'Later social scheduler',          4200,  '2026-02-05', '48f5c1f8-7eaa-4a2d-bfdf-00cb85f33bf3'),
  ('exp-6',  'marketing',  'Meta ads for agency promotion',   30000, '2026-02-15', '48f5c1f8-7eaa-4a2d-bfdf-00cb85f33bf3'),
  ('exp-7',  'office',     'Office supplies & stationery',    5500,  '2026-02-20', '48f5c1f8-7eaa-4a2d-bfdf-00cb85f33bf3'),
  ('exp-8',  'freelance',  'Freelance copywriter (project)',  22000, '2026-03-01', '48f5c1f8-7eaa-4a2d-bfdf-00cb85f33bf3'),
  ('exp-9',  'equipment',  'Portable hard drives (2x 4TB)',   28000, '2026-03-05', '48f5c1f8-7eaa-4a2d-bfdf-00cb85f33bf3'),
  ('exp-10', 'other',      'Client meeting meals',            7800,  '2026-03-07', '48f5c1f8-7eaa-4a2d-bfdf-00cb85f33bf3')
ON CONFLICT (id) DO NOTHING;

-- ─── Step 9: Notifications ───────────────────────────────────────────────────

INSERT INTO public.notifications (id, for_roles, for_user_id, type, title, body, read, content_id)
VALUES
  ('n-1', ARRAY['admin'],                                NULL, 'approval-needed', 'Fitness First needs approval',        '4 pieces waiting for client review.',                                          FALSE, 'cp-4'),
  ('n-2', ARRAY['admin'],                                NULL, 'task-overdue',    'Invoice overdue: TechNova',            'February invoice of ₨150,000 is past due date.',                               FALSE, NULL),
  ('n-3', ARRAY['designer','writer'],                    NULL, 'plan-reminder',   'March planning not finalized',         '8 content slots still unassigned for this month.',                             FALSE, NULL),
  ('n-4', ARRAY['editor'],                               '2025a9cc-256b-4886-ac54-6f31a82df451', 'task-assigned', 'New task: Edit seasonal menu reel', 'Brew & Bean reel due March 10.', FALSE, 'cp-5'),
  ('n-5', ARRAY['writer'],                               'bea5f187-a3e1-4926-9ff4-b7d19ab6f157', 'task-assigned', 'New task: Case study carousel copy','TechNova carousel copy due March 11.', FALSE, 'cp-10'),
  ('n-6', ARRAY['client'],                               '17682a3a-b0fb-424f-8553-8334a88baf29', 'approval-needed','Content ready for your review',    'Weekly schedule graphic is awaiting your approval.', FALSE, 'cp-4'),
  ('n-7', ARRAY['admin','writer','designer'],            NULL, 'content-approved','Client approved: Weekend Brunch',      'Brew & Bean approved the weekend brunch graphic.',                             TRUE,  'cp-7')
ON CONFLICT (id) DO NOTHING;

-- ─── Step 10: Ideas ──────────────────────────────────────────────────────────

INSERT INTO public.ideas (id, title, type, client_id, body, status, created_by, tags)
VALUES
  ('idea-1', 'Ramadan Countdown Series',    'graphic', 'cl-1', '30-day countdown graphics with daily workout tips. Build anticipation and daily engagement.',              'shortlisted', 'bea5f187-a3e1-4926-9ff4-b7d19ab6f157', ARRAY['ramadan','series','fitness']),
  ('idea-2', 'Behind the Brew Docuseries',  'video',   'cl-2', 'Mini documentary series — sourcing beans, roasting, brewing. 3-part series, each under 2 min.',          'raw',         'bea5f187-a3e1-4926-9ff4-b7d19ab6f157', ARRAY['documentary','coffee','storytelling']),
  ('idea-3', 'Client Success Wall',         'graphic', 'cl-3', 'Monthly spotlight on client results with real metrics. Social proof focused.',                            'converted',   'bea5f187-a3e1-4926-9ff4-b7d19ab6f157', ARRAY['b2b','social-proof','linkedin']),
  ('idea-4', 'Protein Recipe Reels',        'reel',    'cl-1', 'Weekly 30-second recipe reels using products sold at the gym. Partner with nutritionist for credibility.', 'raw',         'd792d016-1f2d-45ab-a6ac-3452399a344a', ARRAY['recipe','nutrition','reels']),
  ('idea-5', 'Barista Challenges TikTok',   'reel',    'cl-2', 'Staff take on viral TikTok coffee challenges. Authentic, fun, high shareability.',                        'shortlisted', 'd792d016-1f2d-45ab-a6ac-3452399a344a', ARRAY['tiktok','viral','cafe']),
  ('idea-6', 'Tech Myth Busting Series',    'reel',    'cl-3', 'Debunk common tech misconceptions in 60-second reels. Positions TechNova as thought leaders.',            'raw',         'bea5f187-a3e1-4926-9ff4-b7d19ab6f157', ARRAY['education','thought-leadership','reels'])
ON CONFLICT (id) DO NOTHING;
