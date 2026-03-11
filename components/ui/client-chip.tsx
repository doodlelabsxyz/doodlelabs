import * as React from "react"
import { cn } from "@/lib/utils"

export interface ClientChipProps
  extends React.HTMLAttributes<HTMLDivElement> {
  name: string
  color: string
}

export function ClientChip({
  name,
  color,
  className,
  ...props
}: ClientChipProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-surface px-s2 py-[3px]",
        "border border-border text-[0.7rem] font-medium text-muted",
        className
      )}
      {...props}
    >
      <span
        className="h-2 w-2 rounded-[4px]"
        style={{ backgroundColor: color }}
      />
      <span className="truncate max-w-40">{name}</span>
    </div>
  )
}

