import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/status-badge";
import { formatDateDMY } from "@/lib/utils/date";
import { getCurrentLocale } from "@/lib/i18n/server";
import { getDictionary } from "@/lib/i18n/dictionaries";

function t(template: string, values: Record<string, string | number> = {}) {
  return Object.entries(values).reduce(
    (acc, [key, value]) => acc.replaceAll(`{${key}}`, String(value)),
    template
  );
}

// Per-event invoice summary shown on each event card below -- computed from
// a single query across all of the rep's invoices (not one query per event)
// and grouped here by event_id. kkal_status/payment_status mirror the two
// pipelines described in lib/invoices/payment-status.ts: an invoice is
// either still waiting on KKL's own approval (pending/rejected), or -- once
// KKL has approved it -- somewhere in Amiel's payment pipeline, which is
// what "inAmielReview"/"paid"/"returnedToKkal" track. "returnedToRep" is the
// one state that needs the rep to act (see InvoiceBankEditPanel).
type EventInvoiceStats = {
  count: number;
  ilsTotal: number;
  kkalPending: number;
  kkalRejected: number;
  returnedToRep: number;
  returnedToKkal: number;
  inAmielReview: number;
  paid: number;
};

function emptyStats(): EventInvoiceStats {
  return {
    count: 0,
    ilsTotal: 0,
    kkalPending: 0,
    kkalRejected: 0,
    returnedToRep: 0,
    returnedToKkal: 0,
    inAmielReview: 0,
    paid: 0,
  };
}

export default async function RepDashboardPage() {
  const supabase = await createClient();
  const locale = await getCurrentLocale();
  const dict = getDictionary(locale);
  const d = dict.repDashboard;
  const numberLocale = locale === "en" ? "en-US" : "he-IL";

  const { data: userData } = await supabase.auth.getUser();
  const { data: rep } = await supabase
    .from("reps")
    .select("status, first_name_he, last_name_he, country")
    .eq("profile_id", userData.user!.id)
    .single();

  const { data: events } = await supabase
    .from("events")
    .select(
      "id, name, start_date, end_date, requested_amount, requested_currency, approved_amount, approved_amount_ils, status"
    )
    .eq("rep_id", userData.user!.id)
    .order("created_at", { ascending: false });

  const eventIds = (events ?? []).map((e) => e.id);

  const { data: invoices } = eventIds.length
    ? await supabase
        .from("invoices")
        .select("event_id, ils_amount, kkal_status, payment_status")
        .in("event_id", eventIds)
    : { data: [] as { event_id: string; ils_amount: number | null; kkal_status: string; payment_status: string }[] };

  const statsByEvent = new Map<string, EventInvoiceStats>();
  for (const inv of invoices ?? []) {
    const stats = statsByEvent.get(inv.event_id) ?? emptyStats();
    stats.count += 1;
    stats.ilsTotal += Number(inv.ils_amount ?? 0);

    if (inv.kkal_status === "pending") {
      stats.kkalPending += 1;
    } else if (inv.kkal_status === "rejected") {
      stats.kkalRejected += 1;
    } else if (inv.kkal_status === "approved") {
      if (inv.payment_status === "paid") stats.paid += 1;
      else if (inv.payment_status === "returned_to_rep") stats.returnedToRep += 1;
      else if (inv.payment_status === "returned_to_kkal") stats.returnedToKkal += 1;
      // "received_for_review" / "approved_for_payment", and the legacy
      // "not_sent" value some older invoices may still carry, are all still
      // in progress on Amiel's side as far as the rep is concerned.
      else stats.inAmielReview += 1;

    }

    statsByEvent.set(inv.event_id, stats);
  }

  const isApproved = rep?.status === "approved";

  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-white border border-black/5 p-6 shadow-sm">
        <h1 className="text-xl font-bold text-(--color-brand-dark)">
          {rep
            ? t(d.welcome, { name: rep.first_name_he ?? "" })
            : d.welcomeNoName}
        </h1>
        <p className="mt-2 text-sm flex items-center gap-2">
          {d.statusLabel} <StatusBadge status={rep?.status ?? "pending"} locale={locale} />
        </p>
        {!isApproved ? (
          <p className="mt-2 text-sm text-black/60">{d.notApprovedNote}</p>
        ) : (
          <p className="mt-3 text-sm text-black/60 border-t border-black/5 pt-3">
            {d.introText}
          </p>
        )}
      </div>

      <div className="rounded-xl bg-white border border-black/5 p-6 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="font-semibold text-(--color-brand-dark)">
              {d.myEventsTitle}
            </h2>
            {!!events?.length && (
              <p className="text-xs text-black/50 mt-0.5">{d.eventsIntro}</p>
            )}
          </div>
          {isApproved && (
            <Link
              href="/rep/events/new"
              className="rounded-md bg-(--color-brand) text-white text-sm font-medium px-4 py-2 hover:bg-(--color-brand-dark) transition"
            >
              {d.newEventButton}
            </Link>
          )}
        </div>

        {!events?.length ? (
          <p className="mt-4 text-sm text-black/50">{d.noEventsYet}</p>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-3">
            {events.map((e) => {
              const stats = statsByEvent.get(e.id) ?? emptyStats();
              const isBudgetApproved =
                e.status === "approved" || e.status === "partially_approved";
              const approvedIls = e.approved_amount_ils ?? e.approved_amount;
              const percentUsed =
                isBudgetApproved && approvedIls
                  ? Math.round((stats.ilsTotal / approvedIls) * 100)
                  : null;
              const barColor =
                percentUsed == null
                  ? ""
                  : percentUsed > 100
                    ? "bg-red-500"
                    : percentUsed >= 80
                      ? "bg-amber-500"
                      : "bg-(--color-accent)";

              const chips: { label: string; cls: string }[] = [];
              if (stats.kkalRejected > 0)
                chips.push({
                  label: t(d.kkalRejectedChip, { count: stats.kkalRejected }),
                  cls: "bg-red-100 text-red-700",
                });
              if (stats.returnedToRep > 0)
                chips.push({
                  label: t(d.returnedToRepChip, { count: stats.returnedToRep }),
                  cls: "bg-red-100 text-red-700",
                });
              if (stats.kkalPending > 0)
                chips.push({
                  label: t(d.kkalPendingChip, { count: stats.kkalPending }),
                  cls: "bg-amber-100 text-amber-800",
                });
              if (stats.returnedToKkal > 0)
                chips.push({
                  label: t(d.returnedToKkalChip, { count: stats.returnedToKkal }),
                  cls: "bg-(--color-gold-light) text-(--color-gold)",
                });
              if (stats.inAmielReview > 0)
                chips.push({
                  label: t(d.inAmielReviewChip, { count: stats.inAmielReview }),
                  cls: "bg-sky-100 text-sky-800",
                });
              if (stats.paid > 0)
                chips.push({
                  label: t(d.paidChip, { count: stats.paid }),
                  cls: "bg-(--color-accent-light) text-(--color-accent-dark)",
                });

              return (
                <Link
                  key={e.id}
                  href={`/rep/events/${e.id}`}
                  className="block rounded-lg border border-black/5 p-4 hover:border-(--color-brand)/30 hover:bg-black/[0.01] transition"
                >
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <div className="font-medium">{e.name}</div>
                      <div className="text-xs text-black/50 mt-0.5">
                        {formatDateDMY(e.start_date)} – {formatDateDMY(e.end_date)}
                      </div>
                    </div>
                    <StatusBadge status={e.status} locale={locale} />
                  </div>

                  <div className="mt-3">
                    {isBudgetApproved ? (
                      <>
                        <div className="flex items-center justify-between gap-3 text-xs text-black/60 flex-wrap">
                          <span>
                            {d.approvedBudgetLabel}: ₪
                            {Number(approvedIls ?? 0).toLocaleString(numberLocale)}
                          </span>
                          <span>
                            {d.invoicesTotalLabel}: ₪
                            {stats.ilsTotal.toLocaleString(numberLocale)}
                            {percentUsed != null && ` (${percentUsed}%)`}
                          </span>
                        </div>
                        {approvedIls ? (
                          <div className="mt-1.5 h-1.5 w-full rounded-full bg-black/10 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${barColor}`}
                              style={{ width: `${Math.min(percentUsed ?? 0, 100)}%` }}
                            />
                          </div>
                        ) : null}
                        {percentUsed != null && percentUsed > 100 && (
                          <div className="mt-1 text-xs text-red-600 font-medium">
                            {t(d.overBudgetLabel, {
                              amount: (stats.ilsTotal - (approvedIls ?? 0)).toLocaleString(
                                numberLocale
                              ),
                            })}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-xs text-black/50">
                        {d.requestedBudgetLabel}: {e.requested_amount} {e.requested_currency}
                        {" · "}
                        {d.awaitingApprovalNote}
                      </div>
                    )}
                  </div>

                  {isBudgetApproved && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {chips.length ? (
                        chips.map((c, i) => (
                          <span
                            key={i}
                            className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${c.cls}`}
                          >
                            {c.label}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-black/40">{d.noInvoicesYet}</span>
                      )}
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
