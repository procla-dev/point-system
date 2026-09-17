import { useEffect, useMemo, useState } from 'react'
import QRCode from 'qrcode'

type IssueState =
  | { kind: 'idle' | 'loading' }
  | { kind: 'ready'; qrCode: string }
  | { kind: 'error'; message: string }

async function getErrorMessage(response: Response, fallback: string) {
  try {
    const body = (await response.json()) as { message?: string }
    if (body.message === 'login required') return 'スタッフとしてログインしてください。'
    if (body.message === 'not allowed for this role') return 'この操作を行う権限がありません。'
    return body.message ?? fallback
  } catch {
    return fallback
  }
}

function StaffPage() {
  const [state, setState] = useState<IssueState>({ kind: 'idle' })

  async function createAccount() {
    setState({ kind: 'loading' })
    try {
      const userResponse = await fetch('/api/users', { method: 'POST', credentials: 'include' })
      if (!userResponse.ok) throw new Error(await getErrorMessage(userResponse, 'アカウントを作成できませんでした。'))

      const { token } = (await userResponse.json()) as { token: string }
      const loginUrl = `${window.location.origin}/?token=${encodeURIComponent(token)}`
      const qrCode = await QRCode.toDataURL(loginUrl, { width: 512, margin: 2 })
      setState({ kind: 'ready', qrCode })
    } catch (error) {
      setState({ kind: 'error', message: error instanceof Error ? error.message : 'エラーが発生しました。' })
    }
  }

  return (
    <main>
      <h1>参加者アカウント発行</h1>
      <button onClick={() => void createAccount()} disabled={state.kind === 'loading'}>
        {state.kind === 'loading' ? '発行中…' : 'アカウントを作成してQRを表示'}
      </button>
      {state.kind === 'ready' && <img src={state.qrCode} alt="ログイン用QRコード" />}
      {state.kind === 'error' && <p role="alert">{state.message}</p>}
    </main>
  )
}

function LoginPage({ token }: { token: string }) {
  const [message, setMessage] = useState<'logging-in' | 'name' | 'complete' | 'error'>('logging-in')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    void (async () => {
      try {
        const response = await fetch('/api/sessions', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
          signal: controller.signal,
        })
        if (!response.ok) {
          setError(await getErrorMessage(response, 'ログインできませんでした。'))
          setMessage('error')
          return
        }
        const session = (await response.json()) as { role: 'user' | 'staff' | 'admin'; displayName: string | null }
        setMessage(!session.displayName ? 'name' : 'complete')
      } catch {
        if (!controller.signal.aborted) {
          setError('ログインできませんでした。')
          setMessage('error')
        }
      }
    })()
    return () => controller.abort()
  }, [token])

  async function submitName(event: React.FormEvent) {
    event.preventDefault()
    if (!displayName.trim()) return
    const response = await fetch('/api/users/me', {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayName: displayName.trim() }),
    })
    if (!response.ok) {
      setError(await getErrorMessage(response, '表示名を保存できませんでした。'))
      return
    }
    setMessage('complete')
  }

  if (message === 'logging-in') return <main className="login-status"><p>ログイン中…</p></main>
  if (message === 'error') return <main className="login-status"><p role="alert">{error}</p></main>
  if (message === 'complete') return <main className="login-status"><p>ログインしました。</p></main>

  return (
    <main className="name-page">
      <h1>表示名を入力してください</h1>
      <form className="name-card" onSubmit={(event) => void submitName(event)}>
        <label htmlFor="display-name">表示名：</label>
        <input id="display-name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} autoFocus maxLength={50} />
        <button type="submit" disabled={!displayName.trim()}>入力を確定</button>
      </form>
    </main>
  )
}

export default function App() {
  const token = useMemo(() => new URLSearchParams(window.location.search).get('token'), [])
  return token ? <LoginPage token={token} /> : <StaffPage />
}
