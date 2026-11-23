import * as React from "react"
import { cn } from "@/lib/utils"
import type { Platform } from "@/lib/types"

const PLATFORM_LABELS: Record<Platform, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  facebook: "Facebook",
  linkedin: "LinkedIn",
}

export interface PlatformBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement> {
  platform: Platform
  subtle?: boolean
}

export function PlatformBadge({
  platform,
  subtle,
  className,
  ...props
}: PlatformBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-s1.5 py-[2px] text-[0.6rem] font-semibold",
        subtle
          ? "bg-surface text-muted border-border"
          : "bg-wash text-primary border-primary/40",
        className
      )}
      {...props}
    >
      {PLATFORM_LABELS[platform]}
    </span>
  )
}

