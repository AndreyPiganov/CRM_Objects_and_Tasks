import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import type { UserRole } from '../types/database'

export function RoleRoute({ allowed }: { allowed: UserRole[] }) {
  const { profile } = useAuth()
  return profile && allowed.includes(profile.role) ? <Outlet /> : <Navigate to="/objects" replace />
}

