"use server";

import { createClient } from "@/lib/supabase/server";
import { invoiceSchema, type InvoiceInput } from "@/lib/validation/invoice";

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
    supplier_iban: v.supplierIban,
    supplier_swift: v.supplierSwift || null,
    supplier_beneficiary_name: v.supplierBeneficiaryName,
    supplier_contact_phone: v.supplierContactPhone || null,
    supplier_contact_email: v.supplierContactEmail || null,
    amount: v.amount,
    currency: v.currency,
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
