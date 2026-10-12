"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Dictionary } from "@/lib/i18n/dictionaries";

export function RepLoginForm({ dict }: { dict: Dictionary }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    setLoading(false);

    if (error) {
      setError(
        error.message.toLowerCase().includes("signups not allowed") ||
          error.code === "otp_disabled" ||
          error.code === "signup_disabled"
          ? dict.login.repNotFound
          : error.message
      );
      return;
    }

    setSent(true);
  }

  if (sent) {
    return (
      <div className="rounded-lg border border-(--color-accent-dark)/30 bg-(--color-accent-light) p-6 text-(--color-accent-dark) text-sm">
        {dict.login.repSent}
      </div>
    );
  }

  const inputClass =
    "w-full rounded-md border border-black/15 bg-white px-3 py-2 text-sm focus:outline-2 focus:outline-(--color-brand)";

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <p className="text-sm text-black/70">{dict.login.repSubtitle}</p>
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
        {loading ? dict.common.loading : dict.login.repSubmit}
      </button>
      <p className="text-sm text-center">
        <Link href="/register" className="text-(--color-brand) underline">
          {dict.login.noAccount}
        </Link>
      </p>
    </form>
  );
}
