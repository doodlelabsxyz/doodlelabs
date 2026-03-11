'use client'

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { createClient } from './client'
import type { Organization } from '@/lib/types'

type OrgContextValue = {
  org: Organization | null
  loading: boolean
  refreshOrg: () => Promise<void>
}

const OrgContext = createContext<OrgContextValue>({
  org: null,
  loading: true,
  refreshOrg: async () => {},
})

export function OrgProvider({ children }: { children: ReactNode }) {
  const [org, setOrg] = useState<Organization | null>(null)
  const [loading, setLoading] = useState(true)

  async function fetchOrg() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const { data: profile } = await supabase
      .from('users')
      .select('org_id')
      .eq('id', user.id)
      .single()

    if (!profile?.org_id) { setLoading(false); return }

    const { data } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', profile.org_id)
      .single()

    if (data) setOrg(data as Organization)
    setLoading(false)
  }

  useEffect(() => {
    let cancelled = false

    async function loadOrg() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        if (!cancelled) setLoading(false)
        return
      }

      const { data: profile } = await supabase
        .from('users')
        .select('org_id')
        .eq('id', user.id)
        .single()

      if (!profile?.org_id) {
        if (!cancelled) setLoading(false)
        return
      }

      const { data } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', profile.org_id)
        .single()

      if (cancelled) return

      if (data) setOrg(data as Organization)
      setLoading(false)
    }

    void loadOrg()

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <OrgContext.Provider value={{ org, loading, refreshOrg: fetchOrg }}>
      {children}
    </OrgContext.Provider>
  )
}

export function useOrg() {
  return useContext(OrgContext)
}
