import * as React from "react"
import { cn, getInitials, getAvatarColor } from "@/lib/utils"

export interface UserAvatarProps
  extends React.HTMLAttributes<HTMLDivElement> {
  userId: string
  name: string
  size?: "sm" | "md" | "lg"
}

export function UserAvatar({
  userId,
  name,
  size = "md",
  className,
  ...props
}: UserAvatarProps) {
  const dimension =
    size === "sm" ? "w-6 h-6 text-[0.6rem]" : size === "lg" ? "w-11 h-11 text-sm" : "w-8 h-8 text-[0.7rem]"

  return (
    <div
      className={cn(
        "inline-flex items-center justify-center rounded-full font-extrabold text-white shrink-0",
        dimension,
        className
      )}
      style={{ background: getAvatarColor(userId) }}
      aria-label={name}
      {...props}
    >
      {getInitials(name)}
    </div>
  )
}

