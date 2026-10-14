import { createClient } from "@/lib/supabase/server";
import { getCountryName } from "@/lib/data/countries";
import {
  AmielPaymentsTable,
  type AmielPaymentRow,
} from "@/components/amiel-payments-table";
import { AmielBudgetForm } from "@/components/amiel-budget-form";
import { formatDateDMY } from "@/lib/utils/date";

// Amiel's own internal tracking of the lump-sum budget KKL transfers them
// at the start of the year to cover every project's expenses across the
// whole system -- deliberately NOT tied to any single event's approved
// amount (events.approved_amount / approved_amount_ils, which is a
// per-event number KKL itself sets). "Received" is the running total of
// amiel_budget_allocations (there can be more than one top-up over the
// year); "spent" is read live from the same paid-invoices query
// /amiel/payments uses, so the two numbers never drift apart. RLS on
// amiel_budget_allocations is the real guarantee behind "not even KKL sees
// this" -- restricted to amiel/admin, same as invoices_amiel_read_approved.
export default async function AmielBudgetPage() {
  const supabase = await createClient();

  const [{ data: allocations }, { data: invoices }] = await Promise.all([
    supabase
      .from("amiel_budget_allocations")
      .select(
        "id, amount_ils, note, created_at, profiles(display_name, email)"
      )
      .order("created_at", { ascending: false }),
    supabase
      .from("invoices")
      .select(
        "id, supplier_name, paid_amount, payment_currency, payment_exchange_rate, paid_amount_ils, paid_at, events(id, name, rep_id, reps(first_name_he, last_name_he, country))"
      )
      .eq("kkal_status", "approved")
      .eq("payment_status", "paid")
      .order("paid_at", { ascending: false }),
  ]);

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

  const totalReceived = (allocations ?? []).reduce(
    (sum, a) => sum + Number(a.amount_ils),
    0
  );
  const totalSpent = rows.reduce((sum, r) => sum + (r.paidAmountIls ?? 0), 0);
  const remaining = totalReceived - totalSpent;
  const percentUsed =
    totalReceived > 0 ? Math.round((totalSpent / totalReceived) * 100) : null;
  const barColor =
    percentUsed == null
      ? ""
      : percentUsed > 100
        ? "bg-red-500"
        : percentUsed >= 80
          ? "bg-amber-500"
          : "bg-(--color-accent)";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-(--color-brand-dark)">
          תקציב עמיאל
        </h1>
        <p className="text-sm text-black/50 mt-1">
          מעקב פנימי אחרי התקציב הכולל שהועבר מקק&quot;ל, מול סך ההוצאות
          בפועל בכל הפרויקטים. המידע בעמוד זה גלוי לעמיאל בלבד ואינו מוצג
          לקק&quot;ל.
        </p>
      </div>

      <div className="rounded-xl bg-white border border-black/5 p-6 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-black/50">{'התקציב שהתקבל מקק"ל'}</div>
            <div className="text-2xl font-bold text-(--color-brand)">
              ₪{totalReceived.toLocaleString("he-IL")}
            </div>
          </div>
          <div>
            <div className="text-black/50">סך ההוצאות ששולמו</div>
            <div className="text-2xl font-bold">
              ₪{totalSpent.toLocaleString("he-IL")}
            </div>
          </div>
          <div>
            <div className="text-black/50">
              {remaining >= 0 ? "נותר מהתקציב" : "חריגה מהתקציב"}
            </div>
            <div
              className={`text-2xl font-bold ${remaining < 0 ? "text-red-600" : ""}`}
            >
              ₪{Math.abs(remaining).toLocaleString("he-IL")}
            </div>
          </div>
        </div>

        {totalReceived > 0 && (
          <div>
            <div className="h-2 w-full rounded-full bg-black/10 overflow-hidden">
              <div
                className={`h-full rounded-full ${barColor}`}
                style={{ width: `${Math.min(percentUsed ?? 0, 100)}%` }}
              />
            </div>
            <div className="mt-1 text-xs text-black/50">
              {percentUsed}% מהתקציב נוצל
            </div>
          </div>
        )}
        {percentUsed != null && percentUsed >= 80 && percentUsed < 100 && (
          <p className="text-xs text-amber-700 font-medium">
            {'מתקרבים לתקציב שהועבר מקק"ל — כדאי לשקול לבקש תוספת תקציב.'}
          </p>
        )}
        {percentUsed != null && percentUsed >= 100 && (
          <p className="text-xs text-red-600 font-medium">
            {'חרגתם מהתקציב שהועבר מקק"ל — יש לפנות לקק"ל לבקשת הגדלת התקציב.'}
          </p>
        )}
      </div>

      <div className="rounded-xl bg-white border border-black/5 p-6 shadow-sm space-y-4">
        <div>
          <h2 className="font-semibold text-(--color-brand-dark)">
            {'הוספת תקבול תקציב מקק"ל'}
          </h2>
          <p className="text-xs text-black/50 mt-0.5">
            כל העברת כסף מקק&quot;ל (תקציב פתיחה או תוספת במהלך השנה) נרשמת
            כאן בנפרד, כדי לשמור היסטוריה מלאה.
          </p>
        </div>
        <AmielBudgetForm />

        {!!allocations?.length && (
          <div className="pt-3 border-t border-black/5">
            <h3 className="text-sm font-medium text-black/60 mb-2">
              היסטוריית תקבולים
            </h3>
            <div className="divide-y divide-black/5">
              {allocations.map((a) => {
                const addedByRaw = a.profiles;
                const addedBy = Array.isArray(addedByRaw)
                  ? addedByRaw[0]
                  : addedByRaw;
                return (
                  <div
                    key={a.id}
                    className="py-2 flex items-center justify-between gap-3 text-sm"
                  >
                    <div>
                      <div className="font-medium">
                        ₪{Number(a.amount_ils).toLocaleString("he-IL")}
                      </div>
                      {a.note && (
                        <div className="text-xs text-black/50">{a.note}</div>
                      )}
                    </div>
                    <div className="text-xs text-black/40 text-end">
                      <div>{formatDateDMY(a.created_at)}</div>
                      {addedBy && (
                        <div>{addedBy.display_name || addedBy.email}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div>
        <h2 className="font-semibold text-(--color-brand-dark) mb-2">
          כל ההוצאות (בשקלים)
        </h2>
        {rows.length === 0 ? (
          <p className="text-sm text-black/50">לא בוצעו עדיין תשלומים.</p>
        ) : (
          <AmielPaymentsTable rows={rows} />
        )}
      </div>
    </div>
  );
}
