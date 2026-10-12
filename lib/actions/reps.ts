"use server";

import { createClient } from "@/lib/supabase/server";
import { repEditSchema, type RepEditInput, type RepStatus } from "@/lib/validation/rep-edit";

export async function reviewRep(input: {
  profileId: string;
  decision: "approved" | "rejected";
  notes?: string;
}) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return { error: "not_authenticated" as const };
  }

  const { data: before } = await supabase
    .from("reps")
    .select("status")
    .eq("profile_id", input.profileId)
    .single();

  const { error } = await supabase
    .from("reps")
    .update({
      status: input.decision,
      kkal_notes: input.notes || null,
      reviewed_by: userData.user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("profile_id", input.profileId);

  if (error) {
    return { error: error.message };
  }

  await supabase.from("status_audit_log").insert({
    entity_type: "rep",
    entity_id: input.profileId,
    actor_id: userData.user.id,
    action: "review",
    from_value: before?.status ?? null,
    to_value: input.decision,
    notes: input.notes || null,
  });

  return { success: true as const };
}

/**
 * Quick status change from the full reps directory (e.g. marking a rep
 * inactive, or reopening a rejected one). Used by the inline status select.
 */
export async function setRepStatus(profileId: string, status: RepStatus) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return { error: "not_authenticated" as const };
  }

  const { data: before } = await supabase
    .from("reps")
    .select("status")
    .eq("profile_id", profileId)
    .single();

  const { error } = await supabase
    .from("reps")
    .update({
      status,
      reviewed_by: userData.user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("profile_id", profileId);

  if (error) {
    return { error: error.message };
  }

  if (before?.status !== status) {
    await supabase.from("status_audit_log").insert({
      entity_type: "rep",
      entity_id: profileId,
      actor_id: userData.user.id,
      action: "status_change",
      from_value: before?.status ?? null,
      to_value: status,
      notes: null,
    });
  }

  return { success: true as const };
}

/**
 * Full edit of a rep's details by KKL/admin staff (name, contact info,
 * mission details, address, participation level, status and notes).
 */
export async function updateRepDetails(profileId: string, input: RepEditInput) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return { error: "not_authenticated" as const };
  }

  const parsed = repEditSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "invalid_input" as const };
  }
  const values = parsed.data;

  const { data: before } = await supabase
    .from("reps")
    .select("status")
    .eq("profile_id", profileId)
    .single();

  const { error } = await supabase
    .from("reps")
    .update({
      first_name_he: values.firstNameHe,
      last_name_he: values.lastNameHe,
      first_name_local: values.firstNameLocal || null,
      last_name_local: values.lastNameLocal || null,
      whatsapp_phone: values.whatsappPhone,
      mission_phone: values.missionPhone || null,
      date_of_birth: values.dateOfBirth || null,
      marital_status: values.maritalStatus || null,
      mailing_institution: values.mailingInstitution || null,
      address: values.address || null,
      city: values.city || null,
      state: values.state || null,
      zip: values.zip || null,
      country: values.country || null,
      organization: values.organization || null,
      activity_level: values.activityLevel || null,
      mission_location_name: values.missionLocationName || null,
      institution_type: values.institutionType || null,
      institution_city: values.institutionCity || null,
      main_role: values.mainRole || null,
      mission_start_date: values.missionStartDate || null,
      mission_end_date_expected: values.missionEndDateExpected || null,
      status: values.status,
      kkal_notes: values.kkalNotes || null,
      registration_notes: values.registrationNotes || null,
      reviewed_by: userData.user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("profile_id", profileId);

  if (error) {
    return { error: error.message };
  }

  if (before?.status !== values.status) {
    await supabase.from("status_audit_log").insert({
      entity_type: "rep",
      entity_id: profileId,
      actor_id: userData.user.id,
      action: "edit",
      from_value: before?.status ?? null,
      to_value: values.status,
      notes: 'עריכה ידנית של פרטי השליח על ידי צוות קק"ל',
    });
  }

  return { success: true as const };
}
