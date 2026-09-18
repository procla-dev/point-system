import { useState } from "react";
import QRCode from "qrcode";
import { getErrorMessage, type IssueState } from "../lib/shared";
import IssueAccountResult from "../components/IssueAccountResult";
import BoothManagement from "../components/BoothManagement";
import StaffAssignment from "../components/StaffAssignment";

export default function AdminPage() {
  const [state, setState] = useState<IssueState>({ kind: "idle" });

  async function issueAccount(path: string) {
    setState({ kind: "loading" });
    try {
      const response = await fetch(path, {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok)
        throw new Error(
          await getErrorMessage(response, "アカウントを発行できませんでした。"),
        );
      const { token } = (await response.json()) as { token: string };
      const loginUrl = `${window.location.origin}/login?token=${encodeURIComponent(token)}`;
      const qrCode = await QRCode.toDataURL(loginUrl, {
        width: 512,
        margin: 2,
      });
      setState({ kind: "ready", qrCode, loginUrl, token });
    } catch (error) {
      setState({
        kind: "error",
        message:
          error instanceof Error ? error.message : "エラーが発生しました。",
      });
    }
  }

  return (
    <main className="admin-page">
      <h1>管理者ページ</h1>
      <p>発行するアカウントを選択してください。</p>
      <div className="admin-actions">
        <button
          onClick={() => void issueAccount("/api/users")}
          disabled={state.kind === "loading"}
        >
          ユーザーを作成
        </button>
        <button
          onClick={() => void issueAccount("/api/staff")}
          disabled={state.kind === "loading"}
        >
          スタッフを作成
        </button>
        <button
          onClick={() => void issueAccount("/api/admins")}
          disabled={state.kind === "loading"}
        >
          管理者を作成
        </button>
      </div>
      <IssueAccountResult state={state} />
      <BoothManagement />
      <StaffAssignment />
    </main>
  );
}
