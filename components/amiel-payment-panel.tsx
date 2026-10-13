"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updatePaymentStatus } from "@/lib/actions/invoices";
import { createClient } from "@/lib/supabase/client";
import { uploadEventFile } from "@/lib/storage/event-files";
import {
  PAYMENT_STATUSES,
  PAYMENT_STATUSES_REQUIRING_NOTES,
  type PaymentStatus,
} from "@/lib/invoices/payment-status";

const STATUS_LABEL: Record<PaymentStatus, string> = {
  received_for_review: "התקבל לבדיקה",
  approved_for_payment: "נבדק ואושר לתשלום",
  paid: "שולם",
  returned_to_kkal: "לא מאושר לתשלום - החזרה לקק\"ל",
  returned_to_rep: "פרטים חסרים - החזרה לשליח",
};

export function AmielPaymentPanel({
  invoiceId,
  currentStatus,
  currentPaidAmount,
  currentPaymentCurrency,
  currentNotes,
  currentPaidAmountIls,
  currentPaymentExchangeRate,
  currentPaidAt,
  invoiceAmount,
  invoiceCurrency,
}: {
  invoiceId: string;
  currentStatus: string;
  currentPaidAmount: number | null;
  currentPaymentCurrency: string | null;
  currentNotes: string | null;
  currentPaidAmountIls: number | null;
  currentPaymentExchangeRate: number | null;
  currentPaidAt: string | null;
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
  const [exchangeRate, setExchangeRate] = useState(
    currentPaymentExchangeRate != null ? String(currentPaymentExchangeRate) : ""
  );
  const [paidAmountIls, setPaidAmountIls] = useState(
    currentPaidAmountIls != null ? String(currentPaidAmountIls) : ""
  );
  const [paidDate, setPaidDate] = useState(currentPaidAt ?? "");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const inputClass =
    "w-full rounded-md border border-black/15 bg-white px-3 py-2 text-sm focus:outline-2 focus:outline-(--color-brand)";
  const labelClass = "block text-sm font-medium mb-1";

  const notesRequired = PAYMENT_STATUSES_REQUIRING_NOTES.includes(status);
  const isPaid = status === "paid";

  async function save() {
    setPending(true);
    setError(null);
    setSaved(false);

    if (notesRequired && !notes.trim()) {
      setError(
        status === "returned_to_kkal"
          ? "יש לציין סיבה שבגללה החשבונית לא מאושרת לתשלום"
          : "יש לציין אילו פרטים חסרים או שגויים"
      );
      setPending(false);
      return;
    }

    const amountNum = paidAmount.trim() ? Number(paidAmount) : null;
    if (paidAmount.trim() && (!Number.isFinite(amountNum) || (amountNum ?? 0) <= 0)) {
      setError("יש להזין סכום חיובי");
      setPending(false);
      return;
    }

    let receiptFilePath: string | null = null;
    const exchangeRateNum = exchangeRate.trim() ? Number(exchangeRate) : null;
    const paidAmountIlsNum = paidAmountIls.trim() ? Number(paidAmountIls) : null;

    if (isPaid) {
      if (
        !exchangeRateNum ||
        exchangeRateNum <= 0 ||
        !paidAmountIlsNum ||
        paidAmountIlsNum <= 0 ||
        !paidDate
      ) {
        setError("יש למלא שער המרה, סכום ששולם בשקל ותאריך תשלום");
        setPending(false);
        return;
      }
      try {
        const supabase = createClient();
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) {
          setError("יש להתחבר מחדש כדי לשמור");
          setPending(false);
          return;
        }
        if (receiptFile) {
          receiptFilePath = await uploadEventFile(
            supabase,
            userData.user.id,
            receiptFile
          );
        } else {
          setError("יש להעלות קובץ אסמכתא לתשלום");
          setPending(false);
          return;
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "העלאת הקובץ נכשלה");
        setPending(false);
        return;
      }
    }

    const result = await updatePaymentStatus({
      id: invoiceId,
      paymentStatus: status,
      paidAmount: amountNum,
      paymentCurrency: paymentCurrency.trim() || null,
      amielNotes: notes.trim() || null,
      paymentReceiptFilePath: isPaid ? receiptFilePath : null,
      paymentExchangeRate: isPaid ? exchangeRateNum : null,
      paidAmountIls: isPaid ? paidAmountIlsNum : null,
      paidDate: isPaid ? paidDate : null,
    });
    setPending(false);
    if (result?.error) {
      setError(
        result.error === "notes_required"
          ? "יש לציין הערה/סיבה לפני שמירת סטטוס זה"
          : result.error === "paid_fields_required"
            ? "יש למלא קובץ אסמכתא, שער המרה, סכום בשקל ותאריך תשלום"
            : "השמירה נכשלה, נסה/י שוב"
      );
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
        {!notesRequired && (
          <>
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
          </>
        )}
      </div>

      {isPaid && (
        <div className="rounded-lg bg-black/[0.02] p-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>
              שער המרה שנעשה בו השימוש
              <span className="text-red-600"> *</span>
            </label>
            <input
              type="number"
              step="0.0001"
              className={inputClass}
              value={exchangeRate}
              onChange={(e) => setExchangeRate(e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>
              סכום ששולם בשקל (₪)
              <span className="text-red-600"> *</span>
            </label>
            <input
              type="number"
              step="0.01"
              className={inputClass}
              value={paidAmountIls}
              onChange={(e) => setPaidAmountIls(e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>
              תאריך תשלום
              <span className="text-red-600"> *</span>
            </label>
            <input
              type="date"
              className={inputClass}
              value={paidDate}
              onChange={(e) => setPaidDate(e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>
              קובץ אסמכתא לתשלום
              <span className="text-red-600"> *</span>
            </label>
            <input
              type="file"
              className={inputClass}
              onChange={(e) => setReceiptFile(e.target.files?.[0] ?? null)}
            />
          </div>
        </div>
      )}

      <div>
        <label className={labelClass}>
          {status === "returned_to_kkal"
            ? 'סיבת אי-אישור התשלום (יוצג לקק"ל)'
            : status === "returned_to_rep"
              ? "אילו פרטים חסרים/שגויים? (יוצג לשליח)"
              : "מידע רלוונטי נוסף (פנימי, עמיאל)"}
          {notesRequired && <span className="text-red-600"> *</span>}
        </label>
        <textarea
          rows={notesRequired ? 3 : 2}
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
