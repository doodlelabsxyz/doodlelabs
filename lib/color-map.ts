import type { ContentStatus, ContentType, TaskStatus } from '@/lib/types'

/**
 * Single source of truth for content-type and status styling.
 * Palette is greens only: types are told apart by fill/border style + icon,
 * never by hue. Statuses always carry a text label and (where useful) an icon.
 * className values are Tailwind token classes only (no hex/hsl).
 */

export type TypeIconName = 'square' | 'play' | 'ring' | 'dashed'
export type StatusIconName = 'dot' | 'bang' | 'clock' | 'check' | 'circle'

export interface ContentTypeStyle {
  label: string
  /** Fill + text + border classes for a chip/badge/swatch of this type. */
  className: string
  icon: TypeIconName
}

export const CONTENT_TYPE_STYLE: Record<ContentType, ContentTypeStyle> = {
  graphic: {
    label: 'Graphic',
    className: 'bg-type-graphic text-type-graphic-foreground border border-type-graphic',
    icon: 'square',
  },
  video: {
    label: 'Video',
    className: 'bg-type-video text-type-video-foreground border border-type-video-border',
    icon: 'play',
  },
  reel: {
    label: 'Reel',
    className: 'bg-type-reel text-type-reel-foreground border border-transparent',
    icon: 'ring',
  },
  story: {
    label: 'Story',
    className: 'bg-type-story text-type-story-foreground border border-dashed border-type-story-border',
    icon: 'dashed',
  },
}

export type AnyStatus = ContentStatus | TaskStatus

export interface StatusStyle {
  label: string
  className: string
  icon?: StatusIconName
}

const NEUTRAL = 'bg-transparent text-status-neutral-fg border-status-neutral-fg/40'
const ACTIVE = 'bg-status-active text-status-active-fg border-status-active-fg/30'
const REVIEW = 'bg-wash text-primary border-primary/40'
const DONE = 'bg-status-done text-status-done-fg border-status-done-fg/30'
const LATE = 'bg-status-late text-status-late-fg border-status-late-fg/40'

export const STATUS_STYLE: Record<AnyStatus, StatusStyle> = {
  // ContentStatus
  planned: { label: 'Planned', className: NEUTRAL, icon: 'circle' },
  'brief-ready': { label: 'Brief ready', className: ACTIVE },
  'in-design': { label: 'In design', className: ACTIVE },
  'in-editing': { label: 'In editing', className: ACTIVE },
  'ready-for-review': { label: 'Ready for review', className: REVIEW, icon: 'dot' },
  'client-review': { label: 'Client review', className: REVIEW, icon: 'dot' },
  approved: { label: 'Approved', className: DONE, icon: 'check' },
  scheduled: { label: 'Scheduled', className: DONE, icon: 'check' },
  posted: { label: 'Posted', className: DONE, icon: 'check' },
  overdue: { label: 'Overdue', className: LATE, icon: 'bang' },
  // TaskStatus ('overdue' shared above)
  pending: { label: 'Pending', className: NEUTRAL, icon: 'circle' },
  'in-progress': { label: 'In progress', className: ACTIVE },
  done: { label: 'Done', className: DONE, icon: 'check' },
}

/** Use instead of STATUS_STYLE[status] when a not-yet-overdue item is due within the soon window. */
export const DUE_SOON_STYLE: StatusStyle = {
  label: 'Due soon',
  className: 'bg-status-soon text-status-soon-fg border-status-soon-fg/30',
  icon: 'clock',
}

export function getStatusStyle(status: string): StatusStyle {
  return STATUS_STYLE[status as AnyStatus] ?? STATUS_STYLE.planned
}
