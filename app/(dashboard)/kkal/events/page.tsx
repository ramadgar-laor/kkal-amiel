import { createClient } from "@/lib/supabase/server";
import {
  EventsDirectoryTable,
  type EventDirectoryRow,
} from "@/components/events-directory-table";

export default async function KkalEventsPage() {
  const supabase = await createClient();
  const { data: events } = await supabase
    .from("events")
    .select(
      "id, name, start_date, end_date, city, country, requested_amount, requested_currency, approved_amount, status, created_at, reps(first_name_he, last_name_he), invoices(amount, paid_amount, payment_status)"
    )
    .order("start_date", { ascending: true });

  const rows = (events ?? []).map((e) => {
    const rep = Array.isArray(e.reps) ? e.reps[0] : e.reps;
    const invoices = e.invoices ?? [];
    const invoicesPendingCount = invoices.filter(
      (inv) => inv.payment_status !== "paid"
    ).length;
    const invoicesPaidTotal = invoices
      .filter((inv) => inv.payment_status === "paid")
      .reduce((sum, inv) => sum + Number(inv.paid_amount ?? inv.amount ?? 0), 0);

    return {
      id: e.id,
      name: e.name,
      repName: rep
        ? [rep.first_name_he, rep.last_name_he].filter(Boolean).join(" ") || "—"
        : "—",
      repCountry: null,
      city: e.city,
      country: e.country,
      startDate: e.start_date,
      endDate: e.end_date,
      status: e.status,
      requestedAmount: e.requested_amount,
      requestedCurrency: e.requested_currency,
      approvedAmount: e.approved_amount,
      invoicesPendingCount,
      invoicesPaidTotal,
      createdAt: e.created_at,
    } satisfies EventDirectoryRow;
  });

  const actionableCount = rows.filter(
    (r) => r.status === "submitted" || r.status === "info_requested"
  ).length;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h1 className="text-xl font-bold text-(--color-brand-dark)">
            אירועים ובקשות תקציב
          </h1>
          {/* Plain <a>, not next/link: this points at a route handler that
              streams an .xlsx download, not a page, so it must do a real
              browser navigation rather than a client-side route transition. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a
            href="/kkal/events/export"
            className="inline-flex items-center gap-1.5 text-sm rounded-md border border-(--color-brand)/30 text-(--color-brand) px-3 py-1.5 hover:bg-(--color-brand-light) transition shrink-0"
          >
            ייצוא לאקסל
          </a>
        </div>
        <p className="text-sm text-black/50 mt-1">
          {actionableCount > 0
            ? `${actionableCount} בקשות ממתינות לאישור. `
            : "אין כרגע בקשות הממתינות לאישור. "}
          אפשר לחפש ולסנן לפי סטטוס, תזמון ומדינה, וללחוץ על אירוע כדי לראות
          את כל הפרטים שהשליח מילא ולהחליט על אישור או דחייה.
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-black/50">אין עדיין אירועים במערכת.</p>
      ) : (
        <EventsDirectoryTable rows={rows} />
      )}
    </div>
  );
}
