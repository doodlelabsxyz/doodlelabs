import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getInitials(name: string): string {
  return name.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

const AVATAR_COLORS = [
  'hsl(25,82%,60%)',
  'hsl(200,82%,55%)',
  'hsl(161,58%,44%)',
  'hsl(268,60%,60%)',
  'hsl(4,72%,55%)',
  'hsl(40,92%,48%)',
  'hsl(14,72%,56%)',
  'hsl(210,70%,50%)',
]

export function getAvatarColor(id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}
