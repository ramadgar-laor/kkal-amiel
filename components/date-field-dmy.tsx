"use client";

import { useState } from "react";

// Native <input type="date"> is supposed to localize its displayed format
// via the `lang` attribute, but Chrome does not honor that for the date
// picker/typed text -- it always renders in the *browser's own* UI
// language (chrome://settings/languages), never the page's `lang`
// attribute. So a rep whose Chrome profile is set to US English always
// sees MM/DD/YYYY no matter what `lang="en-GB"` we put on the element
// (Firefox and Safari mostly do honor it, which is why this looked fixed
// in some earlier testing). To guarantee DD/MM/YYYY for every viewer
// regardless of their own browser/OS locale, this renders a plain masked
// text input instead of the native date input, and converts to/from the
// ISO (yyyy-mm-dd) string the rest of the app, the DB, and Zod validation
// all use -- nothing downstream of the field needs to change.

function isoToDmy(iso: string | null | undefined): string {
  if (!iso) return "";
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return "";
  const [, y, m, d] = match;
  return `${d}/${m}/${y}`;
}

function dmyToIso(dmy: string): string {
  const match = dmy.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return "";
  const [, d, m, y] = match;
  // Reject obviously-invalid calendar dates (e.g. 31/02/2026) rather than
  // silently passing them through as a "valid" ISO string.
  const day = Number(d);
  const month = Number(m);
  const year = Number(y);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return "";
  }
  return `${y}-${m}-${d}`;
}

// Auto-inserts "/" separators as the person types digits, so typing
// "13102026" becomes "13/10/2026" without them having to type the slashes.
function maskInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  const parts = [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)].filter(
    (p) => p.length > 0
  );
  return parts.join("/");
}

export function DateFieldDMY({
  value,
  onChange,
  className,
  name,
  id,
  onBlur,
}: {
  // ISO yyyy-mm-dd, or "".
  value: string | null | undefined;
  // Called with an ISO yyyy-mm-dd string once a full, valid date has been
  // typed, or "" while the field is empty/incomplete/invalid.
  onChange: (iso: string) => void;
  className?: string;
  name?: string;
  id?: string;
  onBlur?: () => void;
}) {
  const [text, setText] = useState(() => isoToDmy(value));

  // Keep the displayed text in sync when the ISO value changes from
  // outside this field (a prefill, react-hook-form reset, etc.) -- but
  // only while the person isn't actively mid-edit with an incomplete date,
  // so we don't fight their typing. Adjusted during render (React's
  // recommended pattern for "derive state from a changed prop") rather than
  // in a useEffect, which would cause an extra render pass.
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    const incoming = isoToDmy(value);
    setText((current) => (dmyToIso(current) ? incoming : current));
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      autoComplete="off"
      name={name}
      id={id}
      placeholder="DD/MM/YYYY"
      maxLength={10}
      className={className}
      value={text}
      onChange={(e) => {
        const masked = maskInput(e.target.value);
        setText(masked);
        onChange(dmyToIso(masked));
      }}
      onBlur={onBlur}
    />
  );
}
