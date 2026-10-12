"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  invoiceFormSchema,
  type InvoiceFormValues,
  type InvoiceInput,
} from "@/lib/validation/invoice";
import { submitInvoice } from "@/lib/actions/invoices";
import { createClient } from "@/lib/supabase/client";
import { uploadEventFile } from "@/lib/storage/event-files";
import { Required } from "@/components/form-required-mark";

export type InvoiceSupplierOption = {
  id: string;
  name: string;
  field: string | null;
  bankDetailsKnown: boolean;
  beneficiaryName: string | null;
  bankName: string | null;
  accountNumber: string | null;
  swiftNumber: string | null;
};

const inputClass =
  "w-full rounded-md border border-black/15 bg-white px-3 py-2 text-sm focus:outline-2 focus:outline-(--color-brand)";
const labelClass = "block text-sm font-medium mb-1";
const errorClass = "text-xs text-red-600 mt-1";
const noteClass = "text-xs text-black/50 mt-1";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  const known: Record<string, string> = {
    required: "שדה חובה",
    must_be_positive: "יש להזין סכום חיובי",
    invalid_email: "כתובת מייל לא תקינה",
    invalid_type: "שדה חובה",
  };
  return <p className={errorClass}>{known[message] ?? "שדה לא תקין"}</p>;
}

export function InvoiceForm({
  eventId,
  defaultCurrency,
  suppliers,
}: {
  eventId: string;
  defaultCurrency: string;
  suppliers: InvoiceSupplierOption[];
}) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [prefillId, setPrefillId] = useState("");

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: {
      eventId,
      supplierName: "",
      supplierField: "",
      supplierBankName: "",
      supplierIban: "",
      supplierSwift: "",
      supplierBeneficiaryName: "",
      supplierContactPhone: "",
      supplierContactEmail: "",
      amount: "",
      currency: defaultCurrency || "",
      invoiceDate: "",
      file: null,
    },
  });

  function applyPrefill(id: string) {
    setPrefillId(id);
    const s = suppliers.find((x) => x.id === id);
    if (!s) return;
    setValue("supplierName", s.name, { shouldValidate: true });
    setValue("supplierField", s.field || "", { shouldValidate: true });
    if (s.bankDetailsKnown) {
      setValue("supplierBankName", s.bankName || "", { shouldValidate: true });
      setValue("supplierIban", s.accountNumber || "", { shouldValidate: true });
      setValue("supplierSwift", s.swiftNumber || "", { shouldValidate: true });
      setValue("supplierBeneficiaryName", s.beneficiaryName || "", {
        shouldValidate: true,
      });
    }
  }

  async function onSubmit(values: InvoiceFormValues) {
    setServerError(null);
    setUploading(true);
    try {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        setServerError("יש להתחבר מחדש כדי לשלוח את החשבונית");
        return;
      }
      const uid = userData.user.id;

      const filePath = await uploadEventFile(supabase, uid, values.file as File);

      const payload: InvoiceInput = {
        eventId: values.eventId,
        supplierName: values.supplierName,
        supplierField: values.supplierField,
        supplierBankName: values.supplierBankName,
        supplierIban: values.supplierIban,
        supplierSwift: values.supplierSwift,
        supplierBeneficiaryName: values.supplierBeneficiaryName,
        supplierContactPhone: values.supplierContactPhone,
        supplierContactEmail: values.supplierContactEmail,
        amount: Number(values.amount),
        currency: values.currency,
        invoiceDate: values.invoiceDate,
        filePath,
      };

      const result = await submitInvoice(payload);
      if (result?.error) {
        setServerError(
          result.error === "invalid_input"
            ? "יש לבדוק את השדות שמולאו"
            : `לא ניתן היה לשלוח את החשבונית: ${result.error}`
        );
        return;
      }
      setSuccess(true);
      router.refresh();
    } catch (e) {
      setServerError(
        e instanceof Error ? e.message : "אירעה שגיאה בהעלאת הקובץ"
      );
    } finally {
      setUploading(false);
    }
  }

  const busy = isSubmitting || uploading;

  if (success) {
    return (
      <div className="rounded-xl border border-(--color-accent-dark)/30 bg-(--color-accent-light) p-4 text-sm text-(--color-accent-dark)">
        החשבונית נשלחה בהצלחה וממתינה לבדיקת קק&quot;ל.{" "}
        <button
          type="button"
          onClick={() => setSuccess(false)}
          className="underline font-medium"
        >
          הזנת חשבונית נוספת
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-5 rounded-xl border border-black/10 bg-white p-5"
    >
      <h3 className="font-semibold text-(--color-brand-dark)">
        הזנת חשבונית
      </h3>

      {serverError && (
        <div className="rounded-md bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">
          {serverError}
        </div>
      )}

      {suppliers.length > 0 && (
        <div>
          <label className={labelClass}>מילוי אוטומטי מפרטי ספק שהוזן באירוע</label>
          <select
            className={inputClass}
            value={prefillId}
            onChange={(e) => applyPrefill(e.target.value)}
          >
            <option value="">בחר/י ספק (לא חובה)</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
                {!s.bankDetailsKnown ? " (פרטי בנק טרם נמסרו)" : ""}
              </option>
            ))}
          </select>
          <p className={noteClass}>
            ניתן למלא את פרטי הספק והבנק באופן אוטומטי לפי אחד הספקים שצוינו
            בעת פתיחת האירוע. אם פרטי הבנק לא נמסרו אז, יש להזין אותם כאן
            באופן מלא — הם נדרשים לפני ביצוע התשלום בפועל.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>
            שם הספק
            <Required />
          </label>
          <input className={inputClass} {...register("supplierName")} />
          <FieldError message={errors.supplierName?.message} />
        </div>
        <div>
          <label className={labelClass}>תחום עיסוק</label>
          <input className={inputClass} {...register("supplierField")} />
        </div>
      </div>

      <div className="rounded-lg bg-black/[0.02] p-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>
            שם בעל החשבון
            <Required />
          </label>
          <input
            className={inputClass}
            {...register("supplierBeneficiaryName")}
          />
          <FieldError message={errors.supplierBeneficiaryName?.message} />
        </div>
        <div>
          <label className={labelClass}>
            שם הבנק
            <Required />
          </label>
          <input className={inputClass} {...register("supplierBankName")} />
          <FieldError message={errors.supplierBankName?.message} />
        </div>
        <div>
          <label className={labelClass}>
            מספר חשבון / IBAN
            <Required />
          </label>
          <input className={inputClass} {...register("supplierIban")} />
          <FieldError message={errors.supplierIban?.message} />
        </div>
        <div>
          <label className={labelClass}>קוד סוויפט (SWIFT)</label>
          <input className={inputClass} {...register("supplierSwift")} />
        </div>
        <div>
          <label className={labelClass}>טלפון איש קשר בספק</label>
          <input className={inputClass} {...register("supplierContactPhone")} />
        </div>
        <div>
          <label className={labelClass}>מייל איש קשר בספק</label>
          <input
            type="email"
            className={inputClass}
            {...register("supplierContactEmail")}
          />
          <FieldError message={errors.supplierContactEmail?.message} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className={labelClass}>
            סכום החשבונית
            <Required />
          </label>
          <input
            type="number"
            step="0.01"
            className={inputClass}
            {...register("amount")}
          />
          <FieldError message={errors.amount?.message} />
        </div>
        <div>
          <label className={labelClass}>
            מטבע
            <Required />
          </label>
          <input
            placeholder="USD / EUR / ..."
            className={inputClass}
            {...register("currency")}
          />
          <FieldError message={errors.currency?.message} />
        </div>
        <div>
          <label className={labelClass}>
            תאריך החשבונית
            <Required />
          </label>
          <input
            type="date"
            className={inputClass}
            {...register("invoiceDate")}
          />
          <FieldError message={errors.invoiceDate?.message} />
        </div>
      </div>

      <div>
        <label className={labelClass}>
          קובץ החשבונית
          <Required />
        </label>
        <input
          type="file"
          className={inputClass}
          onChange={(e) =>
            setValue("file", e.target.files?.[0] ?? null, {
              shouldValidate: true,
            })
          }
        />
        <FieldError message={errors.file?.message as string | undefined} />
      </div>

      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-md bg-(--color-brand) text-white font-medium py-2.5 hover:bg-(--color-brand-dark) transition disabled:opacity-60"
      >
        {busy ? "שולח..." : "שליחת חשבונית"}
      </button>
    </form>
  );
}
