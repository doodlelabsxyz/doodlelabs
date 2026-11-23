import * as React from "react"
import { cva } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { DUE_SOON_STYLE, getStatusStyle, type AnyStatus } from "@/lib/color-map"
import { StatusIcon } from "@/components/ui/type-icon"

const statusBadgeVariants = cva(
  "inline-flex items-center rounded-full border px-s2 py-[3px] text-[0.65rem] font-semibold leading-none gap-1",
  {
    variants: {
      size: {
        sm: "text-[0.6rem] px-s1 py-[2px]",
        md: "",
      },
    },
    defaultVariants: { size: "md" },
  }
)

export interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status?: AnyStatus | null
  size?: "sm" | "md"
  /** Swap to the "due soon" style (active tint + clock icon). */
  dueSoon?: boolean
  children?: React.ReactNode
}

export function StatusBadge({
  status = "planned",
  size,
  dueSoon,
  className,
  children,
  ...props
}: StatusBadgeProps) {
  const style = dueSoon ? DUE_SOON_STYLE : getStatusStyle(status ?? "planned")
  return (
    <span
      className={cn(statusBadgeVariants({ size }), style.className, className)}
      {...props}
    >
      {style.icon && <StatusIcon name={style.icon} className="size-2.5" />}
      {children ?? style.label}
    </span>
  )
}
