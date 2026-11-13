"use client";

import { useEffect, useRef, useState } from "react";

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
//
// KKL asked (11/2026) for a real calendar too, not only typed entry: the
// field keeps the typed DD/MM/YYYY mask and adds a calendar button that
// opens our own popover month grid (again not the native picker, for the
// same locale reason). Picking a day fills the field in DD/MM/YYYY.

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

const MONTHS = {
  he: ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני", "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"],
  en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
};
// Week starts on Sunday (Israel / US convention).
const WEEKDAYS = {
  he: ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"],
  en: ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"],
};
const UI = {
  he: { open: "פתיחת לוח שנה", prev: "החודש הקודם", next: "החודש הבא", today: "היום", clear: "ניקוי", close: "סגירה" },
  en: { open: "Open calendar", prev: "Previous month", next: "Next month", today: "Today", clear: "Clear", close: "Close" },
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function toIso(y: number, m: number, d: number) {
  return `${y}-${pad(m + 1)}-${pad(d)}`;
}
function todayIso() {
  const t = new Date();
  return toIso(t.getFullYear(), t.getMonth(), t.getDate());
}

export function DateFieldDMY({
  value,
  onChange,
  className,
  name,
  id,
  onBlur,
  min,
  max,
}: {
  // ISO yyyy-mm-dd, or "".
  value: string | null | undefined;
  // Called with an ISO yyyy-mm-dd string once a full, valid date has been
  // typed or picked, or "" while the field is empty/incomplete/invalid.
  onChange: (iso: string) => void;
  className?: string;
  name?: string;
  id?: string;
  onBlur?: () => void;
  // Optional ISO bounds -- days outside them are disabled in the calendar
  // (typed entry is still validated by each form's own schema).
  min?: string | null;
  max?: string | null;
}) {
  const [text, setText] = useState(() => isoToDmy(value));
  const [open, setOpen] = useState(false);
  const [lang, setLang] = useState<"he" | "en">("he");
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth());
  const wrapperRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function openCalendar() {
    // The page language decides the calendar's month/day names.
    setLang(document.documentElement.lang === "en" ? "en" : "he");
    const base = dmyToIso(text) || value || min || todayIso();
    const m = base.match(/^(\d{4})-(\d{2})/);
    if (m) {
      setViewYear(Number(m[1]));
      setViewMonth(Number(m[2]) - 1);
    }
    setOpen(true);
  }

  function pick(iso: string) {
    setText(isoToDmy(iso));
    onChange(iso);
    setOpen(false);
    onBlur?.();
  }

  function shiftMonth(delta: number) {
    const d = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  }

  const selectedIso = dmyToIso(text) || value || "";
  const today = todayIso();
  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  const thisYear = new Date().getFullYear();
  const minYear = min ? Number(min.slice(0, 4)) : 1920;
  const maxYear = max ? Number(max.slice(0, 4)) : thisYear + 10;
  const years: number[] = [];
  for (let y = maxYear; y >= minYear; y--) years.push(y);
  if (!years.includes(viewYear)) years.push(viewYear);
  const t = UI[lang];
  const isDisabled = (iso: string) =>
    (!!min && iso < min) || (!!max && iso > max);

  return (
    <div className="relative" ref={wrapperRef}>
      <input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        name={name}
        id={id}
        placeholder="DD/MM/YYYY"
        maxLength={10}
        className={`${className ?? ""} pl-10`}
        value={text}
        onChange={(e) => {
          const masked = maskInput(e.target.value);
          setText(masked);
          onChange(dmyToIso(masked));
        }}
        onBlur={onBlur}
      />
      <button
        type="button"
        onClick={() => (open ? setOpen(false) : openCalendar())}
        aria-label={t.open}
        aria-expanded={open}
        className="absolute inset-y-0 left-0 flex items-center px-2.5 text-black/50 hover:text-(--color-brand-dark)"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
      </button>

      {open && (
        <div
          role="dialog"
          dir={lang === "he" ? "rtl" : "ltr"}
          className="absolute z-30 mt-1 start-0 w-72 rounded-lg border border-black/10 bg-white p-3 shadow-lg"
        >
          <div className="flex items-center justify-between gap-1 mb-2">
            <button type="button" onClick={() => shiftMonth(-1)} aria-label={t.prev} className="rounded px-2 py-1 hover:bg-black/5">
              {lang === "he" ? "›" : "‹"}
            </button>
            <div className="flex gap-1">
              <select
                aria-label="month"
                className="rounded border border-black/15 px-1 py-0.5 text-sm"
                value={viewMonth}
                onChange={(e) => setViewMonth(Number(e.target.value))}
              >
                {MONTHS[lang].map((m, i) => (
                  <option key={m} value={i}>{m}</option>
                ))}
              </select>
              <select
                aria-label="year"
                className="rounded border border-black/15 px-1 py-0.5 text-sm"
                value={viewYear}
                onChange={(e) => setViewYear(Number(e.target.value))}
              >
                {years.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <button type="button" onClick={() => shiftMonth(1)} aria-label={t.next} className="rounded px-2 py-1 hover:bg-black/5">
              {lang === "he" ? "‹" : "›"}
            </button>
          </div>

          <div className="grid grid-cols-7 text-center text-xs text-black/50 mb-1">
            {WEEKDAYS[lang].map((w) => (
              <div key={w} className="py-1">{w}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-0.5 text-center text-sm">
            {cells.map((day, i) => {
              if (day === null) return <div key={`e${i}`} />;
              const iso = toIso(viewYear, viewMonth, day);
              const selected = iso === selectedIso;
              const disabled = isDisabled(iso);
              return (
                <button
                  key={iso}
                  type="button"
                  disabled={disabled}
                  onClick={() => pick(iso)}
                  className={`rounded py-1.5 transition ${
                    selected
                      ? "bg-(--color-brand) text-white font-semibold"
                      : iso === today
                        ? "ring-1 ring-(--color-brand) text-(--color-brand-dark)"
                        : "hover:bg-black/5"
                  } ${disabled ? "opacity-30 cursor-not-allowed hover:bg-transparent" : ""}`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          <div className="mt-2 flex items-center justify-between text-xs">
            <button
              type="button"
              disabled={isDisabled(today)}
              onClick={() => pick(today)}
              className="rounded px-2 py-1 text-(--color-brand-dark) hover:bg-black/5 disabled:opacity-30"
            >
              {t.today}
            </button>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => {
                  setText("");
                  onChange("");
                  setOpen(false);
                }}
                className="rounded px-2 py-1 text-black/60 hover:bg-black/5"
              >
                {t.clear}
              </button>
              <button type="button" onClick={() => setOpen(false)} className="rounded px-2 py-1 text-black/60 hover:bg-black/5">
                {t.close}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
