export type Role = 'user' | 'staff' | 'admin'

export type IssueState =
  | { kind: 'idle' | 'loading' }
  | { kind: 'ready'; qrCode: string; loginUrl: string }
  | { kind: 'error'; message: string }

export async function getErrorMessage(response: Response, fallback: string) {
  try {
    const body = (await response.json()) as { message?: string }
    if (body.message === 'login required') return 'ログインしてください。'
    if (body.message === 'not allowed for this role') return 'この操作を行う権限がありません。'
    return body.message ?? fallback
  } catch {
    return fallback
  }
}
