import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthProvider'
import { ProtectedRoute } from './components/ProtectedRoute'
import { RoleRoute } from './components/RoleRoute'
import { AppShell } from './layouts/AppShell'
import { LoginPage } from './pages/LoginPage'
import { MyTasksPage } from './pages/MyTasksPage'
import { ObjectPage } from './pages/ObjectPage'
import { ObjectsPage } from './pages/ObjectsPage'
import { TaskPage } from './pages/TaskPage'

export function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route path="/objects" element={<ObjectsPage />} />
            <Route path="/objects/:objectId" element={<ObjectPage />} />
            <Route path="/tasks/:taskId" element={<TaskPage />} />
            <Route element={<RoleRoute allowed={['executor']} />}>
              <Route path="/my-tasks" element={<MyTasksPage />} />
            </Route>
          </Route>
        </Route>
        <Route path="/" element={<Navigate to="/objects" replace />} />
        <Route path="*" element={<Navigate to="/objects" replace />} />
      </Routes>
    </AuthProvider>
  )
}

