"use server";

import { createClient } from "@/lib/supabase/server";
import { invoiceSchema, type InvoiceInput } from "@/lib/validation/invoice";
import {
  PAYMENT_STATUSES,
  PAYMENT_STATUSES_REQUIRING_NOTES,
  type PaymentStatus,
} from "@/lib/invoices/payment-status";

export async function submitInvoice(input: InvoiceInput) {
  const parsed = invoiceSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "invalid_input" as const };
  }
  const v = parsed.data;

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return { error: "not_authenticated" as const };
  }

  const { error } = await supabase.from("invoices").insert({
    event_id: v.eventId,
    supplier_name: v.supplierName,
    supplier_field: v.supplierField || null,
    supplier_bank_name: v.supplierBankName,
    supplier_bank_address: v.supplierBankAddress,
    supplier_bank_country: v.supplierBankCountry,
    supplier_iban: v.supplierIban,
    supplier_swift: v.supplierSwift,
    supplier_beneficiary_name: v.supplierBeneficiaryName,
    supplier_contact_phone: v.supplierContactPhone || null,
    supplier_contact_email: v.supplierContactEmail || null,
    amount: v.amount,
    currency: v.currency,
    payment_amount: v.paymentAmount,
    payment_amount_currency: v.paymentAmountCurrency,
    ils_amount: v.ilsAmount,
    invoice_date: v.invoiceDate,
    file_path: v.filePath,
  });

  if (error) {
    // RLS blocks this insert when the event isn't the rep's own, or the
    // event isn't (partially) approved yet (invoices_rep_insert_own).
    return { error: error.message };
  }

  return { success: true as const };
}

export type InvoiceDecision = "approved" | "rejected";

export async function decideInvoice(input: {
  id: string;
  decision: InvoiceDecision;
  notes?: string;
}) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return { error: "not_authenticated" as const };
  }

  const { data: before } = await supabase
    .from("invoices")
    .select("kkal_status")
    .eq("id", input.id)
    .single();

  const { error } = await supabase
    .from("invoices")
    .update({
      kkal_status: input.decision,
      kkal_notes: input.notes || null,
      kkal_reviewed_by: userData.user.id,
      kkal_reviewed_at: new Date().toISOString(),
      // The moment KKAL approves, the invoice has effectively crossed over
      // to Amiel -- so payment_status moves straight from its default
      // "not_sent" to "received_for_review" instead of sitting unsent.
      // (Mirrors how resolveReturnedInvoice below sets the same value when
      // sending a returned invoice back to Amiel.)
      ...(input.decision === "approved"
        ? { payment_status: "received_for_review" as const }
        : {}),
    })
    .eq("id", input.id);

  if (error) {
    return { error: error.message };
  }

  await supabase.from("status_audit_log").insert({
    entity_type: "invoice",
    entity_id: input.id,
    actor_id: userData.user.id,
    action: "review",
    from_value: before?.kkal_status ?? null,
    to_value: input.decision,
    notes: input.notes || null,
  });

  return { success: true as const };
}

export async function updatePaymentStatus(input: {
  id: string;
  paymentStatus: PaymentStatus;
  paidAmount?: number | null;
  paymentCurrency?: string | null;
  amielNotes?: string | null;
  // Required together once the invoice is actually marked "paid" (items 7
  // & 9): the receipt file, the exchange rate Amiel used for the transfer
  // (Amiel only pays in USD/EUR but needs a running ILS total), the
  // resulting ILS amount, and the date the transfer was made.
  paymentReceiptFilePath?: string | null;
  paymentExchangeRate?: number | null;
  paidAmountIls?: number | null;
  paidDate?: string | null;
}) {
  if (!PAYMENT_STATUSES.includes(input.paymentStatus)) {
    return { error: "invalid_input" as const };
  }
  if (
    PAYMENT_STATUSES_REQUIRING_NOTES.includes(input.paymentStatus) &&
    !input.amielNotes?.trim()
  ) {
    return { error: "notes_required" as const };
  }
  if (
    input.paymentStatus === "paid" &&
    (!input.paymentReceiptFilePath ||
      !input.paymentExchangeRate ||
      !input.paidAmountIls ||
      !input.paidDate)
  ) {
    return { error: "paid_fields_required" as const };
  }

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return { error: "not_authenticated" as const };
  }

  const { data: before } = await supabase
    .from("invoices")
    .select("payment_status")
    .eq("id", input.id)
    .single();

  // Deliberately a single select-plus-fields-plus-save form rather than a
  // forward-only wizard, so Amiel can correct a mistaken status at any
  // time, not just progress through the 3 stages in order. The paid-only
  // fields are stamped only while the status is actually "paid", and
  // cleared again if corrected away from it.
  const isPaid = input.paymentStatus === "paid";
  const { error } = await supabase
    .from("invoices")
    .update({
      payment_status: input.paymentStatus,
      paid_amount: input.paidAmount ?? null,
      payment_currency: input.paymentCurrency || null,
      paid_at: isPaid ? input.paidDate : null,
      payment_receipt_file_path: isPaid ? input.paymentReceiptFilePath : null,
      payment_exchange_rate: isPaid ? input.paymentExchangeRate : null,
      paid_amount_ils: isPaid ? input.paidAmountIls : null,
      amiel_notes: input.amielNotes || null,
    })
    .eq("id", input.id);

  if (error) {
    return { error: error.message };
  }

  await supabase.from("status_audit_log").insert({
    entity_type: "invoice",
    entity_id: input.id,
    actor_id: userData.user.id,
    action: "payment_update",
    from_value: before?.payment_status ?? null,
    to_value: input.paymentStatus,
    notes: input.amielNotes || null,
  });

  return { success: true as const };
}

// kkal-side resolution for an invoice Amiel sent back with
// payment_status = "returned_to_kkal" (item 6). kkal_status deliberately
// stays "approved" throughout this whole payment flow -- only
// payment_status changes -- *except* for the "reject" action here, which
// is the one case kkal needs to actually reverse their original approval
// (removing the invoice from Amiel's queue for good, since
// invoices_amiel_read_approved only shows kkal_status = 'approved' rows).
export type ReturnedInvoiceResolution = "send_to_amiel" | "reject";

export async function resolveReturnedInvoice(input: {
  id: string;
  resolution: ReturnedInvoiceResolution;
  notes?: string;
}) {
  if (input.resolution === "reject" && !input.notes?.trim()) {
    return { error: "notes_required" as const };
  }

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return { error: "not_authenticated" as const };
  }

  const { data: before } = await supabase
    .from("invoices")
    .select("kkal_status, payment_status")
    .eq("id", input.id)
    .single();

  if (before?.payment_status !== "returned_to_kkal") {
    return { error: "invalid_state" as const };
  }

  const { error } =
    input.resolution === "send_to_amiel"
      ? await supabase
          .from("invoices")
          .update({ payment_status: "received_for_review" })
          .eq("id", input.id)
      : await supabase
          .from("invoices")
          .update({
            kkal_status: "rejected",
            kkal_notes: input.notes,
            kkal_reviewed_by: userData.user.id,
            kkal_reviewed_at: new Date().toISOString(),
          })
          .eq("id", input.id);

  if (error) {
    return { error: error.message };
  }

  await supabase.from("status_audit_log").insert({
    entity_type: "invoice",
    entity_id: input.id,
    actor_id: userData.user.id,
    action: input.resolution === "send_to_amiel" ? "payment_update" : "review",
    from_value:
      input.resolution === "send_to_amiel"
        ? before?.payment_status ?? null
        : before?.kkal_status ?? null,
    to_value:
      input.resolution === "send_to_amiel" ? "received_for_review" : "rejected",
    notes: input.notes || null,
  });

  return { success: true as const };
}

// Rep-side edit for an invoice Amiel sent back with
// payment_status = "returned_to_rep" (item 6). RLS
// (invoices_rep_update_returned) already restricts this to the rep's own
// event and only while payment_status is exactly "returned_to_rep" -- this
// action additionally restricts which *columns* can be touched (bank
// details only, never amounts or the invoice file), and always moves the
// invoice back to Amiel's queue on save.
export async function updateInvoiceBankDetails(input: {
  id: string;
  supplierBankName: string;
  supplierBankAddress: string;
  supplierBankCountry: string;
  supplierIban: string;
  supplierSwift: string;
  supplierBeneficiaryName: string;
}) {
  if (
    !input.supplierBankName.trim() ||
    !input.supplierBankAddress.trim() ||
    !input.supplierBankCountry.trim() ||
    !input.supplierIban.trim() ||
    !input.supplierSwift.trim() ||
    !input.supplierBeneficiaryName.trim()
  ) {
    return { error: "invalid_input" as const };
  }

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return { error: "not_authenticated" as const };
  }

  const { error } = await supabase
    .from("invoices")
    .update({
      supplier_bank_name: input.supplierBankName,
      supplier_bank_address: input.supplierBankAddress,
      supplier_bank_country: input.supplierBankCountry,
      supplier_iban: input.supplierIban,
      supplier_swift: input.supplierSwift,
      supplier_beneficiary_name: input.supplierBeneficiaryName,
      payment_status: "received_for_review",
    })
    .eq("id", input.id);

  if (error) {
    // RLS blocks this when the invoice isn't the rep's own, or it's not
    // currently in "returned_to_rep" state (invoices_rep_update_returned).
    return { error: error.message };
  }

  await supabase.from("status_audit_log").insert({
    entity_type: "invoice",
    entity_id: input.id,
    actor_id: userData.user.id,
    action: "payment_update",
    from_value: "returned_to_rep",
    to_value: "received_for_review",
    notes: "השליח עדכן פרטי בנק",
  });

  return { success: true as const };
}
