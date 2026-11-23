'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'

type ToastVariant = 'success' | 'error' | 'info'

interface ToastInput {
  title: string
  description?: string
  variant: ToastVariant
  duration?: number
}

interface ToastItem extends ToastInput {
  id: number
}

interface ToastApi {
  toast: (input: ToastInput) => void
  success: (title: string) => void
  error: (title: string) => void
  info: (title: string) => void
}

const MAX_VISIBLE = 3

const STYLES: Record<ToastVariant, { bg: string; color: string; path: string }> = {
  success: { bg: 'var(--color-status-done)', color: 'var(--color-success)', path: 'M5 13l4 4L19 7' },
  error: { bg: 'var(--color-status-late)', color: 'var(--color-danger)', path: 'M12 8v5m0 3.5v.01' },
  info: { bg: 'var(--color-wash)', color: 'var(--color-primary)', path: 'M12 11v5m0-8.5v.01' },
}

const ToastContext = createContext<ToastApi | null>(null)

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToasterProvider')
  return ctx
}

function ToastView({ item, onDismiss }: { item: ToastItem; onDismiss: (id: number) => void }) {
  const s = STYLES[item.variant]
  const [paused, setPaused] = useState(false)
  const duration = item.duration ?? (item.variant === 'error' ? 6000 : 4000)

  useEffect(() => {
    if (paused) return
    const t = setTimeout(() => onDismiss(item.id), duration)
    return () => clearTimeout(t)
  }, [paused, duration, item.id, onDismiss])

  return (
    <div
      role={item.variant === 'error' ? 'alert' : 'status'}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className="pointer-events-auto flex w-full items-start gap-3 rounded-3xl border border-border px-4 py-3 shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-200 motion-reduce:animate-none"
      style={{ backgroundColor: s.bg }}
    >
      <span
        className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: s.color }}
        aria-hidden="true"
      >
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="var(--color-primary-foreground)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
          <path d={s.path} />
        </svg>
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground">{item.title}</p>
        {item.description && <p className="mt-0.5 text-xs text-muted-foreground">{item.description}</p>}
      </div>
      <button
        type="button"
        onClick={() => onDismiss(item.id)}
        aria-label="Dismiss notification"
        className="flex size-6 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-foreground/10 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary"
      >
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </div>
  )
}

export function ToasterProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const nextId = useRef(1)

  const dismiss = useCallback((id: number) => {
    setItems(prev => prev.filter(i => i.id !== id))
  }, [])

  const toast = useCallback((input: ToastInput) => {
    const id = nextId.current++
    setItems(prev => [...prev, { ...input, id }].slice(-MAX_VISIBLE))
  }, [])

  const api = useMemo<ToastApi>(
    () => ({
      toast,
      success: title => toast({ title, variant: 'success' }),
      error: title => toast({ title, variant: 'error' }),
      info: title => toast({ title, variant: 'info' }),
    }),
    [toast],
  )

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-24 z-[100] mx-auto flex w-full max-w-sm flex-col gap-2 px-4 md:bottom-6"
      >
        {items.map(item => (
          <ToastView key={item.id} item={item} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}
