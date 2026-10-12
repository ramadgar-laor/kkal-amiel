import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function KkalDashboardPage() {
  const supabase = await createClient();

  const [{ count: pendingReps }, { count: pendingEvents }, { count: pendingInvoices }] =
    await Promise.all([
      supabase
        .from("reps")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending"),
      supabase
        .from("events")
        .select("*", { count: "exact", head: true })
        .in("status", ["submitted", "info_requested"]),
      supabase
        .from("invoices")
        .select("*", { count: "exact", head: true })
        .eq("kkal_status", "pending"),
    ]);

  const cards = [
    { label: "שליחים לאישור", value: pendingReps ?? 0, href: "/kkal/reps" },
    {
      label: "בקשות תקציב לאישור",
      value: pendingEvents ?? 0,
      href: "/kkal/events",
    },
    {
      label: "חשבוניות לאישור",
      value: pendingInvoices ?? 0,
      href: "/kkal/invoices",
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-(--color-brand-dark)">
        לוח בקרה — קק&quot;ל
      </h1>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {cards.map((c) => {
          const content = (
            <>
              <div className="text-3xl font-bold text-(--color-brand)">
                {c.value}
              </div>
              <div className="mt-1 text-sm text-black/60">{c.label}</div>
            </>
          );
          return c.href ? (
            <Link
              key={c.label}
              href={c.href}
              className="rounded-xl bg-white border border-black/5 p-6 shadow-sm hover:border-(--color-brand)/30 transition"
            >
              {content}
            </Link>
          ) : (
            <div
              key={c.label}
              className="rounded-xl bg-white border border-black/5 p-6 shadow-sm opacity-60"
            >
              {content}
            </div>
          );
        })}
      </div>

      <Link
        href="/kkal/reps#directory"
        className="flex items-center justify-between rounded-xl bg-white border border-black/5 p-5 shadow-sm hover:border-(--color-brand)/30 transition"
      >
        <div>
          <div className="font-semibold text-(--color-brand-dark)">
            כל השליחים במערכת
          </div>
          <div className="text-sm text-black/50 mt-0.5">
            רשימה מלאה, חיפוש וסינון לפי סטטוס — לא רק הממתינים לאישור
          </div>
        </div>
        <span className="text-(--color-brand) text-xl">←</span>
      </Link>
    </div>
  );
}
