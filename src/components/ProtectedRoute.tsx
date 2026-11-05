import { Alert, Box, CircularProgress } from '@mui/material'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'

export function ProtectedRoute() {
  const { session, profile, loading, error } = useAuth()

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <CircularProgress aria-label="Загрузка" />
      </Box>
    )
  }

  if (!session) return <Navigate to="/login" replace />

  if (error || !profile) {
    return (
      <Box sx={{ maxWidth: 640, mx: 'auto', mt: 8, px: 2 }}>
        <Alert severity="error">{error ?? 'Профиль пользователя не найден.'}</Alert>
      </Box>
    )
  }

  return <Outlet />
}

