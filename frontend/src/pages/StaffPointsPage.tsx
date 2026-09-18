import { useEffect, useRef, useState } from 'react'
import { getErrorMessage } from '../lib/shared'
import QrCodeScanner from '../components/QrCodeScanner'

type GrantableBooth = {
  id: string
  name: string
}

type GrantResult = { kind: 'success' | 'error'; text: string }

// 結果を見せてから次の人の読み取りに戻るまでの時間
const RESULT_DISPLAY_MS = 2000

export default function StaffPointsPage() {
  const [booths, setBooths] = useState<GrantableBooth[]>([])
  const [boothId, setBoothId] = useState('')
  const [boothsLoading, setBoothsLoading] = useState(true)
  const [error, setError] = useState('')
  const [granting, setGranting] = useState(false)
  const [result, setResult] = useState<GrantResult | null>(null)
  // 読み取りのたびにカメラを起動し直すためのキー(QrCodeScanner は1回読み取ると止まる)
  const [scanKey, setScanKey] = useState(0)
  // state の更新が反映される前に続けて呼ばれても、二重に付与しないようにする
  const grantingRef = useRef(false)

  useEffect(() => {
    async function loadBooths() {
      try {
        const response = await fetch('/api/staff/me/grantable-booths', { credentials: 'include' })
        if (!response.ok) throw new Error(await getErrorMessage(response, 'ブースを取得できませんでした。'))
        setBooths((await response.json()) as GrantableBooth[])
      } catch (value) {
        setError(value instanceof Error ? value.message : 'ブースを取得できませんでした。')
      } finally {
        setBoothsLoading(false)
      }
    }

    void loadBooths()
  }, [])

  useEffect(() => {
    if (!result) return
    const timer = setTimeout(() => {
      setResult(null)
      setScanKey((key) => key + 1)
    }, RESULT_DISPLAY_MS)
    return () => clearTimeout(timer)
  }, [result])

  function selectBooth(id: string) {
    setBoothId(id)
    setResult(null)
    setError('')
  }

  async function grantPoints(code: string) {
    if (grantingRef.current) return
    grantingRef.current = true
    setGranting(true)
    try {
      const response = await fetch('/api/users/points', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, boothId }),
      })
      if (response.status === 409) throw new Error('この来場者はこのブースでポイントを受け取り済みです。')
      if (response.status === 404) throw new Error('来場者が見つかりません。')
      if (response.status === 401) throw new Error('QRコードが無効です。画面を更新してもらってください。')
      if (!response.ok) throw new Error(await getErrorMessage(response, 'ポイントを付与できませんでした。'))
      const granted = (await response.json()) as { grantedPoints: number; balance: number }
      setResult({ kind: 'success', text: `${granted.grantedPoints}ポイント付与しました（残高：${granted.balance}ポイント）` })
    } catch (value) {
      setResult({ kind: 'error', text: value instanceof Error ? value.message : 'エラーが発生しました。' })
    } finally {
      grantingRef.current = false
      setGranting(false)
    }
  }

  if (boothsLoading) {
    return (
      <main>
        <h1 className="mb-2 font-bold">ポイント付与</h1>
        <p>ブースを読み込み中…</p>
      </main>
    )
  }

  if (booths.length === 0) {
    return (
      <main>
        <h1 className="mb-2 font-bold">ポイント付与</h1>
        <p>付与できるブースがありません。管理者にチームと担当ブースの設定を確認してください。</p>
        {error && <p role="alert">{error}</p>}
      </main>
    )
  }

  const selectedBooth = booths.find((booth) => booth.id === boothId)

  if (!selectedBooth) {
    return (
      <main>
        <h1 className="mb-2 font-bold">ポイント付与</h1>
        <p>付与するブースを選んでください。</p>
        <div className="mx-auto mt-8 grid max-w-80 grid-cols-2 gap-6">
          {booths.map((booth) => (
            <button
              key={booth.id}
              type="button"
              onClick={() => selectBooth(booth.id)}
              className="flex aspect-square items-center justify-center rounded-2xl bg-white p-2! text-center text-xl! font-bold! text-[#2c2c2c] shadow-[0_4px_0_rgba(0,0,0,0.25)] active:translate-y-1 active:shadow-none"
            >
              {booth.name}
            </button>
          ))}
        </div>
        {error && <p role="alert">{error}</p>}
      </main>
    )
  }

  return (
    <main>
      <button type="button" onClick={() => selectBooth('')} className="p-0! font-bold!">
        ← 戻る
      </button>
      <h1 className="mt-4 mb-2 font-bold">ポイント付与</h1>
      <p>付与するブース：<span className="font-bold">{selectedBooth.name}</span></p>
      <p className="mt-4">来場者にQRコードの画面を表示してもらい、カメラにかざしてください。</p>

      {result ? (
        // 読み取り中のカメラ(.qr-code-scanner)と同じ位置・大きさで結果を出す
        <p
          role={result.kind === 'error' ? 'alert' : 'status'}
          className={`mx-auto my-6 flex aspect-square w-full max-w-80 items-center justify-center rounded-xl p-6 text-center text-lg font-bold ${
            result.kind === 'success' ? 'bg-white text-[#2c2c2c]' : 'bg-red-50 text-red-700'
          }`}
        >
          {result.text}
        </p>
      ) : (
        !granting && <QrCodeScanner key={scanKey} onScan={(code) => void grantPoints(code)} />
      )}

      {granting && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/30" role="status" aria-label="付与中">
          <div className="h-14 w-14 animate-spin rounded-full border-4 border-white/40 border-t-white" />
        </div>
      )}
    </main>
  )
}
