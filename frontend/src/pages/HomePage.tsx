import { useCallback, useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import Card from '../components/Card'

export default function HomePage() {
  const [qrCode, setQrCode] = useState<string>()
  const [balance, setBalance] = useState<number>()
  const [displayName, setDisplayName] = useState<string>()
  const [expiresAt, setExpiresAt] = useState<Date>()
  const [remainingSeconds, setRemainingSeconds] = useState<number>()
  const [error, setError] = useState('')
  const refreshing = useRef(false)
  const refreshIdentityCode = useCallback(async () => {
    const response = await fetch('/api/users/me/identity-code', { credentials: 'include' })
    if (!response.ok) throw new Error('ログインしてください。')
    const identityData = await response.json() as { code: string; expiresAt: string }
    setQrCode(await QRCode.toDataURL(identityData.code, { width: 320, margin: 2 }))
    setExpiresAt(new Date(identityData.expiresAt))
  }, [])

  useEffect(() => {
    void (async () => {
      try {
        const [me, points] = await Promise.all([
          fetch('/api/users/me', { credentials: 'include' }),
          fetch('/api/users/me/points', { credentials: 'include' }),
        ])
        await refreshIdentityCode()
        if (!me.ok || !points.ok) throw new Error('ログインしてください。')
        const profile = await me.json() as { displayName: string | null }
        const data = await points.json() as { balance: number }
        setDisplayName(profile.displayName ?? undefined)
        setBalance(data.balance)
      } catch (e) { setError(e instanceof Error ? e.message : '情報を取得できませんでした。') }
    })()
  }, [refreshIdentityCode])

  useEffect(() => {
    if (!expiresAt) return
    const update = () => {
      const seconds = Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / 1000))
      setRemainingSeconds(seconds)
      if (seconds === 0 && !refreshing.current) {
        refreshing.current = true
        void refreshIdentityCode()
          .catch((error) => setError(error instanceof Error ? error.message : 'QRコードを更新できませんでした。'))
          .finally(() => { refreshing.current = false })
      }
    }
    update()
    const timer = window.setInterval(update, 1000)
    return () => window.clearInterval(timer)
  }, [expiresAt, refreshIdentityCode])
  if (error) return <main className="login-status"><p role="alert">{error}</p></main>
  return (
    <main className="home-page">
      <p className="point-balance">
        {balance === undefined ? '読み込み中…' : `${balance} pt`}
      </p>
      <Card className="home-card">
        {qrCode && <img src={qrCode} alt="ユーザー識別用QRコード" draggable={false} />}
        {remainingSeconds !== undefined && <p>QR有効期限：あと{remainingSeconds}秒</p>}
      </Card>
      {displayName && <p className="display-name">{displayName}さん</p>}
    </main>
  )
}
