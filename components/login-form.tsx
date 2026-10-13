"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Dictionary } from "@/lib/i18n/dictionaries";

export function LoginForm({ dict }: { dict: Dictionary }) {
  const router = useRouter();
  const [mode, setMode] = useState<"password" | "reset">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const inputClass =
    "w-full rounded-md border border-black/15 bg-white px-3 py-2 text-sm focus:outline-2 focus:outline-(--color-brand)";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setError(dict.login.error);
      return;
    }

    router.push("/");
    router.refresh();
  }

  async function onResetSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/auth/update-password`,
    });

    setLoading(false);

    if (error) {
      setError(dict.login.resetError);
      return;
    }

    setResetSent(true);
  }

  function backToPassword() {
    setMode("password");
    setError(null);
    setResetSent(false);
  }

  if (mode === "reset") {
    return (
      <div className="space-y-4">
        {resetSent ? (
          <div className="rounded-lg border border-(--color-accent-dark)/30 bg-(--color-accent-light) p-6 text-(--color-accent-dark) text-sm">
            {dict.login.resetSent}
          </div>
        ) : (
          <form onSubmit={onResetSubmit} className="space-y-4">
            <p className="text-sm text-black/70">{dict.login.resetSubtitle}</p>
            {error && (
              <div className="rounded-md bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">
                {error}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium mb-1">
                {dict.login.email}
              </label>
              <input
                type="email"
                className={inputClass}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-(--color-brand) text-white font-medium py-2.5 hover:bg-(--color-brand-dark) transition disabled:opacity-60"
            >
              {loading ? dict.common.loading : dict.login.resetSubmit}
            </button>
          </form>
        )}
        <button
          type="button"
          onClick={backToPassword}
          className="text-sm text-(--color-brand) hover:text-(--color-brand-dark) transition"
        >
          {dict.login.backToLogin}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">
          {error}
        </div>
      )}
      <div>
        <label className="block text-sm font-medium mb-1">
          {dict.login.email}
        </label>
        <input
          type="email"
          className={inputClass}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-sm font-medium">
            {dict.login.password}
          </label>
          <button
            type="button"
            onClick={() => {
              setMode("reset");
              setError(null);
            }}
            className="text-xs text-(--color-brand) hover:text-(--color-brand-dark) transition"
          >
            {dict.login.forgotPassword}
          </button>
        </div>
        <input
          type="password"
          className={inputClass}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-md bg-(--color-brand) text-white font-medium py-2.5 hover:bg-(--color-brand-dark) transition disabled:opacity-60"
      >
        {loading ? dict.common.loading : dict.login.submit}
      </button>
    </form>
  );
}
