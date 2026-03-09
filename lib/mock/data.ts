// @ts-nocheck — Legacy prototype mock data, not used in production
import type {
  User,
  Client,
  ContentPiece,
  Task,
  Asset,
  Notification,
  Idea,
  FeedbackComment,
  ContentScript,
  Invoice,
  SalaryRecord,
  Expense,
} from '../types'

// All dates are computed at runtime relative to today
// so the app always looks live regardless of when it's opened
const today = new Date()
today.setHours(0, 0, 0, 0)

function daysFromToday(n: number): Date {
  const d = new Date(today)
  d.setDate(d.getDate() + n)
  return d
}

// ─── Team ────────────────────────────────────────────────────────────────────

export const USERS: User[] = [
  {
    id: 'u1', name: 'Sarah Malik', role: 'admin',
    tasksToday: 4, tasksTotal: 12,
    salary: 0, email: 'sarah@agencyos.co', phone: '+1 555-0101',
    joinedAt: new Date('2023-01-15'), active: true,
  },
  {
    id: 'u2', name: 'Kai Nguyen', role: 'writer',
    tasksToday: 3, tasksTotal: 8,
    salary: 3200, email: 'kai@agencyos.co', phone: '+1 555-0102',
    joinedAt: new Date('2023-04-01'), active: true,
  },
  {
    id: 'u3', name: 'Priya Sharma', role: 'designer',
    tasksToday: 2, tasksTotal: 6,
    salary: 3800, email: 'priya@agencyos.co', phone: '+1 555-0103',
    joinedAt: new Date('2023-03-10'), active: true,
  },
  {
    id: 'u4', name: 'Omar Hassan', role: 'videographer',
    tasksToday: 1, tasksTotal: 4,
    salary: 4200, email: 'omar@agencyos.co', phone: '+1 555-0104',
    joinedAt: new Date('2023-06-20'), active: true,
  },
  {
    id: 'u5', name: 'Alex Rivera', role: 'editor',
    tasksToday: 2, tasksTotal: 5,
    salary: 3600, email: 'alex@agencyos.co', phone: '+1 555-0105',
    joinedAt: new Date('2023-07-05'), active: true,
  },
  {
    id: 'u6', name: 'Zara Obi', role: 'poster',
    tasksToday: 3, tasksTotal: 7,
    salary: 2800, email: 'zara@agencyos.co', phone: '+1 555-0106',
    joinedAt: new Date('2024-01-08'), active: true,
  },
]

// ─── Clients ─────────────────────────────────────────────────────────────────

export const CLIENTS: Client[] = [
  {
    id: 'c1', name: 'Spark Coffee', industry: 'Food & Beverage',
    brandColor: 'hsl(25, 90%, 55%)', platforms: ['instagram', 'tiktok'],
    requiresClientApproval: true, initials: 'SC',
    contentThisMonth: 18, pendingApprovals: 3,
    monthlyRetainer: 2500, contactName: 'James Brew', contactEmail: 'james@sparkcoffee.com',
    contractStart: new Date('2024-06-01'),
    notes: 'Prefers warm tones, lifestyle-first photography. Monthly quota: 20 posts.',
  },
  {
    id: 'c2', name: 'FitPulse', industry: 'Health & Fitness',
    brandColor: 'hsl(161, 75%, 40%)', platforms: ['instagram', 'tiktok', 'facebook'],
    requiresClientApproval: false, initials: 'FP',
    contentThisMonth: 24, pendingApprovals: 1,
    monthlyRetainer: 3800, contactName: 'Maya Torres', contactEmail: 'maya@fitpulse.io',
    contractStart: new Date('2024-01-15'),
    notes: 'High-volume client. Very fast turnaround needed. Hook-first video strategy.',
  },
  {
    id: 'c3', name: 'Luna Skincare', industry: 'Beauty',
    brandColor: 'hsl(270, 78%, 70%)', platforms: ['instagram', 'linkedin'],
    requiresClientApproval: true, initials: 'LS',
    contentThisMonth: 14, pendingApprovals: 2,
    monthlyRetainer: 2000, contactName: 'Anika Patel', contactEmail: 'anika@lunaskincare.com',
    contractStart: new Date('2024-09-01'),
    notes: 'Minimalist aesthetic, soft lighting. Brand guide is strict — always check before publishing.',
  },
]

// ─── Content Pieces ───────────────────────────────────────────────────────────

export const CONTENT: ContentPiece[] = [
  // ── Today / Urgent ──
  {
    id: 'cp1',
    clientId: 'c1',
    title: 'Morning Ritual — Pour Over Series',
    type: 'graphic',
    platforms: ['instagram'],
    scheduledDate: daysFromToday(0),
    status: 'approved',
    caption: 'Start your morning the way you mean it. ☕ Our Pour Over blend is now available in-store.',
    assignedTo: ['u3', 'u6'],
    assetIds: ['a1'],
  },
  {
    id: 'cp2',
    clientId: 'c2',
    title: '30-Day Challenge Launch Reel',
    type: 'reel',
    platforms: ['instagram', 'tiktok'],
    scheduledDate: daysFromToday(0),
    status: 'ready-for-review',
    caption: 'Your 30-day transformation starts today. Are you in?',
    assignedTo: ['u5', 'u6'],
    assetIds: ['a2'],
  },
  // ── Tomorrow ──
  {
    id: 'cp3',
    clientId: 'c3',
    title: 'Hydration Serum — Product Spotlight',
    type: 'graphic',
    platforms: ['instagram'],
    scheduledDate: daysFromToday(1),
    status: 'in-design',
    assignedTo: ['u3'],
    assetIds: [],
  },
  {
    id: 'cp4',
    clientId: 'c1',
    title: 'Behind the Roast — Story Series',
    type: 'story',
    platforms: ['instagram'],
    scheduledDate: daysFromToday(1),
    status: 'approved',
    caption: 'Ever wondered how we source our beans? Swipe to find out.',
    assignedTo: ['u6'],
    assetIds: ['a3'],
  },
  // ── This week ──
  {
    id: 'cp5',
    clientId: 'c2',
    title: 'Protein Shake Recipe Reel',
    type: 'reel',
    platforms: ['tiktok', 'instagram'],
    scheduledDate: daysFromToday(2),
    status: 'in-editing',
    assignedTo: ['u4', 'u5'],
    assetIds: ['a4'],
  },
  {
    id: 'cp6',
    clientId: 'c3',
    title: 'Spring Collection Teaser',
    type: 'video',
    platforms: ['instagram', 'linkedin'],
    scheduledDate: daysFromToday(3),
    status: 'brief-ready',
    assignedTo: ['u4'],
    assetIds: [],
  },
  {
    id: 'cp7',
    clientId: 'c1',
    title: 'New Menu Drop — Cold Brew',
    type: 'graphic',
    platforms: ['instagram', 'facebook'],
    scheduledDate: daysFromToday(4),
    status: 'planned',
    assignedTo: [],
    assetIds: [],
  },
  {
    id: 'cp8',
    clientId: 'c2',
    title: 'Gym Transformation Tuesday',
    type: 'graphic',
    platforms: ['instagram'],
    scheduledDate: daysFromToday(5),
    status: 'planned',
    assignedTo: [],
    assetIds: [],
  },
  // ── Overdue ──
  {
    id: 'cp9',
    clientId: 'c3',
    title: 'Founder Story — Brand Film',
    type: 'video',
    platforms: ['instagram', 'linkedin'],
    scheduledDate: daysFromToday(-2),
    status: 'overdue',
    assignedTo: ['u5'],
    assetIds: [],
    notes: 'Waiting on raw footage from Omar',
  },
  // ── Later this month ──
  {
    id: 'cp10',
    clientId: 'c1',
    title: 'Customer Love — UGC Compilation',
    type: 'video',
    platforms: ['instagram', 'tiktok'],
    scheduledDate: daysFromToday(8),
    status: 'planned',
    assignedTo: [],
    assetIds: [],
  },
  {
    id: 'cp11',
    clientId: 'c2',
    title: 'Weekly Workout Plan Carousel',
    type: 'graphic',
    platforms: ['instagram'],
    scheduledDate: daysFromToday(10),
    status: 'planned',
    assignedTo: [],
    assetIds: [],
  },
  {
    id: 'cp12',
    clientId: 'c3',
    title: 'Skincare Routine Reel',
    type: 'reel',
    platforms: ['instagram', 'tiktok'],
    scheduledDate: daysFromToday(12),
    status: 'planned',
    assignedTo: [],
    assetIds: [],
  },
]

// ─── Tasks ────────────────────────────────────────────────────────────────────

export const TASKS: Task[] = [
  {
    id: 't1',
    contentId: 'cp3',
    clientId: 'c3',
    assignedTo: 'u3',
    role: 'designer',
    title: 'Design Hydration Serum spotlight graphic',
    description: 'Create a clean product-focused graphic with the new brand palette. Reference brief for copy.',
    dueDate: daysFromToday(0),
    status: 'in-progress',
  },
  {
    id: 't2',
    contentId: 'cp2',
    clientId: 'c2',
    assignedTo: 'u1',
    role: 'admin',
    title: 'Review 30-Day Challenge Reel',
    description: 'Final admin review before client approval request is sent.',
    dueDate: daysFromToday(0),
    status: 'pending',
  },
  {
    id: 't3',
    contentId: 'cp5',
    clientId: 'c2',
    assignedTo: 'u5',
    role: 'editor',
    title: 'Edit Protein Shake Recipe footage',
    description: 'Raw footage uploaded by Omar. Cut to 30s reel, add music, captions.',
    dueDate: daysFromToday(1),
    status: 'in-progress',
  },
  {
    id: 't4',
    contentId: 'cp6',
    clientId: 'c3',
    assignedTo: 'u4',
    role: 'videographer',
    title: 'Shoot Spring Collection Teaser',
    description: 'Studio shoot — 3 looks, outdoor backdrop. Brief attached.',
    dueDate: daysFromToday(2),
    status: 'pending',
  },
  {
    id: 't5',
    contentId: 'cp9',
    clientId: 'c3',
    assignedTo: 'u5',
    role: 'editor',
    title: 'Edit Founder Story film',
    description: 'Footage is overdue from videographer. Escalated to admin.',
    dueDate: daysFromToday(-2),
    status: 'overdue',
  },
  {
    id: 't6',
    contentId: 'cp1',
    clientId: 'c1',
    assignedTo: 'u6',
    role: 'poster',
    title: 'Post Morning Ritual graphic — Spark Coffee',
    description: 'Approved and ready. Post at 8:00 AM, tag @sparkcoffee, use caption from brief.',
    dueDate: daysFromToday(0),
    status: 'pending',
  },
  {
    id: 't7',
    contentId: 'cp4',
    clientId: 'c1',
    assignedTo: 'u6',
    role: 'poster',
    title: 'Post Behind the Roast story series',
    description: '5-frame story sequence. Upload in order. Schedule for 7 PM.',
    dueDate: daysFromToday(1),
    status: 'pending',
  },
  {
    id: 't8',
    contentId: 'cp7',
    clientId: 'c1',
    assignedTo: 'u2',
    role: 'writer',
    title: 'Write caption for Cold Brew drop',
    description: 'Punchy, product-first. Max 150 chars for feed. Separate TikTok caption needed.',
    dueDate: daysFromToday(2),
    status: 'pending',
  },
]

// ─── Assets ───────────────────────────────────────────────────────────────────

export const ASSETS: Asset[] = [
  {
    id: 'a1',
    contentId: 'cp1',
    clientId: 'c1',
    type: 'graphic',
    fileName: 'spark-pour-over-feed-v2.png',
    uploadedBy: 'u3',
    uploadedAt: daysFromToday(-1),
    fileSize: '2.4 MB',
  },
  {
    id: 'a2',
    contentId: 'cp2',
    clientId: 'c2',
    type: 'edited-video',
    fileName: 'fitpulse-30day-challenge-reel-final.mp4',
    uploadedBy: 'u5',
    uploadedAt: daysFromToday(-1),
    fileSize: '18.7 MB',
  },
  {
    id: 'a3',
    contentId: 'cp4',
    clientId: 'c1',
    type: 'graphic',
    fileName: 'spark-behind-the-roast-stories-x5.zip',
    uploadedBy: 'u3',
    uploadedAt: daysFromToday(0),
    fileSize: '8.1 MB',
  },
  {
    id: 'a4',
    contentId: 'cp5',
    clientId: 'c2',
    type: 'raw-footage',
    fileName: 'fitpulse-protein-shake-raw-4k.mp4',
    uploadedBy: 'u4',
    uploadedAt: daysFromToday(0),
    fileSize: '1.2 GB',
  },
]

// ─── Notifications ────────────────────────────────────────────────────────────

export const NOTIFICATIONS: Notification[] = [
  {
    id: 'n1',
    forRoles: ['admin'],
    type: 'approval-needed',
    title: '30-Day Challenge Reel is ready for review',
    body: 'Alex Rivera completed the edit. Awaiting your final approval before client send.',
    read: false,
    createdAt: daysFromToday(0),
    contentId: 'cp2',
  },
  {
    id: 'n2',
    forRoles: ['admin', 'editor'],
    type: 'task-overdue',
    title: 'Founder Story film is overdue',
    body: 'Luna Skincare — was scheduled 2 days ago. Footage not yet received from Omar.',
    read: false,
    createdAt: daysFromToday(-1),
    contentId: 'cp9',
  },
  {
    id: 'n3',
    forRoles: ['designer'],
    type: 'task-assigned',
    title: 'New design task — Luna Skincare',
    body: 'Hydration Serum spotlight graphic is due today. Tap to view brief.',
    read: false,
    createdAt: daysFromToday(0),
    contentId: 'cp3',
  },
  {
    id: 'n4',
    forRoles: ['admin'],
    type: 'client-note',
    title: 'Luna Skincare left a revision note',
    body: '"Please make the background lighter and use the secondary brand font for the headline."',
    read: true,
    createdAt: daysFromToday(-1),
    contentId: 'cp3',
  },
  {
    id: 'n5',
    forRoles: ['writer'],
    type: 'plan-reminder',
    title: 'Time to plan April content',
    body: "It's the last week of the month. Start planning next month's content calendar.",
    read: true,
    createdAt: daysFromToday(-3),
  },
  {
    id: 'n6',
    forRoles: ['poster'],
    type: 'task-assigned',
    title: '2 posts ready to go live today',
    body: 'Morning Ritual (Spark Coffee) and 30-Day Launch (FitPulse) are approved and scheduled.',
    read: false,
    createdAt: daysFromToday(0),
  },
]

// ─── Ideas ────────────────────────────────────────────────────────────────────

export const IDEAS: Idea[] = [
  {
    id: 'i1', title: 'Behind-the-scenes roasting day — Spark Coffee',
    type: 'reel', clientId: 'c1', status: 'shortlisted', createdBy: 'u2',
    createdAt: daysFromToday(-5),
    body: 'Follow the beans from arrival to roast. Show the process, the smells, the people. Raw and real — no heavy edits. 30–45s reel format.',
    tags: ['behind-the-scenes', 'coffee', 'viral'],
  },
  {
    id: 'i2', title: 'Ingredient spotlight series — Luna Skincare',
    type: 'graphic', clientId: 'c3', status: 'raw', createdBy: 'u2',
    createdAt: daysFromToday(-3),
    body: 'One post per hero ingredient: Hyaluronic Acid, Retinol, Niacinamide. Clean minimal design with a science-backed caption. Could be a 6-part series.',
    tags: ['education', 'series', 'skincare'],
  },
  {
    id: 'i3', title: 'FitPulse transformation wall — before/after UGC compilation',
    type: 'video', clientId: 'c2', status: 'shortlisted', createdBy: 'u1',
    createdAt: daysFromToday(-7),
    body: 'Collect UGC from their community. Compile into a 60s emotional transformation reel. Use trending audio. Strong CTA at the end.',
    tags: ['ugc', 'community', 'viral'],
  },
  {
    id: 'i4', title: 'Day-in-a-life of a barista', type: 'story', clientId: 'c1', status: 'raw', createdBy: 'u3',
    createdAt: daysFromToday(-2),
    body: 'Follow one barista through their shift — morning prep, first customers, latte art, closing. 8–10 story frames.',
    tags: ['storytelling', 'humanizing'],
  },
  {
    id: 'i5', title: '"What\'s in my gym bag" — FitPulse collab concept',
    type: 'reel', clientId: 'c2', status: 'converted', createdBy: 'u2',
    createdAt: daysFromToday(-10),
    body: 'Partner with a micro-influencer to do a gym bag unboxing featuring FitPulse gear and supplements. Quick cuts, trending audio.',
    tags: ['influencer', 'product', 'collab'],
  },
  {
    id: 'i6', title: 'No-client idea — agency showcase reel',
    type: 'reel', clientId: undefined, status: 'raw', createdBy: 'u1',
    createdAt: daysFromToday(-1),
    body: 'Show our own agency process — brief to post. Could be great for agency marketing. Film internally.',
    tags: ['agency', 'self-promo'],
  },
]

// ─── Feedback / Comments ──────────────────────────────────────────────────────

export const FEEDBACK: FeedbackComment[] = [
  {
    id: 'fb1', contentId: 'cp1', authorId: 'client-c1',
    authorName: 'James Brew (Spark Coffee)', authorType: 'client',
    text: 'Love the composition! Can we make the cup slightly more centered and brighten the steam a bit? Otherwise this is exactly the vibe we wanted.',
    createdAt: daysFromToday(-1), resolved: false,
  },
  {
    id: 'fb2', contentId: 'cp1', authorId: 'u3',
    authorName: 'Priya Sharma', authorType: 'team',
    text: 'On it — will update the composition and send a revised version by EOD.',
    createdAt: daysFromToday(0), resolved: false, parentId: 'fb1',
  },
  {
    id: 'fb3', contentId: 'cp2', authorId: 'client-c2',
    authorName: 'Maya Torres (FitPulse)', authorType: 'client',
    text: 'The hook is too slow. First 2 seconds need to be more explosive — show a transformation result immediately, then back up.',
    createdAt: daysFromToday(-1), resolved: false,
  },
  {
    id: 'fb4', contentId: 'cp3', authorId: 'client-c3',
    authorName: 'Anika Patel (Luna Skincare)', authorType: 'client',
    text: 'Background needs to be lighter — use our off-white (#FAF8F4). Also swap to Cormorant Garamond for the headline.',
    createdAt: daysFromToday(-1), resolved: false,
  },
  {
    id: 'fb5', contentId: 'cp3', authorId: 'u3',
    authorName: 'Priya Sharma', authorType: 'team',
    text: 'Updated. Sending revised file now. The Cormorant weight — should I use Regular or Italic?',
    createdAt: daysFromToday(0), resolved: false, parentId: 'fb4',
  },
  {
    id: 'fb6', contentId: 'cp4', authorId: 'client-c1',
    authorName: 'James Brew (Spark Coffee)', authorType: 'client',
    text: 'Approved! This story sequence is perfect. Post as planned.',
    createdAt: daysFromToday(0), resolved: true,
  },
]

// ─── Scripts ──────────────────────────────────────────────────────────────────

export const SCRIPTS: ContentScript[] = [
  {
    contentId: 'cp1',
    graphicCopy: {
      headline: 'Start your morning the right way.',
      subheadline: 'The Pour Over Series — now in store.',
      bodyText: 'Hand-crafted. Single-origin. Brewed slow so you can move fast. Our new Pour Over blend is here for mornings that actually matter.',
      cta: 'Find us in-store →',
      visualDirection: 'Overhead flat-lay of a ceramic pour-over set on a warm walnut surface. Natural morning light from left. Coffee steam visible. One hand entering frame holding the carafe. Warm amber tones throughout.',
      colorNotes: 'Background: warm cream #F5EFE0. Cup: matte white. Accent: deep espresso brown for text.',
      moodRef: 'Reference: Intelligentsia Coffee brand photography, Blue Bottle lifestyle shots.',
    },
    hashtagStrategy: '#sparkcoffee #pourover #morningritual #coffeetime #singleorigin #craftcoffee #localcoffee',
    altText: 'A hand pouring coffee from a ceramic carafe into a white cup, overhead view, morning light.',
    internalNotes: 'Client wants a 4:5 ratio for feed. Also export 9:16 for stories.',
  },
  {
    contentId: 'cp2',
    hookLine: 'Your 30-day transformation starts in 3... 2... 1.',
    totalDuration: '0:28',
    musicDirection: 'High-energy instrumental, BPM 128+. Something like "Levels" energy but copyright-free. Check Epidemic Sound "workout motivation" playlist.',
    scenes: [
      { sceneNumber: 1, duration: '0:00–0:02', visual: 'Quick flash — before photo of real customer (B&W)', dialogue: 'Your 30-day transformation...', text: '30 DAYS.', music: 'Hit on beat 1' },
      { sceneNumber: 2, duration: '0:02–0:05', visual: 'After photo same person (colour, vibrant)', text: 'STARTS TODAY.', music: 'Drop' },
      { sceneNumber: 3, duration: '0:05–0:12', visual: 'Montage: gym floor, weights, people working out at FitPulse', dialogue: 'We\'ve helped over 2,000 people transform in 30 days.', music: 'Build' },
      { sceneNumber: 4, duration: '0:12–0:18', visual: 'Product shot: FitPulse app on phone + supplement line', text: 'TRAINING PLAN + NUTRITION + COMMUNITY', music: 'Steady' },
      { sceneNumber: 5, duration: '0:18–0:24', visual: 'Rapid fire: 5 real member smiling faces', dialogue: 'Are you in?', music: 'Build to drop' },
      { sceneNumber: 6, duration: '0:24–0:28', visual: 'Logo lockup on dark background', text: 'FITPULSE — JOIN THE CHALLENGE', cta: 'Link in bio' },
    ],
    hashtagStrategy: '#fitpulse #30daychallenge #fitness #transformation #workout #gym #fitlife #challenge',
    altText: 'FitPulse 30-Day Challenge launch reel showing member transformations.',
    internalNotes: 'Export 9:16 for Reels + 1:1 square version for feed. Add auto-captions.',
  },
  {
    contentId: 'cp5',
    hookLine: 'The protein shake that actually tastes good.',
    totalDuration: '0:22',
    musicDirection: 'Upbeat, kitchen-vibe. Something light and fun. Epidemic Sound "cooking" category.',
    scenes: [
      { sceneNumber: 1, duration: '0:00–0:02', visual: 'Close-up: protein shake being poured into a clear glass, slow-mo', text: 'WAIT FOR IT...', music: 'Anticipation build' },
      { sceneNumber: 2, duration: '0:02–0:06', visual: 'Ingredients laid out on counter — banana, oat milk, FitPulse protein tub', dialogue: 'Here\'s what we\'re making today.', music: 'Drops' },
      { sceneNumber: 3, duration: '0:06–0:14', visual: 'Fast-cut: each ingredient going in blender, blending, pour', dialogue: 'Banana, oat milk, one scoop, 30 seconds.', music: 'Steady beat' },
      { sceneNumber: 4, duration: '0:14–0:18', visual: 'First sip reaction — genuine, not over the top', text: '32g PROTEIN. 5 INGREDIENTS. DONE.', music: 'Chill' },
      { sceneNumber: 5, duration: '0:18–0:22', visual: 'Product hero shot — tub against light background', text: 'FITPULSE PROTEIN', cta: 'Shop link in bio' },
    ],
    hashtagStrategy: '#fitpulse #proteinshake #healthyrecipe #mealprep #fitness #gymlife #nutrition',
    altText: 'FitPulse protein shake recipe reel.',
  },
]

// ─── Finance — Invoices ───────────────────────────────────────────────────────

function monthsAgo(n: number): Date {
  const d = new Date(today)
  d.setMonth(d.getMonth() - n)
  return d
}

export const INVOICES: Invoice[] = [
  // Spark Coffee
  { id: 'inv-1', clientId: 'c1', month: 'March 2026', amount: 2500, status: 'pending', dueDate: daysFromToday(10), description: 'Monthly retainer — content creation & management' },
  { id: 'inv-2', clientId: 'c1', month: 'February 2026', amount: 2500, status: 'paid', dueDate: monthsAgo(1), paidAt: monthsAgo(1), description: 'Monthly retainer' },
  { id: 'inv-3', clientId: 'c1', month: 'January 2026', amount: 2500, status: 'paid', dueDate: monthsAgo(2), paidAt: monthsAgo(2), description: 'Monthly retainer' },
  { id: 'inv-4', clientId: 'c1', month: 'December 2025', amount: 3200, status: 'paid', dueDate: monthsAgo(3), paidAt: monthsAgo(3), description: 'Monthly retainer + holiday campaign add-on' },
  // FitPulse
  { id: 'inv-5', clientId: 'c2', month: 'March 2026', amount: 3800, status: 'overdue', dueDate: daysFromToday(-5), description: 'Monthly retainer — high-volume content plan' },
  { id: 'inv-6', clientId: 'c2', month: 'February 2026', amount: 3800, status: 'paid', dueDate: monthsAgo(1), paidAt: monthsAgo(1), description: 'Monthly retainer' },
  { id: 'inv-7', clientId: 'c2', month: 'January 2026', amount: 3800, status: 'paid', dueDate: monthsAgo(2), paidAt: monthsAgo(2), description: 'Monthly retainer' },
  // Luna Skincare
  { id: 'inv-8', clientId: 'c3', month: 'March 2026', amount: 2000, status: 'pending', dueDate: daysFromToday(15), description: 'Monthly retainer — brand content & approvals' },
  { id: 'inv-9', clientId: 'c3', month: 'February 2026', amount: 2000, status: 'paid', dueDate: monthsAgo(1), paidAt: monthsAgo(1), description: 'Monthly retainer' },
  { id: 'inv-10', clientId: 'c3', month: 'January 2026', amount: 2200, status: 'paid', dueDate: monthsAgo(2), paidAt: monthsAgo(2), description: 'Monthly retainer + product launch support' },
]

// ─── Finance — Salaries ───────────────────────────────────────────────────────

export const SALARIES: SalaryRecord[] = [
  // March 2026
  { id: 'sal-1', userId: 'u2', month: 'March 2026', amount: 3200, paid: false },
  { id: 'sal-2', userId: 'u3', month: 'March 2026', amount: 3800, paid: false },
  { id: 'sal-3', userId: 'u4', month: 'March 2026', amount: 4200, paid: false },
  { id: 'sal-4', userId: 'u5', month: 'March 2026', amount: 3600, paid: false },
  { id: 'sal-5', userId: 'u6', month: 'March 2026', amount: 2800, paid: false },
  // February 2026
  { id: 'sal-6', userId: 'u2', month: 'February 2026', amount: 3200, paid: true, paidAt: monthsAgo(1) },
  { id: 'sal-7', userId: 'u3', month: 'February 2026', amount: 3800, paid: true, paidAt: monthsAgo(1) },
  { id: 'sal-8', userId: 'u4', month: 'February 2026', amount: 4200, paid: true, paidAt: monthsAgo(1) },
  { id: 'sal-9', userId: 'u5', month: 'February 2026', amount: 3600, paid: true, paidAt: monthsAgo(1) },
  { id: 'sal-10', userId: 'u6', month: 'February 2026', amount: 2800, paid: true, paidAt: monthsAgo(1) },
  // January 2026
  { id: 'sal-11', userId: 'u2', month: 'January 2026', amount: 3200, paid: true, paidAt: monthsAgo(2) },
  { id: 'sal-12', userId: 'u3', month: 'January 2026', amount: 3800, paid: true, paidAt: monthsAgo(2) },
  { id: 'sal-13', userId: 'u4', month: 'January 2026', amount: 4200, paid: true, paidAt: monthsAgo(2) },
  { id: 'sal-14', userId: 'u5', month: 'January 2026', amount: 3600, paid: true, paidAt: monthsAgo(2) },
  { id: 'sal-15', userId: 'u6', month: 'January 2026', amount: 2800, paid: true, paidAt: monthsAgo(2) },
]

// ─── Finance — Expenses ───────────────────────────────────────────────────────

export const EXPENSES: Expense[] = [
  { id: 'exp-1', category: 'software', description: 'Adobe Creative Cloud (team plan)', amount: 599, date: daysFromToday(-5), paidBy: 'u1' },
  { id: 'exp-2', category: 'software', description: 'Notion Team subscription', amount: 48, date: daysFromToday(-5), paidBy: 'u1' },
  { id: 'exp-3', category: 'software', description: 'Frame.io — video review', amount: 45, date: daysFromToday(-5), paidBy: 'u1' },
  { id: 'exp-4', category: 'equipment', description: 'DJI Mic 2 wireless microphone', amount: 249, date: daysFromToday(-12), paidBy: 'u4' },
  { id: 'exp-5', category: 'freelance', description: 'Motion graphics freelancer — Luna campaign', amount: 350, date: daysFromToday(-8), paidBy: 'u1' },
  { id: 'exp-6', category: 'marketing', description: 'Agency Instagram ad boost', amount: 120, date: daysFromToday(-3), paidBy: 'u1' },
  { id: 'exp-7', category: 'office', description: 'Studio space — March', amount: 800, date: daysFromToday(-1), paidBy: 'u1' },
  { id: 'exp-8', category: 'software', description: 'Epidemic Sound — music licensing', amount: 49, date: monthsAgo(1), paidBy: 'u5' },
  { id: 'exp-9', category: 'equipment', description: 'LED ring light set × 2', amount: 178, date: monthsAgo(1), paidBy: 'u4' },
  { id: 'exp-10', category: 'freelance', description: 'Copywriter contract — Spark Coffee Q1', amount: 600, date: monthsAgo(1), paidBy: 'u1' },
]
