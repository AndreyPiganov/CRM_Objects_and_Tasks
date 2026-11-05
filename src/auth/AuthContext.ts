import { createContext } from 'react'
import type { Session } from '@supabase/supabase-js'
import type { Profile } from '../types/database'

export interface AuthContextValue {
  session: Session | null
  profile: Profile | null
  loading: boolean
  error: string | null
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)

