import { useEffect, useState, type FormEvent } from 'react'
import { getErrorMessage } from '../lib/shared'
import Select from './Select'
import type { StaffAssignment } from './StaffLookup'
import type { Team } from './TeamManagement'

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

type Props = {
  staff: StaffAssignment
  teams: Team[]
  onBack: () => void
  onSaved: () => void
}

export default function StaffEditView({ staff, teams, onBack, onSaved }: Props) {
  const [booths, setBooths] = useState<Booth[]>([])
  const [teamId, setTeamId] = useState(staff.teamId ?? '')
  const [boothIds, setBoothIds] = useState<string[]>(staff.boothIds)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadBooths() {
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

  function toggleBooth(id: string) {
    setBoothIds((current) => (current.includes(id) ? current.filter((value) => value !== id) : [...current, id]))
  }

  async function save(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const response = await fetch(`/api/staff/${staff.userId}/assignment`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId: teamId || null, boothIds }),
      })
      if (!response.ok) throw new Error(await getErrorMessage(response, 'スタッフを更新できませんでした。'))
      onSaved()
    } catch (value) {
      setError(value instanceof Error ? value.message : 'スタッフを更新できませんでした。')
      setSubmitting(false)
    }
  }

  return (
    <main className="admin-page">
      <button type="button" onClick={onBack} className="font-bold!">
        ← 戻る
      </button>
      <form onSubmit={(event) => void save(event)} className="mt-4 space-y-6">
        <label className="flex flex-col gap-1">
          チーム
          <Select wrapperClassName="h-9 w-full" value={teamId} onChange={(event) => setTeamId(event.target.value)}>
            <option value="">所属なし</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>{team.name}</option>
            ))}
          </Select>
        </label>

        <fieldset>
          <legend>担当ブース</legend>
          {loading && <p className="mt-2">ブースを読み込み中…</p>}
          {!loading && booths.length === 0 && <p className="mt-2 text-gray-500">ブースはありません。</p>}
          <div className="mt-2 flex flex-col gap-2">
            {booths.map((booth) => (
              <label key={booth.id} className="flex items-center gap-2">
                <input type="checkbox" checked={boothIds.includes(booth.id)} onChange={() => toggleBooth(booth.id)} />
                {booth.name}（{boothKindLabels[booth.kind]}）
              </label>
            ))}
          </div>
        </fieldset>

        <button type="submit" disabled={loading || submitting} className="p-0! underline">
          {submitting ? '保存中…' : '保存'}
        </button>
      </form>
      {error && <p role="alert" className="mt-2">{error}</p>}
    </main>
  )
}
