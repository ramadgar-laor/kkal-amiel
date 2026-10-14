import { createClient } from "@/lib/supabase/server";
import {
  InvoicesDirectoryTable,
  type InvoiceDirectoryRow,
} from "@/components/invoices-directory-table";

export default async function KkalInvoicesPage({
  searchParams,
}: PageProps<"/kkal/invoices">) {
  const sp = await searchParams;
  const paymentStatusParam = sp.paymentStatus;
  const initialPaymentStatus = Array.isArray(paymentStatusParam)
    ? paymentStatusParam[0]
    : paymentStatusParam;
  const statusParam = sp.status;
  const initialStatus = Array.isArray(statusParam) ? statusParam[0] : statusParam;

  const supabase = await createClient();
  const { data: invoices } = await supabase
    .from("invoices")
    .select(
      "id, supplier_name, amount, currency, invoice_date, kkal_status, payment_status, created_at, events(id, name, rep_id, reps(first_name_he, last_name_he))"
    )
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
      amount: Number(inv.amount),
      currency: inv.currency,
      invoiceDate: inv.invoice_date,
      kkalStatus: inv.kkal_status,
      paymentStatus: inv.payment_status,
      createdAt: inv.created_at,
    } satisfies InvoiceDirectoryRow;
  });

  const pendingCount = rows.filter((r) => r.kkalStatus === "pending").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-(--color-brand-dark)">
          חשבוניות לאישור
        </h1>
        <p className="text-sm text-black/50 mt-1">
          {pendingCount > 0
            ? `${pendingCount} חשבוניות ממתינות לאישור. `
            : "אין כרגע חשבוניות הממתינות לאישור. "}
          אפשר לחפש ולסנן לפי סטטוס, וללחוץ על חשבונית כדי לראות את כל
          הפרטים שהוזנו ולהחליט על אישור או דחייה.
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-black/50">אין עדיין חשבוניות במערכת.</p>
      ) : (
        <InvoicesDirectoryTable
          rows={rows}
          initialStatus={initialStatus}
          initialPaymentStatus={initialPaymentStatus}
        />
      )}
    </div>
  );
}
