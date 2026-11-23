import { a11y, MOTION_CSS, type IllustrationProps } from './types'

export function WavingCharacter({ className, title }: IllustrationProps) {
  return (
    <svg viewBox="0 0 120 120" fill="none" className={className} {...a11y(title)}>
      {title && <title>{title}</title>}
      <style>{MOTION_CSS}</style>
      <ellipse cx="60" cy="110" rx="30" ry="5" fill="var(--c-primary)" opacity=".18" />
      <path d="M26 62C24 34 44 18 62 20c20 2 36 18 34 44-2 26-18 44-37 44S28 90 26 62Z" fill="var(--c-primary)" />
      <path d="M32 40c4-12 14-18 24-19" stroke="var(--c-primary-fg)" strokeOpacity=".5" strokeWidth="4" strokeLinecap="round" />
      <circle cx="49" cy="58" r="4.5" fill="var(--c-primary-fg)" />
      <circle cx="73" cy="58" r="4.5" fill="var(--c-primary-fg)" />
      <circle cx="42" cy="70" r="6" fill="var(--c-wash)" opacity=".45" />
      <circle cx="80" cy="70" r="6" fill="var(--c-wash)" opacity=".45" />
      <path d="M52 71c4 6 14 6 18 0" stroke="var(--c-primary-fg)" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M28 76c-8 2-12 8-10 14" stroke="var(--c-primary)" strokeWidth="9" strokeLinecap="round" />
      <g className="ill-wave">
        <path d="M94 72c8-6 12-16 10-26" stroke="var(--c-primary)" strokeWidth="9" strokeLinecap="round" />
        <circle cx="104" cy="42" r="8" fill="var(--c-mint)" />
      </g>
      <path d="M92 18l3 6 6 3-6 3-3 6-3-6-6-3 6-3 3-6Z" fill="var(--c-mint)" />
    </svg>
  )
}
