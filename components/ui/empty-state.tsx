import * as React from "react"
import { cn } from "@/lib/utils"
import { Illustration, type IllustrationName } from "@/components/illustrations"

export interface EmptyStateProps
  extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode
  /** Preferred over `icon` when provided. */
  illustration?: IllustrationName
  title: string
  body?: string
  action?: React.ReactNode
}

export function EmptyState({
  icon,
  illustration,
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
      {illustration ? (
        <Illustration name={illustration} className="size-28" />
      ) : (
        icon && (
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-wash text-primary text-2xl">
          {icon}
        </div>
        )
      )}
      <div className="space-y-1">
        <p className="text-[0.9rem] font-semibold text-foreground">{title}</p>
        {body && (
          <p className="text-[0.75rem] leading-relaxed text-muted-foreground">{body}</p>
        )}
      </div>
      {action}
    </div>
  )
}

