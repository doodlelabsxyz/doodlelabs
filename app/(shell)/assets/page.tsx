'use client'

import { useState, useRef, useEffect } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { createClient } from '@/lib/supabase/client'
import type { AssetType } from '@/lib/types'
import { getInitials, getAvatarColor } from '@/lib/utils'

gsap.registerPlugin(useGSAP)

const TYPE_CFG: Record<AssetType, { bg: string; text: string; label: string; icon: string }> = {
  'graphic':        { bg: 'hsl(14,72%,62%)',  text: '#fff',    label: 'Graphic',   icon: '🖼' },
  'raw-footage':    { bg: 'hsl(40,95%,62%)',  text: '#3a2800', label: 'Raw Video',  icon: '🎬' },
  'edited-video':   { bg: 'hsl(161,58%,50%)', text: '#fff',    label: 'Edited',     icon: '🎞' },
  'brand-material': { bg: 'hsl(268,60%,68%)', text: '#fff',    label: 'Brand',      icon: '🎨' },
}

function relDate(dateStr: string) {
  const d = new Date(dateStr)
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const diff  = Math.round((d.getTime() - today.getTime()) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === -1) return 'Yesterday'
  if (diff < -1) return `${Math.abs(diff)}d ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function fileIcon(name: string) {
  if (name.match(/\.(png|jpg|jpeg|webp|svg)$/i)) return 'img'
  if (name.match(/\.(mp4|mov|avi|mkv)$/i)) return 'vid'
  if (name.match(/\.(zip|rar|7z)$/i)) return 'zip'
  return 'file'
}

type AssetRow = {
  id: string; type: AssetType; file_name: string; file_size: string | null
  uploaded_at: string; content_id: string; client_id: string
  clients: { id: string; name: string; brand_color: string } | null
  users:   { id: string; name: string } | null
}
type ClientRow = { id: string; name: string; brand_color: string }

export default function AssetsPage() {
  const gridRef = useRef<HTMLDivElement>(null)
  const [mounted,       setMounted]       = useState(false)
  const [assets,        setAssets]        = useState<AssetRow[]>([])
  const [clients,       setClients]       = useState<ClientRow[]>([])
  const [search,        setSearch]        = useState('')
  const [typeFilter,    setTypeFilter]    = useState<AssetType | 'all'>('all')
  const [clientFilter,  setClientFilter]  = useState<string | null>(null)
  const [viewMode,      setViewMode]      = useState<'grid' | 'list'>('grid')

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [assetsRes, clientsRes] = await Promise.all([
        supabase
          .from('assets')
          .select('id, type, file_name, file_size, uploaded_at, content_id, client_id, clients(id, name, brand_color), users!assets_uploaded_by_fkey(id, name)')
          .order('uploaded_at', { ascending: false }),
        supabase.from('clients').select('id, name, brand_color'),
      ])

      setAssets(
        ((assetsRes.data || []) as any[]).map(a => ({
          ...a,
          clients: Array.isArray(a.clients) ? (a.clients[0] ?? null) : a.clients,
          users:   Array.isArray(a.users)   ? (a.users[0]   ?? null) : a.users,
        }))
      )
      setClients((clientsRes.data || []) as ClientRow[])
      setMounted(true)
    }
    load()
  }, [])

  useGSAP(() => {
    if (!mounted || !gridRef.current) return
    gsap.fromTo('.asset-card',
      { y: 16, opacity: 0, scale: 0.96 },
      { y: 0, opacity: 1, scale: 1, duration: 0.35, stagger: { amount: 0.2 }, ease: 'back.out(1.2)', clearProps: 'all' }
    )
  }, { dependencies: [mounted, typeFilter, clientFilter], scope: gridRef })

  const filtered = assets.filter(a => {
    if (typeFilter !== 'all' && a.type !== typeFilter) return false
    if (clientFilter && a.client_id !== clientFilter) return false
    if (search && !a.file_name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const totalSizeMb = assets.reduce((acc, a) => {
    const num = parseFloat(a.file_size || '0')
    return acc + (a.file_size?.includes('GB') ? num * 1000 : num)
  }, 0)

  if (!mounted) return null

  return (
    <main className="page-main" style={{ flex: 1, minWidth: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>

      <div style={{ background: '#0F1A14', padding: '18px 20px 14px', flexShrink: 0, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '0.656rem', color: 'hsl(140,7%,48%)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '1px' }}>Media</p>
            <h1 style={{ fontSize: '1.167rem', fontWeight: 800, color: 'hsl(42,22%,84%)', lineHeight: 1 }}>Asset Library</h1>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '1rem', fontWeight: 800, color: 'hsl(25,82%,60%)', lineHeight: 1 }}>{assets.length}</p>
              <p style={{ fontSize: '0.6rem', color: 'hsl(140,7%,48%)', marginTop: '2px' }}>files</p>
            </div>
            <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.07)' }} />
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '1rem', fontWeight: 800, color: 'hsl(42,22%,84%)', lineHeight: 1 }}>{totalSizeMb.toFixed(1)}</p>
              <p style={{ fontSize: '0.6rem', color: 'hsl(140,7%,48%)', marginTop: '2px' }}>MB total</p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px', marginBottom: '8px' }}>
          <FilterPill label="All Types" active={typeFilter === 'all'} color="hsl(25,82%,60%)" onClick={() => setTypeFilter('all')} />
          {(Object.entries(TYPE_CFG) as [AssetType, typeof TYPE_CFG[AssetType]][]).map(([t, c]) => (
            <FilterPill key={t} label={c.label} active={typeFilter === t} color={c.bg} onClick={() => setTypeFilter(typeFilter === t ? 'all' : t)} />
          ))}
        </div>
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto' }}>
          <FilterPill label="All Clients" active={!clientFilter} color="hsl(200,82%,58%)" onClick={() => setClientFilter(null)} />
          {clients.map(c => (
            <FilterPill key={c.id} label={c.name} active={clientFilter === c.id} color={c.brand_color} onClick={() => setClientFilter(clientFilter === c.id ? null : c.id)} />
          ))}
        </div>
      </div>

      <div style={{ padding: '12px 16px', display: 'flex', gap: '10px', alignItems: 'center', flexShrink: 0 }}>
        <div style={{ flex: 1, position: 'relative', maxWidth: '320px' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'hsl(24,10%,54%)' }}>
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8"/>
            <path d="M16.5 16.5L21 21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search files…"
            style={{ width: '100%', padding: '9px 12px 9px 34px', borderRadius: '10px', background: 'hsl(42,25%,99%)', border: '1px solid hsl(38,14%,90%)', fontSize: '0.8rem', color: 'hsl(24,20%,11%)', outline: 'none' }}
            onFocus={e => { e.target.style.borderColor = 'hsl(200,82%,65%)' }}
            onBlur={e => { e.target.style.borderColor = 'hsl(38,14%,90%)' }}
          />
        </div>
        <div style={{ display: 'flex', borderRadius: '8px', overflow: 'hidden', border: '1px solid hsl(38,14%,90%)' }}>
          {(['grid', 'list'] as const).map(v => (
            <button key={v} onClick={() => setViewMode(v)} style={{ padding: '7px 12px', border: 'none', cursor: 'pointer', background: viewMode === v ? 'hsl(25,82%,60%)' : 'hsl(42,25%,99%)', color: viewMode === v ? '#fff' : 'hsl(24,10%,44%)', fontSize: '0.7rem', fontWeight: 600, textTransform: 'capitalize' }}>
              {v}
            </button>
          ))}
        </div>
      </div>

      <div ref={gridRef} style={{ padding: '0 16px 80px', flex: 1 }}>
        {filtered.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 20px', gap: '12px' }}>
            <div style={{ width: '72px', height: '72px', borderRadius: '18px', background: 'hsl(42,18%,94%)', border: '1.5px dashed hsl(38,14%,85%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.3 }}>
                <rect x="3" y="3" width="18" height="18" rx="4" stroke="hsl(24,10%,44%)" strokeWidth="1.5"/>
                <circle cx="8.5" cy="8.5" r="2" stroke="hsl(24,10%,44%)" strokeWidth="1.5"/>
                <path d="M3 16l5-4 4 3 3-2 6 5" stroke="hsl(24,10%,44%)" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'hsl(24,10%,44%)' }}>No assets found</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
            {filtered.map(asset => {
              const cfg  = TYPE_CFG[asset.type]
              const icon = fileIcon(asset.file_name)
              return (
                <div key={asset.id} className="asset-card" style={{ background: 'hsl(42,25%,99%)', borderRadius: '14px', border: '1px solid hsl(38,14%,90%)', overflow: 'hidden', cursor: 'pointer', transition: 'transform 0.15s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.15s ease' }}
                  onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.transform = 'translateY(-3px)'; el.style.boxShadow = `0 8px 24px ${cfg.bg}18` }}
                  onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.transform = ''; el.style.boxShadow = '' }}
                >
                  <div style={{ height: '120px', background: `linear-gradient(135deg, ${cfg.bg}15 0%, ${cfg.bg}08 100%)`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '6px', borderBottom: `3px solid ${cfg.bg}` }}>
                    <FileIconSvg type={icon} color={cfg.bg} />
                    <span style={{ fontSize: '0.55rem', color: cfg.bg, fontWeight: 600, opacity: 0.7 }}>{asset.file_size}</span>
                  </div>
                  <div style={{ padding: '10px 12px' }}>
                    <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'hsl(24,20%,11%)', lineHeight: 1.3, marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {asset.file_name}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                      <span style={{ padding: '1px 5px', borderRadius: '4px', background: cfg.bg, color: cfg.text, fontSize: '0.52rem', fontWeight: 700 }}>{cfg.label}</span>
                      {asset.clients && <span style={{ fontSize: '0.6rem', color: 'hsl(24,10%,54%)' }}>{asset.clients.name}</span>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      {asset.users && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <div style={{ width: '16px', height: '16px', borderRadius: '4px', background: getAvatarColor(asset.users.id), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.42rem', fontWeight: 800, color: '#fff' }}>
                            {getInitials(asset.users.name)}
                          </div>
                          <span style={{ fontSize: '0.6rem', color: 'hsl(24,8%,64%)' }}>{asset.users.name.split(' ')[0]}</span>
                        </div>
                      )}
                      <span style={{ fontSize: '0.58rem', color: 'hsl(24,8%,64%)' }}>{relDate(asset.uploaded_at)}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {filtered.map(asset => {
              const cfg = TYPE_CFG[asset.type]
              return (
                <div key={asset.id} className="asset-card" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', borderRadius: '10px', background: 'hsl(42,25%,99%)', border: '1px solid hsl(38,14%,90%)', cursor: 'pointer', transition: 'background 0.12s ease' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'hsl(42,28%,97%)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'hsl(42,25%,99%)' }}
                >
                  <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: cfg.bg, flexShrink: 0 }} />
                  <p style={{ flex: 1, fontSize: '0.8rem', fontWeight: 600, color: 'hsl(24,20%,11%)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
                    {asset.file_name}
                  </p>
                  <span style={{ fontSize: '0.656rem', color: 'hsl(24,10%,54%)', flexShrink: 0 }}>{asset.clients?.name}</span>
                  <span style={{ fontSize: '0.656rem', color: 'hsl(24,8%,64%)', flexShrink: 0 }}>{asset.file_size}</span>
                  {asset.users && (
                    <div style={{ width: '18px', height: '18px', borderRadius: '5px', background: getAvatarColor(asset.users.id), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.45rem', fontWeight: 800, color: '#fff', flexShrink: 0 }}>
                      {getInitials(asset.users.name)}
                    </div>
                  )}
                  <span style={{ fontSize: '0.6rem', color: 'hsl(24,8%,64%)', flexShrink: 0, minWidth: '50px', textAlign: 'right' }}>{relDate(asset.uploaded_at)}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}

function FileIconSvg({ type, color }: { type: string; color: string }) {
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none" style={{ opacity: 0.5 }}>
      {type === 'img' ? (
        <><rect x="4" y="4" width="28" height="28" rx="6" stroke={color} strokeWidth="1.5"/><circle cx="12" cy="12" r="3" stroke={color} strokeWidth="1.5"/><path d="M4 26l8-6 6 4 4-3 10 7" stroke={color} strokeWidth="1.5" strokeLinecap="round"/></>
      ) : type === 'vid' ? (
        <><rect x="4" y="6" width="28" height="24" rx="5" stroke={color} strokeWidth="1.5"/><path d="M15 14l8 5-8 5V14z" stroke={color} strokeWidth="1.5" strokeLinejoin="round"/></>
      ) : type === 'zip' ? (
        <><rect x="6" y="4" width="24" height="28" rx="4" stroke={color} strokeWidth="1.5"/><path d="M14 4v28M18 8h-4M18 12h-4M18 16h-4M18 20h-4" stroke={color} strokeWidth="1.5" strokeLinecap="round"/></>
      ) : (
        <><rect x="6" y="4" width="24" height="28" rx="4" stroke={color} strokeWidth="1.5"/><path d="M12 14h12M12 18h12M12 22h8" stroke={color} strokeWidth="1.5" strokeLinecap="round"/></>
      )}
    </svg>
  )
}

function FilterPill({ label, active, color, onClick }: { label: string; active: boolean; color: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ padding: '4px 11px', borderRadius: '9999px', border: 'none', background: active ? color : 'rgba(255,255,255,0.07)', color: active ? '#fff' : 'hsl(140,7%,48%)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'background 0.15s' }}>
      {label}
    </button>
  )
}
