"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatDateDMY } from "@/lib/utils/date";

export type AmielPaymentRow = {
  id: string;
  supplierName: string;
  eventName: string;
  repName: string;
  repCountry: string;
  paidAmount: number | null;
  paymentCurrency: string | null;
  paymentExchangeRate: number | null;
  paidAmountIls: number | null;
  paidAt: string | null;
};

const formatDate = formatDateDMY;

export function AmielPaymentsTable({ rows }: { rows: AmielPaymentRow[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const haystack = [r.supplierName, r.eventName, r.repName, r.repCountry]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [rows, search]);

  const totalIls = filtered.reduce((sum, r) => sum + (r.paidAmountIls ?? 0), 0);

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
        <a
          href="/amiel/payments/export"
          className="rounded-md bg-(--color-brand) text-white text-sm font-medium px-4 py-2 hover:bg-(--color-brand-dark) transition whitespace-nowrap"
        >
          ייצוא לאקסל
        </a>
        <span className="text-xs text-black/40">
          {filtered.length} מתוך {rows.length} תשלומים · סה&quot;כ ₪
          {totalIls.toLocaleString("he-IL")}
        </span>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-black/50">לא נמצאו תשלומים התואמים לחיפוש.</p>
      ) : (
        <div className="rounded-xl bg-white border border-black/5 overflow-x-auto">
          <table className="w-full text-xs min-w-[950px]">
            <thead>
              <tr className="border-b border-black/10 text-black/50 text-start">
                <th className="px-3 py-2 font-medium text-start">ספק</th>
                <th className="px-3 py-2 font-medium text-start">שליח</th>
                <th className="px-3 py-2 font-medium text-start">מדינה</th>
                <th className="px-3 py-2 font-medium text-start">אירוע</th>
                <th className="px-3 py-2 font-medium text-start">סכום ששולם</th>
                <th className="px-3 py-2 font-medium text-start">שער המרה</th>
                <th className="px-3 py-2 font-medium text-start">סכום בשקל (₪)</th>
                <th className="px-3 py-2 font-medium text-start">תאריך תשלום</th>
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
                      {r.paidAmount != null
                        ? `${r.paidAmount.toLocaleString("he-IL")} ${r.paymentCurrency ?? ""}`
                        : "—"}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-black/70">
                      {r.paymentExchangeRate ?? "—"}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-black/70">
                      {r.paidAmountIls != null
                        ? `₪${r.paidAmountIls.toLocaleString("he-IL")}`
                        : "—"}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-black/70">
                      {formatDate(r.paidAt)}
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
      )}
    </div>
  );
}
