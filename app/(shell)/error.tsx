'use client'

import { useEffect } from 'react'

import { Button } from '@/components/ui/button'

export default function ShellError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Keep the raw error in the console for debugging; never render it to the user.
    console.error(error)
  }, [error])

  return (
    <main className="flex min-w-0 flex-1 flex-col items-center justify-center gap-4 bg-background px-6 py-12 text-center">
      <div
        aria-hidden="true"
        className="flex size-16 items-center justify-center rounded-2xl bg-coral-tint text-2xl"
      >
        !
      </div>
      <div className="space-y-1.5">
        <h1 className="text-[1.1rem] font-extrabold text-foreground">Something went sideways</h1>
        <p className="text-[0.85rem] leading-relaxed text-muted-foreground">
          We hit a snag loading this page. Give it another try.
        </p>
      </div>
      <Button
        onClick={() => reset()}
        className="h-11 rounded-full bg-primary px-6 text-sm font-bold text-foreground hover:bg-primary/85"
      >
        Try again
      </Button>
    </main>
  )
}
