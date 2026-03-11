import * as React from "react"
import { cn } from "@/lib/utils"

export interface EmptyStateProps
  extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode
  title: string
  body?: string
  action?: React.ReactNode
}

export function EmptyState({
  icon,
  title,
  body,
  action,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-card border border-dashed border-border bg-surface px-s3 py-s3 text-center",
        className
      )}
      {...props}
    >
      {icon && (
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-cream/60 text-2xl">
          {icon}
        </div>
      )}
      <div className="space-y-1">
        <p className="text-[0.9rem] font-semibold text-ink">{title}</p>
        {body && (
          <p className="text-[0.75rem] leading-relaxed text-muted">{body}</p>
        )}
      </div>
      {action}
    </div>
  )
}

