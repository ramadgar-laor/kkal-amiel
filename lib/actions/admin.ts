"use server";

import { createClient } from "@/lib/supabase/server";
import {
  createUserSchema,
  changeRoleSchema,
  type CreateUserInput,
  type ChangeRoleInput,
} from "@/lib/validation/admin";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return { supabase, error: "not_authenticated" as const };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .single();

  if (profile?.role !== "admin") {
    return { supabase, error: "forbidden" as const };
  }

  return { supabase, user: userData.user, error: null };
}

export async function createUser(input: CreateUserInput) {
  const parsed = createUserSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "invalid_input" as const };
  }
  const v = parsed.data;

  const { supabase, user, error: authError } = await requireAdmin();
  if (authError) {
    return { error: authError };
  }

  // admin_create_user is a SECURITY DEFINER Postgres function that re-checks
  // the caller is an admin before inserting into auth.users/auth.identities —
  // this server action is not the security boundary, the DB function is.
  const { data, error } = await supabase.rpc("admin_create_user", {
    p_email: v.email,
    p_password: v.password,
    p_role: v.role,
    p_display_name: v.displayName || null,
  });

  if (error) {
    return { error: error.message };
  }

  await supabase.from("status_audit_log").insert({
    entity_type: "user",
    entity_id: data as string,
    actor_id: user!.id,
    action: "create",
    from_value: null,
    to_value: v.role,
    notes: `נוצר ע"י מנהל: ${v.email}`,
  });

  return { success: true as const, userId: data as string };
}

export async function changeUserRole(input: ChangeRoleInput) {
  const parsed = changeRoleSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "invalid_input" as const };
  }
  const v = parsed.data;

  const { supabase, user, error: authError } = await requireAdmin();
  if (authError) {
    return { error: authError };
  }

  const { data: before } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", v.profileId)
    .single();

  const { error } = await supabase
    .from("profiles")
    .update({ role: v.role })
    .eq("id", v.profileId);

  if (error) {
    return { error: error.message };
  }

  await supabase.from("status_audit_log").insert({
    entity_type: "user",
    entity_id: v.profileId,
    actor_id: user!.id,
    action: "role_change",
    from_value: before?.role ?? null,
    to_value: v.role,
    notes: null,
  });

  return { success: true as const };
}
