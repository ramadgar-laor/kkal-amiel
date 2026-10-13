import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSystemSetting } from "@/lib/content/settings-read";
import { getCurrentLocale } from "@/lib/i18n/server";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { NewEventForm } from "@/components/new-event-form";

export default async function NewEventPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const { data: rep } = await supabase
    .from("reps")
    .select(
      "status, first_name_he, last_name_he, whatsapp_phone, mission_phone, organization, city, country"
    )
    .eq("profile_id", userData.user!.id)
    .single();

  if (rep?.status !== "approved") {
    redirect("/rep");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("email")
    .eq("id", userData.user!.id)
    .single();

  const locale = await getCurrentLocale();
  const dict = getDictionary(locale);
  const introMarkdown = await getSystemSetting(
    locale === "en" ? "new_event_intro_en" : "new_event_intro_he"
  );

  return (
    <div className="max-w-3xl">
      <Link href="/rep" className="text-sm text-(--color-brand) underline">
        ← {dict.common.back}
      </Link>
      <h1 className="mt-3 text-xl font-bold text-(--color-brand-dark)">
        {dict.newEvent.pageTitle}
      </h1>
      <div className="mt-6 rounded-xl bg-white border border-black/5 p-6 shadow-sm">
        <NewEventForm
          dict={dict}
          locale={locale}
          introMarkdown={introMarkdown}
          repDefaults={{
            firstName: rep.first_name_he ?? "",
            lastName: rep.last_name_he ?? "",
            email: profile?.email ?? "",
            whatsappPhone: rep.whatsapp_phone ?? "",
            missionPhone: rep.mission_phone ?? "",
            organization: rep.organization ?? "",
            city: rep.city ?? "",
            country: rep.country ?? "",
          }}
        />
      </div>
    </div>
  );
}
