import * as React from "react"
import { cn } from "@/lib/utils"
import type { ContentType } from "@/lib/types"
import { CONTENT_TYPE_STYLE } from "@/lib/color-map"
import { TypeIcon } from "@/components/ui/type-icon"

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
  const cfg = CONTENT_TYPE_STYLE[type]

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
            "h-6 min-w-6 rounded-[6px] flex items-center justify-center",
            cfg.className
          )}
          role="img"
          aria-label={cfg.label}
          title={cfg.label}
        >
          <TypeIcon name={cfg.icon} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[0.8rem] font-semibold text-foreground leading-snug">
            {title}
          </p>
          {meta && (
            <p className="mt-0.5 line-clamp-2 text-[0.7rem] text-muted-foreground">
              {meta}
            </p>
          )}
        </div>
        {statusBadge}
      </div>
      {children && (
        <div className="mt-2 text-[0.7rem] text-muted-foreground">{children}</div>
      )}
    </div>
  )
}

