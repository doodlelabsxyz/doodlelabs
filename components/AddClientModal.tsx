'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useOrg } from '@/lib/supabase/OrgContext'

type NewClient = {
  name: string
  industry: string
  contact_name: string
  contact_email: string
  monthly_retainer: string
  content_this_month: string
  brand_color: string
  platforms: string[]
  requires_client_approval: boolean
  notes: string
}

const PRESET_COLORS = [
  'hsl(25,82%,60%)',  'hsl(200,82%,55%)', 'hsl(161,58%,44%)',
  'hsl(268,60%,60%)', 'hsl(4,72%,55%)',   'hsl(40,92%,48%)',
  'hsl(14,72%,56%)',  'hsl(210,70%,50%)',
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
    monthly_retainer: '', content_this_month: '20',
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
      content_this_month: parseInt(form.content_this_month) || 20,
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
    <div className="fixed inset-0 z-[60] flex items-center md:items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col">

        <div className="h-1.5 shrink-0" style={{ background: form.brand_color }} />

        <div className="overflow-y-auto flex-1">
          <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">

            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-stone-400 uppercase tracking-widest font-semibold">Clients</p>
                <h2 className="text-lg font-extrabold text-stone-800">Add New Client</h2>
              </div>
              <button type="button" onClick={onClose}
                className="w-8 h-8 rounded-lg bg-stone-100 text-stone-500 hover:bg-stone-200 transition-colors flex items-center justify-center text-lg">
                ×
              </button>
            </div>

            {/* Name */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-stone-500 uppercase tracking-wide">Client Name *</label>
              <input
                type="text" value={form.name} onChange={e => set('name', e.target.value)}
                placeholder="e.g. Spark Coffee"
                className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-sm text-stone-800 outline-none focus:border-amber-400 transition-colors"
              />
              {form.name && (
                <p className="text-xs text-stone-400">Initials: <span className="font-bold text-stone-600">{initials(form.name)}</span></p>
              )}
            </div>

            {/* Industry */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-stone-500 uppercase tracking-wide">Industry</label>
              <input
                type="text" value={form.industry} onChange={e => set('industry', e.target.value)}
                placeholder="e.g. Food & Beverage"
                className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-sm text-stone-800 outline-none focus:border-amber-400 transition-colors"
              />
            </div>

            {/* Brand Color */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-stone-500 uppercase tracking-wide">Brand Color</label>
              <div className="flex gap-2 flex-wrap">
                {PRESET_COLORS.map(c => (
                  <button key={c} type="button" onClick={() => set('brand_color', c)}
                    className="w-8 h-8 rounded-full transition-transform hover:scale-110"
                    style={{
                      background: c,
                      outline: form.brand_color === c ? `3px solid ${c}` : 'none',
                      outlineOffset: '2px',
                    }}
                  />
                ))}
                <input
                  type="color"
                  value={form.brand_color.startsWith('#') ? form.brand_color : '#E07A3F'}
                  onChange={e => set('brand_color', e.target.value)}
                  className="w-8 h-8 rounded-full cursor-pointer border-0 p-0"
                  title="Custom color"
                />
              </div>
            </div>

            {/* Contact */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-stone-500 uppercase tracking-wide">Contact Name</label>
                <input
                  type="text" value={form.contact_name} onChange={e => set('contact_name', e.target.value)}
                  placeholder="Sara Ahmed"
                  className="w-full px-3 py-2.5 rounded-xl border border-stone-200 text-sm text-stone-800 outline-none focus:border-amber-400 transition-colors"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-stone-500 uppercase tracking-wide">Contact Email</label>
                <input
                  type="email" value={form.contact_email} onChange={e => set('contact_email', e.target.value)}
                  placeholder="sara@client.com"
                  className="w-full px-3 py-2.5 rounded-xl border border-stone-200 text-sm text-stone-800 outline-none focus:border-amber-400 transition-colors"
                />
              </div>
            </div>

            {/* Financials */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-stone-500 uppercase tracking-wide">Monthly Retainer ($)</label>
                <input
                  type="number" value={form.monthly_retainer} onChange={e => set('monthly_retainer', e.target.value)}
                  placeholder="2500"
                  className="w-full px-3 py-2.5 rounded-xl border border-stone-200 text-sm text-stone-800 outline-none focus:border-amber-400 transition-colors"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-stone-500 uppercase tracking-wide">Posts / Month</label>
                <input
                  type="number" value={form.content_this_month} onChange={e => set('content_this_month', e.target.value)}
                  placeholder="20"
                  className="w-full px-3 py-2.5 rounded-xl border border-stone-200 text-sm text-stone-800 outline-none focus:border-amber-400 transition-colors"
                />
              </div>
            </div>

            {/* Platforms */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-stone-500 uppercase tracking-wide">Platforms</label>
              <div className="flex gap-2 flex-wrap">
                {ALL_PLATFORMS.map(p => (
                  <button key={p} type="button" onClick={() => togglePlatform(p)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all capitalize
                      ${form.platforms.includes(p)
                        ? 'text-white'
                        : 'bg-stone-100 text-stone-500 hover:bg-stone-200'}`}
                    style={form.platforms.includes(p) ? { background: form.brand_color } : undefined}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Requires approval toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-stone-50 border border-stone-200">
              <div>
                <p className="text-sm font-bold text-stone-700">Requires Client Approval</p>
                <p className="text-xs text-stone-400">Content must be approved before posting</p>
              </div>
              <button
                type="button"
                onClick={() => set('requires_client_approval', !form.requires_client_approval)}
                className="relative w-11 h-6 rounded-full transition-colors shrink-0"
                style={{ background: form.requires_client_approval ? form.brand_color : 'hsl(38,14%,82%)' }}
              >
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform
                  ${form.requires_client_approval ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
            </div>

            {/* Notes */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-stone-500 uppercase tracking-wide">Notes (optional)</label>
              <textarea
                value={form.notes} onChange={e => set('notes', e.target.value)}
                placeholder="Any internal notes about this client…"
                rows={2}
                className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-sm text-stone-800 outline-none focus:border-amber-400 transition-colors resize-none"
              />
            </div>

            {error && (
              <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2 font-medium">{error}</p>
            )}

            <div className="flex gap-3">
              <button type="button" onClick={onClose}
                className="flex-1 py-3 rounded-xl border border-stone-200 text-sm font-semibold text-stone-500 hover:bg-stone-50 transition-colors">
                Cancel
              </button>
              <button
                type="submit" disabled={loading}
                className="flex-[2] py-3 rounded-xl text-sm font-bold text-white transition-opacity disabled:opacity-50"
                style={{ background: form.brand_color }}
              >
                {loading ? 'Creating…' : 'Add Client'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
