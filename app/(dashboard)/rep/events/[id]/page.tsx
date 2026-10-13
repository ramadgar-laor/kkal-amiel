import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/status-badge";
import { getCountryName } from "@/lib/data/countries";
import { InvoiceForm } from "@/components/invoice-form";
import { InvoiceBankEditPanel } from "@/components/invoice-bank-edit-panel";
import { formatDateDMY } from "@/lib/utils/date";
import { getCurrentLocale } from "@/lib/i18n/server";
import { getDictionary } from "@/lib/i18n/dictionaries";

function t(template: string, values: Record<string, string | number> = {}) {
  return Object.entries(values).reduce(
    (acc, [key, value]) => acc.replaceAll(`{${key}}`, String(value)),
    template
  );
}

export default async function RepEventDetailPage({
  params,
}: PageProps<"/rep/events/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const locale = await getCurrentLocale();
  const dict = getDictionary(locale);
  const d = dict.repEventDetail;

  const { data: event } = await supabase
    .from("events")
    .select(
      "id, name, purpose, start_date, end_date, city, country, target_audience, program_description, track, requested_amount, requested_currency, approved_amount, approved_amount_ils, status, kkal_notes, host_org_name, host_manager_name, host_manager_phone, host_manager_email, participants_count, transfer_amount_note, supplier_name, supplier_field, kkal_presence_selections, notes"
    )
    .eq("id", id)
    .single();

  if (!event) notFound();

  const { data: suppliers } = await supabase
    .from("event_suppliers")
    .select(
      "id, name, field, bank_details_known, beneficiary_name, bank_name, bank_address, account_number, swift_number"
    )
    .eq("event_id", event.id)
    .order("sort_order", { ascending: true });

  const { data: invoices } = await supabase
    .from("invoices")
    .select(
      "id, supplier_name, amount, currency, ils_amount, invoice_date, kkal_status, payment_status, amiel_notes, supplier_bank_name, supplier_bank_address, supplier_bank_country, supplier_iban, supplier_swift, supplier_beneficiary_name"
    )
    .eq("event_id", event.id)
    .order("created_at", { ascending: false });

  const suppliersSummary = (suppliers ?? []).length
    ? (suppliers ?? [])
        .map(
          (s) =>
            `${[s.name, s.field].filter(Boolean).join(" · ")}${
              s.bank_details_known ? "" : d.bankDetailsNotProvided
            }`
        )
        .join("; ")
    : [event.supplier_name, event.supplier_field].filter(Boolean).join(" · ");

  const rows: [string, string | null | undefined][] = [
    [d.purposeLabel, event.purpose],
    [
      d.datesLabel,
      `${formatDateDMY(event.start_date)} – ${formatDateDMY(event.end_date)}`,
    ],
    [
      d.locationLabel,
      [event.city, getCountryName(event.country, locale)].filter(Boolean).join(", "),
    ],
    [d.hostOrgLabel, event.host_org_name],
    [
      d.hostManagerLabel,
      [event.host_manager_name, event.host_manager_phone, event.host_manager_email]
        .filter(Boolean)
        .join(" · "),
    ],
    [d.targetAudienceLabel, event.target_audience],
    [
      d.participantsCountLabel,
      event.participants_count != null ? String(event.participants_count) : null,
    ],
    [d.programDescriptionLabel, event.program_description],
    [d.trackLabel, event.track === "ongoing" ? d.trackOngoing : d.trackOneTime],
    [d.requestedAmountLabel, `${event.requested_amount} ${event.requested_currency}`],
    [d.transferNoteLabel, event.transfer_amount_note],
    [
      (suppliers ?? []).length > 1
        ? d.suppliersLabelPlural
        : d.suppliersLabelSingular,
      suppliersSummary || null,
    ],
    [
      d.kkalPresenceSelectedTitle,
      event.kkal_presence_selections?.length
        ? t(d.kkalPresenceSelectedLabel, {
            count: event.kkal_presence_selections.length,
          })
        : null,
    ],
    [dict.common.notes, event.notes],
  ];

  if (event.approved_amount != null) {
    rows.push([
      d.approvedAmountLabel,
      `${event.approved_amount} ${event.requested_currency}`,
    ]);
  }

  // Lets the rep see where they stand against the approved ILS budget as
  // invoices come in -- informational only, nothing here blocks submitting
  // an invoice that would put them over.
  const invoicesIlsTotal = (invoices ?? []).reduce(
    (sum, inv) => sum + Number(inv.ils_amount ?? 0),
    0
  );
  const approvedAmountIls = event.approved_amount_ils ?? event.approved_amount;
  const ilsOverage =
    approvedAmountIls != null ? invoicesIlsTotal - approvedAmountIls : null;

  return (
    <div className="max-w-2xl">
      <Link href="/rep" className="text-sm text-(--color-brand) underline">
        ← {dict.common.back}
      </Link>
      <div className="mt-3 flex items-center gap-3">
        <h1 className="text-xl font-bold text-(--color-brand-dark)">
          {event.name}
        </h1>
        <StatusBadge status={event.status} locale={locale} />
      </div>

      <div className="mt-6 rounded-xl bg-white border border-black/5 p-6 shadow-sm divide-y divide-black/5">
        {rows.map(([label, value]) =>
          value ? (
            <div key={label} className="py-2.5 grid grid-cols-3 gap-4 text-sm">
              <div className="text-black/50">{label}</div>
              <div className="col-span-2">{value}</div>
            </div>
          ) : null
        )}
      </div>

      {event.kkal_notes && (
        <div className="mt-4 rounded-xl bg-(--color-brand-light) p-4 text-sm">
          <div className="font-medium text-(--color-brand-dark)">
            {d.kkalNotesTitle}
          </div>
          <div className="mt-1">{event.kkal_notes}</div>
        </div>
      )}

      {(event.status === "approved" || event.status === "partially_approved") && (
        <div className="mt-6 space-y-4">
          {approvedAmountIls != null && (
            <div className="rounded-xl bg-white border border-black/5 p-4 shadow-sm">
              <div className="flex items-center gap-3 flex-wrap text-sm">
                <div>
                  <span className="text-black/50">
                    {d.budgetStatusApprovedLabel}
                  </span>{" "}
                  <span className="font-medium">
                    ₪{Number(approvedAmountIls).toLocaleString(
                      locale === "en" ? "en-US" : "he-IL"
                    )}
                  </span>
                </div>
                <span className="text-black/30">·</span>
                <div>
                  <span className="text-black/50">
                    {d.budgetStatusInvoicesTotalLabel}
                  </span>{" "}
                  <span className="font-medium">
                    ₪{invoicesIlsTotal.toLocaleString(
                      locale === "en" ? "en-US" : "he-IL"
                    )}
                  </span>
                </div>
                {ilsOverage != null && ilsOverage > 0 && (
                  <span className="rounded-full bg-red-100 text-red-700 px-2.5 py-0.5 text-xs font-medium">
                    {t(d.budgetStatusOverageLabel, {
                      amount: ilsOverage.toLocaleString(
                        locale === "en" ? "en-US" : "he-IL"
                      ),
                    })}
                  </span>
                )}
              </div>
            </div>
          )}

          {invoices && invoices.length > 0 && (
            <div className="rounded-xl bg-white border border-black/5 p-4 shadow-sm">
              <h2 className="font-semibold text-(--color-brand-dark) mb-2">
                {d.invoicesEnteredTitle}
              </h2>
              <div className="divide-y divide-black/5">
                {invoices.map((inv) => (
                  <div key={inv.id} className="py-2">
                    <div className="flex items-center justify-between text-sm gap-3">
                      <div>
                        {inv.supplier_name} · {inv.amount} {inv.currency}
                        {inv.ils_amount != null ? ` (₪${inv.ils_amount})` : ""} ·{" "}
                        {formatDateDMY(inv.invoice_date)}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <StatusBadge status={inv.kkal_status} locale={locale} />
                        {inv.kkal_status === "approved" && (
                          <StatusBadge status={inv.payment_status} locale={locale} />
                        )}
                      </div>
                    </div>

                    {inv.payment_status === "returned_to_rep" && (
                      <div className="mt-3 rounded-lg bg-(--color-gold-light) p-3 space-y-2">
                        <p className="text-sm font-medium text-(--color-gold)">
                          {d.returnedToRepNotice}
                        </p>
                        {inv.amiel_notes && (
                          <p className="text-sm whitespace-pre-wrap">
                            {inv.amiel_notes}
                          </p>
                        )}
                        <InvoiceBankEditPanel
                          invoiceId={inv.id}
                          dict={dict}
                          locale={locale}
                          defaultValues={{
                            supplierBankName: inv.supplier_bank_name ?? "",
                            supplierBankAddress: inv.supplier_bank_address ?? "",
                            supplierBankCountry: inv.supplier_bank_country ?? "",
                            supplierIban: inv.supplier_iban ?? "",
                            supplierSwift: inv.supplier_swift ?? "",
                            supplierBeneficiaryName:
                              inv.supplier_beneficiary_name ?? "",
                          }}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <InvoiceForm
            eventId={event.id}
            dict={dict}
            locale={locale}
            suppliers={(suppliers ?? []).map((s) => ({
              id: s.id,
              name: s.name,
              field: s.field,
              bankDetailsKnown: s.bank_details_known,
              beneficiaryName: s.beneficiary_name,
              bankName: s.bank_name,
              bankAddress: s.bank_address,
              accountNumber: s.account_number,
              swiftNumber: s.swift_number,
            }))}
          />
        </div>
      )}
    </div>
  );
}
