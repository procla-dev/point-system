import { useState } from 'react'
import { getErrorMessage } from '../lib/shared'
import QrCodeScanner from './QrCodeScanner'

export type StaffAssignment = {
  userId: string
  teamId: string | null
  boothIds: string[]
}

type Props = {
  onFound: (staff: StaffAssignment) => void
}

export default function StaffLookup({ onFound }: Props) {
  const [scanning, setScanning] = useState(false)
  const [looking, setLooking] = useState(false)
  const [error, setError] = useState('')

  async function lookup(code: string) {
    setScanning(false)
    setLooking(true)
    setError('')
    try {
      const response = await fetch('/api/staff/lookup', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      if (response.status === 404) throw new Error('スタッフではありません。')
      if (response.status === 401) throw new Error('QRコードが無効です。もう一度読み取ってください。')
      if (!response.ok) throw new Error(await getErrorMessage(response, 'スタッフを取得できませんでした。'))
      onFound((await response.json()) as StaffAssignment)
    } catch (value) {
      setError(value instanceof Error ? value.message : 'スタッフを取得できませんでした。')
    } finally {
      setLooking(false)
    }
  }

  return (
    <section className="staff-lookup mt-6">
      <h2 className="text-lg font-bold">スタッフ管理</h2>
      <p className="mt-2">スタッフのQRコードを読み取ると、所属チームと担当ブースを編集できます。</p>
      <button
        type="button"
        onClick={() => setScanning((value) => !value)}
        disabled={looking}
        className="mt-2 p-0! underline"
      >
        {scanning ? 'カメラを閉じる' : 'QRコードを読み取る'}
      </button>
      {scanning && <QrCodeScanner onScan={(code) => void lookup(code)} />}
      {looking && <p className="mt-2">読み込み中…</p>}
      {error && <p role="alert" className="mt-2">{error}</p>}
    </section>
  )
}
