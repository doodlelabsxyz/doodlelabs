'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { DesktopSidebar, MobilePillNav } from '@/components/shell/PillNav'
import { NAV_BY_ROLE, type Role } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import { getInitials, getAvatarColor } from '@/lib/utils'

const SIDEBAR_KEY = 'sidebar-collapsed'

export default function ShellLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [role, setRole] = useState<Role>('admin')
  const [userName, setUserName] = useState('Loading...')
  const [userInitials, setUserInitials] = useState('...')
  const [userColor, setUserColor] = useState('hsl(200,82%,58%)')
  const [notifCount, setNotifCount] = useState(0)
  const [mounted, setMounted] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  // Restore persisted sidebar state
  useEffect(() => {
    const saved = localStorage.getItem(SIDEBAR_KEY)
    if (saved === 'true') setCollapsed(true)
  }, [])

  function handleToggle() {
    setCollapsed(prev => {
      const next = !prev
      localStorage.setItem(SIDEBAR_KEY, String(next))
      return next
    })
  }

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

      // Fetch user profile from public.users
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

    // Realtime: update badge whenever notifications change (INSERT = new, UPDATE = mark-read)
    const channel = supabase
      .channel('notif-badge')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => {
        fetchNotifCount()
      })
      .subscribe()

    // Listen for auth changes (logout etc.)
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
    // onAuthStateChange listener will redirect to /login
  }

  const navItems = NAV_BY_ROLE[role] || NAV_BY_ROLE.admin

  if (!mounted) return null

  return (
    <div style={{ display: 'flex', height: '100dvh', overflow: 'hidden', background: 'hsl(42,38%,96%)' }}>
      <DesktopSidebar
        items={navItems}
        userName={userName}
        userRole={role}
        userInitials={userInitials}
        userColor={userColor}
        notifCount={notifCount}
        onLogout={handleLogout}
        collapsed={collapsed}
        onToggle={handleToggle}
      />
      {children}

      {/* Mobile floating avatar → settings */}
      {/* <Link
        href="/settings"
        className="md:hidden"
        style={{
          position: 'fixed', top: 14, right: 16, zIndex: 40,
          width: 36, height: 36, borderRadius: '50%',
          background: userColor,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '0.6rem', fontWeight: 800, color: '#fff',
          boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
          textDecoration: 'none',
        }}
      >
        {userInitials}
      </Link> */}

      <div className="md:hidden">
        <MobilePillNav items={navItems} />
      </div>
    </div>
  )
}
