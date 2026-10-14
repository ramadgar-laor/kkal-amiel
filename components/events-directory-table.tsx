"use client";

import { useMemo, useState } from "react";
import { StatusBadge } from "@/components/status-badge";
import { RowSpinner } from "@/components/row-spinner";
import { useRowNavigation } from "@/lib/hooks/use-row-navigation";
import { getCountryName } from "@/lib/data/countries";
import { formatDateDMY } from "@/lib/utils/date";

const STATUS_FILTER_LABEL: Record<string, string> = {
  all: "כל הסטטוסים",
  actionable: "ממתינות לאישור",
  approved: "אושר במלואו",
  partially_approved: "אושר חלקית",
  rejected: "נדחה",
};

type Timing = "upcoming" | "ongoing" | "past";

const TIMING_FILTER_LABEL: Record<"all" | Timing, string> = {
  all: "כל התזמונים",
  upcoming: "עתידיים",
  ongoing: "מתקיימים כעת",
  past: "הסתיימו",
};

const TIMING_BADGE: Record<Timing, { label: string; className: string }> = {
  upcoming: { label: "עתידי", className: "bg-sky-100 text-sky-800" },
  ongoing: {
    label: "מתקיים כעת",
    className: "bg-(--color-accent-light) text-(--color-accent-dark)",
  },
  past: { label: "הסתיים", className: "bg-black/5 text-black/50" },
};

export type EventDirectoryRow = {
  id: string;
  name: string;
  repName: string;
  repCountry: string | null;
  city: string | null;
  country: string | null;
  startDate: string;
  endDate: string;
  status: string;
  requestedAmount: number;
  requestedCurrency: string;
  approvedAmount: number | null;
  invoicesPendingCount: number;
  invoicesPaidTotal: number;
  createdAt: string | null;
};

function timingOf(row: EventDirectoryRow, todayIso: string): Timing {
  if (row.endDate < todayIso) return "past";
  if (row.startDate > todayIso) return "upcoming";
  return "ongoing";
}

const formatDate = formatDateDMY;

function formatAmount(amount: number | null, currency: string) {
  if (amount == null) return "—";
  return `${amount.toLocaleString("he-IL")} ${currency}`;
}

export function EventsDirectoryTable({ rows }: { rows: EventDirectoryRow[] }) {
  const { navigate, isPending, pendingId } = useRowNavigation();
  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [timing, setTiming] = useState<"all" | Timing>("all");
  const [country, setCountry] = useState("all");

  const countryOptions = useMemo(() => {
    const codes = new Set<string>();
    rows.forEach((r) => {
      if (r.country) codes.add(r.country);
    });
    return [...codes]
      .map((code) => ({ code, label: getCountryName(code) || code }))
      .sort((a, b) => a.label.localeCompare(b.label, "he"));
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      const rowTiming = timingOf(r, todayIso);

      if (timing !== "all" && rowTiming !== timing) return false;
      if (country !== "all" && r.country !== country) return false;

      if (status === "actionable") {
        if (r.status !== "submitted" && r.status !== "info_requested")
          return false;
      } else if (status !== "all" && r.status !== status) {
        return false;
      }

      if (!q) return true;
      const haystack = [
        r.name,
        r.repName,
        r.city,
        getCountryName(r.country),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [rows, search, status, timing, country, todayIso]);

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:items-center">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="חיפוש לפי שם אירוע, שליח, עיר, מדינה..."
          className="w-full sm:w-72 rounded-md border border-black/15 bg-white px-3 py-2 text-sm focus:outline-2 focus:outline-(--color-brand)"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-md border border-black/15 bg-white px-3 py-2 text-sm focus:outline-2 focus:outline-(--color-brand)"
        >
          {Object.entries(STATUS_FILTER_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select
          value={timing}
          onChange={(e) => setTiming(e.target.value as "all" | Timing)}
          className="rounded-md border border-black/15 bg-white px-3 py-2 text-sm focus:outline-2 focus:outline-(--color-brand)"
        >
          {Object.entries(TIMING_FILTER_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          className="rounded-md border border-black/15 bg-white px-3 py-2 text-sm focus:outline-2 focus:outline-(--color-brand)"
        >
          <option value="all">כל המדינות</option>
          {countryOptions.map((c) => (
            <option key={c.code} value={c.code}>
              {c.label}
            </option>
          ))}
        </select>
        <span className="text-xs text-black/40">
          {filtered.length} מתוך {rows.length} אירועים
        </span>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-black/50">לא נמצאו אירועים התואמים לחיפוש.</p>
      ) : (
        <div className="space-y-1.5">
          <p className="text-xs text-black/40">לחיצה על שורה פותחת את פרטי האירוע לבדיקה ואישור.</p>
          <div className="rounded-xl bg-white border border-black/5 overflow-x-auto">
          <table className="w-full text-xs min-w-[1200px]">
            <thead>
              <tr className="border-b border-black/10 text-black/50 text-start">
                <th className="px-3 py-2 font-medium text-start">אירוע</th>
                <th className="px-3 py-2 font-medium text-start">שליח</th>
                <th className="px-3 py-2 font-medium text-start">מדינה / עיר</th>
                <th className="px-3 py-2 font-medium text-start">תאריכים</th>
                <th className="px-3 py-2 font-medium text-start">תזמון</th>
                <th className="px-3 py-2 font-medium text-start">סטטוס</th>
                <th className="px-3 py-2 font-medium text-start">סכום מבוקש</th>
                <th className="px-3 py-2 font-medium text-start">סכום מאושר</th>
                <th className="px-3 py-2 font-medium text-start">חשבוניות</th>
                <th className="px-3 py-2 font-medium text-center">פרטים</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {filtered.map((r) => {
                const rowTiming = timingOf(r, todayIso);
                const badge = TIMING_BADGE[rowTiming];
                const href = `/kkal/events/${r.id}`;
                const rowPending = isPending && pendingId === r.id;
                return (
                  <tr
                    key={r.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate(r.id, href)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        navigate(r.id, href);
                      }
                    }}
                    className={
                      rowPending
                        ? "cursor-wait opacity-60"
                        : rowTiming === "past"
                          ? "cursor-pointer hover:bg-(--color-brand-light)/50 opacity-60"
                          : "cursor-pointer hover:bg-(--color-brand-light)/50"
                    }
                  >
                    <td className="px-3 py-2 font-medium whitespace-nowrap max-w-[220px] truncate">
                      {r.name}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-black/70">
                      {r.repName}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-black/70">
                      {[getCountryName(r.country) || r.country, r.city]
                        .filter(Boolean)
                        .join(" · ") || "—"}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-black/70">
                      {formatDate(r.startDate)} – {formatDate(r.endDate)}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-black/70">
                      {formatAmount(r.requestedAmount, r.requestedCurrency)}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-black/70">
                      {formatAmount(r.approvedAmount, r.requestedCurrency)}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-black/70">
                      {r.invoicesPaidTotal > 0 || r.invoicesPendingCount > 0 ? (
                        <>
                          {r.invoicesPaidTotal > 0 && (
                            <span>
                              שולם: {formatAmount(r.invoicesPaidTotal, r.requestedCurrency)}
                            </span>
                          )}
                          {r.invoicesPendingCount > 0 && (
                            <span className="text-amber-700">
                              {r.invoicesPaidTotal > 0 ? " · " : ""}
                              {r.invoicesPendingCount} ממתינות
                            </span>
                          )}
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-(--color-brand) text-center">
                      {rowPending ? <RowSpinner /> : "←"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  );
}
