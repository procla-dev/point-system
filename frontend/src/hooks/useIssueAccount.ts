import { useState } from 'react'
import QRCode from 'qrcode'
import { getErrorMessage, type IssueState } from '../lib/shared'

export function useIssueAccount() {
  const [state, setState] = useState<IssueState>({ kind: 'idle' })
  async function issue(path: string) {
    setState({ kind: 'loading' })
    try {
      const response = await fetch(path, { method: 'POST', credentials: 'include' })
      if (!response.ok) throw new Error(await getErrorMessage(response, 'アカウントを発行できませんでした。'))
      const { token } = (await response.json()) as { token: string }
      const loginUrl = `${window.location.origin}/login?token=${encodeURIComponent(token)}`
      const qrCode = await QRCode.toDataURL(loginUrl, { width: 512, margin: 2 })
      setState({ kind: 'ready', qrCode, loginUrl })
    } catch (error) { setState({ kind: 'error', message: error instanceof Error ? error.message : 'エラーが発生しました。' }) }
  }
  return { state, issue }
}
