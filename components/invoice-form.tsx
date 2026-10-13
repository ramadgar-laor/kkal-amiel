"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  invoiceFormSchema,
  PAYMENT_AMOUNT_CURRENCIES,
  type InvoiceFormValues,
  type InvoiceInput,
} from "@/lib/validation/invoice";
import { submitInvoice } from "@/lib/actions/invoices";
import { createClient } from "@/lib/supabase/client";
import { uploadEventFile } from "@/lib/storage/event-files";
import { Required } from "@/components/form-required-mark";
import { COUNTRIES_HE, COUNTRIES_EN } from "@/lib/data/countries";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/config";
import {
  focusFirstInvalidField,
  scrollElementIntoView,
} from "@/lib/forms/scroll-to-error";

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

function t(template: string, values: Record<string, string | number> = {}) {
  return Object.entries(values).reduce(
    (acc, [key, value]) => acc.replaceAll(`{${key}}`, String(value)),
    template
  );
}

function FieldError({
  message,
  dict,
}: {
  message?: string;
  dict: Dictionary;
}) {
  if (!message) return null;
  const known: Record<string, string> = {
    required: dict.common.fieldErrors.required,
    must_be_positive: dict.common.fieldErrors.mustBePositive,
    invalid_email: dict.common.fieldErrors.invalidEmail,
    invalid_type: dict.common.fieldErrors.invalidType,
  };
  return (
    <p className={errorClass}>{known[message] ?? dict.common.fieldErrors.invalid}</p>
  );
}

export function InvoiceForm({
  eventId,
  suppliers,
  dict,
  locale,
}: {
  eventId: string;
  suppliers: InvoiceSupplierOption[];
  dict: Dictionary;
  locale: Locale;
}) {
  const router = useRouter();
  const d = dict.invoiceForm;
  const countries = locale === "en" ? COUNTRIES_EN : COUNTRIES_HE;
  const [serverError, setServerError] = useState<string | null>(null);
  const serverErrorRef = useRef<HTMLDivElement>(null);
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
    shouldFocusError: false,
    defaultValues: {
      eventId,
      supplierName: "",
      supplierField: "",
      supplierBankName: "",
      supplierBankAddress: "",
      supplierBankCountry: "",
      supplierIban: "",
      supplierSwift: "",
      supplierBeneficiaryName: "",
      supplierContactPhone: "",
      supplierContactEmail: "",
      amount: "",
      currency: "",
      paymentAmount: "",
      paymentAmountCurrency: "USD",
      ilsAmount: "",
      invoiceDate: "",
      file: null,
    },
  });

  useEffect(() => {
    if (serverError) scrollElementIntoView(serverErrorRef.current);
  }, [serverError]);

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
        setServerError(d.errorNotLoggedIn);
        return;
      }
      const uid = userData.user.id;

      const filePath = await uploadEventFile(supabase, uid, values.file as File);

      const payload: InvoiceInput = {
        eventId: values.eventId,
        supplierName: values.supplierName,
        supplierField: values.supplierField,
        supplierBankName: values.supplierBankName,
        supplierBankAddress: values.supplierBankAddress,
        supplierBankCountry: values.supplierBankCountry,
        supplierIban: values.supplierIban,
        supplierSwift: values.supplierSwift,
        supplierBeneficiaryName: values.supplierBeneficiaryName,
        supplierContactPhone: values.supplierContactPhone,
        supplierContactEmail: values.supplierContactEmail,
        amount: Number(values.amount),
        currency: values.currency,
        paymentAmount: Number(values.paymentAmount),
        paymentAmountCurrency: values.paymentAmountCurrency,
        ilsAmount: Number(values.ilsAmount),
        invoiceDate: values.invoiceDate,
        filePath,
      };

      const result = await submitInvoice(payload);
      if (result?.error) {
        setServerError(
          result.error === "invalid_input"
            ? dict.common.invalidFieldsNotice
            : t(d.errorSubmitFailed, { error: result.error })
        );
        return;
      }
      setSuccess(true);
      router.refresh();
    } catch (e) {
      setServerError(e instanceof Error ? e.message : d.errorUploadFailed);
    } finally {
      setUploading(false);
    }
  }

  const busy = isSubmitting || uploading;

  if (success) {
    return (
      <div className="rounded-xl border border-(--color-accent-dark)/30 bg-(--color-accent-light) p-4 text-sm text-(--color-accent-dark)">
        {d.successMessage}{" "}
        <button
          type="button"
          onClick={() => setSuccess(false)}
          className="underline font-medium"
        >
          {d.successAddAnother}
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit, focusFirstInvalidField)}
      className="space-y-5 rounded-xl border border-black/10 bg-white p-5"
    >
      <h3 className="font-semibold text-(--color-brand-dark)">{d.title}</h3>

      {serverError && (
        <div
          ref={serverErrorRef}
          className="rounded-md bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2"
        >
          {serverError}
        </div>
      )}

      {suppliers.length > 0 && (
        <div>
          <label className={labelClass}>{d.prefillLabel}</label>
          <select
            className={inputClass}
            value={prefillId}
            onChange={(e) => applyPrefill(e.target.value)}
          >
            <option value="">{d.prefillPlaceholder}</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
                {!s.bankDetailsKnown ? d.prefillBankUnknownSuffix : ""}
              </option>
            ))}
          </select>
          <p className={noteClass}>{d.prefillHint}</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>
            {d.supplierNameLabel}
            <Required />
          </label>
          <input className={inputClass} {...register("supplierName")} />
          <FieldError message={errors.supplierName?.message} dict={dict} />
        </div>
        <div>
          <label className={labelClass}>{d.supplierFieldLabel}</label>
          <input className={inputClass} {...register("supplierField")} />
        </div>
      </div>

      <div className="rounded-lg bg-black/[0.02] p-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>
            {d.beneficiaryNameLabel}
            <Required />
          </label>
          <input
            className={inputClass}
            {...register("supplierBeneficiaryName")}
          />
          <FieldError
            message={errors.supplierBeneficiaryName?.message}
            dict={dict}
          />
        </div>
        <div>
          <label className={labelClass}>
            {d.bankNameLabel}
            <Required />
          </label>
          <input className={inputClass} {...register("supplierBankName")} />
          <FieldError message={errors.supplierBankName?.message} dict={dict} />
        </div>
        <div>
          <label className={labelClass}>
            {d.ibanLabel}
            <Required />
          </label>
          <input className={inputClass} {...register("supplierIban")} />
          <FieldError message={errors.supplierIban?.message} dict={dict} />
        </div>
        <div>
          <label className={labelClass}>
            {d.swiftLabel}
            <Required />
          </label>
          <input className={inputClass} {...register("supplierSwift")} />
          <FieldError message={errors.supplierSwift?.message} dict={dict} />
        </div>
        <div>
          <label className={labelClass}>
            {d.bankAddressLabel}
            <Required />
          </label>
          <input
            className={inputClass}
            {...register("supplierBankAddress")}
          />
          <FieldError
            message={errors.supplierBankAddress?.message}
            dict={dict}
          />
        </div>
        <div>
          <label className={labelClass}>
            {d.bankCountryLabel}
            <Required />
          </label>
          <select className={inputClass} {...register("supplierBankCountry")}>
            <option value="">{dict.register.selectCountry}</option>
            {countries.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
          <FieldError
            message={errors.supplierBankCountry?.message}
            dict={dict}
          />
        </div>
        <div>
          <label className={labelClass}>{d.contactPhoneLabel}</label>
          <input className={inputClass} {...register("supplierContactPhone")} />
        </div>
        <div>
          <label className={labelClass}>{d.contactEmailLabel}</label>
          <input
            type="email"
            className={inputClass}
            {...register("supplierContactEmail")}
          />
          <FieldError
            message={errors.supplierContactEmail?.message}
            dict={dict}
          />
        </div>
      </div>

      <div className="rounded-lg bg-black/[0.02] p-3 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>
              {d.amountLabel}
              <Required />
            </label>
            <input
              type="number"
              step="0.01"
              className={inputClass}
              {...register("amount")}
            />
            <FieldError message={errors.amount?.message} dict={dict} />
          </div>
          <div>
            <label className={labelClass}>
              {d.currencyLabel}
              <Required />
            </label>
            <input
              placeholder="USD / EUR / ..."
              className={inputClass}
              {...register("currency")}
            />
            <FieldError message={errors.currency?.message} dict={dict} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>
              {d.paymentAmountLabel}
              <Required />
            </label>
            <input
              type="number"
              step="0.01"
              className={inputClass}
              {...register("paymentAmount")}
            />
            <FieldError message={errors.paymentAmount?.message} dict={dict} />
          </div>
          <div>
            <label className={labelClass}>
              {d.paymentCurrencyLabel}
              <Required />
            </label>
            <select
              className={inputClass}
              {...register("paymentAmountCurrency")}
            >
              {PAYMENT_AMOUNT_CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <FieldError
              message={errors.paymentAmountCurrency?.message}
              dict={dict}
            />
            <p className={noteClass}>{d.paymentCurrencyHint}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>
              {d.ilsAmountLabel}
              <Required />
            </label>
            <input
              type="number"
              step="0.01"
              className={inputClass}
              {...register("ilsAmount")}
            />
            <FieldError message={errors.ilsAmount?.message} dict={dict} />
          </div>
          <div>
            <label className={labelClass}>
              {d.invoiceDateLabel}
              <Required />
            </label>
            <input
              type="date"
              lang="en-GB"
              className={inputClass}
              {...register("invoiceDate")}
            />
            <FieldError message={errors.invoiceDate?.message} dict={dict} />
          </div>
        </div>
      </div>

      <div>
        <label className={labelClass}>
          {d.fileLabel}
          <Required />
        </label>
        <input
          type="file"
          name="file"
          className={inputClass}
          onChange={(e) =>
            setValue("file", e.target.files?.[0] ?? null, {
              shouldValidate: true,
            })
          }
        />
        <FieldError
          message={errors.file?.message as string | undefined}
          dict={dict}
        />
      </div>

      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-md bg-(--color-brand) text-white font-medium py-2.5 hover:bg-(--color-brand-dark) transition disabled:opacity-60"
      >
        {busy ? dict.common.sending : d.submitButton}
      </button>
    </form>
  );
}
