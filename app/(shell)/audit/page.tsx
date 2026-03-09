'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/supabase/useUser'
import { getInitials, getAvatarColor } from '@/lib/utils'

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

const ACTION_CFG: Record<string, { color: string; bg: string; label: string }> = {
  INSERT: { color: 'hsl(154,55%,38%)', bg: 'hsl(154,55%,92%)', label: 'Created' },
  UPDATE: { color: 'hsl(25,82%,52%)',  bg: 'hsl(25,82%,93%)',  label: 'Updated' },
  DELETE: { color: 'hsl(4,72%,50%)',   bg: 'hsl(4,72%,93%)',   label: 'Deleted' },
}

const ALL_TABLES = ['all', 'content_pieces', 'tasks', 'invoices', 'feedback_comments']
const ALL_ACTIONS = ['all', 'INSERT', 'UPDATE', 'DELETE']

function formatDateTime(s: string): string {
  const d = new Date(s)
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })
}

function DiffView({ oldData, newData }: { oldData: Record<string, unknown> | null; newData: Record<string, unknown> | null }) {
  if (!oldData && !newData) return null

  const keys = Array.from(new Set([
    ...Object.keys(oldData || {}),
    ...Object.keys(newData || {}),
  ])).filter(k => !['id', 'created_at', 'updated_at'].includes(k))

  const changed = keys.filter(k => {
    const o = JSON.stringify((oldData || {})[k])
    const n = JSON.stringify((newData || {})[k])
    return o !== n
  })

  if (changed.length === 0 && oldData) {
    return <p style={{ fontSize: '0.72rem', color: 'hsl(24,10%,54%)', fontStyle: 'italic' }}>No field changes detected</p>
  }

  const displayKeys = oldData ? changed : keys.slice(0, 6)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {displayKeys.map(k => {
        const oldVal = String((oldData || {})[k] ?? '—')
        const newVal = String((newData || {})[k] ?? '—')
        return (
          <div key={k} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', fontSize: '0.72rem' }}>
            <span style={{ color: 'hsl(24,10%,44%)', minWidth: '100px', fontWeight: 600, flexShrink: 0 }}>{k}</span>
            {oldData && (
              <>
                <span style={{ color: 'hsl(4,72%,48%)', textDecoration: 'line-through', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{oldVal.slice(0, 40)}</span>
                <span style={{ color: 'hsl(140,7%,48%)' }}>→</span>
              </>
            )}
            <span style={{ color: 'hsl(154,55%,38%)', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{newVal.slice(0, 60)}</span>
          </div>
        )
      })}
      {oldData && changed.length === 0 && null}
    </div>
  )
}

export default function AuditPage() {
  const router = useRouter()
  const { user } = useUser()

  const [logs,      setLogs]      = useState<AuditRow[]>([])
  const [loading,   setLoading]   = useState(true)
  const [tableFilter, setTableFilter] = useState('all')
  const [actionFilter, setActionFilter] = useState('all')
  const [expanded,  setExpanded]  = useState<string | null>(null)
  const [page,      setPage]      = useState(0)
  const PAGE_SIZE = 40

  const load = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()

    let q = supabase
      .from('audit_log')
      .select('*, actor:actor_id(id, name, role)')
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

    if (tableFilter !== 'all') q = q.eq('table_name', tableFilter)
    if (actionFilter !== 'all') q = q.eq('action', actionFilter)

    const { data } = await q
    setLogs((data || []).map(r => ({
      ...r,
      actor: Array.isArray(r.actor) ? r.actor[0] ?? null : r.actor,
    })) as AuditRow[])
    setLoading(false)
  }, [tableFilter, actionFilter, page])

  useEffect(() => { load() }, [load])

  // Admin guard
  useEffect(() => {
    if (user && user.role !== 'admin') router.replace('/dashboard')
  }, [user, router])

  return (
    <main className="page-main" style={{ flex: 1, minWidth: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ background: '#0F1A14', padding: '18px 20px 14px', flexShrink: 0, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <div style={{ marginBottom: '12px' }}>
          <p style={{ fontSize: '0.656rem', color: 'hsl(140,7%,48%)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '1px' }}>Admin</p>
          <h1 style={{ fontSize: '1.167rem', fontWeight: 800, color: 'hsl(42,22%,84%)', lineHeight: 1 }}>Audit Log</h1>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '9999px', padding: '3px' }}>
            {ALL_TABLES.map(t => (
              <button key={t} onClick={() => { setTableFilter(t); setPage(0) }} style={{
                padding: '3px 10px', borderRadius: '9999px', border: 'none', cursor: 'pointer',
                background: tableFilter === t ? 'hsl(25,82%,60%)' : 'transparent',
                color: tableFilter === t ? '#fff' : 'hsl(140,7%,48%)',
                fontSize: '0.7rem', fontWeight: 600, whiteSpace: 'nowrap',
              }}>
                {t === 'all' ? 'All tables' : TABLE_LABELS[t] || t}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '9999px', padding: '3px' }}>
            {ALL_ACTIONS.map(a => {
              const cfg = a !== 'all' ? ACTION_CFG[a] : null
              return (
                <button key={a} onClick={() => { setActionFilter(a); setPage(0) }} style={{
                  padding: '3px 10px', borderRadius: '9999px', border: 'none', cursor: 'pointer',
                  background: actionFilter === a ? (cfg?.bg || 'hsl(25,82%,60%)') : 'transparent',
                  color: actionFilter === a ? (cfg?.color || '#fff') : 'hsl(140,7%,48%)',
                  fontSize: '0.7rem', fontWeight: 600,
                }}>
                  {a === 'all' ? 'All actions' : cfg?.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Log list */}
      <div style={{ flex: 1, padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'hsl(24,10%,54%)', fontSize: '0.85rem' }}>Loading...</div>
        ) : logs.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 20px', gap: '12px' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'hsl(42,18%,94%)', border: '1.5px dashed hsl(38,14%,85%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>🛡️</div>
            <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'hsl(24,10%,44%)' }}>No audit entries</p>
          </div>
        ) : logs.map(log => {
          const actionCfg = ACTION_CFG[log.action]
          const isOpen = expanded === log.id
          return (
            <div key={log.id} style={{
              background: 'hsl(42,25%,99%)', border: '1px solid hsl(38,14%,90%)',
              borderRadius: '12px', overflow: 'hidden',
            }}>
              {/* Row */}
              <button
                onClick={() => setExpanded(isOpen ? null : log.id)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '11px 14px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
                }}
              >
                {/* Actor avatar */}
                <div style={{
                  width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                  background: log.actor_id ? getAvatarColor(log.actor_id) : 'hsl(24,10%,75%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.6rem', fontWeight: 800, color: '#fff',
                }}>
                  {log.actor ? getInitials(log.actor.name) : '?'}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'hsl(24,20%,11%)' }}>
                      {log.actor?.name || 'System'}
                    </span>
                    <span style={{ padding: '1px 7px', borderRadius: '9999px', background: actionCfg.bg, color: actionCfg.color, fontSize: '0.62rem', fontWeight: 700 }}>
                      {actionCfg.label}
                    </span>
                    <span style={{ padding: '1px 7px', borderRadius: '9999px', background: 'hsl(42,18%,92%)', color: 'hsl(24,10%,44%)', fontSize: '0.62rem', fontWeight: 600 }}>
                      {TABLE_LABELS[log.table_name] || log.table_name}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.7rem', color: 'hsl(24,10%,54%)' }}>{formatDateTime(log.created_at)}</span>
                    <span style={{ fontSize: '0.67rem', color: 'hsl(24,8%,68%)', fontFamily: 'monospace' }}>
                      #{log.record_id.slice(0, 8)}
                    </span>
                  </div>
                </div>

                <span style={{ fontSize: '0.7rem', color: 'hsl(24,10%,64%)', flexShrink: 0, transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▾</span>
              </button>

              {/* Expanded diff */}
              {isOpen && (
                <div style={{ padding: '10px 14px 14px 54px', borderTop: '1px solid hsl(38,14%,92%)' }}>
                  <DiffView oldData={log.old_data} newData={log.new_data} />
                </div>
              )}
            </div>
          )
        })}

        {/* Pagination */}
        {logs.length > 0 && (
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', padding: '12px 0' }}>
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} style={{
              padding: '6px 16px', borderRadius: '9999px', border: '1px solid hsl(38,14%,88%)',
              background: page === 0 ? 'hsl(42,18%,95%)' : 'hsl(42,25%,99%)',
              color: page === 0 ? 'hsl(24,8%,68%)' : 'hsl(24,20%,11%)',
              fontSize: '0.78rem', fontWeight: 600, cursor: page === 0 ? 'default' : 'pointer',
            }}>
              Previous
            </button>
            <span style={{ display: 'flex', alignItems: 'center', fontSize: '0.78rem', color: 'hsl(24,10%,44%)', fontWeight: 600 }}>
              Page {page + 1}
            </span>
            <button onClick={() => setPage(p => p + 1)} disabled={logs.length < PAGE_SIZE} style={{
              padding: '6px 16px', borderRadius: '9999px', border: '1px solid hsl(38,14%,88%)',
              background: logs.length < PAGE_SIZE ? 'hsl(42,18%,95%)' : 'hsl(42,25%,99%)',
              color: logs.length < PAGE_SIZE ? 'hsl(24,8%,68%)' : 'hsl(24,20%,11%)',
              fontSize: '0.78rem', fontWeight: 600, cursor: logs.length < PAGE_SIZE ? 'default' : 'pointer',
            }}>
              Next
            </button>
          </div>
        )}
      </div>
    </main>
  )
}
