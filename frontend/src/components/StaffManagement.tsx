import { useEffect, useState } from 'react'
import { getErrorMessage } from '../lib/shared'
import Table from './Table'
import type { Team } from './TeamManagement'

export type StaffAssignment = {
  userId: string
  displayName: string | null
  teamId: string | null
  boothIds: string[]
}

type Booth = {
  id: string
  name: string
}

type Props = {
  teams: Team[]
  onEdit: (staff: StaffAssignment) => void
}

export default function StaffManagement({ teams, onEdit }: Props) {
  const [staffList, setStaffList] = useState<StaffAssignment[]>([])
  const [booths, setBooths] = useState<Booth[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const [staffResponse, boothsResponse] = await Promise.all([
          fetch('/api/staff', { credentials: 'include' }),
          fetch('/api/booths', { credentials: 'include' }),
        ])
        if (!staffResponse.ok) throw new Error(await getErrorMessage(staffResponse, 'スタッフを取得できませんでした。'))
        if (!boothsResponse.ok) throw new Error(await getErrorMessage(boothsResponse, 'ブースを取得できませんでした。'))
        setStaffList((await staffResponse.json()) as StaffAssignment[])
        setBooths((await boothsResponse.json()) as Booth[])
      } catch (value) {
        setError(value instanceof Error ? value.message : 'スタッフを取得できませんでした。')
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [])

  const teamName = (id: string | null) => teams.find((team) => team.id === id)?.name ?? '-'
  const boothNames = (ids: string[]) =>
    booths.filter((booth) => ids.includes(booth.id)).map((booth) => booth.name).join('、') || '-'

  return (
    <section className="staff-management mt-6">
      <h2 className="text-lg font-bold">スタッフ管理</h2>
      {loading && <p className="mt-4">スタッフを読み込み中…</p>}
      {!loading && (
        <Table
          rows={staffList}
          rowKey={(staff) => staff.userId}
          pageSize={4}
          emptyMessage="スタッフはいません。"
          columns={[
            {
              key: 'displayName',
              header: '表示名',
              render: (staff) => (
                <div className="flex h-9 items-center">
                  <span className="truncate">{staff.displayName ?? '（未設定）'}</span>
                </div>
              ),
            },
            {
              key: 'team',
              header: 'チーム',
              width: '5.5rem',
              render: (staff) => (
                <div className="flex h-9 items-center">
                  <span className="truncate">{teamName(staff.teamId)}</span>
                </div>
              ),
            },
            {
              key: 'booths',
              header: '担当ブース',
              render: (staff) => <div className="flex min-h-9 items-center">{boothNames(staff.boothIds)}</div>,
            },
            {
              key: 'actions',
              header: '操作',
              width: '3.5rem',
              render: (staff) => (
                <div className="flex h-9 items-center">
                  <button type="button" onClick={() => onEdit(staff)} className="shrink-0 p-0! underline">
                    編集
                  </button>
                </div>
              ),
            },
          ]}
        />
      )}
      {error && <p role="alert" className="mt-2">{error}</p>}
    </section>
  )
}
