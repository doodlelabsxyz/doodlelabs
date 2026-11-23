'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { UserAvatar } from '@/components/ui/user-avatar'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useOrg } from '@/lib/supabase/OrgContext'
import type { Role } from '@/lib/types'

type Profile = {
  id: string
  name: string
  email: string
  role: string
  phone: string | null
  joined_at: string | null
}

type Member = {
  id: string
  name: string
  email: string
  role: string
  active: boolean
}

type Tab = 'profile' | 'organisation' | 'team' | 'billing'

const LOGO_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
const LOGO_ACCEPT = '.png,.jpg,.jpeg,.webp,.svg,image/png,image/jpeg,image/webp,image/svg+xml'
const LOGO_MAX_BYTES = 2 * 1024 * 1024

function InviteModal({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<Role>('writer')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSend() {
    if (!email || sending) return
    setSending(true)
    setError('')
    const res = await fetch('/api/invite/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, role }),
    })
    const json = await res.json()
    if (!res.ok) {
      setError(json.error ?? 'Failed to send invite.')
      setSending(false)
      return
    }
    setSent(true)
    setSending(false)
  }

  return (
    <Dialog open onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-md gap-4">
        <div className="absolute inset-x-0 top-0 h-1.5 rounded-t-xl bg-primary" />
        <DialogHeader className="pt-2">
          <DialogTitle>Invite team member</DialogTitle>
          <DialogDescription>
            Send access credentials to a new team member.
          </DialogDescription>
        </DialogHeader>

        {!sent ? (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Email</label>
              <Input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="teammate@agency.com"
                className="bg-card"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Role</label>
              <Select value={role} onValueChange={value => setRole(value as Role)}>
                <SelectTrigger className="w-full bg-card">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {(['writer', 'designer', 'videographer', 'editor', 'poster', 'admin', 'client'] as Role[]).map(r => (
                      <SelectItem key={r} value={r}>
                        {r.charAt(0).toUpperCase() + r.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            {error && (
              <p className="rounded-lg bg-danger/10 px-3 py-2 text-xs font-medium text-danger">
                {error}
              </p>
            )}

            <DialogFooter className="sm:justify-between">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleSend} disabled={!email || sending} className="bg-primary text-primary-foreground hover:bg-primary/85">
                {sending ? 'Sending...' : 'Send invite'}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 py-2 text-center">
            <div className="text-4xl">✅</div>
            <div>
              <p className="text-sm font-bold text-foreground">Invite sent to {email}</p>
              <p className="text-xs text-muted-foreground">They can complete setup from the invite email.</p>
            </div>
            <Button onClick={onClose} className="bg-primary text-primary-foreground hover:bg-primary/85">
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default function SettingsPage() {
  const router = useRouter()
  const supabase = createClient()
  const { org, refreshOrg } = useOrg()

  const [activeTab, setActiveTab] = useState<Tab>('profile')
  const [profile, setProfile] = useState<Profile | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [loggingOut, setLoggingOut] = useState(false)
  const [showInvite, setShowInvite] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  const [orgName, setOrgName] = useState('')
  const [orgSlug, setOrgSlug] = useState('')
  const [orgSaving, setOrgSaving] = useState(false)
  const [orgMsg, setOrgMsg] = useState('')

  // Logo lives in the private 'assets' bucket: store the path, display via signed URL
  const logoPath = (org as { logo_path?: string | null } | null)?.logo_path ?? null
  const logoInputRef = useRef<HTMLInputElement>(null)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [logoLoading, setLogoLoading] = useState(false)
  const [logoUploading, setLogoUploading] = useState(false)
  const [logoError, setLogoError] = useState('')
  const shownLogo = logoPreview ?? logoUrl

  useEffect(() => {
    if (!logoPath) return
    let cancelled = false
    async function signLogo() {
      setLogoLoading(true)
      const { data, error } = await createClient()
        .storage.from('assets')
        .createSignedUrl(logoPath as string, 3600)
      if (cancelled) return
      setLogoUrl(data?.signedUrl ?? null)
      if (error) setLogoError('Could not load the current logo.')
      setLogoLoading(false)
    }
    void signLogo()
    return () => {
      cancelled = true
    }
  }, [logoPath])

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      const { data } = await supabase
        .from('users')
        .select('id, name, role, email, phone, joined_at')
        .eq('id', user.id)
        .single()
      if (data) {
        setProfile({ ...data, email: user.email ?? '' })
        setIsAdmin(data.role === 'admin')
      }
    }

    void load()
  }, [router, supabase])

  useEffect(() => {
    if (activeTab !== 'team' || !isAdmin) return
    async function loadMembers() {
      const { data } = await supabase.from('users').select('id, name, email, role, active').order('name')
      if (data) setMembers(data as Member[])
    }
    void loadMembers()
  }, [activeTab, isAdmin, supabase])

  useEffect(() => {
    if (org) {
      const timeoutId = window.setTimeout(() => {
        setOrgName(org.name)
        setOrgSlug(org.slug)
      }, 0)
      return () => window.clearTimeout(timeoutId)
    }
  }, [org])

  async function handleLogout() {
    setLoggingOut(true)
    await supabase.auth.signOut()
  }

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !org || logoUploading) return
    setLogoError('')
    if (!LOGO_TYPES.includes(file.type)) {
      setLogoError('Use a PNG, JPG, WebP or SVG file.')
      return
    }
    if (file.size > LOGO_MAX_BYTES) {
      setLogoError('Logo must be 2MB or smaller.')
      return
    }

    const previewUrl = URL.createObjectURL(file)
    setLogoPreview(previewUrl)
    setLogoUploading(true)

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-')
    const path = `${org.id}/logo/${crypto.randomUUID()}-${safeName}`
    const fail = async (message: string, uploadedPath?: string) => {
      if (uploadedPath) await supabase.storage.from('assets').remove([uploadedPath])
      setLogoError(message)
      setLogoPreview(null)
      URL.revokeObjectURL(previewUrl)
      setLogoUploading(false)
    }

    const { error: upErr } = await supabase.storage
      .from('assets')
      .upload(path, file, { contentType: file.type })
    if (upErr) {
      await fail(`Upload failed: ${upErr.message}`)
      return
    }

    const { error: dbErr } = await supabase
      .from('organizations')
      .update({ logo_path: path })
      .eq('id', org.id)
    if (dbErr) {
      await fail(`Failed to save: ${dbErr.message}`, path)
      return
    }

    const oldPath = logoPath
    await refreshOrg()
    if (oldPath && oldPath !== path) {
      // Best effort: admins may delete objects in their org
      await supabase.storage.from('assets').remove([oldPath])
    }
    setLogoPreview(null)
    URL.revokeObjectURL(previewUrl)
    setLogoUploading(false)
  }

  async function handleSaveOrg() {
    if (!org || orgSaving) return
    setOrgSaving(true)
    setOrgMsg('')
    const { error } = await supabase
      .from('organizations')
      .update({ name: orgName, slug: orgSlug })
      .eq('id', org.id)
    if (error) {
      setOrgMsg(`Failed to save: ${error.message}`)
      setOrgSaving(false)
      return
    }
    await refreshOrg()
    setOrgMsg('Saved.')
    setOrgSaving(false)
    setTimeout(() => setOrgMsg(''), 2500)
  }

  const TABS: { key: Tab; label: string; adminOnly?: boolean }[] = [
    { key: 'profile', label: 'Profile' },
    { key: 'organisation', label: 'Organisation', adminOnly: true },
    { key: 'team', label: 'Team', adminOnly: true },
    { key: 'billing', label: 'Billing', adminOnly: true },
  ]

  const visibleTabs = TABS.filter(t => !t.adminOnly || isAdmin)

  return (
    <main className="page-main flex min-w-0 flex-1 flex-col overflow-y-auto bg-background">
      {showInvite && <InviteModal onClose={() => setShowInvite(false)} />}

      <section className="bg-dark px-5 pt-[18px] pb-4">
        <p className="mb-px text-2xs uppercase tracking-[0.08em] text-dark-muted">Account</p>
        <h1 className="text-md font-extrabold leading-none text-dark-text">Settings</h1>
      </section>

      <div className="border-b border-border bg-card px-4 pt-3">
        <Tabs value={activeTab} onValueChange={value => setActiveTab(value as Tab)}>
          <TabsList variant="line" className="gap-1">
            {visibleTabs.map(t => (
              <TabsTrigger
                key={t.key}
                value={t.key}
                className="px-3 py-2 text-xs data-active:text-foreground data-active:after:bg-primary"
              >
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <div className="mx-auto flex w-full max-w-[520px] flex-col gap-3 p-4">
        {activeTab === 'profile' && profile && (
          <>
            <Card className="border border-border py-0 shadow-none">
              <CardContent className="flex items-center gap-4 border-b border-border py-5">
                <UserAvatar userId={profile.id} name={profile.name} size="lg" />
                <div>
                  <p className="text-lg font-extrabold text-foreground">{profile.name}</p>
                  <p className="mt-0.5 text-xs capitalize text-muted-foreground">{profile.role}</p>
                </div>
              </CardContent>
              <CardContent className="flex flex-col gap-3 py-4">
                {[
                  { label: 'Email', value: profile.email },
                  { label: 'Phone', value: profile.phone ?? '—' },
                  {
                    label: 'Joined',
                    value: profile.joined_at
                      ? new Date(`${profile.joined_at}T00:00:00`).toLocaleDateString('en-US', {
                          month: 'long',
                          year: 'numeric',
                        })
                      : '—',
                  },
                ].map(row => (
                  <div key={row.label} className="flex items-center justify-between gap-4">
                    <span className="text-xs font-semibold text-muted-foreground">{row.label}</span>
                    <span className="text-sm text-foreground">{row.value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border border-border py-0 shadow-none">
              <CardContent className="py-3">
                <p className="mb-2 text-[0.6rem] font-bold uppercase tracking-[0.06em] text-ghost">Account</p>
                <Button
                  variant="ghost"
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="h-auto w-full justify-start gap-3 rounded-xl px-0 py-2 text-left hover:bg-danger/5"
                >
                  <div className="flex size-[34px] shrink-0 items-center justify-center rounded-[10px] bg-danger/10 text-danger">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-danger">
                      {loggingOut ? 'Signing out...' : 'Log Out'}
                    </p>
                    <p className="text-xs text-muted-foreground">Sign out of your account</p>
                  </div>
                </Button>
              </CardContent>
            </Card>
          </>
        )}

        {activeTab === 'organisation' && (
          <Card className="border border-border py-0 shadow-none">
            <CardContent className="flex flex-col gap-4 py-5">
              <p className="text-[0.6rem] font-bold uppercase tracking-[0.06em] text-ghost">
                Agency details
              </p>

              <div className="flex items-center gap-4">
                <div className="relative flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-[14px] border border-dashed border-border bg-wash text-muted">
                  {shownLogo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={shownLogo} alt="Agency logo" className="size-full object-cover" />
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <rect x="3" y="3" width="18" height="18" rx="4" stroke="currentColor" strokeWidth="1.5" />
                      <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
                      <path d="M21 15l-5-5L5 21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                  {(logoUploading || logoLoading) && (
                    <div className="absolute inset-0 flex items-center justify-center bg-card/70">
                      <span className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-foreground">Agency logo</p>
                  <p className="text-xs text-muted-foreground">PNG, JPG, WebP or SVG, up to 2MB</p>
                  {logoError && <p className="mt-1 text-xs font-semibold text-danger">{logoError}</p>}
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept={LOGO_ACCEPT}
                    className="hidden"
                    onChange={handleLogoChange}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => logoInputRef.current?.click()}
                    disabled={logoUploading}
                    className="mt-2 rounded-full"
                  >
                    {logoUploading ? 'Uploading...' : logoPath ? 'Replace logo' : 'Upload logo'}
                  </Button>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Agency name</label>
                <Input value={orgName} onChange={e => setOrgName(e.target.value)} placeholder="Your agency name" className="bg-card" />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Workspace slug</label>
                <Input value={orgSlug} onChange={e => setOrgSlug(e.target.value)} placeholder="your-agency" className="bg-card" />
              </div>

              {orgMsg && (
                <p className={cn('text-xs font-semibold', orgMsg.startsWith('Failed') ? 'text-danger' : 'text-success')}>
                  {orgMsg}
                </p>
              )}

              <Button
                onClick={handleSaveOrg}
                disabled={orgSaving}
                className="rounded-full bg-primary text-primary-foreground hover:bg-primary/85"
              >
                {orgSaving ? 'Saving...' : 'Save changes'}
              </Button>

              <div className="flex items-center justify-between rounded-xl border border-border bg-secondary/40 px-4 py-3">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground">Current plan</p>
                  <p className="text-sm font-extrabold capitalize text-foreground">{org?.plan ?? '—'}</p>
                </div>
                <Link
                  href="/settings/billing"
                  className="inline-flex min-h-11 items-center rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground"
                >
                  Manage billing
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'team' && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {members.length} member{members.length !== 1 ? 's' : ''}
              </p>
              <Button
                onClick={() => setShowInvite(true)}
                className="rounded-full bg-primary text-primary-foreground hover:bg-primary/85"
              >
                Invite member
              </Button>
            </div>

            <Card className="border border-border py-0 shadow-none">
              <CardContent className="py-0">
                {members.length === 0 ? (
                  <div className="py-10 text-center text-sm text-muted-foreground">
                    No team members yet. Invite your first teammate.
                  </div>
                ) : (
                  members.map((m, i) => (
                    <div
                      key={m.id}
                      className={cn(
                        'flex items-center gap-3 py-4',
                        i < members.length - 1 && 'border-b border-border'
                      )}
                    >
                      <UserAvatar userId={m.id} name={m.name} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-foreground">{m.name}</p>
                        <p className="text-xs text-muted-foreground">{m.email}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="border-0 bg-secondary text-xs font-bold capitalize text-foreground">
                          {m.role}
                        </Badge>
                        {!m.active && (
                          <Badge className="border-0 bg-danger/10 text-[0.58rem] font-bold text-danger">
                            Inactive
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'billing' && (
          <Card className="border border-border py-0 shadow-none">
            <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-wash text-primary">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <rect x="2" y="6" width="20" height="14" rx="3" stroke="currentColor" strokeWidth="1.8" />
                  <path d="M2 10h20M6 14h4M16 14h2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </div>
              <div>
                <p className="text-base font-extrabold text-foreground">Billing & Plans</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  View your current plan, compare features, and manage your subscription.
                </p>
              </div>
              <Link
                href="/settings/billing"
                className="inline-flex min-h-11 items-center rounded-full bg-primary px-7 py-3 text-sm font-bold text-primary-foreground"
              >
                Go to Billing
              </Link>
            </CardContent>
          </Card>
        )}

        <div className="py-2 text-center text-[0.65rem] text-ghost">AgencyOS · v2.0</div>
      </div>
    </main>
  )
}
