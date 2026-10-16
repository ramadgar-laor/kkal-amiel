"use client";

import { useMemo, useState } from "react";
import { StatusBadge } from "@/components/status-badge";
import { RepStatusSelect } from "@/components/rep-status-select";
import { RowSpinner } from "@/components/row-spinner";
import { useRowNavigation } from "@/lib/hooks/use-row-navigation";
import { getCountryName } from "@/lib/data/countries";
import { formatDateDMY } from "@/lib/utils/date";

const PARTICIPATION_LABEL_HE: Record<string, string> = {
  trustee: 'נאמן קק"ל',
  fellow: 'עמית קק"ל',
  coordinator: 'רכז קק"ל',
};

const STATUS_FILTER_LABEL: Record<string, string> = {
  all: "כל הסטטוסים",
  pending: "ממתין לאישור",
  approved: "מאושר",
  rejected: "נדחה",
  inactive: "לא פעיל",
};

export type RepDirectoryRow = {
  profileId: string;
  displayName: string;
  localName: string | null;
  email: string | null;
  whatsappPhone: string | null;
  missionPhone: string | null;
  country: string | null;
  organization: string | null;
  institutionType: string | null;
  institutionCity: string | null;
  mainRole: string | null;
  activityLevel: string | null;
  missionLocationName: string | null;
  missionStartDate: string | null;
  missionEndDateExpected: string | null;
  status: string;
  createdAt: string | null;
};

const formatDate = formatDateDMY;

export function RepsDirectoryTable({
  rows,
  exportHref,
}: {
  rows: RepDirectoryRow[];
  exportHref?: string;
}) {
  const { navigate, isPending, pendingId } = useRowNavigation();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (status !== "all" && r.status !== status) return false;
      if (!q) return true;
      const haystack = [
        r.displayName,
        r.localName,
        r.email,
        r.whatsappPhone,
        r.missionPhone,
        getCountryName(r.country),
        r.organization,
        r.institutionType,
        r.institutionCity,
        r.mainRole,
        r.missionLocationName,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [rows, search, status]);

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="חיפוש לפי שם, מייל, טלפון, מוסד, מדינה..."
          className="w-full sm:w-80 rounded-md border border-black/15 bg-white px-3 py-2 text-sm focus:outline-2 focus:outline-(--color-brand)"
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
        <span className="text-xs text-black/40">
          {filtered.length} מתוך {rows.length} שליחים
        </span>
        {exportHref && (
          // Plain <a>, not next/link: this points at a route handler that
          // streams an .xlsx download, not a page, so it must do a real
          // browser navigation rather than a client-side route transition.
          // (no-html-link-for-pages doesn't flag this file, since it isn't
          // under app/ — unlike the page.tsx this link moved from.)
          <a
            href={exportHref}
            className="sm:ms-auto inline-flex items-center gap-1.5 text-sm rounded-md border border-(--color-brand)/30 text-(--color-brand) px-3 py-1.5 hover:bg-(--color-brand-light) transition shrink-0"
          >
            ייצוא לאקסל
          </a>
        )}
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-black/50">לא נמצאו שליחים התואמים לחיפוש.</p>
      ) : (
        <div className="space-y-1.5">
          <p className="text-xs text-black/40">לחיצה על שורה פותחת את פרטי השליח לעריכה.</p>
          <div className="rounded-xl bg-white border border-black/5 overflow-x-auto">
          <table className="w-full text-xs min-w-[1100px]">
            <thead>
              <tr className="border-b border-black/10 text-black/50 text-start">
                <th className="px-3 py-2 font-medium text-start">שם</th>
                <th className="px-3 py-2 font-medium text-start">מייל</th>
                <th className="px-3 py-2 font-medium text-start">טלפון</th>
                <th className="px-3 py-2 font-medium text-start">מדינה</th>
                <th className="px-3 py-2 font-medium text-start">ארגון שולח</th>
                <th className="px-3 py-2 font-medium text-start">מוסד / עיר פעילות</th>
                <th className="px-3 py-2 font-medium text-start">תפקיד</th>
                <th className="px-3 py-2 font-medium text-start">רמת מעורבות</th>
                <th className="px-3 py-2 font-medium text-start">תאריכי שליחות</th>
                <th className="px-3 py-2 font-medium text-start">נרשם בתאריך</th>
                <th className="px-3 py-2 font-medium text-start">סטטוס</th>
                <th className="px-3 py-2 font-medium text-start">עדכון סטטוס / פרטים</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {filtered.map((r) => {
                const href = `/kkal/reps/${r.profileId}`;
                const rowPending = isPending && pendingId === r.profileId;
                return (
                <tr
                  key={r.profileId}
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(r.profileId, href)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      navigate(r.profileId, href);
                    }
                  }}
                  className={
                    rowPending
                      ? "cursor-wait opacity-60"
                      : "cursor-pointer hover:bg-(--color-brand-light)/50"
                  }
                >
                  <td className="px-3 py-2 font-medium whitespace-nowrap">
                    {r.displayName}
                    {r.localName && (
                      <span className="text-black/40 font-normal">
                        {" "}
                        ({r.localName})
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-black/70">
                    {r.email ?? "—"}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-black/70">
                    {r.whatsappPhone ?? r.missionPhone ?? "—"}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-black/70">
                    {getCountryName(r.country) || "—"}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-black/70">
                    {r.organization ?? "—"}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-black/70">
                    {[r.institutionType, r.institutionCity]
                      .filter(Boolean)
                      .join(" · ") || "—"}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-black/70">
                    {r.mainRole ?? "—"}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-black/70">
                    {r.activityLevel
                      ? PARTICIPATION_LABEL_HE[r.activityLevel] ?? r.activityLevel
                      : "—"}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-black/70">
                    {r.missionStartDate || r.missionEndDateExpected
                      ? `${formatDate(r.missionStartDate)} – ${formatDate(r.missionEndDateExpected)}`
                      : "—"}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-black/50">
                    {formatDate(r.createdAt)}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <StatusBadge status={r.status} />
                  </td>
                  <td
                    className="px-3 py-2 whitespace-nowrap"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center gap-2">
                      <RepStatusSelect profileId={r.profileId} status={r.status} />
                      <span className="text-(--color-brand)" aria-hidden="true">
                        {rowPending ? <RowSpinner /> : "←"}
                      </span>
                    </div>
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
