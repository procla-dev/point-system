import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

export default function HomePage() {
  const [qrCode, setQrCode] = useState<string>()
  const [balance, setBalance] = useState<number>()
  const [error, setError] = useState('')
  useEffect(() => { void (async () => { try { const [identity, points] = await Promise.all([fetch('/api/users/me/identity-code', { credentials: 'include' }), fetch('/api/users/me/points', { credentials: 'include' })]); if (!identity.ok || !points.ok) throw new Error('ログインしてください。'); const { code } = await identity.json() as { code: string }; const data = await points.json() as { balance: number }; setQrCode(await QRCode.toDataURL(code, { width: 320, margin: 2 })); setBalance(data.balance) } catch (e) { setError(e instanceof Error ? e.message : '情報を取得できませんでした。') } })() }, [])
  if (error) return <main className="login-status"><p role="alert">{error}</p></main>
  return <main><h1>ホーム</h1>{balance === undefined ? <p>読み込み中…</p> : <p>ポイント：{balance}</p>}{qrCode && <img src={qrCode} alt="ユーザー識別用QRコード" />}</main>
}
