import { useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useSearchParams } from 'react-router-dom'
import AdminPage from './pages/AdminPage'
import LoginPage from './pages/LoginPage'
import StaffPage from './pages/StaffPage'
import HomePage from './pages/HomePage'

function LoginRoute() {
  const [params] = useSearchParams()
  const token = params.get('token')
  return token ? <LoginPage token={token} /> : <HomePage />
}

function RoleRoute({ roles, children }: { roles: string[]; children: React.ReactNode }) {
  const [allowed, setAllowed] = useState<boolean | null>(null)
  const rolesKey = roles.join('|')
  useEffect(() => {
    void (async () => {
      const response = await fetch('/api/users/me', { credentials: 'include' })
      if (!response.ok) return setAllowed(false)
      const user = (await response.json()) as { role: string }
      setAllowed(roles.includes(user.role))
    })()
  }, [rolesKey])
  if (allowed === null) return <main className="login-status"><p>確認中…</p></main>
  return allowed ? children : <Navigate to="/" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginRoute />} />
        <Route path="/staff/entrance" element={<RoleRoute roles={['staff', 'admin']}><StaffPage /></RoleRoute>} />
        <Route path="/admin" element={<RoleRoute roles={['admin']}><AdminPage /></RoleRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
