import { createClient } from "@/lib/supabase/server";
import { getCountryName } from "@/lib/data/countries";
import {
  AmielPaymentsTable,
  type AmielPaymentRow,
} from "@/components/amiel-payments-table";

// Item 8: Amiel's view of every payment made, with an export-to-Excel
// option (app/(dashboard)/amiel/payments/export/route.ts). RLS
// (invoices_amiel_read_approved) already limits this to kkal_status =
// 'approved' invoices -- the payment_status = 'paid' filter here narrows
// it to actual completed payments.
export default async function AmielPaymentsPage() {
  const supabase = await createClient();

  const { data: invoices } = await supabase
    .from("invoices")
    .select(
      "id, supplier_name, paid_amount, payment_currency, payment_exchange_rate, paid_amount_ils, paid_at, events(id, name, rep_id, reps(first_name_he, last_name_he, country))"
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

    return {
      id: inv.id,
      supplierName: inv.supplier_name,
      eventName: event?.name ?? "—",
      repName: rep
        ? [rep.first_name_he, rep.last_name_he].filter(Boolean).join(" ") || "—"
        : "—",
      repCountry: rep?.country ? getCountryName(rep.country) : "—",
      paidAmount: inv.paid_amount != null ? Number(inv.paid_amount) : null,
      paymentCurrency: inv.payment_currency,
      paymentExchangeRate:
        inv.payment_exchange_rate != null ? Number(inv.payment_exchange_rate) : null,
      paidAmountIls: inv.paid_amount_ils != null ? Number(inv.paid_amount_ils) : null,
      paidAt: inv.paid_at,
    } satisfies AmielPaymentRow;
  });

  const totalIls = rows.reduce((sum, r) => sum + (r.paidAmountIls ?? 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-(--color-brand-dark)">
          כל התשלומים
        </h1>
        <p className="text-sm text-black/50 mt-1">
          {rows.length > 0
            ? `${rows.length} תשלומים שבוצעו, בסך כולל של ₪${totalIls.toLocaleString("he-IL")}. `
            : "לא בוצעו עדיין תשלומים. "}
          אפשר לחפש ולייצא את הרשימה לאקסל.
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-black/50">אין עדיין תשלומים להצגה.</p>
      ) : (
        <AmielPaymentsTable rows={rows} />
      )}
    </div>
  );
}
