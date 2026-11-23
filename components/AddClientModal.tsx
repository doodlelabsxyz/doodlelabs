'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useOrg } from '@/lib/supabase/OrgContext'
import {
  Dialog,
  DialogContent,
  DialogClose,
} from '@/components/ui/dialog'

type NewClient = {
  name: string
  industry: string
  contact_name: string
  contact_email: string
  monthly_retainer: string
  content_quota: string
  brand_color: string
  platforms: string[]
  requires_client_approval: boolean
  notes: string
}

// Green-family presets (stored as data values, not theme colors).
const PRESET_COLORS = [
  'hsl(145,62%,20%)', 'hsl(150,45%,28%)', 'hsl(140,38%,32%)',
  'hsl(160,60%,26%)', 'hsl(120,28%,30%)', 'hsl(165,50%,22%)',
  'hsl(150,55%,40%)', 'hsl(140,45%,50%)',
]

const ALL_PLATFORMS = ['instagram', 'tiktok', 'facebook', 'linkedin', 'youtube', 'twitter']

function initials(name: string) {
  return name.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

export default function AddClientModal({ onClose, onCreated }: {
  onClose: () => void
  onCreated: (client: { id: string; name: string }) => void
}) {
  const supabase = createClient()
  const { org } = useOrg()

  const [form, setForm] = useState<NewClient>({
    name: '', industry: '', contact_name: '', contact_email: '',
    monthly_retainer: '', content_quota: '20',
    brand_color: PRESET_COLORS[0], platforms: ['instagram'],
    requires_client_approval: true, notes: '',
  })
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  function set(key: keyof NewClient, val: string | boolean | string[]) {
    setForm(prev => ({ ...prev, [key]: val }))
  }

  function togglePlatform(p: string) {
    set('platforms', form.platforms.includes(p)
      ? form.platforms.filter(x => x !== p)
      : [...form.platforms, p]
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setError('Client name is required.'); return }

    setLoading(true)
    setError('')

    const { data, error: err } = await supabase.from('clients').insert({
      org_id: org?.id,
      name: form.name.trim(),
      initials: initials(form.name),
      industry: form.industry.trim() || 'General',
      brand_color: form.brand_color,
      contact_name: form.contact_name.trim() || null,
      contact_email: form.contact_email.trim() || null,
      monthly_retainer: form.monthly_retainer ? parseFloat(form.monthly_retainer) : null,
      content_quota: parseInt(form.content_quota) || 20,
      platforms: form.platforms,
      requires_client_approval: form.requires_client_approval,
      notes: form.notes.trim() || null,
      pending_approvals: 0,
    }).select('id, name').single()

    setLoading(false)

    if (err || !data) {
      setError(err?.message ?? 'Failed to create client.')
    } else {
      onCreated(data)
      onClose()
    }
  }

  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent
        showCloseButton={false}
        className="max-w-lg max-h-[90vh] p-0 gap-0 flex flex-col overflow-hidden rounded-2xl ring-0 bg-card"
      >
        <div className="h-1.5 shrink-0 bg-primary" />

        <div className="overflow-y-auto flex-1">
          <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">

            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">Clients</p>
                <h2 className="text-lg font-extrabold text-foreground">Add New Client</h2>
              </div>
              <DialogClose className="w-8 h-8 rounded-lg bg-secondary text-muted-foreground hover:bg-accent transition-colors flex items-center justify-center text-lg">
                ×
              </DialogClose>
            </div>

            {/* Name */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Client Name *</label>
              <input
                type="text" value={form.name} onChange={e => set('name', e.target.value)}
                placeholder="e.g. Spark Coffee"
                className="w-full px-4 py-2.5 rounded-xl border border-border text-sm text-foreground outline-none focus:border-primary transition-colors"
              />
              {form.name && (
                <p className="text-xs text-muted-foreground">Initials: <span className="font-bold text-foreground">{initials(form.name)}</span></p>
              )}
            </div>

            {/* Industry */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Industry</label>
              <input
                type="text" value={form.industry} onChange={e => set('industry', e.target.value)}
                placeholder="e.g. Food & Beverage"
                className="w-full px-4 py-2.5 rounded-xl border border-border text-sm text-foreground outline-none focus:border-primary transition-colors"
              />
            </div>

            {/* Brand Color */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Brand Color</label>
              <div className="flex gap-2 flex-wrap">
                {PRESET_COLORS.map(c => (
                  <button key={c} type="button" onClick={() => set('brand_color', c)}
                    aria-label={`Brand color ${c}`}
                    aria-pressed={form.brand_color === c}
                    className={`size-11 rounded-full transition-transform hover:scale-110 ${form.brand_color === c ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}`}
                    style={{ background: c }}
                  />
                ))}
                <input
                  type="color"
                  value={form.brand_color.startsWith('#') ? form.brand_color : '#14532D'}
                  onChange={e => set('brand_color', e.target.value)}
                  className="size-11 rounded-full cursor-pointer border-0 p-0"
                  title="Custom color"
                />
              </div>
            </div>

            {/* Contact */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Contact Name</label>
                <input
                  type="text" value={form.contact_name} onChange={e => set('contact_name', e.target.value)}
                  placeholder="Sara Ahmed"
                  className="w-full px-3 py-2.5 rounded-xl border border-border text-sm text-foreground outline-none focus:border-primary transition-colors"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Contact Email</label>
                <input
                  type="email" value={form.contact_email} onChange={e => set('contact_email', e.target.value)}
                  placeholder="sara@client.com"
                  className="w-full px-3 py-2.5 rounded-xl border border-border text-sm text-foreground outline-none focus:border-primary transition-colors"
                />
              </div>
            </div>

            {/* Financials */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Monthly Retainer ($)</label>
                <input
                  type="number" value={form.monthly_retainer} onChange={e => set('monthly_retainer', e.target.value)}
                  placeholder="2500"
                  className="w-full px-3 py-2.5 rounded-xl border border-border text-sm text-foreground outline-none focus:border-primary transition-colors"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Posts / Month</label>
                <input
                  type="number" value={form.content_quota} onChange={e => set('content_quota', e.target.value)}
                  placeholder="20"
                  className="w-full px-3 py-2.5 rounded-xl border border-border text-sm text-foreground outline-none focus:border-primary transition-colors"
                />
              </div>
            </div>

            {/* Platforms */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Platforms</label>
              <div className="flex gap-2 flex-wrap">
                {ALL_PLATFORMS.map(p => (
                  <button key={p} type="button" onClick={() => togglePlatform(p)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all capitalize
                      ${form.platforms.includes(p)
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-muted-foreground hover:bg-accent'}`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Requires approval toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/50 border border-border">
              <div>
                <p className="text-sm font-bold text-foreground">Requires Client Approval</p>
                <p className="text-xs text-muted-foreground">Content must be approved before posting</p>
              </div>
              <button
                type="button"
                onClick={() => set('requires_client_approval', !form.requires_client_approval)}
                className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${form.requires_client_approval ? 'bg-primary' : 'bg-border'}`}
              >
                <span className={`absolute top-0.5 w-5 h-5 bg-background rounded-full shadow transition-transform
                  ${form.requires_client_approval ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
            </div>

            {/* Notes */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Notes (optional)</label>
              <textarea
                value={form.notes} onChange={e => set('notes', e.target.value)}
                placeholder="Any internal notes about this client…"
                rows={2}
                className="w-full px-4 py-2.5 rounded-xl border border-border text-sm text-foreground outline-none focus:border-primary transition-colors resize-none"
              />
            </div>

            {error && (
              <p className="text-xs text-danger bg-danger/10 rounded-lg px-3 py-2 font-medium">{error}</p>
            )}

            <div className="flex gap-3">
              <DialogClose
                type="button"
                className="flex-1 py-3 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:bg-secondary transition-colors"
              >
                Cancel
              </DialogClose>
              <button
                type="submit" disabled={loading}
                className="flex-[2] py-3 rounded-xl text-sm font-bold bg-primary text-primary-foreground transition-opacity disabled:opacity-50"
              >
                {loading ? 'Creating…' : 'Add Client'}
              </button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
