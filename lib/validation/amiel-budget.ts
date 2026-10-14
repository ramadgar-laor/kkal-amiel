import { z } from "zod";

// A single top-up to Amiel's internal budget ledger (see
// lib/actions/amiel-budget.ts and amiel_budget_allocations) -- always a
// positive amount in ILS, since this tracks money KKL actually transferred
// to Amiel, not a correction. A mistaken entry gets removed from the
// Supabase table directly rather than through a negative-amount workaround.
export const amielBudgetAllocationSchema = z.object({
  amountIls: z.coerce.number().positive(),
  note: z.string().trim().max(500).optional().or(z.literal("")),
});
export type AmielBudgetAllocationInput = z.infer<
  typeof amielBudgetAllocationSchema
>;
