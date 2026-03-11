import * as React from "react"
import { cn } from "@/lib/utils"
import type { ContentType } from "@/lib/types"

const TYPE_COLORS: Record<ContentType, { bg: string; tint: string; label: string }> = {
  graphic: { bg: "bg-coral", tint: "bg-coral-tint", label: "Graphic" },
  video: { bg: "bg-lemon", tint: "bg-lemon-tint", label: "Video" },
  reel: { bg: "bg-mint", tint: "bg-mint-tint", label: "Reel" },
  story: { bg: "bg-lavender", tint: "bg-lavender-tint", label: "Story" },
}

export interface ContentCardProps
  extends React.HTMLAttributes<HTMLDivElement> {
  type: ContentType
  title: string
  meta?: string
  statusBadge?: React.ReactNode
  compact?: boolean
}

export function ContentCard({
  type,
  title,
  meta,
  statusBadge,
  compact,
  className,
  children,
  ...props
}: ContentCardProps) {
  const cfg = TYPE_COLORS[type]

  return (
    <div
      className={cn(
        "rounded-card border border-border bg-surface hover:shadow-sm transition-[transform,box-shadow] duration-150 ease-out cursor-pointer",
        "flex flex-col",
        !compact && "p-s2",
        compact && "p-2",
        className
      )}
      {...props}
    >
      <div className="flex items-start gap-2">
        <div
          className={cn(
            "h-6 min-w-5 rounded-[6px] flex items-center justify-center text-[0.6rem] font-semibold text-white",
            cfg.bg
          )}
        >
          {cfg.label[0]}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[0.8rem] font-semibold text-ink leading-snug">
            {title}
          </p>
          {meta && (
            <p className="mt-0.5 line-clamp-2 text-[0.7rem] text-muted">
              {meta}
            </p>
          )}
        </div>
        {statusBadge}
      </div>
      {children && (
        <div className="mt-2 text-[0.7rem] text-muted">{children}</div>
      )}
    </div>
  )
}

