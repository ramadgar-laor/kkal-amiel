import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/status-badge";
import { getCountryName } from "@/lib/data/countries";

export default async function RepEventDetailPage({
  params,
}: PageProps<"/rep/events/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: event } = await supabase
    .from("events")
    .select(
      "id, name, purpose, start_date, end_date, city, country, target_audience, program_description, track, requested_amount, requested_currency, approved_amount, status, kkal_notes, host_org_name, host_manager_name, host_manager_phone, host_manager_email, participants_count, transfer_amount_note, supplier_name, supplier_field, kkal_presence_selections, notes"
    )
    .eq("id", id)
    .single();

  if (!event) notFound();

  const { data: suppliers } = await supabase
    .from("event_suppliers")
    .select("name, field, bank_details_known")
    .eq("event_id", event.id)
    .order("sort_order", { ascending: true });

  const suppliersSummary = (suppliers ?? []).length
    ? (suppliers ?? [])
        .map(
          (s) =>
            `${[s.name, s.field].filter(Boolean).join(" · ")}${
              s.bank_details_known ? "" : " (פרטי בנק טרם נמסרו)"
            }`
        )
        .join("; ")
    : [event.supplier_name, event.supplier_field].filter(Boolean).join(" · ");

  const rows: [string, string | null | undefined][] = [
    ["מטרת האירוע", event.purpose],
    ["תאריכים", `${event.start_date} – ${event.end_date}`],
    ["מיקום", [event.city, getCountryName(event.country)].filter(Boolean).join(", ")],
    [
      "ארגון / קהילה מארחת",
      event.host_org_name,
    ],
    [
      "איש קשר מארגן",
      [event.host_manager_name, event.host_manager_phone, event.host_manager_email]
        .filter(Boolean)
        .join(" · "),
    ],
    ["קהל יעד", event.target_audience],
    [
      "מספר משתתפים צפוי",
      event.participants_count != null ? String(event.participants_count) : null,
    ],
    ["תיאור התכנית", event.program_description],
    ["מסלול", event.track === "ongoing" ? "מתמשך" : "חד פעמי"],
    [
      "סכום מבוקש",
      `${event.requested_amount} ${event.requested_currency}`,
    ],
    ["סכום מדויק להעברה", event.transfer_amount_note],
    [
      (suppliers ?? []).length > 1 ? "ספקים מקומיים" : "ספק מקומי",
      suppliersSummary || null,
    ],
    [
      "נוכחות קק\"ל שנבחרה",
      event.kkal_presence_selections?.length
        ? `${event.kkal_presence_selections.length} אפשרויות נבחרו`
        : null,
    ],
    ["הערות", event.notes],
  ];

  if (event.approved_amount != null) {
    rows.push([
      "סכום מאושר",
      `${event.approved_amount} ${event.requested_currency}`,
    ]);
  }

  return (
    <div className="max-w-2xl">
      <Link href="/rep" className="text-sm text-(--color-brand) underline">
        ← חזרה
      </Link>
      <div className="mt-3 flex items-center gap-3">
        <h1 className="text-xl font-bold text-(--color-brand-dark)">
          {event.name}
        </h1>
        <StatusBadge status={event.status} />
      </div>

      <div className="mt-6 rounded-xl bg-white border border-black/5 p-6 shadow-sm divide-y divide-black/5">
        {rows.map(([label, value]) =>
          value ? (
            <div key={label} className="py-2.5 grid grid-cols-3 gap-4 text-sm">
              <div className="text-black/50">{label}</div>
              <div className="col-span-2">{value}</div>
            </div>
          ) : null
        )}
      </div>

      {event.kkal_notes && (
        <div className="mt-4 rounded-xl bg-(--color-brand-light) p-4 text-sm">
          <div className="font-medium text-(--color-brand-dark)">
            הערות קק&quot;ל
          </div>
          <div className="mt-1">{event.kkal_notes}</div>
        </div>
      )}

      {(event.status === "approved" || event.status === "partially_approved") && (
        <div className="mt-6 rounded-xl border border-dashed border-black/15 p-6 text-sm text-black/50">
          הכנסת חשבוניות עבור אירוע זה — בבנייה, השלב הבא בתהליך.
        </div>
      )}
    </div>
  );
}
