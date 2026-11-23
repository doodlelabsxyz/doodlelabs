import { Skeleton } from '@/components/ui/skeleton'

export default function ShellLoading() {
  return (
    <main
      role="status"
      aria-live="polite"
      className="flex min-w-0 flex-1 flex-col gap-3.5 overflow-y-auto bg-background px-4 py-5"
    >
      <span className="sr-only">Loading</span>

      <Skeleton className="h-14 w-full rounded-2xl bg-wash" />

      <Skeleton className="h-4 w-1/3 rounded-full bg-sage" />

      <div className="flex flex-col gap-3">
        <Skeleton className="h-28 w-full rounded-3xl border border-border bg-card" />
        <Skeleton className="h-28 w-full rounded-3xl border border-border bg-card" />
        <Skeleton className="h-28 w-full rounded-3xl border border-border bg-card" />
      </div>
    </main>
  )
}
