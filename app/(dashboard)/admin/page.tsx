import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  const [
    { count: pendingReps },
    { count: pendingEvents },
    { count: pendingInvoices },
    { count: inPaymentInvoices },
    { count: totalUsers },
  ] = await Promise.all([
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
    supabase
      .from("invoices")
      .select("*", { count: "exact", head: true })
      .eq("kkal_status", "approved")
      .neq("payment_status", "paid"),
    supabase.from("profiles").select("*", { count: "exact", head: true }),
  ]);

  const cards = [
    { label: "שליחים לאישור", value: pendingReps ?? 0, href: "/kkal/reps" },
    {
      label: "בקשות תקציב לאישור",
      value: pendingEvents ?? 0,
      href: "/kkal/events",
    },
    {
      label: 'חשבוניות לאישור (קק"ל)',
      value: pendingInvoices ?? 0,
      href: "/kkal/invoices",
    },
    {
      label: "חשבוניות בתהליך תשלום (עמיאל)",
      value: inPaymentInvoices ?? 0,
      href: "/amiel/invoices",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-(--color-brand-dark)">
          לוח בקרה — מנהל מערכת
        </h1>
        <p className="text-sm text-black/60 mt-1">
          תמונת מצב כוללת של המערכת. יש לך גישה מלאה לכל מסכי קק&quot;ל ועמיאל
          (ראו תפריט הניווט למעלה), לניהול משתמשים ולהגדרות המערכת.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className="rounded-xl bg-white border border-black/5 p-5 shadow-sm hover:border-(--color-brand)/30 transition"
          >
            <div className="text-3xl font-bold text-(--color-brand)">
              {c.value}
            </div>
            <div className="mt-1 text-sm text-black/60">{c.label}</div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href="/admin/users"
          className="flex items-center justify-between rounded-xl bg-white border border-black/5 p-5 shadow-sm hover:border-(--color-brand)/30 transition"
        >
          <div>
            <div className="font-semibold text-(--color-brand-dark)">
              ניהול משתמשים
            </div>
            <div className="text-sm text-black/50 mt-0.5">
              {totalUsers ?? 0} משתמשים במערכת — הוספת משתמש ועריכת הרשאות
            </div>
          </div>
          <span className="text-(--color-brand) text-xl">←</span>
        </Link>

        <Link
          href="/admin/settings"
          className="flex items-center justify-between rounded-xl bg-white border border-black/5 p-5 shadow-sm hover:border-(--color-brand)/30 transition"
        >
          <div>
            <div className="font-semibold text-(--color-brand-dark)">
              הגדרות מערכת
            </div>
            <div className="text-sm text-black/50 mt-0.5">
              עריכת תוכן והגדרות ניתנות לשינוי בלי לשנות קוד
            </div>
          </div>
          <span className="text-(--color-brand) text-xl">←</span>
        </Link>
      </div>
    </div>
  );
}
