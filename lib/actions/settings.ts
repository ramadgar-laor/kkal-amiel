"use server";

import { createClient } from "@/lib/supabase/server";

export async function updateSystemSetting(key: string, value: string) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return { error: "not_authenticated" as const };
  }

  // Upsert: works whether or not the key already has a seed row (RLS
  // restricts both the insert and the update branches to admin).
  const { error } = await supabase.from("system_settings").upsert(
    {
      key,
      value,
      updated_by: userData.user.id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" }
  );

  if (error) {
    return { error: error.message };
  }
  return { success: true as const };
}
