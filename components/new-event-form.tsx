"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  eventFormSchema,
  type EventFormValues,
  type EventInput,
} from "@/lib/validation/event";
import { createEvent } from "@/lib/actions/events";
import { createClient } from "@/lib/supabase/client";
import { uploadEventFile } from "@/lib/storage/event-files";
import { COUNTRIES_HE, COUNTRIES_EN } from "@/lib/data/countries";
import {
  focusFirstInvalidField,
  scrollElementIntoView,
} from "@/lib/forms/scroll-to-error";
import {
  KKAL_PRESENCE_OPTIONS,
  KKAL_PRESENCE_MIN_SELECTIONS,
} from "@/lib/data/kkal-presence";
import { Required } from "@/components/form-required-mark";
import { renderLiteMarkdown } from "@/lib/content/lite-markdown";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/config";

export type RepDefaults = {
  firstName: string;
  lastName: string;
  email: string;
  whatsappPhone: string;
  missionPhone: string;
  organization: string;
  city: string;
  country: string;
};

const inputClass =
  "w-full rounded-md border border-black/15 bg-white px-3 py-2 text-sm focus:outline-2 focus:outline-(--color-brand)";
const labelClass = "block text-sm font-medium mb-1";
const errorClass = "text-xs text-red-600 mt-1";
const noteClass = "text-xs text-black/50 mt-1";
const sectionClass = "space-y-4 border-t border-black/5 pt-6 first:border-t-0 first:pt-0";
const sectionTitleClass = "font-semibold text-(--color-brand-dark)";

// Fills {placeholder} tokens in a dictionary string with the given values.
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
    required_for_ongoing_track: dict.common.fieldErrors.requiredForOngoingTrack,
    must_be_positive: dict.common.fieldErrors.mustBePositive,
    must_be_positive_integer: dict.common.fieldErrors.mustBePositiveInteger,
    must_agree: dict.common.fieldErrors.mustAgree,
    min_selections: t(dict.common.fieldErrors.minSelections, {
      count: KKAL_PRESENCE_MIN_SELECTIONS,
    }),
    required_at_least_one: dict.common.fieldErrors.requiredAtLeastOne,
    end_before_start: dict.common.fieldErrors.endBeforeStart,
    invalid_email: dict.common.fieldErrors.invalidEmail,
    invalid_type: dict.common.fieldErrors.invalidType,
  };
  return (
    <p className={errorClass}>{known[message] ?? dict.common.fieldErrors.invalid}</p>
  );
}

function YesNo({
  name,
  label,
  note,
  register,
  error,
  dict,
}: {
  name: "registeredToProgram" | "inWhatsappGroup";
  label: React.ReactNode;
  note?: string;
  register: ReturnType<typeof useForm<EventFormValues>>["register"];
  error?: string;
  dict: Dictionary;
}) {
  return (
    <div>
      <label className={labelClass}>
        {label}
        <Required />
      </label>
      {note && <p className={noteClass}>{note}</p>}
      <div className="flex gap-6 mt-1.5">
        <label className="flex items-center gap-1.5 text-sm">
          <input type="radio" value="yes" {...register(name)} /> {dict.common.yes}
        </label>
        <label className="flex items-center gap-1.5 text-sm">
          <input type="radio" value="no" {...register(name)} /> {dict.common.no}
        </label>
      </div>
      <FieldError message={error} dict={dict} />
    </div>
  );
}

function Consent({
  name,
  text,
  register,
  error,
  dict,
}: {
  name:
    | "consentNoCommitment"
    | "consentCommitteeReview"
    | "consentFollowBranding"
    | "consentExchangeRate"
    | "consentBankFees"
    | "consentFollowupPhotos";
  text: string;
  register: ReturnType<typeof useForm<EventFormValues>>["register"];
  error?: string;
  dict: Dictionary;
}) {
  return (
    <div className="rounded-lg border border-black/10 bg-black/[0.02] p-4">
      <label className={labelClass}>
        {text}
        <Required />
      </label>
      <div className="flex gap-6 mt-1.5">
        <label className="flex items-center gap-1.5 text-sm">
          <input type="radio" value="yes" {...register(name)} /> {dict.common.yes}
        </label>
        <label className="flex items-center gap-1.5 text-sm">
          <input type="radio" value="no" {...register(name)} /> {dict.common.no}
        </label>
      </div>
      <FieldError message={error} dict={dict} />
    </div>
  );
}

export function NewEventForm({
  repDefaults,
  introMarkdown,
  dict,
  locale,
}: {
  repDefaults: RepDefaults;
  // The form's "preceding text" block, editable by an admin via
  // /admin/settings without a code change (lib/content/settings-defs.ts).
  introMarkdown: string;
  dict: Dictionary;
  locale: Locale;
}) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const serverErrorRef = useRef<HTMLDivElement>(null);
  const [uploading, setUploading] = useState(false);
  const d = dict.newEvent;
  const countries = locale === "en" ? COUNTRIES_EN : COUNTRIES_HE;
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    control,
    formState: { errors, isSubmitting },
  } = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    // We drive focus-on-error ourselves (see focusFirstInvalidField below)
    // so it reliably scrolls long sections (budget lines, suppliers) into
    // view — not just .focus(), which a collapsed/off-screen field can
    // make look like nothing happened.
    shouldFocusError: false,
    defaultValues: {
      orgAffiliation: repDefaults.organization || "",
      registeredToProgram: undefined,
      inWhatsappGroup: undefined,
      name: "",
      startDate: "",
      endDate: "",
      city: repDefaults.city || "",
      country: repDefaults.country || "",
      hostOrgName: "",
      hostManagerName: "",
      hostManagerPhone: "",
      hostManagerEmail: "",
      targetAudience: "",
      participantsCount: "",
      programDescription: "",
      track: "one_time",
      ongoingProgramDescription: "",
      requestedAmount: "",
      transferAmountNote: "",
      budgetItems: [
        { description: "", localAmount: "", currency: "", exchangeRate: "" },
      ],
      suppliers: [
        {
          name: "",
          field: "",
          bankDetailsKnown: "no",
          beneficiaryName: "",
          beneficiaryAddress: "",
          bankName: "",
          bankAddress: "",
          accountNumber: "",
          achRoutingNumber: "",
          swiftNumber: "",
        },
      ],
      quote1: { file: null, contactPhone: "", contactEmail: "" },
      quote2: { file: null, contactPhone: "", contactEmail: "" },
      quote3: { file: null, contactPhone: "", contactEmail: "" },
      kkalPresenceSelections: [],
      notes: "",
    },
  });

  useEffect(() => {
    if (serverError) scrollElementIntoView(serverErrorRef.current);
  }, [serverError]);

  const track = watch("track");
  const startDate = watch("startDate");
  const selections = watch("kkalPresenceSelections") || [];

  const budgetItemsArray = useFieldArray({ control, name: "budgetItems" });
  const watchedBudgetItems = watch("budgetItems") || [];
  const budgetItemsTotalIls = watchedBudgetItems.reduce((sum, item) => {
    const local = Number(item.localAmount);
    const rate = Number(item.exchangeRate);
    return sum + (Number.isFinite(local) && Number.isFinite(rate) ? local * rate : 0);
  }, 0);

  const suppliersArray = useFieldArray({ control, name: "suppliers" });
  const watchedSuppliers = watch("suppliers") || [];

  const budgetItemsErr = errors.budgetItems as
    | { message?: string; root?: { message?: string } }
    | undefined;
  const budgetItemsRootError =
    budgetItemsErr?.root?.message ?? budgetItemsErr?.message;
  const suppliersErr = errors.suppliers as
    | { message?: string; root?: { message?: string } }
    | undefined;
  const suppliersRootError = suppliersErr?.root?.message ?? suppliersErr?.message;

  function toggleSelection(key: string) {
    const current = getValues("kkalPresenceSelections") || [];
    const next = current.includes(key)
      ? current.filter((k) => k !== key)
      : [...current, key];
    setValue("kkalPresenceSelections", next, { shouldValidate: true });
  }

  async function onSubmit(values: EventFormValues) {
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

      const [quote1Path, quote2Path, quote3Path] = await Promise.all([
        uploadEventFile(supabase, uid, values.quote1.file as File),
        values.quote2.file
          ? uploadEventFile(supabase, uid, values.quote2.file)
          : Promise.resolve(""),
        values.quote3.file
          ? uploadEventFile(supabase, uid, values.quote3.file)
          : Promise.resolve(""),
      ]);

      const payload: EventInput = {
        orgAffiliation: values.orgAffiliation,
        registeredToProgram: values.registeredToProgram,
        inWhatsappGroup: values.inWhatsappGroup,
        name: values.name,
        startDate: values.startDate,
        endDate: values.endDate,
        city: values.city,
        country: values.country,
        hostOrgName: values.hostOrgName,
        hostManagerName: values.hostManagerName,
        hostManagerPhone: values.hostManagerPhone,
        hostManagerEmail: values.hostManagerEmail,
        targetAudience: values.targetAudience,
        participantsCount: Number(values.participantsCount),
        programDescription: values.programDescription,
        track: values.track,
        ongoingProgramDescription: values.ongoingProgramDescription,
        requestedAmount: Number(values.requestedAmount),
        transferAmountNote: values.transferAmountNote,
        budgetItems: values.budgetItems.map((item) => ({
          description: item.description,
          localAmount: Number(item.localAmount),
          currency: item.currency,
          exchangeRate: Number(item.exchangeRate),
        })),
        suppliers: values.suppliers,
        quote1: {
          filePath: quote1Path,
          contactPhone: values.quote1.contactPhone,
          contactEmail: values.quote1.contactEmail,
        },
        quote2: {
          filePath: quote2Path || undefined,
          contactPhone: values.quote2.contactPhone || undefined,
          contactEmail: values.quote2.contactEmail || undefined,
        },
        quote3: {
          filePath: quote3Path || undefined,
          contactPhone: values.quote3.contactPhone || undefined,
          contactEmail: values.quote3.contactEmail || undefined,
        },
        kkalPresenceSelections: values.kkalPresenceSelections,
        consentNoCommitment: values.consentNoCommitment,
        consentCommitteeReview: values.consentCommitteeReview,
        consentFollowBranding: values.consentFollowBranding,
        consentExchangeRate: values.consentExchangeRate,
        consentBankFees: values.consentBankFees,
        consentFollowupPhotos: values.consentFollowupPhotos,
        notes: values.notes,
      };

      const result = await createEvent(payload);
      if (result?.error) {
        setServerError(
          result.error === "invalid_input"
            ? d.errorInvalidFields
            : t(d.errorSubmitFailed, { error: result.error })
        );
        return;
      }
      router.push("/rep");
      router.refresh();
    } catch (e) {
      setServerError(e instanceof Error ? e.message : d.errorUploadFailed);
    } finally {
      setUploading(false);
    }
  }

  const busy = isSubmitting || uploading;

  return (
    <form
      onSubmit={handleSubmit(onSubmit, focusFirstInvalidField)}
      className="space-y-8"
    >
      {serverError && (
        <div
          ref={serverErrorRef}
          className="rounded-md bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2"
        >
          {serverError}
        </div>
      )}

      <p className="text-xs text-black/60">
        <span className="text-red-600">*</span> {d.requiredNote}
      </p>

      {/* Editable by an admin via /admin/settings (lib/content/settings-defs.ts
          -> new_event_intro_he / new_event_intro_en) -- originally verbatim
          intro text from the real KKL event-budget-request form. */}
      <div className="rounded-lg border border-(--color-brand)/20 bg-(--color-brand-light) p-5 text-sm leading-relaxed space-y-3">
        {renderLiteMarkdown(introMarkdown)}
      </div>

      {/* Ambassador / affiliation confirmation */}
      <section className={sectionClass}>
        <h2 className={sectionTitleClass}>{d.sectionYourDetails}</h2>
        <p className="text-xs text-black/50">{d.sectionYourDetailsNote}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-sm bg-black/[0.02] rounded-lg p-4">
          <div>
            <span className="text-black/50">{d.nameLabel} </span>
            {repDefaults.firstName} {repDefaults.lastName}
          </div>
          <div>
            <span className="text-black/50">{d.emailLabel} </span>
            {repDefaults.email || "—"}
          </div>
          <div>
            <span className="text-black/50">{d.localPhoneLabel} </span>
            {repDefaults.missionPhone || "—"}
          </div>
          <div>
            <span className="text-black/50">{d.whatsappLabel} </span>
            {repDefaults.whatsappPhone || "—"}
          </div>
        </div>

        <div>
          <label className={labelClass}>
            {d.orgAffiliationLabel}
            <Required />
          </label>
          <p className={noteClass}>{d.orgAffiliationNote}</p>
          <input className={inputClass} {...register("orgAffiliation")} />
          <FieldError message={errors.orgAffiliation?.message} dict={dict} />
        </div>

        <YesNo
          name="registeredToProgram"
          label={d.registeredToProgramLabel}
          register={register}
          error={errors.registeredToProgram?.message}
          dict={dict}
        />
        <YesNo
          name="inWhatsappGroup"
          label={d.inWhatsappGroupLabel}
          note={d.inWhatsappGroupNote}
          register={register}
          error={errors.inWhatsappGroup?.message}
          dict={dict}
        />
      </section>

      {/* Event basics */}
      <section className={sectionClass}>
        <h2 className={sectionTitleClass}>{d.sectionEventDetails}</h2>

        <div>
          <label className={labelClass}>
            {d.eventNameLabel}
            <Required />
          </label>
          <p className={noteClass}>{d.eventNameNote}</p>
          <input className={inputClass} {...register("name")} />
          <FieldError message={errors.name?.message} dict={dict} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>
              {d.startDateLabel}
              <Required />
            </label>
            <p className={noteClass}>{d.startDateNote}</p>
            <input
              type="date"
              lang="en-GB"
              className={inputClass}
              {...register("startDate", {
                onChange: (e) => {
                  setValue("endDate", e.target.value, { shouldValidate: true });
                },
              })}
            />
            <FieldError message={errors.startDate?.message} dict={dict} />
          </div>
          <div>
            <label className={labelClass}>
              {d.endDateLabel}
              <Required />
            </label>
            <input
              type="date"
              lang="en-GB"
              min={startDate || undefined}
              className={inputClass}
              {...register("endDate")}
            />
            <FieldError message={errors.endDate?.message} dict={dict} />
          </div>
          <div>
            <label className={labelClass}>{d.cityLabel}</label>
            <input className={inputClass} {...register("city")} />
          </div>
          <div>
            <label className={labelClass}>
              {d.countryLabel}
              <Required />
            </label>
            <select className={inputClass} {...register("country")}>
              <option value="">{dict.register.selectCountry}</option>
              {countries.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
            <FieldError message={errors.country?.message} dict={dict} />
          </div>
        </div>

        <div>
          <label className={labelClass}>
            {d.hostOrgNameLabel}
            <Required />
          </label>
          <input className={inputClass} {...register("hostOrgName")} />
          <FieldError message={errors.hostOrgName?.message} dict={dict} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>
              {d.hostManagerNameLabel}
              <Required />
            </label>
            <input className={inputClass} {...register("hostManagerName")} />
            <FieldError message={errors.hostManagerName?.message} dict={dict} />
          </div>
          <div>
            <label className={labelClass}>
              {d.hostManagerPhoneLabel}
              <Required />
            </label>
            <input className={inputClass} {...register("hostManagerPhone")} />
            <FieldError message={errors.hostManagerPhone?.message} dict={dict} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>
              {d.hostManagerEmailLabel}
              <Required />
            </label>
            <input
              type="email"
              className={inputClass}
              {...register("hostManagerEmail")}
            />
            <FieldError message={errors.hostManagerEmail?.message} dict={dict} />
          </div>
        </div>

        <div>
          <label className={labelClass}>
            {d.targetAudienceLabel}
            <Required />
          </label>
          <input className={inputClass} {...register("targetAudience")} />
          <FieldError message={errors.targetAudience?.message} dict={dict} />
        </div>

        <div>
          <label className={labelClass}>
            {d.participantsCountLabel}
            <Required />
          </label>
          <input
            type="number"
            min={1}
            className={inputClass}
            {...register("participantsCount")}
          />
          <FieldError message={errors.participantsCount?.message} dict={dict} />
        </div>

        <div>
          <label className={labelClass}>
            {d.programDescriptionLabel}
            <Required />
          </label>
          <textarea
            className={inputClass}
            rows={3}
            {...register("programDescription")}
          />
          <FieldError message={errors.programDescription?.message} dict={dict} />
        </div>

        <div>
          <label className={labelClass}>
            {d.trackQuestionLabel}
            <Required />
          </label>
          <div className="space-y-2 mt-1.5">
            <label className="flex items-start gap-2 text-sm rounded-lg border border-black/10 p-3">
              <input
                type="radio"
                value="one_time"
                className="mt-0.5"
                {...register("track")}
              />
              <span>{d.trackOneTimeLabel}</span>
            </label>
            <label className="flex items-start gap-2 text-sm rounded-lg border border-black/10 p-3">
              <input
                type="radio"
                value="ongoing"
                className="mt-0.5"
                {...register("track")}
              />
              <span>{d.trackOngoingLabel}</span>
            </label>
          </div>
        </div>

        {track === "ongoing" && (
          <div>
            <label className={labelClass}>
              {d.ongoingDescriptionLabel}
              <Required />
            </label>
            <textarea
              className={inputClass}
              rows={6}
              {...register("ongoingProgramDescription")}
            />
            <FieldError
              message={errors.ongoingProgramDescription?.message}
              dict={dict}
            />
          </div>
        )}
      </section>

      {/* Budget */}
      <section className={sectionClass}>
        <h2 className={sectionTitleClass}>{d.sectionBudget}</h2>

        <div>
          <label className={labelClass}>
            {d.requestedAmountLabel}
            <Required />
          </label>
          <input
            type="number"
            step="0.01"
            className={inputClass}
            {...register("requestedAmount")}
          />
          <FieldError message={errors.requestedAmount?.message} dict={dict} />
        </div>

        <div>
          <label className={labelClass}>
            {d.transferAmountNoteLabel}
            <Required />
          </label>
          <p className={noteClass}>{d.transferAmountNoteHint}</p>
          <input className={inputClass} {...register("transferAmountNote")} />
          <FieldError message={errors.transferAmountNote?.message} dict={dict} />
        </div>

        <div data-field-name="budgetItems">
          <div className="flex items-center justify-between">
            <label className={labelClass}>
              {d.budgetItemsLabel}
              <Required />
            </label>
            <button
              type="button"
              onClick={() =>
                budgetItemsArray.append({
                  description: "",
                  localAmount: "",
                  currency: "",
                  exchangeRate: "",
                })
              }
              className="text-xs text-(--color-brand) underline shrink-0"
            >
              {d.addBudgetItemButton}
            </button>
          </div>
          <p className={noteClass}>{d.budgetItemsHint}</p>
          <FieldError message={budgetItemsRootError} dict={dict} />

          <div className="space-y-3 mt-2">
            {budgetItemsArray.fields.map((field, index) => {
              const itemErrors = errors.budgetItems?.[index];
              const local = Number(watchedBudgetItems[index]?.localAmount);
              const rate = Number(watchedBudgetItems[index]?.exchangeRate);
              const amountIls =
                Number.isFinite(local) && Number.isFinite(rate)
                  ? (local * rate).toLocaleString(
                      locale === "en" ? "en-US" : "he-IL",
                      { maximumFractionDigits: 2 }
                    )
                  : "—";
              return (
                <div
                  key={field.id}
                  className="rounded-lg border border-black/10 p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-sm">
                      {t(d.budgetItemTitle, { n: index + 1 })}
                    </div>
                    {budgetItemsArray.fields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => budgetItemsArray.remove(index)}
                        className="text-xs text-red-600 underline"
                      >
                        {dict.common.remove}
                      </button>
                    )}
                  </div>
                  <div>
                    <label className={labelClass}>
                      {d.budgetDescriptionLabel}
                      <Required />
                    </label>
                    <input
                      className={inputClass}
                      {...register(`budgetItems.${index}.description`)}
                    />
                    <FieldError
                      message={itemErrors?.description?.message}
                      dict={dict}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className={labelClass}>
                        {d.budgetLocalAmountLabel}
                        <Required />
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        className={inputClass}
                        {...register(`budgetItems.${index}.localAmount`)}
                      />
                      <FieldError
                        message={itemErrors?.localAmount?.message}
                        dict={dict}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>
                        {d.budgetCurrencyLabel}
                        <Required />
                      </label>
                      <input
                        placeholder="USD / EUR / ..."
                        className={inputClass}
                        {...register(`budgetItems.${index}.currency`)}
                      />
                      <FieldError
                        message={itemErrors?.currency?.message}
                        dict={dict}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>
                        {d.budgetExchangeRateLabel}
                        <Required />
                      </label>
                      <input
                        type="number"
                        step="0.0001"
                        className={inputClass}
                        {...register(`budgetItems.${index}.exchangeRate`)}
                      />
                      <FieldError
                        message={itemErrors?.exchangeRate?.message}
                        dict={dict}
                      />
                    </div>
                  </div>
                  <div className="text-xs text-black/50">
                    {d.budgetIlsAmountLabel}{" "}
                    <span className="font-medium">{amountIls}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between rounded-lg bg-black/[0.03] px-4 py-2.5 text-sm font-medium">
            <span>{d.budgetTotalLabel}</span>
            <span>
              {budgetItemsTotalIls.toLocaleString(
                locale === "en" ? "en-US" : "he-IL",
                { maximumFractionDigits: 2 }
              )}
            </span>
          </div>
        </div>
      </section>

      {/* Suppliers */}
      <section className={sectionClass} data-field-name="suppliers">
        <div className="flex items-center justify-between">
          <h2 className={sectionTitleClass}>{d.sectionSuppliers}</h2>
          <button
            type="button"
            onClick={() =>
              suppliersArray.append({
                name: "",
                field: "",
                bankDetailsKnown: "no",
                beneficiaryName: "",
                beneficiaryAddress: "",
                bankName: "",
                bankAddress: "",
                accountNumber: "",
                achRoutingNumber: "",
                swiftNumber: "",
              })
            }
            className="text-xs text-(--color-brand) underline shrink-0"
          >
            {d.addSupplierButton}
          </button>
        </div>
        <p className="text-xs text-black/50">{d.suppliersHint}</p>
        <FieldError message={suppliersRootError} dict={dict} />

        <div className="space-y-4">
          {suppliersArray.fields.map((field, index) => {
            const supplierErrors = errors.suppliers?.[index];
            const bankKnown = watchedSuppliers[index]?.bankDetailsKnown;
            return (
              <div
                key={field.id}
                className="rounded-lg border border-black/10 p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="font-medium text-sm">
                    {t(d.supplierTitle, { n: index + 1 })}
                  </div>
                  {suppliersArray.fields.length > 1 && (
                    <button
                      type="button"
                      onClick={() => suppliersArray.remove(index)}
                      className="text-xs text-red-600 underline"
                    >
                      {dict.common.remove}
                    </button>
                  )}
                </div>

                <div>
                  <label className={labelClass}>
                    {d.supplierNameLabel}
                    <Required />
                  </label>
                  <input
                    className={inputClass}
                    {...register(`suppliers.${index}.name`)}
                  />
                  <FieldError message={supplierErrors?.name?.message} dict={dict} />
                </div>

                <div>
                  <label className={labelClass}>
                    {d.supplierFieldLabel}
                    <Required />
                  </label>
                  <input
                    className={inputClass}
                    {...register(`suppliers.${index}.field`)}
                  />
                  <FieldError message={supplierErrors?.field?.message} dict={dict} />
                </div>

                <div>
                  <label className={labelClass}>
                    {d.bankKnownQuestionLabel}
                    <Required />
                  </label>
                  <p className={noteClass}>{d.bankKnownHint}</p>
                  <div className="flex gap-6 mt-1.5">
                    <label className="flex items-center gap-1.5 text-sm">
                      <input
                        type="radio"
                        value="yes"
                        {...register(`suppliers.${index}.bankDetailsKnown`)}
                      />{" "}
                      {d.bankKnownYesLabel}
                    </label>
                    <label className="flex items-center gap-1.5 text-sm">
                      <input
                        type="radio"
                        value="no"
                        {...register(`suppliers.${index}.bankDetailsKnown`)}
                      />{" "}
                      {d.bankKnownNoLabel}
                    </label>
                  </div>
                </div>

                {bankKnown === "yes" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-lg bg-black/[0.02] p-3">
                    <div>
                      <label className={labelClass}>
                        {d.beneficiaryNameLabel}
                        <Required />
                      </label>
                      <input
                        className={inputClass}
                        {...register(`suppliers.${index}.beneficiaryName`)}
                      />
                      <FieldError
                        message={supplierErrors?.beneficiaryName?.message}
                        dict={dict}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>
                        {d.beneficiaryAddressLabel}
                        <Required />
                      </label>
                      <input
                        className={inputClass}
                        {...register(`suppliers.${index}.beneficiaryAddress`)}
                      />
                      <FieldError
                        message={supplierErrors?.beneficiaryAddress?.message}
                        dict={dict}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>
                        {d.bankNameLabel}
                        <Required />
                      </label>
                      <input
                        className={inputClass}
                        {...register(`suppliers.${index}.bankName`)}
                      />
                      <FieldError
                        message={supplierErrors?.bankName?.message}
                        dict={dict}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>
                        {d.bankAddressLabel}
                        <Required />
                      </label>
                      <input
                        className={inputClass}
                        {...register(`suppliers.${index}.bankAddress`)}
                      />
                      <FieldError
                        message={supplierErrors?.bankAddress?.message}
                        dict={dict}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>
                        {d.accountNumberLabel}
                        <Required />
                      </label>
                      <input
                        className={inputClass}
                        {...register(`suppliers.${index}.accountNumber`)}
                      />
                      <FieldError
                        message={supplierErrors?.accountNumber?.message}
                        dict={dict}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>
                        {d.swiftLabel}
                        <Required />
                      </label>
                      <input
                        className={inputClass}
                        {...register(`suppliers.${index}.swiftNumber`)}
                      />
                      <FieldError
                        message={supplierErrors?.swiftNumber?.message}
                        dict={dict}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className={labelClass}>{d.achRoutingLabel}</label>
                      <input
                        className={inputClass}
                        {...register(`suppliers.${index}.achRoutingNumber`)}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Quotes */}
      <section className={sectionClass}>
        <h2 className={sectionTitleClass}>{d.sectionQuotes}</h2>
        <p className="text-xs text-black/50">{d.quotesHint}</p>

        {(["quote1", "quote2", "quote3"] as const).map((key, i) => {
          const required = key === "quote1";
          return (
            <div key={key} className="rounded-lg border border-black/10 p-4 space-y-3">
              <div className="font-medium text-sm">
                {t(d.quoteTitle, { n: i + 1 })}
                {required && <Required />}
              </div>
              <div>
                <label className={labelClass}>{d.quoteFileLabel}</label>
                <input
                  type="file"
                  name={`${key}.file`}
                  className={inputClass}
                  onChange={(e) =>
                    setValue(
                      `${key}.file`,
                      e.target.files?.[0] ?? null,
                      { shouldValidate: true }
                    )
                  }
                />
                <FieldError
                  message={errors[key]?.file?.message as string | undefined}
                  dict={dict}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>
                    {d.quoteContactPhoneLabel}
                    {required && <Required />}
                  </label>
                  <input
                    className={inputClass}
                    {...register(`${key}.contactPhone`)}
                  />
                  <FieldError
                    message={errors[key]?.contactPhone?.message as string | undefined}
                    dict={dict}
                  />
                </div>
                <div>
                  <label className={labelClass}>
                    {d.quoteContactEmailLabel}
                    {required && <Required />}
                  </label>
                  <input
                    type="email"
                    className={inputClass}
                    {...register(`${key}.contactEmail`)}
                  />
                  <FieldError
                    message={errors[key]?.contactEmail?.message as string | undefined}
                    dict={dict}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </section>

      {/* KKL presence checklist */}
      <section className={sectionClass}>
        <h2 className={sectionTitleClass}>{d.sectionKkalPresence}</h2>
        <p className="text-xs text-black/70">
          {t(d.kkalPresenceHintBefore, { count: KKAL_PRESENCE_MIN_SELECTIONS })}{" "}
          <a
            href="https://drive.google.com/drive/folders/126xcSqgRTlnpc9oJujss1rRq5WeCOD2H?usp=sharing"
            target="_blank"
            rel="noreferrer"
            className="text-(--color-brand) underline"
          >
            {d.kkalPresenceLinkLabel}
          </a>
        </p>
        <p className="text-xs">
          {t(d.kkalPresenceCounter, {
            selected: selections.length,
            min: KKAL_PRESENCE_MIN_SELECTIONS,
          })}
        </p>
        <div className="space-y-2" data-field-name="kkalPresenceSelections">
          {KKAL_PRESENCE_OPTIONS.map((opt) => (
            <label
              key={opt.key}
              className="flex items-start gap-2 text-sm rounded-lg border border-black/10 p-3 hover:bg-black/[0.015]"
            >
              <input
                type="checkbox"
                className="mt-0.5"
                checked={selections.includes(opt.key)}
                onChange={() => toggleSelection(opt.key)}
              />
              <span>{locale === "en" ? opt.labelEn : opt.label}</span>
            </label>
          ))}
        </div>
        <FieldError message={errors.kkalPresenceSelections?.message} dict={dict} />
      </section>

      {/* Consents */}
      <section className={sectionClass}>
        <h2 className={sectionTitleClass}>{d.sectionConsents}</h2>
        <Consent
          name="consentNoCommitment"
          text={d.consentNoCommitment}
          register={register}
          error={errors.consentNoCommitment?.message}
          dict={dict}
        />
        <Consent
          name="consentCommitteeReview"
          text={d.consentCommitteeReview}
          register={register}
          error={errors.consentCommitteeReview?.message}
          dict={dict}
        />
        <Consent
          name="consentFollowBranding"
          text={d.consentFollowBranding}
          register={register}
          error={errors.consentFollowBranding?.message}
          dict={dict}
        />
        <Consent
          name="consentExchangeRate"
          text={d.consentExchangeRate}
          register={register}
          error={errors.consentExchangeRate?.message}
          dict={dict}
        />
        <Consent
          name="consentBankFees"
          text={d.consentBankFees}
          register={register}
          error={errors.consentBankFees?.message}
          dict={dict}
        />
        <Consent
          name="consentFollowupPhotos"
          text={d.consentFollowupPhotos}
          register={register}
          error={errors.consentFollowupPhotos?.message}
          dict={dict}
        />
      </section>

      <section className={sectionClass}>
        <div>
          <label className={labelClass}>{d.notesLabel}</label>
          <textarea className={inputClass} rows={3} {...register("notes")} />
        </div>
      </section>

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
