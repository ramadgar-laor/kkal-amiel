import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/status-badge";
import { EventReviewPanel } from "@/components/event-review-panel";
import { getCountryName } from "@/lib/data/countries";
import { getSignedEventFileUrl } from "@/lib/storage/event-files";
import { KKAL_PRESENCE_OPTIONS } from "@/lib/data/kkal-presence";

const TRACK_LABEL: Record<string, string> = {
  one_time: "אירוע חד פעמי",
  ongoing: "תוכנית מתמשכת",
};

const YES_NO_LABEL: Record<string, string> = {
  true: "כן",
  false: "לא",
};

function FileLink({ label, url }: { label: string; url: string | null }) {
  if (!url) return null;
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 text-sm text-(--color-brand) underline"
    >
      {label}
    </a>
  );
}

function Field({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="py-2 grid grid-cols-3 gap-4 text-sm">
      <div className="text-black/50">{label}</div>
      <div className="col-span-2">{value}</div>
    </div>
  );
}

export default async function KkalEventDetailPage({
  params,
}: PageProps<"/kkal/events/[id]">) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .select(
      "id, rep_id, name, purpose, start_date, end_date, city, country, target_audience, program_description, track, requested_amount, requested_currency, approved_amount, approved_amount_ils, status, kkal_notes, reviewed_at, org_affiliation, registered_to_program, in_whatsapp_group, host_org_name, host_manager_name, host_manager_phone, host_manager_email, participants_count, ongoing_program_file_path, transfer_amount_note, budget_breakdown_file_path, supplier_name, supplier_field, supplier_bank_details_file_path, kkal_presence_selections, consent_no_commitment, consent_committee_review, consent_follow_branding, consent_exchange_rate, consent_bank_fees, consent_followup_photos, notes, created_at, event_quotes(slot, quote_file_path, contact_phone, contact_email), invoices(id, amount, currency, ils_amount, invoice_date, kkal_status, payment_status, paid_amount, supplier_name)"
    )
    .eq("id", id)
    .maybeSingle();

  if (!event) notFound();

  const { data: rep } = await supabase
    .from("reps")
    .select(
      "first_name_he, last_name_he, first_name_local, last_name_local, whatsapp_phone, mission_phone, country, organization"
    )
    .eq("profile_id", event.rep_id)
    .maybeSingle();

  const { data: profile } = await supabase
    .from("profiles")
    .select("email")
    .eq("id", event.rep_id)
    .maybeSingle();

  // Structured budget breakdown lines and local suppliers (replacing the
  // old "download an Excel template, fill it in, upload it back" fields).
  // Older test events submitted before this change have none of these rows
  // -- for those we fall back to the legacy file-upload fields below.
  const { data: budgetItemsData } = await supabase
    .from("event_budget_items")
    .select("id, description, local_amount, currency, exchange_rate, amount_ils")
    .eq("event_id", event.id)
    .order("sort_order", { ascending: true });
  const budgetItems = budgetItemsData ?? [];
  const budgetItemsTotalIls = budgetItems.reduce(
    (sum, item) => sum + Number(item.amount_ils ?? 0),
    0
  );

  const { data: suppliersData } = await supabase
    .from("event_suppliers")
    .select(
      "id, name, field, bank_details_known, beneficiary_name, beneficiary_address, bank_name, bank_address, account_number, ach_routing_number, swift_number"
    )
    .eq("event_id", event.id)
    .order("sort_order", { ascending: true });
  const suppliers = suppliersData ?? [];

  const quotes = (event.event_quotes ?? []).sort((a, b) => a.slot - b.slot);
  const invoices = event.invoices ?? [];

  const [budgetFileUrl, supplierBankFileUrl, ongoingProgramFileUrl, quoteUrls] =
    await Promise.all([
      getSignedEventFileUrl(supabase, event.budget_breakdown_file_path),
      getSignedEventFileUrl(supabase, event.supplier_bank_details_file_path),
      getSignedEventFileUrl(supabase, event.ongoing_program_file_path),
      Promise.all(
        quotes.map((q) => getSignedEventFileUrl(supabase, q.quote_file_path))
      ),
    ]);

  const presenceLabels = (event.kkal_presence_selections ?? []).map(
    (key: string) =>
      KKAL_PRESENCE_OPTIONS.find((o) => o.key === key)?.label ?? key
  );

  const allConsentsConfirmed = [
    event.consent_no_commitment,
    event.consent_committee_review,
    event.consent_follow_branding,
    event.consent_exchange_rate,
    event.consent_bank_fees,
    event.consent_followup_photos,
  ].every(Boolean);

  const invoicesPaidTotal = invoices
    .filter((inv) => inv.payment_status === "paid")
    .reduce((sum, inv) => sum + Number(inv.paid_amount ?? inv.amount ?? 0), 0);
  const invoicesPendingCount = invoices.filter(
    (inv) => inv.payment_status !== "paid"
  ).length;

  // Item 5: kkal approves events on their ILS value, so the ILS figure
  // actually approved for this event needs to be clearly comparable
  // against the ILS total of the invoices submitted against it, in order
  // to catch overages.
  const invoicesIlsTotal = invoices.reduce(
    (sum, inv) => sum + Number(inv.ils_amount ?? 0),
    0
  );
  const approvedAmountIls = event.approved_amount_ils ?? event.approved_amount;
  const ilsOverage =
    approvedAmountIls != null ? invoicesIlsTotal - approvedAmountIls : null;

  const isActionable =
    event.status === "submitted" || event.status === "info_requested";

  const sectionClass =
    "rounded-xl bg-white border border-black/5 p-5 shadow-sm divide-y divide-black/5";
  const sectionTitleClass =
    "font-semibold text-(--color-brand-dark) mb-1";

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link
          href="/kkal/events"
          className="text-sm text-(--color-brand) underline"
        >
          ← חזרה לרשימת האירועים
        </Link>
        <div className="mt-3 flex items-center gap-3 flex-wrap">
          <h1 className="text-xl font-bold text-(--color-brand-dark)">
            {event.name}
          </h1>
          <StatusBadge status={event.status} />
        </div>
        <p className="text-sm text-black/50 mt-1">
          {rep
            ? [rep.first_name_he, rep.last_name_he].filter(Boolean).join(" ")
            : "—"}
          {rep?.country ? ` · ${getCountryName(rep.country)}` : ""}
          {profile?.email ? ` · ${profile.email}` : ""}
        </p>
      </div>

      <section className={sectionClass}>
        <h2 className={sectionTitleClass}>פרטי השליח</h2>
        <Field
          label="שם"
          value={
            rep
              ? `${rep.first_name_he ?? ""} ${rep.last_name_he ?? ""}`.trim() ||
                "—"
              : "—"
          }
        />
        <Field
          label="שם בשפה המקומית"
          value={
            rep?.first_name_local || rep?.last_name_local
              ? [rep?.first_name_local, rep?.last_name_local]
                  .filter(Boolean)
                  .join(" ")
              : null
          }
        />
        <Field label="מייל" value={profile?.email} />
        <Field label="וואטסאפ" value={rep?.whatsapp_phone} />
        <Field label="טלפון בשליחות" value={rep?.mission_phone} />
        <Field label="ארגון השליחות" value={rep?.organization} />
        <Field
          label="מדינת השליחות"
          value={rep?.country ? getCountryName(rep.country) : null}
        />
      </section>

      <section className={sectionClass}>
        <h2 className={sectionTitleClass}>שיוך ואישורים</h2>
        <Field label="מטעם איזה ארגון" value={event.org_affiliation} />
        <Field
          label='נרשם/ה לתוכנית שגרירי קק"ל'
          value={
            event.registered_to_program == null
              ? null
              : YES_NO_LABEL[String(event.registered_to_program)]
          }
        />
        <Field
          label="בקבוצת הוואטסאפ של השגרירים"
          value={
            event.in_whatsapp_group == null
              ? null
              : YES_NO_LABEL[String(event.in_whatsapp_group)]
          }
        />
      </section>

      <section className={sectionClass}>
        <h2 className={sectionTitleClass}>פרטי האירוע</h2>
        <Field
          label="תאריכים"
          value={`${event.start_date} – ${event.end_date}`}
        />
        <Field
          label="מיקום"
          value={[event.city, getCountryName(event.country)]
            .filter(Boolean)
            .join(", ")}
        />
        <Field label="ארגון / קהילה מארחת" value={event.host_org_name} />
        <Field
          label="איש קשר מארגן"
          value={[
            event.host_manager_name,
            event.host_manager_phone,
            event.host_manager_email,
          ]
            .filter(Boolean)
            .join(" · ")}
        />
        <Field label="קהל יעד" value={event.target_audience} />
        <Field
          label="מספר משתתפים צפוי"
          value={
            event.participants_count != null
              ? String(event.participants_count)
              : null
          }
        />
        <Field label="תיאור התכנית" value={event.program_description} />
        <Field
          label="מסלול"
          value={TRACK_LABEL[event.track ?? ""] ?? event.track}
        />
        {ongoingProgramFileUrl && (
          <Field
            label="קובץ הסבר לתוכנית מתמשכת"
            value={<FileLink label="הצגת הקובץ" url={ongoingProgramFileUrl} />}
          />
        )}
      </section>

      <section className={sectionClass}>
        <h2 className={sectionTitleClass}>תקציב</h2>
        <Field
          label="סכום מבוקש"
          value={`${event.requested_amount} ${event.requested_currency}`}
        />
        <Field label="סכום מדויק להעברה" value={event.transfer_amount_note} />
        {event.approved_amount != null && (
          <Field
            label="סכום מאושר"
            value={`${event.approved_amount} ${event.requested_currency}`}
          />
        )}
        {budgetItems.length > 0 ? (
          <div className="py-2">
            <div className="text-sm text-black/50 mb-2">אומדן תקציבי מפורט</div>
            <div className="rounded-lg border border-black/10 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-black/10 text-black/50">
                    <th className="px-3 py-2 text-start font-medium">
                      מהות ההוצאה
                    </th>
                    <th className="px-3 py-2 text-start font-medium">
                      סכום מקומי
                    </th>
                    <th className="px-3 py-2 text-start font-medium">
                      שער המרה
                    </th>
                    <th className="px-3 py-2 text-start font-medium">
                      סכום בש&quot;ח
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {budgetItems.map((item) => (
                    <tr key={item.id}>
                      <td className="px-3 py-2">{item.description}</td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {item.local_amount} {item.currency}
                      </td>
                      <td className="px-3 py-2">{item.exchange_rate}</td>
                      <td className="px-3 py-2">
                        {Number(item.amount_ils).toLocaleString("he-IL")}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-black/10 font-medium">
                    <td className="px-3 py-2" colSpan={3}>
                      סה&quot;כ בשקלים
                    </td>
                    <td className="px-3 py-2">
                      {budgetItemsTotalIls.toLocaleString("he-IL")}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        ) : (
          budgetFileUrl && (
            <Field
              label="אומדן תקציבי מפורט (הגשה ישנה, קובץ)"
              value={<FileLink label="הצגת הקובץ" url={budgetFileUrl} />}
            />
          )
        )}
      </section>

      <section className={sectionClass}>
        <h2 className={sectionTitleClass}>
          {suppliers.length > 1 ? "הספקים המקומיים" : "הספק המקומי"}
        </h2>
        {suppliers.length > 0 ? (
          <div className="space-y-3 py-2">
            {suppliers.map((s, i) => (
              <div
                key={s.id}
                className="rounded-lg border border-black/10 p-3 divide-y divide-black/5"
              >
                <div className="font-medium text-sm pb-2">
                  {suppliers.length > 1 ? `ספק ${i + 1}: ` : ""}
                  {s.name}
                </div>
                <Field label="תחום עיסוק" value={s.field} />
                {s.bank_details_known ? (
                  <>
                    <Field label="שם בעל החשבון" value={s.beneficiary_name} />
                    <Field
                      label="כתובת בעל החשבון"
                      value={s.beneficiary_address}
                    />
                    <Field label="שם הבנק" value={s.bank_name} />
                    <Field label="כתובת סניף הבנק" value={s.bank_address} />
                    <Field label="מספר חשבון" value={s.account_number} />
                    <Field label="SWIFT" value={s.swift_number} />
                    <Field
                      label="ACH Routing"
                      value={s.ach_routing_number}
                    />
                  </>
                ) : (
                  <div className="py-2">
                    <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2 py-1 inline-block">
                      פרטי חשבון הבנק טרם נמסרו על ידי השליח — יידרשו בעת
                      הזנת החשבונית, לפני ביצוע התשלום בפועל.
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <>
            <Field label="שם הספק (הגשה ישנה)" value={event.supplier_name} />
            <Field label="תחום עיסוק" value={event.supplier_field} />
            {supplierBankFileUrl && (
              <Field
                label="פרטי חשבון בנק (קובץ)"
                value={<FileLink label="הצגת הקובץ" url={supplierBankFileUrl} />}
              />
            )}
          </>
        )}
      </section>

      {quotes.length > 0 && (
        <section className={sectionClass}>
          <h2 className={sectionTitleClass}>הצעות מחיר</h2>
          {quotes.map((q, i) => (
            <Field
              key={q.slot}
              label={`הצעה ${q.slot}`}
              value={
                <div className="space-y-0.5">
                  <FileLink label="הצגת הקובץ" url={quoteUrls[i]} />
                  <div className="text-black/60">
                    {[q.contact_phone, q.contact_email]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                </div>
              }
            />
          ))}
        </section>
      )}

      <section className={sectionClass}>
        <h2 className={sectionTitleClass}>
          נראות ונוכחות קק&quot;ל באירוע ({presenceLabels.length} נבחרו)
        </h2>
        {presenceLabels.length === 0 ? (
          <p className="text-sm text-black/50 py-2">לא נבחרו אפשרויות.</p>
        ) : (
          <ul className="list-disc ps-5 py-2 space-y-1 text-sm">
            {presenceLabels.map((label: string, i: number) => (
              <li key={i}>{label}</li>
            ))}
          </ul>
        )}
      </section>

      <section className={sectionClass}>
        <h2 className={sectionTitleClass}>הצהרות</h2>
        <p className="text-sm py-2">
          {allConsentsConfirmed
            ? "כל 6 ההצהרות הנדרשות (אי-התחייבות, בחינה בוועדה, מיתוג, שער המרה, עמלות בנק, שליחת תמונות וסיכום) אושרו על ידי השליח בעת ההגשה."
            : "לא כל ההצהרות הנדרשות אושרו — כדאי לבדוק עם השליח לפני אישור."}
        </p>
      </section>

      {event.notes && (
        <section className={sectionClass}>
          <h2 className={sectionTitleClass}>הערות השליח</h2>
          <p className="text-sm py-2 whitespace-pre-wrap">{event.notes}</p>
        </section>
      )}

      <section className={sectionClass}>
        <h2 className={sectionTitleClass}>חשבוניות</h2>

        {approvedAmountIls != null && (
          <div className="py-2 grid grid-cols-3 gap-4 text-sm">
            <div className="text-black/50">אושר לאירוע (₪)</div>
            <div className="col-span-2 flex items-center gap-3 flex-wrap">
              <span>₪{Number(approvedAmountIls).toLocaleString("he-IL")}</span>
              <span className="text-black/40">·</span>
              <span>
                סה״כ חשבוניות (₪)
                {" "}
                {invoicesIlsTotal.toLocaleString("he-IL")}
              </span>
              {ilsOverage != null && ilsOverage > 0 && (
                <span className="rounded-full bg-red-100 text-red-700 px-2.5 py-0.5 text-xs font-medium">
                  חריגה של ₪{ilsOverage.toLocaleString("he-IL")}
                </span>
              )}
            </div>
          </div>
        )}

        {invoices.length === 0 ? (
          <p className="text-sm text-black/50 py-2">
            טרם הוזנו חשבוניות עבור אירוע זה.
          </p>
        ) : (
          <>
            <Field
              label="סה״כ שולם"
              value={`${invoicesPaidTotal} ${event.requested_currency}`}
            />
            <Field
              label="ממתינות לתשלום"
              value={
                invoicesPendingCount > 0 ? String(invoicesPendingCount) : null
              }
            />
            {invoices.map((inv) => (
              <div
                key={inv.id}
                className="py-2 flex items-center justify-between text-sm"
              >
                <div>
                  {inv.supplier_name} · {inv.amount} {inv.currency}
                  {inv.ils_amount != null ? ` (₪${inv.ils_amount})` : ""}
                </div>
                <StatusBadge status={inv.payment_status} />
              </div>
            ))}
          </>
        )}
      </section>

      {isActionable ? (
        <section className={sectionClass}>
          <h2 className={sectionTitleClass}>החלטה</h2>
          <div className="py-2">
            <EventReviewPanel
              eventId={event.id}
              requestedAmount={event.requested_amount}
              currency={event.requested_currency}
            />
          </div>
        </section>
      ) : (
        event.kkal_notes && (
          <section className={sectionClass}>
            <h2 className={sectionTitleClass}>הערות קק&quot;ל</h2>
            <p className="text-sm py-2">{event.kkal_notes}</p>
          </section>
        )
      )}
    </div>
  );
}
