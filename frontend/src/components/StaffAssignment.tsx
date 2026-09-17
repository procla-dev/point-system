import { useEffect, useState, type FormEvent } from 'react'
import { getErrorMessage } from '../lib/shared'
import QrCodeScanner from './QrCodeScanner'

type Booth = {
  id: string
  name: string
  kind: 'entrance' | 'exhibitor' | 'exchanger'
}

const boothKindLabels: Record<Booth['kind'], string> = {
  entrance: '受付',
  exhibitor: '展示',
  exchanger: '交換所',
}

export default function StaffAssignment() {
  const [booths, setBooths] = useState<Booth[]>([])
  const [code, setCode] = useState('')
  const [boothId, setBoothId] = useState('')
  const [scanning, setScanning] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    async function loadBooths() {
      setLoading(true)
      setError('')
      try {
        const response = await fetch('/api/booths', { credentials: 'include' })
        if (!response.ok) throw new Error(await getErrorMessage(response, 'ブースを取得できませんでした。'))
        setBooths((await response.json()) as Booth[])
      } catch (value) {
        setError(value instanceof Error ? value.message : 'ブースを取得できませんでした。')
      } finally {
        setLoading(false)
      }
    }

    void loadBooths()
  }, [])

  async function assignStaff(event: FormEvent) {
    event.preventDefault()
    if (!code.trim()) return

    setSubmitting(true)
    setError('')
    setMessage('')
    try {
      const response = await fetch('/api/staff/booth', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim(), boothId: boothId || null }),
      })
      if (!response.ok) throw new Error(await getErrorMessage(response, 'スタッフの担当ブースを更新できませんでした。'))

      const booth = (await response.json()) as { name: string } | null
      setMessage(booth ? `担当ブースを「${booth.name}」に設定しました。` : '担当ブースを解除しました。')
      setCode('')
      setScanning(false)
    } catch (value) {
      setError(value instanceof Error ? value.message : 'スタッフの担当ブースを更新できませんでした。')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="staff-assignment">
      <h2>スタッフのブース割り当て</h2>
      <form onSubmit={(event) => void assignStaff(event)}>
        <p>
          <label htmlFor="staff-identity-code">スタッフの識別コード</label>
        </p>
        <input
          id="staff-identity-code"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          required
        />
        <p>
          <button type="button" onClick={() => setScanning((value) => !value)} disabled={submitting}>
            {scanning ? 'カメラを閉じる' : 'QRコードを読み取る'}
          </button>
        </p>
        {scanning && <QrCodeScanner onScan={(value) => { setCode(value); setScanning(false) }} />}
        <p>
          <label htmlFor="staff-booth">担当ブース</label>
        </p>
        <select
          id="staff-booth"
          value={boothId}
          onChange={(event) => setBoothId(event.target.value)}
          disabled={loading || submitting}
        >
          <option value="">担当なし（解除）</option>
          {booths.map((booth) => (
            <option key={booth.id} value={booth.id}>
              {booth.name}（{boothKindLabels[booth.kind]}）
            </option>
          ))}
        </select>
        <p>
          <button type="submit" disabled={loading || submitting}>
            {submitting ? '更新中…' : '担当を更新'}
          </button>
        </p>
      </form>
      {message && <p>{message}</p>}
      {error && <p role="alert">{error}</p>}
    </section>
  )
}
