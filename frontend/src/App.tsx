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

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginRoute />} />
        <Route path="/staff/entrance" element={<StaffPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
