import { a11y, MOTION_CSS, type IllustrationProps } from './types'

export function CelebrateCharacter({ className, title }: IllustrationProps) {
  return (
    <svg viewBox="0 0 120 120" fill="none" className={className} {...a11y(title)}>
      {title && <title>{title}</title>}
      <style>{MOTION_CSS}</style>
      <ellipse cx="60" cy="110" rx="28" ry="5" fill="var(--c-success)" opacity=".2" />
      <g className="ill-float">
        <path d="M28 70c-2-26 14-42 32-42s34 16 32 42c-2 22-16 38-32 38S30 92 28 70Z" fill="var(--c-mint)" />
        <path d="M46 56q5-6 10 0M66 56q5-6 10 0" stroke="var(--color-dark)" strokeWidth="3.5" strokeLinecap="round" />
        <path d="M48 70c2 12 22 12 24 0H48Z" fill="var(--color-dark)" />
        <path d="M54 77c3 3 9 3 12 0" stroke="var(--c-primary)" strokeWidth="3" strokeLinecap="round" />
        <circle cx="40" cy="68" r="5" fill="var(--c-primary)" opacity=".45" />
        <circle cx="80" cy="68" r="5" fill="var(--c-primary)" opacity=".45" />
        <path d="M30 70c-8-6-12-14-10-24M90 70c8-6 12-14 10-24" stroke="var(--c-mint)" strokeWidth="9" strokeLinecap="round" />
      </g>
      <path d="M48 30l12-16 12 16-12-6-12 6Z" fill="var(--c-primary)" />
      <circle cx="12" cy="30" r="4" fill="var(--c-primary)" />
      <circle cx="108" cy="24" r="4" fill="var(--c-primary)" />
      <rect x="14" y="60" width="8" height="4" rx="2" fill="var(--c-sage-strong)" transform="rotate(-30 18 62)" />
      <rect x="100" y="64" width="8" height="4" rx="2" fill="var(--c-primary)" transform="rotate(30 104 66)" />
      <path d="M100 96l2 4 4 2-4 2-2 4-2-4-4-2 4-2 2-4Z" fill="var(--c-success)" />
    </svg>
  )
}
