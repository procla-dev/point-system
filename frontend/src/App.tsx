import { createBrowserRouter, Navigate, redirect, RouterProvider, useSearchParams } from 'react-router-dom'
import AdminPage from './pages/AdminPage'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import StaffPage from './pages/StaffPage'
import StaffPointsPage from './pages/StaffPointsPage'

function LoginRoute() {
  const [params] = useSearchParams()
  const token = params.get('token')
  return token ? <LoginPage token={token} /> : <HomePage />
}

async function requireRole(roles: string[]) {
  const response = await fetch('/api/users/me', { credentials: 'include' })
  if (!response.ok) throw redirect('/')
  const user = (await response.json()) as { role: string }
  if (!roles.includes(user.role)) throw redirect('/')
  return null
}

const router = createBrowserRouter([
  { path: '/', element: <LoginRoute /> },
  { path: '/login', element: <LoginRoute /> },
  { path: '/staff/entrance', loader: () => requireRole(['staff', 'admin']), element: <StaffPage /> },
  { path: '/staff/point', loader: () => requireRole(['staff', 'admin']), element: <StaffPointsPage /> },
  { path: '/admin', loader: () => requireRole(['admin']), element: <AdminPage /> },
  { path: '*', element: <Navigate to="/" replace /> },
])

export default function App() {
  return <RouterProvider router={router} />
}
