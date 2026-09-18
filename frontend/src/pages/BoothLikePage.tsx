import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getErrorMessage } from '../lib/shared'

type LikeState = 'submitting' | 'success' | 'error'

export default function BoothLikePage() {
  const { boothId } = useParams<{ boothId: string }>()
  const requestStarted = useRef(false)
  const [state, setState] = useState<LikeState>('submitting')
  const [boothName, setBoothName] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (requestStarted.current) return
    requestStarted.current = true

    void (async () => {
      if (!boothId) {
        setError('ブース情報がありません。')
        setState('error')
        return
      }

      try {
        const response = await fetch(`/api/booths/${boothId}/likes`, {
          method: 'POST',
          credentials: 'include',
        })
        if (!response.ok) {
          throw new Error(await getErrorMessage(response, 'いいねできませんでした。'))
        }
        const result = await response.json() as { boothName: string }
        setBoothName(result.boothName)
        setState('success')
      } catch (value) {
        setError(value instanceof Error ? value.message : 'いいねできませんでした。')
        setState('error')
      }
    })()
  }, [boothId])

  return (
    <main className="booth-like-page">
      <div className="booth-like-content">
        {state === 'submitting' && <p>いいねを送信中…</p>}
        {state === 'success' && (
          <>
            <div className="booth-like-complete-icon" aria-hidden="true">👍</div>
            <p role="status">{boothName}にいいねしました。</p>
            <Link to="/">ホームへ戻る</Link>
          </>
        )}
        {state === 'error' && (
          <>
            <p role="alert">{error}</p>
            <Link to="/">ホームへ戻る</Link>
          </>
        )}
      </div>
    </main>
  )
}
