// ─── SaaS / Multi-tenancy ─────────────────────────────────────────────────────

export type OrgPlan = 'starter' | 'growth' | 'pro'

export type OrgPlanStatus = 'trialing' | 'active' | 'past_due' | 'canceled'

export interface Organization {
  id: string
  name: string
  slug: string
  logo_url?: string | null
  plan: OrgPlan
  plan_status: OrgPlanStatus
  trial_ends_at?: string | null
  stripe_customer_id?: string | null
  stripe_subscription_id?: string | null
  created_at: string
}

export interface Invite {
  id: string
  org_id: string
  email: string
  role: Role
  token: string
  invited_by?: string | null
  expires_at: string
  accepted_at?: string | null
  created_at: string
}

export type PlanFeature =
  | 'hasAnalytics'
  | 'hasAudit'
  | 'hasClientPortal'
  | 'hasCustomDomain'

export interface PlanLimits {
  maxMembers: number        // -1 = unlimited
  maxClients: number        // -1 = unlimited
  storageMb: number
  hasAnalytics: boolean
  hasAudit: boolean
  hasClientPortal: boolean
  hasCustomDomain: boolean
}

export const PLAN_LIMITS: Record<OrgPlan, PlanLimits> = {
  starter: {
    maxMembers:      5,
    maxClients:      3,
    storageMb:       5120,   // 5 GB
    hasAnalytics:    false,
    hasAudit:        false,
    hasClientPortal: false,
    hasCustomDomain: false,
  },
  growth: {
    maxMembers:      15,
    maxClients:      15,
    storageMb:       25600,  // 25 GB
    hasAnalytics:    true,
    hasAudit:        true,
    hasClientPortal: true,
    hasCustomDomain: false,
  },
  pro: {
    maxMembers:      -1,
    maxClients:      -1,
    storageMb:       102400, // 100 GB
    hasAnalytics:    true,
    hasAudit:        true,
    hasClientPortal: true,
    hasCustomDomain: true,
  },
}

// ─── Roles ────────────────────────────────────────────────────────────────────

export type Role =
  | 'admin'
  | 'writer'
  | 'designer'
  | 'videographer'
  | 'editor'
  | 'poster'
  | 'client'

export type ContentType = 'graphic' | 'video' | 'reel' | 'story'

export type ContentStatus =
  | 'planned'
  | 'brief-ready'
  | 'in-design'
  | 'in-editing'
  | 'ready-for-review'
  | 'client-review'
  | 'approved'
  | 'scheduled'
  | 'posted'
  | 'overdue'

// 'client-review' is a defined status but nothing in the app ever writes it — the pipeline
// board's stages stop at 'ready-for-review' and go straight to 'approved'. In practice
// 'ready-for-review' IS the "waiting on the client" state. Always check both, not just one.
export function needsClientAction(status: string): boolean {
  return status === 'client-review' || status === 'ready-for-review'
}

export type Platform = 'instagram' | 'tiktok' | 'facebook' | 'linkedin'

export type TaskStatus = 'pending' | 'in-progress' | 'done' | 'overdue'

export type AssetType = 'graphic' | 'raw-footage' | 'edited-video' | 'brand-material'

export type IdeaStatus = 'raw' | 'shortlisted' | 'converted'

export type InvoiceStatus = 'paid' | 'pending' | 'overdue'

export type ExpenseCategory =
  | 'software'
  | 'equipment'
  | 'freelance'
  | 'marketing'
  | 'office'
  | 'other'

// ─── Scene / Script ───────────────────────────────────────────────────────────

export interface GraphicCopy {
  headline: string
  subheadline?: string
  bodyText: string
  cta: string
  visualDirection: string
  colorNotes?: string
  moodRef?: string
}

export interface VideoScene {
  sceneNumber: number
  duration: string           // e.g. "0:00–0:04"
  visual: string             // what the camera shows
  dialogue?: string          // voiceover or on-screen speech
  text?: string              // on-screen text overlay
  music?: string             // music cue / mood
  cta?: string               // call to action for final scene
}

export interface StoryFrame {
  frameNumber: number
  visual: string
  text?: string
  cta?: string
}

export interface ContentScript {
  contentId: string
  // Graphic fields
  graphicCopy?: GraphicCopy
  // Video / Reel fields
  scenes?: VideoScene[]
  musicDirection?: string
  totalDuration?: string
  hookLine?: string
  // Story fields
  frames?: StoryFrame[]
  // Shared
  hashtagStrategy?: string
  altText?: string
  internalNotes?: string
}

// ─── Idea Dump ────────────────────────────────────────────────────────────────

export interface Idea {
  id: string
  org_id: string
  title: string
  type?: ContentType
  clientId?: string
  body: string
  status: IdeaStatus
  createdBy: string          // userId
  createdAt: Date
  tags?: string[]
}

// ─── Feedback / Comments ──────────────────────────────────────────────────────

export interface FeedbackComment {
  id: string
  org_id: string
  contentId: string
  authorId: string           // userId or 'client-[clientId]'
  authorName: string
  authorType: 'team' | 'client'
  text: string
  createdAt: Date
  resolved: boolean
  parentId?: string          // for replies
}

// ─── Finance ──────────────────────────────────────────────────────────────────

export interface Invoice {
  id: string
  org_id: string
  clientId: string
  month: string              // e.g. "March 2026"
  amount: number
  status: InvoiceStatus
  dueDate: Date
  paidAt?: Date
  description: string
}

export interface SalaryRecord {
  id: string
  org_id: string
  userId: string
  month: string
  amount: number
  paid: boolean
  paidAt?: Date
  notes?: string
}

export interface Expense {
  id: string
  org_id: string
  category: ExpenseCategory
  description: string
  amount: number
  date: Date
  paidBy: string             // userId
}

// ─── Core entities ────────────────────────────────────────────────────────────

export interface User {
  id: string
  org_id: string | null
  name: string
  role: Role
  tasksToday: number
  tasksTotal: number
  salary?: number
  email?: string
  phone?: string
  joinedAt?: Date
  active?: boolean
}

export interface Client {
  id: string
  org_id: string
  name: string
  industry: string
  brandColor: string
  platforms: Platform[]
  requiresClientApproval: boolean
  initials: string
  contentQuota: number
  pendingApprovals: number
  monthlyRetainer?: number
  contactName?: string
  contactEmail?: string
  contractStart?: Date
  notes?: string
}

export interface ContentPiece {
  id: string
  org_id: string
  clientId: string
  title: string
  type: ContentType
  platforms: Platform[]
  scheduledDate: Date
  status: ContentStatus
  caption?: string
  brief?: string
  assignedTo: string[]
  assetIds: string[]
  notes?: string
  thumbnail?: string
}

export interface Task {
  id: string
  org_id: string
  contentId: string
  clientId: string
  assignedTo: string
  role: Role
  title: string
  description: string
  dueDate: Date
  status: TaskStatus
}

export interface Asset {
  id: string
  org_id: string
  contentId: string
  clientId: string
  type: AssetType
  fileName: string
  uploadedBy: string
  uploadedAt: Date
  fileSize?: string
}

export interface Notification {
  id: string
  org_id: string
  forRoles: Role[]
  type:
    | 'task-assigned'
    | 'task-overdue'
    | 'approval-needed'
    | 'client-note'
    | 'plan-reminder'
    | 'content-approved'
  title: string
  body: string
  read: boolean
  createdAt: Date
  contentId?: string
}

// ─── Nav ──────────────────────────────────────────────────────────────────────

export interface NavItem {
  label: string
  href: string
  icon:
    | 'home' | 'calendar' | 'planning' | 'pipeline' | 'team' | 'tasks'
    | 'upcoming' | 'done' | 'week' | 'notes' | 'notifications'
    | 'ideas' | 'finance' | 'clients' | 'audit' | 'analytics' | 'assets'
  dividerBefore?: boolean
}

export const NAV_BY_ROLE: Record<Role, NavItem[]> = {
  admin: [
    { label: 'Home',      href: '/dashboard',     icon: 'home' },
    { label: 'Calendar',  href: '/calendar',      icon: 'calendar' },
    { label: 'Planning',  href: '/planning',      icon: 'planning' },
    { label: 'Pipeline',  href: '/pipeline',      icon: 'pipeline' },
    { label: 'Ideas',     href: '/ideas',         icon: 'ideas' },
    { label: 'Team',      href: '/team',          icon: 'team',    dividerBefore: true },
    { label: 'Clients',   href: '/clients',       icon: 'clients' },
    { label: 'Assets',    href: '/assets',        icon: 'assets' },
    { label: 'Finance',    href: '/finance',       icon: 'finance',       dividerBefore: true },
    { label: 'Analytics', href: '/analytics',     icon: 'analytics' },
    { label: 'Alerts',    href: '/notifications', icon: 'notifications' },
    { label: 'Audit',     href: '/audit',         icon: 'audit',         dividerBefore: true },
  ],
  writer: [
    { label: 'Today',     href: '/tasks',          icon: 'tasks' },
    { label: 'Upcoming',  href: '/tasks/upcoming', icon: 'upcoming' },
    { label: 'Done',      href: '/tasks/done',     icon: 'done' },
    { label: 'Calendar',  href: '/calendar',       icon: 'calendar', dividerBefore: true },
    { label: 'Ideas',     href: '/ideas',          icon: 'ideas' },
    { label: 'Alerts',    href: '/notifications',  icon: 'notifications' },
  ],
  designer: [
    { label: 'Today',     href: '/tasks',          icon: 'tasks' },
    { label: 'Upcoming',  href: '/tasks/upcoming', icon: 'upcoming' },
    { label: 'Done',      href: '/tasks/done',     icon: 'done' },
    { label: 'Calendar',  href: '/calendar',       icon: 'calendar', dividerBefore: true },
    { label: 'Ideas',     href: '/ideas',          icon: 'ideas' },
    { label: 'Assets',    href: '/assets',         icon: 'assets' },
    { label: 'Alerts',    href: '/notifications',  icon: 'notifications' },
  ],
  videographer: [
    { label: 'Today',     href: '/tasks',          icon: 'tasks' },
    { label: 'Upcoming',  href: '/tasks/upcoming', icon: 'upcoming' },
    { label: 'Done',      href: '/tasks/done',     icon: 'done' },
    { label: 'Calendar',  href: '/calendar',       icon: 'calendar', dividerBefore: true },
    { label: 'Ideas',     href: '/ideas',          icon: 'ideas' },
    { label: 'Assets',    href: '/assets',         icon: 'assets' },
    { label: 'Alerts',    href: '/notifications',  icon: 'notifications' },
  ],
  editor: [
    { label: 'Today',     href: '/tasks',          icon: 'tasks' },
    { label: 'Upcoming',  href: '/tasks/upcoming', icon: 'upcoming' },
    { label: 'Done',      href: '/tasks/done',     icon: 'done' },
    { label: 'Calendar',  href: '/calendar',       icon: 'calendar', dividerBefore: true },
    { label: 'Ideas',     href: '/ideas',          icon: 'ideas' },
    { label: 'Assets',    href: '/assets',         icon: 'assets' },
    { label: 'Alerts',    href: '/notifications',  icon: 'notifications' },
  ],
  poster: [
    { label: 'Today',     href: '/tasks',          icon: 'tasks' },
    { label: 'Upcoming',  href: '/tasks/upcoming', icon: 'upcoming' },
    { label: 'Done',      href: '/tasks/done',     icon: 'done' },
    { label: 'Calendar',  href: '/calendar',       icon: 'calendar', dividerBefore: true },
    { label: 'Ideas',     href: '/ideas',          icon: 'ideas' },
    { label: 'Alerts',    href: '/notifications',  icon: 'notifications' },
  ],
  client: [
    { label: 'This Week', href: '/client',          icon: 'week' },
    { label: 'Calendar',  href: '/client/calendar', icon: 'calendar' },
    { label: 'Notes',     href: '/client/notes',    icon: 'notes' },
    { label: 'Alerts',    href: '/notifications',   icon: 'notifications' },
  ],
}
