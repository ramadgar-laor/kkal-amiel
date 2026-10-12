import { createClient } from "@/lib/supabase/server";

// Server-only helpers for reading admin-editable text settings (see
// system_settings table / the /admin/settings screen). Import these only
// from server components (pages) -- never from a "use client" component.
// Readable by anyone, including unauthenticated visitors on the public
// /register page, via the table's public-read RLS policy.
export async function getSystemSetting(key: string): Promise<string> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("system_settings")
    .select("value")
    .eq("key", key)
    .maybeSingle();
  return data?.value ?? "";
}

export async function getSystemSettings(
  keys: string[]
): Promise<Record<string, string>> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("system_settings")
    .select("key, value")
    .in("key", keys);

  const result: Record<string, string> = {};
  for (const key of keys) result[key] = "";
  for (const row of data ?? []) result[row.key] = row.value;
  return result;
}
