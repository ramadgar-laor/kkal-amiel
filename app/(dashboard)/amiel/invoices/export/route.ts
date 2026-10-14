import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCountryName } from "@/lib/data/countries";
import { buildExcelWorkbook, excelResponseHeaders } from "@/lib/export/excel";
import { formatDateDMY } from "@/lib/utils/date";

const STATUS_LABEL_HE: Record<string, string> = {
  not_sent: "טרם הועבר לבדיקה",
  received_for_review: "התקבל לבדיקה",
  approved_for_payment: "אושר לתשלום",
  returned_to_kkal: 'הוחזר לקק"ל',
  returned_to_rep: "הוחזר לשליח",
  paid: "שולם",
};

const HEADERS = [
  "ספק",
  "שליח",
  "מדינה",
  "אירוע",
  "סכום",
  "מטבע",
  "תאריך הגשה",
  "סטטוס טיפול",
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

  if (profile?.role !== "amiel" && profile?.role !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { data: invoices } = await supabase
    .from("invoices")
    .select(
      "id, supplier_name, amount, currency, created_at, payment_status, events(name, rep_id, reps(first_name_he, last_name_he, country))"
    )
    .eq("kkal_status", "approved")
    .order("created_at", { ascending: false });

  const rows = (invoices ?? []).map((inv) => {
    const event = Array.isArray(inv.events) ? inv.events[0] : inv.events;
    const rep = event
      ? Array.isArray(event.reps)
        ? event.reps[0]
        : event.reps
      : null;

    const repName = rep
      ? [rep.first_name_he, rep.last_name_he].filter(Boolean).join(" ") || "—"
      : "—";
    const repCountry = rep?.country ? getCountryName(rep.country) : "—";

    return [
      inv.supplier_name,
      repName,
      repCountry,
      event?.name ?? "—",
      inv.amount != null ? Number(inv.amount) : null,
      inv.currency,
      formatDateDMY(inv.created_at),
      STATUS_LABEL_HE[inv.payment_status] ?? inv.payment_status,
    ];
  });

  const buffer = await buildExcelWorkbook({
    sheetName: "חשבוניות",
    headers: HEADERS,
    rows,
  });

  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(new Blob([Uint8Array.from(buffer)]), {
    headers: excelResponseHeaders(`חשבוניות_עמיאל_${date}.xlsx`),
  });
}
