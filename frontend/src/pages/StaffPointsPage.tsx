import { useState, type FormEvent } from 'react'
import { getErrorMessage } from '../lib/shared'
import QrCodeScanner from '../components/QrCodeScanner'

export default function StaffPointsPage() {
  const [code, setCode] = useState('')
  const [points, setPoints] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [scanning, setScanning] = useState(false)

  async function grantPoints(event: FormEvent) {
    event.preventDefault()
    if (!code.trim() || !points || Number(points) <= 0) return
    setLoading(true)
    setMessage('')
    setError('')
    try {
      const response = await fetch('/api/users/points', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim(), points: Number(points) }),
      })
      if (!response.ok) throw new Error(await getErrorMessage(response, 'ポイントを付与できませんでした。'))
      const result = (await response.json()) as { grantedPoints: number; balance: number }
      setMessage(`${result.grantedPoints}ポイント付与しました（残高：${result.balance}ポイント）`)
      setCode('')
    } catch (value) {
      setError(value instanceof Error ? value.message : 'エラーが発生しました。')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main>
      <h1>ポイント付与</h1>
      <button type="button" onClick={() => setScanning((value) => !value)}>
        {scanning ? 'カメラを閉じる' : 'QRコードをカメラで読み取る'}
      </button>
      {scanning && <QrCodeScanner onScan={(value) => { setCode(value); setScanning(false) }} />}
      <form onSubmit={(event) => void grantPoints(event)}>
        <p><label htmlFor="identity-code">ユーザー識別コード</label></p>
        <input id="identity-code" value={code} onChange={(event) => setCode(event.target.value)} required />
        <p><label htmlFor="points">付与ポイント</label></p>
        <input id="points" type="number" min="1" step="1" value={points} onChange={(event) => setPoints(event.target.value)} required />
        <p><button type="submit" disabled={loading}>{loading ? '付与中…' : 'ポイントを付与'}</button></p>
      </form>
      {message && <p>{message}</p>}
      {error && <p role="alert">{error}</p>}
    </main>
  )
}
