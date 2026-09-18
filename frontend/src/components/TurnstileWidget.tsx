import { useEffect, useRef, useState } from "react";

type TurnstileOptions = {
  sitekey: string;
  action: string;
  callback: (token: string) => void;
  "error-callback": () => void;
  "expired-callback": () => void;
};

type TurnstileApi = {
  render: (container: HTMLElement, options: TurnstileOptions) => string;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

type TurnstileWidgetProps = {
  onToken: (token: string | null) => void;
  onError: (message: string) => void;
};

export default function TurnstileWidget({
  onToken,
  onError,
}: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [isReady, setIsReady] = useState(() => Boolean(window.turnstile));

  useEffect(() => {
    if (window.turnstile) {
      setIsReady(true);
      return;
    }

    const intervalId = window.setInterval(() => {
      if (window.turnstile) {
        setIsReady(true);
        window.clearInterval(intervalId);
      }
    }, 100);

    const timeoutId = window.setTimeout(() => {
      window.clearInterval(intervalId);
      if (!window.turnstile) {
        onError("認証ウィジェットを読み込めませんでした。");
      }
    }, 10_000);

    return () => {
      window.clearInterval(intervalId);
      window.clearTimeout(timeoutId);
    };
  }, [onError]);

  useEffect(() => {
    if (!isReady || !containerRef.current || !window.turnstile) return;

    const sitekey = import.meta.env.VITE_TURNSTILE_SITE_KEY;
    if (!sitekey) {
      onError("Turnstileの設定がありません。");
      return;
    }

    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey,
      action: "login",
      callback: (token) => onToken(token),
      "error-callback": () => onError("認証に失敗しました。"),
      "expired-callback": () => onToken(null),
    });

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [isReady, onError, onToken]);

  return <div ref={containerRef} className="cf-turnstile" data-action="turnstile-spin-v1" />;
}
