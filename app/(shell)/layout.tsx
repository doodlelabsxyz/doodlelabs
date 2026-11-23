'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AppSidebar } from '@/components/shell/AppSidebar'
import { MobilePillNav } from '@/components/shell/PillNav'
import { NAV_BY_ROLE, PLAN_LIMITS, type OrgPlan, type Role } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import { getInitials, getAvatarColor } from '@/lib/utils'
import { OrgProvider, useOrg } from '@/lib/supabase/OrgContext'
import { SidebarProvider } from '@/components/ui/sidebar'
import { ToasterProvider } from '@/components/ui/toaster'

// Inner component — consumes OrgContext (must be a child of OrgProvider)
function ShellContent({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { org } = useOrg()
  const [role, setRole] = useState<Role>('admin')
  const [userName, setUserName] = useState('Loading...')
  const [userInitials, setUserInitials] = useState('...')
  const [userColor, setUserColor] = useState('#14532D')
  const [notifCount, setNotifCount] = useState(0)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const supabase = createClient()

    async function fetchNotifCount() {
      const { count } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('read', false)
      setNotifCount(count ?? 0)
    }

    async function loadUser() {
      const { data: { user }, error } = await supabase.auth.getUser()

      if (error || !user) {
        router.push('/login')
        return
      }

      const { data: profile } = await supabase
        .from('users')
        .select('name, role')
        .eq('id', user.id)
        .single()

      if (profile) {
        setRole(profile.role as Role)
        setUserName(profile.name)
        setUserInitials(getInitials(profile.name))
        setUserColor(getAvatarColor(user.id))
      } else {
        const fallbackName = user.email?.split('@')[0] || 'User'
        setUserName(fallbackName)
        setUserInitials(getInitials(fallbackName))
      }

      await fetchNotifCount()
      setMounted(true)
    }

    loadUser()

    const channel = supabase
      .channel('notif-badge')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => {
        fetchNotifCount()
      })
      .subscribe()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') router.push('/login')
    })

    return () => {
      channel.unsubscribe()
      subscription.unsubscribe()
    }
  }, [router])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
  }

  const rawNavItems = NAV_BY_ROLE[role] || NAV_BY_ROLE.admin
  // Hide plan-gated nav items once the org's plan is known — avoids a dead-end
  // link to a page that will just show the upgrade wall.
  const navItems = org
    ? rawNavItems.filter(item => {
        const limits = PLAN_LIMITS[org.plan as OrgPlan]
        if (item.icon === 'analytics') return limits.hasAnalytics
        if (item.icon === 'audit') return limits.hasAudit
        return true
      })
    : rawNavItems

  if (!mounted) {
    return (
      <div className="flex h-dvh w-full items-center justify-center bg-background">
        <div className="size-9 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
      </div>
    )
  }

  return (
    <SidebarProvider className="h-dvh overflow-hidden">
      <AppSidebar
        items={navItems}
        userName={userName}
        userRole={role}
        userInitials={userInitials}
        userColor={userColor}
        notifCount={notifCount}
        onLogout={handleLogout}
        orgName={org?.name}
        orgPlan={org?.plan}
      />
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {children}
        <div className="md:hidden">
          <MobilePillNav items={navItems} />
        </div>
      </div>
    </SidebarProvider>
  )
}

export default function ShellLayout({ children }: { children: React.ReactNode }) {
  return (
    <OrgProvider>
      <ToasterProvider>
        <ShellContent>{children}</ShellContent>
      </ToasterProvider>
    </OrgProvider>
  )
}
