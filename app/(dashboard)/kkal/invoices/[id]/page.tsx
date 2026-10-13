import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/status-badge";
import { InvoiceReviewPanel } from "@/components/invoice-review-panel";
import { InvoiceReturnedPanel } from "@/components/invoice-returned-panel";
import { getCountryName } from "@/lib/data/countries";
import { getSignedEventFileUrl } from "@/lib/storage/event-files";
import { formatDateDMY } from "@/lib/utils/date";

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

export default async function KkalInvoiceDetailPage({
  params,
}: PageProps<"/kkal/invoices/[id]">) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: invoice } = await supabase
    .from("invoices")
    .select(
      "id, event_id, supplier_name, supplier_field, supplier_bank_name, supplier_bank_address, supplier_bank_country, supplier_iban, supplier_swift, supplier_beneficiary_name, supplier_contact_phone, supplier_contact_email, amount, currency, payment_amount, payment_amount_currency, ils_amount, invoice_date, file_path, kkal_status, kkal_notes, kkal_reviewed_at, payment_status, paid_amount, payment_currency, paid_at, payment_receipt_file_path, payment_exchange_rate, paid_amount_ils, amiel_notes, created_at"
    )
    .eq("id", id)
    .maybeSingle();

  if (!invoice) notFound();

  const { data: event } = await supabase
    .from("events")
    .select("id, name, rep_id, requested_currency")
    .eq("id", invoice.event_id)
    .maybeSingle();

  const { data: rep } = event
    ? await supabase
        .from("reps")
        .select("first_name_he, last_name_he, country")
        .eq("profile_id", event.rep_id)
        .maybeSingle()
    : { data: null };

  const { data: profile } = event
    ? await supabase
        .from("profiles")
        .select("email")
        .eq("id", event.rep_id)
        .maybeSingle()
    : { data: null };

  const fileUrl = await getSignedEventFileUrl(supabase, invoice.file_path);
  const receiptUrl = await getSignedEventFileUrl(
    supabase,
    invoice.payment_receipt_file_path
  );

  const isActionable = invoice.kkal_status === "pending";

  const sectionClass =
    "rounded-xl bg-white border border-black/5 p-5 shadow-sm divide-y divide-black/5";
  const sectionTitleClass = "font-semibold text-(--color-brand-dark) mb-1";

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link
          href="/kkal/invoices"
          className="text-sm text-(--color-brand) underline"
        >
          ← חזרה לרשימת החשבוניות
        </Link>
        <div className="mt-3 flex items-center gap-3 flex-wrap">
          <h1 className="text-xl font-bold text-(--color-brand-dark)">
            {invoice.supplier_name}
          </h1>
          <StatusBadge status={invoice.kkal_status} />
          {invoice.kkal_status === "approved" && (
            <StatusBadge status={invoice.payment_status} />
          )}
        </div>
        <p className="text-sm text-black/50 mt-1">
          {event ? (
            <Link
              href={`/kkal/events/${event.id}`}
              className="text-(--color-brand) underline"
            >
              {event.name}
            </Link>
          ) : (
            "—"
          )}
          {rep
            ? ` · ${[rep.first_name_he, rep.last_name_he].filter(Boolean).join(" ")}`
            : ""}
          {rep?.country ? ` · ${getCountryName(rep.country)}` : ""}
          {profile?.email ? ` · ${profile.email}` : ""}
        </p>
      </div>

      <section className={sectionClass}>
        <h2 className={sectionTitleClass}>פרטי החשבונית</h2>
        <Field label="ספק" value={invoice.supplier_name} />
        <Field label="תחום עיסוק" value={invoice.supplier_field} />
        <Field
          label="סכום החשבונית (מקורי)"
          value={`${invoice.amount} ${invoice.currency}`}
        />
        <Field
          label="סכום לתשלום"
          value={`${invoice.payment_amount} ${invoice.payment_amount_currency}`}
        />
        <Field
          label="סכום בשקלים (₪)"
          value={invoice.ils_amount != null ? `₪${invoice.ils_amount}` : null}
        />
        <Field label="תאריך חשבונית" value={formatDateDMY(invoice.invoice_date)} />
        {fileUrl && (
          <Field
            label="קובץ החשבונית"
            value={
              <a
                href={fileUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-sm text-(--color-brand) underline"
              >
                הצגת הקובץ
              </a>
            }
          />
        )}
      </section>

      <section className={sectionClass}>
        <h2 className={sectionTitleClass}>פרטי חשבון הבנק</h2>
        <Field label="שם בעל החשבון" value={invoice.supplier_beneficiary_name} />
        <Field label="שם הבנק" value={invoice.supplier_bank_name} />
        <Field label="כתובת הבנק" value={invoice.supplier_bank_address} />
        <Field
          label="מדינת הבנק"
          value={
            invoice.supplier_bank_country
              ? getCountryName(invoice.supplier_bank_country)
              : null
          }
        />
        <Field label="מספר חשבון / IBAN" value={invoice.supplier_iban} />
        <Field label="SWIFT" value={invoice.supplier_swift} />
        <Field label="טלפון איש קשר בספק" value={invoice.supplier_contact_phone} />
        <Field label="מייל איש קשר בספק" value={invoice.supplier_contact_email} />
      </section>

      {invoice.kkal_notes && (
        <section className={sectionClass}>
          <h2 className={sectionTitleClass}>הערות קק&quot;ל</h2>
          <p className="text-sm py-2">{invoice.kkal_notes}</p>
        </section>
      )}

      {invoice.payment_status === "paid" && (
        <section className={sectionClass}>
          <h2 className={sectionTitleClass}>פרטי תשלום שבוצע</h2>
          <Field
            label="סכום ששולם"
            value={
              invoice.paid_amount != null
                ? `${invoice.paid_amount} ${invoice.payment_currency ?? ""}`
                : null
            }
          />
          <Field
            label="שער המרה"
            value={invoice.payment_exchange_rate ?? null}
          />
          <Field
            label="סכום ששולם בשקל (₪)"
            value={
              invoice.paid_amount_ils != null ? `₪${invoice.paid_amount_ils}` : null
            }
          />
          <Field
            label="תאריך תשלום"
            value={
              invoice.paid_at
                ? formatDateDMY(invoice.paid_at)
                : null
            }
          />
          {receiptUrl && (
            <Field
              label="אסמכתא לתשלום"
              value={
                <a
                  href={receiptUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-(--color-brand) underline"
                >
                  הצגת האסמכתא
                </a>
              }
            />
          )}
        </section>
      )}

      {invoice.payment_status === "returned_to_kkal" && (
        <section className="rounded-xl bg-red-50 border border-red-200 p-5 shadow-sm space-y-3">
          <h2 className="font-semibold text-red-700">
            עמיאל לא אישרו את החשבונית לתשלום
          </h2>
          {invoice.amiel_notes && (
            <p className="text-sm text-red-800 whitespace-pre-wrap">
              {invoice.amiel_notes}
            </p>
          )}
          <InvoiceReturnedPanel invoiceId={invoice.id} />
        </section>
      )}

      {isActionable && (
        <section className={sectionClass}>
          <h2 className={sectionTitleClass}>החלטה</h2>
          <div className="py-2">
            <InvoiceReviewPanel invoiceId={invoice.id} />
          </div>
        </section>
      )}
    </div>
  );
}
