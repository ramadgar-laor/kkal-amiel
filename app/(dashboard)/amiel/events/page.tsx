import { createClient } from "@/lib/supabase/server";
import {
  AmielEventsTable,
  type AmielEventRow,
} from "@/components/amiel-events-table";

export default async function AmielEventsPage() {
  const supabase = await createClient();

  // RLS (events_amiel_read_approved) already limits this to events that
  // KKAL approved (fully or partially) -- the explicit filter here just
  // keeps the query's intent clear on its own.
  const { data: events } = await supabase
    .from("events")
    .select(
      "id, name, start_date, end_date, city, country, requested_currency, approved_amount, status, rep_id, reps(first_name_he, last_name_he)"
    )
    .in("status", ["approved", "partially_approved"])
    .order("start_date", { ascending: true });

  const eventIds = (events ?? []).map((e) => e.id);

  // Invoices here are already scoped by RLS (invoices_amiel_read_approved)
  // to ones KKAL has approved -- so this is exactly "what's already come
  // in" against the approved budget above, giving Amiel a heads-up on
  // what's still outstanding per event.
  const { data: invoices } =
    eventIds.length > 0
      ? await supabase
          .from("invoices")
          .select("event_id, amount, paid_amount, payment_status")
          .in("event_id", eventIds)
      : { data: [] as { event_id: string; amount: number; paid_amount: number | null; payment_status: string }[] };

  const invoicesByEvent = new Map<
    string,
    { submitted: number; pending: number; paidTotal: number }
  >();
  for (const inv of invoices ?? []) {
    const entry =
      invoicesByEvent.get(inv.event_id) ?? { submitted: 0, pending: 0, paidTotal: 0 };
    entry.submitted += 1;
    if (inv.payment_status === "paid") {
      entry.paidTotal += Number(inv.paid_amount ?? inv.amount ?? 0);
    } else {
      entry.pending += 1;
    }
    invoicesByEvent.set(inv.event_id, entry);
  }

  const rows = (events ?? []).map((e) => {
    const rep = Array.isArray(e.reps) ? e.reps[0] : e.reps;
    const invoiceSummary =
      invoicesByEvent.get(e.id) ?? { submitted: 0, pending: 0, paidTotal: 0 };

    return {
      id: e.id,
      name: e.name,
      repName: rep
        ? [rep.first_name_he, rep.last_name_he].filter(Boolean).join(" ") || "—"
        : "—",
      city: e.city,
      country: e.country,
      startDate: e.start_date,
      endDate: e.end_date,
      status: e.status,
      approvedAmount: e.approved_amount,
      requestedCurrency: e.requested_currency,
      invoicesSubmittedCount: invoiceSummary.submitted,
      invoicesPendingCount: invoiceSummary.pending,
      invoicesPaidTotal: invoiceSummary.paidTotal,
    } satisfies AmielEventRow;
  });

  const noInvoicesYetCount = rows.filter(
    (r) => r.invoicesSubmittedCount === 0
  ).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-(--color-brand-dark)">
          אירועים מאושרים
        </h1>
        <p className="text-sm text-black/50 mt-1">
          כל האירועים שאושרו על ידי קק&quot;ל (במלואם או חלקית) עם התקציב
          שאושר להם, כדי לדעת מראש אילו חשבוניות עוד עלולות להגיע.
          {noInvoicesYetCount > 0 &&
            ` ${noInvoicesYetCount} מהם עדיין בלי חשבוניות שהוזנו.`}
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-black/50">
          אין כרגע אירועים מאושרים במערכת.
        </p>
      ) : (
        <AmielEventsTable rows={rows} />
      )}
    </div>
  );
}
