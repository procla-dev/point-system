import { useRef, useState } from 'react';
import QRCode from 'qrcode';
import { getErrorMessage, type IssueState } from '../lib/shared';
import Button from '../components/Button';
import IssueAccountResult from '../components/IssueAccountResult';
import IssuedAccountView from '../components/IssuedAccountView';
import BoothManagement from '../components/BoothManagement';
import StaffAssignment from '../components/StaffAssignment';

export default function AdminPage() {
  const [state, setState] = useState<IssueState>({ kind: 'idle' });
  const [issuedPath, setIssuedPath] = useState('');
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);

  async function createQr(token: string) {
    const loginUrl = `${window.location.origin}/login?token=${encodeURIComponent(token)}`;
    const qrCode = await QRCode.toDataURL(loginUrl, { width: 512, margin: 2 });
    setState({ kind: 'ready', qrCode, loginUrl, token });
  }

  async function issueAccount(path: string) {
    if (busyRef.current) return;
    busyRef.current = true;
    setIssuedPath(path);
    // すでにQR表示中(ready)なら、そのまま留めておいて busy だけで表す(loading に落とすと一瞬元の画面に戻ってしまう)
    const alreadyReady = state.kind === 'ready';
    if (alreadyReady) setBusy(true);
    else setState({ kind: 'loading' });
    try {
      const response = await fetch(path, {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) throw new Error(await getErrorMessage(response, 'アカウントを発行できませんでした。'));
      const { token } = (await response.json()) as { token: string };
      await createQr(token);
    } catch (error) {
      setState({
        kind: 'error',
        message: error instanceof Error ? error.message : 'エラーが発生しました。',
      });
    } finally {
      busyRef.current = false;
      if (alreadyReady) setBusy(false);
    }
  }

  async function reissueToken(oldToken: string) {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      const response = await fetch('/api/users/login-tokens/reissue', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: oldToken }),
      });
      if (!response.ok) throw new Error(await getErrorMessage(response, 'トークンを再発行できませんでした。'));
      const { token } = (await response.json()) as { token: string };
      await createQr(token);
    } catch (error) {
      setState({
        kind: 'error',
        message: error instanceof Error ? error.message : 'エラーが発生しました。',
      });
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  if (state.kind === 'ready') {
    return (
      <IssuedAccountView
        qrCode={state.qrCode}
        loginUrl={state.loginUrl}
        busy={busy}
        onBack={() => setState({ kind: 'idle' })}
        onIssueNew={() => void issueAccount(issuedPath)}
        onReissue={issuedPath === '/api/users' ? () => void reissueToken(state.token) : undefined}
      />
    );
  }

  return (
    <main className="admin-page mt-5!">
      <h1>管理者ページ</h1>
      <section className="mt-6 mb-6 space-y-4">
        <h2 className="text-lg font-bold">アカウント発行</h2>
        <p>発行するアカウントを選択してください。</p>
        <div className="flex flex-row flex-wrap justify-center gap-4">
          <Button onClick={() => void issueAccount('/api/users')} disabled={state.kind === 'loading'}>
            ユーザー
          </Button>
          <Button onClick={() => void issueAccount('/api/staff')} disabled={state.kind === 'loading'}>
            スタッフ
          </Button>
          <Button onClick={() => void issueAccount('/api/admins')} disabled={state.kind === 'loading'}>
            管理者
          </Button>
        </div>
      </section>
      <IssueAccountResult state={state} />
      <hr className="border-t-2 border-gray-500" />
      <BoothManagement />
      <StaffAssignment />
    </main>
  );
}
