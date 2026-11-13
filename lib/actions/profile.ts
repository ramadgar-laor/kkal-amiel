"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { COUNTRIES_EN } from "@/lib/data/countries";
import { US_COUNTRY_CODE, US_STATE_CODES } from "@/lib/data/us-states";
import { OTHER_OPTION } from "@/lib/data/kkal-reps-options";
import {
  repProfileSchema,
  type RepProfileInput,
} from "@/lib/validation/rep-profile";

// Self-service actions behind /profile. The database enforces the real
// limits (see the profiles_guard_self_update trigger and the
// update_my_rep_details function): a user can change only their own details and,
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

// Ambassadors: every registration detail that can change over time (see
// lib/validation/rep-profile.ts for what's included and what isn't). The
// update_my_rep_details DB function only touches those columns, keeps the
// display name in sync, and records a self_edit entry in the audit log so
// KKL can see what the ambassador changed.
export async function updateMyRepDetails(input: RepProfileInput): Promise<Result> {
  const parsed = repProfileSchema.safeParse(input);
  if (!parsed.success) return { error: "invalid_input" };
  const v = parsed.data;

  const { supabase, user } = await currentUser();
  if (!user) return { error: "not_authenticated" };

  const resolve = (value: string | undefined, other: string | undefined) =>
    value === OTHER_OPTION ? (other ?? "") : (value ?? "");

  const { error } = await supabase.rpc("update_my_rep_details", {
    p: {
      first_name_he: v.firstNameHe,
      last_name_he: v.lastNameHe,
      first_name_local: v.firstNameLocal,
      last_name_local: v.lastNameLocal,
      whatsapp_phone: v.whatsappPhone,
      mission_phone: v.missionPhone ?? "",
      marital_status:
        v.maritalStatus === "other"
          ? (v.maritalStatusOther ?? "")
          : (v.maritalStatus ?? ""),
      mailing_institution: v.mailingInstitution,
      address: v.address ?? "",
      city: v.city,
      state: v.state ?? "",
      zip: v.zip ?? "",
      country: v.country,
      organization: resolve(v.organization, v.organizationOther),
      mission_location_name: v.missionLocationName,
      institution_type: resolve(v.institutionType, v.institutionTypeOther),
      institution_city: v.institutionCity,
      main_role: v.mainRole,
      mission_start_date: v.missionStartDate ?? "",
      mission_end_date_expected: v.missionEndDateExpected ?? "",
    },
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
