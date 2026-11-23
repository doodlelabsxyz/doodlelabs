import * as React from "react"
import { cn } from "@/lib/utils"
import type { StatusIconName, TypeIconName } from "@/lib/color-map"

const base = { viewBox: "0 0 12 12", fill: "none", "aria-hidden": true, focusable: false } as const

/** Content-type glyph (square / play / ring / dashed circle). Inherits currentColor. */
export function TypeIcon({ name, className }: { name: TypeIconName; className?: string }) {
  const cls = cn("size-3 shrink-0", className)
  switch (name) {
    case "square":
      return <svg {...base} className={cls}><rect x="2" y="2" width="8" height="8" rx="1.5" fill="currentColor" /></svg>
    case "play":
      return <svg {...base} className={cls}><path d="M3.5 2.2v7.6L9.8 6 3.5 2.2Z" fill="currentColor" /></svg>
    case "ring":
      return <svg {...base} className={cls}><circle cx="6" cy="6" r="3.5" stroke="currentColor" strokeWidth="1.8" /></svg>
    case "dashed":
      return <svg {...base} className={cls}><circle cx="6" cy="6" r="3.8" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2.2 1.8" /></svg>
  }
}

/** Status glyph so meaning never depends on color alone. Inherits currentColor. */
export function StatusIcon({ name, className }: { name: StatusIconName; className?: string }) {
  const cls = cn("size-3 shrink-0", className)
  switch (name) {
    case "dot":
      return <svg {...base} className={cls}><circle cx="6" cy="6" r="2.6" fill="currentColor" /></svg>
    case "circle":
      return <svg {...base} className={cls}><circle cx="6" cy="6" r="3" stroke="currentColor" strokeWidth="1.3" /></svg>
    case "bang":
      return <svg {...base} className={cls}><path d="M6 2.2v4.2M6 9v.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
    case "clock":
      return <svg {...base} className={cls}><circle cx="6" cy="6" r="4" stroke="currentColor" strokeWidth="1.3" /><path d="M6 3.8V6l1.5 1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>
    case "check":
      return <svg {...base} className={cls}><path d="M2.8 6.3 5 8.5l4.2-4.7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
  }
}
