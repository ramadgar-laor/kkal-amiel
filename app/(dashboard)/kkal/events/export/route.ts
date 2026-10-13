import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCountryName } from "@/lib/data/countries";
import { KKAL_PRESENCE_OPTIONS } from "@/lib/data/kkal-presence";
import {
  buildExcelWorkbook,
  excelResponseHeaders,
  yesNo,
} from "@/lib/export/excel";
import { formatDateDMY } from "@/lib/utils/date";

const STATUS_LABEL: Record<string, string> = {
  submitted: "הוגש",
  info_requested: "נדרש מידע נוסף",
  approved: "אושר",
  partially_approved: "אושר חלקית",
  rejected: "נדחה",
};

const TRACK_LABEL: Record<string, string> = {
  one_time: "אירוע חד פעמי",
  ongoing: "תוכנית מתמשכת",
};

const HEADERS = [
  "סטטוס",
  "תאריך הגשה",
  "שם פרטי של השליח",
  "שם משפחה",
  "שם (שפה מקומית)",
  'דוא"ל',
  "טלפון בשליחות",
  "טלפון וואטסאפ",
  "ארגון השליחות",
  "מדינת השליחות",
  "מטעם איזה ארגון את/ה שליח/ה או פעיל/ה חינוכי ביעד",
  'נרשם/ה לתוכנית שגרירי קק"ל',
  "בקבוצת הוואטסאפ של השגרירים",
  "שם האירוע שלגביו מבוקשת התמיכה",
  "תאריך התחלה",
  "תאריך סיום",
  "עיר האירוע",
  "מדינת האירוע",
  "שם הארגון/המוסד/הקהילה המארחת",
  "שם המנהל/ת",
  "טלפון המנהל/ת",
  "מייל המנהל/ת",
  "קהל יעד",
  "מספר משתתפים צפוי",
  "תיאור התכנית",
  "מסלול",
  "סכום מבוקש",
  "מטבע",
  "סכום מדויק להעברה",
  "סכום מאושר",
  "אומדן תקציבי מפורט",
  'סה"כ בשקלים',
  "שם הספק/ים המקומי/ים",
  "תחום עיסוק הספק/ים",
  "פרטי בנק ידועים",
  "פרטי בנק מלאים",
  "הצעות מחיר (אנשי קשר)",
  'נראות ונוכחות קק"ל באירוע',
  "כל ההצהרות אושרו",
  "הערות השליח",
  'הערות קק"ל (פנימי)',
  'סה"כ שולם בחשבוניות',
  "חשבוניות ממתינות לתשלום",
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

  const { data: events } = await supabase
    .from("events")
    .select(
      "id, rep_id, name, start_date, end_date, city, country, target_audience, program_description, track, requested_amount, requested_currency, approved_amount, status, kkal_notes, org_affiliation, registered_to_program, in_whatsapp_group, host_org_name, host_manager_name, host_manager_phone, host_manager_email, participants_count, transfer_amount_note, kkal_presence_selections, consent_no_commitment, consent_committee_review, consent_follow_branding, consent_exchange_rate, consent_bank_fees, consent_followup_photos, notes, created_at, invoices(amount, paid_amount, payment_status)"
    )
    .order("created_at", { ascending: false });

  const repIds = [...new Set((events ?? []).map((e) => e.rep_id))];
  const [{ data: reps }, { data: profiles }] = await Promise.all([
    repIds.length > 0
      ? supabase
          .from("reps")
          .select(
            "profile_id, first_name_he, last_name_he, first_name_local, last_name_local, mission_phone, whatsapp_phone, organization, country"
          )
          .in("profile_id", repIds)
      : Promise.resolve({ data: [] as never[] }),
    repIds.length > 0
      ? supabase.from("profiles").select("id, email").in("id", repIds)
      : Promise.resolve({ data: [] as { id: string; email: string | null }[] }),
  ]);
  const repById = new Map((reps ?? []).map((r) => [r.profile_id, r]));
  const emailById = new Map((profiles ?? []).map((p) => [p.id, p.email]));

  const eventIds = (events ?? []).map((e) => e.id);
  const [{ data: allBudgetItems }, { data: allSuppliers }, { data: allQuotes }] =
    await Promise.all([
      eventIds.length > 0
        ? supabase
            .from("event_budget_items")
            .select("event_id, description, local_amount, currency, exchange_rate, amount_ils, sort_order")
            .in("event_id", eventIds)
            .order("sort_order", { ascending: true })
        : Promise.resolve({ data: [] as never[] }),
      eventIds.length > 0
        ? supabase
            .from("event_suppliers")
            .select("event_id, name, field, bank_details_known, beneficiary_name, bank_name, account_number, swift_number, sort_order")
            .in("event_id", eventIds)
            .order("sort_order", { ascending: true })
        : Promise.resolve({ data: [] as never[] }),
      eventIds.length > 0
        ? supabase
            .from("event_quotes")
            .select("event_id, slot, contact_phone, contact_email")
            .in("event_id", eventIds)
            .order("slot", { ascending: true })
        : Promise.resolve({ data: [] as never[] }),
    ]);

  const budgetItemsByEvent = new Map<string, typeof allBudgetItems>();
  for (const item of allBudgetItems ?? []) {
    const list = budgetItemsByEvent.get(item.event_id) ?? [];
    list.push(item);
    budgetItemsByEvent.set(item.event_id, list);
  }
  const suppliersByEvent = new Map<string, typeof allSuppliers>();
  for (const s of allSuppliers ?? []) {
    const list = suppliersByEvent.get(s.event_id) ?? [];
    list.push(s);
    suppliersByEvent.set(s.event_id, list);
  }
  const quotesByEvent = new Map<string, typeof allQuotes>();
  for (const q of allQuotes ?? []) {
    const list = quotesByEvent.get(q.event_id) ?? [];
    list.push(q);
    quotesByEvent.set(q.event_id, list);
  }

  const rows = (events ?? []).map((e) => {
    const rep = repById.get(e.rep_id);
    const budgetItems = budgetItemsByEvent.get(e.id) ?? [];
    const suppliers = suppliersByEvent.get(e.id) ?? [];
    const quotes = quotesByEvent.get(e.id) ?? [];
    const invoices = e.invoices ?? [];

    const budgetItemsTotalIls = budgetItems.reduce(
      (sum, item) => sum + Number(item.amount_ils ?? 0),
      0
    );
    const budgetSummary = budgetItems
      .map(
        (item) =>
          `${item.description}: ${item.local_amount} ${item.currency} (שער ${item.exchange_rate}) = ${Number(item.amount_ils).toLocaleString("he-IL")} ש"ח`
      )
      .join("\n");

    const presenceLabels = (e.kkal_presence_selections ?? [])
      .map(
        (key: string) =>
          KKAL_PRESENCE_OPTIONS.find((o) => o.key === key)?.label ?? key
      )
      .join("; ");

    const allConsentsConfirmed = [
      e.consent_no_commitment,
      e.consent_committee_review,
      e.consent_follow_branding,
      e.consent_exchange_rate,
      e.consent_bank_fees,
      e.consent_followup_photos,
    ].every(Boolean);

    const invoicesPaidTotal = invoices
      .filter((inv) => inv.payment_status === "paid")
      .reduce((sum, inv) => sum + Number(inv.paid_amount ?? inv.amount ?? 0), 0);
    const invoicesPendingCount = invoices.filter(
      (inv) => inv.payment_status !== "paid"
    ).length;

    return [
      STATUS_LABEL[e.status] ?? e.status,
      e.created_at ? formatDateDMY(e.created_at) : null,
      rep?.first_name_he ?? null,
      rep?.last_name_he ?? null,
      rep
        ? [rep.first_name_local, rep.last_name_local].filter(Boolean).join(" ") || null
        : null,
      emailById.get(e.rep_id) ?? null,
      rep?.mission_phone ?? null,
      rep?.whatsapp_phone ?? null,
      rep?.organization ?? null,
      rep?.country ? getCountryName(rep.country) : null,
      e.org_affiliation,
      yesNo(e.registered_to_program),
      yesNo(e.in_whatsapp_group),
      e.name,
      formatDateDMY(e.start_date),
      formatDateDMY(e.end_date),
      e.city,
      e.country ? getCountryName(e.country) : null,
      e.host_org_name,
      e.host_manager_name,
      e.host_manager_phone,
      e.host_manager_email,
      e.target_audience,
      e.participants_count,
      e.program_description,
      TRACK_LABEL[e.track ?? ""] ?? e.track,
      e.requested_amount,
      e.requested_currency,
      e.transfer_amount_note,
      e.approved_amount,
      budgetSummary || null,
      budgetItemsTotalIls || null,
      suppliers.map((s) => s.name).join("; ") || null,
      suppliers.map((s) => s.field).filter(Boolean).join("; ") || null,
      suppliers.length > 0
        ? suppliers.map((s) => (s.bank_details_known ? "כן" : "לא")).join("; ")
        : null,
      suppliers
        .filter((s) => s.bank_details_known)
        .map(
          (s) =>
            `${s.name}: ${s.beneficiary_name ?? ""} · ${s.bank_name ?? ""} · ${s.account_number ?? ""} · ${s.swift_number ?? ""}`
        )
        .join("\n") || null,
      quotes
        .map((q) => `${q.slot}: ${[q.contact_phone, q.contact_email].filter(Boolean).join(" / ")}`)
        .join("\n") || null,
      presenceLabels || null,
      yesNo(allConsentsConfirmed),
      e.notes,
      e.kkal_notes,
      invoicesPaidTotal || null,
      invoicesPendingCount || null,
    ];
  });

  const buffer = await buildExcelWorkbook({
    sheetName: "אירועים",
    headers: HEADERS,
    rows,
  });

  return new NextResponse(new Blob([Uint8Array.from(buffer)]), {
    headers: excelResponseHeaders(
      `רשימת_אירועים_${new Date().toISOString().slice(0, 10)}.xlsx`
    ),
  });
}
