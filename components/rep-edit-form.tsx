"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  repEditSchema,
  REP_STATUSES,
  type RepEditInput,
  type RepStatus,
} from "@/lib/validation/rep-edit";
import { PARTICIPATION_LEVELS } from "@/lib/validation/rep-registration";
import {
  SENDING_ORGANIZATIONS,
  INSTITUTION_TYPES,
} from "@/lib/data/kkal-reps-options";
import { COUNTRIES_HE } from "@/lib/data/countries";
import { updateRepDetails } from "@/lib/actions/reps";
import {
  focusFirstInvalidField,
  scrollElementIntoView,
} from "@/lib/forms/scroll-to-error";

const STATUS_LABEL: Record<RepStatus, string> = {
  pending: "ממתין לאישור",
  approved: "מאושר",
  rejected: "נדחה",
  inactive: "לא פעיל",
};

const PARTICIPATION_LABEL: Record<(typeof PARTICIPATION_LEVELS)[number], string> = {
  trustee: 'נאמן קק"ל',
  fellow: 'עמית קק"ל',
  coordinator: 'רכז קק"ל',
};

type RepRow = {
  first_name_he: string | null;
  last_name_he: string | null;
  first_name_local: string | null;
  last_name_local: string | null;
  whatsapp_phone: string | null;
  mission_phone: string | null;
  date_of_birth: string | null;
  marital_status: string | null;
  mailing_institution: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  country: string | null;
  organization: string | null;
  activity_level: string | null;
  mission_location_name: string | null;
  institution_type: string | null;
  institution_city: string | null;
  main_role: string | null;
  mission_start_date: string | null;
  mission_end_date_expected: string | null;
  status: string;
  kkal_notes: string | null;
  registration_notes: string | null;
};

function toInput(rep: RepRow): RepEditInput {
  return {
    firstNameHe: rep.first_name_he ?? "",
    lastNameHe: rep.last_name_he ?? "",
    firstNameLocal: rep.first_name_local ?? "",
    lastNameLocal: rep.last_name_local ?? "",
    whatsappPhone: rep.whatsapp_phone ?? "",
    missionPhone: rep.mission_phone ?? "",
    dateOfBirth: rep.date_of_birth ?? "",
    maritalStatus: rep.marital_status ?? "",
    mailingInstitution: rep.mailing_institution ?? "",
    address: rep.address ?? "",
    city: rep.city ?? "",
    state: rep.state ?? "",
    zip: rep.zip ?? "",
    country: rep.country ?? "",
    organization: rep.organization ?? "",
    activityLevel: (rep.activity_level as RepEditInput["activityLevel"]) ?? "",
    missionLocationName: rep.mission_location_name ?? "",
    institutionType: rep.institution_type ?? "",
    institutionCity: rep.institution_city ?? "",
    mainRole: rep.main_role ?? "",
    missionStartDate: rep.mission_start_date ?? "",
    missionEndDateExpected: rep.mission_end_date_expected ?? "",
    status: (rep.status as RepStatus) ?? "pending",
    kkalNotes: rep.kkal_notes ?? "",
    registrationNotes: rep.registration_notes ?? "",
  };
}

export function RepEditForm({
  profileId,
  rep,
}: {
  profileId: string;
  rep: RepRow;
}) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const serverErrorRef = useRef<HTMLDivElement>(null);
  const [saved, setSaved] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RepEditInput>({
    resolver: zodResolver(repEditSchema),
    shouldFocusError: false,
    defaultValues: toInput(rep),
  });

  useEffect(() => {
    if (serverError) scrollElementIntoView(serverErrorRef.current);
  }, [serverError]);

  async function onSubmit(values: RepEditInput) {
    setServerError(null);
    setSaved(false);
    const res = await updateRepDetails(profileId, values);
    if (res?.error) {
      setServerError(res.error);
      return;
    }
    setSaved(true);
    router.refresh();
  }

  const inputClass =
    "w-full rounded-md border border-black/15 bg-white px-3 py-2 text-sm focus:outline-2 focus:outline-(--color-brand)";
  const labelClass = "block text-sm font-medium mb-1";
  const errorClass = "text-xs text-red-600 mt-1";

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
          שמירת השינויים נכשלה. נסו שוב.
        </div>
      )}
      {saved && (
        <div className="rounded-md bg-(--color-accent-light) border border-(--color-accent-dark)/30 text-(--color-accent-dark) text-sm px-3 py-2">
          הפרטים נשמרו בהצלחה.
        </div>
      )}

      <section className="space-y-4">
        <h2 className="font-semibold text-(--color-brand-dark)">סטטוס</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>סטטוס השליח</label>
            <select className={inputClass} {...register("status")}>
              {REP_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>הערות קק&quot;ל (פנימי)</label>
            <textarea
              rows={2}
              className={inputClass}
              {...register("kkalNotes")}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>
              הערות השליח (מולאו בטופס ההרשמה)
            </label>
            <textarea
              rows={2}
              className={inputClass}
              {...register("registrationNotes")}
            />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-semibold text-(--color-brand-dark)">פרטים אישיים</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>שם פרטי (עברית)</label>
            <input className={inputClass} {...register("firstNameHe")} />
            {errors.firstNameHe && <p className={errorClass}>שדה חובה</p>}
          </div>
          <div>
            <label className={labelClass}>שם משפחה (עברית)</label>
            <input className={inputClass} {...register("lastNameHe")} />
            {errors.lastNameHe && <p className={errorClass}>שדה חובה</p>}
          </div>
          <div>
            <label className={labelClass}>שם פרטי (שפת המדינה)</label>
            <input className={inputClass} {...register("firstNameLocal")} />
          </div>
          <div>
            <label className={labelClass}>שם משפחה (שפת המדינה)</label>
            <input className={inputClass} {...register("lastNameLocal")} />
          </div>
          <div>
            <label className={labelClass}>טלפון WhatsApp</label>
            <input className={inputClass} {...register("whatsappPhone")} />
            {errors.whatsappPhone && <p className={errorClass}>שדה חובה</p>}
          </div>
          <div>
            <label className={labelClass}>טלפון בשליחות</label>
            <input className={inputClass} {...register("missionPhone")} />
          </div>
          <div>
            <label className={labelClass}>תאריך לידה</label>
            <input type="date" className={inputClass} {...register("dateOfBirth")} />
          </div>
          <div>
            <label className={labelClass}>מצב משפחתי</label>
            <select className={inputClass} {...register("maritalStatus")}>
              <option value=""></option>
              <option value="single">רווק/ה</option>
              <option value="married">נשוי/אה</option>
              <option value="married_with_children">נשוי/אה + ילדים</option>
              <option value="widowed_divorced">אלמן/ה — גרוש/ה</option>
              <option value="other">אחר</option>
            </select>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-semibold text-(--color-brand-dark)">פרטי השליחות</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className={labelClass}>ארגון השליחות</label>
            <input
              className={inputClass}
              list="organization-options"
              {...register("organization")}
            />
            <datalist id="organization-options">
              {SENDING_ORGANIZATIONS.map((org) => (
                <option key={org} value={org} />
              ))}
            </datalist>
          </div>
          <div>
            <label className={labelClass}>שם מקום השליחות</label>
            <input className={inputClass} {...register("missionLocationName")} />
          </div>
          <div>
            <label className={labelClass}>התפקיד העיקרי</label>
            <input className={inputClass} {...register("mainRole")} />
          </div>
          <div>
            <label className={labelClass}>סוג המוסד</label>
            <input
              className={inputClass}
              list="institution-type-options"
              {...register("institutionType")}
            />
            <datalist id="institution-type-options">
              {INSTITUTION_TYPES.map((type) => (
                <option key={type} value={type} />
              ))}
            </datalist>
          </div>
          <div>
            <label className={labelClass}>עיר המוסד</label>
            <input className={inputClass} {...register("institutionCity")} />
          </div>
          <div>
            <label className={labelClass}>תאריך תחילת שליחות</label>
            <input type="date" className={inputClass} {...register("missionStartDate")} />
          </div>
          <div>
            <label className={labelClass}>תאריך צפי לסיום שליחות</label>
            <input
              type="date"
              className={inputClass}
              {...register("missionEndDateExpected")}
            />
          </div>
          <div>
            <label className={labelClass}>רמת השתתפות בתוכנית</label>
            <select className={inputClass} {...register("activityLevel")}>
              <option value=""></option>
              {PARTICIPATION_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {PARTICIPATION_LABEL[level]}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-semibold text-(--color-brand-dark)">כתובת למשלוח דואר</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className={labelClass}>מוסד/ארגון למשלוח דואר</label>
            <input className={inputClass} {...register("mailingInstitution")} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>כתובת</label>
            <input className={inputClass} {...register("address")} />
          </div>
          <div>
            <label className={labelClass}>עיר</label>
            <input className={inputClass} {...register("city")} />
          </div>
          <div>
            <label className={labelClass}>מדינה/מחוז</label>
            <input className={inputClass} {...register("state")} />
          </div>
          <div>
            <label className={labelClass}>מיקוד</label>
            <input className={inputClass} {...register("zip")} />
          </div>
          <div>
            <label className={labelClass}>מדינה</label>
            <select className={inputClass} {...register("country")}>
              <option value=""></option>
              {COUNTRIES_HE.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
            {errors.country && (
              <p className={errorClass}>מדינה לא תקינה</p>
            )}
          </div>
        </div>
      </section>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-md bg-(--color-brand) text-white font-medium py-2.5 hover:bg-(--color-brand-dark) transition disabled:opacity-60"
      >
        {isSubmitting ? "שומר..." : "שמירת שינויים"}
      </button>
    </form>
  );
}
