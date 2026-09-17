import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BrowserQRCodeReader } from '@zxing/browser'
import type { IScannerControls } from '@zxing/browser'
import QRCode from 'qrcode'

type UserRole = 'user' | 'staff' | 'admin'

type Session = {
  role: UserRole
  displayName: string | null
}

type AccountState =
  | { kind: 'idle' | 'loading' }
  | { kind: 'ready'; qrCode: string }
  | { kind: 'error'; message: string }

type GrantState =
  | { kind: 'idle' | 'submitting' }
  | { kind: 'success'; message: string }
  | { kind: 'error'; message: string }

type PointGrantResponse = {
  grantedPoints: number
  balance: number
  transactionId: string
}

async function getErrorMessage(response: Response, fallback: string) {
  try {
    const body = (await response.json()) as { message?: string }
    if (body.message === 'login required') return 'ログインしてください。'
    if (body.message === 'not allowed for this role') return 'この操作を行う権限がありません。'
    if (body.message === 'invalid or expired identity code') {
      return 'QRコードの有効期限が切れています。もう一度読み取ってください。'
    }
    return body.message ?? fallback
  } catch {
    return fallback
  }
}

function QrScanner({ active, onCode }: { active: boolean; onCode: (code: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const onCodeRef = useRef(onCode)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    onCodeRef.current = onCode
  }, [onCode])

  useEffect(() => {
    if (!active || !videoRef.current) return

    const reader = new BrowserQRCodeReader()
    let cancelled = false
    let controls: IScannerControls | undefined

    setError(null)
    void reader
      .decodeFromVideoDevice(undefined, videoRef.current, (result, _error, scannerControls) => {
        if (cancelled || !result) return
        scannerControls.stop()
        onCodeRef.current(result.getText())
      })
      .then((nextControls) => {
        controls = nextControls
        if (cancelled) controls.stop()
      })
      .catch(() => {
        if (!cancelled) setError('カメラを起動できません。カメラの許可とHTTPS接続を確認してください。')
      })

    return () => {
      cancelled = true
      controls?.stop()
    }
  }, [active])

  if (!active) return null

  return (
    <div className="mt-4">
      <video className="block w-full max-w-[480px] bg-gray-900" ref={videoRef} autoPlay muted playsInline aria-label="QRコード読み取りカメラ" />
      {error && <p className="text-[#c00]" role="alert">{error}</p>}
    </div>
  )
}

function StaffDashboard() {
  const [accountState, setAccountState] = useState<AccountState>({ kind: 'idle' })
  const [scannerActive, setScannerActive] = useState(false)
  const [code, setCode] = useState('')
  const [points, setPoints] = useState('')
  const [grantState, setGrantState] = useState<GrantState>({ kind: 'idle' })

  async function createAccount() {
    setAccountState({ kind: 'loading' })
    try {
      const userResponse = await fetch('/api/users', { method: 'POST', credentials: 'include' })
      if (!userResponse.ok) throw new Error(await getErrorMessage(userResponse, 'アカウントを作成できませんでした。'))

      const { token } = (await userResponse.json()) as { token: string }
      const loginUrl = `${window.location.origin}/?token=${encodeURIComponent(token)}`
      const qrCode = await QRCode.toDataURL(loginUrl, { width: 512, margin: 2 })
      setAccountState({ kind: 'ready', qrCode })
    } catch (error) {
      setAccountState({ kind: 'error', message: error instanceof Error ? error.message : 'エラーが発生しました。' })
    }
  }

  const handleCode = useCallback((nextCode: string) => {
    setCode(nextCode)
    setScannerActive(false)
    setGrantState({ kind: 'idle' })
  }, [])

  async function grantPoints(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const parsedPoints = Number(points)
    if (!Number.isSafeInteger(parsedPoints) || parsedPoints <= 0) {
      setGrantState({ kind: 'error', message: 'ポイント数は1以上の整数で入力してください。' })
      return
    }
    if (!code.trim()) {
      setGrantState({ kind: 'error', message: '先にユーザーのQRコードを読み取るか、コードを入力してください。' })
      return
    }

    setGrantState({ kind: 'submitting' })
    try {
      const response = await fetch('/api/users/points', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim(), points: parsedPoints }),
      })
      if (!response.ok) throw new Error(await getErrorMessage(response, 'ポイントを付与できませんでした。'))

      const result = (await response.json()) as PointGrantResponse
      setGrantState({
        kind: 'success',
        message: `${result.grantedPoints}ポイント付与しました。ユーザーの残高は${result.balance}ポイントです。`,
      })
      setCode('')
      setPoints('')
    } catch (error) {
      setGrantState({ kind: 'error', message: error instanceof Error ? error.message : 'エラーが発生しました。' })
    }
  }

  const isSubmitting = grantState.kind === 'submitting'

  return (
    <main className="mx-auto min-h-screen max-w-[560px] bg-slate-50 px-4 py-10 font-sans text-gray-800">
      <h1 className="mb-6 text-2xl font-bold">スタッフ操作</h1>

      <section className="mt-6 rounded-lg border border-gray-200 bg-white p-5">
        <h2 className="mb-3 text-xl font-bold">ポイント付与</h2>
        <p>ユーザーの動的QRコードを読み取り、ポイント数を入力して付与します。</p>
        <button
          className="cursor-pointer px-4 py-2.5 disabled:cursor-default"
          type="button"
          onClick={() => setScannerActive((current) => !current)}
          disabled={isSubmitting}
        >
          {scannerActive ? '読み取りを停止' : 'QRコードを読み取る'}
        </button>
        <QrScanner active={scannerActive} onCode={handleCode} />

        <form className="mt-4 grid gap-3" onSubmit={(event) => void grantPoints(event)}>
          <label className="grid gap-1">
            QRコード（手入力可）
            <input
              className="box-border w-full p-2"
              type="text"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              autoComplete="off"
              disabled={isSubmitting}
            />
          </label>
          <label className="grid gap-1">
            付与ポイント数
            <input
              className="box-border w-full p-2"
              type="number"
              min="1"
              step="1"
              value={points}
              onChange={(event) => setPoints(event.target.value)}
              inputMode="numeric"
              disabled={isSubmitting}
            />
          </label>
          <button className="cursor-pointer px-4 py-2.5 disabled:cursor-default" type="submit" disabled={isSubmitting}>
            {isSubmitting ? '付与中…' : 'ポイントを付与する'}
          </button>
        </form>
        {grantState.kind === 'success' && <p className="text-green-800" role="status">{grantState.message}</p>}
        {grantState.kind === 'error' && <p className="text-[#c00]" role="alert">{grantState.message}</p>}
      </section>

      <section className="mt-6 rounded-lg border border-gray-200 bg-white p-5">
        <h2 className="mb-3 text-xl font-bold">参加者アカウント発行</h2>
        <button className="cursor-pointer px-4 py-2.5 disabled:cursor-default" type="button" onClick={() => void createAccount()} disabled={accountState.kind === 'loading'}>
          {accountState.kind === 'loading' ? '発行中…' : 'アカウントを作成してQRを表示'}
        </button>
        {accountState.kind === 'ready' && <img className="mt-6 block w-80 max-w-full" src={accountState.qrCode} alt="ログイン用QRコード" />}
        {accountState.kind === 'error' && <p className="text-[#c00]" role="alert">{accountState.message}</p>}
      </section>
    </main>
  )
}

function UserPage({ session, onSessionChange }: { session: Session; onSessionChange: (session: Session) => void }) {
  const [displayName, setDisplayName] = useState(session.displayName ?? '')
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [isSavingName, setIsSavingName] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!session.displayName) return

    let cancelled = false
    let timeoutId: number | undefined

    async function refreshQrCode() {
      try {
        const response = await fetch('/api/users/me/identity-code', { credentials: 'include' })
        if (!response.ok) throw new Error(await getErrorMessage(response, 'QRコードを取得できませんでした。'))

        const result = (await response.json()) as { code: string; expiresAt: string }
        const image = await QRCode.toDataURL(result.code, { width: 512, margin: 2 })
        if (cancelled) return

        setQrCode(image)
        const refreshDelay = Math.max(1000, new Date(result.expiresAt).getTime() - Date.now() - 1000)
        timeoutId = window.setTimeout(() => void refreshQrCode(), refreshDelay)
      } catch (error) {
        if (!cancelled) setMessage(error instanceof Error ? error.message : 'QRコードを取得できませんでした。')
      }
    }

    void refreshQrCode()
    return () => {
      cancelled = true
      if (timeoutId !== undefined) window.clearTimeout(timeoutId)
    }
  }, [session.displayName])

  async function saveDisplayName(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextDisplayName = displayName.trim()
    if (nextDisplayName.length < 1 || nextDisplayName.length > 50) {
      setMessage('表示名は1文字以上50文字以内で入力してください。')
      return
    }

    setIsSavingName(true)
    setMessage(null)
    try {
      const response = await fetch('/api/users/me', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: nextDisplayName }),
      })
      if (!response.ok) throw new Error(await getErrorMessage(response, '表示名を設定できませんでした。'))

      const result = (await response.json()) as { displayName: string }
      onSessionChange({ ...session, displayName: result.displayName })
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '表示名を設定できませんでした。')
    } finally {
      setIsSavingName(false)
    }
  }

  if (!session.displayName) {
    return (
      <main className="mx-auto min-h-screen max-w-[560px] bg-slate-50 px-4 py-10 font-sans text-gray-800">
        <h1 className="mb-6 text-2xl font-bold">表示名の設定</h1>
        <p>ポイント画面で表示する名前を入力してください。</p>
        <form className="mt-4 grid gap-3" onSubmit={(event) => void saveDisplayName(event)}>
          <label className="grid gap-1">
            表示名
            <input
              className="box-border w-full p-2"
              type="text"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              maxLength={50}
              autoFocus
              disabled={isSavingName}
            />
          </label>
          <button className="cursor-pointer px-4 py-2.5 disabled:cursor-default" type="submit" disabled={isSavingName}>
            {isSavingName ? '保存中…' : '表示名を保存'}
          </button>
        </form>
        {message && <p className="text-[#c00]" role="alert">{message}</p>}
      </main>
    )
  }

  return (
    <main className="mx-auto min-h-screen max-w-[560px] bg-slate-50 px-4 py-10 font-sans text-gray-800">
      <h1 className="mb-6 text-2xl font-bold">{session.displayName}さんのポイント</h1>
      <p>このQRコードをスタッフに提示してください。</p>
      {qrCode && <img className="mt-6 block w-80 max-w-full" src={qrCode} alt="本人確認用の動的QRコード" />}
      {message && <p className="text-[#c00]" role="alert">{message}</p>}
    </main>
  )
}

function AuthenticatedPage({ session, onSessionChange }: { session: Session; onSessionChange: (session: Session) => void }) {
  if (session.role === 'user') return <UserPage session={session} onSessionChange={onSessionChange} />
  if (session.role === 'staff') return <StaffDashboard />

  return (
    <main className="mx-auto min-h-screen max-w-[560px] bg-slate-50 px-4 py-10 font-sans text-gray-800">
      <p>管理者画面はまだ利用できません。</p>
    </main>
  )
}

function LoginPage({ token }: { token: string }) {
  const [session, setSession] = useState<Session | null>(null)
  const [message, setMessage] = useState('ログイン中…')
  const loginRequestRef = useRef<Promise<Session> | null>(null)

  useEffect(() => {
    let active = true
    const loginRequest =
      loginRequestRef.current ??
      (loginRequestRef.current = (async () => {
        const response = await fetch('/api/sessions', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        })
        if (!response.ok) {
          throw new Error(await getErrorMessage(response, 'ログインできませんでした。'))
        }

        return (await response.json()) as Session
      })())

    void loginRequest
      .then((nextSession) => {
        if (!active) return
        window.history.replaceState({}, '', `${window.location.pathname}${window.location.hash}`)
        setSession(nextSession)
      })
      .catch((error: unknown) => {
        if (active) setMessage(error instanceof Error ? error.message : 'ログインできませんでした。')
      })
    return () => {
      active = false
    }
  }, [token])

  if (session) return <AuthenticatedPage session={session} onSessionChange={setSession} />
  return <main className="mx-auto min-h-screen max-w-[560px] bg-slate-50 px-4 py-10 font-sans text-gray-800"><p>{message}</p></main>
}

export default function App() {
  const token = useMemo(() => new URLSearchParams(window.location.search).get('token'), [])
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const [sessionError, setSessionError] = useState<string | null>(null)

  useEffect(() => {
    if (token) return

    const controller = new AbortController()
    void (async () => {
      try {
        const response = await fetch('/api/sessions/me', { credentials: 'include', signal: controller.signal })
        if (response.status === 401) {
          setSession(null)
          return
        }
        if (!response.ok) throw new Error(await getErrorMessage(response, 'セッションを確認できませんでした。'))
        setSession((await response.json()) as Session)
      } catch (error) {
        if (!controller.signal.aborted) {
          setSessionError(error instanceof Error ? error.message : 'セッションを確認できませんでした。')
        }
      }
    })()
    return () => controller.abort()
  }, [token])

  if (token) return <LoginPage token={token} />
  if (sessionError) return <main className="mx-auto min-h-screen max-w-[560px] bg-slate-50 px-4 py-10 font-sans text-gray-800"><p className="text-[#c00]" role="alert">{sessionError}</p></main>
  if (session === undefined) return <main className="mx-auto min-h-screen max-w-[560px] bg-slate-50 px-4 py-10 font-sans text-gray-800"><p>読み込み中…</p></main>
  if (!session) return <StaffDashboard />
  return <AuthenticatedPage session={session} onSessionChange={setSession} />
}
