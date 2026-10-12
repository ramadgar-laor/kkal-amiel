"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  updatePaymentStatus,
  PAYMENT_STATUSES,
  type PaymentStatus,
} from "@/lib/actions/invoices";

const STATUS_LABEL: Record<PaymentStatus, string> = {
  received_for_review: "התקבל לבדיקה",
  approved_for_payment: "נבדק ואושר לתשלום",
  paid: "שולם",
};

export function AmielPaymentPanel({
  invoiceId,
  currentStatus,
  currentPaidAmount,
  currentPaymentCurrency,
  currentNotes,
  invoiceAmount,
  invoiceCurrency,
}: {
  invoiceId: string;
  currentStatus: string;
  currentPaidAmount: number | null;
  currentPaymentCurrency: string | null;
  currentNotes: string | null;
  invoiceAmount: number;
  invoiceCurrency: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<PaymentStatus>(
    (PAYMENT_STATUSES.includes(currentStatus as PaymentStatus)
      ? currentStatus
      : "received_for_review") as PaymentStatus
  );
  const [paidAmount, setPaidAmount] = useState(
    currentPaidAmount != null ? String(currentPaidAmount) : String(invoiceAmount)
  );
  const [paymentCurrency, setPaymentCurrency] = useState(
    currentPaymentCurrency || invoiceCurrency
  );
  const [notes, setNotes] = useState(currentNotes ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const inputClass =
    "w-full rounded-md border border-black/15 bg-white px-3 py-2 text-sm focus:outline-2 focus:outline-(--color-brand)";
  const labelClass = "block text-sm font-medium mb-1";

  async function save() {
    setPending(true);
    setError(null);
    setSaved(false);
    const amountNum = paidAmount.trim() ? Number(paidAmount) : null;
    if (paidAmount.trim() && (!Number.isFinite(amountNum) || (amountNum ?? 0) <= 0)) {
      setError("יש להזין סכום חיובי");
      setPending(false);
      return;
    }
    const result = await updatePaymentStatus({
      id: invoiceId,
      paymentStatus: status,
      paidAmount: amountNum,
      paymentCurrency: paymentCurrency.trim() || null,
      amielNotes: notes.trim() || null,
    });
    setPending(false);
    if (result?.error) {
      setError("השמירה נכשלה, נסה/י שוב");
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <div className="space-y-3 rounded-md border border-black/10 p-3">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className={labelClass}>סטטוס טיפול</label>
          <select
            className={inputClass}
            value={status}
            onChange={(e) => setStatus(e.target.value as PaymentStatus)}
          >
            {PAYMENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>סכום ששולם</label>
          <input
            type="number"
            step="0.01"
            className={inputClass}
            value={paidAmount}
            onChange={(e) => setPaidAmount(e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass}>מטבע</label>
          <input
            className={inputClass}
            value={paymentCurrency}
            onChange={(e) => setPaymentCurrency(e.target.value)}
          />
        </div>
      </div>
      <div>
        <label className={labelClass}>מידע רלוונטי נוסף (פנימי, עמיאל)</label>
        <textarea
          rows={2}
          className={inputClass}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      {saved && (
        <p className="text-xs text-(--color-accent-dark)">העדכון נשמר בהצלחה.</p>
      )}
      <button
        onClick={save}
        disabled={pending}
        className="rounded-md bg-(--color-brand) text-white text-sm font-medium px-4 py-2 hover:bg-(--color-brand-dark) transition disabled:opacity-60"
      >
        {pending ? "שומר..." : "שמירת עדכון תשלום"}
      </button>
    </div>
  );
}
