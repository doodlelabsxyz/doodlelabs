'use client'

import { useState } from 'react'
import type { Role } from '@/lib/types'
import {
  Dialog,
  DialogContent,
  DialogClose,
} from '@/components/ui/dialog'

const TEAM_ROLES: Role[] = ['admin', 'writer', 'designer', 'videographer', 'editor', 'poster']

type Props =
  | { mode: 'client'; clientId: string; clientName: string; defaultEmail?: string; onClose: () => void; onSuccess: () => void }
  | { mode: 'team';   clientId?: never;  clientName?: never; defaultEmail?: string; onClose: () => void; onSuccess: () => void }

export default function CreateUserModal(props: Props) {
  const { mode, onClose, onSuccess } = props

  const [name,      setName]      = useState(mode === 'client' ? (props.clientName ?? '') : '')
  const [email,     setEmail]     = useState(props.defaultEmail ?? '')
  const [password,  setPassword]  = useState('')
  const [role,      setRole]      = useState<Role>(mode === 'client' ? 'client' : 'writer')
  const [showPass,  setShowPass]  = useState(false)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')
  const [done,      setDone]      = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password || !name) { setError('All fields are required.'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }

    setLoading(true)
    setError('')

    const res = await fetch('/api/create-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        name,
        role,
        clientId: mode === 'client' ? props.clientId : undefined,
      }),
    })

    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error ?? 'Something went wrong.')
    } else {
      setDone(true)
    }
  }

  function handleDone() {
    onSuccess()
    onClose()
  }


  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent
        showCloseButton={false}
        className="max-w-md p-0 gap-0 overflow-hidden rounded-2xl ring-0 bg-card"
      >
        {/* Top bar */}
        <div className="h-1.5 bg-primary" />

        {done ? (
          /* ── Success state ── */
          <div className="p-6 flex flex-col items-center gap-4 text-center">
            <div className="w-14 h-14 rounded-full flex items-center justify-center text-2xl bg-wash text-primary">
              ✓
            </div>
            <div>
              <p className="text-lg font-extrabold text-foreground mb-1">Account Created</p>
              <p className="text-sm text-muted-foreground">Share these credentials with {mode === 'client' ? 'the client' : 'the team member'}.</p>
            </div>

            {/* Credentials box */}
            <div className="w-full rounded-xl border border-border bg-secondary/50 p-4 text-left flex flex-col gap-2">
              <CredRow label="Email" value={email} />
              <CredRow label="Password" value={password} />
              <CredRow label="Login URL" value={typeof window !== 'undefined' ? window.location.origin + '/login' : '/login'} />
            </div>

            <p className="text-xs text-muted-foreground">Copy these now — the password won&apos;t be shown again.</p>

            <button
              onClick={handleDone}
              className="w-full py-3 rounded-xl font-bold bg-primary text-primary-foreground text-sm transition-opacity hover:opacity-90"
            >
              Done
            </button>
          </div>
        ) : (
          /* ── Form ── */
          <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between mb-1">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">
                  {mode === 'client' ? 'Client Portal' : 'Team Member'}
                </p>
                <h2 className="text-lg font-extrabold text-foreground">Create Login Access</h2>
              </div>
              <DialogClose className="w-8 h-8 rounded-lg bg-secondary text-muted-foreground hover:bg-accent transition-colors flex items-center justify-center text-lg font-light">
                ×
              </DialogClose>
            </div>

            {/* Name — editable for team, locked for client */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                {mode === 'client' ? 'Contact Name' : 'Full Name'}
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                readOnly={mode === 'client'}
                placeholder="e.g. Sara Ahmed"
                className={`w-full px-4 py-2.5 rounded-xl border text-sm outline-none transition-colors
                  ${mode === 'client'
                    ? 'bg-secondary/50 border-border text-muted-foreground cursor-not-allowed'
                    : 'bg-background border-border text-foreground focus:border-primary'}`}
              />
            </div>

            {/* Role — team only */}
            {mode === 'team' && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Role</label>
                <div className="flex flex-wrap gap-2">
                  {TEAM_ROLES.map(r => (
                    <button
                      key={r} type="button" onClick={() => setRole(r)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all capitalize
                        ${role === r ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-secondary text-muted-foreground hover:bg-accent'}`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="email@example.com"
                className="w-full px-4 py-2.5 rounded-xl border border-border text-sm text-foreground bg-background outline-none focus:border-primary transition-colors"
              />
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Password</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  className="w-full px-4 py-2.5 pr-12 rounded-xl border border-border text-sm text-foreground bg-background outline-none focus:border-primary transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs font-bold"
                >
                  {showPass ? 'Hide' : 'Show'}
                </button>
              </div>
              <button
                type="button"
                onClick={() => {
                  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#'
                  setPassword(Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join(''))
                  setShowPass(true)
                }}
                className="text-xs text-primary font-semibold self-start hover:underline"
              >
                Generate strong password
              </button>
            </div>

            {error && (
              <p className="text-xs text-danger bg-danger/10 rounded-lg px-3 py-2 font-medium">{error}</p>
            )}

            <div className="flex gap-3 mt-1">
              <DialogClose
                type="button"
                className="flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:bg-secondary transition-colors"
              >
                Cancel
              </DialogClose>
              <button
                type="submit"
                disabled={loading}
                className="flex-2 flex-grow-[2] py-2.5 rounded-xl text-sm font-bold bg-primary text-primary-foreground transition-opacity disabled:opacity-50"
              >
                {loading ? 'Creating…' : 'Create Account'}
              </button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

function CredRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false)

  function copy() {
    navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-muted-foreground font-semibold w-16 shrink-0">{label}</span>
      <span className="text-xs text-foreground font-mono flex-1 truncate">{value}</span>
      <button onClick={copy}
        className={`text-xs font-bold shrink-0 transition-colors ${copied ? 'text-success' : 'text-primary'}`}>
        {copied ? 'Copied!' : 'Copy'}
      </button>
    </div>
  )
}
