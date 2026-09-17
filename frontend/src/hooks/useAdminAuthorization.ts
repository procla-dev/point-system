import { useEffect, useState } from 'react'
import type { Role } from '../pages/shared'

export function useAdminAuthorization() {
  const [authorized, setAuthorized] = useState<boolean | null>(null)
  useEffect(() => { void (async () => { const response = await fetch('/api/users/me', { credentials: 'include' }); if (!response.ok) return setAuthorized(false); const user = (await response.json()) as { role: Role }; setAuthorized(user.role === 'admin') })() }, [])
  return authorized
}
