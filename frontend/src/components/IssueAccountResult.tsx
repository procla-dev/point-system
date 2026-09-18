import type { IssueState } from '../lib/shared'

export default function IssueAccountResult({ state }: { state: IssueState }) {
  if (state.kind === 'loading') {
    if (!state.previous) return <p className="account-issue-status" role="status">発行中…</p>
    return (
      <div className="account-issue-result is-refreshing" aria-busy="true">
        <img src={state.previous.qrCode} alt="ログイン用QRコード" />
        <p className="account-issue-status" role="status">ログイントークンを再発行中…</p>
      </div>
    )
  }
  if (state.kind === 'ready') {
    return (
      <div className="account-issue-result">
        <img src={state.qrCode} alt="ログイン用QRコード" />
        <p className="account-issue-url"><a href={state.loginUrl}>{state.loginUrl}</a></p>
      </div>
    )
  }
  if (state.kind === 'error') return <p className="account-issue-status" role="alert">{state.message}</p>
  return null
}
