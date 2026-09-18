import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import AdminPage from "./AdminPage";
import { getErrorMessage, type Role } from "../lib/shared";
import Card from "../components/Card";
import TurnstileWidget from "../components/TurnstileWidget";

/** ログイン後の行き先。スタッフは付与できる展示ブースがあればポイント付与、なければアカウント発行の画面にする */
async function homePathFor(role: Role) {
  if (role === "admin") return "/admin";
  if (role !== "staff") return "/";
  try {
    const response = await fetch("/api/staff/me/grantable-booths", { credentials: "include" });
    if (response.ok && ((await response.json()) as unknown[]).length > 0) return "/staff/point";
  } catch {
    // 取得できない場合は受付の画面に送る
  }
  return "/staff/entrance";
}

export default function LoginPage({ token }: { token: string }) {
  const navigate = useNavigate();
  const [message, setMessage] = useState<
    "logging-in" | "name" | "complete" | "error"
  >("logging-in");
  const [role, setRole] = useState<Role | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  const handleTurnstileToken = useCallback((value: string | null) => {
    setTurnstileToken(value);
  }, []);
  const handleTurnstileError = useCallback((value: string) => {
    setError(value);
    setMessage("error");
  }, []);

  useEffect(() => {
    if (!turnstileToken) return;

    const controller = new AbortController();
    void (async () => {
      try {
        const response = await fetch("/api/sessions", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, turnstileToken }),
          signal: controller.signal,
        });
        if (!response.ok) {
          setError(
            await getErrorMessage(response, "ログインできませんでした。"),
          );
          setMessage("error");
          return;
        }
        const session = (await response.json()) as {
          role: Role;
          displayName: string | null;
        };
        window.history.replaceState({}, '', window.location.pathname);
        setRole(session.role);
        if (session.displayName) {
          navigate(await homePathFor(session.role), { replace: true });
        }
        setMessage(session.displayName ? "complete" : "name");
      } catch {
        if (!controller.signal.aborted) {
          setError("ログインできませんでした。");
          setMessage("error");
        }
      }
    })();
    return () => controller.abort();
  }, [navigate, token, turnstileToken]);
  async function submitName(event: FormEvent) {
    event.preventDefault();
    if (!displayName.trim()) return;
    const response = await fetch("/api/users/me", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName: displayName.trim() }),
    });
    if (!response.ok) {
      setError(
        await getErrorMessage(response, "表示名を保存できませんでした。"),
      );
      return;
    }
    navigate(role ? await homePathFor(role) : "/", { replace: true });
    setMessage("complete");
  }
  if (message === "logging-in")
    return (
      <main className="login-status">
        <p>ログイン中…</p>
        <TurnstileWidget
          onToken={handleTurnstileToken}
          onError={handleTurnstileError}
        />
      </main>
    );
  if (message === "error")
    return (
      <main className="login-status">
        <p role="alert">{error}</p>
      </main>
    );
  if (message === "complete")
    return role === "admin" ? (
      <AdminPage />
    ) : (
      <main className="login-status">
        <p>ログインしました。</p>
      </main>
    );
  return (
    <main className="name-page">
      <h1>表示名を入力してください</h1>
      <Card>
        <form onSubmit={(event) => void submitName(event)}>
          <label htmlFor="display-name">表示名：</label>
          <input
            id="display-name"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            autoFocus
            maxLength={50}
          />
          <button type="submit" disabled={!displayName.trim()}>
            入力を確定
          </button>
        </form>
      </Card>
    </main>
  );
}
