'use client'

import { useState, useRef, useEffect } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { UserAvatar } from '@/components/ui/user-avatar'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import type { AssetType } from '@/lib/types'

gsap.registerPlugin(useGSAP)

const TYPE_CFG: Record<
  AssetType,
  { label: string; badgeClass: string; accentClass: string; previewClass: string }
> = {
  graphic: {
    label: 'Graphic',
    badgeClass: 'bg-coral text-white',
    accentClass: 'bg-coral',
    previewClass: 'from-coral/15 to-coral/5 text-coral',
  },
  'raw-footage': {
    label: 'Raw Video',
    badgeClass: 'bg-lemon text-amber-950',
    accentClass: 'bg-lemon',
    previewClass: 'from-lemon/20 to-lemon/5 text-amber-700',
  },
  'edited-video': {
    label: 'Edited',
    badgeClass: 'bg-mint text-white',
    accentClass: 'bg-mint',
    previewClass: 'from-mint/20 to-mint/5 text-mint',
  },
  'brand-material': {
    label: 'Brand',
    badgeClass: 'bg-lavender text-white',
    accentClass: 'bg-lavender',
    previewClass: 'from-lavender/20 to-lavender/5 text-lavender',
  },
}

function relDate(dateStr: string) {
  const d = new Date(dateStr)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000)
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
  id: string
  type: AssetType
  file_name: string
  file_size: string | null
  uploaded_at: string
  content_id: string
  client_id: string
  clients: { id: string; name: string; brand_color: string } | null
  users: { id: string; name: string } | null
}

type ClientRow = { id: string; name: string; brand_color: string }

type AssetFetchRow = Omit<AssetRow, 'clients' | 'users'> & {
  clients: AssetRow['clients'] | AssetRow['clients'][]
  users: AssetRow['users'] | AssetRow['users'][]
}

function FilterPill({
  label,
  active,
  color,
  onClick,
}: {
  label: string
  active: boolean
  color: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{ '--pill-color': color } as React.CSSProperties}
      className={cn(
        'rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap transition-colors',
        active
          ? 'bg-[var(--pill-color)] text-white'
          : 'bg-white/7 text-dark-muted hover:bg-white/10 hover:text-dark-text'
      )}
    >
      {label}
    </button>
  )
}

export default function AssetsPage() {
  const gridRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)
  const [assets, setAssets] = useState<AssetRow[]>([])
  const [clients, setClients] = useState<ClientRow[]>([])
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<AssetType | 'all'>('all')
  const [clientFilter, setClientFilter] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const [assetsRes, clientsRes] = await Promise.all([
        supabase
          .from('assets')
          .select(
            'id, type, file_name, file_size, uploaded_at, content_id, client_id, clients(id, name, brand_color), users!assets_uploaded_by_fkey(id, name)'
          )
          .order('uploaded_at', { ascending: false }),
        supabase.from('clients').select('id, name, brand_color'),
      ])

      setAssets(
        ((assetsRes.data || []) as AssetFetchRow[]).map(a => ({
          ...a,
          clients: Array.isArray(a.clients) ? (a.clients[0] ?? null) : a.clients,
          users: Array.isArray(a.users) ? (a.users[0] ?? null) : a.users,
        }))
      )
      setClients((clientsRes.data || []) as ClientRow[])
      setMounted(true)
    }
    void load()
  }, [])

  useGSAP(() => {
    if (!mounted || !gridRef.current) return
    gsap.fromTo(
      '[data-animate="asset-card"]',
      { y: 16, opacity: 0, scale: 0.96 },
      {
        y: 0,
        opacity: 1,
        scale: 1,
        duration: 0.35,
        stagger: { amount: 0.2 },
        ease: 'back.out(1.2)',
        clearProps: 'all',
      }
    )
  }, { dependencies: [mounted, typeFilter, clientFilter, search, viewMode], scope: gridRef })

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
    <main className="page-main flex min-w-0 flex-1 flex-col overflow-y-auto">
      <section className="border-b border-white/4 bg-dark px-5 pt-[18px] pb-[14px]">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex-1">
            <p className="mb-px text-2xs uppercase tracking-[0.08em] text-dark-muted">Media</p>
            <h1 className="text-md font-extrabold leading-none text-dark-text">Asset Library</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-base font-extrabold leading-none text-coral">{assets.length}</p>
              <p className="mt-0.5 text-[0.6rem] text-dark-muted">files</p>
            </div>
            <div className="h-6 w-px bg-white/7" />
            <div className="text-right">
              <p className="text-base font-extrabold leading-none text-dark-text">
                {totalSizeMb.toFixed(1)}
              </p>
              <p className="mt-0.5 text-[0.6rem] text-dark-muted">MB total</p>
            </div>
          </div>
        </div>

        <div className="mb-2 flex gap-1.5 overflow-x-auto pb-0.5">
          <FilterPill
            label="All Types"
            active={typeFilter === 'all'}
            color="hsl(25,82%,60%)"
            onClick={() => setTypeFilter('all')}
          />
          {(Object.entries(TYPE_CFG) as [AssetType, (typeof TYPE_CFG)[AssetType]][]).map(([t, c]) => (
            <FilterPill
              key={t}
              label={c.label}
              active={typeFilter === t}
              color={
                t === 'graphic'
                  ? 'hsl(14,72%,62%)'
                  : t === 'raw-footage'
                    ? 'hsl(40,95%,62%)'
                    : t === 'edited-video'
                      ? 'hsl(161,58%,50%)'
                      : 'hsl(268,60%,68%)'
              }
              onClick={() => setTypeFilter(typeFilter === t ? 'all' : t)}
            />
          ))}
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-0.5">
          <FilterPill
            label="All Clients"
            active={!clientFilter}
            color="hsl(200,82%,58%)"
            onClick={() => setClientFilter(null)}
          />
          {clients.map(c => (
            <FilterPill
              key={c.id}
              label={c.name}
              active={clientFilter === c.id}
              color={c.brand_color}
              onClick={() => setClientFilter(clientFilter === c.id ? null : c.id)}
            />
          ))}
        </div>
      </section>

      <section className="flex flex-wrap items-center gap-2 px-4 py-3">
        <div className="relative max-w-80 flex-1">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
          >
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
            <path d="M16.5 16.5L21 21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search files..."
            className="bg-card pr-3 pl-8"
          />
        </div>

        <div className="flex rounded-md border border-border bg-card p-0.5">
          {(['grid', 'list'] as const).map(v => (
            <Button
              key={v}
              variant={viewMode === v ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode(v)}
              className={cn(
                'capitalize',
                viewMode === v && 'bg-coral text-white hover:bg-coral/85'
              )}
            >
              {v}
            </Button>
          ))}
        </div>
      </section>

      <div ref={gridRef} className="flex-1 px-4 pb-20">
        {filtered.length === 0 ? (
          <Card className="border border-dashed border-border bg-card shadow-none">
            <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
              <div className="flex size-[72px] items-center justify-center rounded-[18px] border border-dashed border-border bg-secondary">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="opacity-30">
                  <rect x="3" y="3" width="18" height="18" rx="4" stroke="currentColor" strokeWidth="1.5" />
                  <circle cx="8.5" cy="8.5" r="2" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M3 16l5-4 4 3 3-2 6 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-muted-foreground">No assets found</p>
            </CardContent>
          </Card>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
            {filtered.map(asset => {
              const cfg = TYPE_CFG[asset.type]
              const icon = fileIcon(asset.file_name)

              return (
                <Card
                  key={asset.id}
                  data-animate="asset-card"
                  className="group gap-0 overflow-hidden border border-border py-0 shadow-none transition-all hover:-translate-y-1 hover:shadow-md"
                >
                  <div
                    className={cn(
                      'flex h-[120px] flex-col items-center justify-center gap-1.5 border-b-3 bg-gradient-to-br',
                      cfg.previewClass,
                      asset.type === 'graphic' && 'border-b-coral',
                      asset.type === 'raw-footage' && 'border-b-lemon',
                      asset.type === 'edited-video' && 'border-b-mint',
                      asset.type === 'brand-material' && 'border-b-lavender'
                    )}
                  >
                    <FileIconSvg type={icon} />
                    <span className="text-[0.55rem] font-semibold opacity-70">
                      {asset.file_size || '—'}
                    </span>
                  </div>

                  <CardContent className="py-3">
                    <p className="mb-1 truncate text-xs font-bold leading-5 text-foreground">
                      {asset.file_name}
                    </p>
                    <div className="mb-2 flex items-center gap-1.5">
                      <Badge className={cn('border-0 px-1.5 text-[0.52rem] font-bold', cfg.badgeClass)}>
                        {cfg.label}
                      </Badge>
                      {asset.clients && (
                        <span className="truncate text-[0.6rem] text-muted-foreground">
                          {asset.clients.name}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      {asset.users ? (
                        <div className="flex min-w-0 items-center gap-1">
                          <UserAvatar userId={asset.users.id} name={asset.users.name} size="sm" />
                          <span className="truncate text-[0.6rem] text-ghost">
                            {asset.users.name.split(' ')[0]}
                          </span>
                        </div>
                      ) : <span />}
                      <span className="text-[0.58rem] text-ghost">{relDate(asset.uploaded_at)}</span>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {filtered.map(asset => {
              const cfg = TYPE_CFG[asset.type]

              return (
                <Card
                  key={asset.id}
                  data-animate="asset-card"
                  className="gap-0 border border-border py-0 shadow-none transition-colors hover:bg-muted/30"
                >
                  <CardContent className="flex items-center gap-3 py-3">
                    <div className={cn('size-2 shrink-0 rounded-[2px]', cfg.accentClass)} />
                    <p className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
                      {asset.file_name}
                    </p>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {asset.clients?.name}
                    </span>
                    <span className="shrink-0 text-xs text-ghost">{asset.file_size}</span>
                    {asset.users ? (
                      <UserAvatar userId={asset.users.id} name={asset.users.name} size="sm" />
                    ) : null}
                    <span className="min-w-[50px] shrink-0 text-right text-[0.6rem] text-ghost">
                      {relDate(asset.uploaded_at)}
                    </span>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}

function FileIconSvg({ type }: { type: string }) {
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none" className="opacity-50">
      {type === 'img' ? (
        <>
          <rect x="4" y="4" width="28" height="28" rx="6" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" />
          <path d="M4 26l8-6 6 4 4-3 10 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </>
      ) : type === 'vid' ? (
        <>
          <rect x="4" y="6" width="28" height="24" rx="5" stroke="currentColor" strokeWidth="1.5" />
          <path d="M15 14l8 5-8 5V14z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        </>
      ) : type === 'zip' ? (
        <>
          <rect x="6" y="4" width="24" height="28" rx="4" stroke="currentColor" strokeWidth="1.5" />
          <path d="M14 4v28M18 8h-4M18 12h-4M18 16h-4M18 20h-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </>
      ) : (
        <>
          <rect x="6" y="4" width="24" height="28" rx="4" stroke="currentColor" strokeWidth="1.5" />
          <path d="M12 14h12M12 18h12M12 22h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </>
      )}
    </svg>
  )
}
