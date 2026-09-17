import { useEffect, useState, type FormEvent } from 'react'
import { getErrorMessage } from '../lib/shared'

type BoothKind = 'entrance' | 'exhibitor' | 'exchanger'

type Booth = {
  id: string
  name: string
  kind: BoothKind
}

const boothKindLabels: Record<BoothKind, string> = {
  entrance: '受付',
  exhibitor: '展示',
  exchanger: '交換所',
}

export default function BoothManagement() {
  const [booths, setBooths] = useState<Booth[]>([])
  const [name, setName] = useState('')
  const [kind, setKind] = useState<BoothKind>('exhibitor')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [editingKind, setEditingKind] = useState<BoothKind>('exhibitor')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

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

  useEffect(() => {
    void loadBooths()
  }, [])

  async function createBooth(event: FormEvent) {
    event.preventDefault()
    if (!name.trim()) return

    setSubmitting(true)
    setError('')
    setMessage('')
    try {
      const response = await fetch('/api/booths', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), kind }),
      })
      if (!response.ok) throw new Error(await getErrorMessage(response, 'ブースを作成できませんでした。'))
      const booth = (await response.json()) as Booth
      setBooths((current) => [...current, booth])
      setName('')
      setMessage('ブースを作成しました。')
    } catch (value) {
      setError(value instanceof Error ? value.message : 'ブースを作成できませんでした。')
    } finally {
      setSubmitting(false)
    }
  }

  function startEditing(booth: Booth) {
    setEditingId(booth.id)
    setEditingName(booth.name)
    setEditingKind(booth.kind)
    setError('')
    setMessage('')
  }

  function cancelEditing() {
    setEditingId(null)
    setEditingName('')
  }

  async function updateBooth(event: FormEvent, id: string) {
    event.preventDefault()
    if (!editingName.trim()) return

    setSubmitting(true)
    setError('')
    setMessage('')
    try {
      const response = await fetch(`/api/booths/${id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editingName.trim(), kind: editingKind }),
      })
      if (!response.ok) throw new Error(await getErrorMessage(response, 'ブースを更新できませんでした。'))
      const updated = (await response.json()) as Booth
      setBooths((current) => current.map((booth) => (booth.id === id ? updated : booth)))
      cancelEditing()
      setMessage('ブースを更新しました。')
    } catch (value) {
      setError(value instanceof Error ? value.message : 'ブースを更新できませんでした。')
    } finally {
      setSubmitting(false)
    }
  }

  async function deleteBooth(id: string) {
    if (!window.confirm('このブースを削除しますか？')) return

    setSubmitting(true)
    setError('')
    setMessage('')
    try {
      const response = await fetch(`/api/booths/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!response.ok) throw new Error(await getErrorMessage(response, 'ブースを削除できませんでした。'))
      setBooths((current) => current.filter((booth) => booth.id !== id))
      setMessage('ブースを削除しました。')
    } catch (value) {
      setError(value instanceof Error ? value.message : 'ブースを削除できませんでした。')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="booth-management">
      <h2>ブース管理</h2>
      <form onSubmit={(event) => void createBooth(event)}>
        <label>
          ブース名
          <input value={name} onChange={(event) => setName(event.target.value)} required />
        </label>{' '}
        <label>
          種類
          <select value={kind} onChange={(event) => setKind(event.target.value as BoothKind)}>
            {Object.entries(boothKindLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>{' '}
        <button type="submit" disabled={submitting}>作成</button>
      </form>

      {loading && <p>ブースを読み込み中…</p>}
      {!loading && booths.length === 0 && <p>ブースはありません。</p>}
      {!loading && booths.length > 0 && (
        <ul>
          {booths.map((booth) => (
            <li key={booth.id}>
              {editingId === booth.id ? (
                <form onSubmit={(event) => void updateBooth(event, booth.id)}>
                  <input value={editingName} onChange={(event) => setEditingName(event.target.value)} required />{' '}
                  <select value={editingKind} onChange={(event) => setEditingKind(event.target.value as BoothKind)}>
                    {Object.entries(boothKindLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>{' '}
                  <button type="submit" disabled={submitting}>保存</button>{' '}
                  <button type="button" onClick={cancelEditing} disabled={submitting}>キャンセル</button>
                </form>
              ) : (
                <>
                  <span>{booth.name}（{boothKindLabels[booth.kind]}）</span>{' '}
                  <button type="button" onClick={() => startEditing(booth)} disabled={submitting}>編集</button>{' '}
                  <button type="button" onClick={() => void deleteBooth(booth.id)} disabled={submitting}>削除</button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
      {message && <p>{message}</p>}
      {error && <p role="alert">{error}</p>}
    </section>
  )
}
