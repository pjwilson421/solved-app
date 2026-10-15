"use client";

import { useState, type FormEvent } from "react";

function messageFor(code: string): string {
  if (code === "rate") return "Too many attempts. Try again in 15 minutes.";
  if (code === "1") return "Incorrect password. Please try again.";
  return "";
}

export function LoginForm({
  nextPath,
  errorCode,
}: {
  nextPath: string;
  errorCode: string;
}) {
  const [error, setError] = useState(messageFor(errorCode));
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const password = String(new FormData(event.currentTarget).get("password") ?? "");
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ password }),
      });
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setError(data?.error || "Incorrect password. Please try again.");
        setPending(false);
        return;
      }
      window.location.assign(nextPath);
    } catch {
      setError("Could not sign in. Please try again.");
      setPending(false);
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-app-bg px-8 text-tx-primary">
      <div className="w-full max-w-[340px]">
        <div className="flex items-center gap-3">
          {/* Same public SVG treatment as the app header logo. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icons/solved-logo.svg"
            alt=""
            width={36}
            height={36}
            className="shrink-0"
          />
          <h1 className="text-sm font-bold tracking-[0.14em] text-white">SOLVED</h1>
        </div>
        <p className="mt-6 text-sm leading-relaxed text-tx-secondary">
          Enter your password to continue.
        </p>
        <form className="mt-8" method="post" action="/api/auth/login" onSubmit={onSubmit}>
          <input type="hidden" name="next" value={nextPath} />
          <label htmlFor="password" className="block text-sm text-white">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            maxLength={256}
            autoFocus
            disabled={pending}
            className="mt-2.5 box-border w-full rounded-md border border-edge-subtle bg-rail-navy px-4 py-3.5 text-base text-white outline-none focus:border-primary disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={pending}
            className="mt-3.5 w-full cursor-pointer rounded-md border-0 bg-primary px-4 py-3.5 text-base text-white transition-colors hover:bg-primary-hover disabled:cursor-wait disabled:opacity-60"
          >
            {pending ? "Signing in…" : "Sign in"}
          </button>
          {error ? (
            <p className="mt-4 text-sm text-[#ff8d8d]" role="alert">
              {error}
            </p>
          ) : null}
        </form>
      </div>
    </main>
  );
}
