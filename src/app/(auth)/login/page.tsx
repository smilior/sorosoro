"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { signIn } from "@/lib/auth-client";

function LoginContent() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/home";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogle = async () => {
    setLoading(true);
    setError(null);
    try {
      await signIn.social({
        provider: "google",
        callbackURL: callbackUrl,
      });
    } catch (e) {
      console.error(e);
      setError(
        "ログインを開始できませんでした。GOOGLE_CLIENT_ID / SECRET と BETTER_AUTH_SECRET を確認してください。",
      );
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-dvh flex items-center justify-center p-6"
      style={{ background: "var(--desk)" }}
    >
      <div
        className="w-full max-w-[380px] rounded-[28px] p-8 shadow-sm"
        style={{
          background: "var(--card)",
          boxShadow: "var(--shadow)",
          border: "1px solid var(--line)",
        }}
      >
        <div className="text-center mb-8">
          <div
            className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl"
            style={{ background: "var(--accent-soft)", color: "var(--accent-ink)" }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M4.5 12.5l5 5L19.5 7"
                stroke="currentColor"
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h1 className="text-[22px] font-bold tracking-tight" style={{ color: "var(--ink)" }}>
            おうち掃除ログ
          </h1>
          <p className="mt-2 text-[13.5px] font-medium leading-relaxed" style={{ color: "var(--sub)" }}>
            前回からの日数だけを、淡々と。
            <br />
            サボりを責めない掃除メモです。
          </p>
        </div>

        {error && (
          <div
            className="mb-4 rounded-2xl px-4 py-3 text-[13px] font-medium"
            style={{ background: "var(--late-bg)", color: "var(--late-ink)" }}
            role="alert"
          >
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={handleGoogle}
          disabled={loading}
          className="flex w-full items-center justify-center gap-3 rounded-[16px] border px-5 py-3.5 text-[14px] font-bold transition active:scale-[0.98] disabled:opacity-60"
          style={{
            background: "var(--bg)",
            borderColor: "var(--line)",
            color: "var(--ink)",
          }}
        >
          <GoogleIcon />
          {loading ? "接続中…" : "Googleでログイン"}
        </button>

        <p className="mt-5 text-center text-[11.5px] font-medium leading-relaxed" style={{ color: "var(--sub)" }}>
          ログイン後、タスクと記録はあなたのアカウントに保存されます。
        </p>

        <p className="mt-4 text-center">
          <a
            href="/help"
            className="text-[12.5px] font-bold underline-offset-2"
            style={{ color: "var(--accent-ink)" }}
          >
            使い方を見る
          </a>
        </p>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-dvh flex items-center justify-center" style={{ color: "var(--sub)" }}>
          読み込み中…
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
