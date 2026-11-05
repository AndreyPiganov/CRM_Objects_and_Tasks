import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Profile } from '../types/database'
import { AuthContext, type AuthContextValue } from './AuthContext'

interface AuthState {
  session: Session | null
  profile: Profile | null
  loading: boolean
  error: string | null
}

const initialState: AuthState = {
  session: null,
  profile: null,
  loading: true,
  error: null,
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(initialState)

  const hydrateSession = useCallback(async (session: Session | null) => {
    if (!session) {
      setState({ session: null, profile: null, loading: false, error: null })
      return
    }

    setState((current) => ({ ...current, session, loading: true, error: null }))
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single()

    if (error) {
      setState({
        session,
        profile: null,
        loading: false,
        error: 'Не удалось загрузить профиль пользователя. Обратитесь к администратору.',
      })
      return
    }

    setState({ session, profile: data, loading: false, error: null })
  }, [])

  useEffect(() => {
    let active = true

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return
      if (error) {
        setState({
          session: null,
          profile: null,
          loading: false,
          error: 'Не удалось восстановить сессию.',
        })
        return
      }
      void hydrateSession(data.session)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      window.setTimeout(() => {
        if (active) void hydrateSession(session)
      }, 0)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [hydrateSession])

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }, [])

  const refreshProfile = useCallback(async () => {
    await hydrateSession(state.session)
  }, [hydrateSession, state.session])

  const value = useMemo<AuthContextValue>(
    () => ({ ...state, signOut, refreshProfile }),
    [refreshProfile, signOut, state],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

