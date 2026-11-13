"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/config";
import { COUNTRIES_EN, COUNTRIES_HE } from "@/lib/data/countries";
import { US_COUNTRY_CODE, usStatesFor } from "@/lib/data/us-states";
import {
  updateMyDisplayName,
  updateMyRegions,
} from "@/lib/actions/profile";

type ProfileDict = Dictionary["profile"];

const inputClass =
  "w-full rounded-md border border-black/15 bg-white px-3 py-2 text-sm focus:outline-2 focus:outline-(--color-brand)";
const labelClass = "block text-sm font-medium mb-1";
const buttonClass =
  "rounded-md bg-(--color-brand) text-white font-medium px-5 py-2 text-sm hover:bg-(--color-brand-dark) transition disabled:opacity-60";

function Feedback({ ok, error }: { ok?: string | null; error?: string | null }) {
  if (error)
    return (
      <div className="rounded-md bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">
        {error}
      </div>
    );
  if (ok)
    return (
      <div className="rounded-md border border-(--color-accent-dark)/30 bg-(--color-accent-light) text-(--color-accent-dark) text-sm px-3 py-2">
        {ok}
      </div>
    );
  return null;
}

// ---------------------------------------------------------------- names

export function StaffNameForm({
  d,
  initialName,
}: {
  d: ProfileDict;
  initialName: string;
}) {
  const [name, setName] = useState(initialName);
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setOk(null);
    setError(null);
    if (!name.trim()) return setError(d.nameRequired);
    setBusy(true);
    const res = await updateMyDisplayName(name);
    setBusy(false);
    if ("error" in res) setError(d.saveError);
    else setOk(d.saved);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div>
        <label className={labelClass}>{d.displayName}</label>
        <input
          className={inputClass}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <Feedback ok={ok} error={error} />
      <button type="submit" disabled={busy} className={buttonClass}>
        {busy ? d.saving : d.save}
      </button>
    </form>
  );
}

// ------------------------------------------------------------- password

export function ChangePasswordForm({
  d,
  email,
}: {
  d: ProfileDict;
  email: string;
}) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setOk(null);
    setError(null);
    if (next.length < 8) return setError(d.passwordTooShort);
    if (next !== confirm) return setError(d.passwordMismatch);

    setBusy(true);
    const supabase = createClient();
    // Confirm the current password first, so an unattended signed-in
    // browser can't be used to take over the account.
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email,
      password: current,
    });
    if (verifyError) {
      setBusy(false);
      return setError(d.passwordWrongCurrent);
    }
    const { error: updateError } = await supabase.auth.updateUser({
      password: next,
    });
    setBusy(false);
    if (updateError) return setError(d.passwordError);
    setCurrent("");
    setNext("");
    setConfirm("");
    setOk(d.passwordSuccess);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div>
        <label className={labelClass}>{d.currentPassword}</label>
        <input
          type="password"
          autoComplete="current-password"
          className={inputClass}
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          required
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>{d.newPassword}</label>
          <input
            type="password"
            autoComplete="new-password"
            className={inputClass}
            value={next}
            onChange={(e) => setNext(e.target.value)}
            required
          />
        </div>
        <div>
          <label className={labelClass}>{d.confirmPassword}</label>
          <input
            type="password"
            autoComplete="new-password"
            className={inputClass}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />
        </div>
      </div>
      <Feedback ok={ok} error={error} />
      <button type="submit" disabled={busy} className={buttonClass}>
        {busy ? d.saving : d.passwordSubmit}
      </button>
    </form>
  );
}

// -------------------------------------------- KKL responsibility areas

export function RegionsForm({
  d,
  locale,
  initialCountries,
  initialStates,
}: {
  d: ProfileDict;
  locale: Locale;
  initialCountries: string[];
  initialStates: string[];
}) {
  const [countries, setCountries] = useState<string[]>(initialCountries);
  const [states, setStates] = useState<string[]>(initialStates);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const allCountries = locale === "en" ? COUNTRIES_EN : COUNTRIES_HE;
  const nameOf = useMemo(
    () => Object.fromEntries(allCountries.map((c) => [c.code, c.name])),
    [allCountries]
  );
  const usStates = usStatesFor(locale);
  const stateName = useMemo(
    () => Object.fromEntries(usStates.map((s) => [s.code, s.name])),
    [usStates]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allCountries;
    // Match in both languages so "fra" and "צרפ" both find France.
    const en = Object.fromEntries(COUNTRIES_EN.map((c) => [c.code, c.name.toLowerCase()]));
    return allCountries.filter(
      (c) => c.name.toLowerCase().includes(q) || en[c.code]?.includes(q)
    );
  }, [query, allCountries]);

  const toggleCountry = (code: string) => {
    setOk(null);
    setCountries((list) =>
      list.includes(code) ? list.filter((c) => c !== code) : [...list, code]
    );
  };
  const toggleState = (code: string) => {
    setOk(null);
    setStates((list) =>
      list.includes(code) ? list.filter((c) => c !== code) : [...list, code]
    );
  };

  const hasUs = countries.includes(US_COUNTRY_CODE);

  async function save() {
    setOk(null);
    setError(null);
    setBusy(true);
    const res = await updateMyRegions(countries, hasUs ? states : []);
    setBusy(false);
    if ("error" in res) setError(d.saveError);
    else {
      if (!hasUs) setStates([]);
      setOk(d.saved);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-black/60">{d.regionsNote}</p>

      <div>
        <div className="text-sm font-medium mb-1.5">
          {d.selectedCountries} ({countries.length})
        </div>
        {countries.length === 0 ? (
          <p className="text-sm text-black/40">{d.noneSelected}</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {countries.map((code) => (
              <span
                key={code}
                className="inline-flex items-center gap-1 rounded-full bg-(--color-brand-light) text-(--color-brand-dark) px-2.5 py-1 text-xs font-medium"
              >
                {nameOf[code] ?? code}
                <button
                  type="button"
                  onClick={() => toggleCountry(code)}
                  aria-label={`${d.remove} ${nameOf[code] ?? code}`}
                  className="text-(--color-brand-dark)/60 hover:text-red-600"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div>
        <input
          className={inputClass}
          placeholder={d.searchCountries}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="mt-2 max-h-64 overflow-y-auto rounded-md border border-black/10 bg-white p-2 grid grid-cols-1 sm:grid-cols-2 gap-x-4">
          {filtered.map((c) => (
            <label
              key={c.code}
              className="flex items-center gap-2 py-1 text-sm cursor-pointer hover:bg-black/[0.03] rounded px-1"
            >
              <input
                type="checkbox"
                checked={countries.includes(c.code)}
                onChange={() => toggleCountry(c.code)}
              />
              {c.name}
            </label>
          ))}
        </div>
      </div>

      {hasUs && (
        <div className="rounded-lg border border-(--color-brand)/20 bg-(--color-brand-light)/40 p-3 space-y-2">
          <div className="text-sm font-medium">
            {d.usStatesLabel} ({states.length})
          </div>
          <p className="text-xs text-black/60">{d.usStatesNote}</p>
          {states.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {states.map((code) => (
                <span
                  key={code}
                  className="inline-flex items-center gap-1 rounded-full bg-white border border-black/10 px-2.5 py-1 text-xs"
                >
                  {stateName[code] ?? code}
                  <button
                    type="button"
                    onClick={() => toggleState(code)}
                    aria-label={`${d.remove} ${stateName[code] ?? code}`}
                    className="text-black/40 hover:text-red-600"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="max-h-56 overflow-y-auto rounded-md border border-black/10 bg-white p-2 grid grid-cols-2 sm:grid-cols-3 gap-x-4">
            {usStates.map((s) => (
              <label
                key={s.code}
                className="flex items-center gap-2 py-1 text-sm cursor-pointer hover:bg-black/[0.03] rounded px-1"
              >
                <input
                  type="checkbox"
                  checked={states.includes(s.code)}
                  onChange={() => toggleState(s.code)}
                />
                {s.name}
              </label>
            ))}
          </div>
        </div>
      )}

      <Feedback ok={ok} error={error} />
      <button type="button" onClick={save} disabled={busy} className={buttonClass}>
        {busy ? d.saving : d.save}
      </button>
    </div>
  );
}
