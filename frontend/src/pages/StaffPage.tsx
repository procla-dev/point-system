import IssueAccountResult from "../components/IssueAccountResult";
import Card from "../components/Card";
import { useIssueAccount } from "../hooks/useIssueAccount";
import { useEntranceDisplayPublisher } from "../hooks/useEntranceDisplay";

export default function StaffPage() {
  const { state, issue, reissue } = useIssueAccount();
  useEntranceDisplayPublisher(state);

  function openDisplay() {
    window.open('/staff/entrance/display', '_blank', 'noopener,noreferrer');
  }

  return (
    <main className="staff-entrance-page">
      <header className="staff-page-header">
        <p className="staff-page-eyebrow">受付</p>
        <h1>参加者アカウント発行</h1>
        <p>参加者にQRコードを提示してログインしてもらいます。</p>
        <button className="staff-display-button" type="button" onClick={openDisplay}>
          モニターを開く
        </button>
      </header>

      <Card className="staff-entrance-card">
        {state.kind === 'idle' && (
          <div className="staff-entrance-start">
            <p>参加者ごとにアカウントを発行してください。</p>
            <button
              className="staff-primary-button"
              type="button"
              onClick={() => void issue("/api/users")}
            >
              アカウントを作成
            </button>
          </div>
        )}

        <IssueAccountResult state={state} />

        {state.kind === 'ready' && (
          <button className="staff-secondary-button" type="button" onClick={() => void reissue()}>
            ログイントークンを再発行
          </button>
        )}
      </Card>
    </main>
  );
}
