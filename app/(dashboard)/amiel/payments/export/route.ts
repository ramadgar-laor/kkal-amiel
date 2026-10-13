import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCountryName } from "@/lib/data/countries";
import { buildExcelWorkbook, excelResponseHeaders } from "@/lib/export/excel";

const HEADERS = [
  "ספק",
  "שליח",
  "מדינה",
  "אירוע",
  "סכום החשבונית (מקורי)",
  "מטבע מקורי",
  "סכום ששולם",
  "מטבע התשלום",
  "שער המרה",
  "סכום ששולם בשקל (₪)",
  "תאריך תשלום",
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
      "supplier_name, amount, currency, paid_amount, payment_currency, payment_exchange_rate, paid_amount_ils, paid_at, events(name, rep_id, reps(first_name_he, last_name_he, country))"
    )
    .eq("kkal_status", "approved")
    .eq("payment_status", "paid")
    .order("paid_at", { ascending: false });

  const rows = (invoices ?? []).map((inv) => {
    const event = Array.isArray(inv.events) ? inv.events[0] : inv.events;
    const rep = event
      ? Array.isArray(event.reps)
        ? event.reps[0]
        : event.reps
      : null;

    return [
      inv.supplier_name,
      rep ? [rep.first_name_he, rep.last_name_he].filter(Boolean).join(" ") : null,
      rep?.country ? getCountryName(rep.country) : null,
      event?.name ?? null,
      inv.amount,
      inv.currency,
      inv.paid_amount,
      inv.payment_currency,
      inv.payment_exchange_rate,
      inv.paid_amount_ils,
      inv.paid_at
        ? new Date(inv.paid_at).toLocaleDateString("he-IL")
        : null,
    ];
  });

  const buffer = await buildExcelWorkbook({
    sheetName: "תשלומים",
    headers: HEADERS,
    rows,
  });

  return new NextResponse(new Blob([Uint8Array.from(buffer)]), {
    headers: excelResponseHeaders(
      `תשלומי_עמיאל_${new Date().toISOString().slice(0, 10)}.xlsx`
    ),
  });
}
