import { useEffect, useState } from 'react'

type HealthState =
  | { kind: 'loading' }
  | { kind: 'ok'; label: string }
  | { kind: 'error'; message: string }

function useHealth(path: string): HealthState {
  const [state, setState] = useState<HealthState>({ kind: 'loading' })

  useEffect(() => {
    const controller = new AbortController()

    async function check() {
      try {
        const response = await fetch(path, { signal: controller.signal })
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }
        const body: unknown = await response.json()
        setState({ kind: 'ok', label: JSON.stringify(body) })
      } catch (error) {
        if (controller.signal.aborted) {
          return
        }
        setState({
          kind: 'error',
          message: error instanceof Error ? error.message : '不明なエラー',
        })
      }
    }

    void check()

    return () => {
      controller.abort()
    }
  }, [path])

  return state
}

function HealthRow({ name, path }: { name: string; path: string }) {
  const state = useHealth(path)

  return (
    <li className="flex items-center justify-between gap-4 border-b border-slate-200 py-3 last:border-b-0">
      <span className="font-medium text-slate-700">{name}</span>
      {state.kind === 'loading' && <span className="text-slate-500">確認中…</span>}
      {state.kind === 'ok' && (
        <span className="font-mono text-sm text-emerald-700">{state.label}</span>
      )}
      {state.kind === 'error' && (
        <span className="font-mono text-sm text-red-700">{state.message}</span>
      )}
    </li>
  )
}

export default function App() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-6 p-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">ポイントシステム</h1>
        <p className="mt-1 text-slate-600">開発環境の疎通確認</p>
      </header>
      <ul className="rounded-lg border border-slate-200 bg-white px-4 shadow-sm">
        <HealthRow name="Backend" path="/api/health" />
        <HealthRow name="Database" path="/api/health/db" />
      </ul>
    </main>
  )
}
