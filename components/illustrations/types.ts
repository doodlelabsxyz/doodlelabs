export interface IllustrationProps {
  className?: string
  /** Accessible name. Illustration is decorative (aria-hidden) when omitted. */
  title?: string
}

/** Shared a11y attrs: decorative unless a title is supplied. */
export function a11y(title?: string) {
  return title
    ? ({ role: 'img', 'aria-label': title } as const)
    : ({ 'aria-hidden': true, focusable: false } as const)
}

/** Gentle motion, only when the user has not asked for reduced motion. */
export const MOTION_CSS = `@media (prefers-reduced-motion: no-preference){
.ill-wave{transform-box:fill-box;transform-origin:20% 90%;animation:ill-wave 2.4s ease-in-out infinite}
.ill-float{animation:ill-float 3.6s ease-in-out infinite}
@keyframes ill-wave{0%,60%,100%{transform:rotate(0)}15%{transform:rotate(-16deg)}30%{transform:rotate(10deg)}45%{transform:rotate(-12deg)}}
@keyframes ill-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}}`
