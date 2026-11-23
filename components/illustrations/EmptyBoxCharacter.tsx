import { a11y, MOTION_CSS, type IllustrationProps } from './types'

export function EmptyBoxCharacter({ className, title }: IllustrationProps) {
  return (
    <svg viewBox="0 0 120 120" fill="none" className={className} {...a11y(title)}>
      {title && <title>{title}</title>}
      <style>{MOTION_CSS}</style>
      <ellipse cx="60" cy="108" rx="36" ry="5" fill="var(--c-sage-strong)" opacity=".25" />
      <path d="M18 54l42-16 42 16-42 16-42-16Z" fill="var(--c-wash)" />
      <path d="M18 54v34c0 3 2 5 5 6l32 12V70L18 54Z" fill="var(--c-sage-strong)" />
      <path d="M102 54v34c0 3-2 5-5 6l-32 12V70l37-16Z" fill="var(--c-mint)" />
      <g className="ill-float">
        <circle cx="60" cy="30" r="14" fill="var(--c-primary)" />
        <circle cx="55" cy="28" r="2.5" fill="var(--c-primary-fg)" />
        <circle cx="65" cy="28" r="2.5" fill="var(--c-primary-fg)" />
        <path d="M55 35c3 3 7 3 10 0" stroke="var(--c-primary-fg)" strokeWidth="2.5" strokeLinecap="round" />
      </g>
      <circle cx="38" cy="86" r="2.5" fill="var(--c-bg)" opacity=".7" />
      <circle cx="86" cy="80" r="2" fill="var(--c-bg)" opacity=".7" />
      <path d="M96 22l2 4 4 2-4 2-2 4-2-4-4-2 4-2 2-4Z" fill="var(--c-primary)" />
    </svg>
  )
}
