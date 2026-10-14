"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { resubmitCorrectedInvoice } from "@/lib/actions/invoices";
import { createClient } from "@/lib/supabase/client";
import { uploadEventFile } from "@/lib/storage/event-files";
import { Required } from "@/components/form-required-mark";
import { DateFieldDMY } from "@/components/date-field-dmy";
import { COUNTRIES_HE, COUNTRIES_EN } from "@/lib/data/countries";
import { PAYMENT_AMOUNT_CURRENCIES } from "@/lib/validation/invoice";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/config";

// Rep-side correction form for an invoice KKL marked "needs_correction"
// (see decideInvoice in lib/actions/invoices.ts). Unlike
// InvoiceBankEditPanel (bank details only, for Amiel's "returned_to_rep"),
// this allows a full edit -- amounts, currency and the invoice file itself
// -- since KKL can flag any kind of documentation problem, not just bank
// details. The file is the one optional field: leaving it empty keeps the
// existing upload.
export type InvoiceCorrectionDefaults = {
  supplierName: string;
  supplierField: string;
  supplierBeneficiaryName: string;
  supplierBankName: string;
  supplierBankAddress: string;
  supplierBankCountry: string;
  supplierIban: string;
  supplierSwift: string;
  supplierContactPhone: string;
  supplierContactEmail: string;
  amount: string;
  currency: string;
  paymentAmount: string;
  paymentAmountCurrency: "USD" | "EUR";
  ilsAmount: string;
  invoiceDate: string;
};

export function InvoiceCorrectionPanel({
  invoiceId,
  defaultValues,
  dict,
  locale,
}: {
  invoiceId: string;
  defaultValues: InvoiceCorrectionDefaults;
  dict: Dictionary;
  locale: Locale;
}) {
  const router = useRouter();
  const d = dict.invoiceForm;
  const countries = locale === "en" ? COUNTRIES_EN : COUNTRIES_HE;
  const [values, setValues] = useState(defaultValues);
  const [file, setFile] = useState<File | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const inputClass =
    "w-full rounded-md border border-black/15 bg-white px-3 py-2 text-sm focus:outline-2 focus:outline-(--color-brand)";
  const labelClass = "block text-xs font-medium mb-1";

  function set<K extends keyof typeof values>(key: K, v: string) {
    setValues((prev) => ({ ...prev, [key]: v }));
  }

  function isValid() {
    return (
      values.supplierName.trim() &&
      values.supplierBeneficiaryName.trim() &&
      values.supplierBankName.trim() &&
      values.supplierBankAddress.trim() &&
      values.supplierBankCountry.trim() &&
      values.supplierIban.trim() &&
      values.supplierSwift.trim() &&
      Number(values.amount) > 0 &&
      values.currency.trim() &&
      Number(values.paymentAmount) > 0 &&
      values.paymentAmountCurrency &&
      Number(values.ilsAmount) > 0 &&
      values.invoiceDate.trim()
    );
  }

  async function save() {
    setError(null);
    if (!isValid()) {
      setError(d.correctionErrorMessage);
      return;
    }
    setPending(true);
    try {
      let filePath: string | undefined;
      if (file) {
        const supabase = createClient();
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) {
          setError(d.errorNotLoggedIn);
          return;
        }
        filePath = await uploadEventFile(supabase, userData.user.id, file);
      }

      const result = await resubmitCorrectedInvoice({
        id: invoiceId,
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
      });
      if (result?.error) {
        setError(d.correctionErrorMessage);
        return;
      }
      setSaved(true);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : d.errorUploadFailed);
    } finally {
      setPending(false);
    }
  }

  if (saved) {
    return (
      <p className="text-sm text-(--color-accent-dark)">
        {d.correctionSuccessMessage}
      </p>
    );
  }

  return (
    <div className="space-y-3 rounded-md border border-black/10 bg-white p-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>
            {d.supplierNameLabel}
            <Required />
          </label>
          <input
            className={inputClass}
            value={values.supplierName}
            onChange={(e) => set("supplierName", e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass}>{d.supplierFieldLabel}</label>
          <input
            className={inputClass}
            value={values.supplierField}
            onChange={(e) => set("supplierField", e.target.value)}
          />
        </div>
      </div>

      <div className="rounded-lg bg-black/[0.02] p-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>
            {d.beneficiaryNameLabel}
            <Required />
          </label>
          <input
            className={inputClass}
            value={values.supplierBeneficiaryName}
            onChange={(e) => set("supplierBeneficiaryName", e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass}>
            {d.bankNameLabel}
            <Required />
          </label>
          <input
            className={inputClass}
            value={values.supplierBankName}
            onChange={(e) => set("supplierBankName", e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass}>
            {d.ibanLabel}
            <Required />
          </label>
          <input
            className={inputClass}
            value={values.supplierIban}
            onChange={(e) => set("supplierIban", e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass}>
            {d.swiftLabel}
            <Required />
          </label>
          <input
            className={inputClass}
            value={values.supplierSwift}
            onChange={(e) => set("supplierSwift", e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass}>
            {d.bankAddressLabel}
            <Required />
          </label>
          <input
            className={inputClass}
            value={values.supplierBankAddress}
            onChange={(e) => set("supplierBankAddress", e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass}>
            {d.bankCountryLabel}
            <Required />
          </label>
          <select
            className={inputClass}
            value={values.supplierBankCountry}
            onChange={(e) => set("supplierBankCountry", e.target.value)}
          >
            <option value="">{dict.register.selectCountry}</option>
            {countries.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>{d.contactPhoneLabel}</label>
          <input
            className={inputClass}
            value={values.supplierContactPhone}
            onChange={(e) => set("supplierContactPhone", e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass}>{d.contactEmailLabel}</label>
          <input
            type="email"
            className={inputClass}
            value={values.supplierContactEmail}
            onChange={(e) => set("supplierContactEmail", e.target.value)}
          />
        </div>
      </div>

      <div className="rounded-lg bg-black/[0.02] p-3 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>
              {d.amountLabel}
              <Required />
            </label>
            <input
              type="number"
              step="0.01"
              className={inputClass}
              value={values.amount}
              onChange={(e) => set("amount", e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>
              {d.currencyLabel}
              <Required />
            </label>
            <input
              placeholder="USD / EUR / ..."
              className={inputClass}
              value={values.currency}
              onChange={(e) => set("currency", e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>
              {d.paymentAmountLabel}
              <Required />
            </label>
            <input
              type="number"
              step="0.01"
              className={inputClass}
              value={values.paymentAmount}
              onChange={(e) => set("paymentAmount", e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>
              {d.paymentCurrencyLabel}
              <Required />
            </label>
            <select
              className={inputClass}
              value={values.paymentAmountCurrency}
              onChange={(e) =>
                set(
                  "paymentAmountCurrency",
                  e.target.value as InvoiceCorrectionDefaults["paymentAmountCurrency"]
                )
              }
            >
              {PAYMENT_AMOUNT_CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>
              {d.ilsAmountLabel}
              <Required />
            </label>
            <input
              type="number"
              step="0.01"
              className={inputClass}
              value={values.ilsAmount}
              onChange={(e) => set("ilsAmount", e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>
              {d.invoiceDateLabel}
              <Required />
            </label>
            <DateFieldDMY
              className={inputClass}
              value={values.invoiceDate}
              onChange={(iso) => set("invoiceDate", iso)}
            />
          </div>
        </div>
      </div>

      <div>
        <label className={labelClass}>{d.correctionFileLabel}</label>
        <input
          type="file"
          className={inputClass}
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <p className="text-xs text-black/50 mt-1">{d.correctionFileHint}</p>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}
      <button
        onClick={save}
        disabled={pending}
        className="rounded-md bg-(--color-brand) text-white text-sm font-medium px-4 py-2 hover:bg-(--color-brand-dark) transition disabled:opacity-60"
      >
        {pending ? dict.common.sending : d.correctionSubmitButton}
      </button>
    </div>
  );
}
