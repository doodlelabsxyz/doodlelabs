import { a11y, MOTION_CSS, type IllustrationProps } from './types'

export function SleepyCharacter({ className, title }: IllustrationProps) {
  return (
    <svg viewBox="0 0 120 120" fill="none" className={className} {...a11y(title)}>
      {title && <title>{title}</title>}
      <style>{MOTION_CSS}</style>
      <ellipse cx="58" cy="108" rx="38" ry="5" fill="var(--c-primary)" opacity=".25" />
      <g className="ill-float">
        <path d="M16 82c0-24 18-40 42-40s42 16 42 40c0 12-8 22-20 22H36c-12 0-20-10-20-22Z" fill="var(--c-primary)" />
        <path d="M38 70q6 5 12 0M66 70q6 5 12 0" stroke="var(--c-primary-fg)" strokeWidth="3.5" strokeLinecap="round" />
        <ellipse cx="58" cy="85" rx="5" ry="4" fill="var(--c-primary-fg)" opacity=".75" />
        <circle cx="32" cy="82" r="5" fill="var(--c-wash)" opacity=".4" />
        <circle cx="84" cy="82" r="5" fill="var(--c-wash)" opacity=".4" />
        <path d="M20 66c-2-12 4-22 14-26l6 14-20 12Z" fill="var(--c-sage-strong)" />
      </g>
      <path d="M86 34h14l-14 14h14M102 16h9l-9 9h9" stroke="var(--c-primary)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
