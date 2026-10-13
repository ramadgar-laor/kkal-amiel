// Single shared date-display formatter for the whole app (item 10):
// always DD/MM/YYYY, regardless of the viewer's browser/OS locale -- which
// is exactly the ambiguity that caused dates to show as MM/DD/YYYY in some
// places before this. For a plain "YYYY-MM-DD" value (a `date` column,
// e.g. invoice_date, event start/end dates) the digits are read directly
// out of the string, so there's no timezone-shift risk from going through
// a Date object. A full timestamp (e.g. created_at) falls back to Date,
// rendered in the viewer's local time zone -- consistent with how the rest
// of the app already displays timestamps.
export function formatDateDMY(value: string | null | undefined): string {
  if (!value) return "";

  const plainDateMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (plainDateMatch) {
    const [, yyyy, mm, dd] = plainDateMatch;
    return `${dd}/${mm}/${yyyy}`;
  }

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}
