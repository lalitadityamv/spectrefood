import { createContext, useContext, useEffect, useState } from 'react'
import { supabase, getUserProfile, getUserByEmail } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [user, setUser] = useState(null)       // Supabase auth user
  const [profile, setProfile] = useState(null) // Our public.users row
  const [loading, setLoading] = useState(true)

  const fetchProfile = async (authUser) => {
    if (!authUser) { setProfile(null); return }
    // Try by ID first, fallback to email
    let { data } = await getUserProfile(authUser.id)
    if (!data) {
      const res = await getUserByEmail(authUser.email)
      data = res.data
    }
    setProfile(data)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      fetchProfile(session?.user).finally(() => setLoading(false))
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        await fetchProfile(session?.user)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const refreshProfile = async () => {
    if (user) await fetchProfile(user)
  }

  const value = {
    session,
    user,
    profile,
    loading,
    isAdmin: profile?.role === 'admin',
    isParticipant: profile?.role === 'participant',
    refreshProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
