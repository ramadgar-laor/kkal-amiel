import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

const STAGES: {
  key: "not_sent" | "received_for_review" | "approved_for_payment" | "paid";
  label: string;
  hint: string;
}[] = [
  {
    key: "not_sent",
    label: "טרם הועבר לבדיקה",
    hint: "אושרו על ידי קק\"ל ומחכות לתחילת טיפול",
  },
  {
    key: "received_for_review",
    label: "התקבל לבדיקה",
    hint: "בבדיקה לפני אישור לתשלום",
  },
  {
    key: "approved_for_payment",
    label: "נבדק ואושר לתשלום",
    hint: "ממתינות לביצוע התשלום בפועל",
  },
  {
    key: "paid",
    label: "שולם",
    hint: "התשלום בוצע",
  },
];

export default async function AmielDashboardPage() {
  const supabase = await createClient();

  const counts = await Promise.all(
    STAGES.map(async (stage) => {
      const { count } = await supabase
        .from("invoices")
        .select("*", { count: "exact", head: true })
        .eq("kkal_status", "approved")
        .eq("payment_status", stage.key);
      return count ?? 0;
    })
  );

  const total = counts.reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-(--color-brand-dark)">
          לוח בקרה — עמיאל
        </h1>
        <p className="text-sm text-black/50 mt-1">
          {total} חשבוניות מאושרות על ידי קק&quot;ל נמצאות בתהליך התשלום.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {STAGES.map((stage, i) => (
          <div
            key={stage.key}
            className="rounded-xl bg-white border border-black/5 p-5 shadow-sm"
          >
            <div className="text-3xl font-bold text-(--color-brand)">
              {counts[i]}
            </div>
            <div className="mt-1 text-sm font-medium">{stage.label}</div>
            <div className="mt-0.5 text-xs text-black/50">{stage.hint}</div>
          </div>
        ))}
      </div>

      <Link
        href="/amiel/invoices"
        className="inline-flex items-center gap-1 rounded-md bg-(--color-brand) text-white text-sm font-medium px-4 py-2 hover:bg-(--color-brand-dark) transition"
      >
        מעבר לרשימת החשבוניות והתשלומים ←
      </Link>
    </div>
  );
}
