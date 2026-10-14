"use server";

import { createClient } from "@/lib/supabase/server";
import {
  amielBudgetAllocationSchema,
  type AmielBudgetAllocationInput,
} from "@/lib/validation/amiel-budget";

// Records one top-up to Amiel's internal budget ledger (the lump sum KKL
// transfers Amiel at the start of the year, covering every project's
// expenses across the whole system -- see amiel_budget_allocations and the
// comment on /amiel/budget/page.tsx). RLS on that table restricts both the
// insert below and every read of it to amiel/admin, so this never needs an
// explicit role check here the way the Excel export routes do.
export async function addBudgetAllocation(input: AmielBudgetAllocationInput) {
  const parsed = amielBudgetAllocationSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "invalid_input" as const };
  }
  const v = parsed.data;

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return { error: "not_authenticated" as const };
  }

  const { error } = await supabase.from("amiel_budget_allocations").insert({
    amount_ils: v.amountIls,
    note: v.note?.trim() || null,
    created_by: userData.user.id,
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true as const };
}
