// "Short notice" events: the event starts less than 3 weeks after the
// request is submitted. KKL needs special approval to meet the timeline in
// that case, so the ambassador is warned while filling the form (not
// blocked), and KKL staff see a "tight schedule" tag on the request.

export const SHORT_NOTICE_DAYS = 21;

// Whole days from `fromIso` to `toIso` (both yyyy-mm-dd, or a timestamp
// whose first 10 chars are the date). Negative if `toIso` is earlier.
export function daysBetween(fromIso: string, toIso: string): number {
  const from = Date.UTC(
    Number(fromIso.slice(0, 4)),
    Number(fromIso.slice(5, 7)) - 1,
    Number(fromIso.slice(8, 10))
  );
  const to = Date.UTC(
    Number(toIso.slice(0, 4)),
    Number(toIso.slice(5, 7)) - 1,
    Number(toIso.slice(8, 10))
  );
  return Math.round((to - from) / 86_400_000);
}

// Days between the request and the event start, or null if either is
// missing. `requestedAt` is the submission date (events.created_at).
export function noticeDays(
  requestedAt: string | null | undefined,
  startDate: string | null | undefined
): number | null {
  if (!requestedAt || !startDate) return null;
  return daysBetween(requestedAt, startDate);
}

export function isShortNotice(
  requestedAt: string | null | undefined,
  startDate: string | null | undefined
): boolean {
  const days = noticeDays(requestedAt, startDate);
  return days !== null && days < SHORT_NOTICE_DAYS;
}

// Today's date in the viewer's local time zone, as yyyy-mm-dd.
export function localTodayIso(): string {
  const t = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}`;
}
