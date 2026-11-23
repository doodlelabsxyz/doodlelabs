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
        "relative inline-flex min-h-9 items-center rounded-full border px-s2 py-[5px] text-[0.72rem] font-semibold transition-colors before:absolute before:-inset-1 before:content-[''] pointer-coarse:min-h-11 pointer-coarse:before:hidden",
        active
          ? "border-primary bg-primary text-primary-foreground shadow-sm"
          : "border-border bg-surface text-muted hover:bg-wash",
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}

