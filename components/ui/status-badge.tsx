import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const statusBadgeVariants = cva(
  "inline-flex items-center rounded-full border px-s2 py-[3px] text-[0.65rem] font-semibold leading-none gap-1",
  {
    variants: {
      status: {
        planned:            "bg-sky-tint text-sky border-sky/40",
        "brief-ready":      "bg-sky-tint text-sky border-sky/40",
        "in-design":        "bg-coral-tint text-coral border-coral/35",
        "in-editing":       "bg-lemon-tint text-lemon border-lemon/40",
        "ready-for-review": "bg-lavender-tint text-lavender border-lavender/35",
        "client-review":    "bg-lavender-tint text-lavender border-lavender/35",
        approved:           "bg-success/10 text-success border-success/40",
        scheduled:          "bg-mint-tint text-mint border-mint/35",
        posted:             "bg-brand-light text-brand border-brand/40",
        overdue:            "bg-danger/10 text-danger border-danger/40",
      },
      size: {
        sm: "text-[0.6rem] px-s1 py-[2px]",
        md: "",
      },
    },
    defaultVariants: {
      status: "planned",
      size: "md",
    },
  }
)

export interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof statusBadgeVariants> {
  children?: React.ReactNode
}

export function StatusBadge({
  status,
  size,
  className,
  children,
  ...props
}: StatusBadgeProps) {
  return (
    <span
      className={cn(statusBadgeVariants({ status, size }), className)}
      {...props}
    >
      {children}
    </span>
  )
}

