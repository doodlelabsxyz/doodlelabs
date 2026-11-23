import Link from 'next/link'

export default function ShellNotFound() {
  return (
    <main className="flex min-w-0 flex-1 flex-col items-center justify-center gap-4 bg-background px-6 py-12 text-center">
      <div
        aria-hidden="true"
        className="flex size-16 items-center justify-center rounded-2xl bg-wash text-lg font-extrabold text-sky-ink"
      >
        404
      </div>
      <div className="space-y-1.5">
        <h1 className="text-[1.1rem] font-extrabold text-foreground">We couldn&apos;t find that page</h1>
        <p className="text-[0.85rem] leading-relaxed text-muted-foreground">
          It may have moved, or the link may be out of date.
        </p>
      </div>
      <Link
        href="/dashboard"
        className="inline-flex h-11 items-center justify-center rounded-full bg-primary px-6 text-sm font-bold text-foreground no-underline transition-colors hover:bg-primary/85"
      >
        Back to dashboard
      </Link>
    </main>
  )
}
