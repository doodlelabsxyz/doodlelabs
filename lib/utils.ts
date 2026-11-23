import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getInitials(name: string): string {
  return name.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

// Green-family avatar fills (all dark enough for white text, see getAvatarForeground).
const AVATAR_COLORS = [
  'hsl(145,62%,20%)',
  'hsl(150,45%,28%)',
  'hsl(140,38%,32%)',
  'hsl(160,60%,26%)',
  'hsl(120,28%,30%)',
  'hsl(165,50%,22%)',
]

/** Readable foreground for any getAvatarColor() value. */
export function getAvatarForeground(): string {
  return 'hsl(0,0%,100%)'
}

export function getAvatarColor(id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}
