'use client'

import { useState, useRef, useEffect } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { createClient } from '@/lib/supabase/client'
import type { Role } from '@/lib/types'
import CreateUserModal from '@/components/CreateUserModal'
import { getInitials, getAvatarColor } from '@/lib/utils'

gsap.registerPlugin(useGSAP)

type PageTab = 'workload' | 'manage'

const ROLE_CFG: Record<Role, { label: string; color: string; bg: string }> = {
  admin:        { label: 'Admin',        color: 'hsl(200,88%,55%)', bg: 'hsl(200,88%,93%)' },
  writer:       { label: 'Writer',       color: 'hsl(270,78%,62%)', bg: 'hsl(270,78%,93%)' },
  designer:     { label: 'Designer',     color: 'hsl(14,72%,56%)',  bg: 'hsl(14,72%,94%)' },
  videographer: { label: 'Videographer', color: 'hsl(40,92%,44%)',  bg: 'hsl(40,92%,93%)' },
  editor:       { label: 'Editor',       color: 'hsl(161,58%,40%)', bg: 'hsl(161,58%,92%)' },
  poster:       { label: 'Poster',       color: 'hsl(268,60%,58%)', bg: 'hsl(268,60%,93%)' },
  client:       { label: 'Client',       color: 'hsl(24,10%,44%)',  bg: 'hsl(42,18%,90%)' },
}

const ROLES: Role[] = ['admin', 'writer', 'designer', 'videographer', 'editor', 'poster', 'client']

const ACCESS_BY_ROLE: Record<Role, string[]> = {
  admin:        ['Dashboard', 'Calendar', 'Planning', 'Pipeline', 'Team', 'Clients', 'Finance', 'Analytics', 'Ideas', 'Alerts'],
  writer:       ['Tasks', 'Calendar', 'Ideas', 'Brief', 'Alerts'],
  designer:     ['Tasks', 'Calendar', 'Ideas', 'Brief', 'Alerts'],
  videographer: ['Tasks', 'Calendar', 'Ideas', 'Brief', 'Alerts'],
  editor:       ['Tasks', 'Calendar', 'Ideas', 'Brief', 'Alerts'],
  poster:       ['Tasks', 'Calendar', 'Brief', 'Alerts'],
  client:       ['Client Portal', 'Client Calendar', 'Client Notes', 'Alerts'],
}

type EmployeeRow = {
  id: string; name: string; role: Role
  tasks_today: number; tasks_total: number; salary: number | null
  email: string | null; phone: string | null; joined_at: string | null; active: boolean
}
type TaskRow    = { id: string; assigned_to: string; status: string; client_id: string }
type ContentRow = { id: string; title: string; status: string; assigned_to: string[]; client_id: string }
type ClientRow  = { id: string; name: string; brand_color: string }

export default function TeamPage() {
  const gridRef  = useRef<HTMLDivElement>(null)
  const [mounted,    setMounted]    = useState(false)
  const [pageTab,    setPageTab]    = useState<PageTab>('workload')
  const [roleFilter, setRoleFilter] = useState<Role | 'all'>('all')
  const [employees,  setEmployees]  = useState<EmployeeRow[]>([])
  const [tasks,      setTasks]      = useState<TaskRow[]>([])
  const [content,    setContent]    = useState<ContentRow[]>([])
  const [clients,    setClients]    = useState<ClientRow[]>([])
  const [expandedId,     setExpandedId]     = useState<string | null>(null)
  const [editingRole,    setEditingRole]    = useState<Role | null>(null)
  const [editingSalary,  setEditingSalary]  = useState('')
  const [showAddMember,  setShowAddMember]  = useState(false)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const [usrRes, tskRes, cntRes, cliRes] = await Promise.all([
        supabase.from('users').select('id, name, role, tasks_today, tasks_total, salary, email, phone, joined_at, active').neq('role', 'client').order('name'),
        supabase.from('tasks').select('id, assigned_to, status, client_id'),
        supabase.from('content_pieces').select('id, title, status, assigned_to, client_id').order('created_at', { ascending: false }),
        supabase.from('clients').select('id, name, brand_color'),
      ])
      setEmployees((usrRes.data || []) as EmployeeRow[])
      setTasks((tskRes.data || []) as TaskRow[])
      setContent((cntRes.data || []) as ContentRow[])
      setClients(cliRes.data || [])
      setMounted(true)
    }
    load()
  }, [])

  useGSAP(() => {
    if (!mounted || !gridRef.current) return
    gsap.fromTo('.team-item',
      { y: 14, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.35, stagger: 0.05, ease: 'back.out(1.2)', clearProps: 'all' }
    )
  }, { dependencies: [mounted, pageTab, roleFilter], scope: gridRef })

  if (!mounted) return null

  const filteredUsers = employees.filter(u => roleFilter === 'all' || u.role === roleFilter)
  const totalPayroll  = employees.filter(u => u.active !== false && u.salary && Number(u.salary) > 0).reduce((s, u) => s + Number(u.salary), 0)

  async function saveRole(userId: string) {
    if (!editingRole) return
    setEmployees(prev => prev.map(u => u.id === userId ? { ...u, role: editingRole } : u))
    setEditingRole(null)
    const supabase = createClient()
    await supabase.from('users').update({ role: editingRole }).eq('id', userId)
  }

  async function saveSalary(userId: string) {
    const amt = parseInt(editingSalary)
    if (isNaN(amt)) return
    setEmployees(prev => prev.map(u => u.id === userId ? { ...u, salary: amt } : u))
    setEditingSalary('')
    const supabase = createClient()
    await supabase.from('users').update({ salary: amt }).eq('id', userId)
  }

  async function toggleActive(userId: string) {
    const target = employees.find(u => u.id === userId)
    if (!target) return
    const newActive = !target.active
    setEmployees(prev => prev.map(u => u.id === userId ? { ...u, active: newActive } : u))
    const supabase = createClient()
    await supabase.from('users').update({ active: newActive }).eq('id', userId)
  }

  return (
    <main className="page-main" style={{ flex: 1, minWidth: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div style={{ background: '#0F1A14', padding: '18px 20px 0', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '0.6rem', color: 'hsl(140,7%,48%)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '1px' }}>Agency</p>
            <h1 style={{ fontSize: '1.167rem', fontWeight: 800, color: 'hsl(42,22%,84%)', lineHeight: 1 }}>Team</h1>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button
              onClick={() => setShowAddMember(true)}
              style={{ padding: '8px 14px', borderRadius: '10px', border: 'none', cursor: 'pointer', background: 'hsl(200,88%,55%)', color: '#fff', fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap' }}
            >
              + Add Member
            </button>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '1rem', fontWeight: 800, color: 'hsl(25,82%,60%)', lineHeight: 1 }}>{employees.filter(u => u.active !== false).length}</p>
              <p style={{ fontSize: '0.56rem', color: 'hsl(140,7%,44%)', marginTop: '2px' }}>active</p>
            </div>
            {totalPayroll > 0 && (
              <>
                <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.07)' }} />
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '0.9rem', fontWeight: 800, color: 'hsl(154,55%,52%)', lineHeight: 1 }}>${totalPayroll.toLocaleString()}</p>
                  <p style={{ fontSize: '0.56rem', color: 'hsl(140,7%,44%)', marginTop: '2px' }}>payroll/mo</p>
                </div>
              </>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '0', marginBottom: '10px' }}>
          <FPill label="Everyone" active={roleFilter === 'all'} onClick={() => setRoleFilter('all')} />
          {(['writer','designer','videographer','editor','poster'] as Role[]).map(r => (
            <FPill key={r} label={ROLE_CFG[r].label} active={roleFilter === r} color={ROLE_CFG[r].color} onClick={() => setRoleFilter(roleFilter === r ? 'all' : r)} />
          ))}
        </div>

        <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          {([['workload', 'Workload'], ['manage', 'Manage']] as const).map(([key, label]) => (
            <button key={key} onClick={() => setPageTab(key)} style={{
              padding: '9px 18px', border: 'none', background: 'transparent', cursor: 'pointer',
              fontSize: '0.75rem', fontWeight: pageTab === key ? 700 : 500,
              color: pageTab === key ? 'hsl(25,82%,62%)' : 'hsl(140,7%,44%)',
              borderBottom: pageTab === key ? '2px solid hsl(25,82%,62%)' : '2px solid transparent',
              transition: 'all 0.15s', marginBottom: '-1px',
            }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── WORKLOAD tab ──────────────────────────────────────────────────── */}
      {pageTab === 'workload' && (
        <div ref={gridRef} style={{ padding: '16px', flex: 1 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
            {filteredUsers.map(user => {
              const userTasks    = tasks.filter(t => t.assigned_to === user.id)
              const doneTasks    = userTasks.filter(t => t.status === 'done').length
              const activeTasks  = userTasks.filter(t => t.status === 'in-progress').length
              const overdueTasks = userTasks.filter(t => t.status === 'overdue').length
              const pendingTasks = userTasks.filter(t => t.status === 'pending').length
              const totalUser    = userTasks.length
              const pct  = user.tasks_total > 0 ? Math.round((user.tasks_today / user.tasks_total) * 100) : 0
              const load = pct >= 80 ? 'heavy' : pct >= 50 ? 'medium' : 'light'
              const loadCfg = {
                heavy:  { label: 'Heavy',  bg: 'hsl(4,78%,93%)',   text: 'hsl(4,72%,45%)',   bar: 'hsl(4,75%,56%)' },
                medium: { label: 'Medium', bg: 'hsl(35,90%,92%)',  text: 'hsl(35,65%,35%)',  bar: 'hsl(35,92%,52%)' },
                light:  { label: 'Light',  bg: 'hsl(154,45%,90%)', text: 'hsl(154,45%,28%)', bar: 'hsl(154,50%,40%)' },
              }[load]

              const clientIds   = [...new Set(userTasks.map(t => t.client_id))]
              const userClients = clientIds.map(id => clients.find(c => c.id === id)).filter(Boolean) as ClientRow[]
              const userContent = content.filter(c => c.assigned_to.includes(user.id)).slice(0, 2)

              return (
                <div
                  key={user.id}
                  className="team-item"
                  style={{
                    background: 'hsl(42,25%,99%)', borderRadius: '16px',
                    border: '1px solid hsl(38,14%,90%)', overflow: 'hidden',
                    opacity: user.active === false ? 0.5 : 1,
                    transition: 'transform 0.15s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.15s ease',
                  }}
                  onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.transform = 'translateY(-3px)'; el.style.boxShadow = `0 12px 32px ${getAvatarColor(user.id)}18` }}
                  onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.transform = ''; el.style.boxShadow = '' }}
                >
                  <div style={{ height: 4, background: getAvatarColor(user.id) }} />
                  <div style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                      <div style={{ width: 48, height: 48, borderRadius: '14px', background: getAvatarColor(user.id), display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '16px', color: '#fff', flexShrink: 0 }}>
                        {getInitials(user.name)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: '0.95rem', fontWeight: 800, color: 'hsl(24,20%,11%)', lineHeight: 1.2 }}>{user.name}</p>
                        <span style={{ display: 'inline-block', marginTop: '3px', padding: '2px 8px', borderRadius: '99px', background: `${ROLE_CFG[user.role].color}20`, color: ROLE_CFG[user.role].color, fontSize: '0.656rem', fontWeight: 700 }}>
                          {ROLE_CFG[user.role].label}
                        </span>
                      </div>
                      <span style={{ padding: '4px 9px', borderRadius: '99px', background: loadCfg.bg, color: loadCfg.text, fontSize: '0.6rem', fontWeight: 700, flexShrink: 0 }}>
                        {loadCfg.label}
                      </span>
                    </div>

                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontSize: '0.656rem', color: 'hsl(24,10%,54%)' }}>Workload</span>
                        <span style={{ fontSize: '0.656rem', fontWeight: 700, color: 'hsl(24,20%,11%)' }}>{user.tasks_today}/{user.tasks_total} today</span>
                      </div>
                      <div style={{ height: 6, borderRadius: '99px', background: 'hsl(42,18%,93%)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${Math.min(pct,100)}%`, borderRadius: '99px', background: loadCfg.bar, transition: 'width 0.8s cubic-bezier(0.34,1.56,0.64,1)' }} />
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', flexWrap: 'wrap' }}>
                      {[
                        { n: activeTasks,  label: 'Active',  color: 'hsl(200,82%,58%)' },
                        { n: pendingTasks, label: 'To Do',   color: 'hsl(40,95%,55%)' },
                        { n: overdueTasks, label: 'Overdue', color: 'hsl(4,75%,56%)' },
                        { n: doneTasks,    label: 'Done',    color: 'hsl(154,50%,40%)' },
                      ].filter(x => x.n > 0).map(x => (
                        <div key={x.label} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '6px', background: `${x.color}14` }}>
                          <div style={{ width: 5, height: 5, borderRadius: '50%', background: x.color }} />
                          <span style={{ fontSize: '0.6rem', fontWeight: 700, color: x.color }}>{x.n}</span>
                          <span style={{ fontSize: '0.6rem', color: 'hsl(24,10%,54%)' }}>{x.label}</span>
                        </div>
                      ))}
                      {totalUser === 0 && <span style={{ fontSize: '0.656rem', color: 'hsl(24,8%,64%)' }}>No tasks assigned</span>}
                    </div>

                    {userClients.length > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                        <span style={{ fontSize: '0.6rem', color: 'hsl(24,8%,64%)' }}>Clients:</span>
                        {userClients.map(c => (
                          <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '2px 7px', borderRadius: '99px', background: 'hsl(42,18%,93%)' }}>
                            <div style={{ width: 5, height: 5, borderRadius: '50%', background: c.brand_color }} />
                            <span style={{ fontSize: '0.58rem', fontWeight: 600, color: 'hsl(24,10%,44%)' }}>{c.name}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {userContent.length > 0 && (
                      <div style={{ borderTop: '1px solid hsl(38,14%,92%)', paddingTop: '10px' }}>
                        <p style={{ fontSize: '0.6rem', fontWeight: 700, color: 'hsl(24,8%,64%)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Recent Work</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {userContent.map(cp => {
                            const client = clients.find(c => c.id === cp.client_id)
                            return (
                              <div key={cp.id} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <div style={{ width: 6, height: 6, borderRadius: '2px', background: client?.brand_color || '#ccc', flexShrink: 0 }} />
                                <span style={{ fontSize: '0.7rem', color: 'hsl(24,10%,44%)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{cp.title}</span>
                                <span style={{ fontSize: '0.58rem', color: 'hsl(24,8%,64%)', flexShrink: 0, textTransform: 'capitalize' }}>{cp.status.replace(/-/g,' ')}</span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── MANAGE tab ────────────────────────────────────────────────────── */}
      {pageTab === 'manage' && (
        <div ref={gridRef} style={{ padding: '16px', flex: 1 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filteredUsers.map(user => {
              const rc         = ROLE_CFG[user.role]
              const userTasks  = tasks.filter(t => t.assigned_to === user.id)
              const isExpanded = expandedId === user.id
              const isInactive = user.active === false

              return (
                <div key={user.id} className="team-item" style={{
                  background: '#fff', borderRadius: '14px',
                  border: isExpanded ? '1.5px solid hsl(25,82%,72%)' : '1px solid hsl(38,14%,90%)',
                  overflow: 'hidden', opacity: isInactive ? 0.55 : 1,
                }}>
                  <div onClick={() => setExpandedId(isExpanded ? null : user.id)} style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                    <div style={{ width: 42, height: 42, borderRadius: '12px', background: getAvatarColor(user.id), display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '13px', color: '#fff', flexShrink: 0 }}>
                      {getInitials(user.name)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <p style={{ fontSize: '0.85rem', fontWeight: 800, color: 'hsl(24,20%,11%)' }}>{user.name}</p>
                        {isInactive && <span style={{ fontSize: '0.56rem', color: 'hsl(4,72%,50%)', fontWeight: 700, padding: '1px 5px', borderRadius: '4px', background: 'hsl(4,72%,94%)' }}>Inactive</span>}
                      </div>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '3px' }}>
                        <span style={{ padding: '1px 7px', borderRadius: '99px', background: rc.bg, color: rc.color, fontSize: '0.58rem', fontWeight: 700 }}>{rc.label}</span>
                        <span style={{ fontSize: '0.6rem', color: 'hsl(24,10%,54%)' }}>{userTasks.filter(t => t.status === 'in-progress').length} active tasks</span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      {user.salary && Number(user.salary) > 0 ? (
                        <p style={{ fontSize: '0.82rem', fontWeight: 800, color: 'hsl(154,50%,36%)' }}>${Number(user.salary).toLocaleString()}<span style={{ fontWeight: 400, fontSize: '0.58rem', color: 'hsl(24,10%,52%)' }}>/mo</span></p>
                      ) : (
                        <p style={{ fontSize: '0.72rem', color: 'hsl(24,10%,56%)' }}>Owner</p>
                      )}
                      <span style={{ fontSize: '0.68rem', color: 'hsl(24,10%,56%)' }}>{isExpanded ? '▲' : '▼'}</span>
                    </div>
                  </div>

                  {isExpanded && (
                    <div onClick={e => e.stopPropagation()} style={{ borderTop: '1px solid hsl(38,14%,92%)', padding: '14px', display: 'flex', flexDirection: 'column', gap: '14px', background: 'hsl(42,28%,98%)' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '6px' }}>
                        {[
                          { label: 'Email',  val: user.email || '—' },
                          { label: 'Phone',  val: user.phone || '—' },
                          { label: 'Joined', val: user.joined_at ? new Date(user.joined_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '—' },
                        ].map(f => (
                          <div key={f.label} style={{ background: '#fff', borderRadius: '8px', padding: '6px 10px', border: '1px solid hsl(38,14%,90%)' }}>
                            <p style={{ fontSize: '0.56rem', color: 'hsl(24,10%,52%)' }}>{f.label}</p>
                            <p style={{ fontSize: '0.66rem', fontWeight: 600, color: 'hsl(24,15%,22%)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.val}</p>
                          </div>
                        ))}
                      </div>

                      <div>
                        <p style={{ fontSize: '0.6rem', fontWeight: 700, color: 'hsl(24,8%,48%)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '7px' }}>Role</p>
                        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                          {ROLES.map(r => (
                            <button key={r} onClick={() => setEditingRole(editingRole === r ? null : r)} style={{
                              padding: '3px 10px', borderRadius: '99px', border: '1.5px solid',
                              borderColor: (editingRole || user.role) === r ? ROLE_CFG[r].color : 'hsl(38,14%,86%)',
                              background: (editingRole || user.role) === r ? ROLE_CFG[r].bg : '#fff',
                              color: (editingRole || user.role) === r ? ROLE_CFG[r].color : 'hsl(24,10%,44%)',
                              fontSize: '0.62rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.1s',
                            }}>
                              {ROLE_CFG[r].label}
                            </button>
                          ))}
                        </div>
                        {editingRole && editingRole !== user.role && (
                          <button onClick={() => saveRole(user.id)} style={{ marginTop: '6px', padding: '5px 12px', borderRadius: '8px', border: 'none', background: ROLE_CFG[editingRole].color, color: '#fff', fontSize: '0.68rem', fontWeight: 700, cursor: 'pointer' }}>
                            Save → {ROLE_CFG[editingRole].label}
                          </button>
                        )}
                      </div>

                      <div>
                        <p style={{ fontSize: '0.6rem', fontWeight: 700, color: 'hsl(24,8%,48%)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '7px' }}>Monthly Salary</p>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <input
                            placeholder={user.salary ? `$${Number(user.salary).toLocaleString()}` : 'Enter amount…'}
                            value={editingSalary}
                            onChange={e => setEditingSalary(e.target.value.replace(/\D/g, ''))}
                            onKeyDown={e => e.key === 'Enter' && saveSalary(user.id)}
                            style={{ flex: 1, padding: '7px 10px', borderRadius: '8px', border: '1.5px solid hsl(38,14%,85%)', background: '#fff', fontSize: '0.78rem', fontFamily: 'inherit', outline: 'none' }}
                          />
                          <button onClick={() => saveSalary(user.id)} disabled={!editingSalary} style={{ padding: '7px 12px', borderRadius: '8px', border: 'none', background: editingSalary ? 'hsl(154,50%,38%)' : 'hsl(42,18%,88%)', color: editingSalary ? '#fff' : 'hsl(24,10%,60%)', fontSize: '0.68rem', fontWeight: 700, cursor: editingSalary ? 'pointer' : 'default' }}>
                            Save
                          </button>
                        </div>
                      </div>

                      <div>
                        <p style={{ fontSize: '0.6rem', fontWeight: 700, color: 'hsl(24,8%,48%)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '7px' }}>Access Permissions</p>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          {ACCESS_BY_ROLE[user.role].map(perm => (
                            <span key={perm} style={{ padding: '2px 7px', borderRadius: '5px', background: 'hsl(200,82%,92%)', color: 'hsl(200,82%,36%)', fontSize: '0.6rem', fontWeight: 600 }}>
                              {perm}
                            </span>
                          ))}
                        </div>
                      </div>

                      <button
                        onClick={() => toggleActive(user.id)}
                        style={{ padding: '7px 14px', borderRadius: '9px', border: 'none', cursor: 'pointer', background: isInactive ? 'hsl(154,50%,92%)' : 'hsl(4,72%,94%)', color: isInactive ? 'hsl(154,50%,36%)' : 'hsl(4,72%,44%)', fontSize: '0.72rem', fontWeight: 700, alignSelf: 'flex-start' }}
                      >
                        {isInactive ? '↺ Reactivate account' : '⊘ Deactivate account'}
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {showAddMember && (
        <CreateUserModal
          mode="team"
          onClose={() => setShowAddMember(false)}
          onSuccess={() => {
            setShowAddMember(false)
            // Reload employees list
            const supabase = createClient()
            supabase.from('users').select('id, name, role, tasks_today, tasks_total, salary, email, phone, joined_at, active').neq('role', 'client').order('name')
              .then(({ data }) => { if (data) setEmployees(data as typeof employees) })
          }}
        />
      )}
    </main>
  )
}

function FPill({ label, active, onClick, color }: { label: string; active: boolean; onClick: () => void; color?: string }) {
  return (
    <button onClick={onClick} style={{
      padding: '4px 11px', borderRadius: '9999px', border: 'none', cursor: 'pointer',
      background: active ? (color || 'hsl(25,82%,60%)') : 'rgba(255,255,255,0.07)',
      color: active ? '#fff' : 'hsl(140,7%,48%)',
      fontSize: '0.72rem', fontWeight: 600, whiteSpace: 'nowrap', transition: 'background 0.15s',
    }}>
      {label}
    </button>
  )
}
