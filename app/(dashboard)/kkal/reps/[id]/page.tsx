import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RepEditForm } from "@/components/rep-edit-form";

export default async function RepEditPage({
  params,
}: PageProps<"/kkal/reps/[id]">) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: rep } = await supabase
    .from("reps")
    .select(
      "first_name_he, last_name_he, first_name_local, last_name_local, whatsapp_phone, mission_phone, date_of_birth, marital_status, mailing_institution, address, city, state, zip, country, organization, activity_level, mission_location_name, institution_type, institution_city, main_role, mission_start_date, mission_end_date_expected, status, kkal_notes, registration_notes"
    )
    .eq("profile_id", id)
    .maybeSingle();

  if (!rep) notFound();

  const { data: profile } = await supabase
    .from("profiles")
    .select("email, display_name")
    .eq("id", id)
    .maybeSingle();

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link
          href="/kkal/reps"
          className="text-sm text-(--color-brand) underline"
        >
          ← חזרה לרשימת השליחים
        </Link>
        <h1 className="text-xl font-bold text-(--color-brand-dark) mt-2">
          עריכת פרטי שליח
        </h1>
        {(profile?.display_name || profile?.email) && (
          <p className="text-sm text-black/50 mt-1">
            {[profile?.display_name, profile?.email].filter(Boolean).join(" · ")}
          </p>
        )}
      </div>
      <div className="rounded-xl bg-white p-6 shadow-sm border border-black/5">
        <RepEditForm profileId={id} rep={rep} />
      </div>
    </div>
  );
}
