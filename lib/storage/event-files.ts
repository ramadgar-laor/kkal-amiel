import type { SupabaseClient } from "@supabase/supabase-js";

// Uploads a single file to the private `event-files` Storage bucket under
// the current user's own folder (RLS on storage.objects requires the first
// path segment to equal auth.uid()), and returns the storage path to store
// on the event row. Called from the browser, before the event row exists —
// the random prefix keeps concurrent/duplicate filenames from colliding.
export async function uploadEventFile(
  supabase: SupabaseClient,
  userId: string,
  file: File
): Promise<string> {
  const safeName = file.name.replace(/[^\w.\-֐-׿ ]/g, "_");
  const path = `${userId}/${crypto.randomUUID()}-${safeName}`;

  const { error } = await supabase.storage
    .from("event-files")
    .upload(path, file, { upsert: false });

  if (error) {
    throw new Error(`file_upload_failed: ${error.message}`);
  }

  return path;
}

// Produces a short-lived signed download URL for a private event-files
// object. Used server-side on the kkal event-detail page (RLS policy
// `event_files_kkal_read_all` grants kkal/admin SELECT on these objects, so
// this succeeds when called with their own session). Returns null quietly
// for a missing path or a failed lookup, so callers can just hide the link.
export async function getSignedEventFileUrl(
  supabase: SupabaseClient,
  path: string | null | undefined,
  expiresInSeconds = 3600
): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await supabase.storage
    .from("event-files")
    .createSignedUrl(path, expiresInSeconds);
  if (error || !data) return null;
  return data.signedUrl;
}
