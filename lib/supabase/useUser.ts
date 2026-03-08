'use client'

import { useState, useEffect } from 'react'
import { createClient } from './client'
import type { Role } from '@/lib/types'

export type UserProfile = {
  id: string
  name: string
  role: Role
}

export function useUser() {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user: auth } } = await supabase.auth.getUser()
      if (!auth) { setLoading(false); return }
      const { data } = await supabase
        .from('users')
        .select('id, name, role')
        .eq('id', auth.id)
        .single()
      if (data) setUser(data as UserProfile)
      setLoading(false)
    }
    load()
  }, [])

  return { user, loading }
}
