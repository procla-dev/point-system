import { useState, type FormEvent } from 'react'
import { getErrorMessage } from '../lib/shared'
import Table from './Table'

export type Team = {
  id: string
  name: string
  likeCount: number
}

type Props = {
  teams: Team[]
  loading: boolean
  onReload: () => Promise<void>
}

/** いいね数が同じチームは同じ順位にする(1, 1, 3) */
function rankOf(teams: Team[], team: Team) {
  return teams.filter((other) => other.likeCount > team.likeCount).length + 1
}

export default function TeamManagement({ teams, loading, onReload }: Props) {
  const [name, setName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function request(action: () => Promise<Response>, fallback: string, conflictMessage?: string) {
    setSubmitting(true)
    setError('')
    setMessage('')
    try {
      const response = await action()
      if (response.status === 409 && conflictMessage) throw new Error(conflictMessage)
      if (!response.ok) throw new Error(await getErrorMessage(response, fallback))
      await onReload()
      return true
    } catch (value) {
      setError(value instanceof Error ? value.message : fallback)
      return false
    } finally {
      setSubmitting(false)
    }
  }

  async function createTeam(event: FormEvent) {
    event.preventDefault()
    if (!name.trim()) return

    const ok = await request(
      () =>
        fetch('/api/teams', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: name.trim() }),
        }),
      'チームを作成できませんでした。',
      '同じ名前のチームがあります。',
    )
    if (ok) {
      setName('')
      setMessage('チームを作成しました。')
    }
  }

  function startEditing(team: Team) {
    setEditingId(team.id)
    setEditingName(team.name)
    setError('')
    setMessage('')
  }

  function cancelEditing() {
    setEditingId(null)
    setEditingName('')
  }

  async function updateTeam(event: FormEvent, id: string) {
    event.preventDefault()
    if (!editingName.trim()) return

    const ok = await request(
      () =>
        fetch(`/api/teams/${id}`, {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: editingName.trim() }),
        }),
      'チームを更新できませんでした。',
      '同じ名前のチームがあります。',
    )
    if (ok) {
      cancelEditing()
      setMessage('チームを更新しました。')
    }
  }

  async function deleteTeam(id: string) {
    if (!window.confirm('このチームを削除しますか？')) return

    const ok = await request(
      () => fetch(`/api/teams/${id}`, { method: 'DELETE', credentials: 'include' }),
      'チームを削除できませんでした。',
      'このチームに所属しているスタッフがいるため削除できません。',
    )
    if (ok) setMessage('チームを削除しました。')
  }

  return (
    <section className="team-management mt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">チーム管理</h2>
        <button type="button" onClick={() => void onReload()} disabled={loading} className="p-0! underline">
          いいね数を更新
        </button>
      </div>
      <form onSubmit={(event) => void createTeam(event)} className="mt-4 flex items-end gap-3">
        <label className="flex min-w-0 flex-1 flex-col gap-1">
          チーム名
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            placeholder="チーム名を入力"
            className="h-9 min-w-0 border-b border-gray-500 bg-transparent p-1 focus:outline-none"
          />
        </label>
        <button type="submit" disabled={submitting} className="h-9 w-10 shrink-0 p-0! underline">
          作成
        </button>
      </form>

      {loading && teams.length === 0 && <p className="mt-4">チームを読み込み中…</p>}
      {!(loading && teams.length === 0) && (
        <Table
          rows={teams}
          rowKey={(team) => team.id}
          pageSize={4}
          onPageChange={cancelEditing}
          emptyMessage="チームはありません。"
          columns={[
            {
              key: 'rank',
              header: '順位',
              width: '3.5rem',
              render: (team) => <div className="flex h-9 items-center">{rankOf(teams, team)}</div>,
            },
            {
              key: 'name',
              header: 'チーム名',
              render: (team) =>
                editingId === team.id ? (
                  <input
                    value={editingName}
                    onChange={(event) => setEditingName(event.target.value)}
                    required
                    className="h-9 w-full border-b border-gray-500 bg-transparent p-1 focus:outline-none"
                  />
                ) : (
                  <div className="flex h-9 items-center">{team.name}</div>
                ),
            },
            {
              key: 'likeCount',
              header: 'いいね',
              width: '4rem',
              render: (team) => <div className="flex h-9 items-center">{team.likeCount}</div>,
            },
            {
              key: 'actions',
              header: '操作',
              width: '8.5rem',
              render: (team) =>
                editingId === team.id ? (
                  <form onSubmit={(event) => void updateTeam(event, team.id)} className="flex h-9 flex-nowrap items-center gap-2">
                    <button type="submit" disabled={submitting} className="shrink-0 p-0! underline">保存</button>
                    <button type="button" onClick={cancelEditing} disabled={submitting} className="shrink-0 p-0! underline">
                      キャンセル
                    </button>
                  </form>
                ) : (
                  <div className="flex h-9 flex-nowrap items-center gap-2">
                    <button type="button" onClick={() => startEditing(team)} disabled={submitting} className="shrink-0 p-0! underline">
                      編集
                    </button>
                    <button type="button" onClick={() => void deleteTeam(team.id)} disabled={submitting} className="shrink-0 p-0! underline">
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
