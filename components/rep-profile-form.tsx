"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef, useState } from "react";
import {
  repProfileSchema,
  type RepProfileInput,
} from "@/lib/validation/rep-profile";
import { MARITAL_STATUSES } from "@/lib/validation/rep-registration";
import {
  SENDING_ORGANIZATIONS,
  INSTITUTION_TYPES,
  OTHER_OPTION,
} from "@/lib/data/kkal-reps-options";
import { COUNTRIES_HE, COUNTRIES_EN } from "@/lib/data/countries";
import { US_COUNTRY_CODE, usStatesFor } from "@/lib/data/us-states";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/config";
import { Required } from "@/components/form-required-mark";
import { DateFieldDMY } from "@/components/date-field-dmy";
import { updateMyRepDetails } from "@/lib/actions/profile";
import {
  focusFirstInvalidField,
  scrollElementIntoView,
} from "@/lib/forms/scroll-to-error";

// The ambassador's own edit form on /profile: the same fields, labels and
// option lists as the registration form (components/register-form.tsx),
// minus what can't change (email, date of birth, participation level,
// registration notes).

export type RepProfileRow = {
  first_name_he: string | null;
  last_name_he: string | null;
  first_name_local: string | null;
  last_name_local: string | null;
  whatsapp_phone: string | null;
  mission_phone: string | null;
  marital_status: string | null;
  mailing_institution: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  country: string | null;
  organization: string | null;
  mission_location_name: string | null;
  institution_type: string | null;
  institution_city: string | null;
  main_role: string | null;
  mission_start_date: string | null;
  mission_end_date_expected: string | null;
};

// Stored values are already resolved (e.g. a free-text organization when
// "Other" was picked), so map them back onto the select + "other" text.
function splitOther(
  value: string | null,
  options: readonly string[]
): [string, string] {
  if (!value) return ["", ""];
  if (options.includes(value)) return [value, ""];
  return [OTHER_OPTION, value];
}

function toInput(rep: RepProfileRow): RepProfileInput {
  const [organization, organizationOther] = splitOther(
    rep.organization,
    SENDING_ORGANIZATIONS
  );
  const [institutionType, institutionTypeOther] = splitOther(
    rep.institution_type,
    INSTITUTION_TYPES
  );
  const fixedMarital = MARITAL_STATUSES.filter((m) => m !== "other");
  const marital = rep.marital_status ?? "";
  const maritalIsFixed = (fixedMarital as readonly string[]).includes(marital);

  return {
    firstNameHe: rep.first_name_he ?? "",
    lastNameHe: rep.last_name_he ?? "",
    firstNameLocal: rep.first_name_local ?? "",
    lastNameLocal: rep.last_name_local ?? "",
    whatsappPhone: rep.whatsapp_phone ?? "",
    missionPhone: rep.mission_phone ?? "",
    maritalStatus: (marital
      ? maritalIsFixed
        ? marital
        : "other"
      : "") as RepProfileInput["maritalStatus"],
    maritalStatusOther: marital && !maritalIsFixed ? marital : "",
    mailingInstitution: rep.mailing_institution ?? "",
    address: rep.address ?? "",
    city: rep.city ?? "",
    state: rep.state ?? "",
    zip: rep.zip ?? "",
    country: rep.country ?? "",
    organization,
    organizationOther,
    missionLocationName: rep.mission_location_name ?? "",
    institutionType,
    institutionTypeOther,
    institutionCity: rep.institution_city ?? "",
    mainRole: rep.main_role ?? "",
    missionStartDate: rep.mission_start_date ?? "",
    missionEndDateExpected: rep.mission_end_date_expected ?? "",
  };
}

const inputClass =
  "w-full rounded-md border border-black/15 bg-white px-3 py-2 text-sm focus:outline-2 focus:outline-(--color-brand)";
const labelClass = "block text-sm font-medium mb-1";
const noteClass = "text-xs text-black/50 mb-1.5";
const errorClass = "text-xs text-red-600 mt-1";
const sectionClass =
  "rounded-xl bg-white border border-black/5 shadow-sm p-5 space-y-4";
const sectionTitleClass = "font-semibold text-(--color-brand-dark)";

export function RepProfileForm({
  dict,
  locale,
  rep,
}: {
  dict: Dictionary;
  locale: Locale;
  rep: RepProfileRow;
}) {
  const r = dict.register;
  const d = dict.profile;
  const [serverError, setServerError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const feedbackRef = useRef<HTMLDivElement>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting, isDirty },
    reset,
  } = useForm<RepProfileInput>({
    resolver: zodResolver(repProfileSchema),
    shouldFocusError: false,
    defaultValues: toInput(rep),
  });

  useEffect(() => {
    if (serverError || saved) scrollElementIntoView(feedbackRef.current);
  }, [serverError, saved]);

  const maritalStatus = watch("maritalStatus");
  const organization = watch("organization");
  const institutionType = watch("institutionType");
  const country = watch("country");

  async function onSubmit(values: RepProfileInput) {
    setServerError(null);
    setSaved(false);
    const res = await updateMyRepDetails(values);
    if ("error" in res) {
      setServerError(d.saveError);
      return;
    }
    reset(values);
    setSaved(true);
  }

  const req = <p className={errorClass}>{dict.common.required}</p>;

  return (
    <form
      onSubmit={handleSubmit(onSubmit, (errs) => {
        setSaved(false);
        focusFirstInvalidField(errs);
      })}
      className="space-y-6"
      noValidate
    >
      <section className={sectionClass}>
        <h2 className={sectionTitleClass}>{r.sectionPersonal}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>
              {r.firstNameHe}
              <Required />
            </label>
            <input className={inputClass} {...register("firstNameHe")} />
            {errors.firstNameHe && req}
          </div>
          <div>
            <label className={labelClass}>
              {r.lastNameHe}
              <Required />
            </label>
            <input className={inputClass} {...register("lastNameHe")} />
            {errors.lastNameHe && req}
          </div>
          <div>
            <label className={labelClass}>
              {r.firstNameLocal}
              <Required />
            </label>
            <input className={inputClass} {...register("firstNameLocal")} />
            {errors.firstNameLocal && req}
          </div>
          <div>
            <label className={labelClass}>
              {r.lastNameLocal}
              <Required />
            </label>
            <input className={inputClass} {...register("lastNameLocal")} />
            {errors.lastNameLocal && req}
          </div>
          <div>
            <label className={labelClass}>
              {r.whatsappPhone}
              <Required />
            </label>
            <input className={inputClass} {...register("whatsappPhone")} />
            {errors.whatsappPhone && req}
          </div>
          <div>
            <label className={labelClass}>{r.missionPhone}</label>
            <input className={inputClass} {...register("missionPhone")} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>{r.maritalStatus}</label>
            <div className="flex flex-wrap gap-x-5 gap-y-1.5 mt-1.5">
              {MARITAL_STATUSES.map((status) => (
                <label key={status} className="flex items-center gap-1.5 text-sm">
                  <input type="radio" value={status} {...register("maritalStatus")} />
                  {r.maritalStatusOptions[status]}
                </label>
              ))}
            </div>
            {maritalStatus === "other" && (
              <div className="mt-2">
                <label className={labelClass}>{r.maritalStatusOtherLabel}</label>
                <input className={inputClass} {...register("maritalStatusOther")} />
                {errors.maritalStatusOther && req}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className={sectionClass}>
        <h2 className={sectionTitleClass}>{r.sectionMission}</h2>
        <p className="text-xs text-black/50">{r.sectionMissionNote}</p>
        <div>
          <label className={labelClass}>
            {r.organization}
            <Required />
          </label>
          <select className={inputClass} {...register("organization")}>
            <option value="">{r.selectOrganization}</option>
            {SENDING_ORGANIZATIONS.map((org) => (
              <option key={org} value={org}>
                {org}
              </option>
            ))}
            <option value={OTHER_OPTION}>Other</option>
          </select>
          {errors.organization && req}
          {organization === OTHER_OPTION && (
            <div className="mt-2">
              <label className={labelClass}>
                {r.organizationOtherLabel}
                <Required />
              </label>
              <input className={inputClass} {...register("organizationOther")} />
              {errors.organizationOther && req}
            </div>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>
              {r.missionLocationName}
              <Required />
            </label>
            <input className={inputClass} {...register("missionLocationName")} />
            {errors.missionLocationName && req}
          </div>
          <div>
            <label className={labelClass}>
              {r.mainRole}
              <Required />
            </label>
            <input className={inputClass} {...register("mainRole")} />
            {errors.mainRole && req}
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>
              {r.institutionType}
              <Required />
            </label>
            <select className={inputClass} {...register("institutionType")}>
              <option value="">{r.selectInstitutionType}</option>
              {INSTITUTION_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
              <option value={OTHER_OPTION}>Other</option>
            </select>
            {errors.institutionType && req}
            {institutionType === OTHER_OPTION && (
              <div className="mt-2">
                <label className={labelClass}>
                  {r.institutionTypeOtherLabel}
                  <Required />
                </label>
                <input className={inputClass} {...register("institutionTypeOther")} />
                {errors.institutionTypeOther && req}
              </div>
            )}
          </div>
          <div>
            <label className={labelClass}>
              {r.institutionCity}
              <Required />
            </label>
            <input className={inputClass} {...register("institutionCity")} />
            {errors.institutionCity && req}
          </div>
          <div>
            <label className={labelClass}>{r.missionStartDate}</label>
            <DateFieldDMY
              className={inputClass}
              value={watch("missionStartDate")}
              onChange={(iso) =>
                setValue("missionStartDate", iso, { shouldValidate: true, shouldDirty: true })
              }
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>{r.missionEndDateExpected}</label>
            <p className={noteClass}>{r.missionEndDateExpectedNote}</p>
            <DateFieldDMY
              className={inputClass}
              value={watch("missionEndDateExpected")}
              min={watch("missionStartDate") || undefined}
              onChange={(iso) =>
                setValue("missionEndDateExpected", iso, {
                  shouldValidate: true,
                  shouldDirty: true,
                })
              }
            />
          </div>
        </div>
      </section>

      <section className={sectionClass}>
        <h2 className={sectionTitleClass}>{r.sectionAddress}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className={labelClass}>
              {r.mailingInstitution}
              <Required />
            </label>
            <p className={noteClass}>{r.mailingInstitutionNote}</p>
            <input className={inputClass} {...register("mailingInstitution")} />
            {errors.mailingInstitution && req}
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>{r.address}</label>
            <p className={noteClass}>{r.addressNote}</p>
            <input className={inputClass} {...register("address")} />
          </div>
          <div>
            <label className={labelClass}>
              {r.city}
              <Required />
            </label>
            <input className={inputClass} {...register("city")} />
            {errors.city && req}
          </div>
          <div>
            <label className={labelClass}>{r.zip}</label>
            <input className={inputClass} {...register("zip")} />
          </div>
          <div>
            <label className={labelClass}>
              {r.country}
              <Required />
            </label>
            <select
              className={inputClass}
              {...register("country", {
                onChange: () => setValue("state", ""),
              })}
            >
              <option value="">{r.selectCountry}</option>
              {(locale === "en" ? COUNTRIES_EN : COUNTRIES_HE).map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
            {errors.country && req}
          </div>
          {country === US_COUNTRY_CODE ? (
            <div>
              <label className={labelClass}>
                {r.usState}
                <Required />
              </label>
              <select className={inputClass} {...register("state")}>
                <option value="">{r.selectUsState}</option>
                {usStatesFor(locale).map((st) => (
                  <option key={st.code} value={st.code}>
                    {st.name}
                  </option>
                ))}
              </select>
              {errors.state && req}
            </div>
          ) : (
            <div>
              <label className={labelClass}>{r.state}</label>
              <input className={inputClass} {...register("state")} />
            </div>
          )}
        </div>
      </section>

      <div ref={feedbackRef} className="space-y-3">
        {serverError && (
          <div className="rounded-md bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">
            {serverError}
          </div>
        )}
        {saved && !isDirty && (
          <div className="rounded-md border border-(--color-accent-dark)/30 bg-(--color-accent-light) text-(--color-accent-dark) text-sm px-3 py-2">
            {d.saved}
          </div>
        )}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-md bg-(--color-brand) text-white font-medium py-2.5 hover:bg-(--color-brand-dark) transition disabled:opacity-60"
        >
          {isSubmitting ? d.saving : d.saveDetails}
        </button>
      </div>
    </form>
  );
}
