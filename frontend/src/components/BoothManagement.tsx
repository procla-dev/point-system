import { useEffect, useState, type FormEvent } from 'react'
import { getErrorMessage } from '../lib/shared'
import Select from './Select'
import Table from './Table'

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
    <section className="booth-management mt-6">
      <h2 className="text-lg font-bold">ブース管理</h2>
      <form onSubmit={(event) => void createBooth(event)} className="mt-4 flex flex-wrap items-end gap-3">
        <label className="flex min-w-0 flex-1 flex-col gap-1">
          ブース名
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            placeholder="ブース名を入力"
            className="h-9 min-w-0 border-b border-gray-500 bg-transparent p-1 focus:outline-none"
          />
        </label>
        <div className="flex shrink-0 items-end gap-1">
          <label className="flex flex-col gap-1">
            種類
            <Select
              wrapperClassName="h-9 w-24"
              value={kind}
              onChange={(event) => setKind(event.target.value as BoothKind)}
            >
              {Object.entries(boothKindLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </Select>
          </label>
          <button type="submit" disabled={submitting} className="h-9 w-10 shrink-0 p-0! underline">
            作成
          </button>
        </div>
      </form>

      {loading && <p className="mt-4">ブースを読み込み中…</p>}
      {!loading && (
        <Table
          rows={booths}
          rowKey={(booth) => booth.id}
          pageSize={4}
          onPageChange={cancelEditing}
          emptyMessage="ブースはありません。"
          columns={[
            {
              key: 'name',
              header: 'ブース名',
              render: (booth) =>
                editingId === booth.id ? (
                  <input
                    value={editingName}
                    onChange={(event) => setEditingName(event.target.value)}
                    required
                    className="h-9 w-full border-b border-gray-500 bg-transparent p-1 focus:outline-none"
                  />
                ) : (
                  <div className="flex h-9 items-center">{booth.name}</div>
                ),
            },
            {
              key: 'kind',
              header: '種類',
              width: '6rem',
              render: (booth) =>
                editingId === booth.id ? (
                  <Select
                    wrapperClassName="h-9 w-full"
                    value={editingKind}
                    onChange={(event) => setEditingKind(event.target.value as BoothKind)}
                  >
                    {Object.entries(boothKindLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </Select>
                ) : (
                  <div className="flex h-9 items-center">{boothKindLabels[booth.kind]}</div>
                ),
            },
            {
              key: 'actions',
              header: '操作',
              width: '8.5rem',
              render: (booth) =>
                editingId === booth.id ? (
                  <form onSubmit={(event) => void updateBooth(event, booth.id)} className="flex h-9 flex-nowrap items-center gap-2">
                    <button type="submit" disabled={submitting} className="shrink-0 p-0! underline">保存</button>
                    <button type="button" onClick={cancelEditing} disabled={submitting} className="shrink-0 p-0! underline">
                      キャンセル
                    </button>
                  </form>
                ) : (
                  <div className="flex h-9 flex-nowrap items-center gap-2">
                    <button type="button" onClick={() => startEditing(booth)} disabled={submitting} className="shrink-0 p-0! underline">
                      編集
                    </button>
                    <button type="button" onClick={() => void deleteBooth(booth.id)} disabled={submitting} className="shrink-0 p-0! underline">
                      削除
                    </button>
                  </div>
                ),
            },
          ]}
        />
      )}
      {message && <p className="mt-2">{message}</p>}
      {error && <p role="alert" className="mt-2">{error}</p>}
    </section>
  )
}
