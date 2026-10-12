import { createClient } from "@/lib/supabase/server";

export default async function AmielDashboardPage() {
  const supabase = await createClient();

  const { count: awaitingPayment } = await supabase
    .from("invoices")
    .select("*", { count: "exact", head: true })
    .eq("kkal_status", "approved")
    .neq("payment_status", "paid");

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-(--color-brand-dark)">
        לוח בקרה — עמיאל
      </h1>
      <div className="rounded-xl bg-white border border-black/5 p-6 shadow-sm max-w-sm">
        <div className="text-3xl font-bold text-(--color-brand)">
          {awaitingPayment ?? 0}
        </div>
        <div className="mt-1 text-sm text-black/60">
          חשבוניות מאושרות על ידי קק&quot;ל, ממתינות לתשלום
        </div>
      </div>
      <p className="text-sm text-black/50">
        מסך תשלום מפורט לחשבוניות — בבנייה, השלב הבא בתהליך.
      </p>
    </div>
  );
}
