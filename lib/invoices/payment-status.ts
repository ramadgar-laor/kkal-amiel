// The 3 Amiel-side payment stages, matching the DB check constraint on
// `invoices.payment_status` exactly (the implicit starting value is
// "not_sent", before KKAL has even approved the invoice — Amiel only ever
// sets it to one of these 3, never back to "not_sent"). Per the original
// spec (אפיון למערכת ניהול חשבוניות.docx, section 7), this payment stage is
// the only one in the whole system meant to have a full management
// Dashboard — everything upstream stays a simple list by design.
//
// Deliberately NOT in lib/actions/invoices.ts: that file has a top-level
// "use server" directive, and Next.js only allows a "use server" file to
// export async functions -- a plain value export like this one breaks at
// runtime (not at build/lint time) the moment the action is actually
// invoked. Shared constants/types used by both the server action and
// client components live here instead.
// 2 further statuses Amiel can set from the same panel (item 6 of the
// invoice-overhaul spec): "returned_to_kkal" sends the invoice back to
// kkal's dashboard with a required reason (kkal then either sends it back
// to Amiel to continue, or rejects it outright -- see resolveReturnedInvoice
// in lib/actions/invoices.ts); "returned_to_rep" sends it back to the rep to
// fix bank details only (see updateInvoiceBankDetails), after which it
// returns here as "received_for_review" automatically.
export const PAYMENT_STATUSES = [
  "received_for_review",
  "approved_for_payment",
  "paid",
  "returned_to_kkal",
  "returned_to_rep",
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

// The 2 statuses above require Amiel to state a reason (reused from the
// amiel_notes column) -- enforced both client-side (amiel-payment-panel.tsx)
// and server-side (updatePaymentStatus).
export const PAYMENT_STATUSES_REQUIRING_NOTES: PaymentStatus[] = [
  "returned_to_kkal",
  "returned_to_rep",
];
