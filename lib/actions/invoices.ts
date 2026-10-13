"use server";

import { createClient } from "@/lib/supabase/server";
import { invoiceSchema, type InvoiceInput } from "@/lib/validation/invoice";
import { PAYMENT_STATUSES, type PaymentStatus } from "@/lib/invoices/payment-status";

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
}) {
  if (!PAYMENT_STATUSES.includes(input.paymentStatus)) {
    return { error: "invalid_input" as const };
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
  // time, not just progress through the 3 stages in order. paid_at is
  // stamped only while the status is actually "paid", and cleared again if
  // corrected away from it.
  const { error } = await supabase
    .from("invoices")
    .update({
      payment_status: input.paymentStatus,
      paid_amount: input.paidAmount ?? null,
      payment_currency: input.paymentCurrency || null,
      paid_at: input.paymentStatus === "paid" ? new Date().toISOString() : null,
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
