import * as React from "react"
import { cn, getInitials } from "@/lib/utils"

// Green-family avatar fills (token classes, flip with theme).
const AVATAR_STYLES = [
  "bg-primary text-primary-foreground",
  "bg-success text-success-foreground",
  "bg-wash text-primary border border-primary/40",
  "bg-sage text-lemon-ink border border-lemon/60",
  "bg-status-active text-status-active-fg",
  "bg-mint text-dark",
]

function avatarStyle(id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  return AVATAR_STYLES[hash % AVATAR_STYLES.length]
}

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
        "inline-flex items-center justify-center rounded-full font-extrabold shrink-0",
        avatarStyle(userId),
        dimension,
        className
      )}
      aria-label={name}
      {...props}
    >
      {getInitials(name)}
    </div>
  )
}

