'use client'

import { Suspense, useState, useRef, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'

import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogAction,
} from '@/components/ui/alert-dialog'
import { useToast } from '@/components/ui/toaster'
import { UserAvatar } from '@/components/ui/user-avatar'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useOrg } from '@/lib/supabase/OrgContext'
import type { AssetType, ContentType } from '@/lib/types'
import { CONTENT_TYPE_STYLE } from '@/lib/color-map'
import { TypeIcon } from '@/components/ui/type-icon'

gsap.registerPlugin(useGSAP)

const TYPE_CFG: Record<AssetType, { label: string; contentType: ContentType }> = {
  graphic: { label: 'Graphic', contentType: 'graphic' },
  'raw-footage': { label: 'Raw Video', contentType: 'video' },
  'edited-video': { label: 'Edited', contentType: 'reel' },
  'brand-material': { label: 'Brand', contentType: 'story' },
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

const MAX_BYTES = 25 * 1024 * 1024
const UPLOAD_ROLES = ['admin', 'designer', 'videographer', 'editor']

function formatSize(bytes: number) {
  return bytes >= 1024 * 1024 * 1024
    ? `${(bytes / 1024 ** 3).toFixed(1)} GB`
    : `${(bytes / 1024 ** 2).toFixed(1)} MB`
}

function inferType(mime: string): AssetType {
  if (mime.startsWith('image/')) return 'graphic'
  if (mime.startsWith('video/')) return 'raw-footage'
  return 'brand-material'
}

type AssetRow = {
  id: string
  type: AssetType
  file_name: string
  file_size: string | null
  uploaded_at: string
  content_id: string | null
  client_id: string | null
  storage_path: string | null
  clients: { id: string; name: string; brand_color: string } | null
  users: { id: string; name: string } | null
}

type ClientRow = { id: string; name: string; brand_color: string }
type ContentOption = { id: string; title: string; client_id: string | null }

type AssetFetchRow = Omit<AssetRow, 'clients' | 'users'> & {
  clients: AssetRow['clients'] | AssetRow['clients'][]
  users: AssetRow['users'] | AssetRow['users'][]
}

function FilterPill({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'min-h-11 rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap transition-colors',
        active
          ? 'bg-mint text-dark'
          : 'bg-white/7 text-dark-muted hover:bg-white/10 hover:text-dark-text'
      )}
    >
      {label}
    </button>
  )
}

export default function AssetsPage() {
  return (
    <Suspense fallback={null}>
      <AssetsPageInner />
    </Suspense>
  )
}

function AssetsPageInner() {
  const searchParams = useSearchParams()
  const contentParam = searchParams.get('content') || ''
  const gridRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)
  const [assets, setAssets] = useState<AssetRow[]>([])
  const [clients, setClients] = useState<ClientRow[]>([])
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<AssetType | 'all'>('all')
  const [clientFilter, setClientFilter] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const { org } = useOrg()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [role, setRole] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const toast = useToast()
  const [uploading, setUploading] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<AssetRow | null>(null)
  const [uploadClient, setUploadClient] = useState('')
  const [contentPieces, setContentPieces] = useState<ContentOption[]>([])
  const [uploadContent, setUploadContent] = useState('')
  const [uploadType, setUploadType] = useState<AssetType | 'auto'>('auto')
  const [previews, setPreviews] = useState<Record<string, string>>({})

  async function loadAssets() {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('assets')
      .select(
        'id, type, file_name, file_size, uploaded_at, content_id, client_id, storage_path, clients(id, name, brand_color), users!assets_uploaded_by_fkey(id, name)'
      )
      .order('uploaded_at', { ascending: false })
    if (error) {
      setLoadError(error.message)
      return
    }
    setLoadError(null)
    const rows = ((data || []) as unknown as AssetFetchRow[]).map(a => ({
      ...a,
      clients: Array.isArray(a.clients) ? (a.clients[0] ?? null) : a.clients,
      users: Array.isArray(a.users) ? (a.users[0] ?? null) : a.users,
    }))
    setAssets(rows)

    const imagePaths = rows
      .filter(a => a.storage_path && fileIcon(a.file_name) === 'img')
      .map(a => a.storage_path as string)
    if (imagePaths.length) {
      const { data: signed } = await supabase.storage.from('assets').createSignedUrls(imagePaths, 3600)
      const map: Record<string, string> = {}
      signed?.forEach(s => {
        if (s.path && s.signedUrl) map[s.path] = s.signedUrl
      })
      setPreviews(map)
    } else {
      setPreviews({})
    }
  }

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)

      const [, clientsRes, profileRes, piecesRes] = await Promise.all([
        loadAssets(),
        supabase.from('clients').select('id, name, brand_color'),
        supabase.from('users').select('role').eq('id', user.id).single(),
        supabase
          .from('content_pieces')
          .select('id, title, client_id')
          .order('created_at', { ascending: false })
          .limit(200),
      ])

      const pieces = (piecesRes.data || []) as ContentOption[]
      setContentPieces(pieces)
      const preset = pieces.find(p => p.id === contentParam)
      if (preset) {
        setUploadContent(preset.id)
        setUploadClient(preset.client_id ?? '')
      }

      setClients((clientsRes.data || []) as ClientRow[])
      setRole((profileRes.data as { role: string } | null)?.role ?? null)
      setMounted(true)
    }
    void load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const canUpload = !!role && UPLOAD_ROLES.includes(role)
  const canDelete = role === 'admin'
  const selectedPiece = contentPieces.find(p => p.id === uploadContent) ?? null

  function selectContent(id: string) {
    setUploadContent(id)
    const piece = contentPieces.find(p => p.id === id)
    if (piece) setUploadClient(piece.client_id ?? '')
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0 || !org || !userId) return
    setUploading(true)
    const supabase = createClient()
    const errors: string[] = []
    let uploaded = 0

    for (const file of Array.from(files)) {
      if (file.size > MAX_BYTES) {
        errors.push(`${file.name}: larger than 25 MB`)
        continue
      }
      const safeName = file.name.replace(/[^A-Za-z0-9._-]/g, '_')
      const clientForPath = selectedPiece?.client_id ?? uploadClient
      const path = `${org.id}/${clientForPath || 'general'}/${crypto.randomUUID()}-${safeName}`
      const { error: upErr } = await supabase.storage
        .from('assets')
        .upload(path, file, { contentType: file.type || undefined })
      if (upErr) {
        errors.push(`${file.name}: ${upErr.message}`)
        continue
      }
      const { error: rowErr } = await supabase.from('assets').insert({
        org_id: org.id,
        client_id: clientForPath || null,
        content_id: selectedPiece?.id ?? null,
        type: uploadType === 'auto' ? inferType(file.type) : uploadType,
        file_name: file.name,
        file_size: formatSize(file.size),
        uploaded_by: userId,
        storage_path: path,
      })
      if (rowErr) {
        await supabase.storage.from('assets').remove([path])
        errors.push(`${file.name}: ${rowErr.message}`)
        continue
      }
      uploaded++
    }

    if (uploaded > 0) {
      toast.success(`${uploaded} ${uploaded === 1 ? 'file' : 'files'} uploaded`)
    }
    if (errors.length) {
      toast.toast({
        title: `${errors.length} ${errors.length === 1 ? 'upload' : 'uploads'} failed`,
        description: errors.join(' · '),
        variant: 'error',
      })
    }
    await loadAssets()
    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleDownload(asset: AssetRow) {
    if (!asset.storage_path) return
    setBusyId(asset.id)
    const { data, error } = await createClient()
      .storage.from('assets')
      .createSignedUrl(asset.storage_path, 60, { download: asset.file_name })
    setBusyId(null)
    if (error || !data) {
      toast.error(`Could not download ${asset.file_name}`)
      return
    }
    window.open(data.signedUrl, '_blank', 'noopener')
    toast.success(`Downloading ${asset.file_name}`)
  }

  async function handleDelete(asset: AssetRow) {
    setBusyId(asset.id)
    const supabase = createClient()
    // Row first (RLS-guarded); an orphaned object is safer than a dangling row.
    const { data: deleted, error } = await supabase
      .from('assets')
      .delete()
      .eq('id', asset.id)
      .select('id')
    if (error || !deleted || deleted.length === 0) {
      setBusyId(null)
      setPendingDelete(null)
      toast.toast({
        title: `Could not delete ${asset.file_name}`,
        description: error?.message ?? 'Delete not permitted',
        variant: 'error',
      })
      return
    }
    if (asset.storage_path) {
      const { error: rmErr } = await supabase.storage.from('assets').remove([asset.storage_path])
      if (rmErr) {
        toast.toast({
          title: 'Record removed, but file cleanup failed',
          description: rmErr.message,
          variant: 'error',
        })
      } else {
        toast.success(`Deleted ${asset.file_name}`)
      }
    } else {
      toast.success(`Deleted ${asset.file_name}`)
    }
    setBusyId(null)
    setPendingDelete(null)
    await loadAssets()
  }

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

  if (!mounted) {
    return (
      <div className="flex min-w-0 flex-1 flex-col gap-3.5 px-4 py-5" aria-busy="true" aria-label="Loading assets">
        <Skeleton className="h-10 w-full rounded-xl" />
        <Skeleton className="h-9 w-2/3 rounded-full" />
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    )
  }

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
              <p className="text-base font-extrabold leading-none text-mint">{assets.length}</p>
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
            onClick={() => setTypeFilter('all')}
          />
          {(Object.entries(TYPE_CFG) as [AssetType, (typeof TYPE_CFG)[AssetType]][]).map(([t, c]) => (
            <FilterPill
              key={t}
              label={c.label}
              active={typeFilter === t}
              onClick={() => setTypeFilter(typeFilter === t ? 'all' : t)}
            />
          ))}
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-0.5">
          <FilterPill
            label="All Clients"
            active={!clientFilter}
            onClick={() => setClientFilter(null)}
          />
          {clients.map(c => (
            <FilterPill
              key={c.id}
              label={c.name}
              active={clientFilter === c.id}
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
                viewMode === v && 'bg-primary text-primary-foreground hover:bg-primary/85'
              )}
            >
              {v}
            </Button>
          ))}
        </div>

        {canUpload && (
          <div className="flex w-full flex-wrap items-center gap-2 sm:ml-auto sm:w-auto">
            {selectedPiece && (
              <span className="flex max-w-full items-center gap-1 rounded-full bg-wash py-1 pr-1 pl-3 text-xs font-semibold text-primary">
                <span className="truncate">Uploading for: {selectedPiece.title || 'Untitled'}</span>
                <button
                  type="button"
                  aria-label="Clear content piece"
                  onClick={() => setUploadContent('')}
                  className="flex size-7 shrink-0 items-center justify-center rounded-full hover:bg-sage"
                >
                  ×
                </button>
              </span>
            )}
            <select
              value={uploadContent}
              onChange={e => selectContent(e.target.value)}
              aria-label="Content piece"
              className="h-8 max-w-48 rounded-md border border-border bg-card px-2 text-xs text-foreground"
            >
              <option value="">No content piece</option>
              {contentPieces.map(p => (
                <option key={p.id} value={p.id}>
                  {p.title || 'Untitled'}
                </option>
              ))}
            </select>
            <select
              value={selectedPiece ? (selectedPiece.client_id ?? '') : uploadClient}
              disabled={!!selectedPiece}
              onChange={e => setUploadClient(e.target.value)}
              aria-label="Upload client"
              className="h-8 rounded-md border border-border bg-card px-2 text-xs text-foreground"
            >
              <option value="">General</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <select
              value={uploadType}
              onChange={e => setUploadType(e.target.value as AssetType | 'auto')}
              aria-label="Asset type"
              className="h-8 rounded-md border border-border bg-card px-2 text-xs text-foreground"
            >
              <option value="auto">Auto type</option>
              {(Object.keys(TYPE_CFG) as AssetType[]).map(t => (
                <option key={t} value={t}>
                  {TYPE_CFG[t].label}
                </option>
              ))}
            </select>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              hidden
              onChange={e => void handleFiles(e.target.files)}
            />
            <Button
              size="sm"
              disabled={uploading || !org}
              onClick={() => fileInputRef.current?.click()}
              className="rounded-full bg-primary text-primary-foreground hover:bg-primary/85"
            >
              {uploading ? 'Uploading…' : 'Upload'}
            </Button>
          </div>
        )}
      </section>

      {loadError && (
        <div
          role="alert"
          className="mx-4 mb-3 rounded-xl border border-danger/30 bg-danger-tint px-3 py-2 text-xs font-medium text-danger-ink"
        >
          Could not load assets: {loadError}
        </div>
      )}

      <div ref={gridRef} className="flex-1 px-4 pb-20">
        {filtered.length === 0 ? (
          <Card className="border border-dashed border-border bg-card shadow-none">
            <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
              <div className="flex size-[72px] items-center justify-center rounded-[18px] border border-dashed border-border bg-wash">
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
                      'flex h-[120px] flex-col items-center justify-center gap-1.5 border-b-3 border-primary/40 bg-wash text-primary'
                    )}
                  >
                    {asset.storage_path && previews[asset.storage_path] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={previews[asset.storage_path]}
                        alt={asset.file_name}
                        className="size-full object-cover"
                      />
                    ) : (
                      <>
                        <FileIconSvg type={icon} />
                        <span className="text-[0.55rem] font-semibold opacity-70">
                          {asset.file_size || '—'}
                        </span>
                      </>
                    )}
                  </div>

                  <CardContent className="py-3">
                    <p className="mb-1 truncate text-xs font-bold leading-5 text-foreground">
                      {asset.file_name}
                    </p>
                    <div className="mb-2 flex items-center gap-1.5">
                      <Badge className={cn('gap-1 px-1.5 text-[0.6rem] font-bold', CONTENT_TYPE_STYLE[cfg.contentType].className)}>
                        <TypeIcon name={CONTENT_TYPE_STYLE[cfg.contentType].icon} className="size-2.5" />
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
                    <AssetActions
                      asset={asset}
                      busy={busyId === asset.id}
                      canDelete={canDelete}
                      onDownload={() => void handleDownload(asset)}
                      onDelete={() => setPendingDelete(asset)}
                    />
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
                    <span className={cn('flex size-5 shrink-0 items-center justify-center rounded-md', CONTENT_TYPE_STYLE[cfg.contentType].className)} title={cfg.label}>
                      <TypeIcon name={CONTENT_TYPE_STYLE[cfg.contentType].icon} className="size-2.5" />
                      <span className="sr-only">{cfg.label}</span>
                    </span>
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
                    <AssetActions
                      asset={asset}
                      busy={busyId === asset.id}
                      canDelete={canDelete}
                      onDownload={() => void handleDownload(asset)}
                      onDelete={() => setPendingDelete(asset)}
                    />
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={open => {
          if (!open && !(pendingDelete && busyId === pendingDelete.id)) setPendingDelete(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this file?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{pendingDelete?.file_name}&rdquo; will be permanently removed. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={pendingDelete !== null && busyId === pendingDelete.id}
              className="h-11 rounded-full px-5"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={pendingDelete !== null && busyId === pendingDelete.id}
              onClick={() => {
                if (pendingDelete) void handleDelete(pendingDelete)
              }}
              className="h-11 rounded-full bg-danger px-5 text-danger-foreground hover:bg-danger/85"
            >
              {pendingDelete !== null && busyId === pendingDelete.id ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  )
}

function AssetActions({
  asset,
  busy,
  canDelete,
  onDownload,
  onDelete,
}: {
  asset: AssetRow
  busy: boolean
  canDelete: boolean
  onDownload: () => void
  onDelete: () => void
}) {
  return (
    <div className="mt-2 flex shrink-0 items-center gap-1.5">
      <Button
        size="sm"
        variant="outline"
        disabled={busy || !asset.storage_path}
        onClick={onDownload}
        className="h-7 rounded-full px-2.5 text-[0.65rem]"
      >
        {asset.storage_path ? 'Download' : 'No file'}
      </Button>
      {canDelete && (
        <Button
          size="sm"
          variant="ghost"
          disabled={busy}
          onClick={onDelete}
          className="h-7 rounded-full px-2.5 text-[0.65rem] text-danger hover:bg-danger/10 hover:text-danger"
        >
          Delete
        </Button>
      )}
    </div>
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
