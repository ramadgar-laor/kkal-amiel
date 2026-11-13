import { createClient } from "@/lib/supabase/server";
import {
  EventsDirectoryTable,
  type EventDirectoryRow,
} from "@/components/events-directory-table";
import { getKkalScope, inScope } from "@/lib/kkal/scope";
import { isShortNotice } from "@/lib/events/short-notice";
import { KkalScopeBanner } from "@/components/kkal-scope-banner";

export default async function KkalEventsPage({
  searchParams,
}: PageProps<"/kkal/events">) {
  const sp = await searchParams;
  const statusParam = sp.status;
  const initialStatus = Array.isArray(statusParam) ? statusParam[0] : statusParam;

  const scope = await getKkalScope(sp);
  const supabase = await createClient();
  const { data: allEvents } = await supabase
    .from("events")
    .select(
      "id, name, start_date, end_date, city, country, state, requested_amount, requested_currency, approved_amount, status, created_at, rep_id, org_affiliation, reps(first_name_he, last_name_he, state), invoices(amount, paid_amount, payment_status)"
    )
    .order("start_date", { ascending: true });

  // "My countries" filter (see lib/kkal/scope.ts). A US event is matched
  // on its own state; older events without one fall back to the
  // ambassador's state.
  const repOf = (e: NonNullable<typeof allEvents>[number]) =>
    Array.isArray(e.reps) ? e.reps[0] : e.reps;
  const events = (allEvents ?? []).filter((e) =>
    inScope(scope, e.country, e.state ?? repOf(e)?.state)
  );
  const hiddenCount = (allEvents?.length ?? 0) - events.length;

  const rows = events.map((e) => {
    const rep = repOf(e);
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
      state: e.state,
      startDate: e.start_date,
      endDate: e.end_date,
      status: e.status,
      requestedAmount: e.requested_amount,
      requestedCurrency: e.requested_currency,
      approvedAmount: e.approved_amount,
      invoicesPendingCount,
      invoicesPaidTotal,
      createdAt: e.created_at,
      shortNotice: isShortNotice(e.created_at, e.start_date),
    } satisfies EventDirectoryRow;
  });

  const actionableCount = rows.filter(
    (r) => r.status === "submitted" || r.status === "info_requested"
  ).length;

  // "Active" here means the event is still relevant going forward: not
  // rejected, and not already fully in the past. This is what the BI banner
  // below counts by -- a snapshot of where KKL's reps are currently
  // operating, not a lifetime total of every event ever submitted.
  const todayIso = new Date().toISOString().slice(0, 10);
  const activeEvents = events.filter(
    (e) => e.status !== "rejected" && e.end_date >= todayIso
  );
  const activeCountries = new Set(
    activeEvents.map((e) => e.country).filter(Boolean)
  );
  const activeReps = new Set(activeEvents.map((e) => e.rep_id).filter(Boolean));
  const activeOrgs = new Set(
    activeEvents.map((e) => e.org_affiliation).filter(Boolean)
  );
  const activeApprovedBudget = activeEvents.reduce(
    (sum, e) => sum + Number(e.approved_amount ?? 0),
    0
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-(--color-brand-dark)">
          אירועים ובקשות תקציב
        </h1>
        <p className="text-sm text-black/50 mt-1">
          {actionableCount > 0
            ? `${actionableCount} בקשות ממתינות לאישור. `
            : "אין כרגע בקשות הממתינות לאישור. "}
          אפשר לחפש ולסנן לפי סטטוס, תזמון ומדינה, וללחוץ על אירוע כדי לראות
          את כל הפרטים שהשגריר מילא ולהחליט על אישור או דחייה.
        </p>
      </div>

      <KkalScopeBanner
        scope={scope}
        path="/kkal/events"
        searchParams={sp}
        hiddenCount={hiddenCount}
      />

      {!!events.length && (
        <div className="rounded-xl bg-gradient-to-br from-(--color-brand) to-(--color-brand-dark) text-white p-6 shadow-sm">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="font-semibold">
              {scope.active ? "תמונת מצב — המדינות שלי" : "תמונת מצב כלל-מערכתית"}
            </h2>
            <span className="text-xs text-white/70">
              לפי אירועים פעילים — לא נדחו וטרם הסתיימו
            </span>
          </div>
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <div className="text-3xl font-bold">{activeCountries.size}</div>
              <div className="text-sm text-white/80 mt-0.5">מדינות פעילות</div>
            </div>
            <div>
              <div className="text-3xl font-bold">{activeReps.size}</div>
              <div className="text-sm text-white/80 mt-0.5">שגרירים פעילים</div>
            </div>
            <div>
              <div className="text-3xl font-bold">{activeOrgs.size}</div>
              <div className="text-sm text-white/80 mt-0.5">ארגונים שולחים</div>
            </div>
            <div>
              <div className="text-3xl font-bold">
                {actionableCount > 0 ? (
                  actionableCount
                ) : (
                  <span className="text-white/60">0</span>
                )}
              </div>
              <div className="text-sm text-white/80 mt-0.5">
                בקשות פתוחות לטיפול
              </div>
            </div>
          </div>
          {activeApprovedBudget > 0 && (
            <div className="mt-4 pt-4 border-t border-white/15 text-sm text-white/90">
              סה&quot;כ תקציב מאושר לאירועים פעילים: ₪
              {activeApprovedBudget.toLocaleString("he-IL")}
            </div>
          )}
        </div>
      )}

      {rows.length === 0 ? (
        <p className="text-sm text-black/50">
          {scope.active
            ? "אין אירועים במדינות שבאחריותך."
            : "אין עדיין אירועים במערכת."}
        </p>
      ) : (
        <EventsDirectoryTable
          rows={rows}
          initialStatus={initialStatus}
          exportHref={
            scope.showAll ? "/kkal/events/export?scope=all" : "/kkal/events/export"
          }
        />
      )}
    </div>
  );
}
