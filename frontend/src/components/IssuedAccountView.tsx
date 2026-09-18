import { useEffect, useState } from 'react'

type Props = {
  qrCode: string
  loginUrl: string
  busy: boolean
  onBack: () => void
  onIssueNew: () => void
  onReissue?: () => void
}

export default function IssuedAccountView({ qrCode, loginUrl, busy, onBack, onIssueNew, onReissue }: Props) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), 2000)
    return () => clearTimeout(timer)
  }, [copied])

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(loginUrl)
      setCopied(true)
    } catch {
      // クリップボードが使えない環境では何もしない
    }
  }

  return (
    <main className="admin-page">
      <button type="button" onClick={onBack} className="font-bold!">
        ← 戻る
      </button>
      <div className="mx-auto w-fit">
        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={onIssueNew}
            disabled={busy}
            title="アカウントの新規発行"
            aria-label="アカウントの新規発行"
            className="p-0! text-2xl! font-bold! disabled:opacity-55"
          >
            +
          </button>
          {onReissue && (
            <button
              type="button"
              onClick={onReissue}
              disabled={busy}
              title="トークンの再発行"
              aria-label="トークンの再発行"
              className="p-0! text-2xl! font-bold! disabled:opacity-55"
            >
              ⟳
            </button>
          )}
        </div>
        <img src={qrCode} alt="ログイン用QRコード" className="mt-1!" />
      </div>
      <button
        type="button"
        onClick={() => void handleCopy()}
        className="mt-6 block w-full truncate p-0! text-left underline"
      >
        {loginUrl}
      </button>
      {copied && <p className="mt-2 text-gray-400">コピーしました</p>}
    </main>
  )
}
