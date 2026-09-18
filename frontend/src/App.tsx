import { createBrowserRouter, Navigate, redirect, RouterProvider, useSearchParams } from 'react-router-dom'
import AdminPage from './pages/AdminPage'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import StaffPage from './pages/StaffPage'
import StaffPointsPage from './pages/StaffPointsPage'
import BoothLikePage from './pages/BoothLikePage'
import RouteErrorPage from './components/RouteErrorPage'

type Role = 'user' | 'staff' | 'admin'

function LoginRoute() {
  const [params] = useSearchParams()
  const token = params.get('token')
  return token ? <LoginPage token={token} /> : <HomePage />
}

async function requireRole(roles: Role[]) {
  let response: Response
  try {
    response = await fetch('/api/users/me', { credentials: 'include' })
  } catch {
    throw new Error('failed to check authorization')
  }
  if (!response.ok) throw redirect('/')
  const user = (await response.json()) as { role: Role }
  if (!roles.includes(user.role)) throw redirect('/')
  return null
}

const router = createBrowserRouter([
  { path: '/', element: <LoginRoute /> },
  { path: '/login', element: <LoginRoute /> },
  { path: '/staff/entrance', loader: () => requireRole(['staff', 'admin']), element: <StaffPage />, errorElement: <RouteErrorPage /> },
  { path: '/staff/point', loader: () => requireRole(['staff', 'admin']), element: <StaffPointsPage />, errorElement: <RouteErrorPage /> },
  { path: '/admin', loader: () => requireRole(['admin']), element: <AdminPage />, errorElement: <RouteErrorPage /> },
  { path: '/booths/:boothId/like', loader: () => requireRole(['user']), element: <BoothLikePage />, errorElement: <RouteErrorPage /> },
  { path: '*', element: <Navigate to="/" replace /> },
])

export default function App() {
  return <RouterProvider router={router} />
}
