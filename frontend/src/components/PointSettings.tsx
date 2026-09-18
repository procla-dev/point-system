import { useEffect, useState, type FormEvent } from 'react'
import { getErrorMessage } from '../lib/shared'

export default function PointSettings() {
  const [grantPoints, setGrantPoints] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const response = await fetch('/api/admin/point-settings', { credentials: 'include' })
        if (!response.ok) throw new Error(await getErrorMessage(response, 'ポイント設定を取得できませんでした。'))
        const settings = (await response.json()) as { grantPoints: number }
        setGrantPoints(String(settings.grantPoints))
      } catch (value) {
        setError(value instanceof Error ? value.message : 'ポイント設定を取得できませんでした。')
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [])

  async function save(event: FormEvent) {
    event.preventDefault()
    const points = Number(grantPoints)
    if (!Number.isInteger(points) || points < 1) {
      setError('付与ポイント数は1以上の整数で入力してください。')
      return
    }

    setSubmitting(true)
    setError('')
    setMessage('')
    try {
      const response = await fetch('/api/admin/point-settings', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grantPoints: points }),
      })
      if (!response.ok) throw new Error(await getErrorMessage(response, 'ポイント設定を保存できませんでした。'))
      const settings = (await response.json()) as { grantPoints: number }
      setGrantPoints(String(settings.grantPoints))
      setMessage('保存しました。')
    } catch (value) {
      setError(value instanceof Error ? value.message : 'ポイント設定を保存できませんでした。')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="point-settings mt-6">
      <h2 className="text-lg font-bold">ポイント設定</h2>
      <form onSubmit={(event) => void save(event)} className="mt-4 flex items-center gap-3">
        <label htmlFor="grant-points">付与ポイント数</label>
        <span className="flex items-center gap-1">
          <input
            id="grant-points"
            type="number"
            min={1}
            step={1}
            value={grantPoints}
            onChange={(event) => setGrantPoints(event.target.value)}
            disabled={loading}
            required
            className="h-9 w-20 border-b border-gray-500 bg-transparent p-1 text-right focus:outline-none"
          />
          pt
        </span>
        <button type="submit" disabled={loading || submitting} className="h-9 shrink-0 p-0! underline">
          保存
        </button>
      </form>
      {message && <p className="mt-2">{message}</p>}
      {error && <p role="alert" className="mt-2">{error}</p>}
    </section>
  )
}
