'use client'

import { useState } from 'react'
import type { Role } from '@/lib/types'

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
    <div className="fixed inset-0 z-[60] flex items-center md:items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">

        {/* Top bar */}
        <div className="h-1.5" style={{ background: mode === 'client' ? 'hsl(25,82%,60%)' : 'hsl(200,88%,55%)' }} />

        {done ? (
          /* ── Success state ── */
          <div className="p-6 flex flex-col items-center gap-4 text-center">
            <div className="w-14 h-14 rounded-full flex items-center justify-center text-2xl"
              style={{ background: mode === 'client' ? 'hsl(25,82%,93%)' : 'hsl(200,88%,93%)' }}>
              ✓
            </div>
            <div>
              <p className="text-lg font-extrabold text-stone-800 mb-1">Account Created</p>
              <p className="text-sm text-stone-500">Share these credentials with {mode === 'client' ? 'the client' : 'the team member'}.</p>
            </div>

            {/* Credentials box */}
            <div className="w-full rounded-xl border border-stone-200 bg-stone-50 p-4 text-left flex flex-col gap-2">
              <CredRow label="Email" value={email} />
              <CredRow label="Password" value={password} />
              <CredRow label="Login URL" value={typeof window !== 'undefined' ? window.location.origin + '/login' : '/login'} />
            </div>

            <p className="text-xs text-stone-400">Copy these now — the password won&apos;t be shown again.</p>

            <button
              onClick={handleDone}
              className="w-full py-3 rounded-xl font-bold text-white text-sm transition-opacity hover:opacity-90"
              style={{ background: mode === 'client' ? 'hsl(25,82%,60%)' : 'hsl(200,88%,55%)' }}
            >
              Done
            </button>
          </div>
        ) : (
          /* ── Form ── */
          <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between mb-1">
              <div>
                <p className="text-xs text-stone-400 uppercase tracking-widest font-semibold">
                  {mode === 'client' ? 'Client Portal' : 'Team Member'}
                </p>
                <h2 className="text-lg font-extrabold text-stone-800">Create Login Access</h2>
              </div>
              <button type="button" onClick={onClose}
                className="w-8 h-8 rounded-lg bg-stone-100 text-stone-500 hover:bg-stone-200 transition-colors flex items-center justify-center text-lg font-light">
                ×
              </button>
            </div>

            {/* Name — editable for team, locked for client */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-stone-500 uppercase tracking-wide">
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
                    ? 'bg-stone-50 border-stone-200 text-stone-400 cursor-not-allowed'
                    : 'bg-white border-stone-200 text-stone-800 focus:border-amber-400'}`}
              />
            </div>

            {/* Role — team only */}
            {mode === 'team' && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-stone-500 uppercase tracking-wide">Role</label>
                <div className="flex flex-wrap gap-2">
                  {TEAM_ROLES.map(r => (
                    <button
                      key={r} type="button" onClick={() => setRole(r)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all capitalize
                        ${role === r ? 'text-white shadow-sm' : 'bg-stone-100 text-stone-500 hover:bg-stone-200'}`}
                      style={role === r ? { background: 'hsl(200,88%,55%)' } : undefined}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-stone-500 uppercase tracking-wide">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="email@example.com"
                className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-sm text-stone-800 bg-white outline-none focus:border-amber-400 transition-colors"
              />
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-stone-500 uppercase tracking-wide">Password</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  className="w-full px-4 py-2.5 pr-12 rounded-xl border border-stone-200 text-sm text-stone-800 bg-white outline-none focus:border-amber-400 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 text-xs font-bold"
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
                className="text-xs text-amber-600 font-semibold self-start hover:underline"
              >
                Generate strong password
              </button>
            </div>

            {error && (
              <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2 font-medium">{error}</p>
            )}

            <div className="flex gap-3 mt-1">
              <button type="button" onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-stone-200 text-sm font-semibold text-stone-500 hover:bg-stone-50 transition-colors">
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-2 flex-grow-[2] py-2.5 rounded-xl text-sm font-bold text-white transition-opacity disabled:opacity-50"
                style={{ background: mode === 'client' ? 'hsl(25,82%,60%)' : 'hsl(200,88%,55%)' }}
              >
                {loading ? 'Creating…' : 'Create Account'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
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
      <span className="text-xs text-stone-400 font-semibold w-16 shrink-0">{label}</span>
      <span className="text-xs text-stone-700 font-mono flex-1 truncate">{value}</span>
      <button onClick={copy}
        className="text-xs font-bold shrink-0 transition-colors"
        style={{ color: copied ? 'hsl(154,50%,38%)' : 'hsl(25,82%,55%)' }}>
        {copied ? 'Copied!' : 'Copy'}
      </button>
    </div>
  )
}
