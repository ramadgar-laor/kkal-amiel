"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateInvoiceBankDetails } from "@/lib/actions/invoices";
import { COUNTRIES_HE } from "@/lib/data/countries";

// Rep-side edit for an invoice Amiel marked as "returned_to_rep" (item 6):
// the rep may only touch bank details here -- never amounts or the invoice
// file -- and saving sends the invoice back to Amiel's queue automatically.
export function InvoiceBankEditPanel({
  invoiceId,
  defaultValues,
}: {
  invoiceId: string;
  defaultValues: {
    supplierBankName: string;
    supplierBankAddress: string;
    supplierBankCountry: string;
    supplierIban: string;
    supplierSwift: string;
    supplierBeneficiaryName: string;
  };
}) {
  const router = useRouter();
  const [values, setValues] = useState(defaultValues);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const inputClass =
    "w-full rounded-md border border-black/15 bg-white px-3 py-2 text-sm focus:outline-2 focus:outline-(--color-brand)";
  const labelClass = "block text-xs font-medium mb-1";

  function set<K extends keyof typeof values>(key: K, v: string) {
    setValues((prev) => ({ ...prev, [key]: v }));
  }

  async function save() {
    setPending(true);
    setError(null);
    setSaved(false);
    const result = await updateInvoiceBankDetails({
      id: invoiceId,
      ...values,
    });
    setPending(false);
    if (result?.error) {
      setError("יש למלא את כל פרטי הבנק לפני השליחה");
      return;
    }
    setSaved(true);
    router.refresh();
  }

  if (saved) {
    return (
      <p className="text-sm text-(--color-accent-dark)">
        הפרטים נשלחו בהצלחה לעמיאל להמשך טיפול.
      </p>
    );
  }

  return (
    <div className="space-y-2 rounded-md border border-black/10 bg-white p-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>שם בעל החשבון</label>
          <input
            className={inputClass}
            value={values.supplierBeneficiaryName}
            onChange={(e) => set("supplierBeneficiaryName", e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass}>שם הבנק</label>
          <input
            className={inputClass}
            value={values.supplierBankName}
            onChange={(e) => set("supplierBankName", e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass}>כתובת הבנק</label>
          <input
            className={inputClass}
            value={values.supplierBankAddress}
            onChange={(e) => set("supplierBankAddress", e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass}>מדינת הבנק</label>
          <select
            className={inputClass}
            value={values.supplierBankCountry}
            onChange={(e) => set("supplierBankCountry", e.target.value)}
          >
            <option value="">בחר/י מדינה</option>
            {COUNTRIES_HE.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>מספר חשבון / IBAN</label>
          <input
            className={inputClass}
            value={values.supplierIban}
            onChange={(e) => set("supplierIban", e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass}>קוד סוויפט (SWIFT)</label>
          <input
            className={inputClass}
            value={values.supplierSwift}
            onChange={(e) => set("supplierSwift", e.target.value)}
          />
        </div>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <button
        onClick={save}
        disabled={pending}
        className="rounded-md bg-(--color-brand) text-white text-sm font-medium px-4 py-2 hover:bg-(--color-brand-dark) transition disabled:opacity-60"
      >
        {pending ? "שולח..." : "שליחת פרטים מעודכנים לעמיאל"}
      </button>
    </div>
  );
}
