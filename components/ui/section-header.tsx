import * as React from "react"
import { cn } from "@/lib/utils"

export interface SectionHeaderProps
  extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  eyebrow?: string
  action?: React.ReactNode
}

export function SectionHeader({
  title,
  eyebrow,
  action,
  className,
  ...props
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        "mb-2 flex items-center justify-between gap-2",
        className
      )}
      {...props}
    >
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-[0.6rem] font-semibold uppercase tracking-[0.16em] text-muted">
            {eyebrow}
          </p>
        )}
        <h2 className="truncate text-[0.9rem] font-semibold text-ink">
          {title}
        </h2>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

