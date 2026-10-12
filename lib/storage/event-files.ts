import type { SupabaseClient } from "@supabase/supabase-js";

// Supabase Storage keys must be plain ASCII (the backend is S3-compatible
// and rejects anything else with "Invalid key") — but file names here are
// very often in Hebrew (e.g. "שגרירי קקל לשליחים הסבר בהרשמה.pdf", exactly
// the kind of real-world upload reps and KKAL staff use). Keep the
// extension (normally ASCII already) and collapse everything else down to
// safe characters, falling back to a generic "file" base when the whole
// name was non-Latin — the random UUID prefix on the full path already
// guarantees uniqueness, so a repeated "file.pdf" base is harmless.
function sanitizeFileName(name: string): string {
  const dotIndex = name.lastIndexOf(".");
  const hasExt = dotIndex > 0 && dotIndex < name.length - 1;
  const base = hasExt ? name.slice(0, dotIndex) : name;
  const ext = hasExt ? name.slice(dotIndex) : "";

  const safeBase = base
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
  const safeExt = ext.replace(/[^a-zA-Z0-9.]/g, "").slice(0, 10);

  return `${safeBase || "file"}${safeExt}`;
}

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
  const safeName = sanitizeFileName(file.name);
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
