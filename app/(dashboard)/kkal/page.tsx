import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getKkalScope, inScope } from "@/lib/kkal/scope";
import { KkalScopeBanner } from "@/components/kkal-scope-banner";

// The payment-status breakdown below is purely informational for KKL -- once
// an invoice is approved by KKL it moves into Amiel's payment pipeline, and
// KKL just needs visibility into where each one stands. The one exception is
// "returned_to_kkal": Amiel sends the invoice back to KKL with a reason when
// something's wrong, and KKL is the one who has to act on it from there (see
// resolveReturnedInvoice in lib/actions/invoices.ts) -- so that tile is
// called out as needing attention. Colors mirror components/status-badge.tsx
// so a tile here always matches the badge shown on the invoice itself,
// except "paid" gets its own solid tone to stand out as a finished state.
const PAYMENT_STAGES: {
  key: "received_for_review" | "approved_for_payment" | "paid" | "returned_to_kkal" | "returned_to_rep";
  label: string;
  hint: string;
  classes: string;
  needsKkalAction?: boolean;
}[] = [
  {
    key: "received_for_review",
    label: "התקבל לבדיקה",
    hint: "עמיאל בודקים את החשבונית",
    classes: "bg-amber-100 text-amber-800",
  },
  {
    key: "approved_for_payment",
    label: "אושר לתשלום",
    hint: "ממתינה לביצוע התשלום בפועל",
    classes: "bg-(--color-accent-light) text-(--color-accent-dark)",
  },
  {
    key: "returned_to_kkal",
    label: 'הוחזר לקק"ל',
    hint: 'עמיאל לא אישרו לתשלום — דורש בדיקה של קק"ל',
    classes: "bg-red-100 text-red-700",
    needsKkalAction: true,
  },
  {
    key: "returned_to_rep",
    label: "הוחזר לשגריר",
    hint: "חסרים פרטי בנק — ממתין לעדכון מהשגריר",
    classes: "bg-(--color-gold-light) text-(--color-gold)",
  },
  {
    // Last on purpose -- the pipeline's terminal/success state, after the
    // two "returned" exception branches.
    key: "paid",
    label: "שולם",
    hint: "התשלום בוצע",
    classes: "bg-(--color-accent) text-white",
  },
];

export default async function KkalDashboardPage({
  searchParams,
}: PageProps<"/kkal">) {
  const sp = await searchParams;
  const scope = await getKkalScope(sp);
  const supabase = await createClient();

  // Rows (not head-only counts) so the "my countries" filter can apply --
  // the numbers here must match what each linked list shows by default.
  const [{ data: reps }, { data: events }, { data: invoices }] =
    await Promise.all([
      supabase.from("reps").select("status, country, state"),
      supabase.from("events").select("status, country, state, reps(state)"),
      supabase
        .from("invoices")
        .select("kkal_status, payment_status, events(country, state, reps(state))"),
    ]);

  const first = <T,>(v: T | T[] | null | undefined): T | null =>
    Array.isArray(v) ? (v[0] ?? null) : (v ?? null);

  const myReps = (reps ?? []).filter((r) => inScope(scope, r.country, r.state));
  const myEvents = (events ?? []).filter((e) =>
    inScope(scope, e.country, e.state ?? first(e.reps)?.state)
  );
  const myInvoices = (invoices ?? []).filter((inv) => {
    const ev = first(inv.events);
    return inScope(scope, ev?.country, ev?.state ?? first(ev?.reps)?.state);
  });

  const pendingReps = myReps.filter((r) => r.status === "pending").length;
  const pendingEvents = myEvents.filter(
    (e) => e.status === "submitted" || e.status === "info_requested"
  ).length;
  const pendingInvoices = myInvoices.filter(
    (i) => i.kkal_status === "pending"
  ).length;
  const needsCorrectionInvoices = myInvoices.filter(
    (i) => i.kkal_status === "needs_correction"
  ).length;
  const paymentStageCounts = PAYMENT_STAGES.map(
    (stage) =>
      myInvoices.filter(
        (i) => i.kkal_status === "approved" && i.payment_status === stage.key
      ).length
  );

  // Carry an explicit "all countries" choice into the linked lists.
  const link = (href: string) => {
    if (!scope.showAll) return href;
    return href + (href.includes("?") ? "&" : "?") + "scope=all";
  };

  const paymentStagesTotal = paymentStageCounts.reduce((a, b) => a + b, 0);

  const cards = [
    { label: "שגרירים לאישור", value: pendingReps, href: link("/kkal/reps") },
    {
      label: "בקשות תקציב לאישור",
      value: pendingEvents,
      href: link("/kkal/events?status=actionable"),
    },
    {
      label: "חשבוניות לאישור",
      value: pendingInvoices,
      href: link("/kkal/invoices"),
    },
    {
      label: "חשבוניות בתיקון אצל השגריר",
      value: needsCorrectionInvoices,
      href: link("/kkal/invoices?status=needs_correction"),
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-(--color-brand-dark)">
        לוח בקרה — קק&quot;ל
      </h1>
      <KkalScopeBanner scope={scope} path="/kkal" searchParams={sp} />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href={link("/kkal/reps") + "#directory"}
          className="flex items-center justify-between rounded-xl bg-white border border-black/5 p-5 shadow-sm hover:border-(--color-brand)/30 transition"
        >
          <div>
            <div className="font-semibold text-(--color-brand-dark)">
              כל השגרירים במערכת
            </div>
            <div className="text-sm text-black/50 mt-0.5">
              רשימה מלאה, חיפוש וסינון לפי סטטוס — לא רק הממתינים לאישור
            </div>
          </div>
          <span className="text-(--color-brand) text-xl">←</span>
        </Link>

        <Link
          href={link("/kkal/events")}
          className="flex items-center justify-between rounded-xl bg-white border border-black/5 p-5 shadow-sm hover:border-(--color-brand)/30 transition"
        >
          <div>
            <div className="font-semibold text-(--color-brand-dark)">
              כל האירועים במערכת
            </div>
            <div className="text-sm text-black/50 mt-0.5">
              רשימה מלאה, חיפוש וסינון לפי סטטוס ומדינה, כולל תמונת מצב
              כלל-מערכתית — לא רק הממתינים לאישור
            </div>
          </div>
          <span className="text-(--color-brand) text-xl">←</span>
        </Link>
      </div>

      <div className="rounded-xl bg-white border border-black/5 p-5 shadow-sm">
        <div className="font-semibold text-(--color-brand-dark)">
          סטטוס חשבוניות בטיפול עמיאל
        </div>
        <div className="text-sm text-black/50 mt-0.5">
          {paymentStagesTotal > 0
            ? `${paymentStagesTotal} חשבוניות מאושרות נמצאות כרגע בתהליך התשלום אצל עמיאל. לחיצה על שלב מציגה רק את החשבוניות שבאותו שלב.`
            : "אין כרגע חשבוניות מאושרות בתהליך תשלום אצל עמיאל."}
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {PAYMENT_STAGES.map((stage, i) => (
            <Link
              key={stage.key}
              href={link(`/kkal/invoices?paymentStatus=${stage.key}`)}
              className={`rounded-lg p-4 transition hover:opacity-80 ${stage.classes}`}
            >
              <div className="text-2xl font-bold">{paymentStageCounts[i]}</div>
              <div className="mt-1 text-sm font-medium">{stage.label}</div>
              <div className="mt-0.5 text-xs opacity-80">{stage.hint}</div>
              {stage.needsKkalAction && paymentStageCounts[i] > 0 && (
                <div className="mt-2 text-xs font-semibold">
                  דורש פעולה מקק&quot;ל ←
                </div>
              )}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
