import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCountryName } from "@/lib/data/countries";
import { buildExcelWorkbook, excelResponseHeaders } from "@/lib/export/excel";
import { formatDateDMY } from "@/lib/utils/date";

const STATUS_LABEL: Record<string, string> = {
  pending: "ממתין לאישור",
  approved: "מאושר",
  rejected: "נדחה",
  inactive: "לא פעיל",
};

const PARTICIPATION_LABEL: Record<string, string> = {
  trustee: 'נאמן קק"ל',
  fellow: 'עמית קק"ל',
  coordinator: 'רכז קק"ל',
};

const MARITAL_STATUS_LABEL: Record<string, string> = {
  single: "רווק/ה",
  married: "נשוי/אה",
  married_with_children: "נשוי/אה + ילדים",
  widowed_divorced: "אלמן/ה — גרוש/ה",
};

const HEADERS = [
  "סטטוס",
  "שם פרטי (עברית)",
  "שם משפחה (עברית)",
  "שם פרטי (שפת היעד)",
  "שם משפחה (שפת היעד)",
  'דוא"ל',
  "טלפון WhatsApp",
  "טלפון בשליחות",
  "תאריך לידה",
  "מצב משפחתי",
  "ארגון השליחות",
  "מדינה",
  "עיר",
  "מדינה/מחוז",
  "מיקוד",
  "כתובת",
  "מוסד למשלוח דואר",
  "שם מקום השליחות",
  "סוג המוסד",
  "עיר המוסד",
  "תפקיד עיקרי",
  "תאריך תחילת שליחות",
  "תאריך צפי לסיום שליחות",
  "רמת השתתפות בתוכנית",
  "הערות השליח",
  'הערות קק"ל (פנימי)',
  "תאריך הרשמה",
];

export async function GET() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .maybeSingle();
  if (profile?.role !== "kkal" && profile?.role !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { data: reps } = await supabase
    .from("reps")
    .select(
      "profile_id, first_name_he, last_name_he, first_name_local, last_name_local, whatsapp_phone, mission_phone, date_of_birth, marital_status, mailing_institution, address, city, state, zip, country, organization, activity_level, mission_location_name, institution_type, institution_city, main_role, mission_start_date, mission_end_date_expected, status, registration_notes, kkal_notes, created_at"
    )
    .order("created_at", { ascending: false });

  const profileIds = (reps ?? []).map((r) => r.profile_id);
  const { data: profiles } =
    profileIds.length > 0
      ? await supabase.from("profiles").select("id, email").in("id", profileIds)
      : { data: [] as { id: string; email: string | null }[] };
  const emailById = new Map((profiles ?? []).map((p) => [p.id, p.email]));

  const rows = (reps ?? []).map((r) => [
    STATUS_LABEL[r.status] ?? r.status,
    r.first_name_he,
    r.last_name_he,
    r.first_name_local,
    r.last_name_local,
    emailById.get(r.profile_id) ?? null,
    r.whatsapp_phone,
    r.mission_phone,
    formatDateDMY(r.date_of_birth),
    r.marital_status
      ? (MARITAL_STATUS_LABEL[r.marital_status] ?? r.marital_status)
      : null,
    r.organization,
    r.country ? getCountryName(r.country) : null,
    r.city,
    r.state,
    r.zip,
    r.address,
    r.mailing_institution,
    r.mission_location_name,
    r.institution_type,
    r.institution_city,
    r.main_role,
    formatDateDMY(r.mission_start_date),
    formatDateDMY(r.mission_end_date_expected),
    r.activity_level
      ? (PARTICIPATION_LABEL[r.activity_level] ?? r.activity_level)
      : null,
    r.registration_notes,
    r.kkal_notes,
    r.created_at ? formatDateDMY(r.created_at) : null,
  ]);

  const buffer = await buildExcelWorkbook({
    sheetName: "שליחים",
    headers: HEADERS,
    rows,
  });

  return new NextResponse(new Blob([Uint8Array.from(buffer)]), {
    headers: excelResponseHeaders(
      `רשימת_שליחים_${new Date().toISOString().slice(0, 10)}.xlsx`
    ),
  });
}
