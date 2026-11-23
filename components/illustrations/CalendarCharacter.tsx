import { a11y, MOTION_CSS, type IllustrationProps } from './types'

export function CalendarCharacter({ className, title }: IllustrationProps) {
  return (
    <svg viewBox="0 0 120 120" fill="none" className={className} {...a11y(title)}>
      {title && <title>{title}</title>}
      <style>{MOTION_CSS}</style>
      <ellipse cx="60" cy="110" rx="32" ry="5" fill="var(--c-primary)" opacity=".18" />
      <g className="ill-float">
        <rect x="24" y="26" width="72" height="76" rx="16" fill="var(--c-wash)" stroke="var(--c-primary)" strokeWidth="4" />
        <path d="M24 46v-4c0-9 7-16 16-16h40c9 0 16 7 16 16v4H24Z" fill="var(--c-primary)" />
        <rect x="40" y="16" width="7" height="18" rx="3.5" fill="var(--c-sage-strong)" />
        <rect x="73" y="16" width="7" height="18" rx="3.5" fill="var(--c-sage-strong)" />
        <circle cx="49" cy="68" r="3.5" fill="var(--c-fg)" />
        <circle cx="71" cy="68" r="3.5" fill="var(--c-fg)" />
        <path d="M54 80c4 4 8 4 12 0" stroke="var(--c-fg)" strokeWidth="3" strokeLinecap="round" />
        <circle cx="42" cy="78" r="4" fill="var(--c-primary)" opacity=".4" />
        <circle cx="78" cy="78" r="4" fill="var(--c-primary)" opacity=".4" />
        <circle cx="38" cy="92" r="2" fill="var(--c-primary)" />
        <circle cx="82" cy="92" r="2" fill="var(--c-mint)" />
      </g>
      <path d="M102 34l2 4 4 2-4 2-2 4-2-4-4-2 4-2 2-4Z" fill="var(--c-primary)" />
    </svg>
  )
}
