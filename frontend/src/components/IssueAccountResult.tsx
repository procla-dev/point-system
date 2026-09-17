import type { IssueState } from '../pages/shared'

export default function IssueAccountResult({ state }: { state: IssueState }) {
  if (state.kind === 'loading') return <p>発行中…</p>
  if (state.kind === 'ready') {
    return (
      <div>
        <img src={state.qrCode} alt="ログイン用QRコード" />
        <p><a href={state.loginUrl}>{state.loginUrl}</a></p>
      </div>
    )
  }
  if (state.kind === 'error') return <p role="alert">{state.message}</p>
  return null
}
