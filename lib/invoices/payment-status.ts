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
export const PAYMENT_STATUSES = [
  "received_for_review",
  "approved_for_payment",
  "paid",
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];
