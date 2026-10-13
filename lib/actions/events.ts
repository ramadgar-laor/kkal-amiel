"use server";

import { createClient } from "@/lib/supabase/server";
import { eventSchema, type EventInput } from "@/lib/validation/event";

export async function createEvent(input: EventInput) {
  const parsed = eventSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "invalid_input" as const };
  }
  const v = parsed.data;

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return { error: "not_authenticated" as const };
  }

  const { data: event, error } = await supabase
    .from("events")
    .insert({
      rep_id: userData.user.id,
      name: v.name,
      purpose: null,
      start_date: v.startDate,
      end_date: v.endDate,
      city: v.city || null,
      country: v.country,
      target_audience: v.targetAudience,
      program_description: v.programDescription,
      track: v.track,
      requested_amount: v.requestedAmount,
      requested_currency: "ILS",
      org_affiliation: v.orgAffiliation,
      registered_to_program: v.registeredToProgram === "yes",
      in_whatsapp_group: v.inWhatsappGroup === "yes",
      host_org_name: v.hostOrgName,
      host_manager_name: v.hostManagerName,
      host_manager_phone: v.hostManagerPhone,
      host_manager_email: v.hostManagerEmail,
      participants_count: v.participantsCount,
      ongoing_program_description: v.ongoingProgramDescription || null,
      transfer_amount_note: v.transferAmountNote,
      kkal_presence_selections: v.kkalPresenceSelections,
      consent_no_commitment: v.consentNoCommitment === "yes",
      consent_committee_review: v.consentCommitteeReview === "yes",
      consent_follow_branding: v.consentFollowBranding === "yes",
      consent_exchange_rate: v.consentExchangeRate === "yes",
      consent_bank_fees: v.consentBankFees === "yes",
      consent_followup_photos: v.consentFollowupPhotos === "yes",
      notes: v.notes || null,
    })
    .select("id")
    .single();

  if (error || !event) {
    // RLS blocks this insert for a rep whose registration isn't approved yet.
    return { error: error?.message ?? "insert_failed" };
  }

  const quoteRows = [
    { slot: 1, q: v.quote1 },
    { slot: 2, q: v.quote2 },
    { slot: 3, q: v.quote3 },
  ]
    .filter(({ q }) => q?.filePath)
    .map(({ slot, q }) => ({
      event_id: event.id,
      slot,
      quote_file_path: q!.filePath as string,
      contact_phone: q!.contactPhone || null,
      contact_email: q!.contactEmail || null,
    }));

  if (quoteRows.length > 0) {
    const { error: quotesError } = await supabase
      .from("event_quotes")
      .insert(quoteRows);
    if (quotesError) {
      // The event itself was created successfully; surface this as a
      // partial-failure message rather than losing the submission.
      return { error: `quotes_failed: ${quotesError.message}` };
    }
  }

  const budgetItemRows = v.budgetItems.map((item, i) => ({
    event_id: event.id,
    description: item.description,
    local_amount: item.localAmount,
    currency: item.currency,
    exchange_rate: item.exchangeRate,
    // Computed server-side from the other two fields rather than trusted
    // from the client — the client only ever displays it.
    amount_ils: Math.round(item.localAmount * item.exchangeRate * 100) / 100,
    sort_order: i,
  }));

  const { error: budgetItemsError } = await supabase
    .from("event_budget_items")
    .insert(budgetItemRows);
  if (budgetItemsError) {
    return { error: `budget_items_failed: ${budgetItemsError.message}` };
  }

  const supplierRows = v.suppliers.map((s, i) => ({
    event_id: event.id,
    name: s.name,
    field: s.field,
    bank_details_known: s.bankDetailsKnown === "yes",
    beneficiary_name: s.bankDetailsKnown === "yes" ? s.beneficiaryName || null : null,
    beneficiary_address:
      s.bankDetailsKnown === "yes" ? s.beneficiaryAddress || null : null,
    bank_name: s.bankDetailsKnown === "yes" ? s.bankName || null : null,
    bank_address: s.bankDetailsKnown === "yes" ? s.bankAddress || null : null,
    bank_country: s.bankDetailsKnown === "yes" ? s.bankCountry || null : null,
    account_number: s.bankDetailsKnown === "yes" ? s.accountNumber || null : null,
    ach_routing_number:
      s.bankDetailsKnown === "yes" ? s.achRoutingNumber || null : null,
    swift_number: s.bankDetailsKnown === "yes" ? s.swiftNumber || null : null,
    sort_order: i,
  }));

  const { error: suppliersError } = await supabase
    .from("event_suppliers")
    .insert(supplierRows);
  if (suppliersError) {
    return { error: `suppliers_failed: ${suppliersError.message}` };
  }

  return { success: true as const };
}

export type EventDecision =
  | "approved"
  | "partially_approved"
  | "rejected"
  | "info_requested";

export async function reviewEvent(input: {
  id: string;
  decision: EventDecision;
  approvedAmount?: number;
  notes?: string;
}) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return { error: "not_authenticated" as const };
  }

  const { data: before } = await supabase
    .from("events")
    .select("status, requested_amount, requested_currency")
    .eq("id", input.id)
    .single();

  const approvedAmount =
    input.decision === "approved"
      ? before?.requested_amount ?? null
      : input.decision === "partially_approved"
        ? input.approvedAmount ?? null
        : null;

  // kkal approves events on their ILS value (item 5) -- every event created
  // through the current form is denominated in ILS already
  // (createEvent() hardcodes requested_currency: "ILS"), so approved_amount
  // already IS the ILS figure in that case. approved_amount_ils is kept as
  // an explicit, separately-named column so it's unambiguous on dashboards
  // and robust against any non-ILS legacy event.
  const approvedAmountIls =
    approvedAmount != null && (before?.requested_currency ?? "ILS") === "ILS"
      ? approvedAmount
      : null;

  const { error } = await supabase
    .from("events")
    .update({
      status: input.decision,
      approved_amount: approvedAmount,
      approved_amount_ils: approvedAmountIls,
      kkal_notes: input.notes || null,
      reviewed_by: userData.user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", input.id);

  if (error) {
    return { error: error.message };
  }

  await supabase.from("status_audit_log").insert({
    entity_type: "event",
    entity_id: input.id,
    actor_id: userData.user.id,
    action: "review",
    from_value: before?.status ?? null,
    to_value: input.decision,
    notes: input.notes || null,
  });

  return { success: true as const };
}
