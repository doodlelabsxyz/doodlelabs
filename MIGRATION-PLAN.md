# Migration Plan: Full shadcn + Tailwind CSS with Dark Mode

**Scope:** ~1,600+ inline `style={{}}` occurrences across 27 pages, 41 custom CSS classes, 13 shadcn components installed → zero inline styles, full dark mode, maximized shadcn usage.

---

## The Core Problem

The project has a solid design token system in `globals.css` (`--color-coral`, `--color-brand`, `--s3`, etc.) but those tokens are used exclusively through inline `style={{ color: 'var(--color-brand)' }}` instead of being surfaced as Tailwind utilities. The fix is to **register all tokens in `@theme`** so Tailwind generates classes like `bg-coral`, `text-brand`, `p-s3` — then every inline style becomes a Tailwind class and dark mode becomes one CSS block.

---

## Phase 0 — Foundation (Do This First)

### 0.1 — Install `next-themes` for dark mode

```bash
npm install next-themes
```

Create `components/ThemeProvider.tsx` (wraps `next-themes` `ThemeProvider`), add it to `app/layout.tsx` wrapping everything with `attribute="class"`.

### 0.2 — Register all custom tokens in Tailwind `@theme`

In `globals.css`, move every `--color-*`, `--text-*`, `--radius-*`, `--s*` variable into `@theme` so Tailwind generates utility classes:

```css
@theme {
  /* Colors → bg-coral, text-coral, border-coral */
  --color-coral: #FF8080;
  --color-coral-tint: #FFF0F0;
  --color-lemon: #FFD166;
  --color-mint: #72EFCA;
  --color-lavender: #C3A7F5;
  --color-sky: #5BC4F5;
  --color-brand: #5421A2;
  --color-cream: #FDFAF5;
  --color-ink: #1A1310;
  --color-muted: #6B6560;
  --color-ghost: #B8B3AE;
  --color-border: #E8E3DC;
  --color-success: #4CAF88;
  --color-danger: #E05C5C;
  --color-warning: #F59E0B;

  /* Spacing → p-s1, gap-s3, etc. */
  --spacing-s1: 8px;
  --spacing-s2: 13px;
  --spacing-s3: 21px;
  --spacing-s4: 34px;
  --spacing-s5: 55px;
  --spacing-s6: 89px;

  /* Border radius → rounded-card, rounded-pill */
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 24px;
  --radius-pill: 9999px;
  --radius-card: 16px;

  /* Font sizes → text-2xs, text-md, etc. */
  --font-size-2xs: 10.5px;
  --font-size-xs: 12px;
  --font-size-sm: 14px;
  --font-size-base: 16px;
  --font-size-md: 18.7px;
  --font-size-lg: 24.9px;
  --font-size-xl: 33.2px;
}
```

After this, `style={{ color: 'var(--color-coral)' }}` becomes `text-coral`, `style={{ background: 'var(--color-coral-tint)' }}` becomes `bg-coral-tint`, `style={{ padding: 'var(--s3)' }}` becomes `p-s3`.

### 0.3 — Dark mode CSS variable overrides

```css
:root {
  --bg: var(--color-cream);
  --fg: var(--color-ink);
  --surface: #FFFFFF;
  --surface-raised: #F5F0E8;
  --border-color: var(--color-border);
  --muted: var(--color-muted);
}

.dark {
  --bg: #0F1410;
  --fg: #EDE8DC;
  --surface: #1A2018;
  --surface-raised: #222B20;
  --border-color: rgb(255 255 255 / 0.08);
  --muted: #7A8C78;
}
```

Then map shadcn's semantic tokens (`--background`, `--foreground`, `--card`, etc.) to these so all shadcn components automatically support dark mode.

### 0.4 — Install remaining shadcn components

```bash
npx shadcn@latest add card select tabs table popover dropdown-menu avatar scroll-area label textarea switch checkbox radio-group alert-dialog command accordion collapsible
```

This gives **25 total shadcn components** covering nearly every UI pattern in the app.

---

## Phase 1 — GSAP Decoupling

Before touching any page, swap GSAP CSS class selectors for `data-*` attributes. This means animation hooks are never conflated with styling:

| Current | Becomes |
|---------|---------|
| `.quota-card` GSAP selector | `data-animate="quota-card"` |
| `.pipe-card` | `data-animate="pipe-card"` |
| `.c-item` | `data-animate="cal-item"` |
| `gsap.from('.quota-card', ...)` | `gsap.from('[data-animate="quota-card"]', ...)` |

This lets you freely rename or remove CSS classes without breaking animations.

---

## Phase 2 — Shared Component Library

Extract the repeated patterns into small Tailwind-only components before touching pages. This prevents copy-pasting the same Tailwind class strings everywhere.

### New components to create in `components/ui/`

| Component | Replaces |
|-----------|---------|
| `<ContentCard type status />` | Every content pill (coral/lemon/mint/lavender + status badge) |
| `<StatusBadge status />` | 10-state status pills using shadcn `Badge` with `cva` variants |
| `<UserAvatar userId name size />` | All avatar circles using shadcn `Avatar` |
| `<ClientChip clientId name color />` | Client color-dot + name inline chip |
| `<PlatformBadge platform />` | Instagram/TikTok/etc icons |
| `<SectionHeader title action />` | Page section titles with optional CTA |
| `<EmptyState icon title body action />` | Empty state illustrations |
| `<FilterPill label active onClick />` | Active/inactive filter pills using `Button` variant |

### `StatusBadge` example using `cva`

```tsx
const statusVariants = cva('rounded-pill text-xs font-semibold px-s2 py-0.5', {
  variants: {
    status: {
      planned:            'bg-ghost/20 text-muted',
      'brief-ready':      'bg-sky/20 text-sky-700',
      'in-design':        'bg-coral/20 text-coral',
      'in-editing':       'bg-lemon/20 text-amber-700',
      'ready-for-review': 'bg-mint/20 text-emerald-700',
      approved:           'bg-success/20 text-success',
      posted:             'bg-brand/20 text-brand',
      overdue:            'bg-danger/20 text-danger',
    }
  }
})
```

---

## Phase 3 — Shell Migration

**`TopBar.tsx`** (7 inline styles → 0):
- Replace `style={{ background }}` → `bg-[var(--surface)]` or `bg-surface`
- Replace `style={{ color }}` → `text-fg`, `text-muted`
- Add theme toggle button using shadcn `Button` + `useTheme()` from `next-themes`

**`PillNav.tsx`** (4 inline styles → 0):
- Replace `style={{ background: 'white' }}` → `bg-white dark:bg-surface`
- All active states via `cn(isActive && 'text-brand')`

**`AppSidebar.tsx`** (9 inline styles → 0):
- CSS variables already drive the sidebar (`--sidebar`, `--sidebar-foreground`) — update dark mode values
- Remove remaining `style={{ color: avatar }}` → use `UserAvatar` component

---

## Phase 4 — Page Migration (Ordered by Complexity)

### Group A — Simple Pages (4 pages)

**`notifications/page.tsx`, `audit/page.tsx`, `ideas/page.tsx`, `assets/page.tsx`**

Strategy: Wrap in shadcn `Card`, replace status colors with `StatusBadge`, replace user chips with `UserAvatar`. All layout margins/padding become Tailwind spacing utilities.

---

### Group B — Task Pages (3 pages)

**`tasks/page.tsx`, `tasks/upcoming/page.tsx`, `tasks/done/page.tsx`**

- Task rows → shadcn `Card` with `cn()` for status coloring
- Role badges → `<Badge>` with `cva` variants
- Checkbox states → shadcn `Checkbox`
- Due date coloring → `cn(isOverdue && 'text-danger')`

---

### Group C — Dashboard

**`dashboard/page.tsx`**

- Metric cards → shadcn `Card` + `Progress`
- Content type breakdown → colors from Tailwind theme
- Greeting → keep illustration, remove inline styles from wrapper

---

### Group D — Analytics

**`analytics/page.tsx`** (60 inline styles — partially done, grid fixed)

- Metric cards: already converted to `grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5`
- Chart wrappers → shadcn `Card`
- Header → already fixed to cream background
- Filter period → shadcn `ToggleGroup`
- Remaining inline colors → Tailwind color utilities

---

### Group E — Team

**`team/page.tsx`** (87 inline styles)

- Member rows → shadcn `Card` or `Table`
- Role badges → already migrated to shadcn `Badge`
- Workload bars → shadcn `Progress`
- Avatar → `UserAvatar` component

---

### Group F — Settings

**`settings/page.tsx`** (79 inline styles)

- 4-tab layout → shadcn `Tabs`
- Form fields → shadcn `Input`, `Label`, `Textarea`, `Switch`
- Billing plan cards → shadcn `Card` with `cn(isCurrentPlan && 'ring-2 ring-brand')`
- Section dividers → shadcn `Separator`

---

### Group G — Finance

**`finance/page.tsx`** (106 inline styles)

- Invoice rows → shadcn `Table` (Invoice Status → `StatusBadge`)
- Summary cards → shadcn `Card` + large `text-xl font-bold text-fg`
- Expense list → shadcn `Table`
- Add invoice → shadcn `Dialog`
- Month picker → shadcn `Select`
- Salary table → shadcn `Table`

---

### Group H — Clients

**`clients/page.tsx`** (141 inline styles — highest count)

- Master-detail layout: replace `.clients-layout.has-detail` CSS with Tailwind:
  ```tsx
  <div className={cn('flex gap-0', selectedClient && 'gap-s3')}>
    <div className={cn('w-full md:w-80 shrink-0', selectedClient && 'hidden md:block')}>
    <div className={cn('flex-1', !selectedClient && 'hidden md:block')}>
  ```
- Client list items → shadcn `Card`
- Client tabs → shadcn `Tabs`
- Platform badges → `PlatformBadge` component
- `AddClientModal` → already uses shadcn `Dialog`

> **Note on brand colors:** Dynamically set brand colors (fetched from DB per client) are the one legitimate exception to "no inline styles" — you cannot know these at build time. Use `style={{ '--client-color': client.brandColor } as CSSProperties}` and reference `var(--client-color)` in Tailwind arbitrary values where needed.

---

### Group I — Brief

**`brief/[id]/page.tsx`** (108 inline styles)

- Section wrappers → shadcn `Card` with `CardHeader`, `CardContent`
- Script sections (VideoScene, StoryFrame, GraphicCopy) → `Card` per item
- Status banner → `StatusBadge` + Tailwind
- Assignee list → `UserAvatar` row
- Text areas → shadcn `Textarea`

---

### Group J — Calendar (Delicate — keep structure, restyle)

**`calendar/page.tsx`** (94 inline styles)

The calendar grid is custom-built and there is no shadcn equivalent for a full scheduling calendar. **Strategy: keep the grid structure, replace every inline style with Tailwind.**

- View toggle → shadcn `ToggleGroup` (`Month | Week | Day`)
- Month grid: `<div className="grid grid-cols-7">` with `<div className="aspect-square p-1 border-r border-b border-border">` for each cell
- Content chips → `<ContentCard>` component (coral/lemon/mint/lavender via Tailwind)
- Current day highlight → `cn(isToday && 'bg-brand/10 ring-1 ring-brand')`
- Navigation arrows → shadcn `Button` variant="ghost" size="icon"
- Keep `.c-item` → `data-animate="cal-item"` for GSAP

The calendar becomes entirely Tailwind grid/flex with semantic color classes. Dark mode works automatically because colors reference CSS variables.

---

### Group K — Planning (Delicate — split into components)

**`planning/page.tsx`** (73 inline styles)

- **Mini-calendar** → replace custom with shadcn `Calendar` (`react-day-picker`), styled with Tailwind
- **Responsive layout** — replace `.planning-layout` + `@media` `<style>` tag with:
  ```tsx
  <div className="flex flex-col md:flex-row gap-s3">
    <aside className="w-full md:w-72 shrink-0">  {/* quota panel */}
    <main className="flex-1 min-w-0">            {/* content list */}
  ```
- **Quota cards** → shadcn `Card` + shadcn `Progress` (bar replaces SVG ring)
- **SVG progress ring** → keep as-is but replace `style={{ stroke }}` with `className="stroke-brand"`
- **Add content form** → shadcn `Dialog` with `Input`, `Select`, `Label`
- Remove `<style>` tag from JSX entirely

---

### Group L — Pipeline/Kanban (Delicate — most interactive)

**`pipeline/page.tsx`** (55 inline styles)

The Kanban is a unique layout. **Strategy: Tailwind columns, shadcn cards, shadcn menus.**

- **Column container**: `<div className="flex gap-s3 overflow-x-auto pb-s3 snap-x">`
- **Each column**: `<div className="snap-start shrink-0 w-64 flex flex-col gap-s2">`
- **Column header**: `<div className="flex items-center gap-2 px-s2 py-s1 rounded-card bg-surface text-sm font-semibold text-muted">`
- **Content card**: shadcn `Card` with `cn(type === 'graphic' && 'border-l-4 border-l-coral')` left accent
- **Status color mapping** — all 7 statuses → Tailwind via `cva`
- **Filter pills** → `FilterPill` component using shadcn `Button` variant="outline" + `cn(active && 'bg-brand text-white border-brand')`
- **Move/Assign popup** → shadcn `Popover` + `Command` (searchable list) — replaces fixed-position custom popup
- **Reassign dropdown** → shadcn `DropdownMenu`
- Keep `.pipe-card` → `data-animate="pipe-card"` for GSAP

---

### Group M — Client Portal Pages (4 pages)

**`client/page.tsx`, `client/calendar/page.tsx`, `client/notes/page.tsx`, `client/approval/[id]/page.tsx`**

- Approval page → shadcn `Card` + `Button` (Approve/Reject)
- Notes → shadcn `Textarea` + `Card`
- Client calendar → same strategy as main calendar (Group J)

---

## Phase 5 — `globals.css` Cleanup

After all pages are migrated:

1. **Delete** all custom class definitions (`.page-main`, `.clients-layout`, `.planning-layout`, `.quota-card`, `.pipe-card`, `.c-item`, etc.)
2. **Keep** only:
   - `@import "tailwindcss"`
   - `@theme { ... }` block with all tokens
   - `:root` and `.dark` CSS variable overrides
   - Scrollbar styling (no Tailwind equivalent)
   - View transition keyframes (no Tailwind equivalent)
   - `@layer base { * { ... } }` resets
3. **Add** `.dark` sidebar variable overrides

---

## Phase 6 — Theme Toggle UI

Add theme toggle to `TopBar.tsx`:

```tsx
import { useTheme } from 'next-themes'

const { theme, setTheme } = useTheme()

<Button variant="ghost" size="icon" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
  <SunIcon className="dark:hidden" />
  <MoonIcon className="hidden dark:block" />
</Button>
```

---

## What Never Gets Replaced

| Pattern | Why inline style is acceptable |
|---------|-------------------------------|
| `brandColor` per client | Dynamic DB data, unknown at build time |
| `avatarColor` per user | Hash-computed runtime value |
| SVG `stroke` on rings | SVG attributes, not CSS |
| GSAP `.set()` calls | Runtime animation transforms |

For brand/avatar colors specifically, use CSS custom properties on the element:

```tsx
<div
  style={{ '--accent': client.brandColor } as CSSProperties}
  className="bg-[var(--accent)] ..."
>
```

---

## Migration Order Summary

| Phase | Work | Est. Lines Changed |
|-------|------|--------------------|
| 0 | Foundation (@theme, next-themes, CSS vars) | 150 |
| 1 | GSAP decoupling (data-animate attrs) | 30 |
| 2 | Shared components (8 new components) | 300 |
| 3 | Shell (AppSidebar, TopBar, PillNav) | 80 |
| 4A | Notifications, Audit, Ideas, Assets | 400 |
| 4B | Tasks (3 pages) | 350 |
| 4C–D | Dashboard, Analytics | 300 |
| 4E–F | Team, Settings | 500 |
| 4G–H | Finance, Clients | 800 |
| 4I | Brief | 600 |
| 4J–L | Calendar, Planning, Pipeline | 900 |
| 4M | Client portal (4 pages) | 400 |
| 5 | globals.css cleanup | −200 (deletions) |
| 6 | Theme toggle | 30 |

**Total: ~4,840 lines touched, ~1,600 inline styles eliminated, 0 custom CSS classes remaining.**

---

## Inline Style Audit (Current State)

| File | `style={{` count |
|------|-----------------|
| `clients/page.tsx` | 141 |
| `brief/[id]/page.tsx` | 108 |
| `finance/page.tsx` | 106 |
| `calendar/page.tsx` | 94 |
| `team/page.tsx` | 87 |
| `client/calendar/page.tsx` | 82 |
| `settings/page.tsx` | 79 |
| `planning/page.tsx` | 73 |
| `analytics/page.tsx` | 60 |
| `pipeline/page.tsx` | 55 |
| All others | ~230 |
| **Total** | **~1,600+** |
