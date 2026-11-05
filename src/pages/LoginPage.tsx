import { zodResolver } from '@hookform/resolvers/zod'
import { LockOutlined } from '@mui/icons-material'
import {
  Alert,
  Avatar,
  Box,
  Button,
  CircularProgress,
  Container,
  Paper,
  TextField,
  Typography,
} from '@mui/material'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Navigate } from 'react-router-dom'
import { z } from 'zod'
import { useAuth } from '../auth/useAuth'
import { supabase, supabaseConfigurationError } from '../lib/supabase'

const loginSchema = z.object({
  email: z.email('Введите корректный email'),
  password: z.string().min(6, 'Пароль должен содержать минимум 6 символов'),
})

type LoginForm = z.infer<typeof loginSchema>

export function LoginPage() {
  const { session, profile, loading } = useAuth()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  if (!loading && session && profile) return <Navigate to="/objects" replace />

  const onSubmit = async (values: LoginForm) => {
    setSubmitError(null)
    const { error } = await supabase.auth.signInWithPassword(values)
    if (error) {
      setSubmitError(
        error.message.toLowerCase().includes('invalid login')
          ? 'Неверный email или пароль.'
          : 'Не удалось войти. Попробуйте ещё раз.',
      )
    }
  }

  return (
    <Container maxWidth="xs">
      <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', py: 4 }}>
        <Paper sx={{ width: '100%', p: { xs: 3, sm: 4 } }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ bgcolor: 'primary.main' }}>
              <LockOutlined />
            </Avatar>
            <Typography component="h1" variant="h5">
              Вход в CRM
            </Typography>
            <Typography color="text.secondary" sx={{ textAlign: 'center' }}>
              Используйте выданные администратором email и пароль
            </Typography>
            {supabaseConfigurationError && (
              <Alert severity="warning" sx={{ width: '100%' }}>
                {supabaseConfigurationError}
              </Alert>
            )}
            {submitError && (
              <Alert severity="error" sx={{ width: '100%' }}>
                {submitError}
              </Alert>
            )}
            <Box
              component="form"
              onSubmit={(event) => void handleSubmit(onSubmit)(event)}
              noValidate
              sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}
            >
              <TextField
                label="Email"
                type="email"
                autoComplete="email"
                autoFocus
                fullWidth
                error={Boolean(errors.email)}
                helperText={errors.email?.message}
                {...register('email')}
              />
              <TextField
                label="Пароль"
                type="password"
                autoComplete="current-password"
                fullWidth
                error={Boolean(errors.password)}
                helperText={errors.password?.message}
                {...register('password')}
              />
              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={isSubmitting || Boolean(supabaseConfigurationError)}
              >
                {isSubmitting ? <CircularProgress size={24} color="inherit" /> : 'Войти'}
              </Button>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  )
}

