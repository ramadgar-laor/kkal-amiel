import { createClient } from "@/lib/supabase/server";
import { getCountryName } from "@/lib/data/countries";
import {
  AmielInvoicesTable,
  type AmielInvoiceRow,
} from "@/components/amiel-invoices-table";

export default async function AmielInvoicesPage({
  searchParams,
}: PageProps<"/amiel/invoices">) {
  const sp = await searchParams;
  const paymentStatusParam = sp.paymentStatus;
  const initialStatus = Array.isArray(paymentStatusParam)
    ? paymentStatusParam[0]
    : paymentStatusParam;

  const supabase = await createClient();

  // RLS (invoices_amiel_read_approved) already limits this to
  // kkal_status = 'approved' rows, but the explicit filter here keeps the
  // query's intent clear on its own.
  const { data: invoices } = await supabase
    .from("invoices")
    .select(
      "id, supplier_name, amount, currency, created_at, payment_status, events(id, name, rep_id, reps(first_name_he, last_name_he, country))"
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

    return {
      id: inv.id,
      supplierName: inv.supplier_name,
      eventId: event?.id ?? "",
      eventName: event?.name ?? "—",
      repName: rep
        ? [rep.first_name_he, rep.last_name_he].filter(Boolean).join(" ") || "—"
        : "—",
      repCountry: rep?.country ? getCountryName(rep.country) : "—",
      amount: Number(inv.amount),
      currency: inv.currency,
      submittedAt: inv.created_at,
      paymentStatus: inv.payment_status,
    } satisfies AmielInvoiceRow;
  });

  const awaitingCount = rows.filter((r) => r.paymentStatus !== "paid").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-(--color-brand-dark)">
          חשבוניות ותשלומים
        </h1>
        <p className="text-sm text-black/50 mt-1">
          {awaitingCount > 0
            ? `${awaitingCount} חשבוניות מאושרות על ידי קק"ל שעדיין ממתינות לטיפול בתשלום. `
            : "כל החשבוניות המאושרות שולמו. "}
          אפשר לחפש ולסנן לפי סטטוס, וללחוץ על חשבונית כדי לראות את כל הפרטים
          ולעדכן את מצב התשלום.
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-black/50">
          אין עדיין חשבוניות מאושרות הממתינות לטיפול.
        </p>
      ) : (
        <AmielInvoicesTable rows={rows} initialStatus={initialStatus} />
      )}
    </div>
  );
}
