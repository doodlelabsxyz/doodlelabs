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
  userId: string
  month: string
  amount: number
  paid: boolean
  paidAt?: Date
  notes?: string
}

export interface Expense {
  id: string
  category: ExpenseCategory
  description: string
  amount: number
  date: Date
  paidBy: string             // userId
}

// ─── Core entities ────────────────────────────────────────────────────────────

export interface User {
  id: string
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
  name: string
  industry: string
  brandColor: string
  platforms: Platform[]
  requiresClientApproval: boolean
  initials: string
  contentThisMonth: number
  pendingApprovals: number
  monthlyRetainer?: number
  contactName?: string
  contactEmail?: string
  contractStart?: Date
  notes?: string
}

export interface ContentPiece {
  id: string
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
    | 'ideas' | 'finance' | 'clients' | 'audit'
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
    { label: 'Finance',   href: '/finance',       icon: 'finance', dividerBefore: true },
    { label: 'Alerts',    href: '/notifications', icon: 'notifications' },
    { label: 'Audit',     href: '/audit',         icon: 'audit', dividerBefore: true },
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
    { label: 'Alerts',    href: '/notifications',  icon: 'notifications' },
  ],
  videographer: [
    { label: 'Today',     href: '/tasks',          icon: 'tasks' },
    { label: 'Upcoming',  href: '/tasks/upcoming', icon: 'upcoming' },
    { label: 'Done',      href: '/tasks/done',     icon: 'done' },
    { label: 'Calendar',  href: '/calendar',       icon: 'calendar', dividerBefore: true },
    { label: 'Ideas',     href: '/ideas',          icon: 'ideas' },
    { label: 'Alerts',    href: '/notifications',  icon: 'notifications' },
  ],
  editor: [
    { label: 'Today',     href: '/tasks',          icon: 'tasks' },
    { label: 'Upcoming',  href: '/tasks/upcoming', icon: 'upcoming' },
    { label: 'Done',      href: '/tasks/done',     icon: 'done' },
    { label: 'Calendar',  href: '/calendar',       icon: 'calendar', dividerBefore: true },
    { label: 'Ideas',     href: '/ideas',          icon: 'ideas' },
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
