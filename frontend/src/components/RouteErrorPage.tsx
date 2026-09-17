import { isRouteErrorResponse, useRouteError } from 'react-router-dom'

export default function RouteErrorPage() {
  const error = useRouteError()
  const message = isRouteErrorResponse(error) ? 'サーバーに接続できませんでした。' : 'ページを表示できませんでした。'

  return (
    <main className="login-status">
      <p role="alert">{message}</p>
      <button type="button" onClick={() => window.location.reload()}>再読み込み</button>
    </main>
  )
}
