import { Assignment, Business, Logout } from '@mui/icons-material'
import {
  AppBar,
  Box,
  Button,
  Chip,
  Container,
  IconButton,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'

const roleLabels = {
  setter: 'Постановщик',
  executor: 'Исполнитель',
} as const

export function AppShell() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch {
      // Сессия всё равно будет проверена Supabase при следующем запросе.
    }
  }

  return (
    <Box sx={{ minHeight: '100vh' }}>
      <AppBar position="static">
        <Toolbar sx={{ gap: 1, flexWrap: 'wrap', py: { xs: 1, sm: 0 } }}>
          <Typography
            variant="h6"
            component="div"
            sx={{ flexGrow: 1, minWidth: { xs: '100%', sm: 'auto' } }}
          >
            Объекты и задачи
          </Typography>
          <Button
            color="inherit"
            startIcon={<Business />}
            variant={location.pathname.startsWith('/objects') ? 'outlined' : 'text'}
            onClick={() => navigate('/objects')}
          >
            Объекты
          </Button>
          {profile?.role === 'executor' && (
            <Button
              color="inherit"
              startIcon={<Assignment />}
              variant={location.pathname.startsWith('/my-tasks') ? 'outlined' : 'text'}
              onClick={() => navigate('/my-tasks')}
            >
              Мои задачи
            </Button>
          )}
          {profile && (
            <Chip
              label={`${profile.display_name} · ${roleLabels[profile.role]}`}
              color="default"
              size="small"
            />
          )}
          <Tooltip title="Выйти">
            <IconButton color="inherit" onClick={() => void handleSignOut()} aria-label="Выйти">
              <Logout />
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>
      <Container component="main" maxWidth="lg" sx={{ py: 4 }}>
        <Outlet />
      </Container>
    </Box>
  )
}

