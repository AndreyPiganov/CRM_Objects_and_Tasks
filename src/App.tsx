import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthProvider'
import { ProtectedRoute } from './components/ProtectedRoute'
import { RoleRoute } from './components/RoleRoute'
import { AppShell } from './layouts/AppShell'
import { LoginPage } from './pages/LoginPage'
import { PlaceholderPage } from './pages/PlaceholderPage'

export function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route path="/objects" element={<PlaceholderPage title="Объекты" />} />
            <Route path="/objects/:objectId" element={<PlaceholderPage title="Карточка объекта" />} />
            <Route path="/tasks/:taskId" element={<PlaceholderPage title="Карточка задачи" />} />
            <Route element={<RoleRoute allowed={['executor']} />}>
              <Route path="/my-tasks" element={<PlaceholderPage title="Мои задачи" />} />
            </Route>
          </Route>
        </Route>
        <Route path="/" element={<Navigate to="/objects" replace />} />
        <Route path="*" element={<Navigate to="/objects" replace />} />
      </Routes>
    </AuthProvider>
  )
}

