'use client'

import { useState, useRef, useEffect } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'

import CreateUserModal from '@/components/CreateUserModal'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { UserAvatar } from '@/components/ui/user-avatar'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import type { Role } from '@/lib/types'

gsap.registerPlugin(useGSAP)

type PageTab = 'workload' | 'manage'

const ROLE_CFG: Record<Role, { label: string; colorClass: string; badgeClass: string }> = {
  admin: { label: 'Admin', colorClass: 'text-sky', badgeClass: 'bg-sky/15 text-sky' },
  writer: { label: 'Writer', colorClass: 'text-lavender', badgeClass: 'bg-lavender/15 text-lavender' },
  designer: { label: 'Designer', colorClass: 'text-coral', badgeClass: 'bg-coral/15 text-coral' },
  videographer: { label: 'Videographer', colorClass: 'text-amber-700', badgeClass: 'bg-lemon/20 text-amber-700' },
  editor: { label: 'Editor', colorClass: 'text-mint', badgeClass: 'bg-mint/15 text-mint' },
  poster: { label: 'Poster', colorClass: 'text-lavender', badgeClass: 'bg-lavender/15 text-lavender' },
  client: { label: 'Client', colorClass: 'text-muted-foreground', badgeClass: 'bg-secondary text-muted-foreground' },
}

const ROLES: Role[] = ['admin', 'writer', 'designer', 'videographer', 'editor', 'poster', 'client']

const ACCESS_BY_ROLE: Record<Role, string[]> = {
  admin: ['Dashboard', 'Calendar', 'Planning', 'Pipeline', 'Team', 'Clients', 'Finance', 'Analytics', 'Ideas', 'Alerts'],
  writer: ['Tasks', 'Calendar', 'Ideas', 'Brief', 'Alerts'],
  designer: ['Tasks', 'Calendar', 'Ideas', 'Brief', 'Alerts'],
  videographer: ['Tasks', 'Calendar', 'Ideas', 'Brief', 'Alerts'],
  editor: ['Tasks', 'Calendar', 'Ideas', 'Brief', 'Alerts'],
  poster: ['Tasks', 'Calendar', 'Brief', 'Alerts'],
  client: ['Client Portal', 'Client Calendar', 'Client Notes', 'Alerts'],
}

type EmployeeRow = {
  id: string
  name: string
  role: Role
  tasks_today: number
  tasks_total: number
  salary: number | null
  email: string | null
  phone: string | null
  joined_at: string | null
  active: boolean
}

type TaskRow = { id: string; assigned_to: string; status: string; client_id: string }
type ContentRow = { id: string; title: string; status: string; assigned_to: string[]; client_id: string }
type ClientRow = { id: string; name: string; brand_color: string }

function FPill({
  label,
  active,
  onClick,
  colorClass,
}: {
  label: string
  active: boolean
  onClick: () => void
  colorClass?: string
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap transition-colors',
        active ? colorClass || 'bg-coral text-white' : 'bg-white/7 text-dark-muted hover:bg-white/10 hover:text-dark-text'
      )}
    >
      {label}
    </button>
  )
}

export default function TeamPage() {
  const gridRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)
  const [pageTab, setPageTab] = useState<PageTab>('workload')
  const [roleFilter, setRoleFilter] = useState<Role | 'all'>('all')
  const [employees, setEmployees] = useState<EmployeeRow[]>([])
  const [tasks, setTasks] = useState<TaskRow[]>([])
  const [content, setContent] = useState<ContentRow[]>([])
  const [clients, setClients] = useState<ClientRow[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editingRole, setEditingRole] = useState<Role | null>(null)
  const [editingSalary, setEditingSalary] = useState('')
  const [showAddMember, setShowAddMember] = useState(false)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const [usrRes, tskRes, cntRes, cliRes] = await Promise.all([
        supabase
          .from('users')
          .select('id, name, role, tasks_today, tasks_total, salary, email, phone, joined_at, active')
          .neq('role', 'client')
          .order('name'),
        supabase.from('tasks').select('id, assigned_to, status, client_id'),
        supabase
          .from('content_pieces')
          .select('id, title, status, assigned_to, client_id')
          .order('created_at', { ascending: false }),
        supabase.from('clients').select('id, name, brand_color'),
      ])
      setEmployees((usrRes.data || []) as EmployeeRow[])
      setTasks((tskRes.data || []) as TaskRow[])
      setContent((cntRes.data || []) as ContentRow[])
      setClients((cliRes.data || []) as ClientRow[])
      setMounted(true)
    }

    void load()
  }, [])

  useGSAP(() => {
    if (!mounted || !gridRef.current) return
    gsap.fromTo(
      '[data-animate="team-item"]',
      { y: 14, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.35, stagger: 0.05, ease: 'back.out(1.2)', clearProps: 'all' }
    )
  }, { dependencies: [mounted, pageTab, roleFilter], scope: gridRef })

  if (!mounted) return null

  const filteredUsers = employees.filter(u => roleFilter === 'all' || u.role === roleFilter)
  const totalPayroll = employees
    .filter(u => u.active !== false && u.salary && Number(u.salary) > 0)
    .reduce((s, u) => s + Number(u.salary), 0)

  async function saveRole(userId: string) {
    if (!editingRole) return
    setEmployees(prev => prev.map(u => (u.id === userId ? { ...u, role: editingRole } : u)))
    setEditingRole(null)
    const supabase = createClient()
    await supabase.from('users').update({ role: editingRole }).eq('id', userId)
  }

  async function saveSalary(userId: string) {
    const amt = parseInt(editingSalary)
    if (isNaN(amt)) return
    setEmployees(prev => prev.map(u => (u.id === userId ? { ...u, salary: amt } : u)))
    setEditingSalary('')
    const supabase = createClient()
    await supabase.from('users').update({ salary: amt }).eq('id', userId)
  }

  async function toggleActive(userId: string) {
    const target = employees.find(u => u.id === userId)
    if (!target) return
    const newActive = !target.active
    setEmployees(prev => prev.map(u => (u.id === userId ? { ...u, active: newActive } : u)))
    const supabase = createClient()
    await supabase.from('users').update({ active: newActive }).eq('id', userId)
  }

  return (
    <main className="page-main flex min-w-0 flex-1 flex-col overflow-y-auto">
      <section className="bg-dark px-5 pt-[18px] pb-0">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex-1">
            <p className="mb-px text-[0.6rem] uppercase tracking-[0.08em] text-dark-muted">Agency</p>
            <h1 className="text-md font-extrabold leading-none text-dark-text">Team</h1>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => setShowAddMember(true)}
              className="bg-sky text-white hover:bg-sky/85"
            >
              Add Member
            </Button>
            <div className="text-right">
              <p className="text-base leading-none font-extrabold text-coral">
                {employees.filter(u => u.active !== false).length}
              </p>
              <p className="mt-0.5 text-[0.56rem] text-dark-muted">active</p>
            </div>
            {totalPayroll > 0 && (
              <>
                <div className="h-6 w-px bg-white/7" />
                <div className="text-right">
                  <p className="text-sm leading-none font-extrabold text-success">
                    ${totalPayroll.toLocaleString()}
                  </p>
                  <p className="mt-0.5 text-[0.56rem] text-dark-muted">payroll/mo</p>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="mb-2.5 flex gap-1.5 overflow-x-auto">
          <FPill label="Everyone" active={roleFilter === 'all'} onClick={() => setRoleFilter('all')} />
          {(['writer', 'designer', 'videographer', 'editor', 'poster'] as Role[]).map(r => (
            <FPill
              key={r}
              label={ROLE_CFG[r].label}
              active={roleFilter === r}
              colorClass={ROLE_CFG[r].badgeClass}
              onClick={() => setRoleFilter(roleFilter === r ? 'all' : r)}
            />
          ))}
        </div>

        <div className="flex border-b border-white/6">
          {([
            ['workload', 'Workload'],
            ['manage', 'Manage'],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setPageTab(key)}
              className={cn(
                'border-b-2 px-[18px] py-[9px] text-xs transition-colors',
                pageTab === key
                  ? 'border-coral text-coral font-bold'
                  : 'border-transparent text-dark-muted font-medium hover:text-dark-text'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      {pageTab === 'workload' && (
        <div ref={gridRef} className="flex-1 p-4">
          <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3">
            {filteredUsers.map(user => {
              const userTasks = tasks.filter(t => t.assigned_to === user.id)
              const doneTasks = userTasks.filter(t => t.status === 'done').length
              const activeTasks = userTasks.filter(t => t.status === 'in-progress').length
              const overdueTasks = userTasks.filter(t => t.status === 'overdue').length
              const pendingTasks = userTasks.filter(t => t.status === 'pending').length
              const totalUser = userTasks.length
              const pct = user.tasks_total > 0 ? Math.round((user.tasks_today / user.tasks_total) * 100) : 0
              const load = pct >= 80 ? 'heavy' : pct >= 50 ? 'medium' : 'light'
              const loadCfg = {
                heavy: {
                  label: 'Heavy',
                  badgeClass: 'bg-danger/15 text-danger',
                  progressClass: '[&_[data-slot=progress-indicator]]:bg-danger',
                },
                medium: {
                  label: 'Medium',
                  badgeClass: 'bg-warning/15 text-warning',
                  progressClass: '[&_[data-slot=progress-indicator]]:bg-warning',
                },
                light: {
                  label: 'Light',
                  badgeClass: 'bg-success/15 text-success',
                  progressClass: '[&_[data-slot=progress-indicator]]:bg-success',
                },
              }[load]

              const clientIds = [...new Set(userTasks.map(t => t.client_id))]
              const userClients = clientIds
                .map(id => clients.find(c => c.id === id))
                .filter(Boolean) as ClientRow[]
              const userContent = content.filter(c => c.assigned_to.includes(user.id)).slice(0, 2)

              return (
                <Card
                  key={user.id}
                  className={cn(
                    'team-item gap-0 overflow-hidden border border-border py-0 shadow-none transition-all hover:-translate-y-1 hover:shadow-md',
                    user.active === false && 'opacity-50'
                  )}
                  data-animate="team-item"
                >
                  <div className="h-1 bg-primary" />
                  <CardContent className="py-4">
                    <div className="mb-3.5 flex items-center gap-3">
                      <UserAvatar userId={user.id} name={user.name} size="lg" className="rounded-[14px]" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[0.95rem] leading-5 font-extrabold text-foreground">{user.name}</p>
                        <Badge className={cn('mt-1 border-0 text-[0.656rem] font-bold', ROLE_CFG[user.role].badgeClass)}>
                          {ROLE_CFG[user.role].label}
                        </Badge>
                      </div>
                      <Badge className={cn('border-0 text-[0.6rem] font-bold', loadCfg.badgeClass)}>
                        {loadCfg.label}
                      </Badge>
                    </div>

                    <div className="mb-3">
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-2xs text-muted-foreground">Workload</span>
                        <span className="text-2xs font-bold text-foreground">
                          {user.tasks_today}/{user.tasks_total} today
                        </span>
                      </div>
                      <Progress
                        value={Math.min(pct, 100)}
                        className={cn('gap-0', loadCfg.progressClass)}
                      />
                    </div>

                    <div className="mb-3 flex flex-wrap gap-1.5">
                      {[
                        { n: activeTasks, label: 'Active', badgeClass: 'bg-sky/15 text-sky' },
                        { n: pendingTasks, label: 'To Do', badgeClass: 'bg-lemon/20 text-amber-700' },
                        { n: overdueTasks, label: 'Overdue', badgeClass: 'bg-danger/15 text-danger' },
                        { n: doneTasks, label: 'Done', badgeClass: 'bg-success/15 text-success' },
                      ]
                        .filter(x => x.n > 0)
                        .map(x => (
                          <Badge key={x.label} className={cn('border-0 text-[0.6rem] font-bold', x.badgeClass)}>
                            {x.n} {x.label}
                          </Badge>
                        ))}
                      {totalUser === 0 && <span className="text-2xs text-ghost">No tasks assigned</span>}
                    </div>

                    {userClients.length > 0 && (
                      <div className="mb-2.5 flex flex-wrap items-center gap-1.5">
                        <span className="text-[0.6rem] text-ghost">Clients:</span>
                        {userClients.map(c => (
                          <div
                            key={c.id}
                            style={{ '--client-color': c.brand_color } as React.CSSProperties}
                            className="flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5"
                          >
                            <div className="size-1.5 rounded-full bg-[var(--client-color)]" />
                            <span className="text-[0.58rem] font-semibold text-muted-foreground">{c.name}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {userContent.length > 0 && (
                      <div className="border-t border-border pt-2.5">
                        <p className="mb-1.5 text-[0.6rem] font-bold uppercase tracking-[0.04em] text-ghost">
                          Recent Work
                        </p>
                        <div className="flex flex-col gap-1">
                          {userContent.map(cp => {
                            const client = clients.find(c => c.id === cp.client_id)
                            return (
                              <div key={cp.id} className="flex items-center gap-1.5">
                                <div
                                  style={{ '--client-color': client?.brand_color || '#ccc' } as React.CSSProperties}
                                  className="size-1.5 shrink-0 rounded-[2px] bg-[var(--client-color)]"
                                />
                                <span className="flex-1 truncate text-xs text-muted-foreground">{cp.title}</span>
                                <span className="shrink-0 text-[0.58rem] capitalize text-ghost">
                                  {cp.status.replace(/-/g, ' ')}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {pageTab === 'manage' && (
        <div ref={gridRef} className="flex-1 p-4">
          <div className="flex flex-col gap-2">
            {filteredUsers.map(user => {
              const rc = ROLE_CFG[user.role]
              const userTasks = tasks.filter(t => t.assigned_to === user.id)
              const isExpanded = expandedId === user.id
              const isInactive = user.active === false

              return (
                <Card
                  key={user.id}
                  className={cn(
                    'team-item gap-0 overflow-hidden py-0 shadow-none',
                    isExpanded ? 'border-coral/60' : 'border-border',
                    isInactive && 'opacity-55'
                  )}
                  data-animate="team-item"
                >
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : user.id)}
                    className="flex items-center gap-3 px-4 py-3 text-left"
                  >
                    <UserAvatar userId={user.id} name={user.name} className="rounded-xl" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-extrabold text-foreground">{user.name}</p>
                        {isInactive && (
                          <Badge className="border-0 bg-danger/10 text-[0.56rem] font-bold text-danger">
                            Inactive
                          </Badge>
                        )}
                      </div>
                      <div className="mt-0.5 flex items-center gap-1.5">
                        <Badge className={cn('border-0 text-[0.58rem] font-bold', rc.badgeClass)}>
                          {rc.label}
                        </Badge>
                        <span className="text-[0.6rem] text-muted-foreground">
                          {userTasks.filter(t => t.status === 'in-progress').length} active tasks
                        </span>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      {user.salary && Number(user.salary) > 0 ? (
                        <p className="text-sm font-extrabold text-success">
                          ${Number(user.salary).toLocaleString()}
                          <span className="text-[0.58rem] font-normal text-muted-foreground">/mo</span>
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground">Owner</p>
                      )}
                      <span className="text-xs text-muted-foreground">{isExpanded ? '▲' : '▼'}</span>
                    </div>
                  </button>

                  {isExpanded && (
                    <div
                      onClick={e => e.stopPropagation()}
                      className="flex flex-col gap-3 border-t border-border bg-background px-4 py-4"
                    >
                      <div className="grid grid-cols-3 gap-1.5">
                        {[
                          { label: 'Email', val: user.email || '—' },
                          { label: 'Phone', val: user.phone || '—' },
                          {
                            label: 'Joined',
                            val: user.joined_at
                              ? new Date(user.joined_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                              : '—',
                          },
                        ].map(f => (
                          <div key={f.label} className="rounded-lg border border-border bg-card px-2.5 py-1.5">
                            <p className="text-[0.56rem] text-muted-foreground">{f.label}</p>
                            <p className="truncate text-[0.66rem] font-semibold text-foreground">{f.val}</p>
                          </div>
                        ))}
                      </div>

                      <div>
                        <p className="mb-1.5 text-[0.6rem] font-bold uppercase tracking-[0.06em] text-ghost">
                          Role
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {ROLES.map(r => (
                            <button
                              key={r}
                              onClick={() => setEditingRole(editingRole === r ? null : r)}
                              className={cn(
                                'rounded-full border px-3 py-1 text-[0.62rem] font-bold transition-colors',
                                (editingRole || user.role) === r
                                  ? `${ROLE_CFG[r].badgeClass} border-transparent`
                                  : 'border-border bg-card text-muted-foreground hover:bg-secondary'
                              )}
                            >
                              {ROLE_CFG[r].label}
                            </button>
                          ))}
                        </div>
                        {editingRole && editingRole !== user.role && (
                          <Button
                            size="xs"
                            onClick={() => saveRole(user.id)}
                            className="mt-1.5 bg-primary text-white"
                          >
                            Save → {ROLE_CFG[editingRole].label}
                          </Button>
                        )}
                      </div>

                      <div>
                        <p className="mb-1.5 text-[0.6rem] font-bold uppercase tracking-[0.06em] text-ghost">
                          Monthly Salary
                        </p>
                        <div className="flex gap-1.5">
                          <Input
                            placeholder={user.salary ? `$${Number(user.salary).toLocaleString()}` : 'Enter amount...'}
                            value={editingSalary}
                            onChange={e => setEditingSalary(e.target.value.replace(/\D/g, ''))}
                            onKeyDown={e => e.key === 'Enter' && saveSalary(user.id)}
                            className="bg-card"
                          />
                          <Button
                            size="sm"
                            onClick={() => saveSalary(user.id)}
                            disabled={!editingSalary}
                            className="bg-success text-white hover:bg-success/85"
                          >
                            Save
                          </Button>
                        </div>
                      </div>

                      <div>
                        <p className="mb-1.5 text-[0.6rem] font-bold uppercase tracking-[0.06em] text-ghost">
                          Access Permissions
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {ACCESS_BY_ROLE[user.role].map(perm => (
                            <Badge
                              key={perm}
                              className="border-0 bg-sky/15 text-[0.6rem] font-semibold text-sky"
                            >
                              {perm}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <Button
                        size="sm"
                        onClick={() => toggleActive(user.id)}
                        className={cn(
                          'self-start',
                          isInactive
                            ? 'bg-success/15 text-success hover:bg-success/25'
                            : 'bg-danger/10 text-danger hover:bg-danger/20'
                        )}
                      >
                        {isInactive ? 'Reactivate account' : 'Deactivate account'}
                      </Button>
                    </div>
                  )}
                </Card>
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
            const supabase = createClient()
            supabase
              .from('users')
              .select('id, name, role, tasks_today, tasks_total, salary, email, phone, joined_at, active')
              .neq('role', 'client')
              .order('name')
              .then(({ data }) => {
                if (data) setEmployees(data as typeof employees)
              })
          }}
        />
      )}
    </main>
  )
}
