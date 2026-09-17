import IssueAccountResult from "../components/IssueAccountResult";
import { useIssueAccount } from "../hooks/useIssueAccount";

export default function StaffPage() {
  const { state, issue, reissue } = useIssueAccount();
  return (
    <main>
      <h1>参加者アカウント発行</h1>
      <button
        onClick={() => void issue("/api/users")}
        disabled={state.kind === "loading"}
      >
        {state.kind === "loading" ? "発行中…" : "アカウントを作成してQRを表示"}
      </button>
      <IssueAccountResult state={state} />
      {state.kind === 'ready' && <button type="button" onClick={() => void reissue()}>ログイントークンを再発行</button>}
    </main>
  );
}
