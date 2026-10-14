"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { StatusBadge } from "@/components/status-badge";
import { formatDateDMY } from "@/lib/utils/date";

const STATUS_FILTER_LABEL: Record<string, string> = {
  all: "כל הסטטוסים",
  not_sent: "טרם הועבר לבדיקה",
  received_for_review: "התקבל לבדיקה",
  approved_for_payment: "אושר לתשלום",
  paid: "שולם",
  returned_to_kkal: 'הוחזר לקק"ל',
  returned_to_rep: "הוחזר לשליח",
};

export type AmielInvoiceRow = {
  id: string;
  supplierName: string;
  eventId: string;
  eventName: string;
  repName: string;
  repCountry: string;
  amount: number;
  currency: string;
  submittedAt: string | null;
  paymentStatus: string;
};

const formatDate = formatDateDMY;

export function AmielInvoicesTable({
  rows,
  initialStatus,
}: {
  rows: AmielInvoiceRow[];
  // Pre-selects the status filter, e.g. when arriving from a link on the
  // Amiel dashboard's status breakdown (?paymentStatus=paid).
  initialStatus?: string;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState(
    initialStatus && initialStatus in STATUS_FILTER_LABEL
      ? initialStatus
      : "all"
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (status !== "all" && r.paymentStatus !== status) return false;
      if (!q) return true;
      const haystack = [r.supplierName, r.eventName, r.repName, r.repCountry]
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
          placeholder="חיפוש לפי ספק, אירוע, שליח או מדינה..."
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
          {filtered.length} מתוך {rows.length} חשבוניות
        </span>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-black/50">לא נמצאו חשבוניות התואמות לחיפוש.</p>
      ) : (
        <div className="space-y-1.5">
          <p className="text-xs text-black/40">
            לחיצה על שורה פותחת את פרטי החשבונית, פרטי הבנק וטיפול בתשלום.
          </p>
          <div className="rounded-xl bg-white border border-black/5 overflow-x-auto">
            <table className="w-full text-xs min-w-[950px]">
              <thead>
                <tr className="border-b border-black/10 text-black/50 text-start">
                  <th className="px-3 py-2 font-medium text-start">ספק</th>
                  <th className="px-3 py-2 font-medium text-start">שליח</th>
                  <th className="px-3 py-2 font-medium text-start">מדינה</th>
                  <th className="px-3 py-2 font-medium text-start">אירוע</th>
                  <th className="px-3 py-2 font-medium text-start">סכום</th>
                  <th className="px-3 py-2 font-medium text-start">תאריך הגשה</th>
                  <th className="px-3 py-2 font-medium text-start">סטטוס טיפול</th>
                  <th className="px-3 py-2 font-medium text-center">פרטים</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {filtered.map((r) => {
                  const href = `/amiel/invoices/${r.id}`;
                  return (
                    <tr
                      key={r.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => router.push(href)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          router.push(href);
                        }
                      }}
                      className="cursor-pointer hover:bg-(--color-brand-light)/50"
                    >
                      <td className="px-3 py-2 font-medium whitespace-nowrap">
                        {r.supplierName}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-black/70">
                        {r.repName}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-black/70">
                        {r.repCountry}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-black/70 max-w-[200px] truncate">
                        {r.eventName}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-black/70">
                        {r.amount.toLocaleString("he-IL")} {r.currency}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-black/70">
                        {formatDate(r.submittedAt)}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <StatusBadge status={r.paymentStatus} />
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-(--color-brand) text-center">
                        ←
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
