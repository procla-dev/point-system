export type Role = 'user' | 'staff' | 'admin'

export const ENTRANCE_DISPLAY_CHANNEL = 'point-system-entrance-display'

export type EntranceDisplayMessage =
  | { type: 'display-ready' }
  | { type: 'display-clear' }
  | { type: 'qr-issued'; qrCode: string; loginUrl: string; expiresAt?: string }

export type IssueState =
  | { kind: 'idle' }
  | { kind: 'loading'; previous?: { qrCode: string; loginUrl: string; token: string; expiresAt?: string } }
  | { kind: 'ready'; qrCode: string; loginUrl: string; token: string; expiresAt?: string }
  | { kind: 'error'; message: string }

export async function getErrorMessage(response: Response, fallback: string) {
  try {
    const body = (await response.json()) as { message?: string }
    if (body.message === 'login required') return 'ログインしてください。'
    if (body.message === 'not allowed for this role') return 'この操作を行う権限がありません。'
    if (body.message === 'already liked this booth') return 'このブースにはすでにいいねしています。'
    if (body.message === 'this booth cannot be liked') return 'このブースにはいいねできません。'
    if (body.message === 'invalid identity code') return 'ユーザー識別コードが無効です。'
    if (body.message === 'insufficient point balance') return 'ポイント残高が不足しています。'
    if (body.message === 'not allowed for this booth') return 'このブースではこの操作を行えません。'
    return body.message ?? fallback
  } catch {
    return fallback
  }
}
