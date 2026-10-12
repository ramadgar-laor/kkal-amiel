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
import { COUNTRIES_HE } from "@/lib/data/countries";
import {
  focusFirstInvalidField,
  scrollElementIntoView,
} from "@/lib/forms/scroll-to-error";
import {
  KKAL_PRESENCE_OPTIONS,
  KKAL_PRESENCE_MIN_SELECTIONS,
} from "@/lib/data/kkal-presence";
import { Required } from "@/components/form-required-mark";

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

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  const known: Record<string, string> = {
    required: "שדה חובה",
    required_for_ongoing_track: "שדה חובה עבור תוכנית מתמשכת",
    must_be_positive: "יש להזין סכום חיובי",
    must_be_positive_integer: "יש להזין מספר שלם חיובי",
    must_agree: 'יש לאשר הצהרה זו כדי להגיש את הבקשה',
    min_selections: `יש לבחור לפחות ${KKAL_PRESENCE_MIN_SELECTIONS} אפשרויות מהרשימה`,
    required_at_least_one: "יש להוסיף לפחות שורה אחת",
    end_before_start: "תאריך הסיום לא יכול להיות מוקדם מתאריך ההתחלה",
    invalid_email: "כתובת מייל לא תקינה",
    invalid_type: "שדה חובה",
  };
  return <p className={errorClass}>{known[message] ?? "שדה לא תקין"}</p>;
}

function YesNo({
  name,
  label,
  note,
  register,
  error,
}: {
  name: "registeredToProgram" | "inWhatsappGroup";
  label: React.ReactNode;
  note?: string;
  register: ReturnType<typeof useForm<EventFormValues>>["register"];
  error?: string;
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
          <input type="radio" value="yes" {...register(name)} /> כן
        </label>
        <label className="flex items-center gap-1.5 text-sm">
          <input type="radio" value="no" {...register(name)} /> לא
        </label>
      </div>
      <FieldError message={error} />
    </div>
  );
}

function Consent({
  name,
  text,
  register,
  error,
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
}) {
  return (
    <div className="rounded-lg border border-black/10 bg-black/[0.02] p-4">
      <label className={labelClass}>
        {text}
        <Required />
      </label>
      <div className="flex gap-6 mt-1.5">
        <label className="flex items-center gap-1.5 text-sm">
          <input type="radio" value="yes" {...register(name)} /> כן
        </label>
        <label className="flex items-center gap-1.5 text-sm">
          <input type="radio" value="no" {...register(name)} /> לא
        </label>
      </div>
      <FieldError message={error} />
    </div>
  );
}

export function NewEventForm({ repDefaults }: { repDefaults: RepDefaults }) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const serverErrorRef = useRef<HTMLDivElement>(null);
  const [uploading, setUploading] = useState(false);
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
      ongoingProgramFile: null,
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
        setServerError("יש להתחבר מחדש כדי לשלוח את הבקשה");
        return;
      }
      const uid = userData.user.id;

      const [quote1Path, quote2Path, quote3Path, ongoingProgramFilePath] =
        await Promise.all([
          uploadEventFile(supabase, uid, values.quote1.file as File),
          values.quote2.file
            ? uploadEventFile(supabase, uid, values.quote2.file)
            : Promise.resolve(""),
          values.quote3.file
            ? uploadEventFile(supabase, uid, values.quote3.file)
            : Promise.resolve(""),
          values.track === "ongoing" && values.ongoingProgramFile
            ? uploadEventFile(supabase, uid, values.ongoingProgramFile)
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
        ongoingProgramFilePath,
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
            ? "יש לבדוק את השדות שמולאו"
            : `לא ניתן היה לשלוח את הבקשה: ${result.error}`
        );
        return;
      }
      router.push("/rep");
      router.refresh();
    } catch (e) {
      setServerError(
        e instanceof Error ? e.message : "אירעה שגיאה בהעלאת הקבצים"
      );
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
        <span className="text-red-600">*</span> שדות המסומנים בכוכבית הם שדות
        חובה.
      </p>

      {/* Verbatim intro text from the real KKL event-budget-request form */}
      <div className="rounded-lg border border-(--color-brand)/20 bg-(--color-brand-light) p-5 text-sm leading-relaxed space-y-3">
        <h2 className="font-bold text-(--color-brand-dark) text-base">
          פרוייקט קק&quot;ל בקהילה של שגרירי קק&quot;ל
        </h2>
        <p>
          תוכנית שגרירי קק&quot;ל עולה קומה ומעודדת פעילות מקומיות של שגרירי
          קק&quot;ל בתפוצות להנכחת קק&quot;ל והבאתה לידי ביטוי בקהילות
          במסגרות מקומיות של אירועים שונים וחיבור הקהילות לישראל ולציונות.
        </p>
        <p>
          חטיבת החינוך של קק&quot;ל תוכל לתמוך בשני מסלולים:
          <br />
          1. אירוע חד פעמי - בסכום של עד 10,000 ש&quot;ח לאירוע של שגריר
          קק&quot;ל.
          <br />
          2. תוכנית מתמשכת (לפחות 20 מפגשים + אירוע מרכזי) - בסכום של עד
          20,000 ש&quot;ח לכלל האירועים של שגריר קק&quot;ל.
        </p>
        <p>
          התשלום יבוצע באמצעות זכיין של קק&quot;ל אל ספק מקומי במדינה בה
          יתקיים האירוע. דוגמאות לאירועים אפשריים: מסיבת חנוכה, אירוע
          ט&quot;ו בשבט, שבתון, סמינר, כנס, או כל פעילות אחרת המחזקת את
          הזהות הציונית והקשר לישראל.
        </p>
        <ul className="list-disc ps-5 space-y-1">
          <li>
            נא לקרוא בעיון ובקפדנות את כלל ההנחיות וכלל השאלות ולענות בצורה
            מלאה, ברורה ומפורטת.
          </li>
          <li>
            ביצוע פעולות ומילוי הבקשה שלא לפי ההנחיות עלול לגרום לעיכוב
            משמעותי בטיפול בבקשה ואף לפסילתה.
          </li>
          <li>נא למלא את כלל השאלות המופיעות בטופס זה.</li>
        </ul>
        <div>
          <div className="font-semibold">דרישות:</div>
          <ol className="list-decimal ps-5 space-y-1 mt-1">
            <li>
              הבקשה בטופס זה תוגש לא פחות מ-14 ימי עסקים בישראל (ללא שישי
              שבת) לפני התאריך של הפעילות.
            </li>
            <li>
              המפיק המקומי / הספק המקומי הוא יישות משפטית מקומית שיכול
              לקבל כסף באמצעות העברה בנקאית מחו&quot;ל (מישראל אל מדינת
              היעד) ולספק הוכחות ביצוע, מסמכים וקבלות מתאימות כנדרש.
            </li>
            <li>
              כלל האירועים והתוכניות החד פעמיים או המתמשכים צריכים להיות
              מתוכננים להתבצע לא יאוחר מסוף חודש ינואר – כלומר ט&quot;ו
              בשבט הוא האירוע האחרון לביצוע.
            </li>
            <li>
              האירוע חייב שיהיה עם הקשר ציוני, ישראלי, יהודי הקשור במעגל
              השנה הישראלי או היהודי.
            </li>
            <li>
              נראות קק&quot;ל באירוע: באירוע עצמו ייתלה דגל קק&quot;ל במקום
              מרכזי ובולט; האירוע יצולם וישוגרו אלינו 2 תמונות הכי טובות
              שמביעות את הלך הרוח של האירוע ושבהן יופיע דגל קק&quot;ל;
              והאירוע ימותג על ידכם באופן קק&quot;לי, כולל התייחסות לצוות
              המקומי של JNF (צורת המיתוג תיקבע בתיאום עם רפרנט המדינה —
              לדוגמא מצגת/סרטון קצר של קק&quot;ל בפתיחת האירוע, דגלול
              האירוע בדגלי קק&quot;ל, נאום של נציג קק&quot;ל המקומי/האזורי
              וכו׳). בהמשך הטופס יש רשימה ארוכה של אפשרויות נוספות לנראות
              קק&quot;ל.
            </li>
          </ol>
        </div>
        <div>
          <div className="font-semibold">דגשים ונקודות חשובות:</div>
          <ol className="list-decimal ps-5 space-y-1 mt-1">
            <li>הספק המקומי אינו יכול להיות ישראלי. חייב להיות ספק מחו&quot;ל.</li>
            <li>הספק אינו יכול להיות ספק באינטרנט כמו אמזון וכו׳.</li>
            <li>אין אפשרות לשלם החזר הוצאות לשגריר קק&quot;ל שהוציא מכספו.</li>
            <li>
              אין אפשרות לשלם לארגון, עמותה, מוסד חינוכי או כל גורם שאינו
              עוסק בתחום הקשור להפקה או אספקה של האירוע — הגוף חייב להיות:
              חברה, עוסק מורשה, עוסק פטור או דומה.
            </li>
            <li>התשלום הוא אך ורק לספק / מפיק מקומי.</li>
          </ol>
        </div>
        <p>
          זוג שגרירים יקבל תמיכה אחת בלבד לשני בני הזוג. יעד בו יש יותר
          משגריר אחד שאינם בני זוג יוכלו לקבל תמיכה עבור כל פעילות במידה
          שהאירוע מיועד לקבוצות אוכלוסייה שונות.
        </p>
        <p>
          התוכנית מיועדת לקהילות שאינן נתמכות בידי חטיבת החינוך של
          קק&quot;ל (מי שלא בטוח מה סטטוס המדינה שלו, שיבדוק עם הרפרנט של
          המדינה שלו אצלינו במחלקה).
        </p>
        <ul className="list-disc ps-5 space-y-1 font-medium">
          <li>
            מילוי הבקשה בטופס זה אינה מהווה התחייבות מקק&quot;ל לתמיכה
            במיזם ו/או בפעילות המוצעת.
          </li>
          <li>כל בקשה תיבחן בוועדה ייעודית ותשובה תישלח אל הפונה.</li>
          <li>
            לפני אישור בקשה, יתקיים תיאום עם נציגי קק&quot;ל בארץ ונציגי
            הלשכה המקומית.
          </li>
          <li>ישולם לפי שער המרה של יום התשלום.</li>
          <li>איננו אחראים לעמלות שייגבו על ידי הבנק המקומי.</li>
        </ul>
        <p className="text-xs text-black/60">
          הגורם המשלם מטעם קק&quot;ל: חברת עמיאל (Amiel tours Ltd), Yoni
          Netanyahu Street, Or Yehuda 60376, P.O. Box 557, 60250, ISRAEL.
        </p>
      </div>

      {/* Ambassador / affiliation confirmation */}
      <section className={sectionClass}>
        <h2 className={sectionTitleClass}>הפרטים שלך</h2>
        <p className="text-xs text-black/50">
          הפרטים הבאים נלקחו מהפרופיל שלך במערכת. אם משהו שגוי, אפשר לעדכן
          דרך פרטי ההרשמה שלך.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-sm bg-black/[0.02] rounded-lg p-4">
          <div>
            <span className="text-black/50">שם: </span>
            {repDefaults.firstName} {repDefaults.lastName}
          </div>
          <div>
            <span className="text-black/50">מייל: </span>
            {repDefaults.email || "—"}
          </div>
          <div>
            <span className="text-black/50">טלפון מקומי: </span>
            {repDefaults.missionPhone || "—"}
          </div>
          <div>
            <span className="text-black/50">וואטסאפ: </span>
            {repDefaults.whatsappPhone || "—"}
          </div>
        </div>

        <div>
          <label className={labelClass}>
            מטעם איזה ארגון את/ה שליח/ה או פעיל/ה חינוכי ביעד?
            <Required />
          </label>
          <p className={noteClass}>(חשוב לנו לדעת איך הפכת לשגריר קק&quot;ל)</p>
          <input className={inputClass} {...register("orgAffiliation")} />
          <FieldError message={errors.orgAffiliation?.message} />
        </div>

        <YesNo
          name="registeredToProgram"
          label={'האם נרשמת לתוכנית שגרירי קק"ל?'}
          register={register}
          error={errors.registeredToProgram?.message}
        />
        <YesNo
          name="inWhatsappGroup"
          label='האם את/ה נמצא/ת בקבוצת הוואטסאפ של שגרירי קק"ל?'
          note='כמובן הקבוצה הרלוונטית לאיזור הפעילות שלך (אירופה / ארה"ב / אמל"ט)'
          register={register}
          error={errors.inWhatsappGroup?.message}
        />
      </section>

      {/* Event basics */}
      <section className={sectionClass}>
        <h2 className={sectionTitleClass}>פרטי האירוע</h2>

        <div>
          <label className={labelClass}>
            שם האירוע שלגביו מבוקשת התמיכה
            <Required />
          </label>
          <p className={noteClass}>
            אירוע משמעותו יכולה להיות: מיזם, תוכנית מתמשכת, פעילות, מסיבה
            סביב חג, סמינר, שבתון וכדומה
          </p>
          <input className={inputClass} {...register("name")} />
          <FieldError message={errors.name?.message} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>
              תאריך האירוע (התחלה)
              <Required />
            </label>
            <p className={noteClass}>גם אם התאריך לא סופי</p>
            <input
              type="date"
              className={inputClass}
              {...register("startDate", {
                onChange: (e) => {
                  setValue("endDate", e.target.value, { shouldValidate: true });
                },
              })}
            />
            <FieldError message={errors.startDate?.message} />
          </div>
          <div>
            <label className={labelClass}>
              תאריך סיום (אם מדובר בתוכנית מתמשכת)
              <Required />
            </label>
            <input
              type="date"
              min={startDate || undefined}
              className={inputClass}
              {...register("endDate")}
            />
            <FieldError message={errors.endDate?.message} />
          </div>
          <div>
            <label className={labelClass}>עיר האירוע</label>
            <input className={inputClass} {...register("city")} />
          </div>
          <div>
            <label className={labelClass}>
              מדינת האירוע
              <Required />
            </label>
            <select className={inputClass} {...register("country")}>
              <option value="">בחר/י מדינה</option>
              {COUNTRIES_HE.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
            <FieldError message={errors.country?.message} />
          </div>
        </div>

        <div>
          <label className={labelClass}>
            שם הארגון / המוסד / התנועה / הקהילה שבה או בעבורה תתקיים
            הפעילות, או הארגון המוביל את הפעילות
            <Required />
          </label>
          <input className={inputClass} {...register("hostOrgName")} />
          <FieldError message={errors.hostOrgName?.message} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>
              שם המנהל/ת של הארגון / הקהילה / המוסד המקומי המבקש את
              התמיכה
              <Required />
            </label>
            <input className={inputClass} {...register("hostManagerName")} />
            <FieldError message={errors.hostManagerName?.message} />
          </div>
          <div>
            <label className={labelClass}>
              מספר טלפון המנהל/ת
              <Required />
            </label>
            <input className={inputClass} {...register("hostManagerPhone")} />
            <FieldError message={errors.hostManagerPhone?.message} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>
              כתובת מייל של המנהל/ת
              <Required />
            </label>
            <input
              type="email"
              className={inputClass}
              {...register("hostManagerEmail")}
            />
            <FieldError message={errors.hostManagerEmail?.message} />
          </div>
        </div>

        <div>
          <label className={labelClass}>
            קהל יעד של האירוע כולל צפי של גילאים
            <Required />
          </label>
          <input className={inputClass} {...register("targetAudience")} />
          <FieldError message={errors.targetAudience?.message} />
        </div>

        <div>
          <label className={labelClass}>
            מספר צפי של משתתפים
            <Required />
          </label>
          <input
            type="number"
            min={1}
            className={inputClass}
            {...register("participantsCount")}
          />
          <FieldError message={errors.participantsCount?.message} />
        </div>

        <div>
          <label className={labelClass}>
            הסבר ופירוט של עד 50 מילים על התוכנית של האירוע
            <Required />
          </label>
          <textarea
            className={inputClass}
            rows={3}
            {...register("programDescription")}
          />
          <FieldError message={errors.programDescription?.message} />
        </div>

        <div>
          <label className={labelClass}>
            לפי איזה מהמסלולים אתם מגישים את הבקשה?
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
              <span>
                1. אירוע חד פעמי - בסכום של עד 10,000 ש&quot;ח לאירוע של
                שגריר קק&quot;ל.
              </span>
            </label>
            <label className="flex items-start gap-2 text-sm rounded-lg border border-black/10 p-3">
              <input
                type="radio"
                value="ongoing"
                className="mt-0.5"
                {...register("track")}
              />
              <span>
                2. תוכנית מתמשכת (לפחות 20 מפגשים + אירוע מרכזי) - בסכום
                של עד 20,000 ש&quot;ח לתוכנית של שגריר קק&quot;ל.
              </span>
            </label>
          </div>
        </div>

        {track === "ongoing" && (
          <div>
            <label className={labelClass}>
              תוכנית מתמשכת: הסבר של עד 500 מילים (קובץ וורד)
              <Required />
            </label>
            <input
              type="file"
              name="ongoingProgramFile"
              className={inputClass}
              onChange={(e) =>
                setValue("ongoingProgramFile", e.target.files?.[0] ?? null, {
                  shouldValidate: true,
                })
              }
            />
            <FieldError message={errors.ongoingProgramFile?.message} />
          </div>
        )}
      </section>

      {/* Budget */}
      <section className={sectionClass}>
        <h2 className={sectionTitleClass}>תקציב</h2>

        <div>
          <label className={labelClass}>
            סכום התמיכה המבוקש (נא לציין סכום בשקלים)
            <Required />
          </label>
          <input
            type="number"
            step="0.01"
            className={inputClass}
            {...register("requestedAmount")}
          />
          <FieldError message={errors.requestedAmount?.message} />
        </div>

        <div>
          <label className={labelClass}>
            סכום מדויק להעברה ביורו או בדולר בלבד
            <Required />
          </label>
          <p className={noteClass}>
            נא לרשום את הסכום המדויק המבוקש, בציון שם המטבע (דולר/יורו).
            שימו לב שהסכום לא עולה על גובה המסלול שבחרתם (עד 10,000 ש&quot;ח
            או עד 20,000 ש&quot;ח).
          </p>
          <input className={inputClass} {...register("transferAmountNote")} />
          <FieldError message={errors.transferAmountNote?.message} />
        </div>

        <div data-field-name="budgetItems">
          <div className="flex items-center justify-between">
            <label className={labelClass}>
              אומדן תקציבי מפורט
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
              + הוספת שורת הוצאה
            </button>
          </div>
          <p className={noteClass}>
            נא לפרט כל סעיף הוצאה בנפרד — מהות ההוצאה, הסכום במטבע המקומי
            (עם ציון שם המטבע), ושער ההמרה לשקלים. הסכום בשקלים לכל שורה
            וסך הכל מחושבים אוטומטית.
          </p>
          <FieldError message={budgetItemsRootError} />

          <div className="space-y-3 mt-2">
            {budgetItemsArray.fields.map((field, index) => {
              const itemErrors = errors.budgetItems?.[index];
              const local = Number(watchedBudgetItems[index]?.localAmount);
              const rate = Number(watchedBudgetItems[index]?.exchangeRate);
              const amountIls =
                Number.isFinite(local) && Number.isFinite(rate)
                  ? (local * rate).toLocaleString("he-IL", {
                      maximumFractionDigits: 2,
                    })
                  : "—";
              return (
                <div
                  key={field.id}
                  className="rounded-lg border border-black/10 p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-sm">
                      שורת הוצאה {index + 1}
                    </div>
                    {budgetItemsArray.fields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => budgetItemsArray.remove(index)}
                        className="text-xs text-red-600 underline"
                      >
                        הסרה
                      </button>
                    )}
                  </div>
                  <div>
                    <label className={labelClass}>
                      מהות ההוצאה
                      <Required />
                    </label>
                    <input
                      className={inputClass}
                      {...register(`budgetItems.${index}.description`)}
                    />
                    <FieldError message={itemErrors?.description?.message} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className={labelClass}>
                        סכום במטבע מקומי
                        <Required />
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        className={inputClass}
                        {...register(`budgetItems.${index}.localAmount`)}
                      />
                      <FieldError message={itemErrors?.localAmount?.message} />
                    </div>
                    <div>
                      <label className={labelClass}>
                        מטבע
                        <Required />
                      </label>
                      <input
                        placeholder="USD / EUR / ..."
                        className={inputClass}
                        {...register(`budgetItems.${index}.currency`)}
                      />
                      <FieldError message={itemErrors?.currency?.message} />
                    </div>
                    <div>
                      <label className={labelClass}>
                        שער המרה לשקל
                        <Required />
                      </label>
                      <input
                        type="number"
                        step="0.0001"
                        className={inputClass}
                        {...register(`budgetItems.${index}.exchangeRate`)}
                      />
                      <FieldError message={itemErrors?.exchangeRate?.message} />
                    </div>
                  </div>
                  <div className="text-xs text-black/50">
                    סכום בשקלים: <span className="font-medium">{amountIls}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between rounded-lg bg-black/[0.03] px-4 py-2.5 text-sm font-medium">
            <span>סה&quot;כ בשקלים</span>
            <span>
              {budgetItemsTotalIls.toLocaleString("he-IL", {
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
        </div>
      </section>

      {/* Suppliers */}
      <section className={sectionClass} data-field-name="suppliers">
        <div className="flex items-center justify-between">
          <h2 className={sectionTitleClass}>הספק המקומי</h2>
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
            + הוספת ספק נוסף
          </button>
        </div>
        <p className="text-xs text-black/50">
          הספק חייב להיות חברה העוסקת בתחום הרחב של הפקת אירועים (קייטרינג,
          אולם, מפיק אירועים, מפעיל מוזיקלי וכו׳) — לא עמותה, לא בית כנסת,
          לא בית ספר, לא תנועת נוער ולא פדרציה, ולא אדם פרטי וחשבון בנק
          פרטי. הספק אינו יכול להיות ישראלי וגם לא ספק אינטרנטי (כמו
          אמזון). אם יש יותר מספק אחד לאירוע, אפשר להוסיף ספק נוסף.
        </p>
        <FieldError message={suppliersRootError} />

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
                  <div className="font-medium text-sm">ספק {index + 1}</div>
                  {suppliersArray.fields.length > 1 && (
                    <button
                      type="button"
                      onClick={() => suppliersArray.remove(index)}
                      className="text-xs text-red-600 underline"
                    >
                      הסרה
                    </button>
                  )}
                </div>

                <div>
                  <label className={labelClass}>
                    שם מלא של הספק בשפה המקומית
                    <Required />
                  </label>
                  <input
                    className={inputClass}
                    {...register(`suppliers.${index}.name`)}
                  />
                  <FieldError message={supplierErrors?.name?.message} />
                </div>

                <div>
                  <label className={labelClass}>
                    מהו תחום העיסוק של הספק?
                    <Required />
                  </label>
                  <input
                    className={inputClass}
                    {...register(`suppliers.${index}.field`)}
                  />
                  <FieldError message={supplierErrors?.field?.message} />
                </div>

                <div>
                  <label className={labelClass}>
                    האם ידועים לך פרטי חשבון הבנק המלאים של הספק?
                    <Required />
                  </label>
                  <p className={noteClass}>
                    אם עדיין לא ידועים לך הפרטים המדויקים, אפשר להמשיך בלי
                    למלא אותם כעת — הם יידרשו בהמשך, בעת הזנת החשבונית, לפני
                    ביצוע התשלום בפועל. עדיף לסמן &quot;לא&quot; מאשר למלא
                    פרטים לא נכונים.
                  </p>
                  <div className="flex gap-6 mt-1.5">
                    <label className="flex items-center gap-1.5 text-sm">
                      <input
                        type="radio"
                        value="yes"
                        {...register(`suppliers.${index}.bankDetailsKnown`)}
                      />{" "}
                      כן, יש לי את הפרטים
                    </label>
                    <label className="flex items-center gap-1.5 text-sm">
                      <input
                        type="radio"
                        value="no"
                        {...register(`suppliers.${index}.bankDetailsKnown`)}
                      />{" "}
                      עדיין לא
                    </label>
                  </div>
                </div>

                {bankKnown === "yes" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-lg bg-black/[0.02] p-3">
                    <div>
                      <label className={labelClass}>
                        שם בעל החשבון
                        <Required />
                      </label>
                      <input
                        className={inputClass}
                        {...register(`suppliers.${index}.beneficiaryName`)}
                      />
                      <FieldError
                        message={supplierErrors?.beneficiaryName?.message}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>
                        כתובת בעל החשבון
                        <Required />
                      </label>
                      <input
                        className={inputClass}
                        {...register(`suppliers.${index}.beneficiaryAddress`)}
                      />
                      <FieldError
                        message={supplierErrors?.beneficiaryAddress?.message}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>
                        שם הבנק
                        <Required />
                      </label>
                      <input
                        className={inputClass}
                        {...register(`suppliers.${index}.bankName`)}
                      />
                      <FieldError message={supplierErrors?.bankName?.message} />
                    </div>
                    <div>
                      <label className={labelClass}>
                        כתובת סניף הבנק
                        <Required />
                      </label>
                      <input
                        className={inputClass}
                        {...register(`suppliers.${index}.bankAddress`)}
                      />
                      <FieldError
                        message={supplierErrors?.bankAddress?.message}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>
                        מספר חשבון הבנק
                        <Required />
                      </label>
                      <input
                        className={inputClass}
                        {...register(`suppliers.${index}.accountNumber`)}
                      />
                      <FieldError
                        message={supplierErrors?.accountNumber?.message}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>
                        קוד סוויפט (SWIFT)
                        <Required />
                      </label>
                      <input
                        className={inputClass}
                        {...register(`suppliers.${index}.swiftNumber`)}
                      />
                      <FieldError
                        message={supplierErrors?.swiftNumber?.message}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className={labelClass}>
                        מספר זיהוי בנקאי להעברות מקומיות בארה&quot;ב (ACH
                        Routing) — רק להעברה בתוך ארה&quot;ב
                      </label>
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
        <h2 className={sectionTitleClass}>הצעות מחיר</h2>
        <p className="text-xs text-black/50">
          נא להעלות מסמך רשמי על דף לוגו של הספק עם ההצעה לטובת הפעילות,
          תוך ציון הסכום המבוקש. אפשר להוסיף עד 2 הצעות מחיר נוספות אם יש
          יותר מספק אחד.
        </p>

        {(["quote1", "quote2", "quote3"] as const).map((key, i) => {
          const required = key === "quote1";
          return (
            <div key={key} className="rounded-lg border border-black/10 p-4 space-y-3">
              <div className="font-medium text-sm">
                הצעת מחיר {i + 1}
                {required && <Required />}
              </div>
              <div>
                <label className={labelClass}>קובץ ההצעה</label>
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
                <FieldError message={errors[key]?.file?.message as string | undefined} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>
                    טלפון איש הקשר של הספק
                    {required && <Required />}
                  </label>
                  <input
                    className={inputClass}
                    {...register(`${key}.contactPhone`)}
                  />
                  <FieldError
                    message={errors[key]?.contactPhone?.message as string | undefined}
                  />
                </div>
                <div>
                  <label className={labelClass}>
                    מייל איש הקשר של הספק
                    {required && <Required />}
                  </label>
                  <input
                    type="email"
                    className={inputClass}
                    {...register(`${key}.contactEmail`)}
                  />
                  <FieldError
                    message={errors[key]?.contactEmail?.message as string | undefined}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </section>

      {/* KKL presence checklist */}
      <section className={sectionClass}>
        <h2 className={sectionTitleClass}>נראות ונוכחות קק&quot;ל באירוע</h2>
        <p className="text-xs text-black/70">
          אנחנו מציעים בנק של אפשרויות ורעיונות לנוכחות קק&quot;ל באירוע
          שלכם. אתם נדרשים לציין לפחות {KKAL_PRESENCE_MIN_SELECTIONS}{" "}
          אפשרויות מתוך הרשימה להלן, ואת הנבחרים אתם מתחייבים ליישם באירוע.
          בנוסף לאמור, כל אירוע יכלול גם לפחות 2 דגלים של קק&quot;ל שיוצבו
          במקום מרכזי — זו דרישה קבועה בנפרד מהרשימה שלהלן.{" "}
          <a
            href="https://drive.google.com/drive/folders/126xcSqgRTlnpc9oJujss1rRq5WeCOD2H?usp=sharing"
            target="_blank"
            rel="noreferrer"
            className="text-(--color-brand) underline"
          >
            קישור להורדת לוגו קק&quot;ל
          </a>
        </p>
        <p className="text-xs">
          נבחרו {selections.length} מתוך {KKAL_PRESENCE_MIN_SELECTIONS} הנדרשים
          לפחות.
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
              <span>{opt.label}</span>
            </label>
          ))}
        </div>
        <FieldError message={errors.kkalPresenceSelections?.message} />
      </section>

      {/* Consents */}
      <section className={sectionClass}>
        <h2 className={sectionTitleClass}>הצהרות</h2>
        <Consent
          name="consentNoCommitment"
          text='אני מבין כי מילוי הבקשה בטופס זה אינה מהווה התחייבות מקק"ל לתמיכה במיזם ו/או בפעילות המוצעת.'
          register={register}
          error={errors.consentNoCommitment?.message}
        />
        <Consent
          name="consentCommitteeReview"
          text='אני מבין כי כל פנייה תיבחן לגופה בוועדה, עם זאת הפניות ייבדקו על פי סדר הגעתם והתמיכה תינתן עד גמר התקציב הייעודי למיזם זה של הפקת אירועים של שגרירי קק"ל או עד תום התאריך הקובע לסיום המיזם.'
          register={register}
          error={errors.consentCommitteeReview?.message}
        />
        <Consent
          name="consentFollowBranding"
          text='אני מתחייב כי אם אקבל את התמיכה אבצע את הנחיות הנראות וההנכחה של קק"ל.'
          register={register}
          error={errors.consentFollowBranding?.message}
        />
        <Consent
          name="consentExchangeRate"
          text='אני מבין כי התשלום יבוצע לפי שער ההמרה של יום התשלום ואין באחריותה של קק"ל לקחת אחריות על פערים שייווצרו בגלל המרות.'
          register={register}
          error={errors.consentExchangeRate?.message}
        />
        <Consent
          name="consentBankFees"
          text='אני מבין כי קק"ל אינה תישא בכל תשלום של עמלות או סכומי כסף אחרים שייגבו ע"י הבנקים המקומיים בגין ביצוע פעולת העברת התשלום.'
          register={register}
          error={errors.consentBankFees?.message}
        />
        <Consent
          name="consentFollowupPhotos"
          text='אני מתחייב כי אם אקבל תמיכה אשלח 2 תמונות מייצגות של האירוע הכוללות את אווירת האירוע לצד הנכחת קק"ל באירוע + סיכום מילולי של האירוע - עד 100 מילים.'
          register={register}
          error={errors.consentFollowupPhotos?.message}
        />
      </section>

      <section className={sectionClass}>
        <div>
          <label className={labelClass}>הערות</label>
          <textarea className={inputClass} rows={3} {...register("notes")} />
        </div>
      </section>

      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-md bg-(--color-brand) text-white font-medium py-2.5 hover:bg-(--color-brand-dark) transition disabled:opacity-60"
      >
        {busy ? "שולח..." : "שליחת בקשת תקציב"}
      </button>
    </form>
  );
}
