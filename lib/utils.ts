// ─── Avatar utilities ─────────────────────────────────────────────────────────
// Derived deterministically — no DB storage needed

const PALETTE = [
  'hsl(200,82%,52%)',
  'hsl(268,60%,62%)',
  'hsl(14,72%,58%)',
  'hsl(40,92%,48%)',
  'hsl(161,58%,42%)',
  'hsl(25,82%,58%)',
  'hsl(340,70%,56%)',
  'hsl(190,75%,46%)',
]

/** "Omar Farooq" → "OF" | "Sarah" → "SA" | "" → "?" */
export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/** Same UUID always returns the same color from the palette */
export function getAvatarColor(id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = (hash + id.charCodeAt(i)) % PALETTE.length
  }
  return PALETTE[hash]
}
