import { useEffect, useState } from 'react'
import { ENTRANCE_DISPLAY_CHANNEL, type EntranceDisplayMessage } from '../lib/shared'

type DisplayQr = {
  qrCode: string
  loginUrl: string
  expiresAt?: string
}

export default function StaffEntranceDisplayPage() {
  const [displayQr, setDisplayQr] = useState<DisplayQr | null>(null)
  const [remainingSeconds, setRemainingSeconds] = useState<number>()

  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return

    const displayChannel = new BroadcastChannel(ENTRANCE_DISPLAY_CHANNEL)
    displayChannel.onmessage = (event: MessageEvent<EntranceDisplayMessage>) => {
      if (event.data?.type === 'qr-issued') {
        setDisplayQr(event.data)
        return
      }
      if (event.data?.type === 'display-clear') setDisplayQr(null)
    }
    displayChannel.postMessage({ type: 'display-ready' })

    return () => displayChannel.close()
  }, [])

  useEffect(() => {
    if (!displayQr?.expiresAt) {
      setRemainingSeconds(undefined)
      return
    }

    const update = () => {
      const seconds = Math.max(0, Math.ceil((new Date(displayQr.expiresAt!).getTime() - Date.now()) / 1000))
      setRemainingSeconds(seconds)
      if (seconds === 0) setDisplayQr(null)
    }
    update()
    const timer = window.setInterval(update, 1000)
    return () => window.clearInterval(timer)
  }, [displayQr])

  return (
    <main className="entrance-display-page">
      <p className="entrance-display-eyebrow">ログイン</p>
      {displayQr ? (
        <>
          <img className="entrance-display-qr" src={displayQr.qrCode} alt="ログイン用QRコード" draggable={false} />
          {remainingSeconds !== undefined && <p className="entrance-display-expiry">有効期限：あと{remainingSeconds}秒</p>}
        </>
      ) : (
        <p className="entrance-display-placeholder">QRコードを発行すると、ここに表示されます。</p>
      )}
    </main>
  )
}
