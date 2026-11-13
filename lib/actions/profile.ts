"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { COUNTRIES_EN } from "@/lib/data/countries";
import { US_COUNTRY_CODE, US_STATE_CODES } from "@/lib/data/us-states";

// Self-service actions behind /profile. The database enforces the real
// limits (see the profiles_guard_self_update trigger and the
// update_my_rep_name function): a user can change only their own name and,
// for KKL staff, their own responsibility areas -- never their role or
// email.

const COUNTRY_CODES = new Set(COUNTRIES_EN.map((c) => c.code));

type Result = { success: true } | { error: string };

async function currentUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return { supabase, user: data.user };
}

// Staff (KKL / Amiel / admin): a single display name.
export async function updateMyDisplayName(displayName: string): Promise<Result> {
  const name = displayName.trim();
  if (!name) return { error: "name_required" };
  const { supabase, user } = await currentUser();
  if (!user) return { error: "not_authenticated" };

  const { error } = await supabase
    .from("profiles")
    .update({ display_name: name })
    .eq("id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return { success: true };
}

// Ambassadors: Hebrew + local-language first/last names (the display name
// is derived from the Hebrew name, same as at registration).
export async function updateMyRepName(values: {
  firstNameHe: string;
  lastNameHe: string;
  firstNameLocal: string;
  lastNameLocal: string;
}): Promise<Result> {
  if (!values.firstNameHe.trim() || !values.lastNameHe.trim()) {
    return { error: "name_required" };
  }
  const { supabase, user } = await currentUser();
  if (!user) return { error: "not_authenticated" };

  const { error } = await supabase.rpc("update_my_rep_name", {
    p_first_name_he: values.firstNameHe,
    p_last_name_he: values.lastNameHe,
    p_first_name_local: values.firstNameLocal,
    p_last_name_local: values.lastNameLocal,
  });
  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return { success: true };
}

// KKL staff: which countries (and, for the US, which states) they handle.
export async function updateMyRegions(
  countries: string[],
  usStates: string[]
): Promise<Result> {
  const cleanCountries = Array.from(new Set(countries)).filter((c) =>
    COUNTRY_CODES.has(c)
  );
  const cleanStates = cleanCountries.includes(US_COUNTRY_CODE)
    ? Array.from(new Set(usStates)).filter((s) => US_STATE_CODES.has(s))
    : [];

  const { supabase, user } = await currentUser();
  if (!user) return { error: "not_authenticated" };

  const { error } = await supabase
    .from("profiles")
    .update({
      responsible_countries: cleanCountries,
      responsible_us_states: cleanStates,
    })
    .eq("id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/profile");
  revalidatePath("/admin/users");
  return { success: true };
}
