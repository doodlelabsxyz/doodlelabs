// Simple fixed-window rate limiter.
// CAVEAT: state lives in this process's memory. On serverless (Vercel etc.) each
// instance has its own Map and cold starts reset it, so this is best-effort
// throttling only. For hard guarantees use a shared store (Upstash/Redis, Supabase table).
import { NextResponse } from 'next/server'

type Bucket = { count: number; resetAt: number }
const buckets = new Map<string, Bucket>()

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { ok: boolean; retryAfter: number } {
  const now = Date.now()

  // Opportunistic cleanup to bound memory
  if (buckets.size > 5000) {
    for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k)
  }

  const b = buckets.get(key)
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { ok: true, retryAfter: 0 }
  }
  if (b.count >= limit) {
    return { ok: false, retryAfter: Math.max(1, Math.ceil((b.resetAt - now) / 1000)) }
  }
  b.count++
  return { ok: true, retryAfter: 0 }
}

export function clientIp(request: Request): string {
  const xff = request.headers.get('x-forwarded-for')
  return (xff?.split(',')[0]?.trim()) || request.headers.get('x-real-ip') || 'unknown'
}

export function tooMany(retryAfter: number) {
  return NextResponse.json(
    { error: 'Too many requests. Please try again later.' },
    { status: 429, headers: { 'Retry-After': String(retryAfter) } },
  )
}
