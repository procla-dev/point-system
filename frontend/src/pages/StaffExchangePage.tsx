import { useState, type FormEvent } from 'react'
import { getErrorMessage } from '../lib/shared'
import QrCodeScanner from '../components/QrCodeScanner'

export default function StaffExchangePage() {
  const [code, setCode] = useState('')
  const [points, setPoints] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [scanning, setScanning] = useState(false)

  async function spendPoints(event: FormEvent) {
    event.preventDefault()
    const amount = Number(points)
    if (!code.trim() || !Number.isInteger(amount) || amount <= 0) return

    setLoading(true)
    setMessage('')
    setError('')

    try {
      const response = await fetch('/api/users/points/spend', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim(), points: amount }),
      })
      if (!response.ok) {
        throw new Error(await getErrorMessage(response, 'ポイントを差し引けませんでした。'))
      }

      const result = (await response.json()) as { spentPoints: number; balance: number }
      setMessage(`${result.spentPoints}ポイント交換しました（残高：${result.balance}ポイント）`)
      setCode('')
      setPoints('')
    } catch (value) {
      setError(value instanceof Error ? value.message : 'エラーが発生しました。')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="staff-points-page">
      <h1>ポイント交換</h1>
      <p>ユーザーのQRコードを読み取り、交換するポイント数を入力してください。</p>
      <button className="staff-scan-button" type="button" onClick={() => setScanning((value) => !value)}>
        {scanning ? 'カメラを閉じる' : 'ユーザーQRを読み取る'}
      </button>
      {scanning && <QrCodeScanner onScan={(value) => { setCode(value); setScanning(false) }} />}
      <p
        className={`staff-scan-status${code ? ' is-ready' : ''}`}
        role="status"
        aria-live="polite"
      >
        {code
          ? '✓ QRコードの読み取りが完了しました。'
          : scanning
            ? 'QRコードを検出中…'
            : 'ユーザーのQRコードを読み取ってください。'}
      </p>
      <form onSubmit={(event) => void spendPoints(event)}>
        <div className="staff-points-field">
          <label htmlFor="exchange-points">交換するポイント数</label>
          <div className="staff-points-input-row">
            <input
              id="exchange-points"
              className="staff-points-input"
              type="number"
              min="1"
              step="1"
              inputMode="numeric"
              placeholder="ポイント数"
              value={points}
              onChange={(event) => setPoints(event.target.value)}
              required
            />
            <span aria-hidden="true">pt</span>
          </div>
        </div>
        <p>
          <button className="staff-primary-button staff-points-submit" type="submit" disabled={loading || !code.trim() || !points}>
            {loading ? '交換中…' : 'ポイントを交換する'}
          </button>
        </p>
      </form>
      {message && <p role="status">{message}</p>}
      {error && <p role="alert">{error}</p>}
    </main>
  )
}
