'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { UserAvatar } from '@/components/ui/user-avatar'
import { PlanUpgradeWall } from '@/components/PlanUpgradeWall'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/supabase/useUser'
import { usePlanGate } from '@/lib/hooks/usePlanGate'
import { cn } from '@/lib/utils'

type AuditRow = {
  id: string
  table_name: string
  record_id: string
  action: 'INSERT' | 'UPDATE' | 'DELETE'
  actor_id: string | null
  old_data: Record<string, unknown> | null
  new_data: Record<string, unknown> | null
  created_at: string
  actor?: { id: string; name: string; role: string }
}

const TABLE_LABELS: Record<string, string> = {
  content_pieces: 'Content',
  tasks: 'Task',
  invoices: 'Invoice',
  feedback_comments: 'Feedback',
}

const ACTION_CFG: Record<
  AuditRow['action'],
  { label: string; badgeClass: string; diffTextClass: string }
> = {
  INSERT: {
    label: 'Created',
    badgeClass: 'bg-status-done text-status-done-fg',
    diffTextClass: 'text-success',
  },
  UPDATE: {
    label: 'Updated',
    badgeClass: 'bg-wash text-primary',
    diffTextClass: 'text-primary',
  },
  DELETE: {
    label: 'Deleted',
    badgeClass: 'bg-status-late text-status-late-fg',
    diffTextClass: 'text-danger',
  },
}

const ALL_TABLES = ['all', 'content_pieces', 'tasks', 'invoices', 'feedback_comments'] as const
const ALL_ACTIONS = ['all', 'INSERT', 'UPDATE', 'DELETE'] as const

function formatDateTime(s: string): string {
  const d = new Date(s)
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

function FilterChip({
  active,
  children,
  onClick,
  activeClassName,
}: {
  active: boolean
  children: React.ReactNode
  onClick: () => void
  activeClassName?: string
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap transition-colors',
        active
          ? activeClassName || 'bg-mint text-dark'
          : 'bg-transparent text-dark-muted hover:bg-white/8 hover:text-dark-text'
      )}
    >
      {children}
    </button>
  )
}

function DiffView({
  oldData,
  newData,
}: {
  oldData: Record<string, unknown> | null
  newData: Record<string, unknown> | null
}) {
  if (!oldData && !newData) return null

  const keys = Array.from(
    new Set([...Object.keys(oldData || {}), ...Object.keys(newData || {})])
  ).filter(k => !['id', 'created_at', 'updated_at'].includes(k))

  const changed = keys.filter(k => {
    const before = JSON.stringify((oldData || {})[k])
    const after = JSON.stringify((newData || {})[k])
    return before !== after
  })

  if (changed.length === 0 && oldData) {
    return <p className="text-xs italic text-muted-foreground">No field changes detected</p>
  }

  const displayKeys = oldData ? changed : keys.slice(0, 6)

  return (
    <div className="flex flex-col gap-1">
      {displayKeys.map(k => {
        const oldVal = String((oldData || {})[k] ?? '—')
        const newVal = String((newData || {})[k] ?? '—')

        return (
          <div key={k} className="flex items-start gap-2 text-xs">
            <span className="min-w-[100px] shrink-0 font-semibold text-muted-foreground">{k}</span>
            {oldData && (
              <>
                <span className="max-w-[120px] truncate text-danger line-through">{oldVal.slice(0, 40)}</span>
                <span className="text-dark-muted">→</span>
              </>
            )}
            <span className="max-w-[160px] truncate text-success">{newVal.slice(0, 60)}</span>
          </div>
        )
      })}
    </div>
  )
}

export default function AuditPage() {
  const router = useRouter()
  const { user } = useUser()
  const { allowed: auditAllowed, requiredPlan, loading: gateLoading } = usePlanGate('hasAudit')

  const [logs, setLogs] = useState<AuditRow[] | null>(null)
  const [tableFilter, setTableFilter] = useState<(typeof ALL_TABLES)[number]>('all')
  const [actionFilter, setActionFilter] = useState<(typeof ALL_ACTIONS)[number]>('all')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 40
  const [error, setError] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const loading = logs === null && !error

  useEffect(() => {
    let ignore = false

    async function load() {
      setError(false)
      const supabase = createClient()

      let q = supabase
        .from('audit_log')
        .select('*, actor:actor_id(id, name, role)')
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

      if (tableFilter !== 'all') q = q.eq('table_name', tableFilter)
      if (actionFilter !== 'all') q = q.eq('action', actionFilter)

      const { data, error: qErr } = await q.then(r => r, () => ({ data: null, error: new Error('network') }))
      if (ignore) return
      if (qErr) {
        setError(true)
        return
      }

      setLogs(
        ((data || []).map(r => ({
          ...r,
          actor: Array.isArray(r.actor) ? r.actor[0] ?? null : r.actor,
        })) as AuditRow[])
      )
    }

    void load()

    return () => {
      ignore = true
    }
  }, [tableFilter, actionFilter, page, reloadKey])

  useEffect(() => {
    if (user && user.role !== 'admin') router.replace('/dashboard')
  }, [user, router])

  if (!gateLoading && !auditAllowed) return <PlanUpgradeWall feature="Audit Log" requiredPlan={requiredPlan} />

  return (
    <main className="page-main flex min-w-0 flex-1 flex-col overflow-y-auto">
      <section className="border-b border-white/4 bg-dark px-5 pt-[18px] pb-[14px]">
        <div className="mb-3">
          <p className="mb-px text-2xs uppercase tracking-[0.08em] text-dark-muted">Admin</p>
          <h1 className="text-md font-extrabold leading-none text-dark-text">Audit Log</h1>
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="flex flex-wrap gap-1 rounded-full bg-white/5 p-[3px]">
            {ALL_TABLES.map(t => (
              <FilterChip
                key={t}
                active={tableFilter === t}
                onClick={() => {
                  setTableFilter(t)
                  setPage(0)
                  setExpanded(null)
                }}
              >
                {t === 'all' ? 'All tables' : TABLE_LABELS[t] || t}
              </FilterChip>
            ))}
          </div>

          <div className="flex flex-wrap gap-1 rounded-full bg-white/5 p-[3px]">
            {ALL_ACTIONS.map(a => {
              const cfg = a !== 'all' ? ACTION_CFG[a] : null
              return (
                <FilterChip
                  key={a}
                  active={actionFilter === a}
                  activeClassName={cfg?.badgeClass}
                  onClick={() => {
                    setActionFilter(a)
                    setPage(0)
                    setExpanded(null)
                  }}
                >
                  {a === 'all' ? 'All actions' : cfg?.label}
                </FilterChip>
              )
            })}
          </div>
        </div>
      </section>

      <div className="flex flex-1 flex-col gap-2 p-4">
        {gateLoading || loading ? (
          <div className="flex flex-col gap-2" aria-busy="true" aria-label="Loading audit log">
            {Array.from({ length: 8 }, (_, i) => (
              <Skeleton key={i} className="h-[60px] w-full rounded-xl" />
            ))}
          </div>
        ) : error || !logs ? (
          <Card className="border border-dashed border-border bg-card shadow-none" role="alert">
            <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
              <p className="text-sm font-semibold text-foreground">Couldn&apos;t load the audit log</p>
              <p className="text-xs text-muted-foreground">Something went wrong. Please try again.</p>
              <Button
                variant="outline"
                className="rounded-full"
                onClick={() => {
                  setError(false)
                  setReloadKey(k => k + 1)
                }}
              >
                Try again
              </Button>
            </CardContent>
          </Card>
        ) : logs.length === 0 ? (
          <Card className="border border-dashed border-border bg-card shadow-none">
            <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
              <div className="flex size-14 items-center justify-center rounded-2xl border border-dashed border-border bg-secondary text-[22px]">
                🛡️
              </div>
              <p className="text-sm font-semibold text-muted-foreground">No audit entries</p>
            </CardContent>
          </Card>
        ) : (
          logs.map(log => {
            const actionCfg = ACTION_CFG[log.action]
            const isOpen = expanded === log.id

            return (
              <Card key={log.id} className="gap-0 py-0 shadow-none">
                <button
                  onClick={() => setExpanded(isOpen ? null : log.id)}
                  className="flex w-full items-center gap-3 bg-transparent px-4 py-3 text-left"
                >
                  {log.actor && log.actor_id ? (
                    <UserAvatar userId={log.actor_id} name={log.actor.name} size="sm" />
                  ) : (
                    <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-ghost text-[0.6rem] font-extrabold text-background">
                      ?
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="mb-0.5 flex flex-wrap items-center gap-1.5">
                      <span className="text-sm font-bold text-foreground">
                        {log.actor?.name || 'System'}
                      </span>
                      <Badge className={cn('border-0 text-[0.62rem] font-bold', actionCfg.badgeClass)}>
                        {actionCfg.label}
                      </Badge>
                      <Badge className="border-0 bg-secondary text-[0.62rem] font-semibold text-muted-foreground">
                        {TABLE_LABELS[log.table_name] || log.table_name}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span>{formatDateTime(log.created_at)}</span>
                      <span className="font-mono text-[0.67rem] text-ghost">#{log.record_id.slice(0, 8)}</span>
                    </div>
                  </div>

                  <span
                    className={cn(
                      'shrink-0 text-xs text-ghost transition-transform duration-200',
                      isOpen && 'rotate-180'
                    )}
                  >
                    ▾
                  </span>
                </button>

                {isOpen && (
                  <div className="border-t border-border px-4 pt-3 pb-4 pl-[54px]">
                    <DiffView oldData={log.old_data} newData={log.new_data} />
                  </div>
                )}
              </Card>
            )
          })
        )}

        {!error && logs && logs.length > 0 && (
          <div className="flex items-center justify-center gap-2 py-3">
            <Button
              variant="outline"
              onClick={() => {
                setPage(p => Math.max(0, p - 1))
                setExpanded(null)
              }}
              disabled={page === 0}
              className="rounded-full"
            >
              Previous
            </Button>
            <span className="text-sm font-semibold text-muted-foreground">Page {page + 1}</span>
            <Button
              variant="outline"
              onClick={() => {
                setPage(p => p + 1)
                setExpanded(null)
              }}
              disabled={logs.length < PAGE_SIZE}
              className="rounded-full"
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </main>
  )
}
