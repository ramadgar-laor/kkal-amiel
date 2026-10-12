"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef, useState } from "react";
import {
  repRegistrationSchema,
  PARTICIPATION_LEVELS,
  MARITAL_STATUSES,
  type RepRegistrationInput,
  type MaritalStatus,
} from "@/lib/validation/rep-registration";
import {
  SENDING_ORGANIZATIONS,
  INSTITUTION_TYPES,
  OTHER_OPTION,
} from "@/lib/data/kkal-reps-options";
import { COUNTRIES_HE, COUNTRIES_EN } from "@/lib/data/countries";
import { createClient } from "@/lib/supabase/client";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/config";
import { Required } from "@/components/form-required-mark";
import { renderLiteMarkdown } from "@/lib/content/lite-markdown";
import {
  focusFirstInvalidField,
  scrollElementIntoView,
} from "@/lib/forms/scroll-to-error";

export function RegisterForm({
  dict,
  locale,
  introMarkdown,
}: {
  dict: Dictionary;
  locale: Locale;
  // The form's "preceding text" block, editable by an admin via
  // /admin/settings without a code change (lib/content/settings-defs.ts).
  introMarkdown: string;
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const serverErrorRef = useRef<HTMLDivElement>(null);
  const [success, setSuccess] = useState(false);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RepRegistrationInput>({
    resolver: zodResolver(repRegistrationSchema),
    // Driven manually (see focusFirstInvalidField below) so a missing
    // required field on this long form scrolls into view on submit,
    // rather than the submit silently appearing to do nothing.
    shouldFocusError: false,
    defaultValues: {
      maritalStatus: "",
      organization: "",
      institutionType: "",
    },
  });

  useEffect(() => {
    if (serverError) scrollElementIntoView(serverErrorRef.current);
  }, [serverError]);

  const maritalStatus = watch("maritalStatus");
  const organization = watch("organization");
  const institutionType = watch("institutionType");

  async function onSubmit(values: RepRegistrationInput) {
    setServerError(null);
    const supabase = createClient();

    const resolvedOrganization =
      values.organization === OTHER_OPTION
        ? values.organizationOther || ""
        : values.organization;
    const resolvedInstitutionType =
      values.institutionType === OTHER_OPTION
        ? values.institutionTypeOther || ""
        : values.institutionType;
    const resolvedMaritalStatus =
      values.maritalStatus === "other"
        ? values.maritalStatusOther || ""
        : values.maritalStatus;

    // No password: this creates the account (if it doesn't exist yet) and
    // emails a one-time magic link. The rep finishes signing in by clicking
    // it — nothing to type or remember.
    const { error } = await supabase.auth.signInWithOtp({
      email: values.email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {
          role: "rep",
          display_name: `${values.firstNameHe} ${values.lastNameHe}`,
          first_name_he: values.firstNameHe,
          last_name_he: values.lastNameHe,
          first_name_local: values.firstNameLocal,
          last_name_local: values.lastNameLocal,
          whatsapp_phone: values.whatsappPhone,
          mission_phone: values.missionPhone || null,
          date_of_birth: values.dateOfBirth,
          marital_status: resolvedMaritalStatus || null,
          mailing_institution: values.mailingInstitution,
          address: values.address || null,
          city: values.city,
          state: values.state || null,
          zip: values.zip || null,
          country: values.country,
          organization: resolvedOrganization || null,
          activity_level: values.participationLevel,
          mission_location_name: values.missionLocationName || null,
          institution_type: resolvedInstitutionType || null,
          institution_city: values.institutionCity || null,
          main_role: values.mainRole || null,
          mission_start_date: values.missionStartDate || null,
          mission_end_date_expected: values.missionEndDateExpected || null,
          registration_notes: values.registrationNotes || null,
        },
      },
    });

    if (error) {
      setServerError(error.message);
      return;
    }

    setSuccess(true);
  }

  if (success) {
    return (
      <div className="rounded-lg border border-(--color-accent-dark)/30 bg-(--color-accent-light) p-6 text-(--color-accent-dark)">
        {dict.register.success}
      </div>
    );
  }

  const inputClass =
    "w-full rounded-md border border-black/15 bg-white px-3 py-2 text-sm focus:outline-2 focus:outline-(--color-brand)";
  const labelClass = "block text-sm font-medium mb-1";
  const errorClass = "text-xs text-red-600 mt-1";
  const noteClass = "text-xs text-black/50 mt-1";

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
        <span className="text-red-600">*</span> {dict.register.requiredNote}
      </p>

      {/* Editable by an admin via /admin/settings (lib/content/settings-defs.ts
          -> register_intro_he / register_intro_en) -- originally verbatim
          intro text from the real KKL ambassador-registration Google Form. */}
      <div className="rounded-lg border border-(--color-brand)/20 bg-(--color-brand-light) p-5 text-sm leading-relaxed space-y-3">
        {renderLiteMarkdown(introMarkdown)}
      </div>

      <section className="space-y-4">
        <h2 className="font-semibold text-(--color-brand-dark)">
          {dict.register.sectionAccount}
        </h2>
        <p className="text-xs text-black/50">{dict.register.magicLinkNote}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className={labelClass}>
              {dict.register.email}
              <Required />
            </label>
            <input type="email" className={inputClass} {...register("email")} />
            {errors.email && <p className={errorClass}>{dict.common.required}</p>}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-semibold text-(--color-brand-dark)">
          {dict.register.sectionPersonal}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>
              {dict.register.firstNameHe}
              <Required />
            </label>
            <input className={inputClass} {...register("firstNameHe")} />
            {errors.firstNameHe && (
              <p className={errorClass}>{dict.common.required}</p>
            )}
          </div>
          <div>
            <label className={labelClass}>
              {dict.register.lastNameHe}
              <Required />
            </label>
            <input className={inputClass} {...register("lastNameHe")} />
            {errors.lastNameHe && (
              <p className={errorClass}>{dict.common.required}</p>
            )}
          </div>
          <div>
            <label className={labelClass}>
              {dict.register.firstNameLocal}
              <Required />
            </label>
            <input className={inputClass} {...register("firstNameLocal")} />
            {errors.firstNameLocal && (
              <p className={errorClass}>{dict.common.required}</p>
            )}
          </div>
          <div>
            <label className={labelClass}>
              {dict.register.lastNameLocal}
              <Required />
            </label>
            <input className={inputClass} {...register("lastNameLocal")} />
            {errors.lastNameLocal && (
              <p className={errorClass}>{dict.common.required}</p>
            )}
          </div>
          <div>
            <label className={labelClass}>
              {dict.register.whatsappPhone}
              <Required />
            </label>
            <input className={inputClass} {...register("whatsappPhone")} />
            {errors.whatsappPhone && (
              <p className={errorClass}>{dict.common.required}</p>
            )}
          </div>
          <div>
            <label className={labelClass}>{dict.register.missionPhone}</label>
            <input className={inputClass} {...register("missionPhone")} />
          </div>
          <div>
            <label className={labelClass}>
              {dict.register.dateOfBirth}
              <Required />
            </label>
            <input
              type="date"
              className={inputClass}
              {...register("dateOfBirth")}
            />
            {errors.dateOfBirth && (
              <p className={errorClass}>{dict.common.required}</p>
            )}
          </div>
          <div>
            <label className={labelClass}>{dict.register.maritalStatus}</label>
            <div className="space-y-1.5 mt-1.5">
              {MARITAL_STATUSES.map((status) => (
                <label
                  key={status}
                  className="flex items-center gap-1.5 text-sm"
                >
                  <input
                    type="radio"
                    value={status}
                    {...register("maritalStatus")}
                  />
                  {dict.register.maritalStatusOptions[status]}
                </label>
              ))}
            </div>
            {(maritalStatus as MaritalStatus) === "other" && (
              <div className="mt-2">
                <label className={labelClass}>
                  {dict.register.maritalStatusOtherLabel}
                </label>
                <input
                  className={inputClass}
                  {...register("maritalStatusOther")}
                />
                {errors.maritalStatusOther && (
                  <p className={errorClass}>{dict.common.required}</p>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-semibold text-(--color-brand-dark)">
          {dict.register.sectionMission}
        </h2>
        <p className="text-xs text-black/50">{dict.register.sectionMissionNote}</p>

        <div>
          <label className={labelClass}>
            {dict.register.organization}
            <Required />
          </label>
          <select className={inputClass} {...register("organization")}>
            <option value="">{dict.register.selectOrganization}</option>
            {SENDING_ORGANIZATIONS.map((org) => (
              <option key={org} value={org}>
                {org}
              </option>
            ))}
            <option value={OTHER_OPTION}>Other</option>
          </select>
          {errors.organization && (
            <p className={errorClass}>{dict.common.required}</p>
          )}
          {organization === OTHER_OPTION && (
            <div className="mt-2">
              <label className={labelClass}>
                {dict.register.organizationOtherLabel}
                <Required />
              </label>
              <input
                className={inputClass}
                {...register("organizationOther")}
              />
              {errors.organizationOther && (
                <p className={errorClass}>{dict.common.required}</p>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>
              {dict.register.missionLocationName}
              <Required />
            </label>
            <input className={inputClass} {...register("missionLocationName")} />
            {errors.missionLocationName && (
              <p className={errorClass}>{dict.common.required}</p>
            )}
          </div>
          <div>
            <label className={labelClass}>
              {dict.register.mainRole}
              <Required />
            </label>
            <input className={inputClass} {...register("mainRole")} />
            {errors.mainRole && (
              <p className={errorClass}>{dict.common.required}</p>
            )}
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>
              {dict.register.institutionType}
              <Required />
            </label>
            <select className={inputClass} {...register("institutionType")}>
              <option value="">{dict.register.selectInstitutionType}</option>
              {INSTITUTION_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
              <option value={OTHER_OPTION}>Other</option>
            </select>
            {errors.institutionType && (
              <p className={errorClass}>{dict.common.required}</p>
            )}
            {institutionType === OTHER_OPTION && (
              <div className="mt-2">
                <label className={labelClass}>
                  {dict.register.institutionTypeOtherLabel}
                  <Required />
                </label>
                <input
                  className={inputClass}
                  {...register("institutionTypeOther")}
                />
                {errors.institutionTypeOther && (
                  <p className={errorClass}>{dict.common.required}</p>
                )}
              </div>
            )}
          </div>
          <div>
            <label className={labelClass}>
              {dict.register.institutionCity}
              <Required />
            </label>
            <input className={inputClass} {...register("institutionCity")} />
            {errors.institutionCity && (
              <p className={errorClass}>{dict.common.required}</p>
            )}
          </div>
          <div>
            <label className={labelClass}>
              {dict.register.missionStartDate}
            </label>
            <input
              type="date"
              className={inputClass}
              {...register("missionStartDate")}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>
              {dict.register.missionEndDateExpected}
            </label>
            <p className={noteClass}>
              {dict.register.missionEndDateExpectedNote}
            </p>
            <input
              type="date"
              className={inputClass}
              {...register("missionEndDateExpected")}
            />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-semibold text-(--color-brand-dark)">
          {dict.register.sectionAddress}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className={labelClass}>
              {dict.register.mailingInstitution}
              <Required />
            </label>
            <p className={noteClass}>
              {dict.register.mailingInstitutionNote}
            </p>
            <input className={inputClass} {...register("mailingInstitution")} />
            {errors.mailingInstitution && (
              <p className={errorClass}>{dict.common.required}</p>
            )}
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>{dict.register.address}</label>
            <p className={noteClass}>{dict.register.addressNote}</p>
            <input className={inputClass} {...register("address")} />
          </div>
          <div>
            <label className={labelClass}>
              {dict.register.city}
              <Required />
            </label>
            <input className={inputClass} {...register("city")} />
            {errors.city && <p className={errorClass}>{dict.common.required}</p>}
          </div>
          <div>
            <label className={labelClass}>{dict.register.state}</label>
            <input className={inputClass} {...register("state")} />
          </div>
          <div>
            <label className={labelClass}>{dict.register.zip}</label>
            <input className={inputClass} {...register("zip")} />
          </div>
          <div>
            <label className={labelClass}>
              {dict.register.country}
              <Required />
            </label>
            <select className={inputClass} {...register("country")}>
              <option value="">{dict.register.selectCountry}</option>
              {(locale === "en" ? COUNTRIES_EN : COUNTRIES_HE).map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
            {errors.country && (
              <p className={errorClass}>{dict.common.required}</p>
            )}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-semibold text-(--color-brand-dark)">
          {dict.register.sectionParticipation}
        </h2>
        <p className="text-sm text-black/70">
          {dict.register.participationIntro}
        </p>

        <div className="space-y-2">
          {PARTICIPATION_LEVELS.map((level) => {
            const opt = dict.register.participationLevelOptions[level] as {
              title: string;
              requirement?: string;
              benefits: string[];
            };
            return (
              <details
                key={level}
                className="rounded-lg border border-black/10 bg-black/[0.02] px-4 py-3"
              >
                <summary className="cursor-pointer font-medium text-(--color-brand-dark)">
                  {opt.title}
                </summary>
                {opt.requirement && (
                  <p className="mt-2 text-sm font-medium text-(--color-brand-dark)">
                    {opt.requirement}
                  </p>
                )}
                <ul className="mt-2 list-disc ps-5 space-y-1 text-sm text-black/70">
                  {opt.benefits.map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
              </details>
            );
          })}
        </div>

        <div>
          <label className={labelClass}>
            {dict.register.participationLevel}
            <Required />
          </label>
          <select className={inputClass} {...register("participationLevel")}>
            <option value="">{dict.register.selectParticipationLevel}</option>
            {PARTICIPATION_LEVELS.map((level) => (
              <option key={level} value={level}>
                {dict.register.participationLevelOptions[level].title}
              </option>
            ))}
          </select>
          {errors.participationLevel && (
            <p className={errorClass}>{dict.common.required}</p>
          )}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <label className={labelClass}>{dict.register.registrationNotes}</label>
          <textarea
            className={inputClass}
            rows={3}
            {...register("registrationNotes")}
          />
        </div>
      </section>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-md bg-(--color-brand) text-white font-medium py-2.5 hover:bg-(--color-brand-dark) transition disabled:opacity-60"
      >
        {isSubmitting ? dict.common.loading : dict.register.submit}
      </button>
    </form>
  );
}
