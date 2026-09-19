import { useState } from 'react'
import QRCode from 'qrcode'
import { getErrorMessage, type IssueState } from '../lib/shared'

export function useIssueAccount() {
  const [state, setState] = useState<IssueState>({ kind: 'idle' })
  async function createQr(token: string, expiresAt?: string) {
    const loginUrl = `${window.location.origin}/login?token=${encodeURIComponent(token)}`
    const qrCode = await QRCode.toDataURL(loginUrl, { width: 512, margin: 2 })
    setState({ kind: 'ready', qrCode, loginUrl, token, expiresAt })
  }
  async function issue(path: string) {
    const previous = state.kind === 'ready' ? state : undefined
    setState({ kind: 'loading', previous, operation: 'issue' })
    try {
      const response = await fetch(path, { method: 'POST', credentials: 'include' })
      if (!response.ok) throw new Error(await getErrorMessage(response, 'アカウントを発行できませんでした。'))
      const { token, expiresAt } = (await response.json()) as { token: string; expiresAt?: string }
      await createQr(token, expiresAt)
    } catch (error) { setState({ kind: 'error', message: error instanceof Error ? error.message : 'エラーが発生しました。' }) }
  }
  async function reissue() {
    if (state.kind !== 'ready') return
    setState({ kind: 'loading', previous: state, operation: 'reissue' })
    try {
      const response = await fetch('/api/users/login-tokens/reissue', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: state.token }) })
      if (!response.ok) throw new Error(await getErrorMessage(response, 'トークンを再発行できませんでした。'))
      const issued = await response.json() as { token: string; expiresAt?: string }
      await createQr(issued.token, issued.expiresAt)
    } catch (error) { setState({ kind: 'error', message: error instanceof Error ? error.message : 'エラーが発生しました。' }) }
  }
  return { state, issue, reissue }
}
