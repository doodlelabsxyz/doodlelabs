import * as React from "react"
import { cn } from "@/lib/utils"

export interface FilterPillProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean
}

export function FilterPill({
  active,
  className,
  children,
  ...props
}: FilterPillProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center rounded-full border px-s2 py-[5px] text-[0.72rem] font-semibold transition-colors",
        active
          ? "border-brand bg-brand text-cream shadow-sm"
          : "border-border bg-surface text-muted hover:bg-cream",
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}

