"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { StatusBadge } from "@/components/status-badge";
import { formatDateDMY } from "@/lib/utils/date";

const STATUS_FILTER_LABEL: Record<string, string> = {
  all: "כל הסטטוסים",
  pending: "ממתינות לאישור",
  approved: "אושרו",
  rejected: "נדחו",
};

// Mirrors the payment_status values from lib/invoices/payment-status.ts, plus
// "not_sent" (the implicit starting value before KKAL approves an invoice) --
// lets KKL staff filter to a specific stage of Amiel's payment pipeline, e.g.
// after clicking in from the breakdown on the KKL dashboard (/kkal).
const PAYMENT_STATUS_FILTER_LABEL: Record<string, string> = {
  all: "כל סטטוסי התשלום",
  not_sent: "טרם הועבר לעמיאל",
  received_for_review: "התקבל לבדיקה",
  approved_for_payment: "אושר לתשלום",
  paid: "שולם",
  returned_to_kkal: 'הוחזר לקק"ל',
  returned_to_rep: "הוחזר לשליח",
};

export type InvoiceDirectoryRow = {
  id: string;
  supplierName: string;
  eventId: string;
  eventName: string;
  repName: string;
  amount: number;
  currency: string;
  invoiceDate: string;
  kkalStatus: string;
  paymentStatus: string;
  createdAt: string | null;
};

const formatDate = formatDateDMY;

export function InvoicesDirectoryTable({
  rows,
  initialPaymentStatus,
}: {
  rows: InvoiceDirectoryRow[];
  // Pre-selects the payment-status filter, e.g. when arriving from a link on
  // the KKL dashboard's payment-status breakdown (?paymentStatus=paid).
  initialPaymentStatus?: string;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [paymentStatus, setPaymentStatus] = useState(
    initialPaymentStatus && initialPaymentStatus in PAYMENT_STATUS_FILTER_LABEL
      ? initialPaymentStatus
      : "all"
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (status !== "all" && r.kkalStatus !== status) return false;
      if (paymentStatus !== "all" && r.paymentStatus !== paymentStatus)
        return false;
      if (!q) return true;
      const haystack = [r.supplierName, r.eventName, r.repName]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [rows, search, status, paymentStatus]);

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="חיפוש לפי ספק, אירוע או שליח..."
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
        <select
          value={paymentStatus}
          onChange={(e) => setPaymentStatus(e.target.value)}
          className="rounded-md border border-black/15 bg-white px-3 py-2 text-sm focus:outline-2 focus:outline-(--color-brand)"
        >
          {Object.entries(PAYMENT_STATUS_FILTER_LABEL).map(([value, label]) => (
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
            לחיצה על שורה פותחת את פרטי החשבונית לבדיקה ואישור.
          </p>
          <div className="rounded-xl bg-white border border-black/5 overflow-x-auto">
            <table className="w-full text-xs min-w-[950px]">
              <thead>
                <tr className="border-b border-black/10 text-black/50 text-start">
                  <th className="px-3 py-2 font-medium text-start">ספק</th>
                  <th className="px-3 py-2 font-medium text-start">אירוע</th>
                  <th className="px-3 py-2 font-medium text-start">שליח</th>
                  <th className="px-3 py-2 font-medium text-start">סכום</th>
                  <th className="px-3 py-2 font-medium text-start">תאריך חשבונית</th>
                  <th className="px-3 py-2 font-medium text-start">סטטוס אישור</th>
                  <th className="px-3 py-2 font-medium text-start">סטטוס תשלום</th>
                  <th className="px-3 py-2 font-medium text-center">פרטים</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {filtered.map((r) => {
                  const href = `/kkal/invoices/${r.id}`;
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
                      <td className="px-3 py-2 whitespace-nowrap text-black/70 max-w-[200px] truncate">
                        {r.eventName}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-black/70">
                        {r.repName}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-black/70">
                        {r.amount.toLocaleString("he-IL")} {r.currency}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-black/70">
                        {formatDate(r.invoiceDate)}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <StatusBadge status={r.kkalStatus} />
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
